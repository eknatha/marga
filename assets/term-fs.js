/* MARGA terminal engine, part 1: the virtual file system, users and the session object.
   This is a simulation written for MARGA. It is not a real Linux kernel. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.MargaTerm = factory();
}(typeof self !== 'undefined' ? self : this, function () {
'use strict';
var T = { commands: {}, version: 1 };
var MSG = { ENOENT: 'No such file or directory', EACCES: 'Permission denied', ENOTDIR: 'Not a directory', EISDIR: 'Is a directory', EEXIST: 'File exists', ENOTEMPTY: 'Directory not empty', ELOOP: 'Too many levels of symbolic links', ENOSPC: 'No space left on device', EPERM: 'Operation not permitted' };
function FsErr(code, path) { this.code = code; this.path = path; this.msg = MSG[code] || code; }
T.FsErr = FsErr;

function dirNode(m, o, g) { return { t: 'd', m: m, o: o || 'root', g: g || o || 'root', c: {}, mt: 0 }; }
function fileNode(d, m, o, g) { return { t: 'f', m: m, o: o || 'root', g: g || o || 'root', d: d, mt: 0 }; }
T.dirNode = dirNode; T.fileNode = fileNode;

function normalize(p, cwd) {
  if (p[0] !== '/') p = (cwd || '/') + '/' + p;
  var out = [], parts = p.split('/');
  for (var i = 0; i < parts.length; i++) {
    var s = parts[i];
    if (!s || s === '.') continue;
    if (s === '..') { out.pop(); continue; }
    out.push(s);
  }
  return '/' + out.join('/');
}
T.normalize = normalize;
function dirname(p) { var i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); }
function basename(p) { return p.slice(p.lastIndexOf('/') + 1); }
T.dirname = dirname; T.basename = basename;

var BASE_DIRS = [['/', 493], ['/bin', 493], ['/usr', 493], ['/usr/bin', 493], ['/usr/sbin', 493], ['/usr/local', 493], ['/usr/local/bin', 493], ['/sbin', 493], ['/etc', 493], ['/etc/systemd', 493], ['/etc/systemd/system', 493],
  ['/home', 493], ['/root', 448], ['/tmp', 1023], ['/var', 493], ['/var/log', 493], ['/var/lib', 493], ['/var/www', 493], ['/opt', 493], ['/srv', 493], ['/dev', 493], ['/mnt', 493]];

function Session(world, opts) {
  world = world || {}; opts = opts || {};
  this.opts = opts;
  this.root = dirNode(493, 'root', 'root');
  this.users = {}; this.groups = {};
  this.clock = world.clock || Date.UTC(2026, 0, 5, 10, 0, 0);
  this.eu = 'user';
  this.env = { PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', SHELL: '/bin/bash', LANG: 'C', TERM: 'xterm' };
  this.vars = {}; this.exported = {}; this.frames = []; this.funcs = {}; this.argv = []; this.arg0 = 'bash';
  this.status = 0; this.sopt = { e: false, u: false, x: false, pipefail: false }; this.noerr = 0; this.traps = {};
  this.procs = (world.procs || []).map(function (p) { return Object.assign({ user: 'root', cpu: 0, mem: 0.1, state: 'S', cmd: '' }, p); });
  this.nextPid = world.nextPid || 2000;
  this.services = {}; this.journal = {}; this.cron = {};
  this.net = null; this.history = []; this.steps = 0; this.maxSteps = 60000;
  this.ranLog = [];
  var i;
  for (i = 0; i < BASE_DIRS.length; i++) this.mkdirp(BASE_DIRS[i][0], BASE_DIRS[i][1], 'root', 'root');
  this.root.c.dev.c['null'] = fileNode('', 438, 'root', 'root');
  this.setupUsers(world);
  var home = this.users[this.eu].home;
  this.mkdirp(home, 493, this.eu, this.users[this.eu].group);
  this.env.HOME = home; this.env.USER = this.eu; this.env.LOGNAME = this.eu; this.env.HOSTNAME = world.hostname || 'lab-host';
  this.hostname = this.env.HOSTNAME;
  this.cwd = world.cwd || home;
  this.env.PWD = this.cwd;
  var extraEnv = world.env || {}; for (var k in extraEnv) this.env[k] = extraEnv[k];
  this.setFile('/etc/hostname', this.hostname + '\n', 420, 'root', 'root', true);
  this.setFile('/etc/hosts', '127.0.0.1\tlocalhost\n127.0.1.1\t' + this.hostname + '\n', 420, 'root', 'root', true);
  this.setFile('/etc/resolv.conf', 'nameserver 10.0.0.2\n', 420, 'root', 'root', true);
  this.setFile('/etc/os-release', 'NAME="Simulated Linux"\nID=simlinux\nVERSION_ID="1"\n', 420, 'root', 'root', true);
  (world.dirs || []).forEach(function (d) { this.mkdirp(d.p, parseInt(d.m || '755', 8), d.o || 'root', d.g || d.o || 'root', true); }, this);
  (world.files || []).forEach(function (f) {
    this.mkdirp(dirname(f.path), 493, f.path.indexOf(home + '/') === 0 ? this.eu : 'root', f.path.indexOf(home + '/') === 0 ? this.users[this.eu].group : 'root');
    var dof = f.o || (f.path.indexOf(home + '/') === 0 ? this.eu : 'root'), fnode = this.setFile(f.path, f.data, parseInt(f.m || '644', 8), dof, f.g || (f.o ? f.o : (dof === this.eu ? this.users[this.eu].group : 'root')), true);
    if (f.size) fnode.sz = T.parseSize(f.size);
  }, this);
  (world.links || []).forEach(function (l) { var d = this.walk(dirname(l.path), true, true); d.c[basename(l.path)] = { t: 'l', m: 511, o: 'root', g: 'root', d: l.to, mt: 0 }; }, this);
  if (world.services) this.services = JSON.parse(JSON.stringify(world.services));
  if (world.cron) this.cron = JSON.parse(JSON.stringify(world.cron));
  if (world.journal) this.journal = JSON.parse(JSON.stringify(world.journal));
  if (world.net) this.net = JSON.parse(JSON.stringify(world.net));
  this.world = world;
  this.snapshotFiles = {};
  this.eachFile('/', function (p, n) { this.snapshotFiles[p] = n.d; });
  (function fix(n, c) { if (!n.mt) n.mt = c; if (n.t === 'd') for (var k in n.c) fix(n.c[k], c); })(this.root, this.clock);
  for (var s in this.services) { var sv = this.services[s]; sv.loaded = this.readRaw(sv.unit); if (sv.state === 'active') this.spawnService(s); }
}
T.Session = Session;
var P = Session.prototype;

P.setupUsers = function (world) {
  var u = world.users || {};
  var base = { root: { uid: 0, group: 'root', home: '/root', groups: [] }, user: { uid: 1000, group: 'user', home: '/home/user', groups: ['sudo'] } };
  for (var k in u) base[k] = Object.assign({ uid: 1001, home: '/home/' + k, group: k, groups: k === 'user' ? ['sudo'] : [] }, u[k], base[k] && !u[k].uid ? { uid: base[k].uid } : {});
  this.users = base;
  var gid = 2000; this.groups = { root: { gid: 0, members: [] } };
  for (var n in base) { if (!this.groups[base[n].group]) this.groups[base[n].group] = { gid: base[n].uid >= 1000 ? base[n].uid : gid++, members: [] }; }
  for (n in base) base[n].groups.forEach(function (g) { if (!this.groups[g]) this.groups[g] = { gid: gid++, members: [] }; if (this.groups[g].members.indexOf(n) < 0) this.groups[g].members.push(n); }, this);
  (world.groups || []).forEach(function (g) { if (!this.groups[g]) this.groups[g] = { gid: gid++, members: [] }; }, this);
  if (world.eu) this.eu = world.eu;
  this.writeAccountFiles();
};
P.writeAccountFiles = function () {
  var pw = '', gr = '', n, g, self = this;
  for (n in this.users) { var u = this.users[n]; pw += n + ':x:' + u.uid + ':' + (this.groups[u.group] ? this.groups[u.group].gid : u.uid) + '::' + u.home + ':/bin/bash\n'; }
  for (g in this.groups) gr += g + ':x:' + this.groups[g].gid + ':' + this.groups[g].members.join(',') + '\n';
  this.mkdirp('/etc', 493, 'root', 'root');
  this.setFile('/etc/passwd', pw, 420, 'root', 'root', true);
  this.setFile('/etc/group', gr, 420, 'root', 'root', true);
  void self;
};
P.groupsOf = function (u) {
  var r = [], g, ui = this.users[u];
  if (ui && r.indexOf(ui.group) < 0) r.push(ui.group);
  for (g in this.groups) if (this.groups[g].members.indexOf(u) >= 0 && r.indexOf(g) < 0) r.push(g);
  return r;
};
P.tick = function () { this.clock += 1000; return this.clock; };

/* ---- low level, no permission checks (used to build the world) ---- */
P.mkdirp = function (abs, m, o, g, force) {
  var parts = abs.split('/').filter(Boolean), n = this.root;
  for (var i = 0; i < parts.length; i++) {
    var c = n.c[parts[i]];
    if (!c) { c = n.c[parts[i]] = dirNode(i === parts.length - 1 ? m : 493, i === parts.length - 1 ? o : 'root', i === parts.length - 1 ? g : 'root'); }
    else if (force && i === parts.length - 1) { c.m = m; c.o = o; c.g = g; }
    n = c;
  }
  if (!parts.length && force) { n.m = m; n.o = o; n.g = g; }
  return n;
};
P.setFile = function (abs, data, m, o, g, quiet) {
  var d = this.mkdirp(dirname(abs), 493, 'root', 'root'), b = basename(abs), ex = d.c[b];
  if (ex && ex.t === 'f') { ex.d = data; if (!quiet) ex.mt = this.clock; return ex; }
  var f = d.c[b] = fileNode(data, m, o, g); f.mt = quiet ? this.clock : this.clock; return f;
};
P.readRaw = function (abs) { try { var n = this.walk(abs, true, true); return n.t === 'f' ? n.d : null; } catch (e) { return null; } };
P.eachFile = function (abs, fn) {
  var n; try { n = this.walk(abs, false, true); } catch (e) { return; }
  if (n.t === 'f') { fn.call(this, abs, n); return; }
  if (n.t === 'd') Object.keys(n.c).sort().forEach(function (k) { this.eachFile((abs === '/' ? '' : abs) + '/' + k, fn); }, this);
};

