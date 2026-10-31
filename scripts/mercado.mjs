// El Mercado: carga asistentes desde el CSV de Luma, manda invitaciones y gestiona admins.
//
// Por defecto trabaja contra el Supabase LOCAL (.env.development.local). Producción solo con --prod:
// lee .env.prod (no se sube al repo, Astro no lo carga nunca) y, antes de escribir nada,
// pide escribir el nombre del proyecto para confirmar.
//
//   node scripts/mercado.mjs import 001 asistentes.csv --dry-run      enseña qué haría (no toca la base de datos)
//   node scripts/mercado.mjs import 001 asistentes.csv                local
//   node scripts/mercado.mjs import 001 asistentes.csv --prod         producción (pide confirmación)
//   node scripts/mercado.mjs import 001 asistentes.csv --all          todos los aprobados, no solo check-in
//   node scripts/mercado.mjs admin atarazanafh@gmail.com [--prod]
//   node scripts/mercado.mjs list 001 [--prod]
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

const prod = process.argv.includes('--prod');
const envFile = prod ? '.env.prod' : '.env.development.local';
try { process.loadEnvFile(envFile); } catch { fail(`No encuentro ${envFile}`); }
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL = prod ? 'https://atarazana.house' : 'http://localhost:4321' } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) fail(`Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en ${envFile}`);
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost):/.test(SUPABASE_URL);
if (prod && isLocal) fail('--prod pero .env.prod apunta al Supabase local');
if (!prod && !isLocal) fail(`${envFile} apunta a ${SUPABASE_URL}, que no es local. Para producción usa --prod.`);
console.log(prod ? `⚠ PRODUCCIÓN · ${SUPABASE_URL}` : `Local · ${SUPABASE_URL}`);

// Antes de escribir en producción: hay que teclear el nombre del proyecto (el subdominio de la URL).
async function confirmProd() {
  if (!prod) return;
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Esto escribe en PRODUCCIÓN. Escribe "${ref}" para seguir: `);
  rl.close();
  if (answer.trim() !== ref) fail('Cancelado.');
}

function fail(message) { console.error(`✗ ${message}`); process.exit(1); }

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const [command, ...args] = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const [first, second] = args.filter((a) => !a.startsWith('--'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


// CSV con comillas, comas y saltos de línea dentro de los campos.
function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  const [head, ...body] = rows;
  const keys = head.map((h) => h.replace(/^﻿/, '').trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

async function existingUsers() {
  const emails = new Set();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(error.message);
    data.users.forEach((u) => u.email && emails.add(u.email.toLowerCase()));
    if (data.users.length < 1000) return emails;
  }
}

async function invite(email, name) {
  const { error } = await db.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${SITE_URL}/mercado`,
    data: name ? { name } : undefined,
  });
  if (error) console.error(`  ✗ ${email}: ${error.message}`);
  else console.log(`  ✉ invitación enviada a ${email}`);
  await sleep(400);
}

if (command === 'import') {
  const marea = first;
  if (!/^\d{3}$/.test(marea ?? '') || !second) fail('Uso: import 001 asistentes.csv [--all] [--dry-run]');
  const rows = parseCsv(readFileSync(second, 'utf8'));
  const hasCheckIn = rows.length > 0 && 'checked_in_at' in rows[0];
  const people = new Map();
  for (const r of rows) {
    const email = (r.email ?? '').toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
    if (r.approval_status && !['approved', 'checked_in'].includes(r.approval_status.toLowerCase())) continue;
    if (hasCheckIn && !flags.has('--all') && !r.checked_in_at) continue;
    const name = r.name || [r.first_name, r.last_name].filter(Boolean).join(' ');
    people.set(email, name);
  }
  console.log(`Marea ${marea}: ${people.size} asistentes en el CSV${hasCheckIn && !flags.has('--all') ? ' (solo con check-in; usa --all para todos los aprobados)' : ''}.`);
  if (flags.has('--dry-run')) { people.forEach((n, e) => console.log(`  · ${e}${n ? ` (${n})` : ''}`)); process.exit(0); }
  await confirmProd();

  const { error } = await db.from('mercado_attendance')
    .upsert([...people.keys()].map((email) => ({ email, marea })), { ignoreDuplicates: true });
  if (error) fail(error.message);
  console.log(`✓ Asistencia de la Marea ${marea} guardada.`);

  const known = await existingUsers();
  const fresh = [...people].filter(([email]) => !known.has(email));
  console.log(`${fresh.length} personas nuevas por invitar; ${people.size - fresh.length} ya tenían cuenta (solo se les suma la marea).`);
  for (const [email, name] of fresh) await invite(email, name);
  console.log('✓ Hecho.');
} else if (command === 'admin') {
  const email = (first ?? '').toLowerCase();
  if (!email.includes('@')) fail('Uso: admin correo@ejemplo.com');
  await confirmProd();
  const { error } = await db.from('mercado_admins').upsert({ email });
  if (error) fail(error.message);
  console.log(`✓ ${email} es admin.`);
  if (!(await existingUsers()).has(email)) await invite(email);
} else if (command === 'list') {
  let query = db.from('mercado_attendance').select('email, marea').order('marea').order('email');
  if (first) query = query.eq('marea', first);
  const { data, error } = await query;
  if (error) fail(error.message);
  data.forEach((r) => console.log(`${r.marea}  ${r.email}`));
  console.log(`${data.length} filas.`);
} else {
  fail('Comandos: import <marea> <csv> [--all] [--dry-run] · admin <correo> · list [marea] · añade --prod para producción');
}
