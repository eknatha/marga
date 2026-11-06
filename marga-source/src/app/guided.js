/* MARGA guided lessons: a short, video-style walkthrough of any lesson, with no video.
   The scenes are built from the lesson itself (each section's opening text, its commands and output, a table or a list, and any callout),
   so every lesson has one and it can never disagree with the written page. Commands type out, output appears line by line, the caption says
   what is happening, and you can pause, step, scrub, change the speed, or have it read aloud with the voice on your own device.
   Nothing autoplays. Motion is off when the visitor prefers reduced motion. */
window.MargaGuided = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, view = A.view;
var CACHE = {};

function clean(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
function shorten(t, n) {
  t = clean(t); if (t.length <= n) return t;
  var cut = t.slice(0, n), i = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (i > n * 0.45) return cut.slice(0, i + 1);
  i = cut.lastIndexOf(' '); return cut.slice(0, i > 0 ? i : n) + '...';
}
function consoleLines(div) {
  var out = [];
  $$('.ln', div).forEach(function (ln) {
    var cmd = ln.classList.contains('cmd'), ps = ln.querySelector('.ps'), plain = ln.textContent;
    if (cmd && ps) plain = plain.slice(ps.textContent.length);
    var html = ln.innerHTML; if (cmd && ps) html = html.replace(/^<span class="ps"[^>]*>[^<]*<\/span>/, '');
    out.push({ cmd: cmd, text: plain, html: html });
  });
  return out;
}
function plainLines(div) { var c = div.querySelector('code'); return (c ? c.textContent : div.textContent).replace(/\n$/, '').split('\n').map(function (t) { return { cmd: false, text: t, html: e(t) }; }); }

function scenesOf(l) {
  if (CACHE[l.id]) return CACHE[l.id];
  var doc = new DOMParser().parseFromString('<div id="r">' + l.html + '</div>', 'text/html'), kids = Array.prototype.slice.call(doc.getElementById('r').children);
  var scenes = [], cur = null;
  function fresh(title, cont) { return { title: title, cont: !!cont, say: [], screen: null, note: null }; }
  function flush() { if (cur && (cur.say.length || cur.screen)) scenes.push(cur); }
  cur = fresh(l.title);
  kids.forEach(function (k) {
    var tag = k.tagName, cls = k.className || '';
    if (tag === 'H2') { flush(); cur = fresh(clean(k.textContent)); return; }
    if (tag === 'P') {
      var t = clean(k.textContent); if (!t) return;
      if (cur.say.length >= 2) { var ti = cur.title; flush(); cur = fresh(ti, true); }
      cur.say.push(t); return;
    }
    var screen = null;
    if (tag === 'DIV' && /\bcode\b/.test(cls) && /\bconsole\b/.test(cls)) { var cl = consoleLines(k); if (cl.length) screen = { kind: 'console', lines: cl.slice(0, 16), more: cl.length > 16 }; }
    else if (tag === 'DIV' && /\bcode\b/.test(cls)) { var pl = plainLines(k); screen = { kind: 'code', lang: k.getAttribute('data-lang') || '', lines: pl.slice(0, 18), more: pl.length > 18 }; }
    else if (tag === 'DIV' && /table-wrap/.test(cls)) {
      var rows = $$('tr', k).slice(0, 8).map(function (tr) { return $$('th,td', tr).map(function (c) { return clean(c.textContent); }); });
      if (rows.length > 1) screen = { kind: 'table', rows: rows };
    }
    else if (tag === 'UL' || tag === 'OL') { var items = $$(':scope > li', k).slice(0, 7).map(function (li) { return clean(li.textContent); }); if (items.length) screen = { kind: 'list', ordered: tag === 'OL', items: items }; }
    if (screen) { if (cur.screen) { var ti2 = cur.title; flush(); cur = fresh(ti2, true); } cur.screen = screen; return; }
    if (tag === 'ASIDE' && /callout/.test(cls)) {
      var ttl = k.querySelector('.callout-title'), body = clean(k.textContent).replace(ttl ? clean(ttl.textContent) : '', '').trim();
      var note = { kind: (/callout-([\w-]+)/.exec(cls) || [])[1] || 'note', title: ttl ? clean(ttl.textContent) : 'Note', text: shorten(body, 260) };
      if (cur.note) { var ti3 = cur.title; flush(); cur = fresh(ti3, true); }
      cur.note = note;
    }
  });
  flush();
  /* keep it short: at most 16 scenes, always keeping the first and the last */
  if (scenes.length > 16) { var keep = []; for (var i = 0; i < 16; i++) keep.push(scenes[Math.round(i * (scenes.length - 1) / 15)]); scenes = keep.filter(function (s, i2, arr) { return arr.indexOf(s) === i2; }); }
  scenes.forEach(function (s) {
    s.sayText = s.say.map(function (t) { return shorten(t, 300); }).join(' ');
    if (!s.sayText) s.sayText = s.screen ? ({ console: 'Watch the commands run and read what each one prints.', code: 'Read through this example, line by line.', table: 'Compare the rows in this table.', list: 'These are the points to keep.' }[s.screen.kind] || '') : '';
    if (!s.sayText && s.note) s.sayText = s.note.title + '. ' + s.note.text;
    var words = s.sayText.split(' ').length, lines = s.screen && s.screen.lines ? s.screen.lines.length : (s.screen ? 4 : 0);
    s.secs = Math.max(5, Math.round(words / 2.6 + lines * 0.45 + (s.note ? 3 : 0)));
  });
  CACHE[l.id] = scenes; return scenes;
}
function total(scenes) { return scenes.reduce(function (n, s) { return n + s.secs; }, 0); }
function mins(sec) { var m = Math.max(1, Math.round(sec / 60)); return m + (m === 1 ? ' minute' : ' minutes'); }

function bag() { var S = A.state(); if (!S.gd || typeof S.gd !== 'object' || Array.isArray(S.gd)) S.gd = {}; return S.gd; }

/* ---------------------------------------------------------------- one guided lesson */
function screenHtml(s) {
  if (!s) return '<div class="gd-blank" aria-hidden="true"></div>';
  if (s.kind === 'console' || s.kind === 'code') {
    return '<div class="gd-term"><div class="gd-bar" aria-hidden="true"><i></i><i></i><i></i><span>' + (s.kind === 'console' ? 'terminal' : e(s.lang || 'file')) + '</span></div><pre class="gd-lines" tabindex="0" aria-label="' + (s.kind === 'console' ? 'Terminal output' : 'Code') + '">' +
      s.lines.map(function (ln, i) { return '<span class="gd-ln' + (ln.cmd ? ' gd-cmd' : '') + '" data-i="' + i + '">' + (ln.cmd ? '<span class="gd-ps" aria-hidden="true">$ </span>' : '') + '<span class="gd-tx">' + ln.html + '</span></span>'; }).join('') +
      (s.more ? '<span class="gd-more">... more in the lesson</span>' : '') + '</pre></div>';
  }
  if (s.kind === 'table') return '<div class="gd-card"><table>' + s.rows.map(function (r, i) { return '<tr>' + r.map(function (c) { return '<' + (i ? 'td' : 'th') + '>' + e(c) + '</' + (i ? 'td' : 'th') + '>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
  if (s.kind === 'list') return '<div class="gd-card"><' + (s.ordered ? 'ol' : 'ul') + ' class="gd-items">' + s.items.map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</' + (s.ordered ? 'ol' : 'ul') + '></div>';
  return '';
}

function guidedView(mid, slug) {
  var id = mid + '/' + slug, l = A.LES[id];
  if (!l) { view.title = 'Guided lesson not found | MARGA'; view.nav = 'paths'; view.html = '<section class="page-head wrap"><h1>That lesson does not exist</h1><p class="lede"><a href="#/watch">See all guided lessons</a>.</p></section>'; view.after = null; return; }
  var st = A.lessonState(id);
  if (st === 'locked') { A.toast('Locked. ' + A.lockReason(id)); location.replace('#/module/' + mid); return 'redirect'; }
  view.title = 'Guided lesson: ' + l.title + ' | MARGA by EknathaLabs'; view.nav = 'paths'; view.voice = ''; view.after = null;
  var here = location.hash;
  if (!A.isLoaded || !A.isLoaded(mid)) {
    view.html = '<section class="page-head wrap"><h1>' + e(l.title) + '</h1><p class="lede" role="status">Loading the lesson.</p></section>';
    A.loadModule(mid).then(function () { if (location.hash === here) A.route(); }, function () { var n = $('#main .lede'); if (n) n.textContent = 'This lesson could not load. Check your connection and reload the page.'; });
    return;
  }
  var scenes = scenesOf(l), m = A.MOD[mid];
  if (scenes.length < 2) { view.html = '<section class="page-head wrap"><h1>' + e(l.title) + '</h1><p class="lede">This lesson is too short for a guided version. <a href="' + A.hrefLesson(id) + '">Read it instead</a>.</p></section>'; return; }
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/watch">Guided lessons</a> <a href="#/module/' + e(mid) + '">' + e(m.title) + '</a></nav><h1>' + e(l.title) + '</h1>' +
    '<p class="lede">A guided version of this lesson: ' + scenes.length + ' scenes, about ' + mins(total(scenes)) + '. No video. It is built from the lesson, so it says the same things.</p></section>' +
    '<div class="wrap narrow"><section class="gd" id="gd" aria-label="Guided lesson player">' +
    '<div class="gd-top"><span class="gd-n" id="gd-n"></span><div class="gd-prog" aria-hidden="true"><i id="gd-fill"></i></div></div>' +
    '<h2 class="gd-title" id="gd-title"></h2>' +
    '<div class="gd-stage" id="gd-stage"></div>' +
    '<div class="gd-cap" id="gd-cap"></div><div id="gd-note"></div>' +
    '<div class="gd-ctl actions"><button type="button" class="btn btn-quiet" id="gd-prev">Back</button><button type="button" class="btn btn-primary" id="gd-play" aria-pressed="false">Play</button><button type="button" class="btn btn-quiet" id="gd-next">Next</button><button type="button" class="btn btn-quiet" id="gd-restart">Restart</button>' +
    '<label class="gd-sp"><span>Speed</span><select id="gd-speed"><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></label>' +
    '<label class="gd-voice" id="gd-voicel"><input type="checkbox" id="gd-voice"> Read aloud</label></div>' +
    '<label class="field gd-scrub"><span>Scene</span><input type="range" id="gd-range" min="1" max="' + scenes.length + '" value="1"></label></section>' +
    '<h2 class="sub-h">All scenes</h2><ol class="gd-list" id="gd-list">' + scenes.map(function (s, i) { return '<li data-i="' + i + '"><button type="button" class="gd-jump" data-i="' + i + '"><span class="gd-k">' + e(s.title) + (s.cont ? ' (continued)' : '') + '</span> <span class="small">' + s.secs + ' s</span></button></li>'; }).join('') + '</ol>' +
    '<p class="actions"><a class="btn btn-quiet" href="' + A.hrefLesson(id) + '">Read the full lesson</a> <a class="btn btn-quiet" href="' + A.hrefLesson(id) + '#quiz-h">Take the lesson check</a></p></div>';
  view.after = function () { mountPlayer(id, scenes); };
}

function mountPlayer(id, scenes) {
  var i = 0, gen = 0, timer = null, playing = false, speed = 1, voice = false, done = false;
  var reduce = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.getAttribute('data-a-motion') === 'reduce';
  var synth = window.speechSynthesis && window.SpeechSynthesisUtterance ? window.speechSynthesis : null;
  if (!synth) { var vl = $('#gd-voicel'); if (vl) vl.hidden = true; }
  function later(fn, ms) { var g = gen; timer = setTimeout(function () { if (g === gen && playing) fn(); }, ms / speed); }
  function stopVoice() { if (synth) try { synth.cancel(); } catch (x) { /* ignore */ } }
  function setPlay(on) { playing = on; var b = $('#gd-play'); if (!b) return; b.textContent = on ? 'Pause' : (done ? 'Play again' : 'Play'); b.setAttribute('aria-pressed', String(on)); var cap = $('#gd-cap'); if (cap) cap.setAttribute('aria-live', on ? 'off' : 'polite'); }
  function halt() { gen++; if (timer) { clearTimeout(timer); timer = null; } stopVoice(); setPlay(false); }
  function revealAll() { $$('#gd-stage .gd-ln').forEach(function (n) { n.classList.add('on'); var tx = n.querySelector('.gd-tx'); if (tx && tx.getAttribute('data-html')) tx.innerHTML = tx.getAttribute('data-html'); }); }
  function paint(animate) {
    var s = scenes[i];
    $('#gd-n').textContent = 'Scene ' + (i + 1) + ' of ' + scenes.length;
    $('#gd-fill').style.width = ((i + 1) / scenes.length * 100) + '%';
    $('#gd-title').textContent = s.title + (s.cont ? ' (continued)' : '');
    $('#gd-stage').innerHTML = screenHtml(s.screen);
    $('#gd-cap').textContent = s.sayText;
    $('#gd-note').innerHTML = s.note ? '<aside class="callout callout-' + e(s.note.kind) + ' gd-callout"><div class="callout-title">' + e(s.note.title) + '</div><p>' + e(s.note.text) + '</p></aside>' : '';
    $('#gd-range').value = i + 1; $('#gd-prev').disabled = i === 0; $('#gd-next').textContent = i === scenes.length - 1 ? 'Finish' : 'Next';
    $$('#gd-list li').forEach(function (li, k) { li.classList.toggle('cur', k === i); li.classList.toggle('seen', k < i); });
    if (!animate || reduce || !s.screen || !s.screen.lines) revealAll(); else typeScene(s);
  }
  /* type the commands, show output one line at a time; returns when finished through the chain */
  function typeScene(s) {
    var lines = $$('#gd-stage .gd-ln'), k = 0, g = gen;
    lines.forEach(function (n) { var tx = n.querySelector('.gd-tx'); tx.setAttribute('data-html', tx.innerHTML); });
    function next() {
      if (g !== gen && !playing && false) return;
      if (k >= lines.length) return;
      var n = lines[k], ln = s.screen.lines[k], tx = n.querySelector('.gd-tx'); k++;
      n.classList.add('on');
      if (ln.cmd) { var c = 0, txt = ln.text; tx.textContent = ''; (function step() { if (!$('#gd-stage .gd-ln') || g !== gen2()) return; c += 2; tx.textContent = txt.slice(0, c); if (c < txt.length) setTimeout(step, 22 / speed); else { tx.innerHTML = tx.getAttribute('data-html'); setTimeout(next, 260 / speed); } })(); }
      else setTimeout(next, 90 / speed);
    }
    function gen2() { return g; }
    next();
  }
  function speak(s) {
    if (!(voice && synth)) return 0;
    try { if (window.MargaVoice && MargaVoice.stop) MargaVoice.stop(); synth.cancel(); var u = new SpeechSynthesisUtterance(s.sayText); u.rate = Math.min(1.6, speed); var gl = (document.documentElement.lang || 'en').split('-')[0]; var gv = window.MargaVoice && MargaVoice.voiceFor ? MargaVoice.voiceFor('en') : null; if (gv) { u.voice = gv; u.lang = gv.lang; } else u.lang = 'en'; synth.speak(u); } catch (x) { return 0; }
    return 1;
  }
  function dwell(s) { return s.secs * 1000; }
  function advance() {
    if (i >= scenes.length - 1) { finish(); return; }
    i++; paint(true); speak(scenes[i]); later(advance, dwell(scenes[i]));
  }
  function finish() { done = true; bag()[id] = { at: Date.now() }; A.save(); stopVoice(); setPlay(false); var cap = $('#gd-cap'); if (cap) cap.textContent += ' That is the end of the guided lesson. Take the lesson check to lock it in.'; }
  function go(n, animate) { halt(); done = false; i = Math.max(0, Math.min(scenes.length - 1, n)); paint(animate !== false); }
  $('#gd-prev').addEventListener('click', function () { go(i - 1); });
  $('#gd-next').addEventListener('click', function () { if (i >= scenes.length - 1) { finish(); return; } go(i + 1); });
  $('#gd-restart').addEventListener('click', function () { go(0); });
  $('#gd-range').addEventListener('input', function () { go(+this.value - 1, false); });
  $('#gd-list').addEventListener('click', function (ev) { var b = ev.target.closest('.gd-jump'); if (b) { go(+b.getAttribute('data-i')); $('#gd').scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); } });
  $('#gd-speed').addEventListener('change', function () { speed = +this.value; });
  var vc = $('#gd-voice'); if (vc) vc.addEventListener('change', function () { voice = this.checked; if (!voice) stopVoice(); else if (playing) speak(scenes[i]); });
  $('#gd-play').addEventListener('click', function () {
    if (playing) { halt(); return; }
    if (done || i >= scenes.length - 1) { done = false; i = 0; paint(true); }
    setPlay(true); speak(scenes[i]); later(advance, dwell(scenes[i]));
  });
  $('#gd').addEventListener('keydown', function (ev) {
    var t = ev.target.tagName; if (t === 'INPUT' || t === 'SELECT' || t === 'BUTTON') { if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return; if (t === 'INPUT') return; }
    if (ev.key === 'ArrowRight') { go(i + 1); ev.preventDefault(); } else if (ev.key === 'ArrowLeft') { go(i - 1); ev.preventDefault(); }
  });
  view.cleanup = halt;
  paint(false);
}

/* ---------------------------------------------------------------- index */
function indexView() {
  view.title = 'Guided lessons | MARGA by EknathaLabs'; view.nav = 'practice'; view.after = null; view.voice = '';
  var seen = bag(), n = 0;
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Guided lessons</h1><p class="lede">Every lesson has a short, video-style version: commands type out, output appears line by line, and a caption says what is happening. Pause, step back, change the speed or have it read aloud. No video to download.</p></section>' +
    '<div class="wrap narrow">' + A.MODS.map(function (m) {
      var ls = m.lessons.filter(function (x) { return A.LES[x]; }), w = ls.filter(function (x) { return seen[x]; }).length; n += ls.length;
      return '<details class="gd-mod"><summary><strong>' + e(m.title) + '</strong> <span class="small">' + ls.length + ' guided lessons' + (w ? ', ' + w + ' watched' : '') + '</span></summary><ul class="ex-list">' +
        ls.map(function (x) { var l = A.LES[x], p = x.split('/'); return '<li><a href="#/watch/' + e(p[0]) + '/' + e(p[1]) + '"><strong>' + e(l.title) + '</strong><span>' + (seen[x] ? 'Watched' : 'Not watched') + '</span></a></li>'; }).join('') + '</ul></details>';
    }).join('') + '</div>';
}

/* the button on every lesson page */
A.afterRoute(function (h) {
  var m = (h || '').match(/^\/lesson\/([\w-]+)\/([\w-]+)$/); if (!m) return;
  var hd = $('#main h1'); if (!hd || $('#gd-link')) return;
  var id = m[1] + '/' + m[2]; if (!A.LES[id]) return;
  hd.insertAdjacentHTML('afterend', '<p class="actions gd-entry"><a class="btn btn-quiet" id="gd-link" href="#/watch/' + e(m[1]) + '/' + e(m[2]) + '">Watch the guided version' + (bag()[id] ? ' (watched)' : '') + '</a></p>');
});
A.addRoute(/^\/watch$/, indexView);
A.addRoute(/^\/watch\/([\w-]+)\/([\w-]+)$/, guidedView);
window.MargaGuidedInfo = { count: function () { return A.MODS.reduce(function (n, m) { return n + m.lessons.length; }, 0); } };
};
