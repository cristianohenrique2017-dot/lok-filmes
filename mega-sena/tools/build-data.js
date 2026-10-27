// Converte sorteios-megasena.csv (concurso,data,"d1 .. d6",...) em js/data.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const rows = fs.readFileSync(path.join(__dirname, 'sorteios-megasena.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map(l => {
  const p = l.split(',');
  return [Number(p[0]), p[1], ...p[2].split(' ').map(Number).sort((a, b) => a - b)];
}).sort((a, b) => a[0] - b[0]);
if (rows.some((r, i) => r[0] !== i + 1 || r.length !== 8)) throw new Error('base com falhas ou lacunas');
fs.mkdirSync(path.join(root, 'js'), { recursive: true });
fs.writeFileSync(path.join(root, 'js/data.js'),
  '// Resultados da Mega-Sena: [concurso, data, d1..d6]. Gerado por tools/build-data.js\nwindow.MEGA_DATA = ' + JSON.stringify(rows) + ';\n');
console.log(rows.length, 'concursos', rows[0][1], '->', rows.at(-1)[1]);
