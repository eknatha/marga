/* MARGA terminal engine, part 6: a small awk interpreter (the commonly used subset). */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-text.js') : window.MargaTerm;
var def = T.def;
function AwkErr(m) { this.msg = m; }

var KEYWORDS = { 'BEGIN': 1, 'END': 1, 'function': 1, 'func': 1, 'if': 1, 'else': 1, 'while': 1, 'for': 1, 'do': 1, 'break': 1, 'continue': 1, 'next': 1, 'exit': 1, 'return': 1, 'delete': 1, 'in': 1, 'print': 1, 'printf': 1, 'getline': 1 };
function lexAwk(src) {
  var toks = [], i = 0, n = src.length, prevVal = false;
  function push(t, v) { toks.push({ t: t, v: v }); prevVal = (t === 'num' || t === 'str' || t === 'name' || t === 'regex' || (t === 'p' && (v === ')' || v === ']' || v === '$' || v === '++' || v === '--') && v !== '$')); }
  while (i < n) {
    var c = src[i];
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '\\' && src[i + 1] === '\n') { i += 2; continue; }
    if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '\n') { toks.push({ t: 'nl' }); prevVal = false; i++; continue; }
    if (/[0-9.]/.test(c) && (c !== '.' || /[0-9]/.test(src[i + 1] || ''))) {
      var m = /^(0[xX][0-9a-fA-F]+|\d*\.?\d+(?:[eE][-+]?\d+)?|\d+\.?)/.exec(src.slice(i)); push('num', parseFloat(m[0])); i += m[0].length; continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      var w = /^[A-Za-z_]\w*/.exec(src.slice(i))[0]; i += w.length;
      if (KEYWORDS[w]) { toks.push({ t: 'kw', v: w }); prevVal = false; }
      else if (src[i] === '(') { toks.push({ t: 'fn', v: w }); prevVal = false; } else push('name', w);
      continue;
    }
    if (c === '"') {
      var s = ''; i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\') { var d = src[i + 1]; i += 2; s += d === 'n' ? '\n' : d === 't' ? '\t' : d === '\\' ? '\\' : d === '"' ? '"' : d === '/' ? '/' : d === 'r' ? '\r' : d === 'a' ? '\x07' : '\\' + d; continue; }
        s += src[i++];
      }
      i++; push('str', s); continue;
    }
    if (c === '/' && !prevVal) {
      var r = '', j = i + 1, inb = false;
      while (j < n && (src[j] !== '/' || inb)) { if (src[j] === '\\') { r += src[j] + src[j + 1]; j += 2; continue; } if (src[j] === '[') inb = true; if (src[j] === ']') inb = false; r += src[j++]; }
      push('regex', r); i = j + 1; continue;
    }
    var three = src.substr(i, 3), two = src.substr(i, 2);
    if (['**='].indexOf(three) >= 0) { push('p', '^='); i += 3; continue; }
    if (['&&', '||', '==', '!=', '<=', '>=', '++', '--', '+=', '-=', '*=', '/=', '%=', '^=', '!~', '**', '>>'].indexOf(two) >= 0) { push('p', two === '**' ? '^' : two); i += 2; continue; }
    push('p', c); i++;
  }
  toks.push({ t: 'eof' });
  return toks;
}
function Parser(toks) { this.t = toks; this.i = 0; this.noGt = 0; this.noIn = 0; }
var PP = Parser.prototype;
PP.pk = function () { return this.t[this.i]; };
PP.isP = function (v) { var t = this.pk(); return t.t === 'p' && t.v === v; };
PP.isKw = function (v) { var t = this.pk(); return t.t === 'kw' && t.v === v; };
PP.eatP = function (v) { if (!this.isP(v)) throw new AwkErr('syntax error: expected ' + v); this.i++; };
PP.nl = function () { while (this.pk().t === 'nl' || this.isP(';')) this.i++; };
PP.optNl = function () { while (this.pk().t === 'nl') this.i++; };
PP.program = function () {
  var prog = { begin: [], end: [], rules: [], funcs: {} };
  this.nl();
  while (this.pk().t !== 'eof') {
    if (this.isKw('BEGIN')) { this.i++; this.optNl(); prog.begin.push(this.block()); }
    else if (this.isKw('END')) { this.i++; this.optNl(); prog.end.push(this.block()); }
    else if (this.isKw('function') || this.isKw('func')) {
      this.i++; var nm = this.pk().v; this.i++; this.eatP('('); var ps = [];
      while (!this.isP(')')) { ps.push(this.pk().v); this.i++; if (this.isP(',')) this.i++; }
      this.eatP(')'); this.optNl(); prog.funcs[nm] = { params: ps, body: this.block() };
    } else {
      var rule = { pat: null, pat2: null, body: null };
      if (!this.isP('{')) { rule.pat = this.expr(); if (this.isP(',')) { this.i++; this.optNl(); rule.pat2 = this.expr(); } }
      if (this.isP('{')) rule.body = this.block();
      prog.rules.push(rule);
    }
    this.nl();
  }
  return prog;
};
PP.block = function () {
  this.eatP('{'); var st = []; this.nl();
  while (!this.isP('}')) { if (this.pk().t === 'eof') throw new AwkErr('syntax error: missing }'); st.push(this.stmt()); this.nl(); }
  this.i++; return { k: 'block', s: st };
};
PP.simpleOrBlock = function () { this.optNl(); if (this.isP(';')) { this.i++; return { k: 'block', s: [] }; } return this.stmt(); };
PP.endStmt = function () { if (this.isP(';') || this.pk().t === 'nl') { this.i++; } else if (!this.isP('}') && this.pk().t !== 'eof') throw new AwkErr('syntax error near ' + JSON.stringify(this.pk().v === undefined ? this.pk().t : this.pk().v)); };
PP.stmt = function () {
  var t = this.pk();
  if (this.isP('{')) return this.block();
  if (t.t === 'kw') {
    switch (t.v) {
      case 'if': { this.i++; this.eatP('('); var c = this.expr(); this.eatP(')'); var th = this.simpleOrBlock(), el = null; this.nlPeekElse(); if (this.isKw('else')) { this.i++; el = this.simpleOrBlock(); } return { k: 'if', c: c, t: th, e: el }; }
      case 'while': { this.i++; this.eatP('('); var wc = this.expr(); this.eatP(')'); return { k: 'while', c: wc, b: this.simpleOrBlock() }; }
      case 'do': { this.i++; var db = this.simpleOrBlock(); this.nl(); if (!this.isKw('while')) throw new AwkErr('syntax error: do without while'); this.i++; this.eatP('('); var dc = this.expr(); this.eatP(')'); this.endStmt(); return { k: 'do', c: dc, b: db }; }
      case 'for': {
        this.i++; this.eatP('(');
        if (this.pk().t === 'name' && this.t[this.i + 1].t === 'kw' && this.t[this.i + 1].v === 'in' && this.t[this.i + 3] && this.t[this.i + 3].t === 'p' && this.t[this.i + 3].v === ')') {
          var v = this.pk().v; this.i += 2; var arr = this.pk().v; this.i++; this.eatP(')'); return { k: 'forin', v: v, a: arr, b: this.simpleOrBlock() };
        }
        var init = this.isP(';') ? null : this.simpleStmt(); this.eatP(';'); this.optNl(); var cond = this.isP(';') ? null : this.expr(); this.eatP(';'); this.optNl(); var step = this.isP(')') ? null : this.simpleStmt(); this.eatP(')');
        return { k: 'for', i: init, c: cond, s: step, b: this.simpleOrBlock() };
      }
      case 'break': this.i++; this.endStmt(); return { k: 'break' };
      case 'continue': this.i++; this.endStmt(); return { k: 'continue' };
      case 'next': this.i++; this.endStmt(); return { k: 'next' };
      case 'exit': { this.i++; var ex = null; if (!this.isP(';') && this.pk().t !== 'nl' && !this.isP('}')) ex = this.expr(); this.endStmt(); return { k: 'exit', e: ex }; }
      case 'return': { this.i++; var rv = null; if (!this.isP(';') && this.pk().t !== 'nl' && !this.isP('}')) rv = this.expr(); this.endStmt(); return { k: 'return', e: rv }; }
      case 'delete': { this.i++; var an = this.pk().v; this.i++; var idx = null; if (this.isP('[')) { this.i++; idx = this.exprList(']'); this.eatP(']'); } this.endStmt(); return { k: 'delete', a: an, idx: idx }; }
      default: break;
    }
  }
  var s = this.simpleStmt(); this.endStmt(); return s;
};
PP.nlPeekElse = function () { var j = this.i; while (this.t[j].t === 'nl' || (this.t[j].t === 'p' && this.t[j].v === ';')) j++; if (this.t[j].t === 'kw' && this.t[j].v === 'else') this.i = j; };
PP.simpleStmt = function () {
  if (this.isKw('print') || this.isKw('printf')) {
    var isF = this.pk().v === 'printf'; this.i++;
    var args = [];
    this.noGt++;
    if (!this.isP(';') && this.pk().t !== 'nl' && !this.isP('}') && !this.isP('>') && !this.isP('>>')) {
      if (this.isP('(')) {
        var save = this.i; this.i++; this.noGt--; var tmp = this.exprList(')'); this.noGt++;
        if (this.isP(')') && (this.t[this.i + 1].t === 'nl' || (this.t[this.i + 1].t === 'p' && [';', '}', '>', '>>'].indexOf(this.t[this.i + 1].v) >= 0) || this.t[this.i + 1].t === 'eof')) { this.i++; args = tmp; }
        else { this.i = save; args = this.exprList(null); }
      } else args = this.exprList(null);
    }
    this.noGt--;
    var redir = null;
    if (this.isP('>') || this.isP('>>')) { var ap = this.pk().v === '>>'; this.i++; this.noGt++; var target = this.concat(); this.noGt--; redir = { append: ap, target: target }; }
    return { k: isF ? 'printf' : 'print', a: args, r: redir };
  }
  return { k: 'expr', e: this.expr() };
};
PP.exprList = function (close) {
  var out = [];
  if (close && this.isP(close)) return out;
  for (;;) { this.optNl(); out.push(this.expr()); if (this.isP(',')) { this.i++; this.optNl(); continue; } break; }
  if (close) this.optNl();
  return out;
};
PP.expr = function () { return this.assign(); };
PP.assign = function () {
  var l = this.ternary();
  var t = this.pk();
  if (t.t === 'p' && ['=', '+=', '-=', '*=', '/=', '%=', '^='].indexOf(t.v) >= 0 && (l.k === 'var' || l.k === 'idx' || l.k === 'field')) {
    this.i++; this.optNl(); return { k: 'assign', op: t.v, l: l, r: this.assign() };
  }
  return l;
};
PP.ternary = function () {
  var c = this.or();
  if (this.isP('?')) { this.i++; this.optNl(); var a = this.assign(); this.optNl(); this.eatP(':'); this.optNl(); var b = this.assign(); return { k: 'cond', c: c, a: a, b: b }; }
  return c;
};
PP.or = function () { var l = this.and(); while (this.isP('||')) { this.i++; this.optNl(); l = { k: 'or', l: l, r: this.and() }; } return l; };
PP.and = function () { var l = this.inop(); while (this.isP('&&')) { this.i++; this.optNl(); l = { k: 'and', l: l, r: this.inop() }; } return l; };
PP.inop = function () {
  var l = this.match();
  while (this.isKw('in') && !this.noIn) { this.i++; var a = this.pk().v; this.i++; l = { k: 'in', i: [l], a: a }; }
  return l;
};
PP.match = function () {
  var l = this.cmp();
  while (this.isP('~') || this.isP('!~')) { var neg = this.pk().v === '!~'; this.i++; l = { k: 'match', neg: neg, l: l, r: this.cmp() }; }
  return l;
};
PP.cmp = function () {
  var l = this.concat(), t = this.pk();
  if (t.t === 'p' && ['<', '<=', '==', '!=', '>=', '>'].indexOf(t.v) >= 0 && !(t.v === '>' && this.noGt)) { this.i++; return { k: 'cmp', op: t.v, l: l, r: this.concat() }; }
  return l;
};
PP.startsOperand = function () {
  var t = this.pk();
  if (t.t === 'num' || t.t === 'str' || t.t === 'name' || t.t === 'fn' || t.t === 'regex') return true;
  if (t.t === 'p') return ['$', '!', '(', '-', '+', '++', '--'].indexOf(t.v) >= 0 && !(t.v === '-' || t.v === '+') ;
  return false;
};
PP.concat = function () {
  var l = this.add();
  while (this.startsOperand() && !this.isKw('in')) { l = { k: 'cat', l: l, r: this.add() }; }
  return l;
};
PP.add = function () { var l = this.mul(); while (this.isP('+') || this.isP('-')) { var o = this.pk().v; this.i++; l = { k: 'bin', op: o, l: l, r: this.mul() }; } return l; };
PP.mul = function () { var l = this.unary(); while (this.isP('*') || this.isP('/') || this.isP('%')) { var o = this.pk().v; this.i++; l = { k: 'bin', op: o, l: l, r: this.unary() }; } return l; };
PP.unary = function () {
  if (this.isP('!')) { this.i++; return { k: 'not', e: this.unary() }; }
  if (this.isP('-')) { this.i++; return { k: 'neg', e: this.unary() }; }
  if (this.isP('+')) { this.i++; return { k: 'pos', e: this.unary() }; }
  return this.pow();
};
PP.pow = function () { var l = this.post(); if (this.isP('^')) { this.i++; return { k: 'bin', op: '^', l: l, r: this.unaryPow() }; } return l; };
PP.unaryPow = function () { if (this.isP('-')) { this.i++; return { k: 'neg', e: this.unaryPow() }; } return this.pow(); };
PP.post = function () {
  if (this.isP('++') || this.isP('--')) { var o = this.pk().v; this.i++; var lv = this.primary(); return { k: 'incr', pre: true, op: o, l: lv }; }
  var p = this.primary();
  if ((this.isP('++') || this.isP('--')) && (p.k === 'var' || p.k === 'idx' || p.k === 'field')) { var o2 = this.pk().v; this.i++; return { k: 'incr', pre: false, op: o2, l: p }; }
  return p;
};
PP.primary = function () {
  var t = this.pk();
  if (t.t === 'num') { this.i++; return { k: 'num', v: t.v }; }
  if (t.t === 'str') { this.i++; return { k: 'str', v: t.v }; }
  if (t.t === 'regex') { this.i++; return { k: 'regex', v: t.v }; }
  if (t.t === 'p' && t.v === '$') { this.i++; var e = this.isP('++') || this.isP('--') ? this.post() : this.primaryNoCat(); return { k: 'field', e: e }; }
  if (t.t === 'p' && t.v === '(') {
    this.i++; var sg = this.noGt, si = this.noIn; this.noGt = 0; this.noIn = 0; var first = this.expr();
    if (this.isP(',')) { var list = [first]; while (this.isP(',')) { this.i++; list.push(this.expr()); } this.eatP(')'); this.noGt = sg; this.noIn = si; if (this.isKw('in')) { this.i++; var an = this.pk().v; this.i++; return { k: 'in', i: list, a: an }; } throw new AwkErr('syntax error'); }
    this.eatP(')'); this.noGt = sg; this.noIn = si; return { k: 'group', e: first };
  }
  if (t.t === 'fn') {
    this.i++; this.eatP('('); var sg2 = this.noGt; this.noGt = 0; var args = this.exprList(')'); this.eatP(')'); this.noGt = sg2; return { k: 'call', n: t.v, a: args };
  }
  if (t.t === 'name' && t.v === 'length' && !(this.t[this.i + 1].t === 'p' && this.t[this.i + 1].v === '(')) { this.i++; return { k: 'call', n: 'length', a: [] }; }
  if (t.t === 'name') {
    this.i++;
    if (this.isP('[')) { this.i++; var sg3 = this.noGt; this.noGt = 0; var idx = this.exprList(']'); this.eatP(']'); this.noGt = sg3; return { k: 'idx', n: t.v, i: idx }; }
    return { k: 'var', n: t.v };
  }
  if (t.t === 'kw' && t.v === 'getline') { this.i++; return { k: 'getline' }; }
  throw new AwkErr('syntax error at ' + (t.v === undefined ? t.t : JSON.stringify(t.v)));
};
PP.primaryNoCat = function () { var t = this.pk(); if (t.t === 'p' && t.v === '-') { this.i++; return { k: 'neg', e: this.primary() }; } return this.primary(); };

