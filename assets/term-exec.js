/* MARGA terminal engine, part 3: variables, expansion, arithmetic and the interpreter. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-parse.js') : window.MargaTerm;
var P = T.Session.prototype;
function Ctl(kind, code, n) { this.kind = kind; this.code = code; this.n = n || 1; }
T.Ctl = Ctl;

/* ---------------- variables ---------------- */
function isArr(v) { return v && typeof v === 'object' && v.arr === true; }
P.lookupScope = function (name) {
  for (var i = this.frames.length - 1; i >= 0; i--) if (Object.prototype.hasOwnProperty.call(this.frames[i].locals, name)) return this.frames[i].locals;
  return this.vars;
};
P.rawVar = function (name) {
  var sc = this.lookupScope(name);
  if (Object.prototype.hasOwnProperty.call(sc, name)) return sc[name];
  if (Object.prototype.hasOwnProperty.call(this.env, name)) return this.env[name];
  return undefined;
};
P.getVar = function (name) {
  var v = this.rawVar(name);
  if (v === undefined) return undefined;
  if (isArr(v)) return v.m['0'] !== undefined ? v.m['0'] : (v.assoc ? undefined : '');
  return v;
};
P.setVar = function (name, val) {
  var sc = this.lookupScope(name);
  if (sc === this.vars && Object.prototype.hasOwnProperty.call(this.env, name) && !Object.prototype.hasOwnProperty.call(this.vars, name)) { this.env[name] = val; return; }
  sc[name] = val;
};
P.arrKeys = function (v) { var ks = Object.keys(v.m); if (!v.assoc) ks.sort(function (a, b) { return a - b; }); return ks; };
P.positional = function () { return this.frames.length ? this.frames[this.frames.length - 1].args : this.argv; };

