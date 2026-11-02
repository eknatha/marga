/* MARGA incident replays: a video-style, step-by-step replay of each post-mortem, with no video.
   The steps come from the post-mortem page itself (its Timeline, Root cause and "What ... changed" sections),
   so every architecture study gets a replay and the two can never disagree. Play, pause, step, scrub, and a
   "what would you do now" pause in the middle. Nothing autoplays; motion is off under reduced-motion settings. */
window.MargaReplay = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, view = A.view, ARCH = A.D.arch || [];
var BY = {}; ARCH.forEach(function (a) { BY[a.id] = a; });
var CACHE = {};

function stepsOf(a) {
  if (CACHE[a.id]) return CACHE[a.id];
  var doc = new DOMParser().parseFromString('<div>' + a.html + '</div>', 'text/html'), root = doc.body.firstChild, out = [], kids = Array.prototype.slice.call(root.children);
  function section(re) {
    var i = kids.findIndex(function (k) { return k.tagName === 'H2' && re.test(k.textContent); }); if (i < 0) return [];
    var items = [], j;
    for (j = i + 1; j < kids.length && kids[j].tagName !== 'H2'; j++) {
      if (kids[j].tagName === 'UL' || kids[j].tagName === 'OL') Array.prototype.forEach.call(kids[j].children, function (li) { items.push(li.textContent.trim()); });
      else if (kids[j].tagName === 'P') items.push(kids[j].textContent.trim());
    }
    return items.filter(Boolean);
  }
  section(/^timeline/i).forEach(function (t) { out.push({ kind: 'What happened', text: t }); });
  var rc = section(/^root cause/i); if (rc.length) out.push({ kind: 'Why it happened', text: rc.join(' ') });
  var ch = kids.findIndex(function (k) { return k.tagName === 'H2' && /changed|fix|prevent/i.test(k.textContent); });
  if (ch >= 0) { var j; for (j = ch + 1; j < kids.length && kids[j].tagName !== 'H2'; j++) if (kids[j].tagName === 'UL') Array.prototype.forEach.call(kids[j].children, function (li) { out.push({ kind: 'What changed', text: li.textContent.trim() }); }); }
  CACHE[a.id] = out; return out;
}

function indexView() {
  view.title = 'Incident replays | MARGA by EknathaLabs'; view.nav = 'practice';
  var list = ARCH.filter(function (a) { return stepsOf(a).length >= 3; });
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Incident replays</h1><p class="lede">Step through a real outage the way it unfolded: what happened, what people saw, why it happened and what changed. Pause in the middle and decide what you would do. ' + list.length + ' replays, no video, nothing to download.</p></section>' +
    '<div class="wrap narrow"><ul class="ex-list">' + list.map(function (a) { return '<li><a href="#/replay/' + e(a.id) + '"><strong>' + e(a.title) + '</strong><span>' + e(a.company) + ' | ' + stepsOf(a).length + ' steps</span></a></li>'; }).join('') + '</ul></div>';
}

