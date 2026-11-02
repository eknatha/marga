/* MARGA terminal engine, part 10: a small simulated Kubernetes cluster and kubectl.
   Everything is a model written for MARGA. The cluster is data (nodes, deployments, services, config maps) and the pods are
   worked out from that data each time, using simple rules about the images in the lab. It is not a real cluster. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-net.js') : window.MargaTerm;
var def = T.def, pad = T.pad, P = T.Session.prototype;
function yml() { return (typeof jsyaml !== 'undefined') ? jsyaml : (typeof module === 'object' && module.exports ? require('./yaml.js') : null); }
function J(x) { return JSON.parse(JSON.stringify(x)); }
function hash(s, n) { var h = 2166136261, i, out = ''; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } while (out.length < n) { out += h.toString(36).replace(/[^a-z0-9]/g, ''); h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; if (!h) h = 99; } return out.slice(0, n).replace(/[aeiou01]/g, function (c) { return 'bcdfg'[c.charCodeAt(0) % 5]; }); }
function qMem(v) { if (typeof v === 'number') return v; var m = /^(\d+(?:\.\d+)?)(Mi|Gi|Ki|M|G)?$/.exec(String(v || '')); if (!m) return 0; var n = parseFloat(m[1]); return Math.round(m[2] === 'Gi' ? n * 1024 : m[2] === 'Ki' ? n / 1024 : m[2] === 'G' ? n * 953 : m[2] === 'M' ? n * 0.954 : n); }
function qCpu(v) { if (typeof v === 'number') return v; var m = /^(\d+(?:\.\d+)?)(m)?$/.exec(String(v || '')); if (!m) return 0; return m[2] ? Math.round(parseFloat(m[1])) : Math.round(parseFloat(m[1]) * 1000); }

/* ---------------------------------------------------------------- cluster state */
P.k8sInit = function () {
  if (this.k) return this.k;
  var w = (this.world && this.world.k8s) || null;
  if (!w) return null;
  var k = { ns: 'default', namespaces: (w.namespaces || ['default', 'kube-system']).slice(), images: J(w.images || {}), nodes: J(w.nodes || [{ name: 'node-1' }, { name: 'node-2' }, { name: 'node-3' }]), deps: {}, svcs: {}, cms: {}, nodeCpu: w.nodeCpu || 4000, deletedLog: [] };
  k.nodes.forEach(function (n, i) { n.status = n.status || 'Ready'; n.labels = n.labels || {}; n.cordoned = !!n.cordoned; n.idx = i; });
  (w.deployments || []).forEach(function (d) {
    var dep = { name: d.name, ns: d.ns || 'default', replicas: d.replicas === undefined ? 1 : d.replicas, labels: d.labels || { app: d.name }, selector: d.selector || d.labels || { app: d.name },
      tpl: { image: d.image, port: d.port || 0, env: d.env || {}, envFrom: d.envFrom || [], probe: d.probe || '', mem: d.mem || 0, cpu: d.cpu || 0, nodeSelector: d.nodeSelector || {} }, gen: {}, history: [] };
    if (d.prevImage) dep.history.push({ rev: 1, tpl: Object.assign({}, J(dep.tpl), { image: d.prevImage }), cause: 'initial' });
    dep.history.push({ rev: dep.history.length + 1, tpl: J(dep.tpl), cause: d.cause || 'initial' });
    k.deps[dep.ns + '/' + dep.name] = dep;
  });
  (w.services || []).forEach(function (s) { k.svcs[(s.ns || 'default') + '/' + s.name] = { name: s.name, ns: s.ns || 'default', selector: s.selector || {}, port: s.port || 80, targetPort: s.targetPort || s.port || 80 }; });
  (w.configmaps || []).forEach(function (c) { k.cms[(c.ns || 'default') + '/' + c.name] = { name: c.name, ns: c.ns || 'default', data: c.data || {} }; });
  this.k = k; return k;
};
var origClone = P.clone;
P.clone = function () { var s = origClone.call(this); if (this.k) s.k = J(this.k); if (this.dk) s.dk = J(this.dk); return s; };

function depKey(k, ns, name) { return ns + '/' + name; }
function tplHash(t) { return hash(JSON.stringify([t.image, t.env, t.envFrom, t.probe, t.mem, t.cpu, t.nodeSelector, t.port]), 10); }
function imgOf(k, tpl) { return k.images[tpl.image] || null; }
/* what one pod of this template would look like */
function evalTpl(k, dep, tpl) {
  var img = imgOf(k, tpl), r = { status: 'Running', ready: true, restarts: 0, reason: '', msg: '', logs: [], events: [] };
  if (!img) { r.status = 'ImagePullBackOff'; r.ready = false; r.reason = 'ErrImagePull'; r.msg = 'Failed to pull image "' + tpl.image + '": rpc error: code = NotFound desc = failed to pull and unpack image: manifest unknown: manifest unknown'; return r; }
  var env = {}, i, missingCm = null;
  (tpl.envFrom || []).forEach(function (n) { var cm = k.cms[dep.ns + '/' + n]; if (!cm) missingCm = n; else Object.keys(cm.data).forEach(function (x) { env[x] = cm.data[x]; }); });
  if (missingCm) { r.status = 'CreateContainerConfigError'; r.ready = false; r.reason = 'Failed'; r.msg = 'Error: configmap "' + missingCm + '" not found'; return r; }
  Object.keys(tpl.env || {}).forEach(function (x) { env[x] = tpl.env[x]; });
  r.env = env;
  var sel = tpl.nodeSelector || {}, okNodes = k.nodes.filter(function (n) { return n.status === 'Ready' && !n.cordoned && Object.keys(sel).every(function (x) { return n.labels[x] === sel[x]; }); });
  if (!okNodes.length) { r.status = 'Pending'; r.ready = false; r.reason = 'FailedScheduling'; r.msg = Object.keys(sel).length ? '0/' + k.nodes.length + ' nodes are available: ' + k.nodes.length + ' node(s) didn\'t match Pod\'s node affinity/selector.' : '0/' + k.nodes.length + ' nodes are available: ' + k.nodes.length + ' node(s) were unschedulable.'; r.unscheduled = true; return r; }
  if (tpl.cpu && tpl.cpu > k.nodeCpu) { r.status = 'Pending'; r.ready = false; r.reason = 'FailedScheduling'; r.msg = '0/' + k.nodes.length + ' nodes are available: ' + k.nodes.length + ' Insufficient cpu.'; r.unscheduled = true; return r; }
  var need = img.needsEnv || [], miss = need.filter(function (x) { return env[x] === undefined; });
  if (miss.length) { r.status = 'CrashLoopBackOff'; r.ready = false; r.restarts = 5; r.reason = 'Error'; r.msg = 'Back-off restarting failed container'; r.logs = [img.crashLog || ('Error: required environment variable ' + miss[0] + ' is not set'), 'exiting with status 1']; r.last = 'Error, exit code 1'; return r; }
  if (tpl.mem && img.mem && tpl.mem < img.mem) { r.status = 'CrashLoopBackOff'; r.ready = false; r.restarts = 6; r.reason = 'OOMKilled'; r.msg = 'Back-off restarting failed container'; r.logs = ['allocating working memory: ' + img.mem + 'Mi', 'Killed']; r.last = 'OOMKilled, exit code 137'; return r; }
  if (img.health && tpl.probe && tpl.probe !== img.health) { r.ready = false; r.reason = 'Unhealthy'; r.msg = 'Readiness probe failed: HTTP probe failed with statuscode: 404'; }
  r.logs = (img.log || ['listening on port ' + (img.port || 80), 'ready to serve']).slice();
  return r;
}
/* the pods that exist for one deployment */
function depPods(k, dep, nodeCursor) {
  var cur = dep.tpl, st = evalTpl(k, dep, cur), out = [], rs = tplHash(cur), n = dep.replicas, i;
  var old = null;
  if (!st.ready && dep.history.length > 1) {
    for (i = dep.history.length - 2; i >= 0; i--) { var ev = evalTpl(k, dep, dep.history[i].tpl); if (ev.ready) { old = { tpl: dep.history[i].tpl, st: ev }; break; } }
  }
  function mk(tpl, st2, idx, rsh, surge) {
    var name = dep.name + '-' + rsh + '-' + hash(dep.name + rsh + idx + (dep.gen[(surge ? 's' : '') + idx] || 0), 5);
    var okNodes = k.nodes.filter(function (nd) { return nd.status === 'Ready' && !nd.cordoned && Object.keys(tpl.nodeSelector || {}).every(function (x) { return nd.labels[x] === tpl.nodeSelector[x]; }); });
    var node = st2.unscheduled || !okNodes.length ? null : okNodes[(nodeCursor.n++) % okNodes.length];
    return { name: name, ns: dep.ns, dep: dep.name, idx: (surge ? 's' : '') + idx, image: tpl.image, status: st2.status, ready: st2.ready, restarts: st2.restarts, node: node ? node.name : '<none>', ip: node ? '10.244.' + (node.idx + 1) + '.' + (10 + out.length + dep.name.length) : '<none>', reason: st2.reason, msg: st2.msg, logs: st2.logs, last: st2.last || '', env: st2.env || {}, tpl: tpl, labels: dep.labels, rs: rsh };
  }
  if (old) {
    var surge = Math.max(1, Math.ceil(n * 0.25));
    for (i = 0; i < n; i++) out.push(mk(old.tpl, old.st, i, tplHash(old.tpl), false));
    for (i = 0; i < Math.min(surge, n); i++) out.push(mk(cur, st, i, rs, true));
    dep.rolling = true;
  } else { dep.rolling = false; for (i = 0; i < n; i++) out.push(mk(cur, st, i, rs, false)); }
  return out;
}
function allPods(s) {
  var k = s.k, out = [], cur = { n: 0 }, key;
  for (key in k.deps) out = out.concat(depPods(k, k.deps[key], cur));
  out.sort(function (a, b) { return a.ns === b.ns ? (a.name < b.name ? -1 : 1) : (a.ns < b.ns ? -1 : 1); });
  return out;
}
T.k8sPods = allPods;
function endpoints(s, svc) {
  return allPods(s).filter(function (p) { return p.ns === svc.ns && p.ready && Object.keys(svc.selector).length && Object.keys(svc.selector).every(function (x) { return p.labels[x] === svc.selector[x]; }); });
}
function replicasReady(s, dep) { var p = allPods(s).filter(function (x) { return x.ns === dep.ns && x.dep === dep.name; }), cur = tplHash(dep.tpl); return { total: p.length, ready: p.filter(function (x) { return x.ready; }).length, updated: p.filter(function (x) { return x.rs === cur; }).length, updatedReady: p.filter(function (x) { return x.rs === cur && x.ready; }).length }; }

