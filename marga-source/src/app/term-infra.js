/* MARGA terminal engine, part 15: small simulated infrastructure tools: gcloud (Google Cloud), virsh (KVM/libvirt), openstack,
   lsblk / findmnt / pvs / vgs / lvs / lvextend (storage) and nvidia-smi (GPU). Every tool reads data from the lab ("world.more") and
   keeps changes in the session. They follow the shape of the real output for a short list of commands and refuse the rest. Models, not the tools. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-helm.js') : window.MargaTerm;
var def = T.def;
function J(x) { return JSON.parse(JSON.stringify(x)); }
function table(rows) { var w = [], out = ''; rows.forEach(function (r) { r.forEach(function (c, i) { w[i] = Math.max(w[i] || 0, String(c).length); }); }); rows.forEach(function (r) { out += r.map(function (c, i) { return i === r.length - 1 ? String(c) : String(c).padEnd(w[i] + 2, ' '); }).join('') + '\n'; }); return out; }
function grid(rows) { var w = [], out = '', sep; rows.forEach(function (r) { r.forEach(function (c, i) { w[i] = Math.max(w[i] || 0, String(c).length); }); }); sep = '+' + w.map(function (x) { return new Array(x + 3).join('-'); }).join('+') + '+\n'; out += sep; rows.forEach(function (r, ri) { out += '| ' + r.map(function (c, i) { return String(c).padEnd(w[i], ' '); }).join(' | ') + ' |\n'; if (ri === 0) out += sep; }); return out + sep; }
function more(s, k) { var mx = s.mxInit(); if (!mx.w[k]) return null; if (!mx[k]) mx[k] = J(mx.w[k]); return mx[k]; }
function flags(a) {
  var o = { pos: [], f: {} }, i;
  for (i = 0; i < a.length; i++) {
    var x = a[i];
    if (x.indexOf('--') === 0) { var kv = x.slice(2).split('='); if (kv.length > 1) o.f[kv[0]] = kv.slice(1).join('='); else if (a[i + 1] !== undefined && a[i + 1][0] !== '-' && /^(project|zone|format|filter|source-ranges|allow|member|role|machine-type|member|name|flavor|image|network|proto|dst-port|remote-ip|size|memory|vcpus|snapshot|limit|columns|c|f|ingress|ethertype|direction|priority|description|public-access-prevention|uniform-bucket-level-access|net)$/.test(kv[0])) o.f[kv[0]] = a[++i]; else o.f[kv[0]] = true; }
    else o.pos.push(x);
  }
  return o;
}
function pathVal(o, p) { return p.split('.').reduce(function (x, k) { return x === undefined || x === null ? x : x[k]; }, o); }
function fmtOut(o, rows, cols, io, plain) {
  var f = o.f.format;
  if (f === 'json') { io.o(JSON.stringify(rows, null, 2) + '\n'); return; }
  var m = /^value\(([^)]*)\)$/.exec(f || ''); if (m) { rows.forEach(function (r) { io.o(m[1].split(',').map(function (k) { var v = pathVal(r, k.trim()); return Array.isArray(v) ? v.join(';') : v === undefined ? '' : v; }).join('\t') + '\n'); }); return; }
  if (!rows.length) { io.e('Listed 0 items.\n'); return; }
  io.o(table([cols.map(function (c) { return c[0]; })].concat(rows.map(function (r) { return cols.map(function (c) { var v = typeof c[1] === 'function' ? c[1](r) : pathVal(r, c[1]); return v === undefined || v === null ? '' : v; }); }))));
}
function filt(rows, o) { var f = o.f.filter; if (!f || f === true) return rows; var m = /^([\w.]+)\s*[=:]\s*(.+)$/.exec(f); if (!m) return rows; var v = m[2].replace(/^["']|["']$/g, ''); return rows.filter(function (r) { var x = pathVal(r, m[1]); return String(x) === v || (Array.isArray(x) && x.indexOf(v) >= 0); }); }

/* ---------------------------------------------------------------- gcloud */
def('gcloud gsutil', function (a, io) {
  var s = this, G = more(s, 'gcp');
  if (!G) { io.e('gcloud: command not found\n'); return 127; }
  var o = flags(a), w = o.pos, g = w[0];
  if (!g || g === 'help' || o.f.help) { io.o('Usage: gcloud <group> <command> [flags]\n\nCommands in this simulator:\n  config list | get-value project | set project ID\n  auth list | projects list\n  compute instances list | describe | start | stop | delete\n  compute firewall-rules list | describe | create | update | delete\n  projects get-iam-policy | add-iam-policy-binding | remove-iam-policy-binding\n  storage buckets list | describe | update | remove-iam-policy-binding\n\nFlags: --project, --zone, --format=json|value(FIELD), --filter=FIELD=VALUE\n'); return 0; }
  var proj = o.f.project && o.f.project !== true ? o.f.project : G.project;
  var P = (G.projects || []).filter(function (p) { return p.id === proj; })[0];
  function inP(list) { return (list || []).filter(function (x) { return x.project === proj; }); }
  function noPerm(cmd, what) { io.e('ERROR: (gcloud.' + cmd + ') PERMISSION_DENIED: ' + what + '\n'); return 1; }
  function hasProject() { if (!proj) { io.e('ERROR: (gcloud.' + w.slice(0, 3).join('.') + ') The required property [project] is not currently set.\nYou may set it for your current workspace by running:\n\n  $ gcloud config set project VALUE\n'); return false; } if (!P) { io.e('ERROR: (gcloud.' + w.slice(0, 3).join('.') + ') [' + account() + '] does not have permission to access projects instance [' + proj + '] (or it may not exist): Project \'' + proj + '\' not found or deleted.\n'); return false; } return true; }
  function account() { return G.account || 'student@example.com'; }
  if (g === 'config') {
    if (w[1] === 'list') { io.o('[core]\naccount = ' + account() + '\nproject = ' + (G.project || '(unset)') + '\n\nYour active configuration is: [default]\n'); return 0; }
    if (w[1] === 'get-value') { if (w[2] === 'project') { if (!G.project) { io.e('(unset)\n'); return 0; } io.o(G.project + '\n'); return 0; } if (w[2] === 'account') { io.o(account() + '\n'); return 0; } io.e('(unset)\n'); return 0; }
    if (w[1] === 'set') { if (w[2] !== 'project' || !w[3]) { io.e('ERROR: only "gcloud config set project ID" is part of this simulator\n'); return 2; } G.project = w[3]; io.e('Updated property [core/project].\n'); return 0; }
    io.e('ERROR: gcloud config ' + (w[1] || '') + ' is not part of this simulator (list, get-value, set)\n'); return 2;
  }
  if (g === 'auth' && w[1] === 'list') { io.o('        Credentialed Accounts\nACTIVE  ACCOUNT\n*       ' + account() + '\n\nTo set the active account, run:\n    $ gcloud config set account `ACCOUNT`\n'); return 0; }
  if (g === 'projects' && w[1] === 'list') { fmtOut(o, G.projects || [], [['PROJECT_ID', 'id'], ['NAME', 'name'], ['PROJECT_NUMBER', 'number']], io); return 0; }
  if (g === 'compute' && w[1] === 'instances') {
    if (!hasProject()) return 1;
    var all = inP(G.instances), op = w[2];
    if (op === 'list') { fmtOut(o, filt(all, o), [['NAME', 'name'], ['ZONE', 'zone'], ['MACHINE_TYPE', 'machineType'], ['PREEMPTIBLE', function () { return ''; }], ['INTERNAL_IP', 'internalIp'], ['EXTERNAL_IP', function (r) { return r.externalIp || ''; }], ['STATUS', 'status']], io); return 0; }
    var n = w[3], inst = all.filter(function (x) { return x.name === n; })[0];
    if (!n) { io.e('ERROR: (gcloud.compute.instances.' + op + ') argument INSTANCE_NAMES: Must be specified.\n'); return 2; }
    if (!inst) { io.e('ERROR: (gcloud.compute.instances.' + op + ') Could not fetch resource:\n - The resource \'projects/' + proj + '/zones/' + (o.f.zone || 'europe-west1-b') + '/instances/' + n + '\' was not found\n'); return 1; }
    if (op === 'describe') { io.o(JSON.stringify(inst, null, 2).replace(/"/g, '"') + '\n'); return 0; }
    if (op === 'start') { inst.status = 'RUNNING'; io.o('Starting instance(s) ' + n + '...done.\nUpdated [https://compute.googleapis.com/compute/v1/projects/' + proj + '/zones/' + inst.zone + '/instances/' + n + '].\n'); return 0; }
    if (op === 'stop') { inst.status = 'TERMINATED'; io.o('Stopping instance(s) ' + n + '...done.\n'); return 0; }
    if (op === 'delete') { if (!(o.f.quiet || a.indexOf('--quiet') >= 0 || a.indexOf('-q') >= 0)) { io.e('ERROR: this simulator cannot ask for confirmation. Add --quiet after you have checked the name and project.\n'); return 1; } G.instances = G.instances.filter(function (x) { return x !== inst; }); io.o('Deleted [' + n + '].\n'); return 0; }
    io.e('ERROR: gcloud compute instances ' + op + ' is not part of this simulator\n'); return 2;
  }
  if (g === 'compute' && w[1] === 'firewall-rules') {
    if (!hasProject()) return 1;
    var fws = inP(G.firewalls), fop = w[2];
    var cols = [['NAME', 'name'], ['NETWORK', 'network'], ['DIRECTION', 'direction'], ['PRIORITY', 'priority'], ['ALLOW', function (r) { return (r.allowed || []).map(function (x) { return x.protocol + (x.ports ? ':' + x.ports.join(',') : ''); }).join(','); }], ['DENY', function () { return ''; }], ['DISABLED', function (r) { return r.disabled ? 'True' : 'False'; }]];
    if (fop === 'list') { fmtOut(o, filt(fws, o), cols, io); return 0; }
    var fn = w[3], fw = fws.filter(function (x) { return x.name === fn; })[0];
    if (fop === 'create') {
      if (!fn) { io.e('ERROR: (gcloud.compute.firewall-rules.create) argument NAME: Must be specified.\n'); return 2; }
      if (fw) { io.e('ERROR: (gcloud.compute.firewall-rules.create) Could not fetch resource:\n - The resource \'projects/' + proj + '/global/firewalls/' + fn + '\' already exists\n'); return 1; }
      var al = (o.f.allow && o.f.allow !== true ? o.f.allow : 'tcp').split(',').map(function (x) { var m = /^(\w+)(?::(.*))?$/.exec(x); return { protocol: m[1], ports: m[2] ? m[2].split(',') : undefined }; });
      var nf = { project: proj, name: fn, network: o.f.network && o.f.network !== true ? o.f.network : 'default', direction: 'INGRESS', priority: parseInt(o.f.priority, 10) || 1000, allowed: al, sourceRanges: (o.f['source-ranges'] && o.f['source-ranges'] !== true ? o.f['source-ranges'] : '0.0.0.0/0').split(',') };
      G.firewalls.push(nf); io.o('Creating firewall...done.\n'); fmtOut({ f: {} }, [nf], cols, io); return 0;
    }
    if (!fn) { io.e('ERROR: (gcloud.compute.firewall-rules.' + fop + ') argument NAME: Must be specified.\n'); return 2; }
    if (!fw) { io.e('ERROR: (gcloud.compute.firewall-rules.' + fop + ') Could not fetch resource:\n - The resource \'projects/' + proj + '/global/firewalls/' + fn + '\' was not found\n'); return 1; }
    if (fop === 'describe') { io.o(JSON.stringify(fw, null, 2) + '\n'); return 0; }
    if (fop === 'update') { if (o.f['source-ranges'] && o.f['source-ranges'] !== true) fw.sourceRanges = o.f['source-ranges'].split(','); if (a.indexOf('--disabled') >= 0) fw.disabled = true; if (a.indexOf('--no-disabled') >= 0) fw.disabled = false; io.o('Updated [https://compute.googleapis.com/compute/v1/projects/' + proj + '/global/firewalls/' + fn + '].\n'); return 0; }
    if (fop === 'delete') { if (!(a.indexOf('--quiet') >= 0 || a.indexOf('-q') >= 0)) { io.e('ERROR: this simulator cannot ask for confirmation. Add --quiet after you have checked the rule name.\n'); return 1; } G.firewalls = G.firewalls.filter(function (x) { return x !== fw; }); io.o('Deleted [https://compute.googleapis.com/compute/v1/projects/' + proj + '/global/firewalls/' + fn + '].\n'); return 0; }
    io.e('ERROR: gcloud compute firewall-rules ' + fop + ' is not part of this simulator\n'); return 2;
  }
  if (g === 'projects' && /iam-policy/.test(w[1] || '')) {
    if (!hasProject()) return 1; var pid = w[2] || proj; var PP = (G.projects || []).filter(function (p) { return p.id === pid; })[0]; if (!PP) { io.e('ERROR: (gcloud.projects.' + w[1] + ') Project \'' + pid + '\' not found.\n'); return 1; }
    var B = PP.bindings = PP.bindings || [];
    if (w[1] === 'get-iam-policy') { if (o.f.format === 'json') { io.o(JSON.stringify({ bindings: B, etag: 'BwYabc123=', version: 1 }, null, 2) + '\n'); return 0; } io.o('bindings:\n' + B.map(function (b) { return '- members:\n' + b.members.map(function (m) { return '  - ' + m + '\n'; }).join('') + '  role: ' + b.role + '\n'; }).join('') + 'etag: BwYabc123=\nversion: 1\n'); return 0; }
    var mem = o.f.member, role = o.f.role; if (!mem || mem === true || !role || role === true) { io.e('ERROR: (gcloud.projects.' + w[1] + ') Missing required argument [--member] or [--role].\n'); return 2; }
    if (w[1] === 'add-iam-policy-binding') { var b0 = B.filter(function (b) { return b.role === role; })[0]; if (!b0) { b0 = { role: role, members: [] }; B.push(b0); } if (b0.members.indexOf(mem) < 0) b0.members.push(mem); io.o('Updated IAM policy for project [' + pid + '].\n'); return 0; }
    if (w[1] === 'remove-iam-policy-binding') { var b1 = B.filter(function (b) { return b.role === role && b.members.indexOf(mem) >= 0; })[0]; if (!b1) { io.e('ERROR: (gcloud.projects.remove-iam-policy-binding) Policy binding with the specified principal and role not found!\n'); return 1; } b1.members = b1.members.filter(function (m) { return m !== mem; }); PP.bindings = B.filter(function (b) { return b.members.length; }); io.o('Updated IAM policy for project [' + pid + '].\n'); return 0; }
  }
  if (g === 'storage' && w[1] === 'buckets') {
    if (!hasProject()) return 1; var bs = inP(G.buckets), bop = w[2];
    if (bop === 'list') { fmtOut(o, bs, [['NAME', 'name'], ['LOCATION', 'location'], ['PUBLIC_ACCESS_PREVENTION', function (r) { return r.publicPrevention || 'inherited'; }]], io); return 0; }
    var bn = (w[3] || '').replace(/^gs:\/\//, '').replace(/\/$/, ''), bk = bs.filter(function (x) { return x.name === bn; })[0];
    if (!bn) { io.e('ERROR: (gcloud.storage.buckets.' + bop + ') argument URL: Must be specified.\n'); return 2; }
    if (!bk) { io.e('ERROR: (gcloud.storage.buckets.' + bop + ') HTTPError 404: The specified bucket does not exist.\n'); return 1; }
    if (bop === 'describe') { io.o(JSON.stringify(bk, null, 2) + '\n'); return 0; }
    if (bop === 'update') { if (a.indexOf('--public-access-prevention') >= 0) { bk.publicPrevention = 'enforced'; bk.iam = (bk.iam || []).filter(function (b) { return b.members.indexOf('allUsers') < 0; }); } if (a.indexOf('--uniform-bucket-level-access') >= 0) bk.uniform = true; io.o('Updating gs://' + bn + '/...\n  Completed 1\n'); return 0; }
    io.e('ERROR: gcloud storage buckets ' + bop + ' is not part of this simulator\n'); return 2;
  }
  io.e('ERROR: (gcloud) \'' + w.slice(0, 3).join(' ') + '\' is not part of this simulator. Run gcloud help to see what it supports.\n'); return 2;
});

/* ---------------------------------------------------------------- virsh */
def('virsh', function (a, io) {
  var s = this, V = more(s, 'virsh'); if (!V) { io.e('virsh: command not found\n'); return 127; }
  var o = flags(a), w = o.pos, c = w[0];
  function dom(n) { return V.domains.filter(function (d) { return d.name === n; })[0]; }
  function pool(n) { return V.pools.filter(function (p) { return p.name === n; })[0]; }
  function memUsed() { return V.domains.filter(function (d) { return d.state === 'running'; }).reduce(function (t, d) { return t + d.memMiB; }, 0); }
  function notFound(n) { io.e('error: failed to get domain \'' + n + '\'\n'); return 1; }
  if (!c || c === 'help') { io.o('Commands in this simulator:\n  list [--all] | start | shutdown | destroy | dominfo | domstate DOM\n  setmem DOM SIZE_MiB | setmaxmem DOM SIZE_MiB --config\n  pool-list | pool-info POOL | snapshot-list DOM | snapshot-delete DOM SNAP | nodeinfo | vol-list POOL\n'); return 0; }
  if (c === 'list') { var rows = [['Id', 'Name', 'State']], i = 1; rows.push(['---', '', '']); V.domains.forEach(function (d) { if (d.state === 'running') rows.push([i++, d.name, 'running']); else if (a.indexOf('--all') >= 0) rows.push(['-', d.name, 'shut off']); }); io.o(' ' + table(rows).replace(/\n/g, '\n ').trimEnd() + '\n'); return 0; }
  if (c === 'nodeinfo') { io.o('CPU model:           x86_64\nCPU(s):              ' + V.host.cpus + '\nMemory size:         ' + V.host.memMiB * 1024 + ' KiB\n'); return 0; }
  if (c === 'pool-list') { io.o(' Name   State    Autostart\n--------------------------------\n' + V.pools.map(function (p) { return ' ' + p.name + '   active   yes'; }).join('\n') + '\n'); return 0; }
  if (c === 'pool-info') { var p = pool(w[1]); if (!p) { io.e('error: failed to get pool \'' + w[1] + '\'\nerror: Storage pool not found: no storage pool with matching name \'' + w[1] + '\'\n'); return 1; } io.o('Name:           ' + p.name + '\nState:          running\nPersistent:     yes\nAutostart:      yes\nCapacity:       ' + p.capGiB.toFixed(2) + ' GiB\nAllocation:     ' + p.allocGiB.toFixed(2) + ' GiB\nAvailable:      ' + (p.capGiB - p.allocGiB).toFixed(2) + ' GiB\n'); return 0; }
  var d = dom(w[1]);
  if (c === 'dominfo' || c === 'domstate' || c === 'start' || c === 'shutdown' || c === 'destroy' || c === 'snapshot-list' || c === 'snapshot-delete' || c === 'setmem' || c === 'setmaxmem') {
    if (!w[1]) { io.e('error: command \'' + c + '\' requires <domain> option\n'); return 1; }
    if (!d) { return notFound(w[1]); }
  }
  if (c === 'domstate') { io.o((d.state === 'running' ? 'running' : 'shut off') + '\n'); return 0; }
  if (c === 'dominfo') { io.o('Id:             ' + (d.state === 'running' ? '3' : '-') + '\nName:           ' + d.name + '\nState:          ' + (d.state === 'running' ? 'running' : 'shut off') + '\nCPU(s):         ' + d.vcpus + '\nMax memory:     ' + d.memMiB * 1024 + ' KiB\nUsed memory:    ' + (d.state === 'running' ? d.memMiB * 1024 : 0) + ' KiB\nPersistent:     yes\n'); return 0; }
  if (c === 'start') {
    if (d.state === 'running') { io.e('error: Failed to start domain \'' + d.name + '\'\nerror: Requested operation is not valid: domain is already running\n'); return 1; }
    var pl = pool(d.pool); if (pl && pl.capGiB - pl.allocGiB < 0.05 && d.needsSpace) { io.e('error: Failed to start domain \'' + d.name + '\'\nerror: internal error: qemu unexpectedly closed the monitor: qemu-system-x86_64: error writing to ' + d.disk + ': No space left on device\n'); return 1; }
    if (memUsed() + d.memMiB > V.host.memMiB) { io.e('error: Failed to start domain \'' + d.name + '\'\nerror: internal error: process exited while connecting to monitor: qemu-system-x86_64: cannot set up guest memory \'pc.ram\': Cannot allocate memory\n'); return 1; }
    d.state = 'running'; io.o('Domain \'' + d.name + '\' started\n'); return 0;
  }
  if (c === 'shutdown' || c === 'destroy') { if (d.state !== 'running') { io.e('error: Failed to ' + (c === 'shutdown' ? 'shutdown' : 'destroy') + ' domain \'' + d.name + '\'\nerror: Requested operation is not valid: domain is not running\n'); return 1; } d.state = 'shutoff'; io.o('Domain \'' + d.name + '\' ' + (c === 'shutdown' ? 'is being shutdown' : 'destroyed') + '\n'); return 0; }
  if (c === 'setmaxmem' || c === 'setmem') { var mib = parseInt(w[2], 10); if (!mib || mib < 128) { io.e('error: invalid size; give MiB, for example 2048\n'); return 1; } if (d.state === 'running' && c === 'setmaxmem') { io.e('error: Requested operation is not valid: cannot resize the maximum memory on an active domain\n'); return 1; } d.memMiB = mib; return 0; }
  if (c === 'snapshot-list') { io.o(' Name        Creation Time               State\n------------------------------------------------------\n' + (d.snapshots || []).map(function (x) { return ' ' + x.name + '   ' + x.created + '   shutoff'; }).join('\n') + '\n'); return 0; }
  if (c === 'snapshot-delete') { var sn = (d.snapshots || []).filter(function (x) { return x.name === w[2]; })[0]; if (!sn) { io.e('error: Domain snapshot not found: no domain snapshot with matching name \'' + w[2] + '\'\n'); return 1; } d.snapshots = d.snapshots.filter(function (x) { return x !== sn; }); var pl2 = pool(d.pool); if (pl2) pl2.allocGiB = Math.max(0, pl2.allocGiB - (sn.sizeGiB || 0)); io.o('Domain snapshot ' + sn.name + ' deleted\n'); return 0; }
  if (c === 'vol-list') { var p3 = pool(w[1]); if (!p3) { io.e('error: failed to get pool \'' + w[1] + '\'\n'); return 1; } io.o(' Name   Path\n---------------------------------\n' + V.domains.filter(function (x) { return x.pool === p3.name; }).map(function (x) { return ' ' + x.name + '.qcow2   ' + x.disk; }).join('\n') + '\n'); return 0; }
  io.e('error: unknown command: \'' + c + '\' (virsh help lists what this simulator supports)\n'); return 1;
});

/* ---------------------------------------------------------------- openstack */
def('openstack', function (a, io) {
  var s = this, O = more(s, 'os'); if (!O) { io.e('openstack: command not found\n'); return 127; }
  var o = flags(a), w = o.pos, k = w.slice(0, 2).join(' '), k3 = w.slice(0, 3).join(' ');
  var fmtJ = o.f.f === 'json' || o.f.format === 'json';
  function srv(n) { return O.servers.filter(function (x) { return x.name === n || x.id === n; })[0]; }
  function flv(n) { return O.flavors.filter(function (x) { return x.name === n; })[0]; }
  function sg(n) { return O.secgroups.filter(function (x) { return x.name === n || x.id === n; })[0]; }
  function used() { var u = { instances: 0, cores: 0, ram: 0 }; O.servers.forEach(function (x) { var f = flv(x.flavor); u.instances++; if (f) { u.cores += f.vcpus; u.ram += f.ram; } }); return u; }
  function hostFree() { var u = 0; O.servers.forEach(function (x) { if (x.status !== 'ERROR') { var f = flv(x.flavor); if (f) u += f.ram; } }); return O.host.ramMB - u; }
  if (!w.length || w[0] === 'help') { io.o('Commands in this simulator:\n  server list | show | start | stop | reboot | delete | create | add security group\n  flavor list | quota show | network list | security group list | show\n  security group rule list GROUP | create GROUP | volume list\n  token issue\n'); return 0; }
  if (k === 'token issue') { io.o(grid([['Field', 'Value'], ['expires', '2026-11-03T18:00:00+0000'], ['project_id', O.project || 'a1b2c3'], ['user_id', O.user || 'student']])); return 0; }
  if (k === 'server list') { var rows = [['ID', 'Name', 'Status', 'Networks', 'Image', 'Flavor']]; O.servers.forEach(function (x) { rows.push([x.id, x.name, x.status, x.networks || '', x.image || '', x.flavor]); }); if (fmtJ) { io.o(JSON.stringify(O.servers.map(function (x) { return { ID: x.id, Name: x.name, Status: x.status }; }), null, 2) + '\n'); return 0; } io.o(grid(rows)); return 0; }
  if (k === 'server show') {
    var x = srv(w[2]); if (!x) { io.e('No server with a name or ID of \'' + (w[2] || '') + '\' exists.\n'); return 1; }
    var r = [['Field', 'Value'], ['id', x.id], ['name', x.name], ['status', x.status], ['flavor', x.flavor], ['image', x.image || ''], ['addresses', x.networks || ''], ['security_groups', (x.secgroups || ['default']).map(function (n) { return "name='" + n + "'"; }).join(', ')]];
    if (x.fault) r.push(['fault', "{'code': 500, 'message': '" + x.fault + "'}"]);
    if (fmtJ) { var jo = {}; r.slice(1).forEach(function (q) { jo[q[0]] = q[1]; }); io.o(JSON.stringify(jo, null, 2) + '\n'); return 0; }
    io.o(grid(r)); return 0;
  }
  if (k === 'server start' || k === 'server stop' || k === 'server reboot' || k === 'server delete') {
    if (k === 'server delete') { var bad = 0; w.slice(2).forEach(function (nm) { var d1 = srv(nm); if (!d1) { io.e('No server with a name or ID of \'' + nm + '\' exists.\n'); bad++; return; } O.servers = O.servers.filter(function (q) { return q !== d1; }); }); if (!w[2]) { io.e('openstack server delete: error: the following arguments are required: <server>\n'); return 2; } if (bad) { io.e('Failed to delete ' + bad + ' of ' + (w.length - 2) + ' servers.\n'); return 1; } return 0; }
    var y = srv(w[2]); if (!y) { io.e('No server with a name or ID of \'' + (w[2] || '') + '\' exists.\n'); return 1; }
    if (y.status === 'ERROR') { io.e('Cannot \'' + w[1] + '\' instance ' + y.id + ' while it is in vm_state error (HTTP 409)\n'); return 1; }
    y.status = k === 'server stop' ? 'SHUTOFF' : 'ACTIVE'; return 0;
  }
  if (k === 'server create') {
    var nm = w[2], fn = o.f.flavor, im = o.f.image, nw = o.f.network;
    if (!nm || !fn || fn === true || !im || im === true) { io.e('usage: openstack server create --flavor <flavor> --image <image> [--network <network>] <server-name>\nopenstack server create: error: the following arguments are required: --flavor, --image, <server-name>\n'); return 2; }
    var f = flv(fn); if (!f) { io.e('No flavor with a name or ID of \'' + fn + '\' exists.\n'); return 1; }
    if (O.images && O.images.indexOf(im) < 0) { io.e('No Image found for ' + im + '\n'); return 1; }
    var u = used(); if (O.quotas) { if (u.instances + 1 > O.quotas.instances) { io.e('Quota exceeded for instances: Requested 1, but already used ' + u.instances + ' of ' + O.quotas.instances + ' instances (HTTP 403)\n'); return 1; } if (u.cores + f.vcpus > O.quotas.cores) { io.e('Quota exceeded for cores: Requested ' + f.vcpus + ', but already used ' + u.cores + ' of ' + O.quotas.cores + ' cores (HTTP 403)\n'); return 1; } if (u.ram + f.ram > O.quotas.ram) { io.e('Quota exceeded for ram: Requested ' + f.ram + ', but already used ' + u.ram + ' of ' + O.quotas.ram + ' ram (HTTP 403)\n'); return 1; } }
    var id = 'a1b2c3d4-' + ('0000' + (O.servers.length + 1)).slice(-4) + '-4e5f-9a0b-' + ('000000000000' + (O.servers.length * 7919 + 1234)).slice(-12);
    var ns = { id: id, name: nm, status: 'ACTIVE', flavor: fn, image: im, networks: (nw && nw !== true ? nw : 'private') + '=10.0.0.' + (10 + O.servers.length), secgroups: ['default'] };
    if (f.ram > hostFree()) { ns.status = 'ERROR'; ns.fault = 'No valid host was found. There are not enough hosts available.'; ns.networks = ''; }
    O.servers.push(ns); io.o(grid([['Field', 'Value'], ['id', id], ['name', nm], ['status', ns.status === 'ERROR' ? 'BUILD' : 'BUILD'], ['flavor', fn]])); return 0;
  }
  if (k3 === 'server add security' && w[3] === 'group') { var sv = srv(w[4]), g = sg(w[5]); if (!sv) { io.e('No server with a name or ID of \'' + w[4] + '\' exists.\n'); return 1; } if (!g) { io.e('No security group with a name or ID of \'' + w[5] + '\' exists.\n'); return 1; } sv.secgroups = sv.secgroups || ['default']; if (sv.secgroups.indexOf(g.name) < 0) sv.secgroups.push(g.name); return 0; }
  if (k === 'flavor list') { var fr = [['ID', 'Name', 'RAM', 'Disk', 'VCPUs', 'Is Public']]; O.flavors.forEach(function (q, i) { fr.push([String(i + 1), q.name, q.ram, q.disk, q.vcpus, 'True']); }); io.o(grid(fr)); return 0; }
  if (k === 'quota show') { var uu = used(), qq = O.quotas || { instances: 10, cores: 20, ram: 51200 }; io.o(grid([['Resource', 'Limit'], ['cores', qq.cores + ' (used ' + uu.cores + ')'], ['instances', qq.instances + ' (used ' + uu.instances + ')'], ['ram', qq.ram + ' (used ' + uu.ram + ')']])); return 0; }
  if (k === 'network list') { io.o(grid([['ID', 'Name', 'Subnets']].concat((O.networks || ['private', 'public']).map(function (n, i) { return ['net-' + i, n, 'subnet-' + i]; })))); return 0; }
  if (k3 === 'security group list') { io.o(grid([['ID', 'Name', 'Description']].concat(O.secgroups.map(function (q) { return [q.id, q.name, q.desc || '']; })))); return 0; }
  if (k3 === 'security group show') { var gg = sg(w[3]); if (!gg) { io.e('No security group with a name or ID of \'' + (w[3] || '') + '\' exists.\n'); return 1; } io.o(grid([['Field', 'Value'], ['id', gg.id], ['name', gg.name], ['rules', gg.rules.length + ' rule(s)']])); return 0; }
  if (w[0] === 'security' && w[1] === 'group' && w[2] === 'rule' && w[3] === 'list') { var g2 = sg(w[4]); if (!g2) { io.e('No security group with a name or ID of \'' + (w[4] || '') + '\' exists.\n'); return 1; } io.o(grid([['ID', 'IP Protocol', 'Ethertype', 'IP Range', 'Port Range', 'Direction']].concat(g2.rules.map(function (q, i) { return ['rule-' + (i + 1), q.proto || 'None', 'IPv4', q.cidr || '0.0.0.0/0', q.port ? q.port + ':' + q.port : '', q.dir || 'ingress']; })))); return 0; }
  if (w[0] === 'security' && w[1] === 'group' && w[2] === 'rule' && w[3] === 'create') {
    var g3 = sg(w[4]); if (!g3) { io.e('No security group with a name or ID of \'' + (w[4] || '') + '\' exists.\n'); return 1; }
    var pr = o.f.proto || 'tcp', pt = parseInt(o.f['dst-port'], 10), rip = o.f['remote-ip'] && o.f['remote-ip'] !== true ? o.f['remote-ip'] : '0.0.0.0/0';
    if (!/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(rip)) { io.e('Invalid CIDR: ' + rip + ' (HTTP 400)\n'); return 1; }
    if (g3.rules.some(function (q) { return q.proto === pr && q.port === pt && q.cidr === rip; })) { io.e('Security group rule already exists. (HTTP 409)\n'); return 1; }
    g3.rules.push({ proto: pr, port: pt, cidr: rip, dir: 'ingress' }); io.o(grid([['Field', 'Value'], ['protocol', pr], ['port_range_min', pt], ['remote_ip_prefix', rip], ['direction', 'ingress']])); return 0;
  }
  if (k === 'volume list') { io.o(grid([['ID', 'Name', 'Status', 'Size', 'Attached to']].concat((O.volumes || []).map(function (v, i) { return ['vol-' + i, v.name, v.status, v.size, v.attached || '']; })))); return 0; }
  io.e('openstack: \'' + w.join(' ') + '\' is not part of this simulator. Run openstack help to see what it supports.\n'); return 1;
});

/* ---------------------------------------------------------------- storage tools */
function parseG(v) { var m = /^([\d.]+)\s*([GgTtMm]?)/.exec(String(v)); if (!m) return 0; var n = parseFloat(m[1]); return m[2].toUpperCase() === 'T' ? n * 1024 : m[2].toUpperCase() === 'M' ? n / 1024 : n; }
function gtxt(n) { return (n >= 1024 ? (n / 1024).toFixed(1).replace(/\.0$/, '') + 'T' : (Math.round(n * 10) / 10).toString().replace(/\.0$/, '') + 'G'); }
def('lsblk', function (a, io) {
  var S = more(this, 'storage'); if (!S) { io.e('lsblk: not available in this lab\n'); return 1; }
  var rows = [['NAME', 'MAJ:MIN', 'RM', 'SIZE', 'RO', 'TYPE', 'MOUNTPOINTS']];
  S.devices.forEach(function (d, i) { rows.push([(d.child ? (d.last ? '`-' : '|-') : '') + d.name, '8:' + i, '0', gtxt(d.sizeG), '0', d.type, d.mount || '']); });
  io.o(table(rows)); return 0;
});
def('findmnt mount', function (a, io) {
  var S = more(this, 'storage'); if (!S) { io.e('mount: not available in this lab\n'); return 1; }
  if (a.length && a[0] !== '-t' && a[0][0] !== '-') { io.e('mount: only listing is part of this simulator (run mount or findmnt with no arguments)\n'); return 1; }
  var rows = [['TARGET', 'SOURCE', 'FSTYPE', 'OPTIONS']]; S.devices.forEach(function (d) { if (d.mount && d.mount[0] === '/') rows.push([d.mount, '/dev/' + (d.dev || d.name), d.fstype || 'ext4', d.opts || 'rw,relatime']); }); io.o(table(rows)); return 0;
});
function lvm(kind) {
  return function (a, io) {
    var S = more(this, 'storage'); if (!S || !S.vg) { io.e('  No volume groups found\n'); return 0; }
    if (kind === 'pvs') { io.o(table([['PV', 'VG', 'Fmt', 'Attr', 'PSize', 'PFree']].concat((S.pvs || []).map(function (p) { return [p.dev, S.vg.name, 'lvm2', 'a--', gtxt(p.sizeG), gtxt(p.freeG)]; })))); return 0; }
    if (kind === 'vgs') { io.o(table([['VG', '#PV', '#LV', '#SN', 'Attr', 'VSize', 'VFree'], [S.vg.name, (S.pvs || []).length, S.lvs.length, 0, 'wz--n-', gtxt(S.vg.sizeG), gtxt(S.vg.freeG)]])); return 0; }
    io.o(table([['LV', 'VG', 'Attr', 'LSize']].concat(S.lvs.map(function (l) { return [l.name, S.vg.name, '-wi-ao----', gtxt(l.sizeG)]; })))); return 0;
  };
}
T.def('pvs', lvm('pvs')); T.def('vgs', lvm('vgs')); T.def('lvs', lvm('lvs'));
def('lvextend', function (a, io) {
  var S = more(this, 'storage'); if (!S || !S.vg) { io.e('  No volume groups found\n'); return 5; }
  var L = null, r = false, lv = null, i;
  for (i = 0; i < a.length; i++) { if (a[i] === '-L' || a[i] === '--size') L = a[++i]; else if (a[i] === '-r' || a[i] === '--resizefs') r = true; else if (a[i][0] !== '-') lv = a[i]; }
  if (!L || !lv) { io.e('  Please specify either size or extents but not both.\n  Run `lvextend --help\' for more information.\n'); return 3; }
  var name = lv.replace(/^\/dev\/[^/]+\//, ''), l = S.lvs.filter(function (x) { return x.name === name; })[0];
  if (!l) { io.e('  Failed to find logical volume "' + S.vg.name + '/' + name + '"\n'); return 5; }
  var add = /^\+/.test(L) ? parseG(L.slice(1)) : parseG(L) - l.sizeG;
  if (add <= 0) { io.e('  New size (' + gtxt(parseG(L)) + ') matches existing size.\n'); return 0; }
  if (add > S.vg.freeG + 1e-9) { io.e('  Insufficient free space: ' + Math.round(add * 256) + ' extents needed, but only ' + Math.round(S.vg.freeG * 256) + ' available\n'); return 5; }
  S.vg.freeG -= add; l.sizeG += add; (S.pvs || []).some(function (p) { if (p.freeG >= add) { p.freeG -= add; return true; } return false; });
  var out = '  Size of logical volume ' + S.vg.name + '/' + l.name + ' changed from ' + gtxt(l.sizeG - add) + ' to ' + gtxt(l.sizeG) + '.\n  Logical volume ' + S.vg.name + '/' + l.name + ' successfully resized.\n';
  if (r) { var dev = S.devices.filter(function (d) { return d.lv === l.name; })[0]; if (dev) dev.sizeG = l.sizeG; if (this.disks === undefined) this.initDisks(); (this.disks || []).forEach(function (d) { if (d.mount === l.mount) d.size = Math.round(l.sizeG * 1024 * 1024 * 1024); }); out += 'Filesystem at /dev/' + S.vg.name + '/' + l.name + ' is mounted on ' + l.mount + '; on-line resizing required\nThe filesystem on /dev/' + S.vg.name + '/' + l.name + ' is now ' + Math.round(l.sizeG * 262144) + ' (4k) blocks long.\n'; }
  else { var dv = S.devices.filter(function (d) { return d.lv === l.name; })[0]; if (dv) dv.sizeG = l.sizeG; out += '  (the filesystem was not grown: add -r, or run resize2fs / xfs_growfs)\n'; l.fsStale = true; }
  io.o(out); return 0;
});
def('resize2fs xfs_growfs', function (a, io) {
  var S = more(this, 'storage'); if (!S) { io.e('not available in this lab\n'); return 1; }
  var target = a[a.length - 1] || '', l = S.lvs.filter(function (x) { return target.indexOf(x.name) >= 0 || target === x.mount; })[0];
  if (!l) { io.e('resize: no such device or mount point: ' + target + '\n'); return 1; }
  if (this.disks === undefined) this.initDisks(); (this.disks || []).forEach(function (d) { if (d.mount === l.mount) d.size = Math.round(l.sizeG * 1024 * 1024 * 1024); }); l.fsStale = false;
  io.o('The filesystem on ' + target + ' is now ' + Math.round(l.sizeG * 262144) + ' (4k) blocks long.\n'); return 0;
});

/* ---------------------------------------------------------------- nvidia-smi */
def('nvidia-smi', function (a, io) {
  var G = more(this, 'gpu'); if (!G) { io.e('bash: nvidia-smi: command not found\n'); return 127; }
  if (a.indexOf('-L') >= 0) { io.o(G.gpus.map(function (g, i) { return 'GPU ' + i + ': ' + g.name + ' (UUID: GPU-' + (1000 + i) + 'aaaa-bbbb-cccc-dddd)'; }).join('\n') + '\n'); return 0; }
  var lines = ['+-----------------------------------------------------------------------------------------+', '| NVIDIA-SMI 550.54.15              Driver Version: 550.54.15      CUDA Version: 12.4     |', '|-----------------------------------------+------------------------+----------------------+', '| GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC |', '| Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. |', '|=========================================+========================+======================|'];
  G.gpus.forEach(function (g, i) { lines.push('|   ' + i + '  ' + g.name.padEnd(22) + '        Off |   00000000:0' + (i + 1) + ':00.0 Off |                    0 |'); lines.push('| N/A   ' + g.temp + 'C    P0            ' + String(g.power).padStart(4) + 'W / ' + g.cap + 'W |  ' + String(g.usedMiB).padStart(6) + 'MiB / ' + String(g.totalMiB).padStart(6) + 'MiB |     ' + String(g.util).padStart(3) + '%      Default |'); lines.push('|                                         |                        |                  N/A |'); lines.push('+-----------------------------------------+------------------------+----------------------+'); });
  lines.push('', '+-----------------------------------------------------------------------------------------+', '| Processes:                                                                              |', '|  GPU   GI   CI        PID   Type   Process name                              GPU Memory |', '|=========================================================================================|');
  (G.procs || []).forEach(function (p) { lines.push('|    ' + p.gpu + '   N/A  N/A    ' + String(p.pid).padStart(7) + '      C   ' + p.name.padEnd(36) + String(p.mib).padStart(6) + 'MiB |'); });
  lines.push('+-----------------------------------------------------------------------------------------+'); io.o(lines.join('\n') + '\n'); return 0;
});
if (typeof module === 'object' && module.exports) module.exports = T;
}());
