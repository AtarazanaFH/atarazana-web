// Revisión de inscripciones de una marea: invitados de Luma + asistentes de la Tripulación → panel HTML.
// Lo usa la skill `revisar-marea` (.claude/skills/revisar-marea/SKILL.md), que explica el flujo completo.
//
// Todo lo que lleva datos de personas vive FUERA del repo, en ~/.atarazana/revision/ (o $ATARAZANA_REVISION):
//   NNN/luma*.json          salida de list_guests del MCP de Luma (una por página)
//   NNN/asistencia*.csv     asistencia real de esa marea (carpeta de Drive): approved = vino, no_fue = aprobada y no vino
//   NNN/invitados.json      lista normalizada, con la categoría 0 calculada
//   NNN/pendientes.json     personas nuevas sin ficha: lo que hay que investigar
//   NNN/investigacion/*.json fichas que devuelven los agentes de investigación
//   NNN/panel-marea-NNN.html el panel
//   fichas/<email>.json     fichas investigadas, compartidas entre mareas
// El script se niega a escribir dentro del repo.
//
//   node scripts/revision/marea.mjs preparar 002 [--plazas 45] [--local]
//   node scripts/revision/marea.mjs enriquecer 002 [--todas]
//   node scripts/revision/marea.mjs generar 002
//   node scripts/revision/marea.mjs sembrar panel-marea-001.html 001
//
// La Tripulación se lee de producción (.env.prod) solo con SELECT: este script no escribe nunca en la base de datos.
// --local la lee del Supabase local, para probar.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ROOT = resolve(process.env.ATARAZANA_REVISION || join(homedir(), '.atarazana', 'revision'));
const inside = (dir, path) => { const r = relative(dir, path); return r === '' || (!r.startsWith('..') && !isAbsolute(r)); };
if (inside(REPO, ROOT)) fail(`${ROOT} está dentro del repo. Los datos de invitados nunca van al repo.`);

const KINDS = ['founder', 'ingeniería', 'IA', 'research', 'producto', 'diseño', 'seguridad', 'hardware', 'comunidad', 'early employee', 'estudiante', 'otro'];
const UA = { 'user-agent': 'atarazana-revision' };

function fail(message) { console.error(`✗ ${message}`); process.exit(1); }
const readJson = (path, fallback) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { if (fallback !== undefined) return fallback; fail(`No puedo leer ${path}`); } };
function write(path, text) {
  const full = resolve(path);
  if (inside(REPO, full)) fail(`No escribo dentro del repo: ${full}`);
  mkdirSync(dirname(full), { recursive: true, mode: 0o700 });
  writeFileSync(full, text, { mode: 0o600 });
  chmodSync(full, 0o600);
}
const writeJson = (path, data) => write(path, JSON.stringify(data, null, 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const keyOf = (email) => email.trim().toLowerCase();
const fichaPath = (email) => join(ROOT, 'fichas', `${keyOf(email).replace(/[^a-z0-9@._+-]/g, '_')}.json`);
const normName = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean);

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1] === '--plazas'));
const [command, a1, a2] = positional;
const marea = (n) => { if (!/^\d{3}$/.test(n || '')) fail('Indica la marea con tres cifras: 002'); return n; };

// ---------- Datos de la marea (src/data/mareas.ts) ----------
function mareaInfo(number) {
  const src = readFileSync(join(REPO, 'src/data/mareas.ts'), 'utf8');
  const start = src.indexOf(`number: '${number}'`);
  if (start < 0) fail(`No encuentro la marea ${number} en src/data/mareas.ts`);
  const next = src.indexOf("number: '", start + 10);
  const block = src.slice(start, next < 0 ? undefined : next);
  return {
    date: block.match(/date: '([\d-]+)'/)?.[1] || '',
    capacity: Number(block.match(/capacity: (\d+)/)?.[1] || 0),
    luma: block.match(/luma: '([^']+)'/)?.[1] || '',
  };
}