/* ---------------- arithmetic ---------------- */
P.arith = function (src) {
  var self = this, toks = [], re = /\s*(\d+#[0-9a-zA-Z]+|\d+|[A-Za-z_]\w*|\*\*|\+\+|--|<=|>=|==|!=|&&|\|\||<<|>>|[-+*\/%<>=!?:()&|^~,]|\+=|-=|\*=|\/=)/y, m, pos = 0;
  src = String(src);
  while (pos < src.length) {
    re.lastIndex = pos;
    if (/^\s*$/.test(src.slice(pos))) break;
    m = re.exec(src);
    if (!m) throw new T.SyntaxErr('arithmetic syntax error: `' + src.slice(pos).trim() + "'");
    toks.push(m[1]); pos = re.lastIndex;
  }
  var i = 0;
  function val(name) { var v = self.getVar(name); if (v === undefined || v === '') return 0; if (/^-?\d+$/.test(v)) return parseInt(v, 10); if (/^[A-Za-z_]\w*$/.test(v) && v !== name) return val(v); return 0; }
  function peek() { return toks[i]; }
  function expr() { var v = assign(); while (peek() === ',') { i++; v = assign(); } return v; }
  function assign() {
    var t = peek();
    if (/^[A-Za-z_]\w*$/.test(t || '') && /^(=|\+=|-=|\*=|\/=)$/.test(toks[i + 1] || '') ) {
      var op = toks[i + 1]; i += 2; var r = assign(), cur = val(t), res = op === '=' ? r : op === '+=' ? cur + r : op === '-=' ? cur - r : op === '*=' ? cur * r : Math.trunc(cur / r);
      self.setVar(t, String(res)); return res;
    }
    return ternary();
  }
  function ternary() { var c = lor(); if (peek() === '?') { i++; var a = assign(); if (peek() !== ':') throw new T.SyntaxErr('arithmetic: expected :'); i++; var b = assign(); return c ? a : b; } return c; }
  function lor() { var v = land(); while (peek() === '||') { i++; var r = land(); v = (v || r) ? 1 : 0; } return v; }
  function land() { var v = bor(); while (peek() === '&&') { i++; var r = bor(); v = (v && r) ? 1 : 0; } return v; }
  function bor() { var v = bxor(); while (peek() === '|') { i++; v = v | bxor(); } return v; }
  function bxor() { var v = band(); while (peek() === '^') { i++; v = v ^ band(); } return v; }
  function band() { var v = eq(); while (peek() === '&') { i++; v = v & eq(); } return v; }
  function eq() { var v = rel(); while (peek() === '==' || peek() === '!=') { var o = toks[i++], r = rel(); v = (o === '==' ? v === r : v !== r) ? 1 : 0; } return v; }
  function rel() { var v = shift(); while (/^(<|>|<=|>=)$/.test(peek() || '')) { var o = toks[i++], r = shift(); v = (o === '<' ? v < r : o === '>' ? v > r : o === '<=' ? v <= r : v >= r) ? 1 : 0; } return v; }
  function shift() { var v = add(); while (peek() === '<<' || peek() === '>>') { var o = toks[i++], r = add(); v = o === '<<' ? v << r : v >> r; } return v; }
  function add() { var v = mul(); while (peek() === '+' || peek() === '-') { var o = toks[i++], r = mul(); v = o === '+' ? v + r : v - r; } return v; }
  function mul() {
    var v = pow();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      var o = toks[i++], r = pow();
      if ((o === '/' || o === '%') && r === 0) throw new T.SyntaxErr('division by 0 (error token is "' + r + '")');
      v = o === '*' ? v * r : o === '/' ? Math.trunc(v / r) : v % r;
    }
    return v;
  }
  function pow() { var v = unary(); if (peek() === '**') { i++; return Math.pow(v, pow()); } return v; }
  function unary() {
    var t = peek();
    if (t === '-') { i++; return -unary(); } if (t === '+') { i++; return unary(); } if (t === '!') { i++; return unary() ? 0 : 1; } if (t === '~') { i++; return ~unary(); }
    if (t === '++' || t === '--') { i++; var n = toks[i++], nv = val(n) + (t === '++' ? 1 : -1); self.setVar(n, String(nv)); return nv; }
    return post();
  }
  function post() {
    var t = peek();
    if (t === '(') { i++; var v = expr(); if (peek() !== ')') throw new T.SyntaxErr('arithmetic: missing )'); i++; return v; }
    if (/^\d+#/.test(t || '')) { i++; var bp = t.split('#'); return parseInt(bp[1], parseInt(bp[0], 10)); }
    if (/^\d+$/.test(t || '')) { i++; return parseInt(t, 10); }
    if (/^[A-Za-z_]\w*$/.test(t || '')) {
      i++;
      if (peek() === '++' || peek() === '--') { var o = toks[i++], old = val(t); self.setVar(t, String(old + (o === '++' ? 1 : -1))); return old; }
      return val(t);
    }
    throw new T.SyntaxErr('arithmetic syntax error');
  }
  if (!toks.length) return 0;
  var r = expr();
  if (i < toks.length) throw new T.SyntaxErr('arithmetic syntax error in expression (error token is "' + toks.slice(i).join(' ') + '")');
  return r;
};

/* ---------------- pattern helpers ---------------- */
function globToRe(p, flags) { /* p: array of {s,q} pieces or string */
  var pieces = typeof p === 'string' ? [{ s: p, q: false }] : p, out = '';
  pieces.forEach(function (pc) {
    var s = pc.s;
    if (pc.q) { out += s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); return; }
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '*') out += '[^]*'; else if (c === '?') out += '[^]';
      else if (c === '[') {
        var j = s.indexOf(']', i + 2);
        if (j < 0) { out += '\\['; continue; }
        var body = s.slice(i + 1, j); if (body[0] === '!') body = '^' + body.slice(1);
        body = body.replace(/\[:(\w+):\]/g, function (m, cl) { return { digit: '0-9', alpha: 'A-Za-z', alnum: 'A-Za-z0-9', upper: 'A-Z', lower: 'a-z', space: ' \\t\\n', punct: '!-\\/:-@\\[-`{-~' }[cl] || ''; });
        out += '[' + body.replace(/\\/g, '\\\\') + ']'; i = j;
      } else if (c === '\\' && i + 1 < s.length) { out += s[i + 1].replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); i++; }
      else out += c.replace(/[.+^${}()|\\\/]/g, '\\$&');
    }
  });
  return new RegExp('^' + out + '$', flags || '');
}
T.globToRe = globToRe;
function hasGlob(pieces) { return pieces.some(function (p) { return !p.q && /[*?\[]/.test(p.s); }); }

/* ---------------- expansion ---------------- */
P.cmdSubst = async function (ast) {
  var snap = this.snapshot(), buf = '', io = { in: null, o: function (s) { buf += s; }, e: this.curErr || function () {} };
  var st = 0;
  try { st = await this.run(ast, io); } catch (e) { if (e instanceof Ctl && e.kind === 'exit') st = e.code; else { this.restore(snap); throw e; } }
  this.restore(snap); this.status = st;
  return buf.replace(/\n+$/, '');
};
P.snapshot = function () {
  var s = { cwd: this.cwd, vars: JSON.parse(JSON.stringify(this.vars)), env: Object.assign({}, this.env), frames: this.frames.map(function (f) { return { locals: JSON.parse(JSON.stringify(f.locals)), args: f.args.slice() }; }), argv: this.argv.slice(), sopt: Object.assign({}, this.sopt), eu: this.eu, funcs: Object.assign({}, this.funcs), status: this.status, noerr: this.noerr };
  return s;
};
P.restore = function (s) { this.cwd = s.cwd; this.vars = s.vars; this.env = s.env; this.frames = s.frames; this.argv = s.argv; this.sopt = s.sopt; this.eu = s.eu; this.funcs = s.funcs; this.noerr = s.noerr; };

P.paramValue = async function (n) { /* returns {list:[...]|null, text} */
  var name = n.name, v, list = null;
  if (n.keys) { var av = this.rawVar(name); return { list: isArr(av) ? this.arrKeys(av) : [], text: '' }; }
  var idx = null;
  if (n.idx) idx = await this.expandStr(n.idx);
  if (name === '@' || name === '*') { list = this.positional().slice(); }
  else if (name === '#') v = String(this.positional().length);
  else if (name === '?') v = String(this.status);
  else if (name === '$') v = '4242';
  else if (name === '!') v = '4243';
  else if (name === '-') v = (this.sopt.e ? 'e' : '') + (this.sopt.u ? 'u' : '') + 'h';
  else if (/^\d+$/.test(name)) { v = name === '0' ? this.arg0 : this.positional()[parseInt(name, 10) - 1]; }
  else {
    var raw = this.rawVar(name);
    if (name === 'RANDOM') v = String(Math.floor(Math.random() * 32768));
    else if (name === 'LINENO') v = '1';
    else if (name === 'PIPESTATUS') { v = this.pipestatus ? String(this.pipestatus[0]) : '0'; }
    else if (isArr(raw)) {
      if (idx === '@' || idx === '*') list = this.arrKeys(raw).map(function (k) { return raw.m[k]; });
      else if (idx !== null) { var key = raw.assoc ? idx : String(this.arith(idx)); v = raw.m[key]; }
      else v = raw.m['0'];
    } else if (idx === '@' || idx === '*') list = raw === undefined ? [] : [raw];
    else if (idx !== null && raw !== undefined) v = (String(this.arith(idx)) === '0') ? raw : undefined;
    else v = raw;
  }
  return { list: list, text: v };
};
P.expandParam = async function (n, quoted) {
  var pv = await this.paramValue(n), op = n.op, list = pv.list, v = pv.text;
  if (n.keys) return { list: list, join: true };
  if (n.len) { if (list) return { str: String(list.length) }; return { str: String(v === undefined ? 0 : v.length) }; }
  if (list && !op) return { list: list, at: n.name === '@' || n.idx && n.idx.length === 1 && n.idx[0].s === '@' };
  if (list) { v = list.join(' '); }
  var unset = v === undefined, empty = unset || v === '';
  if (unset && this.sopt.u && !op && !/^[0-9@*#?$!\-]$/.test(n.name)) throw new T.SyntaxErr(n.name + ': unbound variable');
  if (!op) return { str: unset ? '' : v };
  var a;
  if (op === ':-' || op === '-') { if (op === ':-' ? empty : unset) return { str: await this.expandStr(n.a) }; return { str: v }; }
  if (op === ':=' || op === '=') { if (op === ':=' ? empty : unset) { a = await this.expandStr(n.a); this.setVar(n.name, a); return { str: a }; } return { str: v }; }
  if (op === ':?' || op === '?') { if (op === ':?' ? empty : unset) { a = await this.expandStr(n.a); var fe = new T.SyntaxErr(n.name + ': ' + (a || 'parameter null or not set')); fe.fatal = true; throw fe; } return { str: v }; }
  if (op === ':+' || op === '+') { if (op === ':+' ? !empty : !unset) return { str: await this.expandStr(n.a) }; return { str: '' }; }
  if (unset) v = '';
  if (op === '#' || op === '##' || op === '%' || op === '%%') {
    var pat = await this.expandPieces(n.a), re = globToRe(pat), best = null, i;
    if (op[0] === '#') {
      if (op === '#') { for (i = 0; i <= v.length; i++) if (re.test(v.slice(0, i))) { best = i; break; } }
      else { for (i = v.length; i >= 0; i--) if (re.test(v.slice(0, i))) { best = i; break; } }
      return { str: best === null ? v : v.slice(best) };
    }
    if (op === '%') { for (i = v.length; i >= 0; i--) if (re.test(v.slice(i))) { best = i; break; } }
    else { for (i = 0; i <= v.length; i++) if (re.test(v.slice(i))) { best = i; break; } }
    return { str: best === null ? v : v.slice(0, best) };
  }
  if (op[0] === '/') {
    var pp = await this.expandPieces(n.a), rep = await this.expandStr(n.b), all = op === '//';
    if (!pp.length || !pp.map(function (p) { return p.s; }).join('')) return { str: v };
    var pr = globToRe(pp, '').source.slice(1, -1), rx = new RegExp(op === '/#' ? '^' + pr : op === '/%' ? pr + '$' : pr, all ? 'g' : '');
    return { str: v.replace(rx, function () { return rep; }) };
  }
  if (op === '^^') return { str: v.toUpperCase() }; if (op === '^') return { str: v.charAt(0).toUpperCase() + v.slice(1) };
  if (op === ',,') return { str: v.toLowerCase() }; if (op === ',') return { str: v.charAt(0).toLowerCase() + v.slice(1) };
  if (op === ':') {
    var arg = await this.expandStr(n.a), pr2 = arg.split(':'), off = this.arith(pr2[0]), len = pr2.length > 1 ? this.arith(pr2[1]) : undefined;
    if (off < 0) off = Math.max(0, v.length + off);
    if (len === undefined) return { str: v.slice(off) };
    return { str: len < 0 ? v.slice(off, v.length + len) : v.slice(off, off + len) };
  }
  return { str: v };
};
P.expandPieces = async function (parts) { var f = await this.expandFields([{ p: parts }], true); return f.length ? f[0] : []; };
P.expandStr = async function (parts) { var f = await this.expandFields([{ p: parts }], true); return f.length ? f[0].map(function (x) { return x.s; }).join('') : ''; };

function braceExpand(parts) {
  for (var pi = 0; pi < parts.length; pi++) {
    var p = parts[pi]; if (p.k !== 'lit') continue;
    var s = p.s, st = s.indexOf('{');
    while (st >= 0) {
      var depth = 0, en = -1, commas = [];
      for (var j = st; j < s.length; j++) {
        if (s[j] === '{') depth++; else if (s[j] === '}') { depth--; if (depth === 0) { en = j; break; } } else if (s[j] === ',' && depth === 1) commas.push(j);
      }
      if (en > 0) {
        var inner = s.slice(st + 1, en), alts = null, m;
        if (commas.length) { alts = []; var last = st + 1; commas.forEach(function (c) { alts.push(s.slice(last, c)); last = c + 1; }); alts.push(s.slice(last, en)); }
        else if ((m = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(inner))) {
          var a = parseInt(m[1], 10), b = parseInt(m[2], 10), stp = Math.abs(parseInt(m[3] || '1', 10)) || 1, w = /^-?0\d/.test(m[1]) || /^-?0\d/.test(m[2]) ? Math.max(m[1].length, m[2].length) : 0;
          alts = []; if (a <= b) for (var x = a; x <= b; x += stp) alts.push(String(x)); else for (var y = a; y >= b; y -= stp) alts.push(String(y));
          if (w) alts = alts.map(function (z) { while (z.length < w) z = '0' + z; return z; });
        } else if ((m = /^([a-zA-Z])\.\.([a-zA-Z])$/.exec(inner))) {
          alts = []; var c1 = m[1].charCodeAt(0), c2 = m[2].charCodeAt(0);
          if (c1 <= c2) for (var q = c1; q <= c2; q++) alts.push(String.fromCharCode(q)); else for (var r = c1; r >= c2; r--) alts.push(String.fromCharCode(r));
        }
        if (alts) {
          var out = [];
          alts.forEach(function (alt) {
            var np = parts.slice(0, pi).concat([{ k: 'lit', s: s.slice(0, st) + alt + s.slice(en + 1) }], parts.slice(pi + 1));
            braceExpand(np).forEach(function (x) { out.push(x); });
          });
          return out;
        }
      }
      st = s.indexOf('{', st + 1);
    }
  }
  return [parts];
}

/* words: [{p: parts}] -> array of fields (each an array of {s,q}) ; noSplit => no splitting/globbing/braces */
P.expandFields = async function (words, noSplit) {
  var fields = [], self = this;
  for (var wi = 0; wi < words.length; wi++) {
    var variants = noSplit ? [words[wi].p] : braceExpand(words[wi].p);
    for (var vi = 0; vi < variants.length; vi++) {
      var parts = variants[vi], cur = null, started = false, tilde = null;
      if (!noSplit || true) {
        var f0 = parts[0];
        if (f0 && f0.k === 'lit' && f0.s[0] === '~') {
          var mm = /^~([A-Za-z_][\w-]*)?(\/|$)/.exec(f0.s);
          if (mm) { var who = mm[1], home = who ? (self.users[who] ? self.users[who].home : null) : (self.getVar('HOME') || '/'); if (home !== null && !(noSplit && words[wi].noTilde)) tilde = { home: home, len: 1 + (who ? who.length : 0) }; }
        }
      }
      var out = [];
      var add = function (s, q, split) {
        if (!split) { cur = cur || []; cur.push({ s: s, q: q }); return; }
        var pieces = s.split(/([ \t\n]+)/);
        for (var z = 0; z < pieces.length; z++) {
          var pc = pieces[z];
          if (pc === '') continue;
          if (/^[ \t\n]+$/.test(pc)) { if (cur) { out.push(cur); cur = null; } continue; }
          cur = cur || []; cur.push({ s: pc, q: false });
        }
      };
      var emitParts = async function (ps, quoted) {
        for (var pi = 0; pi < ps.length; pi++) {
          var p = ps[pi];
          if (p.k === 'lit') { var s = p.s; if (tilde && ps === parts && pi === 0) { add(tilde.home, true, false); s = s.slice(tilde.len); } if (s) add(s, false, false); }
          else if (p.k === 'q') add(p.s, true, false);
          else if (p.k === 'dq') {
            var onlyAt = p.p.length === 1 && p.p[0].k === 'var';
            var sub = await self.expandDq(p.p);
            if (sub.list) {
              if (!sub.list.length) { if (!onlyAt) add('', true, false); else { started = true; } continue; }
              sub.list.forEach(function (it, ix) { if (ix > 0) { out.push(cur); cur = null; } add(it, true, false); });
            } else add(sub.str, true, false);
          } else if (p.k === 'var') {
            var r = await self.expandParam(p, quoted);
            if (r.list) {
              if (r.join) { r.list.forEach(function (it, ix) { add(ix ? ' ' + it : it, false, true); }); }
              else r.list.forEach(function (it) { add(it, false, true); if (cur) { out.push(cur); cur = null; } });
            } else add(r.str, false, !quoted);
          } else if (p.k === 'cmd') { var cs = await self.cmdSubst(p.ast); add(cs, false, !quoted); }
          else if (p.k === 'psub') { var pbuf = '', psnap = self.snapshot(); try { await self.run(p.ast, { in: null, o: function (s) { pbuf += s; }, e: self.curErr || function () {} }); } catch (pe) { if (!(pe instanceof Ctl)) throw pe; } self.restore(psnap); self.psubN = (self.psubN || 0) + 1; var ppath = '/dev/fd/' + (60 + self.psubN); self.setFile(ppath, pbuf, 420, 'root', 'root', true); add(ppath, true, false); }
          else if (p.k === 'ar') { var av = self.arith(await self.expandStr(self.reparse(p.src))); add(String(av), false, !quoted); }
          else if (p.k === 'arr') { /* handled by assignment code */ }
        }
      };
      await emitParts(parts, false);
      if (cur) out.push(cur);
      if (!out.length && started) { /* "$@" with no args: nothing */ }
      out.forEach(function (fld) { fields.push(fld); });
    }
  }
  if (noSplit) {
    if (!fields.length) return [];
    /* join all pieces into one field */
    var all = []; fields.forEach(function (f, ix) { if (ix) all.push({ s: ' ', q: true }); f.forEach(function (x) { all.push(x); }); });
    return [all];
  }
  var res = [];
  for (var k = 0; k < fields.length; k++) {
    var f = fields[k];
    if (hasGlob(f)) { var g = this.glob(f); if (g.length) { g.forEach(function (x) { res.push([{ s: x, q: true }]); }); continue; } }
    res.push(f);
  }
  return res;
};
P.reparse = function (src) { return T.scanWord(src, 0, 'd').parts; };
P.expandDq = async function (parts) {
  var cur = '', list = null, self = this;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (p.k === 'lit' || p.k === 'q') cur += p.s;
    else if (p.k === 'var') {
      var r = await this.expandParam(p, true);
      if (r.list) {
        if (r.join || !(p.name === '@' || (p.idx && p.idx.length === 1 && p.idx[0].s === '@'))) cur += r.list.join(p.name === '*' ? (self.getVar('IFS') === undefined ? ' ' : (self.getVar('IFS')[0] || '')) : ' ');
        else { list = list || []; r.list.forEach(function (it, ix) { if (ix === 0) { cur += it; } else { list.push(cur); cur = it; } }); if (!r.list.length) { /* nothing */ } }
      } else cur += r.str;
    } else if (p.k === 'cmd') cur += await this.cmdSubst(p.ast);
    else if (p.k === 'ar') cur += String(this.arith(await this.expandStr(this.reparse(p.src))));
  }
  if (list) { list.push(cur); return { list: list }; }
  return { str: cur };
};
P.glob = function (pieces) {
  var self = this, text = pieces.map(function (p) { return p.s; }).join(''), abs = text[0] === '/';
  /* split pieces by '/' */
  var segs = [[]];
  pieces.forEach(function (pc) { var bits = pc.s.split('/'); bits.forEach(function (b, i) { if (i > 0) segs.push([]); if (b !== '') segs[segs.length - 1].push({ s: b, q: pc.q }); }); });
  var results = [abs ? '/' : ''];
  for (var i = 0; i < segs.length; i++) {
    var seg = segs[i], next = [];
    if (!seg.length) { if (i === 0) continue; results = results.map(function (r) { return r; }); continue; }
    var isG = hasGlob(seg);
    for (var j = 0; j < results.length; j++) {
      var base = results[j];
      if (!isG) { var lit = seg.map(function (s) { return s.s; }).join(''); var cand = base === '' ? lit : (base === '/' ? '/' + lit : base + '/' + lit); if (i < segs.length - 1 || self.exists(cand)) next.push(cand); continue; }
      var dir = base === '' ? '.' : base, names;
      try { names = self.listDir(dir); } catch (e) { continue; }
      var re = globToRe(seg), dot = seg[0].s[0] === '.' && !seg[0].q;
      names.forEach(function (nm) { if (nm[0] === '.' && !dot) return; if (re.test(nm)) next.push(base === '' ? nm : (base === '/' ? '/' + nm : base + '/' + nm)); });
    }
    results = next;
  }
  /* directories must have trailing slash if pattern ends with slash */
  if (text.slice(-1) === '/') results = results.filter(function (r) { try { return self.stat(r).t === 'd'; } catch (e) { return false; } }).map(function (r) { return r + '/'; });
  return results.sort();
};
P.expandWords = async function (words) {
  var f = await this.expandFields(words.map(function (w) { return { p: w }; }), false);
  return f.map(function (fl) { return fl.map(function (x) { return x.s; }).join(''); });
};

/* ---------------- test / [ ---------------- */
P.testExpr = function (a, dbl) {
  var self = this, i = 0;
  function fileTest(op, p) {
    var n; try { n = self.stat(p); } catch (e) { return false; }
    switch (op) { case '-e': return true; case '-f': return n.t === 'f'; case '-d': return n.t === 'd'; case '-s': return n.t === 'f' ? n.d.length > 0 : n.t === 'd';
      case '-r': return self.can(n, 4); case '-w': return self.can(n, 2); case '-x': return n.t === 'd' ? self.can(n, 1) : self.can(n, 1) && (n.m & 73) !== 0 || (self.eu === 'root' && (n.m & 73) !== 0); case '-L': try { return self.stat(p, false).t === 'l'; } catch (e) { return false; } default: return false; }
  }
  function prim() {
    var t = a[i];
    if (t === '(') { i++; var v = orE(); if (a[i] === ')') i++; return v; }
    if (t === '!') { i++; return !prim(); }
    if (i + 2 < a.length + 0 && a.length - i >= 3 && /^(=|==|!=|=~|-eq|-ne|-lt|-le|-gt|-ge|<|>)$/.test(a[i + 1])) {
      var l = a[i], op = a[i + 1], r = a[i + 2]; i += 3;
      switch (op) {
        case '=': case '==': if (dbl) return globToRe(r).test(l); return l === r;
        case '!=': if (dbl) return !globToRe(r).test(l); return l !== r;
        case '=~': try { var m = new RegExp(r).exec(l); if (m) { var bm = { arr: true, m: {} }; m.forEach(function (x, k) { bm.m[String(k)] = x === undefined ? '' : x; }); self.vars.BASH_REMATCH = bm; } return !!m; } catch (e) { return false; }
        case '<': return l < r; case '>': return l > r;
        default: var x = parseInt(l, 10), y = parseInt(r, 10); if (isNaN(x) || isNaN(y)) throw new T.SyntaxErr('integer expression expected');
          return op === '-eq' ? x === y : op === '-ne' ? x !== y : op === '-lt' ? x < y : op === '-le' ? x <= y : op === '-gt' ? x > y : x >= y;
      }
    }
    if (/^-[a-zA-Z]$/.test(t || '') && i + 1 < a.length) {
      var o = t, arg = a[i + 1]; i += 2;
      if (o === '-z') return arg === ''; if (o === '-n') return arg !== '';
      if (o === '-t') return false;
      return fileTest(o, arg);
    }
    i++; return t !== undefined && t !== '';
  }
  function andE() { var v = prim(); while (a[i] === '-a' || (dbl && a[i] === '&&')) { i++; var r = prim(); v = v && r; } return v; }
  function orE() { var v = andE(); while (a[i] === '-o' || (dbl && a[i] === '||')) { i++; var r = andE(); v = v || r; } return v; }
  if (!a.length) return false;
  if (a.length === 1) return a[0] !== '';
  return orE();
};

/* ---------------- running ---------------- */
P.step = function () { if (++this.steps > this.maxSteps) throw new Ctl('abort', 130); };
P.run = async function (n, io) {
  this.step();
  switch (n.k) {
    case 'list': return this.runList(n, io);
    case 'simple': return this.runSimple(n, io);
    case 'andor': return this.runAndOr(n, io);
    case 'pipe': return this.runPipe(n, io);
    case 'func': this.funcs[n.name] = n.body; this.status = 0; return 0;
    default: return this.runCompound(n, io);
  }
};
P.runList = async function (n, io) {
  var st = this.status;
  for (var i = 0; i < n.items.length; i++) { st = await this.run(n.items[i].node, io); this.status = st; }
  return st;
};
P.runAndOr = async function (n, io) {
  var parts = [{ op: null, node: n.first }].concat(n.rest), st = 0;
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i], last = i === parts.length - 1;
    if (p.op === '&&' && st !== 0) continue;
    if (p.op === '||' && st === 0) continue;
    if (!last) this.noerr++;
    try { st = await this.run(p.node, io); } finally { if (!last) this.noerr--; }
    this.status = st;
  }
  return st;
};
P.runPipe = async function (n, io) {
  var st = 0, input = io.in, stats = [];
  if (n.cmds.length === 1) { this.noerr++; try { st = await this.run(n.cmds[0], io); } finally { this.noerr--; } return st === 0 ? 1 : 0; }
  for (var i = 0; i < n.cmds.length; i++) {
    var last = i === n.cmds.length - 1, buf = '', snap = this.snapshot();
    var sio = { in: input, o: last ? io.o : function (s) { buf += s; }, e: io.e, isTerm: last && io.isTerm };
    try { st = await this.run(n.cmds[i], sio); } catch (e) { if (e instanceof Ctl && e.kind === 'exit') st = e.code; else throw e; }
    stats.push(st);
    var keep = this.status; this.restore(snap); this.status = keep;
    input = { data: buf, pos: 0 };
  }
  this.pipestatus = stats;
  if (this.sopt.pipefail) { for (var k = stats.length - 1; k >= 0; k--) if (stats[k] !== 0) { st = stats[k]; break; } }
  if (n.neg) st = st === 0 ? 1 : 0;
  if (st !== 0 && this.sopt.e && this.noerr === 0 && !n.neg) throw new Ctl('exit', st);
  return st;
};
P.withRedirs = async function (n, io, fn) {
  if (!n.redirs || !n.redirs.length) return fn(io);
  var sio = { in: io.in, o: io.o, e: io.e, isTerm: io.isTerm }, sinks = [], self = this, map = { 1: sio.o, 2: sio.e };
  function mk(abs, append) {
    if (abs === '/dev/null') return function () {};
    var rec = { abs: abs, buf: '', append: append }; sinks.push(rec); return function (s) { rec.buf += s; };
  }
  try {
    for (var i = 0; i < n.redirs.length; i++) {
      var r = n.redirs[i];
      if (r.op === '<<') { sio.in = { data: r.tok.quoted ? r.tok.body : await this.heredocBody(r.tok.body), pos: 0 }; continue; }
      var target = await this.expandStr(r.target);
      if (r.op === '<') { try { sio.in = { data: this.readFile(target), pos: 0 }; } catch (e) { if (e instanceof T.FsErr) { io.e('bash: ' + target + ': ' + e.msg + '\n'); return 1; } throw e; } }
      else if (r.op === '<<<') sio.in = { data: target + '\n', pos: 0 };
      else if (r.op === '>&') {
        if (/^\d+$/.test(target)) map[r.fd] = map[parseInt(target, 10)] || map[1];
        else { var f = mk(this.abs(target), false); if (!this.openOut(this.abs(target), false, io)) return 1; map[1] = f; map[2] = f; }
      } else {
        var abs = this.abs(target), app = r.op === '>>' || r.op === '&>>';
        if (!this.openOut(abs, app, io)) return 1;
        var w = mk(abs, true);
        if (r.op === '&>' || r.op === '&>>') { map[1] = w; map[2] = w; } else map[r.fd] = w;
      }
    }
    sio.o = map[1]; sio.e = map[2]; sio.isTerm = io.isTerm && map[1] === io.o;
    return await fn(sio);
  } finally {
    sinks.forEach(function (s) { try { self.writeFile(s.abs, s.buf, true); } catch (e) { if (e instanceof T.FsErr) io.e('bash: ' + s.abs + ': ' + e.msg + '\n'); } });
  }
};
P.openOut = function (abs, append, io) {
  try { if (!append || !this.exists(abs)) this.writeFile(abs, '', false); else { var nd = this.walk(abs, true); if (!this.can(nd, 2)) throw new T.FsErr('EACCES', abs); } return true; }
  catch (e) { if (e instanceof T.FsErr) { io.e('bash: ' + abs + ': ' + e.msg + '\n'); return false; } throw e; }
};
P.heredocBody = async function (body) {
  var out = '', parts = T.scanWord(body, 0, 'd').parts; /* mode d stops at a quote; handle by escaping */
  void parts;
  var safe = body.replace(/"/g, '\u0001'), ps = T.scanWord(safe, 0, 'd').parts;
  out = await this.expandStr(ps.map(function (p) { return p.k === 'lit' ? { k: 'lit', s: p.s.replace(/\u0001/g, '"') } : p.k === 'q' ? { k: 'q', s: p.s.replace(/\u0001/g, '"') } : p; }));
  return out;
};
P.runCompound = async function (n, io) {
  var self = this;
  return this.withRedirs(n, io, async function (rio) {
    var st = 0, i;
    switch (n.k) {
      case 'brace': return self.run(n.b, rio);
      case 'sub': {
        var snap = self.snapshot();
        try { st = await self.run(n.b, rio); } catch (e) { if (e instanceof Ctl && e.kind === 'exit') st = e.code; else { self.restore(snap); throw e; } }
        self.restore(snap); return st;
      }
      case 'if':
        for (i = 0; i < n.conds.length; i++) {
          self.noerr++; var cs; try { cs = await self.run(n.conds[i].c, rio); } finally { self.noerr--; }
          if (cs === 0) return self.run(n.conds[i].b, rio);
        }
        if (n.els) return self.run(n.els, rio);
        return 0;
      case 'while': {
        st = 0;
        for (;;) {
          self.noerr++; var c; try { c = await self.run(n.c, rio); } finally { self.noerr--; }
          if ((c === 0) === n.until) break;
          try { st = await self.run(n.b, rio); } catch (e) { if (e instanceof Ctl && (e.kind === 'break' || e.kind === 'continue')) { if (e.n > 1) { e.n--; throw e; } if (e.kind === 'break') break; continue; } throw e; }
        }
        return st;
      }
      case 'for': {
        var items = n.words ? await self.expandWords(n.words) : self.positional().slice();
        st = 0;
        for (i = 0; i < items.length; i++) {
          self.setVar(n.v, items[i]);
          try { st = await self.run(n.b, rio); } catch (e) { if (e instanceof Ctl && (e.kind === 'break' || e.kind === 'continue')) { if (e.n > 1) { e.n--; throw e; } if (e.kind === 'break') break; continue; } throw e; }
        }
        return st;
      }
      case 'cfor': {
        self.arith(n.init || '0'); st = 0;
        while ((n.cond.trim() ? self.arith(n.cond) : 1) !== 0) {
          try { st = await self.run(n.b, rio); } catch (e) { if (e instanceof Ctl && (e.kind === 'break' || e.kind === 'continue')) { if (e.n > 1) { e.n--; throw e; } if (e.kind === 'break') break; } else throw e; }
          if (n.step.trim()) self.arith(n.step);
          self.step();
        }
        return st;
      }
      case 'case': {
        var w = await self.expandStr(n.w);
        for (i = 0; i < n.items.length; i++) {
          for (var j = 0; j < n.items[i].pats.length; j++) {
            var pat = await self.expandPieces(n.items[i].pats[j]);
            if (globToRe(pat).test(w)) return self.run(n.items[i].b, rio);
          }
        }
        return 0;
      }
      case 'arith': { try { return self.arith(await self.expandStr(self.reparse(n.src))) !== 0 ? 0 : 1; } catch (e) { if (e instanceof T.SyntaxErr) { rio.e('bash: ((: ' + e.msg + '\n'); return 1; } throw e; } }
      case 'dbl': {
        var args = [];
        for (i = 0; i < n.words.length; i++) { var f = await self.expandFields([{ p: n.words[i] }], true); args.push(f.length ? f[0].map(function (x) { return x.s; }).join('') : ''); }
        try { return self.testExpr(args, true) ? 0 : 1; } catch (e) { if (e instanceof T.SyntaxErr) { rio.e('bash: [[: ' + e.msg + '\n'); return 2; } throw e; }
      }
      default: throw new Error('unknown node ' + n.k);
    }
  });
};

P.assignOne = async function (a) {
  var self = this, val;
  if (a.arr) {
    var items = await this.expandWords(a.arr), cur = this.rawVar(a.name);
    var arr = a.append && isArr(cur) ? cur : { arr: true, m: {} }, start = a.append ? this.arrKeys(arr).length : 0;
    items.forEach(function (it, ix) { arr.m[String(start + ix)] = it; });
    var sc = this.lookupScope(a.name); sc[a.name] = arr; return;
  }
  val = await this.expandStr(a.val);
  if (a.idx !== null) {
    var cur2 = this.rawVar(a.name), key;
    if (!isArr(cur2)) { cur2 = { arr: true, m: {} }; if (this.rawVar(a.name) !== undefined) cur2.m['0'] = this.rawVar(a.name); this.lookupScope(a.name)[a.name] = cur2; }
    key = cur2.assoc ? await this.expandStr(this.reparse(a.idx)) : String(this.arith(await this.expandStr(this.reparse(a.idx))));
    cur2.m[key] = a.append ? (cur2.m[key] || '') + val : val; return;
  }
  var old = this.rawVar(a.name);
  if (a.append) { if (/^\d+$/.test(val) && this.intVars && this.intVars[a.name]) val = String(Number(old || 0) + Number(val)); else if (isArr(old)) { old.m[String(this.arrKeys(old).length)] = val; return; } else val = (old === undefined ? '' : old) + val; }
  if (this.intVars && this.intVars[a.name]) val = String(this.arith(val));
  if (isArr(old)) { old.m['0'] = val; return; }
  this.setVar(a.name, val);
  void self;
};

P.runSimple = async function (n, io) {
  var self = this, st = 0;
  try {
    this.curErr = io.e;
    var declWords = null, first = n.words.length ? n.words[0] : null;
    var fname = first && first.length === 1 && first[0].k === 'lit' ? first[0].s : null;
    if (fname && /^(local|export|declare|typeset|readonly)$/.test(fname)) declWords = true;
    var words = [];
    if (n.words.length) {
      if (declWords) {
        words.push(fname);
        for (var wi = 1; wi < n.words.length; wi++) {
          var wp = n.words[wi];
          if (wp[0] && wp[0].k === 'lit' && /^[A-Za-z_]\w*\+?=/.test(wp[0].s)) words.push(await this.expandStr(wp));
          else { var ex = await this.expandWords([wp]); ex.forEach(function (x) { words.push(x); }); }
        }
      } else words = await this.expandWords(n.words);
    }
    var cmdStatusFromSubst = this.status;
    if (!words.length) {
      if (n.redirs && n.redirs.length) { var rs = await this.withRedirs(n, io, async function () { return 0; }); if (rs) return rs; }
      for (var ai = 0; ai < n.assigns.length; ai++) await this.assignOne(n.assigns[ai]);
      return cmdStatusFromSubst === undefined ? 0 : (n.assigns.length && n.assigns.some(function (a) { return a.val && a.val.some(function (p) { return p.k === 'cmd' || (p.k === 'dq' && p.p.some(function (q) { return q.k === 'cmd'; })); }); }) ? this.status : 0);
    }
    /* prefix assignments are temporary */
    var saved = [];
    for (var pi = 0; pi < n.assigns.length; pi++) {
      var a = n.assigns[pi]; saved.push({ name: a.name, had: Object.prototype.hasOwnProperty.call(this.env, a.name) ? this.env[a.name] : undefined, hv: Object.prototype.hasOwnProperty.call(this.vars, a.name) ? this.vars[a.name] : undefined });
      this.env[a.name] = await this.expandStr(a.val);
    }
    try {
      if (this.sopt.x) io.e('+ ' + words.join(' ') + '\n');
      st = await this.withRedirs(n, io, function (rio) { return self.exec(words, rio); });
    } finally {
      saved.forEach(function (s) { if (s.had === undefined) delete self.env[s.name]; else self.env[s.name] = s.had; });
    }
  } catch (e) {
    if (e instanceof T.SyntaxErr) { io.e('bash: ' + e.msg + '\n'); st = 1; if (e.fatal || /unbound variable/.test(e.msg)) { st = 1; if (this.sopt.u || e.fatal) throw new Ctl('exit', 1); } }
    else throw e;
  }
  this.status = st;
  if (st !== 0 && this.sopt.e && this.noerr === 0) throw new Ctl('exit', st);
  return st;
};

P.callFunc = async function (name, args, io) {
  if (this.frames.length > 80) { io.e('bash: ' + name + ': maximum function nesting level exceeded\n'); return 1; }
  this.frames.push({ locals: {}, args: args, name: name });
  try { return await this.run(this.funcs[name], io); }
  catch (e) { if (e instanceof Ctl && e.kind === 'return') return e.code; throw e; }
  finally { this.frames.pop(); }
};

/* command lookup: functions, builtins, then PATH */
P.findCommand = function (name) {
  var C = T.commands;
  if (name.indexOf('/') >= 0) return { path: this.abs(name) };
  var dirs = (this.getVar('PATH') || '').split(':');
  for (var i = 0; i < dirs.length; i++) {
    var d = dirs[i] || '.', p = this.abs(d + '/' + name), n = null;
    try { n = this.walk(p, true); } catch (e) { n = null; }
    if (n && n.t === 'f') return { path: p, node: n };
    if (C[name] && !C[name].builtin && C[name].dir === d) return { cmd: C[name], path: d + '/' + name };
  }
  return null;
};
P.exec = async function (words, io) {
  var name = words[0], args = words.slice(1), C = T.commands;
  if (this.funcs[name] && name.indexOf('/') < 0) return this.callFunc(name, args, io);
  if (C[name] && C[name].builtin) return C[name].fn.call(this, args, io, this);
  var f = this.findCommand(name);
  if (!f) {
    if (name.indexOf('/') < 0) { io.e('bash: ' + name + ': command not found\n'); return 127; }
    io.e('bash: ' + name + ': No such file or directory\n'); return 127;
  }
  if (f.cmd) { this.ranLog.push(words.join(' ')); return f.cmd.fn.call(this, args, io, this); }
  var node;
  try { node = this.walk(f.path, true); } catch (e) { io.e('bash: ' + name + ': ' + (e.msg || 'No such file or directory') + '\n'); return e.code === 'EACCES' ? 126 : 127; }
  if (node.t === 'd') { io.e('bash: ' + name + ': Is a directory\n'); return 126; }
  if (!this.can(node, 1) || (node.m & 73) === 0) { io.e('bash: ' + name + ': Permission denied\n'); return 126; }
  return this.runScript(node.d, args, io, f.path);
};
P.runScript = async function (text, args, io, name) {
  var ast;
  try { ast = T.parseScript(text.replace(/^#!.*\n/, '\n')); } catch (e) { if (e instanceof T.SyntaxErr) { io.e(name + ': ' + e.msg + '\n'); return 2; } throw e; }
  var snap = this.snapshot(); this.argv = args.slice(); this.arg0 = name; this.frames = []; this.sopt = { e: false, u: false, x: false, pipefail: false }; this.noerr = 0;
  var st = 0, exitTrap = null;
  try { st = await this.run(ast, io); } catch (e) { if (e instanceof Ctl && (e.kind === 'exit' || e.kind === 'return')) st = e.code; else { this.restore(snap); throw e; } }
  if (this.traps.EXIT) { exitTrap = this.traps.EXIT; delete this.traps.EXIT; try { this.status = st; await this.run(T.parseScript(exitTrap), io); } catch (e2) { if (!(e2 instanceof Ctl)) throw e2; } }
  this.restore(snap); return st;
};
P.runLine = async function (text, io) {
  var ast;
  try { ast = T.parseScript(text); } catch (e) { if (e instanceof T.SyntaxErr) { io.e('bash: ' + e.msg + '\n'); this.status = 2; return 2; } throw e; }
  var st = 0;
  try { st = await this.run(ast, io); } catch (e) { if (e instanceof Ctl) { st = e.code === undefined ? 0 : e.code; if (e.kind === 'abort') io.e('terminal: stopped after too many steps. A loop may never end.\n'); } else throw e; }
  if (this.traps.EXIT) { var tr = this.traps.EXIT; delete this.traps.EXIT; try { await this.run(T.parseScript(tr), io); } catch (e3) { if (!(e3 instanceof Ctl)) throw e3; } }
  this.status = st; return st;
};
/* public: run one line or script and collect the output */
P.exec1 = async function (text) {
  var chunks = [], io = { in: null, isTerm: !!this.opts.tty, o: function (s) { chunks.push({ fd: 1, s: s }); }, e: function (s) { chunks.push({ fd: 2, s: s }); } };
  this.steps = 0; this.history.push(text); this.tick();
  var code = await this.runLine(text, io);
  return { code: code, chunks: chunks, out: chunks.filter(function (c) { return c.fd === 1; }).map(function (c) { return c.s; }).join(''), err: chunks.filter(function (c) { return c.fd === 2; }).map(function (c) { return c.s; }).join(''), text: chunks.map(function (c) { return c.s; }).join('') };
};
if (typeof module === 'object' && module.exports) module.exports = T;
}());