/* ---------------- runtime ---------------- */
function SN(s) { this.s = s; } /* string from input that may look like a number */
function looksNum(s) { return /^\s*[-+]?(\d+\.?\d*([eE][-+]?\d+)?|\.\d+([eE][-+]?\d+)?|0[xX][0-9a-fA-F]+)\s*$/.test(s) && !/^\s*0[xX]/.test(s); }
function toNum(v) {
  if (typeof v === 'number') return v;
  if (v === undefined || v === null) return 0;
  var s = v instanceof SN ? v.s : String(v), m = /^\s*[-+]?(\d+\.?\d*([eE][-+]?\d+)?|\.\d+([eE][-+]?\d+)?)/.exec(s);
  return m ? parseFloat(m[0]) : 0;
}
function fmtG(x, prec) {
  if (x === 0) return '0';
  var e = Math.floor(Math.log10(Math.abs(x))), s;
  if (e < -4 || e >= prec) { s = x.toExponential(prec - 1).replace(/\.?0+e/, 'e'); return s.replace(/e([+-])(\d)$/, 'e$10$2'); }
  s = x.toFixed(Math.max(0, prec - 1 - e)); if (s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, ''); return s;
}
function numStr(n, ofmt) { if (Number.isInteger(n) && Math.abs(n) < 1e16) return String(n); if (!isFinite(n)) return isNaN(n) ? 'nan' : n < 0 ? '-inf' : 'inf'; return fmtG(n, 6); }
function toStr(v, ofmt) { if (typeof v === 'number') return numStr(v, ofmt); if (v === undefined || v === null) return ''; if (v instanceof SN) return v.s; return String(v); }
function toBool(v) { if (typeof v === 'number') return v !== 0; if (v === undefined) return false; if (v instanceof SN) return looksNum(v.s) ? toNum(v) !== 0 : v.s !== ''; return v !== ''; }
function isNumeric(v) { return typeof v === 'number' || v === undefined || (v instanceof SN && (looksNum(v.s) || v.s === '' && false)); }

