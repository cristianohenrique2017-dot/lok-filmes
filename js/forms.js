/* Formulários e folhas modais: lançamento, detalhes, contas, cartões, pagar fatura, orçamento, categorias, backup. */
(function (G) {
  'use strict';
  var esc = U.esc, M = function (c) { return U.money(c); }, A = UI.actions;

  function sheetOf(el) { return UI.top(); }
  function head(title, right) {
    return '<div class="sh-h"><h3>' + esc(title) + '</h3>' + (right || '') + '<button class="ibtn flat" data-a="sheet-close" aria-label="Fechar">' + icon('x', 20) + '</button></div>';
  }
  function field(label, ctl, extra) { return '<label class="fld' + (extra ? ' ' + extra : '') + '"><span>' + label + '</span>' + ctl + '</label>'; }

  /* ================= LANÇAMENTO ================= */
  var F = null, FS = null;
  var TYPE_LABEL = { expense: 'despesa', income: 'receita', transfer: 'transferência' };

  function defaultDate() {
    var now = U.today();
    if (V.ym === now.slice(0, 7)) return now;
    return V.ym + '-' + U.pad(Math.min(+now.slice(8, 10), U.dim(+V.ym.slice(0, 4), +V.ym.slice(5, 7))));
  }

  function openTxForm(o) {
    o = o || {};
    var st = S.get(), t = o.id ? S.tx(o.id) : null;
    if (t) {
      F = { id: t.id, type: t.type, amount: t.amount, desc: t.desc, cat: t.cat, acc: t.acc, card: t.card, to: t.to, date: t.date, paid: t.paid, note: t.note || '', mode: 'none', count: 2, catTouched: true, series: !!t.s, rec: t.rec, n: t.n, N: t.N };
    } else {
      var firstAcc = st.accounts[0] ? st.accounts[0].id : null;
      F = { id: null, type: o.type || 'expense', amount: 0, desc: '', cat: null, acc: o.card ? null : (o.acc || firstAcc), card: o.card || null, to: null, date: o.date || defaultDate(), paid: !o.card && (o.date || defaultDate()) <= U.today(), note: '', mode: 'none', count: 2, catTouched: false };
    }
    if (!st.accounts.length && !st.cards.length) { UI.toast('Crie uma conta antes de lançar.'); A['account-new'](); return; }
    FS = UI.sheet({ cls: 'full', html: txFormHtml(), label: 'Lançamento', onClose: function () { FS = null; } });
    FS.onInput = txInput;
    FS.onChange = txChange;
    if (!F.id) setTimeout(function () { var el = document.getElementById('f-amt'); if (el) el.focus(); }, 380);
  }

  function accLabel(id, card) {
    if (card) { var c = S.card(card); return c ? 'Cartão ' + c.name : 'Escolher'; }
    var a = S.account(id); return a ? a.name : 'Escolher';
  }

  function txFormHtml() {
    var f = F, isTr = f.type === 'transfer', cat = Cat.get(f.cat || (f.type === 'income' ? 'outras-receitas' : 'sem-categoria'));
    var title = (f.id ? 'Editar ' : 'Nova ') + TYPE_LABEL[f.type];
    var h = '<div class="fh ft-' + f.type + '"><div class="fh-top"><button class="ibtn" data-a="sheet-close" aria-label="Fechar">' + icon('x', 22) + '</button><h2>' + title + '</h2><button class="ibtn" data-a="f-save" aria-label="Salvar">' + icon('check', 22) + '</button></div>' +
      '<div class="seg inv-seg">' + [['expense', 'Despesa'], ['income', 'Receita'], ['transfer', 'Transferência']].map(function (x) {
        return '<button class="' + (f.type === x[0] ? 'on' : '') + '" data-a="f-type" data-v="' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div>' +
      '<label class="amt-in"><small>Valor</small><span><em>R$</em><input id="f-amt" ' + UI.moneyAttrs(f.amount) + ' aria-label="Valor"></span></label></div>';

    var b = '<div class="fbody">';
    b += '<label class="fr">' + icon('edit', 20) + '<span><small>Descrição</small><input id="f-desc" type="text" value="' + esc(f.desc) + '" placeholder="' + (isTr ? 'Ex.: Reserva de emergência' : 'Ex.: Mercado, Salário...') + '" autocomplete="off" maxlength="60"></span></label>';
    if (!isTr) b += '<button class="fr" data-a="f-cat"><span class="ci sm" style="--c:' + Cat.group(cat.g).color + '">' + icon(cat.icon, 16) + '</span><span><small>Categoria</small><b id="f-catlabel">' + (f.cat ? esc(cat.name) : '<i class="ph">Escolher categoria</i>') + '</b></span>' + icon('right', 18) + '</button>';
    if (isTr) {
      b += '<button class="fr" data-a="f-acc" data-w="acc">' + icon('bank', 20) + '<span><small>Sai de</small><b>' + esc(accLabel(f.acc)) + '</b></span>' + icon('right', 18) + '</button>';
      b += '<button class="fr" data-a="f-acc" data-w="to">' + icon('bank', 20) + '<span><small>Vai para</small><b>' + (f.to ? esc(accLabel(f.to)) : '<i class="ph">Escolher conta</i>') + '</b></span>' + icon('right', 18) + '</button>';
    } else {
      b += '<button class="fr" data-a="f-acc" data-w="acc">' + icon(f.card ? 'card' : 'bank', 20) + '<span><small>' + (f.card ? 'Cartão de crédito' : 'Conta') + '</small><b>' + esc(accLabel(f.acc, f.card)) + '</b></span>' + icon('right', 18) + '</button>';
    }
    b += '<div class="fr static">' + icon('calendar', 20) + '<span><small>Data</small><input id="f-date" type="date" value="' + f.date + '"></span>' +
      '<span class="qd"><button data-a="f-day" data-d="0" class="' + (f.date === U.today() ? 'on' : '') + '">Hoje</button><button data-a="f-day" data-d="-1" class="' + (f.date === U.addDays(U.today(), -1) ? 'on' : '') + '">Ontem</button></span></div>';

    if (f.series) {
      b += '<div class="fr static">' + icon('repeat', 20) + '<span><small>' + (f.rec === 'inst' ? 'Parcelamento' : 'Recorrência') + '</small><b>' + (f.rec === 'inst' ? 'Parcela ' + f.n + ' de ' + f.N : 'Fixa mensal · ' + f.n + ' de ' + f.N) + '</b></span></div>';
    } else if (!f.id && !isTr) {
      b += '<div class="fr static">' + icon('repeat', 20) + '<span><small>Repetir</small><select id="f-mode"><option value="none"' + (f.mode === 'none' ? ' selected' : '') + '>Não repetir</option><option value="fixed"' + (f.mode === 'fixed' ? ' selected' : '') + '>Fixa mensal</option><option value="inst"' + (f.mode === 'inst' ? ' selected' : '') + '>' + (f.type === 'income' ? 'Em várias parcelas' : 'Parcelada') + '</option></select></span>' +
        (f.mode !== 'none' ? '<span class="cnt"><input id="f-count" type="number" inputmode="numeric" min="2" max="120" value="' + f.count + '" aria-label="Quantidade de meses"><small>×</small></span>' : '') + '</div>';
      if (f.mode !== 'none') b += '<p class="fnote" id="f-prev"></p>';
    } else if (!f.id && isTr) {
      b += '';
    }

    if (!f.card && !isTr) {
      b += '<button class="fr" data-a="f-paid"><span class="ico-sw">' + icon('circlecheck', 20) + '</span><span><small>Situação</small><b>' + (f.paid ? (f.type === 'income' ? 'Recebido' : 'Pago') : (f.type === 'income' ? 'A receber' : 'A pagar')) + '</b></span><span class="switch' + (f.paid ? ' on' : '') + '"><i></i></span></button>';
    }
    b += '<label class="fr">' + icon('file', 20) + '<span><small>Observação</small><textarea id="f-note" rows="2" maxlength="300" placeholder="Opcional">' + esc(f.note) + '</textarea></span></label>';
    b += '</div><div class="fbar">' + (f.id ? '<button class="btn danger-o" data-a="f-del">' + icon('trash', 18) + '</button>' : '') +
      '<button class="btn primary grow" data-a="f-save">' + (f.id ? 'Salvar alterações' : 'Salvar ' + TYPE_LABEL[f.type]) + '</button></div>';
    return h + b;
  }

  function rerenderTx() {
    if (!FS) return;
    var body = FS.panel.querySelector('.fbody'), sc = body ? body.scrollTop : 0;
    UI.setHtml(FS, txFormHtml());
    var nb = FS.panel.querySelector('.fbody'); if (nb) nb.scrollTop = sc;
    updatePreview();
  }

  function updatePreview() {
    var el = document.getElementById('f-prev');
    if (!el) return;
    var n = U.clamp(+F.count || 2, 2, 120);
    el.textContent = F.mode === 'inst' ? n + '× de ' + M(Math.floor(F.amount / n)) + ' · total ' + M(F.amount) : 'Lança ' + M(F.amount) + ' por mês, durante ' + n + ' meses.';
  }

  function suggestCat() {
    if (F.catTouched || !F.desc || F.desc.length < 3) return;
    var q = U.norm(F.desc), hit = null, tx = S.get().tx;
    for (var i = tx.length - 1; i >= 0; i--) {
      if (tx[i].type === F.type && U.norm(tx[i].desc) === q) { hit = tx[i]; break; }
    }
    if (hit && hit.cat !== F.cat) {
      F.cat = hit.cat;
      var c = Cat.get(F.cat), lab = document.getElementById('f-catlabel');
      if (lab) { lab.textContent = c.name; var ci = lab.parentNode.previousSibling; if (ci && ci.style) { ci.style.setProperty('--c', Cat.group(c.g).color); ci.innerHTML = icon(c.icon, 16); } }
    }
  }

  function txInput(el) {
    if (el.id === 'f-amt') { F.amount = UI.cents(el); updatePreview(); }
    else if (el.id === 'f-desc') { F.desc = el.value; suggestCat(); }
    else if (el.id === 'f-note') F.note = el.value;
    else if (el.id === 'f-count') { F.count = parseInt(el.value, 10) || 2; updatePreview(); }
  }
  function txChange(el) {
    if (el.id === 'f-date' && el.value) { F.date = el.value; if (!F.card) F.paid = F.id ? F.paid : F.date <= U.today(); rerenderTx(); }
    else if (el.id === 'f-mode') { F.mode = el.value; rerenderTx(); }
    else if (el.id === 'f-count') { F.count = U.clamp(parseInt(el.value, 10) || 2, 2, 120); el.value = F.count; updatePreview(); }
  }

  A['tx-new'] = function (el) { openTxForm({ type: el && el.dataset.type, card: el && el.dataset.card, date: el && el.dataset.date }); };
  A['f-type'] = function (el) {
    var ty = el.dataset.v;
    if (F.type === ty) return;
    F.type = ty;
    if (ty !== 'expense') { F.card = null; if (!F.acc) F.acc = (S.get().accounts[0] || {}).id; }
    if (ty === 'transfer') F.cat = null;
    if (!F.catTouched) F.cat = null;
    if (ty === 'transfer') F.paid = true; else if (!F.id) F.paid = F.date <= U.today() && !F.card;
    rerenderTx();
  };
  A['f-day'] = function (el) {
    F.date = U.addDays(U.today(), +el.dataset.d);
    if (!F.id && !F.card) F.paid = F.date <= U.today();
    rerenderTx();
  };
  A['f-paid'] = function () { F.paid = !F.paid; rerenderTx(); };
  A['f-cat'] = function () {
    openCatPicker(F.type === 'income' ? 'income' : 'expense', F.cat, function (id) { F.cat = id; F.catTouched = true; rerenderTx(); });
  };
  A['f-acc'] = function (el) { openAccPicker(el.dataset.w); };
  A['f-del'] = function () { deleteTx(F.id, function () { UI.close(FS); }); };
  A['f-save'] = function () {
    var f = F, st = S.get();
    f.amount = UI.cents(document.getElementById('f-amt')) || f.amount;
    if (!f.amount) { UI.toast('Informe o valor.'); document.getElementById('f-amt').focus(); return; }
    if (f.type === 'transfer') {
      if (!f.acc || !f.to) { UI.toast('Escolha as duas contas.'); return; }
      if (f.acc === f.to) { UI.toast('Origem e destino precisam ser diferentes.'); return; }
    } else if (!f.acc && !f.card) { UI.toast('Escolha a conta ou o cartão.'); return; }
    var cat = f.type === 'transfer' ? 'transferencias' : (f.cat || (f.type === 'income' ? 'outras-receitas' : 'sem-categoria'));
    var data = {
      type: f.type, amount: f.amount, desc: (f.desc || '').trim(), cat: cat,
      acc: f.card ? null : f.acc, card: f.type === 'expense' ? f.card : null, to: f.type === 'transfer' ? f.to : null,
      date: f.date || U.today(), paid: f.card || f.type === 'transfer' ? true : f.paid, note: (f.note || '').trim()
    };
    if (f.id) {
      var t = S.tx(f.id);
      if (t && t.s) {
        UI.choice({ title: 'Aplicar alteração em', text: t.rec === 'inst' ? 'Este lançamento faz parte de um parcelamento.' : 'Este lançamento se repete todo mês.', options: [
          { label: 'Somente este', val: 'this' }, { label: 'Este e os próximos', val: 'next' }, { label: 'Todos da série', val: 'all' }] },
        function (scope) { S.updateTx(f.id, data, scope); UI.close(FS); UI.toast('Alterações salvas.'); });
      } else { S.updateTx(f.id, data, 'this'); UI.close(FS); UI.toast('Alterações salvas.'); }
    } else {
      S.addTx(data, { mode: f.mode, count: f.count });
      if (f.date.slice(0, 7) !== V.ym) V.ym = f.date.slice(0, 7);
      UI.close(FS);
      UI.toast(f.type === 'income' ? 'Receita salva.' : f.type === 'transfer' ? 'Transferência salva.' : 'Despesa salva.');
      G.App.render();
    }
  };

  function deleteTx(id, done) {
    var t = S.tx(id);
    if (!t) return;
    function run(scope) {
      var snap = S.snapshot();
      S.removeTx(id, scope);
      if (done) done();
      UI.toast('Lançamento excluído.', { label: 'Desfazer', fn: function () { S.restore(snap); } });
    }
    if (t.s) {
      UI.choice({ title: 'Excluir lançamento', text: t.rec === 'inst' ? 'Parcelamento com ' + t.N + ' parcelas.' : 'Lançamento recorrente.', options: [
        { label: 'Somente este', val: 'this', kind: 'danger' }, { label: 'Este e os próximos', val: 'next', kind: 'danger' }, { label: 'Todos da série', val: 'all', kind: 'danger' }] }, run);
    } else if (t.kind === 'invoice') {
      UI.confirm({ title: 'Desfazer pagamento?', text: 'A fatura volta a ficar em aberto e o valor retorna para a conta.', ok: 'Desfazer pagamento', danger: true }, function () { run('this'); });
    } else {
      UI.confirm({ title: 'Excluir lançamento?', text: (t.desc || Cat.get(t.cat).name) + ' · ' + M(t.amount), ok: 'Excluir', danger: true }, function () { run('this'); });
    }
  }

  /* ---------- detalhe ---------- */
  A['tx'] = function (el) {
    var t = S.tx(el.dataset.id);
    if (!t) return;
    var p = Views.txParts(t), c = Cat.get(t.cat);
    var rows = [];
    function r(k, v) { rows.push('<div class="kv"><span>' + k + '</span><b>' + v + '</b></div>'); }
    if (t.type !== 'transfer') r('Categoria', esc(Cat.group(c.g).name === c.name ? c.name : Cat.group(c.g).name + ' › ' + c.name));
    if (t.card) r('Cartão', esc(accLabel(null, t.card)) + ' · fatura de ' + U.monthName(S.invKey(S.card(t.card), t.date)).toLowerCase());
    else if (t.type === 'transfer') { r('Sai de', esc(accLabel(t.acc))); r('Vai para', esc(accLabel(t.to))); }
    else r('Conta', esc(accLabel(t.acc)));
    r('Data', U.dateLong(t.date));
    if (t.type !== 'transfer' && !t.card) r('Situação', t.paid ? '<span class="pill ok">' + (t.type === 'income' ? 'Recebido' : 'Pago') + '</span>' : '<span class="pill ' + (t.date < U.today() ? 'over' : 'warn') + '">' + (t.date < U.today() ? 'Atrasado' : (t.type === 'income' ? 'A receber' : 'A pagar')) + '</span>');
    if (t.rec === 'inst') r('Parcela', t.n + ' de ' + t.N); else if (t.rec === 'fixed') r('Recorrência', 'Fixa mensal · ' + t.n + ' de ' + t.N);
    if (t.note) r('Observação', esc(t.note));
    var canToggle = !t.card && t.type !== 'transfer' && t.kind !== 'invoice';
    var html = head('Detalhes') + '<div class="det"><div class="det-i">' + p.icon + '</div><h2>' + esc(p.title) + '</h2><div class="det-a">' + Views.amountHtml(t) + '</div><div class="kvs">' + rows.join('') + '</div></div>' +
      '<div class="det-btns">' + (canToggle ? '<button class="btn ' + (t.paid ? 'ghost' : 'primary') + ' block" data-a="d-toggle" data-id="' + t.id + '">' + (t.paid ? 'Marcar como pendente' : (t.type === 'income' ? 'Marcar como recebido' : 'Marcar como pago')) + '</button>' : '') +
      '<div class="two">' + (t.kind === 'invoice' ? '' : '<button class="btn ghost" data-a="d-edit" data-id="' + t.id + '">' + icon('edit', 18) + ' Editar</button>') +
      '<button class="btn danger-o" data-a="d-del" data-id="' + t.id + '">' + icon('trash', 18) + ' ' + (t.kind === 'invoice' ? 'Desfazer' : 'Excluir') + '</button></div></div>';
    UI.sheet({ html: html, label: 'Detalhes do lançamento' });
  };
  A['d-toggle'] = function (el) {
    var t = S.tx(el.dataset.id), np = !t.paid;
    S.togglePaid(t.id); UI.close(); UI.toast(np ? (t.type === 'income' ? 'Marcado como recebido.' : 'Marcado como pago.') : 'Marcado como pendente.');
  };
  A['d-edit'] = function (el) { var id = el.dataset.id; UI.close(); UI.afterHistory(function () { openTxForm({ id: id }); }); };
  A['d-del'] = function (el) { var id = el.dataset.id, sh = UI.top(); deleteTx(id, function () { UI.close(sh); }); };

  /* ---------- seletor de categoria ---------- */
  function openCatPicker(type, selected, cb) {
    var html = '<div class="cp-h"><h3>Categorias</h3><button class="ibtn flat" data-a="sheet-close" aria-label="Fechar">' + icon('x', 20) + '</button></div>' +
      '<div class="search pad"><label class="sbox">' + icon('search', 18) + '<input id="cp-q" type="search" placeholder="Buscar" autocomplete="off"></label></div>' +
      '<div class="cp-list" id="cp-list">' + catList({ type: type, selected: selected }) + '</div>' +
      '<div class="fbar"><button class="btn ghost grow" data-a="cat-new">' + icon('plus', 18) + ' Nova categoria</button></div>';
    var s = UI.sheet({ cls: 'full picker', html: html, label: 'Categorias' });
    s.pick = cb;
    s.type = type;
    s.onInput = function (el) {
      if (el.id === 'cp-q') document.getElementById('cp-list').innerHTML = catList({ type: type, selected: selected, q: el.value });
    };
  }
  A['cat-pick'] = function (el) {
    var s = UI.top();
    if (!s || !s.pick) return;
    var cb = s.pick, id = el.dataset.id;
    UI.close(s);
    UI.afterHistory(function () { cb(id); });
  };

  /* ---------- seletor de conta/cartão ---------- */
  function openAccPicker(which) {
    var st = S.get(), bal = S.balances(), isTo = which === 'to', other = isTo ? F.acc : F.to;
    var accs = st.accounts.filter(function (a) { return a.id !== other; });
    var html = head(isTo ? 'Vai para' : F.type === 'transfer' ? 'Sai de' : (F.type === 'expense' ? 'Conta ou cartão' : 'Conta')) + '<div class="plist">' +
      accs.map(function (a) {
        var on = (isTo ? F.to : (!F.card && F.acc)) === a.id;
        return '<button class="row' + (on ? ' sel' : '') + '" data-a="ap-pick" data-id="' + a.id + '" data-w="' + which + '">' + Views.avatar(a) + '<span class="rm"><b class="rt">' + esc(a.name) + '</b><small class="rs">' + ACCOUNT_TYPES[a.type] + '</small></span><span class="ra"><b class="amt">' + M(bal[a.id]) + '</b></span>' + (on ? '<span class="chk on">' + icon('check', 14) + '</span>' : '') + '</button>';
      }).join('') +
      (F.type === 'expense' && !isTo && st.cards.length ? '<h4 class="plist-h">Cartões de crédito</h4>' + st.cards.map(function (c) {
        var on = F.card === c.id;
        return '<button class="row' + (on ? ' sel' : '') + '" data-a="ap-pick" data-card="' + c.id + '" data-w="' + which + '">' + Views.avatar({ name: c.name, color: c.color }) + '<span class="rm"><b class="rt">' + esc(c.name) + '</b><small class="rs">Disponível ' + M(Math.max(0, c.limit - S.cardUsed(c.id))) + '</small></span>' + (on ? '<span class="chk on">' + icon('check', 14) + '</span>' : '') + '</button>';
      }).join('') : '') + '</div>';
    UI.sheet({ cls: 'tall', html: html, label: 'Escolher conta' });
  }
  A['ap-pick'] = function (el) {
    var w = el.dataset.w;
    if (el.dataset.card) { F.card = el.dataset.card; F.acc = null; F.paid = true; }
    else if (w === 'to') F.to = el.dataset.id;
    else { F.acc = el.dataset.id; if (F.card) { F.card = null; F.paid = F.date <= U.today(); } }
    UI.close();
    UI.afterHistory(rerenderTx);
  };

  /* ================= MÊS ================= */
  var MP = null;
  function mpHtml() {
    var cur = V.ym;
    return head('Escolher mês') + '<div class="yr"><button class="ibtn flat" data-a="mp-year" data-d="-1" aria-label="Ano anterior">' + icon('left', 20) + '</button><b>' + MP.year + '</b><button class="ibtn flat" data-a="mp-year" data-d="1" aria-label="Próximo ano">' + icon('right', 20) + '</button></div>' +
      '<div class="mgrid">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(function (m) {
        var ym = MP.year + '-' + U.pad(m);
        return '<button class="' + (ym === cur ? 'on' : '') + (ym === U.today().slice(0, 7) ? ' now' : '') + '" data-a="mp-pick" data-ym="' + ym + '">' + U.monthShort(ym) + '</button>';
      }).join('') + '</div><button class="btn ghost block" data-a="mp-pick" data-ym="' + U.today().slice(0, 7) + '">Ir para o mês atual</button>';
  }
  A['month-pick'] = function () { MP = { year: +V.ym.slice(0, 4) }; MP.sheet = UI.sheet({ html: mpHtml(), label: 'Escolher mês' }); };
  A['mp-year'] = function (el) { MP.year += +el.dataset.d; UI.setHtml(MP.sheet, mpHtml()); };
  A['mp-pick'] = function (el) { V.ym = el.dataset.ym; UI.close(); G.App.render(); };

  /* ================= CONTAS ================= */
  var AC = null, ACS = null;
  function openAccountForm(id) {
    var a = id ? S.account(id) : null;
    var cur = a ? S.balances()[a.id] : 0;
    AC = { id: a ? a.id : null, name: a ? a.name : '', type: a ? a.type : 'checking', color: a ? a.color : '#8a05be', balance: Math.abs(cur), neg: cur < 0, nosum: a ? !!a.nosum : false, preset: -1 };
    ACS = UI.sheet({ cls: 'tall', html: accountHtml(), label: 'Conta', onClose: function () { ACS = null; } });
    ACS.onInput = function (el) {
      if (el.id === 'a-name') AC.name = el.value;
      else if (el.id === 'a-bal') AC.balance = UI.cents(el);
    };
    ACS.onChange = function (el) { if (el.id === 'a-type') AC.type = el.value; };
  }
  function accountHtml() {
    var a = AC;
    var h = head(a.id ? 'Editar conta' : 'Nova conta');
    if (!a.id) h += '<div class="presets">' + BANKS.map(function (b, i) { return '<button class="chip' + (a.preset === i ? ' on' : '') + '" data-a="a-preset" data-i="' + i + '"><i class="dot" style="background:' + b.color + '"></i>' + esc(b.name) + '</button>'; }).join('') + '</div>';
    h += '<div class="form">' + field('Nome', '<input id="a-name" type="text" value="' + esc(a.name) + '" placeholder="Ex.: Conta do trabalho" maxlength="30" autocomplete="off">') +
      field('Tipo', '<span class="sel"><select id="a-type">' + Object.keys(ACCOUNT_TYPES).map(function (k) { return '<option value="' + k + '"' + (a.type === k ? ' selected' : '') + '>' + ACCOUNT_TYPES[k] + '</option>'; }).join('') + '</select>' + icon('down', 16) + '</span>') +
      field(a.id ? 'Saldo atual' : 'Saldo inicial', '<span class="money-in"><em>' + (a.neg ? '−R$' : 'R$') + '</em><input id="a-bal" ' + UI.moneyAttrs(a.balance) + '></span>') +
      '<button type="button" class="btn mini ghost" data-a="a-sign">' + (a.neg ? 'Saldo negativo · tocar para positivo' : 'Marcar saldo como negativo') + '</button>' +
      '<div class="fld"><span>Cor</span><div class="swatches">' + COLORS.map(function (c) { return '<button type="button" class="sw' + (a.color === c ? ' on' : '') + '" style="background:' + c + '" data-a="a-color" data-c="' + c + '" aria-label="Cor ' + c + '"></button>'; }).join('') + '</div></div>' +
      '<button type="button" class="fr flat" data-a="a-nosum"><span><b>Somar no saldo geral</b><small>Desligue para investimentos ou contas só de controle</small></span><span class="switch' + (a.nosum ? '' : ' on') + '"><i></i></span></button></div>' +
      '<div class="fbar">' + (a.id ? '<button class="btn danger-o" data-a="a-del">' + icon('trash', 18) + '</button><button class="btn ghost" data-a="a-stmt">Ver extrato</button>' : '') + '<button class="btn primary grow" data-a="a-save">' + (a.id ? 'Salvar' : 'Criar conta') + '</button></div>';
    return h;
  }
  function accRerender() { var sc = ACS.panel.scrollTop; UI.setHtml(ACS, accountHtml()); ACS.panel.scrollTop = sc; }
  A['account'] = function (el) { openAccountForm(el.dataset.id); };
  A['account-new'] = function () { openAccountForm(null); };
  A['a-preset'] = function (el) {
    var b = BANKS[+el.dataset.i]; AC.preset = +el.dataset.i; AC.name = b.name; AC.color = b.color;
    if (b.name === 'Carteira') AC.type = 'cash';
    accRerender();
  };
  A['a-color'] = function (el) { AC.color = el.dataset.c; accRerender(); };
  A['a-nosum'] = function () { AC.nosum = !AC.nosum; accRerender(); };
  A['a-sign'] = function () { AC.balance = UI.cents(document.getElementById('a-bal')); AC.name = document.getElementById('a-name').value; AC.neg = !AC.neg; accRerender(); };
  A['a-save'] = function () {
    var name = (document.getElementById('a-name').value || '').trim();
    if (!name) { UI.toast('Dê um nome para a conta.'); return; }
    var cents = UI.cents(document.getElementById('a-bal'));
    S.saveAccount({ id: AC.id, name: name, type: AC.type, color: AC.color, nosum: AC.nosum, balance: AC.neg ? -cents : cents });
    UI.close(ACS); UI.toast(AC.id ? 'Conta atualizada.' : 'Conta criada.');
  };
  A['a-stmt'] = function () { var id = AC.id; UI.close(ACS); UI.afterHistory(function () { V.ext = { q: '', type: 'all', acc: id, sort: 'desc' }; G.App.go('extrato'); }); };
  A['a-del'] = function () {
    var id = AC.id, n = S.get().tx.filter(function (t) { return t.acc === id || t.to === id; }).length;
    UI.confirm({ title: 'Excluir conta?', text: n ? 'Os ' + n + ' lançamentos dessa conta também serão apagados.' : 'Essa conta não tem lançamentos.', ok: 'Excluir conta', danger: true }, function () {
      var snap = S.snapshot(); S.deleteAccount(id); UI.close(ACS);
      UI.toast('Conta excluída.', { label: 'Desfazer', fn: function () { S.restore(snap); } });
    });
  };

  /* ================= CARTÕES ================= */
  var CC = null, CCS = null;
  function openCardForm(id) {
    var c = id ? S.card(id) : null, st = S.get();
    CC = c ? Object.assign({}, c) : { id: null, name: '', color: '#8a05be', limit: 300000, closing: 20, due: 27, payAcc: st.accounts[0] ? st.accounts[0].id : null };
    CCS = UI.sheet({ cls: 'tall', html: cardHtml(), label: 'Cartão', onClose: function () { CCS = null; } });
    CCS.onInput = function (el) { if (el.id === 'c-name') CC.name = el.value; };
  }
  function cardHtml() {
    var c = CC, st = S.get();
    var days = function (sel) { var o = ''; for (var d = 1; d <= 28; d++) o += '<option value="' + d + '"' + (sel === d ? ' selected' : '') + '>Dia ' + d + '</option>'; return o; };
    var h = head(c.id ? 'Editar cartão' : 'Novo cartão');
    if (!c.id) h += '<div class="presets">' + BANKS.filter(function (b) { return b.name !== 'Carteira'; }).map(function (b, i) { return '<button class="chip" data-a="c-preset" data-n="' + esc(b.name) + '" data-c="' + b.color + '"><i class="dot" style="background:' + b.color + '"></i>' + esc(b.name) + '</button>'; }).join('') + '</div>';
    h += '<div class="form">' + field('Nome do cartão', '<input id="c-name" type="text" value="' + esc(c.name) + '" placeholder="Ex.: Nubank" maxlength="30" autocomplete="off">') +
      field('Limite', '<span class="money-in"><em>R$</em><input id="c-limit" ' + UI.moneyAttrs(c.limit) + '></span>') +
      '<div class="two">' + field('Fecha no', '<span class="sel"><select id="c-closing">' + days(c.closing) + '</select>' + icon('down', 16) + '</span>') + field('Vence no', '<span class="sel"><select id="c-due">' + days(c.due) + '</select>' + icon('down', 16) + '</span>') + '</div>' +
      field('Pagar fatura com', '<span class="sel"><select id="c-acc">' + st.accounts.map(function (a) { return '<option value="' + a.id + '"' + (c.payAcc === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select>' + icon('down', 16) + '</span>') +
      '<div class="fld"><span>Cor</span><div class="swatches">' + COLORS.map(function (x) { return '<button type="button" class="sw' + (c.color === x ? ' on' : '') + '" style="background:' + x + '" data-a="c-color" data-c="' + x + '" aria-label="Cor ' + x + '"></button>'; }).join('') + '</div></div></div>' +
      '<div class="fbar">' + (c.id ? '<button class="btn danger-o" data-a="c-del">' + icon('trash', 18) + '</button>' : '') + '<button class="btn primary grow" data-a="c-save">' + (c.id ? 'Salvar' : 'Criar cartão') + '</button></div>';
    return h;
  }
  function cardSync() {
    CC.limit = UI.cents(document.getElementById('c-limit'));
    CC.closing = +document.getElementById('c-closing').value;
    CC.due = +document.getElementById('c-due').value;
    var sel = document.getElementById('c-acc'); CC.payAcc = sel ? sel.value : null;
    CC.name = document.getElementById('c-name').value;
  }
  function cardRerender() { cardSync(); var sc = CCS.panel.scrollTop; UI.setHtml(CCS, cardHtml()); CCS.panel.scrollTop = sc; }
  A['card-new'] = function () { openCardForm(null); };
  A['card-edit'] = function (el) { openCardForm(el.dataset.id); };
  A['c-preset'] = function (el) { cardSync(); CC.name = el.dataset.n; CC.color = el.dataset.c; cardRerender(); };
  A['c-color'] = function (el) { cardSync(); CC.color = el.dataset.c; cardRerender(); };
  A['c-save'] = function () {
    cardSync();
    CC.name = CC.name.trim();
    if (!CC.name) { UI.toast('Dê um nome para o cartão.'); return; }
    if (!CC.limit) { UI.toast('Informe o limite do cartão.'); return; }
    S.saveCard(CC); UI.close(CCS); UI.toast(CC.id ? 'Cartão atualizado.' : 'Cartão criado.');
  };
  A['c-del'] = function () {
    var id = CC.id, n = S.get().tx.filter(function (t) { return t.card === id; }).length;
    UI.confirm({ title: 'Excluir cartão?', text: n ? 'As ' + n + ' compras e os pagamentos de fatura desse cartão também serão apagados.' : 'Esse cartão não tem compras.', ok: 'Excluir cartão', danger: true }, function () {
      var snap = S.snapshot(); S.deleteCard(id); UI.close(CCS);
      if (G.App.route().indexOf('fatura') === 0) G.App.go('contas', true);
      UI.toast('Cartão excluído.', { label: 'Desfazer', fn: function () { S.restore(snap); } });
    });
  };

  /* ---------- pagar fatura ---------- */
  var PI = null;
  A['pay-invoice'] = function (el) {
    var inv = S.invoice(el.dataset.card, el.dataset.ym), st = S.get();
    if (!st.accounts.length) { UI.toast('Crie uma conta para pagar a fatura.'); return; }
    PI = { card: inv.card.id, ym: inv.ym, acc: inv.card.payAcc || st.accounts[0].id, date: U.today() };
    var bal = S.balances();
    var html = head('Pagar fatura') + '<div class="det"><div class="det-i"><span class="ci" style="--c:' + inv.card.color + '">' + icon('card', 22) + '</span></div><h2>Cartão ' + esc(inv.card.name) + '</h2><small class="muted">Fatura de ' + U.monthName(inv.ym).toLowerCase() + ' · vence em ' + U.dayShort(inv.due) + '</small><div class="det-a"><b class="amt neg">' + M(inv.total) + '</b></div></div>' +
      '<div class="form">' + field('Pagar com', '<span class="sel"><select id="p-acc">' + st.accounts.map(function (a) { return '<option value="' + a.id + '"' + (a.id === PI.acc ? ' selected' : '') + '>' + esc(a.name) + ' · ' + M(bal[a.id]) + '</option>'; }).join('') + '</select>' + icon('down', 16) + '</span>') +
      field('Data do pagamento', '<input id="p-date" type="date" value="' + PI.date + '">') + '</div>' +
      '<div class="fbar"><button class="btn primary grow" data-a="p-save">Confirmar pagamento</button></div>';
    UI.sheet({ cls: 'tall', html: html, label: 'Pagar fatura' });
  };
  A['p-save'] = function () {
    var acc = document.getElementById('p-acc').value, date = document.getElementById('p-date').value || U.today();
    S.payInvoice(PI.card, PI.ym, acc, date); UI.close(); UI.toast('Fatura paga.');
  };

  /* ================= ORÇAMENTO ================= */
  var BG = null;
  A['budget'] = function (el) {
    var g = Cat.group(el.dataset.g), cur = S.get().budgets[g.id] || 0, by = S.byGroup(V.ym, 'expense')[g.id];
    BG = g.id;
    var cats = by ? Object.keys(by.cats).map(function (id) { return [Cat.get(id), by.cats[id]]; }).sort(function (a, b) { return b[1] - a[1]; }) : [];
    var html = head('Limite mensal') + '<div class="det"><div class="det-i">' + Views.groupBadge(g, 24) + '</div><h2>' + esc(g.name) + '</h2><small class="muted">Gasto em ' + U.monthName(V.ym).toLowerCase() + ': <b>' + M(by ? by.total : 0) + '</b></small></div>' +
      '<div class="form">' + field('Limite por mês', '<span class="money-in"><em>R$</em><input id="b-lim" ' + UI.moneyAttrs(cur) + '></span>') +
      (cats.length ? '<ul class="mini-list">' + cats.map(function (c) { return '<li><span>' + esc(c[0].name) + '</span><b>' + M(c[1]) + '</b></li>'; }).join('') + '</ul>' : '') + '</div>' +
      '<div class="fbar">' + (cur ? '<button class="btn danger-o" data-a="b-rm" aria-label="Remover limite">' + icon('trash', 18) + '</button>' : '') + '<button class="btn primary grow" data-a="b-save">Salvar limite</button></div>';
    var s = UI.sheet({ cls: 'tall', html: html, label: 'Limite mensal' });
    setTimeout(function () { var i = document.getElementById('b-lim'); if (i && !cur) i.focus(); }, 380);
    return s;
  };
  A['b-save'] = function () { S.setBudget(BG, UI.cents(document.getElementById('b-lim'))); UI.close(); UI.toast('Limite salvo.'); };
  A['b-rm'] = function () { S.setBudget(BG, 0); UI.close(); UI.toast('Limite removido.'); };

  /* ================= CATEGORIAS ================= */
  var CT = null, CTS = null;
  var CAT_ICONS = ['tag', 'cart', 'bag', 'utensils', 'coffee', 'pizza', 'car', 'bike', 'bus', 'plane', 'house', 'lamp', 'zap', 'droplets', 'wifi', 'phone', 'tv', 'gamepad', 'music', 'film', 'heart', 'pill', 'dumbbell', 'graduation', 'book', 'gift', 'paw', 'baby', 'shirt', 'scissors', 'wrench', 'hammer', 'briefcase', 'piggy', 'coins', 'cash'];
  function catFormHtml() {
    var c = CT;
    return head(c.id ? 'Editar categoria' : 'Nova categoria') + '<div class="form">' + field('Nome', '<input id="ct-name" type="text" value="' + esc(c.name) + '" maxlength="40" placeholder="Ex.: Pet, Assinaturas..." autocomplete="off">') +
      field('Grupo', '<span class="sel"><select id="ct-g">' + Cat.groups.map(function (g) { return '<option value="' + g.id + '"' + (c.g === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select>' + icon('down', 16) + '</span>') +
      '<div class="fld"><span>Ícone</span><div class="icons">' + CAT_ICONS.map(function (i) { return '<button type="button" class="ico' + (c.icon === i ? ' on' : '') + '" data-a="ct-icon" data-i="' + i + '" aria-label="' + i + '">' + icon(i, 20) + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="fbar">' + (c.id ? '<button class="btn danger-o" data-a="ct-del">' + icon('trash', 18) + '</button>' : '') + '<button class="btn primary grow" data-a="ct-save">Salvar categoria</button></div>';
  }
  function ctSync() { CT.name = document.getElementById('ct-name').value; CT.g = document.getElementById('ct-g').value; }
  A['cat-new'] = function () {
    var top = UI.top(), g = top && top.type === 'income' ? 'receitas' : 'outros';
    CT = { id: null, name: '', g: g, icon: Cat.group(g).icon };
    CTS = UI.sheet({ cls: 'tall', html: catFormHtml(), label: 'Nova categoria', onClose: function () { CTS = null; } });
  };
  A['cat-open'] = function (el) {
    var c = Cat.get(el.dataset.id);
    if (!c.custom) {
      var by = S.byGroup(V.ym, 'expense'), n = S.monthTx(V.ym).filter(function (t) { return t.cat === c.id; });
      UI.toast(n.length ? c.name + ': ' + n.length + ' lançamento(s) em ' + U.monthName(V.ym).toLowerCase() + ' · ' + M(U.sum(n, function (t) { return t.amount; })) : 'Categoria padrão. Sem lançamentos em ' + U.monthName(V.ym).toLowerCase() + '.');
      return;
    }
    CT = { id: c.id, name: c.name, g: c.g, icon: c.icon };
    CTS = UI.sheet({ cls: 'tall', html: catFormHtml(), label: 'Editar categoria', onClose: function () { CTS = null; } });
  };
  A['ct-icon'] = function (el) { ctSync(); CT.icon = el.dataset.i; var sc = CTS.panel.scrollTop; UI.setHtml(CTS, catFormHtml()); CTS.panel.scrollTop = sc; };
  A['ct-save'] = function () {
    ctSync(); CT.name = CT.name.trim();
    if (!CT.name) { UI.toast('Dê um nome para a categoria.'); return; }
    S.saveCat(CT); UI.close(CTS); UI.toast('Categoria salva.');
    var l = document.getElementById('cp-list'), top = UI.top();
    if (l && top && top.type) l.innerHTML = catList({ type: top.type });
  };
  A['ct-del'] = function () {
    UI.confirm({ title: 'Excluir categoria?', text: 'Os lançamentos dela passam para "Sem categoria".', ok: 'Excluir', danger: true }, function () { S.deleteCat(CT.id); UI.close(CTS); UI.toast('Categoria excluída.'); });
  };

  /* ================= BACKUP ================= */
  function copyText(text, ok) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var done = false; try { done = document.execCommand('copy'); } catch (e) { done = false; }
      document.body.removeChild(ta);
      UI.toast(done ? ok : 'Não foi possível copiar. Use "Baixar arquivo".');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { UI.toast(ok); }, fallback);
    else fallback();
  }
  A['backup'] = function () {
    var html = head('Backup e restauração') + '<div class="form"><p class="muted">Seus dados ficam só neste aparelho. Guarde uma cópia para não perdê-los se limpar o navegador ou trocar de celular.</p>' +
      '<div class="two"><button class="btn primary" data-a="bk-copy">' + icon('copy', 18) + ' Copiar backup</button>' + (G.top === G ? '<button class="btn ghost" data-a="bk-down">' + icon('download', 18) + ' Baixar arquivo</button>' : '') + '</div>' +
      '<h4 class="plist-h">Restaurar</h4>' + field('Cole o backup aqui', '<textarea id="bk-text" rows="4" placeholder="{ &quot;v&quot;: 1, ... }"></textarea>') +
      '<div class="two"><label class="btn ghost file">' + icon('upload', 18) + ' Escolher arquivo<input id="bk-file" type="file" accept="application/json,.json" hidden></label><button class="btn ghost" data-a="bk-restore">' + icon('refresh', 18) + ' Restaurar</button></div></div>';
    var s = UI.sheet({ cls: 'tall', html: html, label: 'Backup' });
    s.onChange = function (el) {
      if (el.id !== 'bk-file' || !el.files[0]) return;
      var rd = new FileReader();
      rd.onload = function () { document.getElementById('bk-text').value = String(rd.result); UI.toast('Arquivo lido. Toque em Restaurar.'); };
      rd.readAsText(el.files[0]);
    };
  };
  A['bk-copy'] = function () { copyText(S.exportJSON(), 'Backup copiado.'); };
  A['bk-down'] = function () {
    try {
      var blob = new Blob([S.exportJSON()], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'meu-bolso-' + U.today() + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    } catch (e) { UI.toast('Não foi possível baixar. Use "Copiar backup".'); }
  };
  A['bk-restore'] = function () {
    var txt = (document.getElementById('bk-text').value || '').trim();
    if (!txt) { UI.toast('Cole o backup ou escolha um arquivo.'); return; }
    try { JSON.parse(txt); } catch (e) { UI.toast('Esse texto não é um backup válido.'); return; }
    UI.confirm({ title: 'Restaurar backup?', text: 'Os dados atuais serão substituídos.', ok: 'Restaurar', danger: true }, function () {
      try { S.importJSON(txt); UI.closeAll(); UI.toast('Backup restaurado.'); } catch (e) { UI.toast(e.message || 'Backup inválido.'); }
    });
  };

  G.Forms = { openTx: openTxForm };
})(window);
