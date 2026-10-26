/* MARGA terminal engine, part 8: processes, disks, services, cron, users and the Python hook. All simulated. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-jq.js') : window.MargaTerm;
var def = T.def, opts = T.parseOpts, pad = T.pad, P = T.Session.prototype;
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function p2(n) { return (n < 10 ? '0' : '') + n; }
function jtime(ms) { var d = new Date(ms); return MON[d.getUTCMonth()] + ' ' + p2(d.getUTCDate()) + ' ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ':' + p2(d.getUTCSeconds()); }
T.jtime = jtime;
function sizeOf(n) { if (n.sz !== undefined) return n.sz; return n.t === 'f' || n.t === 'l' ? n.d.length : 4096; }
T.sizeOf = sizeOf;
function parseSize(s) { if (typeof s === 'number') return s; var m = /^([\d.]+)\s*([KMGT]?)B?$/i.exec(String(s)); if (!m) return 0; return Math.round(parseFloat(m[1]) * Math.pow(1024, 'KMGT'.indexOf((m[2] || '').toUpperCase()) + 1)); }
T.parseSize = parseSize;

/* a file may declare a virtual size (so a 4 GB log does not need 4 GB of text) */
var origWrite = P.writeFile;
P.writeFile = function (p, data, append) {
  var abs = this.abs(p);
  var d = this.disks && this.diskFor ? this.diskFor(abs) : null;
  if (d && data.length && this.diskUsed(d) >= d.size && !(this.eu === 'root' && false)) throw new T.FsErr('ENOSPC', abs);
  var n = origWrite.call(this, p, data, append);
  if (n && n.sz !== undefined && !append) delete n.sz;
  return n;
};
T.FsErr.prototype.msg = T.FsErr.prototype.msg;
(function () { var orig = T.FsErr; orig.prototype.constructor = orig; })();

/* ---------------- disks ---------------- */
P.initDisks = function () {
  var w = this.world.disks || [];
  this.disks = w.map(function (d) { return { fs: d.fs, mount: d.mount, size: parseSize(d.size), base: parseSize(d.base || 0) }; });
};
P.diskFor = function (abs) {
  if (!this.disks) this.initDisks();
  var best = null;
  this.disks.forEach(function (d) { if ((abs === d.mount || abs.indexOf(d.mount === '/' ? '/' : d.mount + '/') === 0) && (!best || d.mount.length > best.mount.length)) best = d; });
  return best;
};
P.diskUsed = function (d) {
  var self = this, total = d.base;
  (function walk(abs, n) {
    if (n.t === 'f') { total += sizeOf(n); return; }
    if (n.t !== 'd') return;
    Object.keys(n.c).forEach(function (k) { var p = (abs === '/' ? '' : abs) + '/' + k, other = self.diskFor(p); if (other !== d) return; walk(p, n.c[k]); });
  })(d.mount, this.walk(d.mount, true, true));
  return total;
};
function fmtH(b) { return T.human(b); }
def('df', function (a, io) {
  var o = opts(a), self = this;
  if (!this.disks) this.initDisks();
  var rows = this.disks.map(function (d) { var used = Math.min(self.diskUsed(d), d.size); return { fs: d.fs, size: d.size, used: used, avail: d.size - used, mount: d.mount }; });
  var h = o.f.h, fmt = function (b) { return h ? fmtH(b) : String(Math.ceil(b / 1024)); };
  io.o(pad('Filesystem', 14, true) + pad(h ? 'Size' : '1K-blocks', 9) + pad('Used', 9) + pad('Avail', 9) + pad('Use%', 5) + ' Mounted on\n');
  rows.forEach(function (r) { io.o(pad(r.fs, 14, true) + pad(fmt(r.size), 9) + pad(fmt(r.used), 9) + pad(fmt(r.avail), 9) + pad(Math.ceil(r.used * 100 / r.size) + '%', 5) + ' ' + r.mount + '\n'); });
  return 0;
});
def('du', function (a, io) {
  var o = opts(a, ['d', 'max-depth'], { 'max-depth': 'v' }), self = this, rc = 0, depth = o.f.d !== undefined ? parseInt(o.f.d, 10) : o.f['max-depth'] !== undefined ? parseInt(o.f['max-depth'], 10) : Infinity;
  var paths = o.rest.length ? o.rest : ['.'];
  function fmt(b) { return o.f.h ? fmtH(b) : o.f.k || true ? String(Math.ceil(b / 1024)) : String(b); }
  function walk(abs, disp, n, d, print) {
    var total = n.t === 'f' ? sizeOf(n) : 4096;
    if (n.t === 'd') { var names; try { names = self.listDir(abs); } catch (e) { io.e('du: cannot read directory \'' + disp + '\': ' + e.msg + '\n'); rc = 1; names = []; } names.forEach(function (k) { total += walk((abs === '/' ? '' : abs) + '/' + k, disp + '/' + k, self.walk((abs === '/' ? '' : abs) + '/' + k, false, true), d + 1, print && !o.f.s); }); }
    if (print && (n.t === 'd' || o.f.a) && d <= depth) io.o(fmt(total) + '\t' + disp + '\n');
    return total;
  }
  paths.forEach(function (p) { try { var n = self.stat(p, false); var tot = walk(self.abs(p), p, n, 0, !o.f.s); if (o.f.s) io.o(fmt(tot) + '\t' + p + '\n'); } catch (e) { if (e instanceof T.FsErr) { io.e('du: cannot access \'' + p + '\': ' + e.msg + '\n'); rc = 1; } else throw e; } });
  return rc;
});
def('free', function (a, io) {
  var o = opts(a), div = o.f.m ? 1 : o.f.g ? 1 / 1024 : 1024, h = o.f.h;
  function f(mb) { return h ? (mb >= 1024 ? (mb / 1024).toFixed(1) + 'Gi' : mb + 'Mi') : String(Math.round(mb * (o.f.m ? 1 : 1024))); }
  void div;
  io.o('               total        used        free      shared  buff/cache   available\n' + 'Mem:' + pad(f(7950), 14) + pad(f(2100), 12) + pad(f(3900), 12) + pad(f(40), 12) + pad(f(1950), 12) + pad(f(5600), 12) + '\n' + 'Swap:' + pad(f(2048), 13) + pad(f(0), 12) + pad(f(2048), 12) + '\n');
  return 0;
});
def('uptime', function (a, io) { io.o(' ' + jtime(this.clock).slice(7) + ' up 12 days,  3:04,  1 user,  load average: 0.52, 0.48, 0.45\n'); return 0; });
def('nproc', function (a, io) { io.o('4\n'); return 0; });

