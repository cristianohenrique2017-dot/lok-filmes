/* Utilitários: formatação de dinheiro e datas, escape de HTML, ids. */
(function (G) {
  'use strict';
  var U = {};

  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var nf = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  U.hidden = false; // quando true, valores aparecem mascarados

  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /** Dinheiro em centavos → "R$ 1.234,56" (ou mascarado). */
  U.money = function (c) {
    if (U.hidden) return 'R$ •••••';
    return brl.format(c / 100).replace(/ /g, ' ');
  };
  /** Só o número "1.234,56". */
  U.num = function (c) { return nf.format(c / 100); };
  U.pad = function (n) { return (n < 10 ? '0' : '') + n; };

  U.ymd = function (d) { return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate()); };
  U.today = function () { return U.ymd(new Date()); };
  U.parse = function (s) { return new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); };
  U.dim = function (y, m) { return new Date(y, m, 0).getDate(); }; // m = 1..12

  /** Soma meses a "YYYY-MM" ou "YYYY-MM-DD" (ajustando o dia ao fim do mês). */
  U.addMonths = function (s, n) {
    var y = +s.slice(0, 4), m = +s.slice(5, 7) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    var ym = y + '-' + U.pad(m + 1);
    if (s.length <= 7) return ym;
    return ym + '-' + U.pad(Math.min(+s.slice(8, 10), U.dim(y, m + 1)));
  };
  U.addDays = function (s, n) {
    var d = U.parse(s); d.setDate(d.getDate() + n); return U.ymd(d);
  };
  U.daysBetween = function (a, b) { return Math.round((U.parse(b) - U.parse(a)) / 86400000); };

  U.monthName = function (ym) { return MESES[+ym.slice(5, 7) - 1]; };
  U.monthShort = function (ym) { return MESES_CURTOS[+ym.slice(5, 7) - 1]; };
  U.monthLabel = function (ym) { return U.monthName(ym) + ' de ' + ym.slice(0, 4); };
  U.dayShort = function (s) { return s.slice(8, 10) + '/' + s.slice(5, 7); };

  /** "Hoje", "Ontem", "Amanhã" ou "sábado, 25 dez." */
  U.dayLabel = function (s) {
    var t = U.today(), diff = U.daysBetween(t, s);
    if (diff === 0) return 'Hoje';
    if (diff === -1) return 'Ontem';
    if (diff === 1) return 'Amanhã';
    var d = U.parse(s);
    return DIAS[d.getDay()] + ', ' + d.getDate() + ' ' + MESES_CURTOS[d.getMonth()].toLowerCase() + '.';
  };
  U.dateLong = function (s) {
    var d = U.parse(s);
    return d.getDate() + ' de ' + MESES[d.getMonth()].toLowerCase() + ' de ' + d.getFullYear();
  };

  U.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); };
  U.sum = function (arr, fn) { var t = 0; for (var i = 0; i < arr.length; i++) t += fn ? fn(arr[i]) : arr[i]; return t; };
  U.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  U.norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  U.initials = function (name) {
    var p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p.length > 1 ? p[1][0] : (p[0][1] || ''))).toUpperCase();
  };

  /** Gerador pseudoaleatório determinístico (para os dados de exemplo). */
  U.rng = function (seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  G.U = U;
})(window);
