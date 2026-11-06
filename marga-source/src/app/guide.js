/* MARGA goal pages and the "find my path" quiz.
   #/goal/<id>: one page per goal (a path, a plan, first labs). #/find-my-path: five questions, then a suggested goal.
   Everything is worked out in the browser from a fixed table. Nothing is sent anywhere. */
window.MargaGuide = function (A) {
'use strict';
var D = A.D, view = A.view, $ = A.$, e = A.e, plural = A.plural;

var GOALS = {
  sre: { title: 'Become an SRE in 100 days', short: 'Site reliability engineer', path: 'sre', plans: ['sre-30', 'sre-60', 'sre-100'],
    why: 'You want to keep systems up: service levels, incidents, on-call and capacity. This goal follows the Site Reliability Engineer path and adds the 100-day challenge, with a review day every week.',
    first: ['Read the SRE path outline and pick your plan.', 'Fix your first Real Linux lab: a full disk.', 'Try a diagnose-only lab: name the cause before you touch anything.', 'Read one real outage in the case studies.', 'Answer five SRE interview questions out loud.'],
    labs: [['#/linux?level=Beginner&topic=fix', 'Real Linux labs, beginner'], ['#/linux?level=All&topic=diagnose', 'Diagnose-only labs'], ['#/terminal-labs/linux', 'Terminal labs: Linux']] },
  linux: { title: 'Learn Linux from zero', short: 'Linux and the shell', path: 'devops', plans: ['linux-bash-30', 'devops-60', 'devops-100'],
    why: 'You want to be comfortable at a command line before anything else. Start with files, users and permissions, processes and disks, then fix broken machines.',
    first: ['Open the first Linux lesson: files and navigation.', 'Pass its quiz to unlock the next lesson.', 'Open the Linux cheat sheet and keep it beside you.', 'Solve a beginner Real Linux lab.', 'Take the 30-day Linux and shell plan.'],
    labs: [['#/linux?level=Beginner&topic=fix', 'Real Linux labs, beginner'], ['#/terminal-labs/linux', 'Terminal labs: Linux'], ['#/terminal-labs/bash', 'Terminal labs: Shell']] },
  kubernetes: { title: 'Pass the Kubernetes exam (CKA)', short: 'Kubernetes operator', path: 'devops', plans: ['kubernetes-30', 'devops-60', 'devops-100'],
    why: 'You want to run and fix clusters. The Kubernetes stage covers workloads, networking, storage and troubleshooting, with break-and-fix labs in a simulated cluster.',
    first: ['Open the Kubernetes stage and read the first lesson.', 'Run a Kubernetes terminal lab: a pod that will not start.', 'Use the Kubernetes cheat sheet for the kubectl commands.', 'Follow the 30-day Kubernetes plan.', 'Practise interview questions on Kubernetes.'],
    labs: [['#/terminal-labs/kubernetes', 'Terminal labs: Kubernetes'], ['#/terminal-labs/docker', 'Terminal labs: Docker'], ['#/interview', 'Interview questions']], module: 'kubernetes' },
  devops: { title: 'Get a DevOps job', short: 'DevOps engineer', path: 'devops', plans: ['linux-bash-30', 'devops-60', 'devops-100'],
    why: 'You want the full set of skills a DevOps role asks for: Linux, Git, containers, pipelines, Kubernetes, Terraform and monitoring, plus interview practice.',
    first: ['Follow the DevOps path from the top.', 'Solve a Real Linux lab and a Docker terminal lab.', 'Build a capstone project and put it on your portfolio.', 'Answer interview questions by topic.', 'Run the 100-day DevOps challenge.'],
    labs: [['#/linux?level=Beginner&topic=fix', 'Real Linux labs, beginner'], ['#/terminal-labs/docker', 'Terminal labs: Docker'], ['#/interview', 'Interview questions']] },
  cloud: { title: 'Learn AWS and Azure', short: 'Cloud engineer', path: 'cloud', plans: ['cloud-iac-30', 'devops-60', 'devops-100'],
    why: 'You want to work with cloud accounts: identity, networks, storage, cost and security. The cloud labs use an imitation aws and az command line, so you need no account and risk no bill.',
    first: ['Read cloud fundamentals and identity and access.', 'Fix your first cloud lab: an upload refused by the wrong profile.', 'Close a public bucket and open a firewall rule the safe way.', 'Follow the 30-day cloud and infrastructure plan.', 'Read the AWS and Azure cheat sheets.'],
    labs: [['#/terminal-labs/cloud', 'Cloud labs: AWS and Azure, simulated'], ['#/linux?level=All&topic=tls', 'TLS labs'], ['#/cheatsheets', 'Cheat sheets']] }
};
var ORDER = ['sre', 'linux', 'kubernetes', 'devops', 'cloud'];

function planTitle(id) { var ps = D.plans || []; for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i].title; return id; }
function pathTitle(id) { var ps = (D.paths && D.paths.live) || []; for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i].title; return id; }
function labCount(mod) { return (D.termlabs || []).filter(function (l) { return l.module === mod; }).length; }