/* ---- walk: resolve a path to a node. raw=true skips permission checks ---- */
P.walk = function (abs, follow, raw) {
  var parts = abs.split('/').filter(Boolean), n = this.root, cur = '', guard = 0;
  for (var i = 0; i < parts.length; i++) {
    if (n.t === 'l') {
      if (++guard > 20) throw new FsErr('ELOOP', abs);
      var tgt = normalize(n.d, cur || '/');
      return this.walk(tgt + (parts.length > i ? '/' + parts.slice(i).join('/') : ''), follow, raw);
    }
    if (n.t !== 'd') throw new FsErr('ENOTDIR', abs);
    if (!raw && !this.can(n, 1)) throw new FsErr('EACCES', abs);
    var c = n.c[parts[i]];
    if (!c) throw new FsErr('ENOENT', abs);
    cur += '/' + parts[i]; n = c;
  }
  if (n.t === 'l' && follow) {
    if (++guard > 20) throw new FsErr('ELOOP', abs);
    return this.walk(normalize(n.d, dirname(abs)), true, raw);
  }
  return n;
};
P.can = function (n, bit, user) {
  var u = user || this.eu;
  if (u === 'root') return bit !== 1 || n.t === 'd' || (n.m & 73) !== 0;
  var m = n.m, cls;
  if (n.o === u) cls = (m >> 6) & 7; else if (this.groupsOf(u).indexOf(n.g) >= 0) cls = (m >> 3) & 7; else cls = m & 7;
  return (cls & bit) !== 0;
};
P.abs = function (p) { return normalize(p, this.cwd); };
P.stat = function (p, follow) { return this.walk(this.abs(p), follow !== false); };
P.exists = function (p) { try { this.stat(p); return true; } catch (e) { return false; } };

