/* MARGA first-visit welcome: a "choose your path" moment, then a short spotlight tour of the home page.
   Also the ambient focus mode for lessons. Everything is kept in this browser (ea.tour, ea.focus). Nothing is sent anywhere. */
window.MargaTour = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, D = A.D, KEY = 'ea.tour', FKEY = 'ea.focus';
function get(k) { try { return localStorage.getItem(k); } catch (x) { return null; } }
function put(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (x) { /* ignore */ } }
function calm() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches || /^(off|reduce)$/.test(document.documentElement.getAttribute('data-a-motion') || ''); } catch (x) { return false; } }
function vis(sel) { var l = $$(sel); for (var i = 0; i < l.length; i++) if (l[i].getClientRects().length) return l[i]; return null; }
var root = null, step = 0, steps = [], lastFocus = null, picked = false;

function pathCards() {
  return A.LIVE.map(function (p) {
    var n = p.modules.length, ls = 0; p.modules.forEach(function (id) { if (A.MOD[id]) ls += A.MOD[id].lessons.length; });
    return '<button type="button" class="tr-path" data-tr="pick" data-id="' + e(p.id) + '"><span class="tr-glyph" aria-hidden="true">' + e(p.title.charAt(0)) + '</span><strong>' + e(p.title) + '</strong><span>' + e((p.summary || '').split(/[:.]/)[0] || (n + ' skills')) + '</span><em>' + n + ' skills, ' + ls + ' lessons</em></button>';
  }).join('');
}
function build() {
  var next = (function () { var p = A.PATH[A.state().path] || A.LIVE[0]; return p; })();
  steps = [
    { kind: 'pick', h: 'Welcome to MARGA', t: 'Free, offline, no sign-up. Pick the path closest to your job and we will start there. You can change it any time.' },
    { sel: '.roles', h: 'Your role decides the order', t: 'The home page shows the skills for your role first. Switch here whenever your goal changes.' },
    { sel: '#term', h: 'See it before you start', t: 'These short demos show what practice looks like: terminal labs, a real Linux system in your browser, incident games and animated explainers.' },
    { sel: '.pipe-head', h: 'A skill tree that unlocks', t: 'Switch roles here. Each box below is a skill: pass its lesson checks to master it and open the skills that depend on it. Select a skill to see what it needs.' },
    { sel: '.search-btn', h: 'Find anything in a moment', t: 'Press / or Ctrl K to search lessons, labs, cheat sheets and interview answers. It works offline.' },
    { sel: '#topnav a[data-nav="practice"], .menu-btn', h: 'Practice is where it sticks', t: 'Terminal labs, Broken servers and incident games live under Practice. Studio, in the Elsewhere menu, has the mastery map, architecture gallery, cluster visualiser and terminal replays. On a small screen, open the menu.' },
    { kind: 'end', h: 'You are set', t: 'Your progress stays in this browser on this device. Export it from the Progress page if you want to move it.' }
  ];
}
var scrollT = 0;
function onScroll() { if (!root) return; root.classList.add('tr-scrolling'); clearTimeout(scrollT); scrollT = setTimeout(function () { if (root) root.classList.remove('tr-scrolling'); }, 140); place(); }
function place() {
  if (!root) return;
  var s = steps[step], spot = $('.tr-spot', root), card = $('.tr-card', root);
  var tg = s.sel ? vis(s.sel) : null;
  if (!tg || !tg.getClientRects().length) { root.classList.add('tr-center'); spot.style.cssText = 'left:50%;top:50%;width:0;height:0'; card.style.cssText = ''; return; }
  root.classList.remove('tr-center');
  var r = tg.getBoundingClientRect(), pad = 8, vw = innerWidth, vh = innerHeight;
  spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px'; spot.style.width = (r.width + 2 * pad) + 'px'; spot.style.height = (r.height + 2 * pad) + 'px';
  var cw = Math.min(380, vw - 24), left = Math.max(12, Math.min(vw - cw - 12, r.left + r.width / 2 - cw / 2));
  card.style.width = cw + 'px'; card.style.left = left + 'px';
  var below = vh - r.bottom, above = r.top, ch = card.offsetHeight || 190;
  if (below >= ch + 24 || below >= above) { card.style.top = Math.min(vh - ch - 12, r.bottom + pad + 12) + 'px'; card.style.bottom = 'auto'; }
  else { card.style.top = Math.max(12, r.top - pad - 12 - ch) + 'px'; card.style.bottom = 'auto'; }
}
function show(n) {
  step = Math.max(0, Math.min(steps.length - 1, n));
  var s = steps[step];
  if (s.sel) { var tg = vis(s.sel); if (!tg) { return show(step + (root._dir === -1 ? -1 : 1)); } var far = Math.abs(tg.getBoundingClientRect().top) > innerHeight * 1.1; tg.scrollIntoView({ block: 'center', behavior: (calm() || far) ? 'auto' : 'smooth' }); }
  var card = $('.tr-card', root), last = step === steps.length - 1;
  var body = s.kind === 'pick' ? '<div class="tr-paths" role="group" aria-label="Choose your path">' + pathCards() + '</div>' : '';
  var np = A.PATH[A.state().path] || A.LIVE[0], first = null;
  if (s.kind === 'end') { try { first = (function () { var ids = np.modules; for (var i = 0; i < ids.length; i++) { var m = A.MOD[ids[i]]; if (m && m.lessons.length) return m.lessons[0]; } })(); } catch (x) { first = null; } }
  card.innerHTML = '<p class="tr-count" aria-hidden="true">' + (s.kind === 'pick' ? 'Step 1 of ' + steps.length : 'Step ' + (step + 1) + ' of ' + steps.length) + '</p>' +
    '<h2 id="tr-h" tabindex="-1">' + e(s.h) + '</h2><p>' + e(s.t) + '</p>' + body +
    '<div class="tr-dots" aria-hidden="true">' + steps.map(function (x, i) { return '<i class="' + (i === step ? 'on' : i < step ? 'past' : '') + '"></i>'; }).join('') + '</div>' +
    '<div class="tr-actions">' +
    (step > 0 ? '<button type="button" class="btn btn-quiet" data-tr="back">Back</button>' : '') +
    (s.kind === 'pick' ? '<button type="button" class="btn btn-quiet" data-tr="skip">Explore on my own</button>' + '<button type="button" class="btn btn-primary" data-tr="next"' + (picked ? '' : ' hidden') + '>Show me around</button>' :
     last ? '<button type="button" class="btn btn-quiet" data-tr="done">Explore on my own</button>' + (first ? '<a class="btn btn-primary" data-tr="go" href="#/lesson/' + e(first) + '">Start the first lesson</a>' : '<button type="button" class="btn btn-primary" data-tr="done">Finish</button>') :
     '<button type="button" class="btn btn-quiet" data-tr="skip">Skip tour</button><button type="button" class="btn btn-primary" data-tr="next">Next</button>') +
    '</div>';
  root.setAttribute('data-step', String(step));
  setTimeout(place, calm() ? 0 : 260); place();
  var f = $('#tr-h', card); if (f) f.focus({ preventScroll: true });
}
function close(done) {
  if (!root) return; put(KEY, '1'); root.classList.add('tr-out');
  var r = root; root = null; document.removeEventListener('keydown', onKey, true); removeEventListener('resize', place); removeEventListener('scroll', onScroll, true);
  setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, calm() ? 0 : 200);
  if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  if (done && A.toast) A.toast('You can retake the tour from the footer any time.');
}
function onKey(ev) {
  if (!root) return;
  if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(true); return; }
  var s = steps[step];
  if (ev.key === 'ArrowRight' && s.kind !== 'pick') { ev.preventDefault(); root._dir = 1; if (step < steps.length - 1) show(step + 1); }
  if (ev.key === 'ArrowLeft' && step > 0) { ev.preventDefault(); root._dir = -1; show(step - 1); }
  if (ev.key === 'Tab') { var f = $$('button:not([hidden]), a[href]', root).filter(function (b) { return b.offsetParent !== null; }); if (!f.length) return; var i = f.indexOf(document.activeElement); if (ev.shiftKey && i <= 0) { ev.preventDefault(); f[f.length - 1].focus(); } else if (!ev.shiftKey && (i === f.length - 1)) { ev.preventDefault(); f[0].focus(); } }
}
function start(force) {
  if (root) return; if (!force && get(KEY)) return;
  if (!$('.roles')) { location.hash = '#/'; setTimeout(function () { start(true); }, 400); return; }
  picked = false; lastFocus = document.activeElement; build();
  root = document.createElement('div'); root.id = 'tour'; root.className = 'tr' + (calm() ? ' tr-calm' : '');
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'tr-h');
  root.innerHTML = '<div class="tr-spot" aria-hidden="true"></div><div class="tr-card"></div>';
  document.body.appendChild(root); root._dir = 1; show(0);
  document.addEventListener('keydown', onKey, true); addEventListener('resize', place); addEventListener('scroll', onScroll, true);
}
document.addEventListener('click', function (ev) {
  var b = ev.target.closest && ev.target.closest('[data-tr]'); if (!b || !root || !root.contains(b)) return;
  var a = b.getAttribute('data-tr');
  if (a === 'pick') {
    A.state().path = b.getAttribute('data-id'); A.save(); picked = true;
    $$('.tr-path', root).forEach(function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    var nx = $('[data-tr="next"]', root); if (nx) { nx.hidden = false; nx.focus(); }
    var rl = $('.roles'); if (rl && A.route) { /* refresh the home view so the chosen role shows behind the tour */ var keep = root; A.route(); if (!document.body.contains(keep)) document.body.appendChild(keep); }
  } else if (a === 'next') { root._dir = 1; show(step + 1); }
  else if (a === 'back') { root._dir = -1; show(step - 1); }
  else if (a === 'skip') close(true);
  else if (a === 'done') close(true);
  else if (a === 'go') close(false);
});
A.onAct('tour', function () { put(KEY, null); start(true); });
A.addRoute(/^\/tour$/, function () { A.view.title = 'Tour | MARGA'; A.view.nav = ''; A.view.html = '<section class="page-head wrap"><h1>Starting the tour</h1></section>'; setTimeout(function () { location.hash = '#/'; setTimeout(function () { put(KEY, null); start(true); }, 350); }, 0); });
var waiting = 0;
function waitStart(n) {
  clearTimeout(waiting);
  waiting = setTimeout(function () {
    if (root || get(KEY) || (location.hash !== '' && location.hash !== '#/' && location.hash !== '#')) return;
    if ($('#me-dlg') && n < 100) { waitStart(n + 1); return; }
    start(false);
  }, n ? 700 : 900);
}
A.afterRoute(function (h) {
  if (h === '/' && !get(KEY) && !/[?&](embed|workshop)=/.test(location.search) && !document.documentElement.hasAttribute('data-embed')) waitStart(0);
});

/* ---------------- ambient focus mode ---------------- */
var bar = null;
function inLesson() { return /^#\/lesson\//.test(location.hash); }
function setFocus(on) {
  var h = document.documentElement; h.classList.toggle('focus-mode', !!(on && inLesson()));
  var b = $('[data-act="focus"]'); if (b) { b.setAttribute('aria-pressed', String(!!on)); b.textContent = on ? 'Leave focus mode' : 'Focus mode'; }
  if (on && inLesson()) mountBar(); else if (bar) { bar.hidden = true; }
}
function mountBar() {
  if (!bar) {
    bar = document.createElement('div'); bar.id = 'focus-bar'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>'; document.body.appendChild(bar);
    var pill = document.createElement('button'); pill.type = 'button'; pill.id = 'focus-exit'; pill.className = 'btn btn-quiet'; pill.setAttribute('data-act', 'focus'); pill.textContent = 'Leave focus mode (Esc)'; document.body.appendChild(pill);
    addEventListener('scroll', function () { var d = document.documentElement, mx = d.scrollHeight - innerHeight; var f = $('i', bar); if (f) f.style.transform = 'scaleX(' + (mx > 0 ? Math.min(1, scrollY / mx) : 0) + ')'; }, { passive: true });
  }
  bar.hidden = false;
}
A.onAct('focus', function () { var on = get(FKEY) !== '1'; put(FKEY, on ? '1' : null); setFocus(on); });
A.afterRoute(function () {
  if (inLesson()) {
    var host = $('.lesson-tools');
    if (host && !$('[data-act="focus"]', host)) host.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn-quiet" data-act="focus" aria-pressed="false">Focus mode</button>');
    setFocus(get(FKEY) === '1');
  } else { document.documentElement.classList.remove('focus-mode'); if (bar) bar.hidden = true; }
});
document.addEventListener('keydown', function (ev) {
  var tag = (document.activeElement && document.activeElement.tagName) || '';
  if (/INPUT|TEXTAREA|SELECT/.test(tag) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === 'Escape' && document.documentElement.classList.contains('focus-mode') && !root && !$('#smodal')) { put(FKEY, null); setFocus(false); }
  if ((ev.key === 'f' || ev.key === 'F') && inLesson() && !root) { var on = get(FKEY) !== '1'; put(FKEY, on ? '1' : null); setFocus(on); }
});
};