/* ---------------- processes ---------------- */
P.addProc = function (p) { p.pid = p.pid || this.nextPid++; this.procs.push(Object.assign({ user: 'root', cpu: 0, mem: 0.1, state: 'S', cmd: '' }, p)); return p.pid; };
def('ps', function (a, io) {
  if (a[0] && a[0][0] !== '-' && /^[a-zA-Z]+$/.test(a[0])) a = ['-' + a[0]].concat(a.slice(1));
  var o = opts(a, ['o', 'sort'], { sort: 'v' }), self = this, list = this.procs.slice(), sort = o.f.sort;
  var base = [{ pid: 1, user: 'root', cpu: 0, mem: 0.1, state: 'Ss', cmd: '/sbin/init' }, { pid: 400, user: this.eu, cpu: 0, mem: 0.1, state: 'Ss', cmd: '-bash' }, { pid: 3999, user: this.eu, cpu: 0, mem: 0, state: 'R+', cmd: 'ps ' + a.join(' ') }];
  list = base.slice(0, 2).concat(list, base.slice(2));
  if (sort) { var desc = sort[0] === '-', key = sort.replace(/^[-+]/, '').replace('%', ''); list.sort(function (x, y) { var vx = x[key], vy = y[key]; if (typeof vx === 'string') return desc ? (vx < vy ? 1 : -1) : (vx < vy ? -1 : 1); return desc ? vy - vx : vx - vy; }); }
  var full = o.f.a || o.f.u || o.f.x || (o.f.e && o.f.f);
  if (o.f.o) {
    var cols = String(o.f.o).split(','); io.o(cols.map(function (c) { return c.toUpperCase().replace('CMD', 'COMMAND'); }).join(' ') + '\n');
    list.forEach(function (p) { io.o(cols.map(function (c) { return c === 'pid' ? p.pid : c === 'user' ? p.user : c === '%cpu' || c === 'pcpu' ? p.cpu.toFixed(1) : c === '%mem' || c === 'pmem' ? p.mem.toFixed(1) : c === 'stat' ? p.state : c === 'comm' ? p.cmd.split(' ')[0].split('/').pop() : p.cmd; }).join(' ') + '\n'); });
    return 0;
  }
  if (o.f.a && o.f.u || (o.f.a && o.f.x) || o.f.u) {
    io.o('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n');
    list.forEach(function (p) { io.o(pad(p.user, 8, true) + pad(p.pid, 8) + pad(p.cpu.toFixed(1), 5) + pad(p.mem.toFixed(1), 5) + pad(Math.round(p.mem * 8000), 7) + pad(Math.round(p.mem * 2400), 6) + ' ?        ' + pad(p.state, 4, true) + ' 09:58   ' + pad('0:' + p2(Math.round(p.cpu)), 4) + ' ' + p.cmd + '\n'); });
  } else if (o.f.e && o.f.f) {
    io.o('UID          PID    PPID  C STIME TTY          TIME CMD\n');
    list.forEach(function (p) { io.o(pad(p.user, 8, true) + pad(p.pid, 8) + pad(p.pid === 1 ? 0 : 1, 8) + pad(Math.round(p.cpu), 3) + ' 09:58 ?        00:00:0' + Math.round(p.cpu) % 10 + ' ' + p.cmd + '\n'); });
  } else {
    io.o('    PID TTY          TIME CMD\n');
    list.filter(function (p) { return o.f.e || p.user === self.eu && p.pid >= 400 && !/^(\/usr|\/opt)/.test(p.cmd) || p.pid === 3999; }).forEach(function (p) { io.o(pad(p.pid, 7) + ' pts/0    00:00:00 ' + p.cmd.split(' ')[0].split('/').pop() + '\n'); });
  }
  return 0;
});
def('top', function (a, io) {
  var list = this.procs.slice().sort(function (x, y) { return y.cpu - x.cpu; }).slice(0, 12);
  io.o('top - ' + jtime(this.clock).slice(7) + ' up 12 days,  1 user,  load average: ' + (list.length ? (list[0].cpu / 20).toFixed(2) : '0.10') + ', 0.50, 0.40\nTasks: ' + (this.procs.length + 3) + ' total\n%Cpu(s): ' + Math.min(100, Math.round(list.reduce(function (s, p) { return s + p.cpu; }, 0))) + '.0 us\nMiB Mem :   7950.0 total\n\n    PID USER      %CPU  %MEM COMMAND\n');
  list.forEach(function (p) { io.o(pad(p.pid, 7) + ' ' + pad(p.user, 9, true) + pad(p.cpu.toFixed(1), 5) + pad(p.mem.toFixed(1), 6) + ' ' + p.cmd.split(' ')[0].split('/').pop() + '\n'); });
  return 0;
});
def('kill', function (a, io) {
  var sig = 'TERM', ids = [], rc = 0, self = this;
  a.forEach(function (x) { if (/^-[0-9]+$/.test(x)) sig = x.slice(1); else if (/^-[A-Z]+$/.test(x)) sig = x.slice(1); else if (/^-s$/.test(x)) return; else ids.push(x); });
  if (!ids.length) { io.e('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]\n'); return 2; }
  ids.forEach(function (id) {
    var pid = parseInt(id, 10), i = -1;
    self.procs.forEach(function (p, ix) { if (p.pid === pid) i = ix; });
    if (i < 0) { io.e('bash: kill: (' + id + ') - No such process\n'); rc = 1; return; }
    var p = self.procs[i];
    if (self.eu !== 'root' && p.user !== self.eu) { io.e('bash: kill: (' + id + ') - Operation not permitted\n'); rc = 1; return; }
    if (p.ignoreTerm && (sig === 'TERM' || sig === '15' || sig === 'HUP' || sig === '1')) return;
    self.procs.splice(i, 1);
    self.killed = (self.killed || []).concat([pid]);
    if (p.service && self.services[p.service]) { var sv = self.services[p.service]; if (sv.state === 'active') { if (sv.restart && sv.restart !== 'no') { self.spawnService(p.service); } else sv.state = 'failed'; } }
  });
  return rc;
}, { builtin: true });
def('pkill killall', function (a, io) {
  var pat = a.filter(function (x) { return x[0] !== '-'; })[0], self = this, hit = 0;
  this.procs.slice().forEach(function (p) { var nm = p.cmd.split(' ')[0].split('/').pop(); if (nm === pat || p.cmd.indexOf(pat) >= 0 && false) { if (self.eu !== 'root' && p.user !== self.eu) return; self.procs.splice(self.procs.indexOf(p), 1); hit++; } });
  return hit ? 0 : 1;
});
def('pgrep', function (a, io) {
  var o = opts(a), pat = o.rest[0], re = new RegExp(pat), hit = 0;
  this.procs.forEach(function (p) { var nm = o.f.f ? p.cmd : p.cmd.split(' ')[0].split('/').pop(); if (re.test(nm)) { io.o(p.pid + (o.f.l ? ' ' + p.cmd.split(' ')[0].split('/').pop() : '') + '\n'); hit++; } });
  return hit ? 0 : 1;
});
def('lsof', function (a, io) {
  var self = this; io.o('COMMAND   PID USER   FD   TYPE NODE NAME\n');
  this.procs.forEach(function (p) { (p.ports || []).forEach(function (port) { io.o(pad(p.cmd.split(' ')[0].split('/').pop(), 9, true) + pad(p.pid, 5) + ' ' + pad(p.user, 6, true) + ' 3u  IPv4  TCP *:' + port + ' (LISTEN)\n'); }); });
  void self; return 0;
}, { dir: '/usr/sbin' });

