/* MARGA "Do it yourself": a short, auto-checked challenge at the end of a lesson.
   A command or answer is matched against accepted forms; a fix is checked against a list of rules (see challenge-core.js).
   It runs in the page, works offline and sends nothing anywhere. Lessons that also have a real Linux lab or a simulated terminal lab link to them. */
window.MargaChallenge = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, view = A.view, D = A.D, CH = D.challenges || [];
function core() { return window.MargaChallengeCore; }
function bag() { var s = A.state(); if (!s.diy || typeof s.diy !== 'object' || Array.isArray(s.diy)) s.diy = {}; return s.diy; }
function isDone(id) { return !!(bag()[id] && bag()[id].d); }
function hintsShown(id) { return (bag()[id] && bag()[id].h) || 0; }
function forLesson(l) { return CH.filter(function (c) { return c.lesson === l; }); }
function vmFor(l) { return (D.vmlabs || []).filter(function (x) { return x.lesson === l; }); }
function tlFor(l) { return (D.termlabs || []).filter(function (x) { return x.lesson === l; }); }
A.challengeUi = { item: function (c) { return item(c); }, wire: function (r) { wire(r); } };
A.challenges = { all: function () { return CH.slice(); }, done: isDone, forLesson: forLesson, count: function () { return CH.filter(function (c) { return isDone(c.id); }).length; } };

var KIND = { cmd: 'Type the command', answer: 'Type the answer', query: 'Type the query', fix: 'Edit the text' };

function item(c) {
  var many = c.kind === 'fix';
  var field = many
    ? '<label class="field"><span>' + e(c.lang && c.lang !== 'text' ? 'Edit this ' + c.lang : 'Edit this text') + '</span><textarea class="diy-ta" rows="' + Math.min(14, Math.max(5, c.starter.split('\n').length + 2)) + '" spellcheck="false" autocapitalize="off" autocomplete="off" data-in>' + e(c.starter) + '</textarea></label>'
    : '<label class="field"><span>' + e(KIND[c.kind] || 'Your answer') + '</span><input type="text" class="diy-in" spellcheck="false" autocapitalize="off" autocomplete="off" data-in></label>';
  return '<div class="diy-item" data-ch="' + e(c.id) + '"><h3>' + e(c.title) + (isDone(c.id) ? ' <span class="chip pass">Passed</span>' : '') + '</h3><p>' + e(c.prompt) + '</p>' + field +
    '<div class="actions"><button type="button" class="btn btn-primary" data-act="diy-check">Check</button><button type="button" class="btn btn-quiet" data-act="diy-hint">Show a hint</button><button type="button" class="btn btn-quiet" data-act="diy-sol">Show an answer</button>' +
    (many ? '<button type="button" class="btn btn-quiet" data-act="diy-reset">Start again</button>' : '') + '</div>' +
    '<div class="diy-out" role="status" aria-live="polite"></div><div class="diy-hints"></div><div class="diy-sol"></div></div>';
}

function wire(root) {
  function find(id) { for (var i = 0; i < CH.length; i++) if (CH[i].id === id) return CH[i]; return null; }
  function showHints(box, c) {
    var n = Math.min(hintsShown(c.id), c.hints.length), h = $('.diy-hints', box), b = $('[data-act="diy-hint"]', box);
    h.innerHTML = n ? '<ol>' + c.hints.slice(0, n).map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ol>' : '';
    b.textContent = n >= c.hints.length ? 'No more hints' : 'Show a hint (' + n + ' of ' + c.hints.length + ')'; b.disabled = n >= c.hints.length;
  }
  $$('.diy-item', root).forEach(function (box) {
    var c = find(box.getAttribute('data-ch')); if (!c) return;
    showHints(box, c);
    var input = $('[data-in]', box), out = $('.diy-out', box);
    function check() {
      var r = core().grade(c, input.value);
      if (r.ok) {
        out.innerHTML = '<p class="diy-pass"><strong>Correct.</strong> ' + (c.kind === 'fix' ? 'Every requirement is met.' : 'That works.') + '</p>';
        var bb = bag(); bb[c.id] = Object.assign(bb[c.id] || {}, { p: Date.now() }); if (!bb[c.id].d) bb[c.id].d = Date.now(); A.save();
        if (!$('.chip', $('h3', box))) { A.toast('Challenge passed: ' + c.title); var h3 = $('h3', box); if (h3 && !$('.chip', h3)) h3.insertAdjacentHTML('beforeend', ' <span class="chip pass">Passed</span>'); }
      } else out.innerHTML = '<p class="diy-fail"><strong>Not yet.</strong></p><ul>' + r.fails.map(function (f) { return '<li>' + e(f) + '</li>'; }).join('') + '</ul>';
    }
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-act]'); if (!b || !box.contains(b)) return; var act = b.getAttribute('data-act');
      if (act === 'diy-check') check();
      else if (act === 'diy-hint') { var s = bag(); s[c.id] = Object.assign(s[c.id] || {}, { h: Math.min(hintsShown(c.id) + 1, c.hints.length) }); A.save(); showHints(box, c); }
      else if (act === 'diy-sol') { $('.diy-sol', box).innerHTML = '<p class="small">One way to do it. Other correct answers exist.</p><pre class="code-block"><code>' + e(c.solution) + '</code></pre>'; b.disabled = true; }
      else if (act === 'diy-reset') { input.value = c.starter; out.innerHTML = ''; input.focus(); }
    });
    if (c.kind !== 'fix') input.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); check(); } });
  });
}

