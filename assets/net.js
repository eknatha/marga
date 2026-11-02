/* MARGA network maths: IPv4 and CIDR. Runs in the browser and in Node (for tests). */
(function (root) {
'use strict';
function parseIp(s) {
  if (typeof s !== 'string') return null;
  var p = s.trim().split('.');
  if (p.length !== 4) return null;
  var n = 0;
  for (var i = 0; i < 4; i++) {
    if (!/^\d{1,3}$/.test(p[i])) return null;
    var v = Number(p[i]); if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}
function ipStr(n) { return [n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255].join('.'); }
function maskOf(prefix) { return prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0; }
function parseCidr(s) {
  if (typeof s !== 'string') return null;
  var m = s.trim().match(/^([\d.]+)\/(\d{1,2})$/);
  if (!m) return null;
  var ip = parseIp(m[1]), p = Number(m[2]);
  if (ip === null || p > 32) return null;
  return { ip: ip, prefix: p };
}
function bin(n) { var s = (n >>> 0).toString(2); while (s.length < 32) s = '0' + s; return s.replace(/(.{8})(?=.)/g, '$1.'); }
function kind(ip) {
  var a = ip >>> 24, b = ip >>> 16 & 255;
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'Private (RFC 1918)';
  if (a === 127) return 'Loopback';
  if (a === 169 && b === 254) return 'Link-local';
  if (a === 100 && b >= 64 && b <= 127) return 'Shared address space (carrier-grade NAT)';
  if (a >= 224 && a <= 239) return 'Multicast';
  if (a >= 240) return 'Reserved';
  if (a === 0) return 'This network';
  return 'Public';
}
function info(s) {
  var c = typeof s === 'string' ? parseCidr(s) : s;
  if (!c) return null;
  var mask = maskOf(c.prefix), net = (c.ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0;
  var total = Math.pow(2, 32 - c.prefix);
  var hosts = c.prefix === 32 ? 1 : c.prefix === 31 ? 2 : total - 2;
  var first = c.prefix >= 31 ? net : net + 1, last = c.prefix >= 31 ? bc : bc - 1;
  return { input: ipStr(c.ip), prefix: c.prefix, mask: ipStr(mask), wildcard: ipStr(~mask >>> 0), network: ipStr(net), broadcast: ipStr(bc),
    first: ipStr(first), last: ipStr(last), total: total, hosts: hosts, kind: kind(net), cidr: ipStr(net) + '/' + c.prefix,
    maskBin: bin(mask), ipBin: bin(c.ip), netInt: net, bcInt: bc };
}
function split(s, newPrefix) {
  var c = parseCidr(s); if (!c || newPrefix < c.prefix || newPrefix > 32) return null;
  var net = (c.ip & maskOf(c.prefix)) >>> 0, step = Math.pow(2, 32 - newPrefix), n = Math.pow(2, newPrefix - c.prefix), out = [];
  for (var i = 0; i < Math.min(n, 256); i++) out.push(ipStr(net + i * step) + '/' + newPrefix);
  return { count: n, subnets: out, truncated: n > 256 };
}
function contains(s, ip) {
  var c = parseCidr(s), x = parseIp(ip); if (!c || x === null) return null;
  var m = maskOf(c.prefix); return (x & m) >>> 0 === (c.ip & m) >>> 0;
}
function range(s) { var i = info(s); return i && [i.netInt, i.bcInt]; }
function overlap(a, b) { var x = range(a), y = range(b); if (!x || !y) return null; return x[0] <= y[1] && y[0] <= x[1]; }
function prefixForHosts(h) { for (var p = 30; p >= 0; p--) { var cap = p === 32 ? 1 : p === 31 ? 2 : Math.pow(2, 32 - p) - 2; if (cap >= h) return p; } return null; }
/* VLSM: give each requirement the smallest block that fits, largest first. */
function vlsm(parent, needs) {
  var c = parseCidr(parent); if (!c) return { error: 'Enter a network such as 10.0.0.0/16.' };
  var base = (c.ip & maskOf(c.prefix)) >>> 0, end = base + Math.pow(2, 32 - c.prefix);
  var list = needs.map(function (n, i) { return { name: n.name || 'Subnet ' + (i + 1), hosts: n.hosts }; });
  for (var k = 0; k < list.length; k++) if (!(list[k].hosts >= 1) || list[k].hosts > 4294967293) return { error: 'Each subnet needs a host count of 1 or more.' };
  list.sort(function (a, b) { return b.hosts - a.hosts; });
  var cur = base, out = [];
  for (var i = 0; i < list.length; i++) {
    var p = prefixForHosts(list[i].hosts), size = Math.pow(2, 32 - p);
    if (p < c.prefix) return { error: list[i].name + ' needs more addresses than the parent network holds.' };
    cur = Math.ceil(cur / size) * size;
    if (cur + size > end) return { error: 'The parent network is too small. ' + list[i].name + ' does not fit.' };
    var inf = info(ipStr(cur) + '/' + p);
    out.push({ name: list[i].name, wanted: list[i].hosts, cidr: inf.cidr, first: inf.first, last: inf.last, hosts: inf.hosts, mask: inf.mask });
    cur += size;
  }
  return { subnets: out, used: cur - base, free: end - cur };
}
/* Merge a list of CIDR blocks into the smallest list that covers exactly the same addresses. */
function summarize(list) {
  var rs = [];
  for (var i = 0; i < list.length; i++) { var r = range(list[i]); if (!r) return null; rs.push(r); }
  rs.sort(function (a, b) { return a[0] - b[0]; });
  var merged = [];
  rs.forEach(function (r) { var l = merged[merged.length - 1]; if (l && r[0] <= l[1] + 1) l[1] = Math.max(l[1], r[1]); else merged.push([r[0], r[1]]); });
  var out = [];
  merged.forEach(function (r) {
    var s = r[0];
    while (s <= r[1]) {
      var p = 32; while (p > 0 && (s % Math.pow(2, 33 - p)) === 0 && s + Math.pow(2, 33 - p) - 1 <= r[1]) p--;
      out.push(ipStr(s) + '/' + p); s += Math.pow(2, 32 - p);
    }
  });
  return out;
}
var api = { parseIp: parseIp, ipStr: ipStr, parseCidr: parseCidr, info: info, split: split, contains: contains, overlap: overlap, vlsm: vlsm, summarize: summarize, prefixForHosts: prefixForHosts, maskOf: maskOf };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MargaNet = api;
})(typeof window !== 'undefined' ? window : this);
