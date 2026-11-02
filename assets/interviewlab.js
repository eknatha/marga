/* MARGA hands-on interview rounds: a timed set of real Linux labs and challenges, with a scorecard.
   The round and the clock are kept in this browser. Hints cost points. The scorecard can be copied, printed, or turned into a short code that an interviewer pastes to read it.
   It is practice, not a proctored test, and the score is a conversation starter. Nothing is sent anywhere. */
window.MargaInterviewLab = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, view = A.view, D = A.D;

var ROUNDS = [
  { id: 'warmup', title: 'Warm-up round', mins: 20, who: 'Anyone starting out', items: 'v:cpu-hog,v:disk-full,v:bad-hosts' },
  { id: 'linux', title: 'Linux administrator round', mins: 40, who: 'Sysadmin and support roles', items: 'v:permission-denied,v:port-in-use,v:broken-symlink,v:path-and-env,c:linux-which-folder-is-eating-var' },
  { id: 'devops', title: 'DevOps engineer round', mins: 45, who: 'DevOps and release roles', items: 'v:service-wont-start,v:shell-script-bug,c:docker-run-a-web-server,c:kubernetes-scale-a-deployment,c:kubernetes-why-is-it-pending' },
  { id: 'sre', title: 'SRE troubleshooting round', mins: 45, who: 'SRE and on-call roles', items: 'v:stale-pidfile,v:deleted-open-file,v:find-error-spike,c:observability-error-ratio,c:sre-error-budget-in-minutes' },
  { id: 'platform', title: 'Platform and Kubernetes round', mins: 30, who: 'Platform engineering roles', items: 'c:kubernetes-probes-and-limits,c:kubernetes-expose-a-deployment,c:kubernetes-logs-of-the-crashed-container,c:kubernetes-can-jane-delete-pods,c:kubernetes-autoscale-a-deployment,c:terraform-rename-without-destroying' }
];
function parse(s) { return s.split(',').map(function (x) { var i = x.indexOf(':'); return { k: x.slice(0, i), id: x.slice(i + 1) }; }); }
function item(k, id) {
  if (k === 'v') { var v = A.vmLabs.find(id); return v ? { title: v.title, level: v.level, href: '#/linux/' + id, kind: 'Real Linux lab' } : null; }
  var c = (D.challenges || []).filter(function (x) { return x.id === id; })[0]; return c ? { title: c.title, level: 'Challenge', href: '#/lesson/' + c.lesson, kind: 'Challenge' } : null;
}
function round(id) { return ROUNDS.filter(function (r) { return r.id === id; })[0]; }
A.interviewRounds = ROUNDS;

function bag() { var s = A.state(); if (!s.ivl || typeof s.ivl !== 'object' || Array.isArray(s.ivl)) s.ivl = {}; if (!Array.isArray(s.ivl.hist)) s.ivl.hist = []; return s.ivl; }
function hintsOf(k, id) { var s = A.state(); return k === 'v' ? ((s.vm && s.vm.h && s.vm.h[id]) || 0) : ((s.diy && s.diy[id] && s.diy[id].h) || 0); }
function okAt(k, id) { var s = A.state(); return k === 'v' ? ((s.vm && s.vm.ok && s.vm.ok[id]) || 0) : ((s.diy && s.diy[id] && s.diy[id].p) || 0); }
function pointsFor(solved, hints) { return !solved ? 0 : hints === 0 ? 3 : hints <= 2 ? 2 : 1; }

