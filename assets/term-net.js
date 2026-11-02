/* MARGA terminal engine, part 9: a simulated network. Nothing here touches a real network.
   Names, routes, firewall and servers come from the lab's own scenario data. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-sys.js') : window.MargaTerm;
var def = T.def, opts = T.parseOpts, pad = T.pad, P = T.Session.prototype;
function ip2n(ip) { var p = String(ip).split('.'); if (p.length !== 4) return null; var n = 0; for (var i = 0; i < 4; i++) { var x = parseInt(p[i], 10); if (isNaN(x) || x < 0 || x > 255 || !/^\d+$/.test(p[i])) return null; n = n * 256 + x; } return n; }
function n2ip(n) { return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.'); }
function mask(prefix) { return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0; }
function inNet(ip, netip, prefix) { var a = ip2n(ip), b = ip2n(netip); if (a === null || b === null) return false; var m = mask(prefix); return ((a & m) >>> 0) === ((b & m) >>> 0); }
function netAddr(ip, prefix) { return n2ip(((ip2n(ip) & mask(prefix)) >>> 0)); }
T.net = { ip2n: ip2n, n2ip: n2ip, inNet: inNet };
function isIp(s) { return ip2n(s) !== null; }

P.netState = function () {
  var n = this.net;
  if (!n) n = this.net = {};
  if (!n.iface) n.iface = { name: 'eth0', mtu: 1500, up: true };
  if (n.iface.up === undefined) n.iface.up = true; if (!n.iface.name) n.iface.name = 'eth0'; if (!n.iface.mtu) n.iface.mtu = 1500;
  if (!n.iface.addrs) { n.iface.addrs = n.iface.ip ? [{ ip: n.iface.ip, prefix: n.iface.prefix || 24 }] : []; }
  if (!n.routes) n.routes = n.gateway ? [{ dst: 'default', via: n.gateway }] : [];
  if (!n.dns) n.dns = {}; if (!n.hosts) n.hosts = {}; if (!n.clients) n.clients = {};
  if (!n.ufw) n.ufw = { active: false, default: 'deny', rules: [] };
  return n;
};
P.localIps = function () { return this.netState().iface.addrs.map(function (a) { return a.ip; }).concat(['127.0.0.1']); };
P.primaryIp = function () { var a = this.netState().iface.addrs; return a.length ? a[0].ip : null; };
P.onLink = function (ip) { var i = this.netState().iface; if (!i.up) return false; return i.addrs.some(function (a) { return inNet(ip, a.ip, a.prefix); }); };
P.resolvConf = function () { var t = this.readRaw('/etc/resolv.conf') || ''; var s = []; t.split('\n').forEach(function (l) { var m = /^\s*nameserver\s+(\S+)/.exec(l); if (m) s.push(m[1]); }); return s; };
P.hostsLookup = function (name) {
  var t = this.readRaw('/etc/hosts') || '', found = null;
  t.split('\n').forEach(function (l) { var f = l.replace(/#.*/, '').trim().split(/\s+/); if (f.length >= 2 && !found && f.slice(1).indexOf(name) >= 0) found = f[0]; });
  return found;
};
P.dnsQuery = function (name, server) {
  var n = this.netState(), s = n.dns[server];
  if (!s || s.up === false) return { error: 'timeout', server: server };
  var rec = s.records && s.records[name];
  if (!rec) return { error: 'nxdomain', server: server };
  return { ip: rec, server: server };
};
P.resolveName = function (name, hostsOnly) {
  if (isIp(name)) return { ip: name, via: 'literal' };
  if (name === 'localhost') return { ip: '127.0.0.1', via: 'hosts' };
  var h = this.hostsLookup(name); if (h) return { ip: h, via: 'hosts' };
  if (name === this.hostname) return { ip: this.primaryIp() || '127.0.1.1', via: 'hosts' };
  var servers = this.resolvConf();
  if (!servers.length) return { error: 'nonames' };
  for (var i = 0; i < servers.length; i++) { var r = this.dnsQuery(name, servers[i]); if (r.ip) return { ip: r.ip, via: 'dns', server: servers[i] }; if (r.error === 'nxdomain') return { error: 'nxdomain', server: servers[i] }; }
  return { error: 'timeout' };
};
P.routeTo = function (ip) {
  var n = this.netState();
  if (ip.indexOf('127.') === 0 || this.localIps().indexOf(ip) >= 0) return { local: true };
  if (!n.iface.up) return { err: 'Network is unreachable' };
  if (this.onLink(ip)) return { onlink: true };
  var best = null, self = this;
  n.routes.forEach(function (r) {
    var ok = false, plen = 0;
    if (r.dst === 'default') { ok = true; plen = 0; } else { var pr = r.dst.split('/'); plen = parseInt(pr[1] || '32', 10); ok = inNet(ip, pr[0], plen); }
    if (ok && (!best || plen > best.plen)) best = { r: r, plen: plen };
  });
  if (!best) return { err: 'Network is unreachable' };
  if (best.r.via && !self.onLink(best.r.via)) return { err: 'Network is unreachable' };
  return { via: best.r.via };
};
P.ufwAllows = function (port, from) {
  var u = this.netState().ufw;
  if (!u.active) return true;
  for (var i = 0; i < u.rules.length; i++) { var r = u.rules[i]; var fromOk = r.from === 'any' || r.from === from || (r.from.indexOf('/') > 0 && inNet(from, r.from.split('/')[0], parseInt(r.from.split('/')[1], 10))); if (r.port === port && fromOk) return r.action === 'allow'; }
  return u.default === 'allow';
};
P.localListener = function (port) { var f = null; this.procs.forEach(function (p) { if ((p.ports || []).indexOf(port) >= 0) f = p; }); return f; };
/* connect: returns {state:'open'|'closed'|'filtered'|'noroute', ...} */
P.connect = function (ip, port) {
  var n = this.netState(), rt = this.routeTo(ip);
  if (n.vp) {
    var cl = n.clients[n.vp];
    if (this.localIps().indexOf(ip) < 0 && ip.indexOf('127.') !== 0) return { state: 'filtered' };
    var l0 = this.localListener(port);
    if (!this.ufwAllows(port, cl.ip)) return { state: 'filtered' };
    return l0 ? { state: 'open', proc: l0 } : { state: 'closed' };
  }
  if (rt.err) return { state: 'noroute', err: rt.err };
  if (rt.local) { var l = this.localListener(port); return l ? { state: 'open', proc: l } : { state: 'closed' }; }
  var h = n.hosts[ip];
  if (!h || h.up === false) return { state: rt.onlink ? 'hostdown' : 'filtered', onlink: !!rt.onlink };
  var st = (h.ports && h.ports[String(port)]) || 'closed';
  return { state: st, host: h };
};
function ms(x) { return (Math.round(x * 10) / 10).toFixed(1); }