function Interp(prog, sh, io, o) {
  this.p = prog; this.sh = sh; this.io = io; this.vars = Object.create(null); this.arrs = Object.create(null);
  this.rec = { s: '', f: null }; this.NR = 0; this.FNR = 0; this.out = [];
  this.vars.FS = ' '; this.vars.OFS = ' '; this.vars.ORS = '\n'; this.vars.SUBSEP = '\x1c'; this.vars.OFMT = '%.6g';
  this.rangeOn = prog.rules.map(function () { return false; });
  this.locals = null; this.o = o; this.files = {};
}
var IP = Interp.prototype;
IP.splitRec = function () {
  var s = this.rec.s, fs = toStr(this.vars.FS), f;
  if (fs === ' ') { f = s.split(/[ \t\n]+/).filter(function (x, i, arr) { return x !== '' ; }); }
  else if (s === '') f = [];
  else if (fs.length === 1 && fs !== '\\') f = s.split(fs === '\t' ? '\t' : fs);
  else { try { f = s.split(T.toRe(fs, 'ere')); } catch (e) { f = s.split(fs); } }
  this.rec.f = f.map(function (x) { return new SN(x); });
};
IP.getField = function (n) {
  if (n === 0) return new SN(this.rec.s);
  if (!this.rec.f) this.splitRec();
  return n >= 1 && n <= this.rec.f.length ? this.rec.f[n - 1] : undefined;
};
IP.nf = function () { if (!this.rec.f) this.splitRec(); return this.rec.f.length; };
IP.setField = function (n, v) {
  if (n === 0) { this.rec.s = toStr(v); this.rec.f = null; return; }
  if (!this.rec.f) this.splitRec();
  while (this.rec.f.length < n) this.rec.f.push(new SN(''));
  this.rec.f[n - 1] = new SN(toStr(v)); this.rebuild();
};
IP.rebuild = function () { this.rec.s = this.rec.f.map(function (x) { return x.s; }).join(toStr(this.vars.OFS)); };
IP.getVar = function (n) {
  if (this.locals && n in this.locals) return this.locals[n];
  if (n === 'NF') return this.nf(); if (n === 'NR') return this.NR; if (n === 'FNR') return this.FNR;
  return this.vars[n];
};
IP.setVar = function (n, v) {
  if (this.locals && n in this.locals) { this.locals[n] = v; return; }
  if (n === 'NF') { var k = Math.max(0, Math.floor(toNum(v))); if (!this.rec.f) this.splitRec(); this.rec.f = this.rec.f.slice(0, k); while (this.rec.f.length < k) this.rec.f.push(new SN('')); this.rebuild(); return; }
  if (n === '$0') return;
  this.vars[n] = v;
};
IP.arr = function (n) {
  if (this.locals && n in this.locals) { var l = this.locals[n]; if (!l || typeof l !== 'object' || l instanceof SN) l = this.locals[n] = Object.create(null); return l; }
  return this.arrs[n] || (this.arrs[n] = Object.create(null));
};
IP.key = function (list) { var self = this; return list.map(function (e) { return toStr(self.ev(e), self.vars.OFMT); }).join(toStr(this.vars.SUBSEP)); };
IP.cmpVals = function (a, b) {
  var r;
  if (isNumeric(a) && isNumeric(b) && !(a === undefined && b === undefined && false)) { var x = toNum(a), y = toNum(b); r = x < y ? -1 : x > y ? 1 : 0; }
  else { var sx = toStr(a), sy = toStr(b); r = sx < sy ? -1 : sx > sy ? 1 : 0; }
  return r;
};
IP.regex = function (e) {
  if (e.k === 'regex') return this.reCache(e.v);
  return this.reCache(toStr(this.ev(e)));
};
IP.reCache = function (src) { this.rc = this.rc || {}; return this.rc[src] || (this.rc[src] = T.toRe(src.replace(/\\\//g, '/'), 'ere', '')); };
IP.ev = function (e) {
  var self = this, v;
  switch (e.k) {
    case 'num': return e.v;
    case 'str': return e.v;
    case 'group': return this.ev(e.e);
    case 'regex': this.rc = this.rc || {}; return this.reCache(e.v).test(this.rec.s) ? 1 : 0;
    case 'var': return this.getVar(e.n);
    case 'field': return this.getField(Math.floor(toNum(this.ev(e.e))));
    case 'idx': { var a = this.arr(e.n), k = this.key(e.i); if (!(k in a)) a[k] = undefined; return a[k]; }
    case 'in': return (this.key(e.i) in this.arr(e.a)) ? 1 : 0;
    case 'assign': {
      var rhs = this.ev(e.r), val;
      if (e.op === '=') val = rhs instanceof SN ? rhs : rhs; else { var cur = toNum(this.ev(e.l)), r = toNum(rhs); val = e.op === '+=' ? cur + r : e.op === '-=' ? cur - r : e.op === '*=' ? cur * r : e.op === '/=' ? cur / r : e.op === '%=' ? cur % r : Math.pow(cur, r); }
      this.assignTo(e.l, val); return val;
    }
    case 'incr': { var old = toNum(this.ev(e.l)), nv = e.op === '++' ? old + 1 : old - 1; this.assignTo(e.l, nv); return e.pre ? nv : old; }
    case 'cond': return toBool(this.ev(e.c)) ? this.ev(e.a) : this.ev(e.b);
    case 'or': return toBool(this.ev(e.l)) || toBool(this.ev(e.r)) ? 1 : 0;
    case 'and': return toBool(this.ev(e.l)) && toBool(this.ev(e.r)) ? 1 : 0;
    case 'not': return toBool(this.ev(e.e)) ? 0 : 1;
    case 'neg': return -toNum(this.ev(e.e));
    case 'pos': return toNum(this.ev(e.e));
    case 'cat': return toStr(this.ev(e.l), this.vars.OFMT) + toStr(this.ev(e.r), this.vars.OFMT);
    case 'bin': {
      var x = toNum(this.ev(e.l)), y = toNum(this.ev(e.r));
      switch (e.op) { case '+': return x + y; case '-': return x - y; case '*': return x * y; case '/': if (y === 0) throw new AwkErr('division by zero'); return x / y; case '%': if (y === 0) throw new AwkErr('division by zero in %'); return x % y; default: return Math.pow(x, y); }
    }
    case 'cmp': {
      var r2 = this.cmpVals(this.ev(e.l), this.ev(e.r));
      return (e.op === '<' ? r2 < 0 : e.op === '<=' ? r2 <= 0 : e.op === '==' ? r2 === 0 : e.op === '!=' ? r2 !== 0 : e.op === '>=' ? r2 >= 0 : r2 > 0) ? 1 : 0;
    }
    case 'match': { var s = toStr(this.ev(e.l)), re = this.regex(e.r); return re.test(s) !== e.neg ? 1 : 0; }
    case 'call': return this.call(e);
    case 'getline': return 0;
    default: throw new AwkErr('internal: ' + e.k);
  }
  void self; void v;
};
IP.assignTo = function (l, val) {
  if (l.k === 'var') this.setVar(l.n, val);
  else if (l.k === 'field') this.setField(Math.floor(toNum(this.ev(l.e))), val);
  else if (l.k === 'idx') this.arr(l.n)[this.key(l.i)] = val;
};
IP.substitute = function (e, global) {
  var re = this.regex(e.a[0]), rep = toStr(this.ev(e.a[1])), target = e.a[2] || { k: 'field', e: { k: 'num', v: 0 } };
  var s = toStr(this.ev(target)), count = 0, g = new RegExp(re.source, global ? 'g' : '');
  var out = s.replace(g, function (m) { count++; return rep.replace(/\\\\|\\&|&/g, function (x) { return x === '&' ? m : x === '\\&' ? '&' : '\\'; }); });
  if (count) this.assignTo(target.k === 'group' ? target.e : target, out);
  return count;
};
IP.call = function (e) {
  var n = e.n, a = e.a, self = this;
  var f = this.p.funcs[n];
  if (f) {
    var loc = Object.create(null);
    f.params.forEach(function (pn, i) {
      if (i < a.length) { var ae = a[i]; if (ae.k === 'var' && !(self.locals && ae.n in self.locals) && self.arrs[ae.n] && !(ae.n in self.vars)) loc[pn] = self.arrs[ae.n]; else if (ae.k === 'var' && self.locals && self.locals[ae.n] && typeof self.locals[ae.n] === 'object' && !(self.locals[ae.n] instanceof SN)) loc[pn] = self.locals[ae.n]; else loc[pn] = self.ev(ae); }
      else loc[pn] = undefined;
    });
    var saved = this.locals; this.locals = loc;
    try { this.exec(f.body); } catch (x) { if (x && x.ret !== undefined) { this.locals = saved; return x.ret; } this.locals = saved; throw x; }
    this.locals = saved; return undefined;
  }
  var S = function (i) { if (!a[i]) throw new AwkErr('not enough arguments to ' + n); return toStr(self.ev(a[i])); }, N = function (i) { if (!a[i]) throw new AwkErr('not enough arguments to ' + n); return toNum(self.ev(a[i])); };
  switch (n) {
    case 'length': { if (!a.length) return this.rec.s.length; if (a[0].k === 'var' && (this.arrs[a[0].n] && !(a[0].n in this.vars) || (this.locals && this.locals[a[0].n] && typeof this.locals[a[0].n] === 'object' && !(this.locals[a[0].n] instanceof SN)))) return Object.keys(this.arr(a[0].n)).length; return S(0).length; }
    case 'substr': { var s = S(0), m = Math.round(N(1)), st = m, len = a.length > 2 ? Math.round(N(2)) : Infinity; var end = st + len; var from = Math.max(st, 1), to = Math.min(end, s.length + 1); return to > from ? s.slice(from - 1, to - 1) : ''; }
    case 'index': return S(0).indexOf(S(1)) + 1;
    case 'split': { var str = S(0), arr = this.arr(a[1].n), fs = a.length > 2 ? (a[2].k === 'regex' ? a[2].v : S(2)) : toStr(this.vars.FS), parts; Object.keys(arr).forEach(function (k) { delete arr[k]; }); if (str === '') parts = []; else if (fs === ' ') parts = str.split(/[ \t\n]+/).filter(Boolean); else if (fs.length === 1) parts = str.split(fs); else parts = str.split(T.toRe(fs, 'ere')); parts.forEach(function (x, i) { arr[String(i + 1)] = new SN(x); }); return parts.length; }
    case 'sub': return this.substitute(e, false);
    case 'gsub': return this.substitute(e, true);
    case 'match': { var ms = S(0), mm = this.regex(a[1]).exec(ms); if (mm) { this.vars.RSTART = mm.index + 1; this.vars.RLENGTH = mm[0].length; return mm.index + 1; } this.vars.RSTART = 0; this.vars.RLENGTH = -1; return 0; }
    case 'sprintf': return T.fmtPrintf(S(0), a.slice(1).map(function (x) { var v = self.ev(x); return typeof v === 'number' ? numStr(v) : toStr(v); }), true);
    case 'tolower': return S(0).toLowerCase();
    case 'toupper': return S(0).toUpperCase();
    case 'int': return Math.trunc(N(0));
    case 'sqrt': return Math.sqrt(N(0)); case 'exp': return Math.exp(N(0)); case 'log': return Math.log(N(0)); case 'sin': return Math.sin(N(0)); case 'cos': return Math.cos(N(0)); case 'atan2': return Math.atan2(N(0), N(1));
    case 'rand': return Math.random(); case 'srand': return 0;
    case 'system': return 0;
    default: throw new AwkErr('calling undefined function ' + n);
  }
};
function Brk() {} function Cnt() {} function Nxt() {} function Ext(c) { this.code = c; }
IP.exec = function (s) {
  var self = this;
  switch (s.k) {
    case 'block': s.s.forEach(function (x) { self.exec(x); }); return;
    case 'expr': this.ev(s.e); return;
    case 'print': case 'printf': {
      var txt;
      if (s.k === 'print') txt = (s.a.length ? s.a.map(function (x) { var v = self.ev(x); return typeof v === 'number' ? numStr(v) : toStr(v); }).join(toStr(this.vars.OFS)) : this.rec.s) + toStr(this.vars.ORS);
      else { var vals = s.a.map(function (x) { var v = self.ev(x); return typeof v === 'number' ? numStr(v) : toStr(v); }); txt = T.fmtPrintf(vals[0] || '', vals.slice(1), true); }
      if (s.r) { var tgt = toStr(this.ev(s.r.target)); if (tgt === '/dev/stderr') this.io.e(txt); else if (tgt === '/dev/stdout') this.io.o(txt); else { var key = tgt; if (!this.files[key]) { this.files[key] = true; try { this.sh.writeFile(tgt, '', s.r.append ? false : false); } catch (e) { /* ignore */ } if (s.r.append) { /* keep existing */ } } try { this.sh.writeFile(tgt, txt, true); } catch (e2) { this.io.e('awk: cannot open "' + tgt + '"\n'); } } }
      else this.io.o(txt);
      return;
    }
    case 'if': if (toBool(this.ev(s.c))) this.exec(s.t); else if (s.e) this.exec(s.e); return;
    case 'while': while (toBool(this.ev(s.c))) { this.tick(); try { this.exec(s.b); } catch (x) { if (x instanceof Brk) break; if (x instanceof Cnt) continue; throw x; } } return;
    case 'do': do { this.tick(); try { this.exec(s.b); } catch (x) { if (x instanceof Brk) break; if (x instanceof Cnt) continue; throw x; } } while (toBool(this.ev(s.c))); return;
    case 'for': if (s.i) this.exec(s.i); while (!s.c || toBool(this.ev(s.c))) { this.tick(); try { this.exec(s.b); } catch (x) { if (x instanceof Brk) break; if (!(x instanceof Cnt)) throw x; } if (s.s) this.exec(s.s); } return;
    case 'forin': { var keys = Object.keys(this.arr(s.a)); keys.sort(function (p, q) { var pn = /^\d+$/.test(p), qn = /^\d+$/.test(q); return pn && qn ? p - q : pn ? -1 : qn ? 1 : 0; }); for (var i = 0; i < keys.length; i++) { this.setVar(s.v, new SN(keys[i])); try { this.exec(s.b); } catch (x) { if (x instanceof Brk) break; if (x instanceof Cnt) continue; throw x; } } return; }
    case 'break': throw new Brk(); case 'continue': throw new Cnt(); case 'next': throw new Nxt();
    case 'exit': throw new Ext(s.e ? Math.floor(toNum(this.ev(s.e))) : null);
    case 'return': throw { ret: s.e ? this.ev(s.e) : undefined };
    case 'delete': { var ar = this.arr(s.a); if (s.idx) delete ar[this.key(s.idx)]; else Object.keys(ar).forEach(function (k) { delete ar[k]; }); return; }
    default: throw new AwkErr('internal stmt ' + s.k);
  }
};
IP.tick = function () { if (++this.sh.steps > this.sh.maxSteps * 20) throw new AwkErr('too many steps'); };
IP.runRules = function (recText) {
  var self = this;
  this.rec = { s: recText, f: null }; this.NR++; this.FNR++;
  for (var i = 0; i < this.p.rules.length; i++) {
    var r = this.p.rules[i], hit;
    if (!r.pat) hit = true;
    else if (r.pat2) {
      if (this.rangeOn[i]) { hit = true; if (toBool(this.ev(r.pat2))) this.rangeOn[i] = false; }
      else if (toBool(this.ev(r.pat))) { hit = true; if (!toBool(this.ev(r.pat2))) this.rangeOn[i] = true; } else hit = false;
    } else hit = toBool(this.ev(r.pat));
    if (!hit) continue;
    if (!r.body) { this.io.o(this.rec.s + toStr(this.vars.ORS)); continue; }
    try { this.exec(r.body); } catch (x) { if (x instanceof Nxt) return; throw x; }
  }
  void self;
};

def('awk gawk mawk', function (a, io) {
  var self = this, i = 0, fs = null, vars = [], progText = null, files = [];
  for (; i < a.length; i++) {
    var x = a[i];
    if (x === '-F') { fs = a[++i]; } else if (/^-F./.test(x)) fs = x.slice(2);
    else if (x === '-v') vars.push(a[++i]); else if (/^-v./.test(x)) vars.push(x.slice(2));
    else if (x === '-f') { try { progText = self.readFile(a[++i]); } catch (e) { io.e('awk: can\'t open file ' + a[i] + '\n'); return 2; } }
    else if (x === '--') { i++; break; } else if (x[0] === '-' && x.length > 1 && progText === null) continue;
    else break;
  }
  if (progText === null) progText = a[i++];
  files = a.slice(i);
  if (progText === undefined) { io.e('usage: awk [-F fs][-v var=value][prog | -f progfile][file ...]\n'); return 2; }
  var prog;
  try { prog = new Parser(lexAwk(progText)).program(); } catch (e) { if (e instanceof AwkErr) { io.e('awk: ' + e.msg + '\n'); return 2; } throw e; }
  var it = new Interp(prog, this, io, {});
  if (fs !== null) it.vars.FS = fs === 't' ? '\t' : fs.replace(/\\t/g, '\t');
  vars.forEach(function (v) { var k = v.indexOf('='); it.vars[v.slice(0, k)] = new SN(v.slice(k + 1).replace(/\\n/g, '\n').replace(/\\t/g, '\t')); });
  var code = 0;
  try {
    try { prog.begin.forEach(function (b) { it.exec(b); }); } catch (x) { if (x instanceof Ext) { if (x.code !== null) code = x.code; prog.end = []; return code; } throw x; }
    if (prog.rules.length || prog.end.length) {
      var srcs = [];
      if (!files.length) srcs.push({ name: '', text: T.readAll(io.in) });
      else files.forEach(function (p) { if (p === '-') { srcs.push({ name: '-', text: T.readAll(io.in) }); return; } try { srcs.push({ name: p, text: self.readFile(p) }); } catch (e) { if (e instanceof T.FsErr) { io.e('awk: fatal: cannot open file `' + p + '\' for reading: ' + e.msg + '\n'); code = 2; } else throw e; } });
      try {
        srcs.forEach(function (src) {
          it.vars.FILENAME = src.name; it.FNR = 0;
          var rs = it.vars.RS === undefined ? '\n' : toStr(it.vars.RS), recs;
          if (rs === '') recs = src.text.split(/\n\n+/).map(function (r) { return r.replace(/^\n+|\n+$/g, ''); }).filter(Boolean);
          else { recs = src.text.split(rs); if (recs[recs.length - 1] === '') recs.pop(); }
          recs.forEach(function (r) { it.runRules(r); });
        });
      } catch (x) { if (!(x instanceof Ext)) throw x; if (x.code !== null) code = x.code; }
      try { prog.end.forEach(function (b) { it.exec(b); }); } catch (x) { if (!(x instanceof Ext)) throw x; if (x.code !== null) code = x.code; }
    }
  } catch (e) { if (e instanceof AwkErr) { io.e('awk: ' + e.msg + '\n'); return 2; } if (e instanceof Cnt || e instanceof Brk || e instanceof Nxt) return code; throw e; }
  return code;
});
if (typeof module === 'object' && module.exports) module.exports = T;
}());