function goalView(id) {
  var g = GOALS[id];
  if (!g) { location.hash = '/find-my-path'; return; }
  view.title = g.title + ' | MARGA by EknathaLabs'; view.nav = '';
  var vm = (D.vmlabs || []).length;
  var long = g.plans[1], short = g.plans[0];
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a></nav><h1>' + e(g.title) + '</h1>' +
    '<p class="lede">' + e(g.why) + '</p>' +
    '<p class="actions"><a class="btn btn-primary" href="#/path/' + g.path + '">Start the ' + e(pathTitle(g.path)) + ' path</a><a class="btn btn-quiet" href="#/plan/' + short + '">Take the ' + e(planTitle(short)) + ' plan</a><a class="btn btn-quiet" href="#/find-my-path">Not sure? Take the quiz</a></p></section>' +
    '<div class="wrap narrow"><h2 class="sub-h">Your first week</h2><ol class="steps gp-steps">' + g.first.map(function (s) { return '<li>' + e(s) + '</li>'; }).join('') + '</ol>' +
    '<h2 class="sub-h">Practise with</h2><ul class="gp-labs">' + g.labs.map(function (l) { return '<li><a href="' + e(l[0]) + '">' + e(l[1]) + '</a></li>'; }).join('') + '</ul>' +
    '<h2 class="sub-h">Other routes for this goal</h2><ul class="gp-labs"><li><a href="#/plan/' + long + '">' + e(planTitle(long)) + '</a></li>' + (g.module ? '<li><a href="#/module/' + g.module + '">The ' + e(g.module) + ' stage, lesson by lesson</a></li>' : '') + '<li><a href="#/roadmap/' + g.path + '">Roadmap for this path</a></li></ul>' +
    '<p class="small">Free, offline once loaded, no sign-up. ' + vm + ' Real Linux labs and ' + (D.termlabs || []).length + ' terminal labs, all checked automatically. Progress stays on this device.</p>' +
    '<h2 class="sub-h">Other goals</h2><ul class="goal-list">' + ORDER.filter(function (x) { return x !== id; }).map(function (x) { return '<li><a href="#/goal/' + x + '">' + e(GOALS[x].title) + '</a></li>'; }).join('') + '</ul></div>';
  view.after = null;
}
A.addRoute(/^\/goal\/([a-z0-9-]+)$/, goalView);

