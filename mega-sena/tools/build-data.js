// Converte dadosmega.csv (concurso,(dd/mm/aaaa),d1..d6) em js/data.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const rows = fs.readFileSync(path.join(__dirname, 'dadosmega.csv'), 'utf8').split(/\r?\n/).filter(Boolean).map(l => {
  const p = l.split(',');
  const [d, m, y] = p[1].replace(/[()]/g, '').split('/');
  const nums = p.slice(2, 8).map(Number).sort((a, b) => a - b);
  return [Number(p[0]), `${y}-${m}-${d}`, ...nums];
}).filter(r => r.slice(2).length === 6 && r.slice(2).every(n => n >= 1 && n <= 60))
  .sort((a, b) => a[0] - b[0])
  .filter((r, i, a) => i === 0 || r[0] !== a[i - 1][0]); // o CSV de origem repete um bloco de concursos
fs.mkdirSync(path.join(root, 'js'), { recursive: true });
fs.writeFileSync(path.join(root, 'js/data.js'),
  '// Resultados da Mega-Sena: [concurso, data, d1..d6]. Gerado por tools/build-data.js\nwindow.MEGA_DATA = ' + JSON.stringify(rows) + ';\n');
console.log(rows.length, 'concursos', rows[0][1], '->', rows.at(-1)[1]);
