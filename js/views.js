/* Telas do app: início, extrato, planejar (orçamento/relatórios), contas, fatura, menu e categorias. */
(function (G) {
  'use strict';
  var esc = U.esc, M = function (c) { return U.money(c); };

  var V = {
    ym: U.today().slice(0, 7),
    ext: { q: '', type: 'all', acc: '', sort: 'desc' },
    rep: 'expense',
    plan: 'orc',
    catQ: ''
  };
  G.V = V;

  var TABS = { home: 1, extrato: 1, orcamento: 1, contas: 1 };

  /* ---------- peças reutilizáveis ---------- */
  function catBadge(catId, size, status) {
    var c = Cat.get(catId), g = Cat.group(c.g);
    return '<span class="ci" style="--c:' + g.color + '">' + icon(c.icon, size || 20) + (status || '') + '</span>';
  }
  function groupBadge(g, size) { return '<span class="ci" style="--c:' + g.color + '">' + icon(g.icon, size || 20) + '</span>'; }
  function avatar(a, cls) {
    return '<span class="av ' + (cls || '') + '" style="background:' + a.color + ';color:' + fgOn(a.color) + '">' + esc(U.initials(a.name)) + '</span>';
  }
  function stBadge(t) {
    if (t.type === 'transfer') return '';
    return t.paid ? '<i class="st ok">' + icon('check', 10) + '</i>' : '<i class="st pend' + (t.date < U.today() ? ' late' : '') + '">' + icon('clock', 10) + '</i>';
  }

  function txParts(t) {
    var c = Cat.get(t.cat), where = '', title = t.desc || c.name, ic, color = null;
    if (t.card) { var cd = S.card(t.card); where = (cd ? cd.name : 'Cartão') + ' · Crédito'; }
    else if (t.type === 'transfer') {
      var a = S.account(t.acc), b = S.account(t.to);
      where = (a ? a.name : '?') + ' → ' + (b ? b.name : '?');
    } else { var ac = S.account(t.acc); where = ac ? ac.name : ''; }
    if (t.type === 'transfer' && !t.desc) title = 'Transferência';
    if (t.rec === 'inst') title += ' (' + t.n + '/' + t.N + ')';
    if (t.type === 'transfer') { ic = '<span class="ci" style="--c:#3b6cf0">' + icon('swap', 20) + '</span>'; }
    else if (t.kind === 'invoice') {
      var cc = S.card(t.inv.card);
      ic = '<span class="ci" style="--c:' + (cc ? cc.color : '#45b866') + '">' + icon('card', 20) + stBadge(t) + '</span>';
    } else ic = catBadge(t.cat, 20, stBadge(t));
    return { title: title, sub: (t.type === 'transfer' ? 'Transferência' : c.name) + ' | ' + where, icon: ic, color: color };
  }

  function amountHtml(t) {
    var cls = t.type === 'income' ? 'pos' : t.type === 'transfer' ? 'info' : 'neg';
    var sign = t.type === 'income' ? '+' : t.type === 'transfer' ? '' : '−';
    return '<b class="amt ' + cls + (t.paid ? '' : ' pend') + '">' + sign + M(t.amount) + '</b>';
  }

  function txRow(t, withDate) {
    var p = txParts(t);
    return '<button class="row" data-a="tx" data-id="' + t.id + '">' + p.icon +
      '<span class="rm"><b class="rt">' + esc(p.title) + (t.rec === 'fixed' ? ' <span class="rep" title="Recorrente">' + icon('repeat', 12) + '</span>' : '') + '</b>' +
      '<small class="rs">' + esc(p.sub) + '</small></span>' +
      '<span class="ra">' + amountHtml(t) + (withDate ? '<small>' + U.dayShort(t.date) + '</small>' : '') + '</span></button>';
  }

  function groupByDay(list, desc) {
    var days = {}, order = [];
    list.forEach(function (t) { if (!days[t.date]) { days[t.date] = []; order.push(t.date); } days[t.date].push(t); });
    order.sort(); if (desc) order.reverse();
    return order.map(function (d) {
      var net = U.sum(days[d], function (t) { return t.type === 'income' ? t.amount : t.type === 'expense' && t.kind !== 'invoice' ? -t.amount : 0; });
      return '<div class="day"><span>' + esc(U.dayLabel(d)) + '</span>' + (net ? '<small class="' + (net > 0 ? 'pos' : 'neg') + '">' + (net > 0 ? '+' : '−') + M(Math.abs(net)) + '</small>' : '') + '</div>' +
        '<div class="list">' + days[d].map(function (t) { return txRow(t); }).join('') + '</div>';
    }).join('');
  }

  function monthTabs() {
    var yr = new Date().getFullYear();
    function lab(ym, cur) {
      var s = cur ? U.monthName(ym) : U.monthShort(ym);
      if (+ym.slice(0, 4) !== yr) s += cur ? ' ' + ym.slice(0, 4) : ' ’' + ym.slice(2, 4);
      return s;
    }
    return '<nav class="mt" aria-label="Mês">' +
      '<button data-a="month" data-d="-1">' + lab(U.addMonths(V.ym, -1)) + '</button>' +
      '<button class="on" data-a="month-pick" aria-label="Escolher mês">' + lab(V.ym, true) + '</button>' +
      '<button data-a="month" data-d="1">' + lab(U.addMonths(V.ym, 1)) + '</button></nav>';
  }

  function eyeBtn() {
    return '<button class="ibtn" data-a="toggle-hide" aria-label="' + (U.hidden ? 'Mostrar valores' : 'Ocultar valores') + '">' + icon(U.hidden ? 'eyeoff' : 'eye', 20) + '</button>';
  }

  function subHeader(title, right) {
    return '<header class="hdr sub"><div class="hdr-row"><button class="ibtn" data-a="back" aria-label="Voltar">' + icon('left', 22) + '</button>' +
      '<h1>' + esc(title) + '</h1><div class="hdr-actions">' + (right || '') + '</div></div></header>';
  }

  function empty(ic, title, text, btn) {
    return '<div class="empty">' + icon(ic, 34) + '<b>' + esc(title) + '</b><p>' + esc(text) + '</p>' + (btn || '') + '</div>';
  }

  function greeting() {
    var h = new Date().getHours();
    return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }

  /* ---------- início ---------- */
  function home() {
    var st = S.get(), ym = V.ym, bal = S.balances(), total = S.totalBalance(bal), t = S.totals(ym);
    var name = st.settings.name.trim(), now = U.today().slice(0, 7);
    var h = '<header class="hdr home"><div class="hdr-row">' +
      '<button class="who" data-a="go" data-r="menu"><span class="me">' + (name ? esc(name[0].toUpperCase()) : icon('user', 18)) + '</span>' +
      '<span><small>' + greeting() + (name ? ',' : '') + '</small>' + (name ? '<b>' + esc(name.split(' ')[0]) + '</b>' : '<b>Meu Bolso</b>') + '</span></button>' +
      '<div class="hdr-actions">' + eyeBtn() + '<button class="ibtn" data-a="month-pick" aria-label="Escolher mês">' + icon('calendar', 20) + '</button></div></div>' +
      monthTabs() +
      '<div class="bal"><div><small>Saldo geral</small><strong>' + M(total) + '</strong>' +
      (ym >= now ? '<small class="proj">Previsto até o fim de ' + U.monthName(ym).toLowerCase() + ': <b>' + M(S.projected(ym)) + '</b></small>' : '<small class="proj">Saldo atual de todas as contas</small>') +
      '</div><button class="more" data-a="go" data-r="contas">Detalhes ' + icon('right', 16) + '</button></div></header>';

    var b = '<main class="page pull">';
    b += '<div class="stats"><button class="stat" data-a="ext-filter" data-t="income"><span class="si pos">' + icon('trendingup', 18) + '</span><span><small>Ganhos</small><b>' + M(t.inc) + '</b></span></button>' +
      '<button class="stat" data-a="ext-filter" data-t="expense"><span class="si neg">' + icon('trendingup', 18, 'flipy') + '</span><span><small>Gastos</small><b>' + M(t.exp) + '</b></span></button></div>';

    if (st.settings.demo) {
      b += '<div class="note"><div>' + icon('sparkles', 20) + '<p><b>Dados de exemplo.</b> Explore à vontade e depois comece com os seus.</p></div>' +
        '<div class="note-btns"><button class="btn mini ghost" data-a="demo-keep">Entendi</button><button class="btn mini primary" data-a="reset">Começar do zero</button></div></div>';
    }

    if (!st.accounts.length) {
      b += '<div class="card welcome"><h2>Vamos começar</h2><p>Crie sua primeira conta para registrar ganhos e gastos.</p>' +
        '<button class="btn primary" data-a="account-new">' + icon('plus', 18) + ' Criar conta</button></div>';
      return h + b + '</main>';
    }

    // alertas de orçamento
    var by = S.byGroup(ym, 'expense'), alerts = [];
    Object.keys(st.budgets).forEach(function (gid) {
      var spent = by[gid] ? by[gid].total : 0, pct = spent / st.budgets[gid];
      if (pct >= 0.8) alerts.push({ g: Cat.group(gid), pct: pct, spent: spent, limit: st.budgets[gid] });
    });
    alerts.sort(function (a, c) { return c.pct - a.pct; });
    if (alerts.length) {
      b += '<div class="alerts">' + alerts.slice(0, 2).map(function (a) {
        return '<button class="alert ' + (a.pct >= 1 ? 'over' : 'warn') + '" data-a="go" data-r="orcamento">' + icon('alert', 18) +
          '<span><b>' + esc(a.g.name) + '</b> ' + (a.pct >= 1 ? 'passou do limite em ' + M(a.spent - a.limit) : 'já usou ' + Math.round(a.pct * 100) + '% do orçamento') + '</span>' + icon('right', 16) + '</button>';
      }).join('') + '</div>';
    }

    // próximos lançamentos
    var up = S.upcoming();
    b += '<div class="sec"><h2>Próximos lançamentos</h2><button class="lnk" data-a="ext-filter" data-t="pending">Ver todos</button></div>';
    if (!up.length) b += '<div class="card soft slim">' + icon('circlecheck', 20) + '<span>Nada pendente para os próximos 30 dias.</span></div>';
    else {
      b += '<div class="hscroll">' + up.slice(0, 12).map(function (u) {
        var late = u.date < U.today();
        if (u.kind === 'inv') {
          var i = u.inv;
          return '<button class="up" data-a="go" data-r="fatura/' + i.card.id + '/' + i.ym + '"><span class="up-top"><span class="ci" style="--c:' + i.card.color + '">' + icon('card', 18) + '</span><span class="up-t"><b>Fatura ' + esc(i.card.name) + '</b><small>Cartão de crédito</small></span></span>' +
            '<span class="up-b"><small class="' + (late ? 'late' : '') + '">' + (late ? 'Venceu ' : 'Vence ') + U.dayShort(u.date) + '</small><b>' + M(i.total) + '</b></span></button>';
        }
        var x = u.tx, p = txParts(x), c = Cat.get(x.cat);
        return '<button class="up" data-a="tx" data-id="' + x.id + '"><span class="up-top">' + catBadge(x.cat, 18) + '<span class="up-t"><b>' + esc(p.title) + '</b><small>' + esc(Cat.group(c.g).name) + (x.rec === 'fixed' ? ' | Recorrência' : '') + '</small></span></span>' +
          '<span class="up-b"><small class="' + (late ? 'late' : '') + '">' + (late ? 'Atrasado ' : '') + U.dayShort(x.date) + '</small><b class="' + (x.type === 'income' ? 'pos' : '') + '">' + M(x.amount) + '</b></span></button>';
      }).join('') + '</div>';
    }

    // últimas transações
    var today = U.today();
    var last = st.tx.filter(function (x) { return x.date <= today; })
      .sort(function (a, c) { return a.date < c.date ? 1 : a.date > c.date ? -1 : (a.id < c.id ? 1 : -1); }).slice(0, 6);
    b += '<div class="sec"><h2>Últimas transações</h2><button class="lnk" data-a="go" data-r="extrato">Ver extrato</button></div>';
    b += last.length ? '<div class="list card flush">' + last.map(function (x) { return txRow(x, true); }).join('') + '</div>' :
      empty('receipt', 'Nenhum lançamento ainda', 'Toque no botão + para registrar o primeiro.');

    b += '<div class="quick"><button data-a="go" data-r="orcamento" data-p="rep">' + icon('pie', 20) + '<span>Relatórios</span></button>' +
      '<button data-a="go" data-r="orcamento" data-p="orc">' + icon('target', 20) + '<span>Orçamento</span></button>' +
      '<button data-a="go" data-r="categorias">' + icon('tag', 20) + '<span>Categorias</span></button></div>';
    return h + b + '</main>';
  }

  /* ---------- extrato ---------- */
  function extFiltered() {
    var f = V.ext, q = U.norm(f.q);
    var list = S.monthTx(V.ym).filter(function (t) {
      if (f.type === 'income' && t.type !== 'income') return false;
      if (f.type === 'expense' && (t.type !== 'expense')) return false;
      if (f.type === 'pending' && (t.paid || t.card)) return false;
      if (f.type === 'transfer' && t.type !== 'transfer') return false;
      if (f.acc) {
        if (f.acc.indexOf('c:') === 0) { if (t.card !== f.acc.slice(2)) return false; }
        else if (t.acc !== f.acc && t.to !== f.acc) return false;
      }
      if (q) {
        var a = S.account(t.acc), hay = U.norm((t.desc || '') + ' ' + Cat.get(t.cat).name + ' ' + (a ? a.name : '') + ' ' + U.num(t.amount) + ' ' + (t.note || ''));
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    return list;
  }
  function extListHtml() {
    var list = extFiltered();
    if (!list.length) return empty('search', 'Nada por aqui', V.ext.q || V.ext.type !== 'all' || V.ext.acc ? 'Nenhum lançamento com esses filtros em ' + U.monthName(V.ym).toLowerCase() + '.' : 'Nenhum lançamento em ' + U.monthName(V.ym).toLowerCase() + '. Toque em + para adicionar.');
    return groupByDay(list, V.ext.sort === 'desc');
  }
  function extStats() {
    var t = S.totals(V.ym);
    return '<div class="stats"><div class="stat"><span class="si pos">' + icon('trendingup', 18) + '</span><span><small>Ganhos do mês</small><b>' + M(t.inc) + '</b></span></div>' +
      '<div class="stat"><span class="si neg">' + icon('trendingup', 18, 'flipy') + '</span><span><small>Gastos do mês</small><b>' + M(t.exp) + '</b></span></div></div>';
  }
  function extrato() {
    var st = S.get(), f = V.ext;
    var h = '<header class="hdr"><div class="hdr-row"><div class="hdr-title"><h1>Extrato</h1><small>Visão por competência</small></div>' +
      '<div class="hdr-actions">' + eyeBtn() + '<button class="ibtn" data-a="month-pick" aria-label="Escolher mês">' + icon('calendar', 20) + '</button></div></div>' + monthTabs() + '</header>';
    var chips = [['all', 'Tudo'], ['income', 'Receitas'], ['expense', 'Despesas'], ['pending', 'Pendentes'], ['transfer', 'Transferências']];
    var opts = '<option value="">Todas as contas</option>' + st.accounts.map(function (a) { return '<option value="' + a.id + '"' + (f.acc === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') +
      st.cards.map(function (c) { return '<option value="c:' + c.id + '"' + (f.acc === 'c:' + c.id ? ' selected' : '') + '>Cartão ' + esc(c.name) + '</option>'; }).join('');
    var b = '<main class="page pull">' +
      '<div class="search"><label class="sbox">' + icon('search', 18) + '<input id="ext-q" type="search" placeholder="Buscar transação" value="' + esc(f.q) + '" data-v="ext-q" autocomplete="off"></label>' +
      '<button class="sq" data-a="ext-sort" aria-label="Inverter ordem">' + icon('swap', 18, 'rot90') + '</button></div>' +
      '<div id="ext-stats">' + extStats() + '</div>' +
      '<div class="chips">' + chips.map(function (c) { return '<button class="chip' + (f.type === c[0] ? ' on' : '') + '" data-a="ext-type" data-t="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<div class="sel"><select id="ext-acc" data-v="ext-acc" aria-label="Filtrar por conta">' + opts + '</select>' + icon('down', 16) + '</div>' +
      '<div id="ext-list">' + extListHtml() + '</div></main>';
    return h + b;
  }

  /* ---------- planejar: orçamento e relatórios ---------- */
  function seg(items, cur, action) {
    return '<div class="seg">' + items.map(function (i) {
      return '<button class="' + (cur === i[0] ? 'on' : '') + '" data-a="' + action + '" data-v="' + i[0] + '">' + i[1] + '</button>';
    }).join('') + '</div>';
  }
  function pctClass(p) { return p >= 1 ? 'over' : p >= 0.8 ? 'warn' : 'ok'; }

  function budgetBody() {
    var st = S.get(), by = S.byGroup(V.ym, 'expense'), bud = st.budgets;
    var rows = Cat.groups.filter(function (g) { return g.kind === 'e'; }).map(function (g) {
      return { g: g, spent: by[g.id] ? by[g.id].total : 0, limit: bud[g.id] || 0 };
    });
    var withL = rows.filter(function (r) { return r.limit > 0; }).sort(function (a, b) { return b.spent / b.limit - a.spent / a.limit; });
    var noL = rows.filter(function (r) { return !r.limit && r.spent > 0; }).sort(function (a, b) { return b.spent - a.spent; });
    var free = rows.filter(function (r) { return !r.limit && !r.spent; });
    var totL = U.sum(withL, function (r) { return r.limit; }), totS = U.sum(withL, function (r) { return r.spent; });
    var out = '';

    if (totL) {
      var p = totS / totL;
      out += '<div class="card sumcard"><div class="sum-top"><div><small>Orçamento de ' + U.monthName(V.ym).toLowerCase() + '</small><b>' + M(totS) + '</b><small>de ' + M(totL) + '</small></div>' +
        '<span class="pct ' + pctClass(p) + ' big">' + Math.round(p * 100) + '%</span></div>' +
        '<div class="bar"><i class="' + pctClass(p) + '" style="width:' + Math.min(100, p * 100) + '%"></i></div>' +
        '<small class="' + (totL - totS < 0 ? 'neg' : '') + '">' + (totL - totS >= 0 ? 'Restam ' + M(totL - totS) : 'Estourou em ' + M(totS - totL)) + '</small></div>';
    } else {
      out += '<div class="card soft slim">' + icon('target', 20) + '<span>Defina um limite mensal por categoria e acompanhe o quanto já gastou.</span></div>';
    }

    function brow(r) {
      var p = r.limit ? r.spent / r.limit : 0;
      return '<button class="brow" data-a="budget" data-g="' + r.g.id + '">' + groupBadge(r.g) + '<span class="bm"><span class="bt"><b>' + esc(r.g.name) + '</b>' +
        (r.limit ? '<span class="pct ' + pctClass(p) + '">' + Math.round(p * 100) + '%</span>' : '<span class="lnk">Definir limite</span>') + '</span>' +
        '<span class="bar"><i class="' + (r.limit ? pctClass(p) : '') + '" style="width:' + (r.limit ? Math.min(100, p * 100) : 0) + '%;--c:' + r.g.color + '"></i></span>' +
        '<small>' + M(r.spent) + (r.limit ? ' de ' + M(r.limit) + (r.limit >= r.spent ? ' · restam ' + M(r.limit - r.spent) : ' · passou ' + M(r.spent - r.limit)) : ' gastos sem limite') + '</small></span></button>';
    }
    if (withL.length) out += '<div class="sec"><h2>Seus limites</h2></div><div class="list card flush">' + withL.map(brow).join('') + '</div>';
    if (noL.length) out += '<div class="sec"><h2>Gastos sem limite</h2></div><div class="list card flush">' + noL.map(brow).join('') + '</div>';
    if (free.length) out += '<div class="sec"><h2>Criar limite</h2></div><div class="chips wrap">' + free.map(function (r) {
      return '<button class="chip" data-a="budget" data-g="' + r.g.id + '">' + icon('plus', 14) + esc(r.g.name) + '</button>';
    }).join('') + '</div>';

    // equilíbrio financeiro 50/30/20
    var inc = S.totals(V.ym).inc, bk = { ess: 0, non: 0, inv: 0 };
    Object.keys(by).forEach(function (gid) { var g = Cat.group(gid); if (g.bucket) bk[g.bucket] += by[gid].total; });
    var defs = [['ess', 'Gastos essenciais', 0.5, 'Moradia, alimentação, saúde, transporte e educação'], ['non', 'Gastos não essenciais', 0.3, 'Compras, lazer, serviços digitais e outros'], ['inv', 'Investimentos e finanças', 0.2, 'Aportes, reserva e demais movimentos financeiros']];
    out += '<div class="sec"><h2>Equilíbrio financeiro</h2><span class="hint">50 · 30 · 20</span></div><div class="card bal503020">';
    if (!inc) out += '<p class="muted">Registre suas receitas deste mês para ver quanto cada grupo de gastos deveria ocupar.</p>';
    else defs.forEach(function (d) {
      var lim = Math.round(inc * d[2]), p = lim ? bk[d[0]] / lim : 0;
      out += '<div class="eq"><div class="eq-t"><b>' + d[1] + '</b><span>' + M(bk[d[0]]) + '</span></div><div class="bar"><i class="' + pctClass(p) + '" style="width:' + Math.min(100, p * 100) + '%"></i></div>' +
        '<div class="eq-b"><small>' + d[3] + '</small><small>Limite recomendado: <b>' + M(lim) + '</b></small></div></div>';
    });
    return out + '</div>';
  }

  function nice(max) {
    if (max <= 0) return 100000;
    var p = Math.pow(10, Math.floor(Math.log10(max))), f = max / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }
  function compact(c) {
    var v = c / 100;
    if (v >= 1000) { var k = v / 1000; return (Math.round(k * 10) / 10).toString().replace('.', ',') + ' mil'; }
    return Math.round(v).toString();
  }

  function donut(items, total) {
    var R = 78, C = 2 * Math.PI * R, acc = 0, segs = '';
    if (!total) segs = '<circle cx="100" cy="100" r="' + R + '" fill="none" stroke="var(--line)" stroke-width="26"/>';
    else items.forEach(function (it) {
      var len = it.total / total * C, gap = items.length > 1 ? Math.min(3, len * 0.3) : 0;
      segs += '<circle cx="100" cy="100" r="' + R + '" fill="none" stroke="' + it.g.color + '" stroke-width="26" stroke-dasharray="' + Math.max(0, len - gap).toFixed(2) + ' ' + (C - len + gap).toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '" transform="rotate(-90 100 100)"/>';
      acc += len;
    });
    return '<svg viewBox="0 0 200 200" class="donut" role="img" aria-label="Gráfico por categoria">' + segs + '</svg>';
  }

  function barChart(series) {
    var W = 340, H = 190, top = 14, base = 150, left = 34, right = 8;
    var max = nice(Math.max.apply(null, series.map(function (s) { return Math.max(s.inc, s.exp); }).concat([1])));
    var step = (W - left - right) / series.length, bw = 13, out = '';
    function y(v) { return base - (v / max) * (base - top); }
    [0, 0.5, 1].forEach(function (f) {
      var yy = y(max * f);
      out += '<line x1="' + left + '" x2="' + (W - right) + '" y1="' + yy + '" y2="' + yy + '" class="gl"/><text x="' + (left - 6) + '" y="' + (yy + 3.5) + '" class="gt" text-anchor="end">' + (f === 0 ? '0' : compact(max * f)) + '</text>';
    });
    series.forEach(function (s, i) {
      var cx = left + step * i + step / 2, on = s.ym === V.ym;
      if (on) out += '<rect x="' + (cx - step / 2 + 3) + '" y="' + (top - 6) + '" width="' + (step - 6) + '" height="' + (base - top + 28) + '" rx="8" class="sel-bg"/>';
      var hi = Math.max(s.inc ? base - y(s.inc) : 0, 0), he = Math.max(s.exp ? base - y(s.exp) : 0, 0);
      out += '<rect x="' + (cx - bw - 1.5) + '" y="' + (base - hi) + '" width="' + bw + '" height="' + hi + '" rx="3" class="b-inc"/>' +
        '<rect x="' + (cx + 1.5) + '" y="' + (base - he) + '" width="' + bw + '" height="' + he + '" rx="3" class="b-exp"/>' +
        '<text x="' + cx + '" y="' + (base + 18) + '" text-anchor="middle" class="bl' + (on ? ' on' : '') + '">' + U.monthShort(s.ym) + '</text>' +
        '<rect x="' + (cx - step / 2) + '" y="0" width="' + step + '" height="' + H + '" fill="transparent" data-a="bar" data-ym="' + s.ym + '" style="cursor:pointer"><title>' + U.monthName(s.ym) + '</title></rect>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="bars" role="img" aria-label="Ganhos e gastos dos últimos 6 meses">' + out + '</svg>';
  }

  function reportBody() {
    var type = V.rep, by = S.byGroup(V.ym, type);
    var items = Object.keys(by).map(function (gid) { return { g: Cat.group(gid), total: by[gid].total, cats: by[gid].cats }; }).sort(function (a, b) { return b.total - a.total; });
    var total = U.sum(items, function (i) { return i.total; });
    var prev = U.sum(Object.keys(S.byGroup(U.addMonths(V.ym, -1), type)), function (k) { return S.byGroup(U.addMonths(V.ym, -1), type)[k].total; });
    var out = seg([['expense', 'Despesas'], ['income', 'Receitas']], type, 'rep-type');

    var delta = '';
    if (prev && total) {
      var d = (total - prev) / prev, good = type === 'income' ? d >= 0 : d <= 0;
      delta = '<small class="delta ' + (good ? 'pos' : 'neg') + '">' + (d >= 0 ? '▲' : '▼') + ' ' + Math.abs(Math.round(d * 100)) + '% em relação a ' + U.monthName(U.addMonths(V.ym, -1)).toLowerCase() + '</small>';
    }
    out += '<div class="card donut-card"><div class="donut-wrap">' + donut(items, total) +
      '<div class="donut-c"><small>' + (type === 'income' ? 'Receitas' : 'Despesas') + '</small><b>' + M(total) + '</b></div></div>' + delta + '</div>';

    if (items.length) {
      out += '<div class="list card flush legend">' + items.map(function (it) {
        var cats = Object.keys(it.cats).map(function (id) { return [Cat.get(id), it.cats[id]]; }).sort(function (a, b) { return b[1] - a[1]; });
        return '<details><summary><span class="ci" style="--c:' + it.g.color + '">' + icon(it.g.icon, 18) + '</span><span class="rm"><b class="rt">' + esc(it.g.name) + '</b>' +
          '<span class="bar thin"><i style="width:' + (it.total / total * 100).toFixed(1) + '%;background:' + it.g.color + '"></i></span></span>' +
          '<span class="ra"><b>' + M(it.total) + '</b><small>' + (it.total / total * 100).toFixed(1).replace('.', ',') + '%</small></span></summary>' +
          '<ul>' + cats.map(function (c) { return '<li><span>' + esc(c[0].name) + '</span><b>' + M(c[1]) + '</b></li>'; }).join('') + '</ul></details>';
      }).join('') + '</div>';
    } else out += empty('pie', 'Sem ' + (type === 'income' ? 'receitas' : 'despesas'), 'Nada registrado em ' + U.monthName(V.ym).toLowerCase() + '.');

    var series = S.series(V.ym, 6), cur = series[series.length - 1];
    out += '<div class="sec"><h2>Últimos 6 meses</h2></div><div class="card chart">' + barChart(series) +
      '<div class="lg"><span><i class="d inc"></i>Ganhos</span><span><i class="d exp"></i>Gastos</span></div>' +
      '<div class="chart-sum"><div><small>Ganhos em ' + U.monthShort(V.ym).toLowerCase() + '.</small><b class="pos">' + M(cur.inc) + '</b></div><div><small>Gastos em ' + U.monthShort(V.ym).toLowerCase() + '.</small><b class="neg">' + M(cur.exp) + '</b></div>' +
      '<div><small>Resultado</small><b class="' + (cur.inc - cur.exp >= 0 ? 'pos' : 'neg') + '">' + M(cur.inc - cur.exp) + '</b></div></div></div>';

    var top = S.monthTx(V.ym).filter(function (t) { return t.type === type && t.kind !== 'invoice'; }).sort(function (a, b) { return b.amount - a.amount; }).slice(0, 5);
    if (top.length) out += '<div class="sec"><h2>Maiores ' + (type === 'income' ? 'receitas' : 'gastos') + '</h2></div><div class="list card flush">' + top.map(function (t) { return txRow(t, true); }).join('') + '</div>';
    return out;
  }

  function orcamento() {
    var h = '<header class="hdr"><div class="hdr-row"><div class="hdr-title"><h1>Planejar</h1><small>' + (V.plan === 'orc' ? 'Orçamento mensal por categoria' : 'Para onde vai o seu dinheiro') + '</small></div>' +
      '<div class="hdr-actions">' + eyeBtn() + '<button class="ibtn" data-a="month-pick" aria-label="Escolher mês">' + icon('calendar', 20) + '</button></div></div>' + monthTabs() + '</header>';
    return h + '<main class="page pull">' + seg([['orc', 'Orçamento'], ['rep', 'Relatórios']], V.plan, 'plan-tab') +
      (V.plan === 'orc' ? budgetBody() : reportBody()) + '</main>';
  }

  /* ---------- contas e cartões ---------- */
  var TYPES = { checking: 'Conta corrente', savings: 'Poupança', cash: 'Dinheiro', invest: 'Investimentos' };
  G.ACCOUNT_TYPES = TYPES;

  function contas() {
    var st = S.get(), bal = S.balances(), total = S.totalBalance(bal);
    var h = '<header class="hdr"><div class="hdr-row"><div class="hdr-title"><h1>Contas</h1><small>Saldos e cartões</small></div><div class="hdr-actions">' + eyeBtn() + '</div></div>' +
      '<div class="bal"><div><small>Saldo geral</small><strong>' + M(total) + '</strong></div></div></header>';
    var b = '<main class="page pull"><div class="sec first"><h2>Minhas contas</h2><button class="lnk" data-a="account-new">' + icon('plus', 14) + ' Nova conta</button></div>';
    b += st.accounts.length ? '<div class="list card flush">' + st.accounts.map(function (a) {
      return '<button class="row" data-a="account" data-id="' + a.id + '">' + avatar(a) + '<span class="rm"><b class="rt">' + esc(a.name) + '</b><small class="rs">' + TYPES[a.type] + (a.nosum ? ' · fora do saldo geral' : '') + '</small></span>' +
        '<span class="ra"><b class="amt ' + (bal[a.id] < 0 ? 'neg' : 'acc') + '">' + M(bal[a.id]) + '</b></span></button>';
    }).join('') + '</div>' : empty('bank', 'Nenhuma conta', 'Cadastre suas contas para acompanhar os saldos.', '<button class="btn primary" data-a="account-new">Criar conta</button>');

    b += '<div class="sec"><h2>Cartões de crédito</h2><button class="lnk" data-a="card-new">' + icon('plus', 14) + ' Novo cartão</button></div>';
    if (!st.cards.length) b += '<div class="card soft slim">' + icon('card', 20) + '<span>Cadastre um cartão para acompanhar faturas e limite disponível.</span></div>';
    st.cards.forEach(function (c) {
      var ym = S.currentInvoiceYm(c.id), inv = S.invoice(c.id, ym), used = S.cardUsed(c.id), p = c.limit ? used / c.limit : 0;
      b += '<div class="card ccard"><div class="ccard-top"><button class="ccard-id" data-a="card-edit" data-id="' + c.id + '">' + avatar({ name: c.name, color: c.color }) + '<span><b>' + esc(c.name) + '</b><small>Fecha dia ' + c.closing + ' · vence dia ' + c.due + '</small></span></button>' +
        '<button class="ibtn flat" data-a="card-edit" data-id="' + c.id + '" aria-label="Editar cartão">' + icon('edit', 18) + '</button></div>' +
        '<div class="bar"><i class="' + pctClass(p) + '" style="width:' + Math.min(100, p * 100) + '%"></i></div>' +
        '<div class="ccard-nums"><div><small>Disponível</small><b>' + M(Math.max(0, c.limit - used)) + '</b></div><div><small>Fatura de ' + U.monthName(ym).toLowerCase() + '</small><b class="neg">' + M(inv.total) + '</b></div>' +
        '<button class="btn mini ghost" data-a="go" data-r="fatura/' + c.id + '/' + ym + '">ver fatura</button></div></div>';
    });
    return h + b + '</main>';
  }

  var STATUS = { open: ['Aberta', 'info'], closed: ['Fechada', 'warn'], overdue: ['Vencida', 'over'], paid: ['Paga', 'ok'] };

  function fatura(parts) {
    var card = S.card(parts[1]);
    if (!card) return subHeader('Fatura') + '<main class="page">' + empty('card', 'Cartão não encontrado', 'Ele pode ter sido excluído.') + '</main>';
    var ym = parts[2] || S.currentInvoiceYm(card.id), inv = S.invoice(card.id, ym), stt = STATUS[inv.status];
    var h = subHeader('Detalhes da fatura', '<button class="ibtn" data-a="card-edit" data-id="' + card.id + '" aria-label="Editar cartão">' + icon('edit', 20) + '</button>') ;
    function tab(m, cur) { return '<button class="' + (cur ? 'on' : '') + '" data-a="go" data-r="fatura/' + card.id + '/' + m + '" data-replace="1">' + (cur ? U.monthName(m) : U.monthShort(m)) + (m.slice(0, 4) !== ym.slice(0, 4) ? ' ' + (cur ? m.slice(0, 4) : '’' + m.slice(2, 4)) : '') + '</button>'; }
    h = h.replace('</header>', '<nav class="mt">' + tab(U.addMonths(ym, -2)) + tab(U.addMonths(ym, -1)) + tab(ym, true) + tab(U.addMonths(ym, 1)) + tab(U.addMonths(ym, 2)) + '</nav></header>');
    var cardBg = 'background:linear-gradient(135deg,' + card.color + ',color-mix(in srgb,' + card.color + ' 55%,#000));color:' + fgOn(card.color);
    var b = '<main class="page pull"><div class="inv"><div class="inv-card" style="' + cardBg + '"><div class="inv-top"><span class="pill ' + stt[1] + '">' + stt[0] + '</span>' + icon('card', 22) + '</div>' +
      '<b>Cartão ' + esc(card.name) + '</b><div class="inv-dates"><span><small>Fecha em</small>' + U.dayShort(inv.close) + '</span><span><small>Vence em</small>' + U.dayShort(inv.due) + '</span></div></div>' +
      '<div class="inv-sum"><div><small>Valor da fatura</small><b class="neg">' + M(inv.total) + '</b></div><div><small>Limite disponível</small><b>' + M(Math.max(0, card.limit - S.cardUsed(card.id))) + '</b></div>' +
      '<div><small>Compras</small><b>' + inv.items.length + '</b></div></div></div>';
    if (inv.pay) b += '<div class="note ok"><div>' + icon('circlecheck', 20) + '<p><b>Fatura paga</b> em ' + U.dateLong(inv.pay.date) + '.</p></div><button class="btn mini ghost" data-a="tx" data-id="' + inv.pay.id + '">Ver pagamento</button></div>';
    else if (inv.total > 0) b += '<button class="btn primary block" data-a="pay-invoice" data-card="' + card.id + '" data-ym="' + ym + '">Pagar fatura · ' + M(inv.total) + '</button>';
    b += '<button class="btn ghost block" data-a="tx-new" data-card="' + card.id + '" data-date="' + (inv.close < U.today() ? inv.close : U.today()) + '">' + icon('plus', 18) + ' Nova compra no cartão</button>';
    b += inv.items.length ? groupByDay(inv.items, true) : empty('receipt', 'Fatura sem compras', 'As compras feitas no cartão aparecem aqui.');
    return h + b + '</main>';
  }

  /* ---------- categorias ---------- */
  /** Lista agrupada de categorias. opts: {type, selected, q, manage} */
  function catList(opts) {
    var q = U.norm(opts.q || ''), out = '';
    var groups = opts.type ? Cat.groupsFor(opts.type) : Cat.groups;
    groups.forEach(function (g) {
      var subs = Cat.inGroup(g.id).filter(function (c) { return !q || U.norm(c.name).indexOf(q) >= 0 || U.norm(g.name).indexOf(q) >= 0; });
      if (opts.type === 'income' && g.id === 'financas') subs = subs.filter(function (c) { return /rendimentos|juros|dividendos|transferencias|pensao|ajuste/.test(c.id) || c.id.indexOf('transf') === 0; });
      if (opts.type !== 'income' && opts.type && g.id === 'financas') subs = subs.filter(function (c) { return c.id !== 'fatura' || false; });
      if (!subs.length) return;
      out += '<section class="cg"><h3 class="cg-h">' + groupBadge(g, 20) + '<span>' + esc(g.name) + '</span></h3>' +
        subs.map(function (c) {
          return '<button class="cr' + (opts.selected === c.id ? ' sel' : '') + '" data-a="' + (opts.manage ? 'cat-open' : 'cat-pick') + '" data-id="' + c.id + '" style="--c:' + g.color + '">' +
            '<span class="ci sm">' + icon(c.icon, 18) + '</span><span class="rm"><b class="rt">' + esc(c.name) + '</b></span>' +
            (c.custom ? '<span class="tagc">sua</span>' : '') +
            '<span class="chk">' + (opts.selected === c.id ? icon('check', 14) : '') + '</span></button>';
        }).join('') + '</section>';
    });
    return out || '<div class="empty">' + icon('search', 30) + '<b>Nenhuma categoria encontrada</b><p>Tente outro termo ou crie uma nova categoria.</p></div>';
  }
  G.catList = catList;

  function categorias() {
    return subHeader('Categorias') + '<main class="page pull"><div class="search"><label class="sbox">' + icon('search', 18) +
      '<input id="cat-q" type="search" placeholder="Buscar" value="' + esc(V.catQ) + '" data-v="cat-q" autocomplete="off"></label></div>' +
      '<div id="cat-list">' + catList({ q: V.catQ, manage: true }) + '</div>' +
      '<button class="btn primary block" data-a="cat-new">' + icon('plus', 18) + ' Nova categoria</button></main>';
  }

  /* ---------- menu ---------- */
  function menu() {
    var st = S.get(), name = st.settings.name;
    function item(ic, title, sub, attrs, right) {
      return '<button class="mi" ' + attrs + '><span class="mi-i">' + icon(ic, 20) + '</span><span class="rm"><b class="rt">' + title + '</b>' + (sub ? '<small class="rs">' + sub + '</small>' : '') + '</span>' + (right || icon('right', 18)) + '</button>';
    }
    var sw = function (on) { return '<span class="switch' + (on ? ' on' : '') + '"><i></i></span>'; };
    var h = subHeader('Menu');
    var b = '<main class="page pull"><div class="card prof"><span class="me big">' + (name ? esc(name[0].toUpperCase()) : icon('user', 26)) + '</span>' +
      '<label><small>Seu nome</small><input id="set-name" data-v="name" value="' + esc(name) + '" placeholder="Como quer ser chamado?" maxlength="30" autocomplete="off"></label></div>';
    b += '<div class="sec"><h2>Geral</h2></div><div class="list card flush">' +
      item('tag', 'Categorias', Cat.all().length + ' categorias', 'data-a="go" data-r="categorias"') +
      item('pie', 'Relatórios', 'Gastos por categoria e evolução', 'data-a="go" data-r="orcamento" data-p="rep"') +
      item('file', 'Backup e restauração', 'Copie ou restaure seus dados', 'data-a="backup"') +
      (UI.canInstall ? item('download', 'Instalar o app', 'Adicione à tela inicial', 'data-a="install"') : '') + '</div>';
    b += '<div class="sec"><h2>Aparência</h2></div><div class="card"><div class="seg">' +
      [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']].map(function (t) { return '<button class="' + (st.settings.theme === t[0] ? 'on' : '') + '" data-a="theme" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div></div>';
    b += '<div class="list card flush">' + item('eyeoff', 'Ocultar valores', 'Esconde saldos e totais na tela', 'data-a="toggle-hide"', sw(st.settings.hide)) + '</div>';
    b += '<div class="sec"><h2>Dados</h2></div><div class="list card flush">' +
      item('sparkles', 'Carregar dados de exemplo', 'Substitui o que está salvo', 'data-a="demo"') +
      item('trash', 'Apagar todos os dados', 'Remove contas, cartões e lançamentos', 'data-a="reset" data-danger="1"') + '</div>';
    b += '<p class="foot">Meu Bolso · versão 1.0<br>Seus dados ficam salvos só neste aparelho.</p></main>';
    return h + b;
  }

  /* ---------- exports ---------- */
  G.Views = {
    home: home, extrato: extrato, orcamento: orcamento, contas: contas, fatura: fatura, categorias: categorias, menu: menu,
    extListHtml: extListHtml, extStats: extStats, tabs: TABS, txRow: txRow, avatar: avatar, catBadge: catBadge, groupBadge: groupBadge, txParts: txParts, amountHtml: amountHtml
  };
})(window);
