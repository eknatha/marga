/* MARGA Round 32 visual extras: the winding skill map on role roadmaps and the progress share card on the Progress page.
   Both are built in the browser from progress kept on this device. Nothing is sent anywhere. */
window.MargaDesigns = function (A) {
'use strict';
var $ = A.$, e = A.e, D = A.D, PATHS = D.paths.live;

/* ---------------- winding skill map ---------------- */
function modDone(m) { return m.lessons.length > 0 && m.lessons.every(A.isDone); }
function unlocked(m) { return (m.requires || []).every(function (r) { return A.MOD[r] && modDone(A.MOD[r]); }); }
function snake(p) {
  var mods = p.modules.map(function (id) { return A.MOD[id]; }).filter(Boolean), here = null;
  for (var i = 0; i < mods.length; i++) if (!modDone(mods[i]) && unlocked(mods[i])) { here = mods[i]; break; }
  var per = window.matchMedia && matchMedia('(max-width: 640px)').matches ? 3 : 6, rows = [];
  for (var k = 0; k < mods.length; k += per) rows.push(mods.slice(k, k + per));
  var done = mods.filter(modDone).length;
  return '<section class="sn" aria-labelledby="sn-h"><h2 class="sub-h" id="sn-h">The path at a glance</h2><p class="small">' + done + ' of ' + mods.length + ' skills complete. Select a skill to open it.</p>' +
    rows.map(function (row, ri) {
      return '<ol class="sn-row' + (ri % 2 ? ' rev' : '') + '" style="--per:' + per + ';--cnt:' + row.length + '" start="' + (ri * per + 1) + '">' + row.map(function (m, ci) {
        var n = ri * per + ci + 1, full = modDone(m), isHere = m === here, ok = unlocked(m), st = full ? 'Complete' : isHere ? 'You are here' : ok ? 'Ready' : 'Locked';
        return '<li class="sn-n ' + (full ? 'done' : isHere ? 'here' : ok ? 'ready' : 'lock') + '"><a href="#/module/' + e(m.id) + '" aria-label="Step ' + n + ': ' + e(m.title) + ', ' + st + '"><i aria-hidden="true">' + (full ? '&#10003;' : n) + '</i><b>' + e(m.title) + '</b>' + (isHere ? '<em>You are here</em>' : '') + '</a></li>';
      }).join('') + '</ol>';
    }).join('') + '</section>';
}
A.afterRoute(function (h) {
  var m = (h || '').match(/^\/roadmap\/([\w-]+)$/); if (!m || $('.sn')) return;
  var p = PATHS.filter(function (x) { return x.id === m[1]; })[0], host = $('#main .wrap.narrow'); if (!p || !host) return;
  host.insertAdjacentHTML('afterbegin', snake(p));
});

/* ---------------- progress share card ---------------- */
function stats() {
  var S = A.state(), lessons = Object.keys(D.lessons ? {} : {}).length, n = 0;
  Object.keys(A.S ? (A.S().lessons || {}) : {}).forEach(function (k) { if (A.S().lessons[k].done) n++; });
  var vm = Object.keys((S.vm && S.vm.done) || {}).length, tl = Object.keys(S.tl || {}).length;
  var set = {}; (S.days || []).forEach(function (k) { set[k] = 1; });
  function key(d) { var mm = d.getMonth() + 1, dd = d.getDate(); return d.getFullYear() + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd; }
  var d = new Date(), cur = 0; if (!set[key(d)]) d.setDate(d.getDate() - 1); while (set[key(d)]) { cur++; d.setDate(d.getDate() - 1); }
  return { lessons: n, vm: vm, tl: tl, streak: cur };
}
function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
function headline(s) {
  var big = s.vm >= s.tl && s.vm >= s.lessons ? plural(s.vm, 'real Linux lab') + ' fixed' : s.tl >= s.lessons ? plural(s.tl, 'terminal lab') + ' solved' : plural(s.lessons, 'lesson') + ' passed';
  if (!s.vm && !s.tl && !s.lessons) return 'Learning DevOps, one step at a time';
  return big + (s.streak > 1 ? '. ' + s.streak + ' days in a row.' : '.');
}
var THEMES = {
  night: { name: 'Night', bg: '#0E1B2C', bg2: '#12263D', road: '#1B3550', acc: '#2FB5AE', head: '#FFFFFF', mute: '#B7C8DA', name: '#9BE6E1', title: '#E6EEF6' },
  paper: { name: 'Paper', bg: '#F6F3EC', bg2: '#ECE7DB', road: '#DDD6C5', acc: '#B0483A', head: '#1E2A33', mute: '#4A5862', name: '#8C3427', title: '#1E2A33' },
  dawn: { name: 'Dawn', bg: '#2A1B3D', bg2: '#5A2F57', road: '#6B3C63', acc: '#F5B25C', head: '#FFF7EA', mute: '#E6CFE0', name: '#FFD79B', title: '#FFF7EA' }
};
function cloudDone() { var t = A.state().tl || {}; return Object.keys(t).filter(function (k) { return /^cl-/.test(k); }).length; }
function draw(cv, name, opt) {
  opt = opt || {}; var th = THEMES[opt.theme] || THEMES.night, sq = opt.size === 'square';
  var s = stats(), c = cv.getContext('2d'), W = sq ? 1080 : 1200, H = sq ? 1080 : 630, P = 56;
  cv.width = W; cv.height = H;
  var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, th.bg); g.addColorStop(1, th.bg2); c.fillStyle = g; c.fillRect(0, 0, W, H);
  /* the winding road, scaled to the card */
  var ry = sq ? 760 : 470, rb = sq ? 1140 : 660;
  c.lineCap = 'round'; c.lineWidth = 22;
  c.strokeStyle = th.road; c.beginPath(); c.moveTo(W * 0.4, rb); c.bezierCurveTo(W * 0.58, rb, W * 0.62, ry, W * 0.75, ry); c.bezierCurveTo(W * 0.88, ry, W * 0.93, ry + 90, W * 1.05, ry - 90); c.stroke();
  c.strokeStyle = th.acc; c.beginPath(); c.moveTo(W * 0.4, rb); c.bezierCurveTo(W * 0.58, rb, W * 0.62, ry, W * 0.75, ry); c.stroke();
  c.fillStyle = th.bg; c.strokeStyle = th.acc; c.lineWidth = 8; c.beginPath(); c.arc(W * 0.75, ry, 20, 0, 7); c.fill(); c.stroke();
  c.fillStyle = th.title; c.font = '800 30px system-ui, sans-serif'; c.textBaseline = 'alphabetic'; c.fillText('MARGA', P, 80);
  c.font = '500 22px system-ui, sans-serif'; c.fillStyle = th.mute; c.textAlign = 'right'; c.fillText('marga.eknathalabs.com', W - P, 80); c.textAlign = 'left';
  var y0 = sq ? 300 : 190;
  if (name) { c.font = '500 28px system-ui, sans-serif'; c.fillStyle = th.name; c.fillText(name.slice(0, 40), P, y0); }
  c.fillStyle = th.head; c.font = '800 ' + (sq ? 72 : 58) + 'px system-ui, sans-serif';
  var words = headline(s).split(' '), line = '', y = y0 + (sq ? 90 : 72), lh = sq ? 86 : 70, maxw = (sq ? W - 2 * P : 960);
  words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxw && line) { c.fillText(line, P, y); y += lh; line = w; } else line = t; });
  c.fillText(line, P, y);
  var items = [[s.lessons, 'lessons passed'], [s.tl, 'terminal labs'], [cloudDone(), 'cloud labs'], [s.vm, 'real Linux labs']], x = P, by = sq ? 560 : 500;
  var step = sq ? 250 : 215;
  items.forEach(function (it, i) { c.fillStyle = th.head; c.font = '800 46px system-ui, sans-serif'; c.fillText(String(it[0]), x, by); c.fillStyle = th.mute; c.font = '500 20px system-ui, sans-serif'; c.fillText(it[1], x, by + 30); x += step; });
  /* progress bar: terminal labs done out of all */
  var total = (D.termlabs || []).length || 1, frac = Math.min(1, s.tl / total), bw = sq ? W - 2 * P : 520, bx = P, bY = sq ? 680 : 560;
  c.fillStyle = th.road; c.fillRect(bx, bY, bw, 12); c.fillStyle = th.acc; c.fillRect(bx, bY, Math.max(frac > 0 ? 12 : 0, bw * frac), 12);
  c.fillStyle = th.mute; c.font = '500 18px system-ui, sans-serif'; c.fillText(s.tl + ' of ' + total + ' terminal labs', bx, bY + 38);
  if (opt.plan) { c.fillStyle = th.name; c.font = '600 22px system-ui, sans-serif'; c.fillText(opt.plan, P, sq ? 820 : 600); }
  c.fillStyle = th.mute; c.font = '500 20px system-ui, sans-serif'; c.fillText('Free. Offline. No sign-up.', P, H - 28);
  return s;
}
function sharePanel() {
  return '<section class="sc" aria-labelledby="sc-h"><h2 class="sub-h" id="sc-h">Share your progress</h2><p class="small">Makes a picture on this device. Add a name if you like; it is not saved or sent anywhere.</p>' +
    '<label class="field sc-f"><span>Name on the card (optional)</span><input type="text" id="sc-name" maxlength="40" autocomplete="off"></label>' +
    '<div class="sc-opts"><label class="field"><span>Look</span><select id="sc-theme">' + Object.keys(THEMES).map(function (k) { return '<option value="' + k + '">' + THEMES[k].name + '</option>'; }).join('') + '</select></label>' +
    '<label class="field"><span>Shape</span><select id="sc-size"><option value="wide">Wide (for links and posts)</option><option value="square">Square (for chat and feeds)</option></select></label></div>' +
    '<canvas id="sc-cv" class="sc-cv" width="1200" height="630" role="img" aria-label="Progress card preview"></canvas>' +
    '<p class="actions"><button type="button" class="btn btn-primary" id="sc-dl">Download the card (PNG)</button></p></section>';
}
A.afterRoute(function (h) {
  if (h !== '/progress' || $('#sc-cv')) return;
  var host = $('#main .wrap'); if (!host) return;
  host.insertAdjacentHTML('beforeend', sharePanel());
  var cv = $('#sc-cv'), nm = $('#sc-name');
  function paint() { var s = draw(cv, nm.value.trim(), { theme: $('#sc-theme').value, size: $('#sc-size').value }); cv.setAttribute('aria-label', 'Progress card: ' + headline(s) + ' ' + plural(s.lessons, 'lesson') + ' passed, ' + plural(s.tl, 'terminal lab') + ', ' + plural(s.vm, 'real Linux lab') + '.'); }
  paint(); nm.addEventListener('input', paint); $('#sc-theme').addEventListener('change', paint); $('#sc-size').addEventListener('change', paint);
  $('#sc-dl').addEventListener('click', function () {
    cv.toBlob(function (b) { if (!b) return; var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'marga-progress.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000); }, 'image/png');
  });
});
};
