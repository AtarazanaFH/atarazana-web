import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// CI ejecuta verify directamente. Los paquetes sin .git (p. ej. un despliegue) no necesitan hooks.
if (process.env.CI || process.env.VERCEL || !existsSync(`${root}.git`)) process.exit(0);

const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], { cwd: root, encoding: 'utf8' });
if (current.error) throw current.error;
if (![0, 1].includes(current.status)) throw new Error(current.stderr || 'No se pudo consultar core.hooksPath');
if (current.stdout.trim() && current.stdout.trim() !== '.githooks') {
  throw new Error(`Ya hay otra ruta de hooks: ${current.stdout.trim()}. Integra el pre-commit de .githooks antes de cambiarla.`);
}
chmodSync(`${root}.githooks/pre-commit`, 0o755);
execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { cwd: root });
console.log('Hook instalado: cada commit ejecutará npm run verify.');
