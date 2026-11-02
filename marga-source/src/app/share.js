/* MARGA "tell a friend": a page and a few buttons that make it easy to pass the site on.
   No tracking and no third-party scripts. The share links are ordinary links to the other service that open only when the visitor
   clicks them. The visitor chooses whether to add their own progress to the message, and it is off by default. */
window.MargaShare = function (A) {
'use strict';
var $ = A.$, e = A.e, view = A.view, D = A.D;
var SITE = 'https://' + (D.domain || 'marga.eknathalabs.com') + '/';

function progress() {
  var done = 0, total = 0; A.MODS.forEach(function (m) { total += m.lessons.length; done += m.lessons.filter(A.isDone).length; });
  return { done: done, total: total };
}
function pageUrl(kind, id) {
  if (kind === 'lesson' && A.LES[id]) return SITE + '#/lesson/' + id;
  if (kind === 'skill' && A.MOD[id]) return SITE + '#/module/' + id;
  return SITE;
}
function nameOf(kind, id) { if (kind === 'lesson' && A.LES[id]) return A.LES[id].title; if (kind === 'skill' && A.MOD[id]) return A.MOD[id].title; return ''; }
function message(kind, id, withProgress) {
  var n = nameOf(kind, id), p = progress(), t;
  if (n) t = 'This helped me with ' + (kind === 'lesson' ? 'a lesson' : 'a skill') + ' on ' + n + ' at MARGA by EknathaLabs. It is free, works offline and needs no sign-up.';
  else t = 'I am learning DevOps, cloud and SRE on MARGA by EknathaLabs. It is free, works offline and needs no sign-up.';
  if (withProgress && p.done > 0) t += ' I have passed ' + p.done + ' lesson checks so far.';
  return t;
}
function wrap(ctx, text, x, y, maxW, lh) {
  var words = text.split(' '), line = '', i, test;
  for (i = 0; i < words.length; i++) {
    test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = words[i]; y += lh; } else line = test;
  }
  if (line) { ctx.fillText(line, x, y); y += lh; }
  return y;
}
function drawCard(canvas, kind, id, withProgress) {
  var ctx = canvas.getContext('2d'), W = 1200, H = 630, n = nameOf(kind, id), p = progress();
  canvas.width = W; canvas.height = H;
  var g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#12233f'); g.addColorStop(1, '#2347c5');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(0, H - 150, W, 150);
  ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'alphabetic';
  ctx.font = '700 40px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText('MARGA by EknathaLabs', 70, 110);
  ctx.font = '700 64px system-ui, -apple-system, Segoe UI, sans-serif';
  var y = wrap(ctx, n || 'Learn DevOps, cloud and SRE', 70, 230, W - 140, 78);
  ctx.font = '400 34px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.92)';
  y = wrap(ctx, 'Free. Works offline. No sign-up, no ads, no cookies.', 70, y + 10, W - 140, 46);
  if (withProgress && p.done > 0) { ctx.fillStyle = '#ffffff'; ctx.font = '600 34px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText(p.done + ' lesson checks passed', 70, y + 30); }
  ctx.fillStyle = '#ffffff'; ctx.font = '600 38px system-ui, -apple-system, Segoe UI, sans-serif'; ctx.fillText(SITE.replace(/^https:\/\//, '').replace(/\/$/, ''), 70, H - 62);
}
function copy(text, done) {
  function fallback() { var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (x) { ok = false; } t.remove(); done(ok); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback); else fallback();
}

function shareView(kind, id) {
  kind = kind || 'site'; if (kind !== 'lesson' && kind !== 'skill') { kind = 'site'; id = ''; }
  if ((kind === 'lesson' && !A.LES[id]) || (kind === 'skill' && !A.MOD[id])) { kind = 'site'; id = ''; }
  view.title = 'Tell a friend | MARGA by EknathaLabs'; view.nav = 'practice'; view.voice = ''; view.cleanup = null;
  var n = nameOf(kind, id);
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Tell a friend</h1>' +
    '<p class="lede">MARGA is free and has no sign-up, so the best way to help it grow is to pass it on. ' + (n ? 'You are sharing: <strong>' + e(n) + '</strong>.' : 'Share the whole site, or open a lesson or a skill and use its share button.') + '</p></section>' +
    '<div class="wrap narrow sh">' +
    '<label class="field"><span>Message</span><textarea id="sh-msg" rows="4"></textarea></label>' +
    '<label class="sh-opt"><input type="checkbox" id="sh-prog"> Add how many lesson checks I have passed</label>' +
    '<p class="sh-url small">Link: <span id="sh-url"></span></p>' +
    '<div class="actions"><button type="button" class="btn btn-primary" id="sh-native">Share</button><button type="button" class="btn btn-quiet" id="sh-copy">Copy message and link</button><button type="button" class="btn btn-quiet" id="sh-link">Copy link only</button></div>' +
    '<h2 class="sub-h">Send it with</h2><p class="actions"><a class="btn btn-quiet" id="sh-mail" href="#" rel="noopener">Email</a><a class="btn btn-quiet" id="sh-wa" href="#" target="_blank" rel="noopener noreferrer">WhatsApp</a><a class="btn btn-quiet" id="sh-li" href="#" target="_blank" rel="noopener noreferrer">LinkedIn</a><a class="btn btn-quiet" id="sh-x" href="#" target="_blank" rel="noopener noreferrer">X</a></p>' +
    '<p class="small">These buttons open the other service in a new tab when you press them. Nothing is sent from this page, and nothing is tracked.</p>' +
    '<h2 class="sub-h">A picture to post</h2><canvas id="sh-cv" class="sh-cv" width="1200" height="630" role="img" aria-label="Share picture for MARGA by EknathaLabs"></canvas>' +
    '<p class="actions"><button type="button" class="btn btn-quiet" id="sh-png">Download the picture</button></p></div>';
  view.after = function () {
    var msg = $('#sh-msg'), prog = $('#sh-prog'), url = pageUrl(kind, id);
    function refresh() {
      msg.value = message(kind, id, prog.checked); $('#sh-url').textContent = url;
      var full = msg.value + ' ' + url, enc = encodeURIComponent;
      $('#sh-mail').setAttribute('href', 'mailto:?subject=' + enc('A free place to learn DevOps, cloud and SRE') + '&body=' + enc(full));
      $('#sh-wa').setAttribute('href', 'https://wa.me/?text=' + enc(full));
      $('#sh-li').setAttribute('href', 'https://www.linkedin.com/sharing/share-offsite/?url=' + enc(url));
      $('#sh-x').setAttribute('href', 'https://twitter.com/intent/tweet?text=' + enc(msg.value) + '&url=' + enc(url));
      drawCard($('#sh-cv'), kind, id, prog.checked);
    }
    prog.addEventListener('change', refresh); refresh();
    $('#sh-copy').addEventListener('click', function () { copy(msg.value + ' ' + url, function (ok) { A.toast(ok ? 'Copied.' : 'Copy failed. Select the text and copy it.'); }); });
    $('#sh-link').addEventListener('click', function () { copy(url, function (ok) { A.toast(ok ? 'Link copied.' : 'Copy failed. Select the link and copy it.'); }); });
    var nb = $('#sh-native'); if (!navigator.share) nb.hidden = true; else nb.addEventListener('click', function () { navigator.share({ title: 'MARGA by EknathaLabs', text: msg.value, url: url }).catch(function () { /* cancelled */ }); });
    $('#sh-png').addEventListener('click', function () {
      $('#sh-cv').toBlob(function (b) { if (!b) { A.toast('The picture could not be made in this browser.'); return; } var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'marga-share.png'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }, 'image/png');
    });
  };
}

/* a share button on every lesson and skill page */
A.afterRoute(function (h) {
  var m = (h || '').match(/^\/(lesson|module)\/([\w-]+)(?:\/([\w-]+))?$/); if (!m || $('#sh-link-btn')) return;
  var kind = m[1] === 'lesson' ? 'lesson' : 'skill', id = kind === 'lesson' ? m[2] + '/' + m[3] : m[2];
  if ((kind === 'lesson' && !A.LES[id]) || (kind === 'skill' && !A.MOD[id])) return;
  var host = $('.gd-entry') || $('.hb-entry'), a = '<a class="btn btn-quiet" id="sh-link-btn" href="#/share/' + kind + '/' + e(id) + '">Tell a friend</a>';
  if (host) host.insertAdjacentHTML('beforeend', ' ' + a);
  else { var hd = $('#main h1'); if (hd) hd.insertAdjacentHTML('afterend', '<p class="actions sh-entry">' + a + '</p>'); }
});
A.addRoute(/^\/share$/, function () { return shareView('site', ''); });
A.addRoute(/^\/share\/(lesson)\/([\w-]+\/[\w-]+)$/, function (k, id) { return shareView(k, id); });
A.addRoute(/^\/share\/(skill)\/([\w-]+)$/, function (k, id) { return shareView(k, id); });
};
