/* MARGA badges: one self-reported completion badge per stage and per path.
   The name is optional, stays in this browser (inside the progress data) and is never sent anywhere.
   The wording is "Completed the MARGA ... stage". It is not a certification. */
(function () {
'use strict';
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
var CAUTION1 = 'Self-reported completion record from MARGA by EknathaLabs. Not a certification, degree or qualification.';
var CAUTION2 = 'The verification code only checks that the name, badge and date match each other. It does not confirm identity.';
var HUES = { linux: 28, bash: 150, python: 52, networking: 195, docker: 212, cicd: 120, kubernetes: 235, terraform: 268, ansible: 352, cloud: 176, databases: 305, observability: 18, sre: 78, security: 332, devops: 215, devsecops: 332 };
/* Each symbol is drawn on a 24 by 24 grid so the shape, not only the colour, tells badges apart. */
var SYM = {
  linux: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 16h5"/>',
  bash: '<path d="M8 4H6v16h2M16 4h2v16h-2M10 9l3 3-3 3"/>',
  python: '<path d="M9 4c-2 0-3 1-3 3v2c0 1-1 2-2 3 1 1 2 2 2 3v2c0 2 1 3 3 3M15 4c2 0 3 1 3 3v2c0 1 1 2 2 3-1 1-2 2-2 3v2c0 2-1 3-3 3"/>',
  networking: '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M11 7l-5 9M13 7l5 9M7 18h10"/>',
  docker: '<rect x="3" y="12" width="5" height="4"/><rect x="9" y="12" width="5" height="4"/><rect x="15" y="12" width="5" height="4"/><rect x="9" y="7" width="5" height="4"/><path d="M2 18c3 3 12 4 19-3"/>',
  cicd: '<path d="M20 12a8 8 0 0 1-14 5M4 12a8 8 0 0 1 14-5"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  kubernetes: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M18.4 5.6l-4.2 4.2M9.8 14.2l-4.2 4.2"/>',
  terraform: '<path d="M4 4l6 3.5v7L4 11zM11 7.5l6-3.5v7l-6 3.5zM11 16.5l6-3.5v7l-6 3.5z"/>',
  ansible: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5a4.5 4.5 0 0 1 .5 9.5z"/>',
  databases: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  observability: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  sre: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  security: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  devops: '<path d="M7 8c-3 0-5 2-5 4s2 4 5 4c4 0 6-8 10-8 3 0 5 2 5 4s-2 4-5 4c-4 0-6-8-10-8z"/>',
  devsecops: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><rect x="9" y="11" width="6" height="5" rx="1"/><path d="M10 11V9a2 2 0 0 1 4 0v2"/>'
};
var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function fnv(str) { var h = 0x811c9dc5; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
function normName(n) { return String(n || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function codeFor(name, id, date) {
  var s = 'MARGA1|' + id + '|' + date + '|' + normName(name);
  var a = fnv('a' + s), b = fnv('b' + s), out = '';
  for (var i = 0; i < 6; i++) out += ALPHA[(a >>> (i * 5)) & 31];
  for (var j = 0; j < 2; j++) out += ALPHA[(b >>> (j * 5)) & 31];
  return 'MG-' + out.slice(0, 4) + '-' + out.slice(4);
}
function isoDate(ms) { var d = ms ? new Date(ms) : new Date(); function p(n) { return (n < 10 ? '0' : '') + n; } return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function longDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? (+m[3]) + ' ' + MONTHS[+m[2] - 1] + ' ' + m[1] : ''; }
function clip(t, n) { t = String(t); return t.length > n ? t.slice(0, n - 1).replace(/\s+$/, '') + '...' : t; }
function wrap(t, n) {
  var words = String(t).split(' '), lines = [], cur = '';
  words.forEach(function (w) { if ((cur + ' ' + w).trim().length > n && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
  if (cur) lines.push(cur); return lines;
}
function pal(dark, key) {
  var h = HUES[key] == null ? 215 : HUES[key];
  return dark
    ? { bg: '#0B1220', side: '#111B2F', ink: '#EAF0FB', text: '#CBD6E8', muted: '#9FB0CB', line: '#364A72', acc: 'hsl(' + h + ',70%,68%)', onacc: '#0B1220', gold: '#E6B94D' }
    : { bg: '#FBF8F1', side: '#EFE9DB', ink: '#0F2547', text: '#1E2B45', muted: '#55627B', line: '#B9B09A', acc: 'hsl(' + h + ',62%,34%)', onacc: '#FFFFFF', gold: '#8A6508' };
}

window.MargaBadges = function (A) {
  var D = A.D, $ = A.$, $$ = A.$$, e = A.e, view = A.view;
  var variant = null; // 'light' | 'dark' chosen on the badge page; null follows the site theme

  /* ----- the badge list ----- */
  function list() {
    var out = [];
    A.MODS.forEach(function (m) { out.push({ id: 'stage-' + m.id, kind: 'stage', key: m.id, title: m.title, word: 'stage', line: 'Completed the MARGA ' + m.title + ' stage', lessons: m.lessons, items: m.lessons.map(function (l) { return A.LES[l].title; }), mod: m }); });
    (A.LIVE || []).forEach(function (p) { out.push({ id: 'path-' + p.id, kind: 'path', key: p.id, title: p.title, word: 'path', line: 'Completed the MARGA ' + p.title + ' path', modules: p.modules, items: p.modules.map(function (mid) { return A.MOD[mid].title; }), path: p }); });
    return out;
  }
  function find(id) { return list().filter(function (b) { return b.id === id; })[0]; }
  function bag() {
    var S = A.state(), b = S.bd;
    if (!b || typeof b !== 'object' || Array.isArray(b)) b = S.bd = {};
    if (typeof b.name !== 'string') b.name = '';
    b.name = b.name.replace(/[\u0000-\u001f<>]/g, '').slice(0, 60);
    if (!b.earned || typeof b.earned !== 'object' || Array.isArray(b.earned)) b.earned = {};
    Object.keys(b.earned).forEach(function (k) { if (!/^(stage|path)-[a-z0-9-]+$/.test(k) || !/^\d{4}-\d{2}-\d{2}$/.test(String(b.earned[k]))) delete b.earned[k]; });
    return b;
  }
  function stageDone(m) { return m.lessons.length > 0 && m.lessons.every(A.isDone); }
  function isComplete(b) { return b.kind === 'stage' ? stageDone(b.mod) : b.modules.every(function (mid) { return stageDone(A.MOD[mid]); }); }
  function doneCount(b) {
    var lessons = b.kind === 'stage' ? b.lessons : [].concat.apply([], b.modules.map(function (mid) { return A.MOD[mid].lessons; }));
    return { done: lessons.filter(A.isDone).length, total: lessons.length };
  }
  function completedOn(b) {
    var L = A.state().lessons, ids = b.kind === 'stage' ? b.lessons : [].concat.apply([], b.modules.map(function (mid) { return A.MOD[mid].lessons; })), t = 0;
    ids.forEach(function (l) { var at = L[l] && L[l].at; if (at && at > t) t = at; });
    return isoDate(t > 946684800000 ? t : 0);
  }
  /* Records any badge whose lessons are all passed. Returns the ids that are new. */
  function check(announce) {
    var bg = bag(), fresh = [];
    list().forEach(function (b) { if (!bg.earned[b.id] && isComplete(b)) { bg.earned[b.id] = completedOn(b); fresh.push(b.id); } });
    if (fresh.length) { A.save(); if (announce) setTimeout(function () { reveal(fresh); }, 450); }
    return fresh;
  }
  window.MargaBadges.check = check;

  /* ----- artwork ----- */
  function medallion(b, p, cx, cy, r, anim) {
    var sym = SYM[b.key] || SYM.cloud, s = r * 1.25 / 24;
    var shape;
    if (b.kind === 'path') {
      var pts = [0, 1, 2, 3, 4, 5].map(function (i) { var a = Math.PI / 3 * i - Math.PI / 2; return (cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1); }).join(' ');
      var pts2 = [0, 1, 2, 3, 4, 5].map(function (i) { var a = Math.PI / 3 * i - Math.PI / 2; return (cx + (r - 14) * Math.cos(a)).toFixed(1) + ',' + (cy + (r - 14) * Math.sin(a)).toFixed(1); }).join(' ');
      shape = '<polygon class="bd-fill" points="' + pts + '" fill="' + p.acc + '"/><polygon class="bd-ring" points="' + pts + '" fill="none" stroke="' + p.gold + '" stroke-width="8" stroke-linejoin="round"/><polygon points="' + pts2 + '" fill="none" stroke="' + p.onacc + '" stroke-opacity=".55" stroke-width="2"/>';
    } else {
      shape = '<circle class="bd-fill" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + p.acc + '"/><circle class="bd-ring" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + p.ink + '" stroke-width="6"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 14) + '" fill="none" stroke="' + p.onacc + '" stroke-opacity=".55" stroke-width="2"/>';
    }
    return shape + '<g class="bd-sym" transform="translate(' + (cx - 12 * s) + ' ' + (cy - 12 * s) + ') scale(' + s + ')" fill="none" stroke="' + p.onacc + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + sym + '</g>';
  }
  /* The full badge as one SVG. It is used on screen and as the source for the PNG and PDF. */
  function badgeSvg(b, opt) {
    opt = opt || {};
    var dark = opt.dark, p = pal(dark, b.key), bg = bag(), name = opt.name != null ? opt.name : bg.name, date = opt.date || bg.earned[b.id] || '';
    var code = codeFor(name, b.id, date);
    var titleLines = wrap(b.title, 30), nameShown = name || 'Name not added';
    var nameSize = nameShown.length > 40 ? 24 : nameShown.length > 28 ? 30 : 38;
    var items = b.items, per = 8, cols = items.length > per ? 2 : 1, shown = items.slice(0, per * 2), more = items.length - shown.length;
    var X = 452, y = 150, t = '';
    t += '<text x="' + X + '" y="92" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="' + p.muted + '" letter-spacing="1">MARGA by EknathaLabs</text>';
    t += '<text x="' + X + '" y="' + y + '" font-family="Georgia, \'Times New Roman\', serif" font-size="30" fill="' + p.text + '">Completed the MARGA</text>';
    titleLines.forEach(function (ln, i) { t += '<text x="' + X + '" y="' + (y + 50 + i * 46) + '" font-family="Georgia, \'Times New Roman\', serif" font-size="42" font-weight="bold" fill="' + p.ink + '">' + esc(ln) + (i === titleLines.length - 1 ? ' ' + b.word : '') + '</text>'; });
    var yn = y + 50 + (titleLines.length - 1) * 46 + 62;
    t += '<text x="' + X + '" y="' + yn + '" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="' + p.muted + '">Awarded to</text>';
    t += '<text x="' + X + '" y="' + (yn + 44) + '" font-family="Georgia, \'Times New Roman\', serif" font-size="' + nameSize + '" fill="' + (name ? p.ink : p.muted) + '"' + (name ? '' : ' font-style="italic"') + '>' + esc(clip(nameShown, 60)) + '</text>';
    t += '<text x="' + X + '" y="' + (yn + 82) + '" font-family="Arial, Helvetica, sans-serif" font-size="19" fill="' + p.text + '">Recorded on ' + esc(longDate(date)) + '</text>';
    var yl = yn + 128;
    t += '<text x="' + X + '" y="' + yl + '" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="' + p.muted + '">' + (b.kind === 'stage' ? 'Lessons passed' : 'Stages completed') + '</text>';
    shown.forEach(function (it, i) { var col = cols === 2 ? Math.floor(i / per) : 0, row = cols === 2 ? i % per : i; t += '<text x="' + (X + col * 350) + '" y="' + (yl + 28 + row * 24) + '" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="' + p.text + '">' + esc(clip(it, 36)) + '</text>'; });
    if (more > 0) t += '<text x="' + (X + 350) + '" y="' + (yl + 28 + per * 24) + '" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="' + p.muted + '">and ' + more + ' more</text>';
    var left = '<rect x="0" y="0" width="400" height="800" fill="' + p.side + '"/>' + medallion(b, p, 200, 270, 128) +
      '<text x="200" y="468" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-size="26" font-weight="bold" fill="' + p.ink + '">' + (b.kind === 'path' ? 'Path badge' : 'Stage badge') + '</text>' +
      '<text x="200" y="498" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="' + p.muted + '">' + esc(b.kind === 'path' ? 'Hexagon, gold rim' : 'Circle') + '</text>' +
      '<text x="30" y="590" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="' + p.muted + '" letter-spacing="1">VERIFICATION CODE</text>' +
      '<text x="30" y="624" font-family="\'Courier New\', monospace" font-size="30" font-weight="bold" fill="' + p.ink + '">' + code + '</text>' +
      '<text x="30" y="662" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="' + p.muted + '">Badge ID: marga.' + esc(b.id.replace('-', '.')) + '</text>';
    var foot = '<line x1="40" y1="716" x2="1160" y2="716" stroke="' + p.line + '" stroke-width="1"/>' +
      '<text x="40" y="746" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="' + p.text + '">' + esc(CAUTION1) + '</text>' +
      '<text x="40" y="770" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="' + p.muted + '">' + esc(CAUTION2) + '</text>';
    var desc = b.line + (name ? ', awarded to ' + name : '') + (date ? ', recorded on ' + longDate(date) : '') + '. Verification code ' + code + '. This is a self-reported completion record, not a certification.';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800" role="img" aria-labelledby="bd-t-' + b.id + ' bd-d-' + b.id + '">' +
      '<title id="bd-t-' + b.id + '">' + esc(b.line) + '</title><desc id="bd-d-' + b.id + '">' + esc(desc) + '</desc>' +
      '<rect width="1200" height="800" fill="' + p.bg + '"/><rect x="10" y="10" width="1180" height="780" fill="none" stroke="' + p.line + '" stroke-width="2"/>' + left + t + foot + '</svg>';
  }
  function miniSvg(b, earned) {
    var p = pal(false, b.key), dark = document.documentElement.getAttribute('data-theme') === 'dark'; p = pal(dark, b.key);
    var m = earned ? medallion(b, p, 60, 60, 46) : medallion(b, { acc: 'none', ink: p.muted, onacc: p.muted, gold: p.muted }, 60, 60, 46);
    return '<svg viewBox="0 0 120 120" width="96" height="96" role="img" aria-label="' + esc(b.title + (b.kind === 'path' ? ' path badge, ' : ' stage badge, ') + (earned ? 'earned' : 'not yet earned')) + '"' + (earned ? '' : ' class="bd-off"') + '>' + m + '</svg>';
  }
  function currentDark() { return variant ? variant === 'dark' : document.documentElement.getAttribute('data-theme') === 'dark'; }

  /* ----- reveal and name prompt (shown the first time a badge is earned) ----- */
  var lastFocus = null;
  function closeDialog() { var r = $('#badge-root'); if (r) r.innerHTML = ''; document.removeEventListener('keydown', trap, true); if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (x) { /* gone */ } } }
  function trap(ev) {
    var box = $('#badge-dlg'); if (!box) return;
    if (ev.key === 'Escape') { ev.preventDefault(); skipName(); return; }
    if (ev.key !== 'Tab') return;
    var f = $$('button, input, a[href]', box).filter(function (x) { return !x.disabled && x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }
  function skipName() { var bg = bag(); if (!bg.asked) { bg.asked = true; A.save(); } closeDialog(); }
  function reveal(ids) {
    var root = $('#badge-root'); if (!root) { root = document.createElement('div'); root.id = 'badge-root'; document.body.appendChild(root); }
    var bs = ids.map(find).filter(Boolean); if (!bs.length) return;
    bs.sort(function (a, b) { return (a.kind === 'path' ? 0 : 1) - (b.kind === 'path' ? 0 : 1); });
    var top = bs[0], bg = bag(), ask = !bg.asked && !bg.name;
    lastFocus = document.activeElement;
    var mini = bs.length > 1 ? '<p class="small">You also earned: ' + bs.slice(1).map(function (b) { return e(b.title); }).join(', ') + '.</p>' : '';
    root.innerHTML = '<div class="modal bd-modal"><div class="modal-back" data-act="badge-skip"></div><div class="modal-box bd-box" id="badge-dlg" role="dialog" aria-modal="true" aria-labelledby="bd-h">' +
      '<div class="bd-reveal" aria-hidden="false">' + badgeSvg(top, { dark: currentDark() }).replace(/width="1200" height="800"/, 'width="100%"') + '</div>' +
      '<h2 id="bd-h">Badge earned: ' + e(top.title) + '</h2><p>' + e(top.line) + '. This is a record you keep for yourself, not a certification.</p>' + mini +
      (ask ? '<form id="bd-name-form" class="bd-form"><label for="bd-name">Add your name to your badges (optional)</label><input id="bd-name" type="text" maxlength="60" autocomplete="name" placeholder="For example: Asha Rao"><p class="small">Your name stays in this browser. It is never sent anywhere. You can change or delete it at any time on the badges page.</p>' +
        '<div class="actions"><button class="btn btn-primary" type="submit">Save name and view badge</button><button class="btn btn-quiet" type="button" data-act="badge-skip">Not now</button></div></form>'
        : '<div class="actions"><a class="btn btn-primary" id="bd-view" href="#/badge/' + e(top.id) + '" data-act="badge-skip">View badge</a><button class="btn btn-quiet" type="button" data-act="badge-skip">Close</button></div>') +
      '</div></div>';
    var form = $('#bd-name-form');
    if (form) form.addEventListener('submit', function (ev) { ev.preventDefault(); var v = $('#bd-name').value; setName(v); bag().asked = true; A.save(); closeDialog(); location.hash = '/badge/' + top.id; });
    document.addEventListener('keydown', trap, true);
    var f = $('#bd-name') || $('#bd-view'); if (f) f.focus();
  }
  A.onAct('badge-skip', function (el) { if (el.tagName === 'A') { var bg = bag(); bg.asked = true; A.save(); closeDialog(); return; } skipName(); });
  function setName(v) { var bg = bag(); bg.name = String(v || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60); A.save(); }

  /* ----- pages ----- */
  var PRIVACY = 'Your name is stored only in this browser, inside your progress data, so it is included when you export and import your progress. It is never sent to a server. Images and PDFs are made in your browser.';
  function nameForm() {
    var bg = bag();
    return '<section class="bd-name" aria-labelledby="bd-nh"><h2 id="bd-nh" class="sub-h">Name on your badges</h2><form id="bd-name-edit" class="bd-form"><label for="bd-name">Your name (optional)</label>' +
      '<input id="bd-name" type="text" maxlength="60" autocomplete="name" value="' + e(bg.name) + '" placeholder="Leave empty to show no name"><div class="actions"><button class="btn btn-primary" type="submit">Save name</button>' +
      '<button class="btn btn-quiet" type="button" data-act="badge-delete-name"' + (bg.name ? '' : ' disabled') + '>Delete my name</button></div><p class="small" role="status" id="bd-name-msg"></p></form><p class="small">' + e(PRIVACY) + '</p></section>';
  }
  function wireName() {
    var f = $('#bd-name-edit'); if (!f) return;
    f.addEventListener('submit', function (ev) { ev.preventDefault(); setName($('#bd-name').value); bag().asked = true; A.save(); $('#bd-name-msg').textContent = bag().name ? 'Name saved in this browser.' : 'No name is shown on your badges.'; A.route(); });
  }
  A.onAct('badge-delete-name', function () { var bg = bag(); bg.name = ''; bg.asked = true; A.save(); A.toast('Your name was deleted from this browser.'); A.route(); });

  function card(b) {
    var earned = bag().earned[b.id], c = doneCount(b);
    return '<li class="bd-card' + (earned ? ' on' : '') + '"><a href="#/badge/' + e(b.id) + '" aria-label="' + e(b.title + ' ' + b.word + ' badge, ' + (earned ? 'earned' : c.done + ' of ' + c.total + ' lessons passed')) + '">' + miniSvg(b, !!earned) +
      '<strong>' + e(b.title) + '</strong><span class="small">' + (earned ? 'Earned ' + e(longDate(earned)) : c.done + ' of ' + c.total + ' lessons') + '</span></a></li>';
  }
  A.addRoute(/^\/badges$/, function () {
    check(false);
    var all = list(), st = all.filter(function (b) { return b.kind === 'stage'; }), pa = all.filter(function (b) { return b.kind === 'path'; }), bg = bag();
    var n = Object.keys(bg.earned).length;
    view.title = 'Badges | MARGA by EknathaLabs'; view.nav = 'practice';
    view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Badges</h1>' +
      '<p class="lede">One badge for each stage you finish and one for each path. You have earned ' + n + ' of ' + all.length + '. A badge is a record you keep for yourself that says you completed a stage on MARGA.</p>' +
      '<p class="bd-caution" role="note"><strong>Please note.</strong> ' + e(CAUTION1) + ' Anyone can make a badge picture, so employers and schools should not treat one as proof.</p>' +
      '<p class="actions"><a class="btn btn-quiet" href="#/badge-check">Check a badge code</a></p></section>' +
      '<div class="wrap"><h2 class="sub-h">Path badges</h2><ul class="bd-grid">' + pa.map(card).join('') + '</ul>' +
      '<h2 class="sub-h">Stage badges</h2><ul class="bd-grid">' + st.map(card).join('') + '</ul>' + nameForm() + '</div>';
    view.after = wireName;
  });
  A.addRoute(/^\/badge\/([\w-]+)$/, function (bid) {
    check(false);
    var b = find(bid);
    if (!b) { view.title = 'Not found | MARGA'; view.nav = 'practice'; view.html = '<section class="page-head wrap"><h1>Badge not found</h1><p><a href="#/badges">See all badges</a></p></section>'; view.after = null; return; }
    var bg = bag(), date = bg.earned[b.id], c = doneCount(b);
    view.title = b.title + ' badge | MARGA by EknathaLabs'; view.nav = 'practice';
    var head = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/badges">Badges</a></nav><h1>' + e(b.title) + ' ' + e(b.word) + ' badge</h1>';
    if (!date) {
      view.html = head + '<p class="lede">Not earned yet. Pass all ' + c.total + ' lesson checks in ' + (b.kind === 'stage' ? 'this stage' : 'every stage of this path') + ' to earn it. You have passed ' + c.done + '.</p>' +
        '<p class="actions"><a class="btn btn-primary" href="#/' + (b.kind === 'stage' ? 'module/' + e(b.key) : 'path/' + e(b.key)) + '">Go to the ' + e(b.word) + '</a></p></section>' +
        '<div class="wrap narrow"><div class="bd-locked">' + miniSvg(b, false) + '<p class="small">' + (b.kind === 'path' ? 'Path badges are hexagons with a gold rim.' : 'Stage badges are circles.') + ' Each one has its own symbol.</p></div></div>';
      view.after = null; return;
    }
    var dark = currentDark(), code = codeFor(bg.name, b.id, date);
    view.html = head + '<p class="lede">' + e(b.line) + '. Recorded on ' + e(longDate(date)) + '.</p></section>' +
      '<div class="wrap"><div class="bd-show" id="bd-show">' + badgeSvg(b, { dark: dark }).replace(/width="1200" height="800"/, 'width="100%"') + '</div>' +
      '<div class="bd-tools"><div class="seg" role="group" aria-label="Badge colours"><button type="button" class="seg-b" data-act="badge-variant" data-v="light" aria-pressed="' + (!dark) + '">Light</button><button type="button" class="seg-b" data-act="badge-variant" data-v="dark" aria-pressed="' + dark + '">Dark</button></div>' +
      '<div class="actions"><button type="button" class="btn btn-primary" data-act="badge-png" data-id="' + e(b.id) + '">Download image (PNG)</button><button type="button" class="btn btn-primary" data-act="badge-pdf" data-id="' + e(b.id) + '">Download PDF</button></div></div>' +
      '<p class="bd-caution" role="note" id="bd-caution"><strong>Before you download or share.</strong> ' + e(CAUTION1) + ' ' + e(CAUTION2) + ' The file contains ' + (bg.name ? 'the name you entered (' + e(bg.name) + ')' : 'no name, because you have not added one') + ', so check it before you share it.</p>' +
      '<p role="status" class="small" id="bd-status"></p>' +
      '<dl class="facts"><div><dt>Verification code</dt><dd><code id="bd-code">' + e(code) + '</code></dd></div><div><dt>Badge ID</dt><dd><code>marga.' + e(b.id.replace('-', '.')) + '</code></dd></div><div><dt>Recorded on</dt><dd>' + e(longDate(date)) + '</dd></div></dl>' +
      '<p class="small">To check a code later, open <a href="#/badge-check">Check a badge code</a> and enter the name, badge and date shown on the picture.</p>' + nameForm() + '</div>';
    view.after = wireName;
  });
  A.onAct('badge-variant', function (el) { variant = el.getAttribute('data-v'); A.route(); });

  A.addRoute(/^\/badge-check$/, function () {
    var all = list();
    view.title = 'Check a badge code | MARGA by EknathaLabs'; view.nav = 'practice';
    view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/badges">Badges</a></nav><h1>Check a badge code</h1>' +
      '<p class="lede">Enter the details printed on a badge. This tool tells you whether the code matches them. It runs in your browser and sends nothing anywhere.</p>' +
      '<p class="bd-caution" role="note"><strong>What a match means.</strong> ' + e(CAUTION2) + ' The way codes are made is public, so anyone can make a matching code. A match does not prove who earned a badge or what they know. Ask to see their work if it matters.</p></section>' +
      '<div class="wrap narrow"><form id="bd-check" class="bd-form"><label for="bc-name">Name on the badge (leave empty if none)</label><input id="bc-name" type="text" maxlength="60" autocomplete="off">' +
      '<label for="bc-badge">Badge</label><select id="bc-badge">' + all.map(function (b) { return '<option value="' + e(b.id) + '">' + e(b.title + ' (' + b.word + ')') + '</option>'; }).join('') + '</select>' +
      '<label for="bc-date">Date recorded on the badge</label><input id="bc-date" type="date" required>' +
      '<label for="bc-code">Verification code</label><input id="bc-code" type="text" maxlength="14" autocomplete="off" placeholder="MG-XXXX-XXXX" required>' +
      '<div class="actions"><button class="btn btn-primary" type="submit">Check</button></div></form><div id="bc-result" role="status" aria-live="polite"></div></div>';
    view.after = function () {
      $('#bd-check').addEventListener('submit', function (ev) {
        ev.preventDefault();
        var want = codeFor($('#bc-name').value, $('#bc-badge').value, $('#bc-date').value), got = $('#bc-code').value.trim().toUpperCase().replace(/\s+/g, '');
        var ok = want === got;
        $('#bc-result').innerHTML = ok
          ? '<p class="bd-res ok"><strong>The code matches these details.</strong> This only shows that the name, badge and date agree with each other. It does not confirm who the person is.</p>'
          : '<p class="bd-res bad"><strong>The code does not match these details.</strong> Check the spelling of the name, the badge and the date, and the characters of the code. Or the details on the picture were changed.</p>';
      });
    };
  });

  /* ----- downloads ----- */
  function render(b, cb, scale, type) {
    var bg = bag(), svg = badgeSvg(b, { dark: type === 'pdf' ? false : currentDark() });
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas'); cv.width = 1200 * scale; cv.height = 800 * scale;
      var ctx = cv.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cb(cv);
    };
    img.onerror = function () { A.toast('Your browser could not draw the badge. Try the other file type.'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return bg;
  }
  function save(blob, filename) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }
  function note() { var s = $('#bd-status'); if (s) s.textContent = 'Downloaded. Remember: this is a self-reported record, not a certification.'; A.toast('Downloaded. This is a self-reported record, not a certification.'); }
  A.onAct('badge-png', function (el) {
    var b = find(el.getAttribute('data-id')); if (!b || !bag().earned[b.id]) return;
    render(b, function (cv) { cv.toBlob(function (blob) { if (!blob) { A.toast('Could not create the image.'); return; } save(blob, 'marga-badge-' + b.id + '.png'); note(); }, 'image/png'); }, 2, 'png');
  });
  function enc(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
  function pdfEsc(s) { return s.replace(/[\\()]/g, function (c) { return '\\' + c; }); }
  /* A one-page PDF: the badge picture as a JPEG, with the caution text added as real text. */
  function buildPdf(jpeg, w, h, title) {
    var W = 841.89, H = 595.28, iw = 735, ih = 490, ix = (W - iw) / 2, iy = 82;
    var chunks = [], offs = [], len = 0;
    function put(x) { var u = typeof x === 'string' ? enc(x) : x; chunks.push(u); len += u.length; }
    function obj(n, body) { offs[n] = len; put(n + ' 0 obj\n' + body + '\nendobj\n'); }
    put('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /XObject << /Im0 5 0 R >> /Font << /F1 6 0 R >> >> /Contents 4 0 R >>');
    var c1 = pdfEsc(CAUTION1), c2 = pdfEsc(CAUTION2);
    var content = 'q ' + iw + ' 0 0 ' + ih + ' ' + ix.toFixed(2) + ' ' + iy + ' cm /Im0 Do Q\nBT /F1 9.5 Tf 0.25 0.25 0.25 rg 53 58 Td (' + c1 + ') Tj ET\nBT /F1 9.5 Tf 0.25 0.25 0.25 rg 53 44 Td (' + c2 + ') Tj ET\n';
    obj(4, '<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream');
    offs[5] = len; put('5 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n'); put(jpeg); put('\nendstream\nendobj\n');
    obj(6, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    obj(7, '<< /Title (' + pdfEsc(title) + ') /Producer (MARGA by EknathaLabs) >>');
    var xref = len, x = 'xref\n0 8\n0000000000 65535 f \n';
    for (var i = 1; i <= 7; i++) x += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n';
    put(x + 'trailer\n<< /Size 8 /Root 1 0 R /Info 7 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    var out = new Uint8Array(len), pos = 0; chunks.forEach(function (c) { out.set(c, pos); pos += c.length; });
    return new Blob([out], { type: 'application/pdf' });
  }
  A.onAct('badge-pdf', function (el) {
    var b = find(el.getAttribute('data-id')); if (!b || !bag().earned[b.id]) return;
    render(b, function (cv) {
      cv.toBlob(function (blob) {
        if (!blob) { A.toast('Could not create the PDF.'); return; }
        var fr = new FileReader();
        fr.onload = function () { save(buildPdf(new Uint8Array(fr.result), cv.width, cv.height, 'MARGA badge: ' + b.title), 'marga-badge-' + b.id + '.pdf'); note(); };
        fr.readAsArrayBuffer(blob);
      }, 'image/jpeg', 0.92);
    }, 1.5, 'pdf');
  });

  /* ----- small pieces used by other pages ----- */
  window.MargaBadges.count = function () { var n = Object.keys(bag().earned).length; return n + ' of ' + list().length + ' earned'; };
  window.MargaBadges.moduleLine = function (mid) {
    var b = find('stage-' + mid); if (!b) return '';
    var d = bag().earned[b.id];
    return '<p class="small bd-line">' + (d ? 'You earned the <a href="#/badge/' + e(b.id) + '">stage badge</a> on ' + e(longDate(d)) + '.' : 'Pass every lesson check to earn the <a href="#/badge/' + e(b.id) + '">stage badge</a>.') + '</p>';
  };
  window.MargaBadges.code = codeFor;
  A.afterRoute(function () { check(false); });
};
})();
