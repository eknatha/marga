/* MARGA motion layer: skill-tree reveal, diagram playback and small micro-interactions.
   Every effect is a response to something the visitor did or to a page loading once. Nothing loops.
   All of it is off under prefers-reduced-motion and the Motion setting in the accessibility panel. */
window.MargaMotion = function (A) {
'use strict';
var $ = A.$, $$ = A.$$;
function calm() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches || /^(off|reduce)$/.test(document.documentElement.getAttribute('data-a-motion') || ''); } catch (x) { return false; } }

/* ---------------- skill-tree reveal: tiers appear in order, then the links fade in ---------------- */
A.afterRoute(function () {
  var tr = $('.tree'); if (!tr || calm()) return;
  var i = 0; $$('.node', tr).forEach(function (n) { n.style.setProperty('--rv', String(i++)); });
  tr.classList.add('rv');
  setTimeout(function () { if (tr) tr.classList.remove('rv'); }, 600 + i * 70 + 900);
});

/* ---------------- count-up for the numbers on the home page ---------------- */
function countUp(el) {
  var raw = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild.nodeValue : ''; var to = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  if (!to || to < 2 || to > 99999) return; var t0 = null, txt = raw.match(/[0-9,]+/); if (!txt) return;
  function tick(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 700), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.firstChild.nodeValue = raw.replace(txt[0], String(v).replace(/\B(?=(\d{3})+(?!\d))/g, txt[0].indexOf(',') >= 0 ? ',' : '')); if (k < 1) requestAnimationFrame(tick); else el.firstChild.nodeValue = raw; }
  requestAnimationFrame(tick);
}
A.afterRoute(function (h) { if (h !== '/' || calm()) return; $$('.stats b, .today dd').forEach(countUp); });

/* ---------------- diagram playback: a Play button that walks the numbered flow with a short pause on each arrow ---------------- */
var players = new WeakMap();
function edgesOf(fig) { return (fig.getAttribute('data-edges') || '').split(';').filter(Boolean).map(function (s) { var p = s.split('>'); return { a: p[0], b: p[1] }; }); }
function lit(fig) {
  var n = parseInt(fig.getAttribute('data-step') || '0', 10), ed = edgesOf(fig)[n - 1];
  $$('.dg-node', fig).forEach(function (b) { var id = b.getAttribute('data-id'); b.classList.toggle('dg-on', !!ed && (id === ed.a || id === ed.b)); b.classList.toggle('dg-from', !!ed && id === ed.a); });
}
function stop(fig, btn) { var p = players.get(fig); if (p) { clearInterval(p); players.delete(fig); } btn = btn || $('[data-act="dg-play"]', fig); if (btn) { btn.textContent = 'Play'; btn.setAttribute('aria-pressed', 'false'); } }
function play(btn) {
  var fig = btn.closest('.dg'); if (!fig) return;
  if (players.has(fig)) { stop(fig, btn); return; }
  var N = edgesOf(fig).length, nx = $('[data-act="dg-next"]', fig); if (!nx) return;
  btn.textContent = 'Pause'; btn.setAttribute('aria-pressed', 'true');
  nx.click();
  lit(fig);
  var gap = calm() ? 2600 : 1700;
  players.set(fig, setInterval(function () {
    if (!document.body.contains(fig)) { stop(fig); return; }
    var n = parseInt(fig.getAttribute('data-step') || '0', 10);
    if (n >= N) { stop(fig, btn); return; }
    nx.click(); lit(fig);
  }, gap));
}
A.onAct('dg-play', play);
function addPlay(fig) {
  var bar = $('.dg-step', fig); if (!bar || $('[data-act="dg-play"]', bar)) return;
  var nx = $('[data-act="dg-next"]', bar); if (!nx) return;
  nx.insertAdjacentHTML('afterend', '<button type="button" class="btn btn-primary dg-play" data-act="dg-play" aria-pressed="false">Play</button>');
}
var q = 0; function sweep() { if (q) return; q = setTimeout(function () { q = 0; $$('#main .dg').forEach(addPlay); }, 120); }
A.afterRoute(function () { sweep(); setTimeout(sweep, 400); });
try { new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) if (m[i].addedNodes && m[i].addedNodes.length) { sweep(); return; } }).observe(document.getElementById('main') || document.body, { childList: true, subtree: true }); } catch (x) { /* ignore */ }
document.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('[data-act="dg-next"],[data-act="dg-prev"]'); if (b) { var fig = b.closest('.dg'); if (fig) { if (ev.isTrusted) stop(fig); setTimeout(function () { lit(fig); }, 60); } } }, true);
A.afterRoute(function () { $$('.dg').forEach(function (f) { stop(f); }); });

/* ---------------- a small celebration when a lesson check is passed ---------------- */
function burst(host) {
  if (calm() || !host) return;
  var wrap = document.createElement('div'); wrap.className = 'burst'; wrap.setAttribute('aria-hidden', 'true');
  var cols = ['#1fb6a6', '#f2b84b', '#e2574c', '#6a8dff', '#9be6e1'];
  for (var i = 0; i < 26; i++) { var s = document.createElement('i'); var a = (i / 26) * Math.PI * 2 + Math.random() * 0.4, d = 60 + Math.random() * 90; s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', (Math.sin(a) * d - 30) + 'px'); s.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg'); s.style.background = cols[i % cols.length]; s.style.animationDelay = (Math.random() * 80) + 'ms'; wrap.appendChild(s); }
  host.style.position = host.style.position || 'relative'; host.appendChild(wrap); setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 1500);
}
try { new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) for (var j = 0; j < m[i].addedNodes.length; j++) { var n = m[i].addedNodes[j]; if (n.nodeType === 1 && n.classList && n.classList.contains('result') && n.classList.contains('pass')) burst(n); } }).observe(document.getElementById('main') || document.body, { childList: true, subtree: true }); } catch (x) { /* ignore */ }
};
