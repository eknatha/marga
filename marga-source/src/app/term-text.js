/* MARGA terminal engine, part 5: text tools (grep, sed, sort, uniq, cut, tr, wc, head, tail and friends). */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-cmds.js') : window.MargaTerm;
var def = T.def, readAll = T.readAll, opts = T.parseOpts, pad = T.pad;
var CLS = { alpha: 'A-Za-z', digit: '0-9', alnum: 'A-Za-z0-9', upper: 'A-Z', lower: 'a-z', space: ' \\t\\n\\r\\f\\v', blank: ' \\t', punct: '!-\\/:-@\\[-`{-~', xdigit: '0-9A-Fa-f', word: 'A-Za-z0-9_' };
function toRe(pat, mode, flags) {
  if (mode === 'fixed') return new RegExp(pat.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'), flags || '');
  var out = '', i = 0, n = pat.length, ere = mode === 'ere';
  while (i < n) {
    var c = pat[i];
    if (c === '[') {
      var j = i + 1, body = '';
      if (pat[j] === '^') { body += '^'; j++; }
      if (pat[j] === ']') { body += '\\]'; j++; }
      while (j < n && pat[j] !== ']') {
        if (pat[j] === '[' && pat[j + 1] === ':') { var e = pat.indexOf(':]', j); if (e > 0) { body += CLS[pat.slice(j + 2, e)] || ''; j = e + 2; continue; } }
        if (pat[j] === '\\') body += '\\\\'; else if (pat[j] === '[') body += '\\['; else body += pat[j];
        j++;
      }
      out += '[' + body + ']'; i = j + 1; continue;
    }
    if (c === '\\') {
      var d = pat[i + 1];
      if (!ere && '(){}|+?'.indexOf(d) >= 0) { out += d; i += 2; continue; }
      if (d === '<' || d === '>') { out += '\\b'; i += 2; continue; }
      if (d === undefined) { out += '\\\\'; i++; continue; }
      out += '\\' + d; i += 2; continue;
    }
    if (!ere && '(){}|+?'.indexOf(c) >= 0) { out += '\\' + c; i++; continue; }
    if (c === '*' && (i === 0 || (!ere && pat[i - 1] === '(' && false))) { out += '\\*'; i++; continue; }
    if (ere && c === '{' && !/^\{\d*,?\d*\}/.test(pat.slice(i))) { out += '\\{'; i++; continue; }
    out += c; i++;
  }
  try { return new RegExp(out, flags || ''); } catch (e) { throw new T.SyntaxErr('invalid regular expression: ' + pat); }
}
T.toRe = toRe;
function lines(txt) { if (txt === '') return []; var l = txt.split('\n'); if (l[l.length - 1] === '') l.pop(); return l; }
T.lines = lines;
function inputs(self, io, files, who, rc) {
  var res = [];
  if (!files.length) { res.push({ name: '-', text: readAll(io.in) }); return res; }
  files.forEach(function (p) {
    if (p === '-') { res.push({ name: '-', text: readAll(io.in) }); return; }
    try { res.push({ name: p, text: self.readFile(p) }); } catch (e) { if (e instanceof T.FsErr) { io.e(who + ': ' + p + ': ' + e.msg + '\n'); rc.v = 1; } else throw e; }
  });
  return res;
}
T.inputs = inputs;

/* ---------------- grep ---------------- */
def('grep egrep fgrep', function (a, io) {
  var o = opts(a, ['e', 'A', 'B', 'C', 'm', 'f']), self = this, pats = [], rc = { v: 0 }, f = o.f;
  var rest = o.rest.slice();
  if (f.e !== undefined) { a.forEach(function (x, i) { if (x === '-e') pats.push(a[i + 1]); else if (/^-[A-Za-z]*e.+/.test(x) && false) pats.push(x); }); if (!pats.length) pats.push(f.e); }
  else { if (!rest.length) { io.e('Usage: grep [OPTION]... PATTERNS [FILE]...\n'); return 2; } pats.push(rest.shift()); }
  var mode = f.E ? 'ere' : f.F ? 'fixed' : 'bre';
  var flags = f.i ? 'i' : '', res;
  try { res = pats.map(function (p) { return p.split('\n'); }).reduce(function (x, y) { return x.concat(y); }, []).map(function (p) { var src = toRe(p, mode, '').source; if (f.w) src = '(?<![A-Za-z0-9_])(?:' + src + ')(?![A-Za-z0-9_])'; if (f.x) src = '^(?:' + src + ')$'; return src; }); }
  catch (e) { io.e('grep: ' + (e.msg || 'bad pattern') + '\n'); return 2; }
  var re = new RegExp(res.length ? res.join('|') : '(?!)', flags), reg = new RegExp(re.source, flags + 'g');
  var files = rest, recurse = f.r || f.R, list = [];
  if (recurse) {
    var targets = files.length ? files : ['.'];
    targets.forEach(function (t) {
      (function walk(p, disp) { var n; try { n = self.stat(p); } catch (e) { io.e('grep: ' + p + ': ' + e.msg + '\n'); rc.v = 2; return; } if (n.t === 'd') { self.listDir(p).forEach(function (k) { walk(p + '/' + k, disp + '/' + k); }); } else { try { list.push({ name: disp, text: self.readFile(p) }); } catch (e) { io.e('grep: ' + disp + ': ' + e.msg + '\n'); rc.v = 2; } } })(t, t);
    });
  } else list = inputs(this, io, files, 'grep', rc);
  var multi = (recurse || list.length > 1) && !f.h || f.H, matched = false, maxm = f.m ? parseInt(f.m, 10) : Infinity;
  var ctxA = parseInt(f.A || f.C || 0, 10), ctxB = parseInt(f.B || f.C || 0, 10);
  for (var fi = 0; fi < list.length; fi++) {
    var L = lines(list[fi].text), cnt = 0, pre = multi ? list[fi].name : '', lastPrinted = -1, fm = false;
    for (var i = 0; i < L.length && cnt < maxm; i++) {
      var hit = re.test(L[i]) !== !!f.v;
      if (!hit) continue;
      cnt++; matched = true; fm = true;
      if (f.q) return 0;
      if (f.l || f.L || f.c) continue;
      var sep = function (ch) { return (pre ? pre + ch : ''); };
      if (ctxB || ctxA) {
        for (var b = Math.max(lastPrinted + 1, i - ctxB); b < i; b++) io.o(sep('-') + (f.n ? (b + 1) + '-' : '') + L[b] + '\n');
        if (lastPrinted >= 0 && i - ctxB > lastPrinted + 1) io.o('--\n');
      }
      if (f.o) { var m; reg.lastIndex = 0; while ((m = reg.exec(L[i])) && m[0] !== '') io.o(sep(':') + (f.n ? (i + 1) + ':' : '') + m[0] + '\n'); }
      else io.o(sep(':') + (f.n ? (i + 1) + ':' : '') + L[i] + '\n');
      lastPrinted = i;
      for (var k = i + 1; k <= Math.min(L.length - 1, i + ctxA); k++) { if (re.test(L[k]) !== !!f.v) break; }
      for (var q = i + 1; q <= Math.min(L.length - 1, i + ctxA); q++) { if ((re.test(L[q]) !== !!f.v)) break; io.o(sep('-') + (f.n ? (q + 1) + '-' : '') + L[q] + '\n'); lastPrinted = q; i = q; cnt++; }
    }
    if (f.c) io.o((pre ? pre + ':' : '') + cnt + '\n');
    if (f.l && fm) io.o(list[fi].name + '\n'); if (f.L && !fm) io.o(list[fi].name + '\n');
  }
  if (rc.v === 2) return 2;
  return matched ? 0 : 1;
});

/* ---------------- sed ---------------- */
function parseSed(script, ere) {
  var cmds = [], i = 0, n = script.length, stack = [];
  function readDelim(d) {
    var s = '';
    while (i < n && script[i] !== d) { if (script[i] === '\\' && i + 1 < n) { if (script[i + 1] === d) { s += d; i += 2; continue; } s += script[i] + script[i + 1]; i += 2; continue; } s += script[i++]; }
    if (i >= n) throw new T.SyntaxErr('sed: unterminated `s\' command');
    i++; return s;
  }
  function addr() {
    var m;
    if (script[i] === '$') { i++; return { t: 'last' }; }
    if ((m = /^(\d+)~(\d+)/.exec(script.slice(i)))) { i += m[0].length; return { t: 'step', a: parseInt(m[1], 10), b: parseInt(m[2], 10) }; }
    if ((m = /^\d+/.exec(script.slice(i)))) { i += m[0].length; return { t: 'num', n: parseInt(m[0], 10) }; }
    if (script[i] === '/') { i++; var p = readDelim('/'), fl = ''; if (script[i] === 'I') { fl = 'i'; i++; } return { t: 're', re: toRe(p, ere ? 'ere' : 'bre', fl) }; }
    return null;
  }
  while (i < n) {
    while (i < n && /[\s;]/.test(script[i])) i++;
    if (i >= n) break;
    var c = { a1: null, a2: null, neg: false };
    c.a1 = addr();
    if (c.a1 && script[i] === ',') { i++; c.a2 = addr(); }
    while (script[i] === ' ') i++;
    if (script[i] === '!') { c.neg = true; i++; while (script[i] === ' ') i++; }
    var ch = script[i++];
    c.c = ch;
    if (ch === 's') {
      var d = script[i++], pat = readDelim(d), rep = readDelim(d), fl2 = '', gflag = false, pflag = false, nth = 0;
      while (i < n && /[gpiI0-9]/.test(script[i])) { var x = script[i++]; if (x === 'g') gflag = true; else if (x === 'p') pflag = true; else if (x === 'i' || x === 'I') fl2 += 'i'; else nth = nth * 10 + parseInt(x, 10); }
      c.re = toRe(pat, ere ? 'ere' : 'bre', fl2 + 'g'); c.rep = rep; c.g = gflag; c.p = pflag; c.nth = nth;
    } else if (ch === 'y') { var dd = script[i++], from = readDelim(dd), to = readDelim(dd); c.map = {}; for (var k = 0; k < from.length; k++) c.map[from[k]] = to[k]; }
    else if (ch === 'a' || ch === 'i' || ch === 'c') {
      if (script[i] === '\\') { i++; if (script[i] === '\n') i++; } else while (script[i] === ' ') i++;
      var e = script.indexOf('\n', i); if (e < 0) e = n; c.text = script.slice(i, e).replace(/\\(.)/g, '$1'); i = e;
    } else if (ch === '{') { stack.push(cmds.length); }
    else if (ch === '}') { var st = stack.pop(); cmds[st].end = cmds.length; c.c = '}'; }
    else if (ch === 'q' || ch === 'Q') { var mq = /^\d+/.exec(script.slice(i)); if (mq) { c.code = parseInt(mq[0], 10); i += mq[0].length; } }
    else if ('dpn=NDhHgGx'.indexOf(ch) < 0) throw new T.SyntaxErr('sed: -e expression #1, char ' + i + ': unknown command: `' + ch + "'");
    cmds.push(c);
  }
  return cmds;
}
function caseApply(s, m) { if (!m) return s; if (m === 'U') return s.toUpperCase(); if (m === 'L') return s.toLowerCase(); if (m === 'u') return s.charAt(0).toUpperCase() + s.slice(1); if (m === 'l') return s.charAt(0).toLowerCase() + s.slice(1); return s; }
function sedRun(cmds, text, opt) {
  var L = lines(text), out = [], ranges = cmds.map(function () { return { on: false }; }), quit = false, hold = '';
  for (var ln = 0; ln < L.length && !quit; ln++) {
    var pat = L[ln], deleted = false, appended = [], autoprint = !opt.n, ci = 0, subbed = false;
    var matchAddr = function (a) { if (a.t === 'step') return a.b === 0 ? ln + 1 === a.a : ln + 1 >= a.a && (ln + 1 - a.a) % a.b === 0; if (a.t === 'num') return ln + 1 === a.n; if (a.t === 'last') return ln === L.length - 1; a.re.lastIndex = 0; return a.re.test(pat); };
    while (ci < cmds.length) {
      var c = cmds[ci], sel = true, idx = ci;
      if (c.a1) {
        if (!c.a2) sel = matchAddr(c.a1);
        else {
          var r = ranges[idx];
          if (r.on) { sel = true; if ((c.a2.t === 'num' && ln + 1 >= c.a2.n) || (c.a2.t !== 'num' && matchAddr(c.a2))) r.on = false; }
          else if (matchAddr(c.a1)) { sel = true; if (c.a2.t === 'num' ? ln + 1 < c.a2.n : !(c.a2.t === 'last' && ln === L.length - 1)) r.on = true; }
          else sel = false;
        }
      }
      if (c.neg) sel = !sel;
      if (c.c === '}') { ci++; continue; }
      if (!sel) { ci = c.c === '{' ? c.end + 1 : ci + 1; continue; }
      if (c.c === '{') { ci++; continue; }
      switch (c.c) {
        case 's': {
          var cnt = 0, res = '', pos = 0, prevEnd = -1, mm;
          c.re.lastIndex = 0;
          while (pos <= pat.length && (mm = (c.re.lastIndex = pos, c.re.exec(pat)))) {
            var m0 = mm[0], at = mm.index;
            if (m0 === '' && at === prevEnd) { if (at < pat.length) res += pat[at]; pos = at + 1; prevEnd = -1; continue; }
            cnt++; res += pat.slice(pos, at);
            if (c.nth && cnt < c.nth || (!c.g && !c.nth && cnt > 1) || (!c.g && c.nth && cnt > c.nth)) { res += m0; }
            else {
              subbed = true;
              var groups = mm.slice(1), cs = '';
              res += c.rep.replace(/\\([0-9&ntULEul\\\/])|&/g, function (x, ch2) {
                if (x === '&') return caseApply(m0, cs); if (ch2 === undefined) return x; if (ch2 === '&') return '&'; if (ch2 === 'n') return '\n'; if (ch2 === 't') return '\t';
                if (/[ULEul]/.test(ch2)) { cs = ch2 === 'E' ? '' : ch2; return ''; }
                if (/\d/.test(ch2)) return caseApply(ch2 === '0' ? m0 : (groups[parseInt(ch2, 10) - 1] || ''), cs); return ch2;
              });
            }
            pos = at + m0.length; prevEnd = pos;
            if (m0 === '') { if (at < pat.length) res += pat[at]; pos = at + 1; prevEnd = -1; }
            if (!c.g && !c.nth) break;
            if (c.nth && !c.g && cnt >= c.nth) break;
          }
          if (pos <= pat.length) res += pat.slice(pos);
          pat = res; if (c.p && subbed) out.push(pat); break;
        }
        case 'd': deleted = true; autoprint = false; ci = cmds.length; continue;
        case 'p': out.push(pat); break;
        case 'n': if (autoprint) out.push(pat); if (ln + 1 < L.length) { ln++; pat = L[ln]; } else { quit = true; autoprint = false; ci = cmds.length; continue; } break;
        case '=': out.push(String(ln + 1)); break;
        case 'q': quit = true; ci = cmds.length; if (c.code) opt.code = c.code; continue;
        case 'Q': quit = true; autoprint = false; ci = cmds.length; continue;
        case 'y': pat = pat.split('').map(function (ch3) { return c.map[ch3] !== undefined ? c.map[ch3] : ch3; }).join(''); break;
        case 'a': appended.push(c.text); break;
        case 'i': out.push(c.text); break;
        case 'c': out.push(c.text); deleted = true; autoprint = false; ci = cmds.length; continue;
        case 'h': hold = pat; break; case 'H': hold += '\n' + pat; break; case 'g': pat = hold; break; case 'G': pat += '\n' + hold; break; case 'x': var t = pat; pat = hold; hold = t; break;
        default: break;
      }
      ci++;
    }
    if (autoprint && !deleted) out.push(pat);
    appended.forEach(function (x) { out.push(x); });
  }
  return out.length ? out.join('\n') + '\n' : '';
}
def('sed', function (a, io) {
  var self = this, scripts = [], files = [], f = { n: false, E: false, i: false }, i = 0, rc = { v: 0 };
  for (; i < a.length; i++) {
    var x = a[i];
    if (x === '-e') scripts.push(a[++i]); else if (x === '-f') { try { scripts.push(self.readFile(a[++i])); } catch (e) { io.e('sed: couldn\'t open file ' + a[i] + '\n'); return 1; } }
    else if (x === '-n') f.n = true; else if (x === '-E' || x === '-r') f.E = true; else if (x === '-i' || /^-i./.test(x) || x === '--in-place') { f.i = true; if (/^-i./.test(x)) f.suffix = x.slice(2); } else if (x === '-s') { /* ignore */ }
    else if (/^-[nEri]+$/.test(x)) { if (x.indexOf('n') >= 0) f.n = true; if (/[Er]/.test(x)) f.E = true; if (x.indexOf('i') >= 0) f.i = true; }
    else if (x === '--') continue; else if (!scripts.length && x[0] !== '-' || (!scripts.length && x === '-')) scripts.push(x); else files.push(x);
  }
  if (!scripts.length) { io.e('Usage: sed [OPTION]... {script-only-if-no-other-script} [input-file]...\n'); return 1; }
  var cmds; try { cmds = parseSed(scripts.join('\n'), f.E); } catch (e) { if (e instanceof T.SyntaxErr) { io.e((e.msg.indexOf('sed:') === 0 ? '' : 'sed: ') + e.msg + '\n'); return 1; } throw e; }
  var opt = { n: f.n, code: 0 };
  if (f.i) {
    files.forEach(function (p) { try { var orig = self.readFile(p); if (f.suffix) self.writeFile(p + f.suffix, orig, false); self.writeFile(p, sedRun(cmds, orig, opt), false); } catch (e) { if (e instanceof T.FsErr) { io.e('sed: can\'t read ' + p + ': ' + e.msg + '\n'); rc.v = 4; } else throw e; } });
    return rc.v;
  }
  var ins = inputs(this, io, files, 'sed', rc), all = ins.map(function (x) { return x.text; }).join('');
  io.o(sedRun(cmds, all, opt)); return rc.v || opt.code;
});

/* ---------------- sort, uniq, cut, tr, wc, head, tail ---------------- */
function numPrefix(s) { var m = /^\s*([-+]?(?:\d+\.?\d*|\.\d+))/.exec(s); return m ? parseFloat(m[1]) : 0; }
function humanNum(s) { var m = /^\s*([-+]?\d+\.?\d*)([KMGTPE]?)/.exec(s); if (!m) return 0; return parseFloat(m[1]) * Math.pow(1024, 'KMGTPE'.indexOf(m[2]) + 1); }
def('sort', function (a, io) {
  var o = opts(a, ['k', 't', 'o']), rc = { v: 0 }, self = this, f = o.f;
  var keys = [];
  a.forEach(function (x, i) { if (x === '-k') keys.push(a[i + 1]); else if (/^-k.+/.test(x)) keys.push(x.slice(2)); });
  var sep = f.t === undefined ? null : f.t === '\\t' ? '\t' : f.t;
  var ins = inputs(this, io, o.rest, 'sort', rc), L = [];
  ins.forEach(function (x) { L = L.concat(lines(x.text)); });
  function field(line, spec) {
    var m = /^(\d+)(?:\.(\d+))?(?:,(\d+)(?:\.(\d+))?)?([bnrfhV]*)$/.exec(spec); if (!m) return { s: line, n: !!f.n, r: !!f.r };
    var start = parseInt(m[1], 10) - 1, end = m[3] ? parseInt(m[3], 10) : null, parts, s;
    if (sep !== null) { parts = line.split(sep); s = parts.slice(start, end === null ? undefined : end).join(sep); }
    else { var toks = line.match(/\s*\S+/g) || []; s = toks.slice(start, end === null ? undefined : end).join(''); if (/b/.test(m[5]) || f.b) s = s.replace(/^\s+/, ''); else if (sep === null) s = s; }
    return { s: s, n: /n/.test(m[5]) || !!f.n, r: /r/.test(m[5]) || !!f.r, h: /h/.test(m[5]) || !!f.h, fold: /f/.test(m[5]) || !!f.f };
  }
  function cmpKey(x, y, spec) {
    var kx = field(x, spec), ky = field(y, spec), r;
    if (kx.n) r = numPrefix(kx.s) - numPrefix(ky.s); else if (kx.h) r = humanNum(kx.s) - humanNum(ky.s);
    else { var sx = kx.fold ? kx.s.toUpperCase() : kx.s, sy = kx.fold ? ky.s.toUpperCase() : ky.s; r = sx < sy ? -1 : sx > sy ? 1 : 0; }
    return kx.r ? -r : r;
  }
  var specs = keys.length ? keys : [null];
  function cmp(x, y) {
    for (var i = 0; i < specs.length; i++) {
      var r;
      if (specs[i] === null) { var kx = { s: f.f ? x.toUpperCase() : x }, ky = { s: f.f ? y.toUpperCase() : y }; if (f.n) r = numPrefix(x) - numPrefix(y); else if (f.h) r = humanNum(x) - humanNum(y); else r = kx.s < ky.s ? -1 : kx.s > ky.s ? 1 : 0; if (f.r) r = -r; }
      else r = cmpKey(x, y, specs[i]);
      if (r) return r;
    }
    if (f.s || f.u) return 0;
    var w = x < y ? -1 : x > y ? 1 : 0; return f.r ? -w : w;
  }
  var idx = L.map(function (x, i) { return { x: x, i: i }; });
  idx.sort(function (p, q) { return cmp(p.x, q.x) || p.i - q.i; });
  var res = idx.map(function (p) { return p.x; });
  if (f.u) res = res.filter(function (x, i) { return i === 0 || cmp(res[i - 1], x) !== 0; });
  var txt = res.length ? res.join('\n') + '\n' : '';
  if (f.o) { self.writeFile(f.o, txt, false); return rc.v; }
  io.o(txt); return rc.v;
});
def('uniq', function (a, io) {
  var o = opts(a, ['f', 's', 'w']), f = o.f, L = lines(readAll(o.rest.length ? { data: this.readFile(o.rest[0]), pos: 0 } : io.in)), out = [], i = 0;
  function key(s) { return f.i ? s.toLowerCase() : s; }
  while (i < L.length) { var j = i; while (j + 1 < L.length && key(L[j + 1]) === key(L[i])) j++; out.push({ l: L[i], c: j - i + 1 }); i = j + 1; }
  out.forEach(function (x) { if (f.d && x.c < 2) return; if (f.u && x.c > 1) return; io.o((f.c ? pad(x.c, 7) + ' ' : '') + x.l + '\n'); });
  return 0;
});
function rangeList(spec) {
  var out = [];
  spec.split(',').forEach(function (p) { var m = /^(\d*)-(\d*)$/.exec(p); if (m) out.push({ a: m[1] ? parseInt(m[1], 10) : 1, b: m[2] ? parseInt(m[2], 10) : Infinity }); else out.push({ a: parseInt(p, 10), b: parseInt(p, 10) }); });
  return out;
}
def('cut', function (a, io) {
  var o = opts(a, ['d', 'f', 'c', 'b']), f = o.f, rc = { v: 0 }, d = f.d === undefined ? '\t' : f.d;
  if (f.f === undefined && f.c === undefined && f.b === undefined) { io.e('cut: you must specify a list of bytes, characters, or fields\n'); return 1; }
  var ins = inputs(this, io, o.rest, 'cut', rc), spec = rangeList(f.f || f.c || f.b);
  ins.forEach(function (x) {
    lines(x.text).forEach(function (l) {
      if (f.c !== undefined || f.b !== undefined) { var cs = Array.from(l), r = ''; cs.forEach(function (ch, i) { if (spec.some(function (s) { return i + 1 >= s.a && i + 1 <= s.b; })) r += ch; }); io.o(r + '\n'); return; }
      if (l.indexOf(d) < 0) { if (!f.s) io.o(l + '\n'); return; }
      var parts = l.split(d), sel = parts.filter(function (p, i) { return spec.some(function (s) { return i + 1 >= s.a && i + 1 <= s.b; }); });
      io.o(sel.join(d) + '\n');
    });
  });
  return rc.v;
});
function expandSet(s) {
  var out = [], i = 0;
  s = s.replace(/\[:(\w+):\]/g, function (m, c) { var map = { upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz', digit: '0123456789', alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', alnum: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', space: ' \t\n\r\f\v', blank: ' \t', punct: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~' }; return map[c] || ''; });
  while (i < s.length) {
    var c = s[i];
    if (c === '\\' && i + 1 < s.length) { var d = s[i + 1]; c = d === 'n' ? '\n' : d === 't' ? '\t' : d === 'r' ? '\r' : d; i += 2; } else i++;
    if (s[i] === '-' && i + 1 < s.length) { var e = s[i + 1]; if (e === '\\') { e = s[i + 2] === 'n' ? '\n' : s[i + 2]; i += 3; } else i += 2; for (var k = c.charCodeAt(0); k <= e.charCodeAt(0); k++) out.push(String.fromCharCode(k)); }
    else out.push(c);
  }
  return out;
}
def('tr', function (a, io) {
  var o = opts(a.filter(function (x) { return /^-[cdsC]+$/.test(x); })), f = o.f, sets = a.filter(function (x) { return !/^-[cdsC]+$/.test(x); }), txt = readAll(io.in);
  if (!sets.length) { io.e('tr: missing operand\n'); return 1; }
  var s1 = expandSet(sets[0]), s2 = sets.length > 1 ? expandSet(sets[1]) : [], comp = f.c || f.C;
  var inSet = function (ch) { return comp ? s1.indexOf(ch) < 0 : s1.indexOf(ch) >= 0; };
  var res = '', last = null;
  Array.from(txt).forEach(function (ch) {
    var rep = ch, hit = inSet(ch);
    if (hit) { if (f.d) return; if (s2.length) { var ix = comp ? s2.length - 1 : s1.indexOf(ch); rep = ix < s2.length ? s2[ix] : s2[s2.length - 1]; } }
    if (f.s && (hit || (!f.d && s2.length && s2.indexOf(rep) >= 0 && !hit && false)) && last === rep) return;
    res += rep; last = hit ? rep : null;
  });
  io.o(res); return 0;
});
def('wc', function (a, io) {
  var o = opts(a), f = o.f, rc = { v: 0 }, ins = inputs(this, io, o.rest, 'wc', rc), any = f.l || f.w || f.c || f.m;
  var cols = [], tot = [0, 0, 0];
  var rows = ins.map(function (x) { var t = x.text, w = (t.match(/\S+/g) || []).length, l = (t.match(/\n/g) || []).length, c = Buffer_len(t); tot[0] += l; tot[1] += w; tot[2] += c; return { n: x.name, v: [l, w, c] }; });
  if (rows.length > 1) rows.push({ n: 'total', v: tot });
  var sel = any ? [f.l ? 0 : -1, f.w ? 1 : -1, (f.c || f.m) ? 2 : -1].filter(function (x) { return x >= 0; }) : [0, 1, 2];
  var width = 1;
  if (sel.length > 1 || rows.length > 1) { var isStdin = !o.rest.length; width = isStdin ? 7 : String(tot[2] || rows.reduce(function (m, r) { return Math.max(m, r.v[2]); }, 0)).length; if (rows.length > 1 && !isStdin) width = String(tot[2]).length; }
  void cols;
  rows.forEach(function (r) { io.o(sel.map(function (k) { return sel.length > 1 || rows.length > 1 ? pad(r.v[k], width) : String(r.v[k]); }).join(' ') + (r.n !== '-' ? ' ' + r.n : '') + '\n'); });
  return rc.v;
});
function Buffer_len(s) { var n = 0; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); n += c < 128 ? 1 : c < 2048 ? 2 : (c >= 0xd800 && c < 0xdc00) ? 2 : 3; } return n; }
def('head', function (a, io) {
  var args = a.map(function (x, i) { return /^-\d+$/.test(x) && !/^-[nc]$/.test(a[i - 1] || '') ? '-n' + x.slice(1) : x; }), o = opts(args, ['n', 'c']), f = o.f, rc = { v: 0 };
  var ins = inputs(this, io, o.rest, 'head', rc), n = f.n !== undefined ? parseInt(f.n, 10) : 10;
  ins.forEach(function (x, i) {
    if (ins.length > 1 || (o.rest.length > 1)) io.o((i ? '\n' : '') + '==> ' + (x.name === '-' ? 'standard input' : x.name) + ' <==\n');
    if (f.c !== undefined) { io.o(x.text.slice(0, parseInt(f.c, 10))); return; }
    var L = lines(x.text); io.o((n < 0 ? L.slice(0, L.length + n) : L.slice(0, n)).map(function (l) { return l + '\n'; }).join(''));
  });
  return rc.v;
});
def('tail', function (a, io) {
  var args = a.map(function (x, i) { return /^-\d+$/.test(x) && !/^-[nc]$/.test(a[i - 1] || '') ? '-n' + x.slice(1) : x; }), o = opts(args.filter(function (x) { return x !== '-f' && x !== '-F'; }), ['n', 'c']), f = o.f, rc = { v: 0 };
  var ins = inputs(this, io, o.rest, 'tail', rc), nraw = f.n !== undefined ? String(f.n) : '10';
  ins.forEach(function (x, i) {
    if (ins.length > 1) io.o((i ? '\n' : '') + '==> ' + (x.name === '-' ? 'standard input' : x.name) + ' <==\n');
    if (f.c !== undefined) { io.o(x.text.slice(-parseInt(f.c, 10))); return; }
    var L = lines(x.text), res = nraw[0] === '+' ? L.slice(parseInt(nraw.slice(1), 10) - 1) : L.slice(Math.max(0, L.length - parseInt(nraw.replace('-', ''), 10)));
    if (nraw === '0') res = [];
    io.o(res.map(function (l) { return l + '\n'; }).join(''));
  });
  return rc.v;
});
def('tac', function (a, io) { var rc = { v: 0 }; inputs(this, io, opts(a).rest, 'tac', rc).forEach(function (x) { io.o(lines(x.text).reverse().map(function (l) { return l + '\n'; }).join('')); }); return rc.v; });
def('rev', function (a, io) { var rc = { v: 0 }; inputs(this, io, opts(a).rest, 'rev', rc).forEach(function (x) { lines(x.text).forEach(function (l) { io.o(Array.from(l).reverse().join('') + '\n'); }); }); return rc.v; });
def('nl', function (a, io) { var rc = { v: 0 }, n = 1; inputs(this, io, opts(a).rest, 'nl', rc).forEach(function (x) { lines(x.text).forEach(function (l) { io.o(l === '' ? '       \n' : pad(n++, 6) + '\t' + l + '\n'); }); }); return rc.v; });
def('paste', function (a, io) { var o = opts(a, ['d']), rc = { v: 0 }, d = o.f.d || '\t', cols = inputs(this, io, o.rest, 'paste', rc).map(function (x) { return lines(x.text); }), mx = cols.reduce(function (m, c) { return Math.max(m, c.length); }, 0); for (var i = 0; i < mx; i++) io.o(cols.map(function (c) { return c[i] === undefined ? '' : c[i]; }).join(d) + '\n'); return rc.v; });
def('diff', function (a, io) {
  var o = opts(a), A = lines(this.readFile(o.rest[0])), B = lines(this.readFile(o.rest[1]));
  if (A.join('\n') === B.join('\n')) return 0;
  A.forEach(function (l, i) { if (B[i] !== l) io.o('< ' + l + '\n'); }); B.forEach(function (l, i) { if (A[i] !== l) io.o('> ' + l + '\n'); });
  return 1;
});
def('cmp', function (a, io) { var o = opts(a), A = this.readFile(o.rest[0]), B = this.readFile(o.rest[1]); if (A === B) return 0; if (!o.f.s) io.o(o.rest[0] + ' ' + o.rest[1] + ' differ\n'); return 1; });
def('expr', function (a, io) { try { var v = this.arith(a.join(' ')); io.o(v + '\n'); return v === 0 ? 1 : 0; } catch (e) { return 2; } });
if (typeof module === 'object' && module.exports) module.exports = T;
}());
