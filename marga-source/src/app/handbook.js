/* MARGA handbooks: every skill as one document you can keep.
   A handbook gathers a skill's lessons, flashcards, cheat sheets, glossary terms, interview questions and official references
   in order. Print it or save it as a PDF from the browser, or download it as one HTML file that opens offline, with no
   account and no server. It is built from the lessons themselves, so it cannot disagree with them. */
window.MargaHandbook = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, view = A.view, D = A.D;

function plain(html) { return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function words(html) { var t = plain(html); return t ? t.split(' ').length : 0; }
/* lesson HTML is reused inside one long document: headings drop one level, ids and copy buttons are removed */
function tidy(html) {
  return String(html || '')
    .replace(/<button class="copy"[\s\S]*?<\/button>/g, '')
    .replace(/<(\/?)h3/g, '<$1h4').replace(/<(\/?)h2/g, '<$1h3')
    .replace(/\s(id|data-jump|tabindex)="[^"]*"/g, '');
}
function pagesOf(n) { return Math.max(1, Math.round(n / 380)); }

function parts(mid) {
  var m = A.MOD[mid], ls = m.lessons.map(function (id) { return A.LES[id]; }).filter(Boolean);
  var sheets = Object.keys(D.sheets || {}).map(function (k) { return D.sheets[k]; }).filter(function (s) { return s.module === mid; });
  var gl = (D.glossary || []).filter(function (g) { return g.module === mid; });
  var iv = (D.interview || []).filter(function (x) { return x.module === mid; });
  return { m: m, ls: ls, sheets: sheets, gl: gl, iv: iv };
}
function wordCount(p) { return p.ls.reduce(function (n, l) { return n + words(l.html); }, 0) + p.sheets.reduce(function (n, s) { return n + words(s.html); }, 0); }

function bodyHtml(p) {
  var m = p.m, o = [];
  o.push('<header class="hb-cover"><p class="hb-brand">MARGA by EknathaLabs</p><h1>' + e(m.title) + '</h1><p class="hb-sum">' + e(m.summary) + '</p>' +
    '<p class="small">' + p.ls.length + ' lessons, ' + p.sheets.length + (p.sheets.length === 1 ? ' cheat sheet' : ' cheat sheets') + ', ' + p.gl.length + ' glossary terms, ' + p.iv.length + ' interview questions. Free to use at marga.eknathalabs.com.</p></header>');
  o.push('<nav class="hb-toc" aria-label="Contents"><h2>Contents</h2><ol>' + p.ls.map(function (l, i) { return '<li>' + e(l.title) + ' <span class="small">' + l.minutes + ' min</span></li>'; }).join('') +
    (p.sheets.length ? '<li>Cheat sheets</li>' : '') + (p.gl.length ? '<li>Glossary</li>' : '') + (p.iv.length ? '<li>Interview questions</li>' : '') + '<li>Official references</li></ol></nav>');
  p.ls.forEach(function (l, i) {
    o.push('<section class="hb-lesson"><h2>Lesson ' + (i + 1) + ': ' + e(l.title) + '</h2><p class="small">' + l.minutes + ' minutes. ' + e(l.summary) + '</p>' + tidy(l.html) +
      (l.cards && l.cards.length ? '<h3>Remember</h3><div class="table-wrap"><table><tbody>' + l.cards.map(function (c) { return '<tr><th scope="row">' + e(c.f) + '</th><td>' + e(c.b) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') + '</section>');
  });
  if (p.sheets.length) o.push('<section class="hb-sheets"><h2>Cheat sheets</h2>' + p.sheets.map(function (s) { return '<h3>' + e(s.title) + '</h3><p class="small">' + e(s.summary) + '</p>' + tidy(s.html); }).join('') + '</section>');
  if (p.gl.length) o.push('<section class="hb-gloss"><h2>Glossary</h2><dl>' + p.gl.map(function (g) { return '<dt>' + e(g.term) + '</dt><dd>' + e(g.def) + '</dd>'; }).join('') + '</dl></section>');
  if (p.iv.length) o.push('<section class="hb-iv"><h2>Interview questions</h2>' + p.iv.map(function (x) { return '<h3>' + e(x.q) + ' <span class="small">(' + e(x.level) + ')</span></h3><p>' + e(x.text) + '</p>'; }).join('') + '</section>');
  var seen = {}, refs = [];
  (m.refs || []).concat.apply(m.refs || [], p.ls.map(function (l) { return l.refs || []; })).forEach(function (r) { if (r && r.u && !seen[r.u]) { seen[r.u] = 1; refs.push(r); } });
  o.push('<section class="hb-refs"><h2>Official references</h2><ul>' + refs.map(function (r) { return '<li>' + e(r.t) + ': ' + e(r.u) + '</li>'; }).join('') + '</ul>' +
    '<p class="small">A record of study material, not a certificate. Check the official documentation for the current detail.</p></section>');
  return o.join('');
}

var CSS = 'body{font:16px/1.6 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:46rem;margin:0 auto;padding:1.5rem;color:#14202e;background:#fff}' +
  'h1{font-size:2rem;line-height:1.2}h2{margin-top:2.2rem;border-top:2px solid #14202e;padding-top:.8rem}h3{margin-top:1.4rem}.small{font-size:.85rem;color:#4a5a6b}' +
  '.hb-brand{font-weight:700;letter-spacing:.02em;color:#2347c5}pre{background:#f3f5f8;border:1px solid #d5dbe3;padding:.7rem .9rem;overflow:auto;white-space:pre-wrap;border-radius:6px;font:13px/1.5 ui-monospace,Menlo,Consolas,monospace}' +
  'code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.92em}table{border-collapse:collapse;width:100%;margin:.8rem 0}th,td{border:1px solid #cfd6df;padding:.4rem .6rem;text-align:left;vertical-align:top}' +
  'aside.callout{border:1px solid #cfd6df;border-left:6px solid #2347c5;padding:.5rem .9rem;margin:1rem 0;background:#f7f9fc}.callout-title{font-weight:700}blockquote{border-left:4px solid #cfd6df;margin:1rem 0;padding:.2rem 1rem;color:#34465a}' +
  'li,p,dd{overflow-wrap:anywhere}.hb-lesson{break-before:page}dt{font-weight:700;margin-top:.6rem}dd{margin:0 0 .4rem 0}.ln{display:block}.ps{user-select:none;color:#6a7a8c}@media print{.hb-lesson{break-before:page}pre{break-inside:avoid}body::before{content:"MARGA by EknathaLabs";position:fixed;left:50%;top:46%;transform:translate(-50%,-50%) rotate(-32deg);font:700 54pt/1 sans-serif;color:rgba(15,37,71,.085);white-space:nowrap;pointer-events:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}body::after{content:"marga.eknathalabs.com";position:fixed;left:50%;top:56%;transform:translate(-50%,-50%) rotate(-32deg);font:600 22pt/1 sans-serif;color:rgba(15,37,71,.085);white-space:nowrap;pointer-events:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}}';

function download(p) {
  var doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + e(p.m.title) + ' handbook | MARGA by EknathaLabs</title><style>' + CSS + '</style></head><body>' + bodyHtml(p) + '</body></html>';
  var blob = new Blob([doc], { type: 'text/html' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'marga-' + p.m.id + '-handbook.html';
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function handbookView(mid) {
  var m = A.MOD[mid];
  view.after = null; view.cleanup = null; view.voice = '';
  if (!m) { view.title = 'Handbook not found | MARGA'; view.nav = 'practice'; view.html = '<section class="page-head wrap"><h1>That handbook does not exist</h1><p class="lede"><a href="#/handbooks">See all handbooks</a>.</p></section>'; return; }
  view.title = m.title + ' handbook | MARGA by EknathaLabs'; view.nav = 'practice';
  var here = location.hash;
  if (!A.isLoaded(mid)) {
    view.html = '<section class="page-head wrap"><h1>' + e(m.title) + ' handbook</h1><p class="lede" role="status">Preparing the handbook.</p></section>';
    A.loadModule(mid).then(function () { if (location.hash === here) A.route(); }, function () { var n = $('#main .lede'); if (n) n.textContent = 'The handbook could not load. Check your connection and reload the page.'; });
    return;
  }
  var p = parts(mid), wc = wordCount(p);
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/handbooks">Handbooks</a></nav><h1>' + e(m.title) + ' handbook</h1>' +
    '<p class="lede">All ' + p.ls.length + ' lessons, the cheat sheets, glossary, interview questions and references in one document. About ' + pagesOf(wc) + ' printed pages.</p>' +
    '<div class="actions hb-actions"><button type="button" class="btn btn-primary" data-act="pdf">Save as PDF</button><button type="button" class="btn btn-quiet" data-act="print">Print</button><button type="button" class="btn btn-quiet" id="hb-dl">Download as a web page</button>' + A.printStyleSelect() + '</div>' +
    '<p class="small">The downloaded page is one file. It opens offline in any browser.</p></section>' +
    '<div class="wrap narrow prose hb-doc" id="hb-doc">' + bodyHtml(p) + '</div>';
  view.after = function () { var b = $('#hb-dl'); if (b) b.addEventListener('click', function () { download(p); A.toast('Handbook downloaded.'); }); };
}

function indexView() {
  view.title = 'Handbooks | MARGA by EknathaLabs'; view.nav = 'practice'; view.after = null; view.voice = '';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Handbooks</h1><p class="lede">Every skill as one document: lessons, cheat sheets, glossary, interview questions and references. Save as PDF, print, or download one web page that works offline. Free, with no sign-up.</p></section>' +
    '<div class="wrap narrow"><ul class="ex-list">' + A.MODS.map(function (m) {
      return '<li><a href="#/handbook/' + e(m.id) + '"><strong>' + e(m.title) + '</strong><span>' + m.lessons.length + ' lessons, about ' + pagesOf(m.lessons.length * 1400) + ' pages</span></a></li>';
    }).join('') + '</ul></div>';
}

/* a link on every skill page */
A.afterRoute(function (h) {
  var m = (h || '').match(/^\/module\/([\w-]+)$/); if (!m || !A.MOD[m[1]]) return;
  var hd = $('#main h1'); if (!hd || $('#hb-link')) return;
  hd.insertAdjacentHTML('afterend', '<p class="actions hb-entry"><a class="btn btn-quiet" id="hb-link" href="#/handbook/' + e(m[1]) + '">Get the handbook (PDF or web page)</a></p>');
});
A.addRoute(/^\/handbooks$/, indexView);
A.addRoute(/^\/handbook\/([\w-]+)$/, handbookView);
};
