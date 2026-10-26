/* MARGA spoken voice: reads page content aloud with the browser's built-in speech engine.
   No audio files, no network. Works wherever window.speechSynthesis exists. */
(function () {
'use strict';
var synth = window.speechSynthesis;
var supported = !!(synth && window.SpeechSynthesisUtterance);
var voices = [];
var store = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (x) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (x) { /* ignore */ } }
};
var state = { queue: [], els: [], pos: 0, playing: false, paused: false, token: 0, onchange: null };

function loadVoices() {
  if (!supported) return;
  var list = synth.getVoices() || [];
  voices = list.slice().sort(function (a, b) {
    var ea = /^en/i.test(a.lang) ? 0 : 1, eb = /^en/i.test(b.lang) ? 0 : 1;
    return ea - eb || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name);
  });
  document.querySelectorAll('select[data-voice]').forEach(fillSelect);
  document.querySelectorAll('.voice-msg').forEach(function (m) { m.textContent = voiceMsg(); });
}
if (supported) {
  loadVoices();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
  else synth.onvoiceschanged = loadVoices;
}

function voiceMsg() {
  if (!supported) return 'Spoken voice is not supported in this browser. Try Chrome, Edge, Safari or Firefox.';
  if (!voices.length) return 'No voices found yet. If this stays empty, install a speech voice in your system settings.';
  return '';
}
function chosen() {
  var uri = store.get('ea.voice', '');
  for (var i = 0; i < voices.length; i++) if (voices[i].voiceURI === uri) return voices[i];
  for (var j = 0; j < voices.length; j++) if (/^en/i.test(voices[j].lang) && voices[j].default) return voices[j];
  for (var k = 0; k < voices.length; k++) if (/^en/i.test(voices[k].lang)) return voices[k];
  return voices[0] || null;
}
function rate() { var r = parseFloat(store.get('ea.rate', '1')); return r >= 0.5 && r <= 2 ? r : 1; }

