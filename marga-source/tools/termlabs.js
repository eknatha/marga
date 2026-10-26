/* Reads src/termlabs/*.md into lab objects.
   Format: "## Title", then "key: value" lines, then sections that start with "@@ name".
   A "@@ file /path [mode=644 owner=user group=user size=4G]" section defines one file. */
const fs = require('fs');
const path = require('path');
const MODULES = ['linux', 'bash', 'networking', 'python'];
function parseFile(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const labs = []; let cur = null, sec = null;
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^## /.test(line) && !(sec && sec.name === 'file' && false)) { cur = { title: line.slice(3).trim(), files: [], _line: i + 1 }; labs.push(cur); sec = null; continue; }
    if (!cur) continue;
    const m = /^@@ (\w+)(?: (.*))?$/.exec(line);
    if (m) { sec = { name: m[1], args: (m[2] || '').trim(), text: '' }; if (m[1] === 'file') { const a = sec.args.split(/\s+/); sec.path = a[0].replace(/%20/g, ' '); sec.opts = {}; a.slice(1).forEach(x => { const kv = x.split('='); sec.opts[kv[0]] = kv[1]; }); cur.files.push(sec); } else cur['@' + m[1]] = sec; continue; }
    if (sec) { sec.text += line + '\n'; continue; }
    const kv = /^(\w+): (.*)$/.exec(line);
    if (kv) cur[kv[1]] = kv[2].trim();
  }
  return labs.map(finish);
}
function bullets(t) { return (t || '').split('\n').map(s => s.replace(/^\s*[-*]\s+/, '').trim()).filter(Boolean); }
function finish(raw) {
  const sec = (n) => raw['@' + n] ? raw['@' + n].text : '';
  const lab = {
    id: raw.id, title: raw.title, module: raw.module, level: raw.level, minutes: parseInt(raw.minutes, 10) || 0, lesson: raw.lesson || '', summary: raw.summary || '',
    engine: raw.engine || '', story: sec('story').trim(), goals: bullets(sec('goals')), hints: bullets(sec('hints')), explain: sec('explain').trim(), solution: sec('solution').replace(/\n+$/, '\n'),
    world: null, checks: null, files: raw.files.map(f => ({ path: f.path, m: f.opts.mode, o: f.opts.owner, g: f.opts.group, size: f.opts.size, data: f.text.replace(/\n$/, '') === '' && f.text === '\n' ? '' : f.text })), errors: []
  };
  try { lab.world = sec('world').trim() ? JSON.parse(sec('world')) : {}; } catch (e) { lab.errors.push('world is not valid JSON: ' + e.message); lab.world = {}; }
  try { lab.checks = JSON.parse(sec('checks')); } catch (e) { lab.errors.push('checks is not valid JSON: ' + e.message); lab.checks = []; }
  return lab;
}
function load(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const m of MODULES) { const f = path.join(dir, m + '.md'); if (fs.existsSync(f)) parseFile(f).forEach(l => { l.file = m + '.md'; out.push(l); }); }
  return out;
}
module.exports = { load, parseFile, MODULES };
