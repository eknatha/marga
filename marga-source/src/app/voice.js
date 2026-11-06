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

var LANGNAME = { en: 'English', te: 'Telugu', hi: 'Hindi', ta: 'Tamil', kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali', es: 'Spanish', de: 'German', fr: 'French', pt: 'Portuguese', mr: 'Marathi', id: 'Indonesian', gu: 'Gujarati', ru: 'Russian' };
function pre(l) { var p = String(l || '').toLowerCase().replace('_', '-').split('-')[0]; return p === 'in' ? 'id' : p; } /* Android reports Indonesian as in-ID */
function siteLang() { var l = pre(document.documentElement.getAttribute('lang') || 'en'); return LANGNAME[l] ? l : 'en'; }
/* Score a voice: neural and enhanced voices sound human; old desktop and compact voices sound robotic. */
function score(v) {
  var n = v.name || '', sc = 0;
  if (/natural|neural|online|multilingual/i.test(n)) sc += 100;
  if (/premium|enhanced|studio|wavenet|journey|chirp/i.test(n)) sc += 90;
  if (/^google /i.test(n)) sc += 60;
  if (/siri/i.test(n)) sc += 70;
  if (/\b(samantha|karen|daniel|moira|tessa|rishi|lekha|veena|kyoko|milena|paulina|monica|thomas|amelie|anna|luciana|joana)\b/i.test(n)) sc += 40; /* Apple and Android named voices */
  if (/espeak|festival|flite|mbrola|compact|\bpico\b/i.test(n)) sc -= 80;
  if (/microsoft/i.test(n) && !/online|natural/i.test(n)) sc -= 30; /* legacy Windows desktop voices */
  if (v['default']) sc += 5;
  var nl = (navigator.language || '').toLowerCase();
  if (nl && String(v.lang).toLowerCase().replace('_', '-') === nl) sc += 8;
  return sc;
}
function natural(v) { return !!v && score(v) >= 60; }
function loadVoices() {
  if (!supported) return;
  var list = synth.getVoices() || [];
  voices = list.slice().sort(function (a, b) { return score(b) - score(a) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name); });
  document.querySelectorAll('select[data-voice]').forEach(fillSelect);
  document.querySelectorAll('.voice-msg').forEach(function (m) { m.textContent = voiceMsg(); });
}
if (supported) {
  loadVoices();
  if (synth.addEventListener) synth.addEventListener('voiceschanged', loadVoices);
  else synth.onvoiceschanged = loadVoices;
  /* some engines only fill the list a moment after load without firing the event */
  setTimeout(loadVoices, 600); setTimeout(loadVoices, 2000);
}

var trCache = {};
/* On-device translation (Chrome's Translator API): lesson text is English, so it is translated on this device, then spoken with a voice for the chosen language. No server, no key. */
function trSupported() { return typeof window.Translator !== 'undefined' && !!window.Translator.create; }
function getTranslator(l) {
  if (trCache[l]) return trCache[l];
  if (!trSupported()) return Promise.resolve(null);
  var p = Promise.resolve().then(function () { return window.Translator.availability({ sourceLanguage: 'en', targetLanguage: l }); })
    .then(function (a) { return a === 'unavailable' ? null : window.Translator.create({ sourceLanguage: 'en', targetLanguage: l }); })
    .catch(function () { return null; });
  /* a language pack may need downloading; do not leave the person waiting forever */
  var timed = Promise.race([p, new Promise(function (res) { setTimeout(function () { res(null); }, 45000); })]);
  timed.then(function (t) { if (!t) delete trCache[l]; });
  trCache[l] = timed;
  return timed;
}
function forLang(l) { return voices.filter(function (v) { return pre(v.lang) === l; }); }
/* The language a piece of text should be spoken in: its script, else the site language for translated chrome, else English (lesson prose is English). */
function langOf(text, el) {
  var t = String(text || '');
  if (/[ఀ-౿]/.test(t)) return 'te';
  if (/[஀-௿]/.test(t)) return 'ta';
  if (/[ಀ-೿]/.test(t)) return 'kn';
  if (/[ഀ-ൿ]/.test(t)) return 'ml';
  if (/[ঀ-৿]/.test(t)) return 'bn';
  if (/[઀-૿]/.test(t)) return 'gu';
  if (/[ऀ-ॿ]/.test(t)) return siteLang() === 'mr' ? 'mr' : 'hi';
  if (/[Ѐ-ӿ]/.test(t)) return 'ru';
  var sl = siteLang();
  if (sl !== 'en' && el && el.closest && !el.closest('.prose')) return sl;
  return 'en';
}
function voiceMsg() {
  if (!supported) return 'Spoken voice is not supported in this browser. Try Chrome, Edge, Safari or Firefox.';
  if (!voices.length) return 'No voices found yet. If this stays empty, install a speech voice in your system settings.';
  var sl = siteLang(), m = [];
  if (sl !== 'en' && !forLang(sl).length) m.push('No ' + LANGNAME[sl] + ' voice is installed on this device, so ' + LANGNAME[sl] + ' text is read with an English voice. Install a ' + LANGNAME[sl] + ' voice in your system settings.');
  if (sl !== 'en' && !trSupported()) m.push('Lessons are written in English. This browser cannot translate them on the device, so they are read in English. Chrome on a computer can read them in ' + LANGNAME[sl] + '.');
  var best = forLang('en')[0];
  if (best && !natural(best)) m.push('For a more natural sound, pick a voice marked Natural, Neural, Online or Enhanced if one is listed. Edge, Chrome on Android and Safari have the best.');
  return m.join(' ');
}
function chosen(lang) {
  lang = lang || 'en';
  var uri = store.get('ea.voice.' + lang, '');
  var cand = forLang(lang), i;
  if (uri) for (i = 0; i < cand.length; i++) if (cand[i].voiceURI === uri) return cand[i];
  if (cand.length) return cand[0];
  var en = forLang('en');
  return en[0] || voices[0] || null;
}
function rate() { var r = parseFloat(store.get('ea.rate', '1')); return r >= 0.5 && r <= 2 ? r : 1; }

