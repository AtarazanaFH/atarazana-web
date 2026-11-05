// La Tripulación (antes El Mercado): carga asistentes desde el CSV de Luma, manda invitaciones y gestiona admins.
//
// Por defecto trabaja contra el Supabase LOCAL (.env.development.local). Producción solo con --prod:
// lee .env.prod (no se sube al repo, Astro no lo carga nunca) y, antes de escribir nada,
// pide escribir el nombre del proyecto para confirmar.
//
//   node scripts/tripulacion.mjs import 001 asistentes.csv --dry-run      enseña qué haría (no toca la base de datos)
//   node scripts/tripulacion.mjs import 001 asistentes.csv                local
//   node scripts/tripulacion.mjs import 001 asistentes.csv --prod         producción (pide confirmación)
//   node scripts/tripulacion.mjs import 001 asistentes.csv --all          todos los aprobados, no solo check-in
//   node scripts/tripulacion.mjs import 001 asistentes.csv --no-invite    guarda la asistencia y no manda ningún correo
//   node scripts/tripulacion.mjs admin atarazanafh@gmail.com [--prod]
//   node scripts/tripulacion.mjs list 001 [--prod]
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { closeCard, openCard, renderCard } from './tripulacion-card.mjs';

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
// Una errata en --no-invite no puede acabar mandando correos.
const unknownFlags = [...flags].filter((f) => !['--prod', '--dry-run', '--all', '--no-invite'].includes(f));
if (unknownFlags.length) fail(`No conozco ${unknownFlags.join(', ')}`);
const [first, second] = args.filter((a) => !a.startsWith('--'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FROM = 'atarazanafh@gmail.com';


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
  const users = new Map();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) fail(error.message);
    data.users.forEach((u) => u.email && users.set(u.email.toLowerCase(), u));
    if (data.users.length < 1000) return users;
  }
}

// La invitación la mandamos nosotros, no Supabase, porque Supabase solo tiene una caducidad para todos sus enlaces.
// El botón lleva a /mercado con un token de un solo uso (30 días), que la página canjea en la función mercado-invite.
const template = readFileSync('supabase/emails/invite.html', 'utf8');
const subject = template.match(/Asunto: "(.+?)"/)[1];
const html = template.replace(/^<!--.*?-->\s*/s, '');
const escapeHtml = (v) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
let mailer;
function getMailer() {
  if (mailer) return mailer;
  if (!prod) return (mailer = nodemailer.createTransport({ host: '127.0.0.1', port: Number(process.env.LOCAL_SMTP_PORT ?? 54335), secure: false }));
  if (!process.env.GMAIL_APP_PASSWORD) fail('Falta GMAIL_APP_PASSWORD en .env.prod');
  return (mailer = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: FROM, pass: process.env.GMAIL_APP_PASSWORD } }));
}

// Comprueba el navegador y el correo antes de crear ninguna cuenta.
async function prepareInvites() {
  try { await openCard(); } catch (e) { fail(`No puedo pintar la tarjeta: ${e.message.split('\n')[0]}. Prueba: npx playwright install chromium-headless-shell`); }
  try { await getMailer().verify(); } catch (e) { await closeCard(); fail(`No puedo conectar con el correo: ${e.message}`); }
}

// Cuentas cuyo correo de invitación consta como enviado.
async function sentInvites() {
  const { data, error } = await db.from('mercado_invites').select('user_id').not('sent_at', 'is', null);
  if (error) fail(error.message);
  return new Set(data.map((r) => r.user_id));
}

// Hay que invitar si no hay cuenta, o si nunca ha entrado y no consta ningún correo enviado.
// Así, un fallo a medias (cuenta sin invitación, correo sin salir) se arregla repitiendo el comando.
const awaitsInvite = (user, sent) => !user || (!user.last_sign_in_at && !sent.has(user.id));