/* the card at the end of every lesson that has something to do */
A.afterRoute(function (h) {
  var m = (h || '').match(/^\/lesson\/([\w-]+)\/([\w-]+)$/); if (!m || $('#diy')) return;
  var id = m[1] + '/' + m[2]; if (!A.LES[id]) return;
  var cs = forLesson(id), vm = vmFor(id), tl = tlFor(id); if (!cs.length && !vm.length && !tl.length) return;
  var host = $('#cards') || $('#check'); if (!host) return;
  var labs = '';
  if (vm.length || tl.length) {
    labs = '<h3>Practise on a machine</h3><ul class="diy-labs">' + vm.map(function (x) { return '<li><a href="#/linux/' + e(x.id) + '">' + e(x.title) + '</a> <span class="small">real Linux in your browser, ' + x.minutes + ' min' + (A.vmLabs && A.vmLabs.done(x.id) ? ', solved' : '') + '</span></li>'; }).join('') +
      tl.map(function (x) { return '<li><a href="#/terminal-lab/' + e(x.id) + '">' + e(x.title) + '</a> <span class="small">simulated terminal, ' + x.minutes + ' min</span></li>'; }).join('') + '</ul>';
  }
  host.insertAdjacentHTML('afterend', '<section class="diy" id="diy" aria-labelledby="diy-h"><h2 id="diy-h">Do it yourself</h2>' +
    (cs.length ? '<p class="small">Short and checked by the page itself. It works offline and nothing is sent anywhere. Your progress is saved on this device.</p>' + cs.map(item).join('') : '') + labs + '</section>');
  wire($('#diy'));
});

/* index of all challenges */
function indexView() {
  view.title = 'Do-it-yourself challenges | MARGA by EknathaLabs'; view.nav = 'practice'; view.after = null; view.cleanup = null; view.voice = '';
  var by = {}; CH.forEach(function (c) { var m = c.lesson.split('/')[0]; (by[m] = by[m] || []).push(c); });
  var groups = A.MODS.filter(function (m) { return by[m.id]; }).map(function (m) {
    return '<h2 class="sub-h">' + e(m.title) + ' <span class="small">' + by[m.id].filter(function (c) { return isDone(c.id); }).length + ' of ' + by[m.id].length + ' passed</span></h2><ul class="tl-list">' +
      by[m.id].map(function (c) { var les = A.LES[c.lesson]; return '<li class="tl-item"><div><h3><a href="' + A.hrefLesson(c.lesson) + '">' + e(c.title) + '</a></h3><p class="small">' + e(KIND[c.kind] || '') + (les ? ' | In the lesson ' + e(les.title) : '') + '</p></div><span class="chip' + (isDone(c.id) ? ' pass' : '') + '">' + (isDone(c.id) ? 'Passed' : 'Not yet') + '</span></li>'; }).join('') + '</ul>';
  }).join('');
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Do-it-yourself challenges</h1><p class="lede">One short, auto-checked challenge at the end of a lesson: type a command, an answer or a query, or fix a config. ' + CH.length + ' challenges. Free, offline, no sign-up.</p>' +
    '<p class="small" id="diy-progress">' + A.challenges.count() + ' of ' + CH.length + ' passed</p></section><div class="wrap narrow">' + groups + '</div>';
}
A.addRoute(/^\/challenges$/, indexView);
};