/* ---------------------------------------------------------------- manifests */
function toManifest(s, kind, o) {
  var k = s.k;
  if (kind === 'Deployment') {
    var c = { name: o.name, image: o.tpl.image };
    if (o.tpl.port) c.ports = [{ containerPort: o.tpl.port }];
    var ev = Object.keys(o.tpl.env).map(function (x) { return { name: x, value: String(o.tpl.env[x]) }; }); if (ev.length) c.env = ev;
    if (o.tpl.envFrom.length) c.envFrom = o.tpl.envFrom.map(function (n) { return { configMapRef: { name: n } }; });
    if (o.tpl.probe) c.readinessProbe = { httpGet: { path: o.tpl.probe, port: o.tpl.port || 80 } };
    if (o.tpl.mem || o.tpl.cpu) { c.resources = {}; if (o.tpl.mem) c.resources.limits = { memory: o.tpl.mem + 'Mi' }; if (o.tpl.cpu) c.resources.requests = { cpu: o.tpl.cpu + 'm' }; }
    var sp = { containers: [c] }; if (Object.keys(o.tpl.nodeSelector).length) sp.nodeSelector = o.tpl.nodeSelector;
    return { apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: o.name, namespace: o.ns, labels: o.labels }, spec: { replicas: o.replicas, selector: { matchLabels: o.selector }, template: { metadata: { labels: o.labels }, spec: sp } } };
  }
  if (kind === 'Service') return { apiVersion: 'v1', kind: 'Service', metadata: { name: o.name, namespace: o.ns }, spec: { selector: o.selector, ports: [{ port: o.port, targetPort: o.targetPort }] } };
  if (kind === 'ConfigMap') return { apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: o.name, namespace: o.ns }, data: o.data };
  if (kind === 'Pod') return { apiVersion: 'v1', kind: 'Pod', metadata: { name: o.name, namespace: o.ns, labels: o.labels }, spec: { containers: [{ name: o.dep, image: o.image }], nodeName: o.node }, status: { phase: o.status, podIP: o.ip } };
  if (kind === 'Node') return { apiVersion: 'v1', kind: 'Node', metadata: { name: o.name, labels: o.labels }, spec: { unschedulable: o.cordoned }, status: { conditions: [{ type: 'Ready', status: o.status === 'Ready' ? 'True' : 'False' }] } };
  return {};
}
/* returns a message string on success, or throws {err:'...'} */
function fromManifest(s, m, defaultNs) {
  var k = s.k;
  if (!m || typeof m !== 'object' || !m.kind) throw { err: 'error: unable to recognize: no objects passed to apply' };
  var md = m.metadata || {}, ns = md.namespace || defaultNs || k.ns, name = md.name;
  if (!name) throw { err: 'error: missing metadata.name' };
  if (k.namespaces.indexOf(ns) < 0) throw { err: 'Error from server (NotFound): namespaces "' + ns + '" not found' };
  if (m.kind === 'ConfigMap') { var ck = ns + '/' + name, ex = !!k.cms[ck]; k.cms[ck] = { name: name, ns: ns, data: m.data || {} }; return 'configmap/' + name + (ex ? ' configured' : ' created'); }
  if (m.kind === 'Service') {
    var sp = m.spec || {}, p = (sp.ports || [{}])[0], sk = ns + '/' + name, ex2 = !!k.svcs[sk];
    k.svcs[sk] = { name: name, ns: ns, selector: sp.selector || {}, port: p.port || 80, targetPort: p.targetPort || p.port || 80 }; return 'service/' + name + (ex2 ? ' configured' : ' created');
  }
  if (m.kind === 'Deployment') {
    var spec = m.spec || {}, tm = (spec.template || {}), tl = (tm.metadata || {}).labels || {}, sel = (spec.selector || {}).matchLabels || {};
    var ct = ((tm.spec || {}).containers || [])[0];
    if (!ct || !ct.image) throw { err: 'The Deployment "' + name + '" is invalid: spec.template.spec.containers: Required value' };
    if (!Object.keys(sel).length || !Object.keys(sel).every(function (x) { return tl[x] === sel[x]; })) throw { err: 'The Deployment "' + name + '" is invalid: spec.template.metadata.labels: Invalid value: map[string]string' + JSON.stringify(tl).replace(/[{}"]/g, function (c) { return c === '"' ? '' : c === '{' ? '{' : '}'; }) + ': `selector` does not match template `labels`' };
    var env = {}; (ct.env || []).forEach(function (e) { env[e.name] = e.value === undefined ? '' : String(e.value); });
    var tpl = { image: ct.image, port: ((ct.ports || [])[0] || {}).containerPort || 0, env: env, envFrom: (ct.envFrom || []).map(function (e) { return (e.configMapRef || {}).name; }).filter(Boolean),
      probe: ((ct.readinessProbe || {}).httpGet || {}).path || '', mem: qMem(((ct.resources || {}).limits || {}).memory), cpu: qCpu(((ct.resources || {}).requests || {}).cpu), nodeSelector: (tm.spec || {}).nodeSelector || {} };
    var dk = ns + '/' + name, dep = k.deps[dk], ex3 = !!dep;
    if (!dep) { dep = { name: name, ns: ns, replicas: 1, labels: tl, selector: sel, tpl: tpl, gen: {}, history: [] }; k.deps[dk] = dep; dep.history.push({ rev: 1, tpl: J(tpl), cause: 'kubectl apply' }); }
    else if (JSON.stringify(dep.tpl) !== JSON.stringify(tpl)) { dep.tpl = tpl; dep.history.push({ rev: dep.history.length + 1, tpl: J(tpl), cause: 'kubectl apply' }); }
    dep.replicas = spec.replicas === undefined ? 1 : spec.replicas; dep.labels = tl; dep.selector = sel;
    return 'deployment.apps/' + name + (ex3 ? ' configured' : ' created');
  }
  throw { err: 'error: no matches for kind "' + m.kind + '" in version "' + (m.apiVersion || 'v1') + '" (this simulator knows Deployment, Service and ConfigMap)' };
}

/* ---------------------------------------------------------------- output helpers */
function table(rows) { var w = [], out = []; rows.forEach(function (r) { r.forEach(function (c, i) { w[i] = Math.max(w[i] || 0, String(c).length); }); }); rows.forEach(function (r) { out.push(r.map(function (c, i) { return i === r.length - 1 ? String(c) : pad(c, w[i] + 3, true); }).join('')); }); return out.join('\n') + '\n'; }
function age(p) { return p.status === 'Running' && p.ready ? '5m' : '4m'; }
var KINDS = { po: 'pod', pod: 'pod', pods: 'pod', deploy: 'deployment', deployment: 'deployment', deployments: 'deployment', svc: 'service', service: 'service', services: 'service', no: 'node', node: 'node', nodes: 'node', ns: 'namespace', namespace: 'namespace', namespaces: 'namespace', cm: 'configmap', configmap: 'configmap', configmaps: 'configmap', ep: 'endpoints', endpoints: 'endpoints', ev: 'events', events: 'events', rs: 'replicaset', replicaset: 'replicaset', replicasets: 'replicaset' };
var VAL = { n: 1, namespace: 1, o: 1, output: 1, l: 1, selector: 1, f: 1, filename: 1, replicas: 1, image: 1, p: 1, patch: 1, 'from-literal': 1, port: 1, 'target-port': 1, name: 1, limits: 1, requests: 1, type: 1, c: 1, container: 1, tail: 1, 'sort-by': 1, 'to-revision': 1, 'field-selector': 1 };
function kargs(a) {
  var pos = [], f = {}, i, rest = null;
  for (i = 0; i < a.length; i++) {
    var x = a[i];
    if (x === '--') { rest = a.slice(i + 1); break; }
    if (x.charAt(0) !== '-' || x === '-') { pos.push(x); continue; }
    if (x.indexOf('--') === 0) { var kv = x.slice(2).split('='), key = kv[0]; if (kv.length > 1) f[key] = kv.slice(1).join('='); else if (VAL[key] && i + 1 < a.length) f[key] = a[++i]; else f[key] = true; continue; }
    var ch = x.slice(1, 2); if (x.length > 2 && VAL[ch]) f[ch] = x.slice(2); else if (VAL[ch] && i + 1 < a.length) f[ch] = a[++i]; else f[ch] = true;
    if (x.length > 2 && !VAL[ch]) x.slice(2).split('').forEach(function (c) { f[c] = true; });
  }
  if (f.namespace) f.n = f.namespace; if (f.output) f.o = f.output; if (f.selector) f.l = f.selector; if (f.filename) f.f = f.filename; if (f.A || f['all-namespaces']) f.A = true;
  return { pos: pos, f: f, rest: rest };
}
function splitRes(tok) { var m = /^([^/]+)\/(.+)$/.exec(tok); return m ? { kind: KINDS[m[1]] || m[1], name: m[2] } : { kind: KINDS[tok] || tok, name: null }; }
function matchLabels(labels, sel) { if (!sel) return true; return String(sel).split(',').every(function (c) { var m = /^([^=!]+)(!?=)=?(.*)$/.exec(c.trim()); if (!m) return !!labels[c.trim()]; return m[2] === '=' ? labels[m[1]] === m[3] : labels[m[1]] !== m[3]; }); }
function jsonpath(obj, expr) {
  var m = /^\{(.*)\}$/.exec(expr); if (!m) return null; var path = m[1].replace(/^\./, ''), parts = path.split('.'), cur = [obj], i;
  for (i = 0; i < parts.length; i++) {
    var seg = parts[i]; if (!seg) continue; var mm = /^([^[]*)(?:\[(\*|\d+)\])?$/.exec(seg), nxt = [];
    cur.forEach(function (c) { if (c === undefined || c === null) return; var v = mm[1] ? c[mm[1]] : c; if (mm[2] === '*') (v || []).forEach(function (x) { nxt.push(x); }); else if (mm[2] !== undefined) nxt.push((v || [])[+mm[2]]); else nxt.push(v); });
    cur = nxt;
  }
  return cur.filter(function (v) { return v !== undefined; }).map(function (v) { return typeof v === 'object' ? JSON.stringify(v) : String(v); }).join(' ');
}
function notFound(io, kind, name) { var plural = { pod: 'pods', deployment: 'deployments.apps', service: 'services', node: 'nodes', namespace: 'namespaces', configmap: 'configmaps' }[kind] || kind + 's'; io.e('Error from server (NotFound): ' + plural + ' "' + name + '" not found\n'); return 1; }

/* ---------------------------------------------------------------- kubectl */
def('kubectl k', function (a, io) {
  var s = this, k = s.k8sInit();
  if (!k) { io.e('The connection to the server localhost:8080 was refused - did you specify the right host or port?\n'); return 1; }
  var A = kargs(a), verb = A.pos[0], f = A.f, ns = f.n || k.ns, rest = A.pos.slice(1);
  if (!verb || verb === 'help' || f.help || f.h) { io.o('kubectl controls the simulated Kubernetes cluster in this lab.\n\nCommands in this simulator:\n  get, describe, logs, delete, scale, apply, create, expose, set (image, env, resources), rollout (status, history, undo, restart),\n  patch, label, exec, cordon, uncordon, drain, config (set-context, current-context), cluster-info, version\n\nExamples:\n  kubectl get pods -n default\n  kubectl describe pod NAME\n  kubectl logs NAME\n  kubectl rollout undo deployment/NAME\n'); return 0; }
  function nsOk() { if (k.namespaces.indexOf(ns) < 0 && !f.A) { io.e('No resources found in ' + ns + ' namespace.\n'); return false; } return true; }
  function findDep(tok2, tok3) { var r = tok3 !== undefined ? { kind: KINDS[tok2] || tok2, name: tok3 } : splitRes(tok2); if (r.kind !== 'deployment') return null; return { name: r.name, dep: k.deps[ns + '/' + r.name] }; }
  try {
    switch (verb) {
      case 'version': io.o('Client Version: v1.29.0 (simulated)\nServer Version: v1.29.0 (simulated)\n'); return 0;
      case 'cluster-info': io.o('Kubernetes control plane is running at https://10.0.0.10:6443 (simulated)\nCoreDNS is running at https://10.0.0.10:6443/api/v1/namespaces/kube-system/services/kube-dns:dns/proxy\n'); return 0;
      case 'config': {
        var sub = rest[0];
        if (sub === 'current-context') { io.o('lab-cluster\n'); return 0; }
        if (sub === 'set-context' && f.namespace !== undefined || (sub === 'set-context' && f.n)) { var nn = f.namespace || f.n; if (k.namespaces.indexOf(nn) < 0) { io.o('Context "lab-cluster" modified.\n'); k.ns = nn; return 0; } k.ns = nn; io.o('Context "lab-cluster" modified.\n'); return 0; }
        if (sub === 'get-contexts') { io.o(table([['CURRENT', 'NAME', 'CLUSTER', 'NAMESPACE'], ['*', 'lab-cluster', 'lab-cluster', k.ns]])); return 0; }
        io.e('error: this simulator supports: config current-context, config get-contexts, config set-context --current --namespace=NAME\n'); return 1;
      }
      case 'get': {
        var tok = rest[0]; if (!tok) { io.e('You must specify the type of resource to get. Use "kubectl api-resources" for a complete list of supported resources.\n'); return 1; }
        var r = splitRes(tok), kind = r.kind, name = r.name || rest[1] || null;
        if (tok.indexOf(',') >= 0) { io.e('error: this simulator gets one kind at a time\n'); return 1; }
        if (!nsOk()) return 1;
        var list = [], hdr, row, wide = f.o === 'wide', items = [];
        if (kind === 'pod') {
          list = allPods(s).filter(function (p) { return (f.A || p.ns === ns) && matchLabels(p.labels, f.l) && (!name || p.name === name); });
          if (name && !list.length) return notFound(io, 'pod', name);
          items = list.map(function (p) { return toManifest(s, 'Pod', p); });
          hdr = ['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE'].concat(wide ? ['IP', 'NODE'] : []); if (f.A) hdr.unshift('NAMESPACE');
          row = function (p) { var c = [p.name, (p.ready ? '1/1' : '0/1'), p.status, p.restarts, age(p)].concat(wide ? [p.ip, p.node] : []); if (f.A) c.unshift(p.ns); return c; };
        } else if (kind === 'deployment') {
          list = Object.keys(k.deps).map(function (x) { return k.deps[x]; }).filter(function (d) { return (f.A || d.ns === ns) && matchLabels(d.labels, f.l) && (!name || d.name === name); }).sort(function (x, y) { return x.name < y.name ? -1 : 1; });
          if (name && !list.length) return notFound(io, 'deployment', name);
          items = list.map(function (d) { return toManifest(s, 'Deployment', d); });
          hdr = ['NAME', 'READY', 'UP-TO-DATE', 'AVAILABLE', 'AGE']; if (f.A) hdr.unshift('NAMESPACE');
          row = function (d) { var rr = replicasReady(s, d), c = [d.name, rr.ready + '/' + d.replicas, rr.updated, rr.ready, '5m']; if (f.A) c.unshift(d.ns); return c; };
        } else if (kind === 'replicaset') {
          list = []; Object.keys(k.deps).forEach(function (x) { var d = k.deps[x]; if (!f.A && d.ns !== ns) return; var seen = {}; allPods(s).filter(function (p) { return p.ns === d.ns && p.dep === d.name; }).forEach(function (p) { if (!seen[p.rs]) seen[p.rs] = { name: d.name + '-' + p.rs, desired: 0, ready: 0, ns: d.ns }; seen[p.rs].desired++; if (p.ready) seen[p.rs].ready++; }); Object.keys(seen).forEach(function (y) { list.push(seen[y]); }); });
          hdr = ['NAME', 'DESIRED', 'CURRENT', 'READY', 'AGE']; row = function (x) { return [x.name, x.desired, x.desired, x.ready, '5m']; };
        } else if (kind === 'service') {
          list = Object.keys(k.svcs).map(function (x) { return k.svcs[x]; }).filter(function (v) { return (f.A || v.ns === ns) && (!name || v.name === name); });
          if (name && !list.length) return notFound(io, 'service', name);
          items = list.map(function (v) { return toManifest(s, 'Service', v); });
          hdr = ['NAME', 'TYPE', 'CLUSTER-IP', 'EXTERNAL-IP', 'PORT(S)', 'AGE']; row = function (v) { return [v.name, 'ClusterIP', '10.96.' + (hash(v.name, 2).charCodeAt(0) % 200) + '.' + (10 + v.name.length), '<none>', v.port + '/TCP', '5m']; };
        } else if (kind === 'endpoints') {
          list = Object.keys(k.svcs).map(function (x) { return k.svcs[x]; }).filter(function (v) { return (f.A || v.ns === ns) && (!name || v.name === name); });
          if (name && !list.length) return notFound(io, 'endpoints', name);
          hdr = ['NAME', 'ENDPOINTS', 'AGE']; row = function (v) { var e = endpoints(s, v).map(function (p) { return p.ip + ':' + v.targetPort; }); return [v.name, e.length ? e.join(',') : '<none>', '5m']; };
        } else if (kind === 'node') {
          list = k.nodes.filter(function (n) { return !name || n.name === name; }); if (name && !list.length) return notFound(io, 'node', name);
          items = list.map(function (n) { return toManifest(s, 'Node', n); });
          hdr = ['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION']; row = function (n) { return [n.name, n.status + (n.cordoned ? ',SchedulingDisabled' : ''), n.idx === 0 ? 'control-plane,worker' : 'worker', '12d', 'v1.29.0']; };
        } else if (kind === 'namespace') {
          list = k.namespaces.filter(function (n) { return !name || n === name; }); if (name && !list.length) return notFound(io, 'namespace', name);
          hdr = ['NAME', 'STATUS', 'AGE']; row = function (n) { return [n, 'Active', '12d']; };
        } else if (kind === 'configmap') {
          list = Object.keys(k.cms).map(function (x) { return k.cms[x]; }).filter(function (c) { return (f.A || c.ns === ns) && (!name || c.name === name); });
          if (name && !list.length) return notFound(io, 'configmap', name);
          items = list.map(function (c) { return toManifest(s, 'ConfigMap', c); });
          hdr = ['NAME', 'DATA', 'AGE']; row = function (c) { return [c.name, Object.keys(c.data).length, '5m']; };
        } else if (kind === 'events') {
          var evs = []; allPods(s).filter(function (p) { return f.A || p.ns === ns; }).forEach(function (p) { if (p.reason) evs.push(['2m', p.ready ? 'Warning' : 'Warning', p.reason, 'pod/' + p.name, p.msg]); });
          if (!evs.length) { io.e('No resources found in ' + ns + ' namespace.\n'); return 0; }
          io.o(table([['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE']].concat(evs))); return 0;
        } else { io.e('error: the server doesn\'t have a resource type "' + tok + '" (this simulator knows pods, deployments, replicasets, services, endpoints, nodes, namespaces, configmaps, events)\n'); return 1; }
        if (f.o === 'name') { list.forEach(function (x) { io.o(kind + (kind === 'deployment' ? '.apps' : '') + '/' + (x.name || x) + '\n'); }); return 0; }
        if (f.o === 'yaml' || f.o === 'json' || (f.o && f.o.indexOf('jsonpath=') === 0)) {
          if (!items.length) { io.e('error: output format not supported for ' + kind + '\n'); return 1; }
          var single = !!name, obj = single ? items[0] : { apiVersion: 'v1', kind: 'List', items: items };
          if (f.o === 'json') { io.o(JSON.stringify(obj, null, 2) + '\n'); return 0; }
          if (f.o === 'yaml') { var Y = yml(); io.o(Y.dump(obj, { noRefs: true, lineWidth: -1 })); return 0; }
          io.o(jsonpath(obj, f.o.slice(9).replace(/^'|'$/g, '')) + '\n'); return 0;
        }
        if (!list.length) { io.e('No resources found' + (kind === 'node' || kind === 'namespace' ? '' : ' in ' + ns + ' namespace') + '.\n'); return 0; }
        io.o(table([hdr].concat(list.map(row)))); return 0;
      }
      case 'describe': {
        var dr = splitRes(rest[0] || ''), dn = dr.name || rest[1];
        if (!rest[0] || !dn) { io.e('error: you must specify the type of resource to describe\n'); return 1; }
        if (dr.kind === 'pod') {
          var pp = allPods(s).filter(function (p) { return p.ns === ns && (p.name === dn); })[0] || allPods(s).filter(function (p) { return p.ns === ns && p.name.indexOf(dn) === 0; })[0];
          if (!pp) return notFound(io, 'pod', dn);
          var lines = ['Name:             ' + pp.name, 'Namespace:        ' + pp.ns, 'Node:             ' + pp.node + (pp.node === '<none>' ? '' : '/10.0.0.' + (11 + k.nodes.filter(function (n) { return n.name === pp.node; })[0].idx)), 'Labels:           ' + Object.keys(pp.labels).map(function (x) { return x + '=' + pp.labels[x]; }).join(','), 'Status:           ' + (pp.status === 'Pending' ? 'Pending' : 'Running'), 'IP:               ' + (pp.ip === '<none>' ? '' : pp.ip), 'Containers:', '  ' + pp.dep + ':', '    Image:          ' + pp.image, '    Port:           ' + (pp.tpl.port ? pp.tpl.port + '/TCP' : '<none>'), '    State:          ' + (pp.status === 'Running' ? 'Running' : pp.status === 'CrashLoopBackOff' ? 'Waiting\n      Reason:       CrashLoopBackOff' : pp.status === 'ImagePullBackOff' ? 'Waiting\n      Reason:       ' + pp.status : pp.status === 'CreateContainerConfigError' ? 'Waiting\n      Reason:       CreateContainerConfigError' : 'Pending')];
          if (pp.last) lines.push('    Last State:     Terminated\n      Reason:       ' + pp.last.split(',')[0] + '\n      Exit Code:    ' + (/137/.test(pp.last) ? '137' : '1'));
          lines.push('    Ready:          ' + (pp.ready ? 'True' : 'False'), '    Restart Count:  ' + pp.restarts);
          if (pp.tpl.mem) lines.push('    Limits:\n      memory:  ' + pp.tpl.mem + 'Mi');
          if (pp.tpl.probe) lines.push('    Readiness:      http-get http://:' + (pp.tpl.port || 80) + pp.tpl.probe + ' delay=0s timeout=1s period=10s');
          var ek = Object.keys(pp.tpl.env); lines.push('    Environment:' + (ek.length || pp.tpl.envFrom.length ? '' : '    <none>')); ek.forEach(function (x) { lines.push('      ' + x + ':  ' + pp.tpl.env[x]); }); pp.tpl.envFrom.forEach(function (n) { lines.push('    Environment Variables from:\n      ' + n + '  ConfigMap  Optional: false'); });
          lines.push('Events:', '  Type     Reason     Age   Message', '  ----     ------     ----  -------');
          if (pp.node === '<none>') lines.push('  Warning  FailedScheduling  2m   default-scheduler  ' + pp.msg); else lines.push('  Normal   Scheduled  5m    default-scheduler  Successfully assigned ' + pp.ns + '/' + pp.name + ' to ' + pp.node);
          if (pp.status === 'ImagePullBackOff') lines.push('  Normal   Pulling    4m    kubelet  Pulling image "' + pp.image + '"', '  Warning  Failed     4m    kubelet  ' + pp.msg, '  Warning  Failed     3m    kubelet  Error: ImagePullBackOff');
          else if (pp.status === 'CrashLoopBackOff') lines.push('  Normal   Pulled     4m    kubelet  Successfully pulled image "' + pp.image + '"', '  Warning  BackOff    2m    kubelet  Back-off restarting failed container ' + pp.dep + ' in pod ' + pp.name);
          else if (pp.status === 'CreateContainerConfigError') lines.push('  Warning  Failed     3m    kubelet  ' + pp.msg);
          else if (pp.status === 'Running' && !pp.ready) lines.push('  Warning  Unhealthy  1m    kubelet  ' + pp.msg);
          io.o(lines.join('\n') + '\n'); return 0;
        }
        if (dr.kind === 'deployment') {
          var dd = k.deps[ns + '/' + dn]; if (!dd) return notFound(io, 'deployment', dn);
          var rr2 = replicasReady(s, dd);
          io.o(['Name:                   ' + dd.name, 'Namespace:              ' + dd.ns, 'Labels:                 ' + Object.keys(dd.labels).map(function (x) { return x + '=' + dd.labels[x]; }).join(','), 'Selector:               ' + Object.keys(dd.selector).map(function (x) { return x + '=' + dd.selector[x]; }).join(','), 'Replicas:               ' + dd.replicas + ' desired | ' + rr2.updated + ' updated | ' + rr2.total + ' total | ' + rr2.ready + ' available | ' + (rr2.total - rr2.ready) + ' unavailable', 'StrategyType:           RollingUpdate', 'Pod Template:', '  Containers:', '   ' + dd.name + ':', '    Image:      ' + dd.tpl.image, '    Port:       ' + (dd.tpl.port ? dd.tpl.port + '/TCP' : '<none>'), (dd.tpl.mem ? '    Limits:     memory: ' + dd.tpl.mem + 'Mi' : '    Limits:     <none>'), (dd.tpl.probe ? '    Readiness:  http-get http://:' + (dd.tpl.port || 80) + dd.tpl.probe : '    Readiness:  <none>'), '    Environment:' + (Object.keys(dd.tpl.env).length || dd.tpl.envFrom.length ? Object.keys(dd.tpl.env).map(function (x) { return '\n      ' + x + ':  ' + dd.tpl.env[x]; }).join('') + dd.tpl.envFrom.map(function (n) { return '\n      (from configmap ' + n + ')'; }).join('') : '  <none>'), 'Conditions:', '  Type           Status', '  Available      ' + (rr2.ready >= 1 ? 'True' : 'False'), '  Progressing    ' + (dd.rolling && rr2.updatedReady < dd.replicas ? 'False' : 'True')].join('\n') + '\n'); return 0;
        }
        if (dr.kind === 'service') {
          var sv = k.svcs[ns + '/' + dn]; if (!sv) return notFound(io, 'service', dn);
          var eps = endpoints(s, sv).map(function (p) { return p.ip + ':' + sv.targetPort; });
          io.o(['Name:              ' + sv.name, 'Namespace:         ' + sv.ns, 'Selector:          ' + (Object.keys(sv.selector).map(function (x) { return x + '=' + sv.selector[x]; }).join(',') || '<none>'), 'Type:              ClusterIP', 'Port:              <unset>  ' + sv.port + '/TCP', 'TargetPort:        ' + sv.targetPort + '/TCP', 'Endpoints:         ' + (eps.join(',') || '<none>')].join('\n') + '\n'); return 0;
        }
        if (dr.kind === 'node') {
          var nd = k.nodes.filter(function (n) { return n.name === dn; })[0]; if (!nd) return notFound(io, 'node', dn);
          var np = allPods(s).filter(function (p) { return p.node === nd.name; });
          io.o(['Name:               ' + nd.name, 'Labels:             ' + (Object.keys(nd.labels).map(function (x) { return x + '=' + nd.labels[x]; }).join(',') || '<none>'), 'Unschedulable:      ' + nd.cordoned, 'Conditions:', '  Ready   ' + (nd.status === 'Ready' ? 'True' : 'False'), 'Capacity:', '  cpu:     ' + (k.nodeCpu / 1000), 'Non-terminated Pods: (' + np.length + ' in total)'].concat(np.map(function (p) { return '  ' + p.ns + '  ' + p.name; })).join('\n') + '\n'); return 0;
        }
        io.e('error: this simulator describes pods, deployments, services and nodes\n'); return 1;
      }
      case 'logs': {
        var pn = rest[0]; if (!pn) { io.e('error: expected \'logs [-f] [-p] (POD | TYPE/NAME) [-c CONTAINER]\'.\n'); return 1; }
        var lp = pn.indexOf('/') > 0 ? null : allPods(s).filter(function (p) { return p.ns === ns && p.name === pn; })[0];
        if (!lp && /^(deploy|deployment)\//.test(pn)) { var dn2 = pn.split('/')[1]; lp = allPods(s).filter(function (p) { return p.ns === ns && p.dep === dn2; })[0]; }
        if (!lp) return notFound(io, 'pod', pn);
        if (lp.status === 'ImagePullBackOff') { io.e('Error from server (BadRequest): container "' + lp.dep + '" in pod "' + lp.name + '" is waiting to start: trying and failing to pull image\n'); return 1; }
        if (lp.status === 'CreateContainerConfigError') { io.e('Error from server (BadRequest): container "' + lp.dep + '" in pod "' + lp.name + '" is waiting to start: CreateContainerConfigError\n'); return 1; }
        if (lp.status === 'Pending') { io.e('Error from server (BadRequest): pod ' + lp.name + ' does not have a host assigned\n'); return 1; }
        var lg = lp.logs.slice(); if (f.tail) lg = lg.slice(-parseInt(f.tail, 10)); io.o(lg.join('\n') + '\n'); return 0;
      }
      case 'delete': {
        var del = rest[0] || ''; if (f.f) { var mf = s.readRaw(s.abs(f.f)); if (mf === null) { io.e('error: the path "' + f.f + '" does not exist\n'); return 1; } try { yml().loadAll(mf, function (m) { if (!m) return; var nm = (m.metadata || {}).name, nn2 = (m.metadata || {}).namespace || ns, kd = { Deployment: 'deps', Service: 'svcs', ConfigMap: 'cms' }[m.kind]; if (kd && k[kd][nn2 + '/' + nm]) { delete k[kd][nn2 + '/' + nm]; io.o(m.kind.toLowerCase() + '/' + nm + ' deleted\n'); } }); } catch (e1) { io.e('error: ' + e1.message + '\n'); return 1; } return 0; }
        var dd2 = splitRes(del), dnames = dd2.name ? [dd2.name] : rest.slice(1);
        if (!dnames.length) { io.e('error: resource(s) were provided, but no name was specified\n'); return 1; }
        var rc = 0;
        dnames.forEach(function (nm) {
          if (dd2.kind === 'pod') { var tp = allPods(s).filter(function (p) { return p.ns === ns && p.name === nm; })[0]; if (!tp) { rc = notFound(io, 'pod', nm); return; } var dep3 = k.deps[ns + '/' + tp.dep]; dep3.gen[tp.idx] = (dep3.gen[tp.idx] || 0) + 1; io.o('pod "' + nm + '" deleted\n'); return; }
          var map = { deployment: 'deps', service: 'svcs', configmap: 'cms' }[dd2.kind];
          if (map) { if (!k[map][ns + '/' + nm]) { rc = notFound(io, dd2.kind, nm); return; } delete k[map][ns + '/' + nm]; io.o((dd2.kind === 'deployment' ? 'deployment.apps' : dd2.kind) + ' "' + nm + '" deleted\n'); return; }
          if (dd2.kind === 'namespace') { var ix = k.namespaces.indexOf(nm); if (ix < 0) { rc = notFound(io, 'namespace', nm); return; } k.namespaces.splice(ix, 1); ['deps', 'svcs', 'cms'].forEach(function (m2) { Object.keys(k[m2]).forEach(function (x) { if (x.indexOf(nm + '/') === 0) delete k[m2][x]; }); }); io.o('namespace "' + nm + '" deleted\n'); return; }
          io.e('error: the server doesn\'t have a resource type "' + del + '"\n'); rc = 1;
        });
        return rc;
      }
      case 'scale': {
        var sd = findDep(rest[0], rest[1]); if (!sd) { io.e('error: this simulator scales deployments: kubectl scale deployment/NAME --replicas=N\n'); return 1; }
        if (!sd.dep) return notFound(io, 'deployment', sd.name); if (f.replicas === undefined || isNaN(parseInt(f.replicas, 10))) { io.e('error: required flag(s) "replicas" not set\n'); return 1; }
        sd.dep.replicas = Math.max(0, parseInt(f.replicas, 10)); io.o('deployment.apps/' + sd.name + ' scaled\n'); return 0;
      }
      case 'apply': case 'create': {
        if (verb === 'create' && !f.f) {
          var what = rest[0];
          if (what === 'namespace' || what === 'ns') { if (!rest[1]) { io.e('error: exactly one NAME is required, got 0\n'); return 1; } if (k.namespaces.indexOf(rest[1]) >= 0) { io.e('Error from server (AlreadyExists): namespaces "' + rest[1] + '" already exists\n'); return 1; } k.namespaces.push(rest[1]); io.o('namespace/' + rest[1] + ' created\n'); return 0; }
          if (what === 'configmap' || what === 'cm') { var cn = rest[1]; if (!cn) { io.e('error: exactly one NAME is required, got 0\n'); return 1; } if (k.cms[ns + '/' + cn]) { io.e('Error from server (AlreadyExists): configmaps "' + cn + '" already exists\n'); return 1; } var data = {}; a.forEach(function (x, i) { var m = /^--from-literal=(.*?)=(.*)$/.exec(x); if (m) data[m[1]] = m[2]; else if (x === '--from-literal' && a[i + 1]) { var mm = /^(.*?)=(.*)$/.exec(a[i + 1]); if (mm) data[mm[1]] = mm[2]; } }); k.cms[ns + '/' + cn] = { name: cn, ns: ns, data: data }; io.o('configmap/' + cn + ' created\n'); return 0; }
          if (what === 'deployment' || what === 'deploy') {
            var dn3 = rest[1]; if (!dn3) { io.e('error: exactly one NAME is required, got 0\n'); return 1; } if (!f.image) { io.e('error: required flag(s) "image" not set\n'); return 1; }
            if (k.deps[ns + '/' + dn3]) { io.e('Error from server (AlreadyExists): deployments.apps "' + dn3 + '" already exists\n'); return 1; }
            var im = imgOf(k, { image: f.image }); var tpl2 = { image: f.image, port: im && im.port ? im.port : 0, env: {}, envFrom: [], probe: '', mem: 0, cpu: 0, nodeSelector: {} };
            k.deps[ns + '/' + dn3] = { name: dn3, ns: ns, replicas: f.replicas ? parseInt(f.replicas, 10) : 1, labels: { app: dn3 }, selector: { app: dn3 }, tpl: tpl2, gen: {}, history: [{ rev: 1, tpl: J(tpl2), cause: 'kubectl create' }] };
            io.o('deployment.apps/' + dn3 + ' created\n'); return 0;
          }
          io.e('error: this simulator creates deployments, namespaces and configmaps, or objects from a file with -f\n'); return 1;
        }
        if (!f.f) { io.e('error: must specify one of -f and -k\n'); return 1; }
        var txt = s.readRaw(s.abs(f.f)); if (txt === null) { io.e('error: the path "' + f.f + '" does not exist\n'); return 1; }
        var docs = [], Y2 = yml();
        try { Y2.loadAll(txt, function (d) { if (d) docs.push(d); }); } catch (e2) { io.e('error: error parsing ' + f.f + ': ' + String(e2.message).split('\n')[0] + '\n'); return 1; }
        if (!docs.length) { io.e('error: no objects passed to ' + verb + '\n'); return 1; }
        var rcs = 0;
        docs.forEach(function (d) { try { io.o(fromManifest(s, d, f.n) + '\n'); } catch (er) { if (er && er.err) { io.e(er.err + '\n'); rcs = 1; } else throw er; } });
        return rcs;
      }
      case 'expose': {
        var ed = findDep(rest[0], rest[1]); if (!ed) { io.e('error: this simulator exposes deployments: kubectl expose deployment NAME --port=80\n'); return 1; }
        if (!ed.dep) return notFound(io, 'deployment', ed.name); if (!f.port) { io.e('error: --port must be specified\n'); return 1; }
        var sn = f.name || ed.name; if (k.svcs[ns + '/' + sn]) { io.e('Error from server (AlreadyExists): services "' + sn + '" already exists\n'); return 1; }
        k.svcs[ns + '/' + sn] = { name: sn, ns: ns, selector: J(ed.dep.selector), port: parseInt(f.port, 10), targetPort: f['target-port'] ? parseInt(f['target-port'], 10) : parseInt(f.port, 10) };
        io.o('service/' + sn + ' exposed\n'); return 0;
      }
      case 'set': {
        var what2 = rest[0], target = rest[1] ? splitRes(rest[1]) : null, tn = target && target.name;
        if (!tn && rest[2]) { target = { kind: KINDS[rest[1]] || rest[1], name: rest[2] }; tn = rest[2]; }
        if (!target || target.kind !== 'deployment') { io.e('error: this simulator sets image, env and resources on deployments: kubectl set image deployment/NAME NAME=IMAGE\n'); return 1; }
        var sdep = k.deps[ns + '/' + tn]; if (!sdep) return notFound(io, 'deployment', tn);
        var tpl3 = J(sdep.tpl), args2 = rest.slice(rest[1] && rest[1].indexOf('/') > 0 ? 2 : 3);
        if (what2 === 'image') { var mi = /^([^=]+)=(.+)$/.exec(args2[0] || ''); if (!mi) { io.e('error: at least one image update is required\n'); return 1; } if (mi[1] !== sdep.name && mi[1] !== '*') { io.e('error: unable to find container named "' + mi[1] + '"\n'); return 1; } tpl3.image = mi[2]; }
        else if (what2 === 'env') { if (!args2.length) { io.e('error: at least one environment variable must be specified\n'); return 1; } args2.forEach(function (x) { var me = /^([A-Za-z_][A-Za-z0-9_]*)(-?)=?(.*)$/.exec(x); if (!me) return; if (me[2] === '-' && x.slice(-1) === '-') delete tpl3.env[me[1]]; else { var kv2 = x.split('='); tpl3.env[kv2[0]] = kv2.slice(1).join('='); } }); }
        else if (what2 === 'resources') { if (f.limits) { var ml = /memory=(\S+?)(?:,|$)/.exec(f.limits); if (ml) tpl3.mem = qMem(ml[1]); } if (f.requests) { var mr = /cpu=(\S+?)(?:,|$)/.exec(f.requests); if (mr) tpl3.cpu = qCpu(mr[1]); } }
        else { io.e('error: unknown set command "' + what2 + '"\n'); return 1; }
        if (JSON.stringify(tpl3) !== JSON.stringify(sdep.tpl)) { sdep.tpl = tpl3; sdep.history.push({ rev: sdep.history.length + 1, tpl: J(tpl3), cause: 'kubectl set ' + what2 }); }
        io.o('deployment.apps/' + tn + ' ' + (what2 === 'image' ? 'image updated' : what2 === 'env' ? 'env updated' : 'resource requirements updated') + '\n'); return 0;
      }
      case 'rollout': {
        var act = rest[0], rt = rest[1] ? splitRes(rest[1]) : null, rn = rt && rt.name;
        if (!rn && rest[2]) { rt = { kind: KINDS[rest[1]] || rest[1], name: rest[2] }; rn = rest[2]; }
        if (!rt || rt.kind !== 'deployment') { io.e('error: this simulator rolls out deployments: kubectl rollout status deployment/NAME\n'); return 1; }
        var rdep = k.deps[ns + '/' + rn]; if (!rdep) return notFound(io, 'deployment', rn);
        if (act === 'status') {
          var rr3 = replicasReady(s, rdep);
          if (rr3.updatedReady >= rdep.replicas && rr3.total === rdep.replicas) { io.o('deployment "' + rn + '" successfully rolled out\n'); return 0; }
          io.o('Waiting for deployment "' + rn + '" rollout to finish: ' + rr3.updated + ' out of ' + rdep.replicas + ' new replicas have been updated...\nWaiting for deployment "' + rn + '" rollout to finish: ' + rr3.updatedReady + ' of ' + rdep.replicas + ' updated replicas are available...\n');
          io.e('error: deployment "' + rn + '" exceeded its progress deadline\n'); return 1;
        }
        if (act === 'history') { io.o('deployment.apps/' + rn + '\n' + table([['REVISION', 'CHANGE-CAUSE']].concat(rdep.history.map(function (h) { return [h.rev, h.cause]; })))); return 0; }
        if (act === 'undo') {
          if (rdep.history.length < 2) { io.e('error: no rollout history found for deployment "' + rn + '"\n'); return 1; }
          var target2 = f['to-revision'] ? rdep.history.filter(function (h) { return h.rev === parseInt(f['to-revision'], 10); })[0] : rdep.history[rdep.history.length - 2];
          if (!target2) { io.e('error: unable to find specified revision ' + f['to-revision'] + ' in history\n'); return 1; }
          rdep.tpl = J(target2.tpl); rdep.history.push({ rev: rdep.history.length + 1, tpl: J(target2.tpl), cause: 'rollback to revision ' + target2.rev });
          io.o('deployment.apps/' + rn + ' rolled back\n'); return 0;
        }
        if (act === 'restart') { rdep.gen.r = (rdep.gen.r || 0) + 1; Object.keys(rdep.gen).forEach(function (x) { if (x !== 'r') rdep.gen[x]++; }); for (var q = 0; q < rdep.replicas; q++) rdep.gen[q] = (rdep.gen[q] || 0) + 1; io.o('deployment.apps/' + rn + ' restarted\n'); return 0; }
        io.e('error: unknown rollout command "' + act + '"\n'); return 1;
      }
      case 'patch': {
        var pt = rest[0] ? splitRes(rest[0]) : null, pn2 = pt && pt.name || rest[1];
        if (!pt || !f.p) { io.e('error: must specify -p and a resource: kubectl patch deployment NAME -p \'{"spec":{"replicas":3}}\'\n'); return 1; }
        var kd2 = { deployment: 'deps', service: 'svcs', configmap: 'cms' }[pt.kind]; if (!kd2) { io.e('error: this simulator patches deployments, services and configmaps\n'); return 1; }
        var obj2 = k[kd2][ns + '/' + pn2]; if (!obj2) return notFound(io, pt.kind, pn2);
        var patch; try { patch = JSON.parse(f.p); } catch (e3) { io.e('error: unable to parse "' + f.p + '": ' + e3.message + '\n'); return 1; }
        var man = toManifest(s, { deps: 'Deployment', svcs: 'Service', cms: 'ConfigMap' }[kd2], obj2);
        (function merge(t, p) { Object.keys(p).forEach(function (x) { if (p[x] && typeof p[x] === 'object' && !Array.isArray(p[x]) && t[x] && typeof t[x] === 'object' && !Array.isArray(t[x])) merge(t[x], p[x]); else if (Array.isArray(p[x]) && Array.isArray(t[x]) && x === 'containers') { p[x].forEach(function (c, i) { if (t[x][i]) merge(t[x][i], c); else t[x][i] = c; }); } else if (p[x] === null) delete t[x]; else t[x] = p[x]; }); })(man, patch);
        try { fromManifest(s, man, ns); } catch (e4) { if (e4 && e4.err) { io.e(e4.err + '\n'); return 1; } throw e4; }
        io.o((pt.kind === 'deployment' ? 'deployment.apps' : pt.kind) + '/' + pn2 + ' patched\n'); return 0;
      }
      case 'label': {
        var lt = rest[0] ? splitRes(rest[0]) : null, ln = lt && lt.name || rest[1], lab = rest.slice(lt && lt.name ? 1 : 2);
        if (!lt || lt.kind !== 'node') { io.e('error: this simulator labels nodes: kubectl label node NAME key=value\n'); return 1; }
        var lnode = k.nodes.filter(function (n) { return n.name === ln; })[0]; if (!lnode) return notFound(io, 'node', ln);
        lab.forEach(function (x) { var m = /^([^=]+)=(.*)$/.exec(x); if (m) lnode.labels[m[1]] = m[2]; else if (/-$/.test(x)) delete lnode.labels[x.slice(0, -1)]; });
        io.o('node/' + ln + ' labeled\n'); return 0;
      }
      case 'exec': {
        var ep = rest[0]; var cmd = A.rest || rest.slice(1); if (!ep || !cmd.length) { io.e('error: you must specify at least one command for the container\n'); return 1; }
        var xp = /^(deploy|deployment)\//.test(ep) ? allPods(s).filter(function (p) { return p.ns === ns && p.dep === ep.split('/')[1] && p.ready; })[0] || allPods(s).filter(function (p) { return p.ns === ns && p.dep === ep.split('/')[1]; })[0] : allPods(s).filter(function (p) { return p.ns === ns && p.name === ep; })[0]; if (!xp) return notFound(io, 'pod', ep);
        if (xp.status !== 'Running') { io.e('error: unable to upgrade connection: container not found ("' + xp.dep + '")\n'); return 1; }
        var c0 = cmd[0];
        if (c0 === 'env' || c0 === 'printenv') { var ev2 = Object.assign({ HOSTNAME: xp.name, KUBERNETES_SERVICE_HOST: '10.96.0.1' }, xp.env); if (cmd[1]) { if (ev2[cmd[1]] === undefined) return 1; io.o(ev2[cmd[1]] + '\n'); return 0; } Object.keys(ev2).sort().forEach(function (x) { io.o(x + '=' + ev2[x] + '\n'); }); return 0; }
        if (c0 === 'hostname') { io.o(xp.name + '\n'); return 0; }
        if (c0 === 'wget' || c0 === 'curl') {
          var url = cmd.filter(function (x) { return /^(https?:\/\/)?[a-z0-9.-]+(:\d+)?(\/.*)?$/i.test(x) && x.charAt(0) !== '-'; }).pop(); if (!url) { io.e(c0 + ': missing URL\n'); return 1; }
          var um = /^(?:https?:\/\/)?([a-z0-9.-]+?)(?::(\d+))?(\/.*)?$/i.exec(url), host = um[1].replace(/\.(default\.)?svc(\.cluster\.local)?$/, ''), port = um[2] ? parseInt(um[2], 10) : 80;
          var tsvc = k.svcs[xp.ns + '/' + host];
          if (!tsvc) { io.e(c0 === 'wget' ? 'wget: bad address \'' + host + '\'\n' : 'curl: (6) Could not resolve host: ' + host + '\n'); return c0 === 'wget' ? 1 : 6; }
          if (port !== tsvc.port) { io.e(c0 === 'wget' ? 'wget: can\'t connect to remote host: Connection refused\n' : 'curl: (7) Failed to connect to ' + host + ' port ' + port + ': Connection refused\n'); return c0 === 'wget' ? 1 : 7; }
          var eps2 = endpoints(s, tsvc);
          if (!eps2.length) { io.e(c0 === 'wget' ? 'wget: can\'t connect to remote host: Connection refused\n' : 'curl: (7) Failed to connect to ' + host + ' port ' + port + ': Connection refused\n'); return c0 === 'wget' ? 1 : 7; }
          var eimg = k.images[eps2[0].tpl.image] || {};
          if (eimg.port && eimg.port !== tsvc.targetPort) { io.e(c0 === 'wget' ? 'wget: can\'t connect to remote host: Connection refused\n' : 'curl: (7) Failed to connect to ' + host + ' port ' + port + ': Connection refused\n'); return c0 === 'wget' ? 1 : 7; }
          io.o((eimg.body || 'Welcome to ' + eps2[0].dep) + '\n'); return 0;
        }
        io.e('OCI runtime exec failed: exec failed: unable to start container process: exec: "' + c0 + '": executable file not found in $PATH (this simulator runs env, printenv, hostname, wget and curl inside pods)\n'); return 126;
      }
      case 'cordon': case 'uncordon': {
        var cn2 = rest[0]; var cnode = k.nodes.filter(function (n) { return n.name === cn2; })[0]; if (!cnode) return notFound(io, 'node', cn2 || '');
        cnode.cordoned = verb === 'cordon'; io.o('node/' + cn2 + (verb === 'cordon' ? ' cordoned' : ' uncordoned') + '\n'); return 0;
      }
      case 'drain': {
        var dnn = rest[0]; var dnode = k.nodes.filter(function (n) { return n.name === dnn; })[0]; if (!dnode) return notFound(io, 'node', dnn || '');
        dnode.cordoned = true; io.o('node/' + dnn + ' cordoned\n');
        if (!f['ignore-daemonsets'] && dnode.daemon !== false) { io.e('error: unable to drain node "' + dnn + '" due to error: cannot delete DaemonSet-managed Pods (use --ignore-daemonsets to ignore): kube-system/kube-proxy-' + hash(dnn, 5) + '\n'); return 1; }
        var mv = allPods(s).filter(function (p) { return p.node === dnn; }).length;
        io.o('evicting pods from ' + dnn + ' (' + mv + ' pods)\nnode/' + dnn + ' drained\n'); return 0;
      }
      default: io.e('error: unknown command "' + verb + '" for "kubectl" (run kubectl help to see what this simulator supports)\n'); return 1;
    }
  } catch (ex) { if (ex && ex.err) { io.e(ex.err + '\n'); return 1; } throw ex; }
});
if (typeof module === 'object' && module.exports) module.exports = T;
}());
