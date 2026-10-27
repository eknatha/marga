/* MARGA accessibility settings. Loaded in <head> so choices apply before the page paints.
   Stored in this browser only (ea.a11y). Each setting is an attribute on <html> that app.css reacts to. */
(function () {
'use strict';
var KEY = 'ea.a11y';
var OPTIONS = [
  { id: 'theme', label: 'Colour theme', values: [['auto', 'Match my device'], ['light', 'Light'], ['dark', 'Dark']], def: 'auto' },
  { id: 'read', label: 'Reading mode', values: [['off', 'Off'], ['on', 'On: narrow column, larger text, no side panels']], def: 'off' },
  { id: 'fs', label: 'Text size', values: [['100', 'Standard'], ['115', 'Large'], ['130', 'Larger'], ['150', 'Largest']], def: '100' },
  { id: 'font', label: 'Font', values: [['default', 'Standard'], ['atkinson', 'Atkinson Hyperlegible'], ['dyslexic', 'OpenDyslexic']], def: 'default' },
  { id: 'lh', label: 'Line spacing', values: [['normal', 'Standard'], ['relaxed', 'Relaxed'], ['loose', 'Loose']], def: 'normal' },
  { id: 'sp', label: 'Letter and word spacing', values: [['normal', 'Standard'], ['wide', 'Wide']], def: 'normal' },
  { id: 'contrast', label: 'Contrast', values: [['normal', 'Standard'], ['high', 'High contrast']], def: 'normal' },
  { id: 'motion', label: 'Motion', values: [['system', 'Follow my device'], ['reduce', 'Reduce animations']], def: 'system' },
  { id: 'links', label: 'Links', values: [['normal', 'Standard'], ['underline', 'Always underlined']], def: 'normal' },
  { id: 'focus', label: 'Keyboard focus', values: [['normal', 'Standard'], ['strong', 'Extra strong outline']], def: 'normal' },
  { id: 'hl', label: 'Highlight the text being read aloud', values: [['on', 'On'], ['off', 'Off']], def: 'on' }
];
var DEF = {};
OPTIONS.forEach(function (o) { DEF[o.id] = o.def; });

function valid(id, v) {
  for (var i = 0; i < OPTIONS.length; i++) if (OPTIONS[i].id === id) return OPTIONS[i].values.some(function (x) { return x[0] === v; });
  return false;
}
function read() {
  var s = {}, raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (x) { raw = null; }
  OPTIONS.forEach(function (o) { s[o.id] = raw && valid(o.id, raw[o.id]) ? raw[o.id] : o.def; });
  s.theme = 'auto'; try { var t = localStorage.getItem('ea.theme'); if (t === 'light' || t === 'dark') s.theme = t; } catch (x2) { /* ignore */ }
  return s;
}
var cur = read();
function sysTheme() { try { return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (x) { return 'light'; } }
function apply(s) {
  var h = document.documentElement;
  OPTIONS.forEach(function (o) { if (o.id === 'theme') return; if (s[o.id] === o.def) h.removeAttribute('data-a-' + o.id); else h.setAttribute('data-a-' + o.id, s[o.id]); });
  h.setAttribute('data-theme', s.theme === 'auto' ? sysTheme() : s.theme);
}
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (cur.theme === 'auto') apply(cur); }); } catch (x3) { /* ignore */ }
function persist() {
  var diff = {}, any = false;
  OPTIONS.forEach(function (o) { if (o.id !== 'theme' && cur[o.id] !== o.def) { diff[o.id] = cur[o.id]; any = true; } });
  try { if (cur.theme === 'auto') localStorage.removeItem('ea.theme'); else localStorage.setItem('ea.theme', cur.theme); } catch (x4) { /* ignore */ }
  try { if (any) localStorage.setItem(KEY, JSON.stringify(diff)); else localStorage.removeItem(KEY); } catch (x) { /* ignore */ }
}
function set(id, v) { if (!valid(id, v)) return false; cur[id] = v; apply(cur); persist(); return true; }
function reset() { cur = {}; OPTIONS.forEach(function (o) { cur[o.id] = o.def; }); apply(cur); persist(); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

/* HTML for the settings panel. The app places it in the page and calls wire(). */
function panelHtml() {
  return '<div class="a11y-panel" id="a11y-panel" role="dialog" aria-labelledby="a11y-h" hidden>' +
    '<div class="a11y-head"><h2 id="a11y-h">Reading and accessibility</h2><button type="button" class="btn btn-quiet" data-a11y="close">Close</button></div>' +
    '<p class="small">Choices apply to every page and are saved in this browser only.</p>' +
    '<div class="a11y-grid">' + OPTIONS.map(function (o) {
      return '<label class="field a11y-f" for="a11y-' + o.id + '"><span>' + esc(o.label) + '</span><select id="a11y-' + o.id + '" data-a11y-set="' + o.id + '">' +
        o.values.map(function (v) { return '<option value="' + esc(v[0]) + '"' + (cur[o.id] === v[0] ? ' selected' : '') + '>' + esc(v[1]) + '</option>'; }).join('') + '</select></label>';
    }).join('') + '</div>' +
    '<div class="actions"><button type="button" class="btn btn-quiet" data-a11y="reset">Reset to defaults</button></div></div>';
}
function sync() {
  OPTIONS.forEach(function (o) { var el = document.getElementById('a11y-' + o.id); if (el) el.value = cur[o.id]; });
}

apply(cur);
window.MargaA11y = {
  options: OPTIONS, get: function () { var c = {}; for (var k in cur) c[k] = cur[k]; return c; },
  set: set, reset: reset, apply: apply, panelHtml: panelHtml, sync: sync
};
})();
