/* MARGA terminal engine, part 7: a small jq (the commonly used subset). */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-awk.js') : window.MargaTerm;
function JqErr(m, code) { this.msg = m; this.code = code || 5; }
function lexJq(src) {
  var toks = [], i = 0, n = src.length;
  while (i < n) {
    var c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '#') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '"') {
      var parts = [], cur = '', depth;
      i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === '\\') {
          var d = src[i + 1];
          if (d === '(') { depth = 1; var j = i + 2; while (j < n && depth) { if (src[j] === '(') depth++; else if (src[j] === ')') depth--; j++; } parts.push(cur); cur = ''; parts.push({ expr: src.slice(i + 2, j - 1) }); i = j; continue; }
          cur += d === 'n' ? '\n' : d === 't' ? '\t' : d === 'r' ? '\r' : d === 'u' ? String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16)) : d; i += d === 'u' ? 6 : 2; continue;
        }
        cur += src[i++];
      }
      if (i >= n) throw new JqErr('syntax error: unterminated string', 3);
      i++; parts.push(cur); toks.push({ t: 'str', v: parts }); continue;
    }
    var m = /^(\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+)/.exec(src.slice(i));
    if (m && !(c === '.' && !/\d/.test(src[i + 1] || ''))) { toks.push({ t: 'num', v: parseFloat(m[0]) }); i += m[0].length; continue; }
    m = /^\$?[A-Za-z_][A-Za-z0-9_]*(?:::[A-Za-z_]\w*)*/.exec(src.slice(i));
    if (m) { toks.push({ t: m[0][0] === '$' ? 'var' : 'id', v: m[0] }); i += m[0].length; continue; }
    if (c === '@') { m = /^@\w+/.exec(src.slice(i)); toks.push({ t: 'fmt', v: m[0] }); i += m[0].length; continue; }
    var two = src.substr(i, 2);
    if (['==', '!=', '<=', '>=', '//', '..', '|=', '+=', '-=', '*='].indexOf(two) >= 0) { toks.push({ t: 'p', v: two }); i += 2; continue; }
    toks.push({ t: 'p', v: c }); i++;
  }
  toks.push({ t: 'eof' }); return toks;
}
function Parser(toks) { this.t = toks; this.i = 0; }
var PP = Parser.prototype;
PP.pk = function () { return this.t[this.i]; };
PP.isP = function (v) { var t = this.pk(); return t.t === 'p' && t.v === v; };
PP.isId = function (v) { var t = this.pk(); return t.t === 'id' && t.v === v; };
PP.eat = function (v) { if (!this.isP(v)) throw new JqErr('syntax error: expected `' + v + '\'', 3); this.i++; };
PP.pipe = function () {
  if (this.isId('def')) { return this.def(); }
  var l = this.assignOp();
  if (this.isId('as')) { this.i++; var v = this.pk(); if (v.t !== 'var') throw new JqErr('syntax error: expected variable', 3); this.i++; this.eat('|'); return { k: 'as', src: l, v: v.v.slice(1), body: this.pipe() }; }
  if (this.isP('|')) { this.i++; return { k: 'pipe', l: l, r: this.pipe() }; }
  return l;
};
PP.def = function () {
  this.i++; var name = this.pk().v; this.i++; var ps = [];
  if (this.isP('(')) { this.i++; while (!this.isP(')')) { ps.push(this.pk().v); this.i++; if (this.isP(';')) this.i++; } this.eat(')'); }
  this.eat(':'); var body = this.pipe(); this.eat(';'); return { k: 'def', n: name, ps: ps, body: body, rest: this.pipe() };
};
PP.assignOp = function () {
  var l = this.comma();
  var t = this.pk();
  if (t.t === 'p' && ['|=', '+=', '-=', '*=', '='].indexOf(t.v) >= 0) { this.i++; var r = this.alt(); return { k: 'upd', op: t.v, l: l, r: r }; }
  return l;
};
PP.comma = function () { var l = this.alt(); while (this.isP(',')) { this.i++; l = { k: 'comma', l: l, r: this.alt() }; } return l; };
PP.alt = function () { var l = this.or(); while (this.isP('//')) { this.i++; l = { k: 'alt', l: l, r: this.or() }; } return l; };
PP.or = function () { var l = this.and(); while (this.isId('or')) { this.i++; l = { k: 'or', l: l, r: this.and() }; } return l; };
PP.and = function () { var l = this.cmp(); while (this.isId('and')) { this.i++; l = { k: 'and', l: l, r: this.cmp() }; } return l; };
PP.cmp = function () { var l = this.add(), t = this.pk(); if (t.t === 'p' && ['==', '!=', '<', '<=', '>', '>='].indexOf(t.v) >= 0) { this.i++; return { k: 'cmp', op: t.v, l: l, r: this.add() }; } return l; };
PP.add = function () { var l = this.mul(); while (this.isP('+') || this.isP('-')) { var o = this.pk().v; this.i++; l = { k: 'bin', op: o, l: l, r: this.mul() }; } return l; };
PP.mul = function () { var l = this.unary(); while (this.isP('*') || this.isP('/') || this.isP('%')) { var o = this.pk().v; this.i++; l = { k: 'bin', op: o, l: l, r: this.unary() }; } return l; };
PP.unary = function () { if (this.isP('-')) { this.i++; return { k: 'neg', e: this.unary() }; } return this.postfix(); };
PP.postfix = function () {
  var e = this.primary();
  for (;;) {
    if (this.isP('.') && this.t[this.i + 1].t === 'id') { this.i++; var nm = this.pk().v; this.i++; e = { k: 'index', e: e, i: { k: 'lit', v: nm } }; continue; }
    if (this.isP('.') && this.t[this.i + 1].t === 'str') { this.i++; var st = this.pk(); this.i++; e = { k: 'index', e: e, i: this.strNode(st) }; continue; }
    if (this.isP('.') && this.t[this.i + 1].t === 'p' && this.t[this.i + 1].v === '[') { this.i++; continue; }
    if (this.isP('[')) {
      this.i++;
      if (this.isP(']')) { this.i++; e = { k: 'iter', e: e }; continue; }
      var a = this.isP(':') ? null : this.pipe();
      if (this.isP(':')) { this.i++; var b = this.isP(']') ? null : this.pipe(); this.eat(']'); e = { k: 'slice', e: e, a: a, b: b }; continue; }
      this.eat(']'); e = { k: 'index', e: e, i: a }; continue;
    }
    if (this.isP('?')) { this.i++; e = { k: 'try', e: e }; continue; }
    break;
  }
  return e;
};
PP.strNode = function (tok) {
  var parts = tok.v.map(function (p) { return typeof p === 'string' ? p : { k: 'sub', e: new Parser(lexJq(p.expr)).pipe() }; });
  if (parts.length === 1 && typeof parts[0] === 'string') return { k: 'lit', v: parts[0] };
  return { k: 'interp', parts: parts };
};
PP.primary = function () {
  var t = this.pk();
  if (t.t === 'num') { this.i++; return { k: 'lit', v: t.v }; }
  if (t.t === 'str') { this.i++; return this.strNode(t); }
  if (t.t === 'fmt') { this.i++; var f = { k: 'fmt', f: t.v }; if (this.pk().t === 'str') { var s = this.strNode(this.pk()); this.i++; return { k: 'pipe', l: s.k === 'lit' ? s : s, r: f, fmtInterp: true }; } return f; }
  if (t.t === 'var') { this.i++; return { k: 'var', n: t.v.slice(1) }; }
  if (t.t === 'p' && t.v === '..') { this.i++; return { k: 'recurse' }; }
  if (t.t === 'p' && t.v === '.') {
    this.i++;
    var n = this.pk();
    if (n.t === 'id' && !/^(and|or|as|if|then|else|elif|end)$/.test(n.v)) { this.i++; return { k: 'index', e: { k: 'id' }, i: { k: 'lit', v: n.v } }; }
    if (n.t === 'str') { this.i++; return { k: 'index', e: { k: 'id' }, i: this.strNode(n) }; }
    return { k: 'id' };
  }
  if (t.t === 'p' && t.v === '(') { this.i++; var e = this.pipe(); this.eat(')'); return { k: 'paren', e: e }; }
  if (t.t === 'p' && t.v === '[') { this.i++; if (this.isP(']')) { this.i++; return { k: 'arr', e: null }; } var ae = this.pipe(); this.eat(']'); return { k: 'arr', e: ae }; }
  if (t.t === 'p' && t.v === '{') {
    this.i++; var ents = [];
    while (!this.isP('}')) {
      var kt = this.pk(), key, val = null;
      if (kt.t === 'id' || kt.t === 'num') { this.i++; key = { k: 'lit', v: String(kt.v) }; }
      else if (kt.t === 'str') { this.i++; key = this.strNode(kt); }
      else if (kt.t === 'var') { this.i++; key = { k: 'lit', v: kt.v.slice(1) }; val = { k: 'var', n: kt.v.slice(1) }; }
      else if (kt.t === 'p' && kt.v === '(') { this.i++; key = this.pipe(); this.eat(')'); }
      else throw new JqErr('syntax error: bad object key', 3);
      if (this.isP(':')) { this.i++; val = this.alt2(); }
      else if (!val) val = { k: 'index', e: { k: 'id' }, i: key };
      ents.push({ k: key, v: val });
      if (this.isP(',')) this.i++;
    }
    this.i++; return { k: 'obj', ents: ents };
  }
  if (t.t === 'id') {
    if (t.v === 'if') {
      this.i++; var c = this.pipe(); if (!this.isId('then')) throw new JqErr('syntax error: expected then', 3); this.i++; var th = this.pipe(), el = null, chain = [{ c: c, t: th }];
      while (this.isId('elif')) { this.i++; var c2 = this.pipe(); this.i++; var t2 = this.pipe(); chain.push({ c: c2, t: t2 }); }
      if (this.isId('else')) { this.i++; el = this.pipe(); }
      if (!this.isId('end')) throw new JqErr('syntax error: expected end', 3); this.i++;
      return { k: 'if', chain: chain, e: el };
    }
    if (t.v === 'reduce' || t.v === 'foreach') { throw new JqErr('reduce and foreach are not supported in this simulator', 3); }
    this.i++;
    if (t.v === 'true') return { k: 'lit', v: true }; if (t.v === 'false') return { k: 'lit', v: false }; if (t.v === 'null') return { k: 'lit', v: null };
    var args = [];
    if (this.isP('(')) { this.i++; for (;;) { args.push(this.pipe()); if (this.isP(';')) { this.i++; continue; } break; } this.eat(')'); }
    return { k: 'call', n: t.v, a: args };
  }
  throw new JqErr('syntax error, unexpected ' + (t.v === undefined ? t.t : '`' + t.v + "'"), 3);
};
PP.alt2 = function () { var l = this.or(); while (this.isP('//')) { this.i++; l = { k: 'alt', l: l, r: this.or() }; } return l; };

