/* MARGA learning plans: a day-by-day route through lessons, widgets and practice.
   Plans are data (src/plans/*.json). Lessons and widgets tick themselves when you pass or try them; drills, case studies and
   links are ticked by hand. Nothing here uses dates, so a plan never expires and you can skip days. */
window.MargaPlans = function (A) {
'use strict';
var D = A.D, LES = A.LES, MOD = A.MOD, view = A.view, $ = A.$, $$ = A.$$, e = A.e, plural = A.plural;
var PL = D.plans || [], BY = {}, WG = {};
PL.forEach(function (p) { BY[p.id] = p; });
(D.widgets || []).forEach(function (w) { WG[w.id] = w; });
function bag() { var s = A.state(); if (!s.pl || typeof s.pl !== 'object' || Array.isArray(s.pl)) s.pl = {}; return s.pl; }
function ticks(id) { var b = bag(); if (!b[id] || typeof b[id] !== 'object') b[id] = {}; return b[id]; }
function tried(id) { var s = A.state(); return !!(s.wgt && s.wgt[id]); }
var LABEL = { drills: 'Troubleshooting drills', cases: 'Case studies' };
function modTitle(id) { return MOD[id] ? MOD[id].title : id; }
function itemInfo(plan, di, ii, it) {
  var key = 'd' + (di + 1) + 'i' + (ii + 1), t = ticks(plan.id), o = { key: key, manual: false, done: false, min: 10, text: '', href: '', state: '' };
  if (it.t === 'lesson') { var l = LES[it.id]; o.text = 'Lesson: ' + l.title; o.href = A.hrefLesson(it.id); o.min = l.minutes || 10; o.state = A.lessonState(it.id); o.done = o.state === 'done'; }
  else if (it.t === 'widget') { var w = WG[it.id]; o.text = 'Try it: ' + w.title; o.href = '#/widget/' + it.id; o.min = 8; o.done = tried(it.id); o.state = o.done ? 'done' : 'open'; }
  else if (it.t === 'drills') { o.text = 'Practice: ' + modTitle(it.module) + ' troubleshooting drills'; o.href = '#/drills/' + it.module; o.min = 15; o.manual = true; }
  else if (it.t === 'cases') { o.text = 'Read a case study: ' + modTitle(it.module); o.href = '#/cases/' + it.module; o.min = 15; o.manual = true; }
  else { o.text = it.text; o.href = it.href; o.min = it.min || 10; o.manual = true; }
  if (o.manual) { o.done = !!t[key]; o.state = o.done ? 'done' : 'open'; }
  return o;
}
function dayInfo(plan, di) {
  var d = plan.days[di], items = d.items.map(function (it, ii) { return itemInfo(plan, di, ii, it); });
  var first = d.items[0], title = d.title;
  if (!title) { if (first && first.t === 'lesson') title = LES[first.id].title; else if (first && first.t === 'widget') title = 'Try it: ' + WG[first.id].title; else title = 'Explore and practise'; }
  var mins = items.reduce(function (n, x) { return n + x.min; }, 0), done = items.length > 0 && items.every(function (x) { return x.done; });
  return { title: title, items: items, mins: mins, done: done, practice: !!d.practice };
}
function summary(plan) {
  var days = plan.days.map(function (d, i) { return dayInfo(plan, i); }), doneN = days.filter(function (d) { return d.done; }).length, next = days.findIndex(function (d) { return !d.done; });
  return { days: days, done: doneN, total: days.length, next: next, pct: Math.round(doneN / days.length * 100), mins: days.reduce(function (n, d) { return n + d.mins; }, 0) };
}
function ring(pct, label) {
  var r = 22, c = 2 * Math.PI * r;
  return '<svg class="plan-ring" viewBox="0 0 56 56" width="56" height="56" role="img" aria-label="' + e(label) + '"><circle cx="28" cy="28" r="' + r + '" class="rb"/><circle cx="28" cy="28" r="' + r + '" class="rf" stroke-dasharray="' + (c * pct / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 28 28)"/><text x="28" y="32" text-anchor="middle">' + pct + '%</text></svg>';
}
function hours(m) { return m >= 90 ? 'about ' + Math.round(m / 60) + ' hours' : m + ' minutes'; }

/* used by the lesson page: which plan day is this lesson part of */
window.MargaPlanInfo = {
  forLesson: function (lid) {
    var out = [];
    PL.forEach(function (p) { p.days.forEach(function (d, i) { if (d.items.some(function (x) { return x.t === 'lesson' && x.id === lid; })) { var s = summary(p); out.push({ plan: p, day: i + 1, total: p.days.length, pct: s.pct, started: s.done > 0 || Object.keys(ticks(p.id)).length > 0 }); } }); });
    return out;
  }
};

function indexView() {
  view.title = 'Learning plans | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = '<section class="page-head wrap"><h1>Learning plans</h1><p class="lede">A day-by-day route through the lessons, widgets and practice for one goal. Lessons and widgets tick themselves. There are no dates, so skip a day or take a week off and pick up where you left off.</p></section>' +
    '<div class="wrap narrow"><ul class="plan-list">' + PL.map(function (p) {
      var s = summary(p), started = s.done > 0 || Object.keys(ticks(p.id)).length > 0;
      return '<li class="plan-card"><div class="plan-card-top">' + ring(s.pct, s.pct + ' percent of ' + p.title + ' complete') + '<div><h2><a href="#/plan/' + e(p.id) + '">' + e(p.title) + '</a></h2><p class="small">' + e(p.level) + ' | ' + s.total + ' days | ' + hours(s.mins) + ' in all</p></div></div>' +
        '<p>' + e(p.summary) + '</p><p class="small"><strong>Who it is for.</strong> ' + e(p.who) + '</p>' +
        '<p><a class="btn ' + (started ? 'btn-primary' : 'btn-quiet') + '" href="#/plan/' + e(p.id) + '">' + (s.next < 0 ? 'Plan complete: review it' : (started ? 'Continue with day ' + (s.next + 1) : 'See the plan')) + '</a></p></li>';
    }).join('') + '</ul></div>';
}
function planView(id) {
  var p = BY[id];
  if (!p) { view.title = 'Plan not found | MARGA'; view.nav = 'practice'; view.html = '<section class="page-head wrap"><h1>That plan does not exist</h1><p class="lede"><a href="#/plans">See all plans</a>.</p></section>'; return; }
  var s = summary(p), t = ticks(p.id), weeks = Math.ceil(p.days.length / 7);
  view.title = p.title + ' | Learning plans | MARGA by EknathaLabs'; view.nav = 'practice';
  var h = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/plans">Plans</a></nav><h1>' + e(p.title) + '</h1><p class="lede">' + e(p.summary) + '</p></section><div class="wrap narrow plan-page" id="plan-body" data-plan="' + e(p.id) + '">';
  h += '<section class="plan-now" aria-label="Your progress">' + ring(s.pct, s.pct + ' percent complete') + '<div><p><strong>' + (s.next < 0 ? 'You finished every day.' : 'Next up: day ' + (s.next + 1) + ' of ' + s.total + '.') + '</strong> ' + s.done + ' of ' + s.total + ' days done.</p>' +
    (s.next >= 0 ? '<p><button type="button" class="btn btn-primary" data-act="plan-go" data-day="' + (s.next + 1) + '">Go to day ' + (s.next + 1) + '</button></p>' : '') + '</div></section>';
  h += '<section class="plan-meta"><h2 class="sub-h">What you will be able to do</h2><ul>' + p.outcomes.map(function (o) { return '<li>' + e(o) + '</li>'; }).join('') + '</ul><p class="small"><strong>Who it is for.</strong> ' + e(p.who) + '</p>' +
    '<p class="small">Some lessons stay locked until you pass the ones before them or finish the skills they build on. Locked items say so. <a href="#/placement">The placement check</a> can show where to start.</p></section>';
  for (var w = 0; w < weeks; w++) {
    h += '<h2 class="sub-h">Week ' + (w + 1) + '</h2><div class="plan-week">';
    for (var di = w * 7; di < Math.min(p.days.length, w * 7 + 7); di++) {
      var d = s.days[di], cur = di === s.next;
      h += '<details class="plan-day' + (d.done ? ' done' : '') + (cur ? ' current' : '') + '" id="day-' + (di + 1) + '"' + (cur ? ' open' : '') + '><summary><span class="pd-n">Day ' + (di + 1) + '</span><span class="pd-t">' + e(d.title) + '</span><span class="pd-s">' + (d.done ? 'Done' : (cur ? 'Next up' : d.mins + ' min')) + '</span></summary><ul class="plan-items">';
      d.items.forEach(function (x) {
        var st = x.state === 'locked' ? '<span class="pi-st lock">Locked until the earlier lessons are passed</span>' : (x.done ? '<span class="pi-st ok">Done</span>' : '');
        h += '<li class="pi ' + x.state + '">' + (x.manual ? '<label class="pi-box"><input type="checkbox" data-key="' + x.key + '"' + (x.done ? ' checked' : '') + ' aria-label="Mark done: ' + e(x.text) + '"></label>' : '<span class="pi-mark" aria-hidden="true"></span>') +
          '<a href="' + e(x.href) + '">' + e(x.text) + '</a><span class="small"> about ' + x.min + ' min</span> ' + st + '</li>';
      });
      h += '</ul></details>';
    }
    h += '</div>';
  }
  h += '<p class="small"><button type="button" class="btn btn-quiet" data-act="plan-clear">Clear my ticks for drills, case studies and links</button> Lessons and widgets keep their progress.</p></div>';
  view.html = h;
  view.after = function () {
    var body = $('#plan-body'); if (!body) return;
    body.addEventListener('change', function (ev) { var c = ev.target.closest('input[data-key]'); if (!c) return; var tt = ticks(p.id); if (c.checked) tt[c.getAttribute('data-key')] = 1; else delete tt[c.getAttribute('data-key')]; A.save(); A.route(); });
  };
}
A.onAct('plan-go', function (b) { var d = $('#day-' + b.getAttribute('data-day')); if (d) { d.open = true; try { d.scrollIntoView({ block: 'center' }); } catch (x) { /* ignore */ } } });
A.onAct('plan-clear', function (b) { var body = b.closest('#plan-body'), id = body && body.getAttribute('data-plan'); if (!id) return; var bb = bag(); bb[id] = {}; A.save(); A.route(); });
A.addRoute(/^\/plans$/, indexView);
A.addRoute(/^\/plan\/([a-z0-9-]+)$/, planView);
};
