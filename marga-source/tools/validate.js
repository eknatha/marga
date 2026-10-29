#!/usr/bin/env node
/*
 * Static validation for the academy.
 *   node tools/validate.js
 * Checks content schema, prerequisite graph, role paths, code-block syntax,
 * forbidden strings, domain strings and internal links. Exits 1 on any error.
 * Run `node tools/build.js` first: it validates the built output in dist/.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const DOMAIN = 'marga.eknathalabs.com';

const errors = [];
const warnings = [];
const stats = {};
const err = (area, msg) => errors.push(`[${area}] ${msg}`);
const warn = (area, msg) => warnings.push(`[${area}] ${msg}`);
const count = (k, n = 1) => { stats[k] = (stats[k] || 0) + n; };

function walk(dir, filter = () => true) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, filter));
    else if (filter(p)) out.push(p);
  }
  return out;
}

const read = (p) => fs.readFileSync(p, 'utf8');
const rel = (p) => path.relative(ROOT, p);

// ---------------------------------------------------------------- load data
if (!fs.existsSync(path.join(DIST, 'assets/data.js'))) {
  console.error('dist/assets/data.js not found. Run: node tools/build.js');
  process.exit(2);
}
const sandbox = { window: {} };
vm.runInNewContext(read(path.join(DIST, 'assets/data.js')), sandbox);
const A = sandbox.window.ACADEMY;
const modules = A.modules;
const modById = Object.fromEntries(modules.map((m) => [m.id, m]));
const lessons = A.lessons;
const sheets = A.sheets;

// ---------------------------------------------------------------- 1. schema
function checkSchema() {
  const ids = new Set();
  for (const m of modules) {
    if (ids.has(m.id)) err('schema', `duplicate module id ${m.id}`);
    ids.add(m.id);
    for (const k of ['title', 'summary', 'level']) if (!m[k]) err('schema', `module ${m.id} missing ${k}`);
    if (!Array.isArray(m.requires)) err('schema', `module ${m.id} requires must be an array`);
    for (const r of m.requires || []) if (!modById[r]) err('schema', `module ${m.id} requires unknown module ${r}`);
    if (!m.lessons || !m.lessons.length) err('schema', `module ${m.id} has no lessons`);
    for (const lid of m.lessons || []) {
      if (!lessons[lid]) err('schema', `module ${m.id} lists missing lesson ${lid}`);
    }
    count('modules');
  }

  // cycle detection
  const state = {};
  const visit = (id, trail) => {
    if (state[id] === 2) return;
    if (state[id] === 1) { err('graph', `cycle: ${[...trail, id].join(' > ')}`); return; }
    state[id] = 1;
    for (const r of modById[id].requires || []) if (modById[r]) visit(r, [...trail, id]);
    state[id] = 2;
  };
  modules.forEach((m) => visit(m.id, []));

  // lessons
  const slugs = new Set();
  for (const [id, l] of Object.entries(lessons)) {
    count('lessons');
    if (slugs.has(id)) err('schema', `duplicate lesson id ${id}`);
    slugs.add(id);
    if (!modById[l.module]) err('schema', `${id}: unknown module ${l.module}`);
    else if (!modById[l.module].lessons.includes(id)) err('schema', `${id}: not listed in module ${l.module}`);
    if (!l.title) err('schema', `${id}: missing title`);
    if (!(l.minutes >= 5 && l.minutes <= 30)) err('schema', `${id}: minutes ${l.minutes} outside 5-30`);
    if (!l.summary || l.summary.length < 30) err('schema', `${id}: summary missing or too short`);
    if (!l.html || l.html.length < 4000) warn('schema', `${id}: lesson body looks short (${(l.html || '').length} chars)`);

    // quiz
    if (!l.quiz || l.quiz.length < 4) err('quiz', `${id}: needs at least 4 quiz questions (has ${(l.quiz || []).length})`);
    (l.quiz || []).forEach((q, i) => {
      const where = `${id} Q${i + 1}`;
      count('quiz');
      if (!q.q || q.q.length < 10) err('quiz', `${where}: question text missing`);
      if (!Array.isArray(q.options) || q.options.length < 3) err('quiz', `${where}: needs 3+ options`);
      else {
        if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) err('quiz', `${where}: invalid answer index`);
        if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) err('quiz', `${where}: duplicate options`);
        if (q.options.some((o) => !o.trim())) err('quiz', `${where}: empty option`);
      }
      if (!q.why || q.why.length < 15) err('quiz', `${where}: missing explanation`);
    });
    // answer position balance is reported below as a warning

    // cards
    if (!l.cards || l.cards.length < 4) err('cards', `${id}: needs at least 4 flashcards (has ${(l.cards || []).length})`);
    (l.cards || []).forEach((c, i) => {
      count('cards');
      if (!c.f || !c.b) err('cards', `${id} card ${i + 1}: empty side`);
    });
  }

  // answer position distribution, to avoid a predictable "always B" quiz
  const pos = {};
  let total = 0;
  for (const l of Object.values(lessons)) for (const q of l.quiz || []) { pos[q.answer] = (pos[q.answer] || 0) + 1; total++; }
  stats['answer positions'] = Object.entries(pos).map(([k, v]) => `${'ABCD'[k]}=${v}`).join(' ');
  // Source order is skewed by authoring habit; the app shuffles options at
  // runtime (verified in the end-to-end tests), so this is reported, not failed.

  // cheat sheets
  const moduleHasSheet = {};
  for (const [id, s] of Object.entries(sheets)) {
    count('sheets');
    if (!modById[s.module]) err('sheets', `${id}: unknown module ${s.module}`);
    else moduleHasSheet[s.module] = true;
    if (!s.title || !s.summary) err('sheets', `${id}: missing title or summary`);
    if (!s.html || s.html.length < 1500) warn('sheets', `${id}: very short`);
    if (!fs.existsSync(path.join(DIST, 'cheatsheets', `${id}.html`))) err('sheets', `${id}: dist/cheatsheets/${id}.html missing`);
  }
  for (const m of modules) if (!moduleHasSheet[m.id]) err('sheets', `module ${m.id} has no cheat sheet`);
  if (!fs.existsSync(path.join(DIST, 'cheatsheets/index.html'))) err('sheets', 'cheatsheets/index.html missing');
}

// ---------------------------------------------------------------- 2. paths
function checkPaths() {
  const P = A.paths;
  const required = ['devops', 'cloud', 'sre'];
  const liveIds = P.live.map((p) => p.id);
  for (const r of required) if (!liveIds.includes(r)) err('paths', `missing live path ${r}`);
  for (const p of P.live) {
    count('live paths');
    for (const k of ['title', 'summary', 'audience']) if (!p[k]) err('paths', `${p.id}: missing ${k}`);
    if (!p.outcomes || p.outcomes.length < 4) err('paths', `${p.id}: needs 4+ outcomes`);
    if (new Set(p.modules).size !== p.modules.length) err('paths', `${p.id}: duplicate modules`);
    const seen = new Set();
    for (const mid of p.modules) {
      if (!modById[mid]) { err('paths', `${p.id}: unknown module ${mid}`); continue; }
      for (const r of modById[mid].requires) {
        if (!p.modules.includes(r)) err('paths', `${p.id}: ${mid} requires ${r}, which is not in the path`);
        else if (!seen.has(r)) err('paths', `${p.id}: ${mid} appears before its prerequisite ${r}`);
      }
      seen.add(mid);
    }
    // every module reachable (no module in the path that nothing unlocks is fine; a root must exist)
    if (!p.modules.some((m) => modById[m] && modById[m].requires.length === 0)) err('paths', `${p.id}: has no starting module`);
  }
  if (!P.planned || P.planned.length < 3) err('paths', 'need at least 3 planned paths shown as roadmap');
  for (const p of P.planned || []) if (!p.title || !p.summary) err('paths', `planned ${p.id}: missing title or summary`);
}

// ---------------------------------------------------------------- 3. forbidden strings and domain
const TEXT_EXT = /\.(html|js|css|json|md|txt|xml|svg|webmanifest)$/;
function checkStrings() {
  const files = [
    ...walk(SRC, (p) => TEXT_EXT.test(p)),
    ...walk(path.join(ROOT, 'tools'), (p) => /\.js$/.test(p) && !/validate\.js$|e2e\.js$|shot\.js$/.test(p)),
    ...walk(DIST, (p) => TEXT_EXT.test(p) || /CNAME$/.test(p)),
    path.join(DIST, 'CNAME')
  ].filter((p, i, a) => fs.existsSync(p) && a.indexOf(p) === i);

  const gitRe = /\bgit(hub|lab|ops|leaks|ea)/i;
  const emojiRe = /\p{Extended_Pictographic}/u;
  for (const f of files) {
    const text = read(f);
    count('files scanned');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (gitRe.test(line)) err('no-git', `${rel(f)}:${i + 1}: ${line.trim().slice(0, 90)}`);
      if (/learn\.eknathalabs/i.test(line)) err('domain', `${rel(f)}:${i + 1}: old domain ${line.trim().slice(0, 80)}`);
      if (emojiRe.test(line) && !/\.svg$/.test(f)) err('style', `${rel(f)}:${i + 1}: emoji found`);
      if (/[→←⇒]/.test(line)) err('style', `${rel(f)}:${i + 1}: arrow glyph found`);
      if (/\b(TODO|FIXME|lorem ipsum)\b/i.test(line) && !/validate\.js$/.test(f)) err('style', `${rel(f)}:${i + 1}: placeholder text`);
    });
    // em dash density in prose is a style problem; just count for the report
  }

  // domain
  const cname = fs.existsSync(path.join(DIST, 'CNAME')) ? read(path.join(DIST, 'CNAME')).trim() : '';
  if (cname !== DOMAIN) err('domain', `dist/CNAME is "${cname}", expected ${DOMAIN}`);
  if (A.domain !== DOMAIN) err('domain', `data.js domain is "${A.domain}"`);
  const index = read(path.join(DIST, 'index.html'));
  if (!index.includes(`https://${DOMAIN}/`)) err('domain', 'index.html lacks canonical/og URL for the new domain');
  const sm = read(path.join(DIST, 'sitemap.xml'));
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  stats['sitemap urls'] = locs.length;
  for (const u of locs) {
    if (!u.startsWith(`https://${DOMAIN}/`)) err('domain', `sitemap URL on wrong host: ${u}`);
    else {
      const p = u.slice(`https://${DOMAIN}/`.length);
      const target = p === '' ? 'index.html' : p.endsWith('/') ? p + 'index.html' : p;
      if (!fs.existsSync(path.join(DIST, target))) err('links', `sitemap URL has no file: ${u}`);
    }
  }
  const robots = read(path.join(DIST, 'robots.txt'));
  if (!robots.includes(`https://${DOMAIN}/sitemap.xml`)) err('domain', 'robots.txt does not reference the sitemap on the new domain');
}

// ---------------------------------------------------------------- 4. code block syntax
function extractBlocks() {
  const out = [];
  const files = [...walk(path.join(SRC, 'content'), (p) => p.endsWith('.md')), ...walk(path.join(SRC, 'cheatsheets'), (p) => p.endsWith('.md'))];
  for (const f of files) {
    const text = read(f);
    const re = /^```(\w+)?[^\n]*\n([\s\S]*?)^```/gm;
    let m;
    while ((m = re.exec(text))) {
      const line = text.slice(0, m.index).split('\n').length;
      out.push({ file: rel(f), line, lang: (m[1] || '').toLowerCase(), code: m[2] });
    }
  }
  return out;
}

function bashSyntax(code) {
  const r = spawnSync('bash', ['-n'], { input: code, encoding: 'utf8' });
  return r.status === 0 ? null : (r.stderr || 'syntax error').split('\n')[0].replace(/^bash: line \d+: /, '');
}

function balance(code, { hashComments = true, slashComments = false } = {}) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  let i = 0;
  let line = 1;
  while (i < code.length) {
    const c = code[i];
    if (c === '\n') line++;
    if (hashComments && c === '#') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (slashComments && c === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (slashComments && c === '/' && code[i + 1] === '*') { const e = code.indexOf('*/', i + 2); if (e < 0) return `unterminated comment at line ${line}`; i = e + 2; continue; }
    if (c === '"' || c === "'") {
      const q = c; i++;
      while (i < code.length && code[i] !== q) { if (code[i] === '\\') i++; if (code[i] === '\n' && q === '"') return `unterminated string at line ${line}`; i++; }
      i++; continue;
    }
    if ('([{'.includes(c)) stack.push(c);
    else if (')]}'.includes(c)) { if (stack.pop() !== pairs[c]) return `unbalanced ${c} at line ${line}`; }
    i++;
  }
  return stack.length ? `unclosed ${stack[stack.length - 1]}` : null;
}

