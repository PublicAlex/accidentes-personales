// Guarda de arquitectura (AD-1): globals prohibidos en el núcleo y fetch fuera de api/.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXT = /\.(ts|tsx|mts|cts|js|mjs|cjs)$/;

const reglasNucleo = [
  ['new Date(', /new Date\(/],
  ['Date.now', /Date\.now/],
  ['crypto.', /\bcrypto\./],
  ['process.', /\bprocess\./],
  ['Buffer.', /\bBuffer\./],
  ['console.', /\bconsole\./],
];

function archivos(dir) {
  if (!existsSync(dir)) return [];
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...archivos(ruta));
    else if (EXT.test(nombre)) salida.push(ruta);
  }
  return salida;
}

const violaciones = [];

function revisar(ruta, reglas) {
  const lineas = readFileSync(ruta, 'utf8').split('\n');
  lineas.forEach((linea, i) => {
    for (const [nombre, regex] of reglas) {
      if (regex.test(linea)) {
        violaciones.push(`${relative(raiz, ruta)}:${i + 1}: uso prohibido de "${nombre}"`);
      }
    }
  });
}

for (const capa of ['domain', 'application']) {
  for (const f of archivos(join(raiz, 'backend', 'src', capa))) revisar(f, reglasNucleo);
}
const apiDir = join(raiz, 'frontend', 'src', 'api') + sep;
for (const f of archivos(join(raiz, 'frontend', 'src'))) {
  if (!f.startsWith(apiDir)) revisar(f, [['fetch(', /\bfetch\(/]]);
}

if (violaciones.length > 0) {
  console.error('check-globals: se encontraron usos prohibidos:');
  for (const v of violaciones) console.error('  ' + v);
  process.exit(1);
}
console.log('check-globals: sin violaciones.');
