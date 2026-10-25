/* Roteador, ações globais e inicialização. */
(function (G) {
  'use strict';
  var A = UI.actions, App = {};
  var cur = 'home', depth = 0, trail = [];
  var standalone = (function () { try { return G.top === G; } catch (e) { return false; } })();
  var deferredInstall = null;

  function head(r) { return r.split('/')[0]; }
  App.route = function () { return cur; };

  /* ---------- tema ---------- */
  function applyTheme() {
    var t = S.get().settings.theme, root = document.documentElement;
    if (t === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t);
    var dark = t === 'dark' || (t === 'auto' && G.matchMedia && G.matchMedia('(prefers-color-scheme: dark)').matches);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', dark ? '#0b4f2c' : '#12a150');
  }
  if (G.matchMedia) {
    var mq = G.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', function () { if (S.get()) applyTheme(); });
  }

  /* ---------- renderização ---------- */
  App.render = function (keepScroll) {
    var parts = cur.split('/'), fn = Views[parts[0]] || Views.home, el = document.getElementById('view'), y = G.scrollY, html;
    try { html = fn(parts); } catch (e) { console.error(e); html = '<main class="page">' + '<div class="empty"><b>Algo deu errado ao abrir esta tela.</b><p>Volte para o início e tente de novo.</p><button class="btn primary" data-a="go" data-r="home">Ir para o início</button></div></main>'; }
    el.innerHTML = html;
    var isTab = !!Views.tabs[parts[0]];
    document.body.classList.toggle('subpage', !isTab);
    var tabs = document.querySelectorAll('.nav [data-r]');
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute('data-r') === parts[0];
      tabs[i].classList.toggle('on', on);
      if (on) tabs[i].setAttribute('aria-current', 'page'); else tabs[i].removeAttribute('aria-current');
    }
    if (keepScroll !== false) G.scrollTo(0, y);
  };

  function writeHistory(push) {
    if (!standalone) return;
    try { history[push ? 'pushState' : 'replaceState']({ r: cur, sh: 0, d: depth }, ''); } catch (e) { /* sem histórico */ }
  }

  App.go = function (r, replace) {
    UI.afterHistory(function () {
      if (r === cur) { G.scrollTo(0, 0); App.render(false); return; }
      var tabNext = !!Views.tabs[head(r)], push = !tabNext && !replace;
      if (push) { trail.push(cur); depth++; }
      else if (tabNext) { trail = []; depth = 0; }
      cur = r;
      writeHistory(push);
      App.render(false);
      G.scrollTo(0, 0);
    });
  };

  App.back = function () {
    if (standalone && depth > 0) { try { history.back(); return; } catch (e) { /* segue */ } }
    var prev = trail.pop();
    depth = Math.max(0, depth - 1);
    cur = prev || (head(cur) === 'fatura' ? 'contas' : head(cur) === 'categorias' ? 'menu' : 'home');
    App.render(false); G.scrollTo(0, 0);
  };

  UI.nav = {
    route: function () { return cur; },
    restore: function (r) { cur = r; trail.length = Math.min(trail.length, depth); App.render(false); G.scrollTo(0, 0); }
  };
  G.addEventListener('popstate', function (e) {
    var st = e.state;
    if (st && typeof st.d === 'number') { depth = st.d; trail.length = Math.min(trail.length, depth); }
  });

  /* ---------- ações ---------- */
  A.go = function (el) {
    if (el.dataset.p) V.plan = el.dataset.p;
    App.go(el.dataset.r, !!el.dataset.replace);
  };
  A.back = function () { App.back(); };
  A.month = function (el) { V.ym = U.addMonths(V.ym, +el.dataset.d); App.render(); };
  A['toggle-hide'] = function () { S.setSetting('hide', !S.get().settings.hide); };
  A.bar = function (el) { V.ym = el.dataset.ym; App.render(); };
  A['plan-tab'] = function (el) { V.plan = el.dataset.v; App.render(); };
  A['rep-type'] = function (el) { V.rep = el.dataset.v; App.render(); };
  A['ext-filter'] = function (el) { V.ext = { q: '', type: el.dataset.t, acc: '', sort: 'desc' }; App.go('extrato'); };
  A['ext-type'] = function (el) { V.ext.type = el.dataset.t; App.render(); };
  A['ext-sort'] = function () { V.ext.sort = V.ext.sort === 'desc' ? 'asc' : 'desc'; refreshList(); UI.toast(V.ext.sort === 'desc' ? 'Mais recentes primeiro.' : 'Mais antigos primeiro.'); };
  A.theme = function (el) { S.setSetting('theme', el.dataset.v); };
  A['demo-keep'] = function () { S.setSetting('demo', false); };
  A.demo = function () {
    UI.confirm({ title: 'Carregar dados de exemplo?', text: 'Isso substitui tudo o que está salvo agora.', ok: 'Carregar exemplo', danger: true }, function () {
      S.seedDemo(); V.ym = U.today().slice(0, 7); UI.toast('Dados de exemplo carregados.'); App.go('home', true);
    });
  };
  A.reset = function (el) {
    UI.confirm({ title: 'Apagar todos os dados?', text: 'Contas, cartões, lançamentos e orçamentos serão removidos deste aparelho. Isso não tem volta.', ok: 'Apagar tudo', danger: true }, function () {
      var snap = S.snapshot(); S.reset(); V.ym = U.today().slice(0, 7);
      UI.toast('Tudo limpo. Pode começar.', { label: 'Desfazer', fn: function () { S.restore(snap); } });
      App.go('home', true);
    });
  };
  A.install = function () {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    deferredInstall.userChoice.then(function () { deferredInstall = null; UI.canInstall = false; App.render(); });
  };
  G.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredInstall = e; UI.canInstall = true; if (cur === 'menu') App.render(); });

  function refreshList() {
    var l = document.getElementById('ext-list');
    if (l) { l.innerHTML = Views.extListHtml(); var s = document.getElementById('ext-stats'); if (s) s.innerHTML = Views.extStats(); }
  }
  UI.onViewInput = function (el) {
    var v = el.getAttribute('data-v');
    if (v === 'ext-q') { V.ext.q = el.value; refreshList(); }
    else if (v === 'cat-q') { V.catQ = el.value; document.getElementById('cat-list').innerHTML = catList({ q: V.catQ, manage: true }); }
  };
  UI.onViewChange = function (el) {
    var v = el.getAttribute('data-v');
    if (v === 'ext-acc') { V.ext.acc = el.value; refreshList(); }
    else if (v === 'name') S.setSetting('name', el.value.trim());
  };

  /* ---------- início ---------- */
  App.start = function () {
    S.init();
    applyTheme();
    S.subscribe(function () { applyTheme(); App.render(); });
    writeHistory(false);
    App.render(false);
    var sp = document.getElementById('splash');
    if (sp) { sp.classList.add('out'); setTimeout(function () { if (sp.parentNode) sp.parentNode.removeChild(sp); }, 400); }
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      try { navigator.serviceWorker.register('sw.js').catch(function () { /* offline opcional */ }); } catch (e) { /* ignora */ }
    }
  };

  G.App = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', App.start); else App.start();
})(window);