function dockerfileCheck(code) {
  const ok = new Set(['FROM', 'RUN', 'CMD', 'LABEL', 'EXPOSE', 'ENV', 'ADD', 'COPY', 'ENTRYPOINT', 'VOLUME', 'USER', 'WORKDIR', 'ARG', 'ONBUILD', 'STOPSIGNAL', 'HEALTHCHECK', 'SHELL']);
  let cont = false;
  let first = true;
  for (const raw of code.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (cont) { cont = line.endsWith('\\'); continue; }
    const kw = line.split(/\s+/)[0].toUpperCase();
    if (!ok.has(kw)) return `unknown instruction "${line.split(/\s+/)[0]}"`;
    if (first && !['FROM', 'ARG'].includes(kw)) return 'must start with FROM';
    first = false;
    cont = line.endsWith('\\');
    if (['CMD', 'ENTRYPOINT'].includes(kw) && line.slice(kw.length).trim().startsWith('[')) {
      try { JSON.parse(line.slice(kw.length).trim()); } catch { return `${kw} exec form is not valid JSON`; }
    }
  }
  return null;
}

function iniCheck(code) {
  for (const raw of code.split('\n')) {
    const l = raw.trim();
    if (!l || l.startsWith('#') || l.startsWith(';')) continue;
    if (/^\[[A-Za-z]+\]$/.test(l)) continue;
    if (/^[A-Za-z][A-Za-z0-9]*=/.test(l)) continue;
    return `bad line: ${l.slice(0, 40)}`;
  }
  return null;
}