function score(run, end) {
  var rows = run.items.map(function (x, i) {
    var t = okAt(x.k, x.id), solved = t > run.start && t <= end + 5000, hints = Math.max(0, hintsOf(x.k, x.id) - run.base[i]);
    return { k: x.k, id: x.id, solved: solved, hints: hints, secs: solved ? Math.round((t - run.start) / 1000) : 0, pts: pointsFor(solved, hints) };
  });
  return { rows: rows, pts: rows.reduce(function (n, r) { return n + r.pts; }, 0), max: rows.length * 3 };
}
function finish(run, why) {
  var b = bag(), end = Math.min(Date.now(), run.start + run.mins * 60000);
  if (why === 'manual') end = Date.now();
  var res = score(run, end); b.last = { id: run.id, title: run.title, mins: run.mins, start: run.start, end: Date.now(), name: run.name || '', rows: res.rows, pts: res.pts, max: res.max, items: run.items };
  b.hist.unshift({ id: run.id, title: run.title, t: Date.now(), pts: res.pts, max: res.max }); b.hist = b.hist.slice(0, 20);
  b.run = null; A.save(); return b.last;
}
function active() { var r = bag().run; if (!r) return null; if (Date.now() >= r.start + r.mins * 60000) { finish(r, 'time'); return null; } return r; }
function clock(ms) { var s = Math.max(0, Math.round(ms / 1000)), m = Math.floor(s / 60); return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function secs(n) { return n >= 60 ? Math.floor(n / 60) + ' min ' + (n % 60) + ' s' : n + ' s'; }
function b64(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
function copy(text, ok) {
  function fb() { var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var r = false; try { r = document.execCommand('copy'); } catch (x) { r = false; } t.remove(); ok(r); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { ok(true); }, fb); else fb();
}

/* ---------------------------------------------------------------- the bar on other pages */
var barTimer = null;
A.afterRoute(function (h) {
  if (barTimer) { clearInterval(barTimer); barTimer = null; }
  var old = $('#iv-bar'); if (old) old.remove();
  var r = active(); if (!r || /^\/interview-lab\//.test(h || '')) return;
  var main = $('#main'); if (!main) return;
  main.insertAdjacentHTML('afterbegin', '<p class="iv-bar" id="iv-bar" role="status"><strong>Interview round in progress:</strong> <span id="iv-left"></span> left. <a href="#/interview-lab/round/' + e(r.id) + '">Back to the round</a></p>');
  function tick() { var rr = bag().run, n = $('#iv-left'); if (!rr || !n) { clearInterval(barTimer); barTimer = null; return; } var left = rr.start + rr.mins * 60000 - Date.now(); if (left <= 0) { finish(rr, 'time'); clearInterval(barTimer); barTimer = null; var bar = $('#iv-bar'); if (bar) bar.innerHTML = '<strong>Time is up.</strong> <a href="#/interview-lab/round/' + e(rr.id) + '">See your scorecard</a>.'; return; } n.textContent = clock(left); }
  tick(); barTimer = setInterval(tick, 1000);
});

/* ---------------------------------------------------------------- index */
function indexView() {
  view.title = 'Hands-on interview rounds | MARGA by EknathaLabs'; view.nav = 'practice'; view.after = null; view.cleanup = null; view.voice = '';
  var b = bag(), act = active();
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Hands-on interview rounds</h1><p class="lede">A timed round of real Linux labs and short challenges, like a practical screen. Hints cost points. You get a scorecard to keep, print or share. Free, no sign-up, nothing leaves your device.</p></section>' +
    '<div class="wrap narrow iv">' + (act ? '<p class="iv-note" role="status"><strong>A round is running.</strong> <a href="#/interview-lab/round/' + e(act.id) + '">Go back to ' + e(act.title) + '</a>.</p>' : '') +
    '<ul class="iv-rounds">' + ROUNDS.map(function (r) {
      var its = parse(r.items).map(function (x) { return item(x.k, x.id); }).filter(Boolean);
      return '<li class="iv-round"><h2><a href="#/interview-lab/round/' + e(r.id) + '">' + e(r.title) + '</a></h2><p>' + e(r.who) + '. ' + its.length + ' tasks, ' + r.mins + ' minutes.</p><p class="small">' + its.map(function (x) { return e(x.title); }).join(' | ') + '</p></li>';
    }).join('') + '</ul>' +
    (b.hist.length ? '<h2 class="sub-h">Your recent rounds</h2><ul class="iv-hist">' + b.hist.slice(0, 5).map(function (h) { return '<li>' + e(h.title) + ': ' + h.pts + ' of ' + h.max + ' points <span class="small">' + new Date(h.t).toLocaleDateString() + '</span></li>'; }).join('') + '</ul>' : '') +
    '<h2 class="sub-h">If you are the interviewer</h2><p>Send the candidate the link to a round. They need a recent browser. When they finish, they copy a short code from the scorecard and send it back. Paste the codes below to read them. The round is not proctored: anyone can look things up or ask for help, so use it to start a conversation, not to make a decision on its own.</p>' +
    '<label class="field"><span>Paste scorecard codes, one per line</span><textarea id="iv-codes" class="diy-ta" rows="4"></textarea></label><p class="actions"><button type="button" class="btn btn-quiet" id="iv-read">Read the codes</button></p><div id="iv-table"></div></div>';
  view.after = function () {
    $('#iv-read').addEventListener('click', function () {
      var rows = $('#iv-codes').value.split(/\s+/).filter(Boolean).map(function (c) { try { var o = JSON.parse(unb64(c)); return o && o.r && Array.isArray(o.s) ? o : { bad: true }; } catch (x) { return { bad: true }; } });
      if (!rows.length) { $('#iv-table').innerHTML = '<p>Paste at least one code.</p>'; return; }
      $('#iv-table').innerHTML = '<div class="table-wrap"><table><thead><tr><th scope="col">Name</th><th scope="col">Round</th><th scope="col">Points</th><th scope="col">Per task (0 to 3)</th><th scope="col">Hints used</th></tr></thead><tbody>' + rows.map(function (o) {
        if (o.bad) return '<tr><td colspan="5">This code could not be read.</td></tr>';
        var r = round(o.r), tot = o.s.reduce(function (n, x) { return n + (+x || 0); }, 0);
        return '<tr><th scope="row">' + e(String(o.n || 'Candidate').slice(0, 40)) + '</th><td>' + e(r ? r.title : String(o.r).slice(0, 30)) + '</td><td>' + tot + ' of ' + o.s.length * 3 + '</td><td>' + e(o.s.join(', ')) + '</td><td>' + e((o.h || []).join(', ')) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="small">Points: 3 for a task solved with no hints, 2 with one or two hints, 1 with more, 0 if not solved.</p>';
    });
  };
}

/* ---------------------------------------------------------------- one round */
function roundView(id) {
  var r = round(id); view.nav = 'practice'; view.after = null; view.cleanup = null; view.voice = '';
  if (!r) { view.title = 'Round not found | MARGA'; view.html = '<section class="page-head wrap"><h1>That round does not exist</h1><p class="lede"><a href="#/interview-lab">See all rounds</a>.</p></section>'; return; }
  view.title = r.title + ' | MARGA by EknathaLabs';
  var run = active(), b = bag(), last = b.last && b.last.id === r.id && (!run || run.id !== r.id) ? b.last : null;
  var items = parse(r.items).map(function (x) { var m = item(x.k, x.id); return m ? { k: x.k, id: x.id, m: m } : null; }).filter(Boolean);
  var head = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/interview-lab">Hands-on interview rounds</a></nav><h1>' + e(r.title) + '</h1><p class="lede">' + e(r.who) + '. ' + items.length + ' tasks in ' + r.mins + ' minutes. Real Linux labs run in your browser and are checked by the machine. Hints cost points.</p></section>';
  if (run && run.id === r.id) {
    view.html = head + '<div class="wrap narrow iv"><p class="iv-clock" id="iv-clock" aria-live="off">' + clock(run.start + run.mins * 60000 - Date.now()) + '</p><ol class="iv-tasks">' + run.items.map(function (x, i) {
      var m = item(x.k, x.id), t = okAt(x.k, x.id), solved = t > run.start, hints = Math.max(0, hintsOf(x.k, x.id) - run.base[i]);
      return '<li class="' + (solved ? 'is-done' : '') + '"><a href="' + e(m.href) + '">' + e(m.title) + '</a> <span class="small">' + e(m.kind) + (solved ? ', solved' : '') + (hints ? ', ' + hints + (hints === 1 ? ' hint' : ' hints') : '') + '</span></li>';
    }).join('') + '</ol><p class="actions"><button type="button" class="btn btn-primary" id="iv-done">Finish and see my scorecard</button></p><p class="small">Open a task, solve it, and come back here. The clock keeps running while you work. A task counts when its check passes during this round.</p></div>';
    view.after = function () {
      var tm = setInterval(function () { var rr = bag().run, c = $('#iv-clock'); if (!rr || !c) { clearInterval(tm); return; } var left = rr.start + rr.mins * 60000 - Date.now(); if (left <= 0) { clearInterval(tm); finish(rr, 'time'); A.route(); return; } c.textContent = clock(left); }, 1000);
      view.cleanup = function () { clearInterval(tm); };
      $('#iv-done').addEventListener('click', function () { clearInterval(tm); finish(bag().run, 'manual'); A.route(); });
    };
    return;
  }
  if (last) {
    var code = b64(JSON.stringify({ n: last.name || '', r: last.id, s: last.rows.map(function (x) { return x.pts; }), h: last.rows.map(function (x) { return x.hints; }) }));
    var summary = r.title + ': ' + last.pts + ' of ' + last.max + ' points. ' + last.rows.map(function (x, i) { var m = item(x.k, x.id); return (m ? m.title : x.id) + ' (' + (x.solved ? 'solved' + (x.hints ? ', ' + x.hints + ' hints' : '') : 'not solved') + ')'; }).join('; ') + '.';
    view.html = head + '<div class="wrap narrow iv iv-score"><h2 class="sub-h">Scorecard</h2><p class="iv-big"><strong>' + last.pts + ' of ' + last.max + ' points</strong></p><div class="table-wrap"><table><thead><tr><th scope="col">Task</th><th scope="col">Result</th><th scope="col">Hints</th><th scope="col">Time</th><th scope="col">Points</th></tr></thead><tbody>' +
      last.rows.map(function (x) { var m = item(x.k, x.id); return '<tr><th scope="row">' + e(m ? m.title : x.id) + '</th><td>' + (x.solved ? 'Solved' : 'Not solved') + '</td><td>' + x.hints + '</td><td>' + (x.solved ? e(secs(x.secs)) : 'n/a') + '</td><td>' + x.pts + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<p class="small">Points per task: 3 solved with no hints, 2 with one or two hints, 1 with more hints, 0 not solved. This is a practice score, not an assessment of a person.</p>' +
      '<label class="field"><span>Your name for the code (optional)</span><input type="text" id="iv-name" maxlength="40" value="' + e(last.name || '') + '"></label><p class="actions"><button type="button" class="btn btn-primary" id="iv-copy">Copy a summary</button><button type="button" class="btn btn-quiet" id="iv-code-btn">Make a code for the interviewer</button><button type="button" class="btn btn-quiet" data-act="print">Print</button><a class="btn btn-quiet" href="#/interview-lab/round/' + e(r.id) + '?again=1">Try this round again</a></p><textarea id="iv-code" class="diy-ta" rows="3" readonly hidden aria-label="Scorecard code"></textarea></div>';
    view.after = function () {
      $('#iv-copy').addEventListener('click', function () { copy(summary, function (ok) { A.toast(ok ? 'Summary copied.' : 'Select the text and copy it.'); }); });
      $('#iv-code-btn').addEventListener('click', function () {
        var nm = ($('#iv-name').value || '').trim().slice(0, 40), c2 = b64(JSON.stringify({ n: nm, r: last.id, s: last.rows.map(function (x) { return x.pts; }), h: last.rows.map(function (x) { return x.hints; }) }));
        var t = $('#iv-code'); t.hidden = false; t.value = c2; t.select(); copy(c2, function (ok) { A.toast(ok ? 'Code copied.' : 'Select the code and copy it.'); });
      });
    };
    void code;
    return;
  }
  view.html = head + '<div class="wrap narrow iv"><h2 class="sub-h">The tasks</h2><ol class="iv-tasks">' + items.map(function (x) { return '<li>' + e(x.m.title) + ' <span class="small">' + e(x.m.kind) + ', ' + e(x.m.level) + '</span></li>'; }).join('') + '</ol>' +
    '<h2 class="sub-h">How it works</h2><ul><li>The clock starts when you press Start and does not pause. It is kept in this browser.</li><li>Open each task, solve it and press its check. Real Linux labs start a fresh machine in your browser (about 5 MB the first time).</li><li>Each hint you open costs points. You may look things up if you would in real work.</li><li>When the time ends, or when you finish, you get a scorecard.</li></ul>' +
    '<label class="field"><span>Your name (optional, for the scorecard)</span><input type="text" id="iv-name" maxlength="40"></label>' +
    '<p class="actions"><button type="button" class="btn btn-primary" id="iv-start">Start the ' + r.mins + ' minute round</button></p><p class="small" id="iv-warn"></p></div>';
  view.after = function () {
    $('#iv-start').addEventListener('click', function () {
      if (active()) { $('#iv-warn').textContent = 'Another round is running. Finish it first.'; return; }
      var nm = ($('#iv-name').value || '').trim().slice(0, 40);
      bag().run = { id: r.id, title: r.title, mins: r.mins, start: Date.now(), name: nm, items: items.map(function (x) { return { k: x.k, id: x.id }; }), base: items.map(function (x) { return hintsOf(x.k, x.id); }) };
      A.save(); A.route();
    });
  };
}

A.addRoute(/^\/interview-lab$/, indexView);
A.addRoute(/^\/interview-lab\/round\/([a-z0-9-]+)(\?again=1)?$/, function (id, again) { if (again) { var b = bag(); if (b.last && b.last.id === id) b.last = null; } return roundView(id); });
};
