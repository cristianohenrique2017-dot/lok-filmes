# Gerador Mega-Sena

PWA em HTML/CSS/JS puros (sem build). Abra `mega-sena/index.html` por um servidor estático.

- Gera jogos de 6 a 15 dezenas, sempre distintos entre si e nunca iguais a um sorteio já ocorrido.
- Pondera dezenas por frequência histórica, janela recente e atraso; filtra pelo perfil histórico (soma, pares/ímpares, baixas/altas, consecutivas).
- Estatísticas, teste qui-quadrado de uniformidade, conferência de jogos salvos e importação de concursos novos.
- `dist/mega-sena.html`: versão em arquivo único (`node tools/build-single.js`), abre direto no celular.
- Base: concursos 1 a 3074 (1996 a 24/10/2026), de [eduardoapr/sorteios-mega-quina-lotofacil](https://github.com/eduardoapr/sorteios-mega-quina-lotofacil). `tools/build-data.js` regenera `js/data.js` a partir de `tools/sorteios-megasena.csv`.

Aviso: a Mega-Sena é aleatória. Nenhum método aumenta a chance de acerto (1 em 50.063.860 na sena).