def('ping', function (a, io) {
  var o = opts(a, ['c', 's', 'W', 'w', 'i', 'M', 'I']), host = o.rest[0], self = this, n = this.netState();
  if (!host) { io.e('ping: usage error: Destination address required\n'); return 2; }
  var count = o.f.c ? parseInt(o.f.c, 10) : 4;
  var r = this.resolveName(host);
  if (r.error) { io.e('ping: ' + host + ': ' + (r.error === 'timeout' ? 'Temporary failure in name resolution' : 'Name or service not known') + '\n'); return 2; }
  var rt = this.routeTo(r.ip);
  if (rt.err) { io.e('ping: connect: ' + rt.err + '\n'); return 2; }
  var size = o.f.s ? parseInt(o.f.s, 10) : 56;
  io.o('PING ' + host + ' (' + r.ip + ') ' + size + '(' + (size + 28) + ') bytes of data.\n');
  var recv = 0, rtts = [], h = rt.local ? { up: true, rtt: 0.05, icmp: true } : n.hosts[r.ip];
  var local = rt.local;
  for (var i = 1; i <= count; i++) {
    if (h && h.up !== false && h.icmp !== false) {
      if (h.pathMtu && o.f.M === 'do' && size + 28 > h.pathMtu) { io.o('From ' + (h.mtuHop || r.ip) + ' icmp_seq=' + i + ' Frag needed and DF set (mtu = ' + h.pathMtu + ')\n'); continue; }
      var t = (h.rtt || 10) + (i % 3) * 0.2 + (i === 1 ? 0.4 : 0); rtts.push(t); recv++;
      io.o((size + 8) + ' bytes from ' + (local ? (host === 'localhost' ? 'localhost (127.0.0.1)' : r.ip) : r.ip) + ': icmp_seq=' + i + ' ttl=' + (local ? 64 : 62) + ' time=' + ms(t) + ' ms\n');
    } else if (rt.onlink) io.o('From ' + self.primaryIp() + ' icmp_seq=' + i + ' Destination Host Unreachable\n');
  }
  io.o('\n--- ' + host + ' ping statistics ---\n' + count + ' packets transmitted, ' + recv + ' received, ' + Math.round((count - recv) * 100 / count) + '% packet loss, time ' + ((count - 1) * 1000 + 3) + 'ms\n');
  if (rtts.length) { var mn = Math.min.apply(null, rtts), mx = Math.max.apply(null, rtts), av = rtts.reduce(function (s, x) { return s + x; }, 0) / rtts.length; io.o('rtt min/avg/max/mdev = ' + ms(mn) + '/' + ms(av) + '/' + ms(mx) + '/0.2 ms\n'); }
  return recv ? 0 : 1;
}, { dir: '/usr/bin' });