/* ---- checked operations ---- */
P.readFile = function (p) {
  var abs = this.abs(p);
  if (abs === '/dev/null') return '';
  var n = this.walk(abs, true);
  if (n.t === 'd') throw new FsErr('EISDIR', abs);
  if (!this.can(n, 4)) throw new FsErr('EACCES', abs);
  return n.d;
};
P.writeFile = function (p, data, append) {
  var abs = this.abs(p);
  if (abs === '/dev/null') return;
  var par = this.walk(dirname(abs), true), b = basename(abs), n;
  if (par.t !== 'd') throw new FsErr('ENOTDIR', abs);
  n = par.c[b];
  if (n && n.t === 'l') { n = this.walk(abs, true); }
  if (n) {
    if (n.t === 'd') throw new FsErr('EISDIR', abs);
    if (!this.can(n, 2)) throw new FsErr('EACCES', abs);
    n.d = append ? n.d + data : data; n.mt = this.clock; return n;
  }
  if (!this.can(par, 2) || !this.can(par, 1)) throw new FsErr('EACCES', abs);
  var f = par.c[b] = fileNode(data, 420 & ~18 | 0, this.eu, this.users[this.eu] ? this.users[this.eu].group : this.eu);
  f.m = 420; f.mt = this.clock; return f;
};
P.mkdir = function (p, parents) {
  var abs = this.abs(p), parts = abs.split('/').filter(Boolean), n = this.root, cur = '';
  for (var i = 0; i < parts.length; i++) {
    var last = i === parts.length - 1, c = n.c[parts[i]];
    cur += '/' + parts[i];
    if (c && c.t === 'l') c = this.walk(cur, true);
    if (!c) {
      if (!last && !parents) throw new FsErr('ENOENT', abs);
      if (!this.can(n, 2) || !this.can(n, 1)) throw new FsErr('EACCES', cur);
      c = n.c[parts[i]] = dirNode(493, this.eu, this.users[this.eu].group); c.mt = this.clock;
    } else if (last && !parents) throw new FsErr('EEXIST', abs);
    else if (c.t !== 'd') throw new FsErr(last ? 'EEXIST' : 'ENOTDIR', abs);
    else if (!this.can(c, 1) && !last) throw new FsErr('EACCES', cur);
    n = c;
  }
};
P.remove = function (p, recursive) {
  var abs = this.abs(p), par = this.walk(dirname(abs), true), b = basename(abs), n = par.c[b];
  if (!n) throw new FsErr('ENOENT', abs);
  if (!this.can(par, 2) || !this.can(par, 1)) throw new FsErr('EACCES', abs);
  if (n.t === 'd' && !recursive) throw new FsErr('EISDIR', abs);
  delete par.c[b];
};
P.listDir = function (p) {
  var abs = this.abs(p), n = this.walk(abs, true);
  if (n.t !== 'd') throw new FsErr('ENOTDIR', abs);
  if (!this.can(n, 4)) throw new FsErr('EACCES', abs);
  return Object.keys(n.c).sort();
};
P.clone = function () {
  var s = Object.create(Session.prototype), k;
  for (k in this) if (Object.prototype.hasOwnProperty.call(this, k)) s[k] = this[k];
  ['root', 'users', 'groups', 'env', 'vars', 'exported', 'funcs', 'procs', 'services', 'journal', 'cron', 'net', 'snapshotFiles', 'ranLog', 'history', 'sopt', 'traps'].forEach(function (f) { s[f] = JSON.parse(JSON.stringify(this[f] === undefined ? null : this[f], function (key, v) { return v; })); }, this);
  s.funcs = this.funcs; s.frames = []; s.noerr = 0; s.steps = 0;
  return s;
};
return T;
}));