function typeOf(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'object' ? 'object' : typeof v; }
function cmpJ(a, b) {
  var ta = typeOf(a), tb = typeOf(b), order = ['null', 'boolean', 'number', 'string', 'array', 'object'];
  if (ta === 'boolean') ta = a ? 'true' : 'false'; if (tb === 'boolean') tb = b ? 'true' : 'false';
  var oa = order.indexOf(typeOf(a)), ob = order.indexOf(typeOf(b));
  if (typeOf(a) === 'boolean' && typeOf(b) === 'boolean') return a === b ? 0 : a ? 1 : -1;
  if (oa !== ob) return oa < ob ? -1 : 1;
  if (typeOf(a) === 'number' || typeOf(a) === 'string') return a < b ? -1 : a > b ? 1 : 0;
  if (Array.isArray(a)) { for (var i = 0; i < Math.min(a.length, b.length); i++) { var r = cmpJ(a[i], b[i]); if (r) return r; } return a.length - b.length < 0 ? -1 : a.length > b.length ? 1 : 0; }
  if (typeOf(a) === 'object') { var ka = Object.keys(a).sort(), kb = Object.keys(b).sort(), rk = cmpJ(ka, kb); if (rk) return rk; for (var j = 0; j < ka.length; j++) { var rv = cmpJ(a[ka[j]], b[ka[j]]); if (rv) return rv; } }
  return 0;
}
function truthy(v) { return v !== null && v !== false; }
function errDesc(v) { var s = JSON.stringify(v); if (s && s.length > 11) s = s.slice(0, 10) + '...'; return typeOf(v) + ' (' + s + ')'; }
function fmtVal(v, f) {
  if (f === '@json') return JSON.stringify(v); if (f === '@text') return typeof v === 'string' ? v : JSON.stringify(v);
  if (f === '@csv' || f === '@tsv') { if (!Array.isArray(v)) throw new JqErr(errDesc(v) + ' cannot be ' + (f === '@csv' ? 'csv' : 'tsv') + '-formatted, only an array can be'); return v.map(function (x) { if (typeof x === 'string') return f === '@csv' ? '"' + x.replace(/"/g, '""') + '"' : x.replace(/\t/g, '\\t'); return x === null ? '' : String(x); }).join(f === '@csv' ? ',' : '\t'); }
  if (f === '@uri') return encodeURIComponent(typeof v === 'string' ? v : JSON.stringify(v));
  if (f === '@sh') return typeof v === 'string' ? "'" + v.replace(/'/g, "'\\''") + "'" : String(v);
  if (f === '@html') return String(v).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; });
  throw new JqErr(f + ' is not a valid format', 3);
}
function mkRegex(re, flags) { return new RegExp(re, (flags || '').replace(/[^gimsx]/g, '').replace('x', '')); }
function ev(n, inp, env) {
  switch (n.k) {
    case 'id': return [inp];
    case 'paren': return ev(n.e, inp, env);
    case 'lit': return [n.v];
    case 'var': { if (!(n.n in env.vars)) throw new JqErr('$' + n.n + ' is not defined', 3); return [env.vars[n.n]]; }
    case 'recurse': { var out = []; (function walk(v) { out.push(v); if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { walk(v[k]); }); })(inp); return out; }
    case 'pipe': { if (n.fmtInterp) { return ev(n.l, inp, env).map(function (s) { return s; }); } var res = []; ev(n.l, inp, env).forEach(function (x) { ev(n.r, x, env).forEach(function (y) { res.push(y); }); }); return res; }
    case 'comma': return ev(n.l, inp, env).concat(ev(n.r, inp, env));
    case 'as': { var r2 = []; ev(n.src, inp, env).forEach(function (v) { var vars = Object.assign({}, env.vars); vars[n.v] = v; ev(n.body, inp, { vars: vars, fns: env.fns }).forEach(function (y) { r2.push(y); }); }); return r2; }
    case 'def': { var fns = Object.assign({}, env.fns); fns[n.n + '/' + n.ps.length] = { ps: n.ps, body: n.body, env: null }; var e2 = { vars: env.vars, fns: fns }; fns[n.n + '/' + n.ps.length].env = e2; return ev(n.rest, inp, e2); }
    case 'index': {
      var res3 = [];
      ev(n.e, inp, env).forEach(function (base) {
        ev(n.i, inp, env).forEach(function (k) {
          if (base === null) { res3.push(null); return; }
          if (typeof k === 'string') { if (typeOf(base) !== 'object') throw new JqErr('Cannot index ' + typeOf(base) + ' with "' + k + '"'); res3.push(k in base ? base[k] : null); }
          else if (typeof k === 'number') { if (!Array.isArray(base)) throw new JqErr('Cannot index ' + typeOf(base) + ' with number'); var ix = k < 0 ? base.length + k : Math.floor(k); res3.push(ix >= 0 && ix < base.length ? base[ix] : null); }
          else throw new JqErr('Cannot index ' + typeOf(base) + ' with ' + typeOf(k));
        });
      });
      return res3;
    }
    case 'slice': { var out4 = []; ev(n.e, inp, env).forEach(function (base) { var a = n.a ? ev(n.a, inp, env)[0] : 0, b = n.b ? ev(n.b, inp, env)[0] : null; if (base === null) { out4.push(null); return; } var len = base.length; var s = a < 0 ? Math.max(0, len + a) : a, e = b === null ? len : b < 0 ? len + b : b; out4.push(typeof base === 'string' ? base.slice(s, e) : base.slice(s, e)); }); return out4; }
    case 'iter': { var out5 = []; ev(n.e, inp, env).forEach(function (base) { if (Array.isArray(base)) base.forEach(function (x) { out5.push(x); }); else if (base && typeof base === 'object') Object.keys(base).forEach(function (k) { out5.push(base[k]); }); else throw new JqErr('Cannot iterate over ' + (base === null ? 'null' : errDesc(base))); }); return out5; }
    case 'try': try { return ev(n.e, inp, env); } catch (e) { if (e instanceof JqErr && e.code === 5) return []; throw e; }
    case 'arr': return [n.e ? ev(n.e, inp, env) : []];
    case 'obj': {
      var objs = [{}];
      n.ents.forEach(function (en) {
        var next = [];
        ev(en.k, inp, env).forEach(function (k) { ev(en.v, inp, env).forEach(function (v) { objs.forEach(function (o) { var c = Object.assign({}, o); c[k] = v; next.push(c); }); }); });
        objs = next;
      });
      return objs;
    }
    case 'interp': {
      var strs = [''];
      n.parts.forEach(function (p) { if (typeof p === 'string') strs = strs.map(function (s) { return s + p; }); else { var nx = []; ev(p.e, inp, env).forEach(function (v) { strs.forEach(function (s) { nx.push(s + (typeof v === 'string' ? v : JSON.stringify(v))); }); }); strs = nx; } });
      return strs;
    }
    case 'fmt': return [fmtVal(inp, n.f)];
    case 'neg': return ev(n.e, inp, env).map(function (v) { if (typeof v !== 'number') throw new JqErr(errDesc(v) + ' cannot be negated'); return -v; });
    case 'and': return ev(n.l, inp, env).reduce(function (acc, a) { if (!truthy(a)) { acc.push(false); return acc; } ev(n.r, inp, env).forEach(function (b) { acc.push(truthy(b)); }); return acc; }, []);
    case 'or': return ev(n.l, inp, env).reduce(function (acc, a) { if (truthy(a)) { acc.push(true); return acc; } ev(n.r, inp, env).forEach(function (b) { acc.push(truthy(b)); }); return acc; }, []);
    case 'alt': { var l = []; try { l = ev(n.l, inp, env).filter(truthy); } catch (e) { if (!(e instanceof JqErr)) throw e; } return l.length ? l : ev(n.r, inp, env); }
    case 'cmp': { var o6 = []; ev(n.r, inp, env).forEach(function (b) { ev(n.l, inp, env).forEach(function (a) { var c = cmpJ(a, b); o6.push(n.op === '==' ? c === 0 : n.op === '!=' ? c !== 0 : n.op === '<' ? c < 0 : n.op === '<=' ? c <= 0 : n.op === '>' ? c > 0 : c >= 0); }); }); return o6; }
    case 'bin': { var o7 = []; ev(n.r, inp, env).forEach(function (b) { ev(n.l, inp, env).forEach(function (a) { o7.push(arith(n.op, a, b)); }); }); return o7; }
    case 'if': {
      function run(i) { if (i >= n.chain.length) return n.e ? ev(n.e, inp, env) : [inp]; var out = []; ev(n.chain[i].c, inp, env).forEach(function (c) { (truthy(c) ? ev(n.chain[i].t, inp, env) : run(i + 1)).forEach(function (y) { out.push(y); }); }); return out; }
      return run(0);
    }
    case 'upd': {
      var pths = [];
      (function find(e, path) {
        if (e.k === 'id') { pths.push(path); return; }
        if (e.k === 'paren') { find(e.e, path); return; }
        if (e.k === 'index') { var bases = []; (function f2(b, p2) { if (b.k === 'id') bases.push(p2); else if (b.k === 'index') f2(b.e, p2); })(e.e, path); find(e.e, path); return; }
      })(n.l, []);
      var cp = JSON.parse(JSON.stringify(inp));
      function pathsOf(e, root) {
        if (e.k === 'id') return [[]];
        if (e.k === 'paren') return pathsOf(e.e, root);
        if (e.k === 'index') { var out = []; var ks = ev(e.i, root, env); pathsOf(e.e, root).forEach(function (bp) { var base = getp(root, bp); ks.forEach(function (k) { out.push(bp.concat([k])); }); void base; }); return out; }
        if (e.k === 'iter') { var o2 = []; pathsOf(e.e, root).forEach(function (bp) { var base = getp(root, bp); if (Array.isArray(base)) base.forEach(function (x, i) { o2.push(bp.concat([i])); }); else if (base && typeof base === 'object') Object.keys(base).forEach(function (k) { o2.push(bp.concat([k])); }); else throw new JqErr('Cannot iterate over ' + (base === null ? 'null' : errDesc(base))); }); return o2; }
        if (e.k === 'pipe') { var o3 = []; pathsOf(e.l, root).forEach(function (p1) { var sub = getp(root, p1); var inner = pathsOf(e.r, sub); inner.forEach(function (p2) { o3.push(p1.concat(p2)); }); }); return o3; }
        if (e.k === 'call' && e.n === 'select') { return ev(e.a[0], root, env).some(truthy) ? [[]] : []; }
        throw new JqErr('Invalid path expression', 5);
      }
      function getp(v, p) { var c = v; for (var i = 0; i < p.length; i++) { if (c === null || c === undefined) return null; c = c[p[i]]; } return c === undefined ? null : c; }
      function setp(v, p, val) { if (!p.length) return val; var c = v; for (var i = 0; i < p.length - 1; i++) { if (c[p[i]] === null || c[p[i]] === undefined) c[p[i]] = typeof p[i + 1] === 'number' ? [] : {}; c = c[p[i]]; } c[p[p.length - 1]] = val; return v; }
      var rhsVals = n.op === '|=' ? null : ev(n.r, inp, env);
      return rhsVals === null || rhsVals.length ? [(function () {
        var res = cp;
        pathsOf(n.l, inp).forEach(function (p) {
          var cur = getp(res, p), nv;
          if (n.op === '|=') { var o = ev(n.r, cur, env); if (!o.length) return; nv = o[0]; }
          else if (n.op === '=') nv = rhsVals[0]; else nv = arith(n.op[0], cur, rhsVals[0]);
          res = setp(res, p, nv);
        });
        return res;
      })()] : [];
    }
    case 'call': return callFn(n, inp, env);
    default: throw new JqErr('internal ' + n.k, 3);
  }
}
function arith(op, a, b) {
  if (op === '+') { if (a === null) return b; if (b === null) return a; if (typeof a === 'number' && typeof b === 'number') return a + b; if (typeof a === 'string' && typeof b === 'string') return a + b; if (Array.isArray(a) && Array.isArray(b)) return a.concat(b); if (typeOf(a) === 'object' && typeOf(b) === 'object') return Object.assign({}, a, b); throw new JqErr(errDesc(a) + ' and ' + errDesc(b) + ' cannot be added'); }
  if (op === '-') { if (typeof a === 'number' && typeof b === 'number') return a - b; if (Array.isArray(a) && Array.isArray(b)) return a.filter(function (x) { return !b.some(function (y) { return cmpJ(x, y) === 0; }); }); throw new JqErr(errDesc(a) + ' and ' + errDesc(b) + ' cannot be subtracted'); }
  if (op === '*') { if (typeof a === 'number' && typeof b === 'number') return a * b; if (typeof a === 'string' && typeof b === 'number') return b > 0 ? new Array(Math.ceil(b)).fill(a).join('') : null; throw new JqErr(errDesc(a) + ' and ' + errDesc(b) + ' cannot be multiplied'); }
  if (op === '/') { if (typeof a === 'string' && typeof b === 'string') return a.split(b); if (typeof a === 'number' && typeof b === 'number') { if (b === 0) throw new JqErr(errDesc(a) + ' and ' + errDesc(b) + ' cannot be divided because the divisor is zero'); return a / b; } throw new JqErr(errDesc(a) + ' and ' + errDesc(b) + ' cannot be divided'); }
  if (op === '%') { if (typeof a === 'number' && typeof b === 'number') { if (Math.trunc(b) === 0) throw new JqErr(errDesc(a) + ' and ' + errDesc(b) + ' cannot be divided because the divisor is zero'); return Math.trunc(a) % Math.trunc(b); } throw new JqErr(errDesc(a) + ' and ' + errDesc(b) + ' cannot be divided'); }
}
function callFn(n, inp, env) {
  var key = n.n + '/' + n.a.length, f = env.fns[key];
  if (f) {
    var vars = Object.assign({}, f.env.vars), fns = Object.assign({}, f.env.fns);
    f.ps.forEach(function (p, i) { fns[p + '/0'] = { ps: [], body: n.a[i], env: env }; });
    fns[key] = f;
    return ev(f.body, inp, { vars: vars, fns: fns });
  }
  var a = n.a, A = function (i) { return ev(a[i], inp, env); }, out;
  var one = function (i) { var r = A(i); return r[0]; };
  switch (key) {
    case 'empty/0': return [];
    case 'not/0': return [!truthy(inp)];
    case 'length/0': { if (inp === null) return [0]; if (typeof inp === 'string') return [Array.from(inp).length]; if (Array.isArray(inp)) return [inp.length]; if (typeOf(inp) === 'object') return [Object.keys(inp).length]; if (typeof inp === 'number') return [Math.abs(inp)]; throw new JqErr(errDesc(inp) + ' has no length'); }
    case 'keys/0': case 'keys_unsorted/0': { if (Array.isArray(inp)) return [inp.map(function (x, i) { return i; })]; if (typeOf(inp) !== 'object') throw new JqErr(errDesc(inp) + ' has no keys'); var ks = Object.keys(inp); return [key === 'keys/0' ? ks.sort() : ks]; }
    case 'values/0': return truthy(inp) || inp === false ? (inp === null ? [] : [inp]) : [];
    case 'type/0': return [typeOf(inp)];
    case 'add/0': { if (!Array.isArray(inp) && typeOf(inp) !== 'object') throw new JqErr('Cannot iterate over ' + errDesc(inp)); var vs = Array.isArray(inp) ? inp : Object.keys(inp).map(function (k) { return inp[k]; }); return [vs.reduce(function (acc, x) { return arith('+', acc, x); }, null)]; }
    case 'map/1': { if (!Array.isArray(inp)) throw new JqErr('Cannot iterate over ' + (inp === null ? 'null' : errDesc(inp))); var r = []; inp.forEach(function (x) { ev(a[0], x, env).forEach(function (y) { r.push(y); }); }); return [r]; }
    case 'select/1': { var o = []; ev(a[0], inp, env).forEach(function (c) { if (truthy(c)) o.push(inp); }); return o; }
    case 'sort/0': return [inp.slice().sort(cmpJ)];
    case 'sort_by/1': return [inp.map(function (x) { return { x: x, k: ev(a[0], x, env) }; }).sort(function (p, q) { return cmpJ(p.k, q.k); }).map(function (p) { return p.x; })];
    case 'group_by/1': { var m = inp.map(function (x) { return { x: x, k: ev(a[0], x, env) }; }).sort(function (p, q) { return cmpJ(p.k, q.k); }), g = []; m.forEach(function (p) { if (g.length && cmpJ(g[g.length - 1].k, p.k) === 0) g[g.length - 1].v.push(p.x); else g.push({ k: p.k, v: [p.x] }); }); return [g.map(function (e) { return e.v; })]; }
    case 'unique/0': { var s = inp.slice().sort(cmpJ); return [s.filter(function (x, i) { return i === 0 || cmpJ(s[i - 1], x) !== 0; })]; }
    case 'unique_by/1': { var m2 = inp.map(function (x) { return { x: x, k: ev(a[0], x, env) }; }).sort(function (p, q) { return cmpJ(p.k, q.k); }); return [m2.filter(function (p, i) { return i === 0 || cmpJ(m2[i - 1].k, p.k) !== 0; }).map(function (p) { return p.x; })]; }
    case 'min/0': return [inp.length ? inp.reduce(function (m3, x) { return cmpJ(x, m3) < 0 ? x : m3; }) : null];
    case 'max/0': return [inp.length ? inp.reduce(function (m3, x) { return cmpJ(x, m3) >= 0 ? x : m3; }) : null];
    case 'min_by/1': case 'max_by/1': { if (!inp.length) return [null]; var best = null, bk = null; inp.forEach(function (x) { var k = ev(a[0], x, env); if (best === null && bk === null || (key === 'min_by/1' ? cmpJ(k, bk) < 0 : cmpJ(k, bk) >= 0)) { best = x; bk = k; } }); return [best]; }
    case 'reverse/0': return [typeof inp === 'string' ? Array.from(inp).reverse().join('') : inp === null ? [] : inp.slice().reverse()];
    case 'first/0': return [inp.length ? inp[0] : null];
    case 'last/0': return [inp.length ? inp[inp.length - 1] : null];
    case 'first/1': { var f1 = ev(a[0], inp, env); return f1.length ? [f1[0]] : []; }
    case 'limit/2': { var lim = one(0); return ev(a[1], inp, env).slice(0, lim); }
    case 'join/1': { var sep = one(0); return [inp.map(function (x) { return x === null ? '' : typeof x === 'string' ? x : JSON.stringify(x); }).join(sep)]; }
    case 'split/1': return [inp.split(one(0))];
    case 'ascii_downcase/0': return [inp.toLowerCase()];
    case 'ascii_upcase/0': return [inp.toUpperCase()];
    case 'startswith/1': return [inp.startsWith(one(0))];
    case 'endswith/1': return [inp.endsWith(one(0))];
    case 'ltrimstr/1': { var lp = one(0); return [typeof inp === 'string' && inp.startsWith(lp) ? inp.slice(lp.length) : inp]; }
    case 'rtrimstr/1': { var rp = one(0); return [typeof inp === 'string' && rp && inp.endsWith(rp) ? inp.slice(0, -rp.length) : inp]; }
    case 'contains/1': { var cv = one(0); return [typeof inp === 'string' ? inp.indexOf(cv) >= 0 : Array.isArray(inp) ? cv.every(function (x) { return inp.some(function (y) { return cmpJ(x, y) === 0 || (typeof y === 'string' && typeof x === 'string' && y.indexOf(x) >= 0); }); }) : cmpJ(inp, cv) === 0]; }
    case 'inside/1': return [cmpJ(inp, one(0)) === 0 || (typeof inp === 'string' && one(0).indexOf(inp) >= 0)];
    case 'test/1': case 'test/2': return [mkRegex(one(0), a[1] ? one(1) : '').test(inp)];
    case 'sub/2': case 'gsub/2': case 'sub/3': case 'gsub/3': { var re = new RegExp(one(0), (n.n === 'gsub' ? 'g' : '') + (a[2] ? one(2).replace(/[^im]/g, '') : '')); var rep = one(1); return [inp.replace(re, function () { return typeof rep === 'string' ? rep : ''; })]; }
    case 'tostring/0': return [typeof inp === 'string' ? inp : JSON.stringify(inp)];
    case 'tonumber/0': { if (typeof inp === 'number') return [inp]; var nv = Number(inp); if (typeof inp !== 'string' || inp.trim() === '' || isNaN(nv)) throw new JqErr('Cannot parse ' + JSON.stringify(inp) + ' as number'); return [nv]; }
    case 'tojson/0': return [JSON.stringify(inp)];
    case 'fromjson/0': try { return [JSON.parse(inp)]; } catch (e) { throw new JqErr(JSON.stringify(inp) + ' (while parsing) is not valid JSON'); }
    case 'has/1': { var hk = one(0); return [Array.isArray(inp) ? hk >= 0 && hk < inp.length : typeOf(inp) === 'object' && Object.prototype.hasOwnProperty.call(inp, hk)]; }
    case 'to_entries/0': return [Object.keys(inp).map(function (k) { return { key: k, value: inp[k] }; })];
    case 'from_entries/0': { var ob = {}; inp.forEach(function (e) { var k = e.key !== undefined ? e.key : e.k !== undefined ? e.k : e.name; ob[String(k)] = e.value !== undefined ? e.value : e.v; }); return [ob]; }
    case 'with_entries/1': { var ents = Object.keys(inp).map(function (k) { return { key: k, value: inp[k] }; }), res = []; ents.forEach(function (e) { ev(a[0], e, env).forEach(function (y) { res.push(y); }); }); var o2 = {}; res.forEach(function (e) { o2[String(e.key)] = e.value; }); return [o2]; }
    case 'flatten/0': return [(function fl(x, d) { return x.reduce(function (acc, y) { return Array.isArray(y) && d > 0 ? acc.concat(fl(y, d - 1)) : acc.concat([y]); }, []); })(inp, 1e9)];
    case 'flatten/1': { var dep = one(0); return [(function fl(x, d) { return x.reduce(function (acc, y) { return Array.isArray(y) && d > 0 ? acc.concat(fl(y, d - 1)) : acc.concat([y]); }, []); })(inp, dep)]; }
    case 'range/1': { var up = one(0), rr = []; for (var i = 0; i < up; i++) rr.push(i); return rr; }
    case 'range/2': { var rr2 = []; for (var j = one(0); j < one(1); j++) rr2.push(j); return rr2; }
    case 'floor/0': return [Math.floor(inp)]; case 'ceil/0': return [Math.ceil(inp)]; case 'round/0': return [Math.round(inp)]; case 'sqrt/0': return [Math.sqrt(inp)]; case 'abs/0': return [Math.abs(inp)];
    case 'any/0': return [inp.some(truthy)]; case 'all/0': return [inp.every(truthy)];
    case 'any/1': return [inp.some(function (x) { return ev(a[0], x, env).some(truthy); })]; case 'all/1': return [inp.every(function (x) { return ev(a[0], x, env).some(truthy); })];
    case 'del/1': { var paths = []; (function find(n2, v, path) { if (n2.k === 'index' && n2.e.k === 'id') { var kk = ev(n2.i, inp, env)[0]; paths.push(path.concat([kk])); } else if (n2.k === 'iter' && n2.e.k === 'id') { Object.keys(v).forEach(function (kk) { paths.push(path.concat([Array.isArray(v) ? Number(kk) : kk])); }); } else if (n2.k === 'pipe' && n2.l.k === 'select') { /* unsupported */ } })(a[0], inp, []); var cp = JSON.parse(JSON.stringify(inp)); paths.sort(function (p, q) { return cmpJ(q, p); }).forEach(function (p) { var t = cp; for (var x = 0; x < p.length - 1; x++) t = t[p[x]]; var last = p[p.length - 1]; if (Array.isArray(t)) t.splice(last, 1); else delete t[last]; }); return [cp]; }
    case 'error/0': throw new JqErr(typeof inp === 'string' ? inp : JSON.stringify(inp));
    case 'error/1': throw new JqErr(String(one(0)));
    case 'env/0': return [{}];
    case 'tostring/1': return [''];
    case 'index/1': return [inp.indexOf(one(0)) < 0 ? null : inp.indexOf(one(0))];
    case 'ascii/0': return [String.fromCharCode(inp)];
    case 'recurse/0': return ev({ k: 'recurse' }, inp, env);
    case 'splits/1': return inp.split(mkRegex(one(0), ''));
    case 'input_line_number/0': return [0];
    case 'objects/0': return typeOf(inp) === 'object' ? [inp] : []; case 'arrays/0': return Array.isArray(inp) ? [inp] : []; case 'strings/0': return typeof inp === 'string' ? [inp] : []; case 'numbers/0': return typeof inp === 'number' ? [inp] : []; case 'nulls/0': return inp === null ? [inp] : []; case 'booleans/0': return typeof inp === 'boolean' ? [inp] : [];
    case 'getpath/1': { var pth = one(0), cur = inp; for (var q = 0; q < pth.length && cur !== null; q++) cur = cur[pth[q]]; return [cur === undefined ? null : cur]; }
    case 'tostream/0': return [];
    case 'map_values/1': { var mv = Array.isArray(inp) ? inp.map(function (x) { var o = ev(a[0], x, env); return o[0]; }) : (function () { var r = {}; Object.keys(inp).forEach(function (k) { var o = ev(a[0], inp[k], env); if (o.length) r[k] = o[0]; }); return r; })(); return [mv]; }
    default: throw new JqErr('jq: error: ' + n.n + '/' + n.a.length + ' is not defined', 3);
  }
  void out;
}
function dump(v, indent, level, sortKeys) {
  if (v === null) return 'null';
  if (typeof v === 'number') { return isFinite(v) ? String(v) : 'null'; }
  if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v).replace(/[\u007f-￿]/g, function (c) { return c; });
  var pad = indent ? '\n' + new Array(level + 2).join(indent) : '', end = indent ? '\n' + new Array(level + 1).join(indent) : '';
  if (Array.isArray(v)) { if (!v.length) return '[]'; return '[' + pad + v.map(function (x) { return dump(x, indent, level + 1, sortKeys); }).join(',' + pad) + end + ']'; }
  var ks = Object.keys(v); if (sortKeys) ks.sort();
  if (!ks.length) return '{}';
  return '{' + pad + ks.map(function (k) { return JSON.stringify(k) + (indent ? ': ' : ':') + dump(v[k], indent, level + 1, sortKeys); }).join(',' + pad) + end + '}';
}
T.def('jq', function (a, io) {
  var f = {}, filter = null, files = [], vars = {}, i = 0, self = this;
  for (; i < a.length; i++) {
    var x = a[i];
    if (x === '--arg') { vars[a[i + 1]] = a[i + 2]; i += 2; } else if (x === '--argjson') { try { vars[a[i + 1]] = JSON.parse(a[i + 2]); } catch (e) { io.e('jq: Invalid JSON text passed to --argjson\n'); return 2; } i += 2; }
    else if (x === '--tab') f.tab = true; else if (x === '--indent') { f.indentN = parseInt(a[++i], 10); }
    else if (/^--/.test(x)) { var nm = x.slice(2); if (nm === 'raw-output') f.r = true; else if (nm === 'compact-output') f.c = true; else if (nm === 'null-input') f.n = true; else if (nm === 'slurp') f.s = true; else if (nm === 'exit-status') f.e = true; else if (nm === 'sort-keys') f.S = true; else if (nm === 'join-output') { f.r = true; f.j = true; } }
    else if (/^-[a-zA-Z]+$/.test(x) && filter === null || (/^-[a-zA-Z]+$/.test(x) && x.length > 1)) { x.slice(1).split('').forEach(function (ch) { f[ch] = true; }); }
    else if (filter === null) filter = x; else files.push(x);
  }
  if (filter === null) { io.e('Usage: jq [OPTIONS] FILTER [FILES...]\n'); return 2; }
  var prog;
  try { prog = new Parser(lexJq(filter)).pipe(); } catch (e) { if (e instanceof JqErr) { io.e('jq: error: ' + e.msg + '\njq: 1 compile error\n'); return 3; } throw e; }
  var texts = [], rc = 0;
  if (!f.n) {
    if (!files.length) texts.push({ n: '<stdin>', t: T.readAll(io.in) });
    else files.forEach(function (p) { try { texts.push({ n: p, t: self.readFile(p) }); } catch (e) { if (e instanceof T.FsErr) { io.e('jq: error: Could not open ' + p + ': ' + e.msg + '\n'); rc = 2; } else throw e; } });
  }
  var inputs = [];
  for (var ti = 0; ti < texts.length; ti++) {
    var t = texts[ti].t.trim(), pos = 0;
    try {
      var dec = new T.JsonStream(texts[ti].t); var v; while ((v = dec.next()) !== T.JsonStream.END) inputs.push(v);
    } catch (e) { io.e('jq: error (at ' + texts[ti].n + ':0): ' + e.message + '\n'); return 2; }
    void t; void pos;
  }
  if (f.n) inputs = [null]; else if (f.s) inputs = [inputs];
  var env = { vars: vars, fns: {} }, last = null, any = false;
  var indent = f.c ? '' : f.tab ? '\t' : new Array((f.indentN === undefined ? 2 : f.indentN) + 1).join(' ');
  for (var ii = 0; ii < inputs.length; ii++) {
    try {
      ev(prog, inputs[ii], env).forEach(function (o) { any = true; last = o; io.o((f.r && typeof o === 'string' ? o : dump(o, indent, 0, f.S)) + (f.j ? '' : '\n')); });
    } catch (e) { if (e instanceof JqErr) { io.e((e.code === 3 ? '' : 'jq: error (at ' + (texts[0] ? texts[0].n : '<unknown>') + ':0): ') + e.msg + '\n'); rc = e.code === 3 ? 3 : 5; if (e.code === 3) return 3; } else throw e; }
  }
  if (rc) return rc;
  if (f.e) return !any ? 4 : (last === null || last === false) ? 1 : 0;
  return 0;
});
/* a tiny multi-document JSON reader so that "jq ." works on several values */
function JsonStream(text) { this.t = text; this.i = 0; }
JsonStream.END = {};
JsonStream.prototype.next = function () {
  var t = this.t; while (this.i < t.length && /\s/.test(t[this.i])) this.i++;
  if (this.i >= t.length) return JsonStream.END;
  var start = this.i, depth = 0, inStr = false, c;
  if (t[this.i] === '{' || t[this.i] === '[') {
    for (; this.i < t.length; this.i++) { c = t[this.i]; if (inStr) { if (c === '\\') this.i++; else if (c === '"') inStr = false; continue; } if (c === '"') inStr = true; else if (c === '{' || c === '[') depth++; else if (c === '}' || c === ']') { depth--; if (depth === 0) { this.i++; break; } } }
  } else if (t[this.i] === '"') { this.i++; for (; this.i < t.length && t[this.i] !== '"'; this.i++) if (t[this.i] === '\\') this.i++; this.i++; }
  else { while (this.i < t.length && !/\s/.test(t[this.i])) this.i++; }
  return JSON.parse(t.slice(start, this.i));
};
T.JsonStream = JsonStream;
if (typeof module === 'object' && module.exports) module.exports = T;
}());