def('traceroute tracepath', function (a, io) {
  var o = opts(a), host = o.rest[0], n = this.netState();
  var r = this.resolveName(host);
  if (r.error) { io.e(host + ': Name or service not known\nCannot handle "host" cmdline arg `' + host + '\' on position 1 (argc 1)\n'); return 2; }
  var rt = this.routeTo(r.ip);
  if (rt.err) { io.e('traceroute to ' + host + ' (' + r.ip + '), 30 hops max, 60 byte packets\nconnect: ' + rt.err + '\n'); return 2; }
  io.o('traceroute to ' + host + ' (' + r.ip + '), 30 hops max, 60 byte packets\n');
  var hdef = n.hosts[r.ip], path = hdef && hdef.path ? hdef.path : [];
  path.forEach(function (hop, i) {
    if (hop.ms === null || hop.ms === undefined) { io.o(pad(i + 1, 2) + '  * * *\n'); return; }
    io.o(pad(i + 1, 2) + '  ' + hop.ip + '  ' + ms(hop.ms) + ' ms  ' + ms(hop.ms + 0.3) + ' ms  ' + ms(hop.ms - 0.2 > 0 ? hop.ms - 0.2 : hop.ms) + ' ms\n');
  });
  if (!hdef || hdef.up === false) { io.o(pad(path.length + 1, 2) + '  * * *\n'); return 0; }
  io.o(pad(path.length + 1, 2) + '  ' + r.ip + '  ' + ms(hdef.rtt || 10) + ' ms  ' + ms((hdef.rtt || 10) + 0.2) + ' ms  ' + ms((hdef.rtt || 10) - 0.1) + ' ms\n');
  return 0;
});

def('dig', function (a, io) {
  var server = null, name = null, type = 'A', short = false, self = this;
  a.forEach(function (x) { if (x[0] === '@') server = x.slice(1); else if (x === '+short') short = true; else if (x[0] === '+') return; else if (!name) name = x; else type = x.toUpperCase(); });
  if (!name) { io.o('; <<>> DiG 9.18 <<>>\n;; global options: +cmd\n'); return 0; }
  var servers = server ? [server] : this.resolvConf();
  if (!servers.length) { io.e(';; no servers could be reached\n'); return 9; }
  var res = null, tried = 0;
  for (var i = 0; i < servers.length; i++) { var r = this.dnsQuery(name, servers[i]); tried++; if (r.error === 'timeout') { if (!short) io.o(';; communications error to ' + servers[i] + '#53: timed out\n'); continue; } res = r; break; }
  if (!res) { io.o(';; no servers could be reached\n'); return 9; }
  if (short) { if (res.ip && type === 'A') io.o(res.ip + '\n'); return 0; }
  io.o('\n; <<>> DiG 9.18 <<>> ' + name + '\n;; global options: +cmd\n;; Got answer:\n;; ->>HEADER<<- opcode: QUERY, status: ' + (res.ip ? 'NOERROR' : 'NXDOMAIN') + ', id: 4172\n;; flags: qr rd ra; QUERY: 1, ANSWER: ' + (res.ip ? 1 : 0) + ', AUTHORITY: 0, ADDITIONAL: 1\n\n;; QUESTION SECTION:\n;' + name + '.\t\t\tIN\t' + type + '\n');
  if (res.ip && type === 'A') io.o('\n;; ANSWER SECTION:\n' + name + '.\t\t300\tIN\tA\t' + res.ip + '\n');
  io.o('\n;; Query time: ' + (4 + tried * 3) + ' msec\n;; SERVER: ' + res.server + '#53(' + res.server + ') (UDP)\n;; MSG SIZE  rcvd: 60\n\n');
  void self; return 0;
}, { dir: '/usr/bin' });
def('nslookup', function (a, io) {
  var name = a[0], server = a[1] || null, servers = server ? [server] : this.resolvConf();
  if (!name) return 0;
  for (var i = 0; i < servers.length; i++) {
    var r = this.dnsQuery(name, servers[i]);
    if (r.error === 'timeout') continue;
    io.o('Server:\t\t' + servers[i] + '\nAddress:\t' + servers[i] + '#53\n\n');
    if (r.ip) { io.o('Non-authoritative answer:\nName:\t' + name + '\nAddress: ' + r.ip + '\n'); return 0; }
    io.o('** server can\'t find ' + name + ': NXDOMAIN\n\n'); return 1;
  }
  io.o(';; communications error to ' + (servers[0] || 'resolver') + '#53: timed out\n;; no servers could be reached\n\n'); return 1;
});
def('host', function (a, io) {
  var name = a[0], r = this.resolveName(name);
  if (r.error === 'timeout') { io.o(';; communications error to ' + (this.resolvConf()[0] || '') + '#53: timed out\n;; no servers could be reached\n'); return 1; }
  if (r.error) { io.o('Host ' + name + ' not found: 3(NXDOMAIN)\n'); return 1; }
  io.o(name + ' has address ' + r.ip + '\n'); return 0;
});