// Parse the quiz and card fences with the same grammar the build uses.
function quizSourceCheck(b) {
  const lines = b.code.split('\n').filter((l) => l.trim());
  let q = null;
  const qs = [];
  for (const l of lines) {
    if (l.startsWith('Q:')) { q = { opts: 0, plus: 0, why: false }; qs.push(q); }
    else if (!q) return 'line outside a question';
    else if (l.startsWith('+ ')) { q.opts++; q.plus++; }
    else if (l.startsWith('- ')) q.opts++;
    else if (l.startsWith('> ')) q.why = true;
    else return `unparseable line: ${l.slice(0, 40)}`;
  }
  qs.forEach((x, i) => {
    if (x.plus !== 1) err('quiz-src', `${b.file}:${b.line} Q${i + 1}: needs exactly one correct option (has ${x.plus})`);
    if (x.opts < 3) err('quiz-src', `${b.file}:${b.line} Q${i + 1}: needs 3+ options`);
    if (!x.why) err('quiz-src', `${b.file}:${b.line} Q${i + 1}: needs an explanation`);
  });
  return null;
}

function checkCode() {
  const blocks = extractBlocks();
  stats['code blocks'] = blocks.length;
  const yamlJobs = [];
  const pyJobs = [];

  for (const b of blocks) {
    const where = `${b.file}:${b.line}`;
    const lang = b.lang;
    let msg = null;

    if (lang === 'bash' || lang === 'sh' || lang === 'shell') {
      msg = bashSyntax(b.code); count('bash blocks');
    } else if (lang === 'console') {
      count('console blocks');
      // commands only: lines starting with "$ " plus their continuations
      const cmds = [];
      let cont = false;
      for (const l of b.code.split('\n')) {
        if (cont) { cmds.push(l); cont = /\\\s*$/.test(l); }
        else if (l.startsWith('$ ')) { cmds.push(l.slice(2)); cont = /\\\s*$/.test(l); }
      }
      if (cmds.length) {
        // join continuation lines, then check each command separately
        const joined = cmds.join('\n').replace(/\\\n/g, ' ').split('\n');
        for (const c of joined) {
          const e = bashSyntax(c);
          if (e) { err('syntax', `${where}: console command not valid shell (${e}): ${c.slice(0, 70)}`); }
        }
      }
    } else if (lang === 'yaml' || lang === 'yml') {
      yamlJobs.push(b); count('yaml blocks');
    } else if (lang === 'json') {
      count('json blocks');
      try { JSON.parse(b.code); } catch (e) { msg = `invalid JSON: ${e.message}`; }
    } else if (lang === 'python') {
      pyJobs.push(b); count('python blocks');
    } else if (lang === 'dockerfile') {
      msg = dockerfileCheck(b.code); count('dockerfile blocks');
    } else if (lang === 'hcl') {
      msg = balance(b.code, { hashComments: true, slashComments: true }); count('hcl blocks');
    } else if (lang === 'promql') {
      msg = balance(b.code, { hashComments: true }); count('promql blocks');
    } else if (lang === 'nginx') {
      msg = balance(b.code, { hashComments: true }); count('nginx blocks');
    } else if (lang === 'groovy') {
      msg = balance(b.code, { hashComments: false, slashComments: true }); count('groovy blocks');
    } else if (lang === 'ini') {
      msg = iniCheck(b.code); count('ini blocks');
    } else if (lang === 'quiz') {
      msg = quizSourceCheck(b); count('quiz blocks');
    } else if (lang === 'cards') {
      count('card blocks');
      const bad = b.code.split('\n').filter((l) => l.trim() && !l.includes(' :: '));
      if (bad.length) msg = `card lines without " :: ": ${bad[0].slice(0, 50)}`;
    } else if (lang === 'predict') {
      count('predict blocks');
      if (!/^Q: .+/m.test(b.code) || !/^\?\?\?\s*$/m.test(b.code)) msg = 'predict block needs a Q: line and a ??? separator';
    } else if (lang === 'diagram') {
      count('diagram blocks');
      if ((b.code.match(/^node:/gm) || []).length < 3) msg = 'diagram needs at least 3 nodes';
    } else if (lang === 'text' || lang === '') {
      if (!lang) msg = 'code fence without a language';
    } else {
      warn('syntax', `${where}: unchecked language "${lang}"`);
    }
    if (msg) err('syntax', `${where} (${lang}): ${msg}`);
  }

  // YAML and Python via python3, one process each
  if (yamlJobs.length) {
    const payload = JSON.stringify(yamlJobs.map((b) => b.code));
    const py = `
import sys, json, yaml
res = []
for src in json.load(sys.stdin):
    try:
        list(yaml.safe_load_all(src)); res.append(None)
    except Exception as e:
        res.append(str(e).split("\\n")[0])
print(json.dumps(res))
`;
    const r = spawnSync('python3', ['-I', '-c', py], { input: payload, encoding: 'utf8' });
    if (r.status !== 0) err('syntax', `PyYAML check failed to run: ${r.stderr.slice(0, 200)}`);
    else JSON.parse(r.stdout).forEach((m, i) => { if (m) err('syntax', `${yamlJobs[i].file}:${yamlJobs[i].line} (yaml): ${m}`); });
  }
  if (pyJobs.length) {
    const payload = JSON.stringify(pyJobs.map((b) => b.code));
    const py = `
import sys, json, ast
res = []
for src in json.load(sys.stdin):
    try:
        ast.parse(src); res.append(None)
    except SyntaxError as e:
        res.append(str(e))
print(json.dumps(res))
`;
    const r = spawnSync('python3', ['-I', '-c', py], { input: payload, encoding: 'utf8' });
    if (r.status !== 0) err('syntax', `python check failed to run: ${r.stderr.slice(0, 200)}`);
    else JSON.parse(r.stdout).forEach((m, i) => { if (m) err('syntax', `${pyJobs[i].file}:${pyJobs[i].line} (python): ${m}`); });
  }
}

