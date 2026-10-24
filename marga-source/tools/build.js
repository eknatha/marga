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
        const body = highlight(code, lang);
        return `<div class="code" data-lang="${esc(lang || 'text')}"><button class="copy" type="button" data-copy="${esc(code)}" aria-label="Copy code">Copy</button><pre tabindex="0"><code class="hljs">${body}</code></pre></div>\n`;
      },
      blockquote(quote) {
        const m = quote.match(/^\s*<p><strong>(Warning|Note|Tip|Incident|Exam tip|Why it matters|Real-world)[:.]?<\/strong>\s*/i);
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

function parseQuiz(src, file) {
  const out = [];
  let cur = null;
  const push = () => { if (cur) out.push(cur); cur = null; };
  for (const raw of src.split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith('Q: ')) { push(); cur = { q: line.slice(3).trim(), options: [], answer: -1, why: '' }; }
    else if (!cur) throw new Error(`${file}: quiz line outside a question: ${line}`);
    else if (line.startsWith('+ ')) { cur.answer = cur.options.length; cur.options.push(line.slice(2).trim()); }
    else if (line.startsWith('- ')) cur.options.push(line.slice(2).trim());
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

/* ---------- load content ---------- */
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
      const { marked, state } = makeMarkdown();
      const html = marked.parse(md);
      lessons[id] = {
        id, module: mod.id, slug, title: meta.title, minutes: Number(meta.minutes || 10), summary: meta.summary || '',
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
  return { modules, paths, lessons, sheets, interview };
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

  const css = fontCss() + read('app/app.css');
  const js = read('app/app.js');
  const dataJs = 'window.ACADEMY=' + JSON.stringify({ domain: DOMAIN, counter: COUNTER, ...data }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + ';';
  const ver = crypto.createHash('sha1').update(css + js + dataJs + read('app/voice.js')).digest('hex').slice(0, 8);

  write('assets/app.css', css);
  write('assets/app.js', js);
  write('assets/voice.js', read('app/voice.js'));
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
      .replace(/{{ID}}/g, s.id).replace('{{REFS}}', refsBlock(s.refs)).replace('{{BODY}}', s.html);
    write(`cheatsheets/${s.id}.html`, html);
  }
  const idxTpl = read('app/sheet-index.html');
  const rows = list.map((s) => `<li><a href="${s.id}.html"><strong>${esc(s.title)}</strong><span>${esc(s.summary)}</span></a></li>`).join('\n');
  write('cheatsheets/index.html', idxTpl.replace(/{{VER}}/g, ver).replace(/{{SITE}}/g, SITE).replace('{{ROWS}}', rows));

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

  const precache = ['./', 'index.html', 'assets/app.css', 'assets/app.js', 'assets/data.js', 'assets/voice.js', 'icon.svg', 'manifest.webmanifest', 'cheatsheets/']
    .concat(Object.keys(fonts).map((f) => 'assets/fonts/' + f))
    .concat(list.map((s) => `cheatsheets/${s.id}.html`));
  write('sw.js', read('app/sw.js').replace('{{VER}}', ver).replace('{{FILES}}', JSON.stringify(precache)));

  // build report
  const nLessons = Object.keys(data.lessons).length;
  const nQuiz = Object.values(data.lessons).reduce((n, l) => n + l.quiz.length, 0);
  const nCards = Object.values(data.lessons).reduce((n, l) => n + l.cards.length, 0);
  const size = fs.statSync(path.join(DIST, 'assets', 'data.js')).size;
  console.log(`built v${ver}: ${data.modules.length} modules, ${nLessons} lessons, ${nQuiz} quiz questions, ${nCards} flashcards, ${list.length} cheat sheets, ${data.interview.length} interview questions, data.js ${(size / 1024).toFixed(0)} KB`);
}

main();
