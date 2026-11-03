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
function draw(cv, name) {
  var s = stats(), c = cv.getContext('2d'), W = 1200, H = 630;
  cv.width = W; cv.height = H;
  c.fillStyle = '#0E1B2C'; c.fillRect(0, 0, W, H);
  c.lineCap = 'round'; c.lineWidth = 22;
  c.strokeStyle = '#1B3550'; c.beginPath(); c.moveTo(480, 660); c.bezierCurveTo(700, 660, 740, 470, 900, 470); c.bezierCurveTo(1060, 470, 1120, 560, 1260, 380); c.stroke();
  c.strokeStyle = '#2FB5AE'; c.beginPath(); c.moveTo(480, 660); c.bezierCurveTo(700, 660, 740, 470, 900, 470); c.stroke();
  c.fillStyle = '#0E1B2C'; c.strokeStyle = '#2FB5AE'; c.lineWidth = 8; c.beginPath(); c.arc(900, 470, 20, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#E6EEF6'; c.font = '800 30px system-ui, sans-serif'; c.textBaseline = 'alphabetic'; c.fillText('MARGA', 56, 80);
  c.font = '500 22px system-ui, sans-serif'; c.fillStyle = '#B7C8DA'; c.textAlign = 'right'; c.fillText('marga.eknathalabs.com', W - 56, 80); c.textAlign = 'left';
  if (name) { c.font = '500 28px system-ui, sans-serif'; c.fillStyle = '#9BE6E1'; c.fillText(name.slice(0, 40), 56, 190); }
  c.fillStyle = '#FFFFFF'; c.font = '800 58px system-ui, sans-serif';
  var words = headline(s).split(' '), line = '', y = 262;
  words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (c.measureText(t).width > 960 && line) { c.fillText(line, 56, y); y += 70; line = w; } else line = t; });
  c.fillText(line, 56, y);
  var items = [[s.lessons, 'lessons passed'], [s.tl, 'terminal labs'], [s.vm, 'real Linux labs']], x = 56;
  items.forEach(function (it) { c.fillStyle = '#FFFFFF'; c.font = '800 46px system-ui, sans-serif'; c.fillText(String(it[0]), x, 500); c.fillStyle = '#B7C8DA'; c.font = '500 20px system-ui, sans-serif'; c.fillText(it[1], x, 530); x += 200; });
  c.fillStyle = '#B7C8DA'; c.font = '500 20px system-ui, sans-serif'; c.fillText('Free. Offline. No sign-up.', 56, 610);
  return s;
}
function sharePanel() {
  return '<section class="sc" aria-labelledby="sc-h"><h2 class="sub-h" id="sc-h">Share your progress</h2><p class="small">Makes a picture on this device. Add a name if you like; it is not saved or sent anywhere.</p>' +
    '<label class="field sc-f"><span>Name on the card (optional)</span><input type="text" id="sc-name" maxlength="40" autocomplete="off"></label>' +
    '<canvas id="sc-cv" class="sc-cv" width="1200" height="630" role="img" aria-label="Progress card preview"></canvas>' +
    '<p class="actions"><button type="button" class="btn btn-primary" id="sc-dl">Download the card (PNG)</button></p></section>';
}
A.afterRoute(function (h) {
  if (h !== '/progress' || $('#sc-cv')) return;
  var host = $('#main .wrap'); if (!host) return;
  host.insertAdjacentHTML('beforeend', sharePanel());
  var cv = $('#sc-cv'), nm = $('#sc-name');
  function paint() { var s = draw(cv, nm.value.trim()); cv.setAttribute('aria-label', 'Progress card: ' + headline(s) + ' ' + plural(s.lessons, 'lesson') + ' passed, ' + plural(s.tl, 'terminal lab') + ', ' + plural(s.vm, 'real Linux lab') + '.'); }
  paint(); nm.addEventListener('input', paint);
  $('#sc-dl').addEventListener('click', function () {
    cv.toBlob(function (b) { if (!b) return; var u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'marga-progress.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000); }, 'image/png');
  });
});
};