function fillSelect(sel) {
  var cur = chosen(), uri = cur ? cur.voiceURI : '';
  sel.innerHTML = voices.length ? voices.map(function (v) {
    return '<option value="' + attr(v.voiceURI) + '"' + (v.voiceURI === uri ? ' selected' : '') + '>' + esc(v.name) + ' (' + esc(v.lang) + ')</option>';
  }).join('') : '<option value="">No voices available</option>';
  sel.disabled = !voices.length;
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function attr(s) { return esc(s).replace(/"/g, '&quot;'); }

/* Turn a DOM subtree into short speakable chunks. Code is announced, not read. */
function chunksFrom(root) {
  var out = [];
  if (!root) return out;
  var skip = '.code, pre, .copy, .toc, .voice, .no-voice, script, style, button, .actions, nav.crumbs, .pager, [hidden], .calc, .a11y-panel, textarea, select';
  var all = root.querySelectorAll('h1,h2,h3,h4,p,li,dt,dd,th,td,blockquote,figcaption,.code');
  all.forEach(function (el) {
    if (el.matches('.code')) {
      if (!el.parentElement.closest('.code')) out.push({ t: 'Code example. See the page for the commands.', el: el });
      return;
    }
    if (el.closest(skip)) return;
    if (el.querySelector('h1,h2,h3,h4,p,li,dt,dd,th,td,blockquote')) return; // speak the leaves only
    var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!t) return;
    if (/^H[1-4]$/.test(el.tagName)) t = t + '.';
    out.push({ t: t, el: el });
  });
  // merge very short neighbours of the same element, split very long ones (engines stall on long utterances)
  var merged = [], els = [];
  out.forEach(function (o) {
    sentences(o.t).forEach(function (s) {
      if (s.length > 240) s = s.replace(/(.{120,240}?[,;:]\s)/g, '$1|').split('|').join('\n');
      s.split('\n').forEach(function (p) {
        var k = merged.length - 1;
        if (k >= 0 && els[k] === o.el && merged[k].length + p.length < 160) merged[k] = merged[k] + ' ' + p;
        else { merged.push(p); els.push(o.el); }
      });
    });
  });
  var keep = [], keepEls = [];
  merged.forEach(function (t, i) { if (t) { keep.push(t); keepEls.push(els[i]); } });
  keep.els = keepEls;
  return keep;
}

var marked = null;
function highlightOn() { try { return (window.MargaA11y ? MargaA11y.get().hl : 'on') !== 'off'; } catch (x) { return true; } }
function mark(el) {
  if (marked) { marked.classList.remove('say-now'); marked = null; }
  if (el && el.classList && highlightOn()) {
    el.classList.add('say-now'); marked = el;
    try { var r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > window.innerHeight - 20) el.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (x) { /* ignore */ }
  }
}

function notify() { if (state.onchange) state.onchange(); }
function stop() {
  state.token++;
  state.queue = []; state.els = []; state.pos = 0; state.playing = false; state.paused = false;
  mark(null);
  if (supported) synth.cancel();
  notify();
}
function next(tok) {
  if (tok !== state.token) return;
  if (state.pos >= state.queue.length) { state.playing = false; state.paused = false; mark(null); notify(); return; }
  mark(state.els[state.pos]);
  var u = new SpeechSynthesisUtterance(state.queue[state.pos]);
  var v = chosen(); if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = rate();
  u.onend = function () { state.pos++; next(tok); };
  u.onerror = function (ev) { if (ev && (ev.error === 'canceled' || ev.error === 'interrupted')) return; state.pos++; next(tok); };
  synth.speak(u);
}
function speakList(list, onchange, els) {
  if (!supported || !list.length) return false;
  synth.cancel();
  state.token++;
  state.queue = list; state.els = els || list.els || []; state.pos = 0; state.playing = true; state.paused = false; state.onchange = onchange || null;
  notify();
  var tok = state.token;
  setTimeout(function () { next(tok); }, 30);
  return true;
}
function say(text, onchange) { return speakList(chunksFromText(text), onchange); }
function chunksFromText(text) {
  var t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  return sentences(t);
}
function sentences(t) { return (t.match(/[^.!?]+(?:[.!?]+|$)\s*/g) || [t]).map(function (x) { return x.trim(); }).filter(Boolean); }
function pause() { if (!supported || !state.playing) return; if (state.paused) { synth.resume(); state.paused = false; } else { synth.pause(); state.paused = true; } notify(); }

/* Voice bar: Listen / Pause / Stop, Voice dropdown, Speed. getRoot returns the element to read. */
function mount(slot, getRoot, label) {
  if (!slot) return;
  var uid = 'v' + Math.random().toString(36).slice(2, 7);
  slot.className = (slot.className ? slot.className + ' ' : '') + 'voice no-voice';
  slot.setAttribute('role', 'group');
  slot.setAttribute('aria-label', 'Spoken voice');
  slot.innerHTML =
    '<div class="voice-row">' +
    '<button type="button" class="btn btn-quiet v-play" data-v="play">Listen</button>' +
    '<button type="button" class="btn btn-quiet v-pause" data-v="pause" disabled>Pause</button>' +
    '<button type="button" class="btn btn-quiet v-stop" data-v="stop" disabled>Stop</button>' +
    '<label class="v-field" for="' + uid + '-v"><span>Voice</span><select id="' + uid + '-v" data-voice></select></label>' +
    '<label class="v-field" for="' + uid + '-r"><span>Speed</span><select id="' + uid + '-r" data-rate>' +
    [0.75, 1, 1.25, 1.5, 2].map(function (r) { return '<option value="' + r + '"' + (r === rate() ? ' selected' : '') + '>' + r + 'x</option>'; }).join('') + '</select></label>' +
    '</div><p class="voice-msg small" role="status">' + esc(voiceMsg()) + '</p>';
  var sel = slot.querySelector('[data-voice]'), spd = slot.querySelector('[data-rate]');
  fillSelect(sel);
  var play = slot.querySelector('[data-v=play]'), pz = slot.querySelector('[data-v=pause]'), st = slot.querySelector('[data-v=stop]');
  if (!supported) { play.disabled = true; sel.disabled = true; spd.disabled = true; }
  function paint() {
    var mine = state.onchange === paint;
    var active = mine && state.playing;
    play.textContent = 'Listen';
    play.disabled = !supported;
    pz.disabled = !active; st.disabled = !active;
    pz.textContent = active && state.paused ? 'Resume' : 'Pause';
    slot.classList.toggle('speaking', active && !state.paused);
  }
  play.addEventListener('click', function () {
    var list = chunksFrom(typeof getRoot === 'function' ? getRoot() : getRoot);
    if (label) { list.unshift(label + '.'); list.els.unshift(null); }
    if (!list.length) { slot.querySelector('.voice-msg').textContent = 'Nothing to read on this page.'; return; }
    speakList(list, paint);
    paint();
  });
  pz.addEventListener('click', pause);
  st.addEventListener('click', stop);
  sel.addEventListener('change', function () { store.set('ea.voice', sel.value); restartIfMine(); });
  spd.addEventListener('change', function () { store.set('ea.rate', spd.value); restartIfMine(); });
  function restartIfMine() {
    if (state.onchange !== paint || !state.playing) return;
    var rest = state.queue.slice(state.pos), restEls = state.els.slice(state.pos);
    speakList(rest, paint, restEls);
  }
  paint();
}

/* Small "Read aloud" button for a single piece of text (flashcards, quiz, answers). */
function sayButton(btn, getText) {
  btn.addEventListener('click', function () {
    var on = btn.getAttribute('aria-pressed') === 'true';
    if (on) { stop(); return; }
    var paint = function () { btn.setAttribute('aria-pressed', String(state.playing && state.onchange === paint)); btn.textContent = state.playing && state.onchange === paint ? 'Stop reading' : 'Read aloud'; };
    if (!say(typeof getText === 'function' ? getText() : getText, paint)) return;
    paint();
  });
  if (!supported) btn.hidden = true;
}

window.MargaVoice = { supported: supported, mount: mount, say: say, stop: stop, sayButton: sayButton, voices: function () { return voices; } };
window.addEventListener('pagehide', stop);
window.addEventListener('beforeprint', stop);
})();
