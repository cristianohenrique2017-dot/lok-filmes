/* Estado do app: persistência em localStorage, mutações e consultas (saldos, faturas, totais). */
(function (G) {
  'use strict';
  var KEY = 'meubolso:v1';
  var state = null, subs = [], timer = null, mem = null;
  var S = {};

  function blank() {
    return {
      v: 1,
      settings: { name: '', theme: 'auto', hide: false, demo: false },
      accounts: [], cards: [], tx: [], budgets: {}, customCats: []
    };
  }

  function normalize(st) {
    var b = blank();
    st = st && typeof st === 'object' ? st : b;
    st.settings = Object.assign(b.settings, st.settings || {});
    ['accounts', 'cards', 'tx', 'customCats'].forEach(function (k) { if (!Array.isArray(st[k])) st[k] = []; });
    if (!st.budgets || typeof st.budgets !== 'object') st.budgets = {};
    st.v = 1;
    return st;
  }

  function persist() {
    var s = JSON.stringify(state);
    try { localStorage.setItem(KEY, s); } catch (e) { mem = s; }
  }
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(persist, 120);
  }
  S.flush = function () { if (timer) { clearTimeout(timer); timer = null; persist(); } };

  function applyDerived() {
    Cat.setCustom(state.customCats);
    U.hidden = !!state.settings.hide;
  }

  S.get = function () { return state; };
  S.subscribe = function (fn) { subs.push(fn); };
  function emit() { subs.forEach(function (fn) { fn(); }); }

  /** Aplica uma mutação, salva e notifica as telas. */
  S.commit = function (fn) {
    fn(state);
    applyDerived();
    schedule();
    emit();
  };

  S.init = function () {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = mem; }
    if (!raw) raw = mem;
    var parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
    if (parsed) { state = normalize(parsed); applyDerived(); }
    else { S.seedDemo(); }
  };

  /* ---------- consultas ---------- */
  S.account = function (id) { return state.accounts.find(function (a) { return a.id === id; }); };
  S.card = function (id) { return state.cards.find(function (c) { return c.id === id; }); };
  S.tx = function (id) { return state.tx.find(function (t) { return t.id === id; }); };

  /** Saldo atual de cada conta (só lançamentos efetivados). */
  S.balances = function () {
    var m = {};
    state.accounts.forEach(function (a) { m[a.id] = a.init || 0; });
    state.tx.forEach(function (t) {
      if (!t.paid || !t.acc || m[t.acc] === undefined) return;
      if (t.type === 'income') m[t.acc] += t.amount;
      else if (t.type === 'expense') m[t.acc] -= t.amount;
      else if (t.type === 'transfer') { m[t.acc] -= t.amount; if (t.to && m[t.to] !== undefined) m[t.to] += t.amount; }
    });
    return m;
  };
  S.totalBalance = function (bal) {
    bal = bal || S.balances();
    return U.sum(state.accounts, function (a) { return a.nosum ? 0 : bal[a.id]; });
  };

  S.monthTx = function (ym) {
    return state.tx.filter(function (t) { return t.date.slice(0, 7) === ym; });
  };
  function counts(t) { return t.type !== 'transfer' && t.kind !== 'invoice'; }

  /** Ganhos e gastos do mês (transferências e pagamento de fatura ficam de fora). */
  S.totals = function (ym) {
    var r = { inc: 0, exp: 0, pendInc: 0, pendExp: 0 };
    S.monthTx(ym).forEach(function (t) {
      if (!counts(t)) return;
      if (t.type === 'income') { r.inc += t.amount; if (!t.paid) r.pendInc += t.amount; }
      else { r.exp += t.amount; if (!t.paid) r.pendExp += t.amount; }
    });
    return r;
  };

  /** Gasto por grupo/categoria no mês. type: 'expense' | 'income'. */
  S.byGroup = function (ym, type) {
    var out = {};
    S.monthTx(ym).forEach(function (t) {
      if (!counts(t) || t.type !== type) return;
      var c = Cat.get(t.cat), g = out[c.g] || (out[c.g] = { total: 0, cats: {} });
      g.total += t.amount;
      g.cats[c.id] = (g.cats[c.id] || 0) + t.amount;
    });
    return out;
  };

  S.series = function (ym, n) {
    var out = [];
    for (var i = n - 1; i >= 0; i--) {
      var m = U.addMonths(ym, -i), t = S.totals(m);
      out.push({ ym: m, inc: t.inc, exp: t.exp });
    }
    return out;
  };

  /* ---------- faturas de cartão ---------- */
  S.invKey = function (card, date) {
    var ym = date.slice(0, 7);
    return +date.slice(8, 10) > card.closing ? U.addMonths(ym, 1) : ym;
  };
  S.invDates = function (card, ym) {
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7);
    var close = ym + '-' + U.pad(Math.min(card.closing, U.dim(y, m)));
    var dueYm = card.due > card.closing ? ym : U.addMonths(ym, 1);
    var dy = +dueYm.slice(0, 4), dm = +dueYm.slice(5, 7);
    return { close: close, due: dueYm + '-' + U.pad(Math.min(card.due, U.dim(dy, dm))) };
  };
  S.invPayment = function (cardId, ym) {
    return state.tx.find(function (t) { return t.inv && t.inv.card === cardId && t.inv.ym === ym; });
  };
  S.invoice = function (cardId, ym) {
    var card = S.card(cardId);
    var items = state.tx.filter(function (t) { return t.card === cardId && S.invKey(card, t.date) === ym; })
      .sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
    var total = U.sum(items, function (t) { return t.type === 'income' ? -t.amount : t.amount; });
    var d = S.invDates(card, ym), pay = S.invPayment(cardId, ym), today = U.today(), status;
    if (pay) status = 'paid';
    else if (today > d.due) status = 'overdue';
    else if (today > d.close) status = 'closed';
    else status = 'open';
    return { card: card, ym: ym, items: items, total: total, close: d.close, due: d.due, pay: pay, status: status };
  };
  /** Faturas ainda não pagas (com valor), de todos os cartões. */
  S.openInvoices = function () {
    var out = [];
    state.cards.forEach(function (card) {
      var keys = {};
      state.tx.forEach(function (t) { if (t.card === card.id) keys[S.invKey(card, t.date)] = 1; });
      Object.keys(keys).sort().forEach(function (ym) {
        var inv = S.invoice(card.id, ym);
        if (inv.status !== 'paid' && inv.total > 0) out.push(inv);
      });
    });
    return out;
  };
  S.cardUsed = function (cardId) {
    return U.sum(S.openInvoices().filter(function (i) { return i.card.id === cardId; }), function (i) { return i.total; });
  };
  /** Fatura "atual" do cartão: a primeira ainda não paga, ou a do mês corrente. */
  S.currentInvoiceYm = function (cardId) {
    var card = S.card(cardId), open = S.openInvoices().filter(function (i) { return i.card.id === cardId; });
    if (open.length) return open[0].ym;
    return S.invKey(card, U.today());
  };

  /** Próximos lançamentos: pendentes (inclui atrasados) e faturas a vencer nos próximos 30 dias. */
  S.upcoming = function () {
    var today = U.today(), limit = U.addDays(today, 30), out = [];
    state.tx.forEach(function (t) {
      if (t.paid || t.card || t.type === 'transfer' || t.date > limit) return;
      out.push({ kind: 'tx', date: t.date, tx: t });
    });
    S.openInvoices().forEach(function (i) {
      if (i.due <= limit) out.push({ kind: 'inv', date: i.due, inv: i });
    });
    return out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  };

  /** Saldo previsto até o fim do mês informado. */
  S.projected = function (ym) {
    var end = ym + '-31', bal = S.totalBalance();
    state.tx.forEach(function (t) {
      if (t.paid || t.card || !t.acc || t.date > end || t.type === 'transfer') return;
      var a = S.account(t.acc);
      if (!a || a.nosum) return;
      bal += t.type === 'income' ? t.amount : -t.amount;
    });
    S.openInvoices().forEach(function (i) { if (i.due <= end) bal -= i.total; });
    return bal;
  };

  /* ---------- lançamentos ---------- */
  function mkTx(o) {
    return Object.assign({
      id: U.uid(), type: 'expense', amount: 0, desc: '', cat: 'sem-categoria', acc: null, card: null,
      to: null, date: U.today(), paid: true, note: ''
    }, o);
  }

  /** Cria um lançamento; rep = {mode:'none'|'fixed'|'inst', count}. */
  S.addTx = function (base, rep) {
    var today = U.today(), list = [];
    rep = rep || { mode: 'none', count: 1 };
    var n = rep.mode === 'none' ? 1 : U.clamp(rep.count || 2, 2, 120);
    var sid = rep.mode === 'none' ? null : 's' + U.uid();
    var each = base.amount, rest = 0;
    if (rep.mode === 'inst') { each = Math.floor(base.amount / n); rest = base.amount - each * n; }
    for (var i = 0; i < n; i++) {
      var date = U.addMonths(base.date, i);
      var t = mkTx(base);
      t.date = date;
      t.amount = each + (i === 0 ? rest : 0);
      if (base.card) t.paid = true;
      else t.paid = i === 0 ? !!base.paid : (!!base.paid && date <= today);
      if (sid) { t.s = sid; t.n = i + 1; t.N = n; t.rec = rep.mode; }
      list.push(t);
    }
    S.commit(function (st) { st.tx.push.apply(st.tx, list); });
    return list;
  };

  function series(st, t, scope) {
    if (!t.s || scope === 'this' || !scope) return [t];
    return st.tx.filter(function (x) { return x.s === t.s && (scope === 'all' || x.n >= t.n); });
  }
  S.seriesCount = function (t, scope) {
    return series(state, t, scope).length;
  };

  S.updateTx = function (id, patch, scope) {
    S.commit(function (st) {
      var t = st.tx.find(function (x) { return x.id === id; });
      if (!t) return;
      series(st, t, scope).forEach(function (x) {
        if (x === t) { Object.assign(x, patch); return; }
        ['desc', 'cat', 'acc', 'card', 'to', 'type', 'note'].forEach(function (k) { if (k in patch) x[k] = patch[k]; });
        if ('amount' in patch && x.rec === 'fixed') x.amount = patch.amount;
        if (x.card) x.paid = true;
      });
    });
  };

  S.removeTx = function (id, scope) {
    S.commit(function (st) {
      var t = st.tx.find(function (x) { return x.id === id; });
      if (!t) return;
      var ids = {};
      series(st, t, scope).forEach(function (x) { ids[x.id] = 1; });
      st.tx = st.tx.filter(function (x) { return !ids[x.id]; });
    });
  };

  S.togglePaid = function (id) {
    S.commit(function (st) {
      var t = st.tx.find(function (x) { return x.id === id; });
      if (t && !t.card) t.paid = !t.paid;
    });
  };

  S.snapshot = function () { return JSON.stringify(state); };
  S.restore = function (snap) {
    S.commit(function (st) {
      var p = normalize(JSON.parse(snap));
      Object.keys(st).forEach(function (k) { delete st[k]; });
      Object.assign(st, p);
    });
  };

  S.payInvoice = function (cardId, ym, accId, date) {
    var inv = S.invoice(cardId, ym);
    if (inv.pay || inv.total <= 0) return;
    S.commit(function (st) {
      st.tx.push(mkTx({
        type: 'expense', kind: 'invoice', amount: inv.total, desc: 'Fatura ' + inv.card.name,
        cat: 'fatura', acc: accId, date: date, paid: true, inv: { card: cardId, ym: ym }
      }));
    });
  };

  /* ---------- contas e cartões ---------- */
  S.saveAccount = function (data) {
    var id = data.id;
    S.commit(function (st) {
      if (id) {
        var a = st.accounts.find(function (x) { return x.id === id; });
        if (!a) return;
        // o campo de saldo mostra o saldo atual; ajusta o saldo inicial pela diferença
        var cur = S.balances()[id];
        a.init = (a.init || 0) + (data.balance - cur);
        a.name = data.name; a.type = data.type; a.color = data.color; a.nosum = !!data.nosum;
      } else {
        st.accounts.push({ id: U.uid(), name: data.name, type: data.type, color: data.color, init: data.balance, nosum: !!data.nosum });
      }
    });
  };
  S.deleteAccount = function (id) {
    S.commit(function (st) {
      st.accounts = st.accounts.filter(function (a) { return a.id !== id; });
      st.tx = st.tx.filter(function (t) { return t.acc !== id && t.to !== id; });
      st.cards.forEach(function (c) { if (c.payAcc === id) c.payAcc = null; });
    });
  };
  S.saveCard = function (data) {
    S.commit(function (st) {
      if (data.id) {
        var c = st.cards.find(function (x) { return x.id === data.id; });
        if (c) Object.assign(c, data);
      } else {
        st.cards.push({ id: U.uid(), name: data.name, color: data.color, limit: data.limit, closing: data.closing, due: data.due, payAcc: data.payAcc });
      }
    });
  };
  S.deleteCard = function (id) {
    S.commit(function (st) {
      st.cards = st.cards.filter(function (c) { return c.id !== id; });
      st.tx = st.tx.filter(function (t) { return t.card !== id && !(t.inv && t.inv.card === id); });
    });
  };

  /* ---------- orçamento, categorias, ajustes ---------- */
  S.setBudget = function (gid, cents) {
    S.commit(function (st) { if (cents > 0) st.budgets[gid] = cents; else delete st.budgets[gid]; });
  };
  S.saveCat = function (data) {
    S.commit(function (st) {
      if (data.id) {
        var c = st.customCats.find(function (x) { return x.id === data.id; });
        if (c) { c.name = data.name; c.g = data.g; c.icon = data.icon; }
      } else {
        st.customCats.push({ id: 'c' + U.uid(), g: data.g, name: data.name, icon: data.icon });
      }
    });
  };
  S.deleteCat = function (id) {
    S.commit(function (st) {
      st.customCats = st.customCats.filter(function (c) { return c.id !== id; });
      st.tx.forEach(function (t) { if (t.cat === id) t.cat = 'sem-categoria'; });
    });
  };
  S.setSetting = function (k, v) { S.commit(function (st) { st.settings[k] = v; }); };

  S.exportJSON = function () { return JSON.stringify(state, null, 1); };
  S.importJSON = function (text) {
    var p = JSON.parse(text);
    if (!p || !Array.isArray(p.accounts) || !Array.isArray(p.tx)) throw new Error('Arquivo de backup inválido.');
    S.commit(function (st) {
      var n = normalize(p);
      Object.keys(st).forEach(function (k) { delete st[k]; });
      Object.assign(st, n);
    });
  };
  S.reset = function () {
    S.commit(function (st) {
      var n = blank();
      n.settings.theme = st.settings.theme;
      Object.keys(st).forEach(function (k) { delete st[k]; });
      Object.assign(st, n);
    });
  };

  /* ---------- dados de exemplo ---------- */
  S.seedDemo = function () {
    var n = blank(), today = U.today(), thisYm = today.slice(0, 7);
    state = n;
    n.settings.demo = true;
    var r = U.rng(20261025);
    function rnd(a, b) { return Math.round((a + r() * (b - a)) * 100); }
    function pick(a) { return a[Math.floor(r() * a.length)]; }

    n.accounts = [
      { id: 'a1', name: 'Nuconta', type: 'checking', color: '#8a05be', init: 80000 },
      { id: 'a2', name: 'Itaú', type: 'checking', color: '#ff6200', init: 380000 },
      { id: 'a3', name: 'Caixa Poupança', type: 'savings', color: '#0b6fb5', init: 125000 },
      { id: 'a4', name: 'Carteira', type: 'cash', color: '#7a8a82', init: 65000 }
    ];
    n.cards = [
      { id: 'c1', name: 'Nubank', color: '#8a05be', limit: 600000, closing: 20, due: 27, payAcc: 'a1' },
      { id: 'c2', name: 'Inter', color: '#ff7a00', limit: 250000, closing: 5, due: 12, payAcc: 'a1' }
    ];
    n.budgets = { alimentacao: 140000, transporte: 45000, lazer: 40000, compras: 50000, digitais: 12000, saude: 35000, moradia: 210000 };

    var months = [];
    for (var i = -5; i <= 1; i++) months.push(U.addMonths(thisYm, i));
    var total = months.length;

    function add(o) {
      var t = mkTx(o);
      if (t.card) t.paid = true; else if (o.paid === undefined) t.paid = t.date <= today;
      n.tx.push(t);
      return t;
    }
    function day(ym, d) { return ym + '-' + U.pad(Math.min(d, U.dim(+ym.slice(0, 4), +ym.slice(5, 7)))); }
    function fixed(ym, idx, key, d, o) {
      o.date = day(ym, d); o.s = 'demo-' + key; o.n = idx + 1; o.N = total; o.rec = 'fixed';
      return add(o);
    }

    months.forEach(function (ym, idx) {
      var future = ym > thisYm;
      fixed(ym, idx, 'salario', 5, { type: 'income', amount: 580000, desc: 'Salário', cat: 'salario', acc: 'a1' });
      fixed(ym, idx, 'aluguel', 8, { amount: 145000, desc: 'Aluguel', cat: 'aluguel', acc: 'a1' });
      fixed(ym, idx, 'internet', 10, { amount: 11990, desc: 'Internet fibra', cat: 'internet', acc: 'a1' });
      fixed(ym, idx, 'academia', 3, { amount: 9990, desc: 'Academia SmartFit', cat: 'academia', card: 'c1' });
      fixed(ym, idx, 'netflix', 9, { amount: 5590, desc: 'Netflix', cat: 'streaming-video', card: 'c1' });
      fixed(ym, idx, 'spotify', 11, { amount: 2190, desc: 'Spotify', cat: 'streaming-musica', card: 'c1' });
      fixed(ym, idx, 'celular', 15, { amount: 4990, desc: 'Plano celular', cat: 'celular', card: 'c1' });
      fixed(ym, idx, 'invest', 6, { amount: 50000, desc: 'Aporte mensal', cat: 'investimento-auto', acc: 'a1' });
      fixed(ym, idx, 'poupanca', 7, { type: 'transfer', amount: 30000, desc: 'Reserva de emergência', cat: 'transferencias', acc: 'a1', to: 'a3' });
      add({ type: 'expense', amount: rnd(150, 235), desc: 'Conta de luz', cat: 'eletricidade', acc: 'a1', date: day(ym, 12) });
      add({ type: 'expense', amount: rnd(52, 92), desc: 'Conta de água', cat: 'agua', acc: 'a1', date: day(ym, 14) });
      if (future) return;
      if (idx % 2 === 1) add({ type: 'income', amount: rnd(450, 1300), desc: 'Projeto freelance', cat: 'freelance', acc: 'a1', date: day(ym, 16) });

      var last = ym === thisYm ? +today.slice(8, 10) : 28;
      function when() { return day(ym, 1 + Math.floor(r() * last)); }
      var i2;
      for (i2 = 0; i2 < 4; i2++) {
        var card = r() < 0.5;
        add({ type: 'expense', amount: rnd(85, 340), desc: pick(['Mercado Pague Menos', 'Supermercado Dia', 'Atacadão', 'Hortifruti']), cat: 'supermercado', acc: card ? null : 'a1', card: card ? 'c1' : null, date: when() });
      }
      for (i2 = 0; i2 < 4; i2++) add({ type: 'expense', amount: rnd(28, 140), desc: pick(['Cabana do Sol', 'Pizzaria Bella', 'Restaurante Sabor', 'Lanchonete Central']), cat: 'restaurantes', card: pick(['c1', 'c2']), date: when() });
      for (i2 = 0; i2 < 3; i2++) add({ type: 'expense', amount: rnd(32, 82), desc: pick(['iFood', 'Rappi', 'Delivery Japa']), cat: 'delivery', card: 'c2', date: when() });
      for (i2 = 0; i2 < 5; i2++) add({ type: 'expense', amount: rnd(11, 46), desc: pick(['Uber', '99 Táxi', 'Uber']), cat: 'taxi', card: 'c1', date: when() });
      for (i2 = 0; i2 < 2; i2++) add({ type: 'expense', amount: rnd(120, 220), desc: 'Posto Ipiranga', cat: 'gasolina', acc: 'a2', date: when() });
      add({ type: 'expense', amount: rnd(24, 120), desc: 'Drogasil', cat: 'farmacia', acc: 'a4', date: when() });
      add({ type: 'expense', amount: rnd(60, 220), desc: pick(['Cinema Cinemark', 'Ingresso show', 'Boliche']), cat: 'cinema', card: 'c2', date: when() });
      add({ type: 'expense', amount: rnd(80, 420), desc: pick(['Renner', 'Amazon', 'Kabum', 'Zara']), cat: pick(['vestuario', 'compras-online', 'eletronicos']), card: 'c2', date: when() });
    });

    // faturas já vencidas aparecem pagas
    n.cards.forEach(function (card) {
      var keys = {};
      n.tx.forEach(function (t) { if (t.card === card.id) keys[S.invKey(card, t.date)] = 1; });
      Object.keys(keys).sort().forEach(function (ym) {
        var inv = S.invoice(card.id, ym);
        if (inv.due <= today && inv.total > 0) {
          n.tx.push(mkTx({ type: 'expense', kind: 'invoice', amount: inv.total, desc: 'Fatura ' + card.name, cat: 'fatura', acc: card.payAcc, date: inv.due, paid: true, inv: { card: card.id, ym: ym } }));
        }
      });
    });

    state = normalize(n);
    applyDerived();
    schedule();
    emit();
  };

  G.S = S;
  G.addEventListener('pagehide', S.flush);
  document.addEventListener('visibilitychange', function () { if (document.hidden) S.flush(); });
})(window);
