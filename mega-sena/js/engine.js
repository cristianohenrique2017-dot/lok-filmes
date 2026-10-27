/* Motor estatístico da Mega-Sena. Sem dependências; roda no navegador e no Node. */
(function (root) {
  const N = 60;
  const PRECO = { 6: 6, 7: 42, 8: 168, 9: 504, 10: 1260, 11: 2772, 12: 5544, 13: 10296, 14: 18018, 15: 30030 };

  function comb(n, k) {
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return Math.round(r);
  }

  const key = nums => nums.slice().sort((a, b) => a - b).join('-');
  const quantil = (arr, q) => {
    const s = arr.slice().sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
  };

  // RNG criptográfico (navegador ou Node), sem viés de módulo
  function rand() {
    const c = root.crypto || (typeof require !== 'undefined' ? require('crypto').webcrypto : null);
    if (!c) return Math.random();
    const b = new Uint32Array(2);
    c.getRandomValues(b);
    return (b[0] * 2097152 + (b[1] >>> 11)) / 9007199254740992;
  }

  /** draws: [[concurso, data, d1..d6], ...] em ordem crescente de concurso */
  function analisar(draws, janelaRecente = 200) {
    const total = draws.length;
    const freq = Array(N + 1).fill(0);
    const rec = Array(N + 1).fill(0);
    const ultimo = Array(N + 1).fill(-1);
    const sums = [], odds = [], lows = [], consec = [];
    const jogosSorteados = new Set();
    draws.forEach((d, i) => {
      const nums = d.slice(2);
      jogosSorteados.add(key(nums));
      nums.forEach(n => {
        freq[n]++;
        ultimo[n] = i;
        if (i >= total - janelaRecente) rec[n]++;
      });
      sums.push(nums.reduce((a, b) => a + b, 0));
      odds.push(nums.filter(n => n % 2).length);
      lows.push(nums.filter(n => n <= 30).length);
      consec.push(nums.filter((n, j) => j && n - nums[j - 1] === 1).length);
    });
    const atraso = ultimo.map(u => (u < 0 ? total : total - 1 - u));
    const dist = arr => {
      const m = {};
      arr.forEach(v => (m[v] = (m[v] || 0) + 1));
      return m;
    };
    // faixas observadas em ~90% dos concursos
    const estrutura = {
      somaMin: quantil(sums, 0.05), somaMax: quantil(sums, 0.95), somaMediana: quantil(sums, 0.5),
      impares: Object.keys(dist(odds)).map(Number).filter(k => dist(odds)[k] / total >= 0.05),
      baixos: Object.keys(dist(lows)).map(Number).filter(k => dist(lows)[k] / total >= 0.05),
      maxConsecutivos: quantil(consec, 0.95),
      distImpares: dist(odds), distBaixos: dist(lows)
    };
    // qui-quadrado de uniformidade (59 g.l.)
    const esperado = (total * 6) / N;
    let chi2 = 0;
    for (let n = 1; n <= N; n++) chi2 += (freq[n] - esperado) ** 2 / esperado;
    const gl = N - 1;
    const z = (Math.pow(chi2 / gl, 1 / 3) - (1 - 2 / (9 * gl))) / Math.sqrt(2 / (9 * gl));
    const pValor = 0.5 * erfc(z / Math.SQRT2);
    return { total, freq, rec, atraso, janelaRecente, jogosSorteados, estrutura, esperado, chi2, gl, pValor };
  }

  function erfc(x) { // Abramowitz-Stegun 7.1.26
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : 2 - y;
  }

  const zs = arr => {
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length) || 1;
    return arr.map(v => (v - m) / sd);
  };

  const FOCOS = {
    equilibrado: { freq: 0.4, rec: 0.3, atraso: 0.3, nome: 'Equilibrado' },
    frequentes: { freq: 1, rec: 0, atraso: 0, nome: 'Mais frequentes (histórico todo)' },
    recentes: { freq: 0, rec: 1, atraso: 0, nome: 'Mais frequentes (recentes)' },
    atrasados: { freq: 0, rec: 0, atraso: 1, nome: 'Mais atrasados' }
  };

  /** Peso de cada dezena (1..60) combinando frequência, janela recente e atraso. */
  function pesos(est, foco = 'equilibrado', intensidade = 0.6) {
    const f = FOCOS[foco] || FOCOS.equilibrado;
    const idx = Array.from({ length: N }, (_, i) => i + 1);
    const zf = zs(idx.map(n => est.freq[n])), zr = zs(idx.map(n => est.rec[n])), za = zs(idx.map(n => est.atraso[n]));
    const w = Array(N + 1).fill(0);
    idx.forEach((n, i) => (w[n] = Math.exp(intensidade * (f.freq * zf[i] + f.rec * zr[i] + f.atraso * za[i]))));
    return w;
  }

  function sortear(w, k, fixos = [], excluidos = []) {
    const livres = [];
    for (let n = 1; n <= N; n++) if (!excluidos.includes(n) && !fixos.includes(n)) livres.push(n);
    const esc = fixos.slice();
    while (esc.length < k) {
      const soma = livres.reduce((a, n) => a + w[n], 0);
      let r = rand() * soma, i = 0;
      for (; i < livres.length - 1; i++) { r -= w[livres[i]]; if (r <= 0) break; }
      esc.push(livres.splice(i, 1)[0]);
    }
    return esc.sort((a, b) => a - b);
  }

  function perfil(nums) {
    return {
      soma: nums.reduce((a, b) => a + b, 0),
      impares: nums.filter(n => n % 2).length,
      baixos: nums.filter(n => n <= 30).length,
      consecutivos: nums.filter((n, j) => j && n - nums[j - 1] === 1).length
    };
  }

  function estruturaOk(nums, e) {
    const p = perfil(nums);
    return p.soma >= e.somaMin && p.soma <= e.somaMax && e.impares.includes(p.impares) &&
      e.baixos.includes(p.baixos) && p.consecutivos <= e.maxConsecutivos;
  }

  /** Índice 0-100 de aderência ao padrão histórico. NÃO é probabilidade de ganhar. */
  function indice(nums, est, w) {
    const wmax = Math.max(...w.slice(1)), wmin = Math.min(...w.slice(1));
    const mediaPeso = nums.reduce((a, n) => a + (w[n] - wmin) / (wmax - wmin || 1), 0) / nums.length;
    const p = perfil(nums), e = est.estrutura;
    const amplitude = (e.somaMax - e.somaMin) / 2 || 1;
    const prox = Math.max(0, 1 - Math.abs(p.soma - e.somaMediana) / (amplitude * 1.5));
    const ok = (e.impares.includes(p.impares) ? 1 : 0) + (e.baixos.includes(p.baixos) ? 1 : 0) + (p.consecutivos <= e.maxConsecutivos ? 1 : 0);
    return Math.round(100 * (0.45 * mediaPeso + 0.25 * prox + 0.30 * (ok / 3)));
  }

  /**
   * Gera `qtd` jogos distintos. Garante: sem jogo repetido no lote, sem jogo que já foi
   * sorteado na história e, no máximo, `maxIguais` dezenas em comum entre dois jogos.
   */
  function gerar(est, opc = {}) {
    const { qtd = 6, dezenas = 6, foco = 'equilibrado', intensidade = 0.6, maxIguais = 3,
      fixos = [], excluidos = [], jaTem = new Set() } = opc;
    const w = pesos(est, foco, intensidade);
    const jogos = [], vistos = new Set(jaTem);
    let tentativas = 0, folga = maxIguais;
    while (jogos.length < qtd && tentativas < 60000) {
      tentativas++;
      if (tentativas % 8000 === 0) folga = Math.min(dezenas - 1, folga + 1); // relaxa se o filtro ficar apertado
      const nums = sortear(w, dezenas, fixos, excluidos);
      const k = key(nums);
      if (vistos.has(k) || est.jogosSorteados.has(k)) continue;
      if (dezenas === 6 && !estruturaOk(nums, est.estrutura)) continue;
      if (jogos.some(j => j.nums.filter(n => nums.includes(n)).length > folga)) continue;
      vistos.add(k);
      jogos.push({ nums, indice: indice(nums, est, w), ...perfil(nums) });
    }
    return jogos.sort((a, b) => b.indice - a.indice);
  }

  const api = { N, PRECO, comb, key, analisar, pesos, gerar, indice, perfil, estruturaOk, FOCOS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Mega = api;
})(typeof window !== 'undefined' ? window : globalThis);
