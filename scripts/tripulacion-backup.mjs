// Copia de seguridad de la Tripulación: datos (cuentas y tablas) y fotos, en un solo archivo cifrado con age.
// Solo lee de la base de datos. La tarea .github/workflows/backup.yml la lanza cada semana.
// El repo es público: nunca se escribe en los registros nada más que recuentos.
//
//   node scripts/tripulacion-backup.mjs salida.tar.gz.age
//
// Necesita SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y BACKUP_AGE_RECIPIENT, además de Docker y age.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'mercado-fotos';
const { SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BACKUP_AGE_RECIPIENT } = process.env;
const out = process.argv[2];
if (!out || !SUPABASE_DB_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !/^age1[a-z0-9]+$/.test(BACKUP_AGE_RECIPIENT ?? '')) {
  console.error('✗ Faltan la salida, SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o una clave pública age válida.');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const work = mkdtempSync(join(tmpdir(), 'tripulacion-backup-'));

async function listAll(prefix) {
  const items = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`No se pudieron listar las fotos: ${error.message}`);
    items.push(...data);
    if (data.length < 1000) return items;
  }
}

try {
  // La URL va por el entorno, no como argumento, para que no salga en la lista de procesos.
  const dump = execFileSync('docker', ['run', '--rm', '--network', 'host', '-e', 'SUPABASE_DB_URL', 'postgres:17-alpine', 'sh', '-c',
    `pg_dump "$SUPABASE_DB_URL" --data-only --no-owner --no-privileges -t auth.users -t auth.identities -t 'public.mercado_*'`,
  ], { maxBuffer: 1024 * 1024 * 512, stdio: ['ignore', 'pipe', 'inherit'] }).toString();
  if (!dump.includes('COPY public.mercado_attendance') || !dump.includes('COPY auth.users')) throw new Error('La copia de datos está incompleta.');
  writeFileSync(join(work, 'datos.sql'), dump);

  let photos = 0;
  mkdirSync(join(work, 'fotos'));
  for (const folder of await listAll('')) {
    for (const file of await listAll(folder.name)) {
      const path = `${folder.name}/${file.name}`;
      const { data, error } = await db.storage.from(BUCKET).download(path);
      if (error) throw new Error(`No se pudo descargar una foto: ${error.message}`);
      mkdirSync(join(work, 'fotos', folder.name), { recursive: true });
      writeFileSync(join(work, 'fotos', path), Buffer.from(await data.arrayBuffer()));
      photos++;
    }
  }

  const target = resolve(out);
  mkdirSync(dirname(target), { recursive: true });
  execFileSync('bash', ['-c', 'set -euo pipefail; tar -czf - -C "$WORK" datos.sql fotos | age -r "$BACKUP_AGE_RECIPIENT" -o "$TARGET"'], {
    env: { ...process.env, WORK: work, TARGET: target }, stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (readFileSync(target).subarray(0, 21).toString() !== 'age-encryption.org/v1') throw new Error('El archivo de salida no está cifrado.');
  console.log(`✓ Copia cifrada: ${(dump.match(/^COPY /gm) ?? []).length} tablas y ${photos} fotos.`);
} catch (e) {
  rmSync(out, { force: true });
  console.error(`✗ ${e.message.split('\n')[0]}`);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
