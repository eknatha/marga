/* MARGA terminal engine, part 11: a small simulated Docker engine and docker command.
   Images, containers, networks and volumes are data. What a container does when it starts is worked out from simple rules
   about its image (it needs certain variables, it listens on a port, it needs some memory). It is a model, not Docker. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-k8s.js') : window.MargaTerm;
var def = T.def, pad = T.pad, P = T.Session.prototype;
function J(x) { return JSON.parse(JSON.stringify(x)); }
function hex(s, n) { var h = 2166136261, i, out = ''; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } while (out.length < n) { out += ('00000000' + h.toString(16)).slice(-8); h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; if (!h) h = 7; } return out.slice(0, n); }
function table(rows) { var w = [], out = []; rows.forEach(function (r) { r.forEach(function (c, i) { w[i] = Math.max(w[i] || 0, String(c).length); }); }); rows.forEach(function (r) { out.push(r.map(function (c, i) { return i === r.length - 1 ? String(c) : pad(c, w[i] + 3, true); }).join('')); }); return out.join('\n') + '\n'; }
function normRef(r) { if (r.indexOf('@') > 0) return r; var last = r.split('/').pop(); return last.indexOf(':') >= 0 ? r : r + ':latest'; }
function sizeText(mb) { return mb >= 1000 ? (mb / 1000).toFixed(2) + 'GB' : mb + 'MB'; }
function pathGet(o, p) { return p.split('.').reduce(function (x, k) { return x === undefined || x === null ? x : x[k]; }, o); }
function tmpl(t, obj) { return t.replace(/\{\{\s*\.([\w.]+)\s*\}\}/g, function (m, p) { var v = pathGet(obj, p); return v === undefined ? '<no value>' : typeof v === 'object' ? JSON.stringify(v) : String(v); }); }

P.dkInit = function () {
  if (this.dk) return this.dk;
  var w = (this.world && this.world.docker) || null; if (!w) return null;
  var d = { registry: J(w.registry || {}), images: {}, containers: [], networks: { bridge: { id: hex('bridge', 12) } }, vols: {}, hostPorts: (w.hostPorts || []).slice(), seq: 0 };
  (w.networks || []).forEach(function (n) { d.networks[n] = { id: hex('net' + n, 12) }; });
  (w.local || []).forEach(function (r) { var ref = normRef(r), m = d.registry[ref] || {}; d.images[ref] = Object.assign({ size: 80 }, J(m), { ref: ref, id: hex(ref, 12) }); });
  (w.volumes || []).forEach(function (v) { d.vols[v] = { files: {} }; });
  (w.containers || []).forEach(function (c) { var o = { name: c.name, image: normRef(c.image), ports: c.ports || {}, env: c.env || {}, nets: c.networks || ['bridge'], vols: c.volumes || [], mem: c.mem || 0, files: {}, flags: {} }; o.id = hex('c' + o.name + o.image, 12); d.containers.push(o); startC(d, o, this); if (c.status === 'exited' && o.status === 'running') { o.status = 'exited'; o.exit = c.exit || 0; } });
  this.dk = d; return d;
};
function find(d, nm) { var i; for (i = 0; i < d.containers.length; i++) { var c = d.containers[i]; if (c.name === nm || c.id === nm || (nm.length >= 4 && c.id.indexOf(nm) === 0)) return c; } return null; }
function imgMeta(d, ref) { return d.images[ref] || null; }
/* decide what a container does when it starts */
function startC(d, c, s) {
  var img = imgMeta(d, c.image) || {}, env = Object.assign({}, img.env || {}, c.env), miss = (img.needsEnv || []).filter(function (x) { return env[x] === undefined; });
  c.logs = []; c.oom = false; c.exit = 0; c.status = 'running'; c.started = 1;
  if (img.cmdFile && !(img.files || []).some(function (f) { return f === img.cmdFile || f.slice(-img.cmdFile.length - 1) === '/' + img.cmdFile; })) { c.status = 'exited'; c.exit = 1; c.logs = ["Error: Cannot find module '" + (img.workdir || '/app') + '/' + img.cmdFile + "'", '    at Module._resolveFilename (node:internal/modules/cjs/loader:1144:15)', "  code: 'MODULE_NOT_FOUND'"]; return c; }
  if (miss.length) { c.status = 'exited'; c.exit = 1; c.logs = [img.crashLog || ('Error: required environment variable ' + miss[0] + ' is not set'), 'exiting']; return c; }
  if (c.mem && img.mem && c.mem < img.mem) { c.status = 'exited'; c.exit = 137; c.oom = true; c.logs = ['starting with working set ' + img.mem + 'MB']; return c; }
  if (!img.port && !img.daemon) { c.status = 'exited'; c.exit = 0; c.logs = (img.out || []).slice(); return c; }
  c.logs = (img.log || ['listening on port ' + img.port, 'ready']).slice(); c.env2 = env;
  return c;
}
function userNet(c) { return c.nets.filter(function (n) { return n !== 'bridge'; }); }
function findFile(c, d, s, path) {
  var best = null; (c.vols || []).forEach(function (v) { var dst = v.dst; if (path === dst || path.indexOf(dst.replace(/\/$/, '') + '/') === 0) { if (!best || dst.length > best.dst.length) best = v; } });
  return best;
}
function cread(c, d, s, path) {
  var v = findFile(c, d, s, path), rel;
  if (v) { rel = path.slice(v.dst.length); if (v.type === 'bind') { var t = s.readRaw(v.src + rel); return t; } var vol = d.vols[v.src]; return vol && vol.files[rel || '/'] !== undefined ? vol.files[rel || '/'] : (v.init && v.init[path] !== undefined ? v.init[path] : null); }
  if (c.files[path] !== undefined) return c.files[path];
  var img = imgMeta(d, c.image) || {}; return (img.initFiles || {})[path] !== undefined ? img.initFiles[path] : null;
}
function cwrite(c, d, s, path, text, append) {
  var v = findFile(c, d, s, path), cur = cread(c, d, s, path) || '', data = append ? cur + text : text;
  if (v) { var rel = path.slice(v.dst.length); if (v.type === 'bind') { try { s.writeFile(v.src + rel, data, false); } catch (e) { return false; } return true; } var vol = d.vols[v.src] || (d.vols[v.src] = { files: {} }); vol.files[rel || '/'] = data; return true; }
  c.files[path] = data; return true;
}
function hostReach(d, port) { var i; for (i = 0; i < d.containers.length; i++) { var c = d.containers[i]; if (c.status === 'running' && c.ports[port] !== undefined) return c; } return null; }
/* run a command inside a container; returns {out, err, code} */
function cexec(s, d, c, cmd) {
  var img = imgMeta(d, c.image) || {}, c0 = cmd[0], res = { out: '', err: '', code: 0 };
  if (c0 === 'sh' || c0 === 'bash') { if (cmd[1] === '-c' && cmd[2]) { var line = cmd[2], m = /^echo\s+(.*?)\s*(>>|>)\s*(\S+)$/.exec(line); if (m) { var txt = m[1].replace(/^['"]|['"]$/g, ''); if (!cwrite(c, d, s, m[3], txt + '\n', m[2] === '>>')) { res.err = 'sh: can\'t create ' + m[3] + ': Read-only file system\n'; res.code = 1; } return res; } return cexec(s, d, c, line.split(/\s+/)); } return res; }
  if (c0 === 'whoami') { res.out = (img.user || 'root') + '\n'; return res; }
  if (c0 === 'id') { var u = img.user || 'root'; res.out = u === 'root' ? 'uid=0(root) gid=0(root)\n' : 'uid=1000(' + u + ') gid=1000(' + u + ')\n'; return res; }
  if (c0 === 'hostname') { res.out = c.id + '\n'; return res; }
  if (c0 === 'env' || c0 === 'printenv') { var ev = Object.assign({ HOSTNAME: c.id, PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' }, img.env || {}, c.env); if (cmd[1]) { if (ev[cmd[1]] === undefined) { res.code = 1; return res; } res.out = ev[cmd[1]] + '\n'; return res; } res.out = Object.keys(ev).sort().map(function (x) { return x + '=' + ev[x]; }).join('\n') + '\n'; return res; }
  if (c0 === 'cat') { var t = cread(c, d, s, cmd[1] || ''); if (t === null || t === undefined) { res.err = 'cat: can\'t open \'' + cmd[1] + '\': No such file or directory\n'; res.code = 1; } else res.out = t.replace(/\n?$/, '\n'); return res; }
  if (c0 === 'ls') { var dir = (cmd[1] || '/').replace(/\/$/, ''), names = {}; Object.keys(c.files).concat(Object.keys(img.initFiles || {})).forEach(function (p) { if (p.indexOf(dir + '/') === 0) names[p.slice(dir.length + 1).split('/')[0]] = 1; }); (c.vols || []).forEach(function (v) { if (v.dst.indexOf(dir + '/') === 0) names[v.dst.slice(dir.length + 1).split('/')[0]] = 1; if (v.dst === dir || v.dst.indexOf(dir + '/') < 0 && dir.indexOf(v.dst) === 0) { if (v.type !== 'bind') { var vol = d.vols[v.src]; vol && Object.keys(vol.files).forEach(function (r) { names[r.replace(/^\//, '').split('/')[0]] = 1; }); } else { try { s.listDir(v.src).forEach(function (n) { names[n] = 1; }); } catch (e) { /* ignore */ } } } }); var ks = Object.keys(names).sort(); if (!ks.length && !Object.keys(c.files).length && !(img.initFiles && Object.keys(img.initFiles).length)) { res.err = 'ls: ' + (cmd[1] || '/') + ': No such file or directory\n'; res.code = 1; return res; } res.out = ks.join('\n') + (ks.length ? '\n' : ''); return res; }
  if (c0 === 'wget' || c0 === 'curl') {
    var url = cmd.filter(function (x) { return x.charAt(0) !== '-' && x !== c0; }).pop(); if (!url) { res.err = c0 + ': missing URL\n'; res.code = 1; return res; }
    var um = /^(?:https?:\/\/)?([a-z0-9._-]+?)(?::(\d+))?(\/.*)?$/i.exec(url); if (!um) { res.err = c0 + ': bad URL\n'; res.code = 1; return res; }
    var host = um[1], port = um[2] ? parseInt(um[2], 10) : 80, fail = function (kind) { if (c0 === 'wget') { res.err = kind === 'dns' ? 'wget: bad address \'' + host + '\'\n' : 'wget: can\'t connect to remote host: Connection refused\n'; res.code = 1; } else { res.err = kind === 'dns' ? 'curl: (6) Could not resolve host: ' + host + '\n' : 'curl: (7) Failed to connect to ' + host + ' port ' + port + ': Connection refused\n'; res.code = kind === 'dns' ? 6 : 7; } return res; };
    var target = host === 'localhost' || host === '127.0.0.1' ? c : find(d, host);
    if (!target) return fail('dns');
    if (target !== c && !userNet(c).some(function (n) { return target.nets.indexOf(n) >= 0; })) return fail('dns');
    var timg = imgMeta(d, target.image) || {};
    if (target.status !== 'running' || timg.port !== port) return fail('conn');
    res.out = (timg.body || 'Hello from ' + target.name) + '\n'; return res;
  }
  res.err = 'OCI runtime exec failed: exec failed: unable to start container process: exec: "' + c0 + '": executable file not found in $PATH (this simulator runs sh -c echo, cat, ls, whoami, id, env, printenv, hostname, wget and curl inside containers)\n'; res.code = 126; return res;
}
/* host curl to a published port */
(function () {
  var C = T.commands, orig = C.curl && C.curl.fn;
  if (!orig) return;
  C.curl.fn = function (a, io) {
    var s = this, url = a.filter(function (x) { return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(x); })[0];
    if (url && s.dockerOn()) {
      var d = s.dkInit(), m = /:(\d+)/.exec(url.replace(/^https?:\/\//, '')), port = m ? m[1] : '80', c = hostReach(d, port);
      var quiet = a.some(function (x) { return /^-[a-zA-Z]*s/.test(x); });
      if (!c) { if (!quiet || a.some(function (x) { return /^-[a-zA-Z]*S/.test(x); })) io.e('curl: (7) Failed to connect to localhost port ' + port + ' after 0 ms: Couldn\'t connect to server\n'); else if (!quiet) io.e('curl: (7) Failed to connect\n'); return 7; }
      var img = imgMeta(d, c.image) || {}; io.o((img.body || 'Hello from ' + c.name) + '\n'); return 0;
    }
    return orig.call(this, a, io);
  };
}());
P.dockerOn = function () { return !!(this.world && this.world.docker); };

function parseArgs(a, noValF) {
  var o = { pos: [], f: {}, multi: { p: [], e: [], v: [], l: [] } }, i, VAL = { name: 1, p: 1, publish: 1, e: 1, env: 1, v: 1, volume: 1, network: 1, net: 1, m: 1, memory: 1, f: 1, file: 1, t: 1, tag: 1, format: 1, tail: 1, filter: 1, 'build-arg': 1, user: 1, u: 1, w: 1, workdir: 1, 'restart': 1, 'env-file': 1, entrypoint: 1, 'mount': 1 };
  if (noValF) delete VAL.f;
  for (i = 0; i < a.length; i++) {
    var x = a[i];
    if (o.stop) { o.pos.push(x); continue; }
    if (x.charAt(0) !== '-' || x === '-') { o.pos.push(x); if (o.cmdMode) o.stop = true; continue; }
    if (x.indexOf('--') === 0) { var kv = x.slice(2).split('='), key = kv[0]; var val = kv.length > 1 ? kv.slice(1).join('=') : (VAL[key] && i + 1 < a.length ? a[++i] : true); if (key === 'publish') key = 'p'; if (key === 'env') key = 'e'; if (key === 'volume') key = 'v'; if (key === 'memory') key = 'm'; if (key === 'tag') key = 't'; if (key === 'file') key = 'f'; if (key === 'net') key = 'network'; if (key === 'user') key = 'u'; if (o.multi[key]) o.multi[key].push(val); o.f[key] = val; continue; }
    var ch = x.slice(1, 2);
    if (VAL[ch]) { var v2 = x.length > 2 ? x.slice(2) : (i + 1 < a.length ? a[++i] : true); if (o.multi[ch]) o.multi[ch].push(v2); o.f[ch] = v2; }
    else x.slice(1).split('').forEach(function (c) { o.f[c] = true; });
  }
  return o;
}
function memMb(v) { var m = /^(\d+(?:\.\d+)?)([kmg]?)b?$/i.exec(String(v || '')); if (!m) return 0; var n = parseFloat(m[1]), u = m[2].toLowerCase(); return Math.round(u === 'g' ? n * 1024 : u === 'k' ? n / 1024 : n); }
function portsStr(c) { return Object.keys(c.ports).map(function (h) { return '0.0.0.0:' + h + '->' + c.ports[h] + '/tcp'; }).join(', '); }
function statusStr(c) { return c.status === 'running' ? 'Up 5 minutes' : 'Exited (' + c.exit + ') 4 minutes ago'; }
function inspectObj(c, d) { var img = imgMeta(d, c.image) || {}; var nets = {}; c.nets.forEach(function (n) { nets[n] = { NetworkID: (d.networks[n] || {}).id || '', IPAddress: '172.' + (17 + c.nets.indexOf(n)) + '.0.' + (2 + d.containers.indexOf(c)) }; }); var pb = {}; Object.keys(c.ports).forEach(function (h) { pb[c.ports[h] + '/tcp'] = [{ HostIp: '0.0.0.0', HostPort: String(h) }]; }); return { Id: c.id + hex(c.id, 52), Name: '/' + c.name, Image: (img.id || '') , State: { Status: c.status, Running: c.status === 'running', ExitCode: c.exit, OOMKilled: !!c.oom, Error: '' }, Config: { Image: c.image, User: img.user || '', Env: Object.keys(Object.assign({}, img.env || {}, c.env)).map(function (x) { return x + '=' + Object.assign({}, img.env || {}, c.env)[x]; }), Cmd: img.cmd || null }, HostConfig: { Memory: c.mem ? c.mem * 1048576 : 0, PortBindings: pb, RestartPolicy: { Name: c.restart || 'no' } }, NetworkSettings: { Ports: pb, Networks: nets }, Mounts: (c.vols || []).map(function (v) { return { Type: v.type, Name: v.type === 'volume' ? v.src : undefined, Source: v.src, Destination: v.dst }; }) }; }

function buildImage(s, d, io, o) {
  var ctx = o.pos[0] || '.', ctxAbs = s.abs(ctx), dfPath = o.f.f ? s.abs(o.f.f) : ctxAbs.replace(/\/$/, '') + '/Dockerfile';
  var tag = o.f.t ? normRef(o.f.t) : null;
  var text = s.readRaw(dfPath);
  if (text === null) { io.e('ERROR: failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory\n'); return 1; }
  var ignore = s.readRaw(ctxAbs.replace(/\/$/, '') + '/.dockerignore'), ign = (ignore || '').split('\n').map(function (x) { return x.trim(); }).filter(function (x) { return x && x.charAt(0) !== '#'; });
  function ignored(rel) { return ign.some(function (p) { p = p.replace(/\/$/, ''); return rel === p || rel.indexOf(p + '/') === 0 || (p.charAt(0) === '*' && rel.slice(-(p.length - 1)) === p.slice(1)); }); }
  var ctxFiles = []; try { s.eachFile(ctxAbs, function (p) { var rel = p.slice(ctxAbs.replace(/\/$/, '').length + 1); if (rel && !ignored(rel)) ctxFiles.push(rel); }); } catch (e) { ctxFiles = []; }
  var lines = text.replace(/\\\n/g, ' ').split('\n').map(function (x) { return x.trim(); }).filter(function (x) { return x && x.charAt(0) !== '#'; });
  var steps = lines.length, base = null, have = [], workdir = '/', meta = { env: {}, user: '', cmd: null, port: 0, cmdFile: null }, size = 0, stage = 0, i, rc = 0;
  io.o('[+] Building ' + (steps * 0.3).toFixed(1) + 's (' + steps + '/' + steps + ')\n');
  for (i = 0; i < lines.length; i++) {
    var ln = lines[i], m = /^(\w+)\s*(.*)$/.exec(ln), ins = m ? m[1].toUpperCase() : '', arg = m ? m[2] : '';
    io.o('Step ' + (i + 1) + '/' + steps + ' : ' + ln + '\n');
    if (i === 0 && ins !== 'FROM' && ins !== 'ARG') { io.e('ERROR: failed to solve: dockerfile parse error on line 1: file with no instructions\n'); return 1; }
    if (ins === 'FROM') {
      var ref = arg.split(/\s+/)[0]; stage++;
      if (ref === 'scratch') { base = { size: 0 }; size = 0; } else {
        var bi = d.images[normRef(ref)] || d.registry[normRef(ref)];
        if (!bi) { io.e('ERROR: failed to solve: ' + ref + ': failed to resolve source metadata for docker.io/library/' + normRef(ref) + ': docker.io/library/' + normRef(ref) + ': not found\n'); return 1; }
        base = bi; size = bi.size || 80; if (stage === 1) { meta.env = Object.assign({}, bi.env || {}); meta.user = bi.user || ''; }
      }
      if (stage > 1) { have = []; size = base.size || 80; }
    } else if (ins === 'WORKDIR') { workdir = arg.charAt(0) === '/' ? arg : (workdir.replace(/\/$/, '') + '/' + arg); meta.workdir = workdir; }
    else if (ins === 'COPY' || ins === 'ADD') {
      var parts = arg.replace(/--\S+\s*/g, '').split(/\s+/).filter(Boolean), dest = parts.pop(), srcs = parts;
      if (/--from=/.test(arg)) { have.push('(from stage)'); size += 5; }
      else {
        var all = srcs.length === 1 && (srcs[0] === '.' || srcs[0] === './');
        if (!srcs.length || !dest) { io.e('ERROR: failed to solve: dockerfile parse error: COPY requires at least two arguments\n'); return 1; }
        for (var q = 0; q < srcs.length; q++) {
          var sr = srcs[q].replace(/^\.\//, '').replace(/\/$/, '');
          if (all) { ctxFiles.forEach(function (rel) { have.push(rel); }); size += 4 + ctxFiles.length; break; }
          var hit = ctxFiles.filter(function (rel) { return rel === sr || rel.indexOf(sr + '/') === 0; });
          if (!hit.length) { io.e('ERROR: failed to solve: failed to compute cache key: "/' + sr + '": not found' + (ign.length ? ' (the file may be excluded by .dockerignore)' : '') + '\n'); return 1; }
          hit.forEach(function (rel) { var bn = rel.split('/').pop(); have.push(rel === sr ? (dest.slice(-1) === '/' || dest === '.' ? bn : dest.split('/').pop()) : rel); }); size += 2 + hit.length;
        }
      }
    } else if (ins === 'RUN') {
      var haveFile = function (f) { return have.some(function (h) { return h === f || h.split('/').pop() === f; }); };
      if (/npm (install|ci)\b/.test(arg) && !haveFile('package.json')) { io.e('#' + (i + 2) + ' npm ERR! code ENOENT\nnpm ERR! syscall open\nnpm ERR! path ' + workdir.replace(/\/$/, '') + '/package.json\nnpm ERR! enoent Could not read package.json: Error: ENOENT: no such file or directory\nERROR: failed to solve: process "/bin/sh -c ' + arg + '" did not complete successfully: exit code: 254\n'); return 1; }
      var pr = /pip install(?:\s+--\S+)*\s+-r\s+(\S+)/.exec(arg); if (pr && !haveFile(pr[1])) { io.e('ERROR: Could not open requirements file: [Errno 2] No such file or directory: \'' + pr[1] + '\'\nERROR: failed to solve: process "/bin/sh -c ' + arg + '" did not complete successfully: exit code: 1\n'); return 1; }
      size += /npm|pip|apt|apk|yum/.test(arg) ? 40 : 2;
    }
    else if (ins === 'USER') meta.user = arg.trim();
    else if (ins === 'ENV') { var em = /^(\w+)[= ](.*)$/.exec(arg); if (em) meta.env[em[1]] = em[2].replace(/^"|"$/g, ''); }
    else if (ins === 'EXPOSE') meta.port = parseInt(arg, 10) || 0;
    else if (ins === 'CMD' || ins === 'ENTRYPOINT') { meta.cmd = arg; var jm = null; try { jm = JSON.parse(arg); } catch (e1) { jm = arg.split(/\s+/); } if (Array.isArray(jm) && jm.length > 1 && /^(node|python3?|ruby|sh)$/.test(jm[0]) && /\.[a-z]+$/.test(jm[jm.length - 1])) meta.cmdFile = jm[jm.length - 1]; }
    io.o(' ---> ' + hex(ln + i, 12) + '\n');
  }
  if (!tag) { io.o('Successfully built ' + hex(text, 12) + '\n'); return 0; }
  var img = { ref: tag, id: hex(text + tag, 12), size: Math.max(5, Math.round(size)), env: meta.env, user: meta.user, port: meta.port, cmd: meta.cmd, cmdFile: meta.cmdFile, files: have, workdir: meta.workdir || '/', body: 'Hello from ' + tag.split(':')[0], log: meta.port ? ['listening on port ' + meta.port, 'ready'] : undefined, built: true };
  if (base && base.needsEnv && false) img.needsEnv = base.needsEnv;
  d.images[tag] = img;
  io.o('Successfully built ' + img.id + '\nSuccessfully tagged ' + tag + '\n'); return 0;
}

def('docker', function (a, io) {
  var s = this, d = s.dkInit();
  if (!d) { io.e('Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?\n'); return 1; }
  var verb = a[0]; var rest = a.slice(1);
  if (!verb || verb === 'help' || verb === '--help') { io.o('Usage:  docker COMMAND\n\nCommands in this simulator:\n  run, ps, images, pull, build, stop, start, restart, kill, rm, rmi, logs, exec, inspect, tag,\n  network (create, ls, connect, rm), volume (create, ls, rm), version\n\nExamples:\n  docker run -d --name web -p 8080:80 nginx:1.25\n  docker ps -a\n  docker logs web\n  docker exec web env\n'); return 0; }
  if (verb === 'compose') { io.e('docker compose is not part of this simulator. Practise with docker run, docker network and docker volume instead.\n'); return 1; }
  var o = parseArgs(rest, verb !== 'build' && verb !== 'ps');
  if (verb === 'run' || verb === 'exec') { o = parseArgsCmd(rest, verb); }
  function noCont(nm) { io.e('Error response from daemon: No such container: ' + nm + '\n'); return 1; }
  function needName(r) { if (!r.length) { io.e('"docker ' + verb + '" requires at least 1 argument.\nSee \'docker ' + verb + ' --help\'.\n'); return false; } return true; }
  switch (verb) {
    case 'version': io.o('Client: Docker Engine (simulated)\n Version:           26.0.0\nServer: Docker Engine (simulated)\n Version:           26.0.0\n'); return 0;
    case 'info': io.o('Containers: ' + d.containers.length + '\n Running: ' + d.containers.filter(function (c) { return c.status === 'running'; }).length + '\nImages: ' + Object.keys(d.images).length + '\nServer Version: 26.0.0 (simulated)\n'); return 0;
    case 'pull': {
      if (!needName(o.pos)) return 1; var ref = normRef(o.pos[0]), m = d.registry[ref];
      if (!m) { io.e('Error response from daemon: pull access denied for ' + o.pos[0].split(':')[0] + ', repository does not exist or may require \'docker login\': denied: requested access to the resource is denied\n'); return 1; }
      io.o(ref.split(':')[1] + ': Pulling from library/' + ref.split(':')[0] + '\nDigest: sha256:' + hex(ref, 64) + '\nStatus: ' + (d.images[ref] ? 'Image is up to date for ' : 'Downloaded newer image for ') + ref + '\n');
      if (!d.images[ref]) d.images[ref] = Object.assign({ size: 80 }, J(m), { ref: ref, id: hex(ref, 12) }); return 0;
    }
    case 'images': case 'image': {
      var ia = verb === 'image' ? rest.slice(1) : rest, io2 = parseArgs(ia, true), list = Object.keys(d.images).sort().map(function (r) { return d.images[r]; });
      if (io2.pos[0]) list = list.filter(function (x) { return x.ref.split(':')[0] === io2.pos[0].split(':')[0] && (io2.pos[0].indexOf(':') < 0 || x.ref === normRef(io2.pos[0])); });
      if (io2.f.format) { list.forEach(function (x) { io.o(tmpl(io2.f.format, { Repository: x.ref.split(':')[0], Tag: x.ref.split(':')[1], ID: x.id, Size: sizeText(x.size) }) + '\n'); }); return 0; }
      if (io2.f.q) { list.forEach(function (x) { io.o(x.id + '\n'); }); return 0; }
      io.o(table([['REPOSITORY', 'TAG', 'IMAGE ID', 'CREATED', 'SIZE']].concat(list.map(function (x) { return [x.ref.split(':')[0], x.ref.split(':')[1], x.id, x.built ? '1 minute ago' : '3 weeks ago', sizeText(x.size)]; })))); return 0;
    }
    case 'tag': { if (o.pos.length < 2) { io.e('"docker tag" requires exactly 2 arguments.\n'); return 1; } var src = normRef(o.pos[0]), dst = normRef(o.pos[1]); if (!d.images[src]) { io.e('Error response from daemon: No such image: ' + src + '\n'); return 1; } d.images[dst] = Object.assign({}, J(d.images[src]), { ref: dst }); return 0; }
    case 'rmi': { if (!needName(o.pos)) return 1; var rc2 = 0; o.pos.forEach(function (r) { var ref2 = normRef(r); if (!d.images[ref2]) { io.e('Error response from daemon: No such image: ' + ref2 + '\n'); rc2 = 1; return; } if (d.containers.some(function (c) { return c.image === ref2; }) && !o.f.f) { io.e('Error response from daemon: conflict: unable to remove repository reference "' + ref2 + '" (must force) - container ' + d.containers.filter(function (c) { return c.image === ref2; })[0].id + ' is using its referenced image ' + d.images[ref2].id + '\n'); rc2 = 1; return; } delete d.images[ref2]; io.o('Untagged: ' + ref2 + '\nDeleted: sha256:' + hex(ref2, 64) + '\n'); }); return rc2; }
    case 'build': { return buildImage(s, d, io, o); }
    case 'ps': {
      var cs = d.containers.filter(function (c) { return o.f.a || c.status === 'running'; });
      var flt = o.f.filter || o.f.f; if (typeof flt === 'string') { var fm = /^(\w+)=(.*)$/.exec(flt); if (fm) cs = cs.filter(function (c) { return fm[1] === 'name' ? c.name.indexOf(fm[2]) >= 0 : fm[1] === 'status' ? c.status === fm[2] : true; }); }
      if (o.f.q) { cs.forEach(function (c) { io.o(c.id + '\n'); }); return 0; }
      if (o.f.format) { cs.forEach(function (c) { io.o(tmpl(o.f.format, { ID: c.id, Names: c.name, Image: c.image, Status: statusStr(c), Ports: portsStr(c) }) + '\n'); }); return 0; }
      io.o(table([['CONTAINER ID', 'IMAGE', 'COMMAND', 'CREATED', 'STATUS', 'PORTS', 'NAMES']].concat(cs.map(function (c) { var im = imgMeta(d, c.image) || {}; return [c.id, c.image, '"' + ((im.cmd && String(im.cmd).replace(/[\[\]"]/g, '').replace(/,/g, '').slice(0, 18)) || 'start.sh') + '"', '5 minutes ago', statusStr(c), portsStr(c), c.name]; })))); return 0;
    }
    case 'run': {
      var ref3 = o.imageRef; if (!ref3) { io.e('"docker run" requires at least 1 argument.\n'); return 125; }
      var rr = normRef(ref3), name = o.f.name || ('lab_' + hex(rr + d.seq, 4));
      if (!d.images[rr]) {
        if (d.registry[rr]) { io.o('Unable to find image \'' + rr + '\' locally\n' + rr.split(':')[1] + ': Pulling from library/' + rr.split(':')[0] + '\nStatus: Downloaded newer image for ' + rr + '\n'); d.images[rr] = Object.assign({ size: 80 }, J(d.registry[rr]), { ref: rr, id: hex(rr, 12) }); }
        else { io.e('Unable to find image \'' + rr + '\' locally\ndocker: Error response from daemon: pull access denied for ' + ref3.split(':')[0] + ', repository does not exist or may require \'docker login\': denied: requested access to the resource is denied.\nSee \'docker run --help\'.\n'); return 125; }
      }
      if (find(d, name) && o.f.name) { var ex = find(d, name); io.e('docker: Error response from daemon: Conflict. The container name "/' + name + '" is already in use by container "' + ex.id + hex(ex.id, 52) + '". You have to remove (or rename) that container to be able to reuse that name.\nSee \'docker run --help\'.\n'); return 125; }
      var ports = {}, pbad = null; o.multi.p.forEach(function (p) { var pm = /^(?:[\d.]+:)?(\d+):(\d+)(?:\/tcp)?$/.exec(p); if (pm) ports[pm[1]] = parseInt(pm[2], 10); else pbad = p; });
      if (pbad) { io.e('docker: invalid containerPort: ' + pbad + '.\nSee \'docker run --help\'.\n'); return 125; }
      for (var hp in ports) { if (hostReach(d, hp) || d.hostPorts.indexOf(parseInt(hp, 10)) >= 0) { io.e('docker: Error response from daemon: driver failed programming external connectivity on endpoint ' + name + ' (' + hex(name, 64) + '): Bind for 0.0.0.0:' + hp + ' failed: port is already allocated.\n'); return 125; } }
      var env = {}; o.multi.e.forEach(function (e) { var em = /^([^=]+)=(.*)$/.exec(e); if (em) env[em[1]] = em[2]; else if (e) env[e] = ''; });
      var vols = []; for (var vi = 0; vi < o.multi.v.length; vi++) { var vp = o.multi.v[vi].split(':'); if (vp.length < 2) { io.e('docker: invalid spec: ' + o.multi.v[vi] + ': empty section between colons\n'); return 125; } var type = vp[0].charAt(0) === '/' ? 'bind' : 'volume'; if (type === 'bind' && s.readRaw(vp[0]) === null) { var isDir = false; try { s.walk(vp[0], true, true); isDir = true; } catch (e5) { isDir = false; } if (!isDir) { io.e('docker: Error response from daemon: invalid mount config for type "bind": bind source path does not exist: ' + vp[0] + '\nSee \'docker run --help\'.\n'); return 125; } } if (type === 'volume' && !d.vols[vp[0]]) d.vols[vp[0]] = { files: {} }; vols.push({ src: vp[0], dst: vp[1], type: type, ro: vp[2] === 'ro' }); }
      var net = o.f.network || 'bridge'; if (!d.networks[net]) { io.e('docker: Error response from daemon: network ' + net + ' not found.\n'); return 125; }
      var c = { name: name, image: rr, ports: ports, env: env, nets: [net], vols: vols, mem: memMb(o.f.m), files: {}, flags: {}, restart: o.f.restart, rm: !!o.f.rm };
      d.seq++; c.id = hex('c' + name + rr + d.seq, 12); d.containers.push(c);
      var img = d.images[rr];
      if (o.cmd.length) {
        var r = cexec(s, d, c, o.cmd); if (r.out) io.o(r.out); if (r.err) io.e(r.err);
        { c.status = 'exited'; c.exit = r.code; c.logs = r.out ? r.out.replace(/\n$/, '').split('\n') : []; if (o.f.rm) d.containers.splice(d.containers.indexOf(c), 1); return r.code; }
      }
      startC(d, c, s);
      if (o.f.d) { io.o(c.id + hex(c.id, 52) + '\n'); return 0; }
      c.logs.forEach(function (l) { io.o(l + '\n'); });
      if (c.status === 'running') { c.status = 'exited'; c.exit = 130; io.o('[simulator] A foreground container would keep this terminal busy until Ctrl+C. It was stopped so you can carry on. Use -d to run it in the background.\n'); }
      var code = c.exit === 130 ? 130 : c.exit; if (o.f.rm) d.containers.splice(d.containers.indexOf(c), 1); return code;
    }
    case 'start': case 'stop': case 'restart': case 'kill': {
      if (!needName(o.pos)) return 1; var rcs = 0;
      o.pos.forEach(function (nm) {
        var c2 = find(d, nm); if (!c2) { rcs = noCont(nm); return; }
        if (verb === 'stop' || verb === 'kill') { if (c2.status === 'running') { c2.status = 'exited'; c2.exit = verb === 'kill' ? 137 : 0; } io.o(nm + '\n'); return; }
        for (var hp2 in c2.ports) { var other = hostReach(d, hp2); if (other && other !== c2) { io.e('Error response from daemon: driver failed programming external connectivity on endpoint ' + c2.name + ': Bind for 0.0.0.0:' + hp2 + ' failed: port is already allocated\nError: failed to start containers: ' + nm + '\n'); rcs = 1; return; } }
        startC(d, c2, s); io.o(nm + '\n');
      });
      return rcs;
    }
    case 'rm': {
      if (!needName(o.pos)) return 1; var rcr = 0;
      o.pos.forEach(function (nm) { var c3 = find(d, nm); if (!c3) { rcr = noCont(nm); return; } if (c3.status === 'running' && !o.f.f) { io.e('Error response from daemon: You cannot remove a running container ' + c3.id + hex(c3.id, 52) + '. Stop the container before attempting removal or force remove\n'); rcr = 1; return; } d.containers.splice(d.containers.indexOf(c3), 1); io.o(nm + '\n'); });
      return rcr;
    }
    case 'logs': {
      if (!needName(o.pos)) return 1; var lc = find(d, o.pos[0]); if (!lc) return noCont(o.pos[0]);
      var lg = (lc.logs || []).slice(); if (o.f.tail && !isNaN(parseInt(o.f.tail, 10))) lg = lg.slice(-parseInt(o.f.tail, 10)); lg.forEach(function (l) { io.o(l + '\n'); }); return 0;
    }
    case 'exec': {
      if (!o.pos.length || !o.cmd.length) { io.e('"docker exec" requires at least 2 arguments.\nSee \'docker exec --help\'.\n'); return 1; }
      var ec = find(d, o.pos[0]); if (!ec) return noCont(o.pos[0]);
      if (ec.status !== 'running') { io.e('Error response from daemon: container ' + ec.id + hex(ec.id, 52) + ' is not running\n'); return 1; }
      var er = cexec(s, d, ec, o.cmd); if (er.out) io.o(er.out); if (er.err) io.e(er.err); return er.code;
    }
    case 'inspect': {
      if (!needName(o.pos)) return 1; var objs = [], rci = 0;
      o.pos.forEach(function (nm) { var ic = find(d, nm); if (ic) objs.push(inspectObj(ic, d)); else { var ii = d.images[normRef(nm)]; if (ii) objs.push({ Id: 'sha256:' + hex(ii.ref, 64), RepoTags: [ii.ref], Size: ii.size * 1000000, Config: { User: ii.user || '', ExposedPorts: ii.port ? (function () { var x = {}; x[ii.port + '/tcp'] = {}; return x; }()) : {}, Cmd: ii.cmd || null } }); else { io.e('Error: No such object: ' + nm + '\n'); rci = 1; } } });
      if (o.f.format) { objs.forEach(function (x) { io.o(tmpl(o.f.format, x) + '\n'); }); return rci; }
      if (objs.length) io.o(JSON.stringify(objs, null, 4) + '\n'); return rci;
    }
    case 'network': {
      var ns = rest[0], na = rest.slice(1).filter(function (x) { return x.charAt(0) !== '-'; });
      if (ns === 'ls') { io.o(table([['NETWORK ID', 'NAME', 'DRIVER', 'SCOPE']].concat(Object.keys(d.networks).sort().map(function (n) { return [d.networks[n].id, n, n === 'host' ? 'host' : 'bridge', 'local']; })))); return 0; }
      if (ns === 'create') { if (!na[0]) { io.e('"docker network create" requires exactly 1 argument.\n'); return 1; } if (d.networks[na[0]]) { io.e('Error response from daemon: network with name ' + na[0] + ' already exists\n'); return 1; } d.networks[na[0]] = { id: hex('net' + na[0], 12) }; io.o(d.networks[na[0]].id + hex(na[0], 52) + '\n'); return 0; }
      if (ns === 'connect') { var cn = find(d, na[1] || ''); if (!d.networks[na[0]]) { io.e('Error response from daemon: network ' + na[0] + ' not found\n'); return 1; } if (!cn) return noCont(na[1] || ''); if (cn.nets.indexOf(na[0]) < 0) cn.nets.push(na[0]); return 0; }
      if (ns === 'disconnect') { var cd = find(d, na[1] || ''); if (!cd) return noCont(na[1] || ''); cd.nets = cd.nets.filter(function (n) { return n !== na[0]; }); return 0; }
      if (ns === 'rm') { if (!d.networks[na[0]] || na[0] === 'bridge') { io.e('Error response from daemon: network ' + na[0] + ' not found\n'); return 1; } if (d.containers.some(function (c) { return c.nets.indexOf(na[0]) >= 0; })) { io.e('Error response from daemon: error while removing network: network ' + na[0] + ' has active endpoints\n'); return 1; } delete d.networks[na[0]]; io.o(na[0] + '\n'); return 0; }
      io.e('Usage:  docker network COMMAND (this simulator supports create, ls, connect, disconnect, rm)\n'); return 1;
    }
    case 'volume': {
      var vs = rest[0], va = rest.slice(1).filter(function (x) { return x.charAt(0) !== '-'; });
      if (vs === 'ls') { io.o(table([['DRIVER', 'VOLUME NAME']].concat(Object.keys(d.vols).sort().map(function (v) { return ['local', v]; })))); return 0; }
      if (vs === 'create') { if (!va[0]) { io.e('"docker volume create" requires at most 1 argument.\n'); return 1; } if (!d.vols[va[0]]) d.vols[va[0]] = { files: {} }; io.o(va[0] + '\n'); return 0; }
      if (vs === 'rm') { if (!d.vols[va[0]]) { io.e('Error response from daemon: get ' + va[0] + ': no such volume\n'); return 1; } if (d.containers.some(function (c) { return c.vols.some(function (v) { return v.src === va[0]; }); })) { io.e('Error response from daemon: remove ' + va[0] + ': volume is in use - [' + d.containers.filter(function (c) { return c.vols.some(function (v) { return v.src === va[0]; }); })[0].id + ']\n'); return 1; } delete d.vols[va[0]]; io.o(va[0] + '\n'); return 0; }
      io.e('Usage:  docker volume COMMAND (this simulator supports create, ls, rm)\n'); return 1;
    }
    default: io.e('docker: \'' + verb + '\' is not a docker command in this simulator. Run docker help to see what it supports.\n'); return 1;
  }
});
/* run and exec: options come first, then the image or container, then the command (which may contain dashes) */
function parseArgsCmd(a, verb) {
  var VAL = { name: 1, p: 1, publish: 1, e: 1, env: 1, v: 1, volume: 1, network: 1, net: 1, m: 1, memory: 1, user: 1, u: 1, w: 1, workdir: 1, restart: 1, entrypoint: 1 };
  var o = { pos: [], f: {}, multi: { p: [], e: [], v: [], l: [] }, cmd: [], imageRef: null }, i, seen = false;
  for (i = 0; i < a.length; i++) {
    var x = a[i];
    if (seen) { o.cmd.push(x); continue; }
    if (x.charAt(0) !== '-' || x === '-') { if (verb === 'run') o.imageRef = x; o.pos.push(x); seen = true; continue; }
    if (x.indexOf('--') === 0) { var kv = x.slice(2).split('='), key = kv[0], val = kv.length > 1 ? kv.slice(1).join('=') : (VAL[key] && i + 1 < a.length ? a[++i] : true); var al = { publish: 'p', env: 'e', volume: 'v', memory: 'm', net: 'network', user: 'u' }[key] || key; if (o.multi[al]) o.multi[al].push(val); o.f[al] = val; continue; }
    var ch = x.slice(1, 2);
    if (VAL[ch]) { var v2 = x.length > 2 ? x.slice(2) : (i + 1 < a.length ? a[++i] : true); if (o.multi[ch]) o.multi[ch].push(v2); o.f[ch] = v2; }
    else x.slice(1).split('').forEach(function (c) { o.f[c] = true; });
  }
  return o;
}
if (typeof module === 'object' && module.exports) module.exports = T;
}());
