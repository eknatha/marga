/* Reads the exercise files in src/labs (one markdown-like file per language) into plain objects.
   Format:  ## Title  /  key: value lines  /  @@ section name  followed by the section text. */
const fs = require('fs');
const path = require('path');
function parseFile(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const out = []; let cur = null, sec = null;
  for (const line of text.split('\n')) {
    if (/^## /.test(line) && !sec) { cur = { title: line.slice(3).trim() }; out.push(cur); continue; }
    if (/^## /.test(line) && sec && cur && sec.endsWith('!')) { /* never */ }
    if (/^## /.test(line)) { cur = { title: line.slice(3).trim() }; out.push(cur); sec = null; continue; }
    if (!cur) continue;
    const m = /^@@ (\w+)\s*$/.exec(line);
    if (m) { sec = m[1]; cur[sec] = ''; continue; }
    if (sec) { cur[sec] += line + '\n'; continue; }
    const kv = /^(\w+): (.*)$/.exec(line);
    if (kv) cur[kv[1]] = kv[2].trim();
  }
  out.forEach((x) => { for (const k of Object.keys(x)) if (['start', 'sol', 'tests', 'expect', 'checks'].includes(k)) x[k] = x[k].replace(/\n+$/, '\n'); });
  return out;
}
function load(dir) {
  const labs = {};
  for (const lang of ['python', 'go', 'hcl', 'sql', 'yaml']) {
    const f = path.join(dir, lang + '.md');
    labs[lang] = fs.existsSync(f) ? parseFile(f) : [];
  }
  const sq = path.join(dir, 'sql-schema.sql');
  labs.sqlSchema = fs.existsSync(sq) ? fs.readFileSync(sq, 'utf8') : '';
  return labs;
}
module.exports = { load, parseFile };