function parseUrl(u) {
  var m = /^(?:([a-z]+):\/\/)?([^\/:?#]+)(?::(\d+))?([^?#]*)?(\?[^#]*)?/i.exec(u);
  if (!m) return null;
  var scheme = (m[1] || 'http').toLowerCase();
  return { scheme: scheme, host: m[2], port: m[3] ? parseInt(m[3], 10) : (scheme === 'https' ? 443 : 80), path: (m[4] || '/') + (m[5] || '') };
}
def('curl', function (a, io) {
  var f = {}, url = null, headers = [], self = this, out = null, i, fmtW = null;
  for (i = 0; i < a.length; i++) {
    var x = a[i];
    if (x === '-o') out = a[++i]; else if (x === '-H') headers.push(a[++i]); else if (x === '-X') f.X = a[++i]; else if (x === '-d' || x === '--data') { f.d = a[++i]; } else if (x === '-m' || x === '--max-time' || x === '--connect-timeout') f.m = a[++i];
    else if (x === '-w' || x === '--write-out') fmtW = a[++i]; else if (x === '--resolve') f.resolve = a[++i]; else if (x === '-u' || x === '-A' || x === '-e') i++;
    else if (/^-[a-zA-Z]+$/.test(x)) x.slice(1).split('').forEach(function (c) { f[c] = true; });
    else if (/^--/.test(x)) f[x.slice(2)] = true;
    else url = x;
  }
  if (!url) { io.e('curl: try \'curl --help\' for more information\n'); return 2; }
  var u = parseUrl(url);
  var silent = f.s && !f.S, rc = 0;
  function fail(code, msg) { if (!silent) io.e('curl: (' + code + ') ' + msg + '\n'); return code; }
  var r = this.resolveName(u.host);
  if (r.error) { if (r.error === 'timeout' || r.error === 'nxdomain' || r.error === 'nonames') return fail(6, 'Could not resolve host: ' + u.host); }
  var c = this.connect(r.ip, u.port);
  if (f.v) io.e('* Host ' + u.host + ':' + u.port + ' was resolved.\n*   Trying ' + r.ip + ':' + u.port + '...\n');
  if (c.state === 'noroute') return fail(7, 'Failed to connect to ' + u.host + ' port ' + u.port + ' after 0 ms: ' + c.err);
  if (c.state === 'closed') return fail(7, 'Failed to connect to ' + u.host + ' port ' + u.port + ' after 3 ms: Couldn\'t connect to server');
  if (c.state === 'hostdown') return fail(7, 'Failed to connect to ' + u.host + ' port ' + u.port + ' after 3003 ms: No route to host');
  if (c.state === 'filtered') return fail(28, 'Failed to connect to ' + u.host + ' port ' + u.port + ' after ' + (f.m ? parseInt(f.m, 10) * 1000 + 1 : 5001) + ' ms: Timeout was reached');
  var resp, host = c.host;
  if (c.proc) { var sv = c.proc.service && this.services[c.proc.service]; resp = (sv && sv.http) || c.proc.http || {}; resp = resp[u.path] || (resp.status ? resp : null) || (c.proc.http === undefined && !(sv && sv.http) ? { status: 200, body: 'OK\n' } : { status: 404, body: 'Not Found\n' }); }
  else { var pages = host && host.http; resp = pages ? (pages[u.path] || pages['*'] || { status: 404, body: 'Not Found\n' }) : { status: 200, body: 'OK\n' }; }
  if (u.scheme === 'https' && host && host.tls && !f.k) {
    if (host.tls.expired) return fail(60, 'SSL certificate problem: certificate has expired\nMore details here: https://curl.se/docs/sslcerts.html');
    if (host.tls.selfSigned) return fail(60, 'SSL certificate problem: self-signed certificate');
    if (host.tls.wrongName) return fail(60, 'SSL: no alternative certificate subject name matches target host name \'' + u.host + '\'');
  }
  if (u.scheme === 'http' && c.host && c.host.ports && c.host.ports[String(u.port)] === 'open' && c.host.tlsOnly) return fail(52, 'Empty reply from server');
  var status = resp.status || 200, reason = { 200: 'OK', 201: 'Created', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable' }[status] || 'Status';
  var body = resp.body === undefined ? '' : resp.body;
  if (f.v) io.e('* Connected to ' + u.host + ' (' + r.ip + ') port ' + u.port + '\n> ' + (f.X || (f.d ? 'POST' : 'GET')) + ' ' + u.path + ' HTTP/1.1\n> Host: ' + u.host + (u.port !== 80 && u.port !== 443 ? ':' + u.port : '') + '\n> User-Agent: curl/8.5.0\n> Accept: */*\n' + headers.map(function (h) { return '> ' + h + '\n'; }).join('') + '>\n< HTTP/1.1 ' + status + ' ' + reason + '\n< Content-Type: ' + (resp.type || 'text/plain') + '\n< Content-Length: ' + body.length + '\n<\n');
  if (f.I) { io.o('HTTP/1.1 ' + status + ' ' + reason + '\nContent-Type: ' + (resp.type || 'text/plain') + '\nContent-Length: ' + body.length + '\n\n'); }
  else if (f.i) { io.o('HTTP/1.1 ' + status + ' ' + reason + '\nContent-Type: ' + (resp.type || 'text/plain') + '\nContent-Length: ' + body.length + '\n\n'); }
  if (f.f && status >= 400) { return fail(22, 'The requested URL returned error: ' + status); }
  if (!f.I) { if (out) { try { this.writeFile(out, body, false); } catch (e) { if (e instanceof T.FsErr) { return fail(23, 'Failure writing output to destination'); } throw e; } } else io.o(body); }
  if (fmtW) io.o(fmtW.replace(/%\{http_code\}/g, String(status)).replace(/\\n/g, '\n'));
  void rc; void self;
  return 0;
});
def('wget', function (a, io) { io.e('wget is not part of this simulator. Use curl.\n'); return 127; });
def('nc ncat', function (a, io) {
  var o = opts(a.filter(function (x) { return !/^-w\d*$/.test(x); }), ['w']), host = o.rest[0], port = parseInt(o.rest[1], 10);
  var r = this.resolveName(host);
  if (r.error) { io.e('nc: getaddrinfo for host "' + host + '" port ' + port + ': Name or service not known\n'); return 1; }
  var c = this.connect(r.ip, port);
  if (c.state === 'open') { if (o.f.v || o.f.z) io.e('Connection to ' + host + ' (' + r.ip + ') ' + port + ' port [tcp/*] succeeded!\n'); return 0; }
  io.e('nc: connect to ' + host + ' (' + r.ip + ') port ' + port + ' (tcp) failed: ' + (c.state === 'closed' ? 'Connection refused' : c.state === 'noroute' ? c.err : 'Connection timed out') + '\n'); return 1;
});
def('hostname', function (a, io) { if (a[0] === '-I' || a[0] === '-i') { io.o(this.localIps().slice(0, -1).join(' ') + ' \n'); return 0; } io.o(this.hostname + '\n'); return 0; });
def('ss netstat', function (a, io) {
  var o = opts(a), self = this, rows = [];
  this.procs.forEach(function (p) { (p.ports || []).forEach(function (port) { rows.push({ p: p, port: port }); }); });
  rows.sort(function (x, y) { return x.port - y.port; });
  var showProc = o.f.p, root = this.eu === 'root';
  if (o.f.t === undefined && o.f.l === undefined && o.f.a === undefined && !o.f.u && !o.f.n) { io.o('Netid State Recv-Q Send-Q Local Address:Port Peer Address:Port Process\n'); return 0; }
  if (o.f.a === undefined && !o.f.l) rows = [];
  io.o('State  Recv-Q Send-Q   Local Address:Port    Peer Address:Port Process\n');
  rows.forEach(function (r) {
    var proc = '';
    if (showProc && (root || r.p.user === self.eu)) proc = ' users:(("' + r.p.cmd.split(' ')[0].split('/').pop() + '",pid=' + r.p.pid + ',fd=3))';
    io.o('LISTEN ' + pad(0, 6) + pad(4096, 7) + pad((r.p.bind || '0.0.0.0') + ':' + r.port, 18) + pad('0.0.0.0:*', 18) + proc + '\n');
  });
  return 0;
}, { dir: '/usr/bin' });
def('ifconfig', function (a, io) {
  var n = this.netState(), ad = n.iface.addrs[0];
  if (!ad) { io.o(n.iface.name + ': flags=' + (n.iface.up ? '4163<UP,BROADCAST,RUNNING,MULTICAST>' : '4098<BROADCAST,MULTICAST>') + '  mtu ' + n.iface.mtu + '\n'); return 0; }
  io.o(n.iface.name + ': flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu ' + n.iface.mtu + '\n        inet ' + ad.ip + '  netmask ' + n2ip(mask(ad.prefix)) + '  broadcast ' + n2ip((ip2n(ad.ip) | (~mask(ad.prefix) >>> 0)) >>> 0) + '\n'); return 0;
}, { dir: '/usr/sbin' });

/* ip */
function parseCidr(s) { var p = s.split('/'); if (!isIp(p[0])) return null; return { ip: p[0], prefix: p.length > 1 ? parseInt(p[1], 10) : 32 }; }
def('ip', function (a, io) {
  var n = this.netState(), brief = false, args = a.filter(function (x) { if (x === '-br' || x === '-brief' || x === '-4' || x === '-s' || x === '-o') { if (x === '-br' || x === '-brief') brief = true; return false; } return true; });
  var obj = args[0] || 'addr', verb = args[1] || 'show', self = this;
  function need() { if (self.eu !== 'root') { io.e('RTNETLINK answers: Operation not permitted\n'); return false; } return true; }
  if (/^a(ddr(ess)?)?$/.test(obj)) {
    if (verb === 'show' || verb === 'list' || verb === 's' || !args[1]) {
      var i = n.iface;
      if (brief) { io.o(pad('lo', 16, true) + 'UNKNOWN        127.0.0.1/8\n' + pad(i.name, 16, true) + pad(i.up ? 'UP' : 'DOWN', 15, true) + i.addrs.map(function (x) { return x.ip + '/' + x.prefix; }).join(' ') + '\n'); return 0; }
      io.o('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN\n    inet 127.0.0.1/8 scope host lo\n2: ' + i.name + ': <BROADCAST,MULTICAST' + (i.up ? ',UP,LOWER_UP' : '') + '> mtu ' + i.mtu + ' qdisc fq_codel state ' + (i.up ? 'UP' : 'DOWN') + '\n    link/ether 02:42:0a:00:01:0f brd ff:ff:ff:ff:ff:ff\n' + i.addrs.map(function (x) { return '    inet ' + x.ip + '/' + x.prefix + ' brd ' + n2ip((ip2n(x.ip) | (~mask(x.prefix) >>> 0)) >>> 0) + ' scope global ' + i.name + '\n'; }).join(''));
      return 0;
    }
    if (verb === 'add' || verb === 'del') {
      if (!need()) return 2;
      var cd = parseCidr(args[2] || ''); if (!cd) { io.e('Error: inet prefix is expected rather than "' + (args[2] || '') + '".\n'); return 1; }
      var devI = args.indexOf('dev'); if (devI < 0 || args[devI + 1] !== n.iface.name) { io.e('Cannot find device "' + (args[devI + 1] || '') + '"\n'); return 1; }
      var idx = -1; n.iface.addrs.forEach(function (x, k) { if (x.ip === cd.ip && x.prefix === cd.prefix) idx = k; });
      if (verb === 'add') { if (idx >= 0) { io.e('RTNETLINK answers: File exists\n'); return 2; } n.iface.addrs.push(cd); return 0; }
      if (idx < 0) { io.e('RTNETLINK answers: Cannot assign requested address\n'); return 2; }
      n.iface.addrs.splice(idx, 1);
      /* routes that depended on that network stop working */
      n.routes = n.routes.filter(function (r) { return !r.via || self.onLink(r.via) || true; });
      return 0;
    }
  }
  if (/^r(oute)?$/.test(obj)) {
    if (verb === 'show' || verb === 'list' || !args[1]) {
      var out = '';
      n.routes.forEach(function (r) { if (r.dst === 'default') out += 'default via ' + r.via + ' dev ' + n.iface.name + '\n'; });
      n.routes.forEach(function (r) { if (r.dst !== 'default') out += r.dst + (r.via ? ' via ' + r.via : '') + ' dev ' + n.iface.name + '\n'; });
      if (n.iface.up) n.iface.addrs.forEach(function (x) { out += netAddr(x.ip, x.prefix) + '/' + x.prefix + ' dev ' + n.iface.name + ' proto kernel scope link src ' + x.ip + '\n'; });
      io.o(out); return 0;
    }
    if (verb === 'get') { var tgt = args[2], rt = this.routeTo(tgt); if (rt.err) { io.e('RTNETLINK answers: Network is unreachable\n'); return 2; } io.o(tgt + (rt.via ? ' via ' + rt.via : '') + ' dev ' + n.iface.name + ' src ' + this.primaryIp() + '\n'); return 0; }
    if (verb === 'add' || verb === 'replace' || verb === 'del' || verb === 'delete') {
      if (!need()) return 2;
      var dst = args[2], viaI = args.indexOf('via'), via = viaI > 0 ? args[viaI + 1] : null;
      if (dst !== 'default' && !parseCidr(dst || '')) { io.e('Error: inet prefix is expected rather than "' + dst + '".\n'); return 1; }
      var ex = -1; n.routes.forEach(function (r, k) { if (r.dst === dst) ex = k; });
      if (verb === 'del' || verb === 'delete') { if (ex < 0) { io.e('RTNETLINK answers: No such process\n'); return 2; } n.routes.splice(ex, 1); return 0; }
      if (via && !this.onLink(via)) { io.e('Error: Nexthop has invalid gateway.\n'); return 2; }
      if (!via) { io.e('Error: either "to" is duplicate, or "' + (args[3] || '') + '" is a garbage.\n'); return 1; }
      if (ex >= 0) { if (verb === 'add') { io.e('RTNETLINK answers: File exists\n'); return 2; } n.routes[ex].via = via; return 0; }
      n.routes.push({ dst: dst, via: via }); return 0;
    }
  }
  if (/^l(ink)?$/.test(obj)) {
    if (verb === 'show' || !args[1]) { var li = n.iface; io.o('1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n2: ' + li.name + ': <BROADCAST,MULTICAST' + (li.up ? ',UP,LOWER_UP' : '') + '> mtu ' + li.mtu + ' state ' + (li.up ? 'UP' : 'DOWN') + '\n    link/ether 02:42:0a:00:01:0f brd ff:ff:ff:ff:ff:ff\n'); return 0; }
    if (verb === 'set') {
      if (!need()) return 2;
      var rest = args.slice(2); if (rest[0] === 'dev') rest = rest.slice(1); if (rest[0] !== n.iface.name) { io.e('Cannot find device "' + rest[0] + '"\n'); return 1; }
      for (var k = 1; k < rest.length; k++) { if (rest[k] === 'up') n.iface.up = true; else if (rest[k] === 'down') n.iface.up = false; else if (rest[k] === 'mtu') { n.iface.mtu = parseInt(rest[++k], 10); } }
      return 0;
    }
  }
  io.e('Object "' + obj + '" is unknown, try "ip help".\n'); return 1;
}, { dir: '/usr/sbin' });

/* ufw */
def('ufw', function (a, io) {
  var n = this.netState(), u = n.ufw, sub = a[0];
  if (this.eu !== 'root') { io.e('ERROR: You need to be root to run this script\n'); return 1; }
  if (sub === 'status') {
    if (!u.active) { io.o('Status: inactive\n'); return 0; }
    io.o('Status: active\n\n' + pad('To', 27, true) + pad('Action', 12, true) + 'From\n' + pad('--', 27, true) + pad('------', 12, true) + '----\n');
    u.rules.forEach(function (r) { io.o(pad(r.port + '/' + r.proto, 27, true) + pad(r.action.toUpperCase(), 12, true) + (r.from === 'any' ? 'Anywhere' : r.from) + '\n'); });
    return 0;
  }
  if (sub === 'enable') { u.active = true; io.o('Firewall is active and enabled on system startup\n'); return 0; }
  if (sub === 'disable') { u.active = false; io.o('Firewall stopped and disabled on system startup\n'); return 0; }
  if (sub === 'reset') { u.rules = []; u.active = false; return 0; }
  if (sub === 'default') { u.default = a[1] === 'allow' ? 'allow' : 'deny'; io.o('Default incoming policy changed to \'' + a[1] + '\'\n'); return 0; }
  if (sub === 'allow' || sub === 'deny' || sub === 'delete' || sub === 'insert') {
    var args = a.slice(1), act = sub, del = false;
    if (sub === 'delete') { del = true; act = args[0]; args = args.slice(1); }
    if (sub === 'insert') { args = args.slice(1); act = args[0]; args = args.slice(1); }
    var from = 'any', port = null, proto = 'tcp';
    var fi = args.indexOf('from'); if (fi >= 0) from = args[fi + 1];
    var pi = args.indexOf('port'); if (pi >= 0) port = args[pi + 1]; else { var first = args.filter(function (x, i) { return fi < 0 || (i !== fi && i !== fi + 1); })[0]; if (first && /^\d+(\/\w+)?$/.test(first)) port = first; }
    if (port && port.indexOf('/') >= 0) { var pp = port.split('/'); port = pp[0]; proto = pp[1]; }
    if (args.indexOf('proto') >= 0) proto = args[args.indexOf('proto') + 1];
    if (!port) { io.e('ERROR: Bad source address\n'); return 1; }
    port = parseInt(port, 10);
    if (del) { var ix = -1; u.rules.forEach(function (r, k) { if (r.port === port && r.action === act && r.from === from) ix = k; }); if (ix < 0) { io.o('Could not delete non-existent rule\n'); return 0; } u.rules.splice(ix, 1); io.o('Rule deleted\n'); return 0; }
    var dup = u.rules.some(function (r) { return r.port === port && r.action === act && r.from === from; });
    if (dup) { io.o('Skipping adding existing rule\n'); return 0; }
    var rule = { port: port, proto: proto, action: act, from: from };
    if (sub === 'insert') u.rules.unshift(rule); else u.rules.push(rule);
    io.o(u.active ? 'Rule added\n' : 'Rules updated\n'); return 0;
  }
  io.e('ERROR: Invalid syntax\n'); return 1;
}, { dir: '/usr/sbin' });
def('from', async function (a, io) {
  /* MARGA simulator tool: run a network command as another simulated machine, for example: from client1 curl http://10.0.1.15:8080 */
  var n = this.netState(), who = a[0];
  if (!who || !n.clients[who]) { io.e('from: unknown machine "' + (who || '') + '". Machines here: ' + (Object.keys(n.clients).join(', ') || 'none') + '\n'); return 1; }
  var cmd = a.slice(1);
  if (!/^(curl|nc|ping)$/.test(cmd[0] || '')) { io.e('from: only curl, nc and ping can run from another machine in this simulator\n'); return 1; }
  n.vp = who;
  try {
    if (cmd[0] === 'ping') { var r = this.resolveName(cmd[1]); var c = this.localIps().indexOf(r.ip) >= 0; io.o('PING ' + cmd[1] + ' (' + r.ip + ') 56(84) bytes of data.\n'); if (c) io.o('64 bytes from ' + r.ip + ': icmp_seq=1 ttl=64 time=0.6 ms\n\n--- ping statistics ---\n1 packets transmitted, 1 received, 0% packet loss\n'); else io.o('\n--- ping statistics ---\n1 packets transmitted, 0 received, 100% packet loss\n'); return c ? 0 : 1; }
    return await this.exec(cmd, io);
  } finally { n.vp = null; }
});
if (typeof module === 'object' && module.exports) module.exports = T;
}());