/* ---------------------------------------------------------------- the quiz */
var Q = [
  { q: 'What do you want to do?', o: [['Get a DevOps job', { devops: 3 }], ['Keep production systems reliable, including on-call', { sre: 3 }], ['Pass a Kubernetes certification', { kubernetes: 3 }], ['Learn Linux from the start', { linux: 3 }], ['Work with AWS or Azure', { cloud: 3 }]] },
  { q: 'How comfortable are you at a Linux command line?', o: [['Not at all yet', { linux: 4 }], ['I can move around and edit files', { linux: 1 }], ['Comfortable', {}]] },
  { q: 'Where do you spend, or want to spend, most of your time?', o: [['Servers and incidents', { sre: 2 }], ['Containers and pipelines', { devops: 2, kubernetes: 1 }], ['Kubernetes clusters', { kubernetes: 3 }], ['Cloud accounts and networks', { cloud: 3 }]] },
  { q: 'How much time can you give each day?', o: [['About 15 minutes', { _t: 'short' }], ['About 30 minutes', { _t: 'long' }], ['An hour or more', { _t: 'long' }]] },
  { q: 'How do you like to learn?', o: [['By fixing broken machines', { _s: 'labs' }], ['By reading first, then trying', { _s: 'read' }], ['By answering interview questions', { _s: 'iv' }]] }
];
var qs = { i: 0, a: [] };
function result() {
  var sc = { sre: 0, linux: 0, kubernetes: 0, devops: 0, cloud: 0 }, t = 'long', s = 'read';
  qs.a.forEach(function (n, i) { var d = Q[i].o[n][1]; Object.keys(d).forEach(function (k) { if (k === '_t') t = d[k]; else if (k === '_s') s = d[k]; else sc[k] += d[k]; }); });
  var best = ORDER[0]; ORDER.forEach(function (k) { if (sc[k] > sc[best]) best = k; });
  return { id: best, t: t, s: s, sc: sc };
}
function quizView() {
  view.title = 'Find my path | MARGA by EknathaLabs'; view.nav = '';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a></nav><h1>Find my path</h1><p class="lede">Five questions, about two minutes. You get a goal, a plan and your first labs. Your answers stay in this browser.</p></section><div class="wrap narrow" id="gq" aria-live="polite"></div>';
  view.after = function () { qs = { i: 0, a: [] }; draw(); };
}
function draw() {
  var box = $('#gq'); if (!box) return;
  if (qs.i >= Q.length) {
    var r = result(), g = GOALS[r.id], plan = r.t === 'short' ? g.plans[0] : g.plans[1];
    var st = A.state(); st.goal = { id: r.id, t: Date.now() }; A.save();
    var sec = r.s === 'labs' ? ['#/linux?level=Beginner&topic=fix', 'Start with a Real Linux lab'] : r.s === 'iv' ? ['#/interview', 'Start with interview questions'] : ['#/path/' + g.path, 'Start with the first lesson'];
    box.innerHTML = '<div class="gq-res"><h2>Your goal: ' + e(g.title) + '</h2><p class="lede">' + e(g.why) + '</p>' +
      '<ul class="gp-labs"><li><strong>Path:</strong> <a href="#/path/' + g.path + '">' + e(pathTitle(g.path)) + '</a></li><li><strong>Plan:</strong> <a href="#/plan/' + plan + '">' + e(planTitle(plan)) + '</a> (' + (r.t === 'short' ? 'fits about 15 minutes a day' : 'about 30 minutes a day') + ')</li><li><strong>First step:</strong> <a href="' + e(sec[0]) + '">' + e(sec[1]) + '</a></li></ul>' +
      '<p class="actions"><a class="btn btn-primary" href="#/goal/' + r.id + '">See the full plan for this goal</a><button type="button" class="btn btn-quiet" data-gq="again">Take the quiz again</button></p>' +
      '<p class="small">Close second: ' + ORDER.filter(function (k) { return k !== r.id; }).sort(function (a, b) { return r.sc[b] - r.sc[a]; }).slice(0, 2).map(function (k) { return '<a href="#/goal/' + k + '">' + e(GOALS[k].title) + '</a>'; }).join(' or ') + '.</p></div>';
    return;
  }
  var q = Q[qs.i];
  box.innerHTML = '<p class="small">Question ' + (qs.i + 1) + ' of ' + Q.length + '</p><div class="cs-bar" role="img" aria-label="Question ' + (qs.i + 1) + ' of ' + Q.length + '"><i style="width:' + Math.round(qs.i / Q.length * 100) + '%"></i></div>' +
    '<h2 id="gq-q" tabindex="-1">' + e(q.q) + '</h2><div class="gq-opts" role="group" aria-labelledby="gq-q">' + q.o.map(function (o, n) { return '<button type="button" class="gq-opt" data-gq="' + n + '">' + e(o[0]) + '</button>'; }).join('') + '</div>' +
    (qs.i ? '<p><button type="button" class="btn btn-quiet" data-gq="back">Back</button></p>' : '');
  var h = $('#gq-q'); if (h) h.focus();
}
document.addEventListener('click', function (ev) {
  var b = ev.target && ev.target.closest ? ev.target.closest('[data-gq]') : null; if (!b || !$('#gq')) return;
  var v = b.getAttribute('data-gq');
  if (v === 'again') { qs = { i: 0, a: [] }; } else if (v === 'back') { qs.i = Math.max(0, qs.i - 1); qs.a.length = qs.i; } else { qs.a[qs.i] = +v; qs.i++; }
  draw();
});
A.addRoute(/^\/find-my-path$/, quizView);
};
