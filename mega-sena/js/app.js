(function () {
  const $ = id => document.getElementById(id);
  const LS_EXTRA = 'mega.extra', LS_SALVOS = 'mega.salvos';
  const ler = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  const pad = n => String(n).padStart(2, '0');
  const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dataBR = iso => iso.split('-').reverse().join('/');

  let draws, est, ultimosJogos = [];

  function carregar() {
    const base = window.MEGA_DATA, extra = ler(LS_EXTRA, []);
    const ids = new Set(base.map(r => r[0]));
    draws = base.concat(extra.filter(r => !ids.has(r[0]))).sort((a, b) => a[0] - b[0]);
    est = Mega.analisar(draws);
    const u = draws[draws.length - 1];
    $('resumoBase').textContent = `${draws.length} concursos analisados (${dataBR(draws[0][1])} a ${dataBR(u[1])})`;
    $('infoBase').textContent = `Último concurso na base: ${u[0]} (${dataBR(u[1])}). ${extra.length} concurso(s) adicionados por você.`;
    renderStats();
  }

  function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); setTimeout(() => t.classList.remove('on'), 2200); }
  const parseNums = s => [...new Set((s.match(/\d+/g) || []).map(Number).filter(n => n >= 1 && n <= 60))];

  // ---------- Gerar ----------
  function iniciarForm() {
    for (let k = 6; k <= 15; k++) $('dezenas').add(new Option(`${k} dezenas, ${brl(Mega.PRECO[k])}`, k));
    Object.entries(Mega.FOCOS).forEach(([k, f]) => $('foco').add(new Option(f.nome, k)));
    $('intens').oninput = () => ($('intensVal').textContent = $('intens').value + '%');
    $('iguais').oninput = () => ($('iguaisVal').textContent = $('iguais').value);
    ['qtd', 'dezenas'].forEach(i => ($(i).onchange = atualizarCusto));
    $('btnGerar').onclick = gerar;
    atualizarCusto();
  }
  function atualizarCusto() {
    const q = Math.max(1, Math.min(100, +$('qtd').value || 1)), d = +$('dezenas').value;
    const chance = (Mega.comb(60, 6) / Mega.comb(d, 6)).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    $('custo').textContent = `Custo estimado: ${brl(q * Mega.PRECO[d])} · chance de cada jogo na sena: 1 em ${chance}`;
  }

  function gerar() {
    const qtd = Math.max(1, Math.min(100, +$('qtd').value || 1)), dezenas = +$('dezenas').value;
    const fixos = parseNums($('fixos').value), excluidos = parseNums($('excluidos').value);
    if (fixos.length >= dezenas) return toast('Há dezenas fixas demais para esse tipo de jogo.');
    if (fixos.some(n => excluidos.includes(n))) return toast('Uma dezena não pode ser fixa e excluída.');
    if (60 - excluidos.length < dezenas) return toast('Dezenas excluídas demais.');
    ultimosJogos = Mega.gerar(est, {
      qtd, dezenas, foco: $('foco').value, intensidade: $('intens').value / 100 * 1.2,
      maxIguais: +$('iguais').value, fixos, excluidos
    }).map(j => ({ ...j, fixos }));
    if (ultimosJogos.length < qtd) toast(`Só foi possível gerar ${ultimosJogos.length} jogos distintos com esses filtros.`);
    renderJogos();
  }

  const bolas = (nums, extra = {}) => `<div class="bolas">${nums.map(n =>
    `<span class="bola${extra.fixos?.includes(n) ? ' fixa' : ''}${extra.acertos?.includes(n) ? ' acerto' : ''}">${pad(n)}</span>`).join('')}</div>`;

  function renderJogos() {
    if (!ultimosJogos.length) { $('resultado').innerHTML = ''; return; }
    $('resultado').innerHTML = `<div class="card"><h2>${ultimosJogos.length} jogos gerados</h2>
      ${ultimosJogos.map(j => `<div class="jogo">${bolas(j.nums, j)}
        <div class="meta"><span>Soma ${j.soma} · ${j.impares} ímpares · ${j.baixos} baixas · ${j.consecutivos} consec.</span>
        <span>Índice <span class="idx">${j.indice}</span>/100</span></div></div>`).join('')}
      <div class="acoes"><button class="sec" id="bSalvar">Salvar jogos</button><button class="sec" id="bCopiar">Copiar</button></div>
      <p class="nota">O Índice mede a semelhança com o perfil histórico, não a chance de ganhar (que é igual para todos os jogos).</p></div>`;
    $('bSalvar').onclick = () => {
      const s = ler(LS_SALVOS, []), ks = new Set(s.map(j => Mega.key(j.nums)));
      const novos = ultimosJogos.filter(j => !ks.has(Mega.key(j.nums))).map(j => ({ nums: j.nums, em: new Date().toISOString().slice(0, 10) }));
      gravar(LS_SALVOS, s.concat(novos)); renderSalvos(); toast(`${novos.length} jogo(s) salvo(s).`);
    };
    $('bCopiar').onclick = () => {
      const txt = ultimosJogos.map(j => j.nums.map(pad).join(' ')).join('\n');
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copiado!'), () => toast('Não foi possível copiar.'));
    };
  }

  // ---------- Estatísticas ----------
  function renderStats() {
    const e = est, esp = e.esperado;
    const max = Math.max(...e.freq.slice(1));
    $('statsTeste').innerHTML = `<h2>Os números são realmente "mais sorteáveis"?</h2>
      <p>Teste qui-quadrado de uniformidade: χ² = <b>${e.chi2.toFixed(1)}</b> (${e.gl} g.l.), p = <b>${e.pValor.toFixed(2)}</b>.</p>
      <p class="nota">${e.pValor > 0.05
        ? 'Não há evidência de que alguma dezena saia mais que as outras: as diferenças de frequência são compatíveis com o acaso. A estratégia é só um filtro de perfil, sem poder de previsão.'
        : 'As diferenças de frequência estão acima do esperado ao acaso, mas isso não garante que se repitam nos próximos sorteios.'}</p>`;
    $('grafFreq').innerHTML = Array.from({ length: 60 }, (_, i) => i + 1).map(n =>
      `<i class="${e.freq[n] < esp ? 'baixo' : ''}" style="height:${e.freq[n] / max * 100}%" title="${pad(n)}: ${e.freq[n]}x"></i>`).join('') +
      `<span class="media" style="bottom:${esp / max * 100}%" title="média esperada ${esp.toFixed(0)}"></span>`;
    const topo = (arr, f, n = 8) => arr.slice(1).map((v, i) => [i + 1, v]).sort((a, b) => f(b[1]) - f(a[1]) || a[0] - b[0]).slice(0, n);
    const bloco = (t, lista, un) => `<div class="rk"><h3>${t}</h3><div class="bolas">${lista.map(([n]) => `<span class="bola">${pad(n)}</span>`).join('')}</div>
      <small>${lista.map(([n, v]) => `${pad(n)}: ${v}${un}`).join(' · ')}</small></div>`;
    $('rank').innerHTML = bloco('Mais frequentes', topo(e.freq, v => v), 'x') +
      bloco('Menos frequentes', topo(e.freq, v => -v), 'x') +
      bloco(`Mais em ${e.janelaRecente} últimos`, topo(e.rec, v => v), 'x') +
      bloco('Mais atrasadas', topo(e.atraso, v => v), ' conc.');
    const tab = (t, d, ok) => `<h3 style="margin:12px 0 4px;font-size:14px">${t}</h3><table>${Object.keys(d).sort((a, b) => a - b).map(k =>
      `<tr><td>${k}</td><td style="width:60%"><div class="barra" style="width:${d[k] / e.total * 100 * 2}%"></div></td><td>${(d[k] / e.total * 100).toFixed(1)}%</td></tr>`).join('')}</table>`;
    const s = e.estrutura;
    $('padroes').innerHTML = `<p>Soma das 6 dezenas: mediana <b>${s.somaMediana}</b>; 90% dos sorteios ficam entre <b>${s.somaMin}</b> e <b>${s.somaMax}</b>.</p>` +
      tab('Quantidade de ímpares', s.distImpares) + tab('Quantidade de dezenas baixas (1 a 30)', s.distBaixos);
  }

  // ---------- Conferir ----------
  function renderSalvos() {
    const s = ler(LS_SALVOS, []);
    $('salvos').innerHTML = s.length ? s.map(j => `<div class="jogo">${bolas(j.nums)}<div class="meta"><span>Salvo em ${dataBR(j.em)}</span></div></div>`).join('')
      : '<p class="nota">Nenhum jogo salvo ainda. Gere jogos e toque em "Salvar jogos".</p>';
  }
  function conferir() {
    const sorteio = parseNums($('sorteadas').value);
    if (sorteio.length !== 6) return toast('Informe exatamente 6 dezenas diferentes (1 a 60).');
    const s = ler(LS_SALVOS, []);
    if (!s.length) return toast('Salve alguns jogos antes.');
    const r = s.map(j => ({ j, ac: j.nums.filter(n => sorteio.includes(n)) }));
    const nome = { 6: 'SENA!', 5: 'Quina', 4: 'Quadra' };
    $('confRes').innerHTML = '<div style="margin-top:12px">' + r.sort((a, b) => b.ac.length - a.ac.length).map(({ j, ac }) =>
      `<div class="jogo">${bolas(j.nums, { acertos: ac })}<div class="meta"><span><b>${ac.length} acerto(s)</b> ${nome[ac.length] ? '· ' + nome[ac.length] : ''}</span></div></div>`).join('') + '</div>';
  }

  // ---------- Dados ----------
  function addExtra(novos) {
    const ex = ler(LS_EXTRA, []), ids = new Set(draws.map(r => r[0]));
    const add = novos.filter(r => !ids.has(r[0]));
    gravar(LS_EXTRA, ex.concat(add)); carregar();
    return add.length;
  }
  function linhaParaDraw(l) {
    const p = l.split(/[,;\t]/).map(x => x.trim()).filter(Boolean);
    if (p.length < 8) return null;
    let d = p[1].replace(/[()]/g, '');
    if (d.includes('/')) d = d.split('/').reverse().join('-');
    const nums = p.slice(2, 8).map(Number).sort((a, b) => a - b);
    if (!+p[0] || nums.some(n => !(n >= 1 && n <= 60)) || new Set(nums).size !== 6) return null;
    return [+p[0], d, ...nums];
  }
  async function buscarCaixa() {
    const m = $('msgCaixa'); m.textContent = 'Consultando…';
    const base = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena';
    try {
      const ult = await (await fetch(base)).json();
      const fim = ult.numero, ini = draws[draws.length - 1][0] + 1;
      if (fim < ini) { m.textContent = 'A base já está atualizada.'; return; }
      if (fim - ini > 900) throw new Error('muitos concursos');
      const novos = [];
      for (let n = ini; n <= fim; n++) {
        const r = await (await fetch(`${base}/${n}`)).json();
        const nums = r.listaDezenas.map(Number).sort((a, b) => a - b);
        novos.push([n, r.dataApuracao.split('/').reverse().join('-'), ...nums]);
        m.textContent = `Baixando ${n - ini + 1}/${fim - ini + 1}…`;
      }
      m.textContent = `${addExtra(novos)} concursos adicionados.`;
    } catch (e) {
      m.textContent = 'A Caixa bloqueou o acesso direto do navegador (CORS) ou você está sem internet. Use "colar resultados" abaixo: exporte o Excel de resultados no site da Caixa e cole as linhas novas.';
    }
  }

  function iniciarAbas() {
    document.querySelectorAll('.abas button').forEach(b => b.onclick = () => {
      document.querySelectorAll('.abas button,.aba').forEach(x => x.classList.remove('ativa'));
      b.classList.add('ativa'); $('aba-' + b.dataset.aba).classList.add('ativa'); scrollTo(0, 0);
    });
  }

  iniciarAbas(); iniciarForm(); carregar(); renderSalvos();
  $('btnConferir').onclick = conferir;
  $('btnCaixa').onclick = buscarCaixa;
  $('btnLimpar').onclick = () => { if (confirm('Apagar todos os jogos salvos?')) { gravar(LS_SALVOS, []); renderSalvos(); $('confRes').innerHTML = ''; } };
  $('btnImportar').onclick = () => {
    const novos = $('colar').value.split(/\r?\n/).map(linhaParaDraw).filter(Boolean);
    if (!novos.length) return toast('Nenhuma linha válida encontrada.');
    toast(`${addExtra(novos)} concurso(s) adicionado(s).`); $('colar').value = '';
  };
  $('btnReset').onclick = () => { gravar(LS_EXTRA, []); carregar(); toast('Base original restaurada.'); };
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