// ---------- Luma ----------
const answerOf = (g, type, label) => (g.registration_answers || []).find((a) => a.question_type === type && (!label || label.test(a.label)))?.answer?.trim?.() || '';
const handle = (v) => v.replace(/^https?:\/\/(www\.)?(x|twitter|github|linkedin)\.com\//i, '').replace(/^@/, '').replace(/^\/+|\/+$/g, '').split(/[/?#]/)[0];
const url = (v) => !v ? '' : /^https?:\/\//i.test(v) ? v.replace(/^http:/i, 'https:') : `https://${v}`;

function lumaGuests(dir) {
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^luma.*\.json$/.test(f)).sort() : [];
  if (!files.length) fail(`No hay luma*.json en ${dir}. Guarda ahí la salida de list_guests del MCP de Luma.`);
  const seen = new Map();
  for (const f of files) {
    const data = readJson(join(dir, f));
    for (const g of data.entries || data) seen.set(g.api_id || g.id, g);
  }
  return [...seen.values()].map((g) => {
    const li = answerOf(g, 'linkedin');
    const known = new Set(['twitter', 'linkedin', 'github', 'url']);
    const texts = (g.registration_answers || []).filter((a) => !known.has(a.question_type) && String(a.answer ?? '').trim());
    const city = texts.find((a) => /d[oó]nde vives|ciudad/i.test(a.label));
    const why = texts.find((a) => /por qu[eé]|why/i.test(a.label));
    const ref = texts.find((a) => /c[oó]mo (te )?(enteraste|conociste|llegaste)|qui[eé]n te/i.test(a.label));
    const x = handle(answerOf(g, 'twitter')), gh = handle(answerOf(g, 'github'));
    return {
      id: g.api_id || g.id,
      name: (g.name || g.user_name || '').trim() || g.email,
      lumaName: (g.user_name || g.name || '').trim(),
      email: keyOf(g.email || g.user_email),
      created: g.registered_at || g.created_at,
      status: g.approval_status,
      city: String(city?.answer || '').trim(),
      why: String(why?.answer || '').trim(),
      ref: String(ref?.answer || '').trim(),
      answers: texts.filter((a) => a !== city && a !== why && a !== ref).map((a) => ({ label: a.label, value: String(a.answer).trim() })),
      x: x ? `https://x.com/${x}` : '',
      li: li ? (li.startsWith('http') ? url(li) : `https://linkedin.com/${li.replace(/^\/+/, '')}`) : '',
      gh: gh ? `https://github.com/${gh}` : '',
      web: url(answerOf(g, 'url')),
    };
  });
}

