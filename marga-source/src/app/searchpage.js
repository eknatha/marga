/* MARGA full search page: #/search?q=term. Searches lessons, cases, cheat sheets, interview, glossary, labs, games, plans and more. */
window.MargaSearchPage = function (A) {
'use strict';
var $ = A.$, e = A.e, view = A.view;
function hl(t, q) { return window.MargaSearch ? MargaSearch.highlight(t, q, e) : e(t); }
function parse(m) { var o = {}; (m || '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) { try { o[p[0]] = decodeURIComponent((p[1] || '').replace(/\+/g, ' ')); } catch (x) { o[p[0]] = p[1] || ''; } } }); return o; }
function pageView(m) {
  var o = parse(m), q = (o.q || '').trim(), g = o.g || '', st = o.s || '';
  view.title = (q ? 'Search: ' + q : 'Search') + ' | MARGA'; view.nav = 'practice';
  view.html = '<section class="page-head wrap"><h1>Search everything</h1><p class="lede">Lessons, cheat sheets, case studies, interview questions, glossary, Linux labs, terminal labs, challenges, games, widgets, plans and handbooks. Works offline.</p>' +
    '<form class="sp-form" id="sp-form" role="search"><label class="sr" for="sp-q">Search</label><input id="sp-q" type="search" value="' + e(q) + '" placeholder="Try: crashloop, chmod, systemd, subnet" autocomplete="off"> <button class="btn" type="submit">Search</button></form>' +
    '<div class="sfilters" id="sp-chips" role="group" aria-label="Filter results"></div><div id="sp-out" aria-live="polite"><p class="small">Type a word and press Search.</p></div></section>';
  view.after = function () {
    $('#sp-form').addEventListener('submit', function (ev) { ev.preventDefault(); var v = $('#sp-q').value.trim(); location.hash = '/search' + (v ? '?q=' + encodeURIComponent(v) + (g ? '&g=' + encodeURIComponent(g) : '') : ''); });
    if (!q) { $('#sp-q').focus(); return; }
    $('#sp-out').innerHTML = '<p class="small">Searching</p>';
    A.searchAll(q, g, st, 80).then(function (r) {
      var total = 0; r.groups.forEach(function (x) { total += r.counts[x] || 0; });
      $('#sp-chips').innerHTML = [''].concat(r.groups).map(function (x) {
        var n = x ? (r.counts[x] || 0) : total;
        return '<a class="schip' + (x === g ? ' on' : '') + '" href="#/search?q=' + encodeURIComponent(q) + (x ? '&g=' + encodeURIComponent(x) : '') + '" aria-current="' + (x === g) + '">' + (x || 'All') + ' <span>' + n + '</span></a>';
      }).join('');
      if (!r.hits.length) { $('#sp-out').innerHTML = '<p>Nothing matches "' + e(q) + '". Try a tool name, a command or fewer words.' + (window.MargaSearch && MargaSearch.suggest(q) ? ' Did you mean <a href="#/search?q=' + encodeURIComponent(MargaSearch.suggest(q)) + '">' + e(MargaSearch.suggest(q)) + '</a>?' : '') + '</p>'; return; }
      $('#sp-out').innerHTML = '<p class="small">' + A.plural(r.hits.length, 'result') + (g ? ' in ' + e(g) : '') + '</p><ul class="sp-list">' + r.hits.map(function (h) {
        var it = h.it; return '<li class="sp-item"><span class="k chip">' + e(it.kind) + '</span> <a href="' + e(it.href) + '">' + hl(it.title, q) + '</a><div class="small">' + hl(h.snippet || it.sub, q) + '</div></li>';
      }).join('') + '</ul>';
    });
  };
}
A.addRoute(/^\/search(?:\?(.*))?$/, pageView);
};
