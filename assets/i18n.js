/* MARGA language layer. Swaps the interface text for the chosen language, in the browser.
   English stays the source: every string below is looked up by its English text, so a missing
   translation simply stays in English. Code, commands, terminals and lesson bodies are never touched.
   Language files (assets/i18n/<code>.js) load only when a reader picks that language. */
(function () {
  'use strict';
  var KEY = 'ea.lang';
  var LANGS = [['en', 'English'], ['te', 'తెలుగు'], ['hi', 'हिन्दी'], ['ta', 'தமிழ்'], ['kn', 'ಕನ್ನಡ'], ['ml', 'മലയാളം'], ['bn', 'বাংলা'], ['es', 'Español'], ['de', 'Deutsch'], ['fr', 'Français'], ['pt', 'Português'], ['mr', 'मराठी'], ['id', 'Bahasa Indonesia'], ['gu', 'ગુજરાતી'], ['ru', 'Русский']];
  var MARK = { te: '\u0C2E\u0C3E\u0C30\u0C4D\u0C17', hi: '\u092E\u093E\u0930\u094D\u0917', mr: '\u092E\u093E\u0930\u094D\u0917', gu: '\u0AAE\u0ABE\u0AB0\u0ACD\u0A97', ru: '\u041C\u0410\u0420\u0413\u0410', ta: '\u0BAE\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAE\u0BCD', kn: '\u0CAE\u0CBE\u0CB0\u0CCD\u0C97', ml: '\u0D2E\u0D3E\u0D7C\u0D17\u0D02', bn: '\u09AE\u09BE\u09B0\u09CD\u0997' };
  var SKIP = 'pre, code, kbd, .tb, .prose, .tl-term, .tl-termwrap, .vm-term, .vmx-term, .xterm, script, style, textarea, svg text, [data-no-i18n], [translate="no"], .hero-mark';
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var cur = 'en', data = null, busy = false, queue = [], pending = false, obs = null;
  var orig = new WeakMap(), origA = new WeakMap();
  var cache = Object.create(null);

  function saved() { try { var v = localStorage.getItem(KEY); return LANGS.some(function (l) { return l[0] === v; }) ? v : 'en'; } catch (e) { return 'en'; } }
  function ver() { var s = document.querySelector('script[src*="a11y.js"]'); var m = s && /[?&]v=([^&]+)/.exec(s.getAttribute('src')); return m ? m[1] : ''; }
  function base() { var s = document.querySelector('script[src*="a11y.js"]'); var u = s ? s.getAttribute('src') : 'assets/a11y.js'; return u.replace(/a11y\.js.*$/, ''); }

  /* look a string up: exact, then the parts of "a | b | c", then patterns with translated captures */
  function tr(s) {
    if (!data) return null;
    var t = s.replace(/\s+/g, ' ').trim();
    if (!t || /^[\d\s.,:;%/+\-()]+$/.test(t)) return null;
    if (t in cache) return cache[t];
    var out = lookup(t, 0);
    cache[t] = out;
    return out;
  }
  function lookup(t, depth) {
    if (Object.prototype.hasOwnProperty.call(data.dict, t)) return data.dict[t];
    if (depth > 3) return null;
    if (t.indexOf(' | ') > 0) {
      var parts = t.split(' | '), any = false;
      var o = parts.map(function (p) { var r = lookup(p, depth + 1); if (r !== null) any = true; return r === null ? p : r; });
      if (any) return o.join(' | ');
    }
    for (var i = 0; i < data.pats.length; i++) {
      var p = data.pats[i], m = p[0].exec(t);
      if (!m) continue;
      return p[1].replace(/\$(\d)/g, function (_, n) { var g = m[+n] || ''; var r = lookup(g, depth + 1); return r === null ? g : r; });
    }
    return null;
  }

  function keepSpace(src, out) { var a = /^\s*/.exec(src)[0], b = /\s*$/.exec(src)[0]; return a + out + b; }

  function doText(n) {
    var parent = n.parentElement; if (!parent || parent.closest(SKIP)) return;
    var src = orig.has(n) ? orig.get(n) : n.nodeValue;
    if (cur === 'en') { if (orig.has(n)) { n.nodeValue = orig.get(n); orig.delete(n); } return; }
    var out = tr(src);
    if (out === null) { if (orig.has(n)) { n.nodeValue = orig.get(n); orig.delete(n); } return; }
    if (!orig.has(n)) orig.set(n, src);
    var v = keepSpace(src, out); if (n.nodeValue !== v) n.nodeValue = v;
  }
  function doAttrs(el) {
    if (el.closest && el.closest(SKIP)) return;
    var rec = origA.get(el) || {}, changed = false;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i]; if (!el.hasAttribute(a)) continue;
      var src = a in rec ? rec[a] : el.getAttribute(a);
      var out = cur === 'en' ? null : tr(src);
      if (out === null) { if (a in rec) { el.setAttribute(a, rec[a]); delete rec[a]; changed = true; } continue; }
      if (!(a in rec)) rec[a] = src;
      if (el.getAttribute(a) !== out) el.setAttribute(a, out);
      changed = true;
    }
    if (changed) origA.set(el, rec);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1) return;
    if (root.closest && root.closest(SKIP)) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) { return n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    var n; while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
  }
  function run(roots) {
    busy = true;
    try { roots.forEach(walk); marks(); } finally { if (obs) obs.takeRecords(); busy = false; }
  }

  /* the brand word on the home page is shown only in the other languages, in that language's own script */
  function marks() {
    var want = MARK[cur]; if (!want) return;
    var hm = document.querySelectorAll('.hero-mark');
    for (var i = 0; i < hm.length; i++) { if (hm[i].textContent !== want) hm[i].textContent = want; hm[i].setAttribute('lang', cur); }
  }

  function schedule(nodes) {
    for (var i = 0; i < nodes.length; i++) queue.push(nodes[i]);
    if (pending) return; pending = true;
    (window.requestAnimationFrame || setTimeout)(function () { pending = false; var q = queue; queue = []; if (cur !== 'en' || q.some(function (n) { return n.nodeType === 3 ? orig.has(n) : true; })) run(q); });
  }
  function watch() {
    if (obs) return;
    obs = new MutationObserver(function (recs) {
      if (busy) return;
      var nodes = [];
      recs.forEach(function (r) {
        if (r.type === 'childList') { r.addedNodes.forEach(function (n) { nodes.push(n); }); }
        else if (r.type === 'characterData') { orig.delete(r.target); nodes.push(r.target); }
        else if (r.type === 'attributes') { if (origA.has(r.target)) { var rec = origA.get(r.target); delete rec[r.attributeName]; } nodes.push(r.target); }
      });
      if (nodes.length && cur !== 'en') schedule(nodes);
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  function load(code, done) {
    if (code === 'en') { data = null; cache = Object.create(null); done(); return; }
    var have = window.MARGA_LANG && window.MARGA_LANG[code];
    var use = function () { var d = window.MARGA_LANG[code]; data = { dict: d.dict, pats: d.pats.map(function (p) { return [new RegExp(p[0]), p[1]]; }) }; cache = Object.create(null); done(); };
    if (have) { use(); return; }
    var s = document.createElement('script'); s.src = base() + 'i18n/' + code + '.js?v=' + ver();
    s.onload = use; s.onerror = function () { announce('This language could not be loaded. Check your connection and try again.'); set('en', true); };
    document.head.appendChild(s);
  }
  function announce(msg) { var t = document.getElementById('toast'); if (t) { t.textContent = msg; } }

  function set(code, quiet) {
    if (!LANGS.some(function (l) { return l[0] === code; })) code = 'en';
    load(code, function () {
      cur = code;
      try { if (code === 'en') localStorage.removeItem(KEY); else localStorage.setItem(KEY, code); } catch (e) {}
      document.documentElement.setAttribute('lang', code);
      document.documentElement.setAttribute('data-lang', code);
      run([document.body]); fitSoon();
      var sel = document.getElementById('lang-pick'); if (sel && sel.value !== code) sel.value = code;
      if (!quiet) { try { window.dispatchEvent(new CustomEvent('marga:lang', { detail: code })); } catch (e) {} }
    });
  }

  function picker() {
    var tools = document.querySelector('.topbar .tools');
    if (!tools || document.getElementById('lang-pick')) return;
    var wrap = document.createElement('label'); wrap.className = 'lang-pick'; wrap.setAttribute('data-no-i18n-wrap', '1');
    var lab = document.createElement('span'); lab.className = 'sr'; lab.textContent = 'Language';
    var sel = document.createElement('select'); sel.id = 'lang-pick'; sel.setAttribute('translate', 'no');
    LANGS.forEach(function (l) { var o = document.createElement('option'); o.value = l[0]; o.textContent = l[1]; o.lang = l[0]; sel.appendChild(o); });
    sel.value = cur;
    sel.addEventListener('change', function () { set(sel.value); });
    wrap.appendChild(lab); wrap.appendChild(sel);
    tools.insertBefore(wrap, tools.firstChild);
    /* queue it: a synchronous run() here would drop the pending records of a header re-render (callsign save, progress reset) and leave the page in English */
    if (cur !== 'en') schedule([lab]);
  }

  /* fold the top menu into the Menu button when it would not fit (long labels, a language picker, a narrow window) */
  var fitT = null;
  function fit() {
    var h = document.documentElement, bar = document.querySelector('.topbar'); if (!bar) return;
    h.classList.remove('nav-fold');
    var tools = bar.querySelector('.tools'), cw = h.clientWidth;
    if (bar.scrollWidth > bar.clientWidth + 1 || (tools && tools.getBoundingClientRect().right > cw + 1) || h.scrollWidth > cw + 1) h.classList.add('nav-fold');
  }
  function fitSoon() { clearTimeout(fitT); fitT = setTimeout(fit, 80); }

  function start() {
    cur = 'en';
    var want = saved();
    var tick = new MutationObserver(function () { if (document.querySelector('.topbar .tools')) { picker(); } });
    tick.observe(document.body, { childList: true, subtree: true });
    picker(); watch();
    window.addEventListener('resize', fitSoon); window.addEventListener('marga:lang', fitSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon); setTimeout(fit, 400); setTimeout(fit, 1500);
    if (want !== 'en') set(want, true);
    window.MargaLang = { set: set, get: function () { return cur; }, tr: function (s) { return cur === 'en' ? s : (tr(s) === null ? s : tr(s)); } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
}());
