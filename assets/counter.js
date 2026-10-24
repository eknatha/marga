/* MARGA visitor count (GoatCounter, free, no cookies, no login).
   - hit(path, title): records a page view. Skipped on localhost, file:// and when the browser sends Do Not Track.
   - init(code, el): shows the total number of visitors in el. Keeps the last good number so the footer
     is not blank when offline, retries a few times, and stays hidden if the counter is not set up.
   Nothing here can break the page: every call is wrapped and failures are silent. */
(function () {
'use strict';
var code = '', lastPath = '', timers = [], target = null, shown = '';
var KEY = 'ea.vc';
function local() { if (window.MARGA_FORCE_REMOTE) return false; return /^(localhost|127\..*|\[::1\]|)$/.test(location.hostname) || location.protocol === 'file:'; }
function dnt() { return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1'; }
function base() { return 'https://' + code + '.goatcounter.com/'; }
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (x) { /* ignore */ } return null; }

function hit(path, title) {
  if (!code && window.ACADEMY && window.ACADEMY.counter) code = window.ACADEMY.counter;
  if (!code || local() || dnt()) return false;
  path = path || '/';
  if (path === lastPath) return false;
  lastPath = path;
  try {
    var q = 'p=' + encodeURIComponent(path) + '&t=' + encodeURIComponent(title || document.title) +
      '&r=' + encodeURIComponent(document.referrer || '') +
      '&s=' + [screen.width || 0, screen.height || 0, window.devicePixelRatio || 1].join(',') +
      '&rnd=' + Math.random().toString(36).slice(2, 8);
    new Image().src = base() + 'count?' + q;
    return true;
  } catch (x) { return false; }
}

function parse(j) {
  if (!j) return '';
  var raw = j.count_unique !== undefined && j.count_unique !== '' ? j.count_unique : j.count;
  var n = String(raw === undefined ? '' : raw).replace(/[\s  ]/g, ' ').trim();
  return /^\d[\d ,.]*$/.test(n) ? n : '';
}
function say(text) { if (target && document.contains(target)) { target.textContent = text; target.hidden = false; } }
function paint(n) {
  if (!n) return;
  shown = n;
  say(n + (n === '1' ? ' visitor' : ' visitors'));
}
function fetchTotal(attempt) {
  if (!code || !window.fetch) return;
  fetch(base() + 'counter/TOTAL.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
    .then(function (j) {
      var n = parse(j);
      if (!n) throw new Error('unexpected response');
      store(KEY, JSON.stringify({ n: n, t: Date.now() }));
      MargaCounter.status = 'ok'; MargaCounter.error = '';
      paint(n);
    })
    .catch(function (e) {
      MargaCounter.status = 'unavailable'; MargaCounter.error = String(e && e.message || e);
      if (attempt < 3) timers.push(setTimeout(function () { fetchTotal(attempt + 1); }, [1500, 6000, 20000][attempt]));
      else { if (!shown) say('Visitor count unavailable'); if (window.console && console.info) console.info('MARGA visitor count unavailable (' + MargaCounter.error + '). In GoatCounter settings, enable "Allow adding visitor counts on your website" and check the site code.'); }
    });
}
function init(c, el) {
  code = c || '';
  target = typeof el === 'string' ? document.querySelector(el) : el;
  if (!code) return;
  say('Counting visitors');
  try { var cached = JSON.parse(store(KEY) || 'null'); if (cached && cached.n) paint(cached.n); } catch (x) { /* ignore */ }
  // give a first-visit page view a moment to be recorded, then read the total
  timers.push(setTimeout(function () { fetchTotal(0); }, local() ? 0 : 1200));
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    try { var c2 = JSON.parse(store(KEY) || 'null'); if (!c2 || Date.now() - c2.t > 300000) fetchTotal(2); } catch (x) { /* ignore */ }
  });
}
function rebind(el) { target = typeof el === 'string' ? document.querySelector(el) : el; if (shown) paint(shown); }

var MargaCounter = window.MargaCounter = { hit: hit, init: init, rebind: rebind, parse: parse, status: 'idle', error: '' };
})();