// ---------------------------------------------------------------- 5. lesson structure
function checkLessonStructure() {
  const files = walk(path.join(SRC, 'content'), (p) => p.endsWith('.md'));
  for (const f of files) {
    const t = read(f);
    const id = rel(f);
    if (!/^---\n[\s\S]*?\n---\n/.test(t)) { err('structure', `${id}: missing frontmatter`); continue; }
    if (!/^## What you will learn/m.test(t)) err('structure', `${id}: missing "What you will learn"`);
    if (!/^> \*\*Incident:\*\*/m.test(t)) err('structure', `${id}: missing an Incident walkthrough`);
    if (!/^## Common mistakes/m.test(t)) err('structure', `${id}: missing "Common mistakes"`);
    if (!/```console/.test(t) && !/```(bash|yaml|hcl|dockerfile|promql|groovy)/.test(t)) err('structure', `${id}: has no worked code example`);
    const words = t.replace(/```[\s\S]*?```/g, '').split(/\s+/).length;
    if (words < 450) warn('structure', `${id}: only ${words} words of prose`);
    count('lesson words', words);
  }
}

// ---------------------------------------------------------------- 6. links and assets in dist
function checkLinks() {
  const htmlFiles = walk(DIST, (p) => p.endsWith('.html'));
  const attr = /\b(?:href|src)="([^"#][^"]*)"/g;
  for (const f of htmlFiles) {
    const text = read(f);
    let m;
    while ((m = attr.exec(text))) {
      const u = m[1];
      if (/^(https?:|mailto:|data:|javascript:)/.test(u)) continue;
      const clean = u.split('#')[0].split('?')[0];
      if (!clean) continue;
      const target = clean.startsWith('/') ? path.join(DIST, clean) : path.resolve(path.dirname(f), clean);
      const t = fs.existsSync(target) && fs.statSync(target).isDirectory() ? path.join(target, 'index.html') : target;
      if (!fs.existsSync(t)) err('links', `${rel(f)}: broken reference ${u}`);
      count('file links checked');
    }
  }
  // links inside lesson and sheet bodies
  const allowedHash = [];
  for (const [id, l] of Object.entries(lessons)) {
    for (const m of l.html.matchAll(/href="(#\/[^"]+)"/g)) {
      const h = m[1];
      let ok = false;
      let mm;
      if ((mm = h.match(/^#\/lesson\/([^/]+)\/([^/]+)$/))) ok = !!lessons[`${mm[1]}/${mm[2]}`];
      else if ((mm = h.match(/^#\/module\/([^/]+)$/))) ok = !!modById[mm[1]];
      else if ((mm = h.match(/^#\/cheatsheet\/([^/]+)$/))) ok = !!sheets[mm[1]];
      else if (/^#\/(paths|cheatsheets|review|labs|progress|skill-lab)$/.test(h)) ok = true;
      if (!ok) err('links', `lesson ${id}: broken app link ${h}`);
      allowedHash.push(h);
    }
    for (const m of l.html.matchAll(/href="(https?:[^"]+)"/g)) {
      if (!/eknathalabs\.com/.test(m[1])) warn('links', `lesson ${id}: external link ${m[1]}`);
    }
  }
  // service worker file list
  const sw = read(path.join(DIST, 'sw.js'));
  const list = sw.match(/\[[\s\S]*?\]/);
  if (list) {
    try {
      const files = JSON.parse(list[0].replace(/'/g, '"'));
      for (const f of files) {
        const p = f === './' || f === '/' ? 'index.html' : f.replace(/^\.?\//, '');
        if (!fs.existsSync(path.join(DIST, p))) err('links', `sw.js precaches missing file ${f}`);
      }
    } catch { /* format not JSON-like; skip */ }
  }
  // manifest
  try {
    const mf = JSON.parse(read(path.join(DIST, 'manifest.webmanifest')));
    if (!mf.name || !mf.icons || !mf.icons.length) err('links', 'manifest missing name or icons');
    for (const i of mf.icons || []) if (!fs.existsSync(path.join(DIST, i.src.replace(/^\.?\//, '')))) err('links', `manifest icon missing: ${i.src}`);
  } catch (e) { err('links', `manifest invalid: ${e.message}`); }
}

// ---------------------------------------------------------------- 7. size and budget
function checkBudgets() {
  const files = walk(DIST);
  const total = files.reduce((n, f) => n + fs.statSync(f).size, 0);
  stats['dist size KB'] = Math.round(total / 1024);
  const data = fs.statSync(path.join(DIST, 'assets/data.js')).size;
  stats['data.js KB'] = Math.round(data / 1024);
  if (data > 3 * 1024 * 1024) warn('budget', `data.js is ${Math.round(data / 1024)} KB`);
  const fonts = walk(path.join(DIST, 'assets'), (p) => /\.woff2?$/.test(p)).reduce((n, f) => n + fs.statSync(f).size, 0);
  stats['fonts KB'] = Math.round(fonts / 1024);
  if (fonts > 1200 * 1024) warn('budget', `fonts total ${Math.round(fonts / 1024)} KB`);
}


// ---------------------------------------------------------------- 8. references, interview, promise, voice, print
const REF_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(kubernetes\.io|docker\.com|hashicorp\.com|terraform\.io|aws\.amazon\.com|microsoft\.com|azure\.com|prometheus\.io|sre\.google|python\.org|man7\.org|rfc-editor\.org|opentelemetry\.io|grafana\.com|helm\.sh|kernel\.org|gnu\.org|redhat\.com|ubuntu\.com|debian\.org|nginx\.org|openssh\.com|argoproj\.github\.io|cncf\.io|opencontainers\.org|github\.com|cloud\.google\.com|cloudflare\.com|iptables\.org|netfilter\.org|systemd\.io|freedesktop\.org|kubectl\.docs\.kubernetes\.io|kustomize\.io|pypa\.io|pytest\.org|readthedocs\.io|postgresql\.org|jenkins\.io|semver\.org|owasp\.org|nist\.gov|slsa\.dev|sigstore\.dev|open-policy-agent\.org|aquasec\.com|trivy\.dev|podman\.io|buildah\.io|etcd\.io|cni\.dev|istio\.io|envoyproxy\.io|linuxfoundation\.org|cisecurity\.org|google\.com|w3\.org|ietf\.org|letsencrypt\.org|github\.io|gitlab\.com|hashicorp\.github\.io|opengroup\.org|jq\.dev|jqlang\.github\.io|curl\.se|openssl\.org|lvm2\.sourceware\.org|sourceware\.org|kernel\.dk|brendangregg\.com|netflix\.github\.io|principlesofchaos\.org|litmuschaos\.io|chaos-mesh\.org|pagerduty\.com|atlassian\.com|dora\.dev|12factor\.net|martinfowler\.com|apache\.org|elastic\.co|fluentbit\.io|fluentd\.org|vector\.dev|jaegertracing\.io|loki\.io|thanos\.io|victoriametrics\.com|containerd\.io|continuousdelivery\.com|keepachangelog\.com|fluxcd\.io|keda\.sh|karpenter\.sh|cilium\.io|openfeature\.dev|selinuxproject\.org|shellcheck\.net|everything\.curl\.dev|jqlang\.org|amazonaws\.com|mozilla\.org|tcpdump\.org|wireshark\.org|wireguard\.com|nftables\.org|cisa\.gov|oauth\.net|openpolicyagent\.org|kyverno\.io|mitre\.org|opengroup\.org|sigstore\.dev|ansible\.com|redis\.io|mysql\.com|mongodb\.com|pgbouncer\.org|pgbackrest\.org|use-the-index-luke\.com|git-scm\.com|go\.dev|golang\.org|conventionalcommits\.org|trunkbaseddevelopment\.com|anthropic\.com|claude\.com|modelcontextprotocol\.io|json-schema\.org)(\/|$)/;
function checkExtras() {
  // official references on every lesson, module and sheet
  const checkRefs = (what, refs) => {
    if (!Array.isArray(refs) || refs.length < 2) { err('refs', `${what}: needs at least 2 official references`); return; }
    const seen = new Set();
    for (const r of refs) {
      if (!r.t || !r.u) err('refs', `${what}: reference missing title or url`);
      else if (!/^https:\/\//.test(r.u)) err('refs', `${what}: reference must be https: ${r.u}`);
      else if (!REF_HOSTS.test(r.u)) err('refs', `${what}: host not on the allow list: ${r.u}`);
      if (/\bgit(hub|lab|ops|leaks|ea)/i.test((r.t || '') + (r.u || '').replace(/github\.(com|io)/g, ''))) err('refs', `${what}: forbidden word in reference: ${r.t} ${r.u}`);
      if (seen.has(r.u)) err('refs', `${what}: duplicate reference ${r.u}`);
      seen.add(r.u); count('references');
    }
  };
  for (const [id, l] of Object.entries(lessons)) checkRefs('lesson ' + id, l.refs);
  for (const [id, s] of Object.entries(sheets)) checkRefs('sheet ' + id, s.refs);
  for (const m of modules) checkRefs('module ' + m.id, m.refs);

  // interview hub
  const IV = A.interview || [];
  const mods = new Set();
  const seen = new Set();
  for (const x of IV) {
    if (!modById[x.module]) err('interview', `unknown module ${x.module}`);
    if (!['junior', 'mid', 'senior'].includes(x.level)) err('interview', `${x.id}: bad level ${x.level}`);
    if (!x.q || !x.q.trim()) err('interview', `${x.id}: empty question`);
    if ((x.text || '').split(/\s+/).length < 25) err('interview', `${x.id}: answer too short`);
    if (seen.has(x.id)) err('interview', `duplicate id ${x.id}`);
    seen.add(x.id); mods.add(x.module); count('interview questions');
    if (/\bgit(hub|lab|ops|leaks|ea)/i.test(x.q + ' ' + x.text)) err('interview', `${x.id}: forbidden word`);
  }
  for (const m of modules) if (!mods.has(m.id)) err('interview', `module ${m.id} has no interview questions`);
  for (const lv of ['junior', 'mid', 'senior']) if (!IV.some((x) => x.level === lv)) err('interview', `no ${lv} questions`);

  // every live path covers its modules in prerequisite order, every lesson is on some path
  const covered = new Set();
  for (const p of A.paths.live) {
    const pos = Object.fromEntries(p.modules.map((m, i) => [m, i]));
    for (const m of p.modules) {
      if (!modById[m]) { err('paths', `${p.id}: unknown module ${m}`); continue; }
      for (const r of modById[m].requires) if (!(r in pos) || pos[r] > pos[m]) err('paths', `${p.id}: ${m} requires ${r} earlier in the path`);
      modById[m].lessons.forEach((l) => covered.add(l));
    }
  }
  for (const id of Object.keys(lessons)) if (!covered.has(id)) err('paths', `lesson ${id} is not on any live path`);

  // footer promise, no blog or newsletter, voice and print wiring
  const PROMISE = 'Free · No login · No ads · No cookies';
  const appJs = read(path.join(DIST, 'assets/app.js'));
  if (!appJs.includes(PROMISE) && !appJs.includes(PROMISE.replace(/·/g, '\\u00b7'))) err('footer', 'app.js is missing the footer promise');
  for (const f of ['cheatsheets/index.html', ...Object.keys(sheets).map((k) => `cheatsheets/${k}.html`)]) {
    const h = read(path.join(DIST, f));
    if (!h.includes(PROMISE)) err('footer', `${f}: missing footer promise`);
    if (/blog|newsletter|substack/i.test(h.replace(/<style[\s\S]*?<\/style>/g, ''))) err('footer', `${f}: mentions blog or newsletter`);
  }
  if (/newsletter|substack|>\s*Blog\s*</i.test(appJs)) err('footer', 'app.js mentions blog or newsletter');
  const sw = read(path.join(DIST, 'sw.js'));
  if (!/assets\/voice\.js/.test(sw)) err('voice', 'voice.js is not in the service worker precache');
  if (!fs.existsSync(path.join(DIST, 'assets/voice.js'))) err('voice', 'assets/voice.js missing');
  if (!/assets\/voice\.js/.test(read(path.join(DIST, 'index.html')))) err('voice', 'index.html does not load voice.js');
  const css = read(path.join(DIST, 'assets/app.css'));
  if (!/@media print/.test(css) || !/MARGA by EknathaLabs/.test(css)) err('print', 'print stylesheet or watermark text missing');
  if (!/body::after/.test(css)) err('print', 'second watermark layer missing');
  for (const k of Object.keys(sheets)) {
    const h = read(path.join(DIST, `cheatsheets/${k}.html`));
    if (!/data-print/.test(h)) err('print', `cheatsheets/${k}.html has no print button`);
    if (!/voice-slot/.test(h)) err('voice', `cheatsheets/${k}.html has no voice bar`);
  }
  if (fs.existsSync(path.join(ROOT, '.github'))) err('deploy', '.github exists, but the site must not use workflows');
}

function checkPractice() {
  const mods = new Set(A.modules.map((m) => m.id));
  const FORBID = /\bgit(hub|lab|ops|leaks|ea)/i;
  const https = (u) => typeof u === 'string' && /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(u);
  // case studies
  if (!Array.isArray(A.cases) || A.cases.length < 50) err('cases', `need at least 50 case studies, found ${(A.cases || []).length}`);
  const ids = new Set();
  for (const c of A.cases || []) {
    const w = `case ${c.id}`;
    if (ids.has(c.id)) err('cases', `${w}: duplicate id`); ids.add(c.id);
    for (const k of ['title', 'company', 'area', 'what', 'cause', 'fix', 'lesson']) if (!c[k] || String(c[k]).length < (['what', 'cause', 'fix', 'lesson'].includes(k) ? 30 : 2)) err('cases', `${w}: missing or short "${k}"`);
    if (!(c.year >= 1990 && c.year <= 2026)) err('cases', `${w}: bad year ${c.year}`);
    if (!Array.isArray(c.modules) || !c.modules.length || c.modules.some((m) => !mods.has(m))) err('cases', `${w}: bad module list`);
    if (!c.source || !https(c.source.u) || !c.source.t) err('cases', `${w}: needs an https source with a title`);
    if (FORBID.test(JSON.stringify(c))) err('cases', `${w}: contains a forbidden word`);
    count('case studies');
  }
  for (const m of A.modules) if ((A.cases || []).filter((c) => c.modules.includes(m.id)).length < 2) err('cases', `module ${m.id} has fewer than 2 case studies`);
  // reading lists
  for (const m of A.modules) {
    const list = (A.reading || {})[m.id] || [];
    if (list.length < 5) err('reading', `module ${m.id} needs at least 5 reading items, found ${list.length}`);
    for (const r of list) {
      const w = `reading ${m.id}: ${r.t}`;
      if (!r.t || !r.by || !r.kind || !r.why || String(r.why).length < 30) err('reading', `${w}: missing field or short reason`);
      if (!REF_HOSTS.test(r.u || '')) err('reading', `${w}: host not on the allow list: ${r.u}`);
      if (FORBID.test(JSON.stringify(r))) err('reading', `${w}: forbidden word`);
      count('reading items');
    }
  }
  // incident games
  {
    const gs = A.games || [];
    for (const m of A.modules) if (gs.filter((g) => g.module === m.id).length < 1) err('games', `module ${m.id} has no incident game`);
    const gids = new Set();
    for (const g of gs) {
      const w = `game ${g.id}`;
      if (gids.has(g.id)) err('games', `${w}: duplicate id`); gids.add(g.id);
      if (!mods.has(g.module)) err('games', `${w}: bad module`);
      if (!A.lessons[g.lesson]) err('games', `${w}: unknown lesson ${g.lesson}`);
      if (!['Beginner', 'Intermediate', 'Advanced'].includes(g.level)) err('games', `${w}: bad level`);
      const ids = Object.keys(g.scenes);
      if (ids.length < 6) err('games', `${w}: needs at least 6 scenes`);
      const ends = ids.filter((i) => g.scenes[i].end);
      if (!ends.some((i) => g.scenes[i].end === 'win')) err('games', `${w}: needs a winning ending`);
      if (!ends.some((i) => g.scenes[i].end === 'fail')) err('games', `${w}: needs a failing ending`);
      const seen = new Set(); const stack = [g.start];
      while (stack.length) { const i = stack.pop(); if (seen.has(i)) continue; seen.add(i); const sc = g.scenes[i]; if (!sc) { err('games', `${w}: missing scene ${i}`); continue; } for (const c of sc.choices) stack.push(c.to); }
      for (const i of ids) {
        const sc = g.scenes[i];
        if (!seen.has(i)) err('games', `${w}: scene ${i} is unreachable`);
        if (!sc.text || sc.text.length < 40) err('games', `${w}: scene ${i} has short text`);
        if (sc.end) { if (sc.choices.length) err('games', `${w}: ending ${i} has choices`); if (!sc.takeaway || sc.takeaway.length < 30) err('games', `${w}: ending ${i} needs a takeaway`); }
        else { if (sc.choices.length < 2) err('games', `${w}: scene ${i} needs at least 2 choices`); for (const c of sc.choices) { if (c.fb.length < 20) err("games", `${w}: scene ${i} has a short feedback`); if (!/ Example: /.test(c.fb)) err("games", `${w}: scene ${i} choice has no worked example`); } }
      }
      if (FORBID.test(JSON.stringify(g)) || /TODO|FIXME|lorem ipsum/i.test(JSON.stringify(g))) err('games', `${w}: forbidden or placeholder text`);
      count('incident games');
    }
  }
  // capstone projects
  {
    const pathIds = ['devops', 'cloud', 'sre', 'devsecops'];
    const caps = A.capstones || [];
    for (const pid of pathIds) if (caps.filter((c) => c.path === pid).length !== 4) err('capstones', `path ${pid} needs exactly 4 capstones, found ${caps.filter((c) => c.path === pid).length}`);
    const cids = new Set();
    for (const c of caps) {
      const w = `capstone ${c.id}`;
      if (cids.has(c.id)) err('capstones', `${w}: duplicate id`); cids.add(c.id);
      if (!pathIds.includes(c.path)) err('capstones', `${w}: unknown path`);
      if (!['Beginner', 'Intermediate', 'Advanced'].includes(c.level)) err('capstones', `${w}: bad level`);
      if (!(c.hours >= 2 && c.hours <= 12)) err('capstones', `${w}: bad hours`);
      if (!c.modules.length || c.modules.some((m) => !mods.has(m))) err('capstones', `${w}: bad module list`);
      if (c.steps.length < 5) err('capstones', `${w}: needs at least 5 steps`);
      if (c.check.length < 3) err('capstones', `${w}: needs at least 3 self-check items`);
      for (const k of ['summary', 'goal', 'build', 'stretch']) if (String(c[k]).length < 20) err('capstones', `${w}: short ${k}`);
      if (FORBID.test(JSON.stringify(c))) err('capstones', `${w}: contains a forbidden word`);
      if (/TODO|FIXME|lorem ipsum/i.test(JSON.stringify(c))) err('capstones', `${w}: placeholder text`);
      count('capstones');
    }
  }
  // badges: every stage and path has artwork and a colour, and the code never touches the network
  {
    const src = read(path.join(SRC, 'app/badges.js'));
    const symBlock = (src.match(/var SYM = \{([\s\S]*?)\n\};/) || [])[1] || '';
    const hueBlock = (src.match(/var HUES = \{([^}]*)\}/) || [])[1] || '';
    for (const id of [...A.modules.map((m) => m.id), ...A.paths.live.map((p) => p.id)]) {
      if (!new RegExp(`["']?\\b${id}["']?:`).test(symBlock)) err('badges', `no badge symbol for ${id}`);
      if (!new RegExp(`["']?\\b${id}["']?:`).test(hueBlock)) err('badges', `no badge colour for ${id}`);
    }
    if (/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket/.test(src)) err('badges', 'badges.js must not use the network');
    if (/certified/i.test(src.replace(/Not a certification/g, ''))) err('badges', 'badges.js must not claim certification');
    count('badge designs');
  }
  // architecture walkthroughs
  {
    const ws = A.walkthroughs || [];
    if (ws.length < 16) err('walkthroughs', `need at least 16 walkthroughs, found ${ws.length}`);
    const wids = new Set();
    for (const w of ws) {
      const t = `walkthrough ${w.id}`;
      count('walkthroughs');
      if (wids.has(w.id)) err('walkthroughs', `${t}: duplicate id`); wids.add(w.id);
      if (!['Beginner', 'Intermediate', 'Advanced'].includes(w.level)) err('walkthroughs', `${t}: bad level`);
      if (!w.summary || w.summary.length < 40) err('walkthroughs', `${t}: short summary`);
      for (const m of w.modules) if (!mods.has(m)) err('walkthroughs', `${t}: unknown module ${m}`);
      for (const l of w.lessons) if (!A.lessons[l]) err('walkthroughs', `${t}: unknown lesson ${l}`);
      if (!/class="dg"/.test(w.html)) err('walkthroughs', `${t}: needs a component diagram`);
      if (!/class="predict"/.test(w.html)) err('walkthroughs', `${t}: needs a predict question`);
      for (const h of ['What it must do', 'A ', 'Where it breaks', 'Trade-offs']) if (!w.html.includes(h)) err('walkthroughs', `${t}: missing section ${h}`);
      if (!/not the internal design of any real company/.test(w.text)) err('walkthroughs', `${t}: missing the honest disclaimer`);
      if (w.text.split(/\s+/).length < 450) warn('walkthroughs', `${t}: short`);
      if (FORBID.test(JSON.stringify(w))) err('walkthroughs', `${t}: forbidden word`);
    }
  }
  // architecture studies
  if ((A.arch || []).length < 50) err('arch', `need at least 50 architecture studies, found ${(A.arch || []).length}`);
  const calcIds = new Set(require(path.join(SRC, 'app', 'calc.js')).list.map((x) => x.id));
  for (const a of A.arch || []) {
    const w = `architecture ${a.id}`;
    if (!a.title || !a.html || a.html.length < 2000) err('arch', `${w}: missing or short body`);
    for (const h of ['The system', 'Timeline as reported', 'Root cause', 'Lessons learned', 'Trade-offs to weigh']) if (!a.html.includes(h)) err('arch', `${w}: missing section "${h}"`);
    if (!Array.isArray(a.sources) || !a.sources.length || a.sources.some((x) => !https(x.u))) err('arch', `${w}: needs https sources`);
    if (!Array.isArray(a.calcs) || !a.calcs.length || a.calcs.some((x) => !calcIds.has(x))) err('arch', `${w}: calculators missing or unknown: ${JSON.stringify(a.calcs)}`);
    if (FORBID.test(a.html + a.title + JSON.stringify(a.sources))) err('arch', `${w}: contains a forbidden word`);
    count('architecture studies');
  }
  // drills
  for (const m of A.modules) {
    const n = (A.drills || []).filter((d) => d.module === m.id).length;
    if (n < 5) err("drills", `module ${m.id} has ${n} drills, needs at least 5`);
  }
  const dids = new Set();
  for (const d of A.drills || []) {
    const w = `drill ${d.id}`;
    if (dids.has(d.id)) err('drills', `${w}: duplicate id`); dids.add(d.id);
    if (!mods.has(d.module)) err('drills', `${w}: unknown module`);
    if (!d.title || !d.story || !d.evidence || !d.why) err('drills', `${w}: missing field`);
    if (!Array.isArray(d.options) || d.options.length < 3 || d.options.filter((o) => o.ok).length !== 1) err('drills', `${w}: needs 3 or more options and exactly one correct`);
    if (FORBID.test(JSON.stringify(d))) err('drills', `${w}: contains a forbidden word`);
    count('drills');
  }
  // scripts present, loaded, precached
  const html = read(path.join(DIST, 'index.html'));
  const sw = read(path.join(DIST, 'sw.js'));
  for (const f of ['a11y.js', 'counter.js', 'calc.js', 'extras.js']) {
    if (!fs.existsSync(path.join(DIST, 'assets', f))) err('assets', `assets/${f} missing`);
    if (!html.includes(f)) err('assets', `index.html does not load ${f}`);
    if (!sw.includes(f)) err('assets', `${f} is not in the offline cache list`);
  }
  for (const f of ['atkinson-400.woff2', 'atkinson-700.woff2', 'opendyslexic-400.woff2', 'opendyslexic-700.woff2']) if (!fs.existsSync(path.join(DIST, 'assets', 'fonts', f))) err('assets', `font ${f} missing`);
  for (const f of walk(path.join(DIST, 'cheatsheets'), (p) => /\.html$/.test(p))) {
    const t = read(f);
    if (!t.includes('a11y.js') || !t.includes('counter.js') || !t.includes('id="visitors"')) err('sheets', `${rel(f)}: lacks accessibility or visitor-count scripts`);
  }
  if (!A.counter) err('counter', 'no counter code configured'); else if (!/^[a-z0-9-]+$/.test(A.counter)) err('counter', 'bad counter code ' + A.counter);
  // calculator maths sanity
  const L = require(path.join(SRC, 'app', 'calc.js'));
  for (const d of L._defs) {
    const v = {}; d.inputs.forEach((i) => { v[i.id] = i.value; });
    const rows = d.compute(v);
    if (!rows.length || rows.some((r) => /NaN|undefined|Infinity/.test(r.join(' ')))) err('calc', `${d.id}: bad output with default values`);
  }
  if (Math.abs(L.math.budgetMinutes(99.9, 30) - 43.2) > 1e-9) err('calc', 'error budget formula is wrong');
  stats['calculators'] = L.list.length;
}

function checkMore() {
  const mods = new Set(A.modules.map((m) => m.id));
  const FORBID = /\bgit(hub|lab|ops|leaks|ea)/i;
  // glossary
  if ((A.glossary || []).length < 100) err('glossary', `need at least 100 terms, found ${(A.glossary || []).length}`);
  const gids = new Set();
  for (const g of A.glossary || []) {
    if (gids.has(g.id)) err('glossary', `${g.term}: duplicate id`); gids.add(g.id);
    if (!g.plain || g.plain.length < 15) err('glossary', `${g.term}: plain-words text is missing or short`);
    if (!g.def || g.def.length < 25) err('glossary', `${g.term}: definition is missing or short`);
    if (!mods.has(g.module)) err('glossary', `${g.term}: unknown module ${g.module}`);
    if (FORBID.test(JSON.stringify(g))) err('glossary', `${g.term}: contains a forbidden word`);
    if (/[<>]/.test(g.plain + g.def)) err('glossary', `${g.term}: contains markup characters`);
    count('glossary terms');
  }
  for (const m of A.modules) if ((A.glossary || []).filter((g) => g.module === m.id).length < 4) err('glossary', `module ${m.id} has fewer than 4 terms`);
  // explainers
  const ex = (() => { const w = { window: {} }; vm.runInNewContext(read(path.join(DIST, 'assets', 'explainers.js')), w); return w.window.MARGA_EXPLAINERS || []; })();
  if (ex.length < 200) err("explainers", `need at least 200, found ${ex.length}`);
  for (const m of mods) if (ex.filter((x) => x.module === m).length < 12) err("explainers", `module ${m} needs at least 12 explainers`);
  { const seenIds = new Set(); for (const x of ex) { if (seenIds.has(x.id)) err('explainers', `${x.id}: duplicate id`); seenIds.add(x.id); } }
  for (const m of mods) if (ex.filter((x) => x.module === m && x.kind === 'failure').length < 2) err('explainers', `module ${m} needs at least 2 failure and recovery explainers`);
  for (const x of ex) {
    if (!x.lesson || !lessons[x.lesson]) err('explainers', `${x.id}: lesson link "${x.lesson}" does not exist`);
    else if (lessons[x.lesson].module !== x.module) err('explainers', `${x.id}: lesson ${x.lesson} belongs to another module`);
    if (x.kind && x.kind !== 'failure') err('explainers', `${x.id}: unknown kind ${x.kind}`);
    if (x.kind === 'failure' && x.steps.length < 7) err('explainers', `${x.id}: a failure and recovery explainer needs at least 7 steps`);
    if (x.kind === 'failure' && !/^Failure and recovery:/.test(x.title)) err('explainers', `${x.id}: failure titles start with "Failure and recovery:"`);
    if (!mods.has(x.module)) err('explainers', `${x.id}: unknown module`);
    if (x.steps.length < 6) err('explainers', `${x.id}: fewer than 6 steps`);
    x.steps.forEach((s, i) => {
      if (!(s.f >= 0 && s.f < x.actors.length && s.t >= 0 && s.t < x.actors.length)) err('explainers', `${x.id} step ${i + 1}: actor index out of range`);
      if (!s.l || !s.n || s.n.length < 30) err('explainers', `${x.id} step ${i + 1}: needs a label and an explanation`);
    });
    if (FORBID.test(JSON.stringify(x))) err('explainers', `${x.id}: contains a forbidden word`);
    count('explainers');
  }
  // scripts present, loaded and cached for offline use
  const html = read(path.join(DIST, 'index.html')), sw = read(path.join(DIST, 'sw.js'));
  for (const f of ['net.js', 'search.js', 'yaml.js', 'explainers.js', 'more.js']) {
    if (!fs.existsSync(path.join(DIST, 'assets', f))) err('assets', `assets/${f} missing`);
    if (!html.includes(f)) err('assets', `index.html does not load ${f}`);
    if (!sw.includes(f)) err('assets', `${f} is not in the offline cache list`);
    if (FORBID.test(read(path.join(DIST, 'assets', f)))) err('assets', `assets/${f} contains a forbidden word`);
  }
  // Python playground: pinned to the installed version, loaded only on request
  const more = read(path.join(DIST, 'assets', 'more.js'));
  const pv = (more.match(/PY_VER = '([\d.]+)'/) || [])[1];
  let inst = null; try { inst = JSON.parse(read(path.join(ROOT, 'node_modules', 'pyodide', 'package.json'))).version; } catch (e) { /* optional */ }
  if (!pv) err('python', 'playground does not pin a Pyodide version'); else if (inst && inst !== pv) err('python', `playground uses Pyodide ${pv} but ${inst} is installed`);
  if (html.includes('pyodide')) err('python', 'index.html must not load Pyodide at page load');
  // subnet maths and search sanity
  const N = require(path.join(SRC, 'app', 'net.js'));
  if (N.info('192.168.10.130/26').hosts !== 62 || N.summarize(['10.0.0.0/25', '10.0.0.128/25']).join() !== '10.0.0.0/24') err('net', 'subnet maths gave a wrong answer');
  const SR = require(path.join(SRC, 'app', 'search.js'));
  SR.build([{ kind: 'Lesson', group: 'Lessons', title: 'Kubernetes pods', sub: '', body: '' }]);
  if (!SR.query('kuberntes').length) err('search', 'typo tolerance is broken');
  // the visitor line is always shown in the footer, and counter code is set
  if (!/visitors/.test(read(path.join(DIST, 'assets', 'app.js')))) err('counter', 'footer has no visitor line');
  stats['glossary terms'] = (A.glossary || []).length;
}

function checkTermLabs() {
  const FORBID = /\bgit(hub|lab|ops|leaks|ea)/i, EMOJI = /\p{Extended_Pictographic}/u, ARROW = /[←→⇒]/;
  const labs = A.termlabs || [];
  const parsed = require('./termlabs').load(path.join(SRC, 'termlabs'));
  parsed.forEach((l) => (l.errors || []).forEach((m) => err('termlabs', `${l.id || l.title}: ${m}`)));
  if (labs.length !== parsed.length) err('termlabs', 'data.js does not match src/termlabs');
  const KNOWN = new Set(['file', 'contains', 'equals', 'mode', 'owner', 'unchanged', 'service', 'proc', 'disk', 'cron', 'ran', 'group', 'cmd']);
  const MODS = ['linux', 'bash', 'networking', 'python'], LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
  const ids = new Set();
  for (const m of MODS) if (labs.filter((l) => l.module === m).length < 18) err("termlabs", `${m}: need at least 18 labs`);
  for (const l of labs) {
    const w = l.id || l.title;
    if (!/^[a-z0-9-]+$/.test(l.id || '')) err('termlabs', `${w}: bad id`);
    if (ids.has(l.id)) err('termlabs', `${w}: duplicate id`); ids.add(l.id);
    if (!MODS.includes(l.module)) err('termlabs', `${w}: unknown module ${l.module}`);
    if (!LEVELS.includes(l.level)) err('termlabs', `${w}: bad level ${l.level}`);
    if (!(l.minutes >= 5 && l.minutes <= 60)) err('termlabs', `${w}: minutes out of range`);
    if (l.lesson && !lessons[l.lesson]) err('termlabs', `${w}: lesson ${l.lesson} does not exist`);
    if (l.lesson && !l.lesson.startsWith(l.module + '/')) err('termlabs', `${w}: lesson is not in the same stage`);
    if (!l.title || !l.summary || (l.story || '').length < 60 || (l.explain || '').length < 60) err('termlabs', `${w}: missing title, summary, story or explanation`);
    if ((l.goals || []).length < 2) err('termlabs', `${w}: need at least 2 goals`);
    if ((l.hints || []).length < 3) err('termlabs', `${w}: need at least 3 hints`);
    if (!(l.solution || '').trim()) err('termlabs', `${w}: missing solution`);
    if (!/simulated/i.test(l.engine || '')) err('termlabs', `${w}: engine line must say the environment is simulated`);
    if (!(l.checks || []).length) err('termlabs', `${w}: no checks`);
    for (const c of l.checks || []) {
      if (!KNOWN.has(c.t)) err('termlabs', `${w}: unknown check type ${c.t}`);
      if (!c.label) err('termlabs', `${w}: a check has no label`);
      if (c.t === 'cmd' && !c.run) err('termlabs', `${w}: cmd check without run`);
    }
    const txt = JSON.stringify(l);
    if (FORBID.test(txt)) err('termlabs', `${w}: contains a forbidden word`);
    if (EMOJI.test(txt)) err('termlabs', `${w}: contains an emoji`);
    if (ARROW.test(txt)) err('termlabs', `${w}: contains an arrow glyph`);
    if (/TODO|FIXME|lorem ipsum/i.test(txt)) err('termlabs', `${w}: placeholder text`);
    if (/undefined|NaN|\[object Object\]/.test(`${l.title} ${l.summary} ${l.story} ${l.goals.join(' ')} ${l.hints.join(' ')} ${l.explain}`)) err('termlabs', `${w}: bad rendered text`);
  }
  for (const f of ['term-fs', 'term-parse', 'term-exec', 'term-cmds', 'term-text', 'term-awk', 'term-jq', 'term-sys', 'term-net', 'term-labs', 'termlabs-ui']) {
    const t = read(path.join(SRC, 'app', f + '.js'));
    if (FORBID.test(t)) err('termlabs', `${f}.js contains a forbidden word`);
    if (EMOJI.test(t) || ARROW.test(t)) err('termlabs', `${f}.js contains an emoji or arrow glyph`);
    if (/TODO|FIXME/.test(t)) err('termlabs', `${f}.js has a placeholder`);
    if (!fs.existsSync(path.join(DIST, 'assets', f + '.js'))) err('termlabs', `${f}.js missing from dist`);
  }
  const sw = read(path.join(DIST, 'sw.js'));
  for (const f of ['term-fs.js', 'term-labs.js', 'termlabs-ui.js']) if (!sw.includes('assets/' + f)) err('termlabs', `${f} is not in the offline precache`);
  const html = read(path.join(DIST, 'index.html'));
  if (/assets\/term-fs\.js/.test(html)) err('termlabs', 'the engine must not be loaded on every page');
  count('terminal labs', labs.length);
}

// ---------------------------------------------------------------- run
const steps = [
  ['content schema', checkSchema],
  ['role paths', checkPaths],
  ['forbidden strings and domain', checkStrings],
  ['code-block syntax', checkCode],
  ['lesson structure', checkLessonStructure],
  ['links and assets', checkLinks],
  ['size budgets', checkBudgets],
  ['references, interview, footer, voice, print', checkExtras],
  ['case studies, architecture, drills, accessibility, counter', checkPractice],
  ['glossary, explainers, search, subnet, playgrounds', checkMore],
  ['terminal labs', checkTermLabs]
];
for (const [name, fn] of steps) {
  const before = errors.length;
  try { fn(); } catch (e) { err('validator', `${name} crashed: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); }
  console.log(`${errors.length === before ? 'PASS' : 'FAIL'}  ${name}${errors.length === before ? '' : ` (${errors.length - before})`}`);
}

console.log('\nStats');
for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v}`);
if (warnings.length) { console.log(`\n${warnings.length} warning(s)`); warnings.slice(0, 40).forEach((w) => console.log('  ' + w)); }
if (errors.length) {
  console.log(`\n${errors.length} error(s)`);
  errors.slice(0, 120).forEach((e) => console.log('  ' + e));
  process.exit(1);
}
console.log('\nAll static checks passed.');
