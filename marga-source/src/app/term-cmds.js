/* MARGA terminal engine, part 4: shell builtins and file commands. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-exec.js') : window.MargaTerm;
var C = T.commands;
function def(names, fn, o) { o = o || {}; String(names).split(' ').forEach(function (nm) { C[nm] = { fn: fn, builtin: !!o.builtin, dir: o.dir || '/usr/bin' }; }); }
T.def = def;
function readAll(inp) { if (!inp) return ''; var s = inp.data.slice(inp.pos); inp.pos = inp.data.length; return s; }
function readLine(inp) {
  if (!inp || inp.pos >= inp.data.length) return null;
  var e = inp.data.indexOf('\n', inp.pos), line;
  if (e < 0) { line = inp.data.slice(inp.pos); inp.pos = inp.data.length; } else { line = inp.data.slice(inp.pos, e); inp.pos = e + 1; }
  return line;
}
T.readAll = readAll; T.readLine = readLine;
function fsErr(io, who, what, e) { if (e instanceof T.FsErr) { io.e(who + ': ' + what + ': ' + e.msg + '\n'); return 1; } throw e; }
/* parse short options: returns {flags:{}, rest:[]} ; spec lists letters that take a value */
function opts(args, takesVal, longs) {
  var f = {}, rest = [], i = 0, end = false;
  for (; i < args.length; i++) {
    var a = args[i];
    if (end || a === '-' || a[0] !== '-' || a.length < 2) { rest.push(a); continue; }
    if (a === '--') { end = true; continue; }
    if (a.slice(0, 2) === '--') { var kv = a.slice(2).split('='); f[kv[0]] = kv.length > 1 ? kv.slice(1).join('=') : true; if (longs && longs[kv[0]] === 'v' && kv.length === 1) f[kv[0]] = args[++i]; continue; }
    for (var j = 1; j < a.length; j++) {
      var ch = a[j];
      if (takesVal && takesVal.indexOf(ch) >= 0) { f[ch] = a.slice(j + 1) || args[++i]; break; }
      f[ch] = true;
    }
  }
  return { f: f, rest: rest };
}
T.parseOpts = opts;
function pad(s, w, left) { s = String(s); while (s.length < w) s = left ? s + ' ' : ' ' + s; return s; }
T.pad = pad;
function fmtPrintf(fmt, args, once) {
  var ai = 0, out = '', again = true, used;
  function nextArg() { return args[ai++]; }
  do {
    used = ai;
    var s = '';
    for (var i = 0; i < fmt.length; i++) {
      var c = fmt[i];
      if (c === '\\') {
        var d = fmt[++i];
        if (d === 'n') s += '\n'; else if (d === 't') s += '\t'; else if (d === '\\') s += '\\'; else if (d === 'r') s += '\r'; else if (d === 'a') s += '\x07'; else if (d === '"') s += '"'; else if (d === 'e') s += '\x1b';
        else if (d === '0') { var oc = /^[0-7]{0,3}/.exec(fmt.slice(i + 1))[0]; s += String.fromCharCode(parseInt(oc || '0', 8)); i += oc.length; }
        else s += '\\' + (d || '');
        continue;
      }
      if (c !== '%') { s += c; continue; }
      if (fmt[i + 1] === '%') { s += '%'; i++; continue; }
      var m = /^%([-+ 0#]*)(\d+)?(?:\.(\d+))?([sdiufcxXobeEgG])/.exec(fmt.slice(i));
      if (!m) { s += '%'; continue; }
      i += m[0].length - 1;
      var fl = m[1], w = m[2] ? parseInt(m[2], 10) : 0, pr = m[3] !== undefined ? parseInt(m[3], 10) : null, cv = m[4], a = nextArg(), r;
      if (cv === 's') { r = a === undefined ? '' : String(a); if (pr !== null) r = r.slice(0, pr); }
      else if (cv === 'b') { r = (a === undefined ? '' : String(a)).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\'); }
      else if (cv === 'c') r = a === undefined ? '' : String(a)[0];
      else if (cv === 'd' || cv === 'i' || cv === 'u') { var nv = parseInt(a === undefined ? '0' : a, 10); if (isNaN(nv)) nv = 0; r = String(Math.abs(nv)); if (pr !== null) while (r.length < pr) r = '0' + r; r = (nv < 0 ? '-' : fl.indexOf('+') >= 0 ? '+' : fl.indexOf(' ') >= 0 ? ' ' : '') + r; }
      else if (cv === 'f') { var fv = parseFloat(a === undefined ? '0' : a); if (isNaN(fv)) fv = 0; r = fv.toFixed(pr === null ? 6 : pr); if (fl.indexOf('+') >= 0 && fv >= 0) r = '+' + r; }
      else if (cv === 'x' || cv === 'X') { r = (parseInt(a || '0', 10) >>> 0).toString(16); if (cv === 'X') r = r.toUpperCase(); }
      else if (cv === 'o') r = (parseInt(a || '0', 10) >>> 0).toString(8);
      else if (cv === 'e' || cv === 'E') r = parseFloat(a || '0').toExponential(pr === null ? 6 : pr).replace(/e([+-])(\d)$/, 'e$10$2');
      else r = String(parseFloat(a || '0'));
      if (r.length < w) { if (fl.indexOf('-') >= 0) r = pad(r, w, true); else if (fl.indexOf('0') >= 0 && cv !== 's') { var sg = /^[-+]/.test(r) ? r[0] : ''; r = sg + pad(r.slice(sg.length), w - sg.length).replace(/ /g, '0'); } else r = pad(r, w); }
      s += r;
    }
    out += s; again = !once && ai < args.length && ai > used;
  } while (again);
  return out;
}
T.fmtPrintf = fmtPrintf;

/* ---------------- builtins ---------------- */
def('echo', function (a, io) {
  var nl = true, esc = false, i = 0;
  while (i < a.length && /^-[neE]+$/.test(a[i])) { if (a[i].indexOf('n') >= 0) nl = false; if (a[i].indexOf('e') >= 0) esc = true; if (a[i].indexOf('E') >= 0) esc = false; i++; }
  var s = a.slice(i).join(' ');
  if (esc) { var stop = false; s = s.replace(/\\(n|t|\\|r|a|e|c|0[0-7]{0,3})/g, function (m, ch) { if (stop) return ''; if (ch === 'c') { stop = true; nl = false; return ''; } return ch === 'n' ? '\n' : ch === 't' ? '\t' : ch === '\\' ? '\\' : ch === 'r' ? '\r' : ch === 'a' ? '\x07' : ch === 'e' ? '\x1b' : String.fromCharCode(parseInt(ch.slice(1) || '0', 8)); }); }
  io.o(s + (nl ? '\n' : '')); return 0;
}, { builtin: true });
def('printf', function (a, io) { if (!a.length) { io.e('bash: printf: usage: printf [-v var] format [arguments]\n'); return 2; } var vn = null; if (a[0] === '-v') { vn = a[1]; a = a.slice(2); } var s = fmtPrintf(a[0], a.slice(1)); if (vn) this.setVar(vn, s); else io.o(s); return 0; }, { builtin: true });
def('pwd', function (a, io) { io.o(this.cwd + '\n'); return 0; }, { builtin: true });
def('cd', function (a, io) {
  var t = a[0] === undefined ? this.getVar('HOME') : a[0] === '-' ? (this.getVar('OLDPWD') || this.cwd) : a[0];
  if (t === undefined) { io.e('bash: cd: HOME not set\n'); return 1; }
  var abs = this.abs(t);
  try { var n = this.walk(abs, true); if (n.t !== 'd') { io.e('bash: cd: ' + t + ': Not a directory\n'); return 1; } if (!this.can(n, 1)) { io.e('bash: cd: ' + t + ': Permission denied\n'); return 1; } }
  catch (e) { if (e instanceof T.FsErr) { io.e('bash: cd: ' + t + ': ' + e.msg + '\n'); return 1; } throw e; }
  this.env.OLDPWD = this.cwd; this.cwd = abs; this.env.PWD = abs; return 0;
}, { builtin: true });
def('true :', function () { return 0; }, { builtin: true });
def('false', function () { return 1; }, { builtin: true });
def('exit', function (a) { throw new T.Ctl('exit', a.length ? parseInt(a[0], 10) & 255 : this.status); }, { builtin: true });
def('return', function (a) { throw new T.Ctl('return', a.length ? parseInt(a[0], 10) & 255 : this.status); }, { builtin: true });
def('break', function (a) { throw new T.Ctl('break', 0, a.length ? parseInt(a[0], 10) : 1); }, { builtin: true });
def('continue', function (a) { throw new T.Ctl('continue', 0, a.length ? parseInt(a[0], 10) : 1); }, { builtin: true });
def('shift', function (a) { var n = a.length ? parseInt(a[0], 10) : 1, p = this.positional(); if (n > p.length) return 1; p.splice(0, n); return 0; }, { builtin: true });
def('export', function (a, io) {
  var self = this;
  if (!a.length || a[0] === '-p') { Object.keys(this.env).sort().forEach(function (k) { io.o('declare -x ' + k + '="' + self.env[k] + '"\n'); }); return 0; }
  a.forEach(function (x) { if (x[0] === '-') return; var m = /^([A-Za-z_]\w*)(=([^]*))?$/.exec(x); if (!m) { io.e("bash: export: `" + x + "': not a valid identifier\n"); return; } if (m[2] !== undefined) self.env[m[1]] = m[3]; else if (self.vars[m[1]] !== undefined) self.env[m[1]] = self.vars[m[1]]; else if (self.env[m[1]] === undefined) self.env[m[1]] = ''; delete self.vars[m[1]]; });
  return 0;
}, { builtin: true });
def('unset', function (a) { var self = this; a.forEach(function (x) { if (x === '-v' || x === '-f') return; delete self.env[x]; self.lookupScope(x)[x] === undefined || delete self.lookupScope(x)[x]; delete self.funcs[x]; }); return 0; }, { builtin: true });
def('local declare typeset readonly', function (a, io) {
  var self = this, assoc = false, ints = false, arr = false, isLocal = false;
  a = a.filter(function (x) { if (/^-[A-Za-z]+$/.test(x)) { if (x.indexOf('A') >= 0) assoc = true; if (x.indexOf('i') >= 0) ints = true; if (x.indexOf('a') >= 0) arr = true; return false; } return true; });
  var top = this.frames.length ? this.frames[this.frames.length - 1].locals : null;
  void isLocal;
  a.forEach(function (x) {
    var m = /^([A-Za-z_]\w*)(?:=([^]*))?$/.exec(x);
    if (!m) { io.e("bash: declare: `" + x + "': not a valid identifier\n"); return; }
    var scope = top || self.vars;
    if (assoc) scope[m[1]] = { arr: true, assoc: true, m: {} };
    else if (arr) scope[m[1]] = { arr: true, m: {} };
    else if (m[2] !== undefined) scope[m[1]] = ints ? String(self.arith(m[2])) : m[2];
    else if (!Object.prototype.hasOwnProperty.call(scope, m[1])) scope[m[1]] = '';
    if (ints) { self.intVars = self.intVars || {}; self.intVars[m[1]] = true; }
  });
  return 0;
}, { builtin: true });
def('set', function (a, io) {
  var i = 0, self = this;
  if (!a.length) { Object.keys(this.vars).sort().forEach(function (k) { if (typeof self.vars[k] === 'string') io.o(k + '=' + self.vars[k] + '\n'); }); return 0; }
  while (i < a.length) {
    var x = a[i];
    if (x === '--') { this.positional().splice(0, this.positional().length); a.slice(i + 1).forEach(function (v) { self.positional().push(v); }); break; }
    if (x === '-o' || x === '+o') { var on = x === '-o', nm = a[++i]; if (nm === 'pipefail') this.sopt.pipefail = on; else if (nm === 'errexit') this.sopt.e = on; else if (nm === 'nounset') this.sopt.u = on; else if (nm === 'xtrace') this.sopt.x = on; i++; continue; }
    if (/^[-+][euxo]+$/.test(x)) { var on2 = x[0] === '-'; for (var j = 1; j < x.length; j++) { if (x[j] === 'e') this.sopt.e = on2; if (x[j] === 'u') this.sopt.u = on2; if (x[j] === 'x') this.sopt.x = on2; } i++; continue; }
    this.positional().splice(0, this.positional().length); a.slice(i).forEach(function (v) { self.positional().push(v); }); break;
  }
  return 0;
}, { builtin: true });
def('read', function (a, io) {
  var raw = false, names = [], delimN = null, prompt = null, i;
  for (i = 0; i < a.length; i++) { if (a[i] === '-r') raw = true; else if (a[i] === '-p') { prompt = a[++i]; } else if (a[i] === '-n') { delimN = parseInt(a[++i], 10); } else if (/^-[a-z]+$/.test(a[i])) { /* ignore -s etc */ } else names.push(a[i]); }
  void prompt; void delimN;
  var line = readLine(io.in);
  if (line === null) return 1;
  if (!raw) line = line.replace(/\\(.)/g, '$1');
  if (!names.length) names = ['REPLY'];
  var ifs = this.getVar('IFS'); var re = ifs === undefined ? /[ \t]+/ : new RegExp('[' + ifs.replace(/[\]\\^-]/g, '\\$&') + ']+');
  var parts = line.replace(/^[ \t]+/, '').split(re);
  for (i = 0; i < names.length; i++) {
    if (i === names.length - 1 && names.length > 0) { var rest = line.replace(/^[ \t]+/, ''); for (var k = 0; k < i; k++) { var mm = re.exec(rest); rest = mm ? rest.slice(mm.index + mm[0].length) : ''; } this.setVar(names[i], names.length === 1 ? (names[0] === 'REPLY' ? line : rest.replace(/[ \t]+$/, '')) : rest.replace(/[ \t]+$/, '')); }
    else this.setVar(names[i], i < parts.length ? parts[i] : '');
  }
  return 0;
}, { builtin: true });
def('test [', function (a, io) {
  if (a.length && a[a.length - 1] === ']') a = a.slice(0, -1);
  try { return this.testExpr(a, false) ? 0 : 1; } catch (e) { if (e instanceof T.SyntaxErr) { io.e('bash: [: ' + e.msg + '\n'); return 2; } throw e; }
}, { builtin: true });
def('eval', async function (a, io) { return this.runLine(a.join(' '), io); }, { builtin: true });
def('source .', async function (a, io) {
  if (!a.length) { io.e('bash: source: filename argument required\n'); return 2; }
  var txt; try { txt = this.readFile(a[0]); } catch (e) { return fsErr(io, 'bash', a[0], e); }
  var ast; try { ast = T.parseScript(txt); } catch (e) { if (e instanceof T.SyntaxErr) { io.e(a[0] + ': ' + e.msg + '\n'); return 2; } throw e; }
  if (a.length > 1) { var old = this.argv; this.argv = a.slice(1); try { return await this.run(ast, io); } finally { this.argv = old; } }
  return this.run(ast, io);
}, { builtin: true });
def('let', function (a, io) { var v = 0; try { for (var i = 0; i < a.length; i++) v = this.arith(a[i]); } catch (e) { if (e instanceof T.SyntaxErr) { io.e('bash: let: ' + e.msg + '\n'); return 1; } throw e; } return v === 0 ? 1 : 0; }, { builtin: true });
def('trap', function (a) { if (a.length >= 2 && /^(EXIT|0)$/.test(a[a.length - 1])) this.traps.EXIT = a[0]; return 0; }, { builtin: true });
def('wait umask hash ulimit bg fg disown', function () { return 0; }, { builtin: true });
def('type command', function (a, io) {
  var rc = 0, self = this, v = false;
  if (a[0] === '-v' || a[0] === '-V') { a = a.slice(1); v = true; }
  a.forEach(function (n) {
    if (self.funcs[n]) { io.o(n + ' is a function\n'); return; }
    if (C[n] && C[n].builtin) { io.o(v ? n + '\n' : n + ' is a shell builtin\n'); return; }
    var f = self.findCommand(n);
    if (f) io.o(v ? f.path + '\n' : n + ' is ' + f.path + '\n'); else { if (!v) io.e('bash: type: ' + n + ': not found\n'); rc = 1; }
  });
  return rc;
}, { builtin: true });
def('which', function (a, io) { var rc = 0, self = this; a.forEach(function (n) { var f = self.findCommand(n); if (f && !(C[n] && C[n].builtin)) io.o(f.path + '\n'); else rc = 1; }); return rc; });
def('alias unalias history', function () { return 0; }, { builtin: true });
def('clear', function (a, io) { io.o('\x1b[2J\x1b[H'); return 0; });
def('help', function (a, io) {
  var names = Object.keys(C).sort();
  io.o('This is a simulated shell written for MARGA. It supports a subset of Linux commands.\nCommands available here:\n' + names.join('  ') + '\n\nTip: type a command with --help only on a real system. Here, use the lab instructions and hints.\n'); return 0;
}, { builtin: true });

/* ---------------- file commands ---------------- */
function modeStr(n) {
  var t = n.t === 'd' ? 'd' : n.t === 'l' ? 'l' : '-', m = n.m, s = t, i, sp = [[256, 'r'], [128, 'w'], [64, 'x'], [32, 'r'], [16, 'w'], [8, 'x'], [4, 'r'], [2, 'w'], [1, 'x']];
  for (i = 0; i < 9; i++) s += (m & sp[i][0]) ? sp[i][1] : '-';
  var arr = s.split('');
  if (m & 2048) arr[3] = arr[3] === 'x' ? 's' : 'S'; if (m & 1024) arr[6] = arr[6] === 'x' ? 's' : 'S'; if (m & 512) arr[9] = arr[9] === 'x' ? 't' : 'T';
  return arr.join('');
}
T.modeStr = modeStr;
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtTime(ms) { var d = new Date(ms || 0); return MON[d.getUTCMonth()] + ' ' + pad(d.getUTCDate(), 2) + ' ' + pad(d.getUTCHours(), 2).replace(' ', '0') + ':' + pad(d.getUTCMinutes(), 2).replace(' ', '0'); }
T.fmtTime = fmtTime;
function size(n) { if (n.sz !== undefined) return n.sz; return n.t === 'f' ? n.d.length : n.t === 'l' ? n.d.length : 4096; }
function human(b) { if (b < 1024) return String(b); var u = ['K', 'M', 'G', 'T'], i = -1; do { b /= 1024; i++; } while (b >= 1024 && i < 3); return (b < 10 ? (Math.ceil(b * 10) / 10).toFixed(1) : String(Math.ceil(b))) + u[i]; }
T.human = human; T.sizeOf = size;
def('ls', function (a, io) {
  var o = opts(a), f = o.f, self = this, rc = 0, targets = o.rest.length ? o.rest : ['.'];
  function entry(name, n) {
    if (!f.l) return name + (f.F && n.t === 'd' ? '/' : '');
    var sz = f.h ? human(size(n)) : String(size(n));
    return modeStr(n) + ' ' + (n.t === 'd' ? 2 : 1) + ' ' + n.o + ' ' + n.g + ' ' + pad(sz, 5) + ' ' + fmtTime(n.mt) + ' ' + name + (n.t === 'l' ? ' -> ' + n.d : '');
  }
  function list(dirp, label) {
    var names;
    try { names = self.listDir(dirp); } catch (e) { rc = 2; io.e('ls: cannot open directory \'' + label + '\': ' + e.msg + '\n'); return; }
    var base = self.abs(dirp), items = [];
    if (f.a) { items.push(['.', self.walk(base, true, true)]); items.push(['..', self.walk(T.dirname(base), true, true)]); }
    names.forEach(function (nm) { if (nm[0] === '.' && !f.a && !f.A) return; items.push([nm, self.walk(base + '/' + nm, false, true)]); });
    if (f.t) items.sort(function (x, y) { return y[1].mt - x[1].mt; });
    if (f.S) items.sort(function (x, y) { return size(y[1]) - size(x[1]); });
    if (f.r) items.reverse();
    if (f.l) io.o('total ' + Math.ceil(items.reduce(function (s, x) { return s + (x[1].t === 'd' ? 4096 : Math.ceil(size(x[1]) / 4096) * 4096); }, 0) / 1024) + '\n');
    var lines = items.map(function (x) { return entry(x[0], x[1]); });
    io.o(lines.length ? (f.l || f['1'] || !io.isTerm ? lines.join('\n') : lines.join('  ')) + '\n' : '');
    if (f.R) items.forEach(function (x) { if (x[1].t === 'd' && x[0] !== '.' && x[0] !== '..') { io.o('\n' + (label === '.' ? './' : label + '/') + x[0] + ':\n'); list(base + '/' + x[0], (label === '.' ? '.' : label) + '/' + x[0]); } });
  }
  var files = [], dirs = [];
  targets.forEach(function (t) {
    var n; try { n = self.stat(t, !f.d); } catch (e) { rc = 2; io.e('ls: cannot access \'' + t + '\': ' + e.msg + '\n'); return; }
    if (n.t === 'd' && !f.d) dirs.push(t); else files.push([t, n]);
  });
  files.forEach(function (x) { io.o(entry(x[0], x[1]) + '\n'); });
  dirs.forEach(function (d, i) { if (files.length || dirs.length > 1) { if (i > 0 || files.length) io.o('\n'); io.o(d + ':\n'); } list(d, d); });
  return rc;
});
def('cat', function (a, io) {
  var o = opts(a), rc = 0, self = this, num = o.f.n, ln = 1, out = '';
  var list = o.rest.length ? o.rest : ['-'];
  list.forEach(function (p) {
    var txt;
    if (p === '-') txt = readAll(io.in); else { try { txt = self.readFile(p); } catch (e) { rc = 1; io.e('cat: ' + p + ': ' + (e.msg || 'error') + '\n'); return; } }
    if (num) { var ls = txt.split('\n'); if (ls[ls.length - 1] === '') ls.pop(); txt = ls.map(function (l) { return pad(ln++, 6) + '\t' + l; }).join('\n') + '\n'; }
    out += txt;
  });
  io.o(out); return rc;
});
def('touch', function (a, io) {
  var self = this, rc = 0;
  opts(a).rest.forEach(function (p) {
    try { if (self.exists(p)) self.stat(p).mt = self.clock; else self.writeFile(p, '', false); } catch (e) { if (e instanceof T.FsErr) { io.e('touch: cannot touch \'' + p + '\': ' + e.msg + '\n'); rc = 1; } else throw e; }
  }); return rc;
});
def('mkdir', function (a, io) {
  var o = opts(a, ['m']), self = this, rc = 0;
  if (!o.rest.length) { io.e('mkdir: missing operand\n'); return 1; }
  o.rest.forEach(function (p) {
    try { self.mkdir(p, !!o.f.p); if (o.f.m) self.stat(p).m = parseInt(o.f.m, 8); }
    catch (e) { if (e instanceof T.FsErr) { io.e('mkdir: cannot create directory \'' + p + '\': ' + e.msg + '\n'); rc = 1; } else throw e; }
  }); return rc;
});
def('rmdir', function (a, io) {
  var self = this, rc = 0;
  opts(a).rest.forEach(function (p) { try { var n = self.stat(p, false); if (n.t !== 'd') throw new T.FsErr('ENOTDIR', p); if (Object.keys(n.c).length) throw new T.FsErr('ENOTEMPTY', p); self.remove(p, true); } catch (e) { if (e instanceof T.FsErr) { io.e('rmdir: failed to remove \'' + p + '\': ' + e.msg + '\n'); rc = 1; } else throw e; } });
  return rc;
});
def('rm', function (a, io) {
  var o = opts(a), self = this, rc = 0, rec = o.f.r || o.f.R || o.f.recursive;
  if (!o.rest.length && !o.f.f) { io.e('rm: missing operand\n'); return 1; }
  o.rest.forEach(function (p) {
    var abs = self.abs(p);
    if (abs === '/') { io.e("rm: it is dangerous to operate recursively on '/'\n"); rc = 1; return; }
    try {
      var n = self.stat(p, false);
      if (n.t === 'd' && !rec) { io.e('rm: cannot remove \'' + p + '\': Is a directory\n'); rc = 1; return; }
      self.remove(p, true);
    } catch (e) { if (e instanceof T.FsErr) { if (!(o.f.f && e.code === 'ENOENT')) { io.e('rm: cannot remove \'' + p + '\': ' + e.msg + '\n'); rc = 1; } } else throw e; }
  }); return rc;
});
function copyNode(n) { return JSON.parse(JSON.stringify(n)); }
function cpmv(isMove) {
  return function (a, io) {
    var o = opts(a), self = this, name = isMove ? 'mv' : 'cp', rec = o.f.r || o.f.R || o.f.a, rest = o.rest;
    if (rest.length < 2) { io.e(name + ': missing file operand\n'); return 1; }
    var dst = rest[rest.length - 1], srcs = rest.slice(0, -1), dn = null, rc = 0;
    try { dn = self.stat(dst); } catch (e) { dn = null; }
    if (srcs.length > 1 && !(dn && dn.t === 'd')) { io.e(name + ': target \'' + dst + '\' is not a directory\n'); return 1; }
    srcs.forEach(function (s) {
      try {
        var sn = self.stat(s, false), target = dn && dn.t === 'd' ? self.abs(dst) + '/' + T.basename(self.abs(s)) : self.abs(dst);
        if (sn.t === 'd' && !rec && !isMove) { io.e('cp: -r not specified; omitting directory \'' + s + '\'\n'); rc = 1; return; }
        if (self.abs(s) === target) { io.e(name + ': \'' + s + '\' and \'' + dst + '\' are the same file\n'); rc = 1; return; }
        if (!isMove && sn.t === 'f' && !self.can(sn, 4)) throw new T.FsErr('EACCES', s);
        var par = self.walk(T.dirname(target), true);
        if (!self.can(par, 2) || !self.can(par, 1)) throw new T.FsErr('EACCES', target);
        var copy = copyNode(sn);
        if (isMove) { var sp = self.walk(T.dirname(self.abs(s)), true); if (!self.can(sp, 2)) throw new T.FsErr('EACCES', s); delete sp.c[T.basename(self.abs(s))]; }
        else { copy.o = self.eu; copy.g = self.users[self.eu].group; if (!o.f.p && !o.f.a) { copy.m = sn.m & 511; } copy.mt = self.clock; }
        par.c[T.basename(target)] = copy;
      } catch (e) { if (e instanceof T.FsErr) { io.e(name + ': cannot ' + (e.code === 'ENOENT' ? 'stat' : isMove ? 'move' : 'create regular file') + ' \'' + s + '\': ' + e.msg + '\n'); rc = 1; } else throw e; }
    }); return rc;
  };
}
def('cp', cpmv(false)); def('mv', cpmv(true));
def('ln', function (a, io) {
  var o = opts(a), self = this;
  if (o.rest.length < 2) { io.e('ln: missing file operand\n'); return 1; }
  try {
    var tgt = self.abs(o.rest[1]), par = self.walk(T.dirname(tgt), true);
    var direct = par.c && par.c[T.basename(tgt)];
    if (direct && direct.t === 'l' && o.f.n) { if (!o.f.f) throw new T.FsErr('EEXIST', tgt); delete par.c[T.basename(tgt)]; }
    else try { var ex = self.stat(o.rest[1]); if (ex.t === 'd') { tgt = tgt + '/' + T.basename(o.rest[0]); par = ex; if (o.f.f && par.c[T.basename(tgt)] && par.c[T.basename(tgt)].t !== 'd') delete par.c[T.basename(tgt)]; } else if (o.f.f) delete par.c[T.basename(tgt)]; else throw new T.FsErr('EEXIST', tgt); } catch (e) { if (e.code === 'EEXIST') throw e; }
    if (!self.can(par, 2)) throw new T.FsErr('EACCES', tgt);
    if (o.f.s) par.c[T.basename(tgt)] = { t: 'l', m: 511, o: self.eu, g: self.users[self.eu].group, d: o.rest[0], mt: self.clock };
    else { var src = self.stat(o.rest[0]); par.c[T.basename(tgt)] = src; }
  } catch (e) { return fsErr(io, 'ln', 'failed to create link \'' + o.rest[1] + '\'', e); }
  return 0;
});
function parseMode(spec, cur, isDir) {
  if (/^[0-7]{1,4}$/.test(spec)) return parseInt(spec, 8);
  var m = cur, parts = spec.split(','), ok = true;
  parts.forEach(function (p) {
    var mm = /^([ugoa]*)([-+=])([rwxXst]*)$/.exec(p);
    if (!mm) { ok = false; return; }
    var who = mm[1] || 'a', bits = 0, w = 0;
    mm[3].split('').forEach(function (c) { if (c === 'r') bits |= 4; if (c === 'w') bits |= 2; if (c === 'x') bits |= 1; if (c === 'X' && (isDir || (cur & 73))) bits |= 1; });
    var mask = 0;
    if (who.indexOf('a') >= 0 || who.indexOf('u') >= 0) mask |= bits << 6; if (who.indexOf('a') >= 0 || who.indexOf('g') >= 0) mask |= bits << 3; if (who.indexOf('a') >= 0 || who.indexOf('o') >= 0) mask |= bits;
    if (mm[3].indexOf('s') >= 0) { if (who.indexOf('u') >= 0 || who.indexOf('a') >= 0) w |= 2048; if (who.indexOf('g') >= 0 || who.indexOf('a') >= 0) w |= 1024; }
    if (mm[3].indexOf('t') >= 0) w |= 512;
    var all = who.indexOf('a') >= 0 ? 511 : ((who.indexOf('u') >= 0 ? 448 : 0) | (who.indexOf('g') >= 0 ? 56 : 0) | (who.indexOf('o') >= 0 ? 7 : 0));
    if (mm[2] === '+') m |= mask | w; else if (mm[2] === '-') m &= ~(mask | w); else m = (m & ~all) | mask | w;
  });
  return ok ? m : null;
}
def('chmod', function (a, io) {
  var o = opts(a.filter(function (x) { return !/^-[rwxXst]/.test(x) || /^-R/.test(x); })), self = this, rc = 0;
  var rec = o.f.R;
  a.forEach(function (x) { if (/^-[rwxst]+$/.test(x) && o.rest.indexOf(x) < 0) o.rest.unshift(x); });
  if (o.rest.length < 2) { io.e('chmod: missing operand\n'); return 1; }
  var spec = o.rest[0];
  function apply(p) {
    var n = self.stat(p, true);
    if (self.eu !== 'root' && n.o !== self.eu) throw new T.FsErr('EPERM', p);
    var nm = parseMode(spec, n.m, n.t === 'd');
    if (nm === null) { io.e('chmod: invalid mode: \'' + spec + '\'\n'); rc = 1; return false; }
    n.m = nm;
    if (rec && n.t === 'd') Object.keys(n.c).forEach(function (k) { apply(self.abs(p) + '/' + k); });
    return true;
  }
  o.rest.slice(1).forEach(function (p) { try { if (!apply(p) && rc) return; } catch (e) { if (e instanceof T.FsErr) { io.e('chmod: changing permissions of \'' + p + '\': ' + (e.code === 'ENOENT' ? 'No such file or directory' : e.msg) + '\n'); rc = 1; } else throw e; } });
  return rc;
});
function chownImpl(isGrp) {
  return function (a, io) {
    var o = opts(a), self = this, rc = 0;
    if (o.rest.length < 2) { io.e((isGrp ? 'chgrp' : 'chown') + ': missing operand\n'); return 1; }
    var spec = o.rest[0], user = null, grp = null;
    if (isGrp) grp = spec; else { var sp = spec.split(/[:.]/); user = sp[0] || null; grp = sp.length > 1 ? sp[1] || null : null; }
    if (user && !this.users[user]) { io.e('chown: invalid user: \'' + spec + '\'\n'); return 1; }
    if (grp && !this.groups[grp]) { io.e((isGrp ? 'chgrp: invalid group: \'' : 'chown: invalid group: \'') + spec + '\'\n'); return 1; }
    function apply(p) {
      var n = self.stat(p, true);
      if (self.eu !== 'root' && (user || n.o !== self.eu)) throw new T.FsErr('EPERM', p);
      if (user) n.o = user; if (grp) n.g = grp;
      if (o.f.R && n.t === 'd') Object.keys(n.c).forEach(function (k) { apply(self.abs(p) + '/' + k); });
    }
    o.rest.slice(1).forEach(function (p) { try { apply(p); } catch (e) { if (e instanceof T.FsErr) { io.e((isGrp ? 'chgrp' : 'chown') + ': changing ownership of \'' + p + '\': ' + e.msg + '\n'); rc = 1; } else throw e; } });
    return rc;
  };
}
def('chown', chownImpl(false), { dir: '/usr/bin' }); def('chgrp', chownImpl(true));
def('stat', function (a, io) {
  var self = this, rc = 0, o = opts(a, ['c']);
  o.rest.forEach(function (p) {
    try {
      var n = self.stat(p, false);
      if (o.f.c) { io.o(o.f.c.replace(/%a/g, (n.m & 4095).toString(8)).replace(/%U/g, n.o).replace(/%G/g, n.g).replace(/%s/g, String(size(n))).replace(/%n/g, p).replace(/%A/g, modeStr(n)).replace(/%F/g, n.t === 'd' ? 'directory' : n.t === 'l' ? 'symbolic link' : 'regular file') + '\n'); return; }
      io.o('  File: ' + p + '\n  Size: ' + size(n) + '\n  Access: (' + pad((n.m & 4095).toString(8), 4).replace(/ /g, '0') + '/' + modeStr(n) + ')  Uid: ' + n.o + '  Gid: ' + n.g + '\n');
    } catch (e) { if (e instanceof T.FsErr) { io.e('stat: cannot statx \'' + p + '\': ' + e.msg + '\n'); rc = 1; } else throw e; }
  }); return rc;
});
def('basename', function (a, io) { var p = (a[0] || '').replace(/\/+$/, ''); var b = p.slice(p.lastIndexOf('/') + 1) || (p ? '/' : ''); if (a[1] && b.slice(-a[1].length) === a[1] && b !== a[1]) b = b.slice(0, -a[1].length); io.o(b + '\n'); return 0; });
def('dirname', function (a, io) { (a.length ? a : ['']).forEach(function (p) { p = p.replace(/\/+$/, ''); var i = p.lastIndexOf('/'); io.o((i < 0 ? '.' : i === 0 ? '/' : p.slice(0, i)) + '\n'); }); return 0; });
def('realpath', function (a, io) { var self = this, rc = 0; opts(a).rest.forEach(function (p) { try { io.o(self.abs(p) + '\n'); } catch (e) { rc = 1; } }); return rc; });
def('readlink', function (a, io) {
  var self = this, rc = 0, o = opts(a);
  o.rest.forEach(function (p) {
    try {
      if (o.f.f || o.f.e || o.f.m) { io.o(self.abs(p) + '\n'); return; }
      var n = self.stat(p, false); if (n.t === 'l') io.o(n.d + '\n'); else rc = 1;
    } catch (e) { rc = 1; }
  });
  return rc;
});
def('truncate', function (a, io) {
  var o = opts(a, ['s']), self = this, rc = 0, sz = parseInt(o.f.s || '0', 10);
  o.rest.forEach(function (p) { try { var cur = self.exists(p) ? self.readFile(p) : ''; self.writeFile(p, sz === 0 ? '' : cur.slice(0, sz), false); } catch (e) { if (e instanceof T.FsErr) { io.e('truncate: cannot open \'' + p + '\' for writing: ' + e.msg + '\n'); rc = 1; } else throw e; } });
  return rc;
});
def('tee', function (a, io) {
  var o = opts(a), txt = readAll(io.in), self = this, rc = 0;
  io.o(txt);
  o.rest.forEach(function (p) { try { self.writeFile(p, txt, !!o.f.a); } catch (e) { if (e instanceof T.FsErr) { io.e('tee: ' + p + ': ' + e.msg + '\n'); rc = 1; } else throw e; } });
  return rc;
});
def('find', async function (a, io) {
  var self = this, paths = [], i = 0, rc = 0;
  while (i < a.length && a[i][0] !== '-' && a[i] !== '!' && a[i] !== '(') paths.push(a[i++]);
  if (!paths.length) paths = ['.'];
  var exprs = a.slice(i), maxd = Infinity, mind = 0, tests = [], actions = [];
  for (var j = 0; j < exprs.length; j++) {
    var e = exprs[j], neg = false;
    if (e === '!' || e === '-not') { neg = true; e = exprs[++j]; }
    var t = null;
    switch (e) {
      case '-maxdepth': maxd = parseInt(exprs[++j], 10); continue;
      case '-mindepth': mind = parseInt(exprs[++j], 10); continue;
      case '-name': case '-iname': var re = T.globToRe(exprs[++j], e === '-iname' ? 'i' : ''); t = function (p, n) { return re.test(T.basename(p) || p); }; break;
      case '-type': var ty = exprs[++j]; t = function (p, n) { return n.t === ty; }; break;
      case '-user': var us = exprs[++j]; t = function (p, n) { return n.o === us; }; break;
      case '-group': var gs = exprs[++j]; t = function (p, n) { return n.g === gs; }; break;
      case '-empty': t = function (p, n) { return n.t === 'f' ? n.d.length === 0 : n.t === 'd' && !Object.keys(n.c).length; }; break;
      case '-perm': var pm = exprs[++j]; t = (function (pm) { var slash = pm[0] === '/' || pm[0] === '-', val = parseInt(pm.replace(/^[-\/]/, ''), 8); return function (p, n) { var m = n.m & 4095; if (pm[0] === '-') return (m & val) === val; if (pm[0] === '/') return (m & val) !== 0; return m === val; }; void slash; })(pm); break;
      case '-size': var sz = exprs[++j]; t = (function (sz) { var m = /^([+-]?)(\d+)([cKMG]?)$/.exec(sz) || ['', '', '0', '']; var mult = { '': 512, c: 1, K: 1024, M: 1048576, G: 1073741824 }[m[3]], v = parseInt(m[2], 10); return function (p, n) { var b = size(n), u = Math.ceil(b / mult); return m[1] === '+' ? u > v : m[1] === '-' ? u < v : u === v; }; })(sz); break;
      case '-mmin': case '-mtime': var mv = exprs[++j], unit = e === '-mmin' ? 60000 : 86400000; t = (function (mv, unit) { var m = /^([+-]?)(\d+)$/.exec(mv); var v = parseInt(m[2], 10); return function (p, n) { var age = Math.floor((self.clock - n.mt) / unit); return m[1] === '+' ? age > v : m[1] === '-' ? age < v : age === v; }; })(mv, unit); break;
      case '-print': actions.push({ k: 'print' }); continue;
      case '-delete': actions.push({ k: 'delete' }); continue;
      case '-exec': var cmd = []; j++; while (j < exprs.length && exprs[j] !== ';' && exprs[j] !== '+') cmd.push(exprs[j++]); actions.push({ k: 'exec', cmd: cmd, plus: exprs[j] === '+' }); continue;
      case '-a': case '-and': continue;
      default: io.e('find: unknown predicate `' + e + "'\n"); return 1;
    }
    tests.push(neg ? (function (f) { return function (p, n) { return !f(p, n); }; })(t) : t);
  }
  var found = [];
  function visit(p, n, depth, disp) {
    if (depth >= mind && tests.every(function (f) { return f(disp, n); })) found.push({ p: disp, n: n, abs: p });
    if (n.t === 'd' && depth < maxd) { var names; try { names = self.listDir(p); } catch (er) { io.e('find: \'' + disp + '\': ' + er.msg + '\n'); rc = 1; return; } names.forEach(function (k) { visit((p === '/' ? '' : p) + '/' + k, self.walk((p === '/' ? '' : p) + '/' + k, false, true), depth + 1, disp + (disp.slice(-1) === '/' ? '' : '/') + k); }); }
  }
  paths.forEach(function (p) { try { var n = self.stat(p, false); visit(self.abs(p), n, 0, p); } catch (er) { if (er instanceof T.FsErr) { io.e('find: \'' + p + '\': ' + er.msg + '\n'); rc = 1; } else throw er; } });
  if (!actions.length) actions.push({ k: 'print' });
  for (var f = 0; f < found.length; f++) {
    for (var ai = 0; ai < actions.length; ai++) {
      var ac = actions[ai];
      if (ac.k === 'print') io.o(found[f].p + '\n');
      else if (ac.k === 'delete') { try { self.remove(found[f].abs, true); } catch (er2) { /* ignore */ } }
      else if (ac.k === 'exec' && !ac.plus) { var words = ac.cmd.map(function (w) { return w.replace(/\{\}/g, found[f].p); }); var r = await self.exec(words, io); if (r) rc = r; }
    }
  }
  var plus = actions.filter(function (x) { return x.k === 'exec' && x.plus; })[0];
  if (plus) { var words2 = []; plus.cmd.forEach(function (w) { if (w === '{}') found.forEach(function (x) { words2.push(x.p); }); else words2.push(w); }); await self.exec(words2, io); }
  return rc;
});
def('xargs', async function (a, io) {
  var o = opts(a, ['n', 'I']), txt = readAll(io.in), cmd = o.rest.length ? o.rest : ['echo'];
  var items = o.f.I ? txt.split('\n').filter(Boolean) : txt.split(/\s+/).filter(Boolean);
  if (!items.length) return 0;
  var rc = 0;
  if (o.f.I) { for (var i = 0; i < items.length; i++) { var r = await this.exec(cmd.map(function (w) { return w.split(o.f.I).join(items[i]); }), io); if (r) rc = r; } return rc; }
  var n = o.f.n ? parseInt(o.f.n, 10) : items.length;
  for (var k = 0; k < items.length; k += n) { var r2 = await this.exec(cmd.concat(items.slice(k, k + n)), io); if (r2) rc = r2; }
  return rc;
});
def('whoami', function (a, io) { io.o(this.eu + '\n'); return 0; });
def('id', function (a, io) {
  var u = a.length ? a[0] : this.eu, ui = this.users[u];
  if (!ui) { io.e('id: \'' + u + '\': no such user\n'); return 1; }
  var gs = this.groupsOf(u);
  io.o('uid=' + ui.uid + '(' + u + ') gid=' + this.groups[ui.group].gid + '(' + ui.group + ') groups=' + gs.map(function (g, i) { return this.groups[g].gid + '(' + g + ')'; }, this).join(',') + '\n'); return 0;
});
def('groups', function (a, io) { var u = a.length ? a[0] : this.eu; if (!this.users[u]) { io.e('groups: \'' + u + '\': no such user\n'); return 1; } io.o(this.groupsOf(u).join(' ') + '\n'); return 0; });
def('hostname', function (a, io) { io.o(this.hostname + '\n'); return 0; });
def('uname', function (a, io) { io.o(a.indexOf('-a') >= 0 ? 'Linux ' + this.hostname + ' 6.1.0-sim #1 SMP x86_64 GNU/Linux\n' : a.indexOf('-r') >= 0 ? '6.1.0-sim\n' : 'Linux\n'); return 0; });
def('date', function (a, io) {
  var d = new Date(this.clock), f = a.filter(function (x) { return x[0] === '+'; })[0];
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (f) { io.o(f.slice(1).replace(/%([YmdHMSsjaAbBFTy%])/g, function (m, c) { switch (c) { case 'Y': return d.getUTCFullYear(); case 'm': return p2(d.getUTCMonth() + 1); case 'd': return p2(d.getUTCDate()); case 'H': return p2(d.getUTCHours()); case 'M': return p2(d.getUTCMinutes()); case 'S': return p2(d.getUTCSeconds()); case 's': return Math.floor(d.getTime() / 1000); case 'F': return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); case 'T': return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds()); case 'a': return days[d.getUTCDay()]; case 'b': return MON[d.getUTCMonth()]; case 'y': return p2(d.getUTCFullYear() % 100); case 'j': return '001'; default: return '%'; } }) + '\n'); return 0; }
  io.o(days[d.getUTCDay()] + ' ' + MON[d.getUTCMonth()] + ' ' + pad(d.getUTCDate(), 2) + ' ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds()) + ' UTC ' + d.getUTCFullYear() + '\n'); return 0;
});
def('env printenv', function (a, io) { var self = this; if (a.length && a[0][0] !== '-' && a[0].indexOf('=') < 0) { var v = this.env[a[0]]; if (v === undefined) return 1; io.o(v + '\n'); return 0; } Object.keys(this.env).forEach(function (k) { io.o(k + '=' + self.env[k] + '\n'); }); return 0; });
def('sleep', function () { return 0; });
def('nohup', function () { return 0; });
def('yes', function (a, io) { var s = (a.length ? a.join(' ') : 'y') + '\n', o = ''; for (var i = 0; i < 100; i++) o += s; io.o(o); return 0; });
def('seq', function (a, io) {
  var n = a.map(Number), from = 1, step = 1, to;
  if (n.length === 1) to = n[0]; else if (n.length === 2) { from = n[0]; to = n[1]; } else { from = n[0]; step = n[1]; to = n[2]; }
  var out = ''; if (step > 0) for (var i = from; i <= to; i += step) out += i + '\n'; else if (step < 0) for (var j = from; j >= to; j += step) out += j + '\n';
  io.o(out); return 0;
});
def('sudo', async function (a, io) {
  var user = 'root', i = 0, ui = this.users[this.eu];
  while (a[i] && a[i][0] === '-') { if (a[i] === '-u') { user = a[i + 1]; i += 2; } else i++; }
  var cmd = a.slice(i);
  if (!cmd.length) { io.e('usage: sudo command\n'); return 1; }
  if (this.eu !== 'root' && !(ui.groups.indexOf('sudo') >= 0 || this.groups.sudo && this.groups.sudo.members.indexOf(this.eu) >= 0)) { io.e(this.eu + ' is not in the sudoers file.\n'); return 1; }
  if (!this.users[user]) { io.e('sudo: unknown user ' + user + '\n'); return 1; }
  var old = this.eu; this.eu = user;
  try { return await this.exec(cmd, io); } finally { this.eu = old; }
}, { dir: '/usr/bin' });
def('bash sh', async function (a, io) {
  var o = [], i = 0, code = null, self = this;
  while (i < a.length && a[i][0] === '-') { if (a[i] === '-c') { code = a[i + 1]; i += 2; break; } o.push(a[i]); i++; }
  var flags = { e: o.some(function (x) { return /e/.test(x); }), u: o.some(function (x) { return /u/.test(x); }) };
  void flags;
  if (code !== null) { var rest = a.slice(i + 1); return this.runScript(code, rest, io, a[i] || 'bash'); }
  var file = a[i]; if (!file) return 0;
  var txt; try { txt = this.readFile(file); } catch (e) { io.e('bash: ' + file + ': ' + (e.msg || 'error') + '\n'); return 127; }
  void self;
  return this.runScript(txt, a.slice(i + 1), io, file);
}, { dir: '/bin' });
def('exec', function () { return 0; }, { builtin: true });
def('nano vi vim edit', async function (a, io) {
  if (!a.length) { io.e('usage: nano FILE\n'); return 1; }
  if (!this.opts.edit) { io.e('The editor is only available in the browser. Use echo, printf, cat with a here-document, or sed -i instead.\n'); return 1; }
  var cur = ''; try { cur = this.readFile(a[0]); } catch (e) { if (!(e instanceof T.FsErr && e.code === 'ENOENT')) return fsErr(io, 'nano', a[0], e); }
  var res = await this.opts.edit(this.abs(a[0]), cur);
  if (res === null || res === undefined) { io.o('Not saved.\n'); return 0; }
  try { this.writeFile(a[0], res, false); } catch (e) { return fsErr(io, 'nano', a[0], e); }
  return 0;
});
if (typeof module === 'object' && module.exports) module.exports = T;
}());