// Devuelve true si el correo ha salido. userId viene relleno cuando la cuenta ya existe y es un reintento.
async function invite(email, name, userId) {
  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true, user_metadata: name ? { name } : undefined });
    if (error) { console.error(`  ✗ ${email}: ${error.message}`); return false; }
    userId = data.user.id;
  }
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const { error: insertError } = await db.from('mercado_invites').insert({
    token_hash: tokenHash, user_id: userId, email,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (insertError) { console.error(`  ✗ ${email}: sin invitación: ${insertError.message}`); return false; }
  // Solo una vez guardada la nueva, para que ningún enlace anterior siga valiendo.
  const { error: deleteError } = await db.from('mercado_invites').delete().eq('user_id', userId).neq('token_hash', tokenHash);
  if (deleteError) { console.error(`  ✗ ${email}: no se pudo anular la invitación anterior: ${deleteError.message}`); return false; }
  const link = `${SITE_URL}/tripulacion#invitacion=${token}`;
  try {
    await getMailer().sendMail({
      from: `"Atarazana Founder House" <${FROM}>`, to: email, subject,
      html: html.replaceAll('{{ .ConfirmationURL }}', link).replaceAll('{{ .Email }}', escapeHtml(email)),
      attachments: [{ filename: 'invitacion.jpg', content: await renderCard(email), cid: 'invitacion', contentDisposition: 'inline' }],
      text: `Viniste a una marea, así que te invitamos a la Tripulación: la parte privada de la web de Atarazana donde ves quién coincidió contigo en la misma marea.\n\nNadie de fuera puede verla: solo entran quienes han venido a una marea. Dentro, ves a quien coincidió contigo y también ha querido entrar, y esa gente te ve a ti. Es opcional: si quieres entrar, rellena tu perfil.\n\nQueremos que lo que empieza en una marea siga entre una y otra. Así, durante la marea no tienes que estar pendiente de pedirle el contacto a todo el mundo y puedes centrarte en la conversación. Si conectaste con alguien, no se te escapa.\n\nEntrar en la Tripulación: ${link}\n\nEste enlace es personal y solo sirve una vez. Si ya lo usaste o han pasado 30 días, pide otro en ${SITE_URL}/tripulacion\n\nYou came to a marea, so we are inviting you to La Tripulación: the private part of the Atarazana website where you see who was at the same marea as you. Nobody from outside can see it: only people who have come to a marea can get in. Inside, you see the people who were at a marea with you and have also chosen to join, and they see you. It is optional: if you want in, fill in your profile. We want what starts at a marea to carry on between meetups. So during a marea you do not have to worry about getting everyone's details and can focus on the conversation. If you hit it off with someone, you will not lose track of them. This link is personal and works once. If you already used it or 30 days have passed, ask for a new one at ${SITE_URL}/tripulacion\n\nHasta la próxima marea`,
    });
  } catch (e) {
    console.error(`  ✗ ${email}: correo no enviado, queda pendiente: ${e.message}`);
    return false;
  }
  const { error: sentError } = await db.from('mercado_invites').update({ sent_at: new Date().toISOString() }).eq('token_hash', tokenHash);
  if (sentError) console.error(`  ⚠ ${email}: correo enviado, pero sin marcar: si repites la importación, le llegará otra vez.`);
  console.log(`  ✉ invitación enviada a ${email}`);
  await sleep(400);
  return true;
}

// Manda las invitaciones y, si alguna falla, termina con error para que se note.
async function sendInvites(targets) {
  if (!targets.length) return;
  await prepareInvites();
  let failed = 0;
  for (const [email, name, userId] of targets) if (!(await invite(email, name, userId))) failed++;
  await closeCard();
  if (failed) {
    console.error(`✗ ${failed} invitaciones sin enviar. Repite el mismo comando para reintentarlas.`);
    process.exitCode = 1;
  }
}

if (command === 'import') {
  const marea = first;
  if (!/^\d{3}$/.test(marea ?? '') || !second) fail('Uso: import 001 asistentes.csv [--all] [--dry-run] [--no-invite]');
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
  if (flags.has('--no-invite')) {
    console.log('Sin invitaciones. Para mandarlas, repite el comando sin --no-invite.');
    process.exit(0);
  }

  const known = await existingUsers();
  const sent = await sentInvites();
  const targets = [...people].filter(([email]) => awaitsInvite(known.get(email), sent)).map(([email, name]) => [email, name, known.get(email)?.id]);
  const retries = targets.filter(([, , id]) => id).length;
  console.log(`${targets.length - retries} personas nuevas por invitar; ${retries} reintentos; ${people.size - targets.length} ya invitadas (solo se les suma la marea).`);
  await sendInvites(targets);
  console.log(process.exitCode ? '✗ Hecho, con fallos.' : '✓ Hecho.');
} else if (command === 'admin') {
  const email = (first ?? '').toLowerCase();
  if (!email.includes('@')) fail('Uso: admin correo@ejemplo.com');
  await confirmProd();
  const { error } = await db.from('mercado_admins').upsert({ email });
  if (error) fail(error.message);
  console.log(`✓ ${email} es admin.`);
  const known = await existingUsers();
  const user = known.get(email);
  if (awaitsInvite(user, await sentInvites())) await sendInvites([[email, undefined, user?.id]]);
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