// ---------- Tripulación (solo lectura) ----------
async function attendance(local) {
  const envFile = join(REPO, local ? '.env.development.local' : '.env.prod');
  try { process.loadEnvFile(envFile); } catch { fail(`No encuentro ${envFile}`); }
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) fail(`Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en ${envFile}`);
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('mercado_attendance').select('email, marea').range(from, from + 999);
    if (error) fail(`Tripulación: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`${local ? 'Local' : 'Producción (lectura)'} · ${rows.length} asistencias en la Tripulación`);
  return rows;
}

// CSV sencillo (comillas, comas y saltos de línea dentro de los campos).
function parseCsv(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); field = ''; if (row.some((f) => f.trim())) rows.push(row); row = []; }
    else field += c;
  }
  row.push(field); if (row.some((f) => f.trim())) rows.push(row);
  const [head = [], ...body] = rows;
  const keys = head.map((h) => h.replace(/^﻿/, '').trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

// Historial de cada correo en las mareas anteriores:
//   vino      está en la Tripulación (mercado_attendance). Es lo único que da la categoría 0.
//   no_fue    aprobada y no vino: «no_fue» en asistencia*.csv (de la carpeta de Drive), o aprobada en Luma sin asistencia
//   no_entro  se apuntó en Luma y no fue aprobada (pendiente, lista de espera, rechazada)
const RANK = { no_entro: 1, no_fue: 2, vino: 3 };
const LUMA_STATUS = { pending_approval: 'sin aprobar', waitlist: 'lista de espera', declined: 'rechazada', invited: 'invitada sin respuesta' };
async function pastHistory(number) {
  const rows = await attendance(flag('--local'));
  const prior = new Map();
  const history = new Map();
  const put = (email, marea, result, note = '') => {
    const e = keyOf(email); if (!e) return;
    const byMarea = history.get(e) || new Map(); history.set(e, byMarea);
    const prev = byMarea.get(marea);
    if (!prev || RANK[result] > RANK[prev.result]) byMarea.set(marea, { marea, result, note });
  };
  for (const r of rows) if (r.marea < number) { prior.set(keyOf(r.email), [...(prior.get(keyOf(r.email)) || []), r.marea].sort()); put(r.email, r.marea, 'vino'); }

  const numbers = [...readFileSync(join(REPO, 'src/data/mareas.ts'), 'utf8').matchAll(/number: '(\d{3})'/g)].map((m) => m[1]).filter((n) => n < number).sort();
  for (const n of numbers) {
    const dir = join(ROOT, n);
    const files = existsSync(dir) ? readdirSync(dir) : [];
    const csvs = files.filter((f) => /^asistencia.*\.csv$/.test(f));
    const lumas = files.filter((f) => /^luma.*\.json$/.test(f));
    if (!lumas.length) console.log(`Aviso: no tengo la lista de Luma de la ${n} (${dir}/luma.json). No sé quién se apuntó y no entró.`);
    if (!csvs.length) console.log(`Aviso: no tengo el CSV de asistencia de la ${n} (${dir}/asistencia.csv, de la carpeta de Drive). Los que no vinieron salen solo por Luma.`);
    for (const f of csvs) for (const r of parseCsv(readFileSync(join(dir, f), 'utf8'))) {
      if (r.approval_status === 'no_fue') put(r.email, n, 'no_fue', (r.origen || '').replace(/^no fue:\s*/i, ''));
      else if (r.approval_status === 'approved' && !prior.get(keyOf(r.email))?.includes(n)) console.log(`Aviso: ${n} · un correo vino según el CSV y no está en la Tripulación. No cuenta como categoría 0 hasta que se cargue.`);
    }
    if (lumas.length) for (const g of lumaGuests(dir)) {
      if (g.status === 'approved') put(g.email, n, 'no_fue', 'aprobada en Luma, sin asistencia');
      else put(g.email, n, 'no_entro', LUMA_STATUS[g.status] || g.status);
    }
  }
  return { prior, history };
}

// ---------- preparar ----------
async function preparar(number) {
  const dir = join(ROOT, number);
  const info = mareaInfo(number);
  const capacity = Number(option('--plazas') || info.capacity);
  if (!capacity) fail('No sé cuántas plazas hay: usa --plazas N');
  const guests = lumaGuests(dir);
  const { prior, history } = await pastHistory(number);
  const team = new Set(readJson(join(ROOT, 'equipo.json'), []).map(keyOf));

  // Nombres de quienes ya vinieron, para avisar si alguien nuevo se llama igual (¿otro correo?).
  const priorNames = [];
  for (const email of prior.keys()) { const f = readJson(fichaPath(email), null); if (f?.name) priorNames.push({ email, words: normName(f.name), name: f.name }); }
  const sameName = (name) => { const w = normName(name); if (w.length < 2) return null; return priorNames.find((p) => w.every((x) => p.words.includes(x)) || p.words.every((x) => w.includes(x))) || null; };

  guests.sort((a, b) => a.created.localeCompare(b.created));
  let seats = 0;
  const people = guests.map((g) => {
    const before = prior.get(g.email) || [];
    const past = [...(history.get(g.email)?.values() || [])].sort((a, b) => a.marea.localeCompare(b.marea));
    const p = {
      ...g, cat0: before.length > 0, prior: before, self: team.has(g.email), waiting: false, maybe: '',
      // Historial sin categoría 0: se apuntó y no entró, o entró y no vino.
      noEntro: past.filter((h) => h.result === 'no_entro').map((h) => h.marea),
      noFue: past.filter((h) => h.result === 'no_fue').map(({ marea: m, note }) => ({ marea: m, note })),
    };
    if (p.cat0 && p.status !== 'declined') { p.waiting = seats >= capacity; seats++; }
    if (!p.cat0) { const m = sameName(g.name); if (m && m.email !== g.email) p.maybe = m.name; }
    return p;
  });
  writeJson(join(dir, 'invitados.json'), { marea: number, ...info, capacity, generated: new Date().toISOString(), people });

  const pending = people.filter((p) => !p.cat0 && !p.self && !existsSync(fichaPath(p.email)))
    .map(({ id, name, lumaName, email, city, why, ref, answers, x, li, gh, web }) => ({ id, name, lumaName, email, city, why, ref, answers, x, li, gh, web }));
  writeJson(join(dir, 'pendientes.json'), pending);

  const cat0 = people.filter((p) => p.cat0 && p.status !== 'declined');
  const waiting = cat0.filter((p) => p.waiting).length;
  console.log(`Marea ${number} · ${people.length} inscritas · ${capacity} plazas`);
  console.log(`Categoría 0 (ya vinieron): ${cat0.length}${waiting ? ` · ${waiting} en espera por falta de sitio` : ''} → quedan ${Math.max(0, capacity - cat0.length + waiting)} plazas para gente nueva`);
  const again = people.filter((p) => !p.cat0 && p.noEntro.length).length;
  const noShow = people.filter((p) => p.noFue.length).length;
  console.log(`Ya se apuntaron y no entraron: ${again} · Entraron y no vinieron: ${noShow}`);
  const maybe = people.filter((p) => p.maybe).length;
  if (maybe) console.log(`Aviso: ${maybe} personas nuevas se llaman como alguien que ya vino (¿otro correo?). Sale en su ficha.`);
  console.log(`Nuevas sin investigar: ${pending.length} → ${join(dir, 'pendientes.json')}`);
}

// ---------- enriquecer ----------
async function getJson(u, headers = {}) {
  try { const r = await fetch(u, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(15000) }); return r.ok ? r.json() : null; } catch { return null; }
}
async function photo(u, src) {
  try {
    const r = await fetch(u, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (!r.ok || !/^image\//.test(r.headers.get('content-type') || '')) return null;
    const { default: sharp } = await import('sharp');
    const buf = await sharp(Buffer.from(await r.arrayBuffer())).rotate().resize(240, 240, { fit: 'cover' }).jpeg({ quality: 72 }).toBuffer();
    return { src, generic: false, data: `data:image/jpeg;base64,${buf.toString('base64')}`, from: u };
  } catch { return null; }
}
async function github(user) {
  const h = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const u = await getJson(`https://api.github.com/users/${encodeURIComponent(user)}`, h);
  if (!u?.login) return null;
  const repos = (await getJson(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed`, h)) || [];
  const own = repos.filter((r) => !r.fork);
  const langs = Object.entries(own.reduce((m, r) => (r.language ? { ...m, [r.language]: (m[r.language] || 0) + 1 } : m), {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);
  const top = [...own].sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at)).slice(0, 4)
    .map((r) => ({ name: r.name, desc: r.description, stars: r.stargazers_count, url: r.html_url, pushed: r.pushed_at?.slice(0, 10) }));
  return { info: { bio: u.bio, company: u.company?.replace(/^@/, '') || null, followers: u.followers, repos: u.public_repos, since: u.created_at?.slice(0, 10), langs, top }, avatar: u.avatar_url };
}
async function site(u) {
  try {
    const r = await fetch(u, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (!r.ok || !/text\/html/.test(r.headers.get('content-type') || '')) return null;
    const html = (await r.text()).slice(0, 200000);
    const meta = (re) => html.match(re)?.[1]?.replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
    const title = meta(/<title[^>]*>([^<]{1,200})<\/title>/i) || meta(/property=["']og:title["'][^>]*content=["']([^"']{1,200})/i);
    const desc = meta(/name=["']description["'][^>]*content=["']([^"']{1,400})/i) || meta(/property=["']og:description["'][^>]*content=["']([^"']{1,400})/i);
    return title || desc ? { title: title || '', desc: desc || '' } : null;
  } catch { return null; }
}
async function xProfile(user) {
  const d = await getJson(`https://api.fxtwitter.com/${encodeURIComponent(user)}`);
  return d?.user ? { bio: d.user.description || '', followers: d.user.followers ?? null, avatar: d.user.avatar_url?.replace('_normal', '_400x400') } : null;
}

async function enriquecer(number) {
  const dir = join(ROOT, number);
  const { people } = readJson(join(dir, 'invitados.json'));
  const byEmail = new Map(people.map((p) => [p.email, p]));

  // 1. Fichas de los agentes de investigación → almacén compartido.
  const invDir = join(dir, 'investigacion');
  let merged = 0;
  for (const f of existsSync(invDir) ? readdirSync(invDir).filter((x) => x.endsWith('.json')) : []) {
    for (const r of [].concat(readJson(join(invDir, f)))) {
      const email = keyOf(r.email || '');
      const g = byEmail.get(email);
      if (!g) { console.log(`  ${f}: ${r.email} no está en la lista de Luma, lo salto`); continue; }
      const prev = readJson(fichaPath(email), {});
      const kind = (r.kind || []).filter((k) => KINDS.includes(k));
      writeJson(fichaPath(email), {
        ...prev, email, name: r.name || prev.name || g.name, role: r.role || '', kind, summary: r.summary || '',
        links: r.links || [], sources: r.sources || [],
        x: url(r.x) || g.x || prev.x || '', li: url(r.li) || g.li || prev.li || '', gh: url(r.gh) || g.gh || prev.gh || '', web: url(r.web) || g.web || prev.web || '',
        photoUrls: r.photos || [], researched: new Date().toISOString().slice(0, 10), marea: number, auto: false,
      });
      merged++;
    }
  }
  if (merged) console.log(`${merged} fichas de investigación guardadas`);

  // 2. Lo mecánico: GitHub, web, X y fotos. Solo a quien falte (o a todas con --todas).
  const todo = people.filter((p) => !p.cat0 && existsSync(fichaPath(p.email)) && (flag('--todas') || !readJson(fichaPath(p.email)).auto));
  for (const [i, p] of todo.entries()) {
    const f = readJson(fichaPath(p.email));
    const x = handle(f.x || p.x || ''), gh = handle(f.gh || p.gh || ''), web = f.web || p.web;
    const photos = [];
    const add = async (u, src) => { if (u && !photos.some((ph) => ph.from === u)) { const ph = await photo(u, src); if (ph) photos.push(ph); } };
    for (const ph of f.photoUrls || []) await add(ph.url, ph.src || 'web');
    if (x) { const xp = await xProfile(x); if (xp) { f.xbio = xp.bio; f.xfollowers = xp.followers; await add(xp.avatar, 'x'); } }
    if (gh) { const g = await github(gh); if (g) { f.github = g.info; await add(g.avatar, 'github'); } }
    if (web && !/linkedin\.com|github\.com|x\.com|twitter\.com/.test(web)) f.site = (await site(web)) || f.site || null;
    const grav = createHash('md5').update(p.email).digest('hex');
    await add(`https://www.gravatar.com/avatar/${grav}?s=240&d=404`, 'gravatar');
    f.photos = photos.length ? photos : (f.photos || []);
    f.auto = true;
    writeJson(fichaPath(p.email), f);
    process.stdout.write(`\r  ${i + 1}/${todo.length} enriquecidas`);
    await sleep(300);
  }
  if (todo.length) process.stdout.write('\n');
  const missing = people.filter((p) => !p.cat0 && !p.self && !existsSync(fichaPath(p.email)));
  console.log(missing.length ? `Faltan ${missing.length} fichas por investigar (ver pendientes.json)` : 'Todas las personas nuevas tienen ficha');
}

// ---------- generar ----------
function fonts() {
  const nm = join(REPO, 'node_modules');
  const face = (family, weight, file) => `@font-face { font-family:'${family}'; font-style:normal; font-display:swap; font-weight:${weight}; src:url(data:font/woff2;base64,${readFileSync(join(nm, file)).toString('base64')}) format('woff2'); }`;
  return [
    face('Anton', 400, '@fontsource/anton/files/anton-latin-400-normal.woff2'),
    face('Inter Variable', '100 900', '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'),
    ...[400, 500, 700].map((w) => face('IBM Plex Mono', w, `@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${w}-normal.woff2`)),
  ].join('\n');
}

function generar(number) {
  const dir = join(ROOT, number);
  const data = readJson(join(dir, 'invitados.json'));
  const people = data.people.map((p) => {
    const f = readJson(fichaPath(p.email), {});
    return {
      ...p,
      name: f.name || p.name, role: f.role || '', kind: f.kind || [], summary: f.summary || '', links: f.links || [], sources: f.sources || [],
      x: p.x || f.x || '', li: p.li || f.li || '', gh: p.gh || f.gh || '', web: p.web || f.web || '',
      xbio: f.xbio || '', xfollowers: f.xfollowers ?? null, github: f.github || null, site: f.site || null,
      photos: (f.photos || []).map(({ src, generic, data: d }) => ({ src, generic: !!generic, data: d })),
      researched: !!f.researched,
    };
  });
  const json = JSON.stringify({ ...data, people }).replace(/</g, "\\u003c");
  const html = readFileSync(join(REPO, 'scripts/revision/plantilla.html'), 'utf8').replace('/*FUENTES*/', () => fonts()).replace('/*DATOS*/', () => json);
  const out = join(dir, `panel-marea-${number}.html`);
  write(out, html);
  const sinFicha = people.filter((p) => !p.cat0 && !p.self && !p.researched).length;
  console.log(`Panel: ${out} (${Math.round(html.length / 1024)} KB)${sinFicha ? ` · ${sinFicha} personas nuevas sin ficha todavía` : ''}`);
}

// ---------- sembrar: fichas desde un panel antiguo ----------
function sembrar(file, number) {
  const html = readFileSync(file, 'utf8');
  const m = html.match(/const PEOPLE = (\[.*?\]);\n/s) || html.match(/const DATA = (\{.*?\});\n/s);
  if (!m) fail('No encuentro los datos en ese panel');
  const parsed = JSON.parse(m[1]);
  const list = Array.isArray(parsed) ? parsed : parsed.people;
  let n = 0;
  for (const p of list) {
    if (!p.email || !p.summary) continue;
    const prev = readJson(fichaPath(p.email), null);
    if (prev && !flag('--sobrescribir')) continue;
    const { id, created, why, ref, city, lumaName, self, tag, note, status, cat0, prior, waiting, maybe, answers, ...ficha } = p;
    writeJson(fichaPath(p.email), { ...ficha, email: keyOf(p.email), researched: created?.slice(0, 10) || '', marea: number, auto: true });
    n++;
  }
  console.log(`${n} fichas sembradas en ${join(ROOT, 'fichas')}`);
}

if (command === 'preparar') await preparar(marea(a1));
else if (command === 'enriquecer') await enriquecer(marea(a1));
else if (command === 'generar') generar(marea(a1));
else if (command === 'sembrar') { if (!a1) fail('Indica el panel'); sembrar(resolve(a1), marea(a2)); }
else fail('Uso: preparar | enriquecer | generar NNN · sembrar panel.html NNN');
