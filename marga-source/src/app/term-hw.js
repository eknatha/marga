/* MARGA terminal engine, part 16: simulated bare-metal and service-mesh tools: ipmitool (BMC), smartctl (disk health),
   mdadm (software RAID) and istioctl (analyze and proxy-status). Each reads data from the lab ("world.more.hw" and
   "world.more.mesh") and keeps changes in the session. They follow the shape of the real output for a short list of commands. Models, not the tools. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-infra.js') : window.MargaTerm;
var def = T.def;
function J(x) { return JSON.parse(JSON.stringify(x)); }
function hw(s) { var mx = s.mxInit(); if (!mx.w.hw) return null; if (!mx.hw) mx.hw = J(mx.w.hw); return mx.hw; }
function pad(x, n) { x = String(x); while (x.length < n) x += ' '; return x; }

/* ---------------------------------------------------------------- ipmitool */
def('ipmitool', function (a, io) {
  var H = hw(this); if (!H || !H.bmc) { io.e('bash: ipmitool: command not found\n'); return 127; }
  var B = H.bmc, w = [], i;
  for (i = 0; i < a.length; i++) { if (/^-[HUPIpC]$/.test(a[i])) { i++; continue; } if (/^-/.test(a[i])) continue; w.push(a[i]); }
  var k = w.slice(0, 2).join(' ');
  if (!w.length || w[0] === 'help') { io.o('Commands in this simulator:\n  chassis power status | on | off | cycle | soft\n  sel list | elist | clear\n  sensor list\n  lan print\n  mc info\n'); return 0; }
  if (k === 'chassis power' || k === 'power status') {
    var act = w[2] || 'status';
    if (k === 'power status') act = 'status';
    if (act === 'status') { io.o('Chassis Power is ' + B.power + '\n'); return 0; }
    if (act === 'on') { if (B.power === 'on') { io.o('Chassis Power Control: Up/On\n'); return 0; } B.power = 'on'; io.o('Chassis Power Control: Up/On\n'); return 0; }
    if (act === 'off' || act === 'soft') { B.power = 'off'; io.o('Chassis Power Control: ' + (act === 'soft' ? 'Soft' : 'Down/Off') + '\n'); return 0; }
    if (act === 'cycle') { if (B.power === 'off') { io.e('Error: Command not supported in present state\n'); return 1; } B.power = 'on'; io.o('Chassis Power Control: Cycle\n'); return 0; }
    io.e('Chassis Power Commands: status, on, off, cycle, reset, diag, soft\n'); return 1;
  }
  if (k === 'sel list' || k === 'sel elist') {
    if (!(B.sel || []).length) { io.o('SEL has no entries\n'); return 0; }
    io.o(B.sel.map(function (e, n) { return pad((n + 1).toString(16), 4) + '| ' + e.date + ' | ' + e.time + ' | ' + e.sensor + ' | ' + e.event + ' | ' + (e.dir || 'Asserted'); }).join('\n') + '\n'); return 0;
  }
  if (k === 'sel clear') { B.sel = []; io.o('Clearing SEL.  Please allow a few seconds to erase.\nErasing SEL...\n'); return 0; }
  if (k === 'sensor list') { io.o((B.sensors || []).map(function (x) { return pad(x[0], 18) + '| ' + pad(x[1], 10) + '| ' + pad(x[2], 10) + '| ' + x[3]; }).join('\n') + '\n'); return 0; }
  if (k === 'lan print') { io.o('IP Address Source       : Static Address\nIP Address              : ' + (B.ip || '10.20.0.50') + '\nSubnet Mask             : 255.255.255.0\nMAC Address             : 3c:ec:ef:12:34:56\n'); return 0; }
  if (k === 'mc info') { io.o('Device ID                 : 32\nFirmware Revision         : ' + (B.fw || '2.81') + '\nManufacturer Name         : Supermicro\n'); return 0; }
  io.e('Invalid command: ' + w.join(' ') + '\n'); return 1;
});

