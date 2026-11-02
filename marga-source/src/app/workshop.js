/* MARGA embed and workshop modes.
   Embed: a bare page for one lesson, one challenge or one Linux lab, made to sit in an iframe on a blog, a wiki or a course page.
   Workshop: a teacher picks lessons, challenges and labs, gets one link and a printable handout. Each learner sees the agenda with their own ticks.
   A learner can make a short progress code and give it to the teacher, who pastes the codes to see who finished what.
   No server, no account, no tracking: the link holds the agenda, the code holds the ticks. A code is a note, not proof. */
window.MargaWorkshop = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, view = A.view, D = A.D;
var SITE = 'https://' + (D.domain || 'marga.eknathalabs.com') + '/';

/* ---------------------------------------------------------------- embed chrome */
A.afterRoute(function (h) { document.body.classList.toggle('embed', /^\/embed\/(lesson|challenge|linux)\//.test(h || '')); });
function foot(href) { return '<p class="embed-foot small">From <a href="' + e(href) + '" target="_blank" rel="noopener">MARGA by EknathaLabs</a>. Free, works offline, no sign-up.</p>'; }

function embedLesson(mod, slug) {
  var id = mod + '/' + slug, l = A.LES[id], here = location.hash;
  view.nav = 'learn'; view.after = null; view.cleanup = null; view.voice = '';
  if (!l) { view.title = 'Not found | MARGA'; view.html = '<section class="wrap"><h1>That lesson does not exist</h1></section>'; return; }
  view.title = l.title + ' | MARGA by EknathaLabs';
  if (!A.isLoaded(mod)) {
    view.html = '<section class="page-head wrap"><h1>' + e(l.title) + '</h1><p class="lede" role="status">Loading the lesson.</p></section>';
    A.loadModule(mod).then(function () { if (location.hash === here) A.route(); }, function () { var n = $('#main .lede'); if (n) n.textContent = 'The lesson could not load. Check your connection and reload.'; });
    return;
  }
  var l2 = A.LES[id];
  view.html = '<article class="wrap narrow lesson embed-lesson"><h1>' + e(l2.title) + '</h1><p class="lede">' + e(l2.summary) + '</p><div class="prose">' + l2.html + '</div>' +
    '<p class="actions"><a class="btn btn-primary" href="' + e(SITE) + '#/lesson/' + e(id) + '" target="_blank" rel="noopener">Take the lesson check on MARGA</a></p>' + foot(SITE) + '</article>';
}
function embedChallenge(cid) {
  view.nav = 'practice'; view.after = null; view.cleanup = null; view.voice = '';
  var c = (D.challenges || []).filter(function (x) { return x.id === cid; })[0];
  if (!c) { view.title = 'Not found | MARGA'; view.html = '<section class="wrap"><h1>That challenge does not exist</h1></section>'; return; }
  view.title = c.title + ' | MARGA by EknathaLabs';
  view.html = '<section class="wrap narrow diy embed-diy"><h1>' + e(c.title) + '</h1><div id="diy">' + A.challengeUi.item(c) + '</div>' + foot(SITE + '#/lesson/' + c.lesson) + '</section>';
  view.after = function () { A.challengeUi.wire($('#diy')); };
}
function embedLinux(id) {
  A.vmLabs.view(id); view.title = view.title.replace('Real Linux lab', 'Real Linux lab (embedded)');
  view.html += foot(SITE + '#/linux/' + id);
}

/* ---------------------------------------------------------------- item catalogue */
/* kinds: l lesson, c challenge, v real Linux lab, t simulated terminal lab */
function lookup(k, id) {
  if (k === 'l') { var l = A.LES[id]; return l ? { title: l.title, href: A.hrefLesson(id), done: A.isDone(id), kind: 'Lesson', min: l.minutes || 10 } : null; }
  if (k === 'c') { var c = (D.challenges || []).filter(function (x) { return x.id === id; })[0]; return c ? { title: c.title, href: '#/lesson/' + c.lesson, done: A.challenges.done(id), kind: 'Challenge', min: 5 } : null; }
  if (k === 'v') { var v = A.vmLabs.find(id); return v ? { title: v.title, href: '#/linux/' + id, done: A.vmLabs.done(id), kind: 'Real Linux lab', min: v.minutes } : null; }
  if (k === 't') { var t = (D.termlabs || []).filter(function (x) { return x.id === id; })[0]; return t ? { title: t.title, href: '#/terminal-lab/' + id, done: !!((A.state().tl || {})[id] && A.state().tl[id].d), kind: 'Terminal lab', min: t.minutes } : null; }
  return null;
}
function parseItems(s) { return String(s || '').split(',').map(function (x) { var i = x.indexOf(':'); return i > 0 ? { k: x.slice(0, i), id: x.slice(i + 1) } : null; }).filter(function (x) { return x && /^[lcvt]$/.test(x.k) && /^[a-z0-9\/-]+$/.test(x.id); }); }
function q(h) { var o = {}, i = h.indexOf('?'); if (i < 0) return o; h.slice(i + 1).split('&').forEach(function (p) { var kv = p.split('='); if (kv[0]) { try { o[kv[0]] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); } catch (x) { o[kv[0]] = kv[1] || ''; } } }); return o; }
function link(title, mins, items) { return '#/workshop/run?t=' + encodeURIComponent(title) + (mins ? '&m=' + mins : '') + '&i=' + items.map(function (x) { return x.k + ':' + x.id; }).join(','); }
function b64(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
function key(items) { var h = 0, s = items.map(function (x) { return x.k + x.id; }).join('|'); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h.toString(36); }
function copy(text, ok) {
  function fb() { var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var r = false; try { r = document.execCommand('copy'); } catch (x) { r = false; } t.remove(); ok(r); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { ok(true); }, fb); else fb();
}

/* ---------------------------------------------------------------- embed builder */
function embedIndex() {
  view.title = 'Embed a lesson, challenge or lab | MARGA by EknathaLabs'; view.nav = 'practice'; view.cleanup = null; view.voice = '';
  var opts = [['lesson', 'A lesson (read only)'], ['challenge', 'A challenge'], ['linux', 'A real Linux lab']];
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Embed MARGA on your page</h1><p class="lede">Put one lesson, one challenge or one real Linux lab into a blog, a wiki or a course page. You get a small piece of HTML to paste. It is free. There is no tracking and no sign-up.</p></section>' +
    '<div class="wrap narrow"><label class="field"><span>What to embed</span><select id="em-kind">' + opts.map(function (o) { return '<option value="' + o[0] + '">' + e(o[1]) + '</option>'; }).join('') + '</select></label>' +
    '<label class="field"><span>Which one</span><select id="em-item"></select></label>' +
    '<label class="field"><span>Height in pixels</span><input type="number" id="em-h" value="640" min="300" max="2000"></label>' +
    '<h2 class="sub-h">HTML to paste</h2><textarea id="em-code" class="diy-ta" rows="4" readonly aria-label="HTML to paste"></textarea>' +
    '<p class="actions"><button type="button" class="btn btn-primary" id="em-copy">Copy the HTML</button> <a class="btn btn-quiet" id="em-open" href="#/" target="_blank" rel="noopener">Open the preview in a new tab</a></p>' +
    '<p class="small">The page hides the MARGA menus and shows a small credit line. Progress is saved in the visitor\'s own browser, for the MARGA site, not for your page. Real Linux labs need a browser with WebAssembly and about 5 MB the first time.</p></div>';
  view.after = function () {
    var kind = $('#em-kind'), item = $('#em-item');
    function fill() {
      var k = kind.value, rows = [];
      if (k === 'lesson') rows = A.MODS.reduce(function (a, m) { return a.concat(m.lessons.map(function (id) { return [id, m.title + ': ' + A.LES[id].title]; })); }, []);
      else if (k === 'challenge') rows = (D.challenges || []).map(function (c) { return [c.id, c.title]; });
      else rows = (D.vmlabs || []).map(function (x) { return [x.id, x.title]; });
      item.innerHTML = rows.map(function (r) { return '<option value="' + e(r[0]) + '">' + e(r[1]) + '</option>'; }).join('');
      show();
    }
    function show() {
      var url = SITE + '#/embed/' + kind.value + '/' + item.value, h = Math.max(300, Math.min(2000, +$('#em-h').value || 640));
      $('#em-code').value = '<iframe src="' + url + '" title="' + (item.options[item.selectedIndex] ? item.options[item.selectedIndex].text.replace(/"/g, '') : 'MARGA') + '" width="100%" height="' + h + '" style="border:1px solid #c8d0dc;border-radius:8px" loading="lazy"></iframe>';
      $('#em-open').setAttribute('href', '#/embed/' + kind.value + '/' + item.value);
    }
    kind.addEventListener('change', fill); item.addEventListener('change', show); $('#em-h').addEventListener('input', show);
    $('#em-copy').addEventListener('click', function () { copy($('#em-code').value, function (ok) { A.toast(ok ? 'HTML copied.' : 'Copy failed. Select the text and copy it.'); }); });
    fill();
  };
}

/* ---------------------------------------------------------------- workshop builder */
function builderView() {
  view.title = 'Run a workshop | MARGA by EknathaLabs'; view.nav = 'practice'; view.cleanup = null; view.voice = '';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Run a workshop or class</h1><p class="lede">Pick lessons, challenges and labs. You get one link for your learners and a printable handout. Each learner sees their own ticks. Learners can give you a short progress code, and you paste the codes to see who finished what. No server, no account.</p></section>' +
    '<div class="wrap narrow ws-build"><label class="field"><span>Workshop title</span><input type="text" id="ws-title" value="Linux troubleshooting workshop" maxlength="80"></label>' +
    '<label class="field"><span>Time box in minutes (optional)</span><input type="number" id="ws-min" min="0" max="600" value="90"></label>' +
    '<h2 class="sub-h">Add items</h2><div class="ws-pick"><label class="field"><span>Type</span><select id="ws-kind"><option value="l">Lesson</option><option value="c">Challenge</option><option value="v">Real Linux lab</option><option value="t">Simulated terminal lab</option></select></label>' +
    '<label class="field"><span>Item</span><select id="ws-item"></select></label><p class="actions"><button type="button" class="btn btn-quiet" id="ws-add">Add to the agenda</button></p></div>' +
    '<h2 class="sub-h">Agenda</h2><ol id="ws-list" class="ws-list"></ol><p class="small" id="ws-empty">Nothing added yet.</p>' +
    '<div class="actions"><button type="button" class="btn btn-primary" id="ws-make">Make the link</button></div><div id="ws-out" role="status" aria-live="polite"></div></div>';
  view.after = function () {
    var items = [];
    function rowsFor(k) {
      if (k === 'l') return A.MODS.reduce(function (a, m) { return a.concat(m.lessons.map(function (id) { return [id, m.title + ': ' + A.LES[id].title]; })); }, []);
      if (k === 'c') return (D.challenges || []).map(function (c) { return [c.id, c.title]; });
      if (k === 'v') return (D.vmlabs || []).map(function (x) { return [x.id, x.title]; });
      return (D.termlabs || []).map(function (x) { return [x.id, x.title]; });
    }
    function fill() { $('#ws-item').innerHTML = rowsFor($('#ws-kind').value).map(function (r) { return '<option value="' + e(r[0]) + '">' + e(r[1]) + '</option>'; }).join(''); }
    function draw() {
      $('#ws-empty').hidden = items.length > 0;
      $('#ws-list').innerHTML = items.map(function (x, i) { var m = lookup(x.k, x.id); return '<li><span>' + e(m ? m.title : x.id) + ' <span class="small">' + e(m ? m.kind : '') + '</span></span> <span class="ws-btns"><button type="button" class="btn btn-quiet" data-up="' + i + '" aria-label="Move up">Up</button><button type="button" class="btn btn-quiet" data-down="' + i + '" aria-label="Move down">Down</button><button type="button" class="btn btn-quiet" data-del="' + i + '" aria-label="Remove">Remove</button></span></li>'; }).join('');
    }
    $('#ws-kind').addEventListener('change', fill);
    $('#ws-add').addEventListener('click', function () { var k = $('#ws-kind').value, id = $('#ws-item').value; if (!id) return; if (items.some(function (x) { return x.k === k && x.id === id; })) { A.toast('Already in the agenda.'); return; } items.push({ k: k, id: id }); draw(); });
    $('#ws-list').addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      var u = b.getAttribute('data-up'), d = b.getAttribute('data-down'), x = b.getAttribute('data-del');
      if (u !== null && +u > 0) { var t = items[+u - 1]; items[+u - 1] = items[+u]; items[+u] = t; }
      else if (d !== null && +d < items.length - 1) { var t2 = items[+d + 1]; items[+d + 1] = items[+d]; items[+d] = t2; }
      else if (x !== null) items.splice(+x, 1);
      draw();
    });
    $('#ws-make').addEventListener('click', function () {
      if (!items.length) { A.toast('Add at least one item.'); return; }
      var title = ($('#ws-title').value || 'Workshop').trim().slice(0, 80), mins = Math.max(0, Math.min(600, +$('#ws-min').value || 0));
      var rel = link(title, mins, items), full = SITE + rel;
      $('#ws-out').innerHTML = '<h2 class="sub-h">Your workshop</h2><p>Share this link with your learners:</p><textarea class="diy-ta" rows="3" readonly id="ws-url" aria-label="Workshop link">' + e(full) + '</textarea>' +
        '<p class="actions"><button type="button" class="btn btn-primary" id="ws-copy">Copy the link</button> <a class="btn btn-quiet" href="' + e(rel) + '">Open the agenda</a></p>';
      $('#ws-copy').addEventListener('click', function () { copy(full, function (ok) { A.toast(ok ? 'Link copied.' : 'Copy failed. Select the link and copy it.'); }); });
    });
    fill(); draw();
  };
}

/* ---------------------------------------------------------------- workshop agenda */
function runView(hash) {
  var p = q(hash), items = parseItems(p.i).filter(function (x) { return lookup(x.k, x.id); }), title = (p.t || 'Workshop').slice(0, 80), mins = Math.max(0, Math.min(600, +p.m || 0));
  view.title = title + ' | Workshop | MARGA by EknathaLabs'; view.nav = 'practice'; view.cleanup = null; view.voice = '';
  if (!items.length) { view.html = '<section class="page-head wrap"><h1>This workshop link has no items</h1><p class="lede"><a href="#/workshop">Make a workshop</a>.</p></section>'; view.after = null; return; }
  var meta = items.map(function (x) { return lookup(x.k, x.id); }), total = meta.reduce(function (n, m) { return n + (m.min || 0); }, 0), k = key(items);
  var done = meta.filter(function (m) { return m.done; }).length;
  view.html = '<section class="page-head wrap ws-run"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/workshop">Run a workshop</a></nav><h1>' + e(title) + '</h1>' +
    '<p class="lede">' + items.length + ' items, about ' + total + ' minutes of work' + (mins ? ', time box ' + mins + ' minutes' : '') + '. Your ticks come from your own progress on this device.</p><p class="small" id="ws-prog">' + done + ' of ' + items.length + ' done</p></section>' +
    '<div class="wrap narrow ws-run">' + (mins ? '<div class="ws-timer"><p class="ws-clock" id="ws-clock" aria-live="off">' + String(mins).padStart(2, '0') + ':00</p><p class="actions"><button type="button" class="btn btn-quiet" id="ws-t-go">Start the timer</button><button type="button" class="btn btn-quiet" id="ws-t-reset">Reset</button></p><p class="small" id="ws-t-note" role="status" aria-live="polite"></p></div>' : '') +
    '<ol class="ws-agenda">' + meta.map(function (m, i) { return '<li class="ws-item' + (m.done ? ' is-done' : '') + '"><span class="ws-box" aria-hidden="true">' + (m.done ? 'Done' : '') + '</span> <a href="' + e(m.href) + '">' + e(m.title) + '</a> <span class="small">' + e(m.kind) + ', about ' + m.min + ' min' + (m.done ? ', done' : '') + '</span></li>'; }).join('') + '</ol>' +
    '<h2 class="sub-h">Give your teacher a progress code</h2><label class="field"><span>Your name</span><input type="text" id="ws-name" maxlength="40" autocomplete="off"></label>' +
    '<p class="actions"><button type="button" class="btn btn-primary" id="ws-code-btn">Make my progress code</button></p><textarea class="diy-ta" id="ws-code" rows="3" readonly hidden aria-label="Your progress code"></textarea><p class="small">The code lists which items you ticked. It is a note you choose to share, not proof of learning.</p>' +
    '<details class="ws-teacher"><summary>For the teacher: read progress codes</summary><label class="field"><span>Paste one code per line</span><textarea id="ws-codes" class="diy-ta" rows="5"></textarea></label><p class="actions"><button type="button" class="btn btn-quiet" id="ws-read">Show the class table</button> <button type="button" class="btn btn-quiet" data-act="print">Print the handout</button></p><div id="ws-table"></div></details></div>';
  view.after = function () {
    var timer = null, left = mins * 60;
    function clock() { var m = Math.floor(left / 60), s = left % 60; $('#ws-clock').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }
    if (mins) {
      $('#ws-t-go').addEventListener('click', function () {
        if (timer) { clearInterval(timer); timer = null; $('#ws-t-go').textContent = 'Resume the timer'; return; }
        $('#ws-t-go').textContent = 'Pause the timer';
        timer = setInterval(function () { left = Math.max(0, left - 1); clock(); if (left === 0) { clearInterval(timer); timer = null; $('#ws-t-note').textContent = 'Time is up.'; $('#ws-t-go').textContent = 'Start the timer'; } }, 1000);
      });
      $('#ws-t-reset').addEventListener('click', function () { if (timer) clearInterval(timer); timer = null; left = mins * 60; clock(); $('#ws-t-go').textContent = 'Start the timer'; $('#ws-t-note').textContent = ''; });
    }
    $('#ws-code-btn').addEventListener('click', function () {
      var bits = meta.map(function (m) { return m.done ? '1' : '0'; }).join(''), name = ($('#ws-name').value || 'Learner').trim().slice(0, 40);
      var c = b64(JSON.stringify({ n: name, w: k, d: bits })); var t = $('#ws-code'); t.hidden = false; t.value = c; t.select();
      copy(c, function (ok) { A.toast(ok ? 'Code copied. Send it to your teacher.' : 'Select the code and copy it.'); });
    });
    $('#ws-read').addEventListener('click', function () {
      var rows = $('#ws-codes').value.split(/\s+/).filter(Boolean).map(function (c) { try { var o = JSON.parse(unb64(c)); return o && typeof o.n === 'string' && typeof o.d === 'string' ? o : { bad: true }; } catch (x) { return { bad: true }; } });
      if (!rows.length) { $('#ws-table').innerHTML = '<p>Paste at least one code.</p>'; return; }
      $('#ws-table').innerHTML = '<div class="table-wrap"><table><thead><tr><th scope="col">Name</th><th scope="col">Done</th>' + meta.map(function (m, i) { return '<th scope="col" title="' + e(m.title) + '">' + (i + 1) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (o) {
          if (o.bad) return '<tr><td colspan="' + (meta.length + 2) + '">This code could not be read.</td></tr>';
          if (o.w !== k) return '<tr><td>' + e(o.n) + '</td><td colspan="' + (meta.length + 1) + '">This code is from a different workshop.</td></tr>';
          var n = (o.d.match(/1/g) || []).length;
          return '<tr><th scope="row">' + e(o.n) + '</th><td>' + n + ' of ' + meta.length + '</td>' + meta.map(function (m, i) { return '<td>' + (o.d.charAt(i) === '1' ? 'Yes' : 'No') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div><p class="small">Column numbers match the agenda order: ' + meta.map(function (m, i) { return (i + 1) + ' ' + e(m.title); }).join('; ') + '.</p>';
    });
    view.cleanup = function () { if (timer) clearInterval(timer); };
  };
}

A.addRoute(/^\/embed$/, embedIndex);
A.addRoute(/^\/embed\/lesson\/([\w-]+)\/([\w-]+)$/, embedLesson);
A.addRoute(/^\/embed\/challenge\/([\w-]+)$/, embedChallenge);
A.addRoute(/^\/embed\/linux\/([a-z0-9-]+)$/, embedLinux);
A.addRoute(/^\/workshop$/, builderView);
A.addRoute(/^\/workshop\/run(\?.*)?$/, function () { return runView(location.hash.replace(/^#/, '')); });
};