function fillSelect(sel) {
  var order = [], sl = siteLang();
  if (sl !== 'en') order.push(sl);
  order.push('en');
  var html = '';
  order.forEach(function (l) {
    var cand = forLang(l); if (!cand.length) return;
    var cur = chosen(l), uri = cur ? cur.voiceURI : '';
    html += '<optgroup label="' + attr(LANGNAME[l]) + '">' + cand.map(function (v, i) {
      return '<option value="' + attr(v.voiceURI) + '" data-l="' + l + '"' + (v.voiceURI === uri ? ' selected' : '') + '>' + esc(v.name) + (i === 0 ? ' (best match)' : '') + '</option>';
    }).join('') + '</optgroup>';
  });
  sel.innerHTML = html || '<option value="">No voices available</option>';
  sel.disabled = !voices.length;
  /* one dropdown, several languages: remember which voice is shown for each */
  sel._pick = order;
}
/* show the on-device translation switch only when the site is not English and the browser can translate */
function syncTr(slot) {
  var lab = slot.querySelector('.v-tr'); if (!lab) return;
  var sl = siteLang(), on = sl !== 'en' && trSupported();
  lab.hidden = !on;
  if (on) lab.querySelector('.v-trl').textContent = 'Read lessons in ' + LANGNAME[sl] + ' (translated on this device)';
  var m = slot.querySelector('.voice-msg'); if (m && !(state.playing && state.onchange)) m.textContent = voiceMsg();
}
function syncAll() { document.querySelectorAll('.voice').forEach(syncTr); }
try { new MutationObserver(syncAll).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (x) { /* ignore */ }
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
  var el = state.els[state.pos], text = state.queue[state.pos], cl = langOf(text, el), sl = siteLang();
  mark(el);
  if (state.tr && sl !== 'en' && cl === 'en' && /[A-Za-z]{3}/.test(text)) {
    state.tr.translate(text).then(function (t) { if (tok === state.token) utter(tok, t || text, t ? sl : 'en'); }, function () { if (tok === state.token) utter(tok, text, 'en'); });
    return;
  }
  utter(tok, text, cl);
}
function utter(tok, text, cl) {
  var u = new SpeechSynthesisUtterance(text);
  var v = chosen(cl); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = cl;
  u.rate = rate();
  u.onend = function () { state.pos++; next(tok); };
  u.onerror = function (ev) { if (ev && (ev.error === 'canceled' || ev.error === 'interrupted')) return; state.pos++; next(tok); };
  synth.speak(u);
}
function speakList(list, onchange, els, tr) {
  if (!supported || !list.length) return false;
  synth.cancel();
  state.token++;
  state.queue = list; state.els = els || list.els || []; state.pos = 0; state.playing = true; state.paused = false; state.onchange = onchange || null; state.tr = tr || null;
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
function sentences(t) { return (t.match(/[^.!?\u0964\u0965]+(?:[.!?\u0964\u0965]+|$)\s*/g) || [t]).map(function (x) { return x.trim(); }).filter(Boolean); }
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
    '</div><label class="v-field v-tr" hidden><input type="checkbox" data-tr' + (store.get('ea.vtr', '1') === '1' ? ' checked' : '') + '> <span class="v-trl"></span></label>'
    + '<p class="voice-msg small" role="status">' + esc(voiceMsg()) + '</p>';
  var sel = slot.querySelector('[data-voice]'), spd = slot.querySelector('[data-rate]');
  fillSelect(sel);
  syncTr(slot);
  var tchk = slot.querySelector('[data-tr]'); if (tchk) tchk.addEventListener('change', function () { store.set('ea.vtr', tchk.checked ? '1' : '0'); });
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
    syncTr(slot);
    var chk = slot.querySelector('[data-tr]'), sl = siteLang();
    if (chk && !chk.closest('label').hidden && chk.checked) {
      var msg = slot.querySelector('.voice-msg'); msg.textContent = 'Preparing ' + LANGNAME[sl] + ' translation. The first time may take a moment.';
      getTranslator(sl).then(function (tr) { msg.textContent = voiceMsg(); if (!tr) msg.textContent = 'Translation to ' + LANGNAME[sl] + ' is not available on this device, so lessons are read in English. ' + msg.textContent; speakList(list, paint, null, tr); paint(); });
      return;
    }
    speakList(list, paint);
    paint();
  });
  pz.addEventListener('click', pause);
  st.addEventListener('click', stop);
  sel.addEventListener('change', function () { var o = sel.options[sel.selectedIndex]; if (o && o.getAttribute('data-l')) store.set('ea.voice.' + o.getAttribute('data-l'), sel.value); document.querySelectorAll('select[data-voice]').forEach(fillSelect); restartIfMine(); });
  spd.addEventListener('change', function () { store.set('ea.rate', spd.value); restartIfMine(); });
  function restartIfMine() {
    if (state.onchange !== paint || !state.playing) return;
    var rest = state.queue.slice(state.pos), restEls = state.els.slice(state.pos);
    speakList(rest, paint, restEls, state.tr);
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

window.MargaVoice = { supported: supported, voiceFor: function (l) { return chosen(pre(l) || 'en'); }, rate: rate, _score: score, _langOf: langOf, mount: mount, say: say, stop: stop, sayButton: sayButton, voices: function () { return voices; } };
window.addEventListener('pagehide', stop);
window.addEventListener('beforeprint', stop);
})();