/* ---------------------------------------------------------------- smartctl */
def('smartctl', function (a, io) {
  var H = hw(this); if (!H || !H.disks) { io.e('bash: smartctl: command not found\n'); return 127; }
  var dev = a.filter(function (x) { return x[0] === '/'; })[0];
  if (a.indexOf('--scan') >= 0) { io.o(Object.keys(H.disks).map(function (d) { return d + ' -d sat # ' + d + ', ATA device'; }).join('\n') + '\n'); return 0; }
  if (!dev) { io.e('smartctl: a device name is required, for example: smartctl -H /dev/sda\n'); return 1; }
  var D = H.disks[dev]; if (!D) { io.e('Smartctl open device: ' + dev + ' failed: No such device\n'); return 2; }
  var head = 'smartctl 7.4 2023-08-01 r5530 [x86_64-linux-6.1.0] (local build)\n=== START OF INFORMATION SECTION ===\nDevice Model:     ' + D.model + '\nSerial Number:    ' + D.serial + '\n\n';
  if (a.indexOf('-H') >= 0 && a.indexOf('-a') < 0) { io.o(head + '=== START OF READ SMART DATA SECTION ===\nSMART overall-health self-assessment test result: ' + (D.health === 'PASSED' ? 'PASSED' : 'FAILED!') + '\n' + (D.health === 'PASSED' ? '' : 'Drive failure expected in less than 24 hours. SAVE ALL DATA.\n')); return D.health === 'PASSED' ? 0 : 8; }
  io.o(head + '=== START OF READ SMART DATA SECTION ===\nSMART overall-health self-assessment test result: ' + (D.health === 'PASSED' ? 'PASSED' : 'FAILED!') + '\n\nID# ATTRIBUTE_NAME          VALUE WORST THRESH RAW_VALUE\n' +
    '  5 Reallocated_Sector_Ct   ' + (D.realloc > 0 ? '098   098   010' : '100   100   010') + '    ' + D.realloc + '\n  9 Power_On_Hours          ' + '090   090   000' + '    ' + D.hours + '\n' +
    '197 Current_Pending_Sector  ' + (D.pending > 0 ? '100   100   000' : '100   100   000') + '    ' + D.pending + '\n194 Temperature_Celsius     ' + '035   040   000' + '    ' + (D.temp || 35) + '\n');
  return D.health === 'PASSED' ? 0 : 8;
});

/* ---------------------------------------------------------------- mdadm */
def('mdadm', function (a, io) {
  var H = hw(this); if (!H || !H.md) { io.e('bash: mdadm: command not found\n'); return 127; }
  var M = H.md, devs = a.filter(function (x) { return x[0] === '/'; }), flag = a.filter(function (x) { return /^--/.test(x); })[0] || '';
  function d(name) { return M.devices.filter(function (x) { return x.dev === name; })[0]; }
  function active() { return M.devices.filter(function (x) { return x.state === 'active sync'; }).length; }
  function refresh() { var act = active(); M.state = act >= M.total ? 'clean' : 'clean, degraded'; M.rebuild = false; }
  if (/--detail|^-D$/.test(a.join(' '))) {
    refresh();
    var lines = ['/dev/md0:', '           Version : 1.2', '     Creation Time : Mon Mar  3 10:00:00 2026', '        Raid Level : ' + M.level, '        Array Size : ' + M.size, '      Raid Devices : ' + M.total, '     Total Devices : ' + M.devices.length,
      '             State : ' + M.state, '    Active Devices : ' + active(), '   Working Devices : ' + M.devices.filter(function (x) { return x.state !== 'faulty'; }).length, '    Failed Devices : ' + M.devices.filter(function (x) { return x.state === 'faulty'; }).length, '     Spare Devices : ' + M.devices.filter(function (x) { return x.state === 'spare'; }).length, '',
      '    Number   Major   Minor   RaidDevice State'];
    M.devices.forEach(function (x, i) { lines.push('       ' + i + '       8       ' + (i * 16 + 1) + '        ' + (x.state === 'active sync' ? i : '-') + '      ' + x.state + '   ' + x.dev); });
    io.o(lines.join('\n') + '\n'); return 0;
  }
  if (/--fail|^-f$/.test(a.join(' ')) || a.indexOf('-f') >= 0) { var t = d(devs[1]); if (!t) { io.e('mdadm: cannot find ' + (devs[1] || '') + ': No such file or directory\n'); return 1; } t.state = 'faulty'; refresh(); io.o('mdadm: set ' + t.dev + ' faulty in /dev/md0\n'); return 0; }
  if (/--remove|^-r$/.test(a.join(' ')) || a.indexOf('-r') >= 0) { var r = d(devs[1]); if (!r) { io.e('mdadm: hot remove failed for ' + (devs[1] || '') + ': No such device or address\n'); return 1; } if (r.state !== 'faulty') { io.e('mdadm: hot remove failed for ' + r.dev + ': Device or resource busy\n'); return 1; } M.devices = M.devices.filter(function (x) { return x !== r; }); refresh(); io.o('mdadm: hot removed ' + r.dev + ' from /dev/md0\n'); return 0; }
  if (/--add|^-a$/.test(a.join(' ')) || a.indexOf('-a') >= 0) {
    var nd = devs[1]; if (!nd) { io.e('mdadm: need a device to add\n'); return 1; }
    if ((H.avail || []).indexOf(nd) < 0) { io.e('mdadm: cannot open ' + nd + ': No such file or directory\n'); return 1; }
    if (d(nd)) { io.e('mdadm: ' + nd + ' reports being an active member for /dev/md0, but a --re-add fails.\n'); return 1; }
    M.devices.push({ dev: nd, state: active() >= M.total ? 'spare' : 'active sync' }); H.avail = H.avail.filter(function (x) { return x !== nd; }); refresh();
    io.o('mdadm: added ' + nd + '\n'); return 0;
  }
  if (a.indexOf('--stop') >= 0) { io.e('mdadm: Cannot get exclusive access to /dev/md0: Perhaps a running process, mounted filesystem or active volume group?\n'); return 1; }
  io.e('mdadm: this simulator supports --detail, --fail, --remove and --add on /dev/md0\n'); return 1;
});

