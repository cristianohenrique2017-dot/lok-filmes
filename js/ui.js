/* Camada de interface: ações por data-a, bottom sheets, diálogos, toasts, histórico (botão voltar). */
(function (G) {
  'use strict';
  var UI = { actions: {}, nav: null };
  var stack = [];
  var skip = 0, queue = [], skipTimer = null;
  var standalone = (function () { try { return G.top === G; } catch (e) { return false; } })();

  /* ---------- ações ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a]');
    if (!el) return;
    var fn = UI.actions[el.getAttribute('data-a')];
    if (fn) { if (el.tagName === 'A' || el.tagName === 'BUTTON') e.preventDefault(); fn(el, e); }
  });

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-money')) UI.formatMoney(el);
    var s = stack[stack.length - 1];
    if (s && s.onInput && s.el.contains(el)) s.onInput(el, e);
    else if (UI.onViewInput && !s) UI.onViewInput(el, e);
  });
  document.addEventListener('change', function (e) {
    var el = e.target, s = stack[stack.length - 1];
    if (s && s.onChange && s.el.contains(el)) s.onChange(el, e);
    else if (UI.onViewChange && !s) UI.onViewChange(el, e);
  });
  /** Campos de dinheiro mantêm o cursor sempre no fim. */
  function caretEnd(e) {
    var el = e.target;
    if (!el.hasAttribute || !el.hasAttribute('data-money')) return;
    var go = function () { try { el.setSelectionRange(el.value.length, el.value.length); } catch (err) { /* ignora */ } };
    go(); setTimeout(go, 0);
  }
  document.addEventListener('focusin', caretEnd);
  document.addEventListener('beforeinput', function (e) {
    var el = e.target;
    if (el.hasAttribute && el.hasAttribute('data-money')) { try { el.setSelectionRange(el.value.length, el.value.length); } catch (err) { /* ignora */ } }
  });
  document.addEventListener('click', caretEnd);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && stack.length) UI.close();
  });

  /** Campo de dinheiro: os dígitos preenchem da direita para a esquerda. */
  UI.formatMoney = function (el) {
    var d = el.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 11);
    el.dataset.cents = d || '0';
    el.value = U.num(parseInt(d || '0', 10));
    try { el.setSelectionRange(el.value.length, el.value.length); } catch (err) { /* ignora */ }
  };
  UI.cents = function (el) { return el ? parseInt(el.dataset.cents || el.value.replace(/\D/g, '') || '0', 10) : 0; };
  UI.moneyAttrs = function (cents) { return 'data-money inputmode="numeric" autocomplete="off" data-cents="' + (cents || 0) + '" value="' + U.num(cents || 0) + '"'; };

  /* ---------- histórico ---------- */
  function histState() { return { r: UI.nav ? UI.nav.route() : '', sh: stack.length }; }
  function pushHist() { if (!standalone) return false; try { history.pushState(histState(), ''); return true; } catch (e) { return false; } }
  function histBack() {
    skip++;
    clearTimeout(skipTimer);
    skipTimer = setTimeout(flushQueue, 250);
    try { history.back(); } catch (e) { skip = 0; }
  }
  function flushQueue() {
    skip = 0;
    var q = queue; queue = [];
    q.forEach(function (fn) { fn(); });
  }
  /** Executa fn depois que o histórico terminar de voltar. */
  UI.afterHistory = function (fn) { if (skip > 0) queue.push(fn); else fn(); };

  G.addEventListener('popstate', function (e) {
    if (skip > 0) { skip--; if (skip === 0) { clearTimeout(skipTimer); flushQueue(); } return; }
    var st = e.state || {};
    var want = typeof st.sh === 'number' ? st.sh : 0;
    while (stack.length > want) UI.close(stack[stack.length - 1], true);
    if (UI.nav && st.r && st.r !== UI.nav.route()) UI.nav.restore(st.r);
  });

  /* ---------- sheets ---------- */
  UI.sheet = function (opts) {
    var wrap = document.createElement('div');
    wrap.className = 'sheet ' + (opts.cls || '');
    wrap.innerHTML = '<div class="backdrop" data-a="sheet-close"></div>' +
      '<div class="panel" role="dialog" aria-modal="true"' + (opts.label ? ' aria-label="' + U.esc(opts.label) + '"' : '') + '>' + opts.html + '</div>';
    document.getElementById('sheets').appendChild(wrap);
    var s = { el: wrap, panel: wrap.querySelector('.panel'), closed: false, onClose: opts.onClose, onInput: null, onChange: null, hist: false };
    stack.push(s);
    s.hist = pushHist();
    document.body.classList.add('noscroll');
    requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.classList.add('open'); }); });
    if (opts.onMount) opts.onMount(s);
    return s;
  };
  UI.setHtml = function (s, html) { s.panel.innerHTML = html; };
  UI.top = function () { return stack[stack.length - 1]; };
  UI.hasSheet = function () { return stack.length > 0; };

  UI.close = function (s, fromPop) {
    s = s && s.panel ? s : stack[stack.length - 1];
    if (!s || s.closed) return;
    s.closed = true;
    stack.splice(stack.indexOf(s), 1);
    s.el.classList.remove('open');
    setTimeout(function () { if (s.el.parentNode) s.el.parentNode.removeChild(s.el); }, 280);
    if (!stack.length) document.body.classList.remove('noscroll');
    if (s.hist && !fromPop) histBack();
    if (s.onClose) s.onClose();
  };
  UI.closeAll = function () { while (stack.length) UI.close(stack[stack.length - 1]); };
  UI.actions['sheet-close'] = function (el) {
    var sh = el.closest('.sheet'), s = stack.filter(function (x) { return x.el === sh; })[0];
    UI.close(s);
  };

  /* ---------- diálogos ---------- */
  /** Diálogo com várias opções. opts: {title, text, options:[{label, val, kind}]} */
  UI.choice = function (opts, cb) {
    var html = '<div class="dlg"><h3>' + U.esc(opts.title) + '</h3>' +
      (opts.text ? '<p>' + U.esc(opts.text) + '</p>' : '') + '<div class="dlg-btns">' +
      opts.options.map(function (o, i) {
        return '<button class="btn ' + (o.kind || 'ghost') + '" data-a="dlg-pick" data-i="' + i + '">' + U.esc(o.label) + '</button>';
      }).join('') +
      '<button class="btn plain" data-a="sheet-close">Cancelar</button></div></div>';
    var s = UI.sheet({ cls: 'center', html: html, label: opts.title });
    s.pick = function (i) { UI.close(s); UI.afterHistory(function () { cb(opts.options[i].val); }); };
  };
  UI.actions['dlg-pick'] = function (el) {
    var sh = el.closest('.sheet'), s = null;
    for (var i = 0; i < stack.length; i++) if (stack[i].el === sh) s = stack[i];
    if (s && s.pick) s.pick(+el.dataset.i);
  };
  UI.confirm = function (opts, cb) {
    UI.choice({ title: opts.title, text: opts.text, options: [{ label: opts.ok || 'Confirmar', val: true, kind: opts.danger ? 'danger' : 'primary' }] }, cb);
  };

  /* ---------- toast ---------- */
  var toastTimer = null;
  UI.toast = function (msg, action) {
    var t = document.getElementById('toast');
    t.innerHTML = '<span>' + U.esc(msg) + '</span>' + (action ? '<button data-a="toast-act">' + U.esc(action.label) + '</button>' : '');
    t._fn = action && action.fn;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, action ? 6000 : 2600);
  };
  UI.actions['toast-act'] = function () {
    var t = document.getElementById('toast');
    t.classList.remove('show');
    if (t._fn) t._fn();
  };

  G.UI = UI;
})(window);
