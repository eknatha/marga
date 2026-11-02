/* MARGA terminal engine, part 2: the shell language parser (lexer plus recursive descent). */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-fs.js') : window.MargaTerm;
function SyntaxErr(m) { this.msg = m; }
T.SyntaxErr = SyntaxErr;

var PARAM_OPS = [':-', ':=', ':?', ':+', '##', '%%', '//', '/#', '/%', '^^', ',,', '-', '=', '?', '+', '#', '%', '/', '^', ',', ':'];

function findClose(src, i, open, close) { /* i is just after the opening char */
  var depth = 1, n = src.length;
  while (i < n) {
    var c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === "'") { var j = src.indexOf("'", i + 1); if (j < 0) throw new SyntaxErr('unexpected EOF while looking for matching quote'); i = j + 1; continue; }
    if (c === '"') { i++; while (i < n && src[i] !== '"') { if (src[i] === '\\') i++; i++; } i++; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i; }
    i++;
  }
  throw new SyntaxErr('unexpected EOF while looking for matching `' + close + "'");
}

function scan(src, i, mode) { /* mode: w word, d double quote, b brace argument, p pattern before slash */
  var parts = [], lit = '', n = src.length;
  function flush() { if (lit) { parts.push({ k: 'lit', s: lit }); lit = ''; } }
  while (i < n) {
    var c = src[i];
    if (mode === 'w') {
      if (c === ' ' || c === '\t' || c === '\n' || c === '|' || c === '&' || c === ';' || c === '<' || c === '>' || c === ')') break;
      if (c === '(') {
        if (parts.length === 0 && /^[A-Za-z_]\w*(\[[^\]]*\])?\+?=$/.test(lit)) {
          var items = [], j = i + 1;
          for (;;) {
            while (j < n && /[ \t\n]/.test(src[j])) j++;
            if (src[j] === ')') { j++; break; }
            if (j >= n) throw new SyntaxErr('unexpected EOF in array');
            var r = scan(src, j, 'w'); items.push(r.parts); j = r.i;
          }
          var head = lit; lit = '';
          parts.push({ k: 'lit', s: head }); parts.push({ k: 'arr', items: items }); i = j; continue;
        }
        break;
      }
    }
    if (mode === 'd' && c === '"') break;
    if (mode === 'b' && c === '}') break;
    if (mode === 'p' && (c === '/' || c === '}')) break;
    if (c === '\\') {
      var d = src[i + 1];
      if (mode === 'd') {
        if (d === '$' || d === '`' || d === '"' || d === '\\') { flush(); parts.push({ k: 'q', s: d }); i += 2; continue; }
        if (d === '\n') { i += 2; continue; }
        flush(); parts.push({ k: 'q', s: '\\' }); i++; continue;
      }
      if (d === '\n') { i += 2; continue; }
      if (d === undefined) { lit += '\\'; i++; continue; }
      flush(); parts.push({ k: 'q', s: d }); i += 2; continue;
    }
    if (c === "'" && mode !== 'd') {
      var e = src.indexOf("'", i + 1); if (e < 0) throw new SyntaxErr('unexpected EOF while looking for matching `\'\'');
      flush(); parts.push({ k: 'q', s: src.slice(i + 1, e), sq: true }); i = e + 1; continue;
    }
    if (c === '"' && mode !== 'd') {
      var r2 = scan(src, i + 1, 'd');
      if (src[r2.i] !== '"') throw new SyntaxErr('unexpected EOF while looking for matching `"\'');
      flush(); parts.push({ k: 'dq', p: r2.parts }); i = r2.i + 1; continue;
    }
    if (c === '`') {
      var k = i + 1, body = '';
      while (k < n && src[k] !== '`') { if (src[k] === '\\' && /[`$\\]/.test(src[k + 1])) { body += src[k + 1]; k += 2; continue; } body += src[k++]; }
      if (k >= n) throw new SyntaxErr('unexpected EOF while looking for matching ``\'');
      flush(); parts.push({ k: 'cmd', ast: parseScript(body) }); i = k + 1; continue;
    }
    if (c === '$') {
      var x = src[i + 1];
      if (x === '(') {
        if (src[i + 2] === '(') {
          var end = findClose(src, i + 3, '(', ')');
          if (src[end + 1] === ')') { flush(); parts.push({ k: 'ar', src: src.slice(i + 3, end) }); i = end + 2; continue; }
        }
        var cl = findClose(src, i + 2, '(', ')');
        flush(); parts.push({ k: 'cmd', ast: parseScript(src.slice(i + 2, cl)) }); i = cl + 1; continue;
      }
      if (x === '{') {
        var node = parseParam(src, i + 2); flush(); parts.push(node.node); i = node.i; continue;
      }
      if (x !== undefined && /[A-Za-z_]/.test(x)) {
        var m = /^[A-Za-z_]\w*/.exec(src.slice(i + 1)); flush(); parts.push({ k: 'var', name: m[0] }); i += 1 + m[0].length; continue;
      }
      if (x !== undefined && /[0-9@*#?$!\-]/.test(x)) { flush(); parts.push({ k: 'var', name: x }); i += 2; continue; }
      if (x === "'" && mode === 'w') {
        var q = i + 2, s2 = '';
        while (q < n && src[q] !== "'") {
          if (src[q] === '\\') { var ch = src[q + 1]; s2 += ch === 'n' ? '\n' : ch === 't' ? '\t' : ch === 'r' ? '\r' : ch === 'e' ? '\x1b' : ch; q += 2; continue; }
          s2 += src[q++];
        }
        flush(); parts.push({ k: 'q', s: s2, sq: true }); i = q + 1; continue;
      }
      lit += '$'; i++; continue;
    }
    lit += c; i++;
  }
  flush();
  return { parts: parts, i: i };
}

function parseParam(src, i) { /* i is just after the opening brace */
  var node = { k: 'var', name: '', idx: null, op: null }, n = src.length;
  if (src[i] === '#' && src[i + 1] !== '}' && !/[:#%\/^,\-=?+]/.test(src[i + 1] || '')) { node.len = true; i++; }
  else if (src[i] === '!' && /[A-Za-z_]/.test(src[i + 1] || '')) { node.keys = true; i++; }
  var m = /^([A-Za-z_]\w*|[0-9]+|[@*#?$!\-])/.exec(src.slice(i));
  if (!m) throw new SyntaxErr('bad substitution');
  node.name = m[1]; i += m[1].length;
  if (src[i] === '[') {
    var e = src.indexOf(']', i); if (e < 0) throw new SyntaxErr('bad substitution');
    node.idx = scan(src.slice(i + 1, e), 0, 'b').parts; i = e + 1;
  }
  if (src[i] === '}') return { node: node, i: i + 1 };
  var op = null;
  for (var k = 0; k < PARAM_OPS.length; k++) if (src.substr(i, PARAM_OPS[k].length) === PARAM_OPS[k]) { op = PARAM_OPS[k]; break; }
  if (!op) throw new SyntaxErr('bad substitution');
  i += op.length; node.op = op;
  if (op[0] === '/') {
    var a = scan(src, i, 'p'); node.a = a.parts; i = a.i;
    if (src[i] === '/') { var b = scan(src, i + 1, 'b'); node.b = b.parts; i = b.i; } else node.b = [];
  } else { var r = scan(src, i, 'b'); node.a = r.parts; i = r.i; }
  if (src[i] !== '}') throw new SyntaxErr('bad substitution: no closing `}\'');
  void n;
  return { node: node, i: i + 1 };
}

function lex(src) {
  var toks = [], i = 0, n = src.length, pend = [];
  while (i < n) {
    var c = src[i];
    if (c === ' ' || c === '\t') { i++; continue; }
    if (c === '\\' && src[i + 1] === '\n') { i += 2; continue; }
    if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '\n') {
      toks.push({ t: 'nl' }); i++;
      while (pend.length) {
        var h = pend.shift(), lines = [];
        while (i < n) {
          var e = src.indexOf('\n', i); if (e < 0) e = n;
          var line = src.slice(i, e); i = Math.min(e + 1, n);
          var cmp = h.strip ? line.replace(/^\t+/, '') : line;
          if (cmp === h.delim) { h.done = true; break; }
          lines.push(cmp);
        }
        h.body = lines.length ? lines.join('\n') + '\n' : '';
      }
      continue;
    }
    if (c === '(' && src[i + 1] === '(') {
      var close = -1;
      try { close = findClose(src, i + 2, '(', ')'); } catch (x) { close = -1; }
      if (close > 0 && src[close + 1] === ')') { toks.push({ t: 'arith', src: src.slice(i + 2, close) }); i = close + 2; continue; }
    }
    if (c === '<' && src[i + 1] === '(') {
      var pc = findClose(src, i + 2, '(', ')');
      toks.push({ t: 'word', parts: [{ k: 'psub', ast: parseScript(src.slice(i + 2, pc)) }] }); i = pc + 1; continue;
    }
    var fd = null, fm = /^(\d+)([<>])/.exec(src.slice(i, i + 12));
    if (fm) { fd = parseInt(fm[1], 10); i += fm[1].length; c = src[i]; }
    var op = null, three = src.substr(i, 3), two = src.substr(i, 2);
    if (three === '<<<' || three === '<<-' || three === '&>>') op = three;
    else if (['&&', '||', ';;', '<<', '>>', '>&', '&>', '>|'].indexOf(two) >= 0) op = two;
    else if ('|&;()<>'.indexOf(c) >= 0) op = c;
    if (op) {
      i += op.length;
      if (op === '<<' || op === '<<-') {
        while (src[i] === ' ' || src[i] === '\t') i++;
        var w = scan(src, i, 'w'); i = w.i;
        var quoted = w.parts.some(function (p) { return p.k !== 'lit'; });
        var delim = w.parts.map(function (p) { return p.k === 'dq' ? p.p.map(function (q) { return q.s || ''; }).join('') : (p.s || ''); }).join('');
        var tok = { t: 'redir', op: '<<', fd: fd === null ? 0 : fd, delim: delim, quoted: quoted, strip: op === '<<-', body: '' };
        toks.push(tok); pend.push(tok); continue;
      }
      if (['<', '>', '>>', '<<<', '>&', '&>', '&>>', '>|'].indexOf(op) >= 0) toks.push({ t: 'redir', op: op === '>|' ? '>' : op, fd: fd === null ? (op === '<' || op === '<<<' ? 0 : 1) : fd });
      else toks.push({ t: 'op', v: op });
      continue;
    }
    var r = scan(src, i, 'w');
    if (r.i === i) throw new SyntaxErr("syntax error near unexpected token `" + src[i] + "'");
    toks.push({ t: 'word', parts: r.parts }); i = r.i;
  }
  if (pend.length) pend.forEach(function (h) { if (!h.done) throw new SyntaxErr('here-document delimited by end-of-file (wanted `' + h.delim + "')"); });
  return toks;
}

function kw(tok) {
  if (!tok || tok.t !== 'word' || tok.parts.length !== 1 || tok.parts[0].k !== 'lit') return null;
  return tok.parts[0].s;
}
var RESERVED = { 'if': 1, 'then': 1, 'else': 1, 'elif': 1, 'fi': 1, 'for': 1, 'while': 1, 'until': 1, 'do': 1, 'done': 1, 'case': 1, 'esac': 1, '{': 1, '}': 1, '!': 1, 'function': 1, 'in': 1 };

function Parser(toks) { this.t = toks; this.i = 0; }
var PP = Parser.prototype;
PP.peek = function () { return this.t[this.i]; };
PP.next = function () { return this.t[this.i++]; };
PP.isOp = function (v) { var t = this.peek(); return t && t.t === 'op' && t.v === v; };
PP.isKw = function (v) { return kw(this.peek()) === v; };
PP.skipNl = function () { while (this.peek() && (this.peek().t === 'nl' || this.isOp(';'))) this.i++; };
PP.skipNlOnly = function () { while (this.peek() && this.peek().t === 'nl') this.i++; };
PP.expectKw = function (v) { if (!this.isKw(v)) throw new SyntaxErr("syntax error: expected `" + v + "'"); this.i++; };
PP.program = function () { var l = this.list(null); if (this.peek()) throw new SyntaxErr("syntax error near unexpected token `" + this.tokText(this.peek()) + "'"); return l; };
PP.tokText = function (t) { return t.t === 'op' ? t.v : t.t === 'word' ? (kw(t) || 'word') : t.t === 'nl' ? 'newline' : t.op || t.t; };
PP.list = function (stops) {
  var items = [];
  for (;;) {
    this.skipNl();
    var t = this.peek();
    if (!t) break;
    if (t.t === 'op' && (t.v === ')' || t.v === ';;')) break;
    var k = kw(t);
    if (stops && k && stops.indexOf(k) >= 0) break;
    var node = this.andor(), bg = false;
    if (this.isOp('&')) { this.i++; bg = true; }
    items.push({ node: node, bg: bg });
    var nt = this.peek();
    if (nt && !(nt.t === 'nl' || (nt.t === 'op' && (nt.v === ';' || nt.v === ')' || nt.v === ';;'))) && !(stops && kw(nt) && stops.indexOf(kw(nt)) >= 0) && !bg)
      throw new SyntaxErr("syntax error near unexpected token `" + this.tokText(nt) + "'");
  }
  return { k: 'list', items: items };
};
PP.andor = function () {
  var first = this.pipeline(), rest = [];
  while (this.isOp('&&') || this.isOp('||')) { var op = this.next().v; this.skipNlOnly(); rest.push({ op: op, node: this.pipeline() }); }
  return rest.length ? { k: 'andor', first: first, rest: rest } : first;
};
PP.pipeline = function () {
  var neg = false;
  if (this.isKw('!')) { this.i++; neg = true; }
  var cmds = [this.command()];
  while (this.isOp('|')) { this.i++; this.skipNlOnly(); cmds.push(this.command()); }
  if (cmds.length === 1 && !neg) return cmds[0];
  return { k: 'pipe', cmds: cmds, neg: neg };
};
PP.redirs = function (node) {
  var t;
  while ((t = this.peek()) && t.t === 'redir') {
    this.i++;
    var r = { op: t.op, fd: t.fd };
    if (t.op === '<<') { r.tok = t; }
    else { var w = this.next(); if (!w || w.t !== 'word') throw new SyntaxErr("syntax error near unexpected token `newline'"); r.target = w.parts; }
    (node.redirs = node.redirs || []).push(r);
  }
  return node;
};
PP.command = function () {
  var t = this.peek();
  if (!t) throw new SyntaxErr("syntax error: unexpected end of input");
  var k = kw(t), node;
  if (t.t === 'arith') { this.i++; node = { k: 'arith', src: t.src }; return this.redirs(node); }
  if (t.t === 'op' && t.v === '(') {
    this.i++; var b = this.list(null);
    if (!this.isOp(')')) throw new SyntaxErr("syntax error: expected `)'"); this.i++;
    return this.redirs({ k: 'sub', b: b });
  }
  if (k === '{') { this.i++; var bb = this.list(['}']); this.expectKw('}'); return this.redirs({ k: 'brace', b: bb }); }
  if (k === 'if') {
    this.i++; var conds = [], els = null;
    var c = this.list(['then']); this.expectKw('then'); var body = this.list(['elif', 'else', 'fi']); conds.push({ c: c, b: body });
    for (;;) {
      if (this.isKw('elif')) { this.i++; var c2 = this.list(['then']); this.expectKw('then'); var b2 = this.list(['elif', 'else', 'fi']); conds.push({ c: c2, b: b2 }); continue; }
      if (this.isKw('else')) { this.i++; els = this.list(['fi']); }
      break;
    }
    this.expectKw('fi'); return this.redirs({ k: 'if', conds: conds, els: els });
  }
  if (k === 'while' || k === 'until') {
    this.i++; var cond = this.list(['do']); this.expectKw('do'); var lb = this.list(['done']); this.expectKw('done');
    return this.redirs({ k: 'while', until: k === 'until', c: cond, b: lb });
  }
  if (k === 'for') {
    this.i++;
    var nt = this.peek();
    if (nt && nt.t === 'arith') {
      this.i++; var parts = nt.src.split(';'); this.skipNl(); this.expectKw('do'); var fb = this.list(['done']); this.expectKw('done');
      return this.redirs({ k: 'cfor', init: parts[0] || '', cond: parts[1] || '', step: parts[2] || '', b: fb });
    }
    var vt = this.next(); if (!vt || vt.t !== 'word') throw new SyntaxErr("syntax error near `for'");
    var vname = kw(vt), words = null;
    this.skipNlOnly();
    if (this.isKw('in')) {
      this.i++; words = [];
      while (this.peek() && this.peek().t === 'word' && !(kw(this.peek()) === 'do' && false)) { words.push(this.next().parts); }
    }
    this.skipNl(); this.expectKw('do'); var fbody = this.list(['done']); this.expectKw('done');
    return this.redirs({ k: 'for', v: vname, words: words, b: fbody });
  }
  if (k === 'case') {
    this.i++; var wt = this.next(); this.skipNlOnly(); this.expectKw('in'); this.skipNl();
    var items = [];
    while (!this.isKw('esac')) {
      if (this.isOp('(')) this.i++;
      var pats = [];
      for (;;) { var pt = this.next(); if (!pt || pt.t !== 'word') throw new SyntaxErr('syntax error in case'); pats.push(pt.parts); if (this.isOp('|')) { this.i++; continue; } break; }
      if (!this.isOp(')')) throw new SyntaxErr("syntax error in case: expected `)'"); this.i++;
      var cb = this.list(['esac']);
      items.push({ pats: pats, b: cb });
      if (this.isOp(';;')) this.i++;
      this.skipNl();
    }
    this.expectKw('esac'); return this.redirs({ k: 'case', w: wt.parts, items: items });
  }
  if (k === 'function') {
    this.i++; var ft = this.next(), fname = kw(ft);
    if (this.isOp('(')) { this.i++; if (!this.isOp(')')) throw new SyntaxErr('syntax error'); this.i++; }
    this.skipNlOnly(); return { k: 'func', name: fname, body: this.command() };
  }
  if (k === '[[') {
    this.i++; var ws = [];
    while (this.peek() && kw(this.peek()) !== ']]') {
      var q = this.next();
      if (q.t === 'word') ws.push(q.parts);
      else if (q.t === 'op') ws.push([{ k: 'lit', s: q.v }]);
      else if (q.t === 'redir') ws.push([{ k: 'lit', s: q.op }]);
      else if (q.t === 'nl') continue;
    }
    if (kw(this.peek()) !== ']]') throw new SyntaxErr("syntax error: expected `]]'");
    this.i++; return this.redirs({ k: 'dbl', words: ws });
  }
  if (k && RESERVED[k] && k !== '!' && k !== 'in' && k !== '{') throw new SyntaxErr("syntax error near unexpected token `" + k + "'");
  /* function name() */
  if (t.t === 'word' && k && this.t[this.i + 1] && this.t[this.i + 1].t === 'op' && this.t[this.i + 1].v === '(' && this.t[this.i + 2] && this.t[this.i + 2].t === 'op' && this.t[this.i + 2].v === ')') {
    this.i += 3; this.skipNlOnly(); return { k: 'func', name: k, body: this.command() };
  }
  return this.simple();
};
PP.simple = function () {
  var node = { k: 'simple', assigns: [], words: [] }, seenWord = false, t;
  while ((t = this.peek())) {
    if (t.t === 'redir') { this.redirs(node); continue; }
    if (t.t !== 'word') break;
    var k = kw(t);
    if (seenWord && (k === 'then' || k === 'do' || k === 'done' || k === 'fi' || k === 'esac' || k === '}' || k === 'else' || k === 'elif') && false) break;
    if (!seenWord) {
      var p0 = t.parts[0];
      if (p0 && p0.k === 'lit') {
        var m = /^([A-Za-z_]\w*)(?:\[([^\]]*)\])?(\+?)=/.exec(p0.s);
        if (m) {
          this.i++;
          var rest = t.parts.slice(1), first = p0.s.slice(m[0].length), vparts = (first ? [{ k: 'lit', s: first }] : []).concat(rest), arr = null;
          if (vparts.length && vparts[vparts.length - 1].k === 'arr') { arr = vparts[vparts.length - 1].items; vparts = []; }
          node.assigns.push({ name: m[1], idx: m[2] !== undefined ? m[2] : null, append: m[3] === '+', val: vparts, arr: arr });
          continue;
        }
      }
    }
    if (seenWord && k && (k === 'then' || k === 'do' || k === 'done' || k === 'fi' || k === 'esac' || k === 'else' || k === 'elif' || k === '}') && node.words.length && this.endsHere(k)) break;
    seenWord = true; node.words.push(t.parts); this.i++;
  }
  if (!node.words.length && !node.assigns.length && !(node.redirs && node.redirs.length)) throw new SyntaxErr("syntax error near unexpected token `" + (this.peek() ? this.tokText(this.peek()) : 'newline') + "'");
  return node;
};
PP.endsHere = function () { return false; };

function parseScript(src) {
  var toks = lex(src);
  return new Parser(toks).program();
}
T.parseScript = parseScript;

/* True when a typed command is not finished yet (an open here-document, quote, if, loop or brace), so a terminal should ask for another line. */
T.isIncomplete = function (text) {
  var lines = text.split('\n'), delim = null, strip = false, m, k;
  for (k = 0; k < lines.length; k++) {
    var ln = lines[k];
    if (delim !== null) { if ((strip ? ln.replace(/^\t+/, '') : ln) === delim) delim = null; continue; }
    m = /(?:^|[^<])<<(-?)\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_]\w*))/.exec(ln);
    if (m) { delim = m[2] || m[3] || m[4]; strip = m[1] === '-'; }
  }
  if (delim !== null) return true;
  try { T.parseScript(text); return false; } catch (x) { return x instanceof T.SyntaxErr && /EOF|end of input|expected `(fi|done|esac|then|do|\}|\)|\]\])'/.test(x.msg); }
};T.scanWord = scan;
if (typeof module === 'object' && module.exports) module.exports = T;
}());
