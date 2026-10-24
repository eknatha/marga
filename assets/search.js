/* MARGA search: typo-tolerant, ranked, with type filters. Runs in the browser and in Node (for tests).
   build(items): items are {kind, title, sub, href, body, extra}.  query(q, {kind, limit}) returns ranked hits with a snippet. */
(function (root) {
'use strict';
var items = [];
function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9.\/_\-+# ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function tokens(s) { return norm(s).split(' ').filter(Boolean); }
function dist1(a, b) {          /* true if edit distance (insert, delete, substitute, swap) is 1 or less */
  if (a === b) return true;
  var la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  var i = 0; while (i < la && i < lb && a.charAt(i) === b.charAt(i)) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a.charAt(i) === b.charAt(i + 1) && a.charAt(i + 1) === b.charAt(i) && a.slice(i + 2) === b.slice(i + 2);
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}
function build(list) {
  items = list.map(function (it, n) {
    var t = norm(it.title), s = norm(it.sub), b = norm(it.body), x = norm(it.extra);
    return { n: n, it: it, t: t, s: s, b: b, x: x, tw: t.split(' '), words: null };
  });
  return items.length;
}
function wordSet(r) { if (!r.words) { var o = {}, a = (r.t + ' ' + r.s + ' ' + r.x + ' ' + r.b).split(' '); for (var i = 0; i < a.length; i++) if (a[i]) o[a[i]] = 1; r.words = Object.keys(o); } return r.words; }
/* score one query term against one record: 0 means no match */
function termScore(term, r, fuzzy) {
  var best = 0;
  if (r.t === term) best = 40;
  else if (r.t.indexOf(term) === 0) best = 28;
  else if (r.tw.indexOf(term) >= 0) best = 22;
  else if (r.t.indexOf(term) >= 0) best = 16;
  if (r.x && r.x.indexOf(term) >= 0) best = Math.max(best, 12);
  if (r.s.indexOf(term) >= 0) best = Math.max(best, 8);
  if (r.b.indexOf(term) >= 0) best = Math.max(best, 4);
  if (!best && fuzzy && term.length >= 4) {
    var ws = wordSet(r);
    for (var i = 0; i < ws.length; i++) { var w = ws[i]; if (w.length >= 4 && dist1(term, w)) { best = r.tw.indexOf(w) >= 0 ? 9 : 2; break; } }
  }
  return best;
}
function snippet(r, terms) {
  var text = r.it.body || r.it.sub || '';
  if (!text) return '';
  var low = text.toLowerCase(), at = -1;
  for (var i = 0; i < terms.length && at < 0; i++) at = low.indexOf(terms[i]);
  if (at < 0) return String(r.it.sub || text).slice(0, 110);
  var from = Math.max(0, at - 40), out = text.slice(from, from + 120).replace(/\s+/g, ' ');
  return (from > 0 ? '...' : '') + out + (from + 120 < text.length ? '...' : '');
}
function query(q, opts) {
  opts = opts || {};
  var terms = tokens(q);
  if (!terms.length) return [];
  var kind = opts.kind || '', out = [];
  for (var i = 0; i < items.length; i++) {
    var r = items[i];
    if (kind && r.it.group !== kind) continue;
    var total = 0, ok = true, exact = 0;
    for (var k = 0; k < terms.length; k++) {
      var sc = termScore(terms[k], r, true);
      if (!sc) { ok = false; break; }
      total += sc; if (sc >= 16) exact++;
    }
    if (!ok) continue;
    if (terms.length > 1) { var phrase = terms.join(' '); if (r.t.indexOf(phrase) >= 0) total += 25; else if (r.b.indexOf(phrase) >= 0) total += 8; }
    total += exact;
    if (r.it.boost) total += r.it.boost;
    out.push({ it: r.it, score: total, snippet: snippet(r, terms) });
  }
  out.sort(function (a, b) { return b.score - a.score || (a.it.title < b.it.title ? -1 : 1); });
  return out.slice(0, opts.limit || 30);
}
function counts(q) {
  var terms = tokens(q), c = {};
  if (!terms.length) return c;
  for (var i = 0; i < items.length; i++) {
    var r = items[i], ok = true;
    for (var k = 0; k < terms.length; k++) if (!termScore(terms[k], r, true)) { ok = false; break; }
    if (ok) c[r.it.group] = (c[r.it.group] || 0) + 1;
  }
  return c;
}
function highlight(text, q, esc) {
  var terms = tokens(q).filter(function (t) { return t.length > 1; });
  var s = esc(String(text || ''));
  terms.forEach(function (t) {
    var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + ')', 'ig');
    s = s.replace(re, '<mark>$1</mark>');
  });
  return s;
}
var api = { build: build, query: query, counts: counts, highlight: highlight, tokens: tokens, dist1: dist1 };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MargaSearch = api;
})(typeof window !== 'undefined' ? window : this);