/* ---------------- users ---------------- */
def('useradd', function (a, io) {
  var o = opts(a, ['s', 'd', 'g', 'G', 'u']), name = o.rest[0];
  if (this.eu !== 'root') { io.e('useradd: Permission denied.\nuseradd: cannot lock /etc/passwd; try again later.\n'); return 1; }
  if (this.users[name]) { io.e('useradd: user \'' + name + '\' already exists\n'); return 9; }
  var grp = o.f.g || name; if (!this.groups[grp]) this.groups[grp] = { gid: 3000 + Object.keys(this.groups).length, members: [] };
  this.users[name] = { uid: 1001 + Object.keys(this.users).length, group: grp, home: o.f.d || '/home/' + name, groups: [] };
  if (o.f.G) String(o.f.G).split(',').forEach(function (g) { if (this.groups[g]) this.groups[g].members.push(name); }, this);
  if (o.f.m) this.mkdirp(this.users[name].home, 493, name, grp);
  this.writeAccountFiles(); return 0;
}, { dir: '/usr/sbin' });
def('groupadd', function (a, io) {
  var name = a.filter(function (x) { return x[0] !== '-'; })[0];
  if (this.eu !== 'root') { io.e('groupadd: Permission denied.\ngroupadd: cannot lock /etc/group; try again later.\n'); return 1; }
  if (this.groups[name]) { io.e('groupadd: group \'' + name + '\' already exists\n'); return 9; }
  this.groups[name] = { gid: 3000 + Object.keys(this.groups).length, members: [] }; this.writeAccountFiles(); return 0;
}, { dir: '/usr/sbin' });
def('usermod', function (a, io) {
  if (this.eu !== 'root') { io.e('usermod: Permission denied.\nusermod: cannot lock /etc/passwd; try again later.\n'); return 1; }
  var append = a.indexOf('-a') >= 0 || a.some(function (x) { return /^-[a-zA-Z]*a[a-zA-Z]*G$/.test(x) || x === '-aG'; }), gi = -1, i;
  for (i = 0; i < a.length; i++) if (a[i] === '-G' || a[i] === '-aG') gi = i;
  var rest = a.filter(function (x) { return x[0] !== '-'; }), user = rest[rest.length - 1];
  if (!this.users[user]) { io.e('usermod: user \'' + user + '\' does not exist\n'); return 6; }
  if (gi < 0) return 0;
  var gs = a[gi + 1].split(',');
  for (i = 0; i < gs.length; i++) if (!this.groups[gs[i]]) { io.e('usermod: group \'' + gs[i] + '\' does not exist\n'); return 6; }
  if (!append) { for (var g in this.groups) { var ix = this.groups[g].members.indexOf(user); if (ix >= 0) this.groups[g].members.splice(ix, 1); } }
  gs.forEach(function (g) { if (this.groups[g].members.indexOf(user) < 0) this.groups[g].members.push(user); }, this);
  this.writeAccountFiles(); return 0;
}, { dir: '/usr/sbin' });
def('getent', function (a, io) {
  if (a[0] === 'group' && this.groups[a[1]]) { var g = this.groups[a[1]]; io.o(a[1] + ':x:' + g.gid + ':' + g.members.join(',') + '\n'); return 0; }
  if (a[0] === 'passwd' && this.users[a[1]]) { var u = this.users[a[1]]; io.o(a[1] + ':x:' + u.uid + ':' + this.groups[u.group].gid + '::' + u.home + ':/bin/bash\n'); return 0; }
  if (a[0] === 'hosts' && this.resolveName) { var r = this.resolveName(a[1], true); if (r.ip) { io.o(pad(r.ip, 15, true) + ' ' + a[1] + '\n'); return 0; } return 2; }
  return 2;
});