/* ---------------------------------------------------------------- istioctl */
function docs(text) { return text.split(/^---\s*$/m).filter(function (d) { return /^\s*kind:/m.test(d); }); }
function meta(d) { var k = /^kind:\s*(\S+)/m.exec(d), n = /^metadata:\s*\n(?:[ \t]+.*\n)*?[ \t]+name:\s*(\S+)/m.exec(d), ns = /^[ \t]+namespace:\s*(\S+)/m.exec(d); return { kind: k ? k[1] : '', name: n ? n[1].replace(/["']/g, '') : '', ns: ns ? ns[1].replace(/["']/g, '') : 'default' }; }
def('istioctl', function (a, io) {
  var s = this, mx = s.mxInit(), M = mx.w.mesh; if (!M) { io.e('bash: istioctl: command not found\n'); return 127; }
  var w = a.filter(function (x) { return x[0] !== '-'; }), sub = w[0];
  if (!sub || sub === 'help') { io.o('Commands in this simulator:\n  version\n  analyze [-n NAMESPACE] [FILE or DIRECTORY ...]\n  proxy-status\n'); return 0; }
  if (sub === 'version') { io.o('client version: 1.22.1\ncontrol plane version: 1.22.1\ndata plane version: 1.22.1 (' + (M.proxies || []).length + ' proxies)\n'); return 0; }
  if (sub === 'proxy-status' || sub === 'ps') {
    var rows = [['NAME', 'CLUSTER', 'CDS', 'LDS', 'EDS', 'RDS', 'ISTIOD', 'VERSION']].concat((M.proxies || []).map(function (p) { return [p.name, 'Kubernetes', p.cds || 'SYNCED', p.lds || 'SYNCED', p.eds || 'SYNCED', p.rds || 'SYNCED', 'istiod-6d4b9c7f5-xk2lp', '1.22.1']; }));
    var cw = []; rows.forEach(function (r) { r.forEach(function (c, i) { cw[i] = Math.max(cw[i] || 0, String(c).length); }); });
    io.o(rows.map(function (r) { return r.map(function (c, i) { return pad(c, cw[i]); }).join('   ').replace(/\s+$/, ''); }).join('\n') + '\n'); return 0;
  }
  if (sub !== 'analyze') { io.e('Error: unknown command "' + sub + '" for "istioctl"\n'); return 1; }
  var targets = w.slice(1).filter(function (x) { return x.indexOf('=') < 0; }); if (!targets.length) targets = ['.'];
  var texts = [], bad = null;
  targets.forEach(function (t) {
    var p = s.abs(t), body = s.readRaw(p);
    if (body !== null) { texts.push(body); return; }
    var found = false; try { s.eachFile(p, function (fp, n) { if (/\.ya?ml$/.test(fp) && typeof n.d === 'string') { texts.push(n.d); found = true; } }); } catch (e) { /* not a directory */ }
    if (!found && body === null) bad = t;
  });
  if (bad && !texts.length) { io.e('Error: open ' + bad + ': no such file or directory\n'); return 1; }
  var all = []; texts.forEach(function (t) { docs(t).forEach(function (d) { all.push({ d: d, m: meta(d) }); }); });
  var msgs = [], errs = 0;
  var drs = all.filter(function (x) { return x.m.kind === 'DestinationRule'; });
  all.forEach(function (x) {
    var ref = x.m.ns + '/' + x.m.name;
    if (x.m.kind === 'VirtualService') {
      var re = /destination:\s*\n\s*host:\s*(\S+)(?:\s*\n\s*subset:\s*(\S+))?/g, mm;
      while ((mm = re.exec(x.d))) {
        var hn = mm[1].replace(/["']/g, '').split('.')[0];
        if (!mm[2] && hn.indexOf('*') < 0 && !all.some(function (o) { return (o.m.kind === 'Service' || o.m.kind === 'ServiceEntry') && o.m.name === hn; })) { msgs.push('Error [IST0101] (VirtualService ' + ref + ') Referenced host not found: "' + mm[1].replace(/["']/g, '') + '"'); errs++; continue; }
        if (!mm[2]) continue;
        var host = mm[1].replace(/["']/g, ''), sub2 = mm[2].replace(/["']/g, '');
        var ok = drs.some(function (dr) { var h = /^\s*host:\s*(\S+)/m.exec(dr.d); return h && h[1].replace(/["']/g, '') === host && new RegExp('^\\s*-?\\s*name:\\s*["\']?' + sub2 + '["\']?\\s*$', 'm').test(dr.d); });
        if (!ok) { msgs.push('Error [IST0101] (VirtualService ' + ref + ') Referenced host+subset in destinationrule not found: "' + host + '+' + sub2 + '"'); errs++; }
      }
      var ws = (x.d.match(/^\s*weight:\s*(\d+)/gm) || []).map(function (q) { return parseInt(q.replace(/\D/g, ''), 10); });
      var blocks = x.d.split(/^\s*-\s*route:/m).slice(1);
      blocks.forEach(function (b) { var bw = (b.match(/^\s*weight:\s*(\d+)/gm) || []).map(function (q) { return parseInt(q.replace(/\D/g, ''), 10); }); var sum = bw.reduce(function (p, c) { return p + c; }, 0); if (bw.length && sum !== 100) { msgs.push('Error [IST0000] (VirtualService ' + ref + ') configuration is invalid: total destination weight = ' + sum + ' != 100'); errs++; } });
      void ws;
    }
    if (x.m.kind === 'Namespace' && !/istio-injection:\s*["']?enabled/.test(x.d) && !/istio\.io\/rev:/.test(x.d)) {
      msgs.push("Info [IST0102] (Namespace " + x.m.name + ") The namespace is not enabled for Istio injection. Run 'kubectl label namespace " + x.m.name + " istio-injection=enabled' to enable it, or 'kubectl label namespace " + x.m.name + " istio-injection=disabled' to explicitly mark it as not needing injection.");
    }
    if (x.m.kind === 'Service') {
      var pr = /-\s*(?:name:\s*(\S+)\s*\n\s*)?port:\s*(\d+)(?:\s*\n\s*targetPort:\s*(\d+))?/g, pm;
      var seg = x.d.slice(x.d.indexOf('ports:'));
      while ((pm = pr.exec(seg))) {
        var nm = (pm[1] || '').replace(/["']/g, '');
        if (!/^(http|http2|https|tcp|tls|grpc|grpc-web|mongo|mysql|redis|udp)(-.*)?$/.test(nm)) msgs.push('Info [IST0118] (Service ' + ref + ') Port name ' + nm + ' (port: ' + pm[2] + ', targetPort: ' + (pm[3] || pm[2]) + ") doesn't follow the naming convention of Istio port.");
      }
    }
  });
  if (!msgs.length) { io.o('No validation issues found when analyzing ' + (targets[0] === '.' ? 'namespace: default' : targets.join(', ')) + '.\n'); return 0; }
  io.o(msgs.join('\n') + '\n'); return errs ? 79 : 0;
});
if (typeof module === 'object' && module.exports) module.exports = T;
}());