function replayView(id) {
  var a = BY[id];
  if (!a) { view.title = 'Replay not found | MARGA'; view.nav = 'practice'; view.html = '<section class="page-head wrap"><h1>That replay does not exist</h1><p class="lede"><a href="#/replay">See all replays</a>.</p></section>'; return; }
  var steps = stepsOf(a), mid = Math.max(1, Math.floor(steps.length / 2));
  view.title = 'Replay: ' + a.title + ' | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/replay">Replays</a></nav><h1>' + e(a.title) + '</h1><p class="lede">' + e(a.summary) + '</p></section>' +
    '<div class="wrap narrow"><section class="rp" id="rp" aria-label="Replay"><div class="rp-top"><span class="rp-n" id="rp-n"></span><div class="rp-bar" aria-hidden="true"><i id="rp-fill"></i></div></div>' +
    '<div class="rp-card" id="rp-card" aria-live="polite"></div>' +
    '<div class="rp-ctl actions"><button type="button" class="btn btn-quiet" id="rp-prev">Back</button><button type="button" class="btn btn-primary" id="rp-play" aria-pressed="false">Play</button><button type="button" class="btn btn-quiet" id="rp-next">Next</button><button type="button" class="btn btn-quiet" id="rp-restart">Restart</button></div>' +
    '<label class="field rp-scrub"><span>Step</span><input type="range" id="rp-range" min="1" max="' + steps.length + '" value="1"></label>' +
    '<div id="rp-ask"></div></section>' +
    '<h2 class="sub-h">All steps</h2><ol class="rp-list" id="rp-list">' + steps.map(function (s, i) { return '<li data-i="' + i + '"><button type="button" class="rp-jump" data-i="' + i + '"><span class="rp-k">' + e(s.kind) + '</span> ' + e(s.text.length > 110 ? s.text.slice(0, 107) + '...' : s.text) + '</button></li>'; }).join('') + '</ol>' +
    '<p class="actions"><a class="btn btn-quiet" href="#/architecture/' + e(a.id) + '">Read the full post-mortem</a></p></div>';
  view.after = function () {
    var i = 0, timer = null, asked = {};
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function stop() { if (timer) { clearInterval(timer); timer = null; } var b = $('#rp-play'); if (b) { b.textContent = 'Play'; b.setAttribute('aria-pressed', 'false'); } }
    function paint() {
      var s = steps[i];
      $('#rp-n').textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
      $('#rp-fill').style.width = ((i + 1) / steps.length * 100) + '%';
      $('#rp-card').innerHTML = '<p class="rp-kind">' + e(s.kind) + '</p><p class="rp-text">' + e(s.text) + '</p>';
      $('#rp-range').value = i + 1;
      $('#rp-prev').disabled = i === 0; $('#rp-next').disabled = i === steps.length - 1;
      $$('#rp-list li').forEach(function (li, k) { li.classList.toggle('cur', k === i); li.classList.toggle('seen', k < i); });
      var ask = $('#rp-ask');
      if (i === mid && s.kind === 'What happened' && !asked[mid]) {
        stop();
        ask.innerHTML = '<div class="note-panel"><h3>Pause and think</h3><p>You are on call at this point. What is the first thing you would check, and what would you not touch yet? Say it out loud or write it down, then reveal what the post-mortem did.</p><p class="actions"><button type="button" class="btn btn-quiet" id="rp-reveal">I have my answer</button></p></div>';
        $('#rp-reveal').addEventListener('click', function () { asked[mid] = 1; ask.innerHTML = '<p class="small">Compare your answer with the next steps. The best first moves are usually to stop making it worse, read the signals before acting, and tell the people affected.</p>'; });
      } else if (i !== mid) { ask.innerHTML = ''; }
    }
    function go(n) { i = Math.max(0, Math.min(steps.length - 1, n)); paint(); }
    $('#rp-prev').addEventListener('click', function () { stop(); go(i - 1); });
    $('#rp-next').addEventListener('click', function () { stop(); go(i + 1); });
    $('#rp-restart').addEventListener('click', function () { stop(); asked = {}; go(0); });
    $('#rp-range').addEventListener('input', function () { stop(); go(+this.value - 1); });
    $('#rp-list').addEventListener('click', function (ev) { var b = ev.target.closest('.rp-jump'); if (b) { stop(); go(+b.getAttribute('data-i')); $('#rp').scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); } });
    $('#rp').addEventListener('keydown', function (ev) { if (ev.target.tagName === 'INPUT') return; if (ev.key === 'ArrowRight') { stop(); go(i + 1); } else if (ev.key === 'ArrowLeft') { stop(); go(i - 1); } });
    $('#rp-play').addEventListener('click', function () {
      if (timer) { stop(); return; }
      if (i >= steps.length - 1) go(0);
      this.textContent = 'Pause'; this.setAttribute('aria-pressed', 'true');
      timer = setInterval(function () { if (i >= steps.length - 1) { stop(); return; } go(i + 1); if (i === mid && !asked[mid]) stop(); }, 6000);
    });
    paint();
  };
  view.cleanup = null;
}

/* add a "Replay this incident" button to each post-mortem page */
A.afterRoute(function (h) {
  var m = (h || '').match(/^\/architecture\/([\w-]+)$/); if (!m || !BY[m[1]] || stepsOf(BY[m[1]]).length < 3) return;
  var hd = $('#main h1'); if (!hd || $('#rp-link')) return;
  hd.insertAdjacentHTML('afterend', '<p class="actions"><a class="btn btn-primary" id="rp-link" href="#/replay/' + e(m[1]) + '">Replay this incident step by step</a></p>');
});
A.addRoute(/^\/replay$/, indexView);
A.addRoute(/^\/replay\/([\w-]+)$/, replayView);
window.MargaReplayInfo = { count: function () { return ARCH.filter(function (a) { return stepsOf(a).length >= 3; }).length; } };
};