/* ---------------- services (systemd-like) ---------------- */
function unitName(n) { return n.replace(/\.service$/, ''); }
function parseUnit(text) {
  var o = {}; (text || '').split('\n').forEach(function (l) { var m = /^\s*([A-Za-z]+)\s*=\s*(.*)$/.exec(l); if (m) o[m[1]] = m[2].trim(); }); return o;
}
P.jlog = function (name, msg, pid) { var sv = this.services[name]; var key = name; if (!this.journal[key]) this.journal[key] = []; this.journal[key].push(jtime(this.clock) + ' ' + this.hostname + ' ' + name + '[' + (pid || 1) + ']: ' + msg); void sv; };
P.portHolder = function (port, exceptService) { var h = null; this.procs.forEach(function (p) { if ((p.ports || []).indexOf(port) >= 0 && p.service !== exceptService) h = p; }); return h; };
P.spawnService = function (name) {
  var sv = this.services[name], u = parseUnit(sv.loaded), ex = (u.ExecStart || sv.cmd || name);
  this.procs = this.procs.filter(function (p) { return p.service !== name; });
  var pid = this.addProc({ user: u.User || 'root', cpu: sv.cpu || 0.3, mem: 0.6, cmd: ex.replace(/^[-@+!]+/, ''), ports: sv.port ? [sv.port] : [], service: name });
  sv.pid = pid; sv.state = 'active'; sv.since = this.clock; return pid;
};
P.startService = function (name, io) {
  var sv = this.services[name], self = this;
  if (!sv) { io.e('Failed to start ' + name + '.service: Unit ' + name + '.service not found.\n'); return 5; }
  var disk = this.readRaw(sv.unit);
  if (disk === null) { io.e('Failed to start ' + name + '.service: Unit ' + name + '.service not found.\n'); return 5; }
  if (sv.loaded !== disk) io.e('Warning: The unit file, source configuration file or drop-ins of ' + name + '.service changed on disk. Run \'systemctl daemon-reload\' to reload units.\n');
  if (sv.state === 'active') return 0;
  var u = parseUnit(sv.loaded), fail = null;
  var exec = u.ExecStart ? u.ExecStart.replace(/^[-@+!]+/, '').split(/\s+/)[0] : null;
  if (!exec) fail = { code: 'exit-code', msg: 'Service has no ExecStart=, ExecStop=, or SuccessAction=. Refusing.' };
  else {
    var en = null; try { en = this.walk(exec, true, true); } catch (e) { en = null; }
    if (!en) fail = { code: 'exec', msg: 'Failed to execute ' + exec + ': No such file or directory' };
    else if ((en.m & 73) === 0) fail = { code: 'exec', msg: 'Failed to execute ' + exec + ': Permission denied' };
  }
  if (!fail && u.User && !this.users[u.User]) fail = { code: 'exit-code', msg: 'Failed to determine user credentials: No such process' };
  if (!fail && u.WorkingDirectory && !this.exists(u.WorkingDirectory.replace(/^-/, ''))) fail = { code: 'exit-code', msg: 'Failed to set up working directory ' + u.WorkingDirectory + ': No such file or directory' };
  if (!fail && u.EnvironmentFile && u.EnvironmentFile[0] !== '-' && this.readRaw(u.EnvironmentFile) === null) fail = { code: 'exit-code', msg: 'Failed to load environment files: No such file or directory' };
  if (!fail && sv.reads) sv.reads.forEach(function (p) { if (fail) return; var n; try { n = self.walk(p, true, true); } catch (e) { fail = { code: 'exit-code', msg: 'cannot open ' + p + ': No such file or directory' }; return; } if (!self.can(n, 4, u.User || 'root')) fail = { code: 'exit-code', msg: 'cannot open ' + p + ': Permission denied' }; });
  if (!fail && sv.writes) sv.writes.forEach(function (p) { if (fail) return; var n; try { n = self.walk(p, true, true); } catch (e) { fail = { code: 'exit-code', msg: 'cannot write ' + p + ': No such file or directory' }; return; } if (!self.can(n, 2, u.User || 'root')) fail = { code: 'exit-code', msg: 'cannot write to ' + p + ': Permission denied' }; });
  if (!fail && sv.config) sv.config.forEach(function (c) { if (fail) return; var txt = self.readRaw(c.path); if (txt === null) { fail = { code: 'exit-code', msg: 'cannot read config ' + c.path + ': No such file or directory' }; return; } if (c.bad && new RegExp(c.bad, 'm').test(txt)) fail = { code: 'exit-code', msg: c.msg }; if (c.need && !new RegExp(c.need, 'm').test(txt)) fail = { code: 'exit-code', msg: c.msg }; });
  if (!fail && sv.port) { var h = this.portHolder(sv.port, name); if (h) fail = { code: 'exit-code', msg: 'bind() to 0.0.0.0:' + sv.port + ' failed (98: Address already in use)' }; }
  this.tick();
  this.jlog(name, 'Starting ' + (sv.desc || name) + '...');
  if (fail) {
    this.jlog(name, fail.msg); this.jlog(name, 'Main process exited, code=exited, status=1/FAILURE'); this.jlog(name, 'Failed with result \'' + fail.code + '\'.');
    sv.state = 'failed'; sv.result = fail.code;
    io.e('Job for ' + name + '.service failed because the control process exited with error code.\nSee "systemctl status ' + name + '.service" and "journalctl -xeu ' + name + '.service" for details.\n'); return 1;
  }
  this.spawnService(name); this.jlog(name, 'Started ' + (sv.desc || name) + '.', sv.pid); return 0;
};
P.stopService = function (name) { var sv = this.services[name]; this.procs = this.procs.filter(function (p) { return p.service !== name; }); if (sv) { sv.state = 'inactive'; sv.pid = null; this.jlog(name, 'Stopped ' + (sv.desc || name) + '.'); } };
def('systemctl', function (a, io) {
  var o = opts(a.filter(function (x) { return x !== '--no-pager'; })), cmd = o.rest[0], names = o.rest.slice(1).map(unitName), self = this, rc = 0;
  if (!cmd) { io.o('UNIT LOAD ACTIVE SUB DESCRIPTION\n'); return 0; }
  var mutating = /^(start|stop|restart|reload|enable|disable|daemon-reload|try-restart)$/.test(cmd);
  if (mutating && this.eu !== 'root') { io.e('Failed to ' + cmd + ' ' + (names[0] || '') + '.service: Interactive authentication required.\nSee system logs and \'systemctl status ' + (names[0] || '') + '.service\' for details.\n'); return 1; }
  if (cmd === 'daemon-reload') { Object.keys(this.services).forEach(function (n) { var t = self.readRaw(self.services[n].unit); if (t !== null) self.services[n].loaded = t; }); return 0; }
  if (cmd === 'list-units' || cmd === 'list-unit-files') {
    io.o('UNIT                 LOAD   ACTIVE   SUB\n'); Object.keys(this.services).sort().forEach(function (n) { var s = self.services[n]; if (o.f.failed && s.state !== 'failed') return; io.o(pad(n + '.service', 20, true) + ' loaded ' + pad(s.state === 'active' ? 'active' : s.state, 8, true) + ' ' + (s.state === 'active' ? 'running' : s.state === 'failed' ? 'failed' : 'dead') + '\n'); }); return 0;
  }
  if (o.f.failed && !cmd) return 0;
  names.forEach(function (n) {
    var sv = self.services[n];
    if (cmd === 'start') { var r = self.startService(n, io); if (r) rc = r; return; }
    if (cmd === 'stop') { if (!sv) { io.e('Failed to stop ' + n + '.service: Unit ' + n + '.service not loaded.\n'); rc = 5; return; } self.stopService(n); return; }
    if (cmd === 'restart' || cmd === 'try-restart') { if (!sv) { io.e('Failed to restart ' + n + '.service: Unit ' + n + '.service not found.\n'); rc = 5; return; } self.stopService(n); var r2 = self.startService(n, io); if (r2) rc = r2; return; }
    if (cmd === 'reload') { if (!sv || sv.state !== 'active') { io.e('Failed to reload ' + n + '.service: Unit ' + n + '.service is not active.\n'); rc = 1; } return; }
    if (cmd === 'enable' || cmd === 'disable') { if (!sv) { io.e('Failed to ' + cmd + ' unit: Unit file ' + n + '.service does not exist.\n'); rc = 1; return; } sv.enabled = cmd === 'enable'; io.e(cmd === 'enable' ? 'Created symlink /etc/systemd/system/multi-user.target.wants/' + n + '.service -> ' + sv.unit + '.\n' : 'Removed /etc/systemd/system/multi-user.target.wants/' + n + '.service.\n'); return; }
    if (cmd === 'is-active') { var st = sv ? sv.state : 'inactive'; io.o(st + '\n'); if (st !== 'active') rc = 3; return; }
    if (cmd === 'is-enabled') { io.o((sv && sv.enabled ? 'enabled' : 'disabled') + '\n'); if (!(sv && sv.enabled)) rc = 1; return; }
    if (cmd === 'is-failed') { var f = sv && sv.state === 'failed'; io.o((f ? 'failed' : sv ? sv.state : 'inactive') + '\n'); if (!f) rc = 1; return; }
    if (cmd === 'status') {
      if (!sv || self.readRaw(sv.unit) === null) { io.e('Unit ' + n + '.service could not be found.\n'); rc = 4; return; }
      var disk = self.readRaw(sv.unit), act = sv.state === 'active' ? 'active (running) since ' + jtime(sv.since || self.clock) + ' UTC' : sv.state === 'failed' ? 'failed (Result: ' + (sv.result || 'exit-code') + ') since ' + jtime(self.clock) + ' UTC' : 'inactive (dead)';
      io.o('* ' + n + '.service - ' + (sv.desc || n) + '\n     Loaded: loaded (' + sv.unit + '; ' + (sv.enabled ? 'enabled' : 'disabled') + '; preset: enabled)\n     Active: ' + act + '\n');
      if (sv.state === 'active' && sv.pid) io.o('   Main PID: ' + sv.pid + ' (' + (parseUnit(sv.loaded).ExecStart || n).split(' ')[0].split('/').pop() + ')\n');
      if (disk !== sv.loaded) io.o('\nWarning: The unit file, source configuration file or drop-ins of ' + n + '.service changed on disk. Run \'systemctl daemon-reload\' to reload units.\n');
      var j = (self.journal[n] || []).slice(-5); if (j.length) io.o('\n' + j.join('\n') + '\n');
      if (sv.state !== 'active') rc = 3; return;
    }
    io.e('Unknown command verb ' + cmd + '.\n'); rc = 1;
  });
  return rc;
});
def('service', function (a, io) { var cmd = a[1], n = a[0]; return this.exec(['systemctl', cmd, n], io); }, { dir: '/usr/sbin' });
def('journalctl', function (a, io) {
  var o = opts(a.filter(function (x) { return x !== '--no-pager' && x !== '-x' && x !== '-e' && x !== '-xe'; }), ['u', 'n', 'p', 'since', 'unit', 'lines'], { unit: 'v', lines: 'v', since: 'v', priority: 'v' });
  var unit = o.f.u || o.f.unit, n = o.f.n || o.f.lines, lines = [], self = this;
  if (unit) { lines = this.journal[unitName(String(unit))] || []; if (!this.services[unitName(String(unit))] && !this.journal[unitName(String(unit))]) { io.o('-- No entries --\n'); return 0; } }
  else Object.keys(this.journal).forEach(function (k) { lines = lines.concat(self.journal[k]); });
  if (!unit) lines = lines.slice().sort();
  if (o.f.p) lines = lines.filter(function (l) { return /error|fail|denied|refused|critical|cannot|unable/i.test(l); });
  if (n) lines = lines.slice(-parseInt(n, 10));
  io.o('-- Logs begin at ' + jtime(this.clock - 864e5) + ' --\n' + lines.join('\n') + (lines.length ? '\n' : '')); return 0;
});

