#!/usr/bin/env node
/* Gera dist/meu-bolso.html: o app inteiro em um único arquivo (abre com duplo clique, sem servidor).
   Com --fragment gera dist/meu-bolso.fragment.html, sem <html>/<head>/<body>, para publicar como página embutida. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const fragment = process.argv.includes('--fragment');

let html = read('index.html');
const css = read('css/app.css');
html = html.replace(/<link rel="stylesheet" href="css\/app.css">/, () => '<style>\n' + css + '\n</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) => '<script>\n' + read(f) + '\n</script>');
html = html.replace(/<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n?/g, '');

if (fragment) {
  const title = (html.match(/<title>[\s\S]*?<\/title>/) || [''])[0];
  const fonts = (html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/) || [''])[0];
  const style = (html.match(/<style>[\s\S]*?<\/style>/) || [''])[0];
  const body = html.replace(/[\s\S]*<body>/, '').replace(/<\/body>[\s\S]*/, '');
  html = [title, fonts, style, body.trim()].join('\n');
}
const out = path.join(root, 'dist', fragment ? 'meu-bolso.fragment.html' : 'meu-bolso.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('gerado', path.relative(root, out), (html.length / 1024).toFixed(0) + ' KB');
