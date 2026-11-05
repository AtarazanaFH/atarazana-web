import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { env, root } from './local.mjs';

export function command(executable, args, options = {}, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: root, timeout: 30000, ...options });
    let output = '';
    child.stdout.on('data', (data) => { output += data; });
    child.stderr.on('data', (data) => { output += data; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, output }));
    child.stdin.on('error', () => {}); // El proceso puede cerrar antes de leer, p. ej. si falta Docker.
    child.stdin.end(input);
  });
}

// SMTP mínimo: acepta o rechaza MAIL FROM y descarta el cuerpo. Nunca entrega correo.
export async function importer(t, marea, csv) {
  const dir = await mkdtemp(join(tmpdir(), 'tripulacion-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, 'attendees.csv'), csv);
  const state = { reject: true, attempts: 0, delivered: 0 };
  const sockets = new Set();
  const smtp = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.write('220 tests.local ESMTP\r\n');
    let buffer = '', dataMode = false;
    socket.on('data', (bytes) => {
      buffer += bytes;
      while (buffer.includes('\r\n')) {
        const end = buffer.indexOf('\r\n');
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (dataMode) {
          if (line === '.') { dataMode = false; state.delivered++; socket.write('250 Discarded\r\n'); }
        } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250 tests.local\r\n');
        else if (/^MAIL FROM/i.test(line)) { state.attempts++; socket.write(state.reject ? '451 Simulated failure\r\n' : '250 OK\r\n'); }
        else if (/^DATA/i.test(line)) { dataMode = true; socket.write('354 End with dot\r\n'); }
        else if (/^QUIT/i.test(line)) socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  t.after(() => { for (const socket of sockets) socket.destroy(); return new Promise((resolve) => smtp.close(resolve)); });
  await new Promise((resolve, reject) => { smtp.once('error', reject); smtp.listen(0, '127.0.0.1', resolve); });
  const run = ({ dryRun = false, failInsert = false, flags = [] } = {}) => command(process.execPath, [
    ...(failInsert ? ['--import', './tests/helpers/fail-invite-insert.mjs'] : []),
    'scripts/tripulacion.mjs', 'import', marea, join(dir, 'attendees.csv'), ...(dryRun ? ['--dry-run'] : []), ...flags,
  ], { env: { ...process.env, ...env, SITE_URL: 'http://localhost:4321', GMAIL_APP_PASSWORD: '', LOCAL_SMTP_PORT: String(smtp.address().port) } });
  return { state, run };
}