/* ---------------- cron ---------------- */
def('crontab', function (a, io) {
  var o = opts(a, ['u']), user = o.f.u || this.eu, self = this;
  if (o.f.u && this.eu !== 'root') { io.e('must be privileged to use -u\n'); return 1; }
  if (o.f.l) { if (this.cron[user] === undefined) { io.e('no crontab for ' + user + '\n'); return 1; } io.o(this.cron[user]); return 0; }
  if (o.f.r) { delete this.cron[user]; return 0; }
  if (o.f.e) {
    if (!this.opts.edit) { io.e('crontab -e needs the browser editor. Use: crontab FILE, after writing the FILE with echo or a here-document.\n'); return 1; }
    return (async function () { var res = await self.opts.edit('crontab', self.cron[user] || ''); if (res === null || res === undefined) return 0; return self.installCron(user, res, io); })();
  }
  if (o.rest.length) { var txt; try { txt = this.readFile(o.rest[0]); } catch (e) { io.e('crontab: ' + o.rest[0] + ': ' + (e.msg || 'error') + '\n'); return 1; } return this.installCron(user, txt, io); }
  io.e('usage: crontab [-u user] file | -l | -r | -e\n'); return 1;
});
P.installCron = function (user, txt, io) {
  var bad = null;
  txt.split('\n').forEach(function (l, i) { var t = l.trim(); if (!t || t[0] === '#' || /^[A-Za-z_]\w*\s*=/.test(t)) return; var f = t.split(/\s+/); if (f.length < 6) bad = bad || ('"crontab":' + (i + 1) + ': bad minute\nerrors in crontab file, can\'t install.'); });
  if (bad) { io.e(bad + '\n'); return 1; }
  if (txt && txt.slice(-1) !== '\n') { io.e('"crontab": premature EOF: the last line needs a newline\nerrors in crontab file, can\'t install.\n'); return 1; }
  this.cron[user] = txt; return 0;
};
def('cron-tick', async function (a, io) {
  /* MARGA simulator tool: run every job of the user once, the way cron does (small environment, home directory, sh). */
  var user = a[0] || this.eu, txt = this.cron[user];
  if (txt === undefined) { io.e('cron-tick: no crontab for ' + user + '\n'); return 1; }
  var jobs = txt.split('\n').filter(function (l) { var t = l.trim(); return t && t[0] !== '#' && !/^[A-Za-z_]\w*\s*=/.test(t); });
  var cronEnv = { PATH: '/usr/bin:/bin', SHELL: '/bin/sh', HOME: this.users[user].home, LOGNAME: user };
  txt.split('\n').forEach(function (l) { var m = /^([A-Za-z_]\w*)\s*=\s*(.*)$/.exec(l.trim()); if (m) cronEnv[m[1]] = m[2].replace(/^["']|["']$/g, ''); });
  var rc = 0, self = this;
  for (var i = 0; i < jobs.length; i++) {
    var f = jobs[i].trim().split(/\s+/), cmd = f.slice(5).join(' ').replace(/(^|[^\\])%/g, '$1\n').replace(/\\%/g, '%');
    var snap = this.snapshot(), buf = '';
    this.eu = user; this.env = Object.assign({}, cronEnv); this.vars = {}; this.cwd = this.users[user].home;
    var st;
    try { st = await this.runScript(cmd.split('\n')[0], [], { in: cmd.indexOf('\n') >= 0 ? { data: cmd.split('\n').slice(1).join('\n') + '\n', pos: 0 } : null, o: function (s) { buf += s; }, e: function (s) { buf += s; } }, 'sh'); } catch (e) { st = 1; }
    this.restore(snap);
    io.o('[cron-tick] ' + jobs[i].trim().slice(0, 70) + '\n  exit ' + st + (buf ? ' output: ' + buf.trim().split('\n').join(' | ').slice(0, 160) : '') + '\n');
    if (st) rc = 1;
  }
  if (!jobs.length) io.o('[cron-tick] no jobs\n');
  return rc;
});

/* ---------------- Python hook ---------------- */
T.PY_DRIVER = [
  'import sys, os, io, json, runpy, tempfile, shutil, traceback, contextlib',
  'def _marga_run(spec_json):',
  '    spec = json.loads(spec_json)',
  '    tmp = tempfile.mkdtemp(prefix="marga_")',
  '    old = os.getcwd()',
  '    for rel, txt in spec["files"].items():',
  '        p = os.path.join(tmp, rel)',
  '        os.makedirs(os.path.dirname(p), exist_ok=True)',
  '        with open(p, "w", newline="") as f:',
  '            f.write(txt)',
  '    os.chdir(tmp)',
  '    out = io.StringIO(); err = io.StringIO(); code = 0',
  '    old_argv, old_path, old_in = sys.argv, list(sys.path), sys.stdin',
  '    sys.path.insert(0, tmp)',
  '    sys.stdin = io.StringIO(spec.get("stdin", ""))',
  '    mods_before = set(sys.modules)',
  '    env_backup = dict(os.environ)',
  '    os.environ.update(spec.get("env", {}))',
  '    files = {}',
  '    try:',
  '        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):',
  '            try:',
  '                if spec.get("code") is not None:',
  '                    sys.argv = ["-c"] + spec["args"]',
  '                    exec(compile(spec["code"], "<string>", "exec"), {"__name__": "__main__"})',
  '                elif spec.get("module"):',
  '                    sys.argv = [spec["module"]] + spec["args"]',
  '                    runpy.run_module(spec["module"], run_name="__main__", alter_sys=True)',
  '                else:',
  '                    sys.argv = [spec["script"]] + spec["args"]',
  '                    runpy.run_path(spec["script"], run_name="__main__")',
  '            except SystemExit as e:',
  '                c = e.code',
  '                if c is None:',
  '                    code = 0',
  '                elif isinstance(c, int):',
  '                    code = c',
  '                else:',
  '                    err.write(str(c) + "\\n"); code = 1',
  '            except BaseException:',
  '                err.write(traceback.format_exc()); code = 1',
  '    finally:',
  '        for root, dirs, fnames in os.walk(tmp):',
  '            dirs[:] = [d for d in dirs if d != "__pycache__"]',
  '            for fn in fnames:',
  '                p = os.path.join(root, fn)',
  '                try:',
  '                    with open(p, "r", newline="") as f:',
  '                        files[os.path.relpath(p, tmp)] = f.read()',
  '                except Exception:',
  '                    pass',
  '        os.chdir(old)',
  '        for m in list(sys.modules):',
  '            if m in mods_before: continue',
  '            f = getattr(sys.modules[m], "__file__", None)',
  '            if f and f.startswith(tmp): sys.modules.pop(m, None)',
  '        shutil.rmtree(tmp, ignore_errors=True)',
  '        sys.argv = old_argv; sys.path[:] = old_path; sys.stdin = old_in',
  '        os.environ.clear(); os.environ.update(env_backup)',
  '    e = err.getvalue().replace(tmp, spec.get("cwd", "."))',
  '    return json.dumps({"code": code, "out": out.getvalue(), "err": e, "files": files})'
].join('\n') + '\n';
P.collectPyFiles = function () {
  var self = this, files = {}, count = 0, base = this.cwd;
  (function walk(abs, rel) {
    var n; try { n = self.walk(abs, true, true); } catch (e) { return; }
    if (n.t === 'f') { if (count++ < 300 && n.d.length < 300000 && self.can(n, 4)) files[rel] = n.d; return; }
    if (n.t === 'd') Object.keys(n.c).forEach(function (k) { if (k[0] === '.' && k !== '.env') return; walk((abs === '/' ? '' : abs) + '/' + k, rel ? rel + '/' + k : k); });
  })(base, '');
  return files;
};
def('python3 python', async function (a, io) {
  var self = this, spec = { files: null, args: [], cwd: this.cwd, env: {}, stdin: '' }, i = 0;
  if (a[0] === '--version' || a[0] === '-V') { io.o('Python 3.12 (labs use whatever Python your browser or test machine provides)\n'); return 0; }
  while (i < a.length && a[i][0] === '-' && a[i] !== '-') {
    if (a[i] === '-c') { spec.code = a[i + 1]; i += 2; break; }
    if (a[i] === '-m') { spec.module = a[i + 1]; i += 2; break; }
    i++;
  }
  if (spec.code === undefined && !spec.module) { if (a[i] === undefined) { io.e('Interactive Python is not available here. Run a file: python3 script.py, or use python3 -c "code".\n'); return 2; } spec.script = a[i]; i++; }
  spec.args = a.slice(i);
  if (spec.script) { var sn; try { sn = this.stat(spec.script); } catch (e) { io.e('python3: can\'t open file \'' + this.abs(spec.script) + '\': [Errno 2] No such file or directory\n'); return 2; } if (sn.t !== 'f') { io.e('python3: can\'t find \'__main__\' module\n'); return 1; } if (spec.script[0] === '/' && this.abs(spec.script).indexOf(this.cwd + '/') !== 0) { io.e('python3: in this simulator, run scripts that are inside the current directory (use cd first).\n'); return 2; } spec.script = this.abs(spec.script).slice(this.cwd === '/' ? 1 : this.cwd.length + 1); }
  spec.files = this.collectPyFiles(); spec.stdin = io.in ? T.readAll(io.in) : '';
  Object.keys(this.env).forEach(function (k) { spec.env[k] = String(self.env[k]); });
  if (!this.opts.python) { io.e('python3: Python is not available in this environment.\n'); return 127; }
  var res;
  try { res = await this.opts.python(spec); } catch (e) { io.e('python3: ' + (e && e.message ? e.message : 'could not run Python') + '\n'); return 127; }
  io.o(res.out); io.e(res.err);
  /* write back changes */
  var before = spec.files, after = res.files || {};
  Object.keys(after).forEach(function (rel) { if (before[rel] !== after[rel]) { var abs = self.cwd + '/' + rel; try { var ex = self.exists(abs); if (ex) self.writeFile(abs, after[rel], false); else { self.mkdirp(T.dirname(abs), 493, self.eu, self.users[self.eu].group); self.setFile(abs, after[rel], 420, self.eu, self.users[self.eu].group); } } catch (e2) { if (!(e2 instanceof T.FsErr)) throw e2; } } });
  Object.keys(before).forEach(function (rel) { if (!(rel in after)) { try { self.remove(self.cwd + '/' + rel, false); } catch (e3) { /* ignore */ } } });
  return res.code;
});
if (typeof module === 'object' && module.exports) module.exports = T;
}());
