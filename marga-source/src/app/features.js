/* MARGA features: explain-it-like levels, reading mode, predict-then-reveal, clickable diagrams and the daily challenge bonus tasks. */
(function () {
'use strict';
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (x) { /* ignore */ } return null; }

var LV = [['new', 'I am new to this'], ['pro', 'A practitioner'], ['int', 'In an interview']];
function level() { var v = store('ea.level'); return v === 'new' || v === 'int' ? v : 'pro'; }
function levelBody(l, v) {
  if (v === 'new') return '<p><strong>In plain words.</strong> ' + esc(l.lv.s) + '</p><p class="small">The full lesson below goes step by step.</p>';
  if (v === 'int') return '<p><strong>A strong short answer.</strong> ' + esc(l.lv.i) + '</p><p class="small">Practise saying it aloud, then try the <a href="#/interview">InterviewHub</a> questions for this stage.</p>';
  return '<p>The full lesson below is written for people who will run this in production. Use the other two views for a quick analogy or an interview-ready summary.</p>';
}
function levelsHtml(l) {
  if (!l || !l.lv) return '';
  var v = level();
  return '<section class="levels" aria-labelledby="lv-h" data-lesson="' + esc(l.id) + '"><h2 id="lv-h" class="levels-h">Explain it to me like...</h2>' +
    '<div class="seg" role="group" aria-label="Explanation level">' + LV.map(function (x) { return '<button type="button" class="seg-b" data-act="lv-set" data-lv="' + x[0] + '" aria-pressed="' + (x[0] === v) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<div class="levels-body" id="lv-body" aria-live="polite">' + levelBody(l, v) + '</div></section>';
}
window.MargaFeatures = function (A) {
  var D = A.D, $ = A.$, $$ = A.$$, e = A.e, view = A.view;
  window.MargaFeatures.levelsHtml = levelsHtml;

  A.onAct('lv-set', function (b) {
    var v = b.getAttribute('data-lv'), sec = b.closest('.levels'), l = A.LES[sec.getAttribute('data-lesson')];
    if (!l || !l.lv) return;
    store('ea.level', v);
    $$('.seg-b', sec).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $('#lv-body', sec).innerHTML = levelBody(l, v);
  });

  function readOn() { return document.documentElement.getAttribute('data-a-read') === 'on'; }
  function syncRead() { $$('[data-act=read-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', String(readOn())); b.textContent = readOn() ? 'Leave reading mode' : 'Reading mode'; }); if (window.MargaA11y) MargaA11y.sync(); bar(); }
  A.onAct('read-toggle', function () { if (!window.MargaA11y) return; MargaA11y.set('read', readOn() ? 'off' : 'on'); syncRead(); A.toast(readOn() ? 'Reading mode is on. Change it in the Aa panel.' : 'Reading mode is off.'); });
  function bar() {
    var b = $('#read-bar');
    if (!readOn()) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'read-bar'; b.setAttribute('aria-hidden', 'true'); b.innerHTML = '<i></i>'; document.body.appendChild(b); }
    upd();
  }
  function upd() { var b = $('#read-bar i'); if (!b) return; var h = document.documentElement, max = h.scrollHeight - h.clientHeight; b.style.width = (max > 0 ? Math.min(100, Math.round(h.scrollTop / max * 100)) : 0) + '%'; }
  window.addEventListener('scroll', upd, { passive: true });
  document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'a11y-read') setTimeout(syncRead, 0); });

  A.onAct('predict-reveal', function (b) {
    var box = b.closest('.predict'), out = $('.predict-out', box), open = out.hidden;
    out.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Hide the answer' : 'Reveal the answer';
  });

  A.onAct('dg-pick', function (b) {
    var fig = b.closest('.dg'), id = b.getAttribute('data-id'), item = null;
    $$('.dg-node', fig).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $$('.dg-item', fig).forEach(function (x) { var on = x.getAttribute('data-id') === id; x.classList.toggle('on', on); if (on) item = x; });
    if (!item) return;
    $('.dg-live', fig).innerHTML = '<p><strong>' + e($('dt', item).textContent) + '</strong></p>' + $$('dd', item).map(function (d) { return '<p>' + d.innerHTML + '</p>'; }).join('');
  });

  /* daily challenge bonus tasks: a drill and a predict item, the same for everyone on the same date */
  function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function drillBonus(d) {
    var opts = A.shuffle(d.options.slice());
    return '<article class="drill" id="drill-' + e(d.id) + '" data-id="' + e(d.id) + '"><h3>' + e(d.title) + '</h3><p>' + e(d.story) + '</p>' +
      '<pre class="evidence" tabindex="0" aria-label="Evidence"><code>' + e(d.evidence) + '</code></pre>' +
      '<fieldset class="drill-q"><legend>' + e(d.q) + '</legend>' + opts.map(function (o) { return '<label class="opt-r"><input type="radio" name="dq-' + e(d.id) + '" value="' + (o.ok ? '1' : '0') + '"> <span>' + e(o.t) + '</span></label>'; }).join('') + '</fieldset>' +
      '<div class="actions"><button type="button" class="btn btn-primary" data-act="drill-check">Check answer</button></div><div class="drill-res" role="status" aria-live="polite" hidden></div></article>';
  }
  function predictBonus(p) {
    return '<div class="predict"><p class="predict-q"><strong>Predict first.</strong> ' + e(p.q) + '</p>' + (p.shown ? '<pre class="predict-code" tabindex="0"><code>' + e(p.shown) + '</code></pre>' : '') +
      '<label class="predict-l">Your guess<textarea rows="2" class="predict-guess" placeholder="Type what you expect, then reveal the answer."></textarea></label>' +
      '<button type="button" class="btn btn-primary" data-act="predict-reveal" aria-expanded="false">Reveal the answer</button>' +
      '<div class="predict-out" hidden><p class="predict-ans"><strong>Answer:</strong> ' + e(p.out) + '</p>' + (p.why ? '<p>' + e(p.why) + '</p>' : '') + '<p class="small">From the lesson <a href="' + A.hrefLesson(p.lesson) + '">' + e((A.LES[p.lesson] || {}).title || '') + '</a>.</p></div></div>';
  }
  A.afterRoute(function () {
    syncRead();
    if (!/^#\/daily\/?$/.test(location.hash) || $('#daily-bonus')) return;
    var card = $('#daily-card'); if (!card) return;
    var key = todayKey(), drills = D.drills || [], preds = D.predicts || [], html = '';
    if (drills.length) html += '<h2 class="sub-h">Bonus: drill of the day</h2>' + drillBonus(drills[hashKey(key + 'drill') % drills.length]);
    if (preds.length) html += '<h2 class="sub-h">Bonus: predict it</h2>' + predictBonus(preds[hashKey(key + 'predict') % preds.length]);
    var d = document.createElement('div'); d.id = 'daily-bonus'; d.innerHTML = html; card.parentNode.insertBefore(d, card.nextSibling);
  });
};
})();
