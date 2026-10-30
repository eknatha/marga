/* MARGA diagram system: draws numbered, arrowed flows on top of the lesson diagram blocks.
   The build already gives every component a kind (client, service, queue, store, and so on), a colour and a text label.
   This file measures the real layout, then replaces the plain fallback lines with arrows clipped to the node edges,
   a number on each arrow for the order of the flow, optional edge labels, and an optional animated flow. */
window.MargaDiagrams = function (A) {
'use strict';
var NS = 'http://www.w3.org/2000/svg', $ = A.$, $$ = A.$$;
function still() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches || /^(off|reduce)$/.test(document.documentElement.getAttribute('data-a-motion') || ''); } catch (x) { return false; } }
function el(name, attrs, text) { var n = document.createElementNS(NS, name); for (var k in attrs) n.setAttribute(k, attrs[k]); if (text !== undefined) n.textContent = text; return n; }
function parse(fig) {
  return (fig.getAttribute('data-edges') || '').split(';').filter(Boolean).map(function (s) { var p = s.split('>'); return { a: p[0], b: p[1], label: p[2] || '' }; });
}
function reach(n, dx, dy) {
  var tx = dx === 0 ? Infinity : (n.w / 2) / Math.abs(dx), ty = dy === 0 ? Infinity : (n.h / 2) / Math.abs(dy);
  return Math.min(tx, ty);
}
function draw(fig) {
  var stage = $('.dg-stage', fig), svg = stage && $('svg', stage); if (!svg) return;
  var W = stage.clientWidth, H = stage.clientHeight; if (!W || !H) return;
  var nodes = {}; $$('.dg-node', stage).forEach(function (b) { nodes[b.getAttribute('data-id')] = { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight }; });
  var edges = parse(fig); if (!edges.length) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('preserveAspectRatio', 'xMinYMin meet'); svg.setAttribute('class', 'dg-drawn');
  var flow = fig.classList.contains('flow-on'), calm = still(), pressed = $('.dg-node[aria-pressed="true"]', stage), pid = pressed ? pressed.getAttribute('data-id') : '';
  edges.forEach(function (ed, i) {
    var a = nodes[ed.a], b = nodes[ed.b]; if (!a || !b) return;
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx * dx + dy * dy); if (L < 10) return;
    var ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    var both = edges.some(function (o) { return o.a === ed.b && o.b === ed.a; }), off = both ? 7 : 0;
    var s = reach(a, dx, dy) * L + 5, t = L - reach(b, dx, dy) * L - 7; if (t - s < 14) return;
    var x1 = a.x + ux * s + nx * off, y1 = a.y + uy * s + ny * off, x2 = a.x + ux * t + nx * off, y2 = a.y + uy * t + ny * off;
    var on = !pid || ed.a === pid || ed.b === pid, g = el('g', { 'class': 'dg-e' + (on ? '' : ' dim') + (pid && on ? ' hot' : '') });
    g.appendChild(el('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'class': 'dg-line' }));
    var ah = 8, bx = x2 - ux * ah, by = y2 - uy * ah;
    g.appendChild(el('polygon', { points: x2 + ',' + y2 + ' ' + (bx + nx * 4.5) + ',' + (by + ny * 4.5) + ' ' + (bx - nx * 4.5) + ',' + (by - ny * 4.5), 'class': 'dg-head' }));
    var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    if (flow) {
      var dot = el('circle', { r: 4, 'class': 'dg-dot' });
      if (calm) { dot.setAttribute('cx', x1 + (x2 - x1) * 0.6); dot.setAttribute('cy', y1 + (y2 - y1) * 0.6); }
      else { var am = el('animateMotion', { dur: '2.4s', begin: '-' + (i * 0.5).toFixed(1) + 's', repeatCount: 'indefinite', path: 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 }); dot.appendChild(am); }
      g.appendChild(dot);
    }
    g.appendChild(el('circle', { cx: mx, cy: my, r: 9, 'class': 'dg-badge' }));
    g.appendChild(el('text', { x: mx, y: my + 3.6, 'text-anchor': 'middle', 'class': 'dg-num' }, String(i + 1)));
    if (ed.label && (t - s) > 70) g.appendChild(el('text', { x: mx + nx * 15 + (nx < -0.3 ? -2 : 0), y: my + ny * 15 + 4, 'text-anchor': nx < -0.3 ? 'end' : (nx > 0.3 ? 'start' : 'middle'), 'class': 'dg-elabel' }, ed.label));
    svg.appendChild(g);
  });
}
function all() { $$('#main .dg').forEach(draw); }
var queued = 0; function later() { if (queued) return; queued = setTimeout(function () { queued = 0; all(); }, 40); }
window.addEventListener('resize', later);
document.addEventListener('click', function (ev) { if (ev.target.closest && ev.target.closest('.dg-node')) setTimeout(function () { var f = ev.target.closest('.dg'); if (f) draw(f); }, 0); });
A.afterRoute(later);
try { new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) if (m[i].addedNodes && m[i].addedNodes.length) { later(); return; } }).observe(document.getElementById('main') || document.body, { childList: true, subtree: true }); } catch (x) { /* ignore */ }
A.onAct('dg-flow', function (b) {
  var fig = b.closest('.dg'), on = !fig.classList.contains('flow-on'); fig.classList.toggle('flow-on', on); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Hide the flow' : 'Show the flow'; draw(fig);
});
window.MargaDiagramsDraw = all;
};
