/* MARGA skill-writing lab. Write a SKILL.md, get it checked, and try a rough trigger test.
   Everything runs in the browser and nothing is sent anywhere. The checks use common published limits
   and good habits; they are a learning aid, not the official validator, so always test in the real product. */
(function () {
'use strict';
var STOP = {}; ('a an and are as at be but by for from has have how i if in into is it its me my of on or our so than that the their then there these this to up use was we what when which who will with you your can do does not no any all about each per via also should would could').split(' ').forEach(function (w) { STOP[w] = 1; });

function parse(text) {
  var t = String(text == null ? '' : text).replace(/\r\n?/g, '\n'), lines = t.split('\n');
  var out = { raw: t, hasOpen: false, hasClose: false, fields: {}, body: '', bodyLines: 0 };
  if (lines[0].trim() !== '---') { out.body = t; out.bodyLines = lines.length; return out; }
  out.hasOpen = true;
  var end = -1, i;
  for (i = 1; i < lines.length; i++) if (lines[i].trim() === '---') { end = i; break; }
  var headEnd = end < 0 ? Math.min(lines.length, 12) : end;
  out.hasClose = end >= 0;
  var key = null;
  for (i = 1; i < headEnd; i++) {
    var m = /^([A-Za-z][\w-]*):\s?(.*)$/.exec(lines[i]);
    if (m && !/^\s/.test(lines[i])) { key = m[1].toLowerCase(); out.fields[key] = m[2]; }
    else if (key && /^\s+\S/.test(lines[i])) out.fields[key] += ' ' + lines[i].trim();
  }
  Object.keys(out.fields).forEach(function (k) {
    var v = out.fields[k].trim();
    if (/^[>|][+-]?$/.test(v)) v = '';
    v = v.replace(/^[>|][+-]?\s+/, '');
    if ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'")) v = v.slice(1, -1);
    out.fields[k] = v.trim();
  });
  var bodyLines = end < 0 ? [] : lines.slice(end + 1);
  out.body = bodyLines.join('\n'); out.bodyLines = bodyLines.length;
  return out;
}

var SECRETS = [
  [/sk-ant-[A-Za-z0-9_-]{8,}/, 'an Anthropic-style API key'],
  [/\bsk-[A-Za-z0-9]{20,}/, 'an API key that starts with sk-'],
  [/\bAKIA[0-9A-Z]{12,}/, 'an AWS access key ID'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/, 'a personal access token'],
  [/\b(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"]?[A-Za-z0-9/+_-]{8,}/i, 'a hard-coded password, secret or token']
];
var RISKY = [
  ['error', /(curl|wget)[^\n|]*\|\s*(sudo\s+)?(ba|z|da)?sh\b/i, 'Downloads a script and pipes it straight into a shell', 'Download to a file, review it, then run it, or bundle a reviewed script in the skill.'],
  ['error', /base64\s+(-d|--decode)[^\n]*\|\s*(ba|z|da)?sh\b/i, 'Decodes hidden text and runs it', 'Never run decoded text. Put readable code in a script file.'],
  ['error', /rm\s+-[a-z]*r[a-z]*f?[a-z]*\s+(\/(\s|$)|~|\$HOME|\/\*)/i, 'Recursive delete of a very broad path', 'Delete only a named work folder, and move to a trash folder where possible.'],
  ['warn', /\beval\s*\(|\bexec\s*\(/, 'Runs text as code with eval or exec', 'Call a named function instead of evaluating text.'],
  ['warn', /os\.system\s*\(|shell\s*=\s*True/, 'Starts a shell from a script', 'Pass arguments as a list without a shell.'],
  ['warn', /chmod\s+(-R\s+)?7[0-7][0-7]\b/, 'Makes files writable by everyone', 'Use the narrowest permission that works, such as 644 or 755.'],
  ['warn', /\bsudo\b/, 'Asks for administrator rights', 'A skill should not need administrator rights. Remove it or explain why it is needed.'],
  ['warn', /\bhttp:\/\//i, 'Uses a link without encryption', 'Use https links.'],
  ['warn', /\b(curl|wget)\b|requests\.(get|post)|urlopen\s*\(|fetch\s*\(/i, 'Makes a network call', 'Say in the skill what is sent and where, or remove the call. Skills from others should be reviewed with network access off.']
];

function check(text) {
  var p = parse(text), r = [], f = p.fields;
  function add(sev, id, msg, fix) { r.push({ sev: sev, id: id, msg: msg, fix: fix || '' }); }
  if (!p.hasOpen) add('error', 'header-open', 'The file does not start with a header.', 'Make the first line three dashes (---), then name and description, then three dashes again.');
  else if (!p.hasClose) add('error', 'header-close', 'The header is never closed.', 'Add a line with three dashes after the description.');
  var name = f.name || '';
  if (p.hasOpen) {
    if (!name) add('error', 'name-missing', 'The header has no name.', 'Add a line such as: name: contract-review');
    else {
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) add('error', 'name-format', 'The name should use only lowercase letters, numbers and single hyphens.', 'Example: weekly-status-report');
      if (name.length > 64) add('error', 'name-length', 'The name is longer than 64 characters.', 'Shorten it.');
      if (/anthropic|claude/i.test(name)) add('error', 'name-reserved', 'The name contains a reserved word.', 'Pick a name that describes the task instead.');
    }
    var d = f.description || '';
    if (!d) add('error', 'desc-missing', 'The header has no description.', 'Say what the skill does and when to use it.');
    else {
      if (d.length > 1024) add('error', 'desc-length', 'The description is longer than 1,024 characters.', 'Shorten it and move detail into the body.');
      if (/<\/?[a-z][^>]*>/i.test(d)) add('error', 'desc-tags', 'The description contains tag-like text.', 'Remove angle-bracket markup.');
      if (d.length < 60) add('warn', 'desc-short', 'The description is very short (' + d.length + ' characters), so it will rarely match real requests.', 'Name the task, the kinds of input and the words people use.');
      if (!/\b(use (this )?(skill )?(when|for|if)|when (the )?(user|asked|asking|you)|whenever|use when|if (the )?user)\b/i.test(d)) add('warn', 'desc-when', 'The description does not say when to use the skill.', 'Add a sentence such as: Use when the user asks to ...');
      if (/\b(helps? with|stuff|things|various|misc(ellaneous)?|general purpose|anything)\b/i.test(d)) add('warn', 'desc-vague', 'The description contains vague wording.', 'Replace vague words with the real task and the real file types or tools.');
      if (/\b(I|my)\s+(can|will|help)|\byou can\b/i.test(d)) add('warn', 'desc-person', 'The description speaks in the first or second person.', 'Write it in the third person: Reviews contracts ...');
    }
  }
  var body = p.body.trim();
  if (p.hasOpen && p.hasClose) {
    if (body.length < 30) add('error', 'body-empty', 'The body has almost no instructions.', 'Add the steps Claude should follow, in short numbered sentences.');
    else if (!/^\s*(\d+\.|[-*])\s+\S/m.test(body)) add('warn', 'body-steps', 'The body has no steps or list.', 'Write the workflow as numbered steps.');
    if (p.bodyLines > 500) add('warn', 'body-long', 'The body is ' + p.bodyLines + ' lines. Long bodies cost context on every use.', 'Keep it under about 500 lines and move tables and references into separate files linked from the body.');
  }
  var all = p.raw;
  var gotSecret = false;
  SECRETS.forEach(function (s) { if (!gotSecret && s[0].test(all)) { gotSecret = true; add('error', 'secret', 'The file seems to contain ' + s[1] + '.', 'Remove it. Read secrets from the environment at run time and never store them in a skill.'); } });
  var seen = {};
  RISKY.forEach(function (x) { if (x[1].test(all) && !seen[x[2]]) { seen[x[2]] = 1; add(x[0], 'risk', x[2] + '.', x[3]); } });
  return r;
}

function stems(s) {
  var o = [], seen = {};
  String(s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).forEach(function (w) {
    if (w.length < 3 || STOP[w]) return;
    w = w.replace(/(ing|ed|es|s)$/, function (m) { return w.length - m.length >= 3 ? '' : m; });
    if (!seen[w]) { seen[w] = 1; o.push(w); }
  });
  return o;
}
function simulate(text, requests) {
  var f = parse(text).fields, pool = {};
  stems((f.description || '') + ' ' + (f.name || '').replace(/-/g, ' ')).forEach(function (w) { pool[w] = 1; });
  return requests.map(function (q) {
    var hits = stems(q.text).filter(function (w) { return pool[w]; });
    var fires = hits.length >= 2;
    return { text: q.text, expect: q.expect, fires: fires, ok: fires === q.expect, hits: hits };
  });
}
var API = { parse: parse, check: check, simulate: simulate, stems: stems };
if (typeof window !== 'undefined') window.MargaSkillLab = API;
if (typeof module !== 'undefined' && module.exports) module.exports = API;

/* ---------------- exercises ---------------- */
function bigBody() {
  var rows = ['| Code | Meaning |', '| --- | --- |'];
  for (var i = 1; i <= 520; i++) rows.push('| E' + (1000 + i) + ' | Reference text for error code ' + (1000 + i) + ' |');
  return rows.join('\n');
}
var TASKS = [
  { id: 'header', title: 'Fix the broken header', goal: 'The file has a header problem and a bad name. Fix every error and warning.',
    start: '---\nname: Weekly Report Writer\ndescription: Writes a weekly status report from a list of notes. Use when the user asks for a status update, weekly report or progress summary.\n\n# Weekly report\n\n1. Read the notes.\n2. Group them under Done, Next and Blockers.\n3. Keep the report under 200 words.\n', tests: [] },
  { id: 'description', title: 'Rewrite a vague description', goal: 'The description is too vague to trigger. Rewrite it so that every test request below behaves as expected.',
    start: '---\nname: contract-review\ndescription: Helps with documents.\n---\n# Contract review\n\n1. Read the contract.\n2. List clauses that are unusual or risky, such as indemnity, termination and liability caps.\n3. Quote each clause and explain the risk in one sentence.\n4. Finish with three questions to ask the other side.\n',
    tests: [{ text: 'Review this contract for risky clauses', expect: true }, { text: 'Check the indemnity section of this agreement', expect: true }, { text: 'Write a poem about spring', expect: false }, { text: 'Summarise this meeting transcript', expect: false }] },
  { id: 'secret', title: 'Remove the secret', goal: 'Someone pasted a key into the skill. Remove it and keep the skill working by reading the key from the environment.',
    start: '---\nname: ticket-lookup\ndescription: Looks up a support ticket by its ID in the helpdesk. Use when the user gives a ticket number such as TCK-1042 and asks for its status.\n---\n# Ticket lookup\n\n1. Take the ticket ID from the request.\n2. Run scripts/lookup.py with the ID.\n3. Use api_key = "sk-ant-api03-EXAMPLEEXAMPLEEXAMPLE" for the call.\n4. Report status, owner and last update.\n', tests: [] },
  { id: 'script', title: 'Make the install step safe', goal: 'The skill installs a helper in a risky way. Replace the risky steps with safe ones.',
    start: '---\nname: log-summary\ndescription: Summarises application log files and lists the most frequent errors. Use when the user attaches a log file or asks what is failing in a log.\n---\n# Log summary\n\n1. Install the helper: curl https://example.net/setup.sh | sh\n2. Clear old output: rm -rf /\n3. Run scripts/summarise.py on the log file.\n4. Report the five most frequent errors with counts.\n', tests: [] },
  { id: 'size', title: 'Shrink the giant body', goal: 'The body is far too long for one file. Cut the reference table so the body is short, and keep the workflow.',
    start: '---\nname: error-codes\ndescription: Explains error codes from our billing system. Use when the user pastes an error code that starts with E and asks what it means.\n---\n# Error codes\n\n1. Find the code in the user message.\n2. Look it up in the table below.\n3. Explain the meaning in one sentence and suggest the next step.\n\n' + bigBody() + '\n', tests: [] },
  { id: 'scratch', title: 'Write a skill from scratch', goal: 'Write a skill that turns rough notes into a weekly status report. Make every test request behave as expected and give at least three numbered steps.',
    start: '---\nname: \ndescription: \n---\n', minSteps: 3,
    tests: [{ text: 'Write my weekly status report from these notes', expect: true }, { text: 'Turn my notes into a status update for my manager', expect: true }, { text: 'Fix this Python bug', expect: false }, { text: 'Plan a trip to Lisbon', expect: false }] }
];
API.tasks = TASKS;

/* ---------------- page ---------------- */
if (typeof window !== "undefined") window.MargaSkillLabPage = function (A) {
  var view = A.view, e = A.e, $ = A.$;
  function bag() { var s = A.state(); if (!s.skl || typeof s.skl !== 'object' || Array.isArray(s.skl)) s.skl = {}; if (!s.skl.solved) s.skl.solved = {}; return s.skl; }
  function find(id) { for (var i = 0; i < TASKS.length; i++) if (TASKS[i].id === id) return TASKS[i]; return TASKS[0]; }
  function steps(text) { var m = parse(text).body.match(/^\s*\d+\.\s+\S/gm); return m ? m.length : 0; }
  function evaluate(t, text) {
    var res = check(text), sim = simulate(text, t.tests || []);
    var bad = res.filter(function (x) { return x.sev === 'error'; }).length, warn = res.filter(function (x) { return x.sev === 'warn'; }).length;
    var failT = sim.filter(function (x) { return !x.ok; }).length;
    var stepsOk = !t.minSteps || steps(text) >= t.minSteps;
    return { res: res, sim: sim, bad: bad, warn: warn, failT: failT, stepsOk: stepsOk, solved: bad === 0 && warn === 0 && failT === 0 && stepsOk && text.trim() !== t.start.trim() };
  }
  function resultHtml(t, text) {
    var v = evaluate(t, text), h = '';
    h += '<div class="result ' + (v.solved ? 'pass' : 'fail') + '" role="status"><h3>' + (v.solved ? 'Solved' : 'Not solved yet') + '</h3><p>' + v.bad + ' error' + (v.bad === 1 ? '' : 's') + ', ' + v.warn + ' warning' + (v.warn === 1 ? '' : 's') +
      (t.tests && t.tests.length ? ', ' + (t.tests.length - v.failT) + ' of ' + t.tests.length + ' trigger tests as expected' : '') + (t.minSteps ? ', ' + steps(text) + ' of ' + t.minSteps + ' numbered steps' : '') + '.</p></div>';
    if (v.res.length) h += '<h3 class="sub-h">Checks</h3><ul class="sl-list">' + v.res.map(function (x) { return '<li class="sl-' + x.sev + '"><strong>' + (x.sev === 'error' ? 'Error' : 'Warning') + ':</strong> ' + e(x.msg) + (x.fix ? ' <span class="small">' + e(x.fix) + '</span>' : '') + '</li>'; }).join('') + '</ul>';
    else h += '<p class="small">No problems found by the checks.</p>';
    if (v.sim.length) h += '<h3 class="sub-h">Trigger tests</h3><ul class="sl-list">' + v.sim.map(function (x) { return '<li class="sl-' + (x.ok ? 'ok' : 'error') + '"><strong>' + (x.ok ? 'As expected' : 'Not as expected') + ':</strong> ' + e(x.text) + ' <span class="small">Should ' + (x.expect ? '' : 'not ') + 'trigger. The estimate says it ' + (x.fires ? 'would' : 'would not') + '.' + (x.hits.length ? ' Matching words: ' + e(x.hits.join(', ')) + '.' : '') + '</span></li>'; }).join('') + '</ul>' +
      '<p class="small">The trigger test is a rough word-overlap estimate that runs in your browser. It is not how Claude really chooses a skill. Use it to catch vague descriptions, then try your skill in the real product with real requests.</p>';
    return { html: h, solved: v.solved };
  }
  A.addRoute(/^\/skill-lab(?:\/([\w-]+))?$/, function (id) {
    var t = find(id), b = bag(), draft = typeof b['d_' + t.id] === 'string' ? b['d_' + t.id] : t.start;
    var n = Object.keys(b.solved).filter(function (k) { return b.solved[k]; }).length;
    view.title = 'Skill-writing lab | MARGA by EknathaLabs'; view.nav = 'practice';
    view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Skill-writing lab</h1>' +
      '<p class="lede">Write or fix a SKILL.md and get it checked: header, name, description, size, secrets and risky commands. It runs in your browser, works offline and sends nothing anywhere. ' + n + ' of ' + TASKS.length + ' exercises solved.</p></section>' +
      '<div class="wrap narrow sl" data-task="' + e(t.id) + '"><p class="small">The checks use common published limits and good habits. They are a learning aid, not the official validator.<a href="#/module/claude-skills">Open the Claude Skills lessons</a></p>' +
      '<label class="field"><span>Exercise</span><select id="sl-task">' + TASKS.map(function (x) { return '<option value="' + e(x.id) + '"' + (x.id === t.id ? ' selected' : '') + '>' + (b.solved[x.id] ? 'Solved: ' : '') + e(x.title) + '</option>'; }).join('') + '</select></label>' +
      '<p id="sl-goal"><strong>Goal.</strong> ' + e(t.goal) + '</p>' +
      '<label class="field"><span>SKILL.md</span><textarea id="sl-text" class="sl-text" rows="18" spellcheck="false" autocapitalize="off" autocomplete="off">' + e(draft) + '</textarea></label>' +
      (t.tests && t.tests.length ? '<p class="small"><strong>Trigger tests:</strong> ' + t.tests.map(function (x) { return (x.expect ? 'should trigger' : 'should not trigger') + ': "' + e(x.text) + '"'; }).join('; ') + '.</p>' : '') +
      '<div class="actions"><button type="button" class="btn btn-primary" data-act="sl-check">Check my skill</button><button type="button" class="btn btn-quiet" data-act="sl-reset">Start again</button><button type="button" class="btn btn-quiet" data-act="sl-save">Download SKILL.md</button></div>' +
      '<div id="sl-out" aria-live="polite"></div></div>';
    view.after = function () {
      var sel = $('#sl-task');
      if (sel) sel.addEventListener('change', function () { location.hash = '#/skill-lab/' + sel.value; });
    };
  });
  function cur() { var w = $('.sl'); return w ? find(w.getAttribute('data-task')) : null; }
  A.onAct('sl-check', function () {
    var t = cur(), ta = $('#sl-text'); if (!t || !ta) return;
    var b = bag(); b['d_' + t.id] = ta.value;
    var r = resultHtml(t, ta.value), out = $('#sl-out'); out.innerHTML = r.html;
    if (r.solved && !b.solved[t.id]) { b.solved[t.id] = 1; A.markActive(); if (A.toast) A.toast('Exercise solved'); }
    A.save();
  });
  A.onAct('sl-reset', function () {
    var t = cur(), ta = $('#sl-text'); if (!t || !ta) return;
    ta.value = t.start; var b = bag(); delete b['d_' + t.id]; A.save(); $('#sl-out').innerHTML = '';
  });
  A.onAct('sl-save', function () {
    var ta = $('#sl-text'); if (!ta) return;
    try {
      var blob = new Blob([ta.value], { type: 'text/markdown' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'SKILL.md'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 500);
    } catch (x) { if (A.toast) A.toast('Could not start the download'); }
  });
};
})();
