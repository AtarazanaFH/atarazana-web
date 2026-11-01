// Restaura una copia ya descifrada de scripts/mercado-backup.mjs. Se niega si el destino tiene cuentas o datos.
//
//   age -d -i clave.txt copia.tar.gz.age | tar -xz -C carpeta
//   node scripts/mercado-restore.mjs carpeta           Supabase local
//   node scripts/mercado-restore.mjs carpeta --prod    producción (.env.prod con SUPABASE_DB_URL; pide confirmación)
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';

const fail = (message) => { console.error(`✗ ${message}`); process.exit(1); };
const prod = process.argv.includes('--prod');
const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!dir || !existsSync(join(dir, 'datos.sql'))) fail('Uso: mercado-restore.mjs carpeta-descifrada [--prod]');
process.loadEnvFile(prod ? '.env.prod' : '.env.development.local');
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
const isLocal = /^http:\/\/(127\.0\.0\.1|localhost):/.test(SUPABASE_URL ?? '');
if (prod === isLocal) fail(prod ? '--prod pero .env.prod apunta a local.' : 'El archivo local no apunta a localhost.');
const SUPABASE_DB_URL = prod ? process.env.SUPABASE_DB_URL : 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
if (!SUPABASE_DB_URL) fail('Falta SUPABASE_DB_URL en .env.prod');

const psql = (args, input) => execFileSync('docker', ['run', '--rm', '-i', '--network', 'host', '-e', 'SUPABASE_DB_URL', 'postgres:17-alpine', 'sh', '-c', `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 ${args}`], {
  env: { ...process.env, SUPABASE_DB_URL }, input, maxBuffer: 1024 * 1024 * 512,
}).toString();

const existing = Number(psql(`-At -c "select (select count(*) from auth.users) + (select count(*) from public.mercado_attendance) + (select count(*) from public.mercado_profiles) + (select count(*) from public.mercado_invites)"`).trim());
if (existing) fail(`El destino ya tiene ${existing} filas. No se restaura encima de datos.`);

if (prod) {
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Esto escribe en PRODUCCIÓN. Escribe "${ref}" para seguir: `);
  rl.close();
  if (answer.trim() !== ref) fail('Cancelado.');
}

// Sin disparadores: los datos ya pasaron sus reglas al entrar, y así no importa el orden de las tablas. Todo o nada.
// La lista de admins nunca está vacía (schema.sql pone la de Atarazana): se sustituye por la de la copia.
const sql = `set session_replication_role = replica;\ndelete from public.mercado_admins;\n${readFileSync(join(dir, 'datos.sql'), 'utf8')}`;
psql('--single-transaction -q -f -', sql);
console.log('✓ Datos restaurados.');

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const photosDir = resolve(dir, 'fotos');
let photos = 0;
for (const folder of existsSync(photosDir) ? readdirSync(photosDir) : []) {
  for (const file of readdirSync(join(photosDir, folder))) {
    const contentType = file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    const { error } = await db.storage.from('mercado-fotos').upload(`${folder}/${file}`, readFileSync(join(photosDir, folder, file)), { contentType, upsert: true });
    if (error) fail(`Foto sin restaurar: ${error.message}`);
    photos++;
  }
}
console.log(`✓ ${photos} fotos restauradas.`);
