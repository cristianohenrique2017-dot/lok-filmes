// Gera dist/mega-sena.html: o app inteiro em um único arquivo (abre direto no celular, sem servidor)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const ler = f => fs.readFileSync(path.join(root, f), 'utf8');
let html = ler('index.html');
html = html
  .replace(/<link rel="manifest"[^>]*>\n?/, '')
  .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(ler('icons/icon.svg')).toString('base64')}">`)
  .replace(/<link rel="stylesheet" href="css\/app.css">/, () => `<style>\n${ler('css/app.css')}</style>`)
  .replace(/<svg viewBox="0 0 24 24" width="26" height="26"[^>]*><use[^>]*\/><\/svg>/, () => ler('icons/icon.svg').replace('<svg ', '<svg width="26" height="26" ').replace('id="t"', ''))
  .replace(/<script src="js\/(\w+)\.js"><\/script>/g, (_, n) => `<script>\n${ler(`js/${n}.js`)}</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/mega-sena.html'), html);
console.log('dist/mega-sena.html', (html.length / 1024).toFixed(0) + ' KB');
