// scan:secrets -> gitleaks en contenedor (si hay docker) + búsqueda en frontend/dist.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
let fallo = false;

const docker = spawnSync('docker', ['--version'], { stdio: 'ignore' });
if (docker.status === 0) {
  const r = spawnSync(
    'docker',
    ['run', '--rm', '-v', `${raiz}:/repo`, 'zricethezav/gitleaks:v8.30.1', 'detect',
     '--source=/repo', '--config=/repo/.gitleaks.toml', '--no-banner', '--redact'],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) {
    console.error('scan:secrets: gitleaks no pasó o no pudo ejecutarse (imagen no disponible?).');
    fallo = true;
  }
} else {
  console.error('scan:secrets: docker no disponible; gitleaks NO se ejecutó.');
  fallo = true;
}

const patrones = [/JWT_SECRET/, /REVIEWER_PASSWORD/, /DATABASE_URL/, /postgres:\/\//, /VITE_/];
function recorrer(dir) {
  for (const n of readdirSync(dir)) {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) recorrer(ruta);
    else {
      const texto = readFileSync(ruta, 'utf8');
      for (const p of patrones) {
        if (p.test(texto)) {
          console.error(`scan:secrets: ${ruta} contiene ${p}`);
          fallo = true;
        }
      }
    }
  }
}
const dist = join(raiz, 'frontend', 'dist');
if (existsSync(dist)) recorrer(dist);
else console.warn('scan:secrets: frontend/dist no existe (ejecute npm run build); se omite.');

process.exit(fallo ? 1 : 0);
