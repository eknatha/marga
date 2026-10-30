'use strict';
/*
 * MARGA build: src/ -> dist/
 *   - converts Markdown lessons and cheat sheets to highlighted HTML
 *   - extracts quizzes and flashcards from fenced blocks
 *   - writes assets/data.js, the app shell, standalone cheat sheet pages,
 *     sitemap, robots, manifest, service worker and CNAME
 * No network access is needed at build time or at runtime.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Marked } = require('marked');
const hljs = require('highlight.js');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const DOMAIN = 'marga.eknathalabs.com';
// GoatCounter site code for the visitor count (https://CODE.goatcounter.com). Empty string disables it.
const EXTRA = ['voice.js', 'counter.js', 'calc.js', 'a11y.js', 'extras.js', 'net.js', 'search.js', 'yaml.js', 'explainers.js', 'lab.js', 'more.js', 'labs-ui.js', 'termlabs-ui.js', 'features.js', 'badges.js', 'choose.js', 'skilllab.js', 'casefile.js', 'sdlab.js', 'widgets.js'];
// terminal lab engine: loaded only when a terminal lab is opened, but cached for offline use
const ENGINE = ['term-fs.js', 'term-parse.js', 'term-exec.js', 'term-cmds.js', 'term-text.js', 'term-awk.js', 'term-jq.js', 'term-sys.js', 'term-net.js', 'term-labs.js'];
const COUNTER = process.env.MARGA_COUNTER !== undefined ? process.env.MARGA_COUNTER : 'marga-eknathalabs';
const SITE = 'https://' + DOMAIN;

/* ---------- custom highlight.js languages ---------- */
hljs.registerLanguage('hcl', function (h) {
  return {
    name: 'HCL',
    aliases: ['terraform', 'tf'],
    keywords: {
      keyword: 'resource variable output module provider data locals terraform backend required_providers required_version for_each count dynamic lifecycle moved import',
      literal: 'true false null',
      built_in: 'var local each self path count'
    },
    contains: [
      h.HASH_COMMENT_MODE, h.C_LINE_COMMENT_MODE, h.C_BLOCK_COMMENT_MODE,
      h.QUOTE_STRING_MODE, h.C_NUMBER_MODE,
      { className: 'attr', begin: /^\s*[A-Za-z_][\w-]*(?=\s*=)/, relevance: 0 }
    ]
  };
});
hljs.registerLanguage('promql', function (h) {
  return {
    name: 'PromQL',
    keywords: {
      keyword: 'by without on ignoring group_left group_right offset bool and or unless',
      built_in: 'rate irate increase sum avg min max count topk bottomk histogram_quantile delta deriv predict_linear absent up label_replace quantile_over_time avg_over_time max_over_time sort_desc clamp_min'
    },
    contains: [h.HASH_COMMENT_MODE, h.QUOTE_STRING_MODE, h.C_NUMBER_MODE,
      { className: 'attr', begin: /\b[a-z_][a-z0-9_]*(?=\s*[=!~]{1,2}\s*")/, relevance: 0 }]
  };
});

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function highlight(code, lang) {
  const map = { sh: 'bash', shell: 'bash', zsh: 'bash', yml: 'yaml', tf: 'hcl', terraform: 'hcl', jenkinsfile: 'groovy', docker: 'dockerfile' };
  lang = map[lang] || lang;
  if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  return esc(code);
}

/* ---------- markdown renderer ---------- */
function makeMarkdown() {
  const state = { toc: [], used: {} };
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      heading(text, level, raw) {
        let id = slugify(raw);
        if (state.used[id]) id += '-' + (++state.used[id]); else state.used[id] = 1;
        if (level === 2) state.toc.push({ id, text: raw.replace(/`/g, '') });
        return `<h${level} id="${id}">${text}</h${level}>\n`;
      },
      code(code, info) {
        const lang = (info || '').split(/\s+/)[0];
        if (lang === 'console') return renderConsole(code);
        if (lang === 'predict') return renderPredict(code);
        if (lang === 'diagram') return renderDiagram(code);
        const body = highlight(code, lang);
        return `<div class="code" data-lang="${esc(lang || 'text')}"><button class="copy" type="button" data-copy="${esc(code)}" aria-label="Copy code">Copy</button><pre tabindex="0"><code class="hljs">${body}</code></pre></div>\n`;
      },
      blockquote(quote) {
        const m = quote.match(/^\s*<p><strong>(Danger|Caution|Warning|Note|Tip|Incident|Exam tip|Why it matters|Real-world)[:.]?<\/strong>\s*/i);
        if (m) {
          const kind = m[1].toLowerCase().replace(/\s+/g, '-');
          const rest = quote.replace(m[0], '<p>');
          return `<aside class="callout callout-${kind}"><div class="callout-title">${m[1]}</div>${rest}</aside>\n`;
        }
        return `<blockquote>${quote}</blockquote>\n`;
      },
      table(header, body) {
        return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>\n`;
      },
      link(href, title, text) {
        const ext = /^https?:\/\//.test(href);
        return `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
      }
    }
  });
  return { marked, state };
}

function renderConsole(code) {
  const lines = code.replace(/\n$/, '').split('\n');
  let html = '';
  let copy = [];
  let cont = false;
  for (const line of lines) {
    if (cont) {
      html += `<span class="ln cmd cont">${highlight(line, 'bash')}</span>`;
      copy.push(line);
      cont = /\\\s*$/.test(line);
    } else if (/^\$ /.test(line)) {
      const cmd = line.slice(2);
      html += `<span class="ln cmd"><span class="ps" aria-hidden="true">$ </span>${highlight(cmd, 'bash')}</span>`;
      copy.push(cmd);
      cont = /\\\s*$/.test(cmd);
    } else {
      html += `<span class="ln out">${esc(line) || ' '}</span>`;
    }
  }
  const btn = copy.length ? `<button class="copy" type="button" data-copy="${esc(copy.join('\n'))}" aria-label="Copy commands">Copy commands</button>` : '';
  return `<div class="code console" data-lang="terminal">${btn}<pre tabindex="0"><code class="hljs">${html}</code></pre></div>\n`;
}

/* ---------- parsers ---------- */
function parseFrontmatter(text, file) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing frontmatter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const mm = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (mm) meta[mm[1]] = mm[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return { meta, body: m[2] };
}

function extractBlocks(body, file) {
  let quiz = [], cards = [];
  body = body.replace(/```quiz\n([\s\S]*?)```/g, (_, src) => { quiz = quiz.concat(parseQuiz(src, file)); return ''; });
  body = body.replace(/```cards\n([\s\S]*?)```/g, (_, src) => { cards = cards.concat(parseCards(src, file)); return ''; });
  return { body, quiz, cards };
}

function addOpt(cur, text) { const k = text.indexOf(' :: '); if (k >= 0) { cur.options.push(text.slice(0, k).trim()); cur.ox.push(text.slice(k + 4).trim()); } else { cur.options.push(text.trim()); cur.ox.push(''); } }
function parseQuiz(src, file) {
  const out = [];
  let cur = null;
  const push = () => { if (cur) out.push(cur); cur = null; };
  for (const raw of src.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith('Q: ')) { push(); cur = { q: line.slice(3).trim(), options: [], ox: [], answer: -1, why: '' }; }
    else if (!cur) throw new Error(`${file}: quiz line outside a question: ${line}`);
    else if (line.startsWith('+ ')) { cur.answer = cur.options.length; addOpt(cur, line.slice(2)); }
    else if (line.startsWith('- ')) addOpt(cur, line.slice(2));
    else if (line.startsWith('> ')) cur.why += (cur.why ? ' ' : '') + line.slice(2).trim();
    else throw new Error(`${file}: cannot parse quiz line: ${line}`);
  }
  push();
  return out;
}

function parseCards(src, file) {
  const out = [];
  for (const line of src.split('\n')) {
    if (!line.trim()) continue;
    const i = line.indexOf(' :: ');
    if (i < 0) throw new Error(`${file}: card needs " :: " separator: ${line}`);
    out.push({ f: line.slice(0, i).trim(), b: line.slice(i + 4).trim() });
  }
  return out;
}

function plain(html) {
  return html.replace(/<button[\s\S]*?<\/button>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}


/* ---------- predict-then-reveal and diagram blocks ---------- */
function renderPredict(code) {
  const parts = code.split(/^\?\?\?\s*$/m);
  if (parts.length !== 2) throw new Error('predict block needs a line with ??? between the question and the answer');
  const qm = parts[0].match(/^Q:\s*([^\n]+)\n?([\s\S]*)$/);
  if (!qm) throw new Error('predict block must start with "Q: ..."');
  const shown = qm[2].trim();
  const am = parts[1].split(/^>\s*/m);
  const out = am[0].trim(), why = (am[1] || '').trim();
  return `<div class="predict"><p class="predict-q"><strong>Predict first.</strong> ${esc(qm[1])}</p>` +
    (shown ? `<pre class="predict-code" tabindex="0"><code>${esc(shown)}</code></pre>` : '') +
    `<label class="predict-l">Your guess<textarea rows="2" class="predict-guess" placeholder="Type what you expect, then reveal the answer."></textarea></label>` +
    `<button type="button" class="btn btn-primary" data-act="predict-reveal" aria-expanded="false">Reveal the answer</button>` +
    `<div class="predict-out" hidden><p class="predict-ans"><strong>Answer:</strong> ${esc(out)}</p>${why ? `<p>${esc(why)}</p>` : ''}</div></div>\n`;
}
function renderDiagram(code) {
  const nodes = [], edges = []; let title = '';
  for (const raw of code.split('\n')) {
    const ln = raw.trim(); if (!ln) continue;
    let m;
    if ((m = ln.match(/^title:\s*(.+)$/))) title = m[1];
    else if ((m = ln.match(/^node:\s*(.+)$/))) { const f = m[1].split('|').map((x) => x.trim()); if (f.length !== 6) throw new Error('diagram node needs 6 fields: ' + ln.slice(0, 60)); nodes.push({ id: f[0], label: f[1], x: Number(f[2]), y: Number(f[3]), role: f[4], fail: f[5] }); }
    else if ((m = ln.match(/^edge:\s*(.+)$/))) { const f = m[1].split('|').map((x) => x.trim()); edges.push(f); }
    else throw new Error('bad diagram line: ' + ln.slice(0, 60));
  }
  if (nodes.length < 3) throw new Error('diagram needs at least 3 nodes');
  const cols = Math.max(...nodes.map((n) => n.x)) + 1, rows = Math.max(...nodes.map((n) => n.y)) + 1;
  const cx = (n) => ((n.x + 0.5) / cols) * 100, cy = (n) => ((n.y + 0.5) / rows) * 100;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const lines = edges.map(([a, b]) => { if (!byId[a] || !byId[b]) throw new Error('diagram edge to unknown node ' + a + ' ' + b); return `<line x1="${cx(byId[a]).toFixed(1)}" y1="${cy(byId[a]).toFixed(1)}" x2="${cx(byId[b]).toFixed(1)}" y2="${cy(byId[b]).toFixed(1)}"/>`; }).join('');
  const btns = nodes.map((n) => `<button type="button" class="dg-node" data-act="dg-pick" data-id="${esc(n.id)}" style="left:${cx(n).toFixed(1)}%;top:${cy(n).toFixed(1)}%;width:${(88 / cols).toFixed(1)}%" aria-pressed="false">${esc(n.label)}</button>`).join('');
  const dl = nodes.map((n) => `<div class="dg-item" data-id="${esc(n.id)}"><dt>${esc(n.label)}</dt><dd><span class="dg-k">What it does:</span> ${esc(n.role)}</dd><dd><span class="dg-k">If it fails or is weak:</span> ${esc(n.fail)}</dd></div>`).join('');
  return `<figure class="dg" data-rows="${rows}" style="--rows:${rows}"><figcaption class="dg-title">${esc(title || 'Diagram')}</figcaption>` +
    `<div class="dg-stage"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${lines}</svg>${btns}</div>` +
    `<p class="dg-hint small">Select a component to see what it does and what happens when it fails.</p><div class="dg-live" role="status" aria-live="polite"></div><dl class="dg-list">${dl}</dl></figure>\n`;
}

/* ---------- load content ---------- */
const PREDICTS = [];
const LEVELS = (() => { try { return JSON.parse(fs.readFileSync(path.join(SRC, 'content', 'levels.json'), 'utf8')); } catch (x) { return {}; } })();
function loadContent() {
  const modules = JSON.parse(fs.readFileSync(path.join(SRC, 'content', 'modules.json'), 'utf8'));
  const paths = JSON.parse(fs.readFileSync(path.join(SRC, 'content', 'paths.json'), 'utf8'));
  const lessons = {};
  for (const mod of modules) {
    const dir = path.join(SRC, 'content', mod.id);
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d\d-.+\.md$/.test(f)).sort() : [];
    mod.lessons = [];
    for (const f of files) {
      const slug = f.replace(/^\d\d-/, '').replace(/\.md$/, '');
      const id = `${mod.id}/${slug}`;
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const { meta, body } = parseFrontmatter(raw, `${mod.id}/${f}`);
      const { body: md, quiz, cards } = extractBlocks(body, `${mod.id}/${f}`);
      for (const pm of md.matchAll(/```predict\n([\s\S]*?)```/g)) { const pp = pm[1].split(/^\?\?\?\s*$/m); const qm = pp[0].match(/^Q:\s*([^\n]+)\n?([\s\S]*)$/); const am = (pp[1] || '').split(/^>\s*/m); PREDICTS.push({ lesson: id, q: qm[1], shown: qm[2].trim(), out: am[0].trim(), why: (am[1] || '').trim() }); }
      const { marked, state } = makeMarkdown();
      const html = marked.parse(md);
      lessons[id] = {
        id, module: mod.id, slug, title: meta.title, minutes: Number(meta.minutes || 10), summary: meta.summary || '', lv: LEVELS[id] || null,
        html, toc: state.toc, quiz, cards, text: plain(html).slice(0, 4000)
      };
      mod.lessons.push(id);
    }
    mod.minutes = mod.lessons.reduce((n, id) => n + lessons[id].minutes, 0);
  }
  const sheets = {};
  const sdir = path.join(SRC, 'cheatsheets');
  for (const f of fs.readdirSync(sdir).filter((x) => x.endsWith('.md')).sort()) {
    const id = f.replace(/\.md$/, '');
    const { meta, body } = parseFrontmatter(fs.readFileSync(path.join(sdir, f), 'utf8'), f);
    const { marked, state } = makeMarkdown();
    const html = marked.parse(body);
    sheets[id] = { id, title: meta.title, summary: meta.summary || '', module: meta.module || '', html, toc: state.toc, text: plain(html) };
  }

  // official references: refs.json { modules:{}, lessons:{}, sheets:{} } -> [{t,u}]
  const refsFile = path.join(SRC, 'content', 'refs.json');
  const refs = fs.existsSync(refsFile) ? JSON.parse(fs.readFileSync(refsFile, 'utf8')) : {};
  const toRefs = (arr) => (arr || []).map(([t, u]) => ({ t, u }));
  for (const m of modules) m.refs = toRefs((refs.modules || {})[m.id]);
  for (const id of Object.keys(lessons)) lessons[id].refs = toRefs((refs.lessons || {})[id]);
  for (const id of Object.keys(sheets)) sheets[id].refs = toRefs((refs.sheets || {})[id]);

  // InterviewHub: src/interview/<module>.md  ->  "## Question" + "level: x" + answer markdown
  const interview = [];
  const idir = path.join(SRC, 'interview');
  if (fs.existsSync(idir)) {
    for (const f of fs.readdirSync(idir).filter((x) => x.endsWith('.md')).sort()) {
      const mod = f.replace(/\.md$/, '');
      const parts = fs.readFileSync(path.join(idir, f), 'utf8').split(/^## /m).slice(1);
      parts.forEach((blk, i) => {
        const nl = blk.indexOf('\n');
        const q = blk.slice(0, nl).trim();
        let rest = blk.slice(nl + 1).replace(/^\s+/, '');
        const lm = rest.match(/^level:\s*(junior|mid|senior)\s*\n/);
        if (!lm) throw new Error(`interview/${f}: question "${q}" needs a level: junior|mid|senior line`);
        rest = rest.slice(lm[0].length).trim();
        const { marked } = makeMarkdown();
        const html = marked.parse(rest);
        interview.push({ id: `${mod}-${i + 1}`, module: mod, level: lm[1], q, html, text: plain(html) });
      });
    }
  }

  // Real-world case studies: src/cases/*.md -> "## Title" then "key: value" lines
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const srcPair = (v) => { const i = v.lastIndexOf('|'); return i < 0 ? { t: 'Source', u: v.trim() } : { t: v.slice(0, i).trim(), u: v.slice(i + 1).trim() }; };
  const cases = [];
  const cdir = path.join(SRC, 'cases');
  if (fs.existsSync(cdir)) {
    for (const f of fs.readdirSync(cdir).filter((x) => x.endsWith('.md')).sort()) {
      for (const blk of fs.readFileSync(path.join(cdir, f), 'utf8').split(/^## /m).slice(1)) {
        const nl = blk.indexOf('\n');
        const title = blk.slice(0, nl).trim();
        const kv = {};
        for (const line of blk.slice(nl + 1).split('\n')) {
          const m = line.match(/^([a-z]+):\s*(.+)$/);
          if (m) kv[m[1]] = m[2].trim();
        }
        for (const k of ['company', 'year', 'area', 'modules', 'source', 'what', 'cause', 'fix', 'lesson']) if (!kv[k]) throw new Error(`cases/${f}: "${title}" is missing ${k}:`);
        cases.push({ id: slug(title), title, company: kv.company, year: Number(kv.year), area: kv.area, modules: kv.modules.split(',').map((x) => x.trim()), source: srcPair(kv.source), what: kv.what, cause: kv.cause, fix: kv.fix, lesson: kv.lesson });
      }
    }
  }


  // Architecture walkthroughs: src/walkthroughs/NN-slug.md -> "# Title", key: value lines, blank line, markdown body (diagram and predict blocks allowed)
  const walkthroughs = [];
  const wdir = path.join(SRC, 'walkthroughs');
  if (fs.existsSync(wdir)) {
    for (const f of fs.readdirSync(wdir).filter((x) => x.endsWith('.md')).sort()) {
      const raw = fs.readFileSync(path.join(wdir, f), 'utf8');
      const tm = raw.match(/^# (.+)\n/);
      if (!tm) throw new Error(`walkthroughs/${f}: needs a "# Title" first line`);
      const [head, ...restParts] = raw.slice(tm[0].length).split(/\n\s*\n/);
      const kv = {};
      for (const line of head.split('\n')) { const m = line.match(/^([a-z]+):\s*(.+)$/); if (m) kv[m[1]] = m[2].trim(); }
      for (const k of ['level', 'modules', 'lessons', 'summary']) if (!kv[k]) throw new Error(`walkthroughs/${f}: missing ${k}:`);
      const html = makeMarkdown().marked.parse(restParts.join('\n\n'));
      walkthroughs.push({ id: f.replace(/\.md$/, '').replace(/^\d+-/, ''), title: tm[1].trim(), level: kv.level, modules: kv.modules.split(',').map((x) => x.trim()), lessons: kv.lessons.split(',').map((x) => x.trim()), summary: kv.summary, html, text: plain(html) });
    }
  }

  // Capstone projects: src/capstones/<path>.md -> "## Title", key: value lines, then "steps:", "check:" bullet lists
  const capstones = [];
  const kdir = path.join(SRC, 'capstones');
  if (fs.existsSync(kdir)) {
    for (const f of fs.readdirSync(kdir).filter((x) => x.endsWith('.md')).sort()) {
      const pid = f.replace(/\.md$/, '');
      let n = 0;
      for (const blk of fs.readFileSync(path.join(kdir, f), 'utf8').split(/^## /m).slice(1)) {
        const nl = blk.indexOf('\n');
        const title = blk.slice(0, nl).trim();
        const kv = {}; const lists = { steps: [], check: [] }; let cur = null;
        for (const line of blk.slice(nl + 1).split('\n')) {
          const b = line.match(/^- (.+)$/);
          if (b && cur) { lists[cur].push(b[1].trim()); continue; }
          const m = line.match(/^([a-z]+):\s*(.*)$/);
          if (m) { if (m[1] === 'steps' || m[1] === 'check') { cur = m[1]; } else { cur = null; kv[m[1]] = m[2].trim(); } }
        }
        for (const k of ['level', 'hours', 'modules', 'summary', 'goal', 'build', 'stretch']) if (!kv[k]) throw new Error(`capstones/${f}: "${title}" is missing ${k}:`);
        n++;
        capstones.push({ id: `${pid}-${n}-${slug(title)}`.slice(0, 60).replace(/-+$/, ''), path: pid, n, title, level: kv.level, hours: Number(kv.hours), modules: kv.modules.split(',').map((x) => x.trim()), summary: kv.summary, goal: kv.goal, build: kv.build, steps: lists.steps, check: lists.check, stretch: kv.stretch });
      }
    }
  }


  // Incident games: src/games/<module>.md -> "## Title" with header lines, then "### id" scenes
  const games = [];
  const gdir = path.join(SRC, 'games');
  if (fs.existsSync(gdir)) {
    for (const f of fs.readdirSync(gdir).filter((x) => x.endsWith('.md')).sort()) {
      for (const blk of fs.readFileSync(path.join(gdir, f), 'utf8').split(/^## /m).slice(1)) {
        const parts = blk.split(/^### /m);
        const head = parts[0], nl = head.indexOf('\n');
        const title = head.slice(0, nl).trim();
        const kv = {};
        for (const line of head.slice(nl + 1).split('\n')) { const m = line.match(/^([a-z]+):\s*(.+)$/); if (m) kv[m[1]] = m[2].trim(); }
        for (const k of ['module', 'level', 'minutes', 'lesson', 'summary', 'intro']) if (!kv[k]) throw new Error(`games/${f}: "${title}" is missing ${k}:`);
        const scenes = {}; const order = [];
        for (const sc of parts.slice(1)) {
          const sl = sc.indexOf('\n'); const id = sc.slice(0, sl).trim();
          const o = { id, text: '', choices: [] };
          for (const line of sc.slice(sl + 1).split('\n')) {
            let m;
            if ((m = line.match(/^text:\s*(.+)$/))) o.text = m[1].trim();
            else if ((m = line.match(/^end:\s*(win|ok|fail)\s*$/))) o.end = m[1];
            else if ((m = line.match(/^takeaway:\s*(.+)$/))) o.takeaway = m[1].trim();
            else if ((m = line.match(/^- (.+?) => ([\w-]+) \| ([0-2]) \| (.+)$/))) o.choices.push({ t: m[1].trim(), to: m[2], pts: Number(m[3]), fb: m[4].trim() });
          }
          if (scenes[id]) throw new Error(`games/${f}: "${title}" has a duplicate scene ${id}`);
          scenes[id] = o; order.push(id);
        }
        games.push({ id: slug(title), title, module: kv.module, level: kv.level, minutes: Number(kv.minutes), lesson: kv.lesson, summary: kv.summary, intro: kv.intro, start: order[0], scenes });
      }
    }
  }

  // Reading lists: src/content/reading.json { module: [{t,by,u,kind,why}] }
  const readingFile = path.join(SRC, 'content', 'reading.json');
  const reading = fs.existsSync(readingFile) ? JSON.parse(fs.readFileSync(readingFile, 'utf8')) : {};

  // Architecture post-mortems: src/architecture/<slug>.md -> "# Title", key lines, blank line, markdown body
  const arch = [];
  const adir = path.join(SRC, 'architecture');
  if (fs.existsSync(adir)) {
    for (const f of fs.readdirSync(adir).filter((x) => x.endsWith('.md')).sort()) {
      const raw = fs.readFileSync(path.join(adir, f), 'utf8');
      const tm = raw.match(/^# (.+)\n/);
      if (!tm) throw new Error(`architecture/${f}: needs a "# Title" first line`);
      const [head, ...restParts] = raw.slice(tm[0].length).split(/\n\s*\n/);
      const kv = {};
      for (const line of head.split('\n')) { const m = line.match(/^([a-z]+):\s*(.+)$/); if (m) kv[m[1]] = m[2].trim(); }
      for (const k of ['company', 'date', 'modules', 'calc', 'source', 'summary']) if (!kv[k]) throw new Error(`architecture/${f}: missing ${k}:`);
      const html = makeMarkdown().marked.parse(restParts.join('\n\n'));
      arch.push({ id: f.replace(/\.md$/, '').replace(/^\d+-/, ''), title: tm[1].trim(), company: kv.company, date: kv.date, modules: kv.modules.split(',').map((x) => x.trim()), calcs: kv.calc.split(',').map((x) => x.trim()), sources: kv.source.split(';').map(srcPair), summary: kv.summary, html, text: plain(html) });
    }
  }

  // Troubleshooting drills: src/drills/<module>.md
  const drills = [];
  const ddir = path.join(SRC, 'drills');
  if (fs.existsSync(ddir)) {
    for (const f of fs.readdirSync(ddir).filter((x) => x.endsWith('.md')).sort()) {
      const mod = f.replace(/\.md$/, '');
      fs.readFileSync(path.join(ddir, f), 'utf8').split(/^## /m).slice(1).forEach((blk, i) => {
        const nl = blk.indexOf('\n');
        const title = blk.slice(0, nl).trim();
        let rest = blk.slice(nl + 1);
        const lm = rest.match(/^\s*level:\s*(junior|mid|senior)\s*\n/);
        if (!lm) throw new Error(`drills/${f}: "${title}" needs a level: line`);
        rest = rest.slice(lm[0].length);
        const fm = rest.match(/```text\n([\s\S]*?)```/);
        if (!fm) throw new Error(`drills/${f}: "${title}" needs a text fence with the evidence`);
        const story = rest.slice(0, fm.index).trim();
        const after = rest.slice(fm.index + fm[0].length);
        const qm = after.match(/^\? (.+)$/m);
        const wm = after.match(/^why:\s*([\s\S]+)$/m);
        const options = [...after.matchAll(/^([+-]) (.+)$/gm)].map((m) => ({ t: m[2].trim(), ok: m[1] === '+' }));
        if (!qm || !wm) throw new Error(`drills/${f}: "${title}" needs a ? question line and a why: line`);
        drills.push({ id: `${mod}-${i + 1}`, module: mod, level: lm[1], title, story, evidence: fm[1].replace(/\n$/, ''), q: qm[1].trim(), options, why: wm[1].trim() });
      });
    }
  }
  // Glossary: src/glossary.md -> "## Term" then module:/plain:/def:/aliases: lines
  const glossary = [];
  const gfile = path.join(SRC, 'glossary.md');
  if (fs.existsSync(gfile)) {
    for (const blk of read('glossary.md').split(/^## /m).slice(1)) {
      const lines = blk.split('\n'), term = lines[0].trim(), kv = {};
      for (const ln of lines.slice(1)) { const m = ln.match(/^(module|plain|def|aliases):\s*(.+)$/); if (m) kv[m[1]] = m[2].trim(); }
      for (const k of ['module', 'plain', 'def']) if (!kv[k]) throw new Error(`glossary: "${term}" is missing ${k}:`);
      glossary.push({ id: slug(term), term, show: term.replace(/\s*\(.*\)$/, ''), module: kv.module, plain: kv.plain, def: kv.def, aliases: kv.aliases ? kv.aliases.split(',').map((x) => x.trim()).filter(Boolean) : [] });
    }
  }
  const labs = require('./labs').load(path.join(SRC, 'labs'));
  const termlabs = require('./termlabs').load(path.join(SRC, 'termlabs')).map((l) => { const o = { ...l }; delete o.errors; delete o.file; return o; });
  // Case files: src/casefiles/<case-id>.json, the full source-checked write-up behind a case card
  const casefiles = [];
  const cfdir = path.join(SRC, 'casefiles');
  if (fs.existsSync(cfdir)) {
    for (const f of fs.readdirSync(cfdir).filter((x) => x.endsWith('.json')).sort()) {
      let j; try { j = JSON.parse(fs.readFileSync(path.join(cfdir, f), 'utf8')); } catch (x) { throw new Error(`casefiles/${f}: invalid JSON (${x.message})`); }
      if (j.id + '.json' !== f) throw new Error(`casefiles/${f}: id must match the file name`);
      if (!cases.some((c) => c.id === j.id)) throw new Error(`casefiles/${f}: no case card with id ${j.id}`);
      casefiles.push(j);
    }
  }
  // Interactive widgets: src/widgets/*.json, each file an array of widget definitions
  const widgets = [];
  const widDir = path.join(SRC, 'widgets');
  if (fs.existsSync(widDir)) {
    for (const f of fs.readdirSync(widDir).filter((x) => x.endsWith('.json')).sort()) {
      let j; try { j = JSON.parse(fs.readFileSync(path.join(widDir, f), 'utf8')); } catch (x) { throw new Error(`widgets/${f}: invalid JSON (${x.message})`); }
      for (const w of j) widgets.push(w);
    }
  }
  return { modules, paths, lessons, sheets, interview, cases, casefiles, widgets, capstones, walkthroughs, reading, games, arch, drills, glossary, labs, termlabs, predicts: PREDICTS };

}

/* ---------- output ---------- */
const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');
function write(p, content) {
  const full = path.join(DIST, p);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function fontCss() {
  const fx = (pkg, file) => `fonts/${file}`;
  return `
@font-face{font-family:"Bricolage Grotesque";font-style:normal;font-weight:200 800;font-display:swap;src:url(${fx('', 'bricolage-grotesque.woff2')}) format("woff2-variations")}
@font-face{font-family:"Source Serif 4";font-style:normal;font-weight:200 900;font-display:swap;src:url(${fx('', 'source-serif-4.woff2')}) format("woff2-variations")}
@font-face{font-family:"Source Serif 4";font-style:italic;font-weight:200 900;font-display:swap;src:url(${fx('', 'source-serif-4-italic.woff2')}) format("woff2-variations")}
@font-face{font-family:"Atkinson Hyperlegible";font-style:normal;font-weight:400;font-display:swap;src:url(fonts/atkinson-400.woff2) format("woff2")}
@font-face{font-family:"Atkinson Hyperlegible";font-style:normal;font-weight:700;font-display:swap;src:url(fonts/atkinson-700.woff2) format("woff2")}
@font-face{font-family:"OpenDyslexic";font-style:normal;font-weight:400;font-display:swap;src:url(fonts/opendyslexic-400.woff2) format("woff2")}
@font-face{font-family:"OpenDyslexic";font-style:normal;font-weight:700;font-display:swap;src:url(fonts/opendyslexic-700.woff2) format("woff2")}
@font-face{font-family:"JetBrains Mono";font-style:normal;font-weight:100 800;font-display:swap;src:url(${fx('', 'jetbrains-mono.woff2')}) format("woff2-variations")}
`;
}

function refsBlock(list) {
  if (!list || !list.length) return '';
  return '<section class="refs" aria-labelledby="refs-h"><h2 id="refs-h">Official references</h2><p class="small">Read the vendor and project documentation for the full, current detail.</p><ul>' +
    list.map((r) => `<li><a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.t)}</a><span class="host">${esc(r.u.replace(/^https:\/\/([^/]+).*$/, '$1'))}</span></li>`).join('') + '</ul></section>';
}

function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const data = loadContent();

  // fonts
  const nm = path.join(ROOT, 'node_modules', '@fontsource-variable');
  const fonts = {
    'bricolage-grotesque.woff2': 'bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2',
    'source-serif-4.woff2': 'source-serif-4/files/source-serif-4-latin-wght-normal.woff2',
    'source-serif-4-italic.woff2': 'source-serif-4/files/source-serif-4-latin-wght-italic.woff2',
    'jetbrains-mono.woff2': 'jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2'
  };
  for (const [name, rel] of Object.entries(fonts)) {
    const out = path.join(DIST, 'assets', 'fonts', name);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(path.join(nm, rel), out);
  }

  // optional reading fonts: copied, loaded only when a reader picks them, not precached
  const opt = { 'atkinson-400.woff2': '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2', 'atkinson-700.woff2': '@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2', 'opendyslexic-400.woff2': '@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2', 'opendyslexic-700.woff2': '@fontsource/opendyslexic/files/opendyslexic-latin-700-normal.woff2' };
  for (const [name, rel] of Object.entries(opt)) fs.copyFileSync(path.join(ROOT, 'node_modules', rel), path.join(DIST, 'assets', 'fonts', name));

  const css = fontCss() + read('app/app.css');
  const js = read('app/app.js');
  const dataJs = 'window.ACADEMY=' + JSON.stringify({ domain: DOMAIN, counter: COUNTER, ...data }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + ';';
  const ver = crypto.createHash('sha1').update(css + js + dataJs + EXTRA.concat(ENGINE).map((f) => read('app/' + f)).join('')).digest('hex').slice(0, 8);

  write('assets/app.css', css);
  write('assets/app.js', js);
  EXTRA.concat(ENGINE).forEach((f) => write('assets/' + f, read('app/' + f)));
  // SQLite for the SQL playground (vendored sql.js 1.x browser build), loaded only when that page is opened
  write('assets/sql-wasm.js', fs.readFileSync(path.join(ROOT, 'node_modules/sql.js/dist/sql-wasm-browser.js'), 'utf8').split('\n').map((ln) => (/^\s*\/\//.test(ln) && /(\bgi\w+\.com|\bTO\w+:)/.test(ln) ? '// (comment removed)' : ln)).join('\n'));
  fs.copyFileSync(path.join(ROOT, 'node_modules/sql.js/dist/sql-wasm-browser.wasm'), path.join(DIST, 'assets/sql-wasm.wasm'));
  write('assets/data.js', dataJs);

  const shell = read('app/shell.html').replace(/{{VER}}/g, ver).replace(/{{SITE}}/g, SITE).replace(/{{DOMAIN}}/g, DOMAIN);
  write('index.html', shell);
  write('404.html', read('app/404.html').replace(/{{VER}}/g, ver));

  // standalone cheat sheet pages
  const sheetTpl = read('app/sheet.html');
  const list = Object.values(data.sheets);
  for (const s of list) {
    const html = sheetTpl
      .replace(/{{VER}}/g, ver).replace(/{{SITE}}/g, SITE)
      .replace(/{{TITLE}}/g, esc(s.title)).replace(/{{SUMMARY}}/g, esc(s.summary))
      .replace(/{{COUNTER}}/g, COUNTER).replace(/{{ID}}/g, s.id).replace('{{REFS}}', refsBlock(s.refs)).replace('{{BODY}}', s.html);
    write(`cheatsheets/${s.id}.html`, html);
  }
  const idxTpl = read('app/sheet-index.html');
  const rows = list.map((s) => `<li><a href="${s.id}.html"><strong>${esc(s.title)}</strong><span>${esc(s.summary)}</span></a></li>`).join('\n');
  write('cheatsheets/index.html', idxTpl.replace(/{{COUNTER}}/g, COUNTER).replace(/{{VER}}/g, ver).replace(/{{SITE}}/g, SITE).replace('{{ROWS}}', rows));

  // static files
  write('CNAME', DOMAIN + '\n');
  write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  const urls = ['/', '/cheatsheets/'].concat(list.map((s) => `/cheatsheets/${s.id}.html`));
  const today = new Date().toISOString().slice(0, 10);
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  write('manifest.webmanifest', JSON.stringify({
    name: 'MARGA by EknathaLabs', short_name: 'MARGA', start_url: './', scope: './', display: 'standalone',
    background_color: '#F4F6FA', theme_color: '#0F2547',
    icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
  }, null, 2));
  write('icon.svg', read('app/icon.svg'));

  const precache = ['./', 'index.html', 'assets/app.css', 'assets/app.js', 'assets/data.js', ...EXTRA.concat(ENGINE).map((f) => 'assets/' + f), 'icon.svg', 'manifest.webmanifest', 'cheatsheets/']
    .concat(Object.keys(fonts).map((f) => 'assets/fonts/' + f))
    .concat(list.map((s) => `cheatsheets/${s.id}.html`));
  write('sw.js', read('app/sw.js').replace('{{VER}}', ver).replace('{{FILES}}', JSON.stringify(precache)));

  // build report
  const nLessons = Object.keys(data.lessons).length;
  const nQuiz = Object.values(data.lessons).reduce((n, l) => n + l.quiz.length, 0);
  const nCards = Object.values(data.lessons).reduce((n, l) => n + l.cards.length, 0);
  const size = fs.statSync(path.join(DIST, 'assets', 'data.js')).size;
  console.log(`built v${ver}: ${data.modules.length} modules, ${nLessons} lessons, ${nQuiz} quiz questions, ${nCards} flashcards, ${list.length} cheat sheets, ${data.interview.length} interview questions, ${data.cases.length} case studies, ${data.capstones.length} capstones, ${data.games.length} games, ${data.arch.length} architecture studies, ${data.drills.length} drills, ${data.glossary.length} glossary terms, data.js ${(size / 1024).toFixed(0)} KB`);
}

main();
