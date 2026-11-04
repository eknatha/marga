/* Builds the language files (assets/i18n/<code>.js) from src/i18n/*.json.
   Keys are the English text exactly as the app shows it, so a missing translation stays English. */
const fs = require('fs');
const path = require('path');

const LANGS = ['te', 'hi'];
/* later languages keep one file each: src/i18n/lang-<code>.json = { ui: [[en, tr]], pats: [[regex, tr]], modules: {id: {title, summary}}, paths: {id: {summary, audience}}, lessons: {id: tr} } */
const MORE = ['ta', 'kn', 'ml', 'bn', 'es', 'de', 'fr', 'pt'];
const ALL = LANGS.concat(MORE);
const readJson = (root, f, dflt) => { const p = path.join(root, 'i18n', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : dflt; };

/* data: the build's data object (modules array, paths.live, lessons map). Returns { te: 'js text', hi: '...' } and a report. */
function build(data, srcRoot) {
  const ui = readJson(srcRoot, 'ui.json', { entries: [], patterns: [] });
  const mods = readJson(srcRoot, 'modules.json', {});
  const paths = readJson(srcRoot, 'paths.json', {});
  const lessons = readJson(srcRoot, 'lessons.json', {});
  const out = {}; const report = {};
  const modList = Array.isArray(data.modules) ? data.modules : Object.values(data.modules);
  const live = (data.paths && data.paths.live) || [];
  for (const lang of LANGS) {
    const dict = {}; const pats = [];
    const idx = LANGS.indexOf(lang) + 1; // ui entries are [en, te, hi]
    for (const e of ui.entries) if (e[idx]) dict[e[0]] = e[idx];
    for (const p of ui.patterns) pats.push([p[0], p[idx]]);
    for (const m of modList) { const t = mods[m.id] && mods[m.id][lang]; if (!t) continue; if (t.title) dict[m.title] = t.title; if (t.summary && m.summary) dict[m.summary] = t.summary; }
    for (const p of live) { const t = paths[p.id] && paths[p.id][lang]; if (!t) continue; if (t.summary) dict[p.summary] = t.summary; if (t.audience && p.audience) dict[p.audience] = t.audience; }
    let nL = 0;
    for (const [id, l] of Object.entries(data.lessons)) { const t = lessons[id] && lessons[id][lang]; if (t && l.summary) { dict[l.summary] = t; nL++; } }
    report[lang] = { strings: Object.keys(dict).length, patterns: pats.length, lessonSummaries: nL };
    const esc = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    out[lang] = 'window.MARGA_LANG=window.MARGA_LANG||{};window.MARGA_LANG.' + lang + '=' + esc({ dict, pats }) + ';';
  }
  for (const lang of MORE) {
    const f = readJson(srcRoot, 'lang-' + lang + '.json', { ui: [], pats: [], modules: {}, paths: {}, lessons: {} });
    const dict = {}; const pats = [];
    for (const [en, tr] of f.ui) if (tr) dict[en] = tr;
    for (const [re, tr] of f.pats) if (tr) pats.push([re, tr]);
    for (const m of modList) { const t = f.modules[m.id]; if (!t) continue; if (t.title) dict[m.title] = t.title; if (t.summary && m.summary) dict[m.summary] = t.summary; }
    for (const p of live) { const t = f.paths[p.id]; if (!t) continue; if (t.summary) dict[p.summary] = t.summary; if (t.audience && p.audience) dict[p.audience] = t.audience; }
    let nL = 0;
    for (const [id, l] of Object.entries(data.lessons)) { const t = f.lessons[id]; if (t && l.summary) { dict[l.summary] = t; nL++; } }
    report[lang] = { strings: Object.keys(dict).length, patterns: pats.length, lessonSummaries: nL };
    const esc = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    out[lang] = 'window.MARGA_LANG=window.MARGA_LANG||{};window.MARGA_LANG.' + lang + '=' + esc({ dict, pats }) + ';';
  }
  return { out, report };
}
module.exports = { build, LANGS, MORE, ALL };
