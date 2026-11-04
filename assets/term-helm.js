/* MARGA terminal engine, part 14: a small simulated Helm.
   It reads a chart folder in the lab (Chart.yaml, values.yaml, templates/*.yaml), renders a short list of Go-template forms
   ({{ .Values.x }}, .Release, .Chart, if / else / end, quote, default, upper, lower, required) and keeps releases in the session.
   It is a model of Helm, not Helm: no sub-charts, no repositories, no cluster. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-iac.js') : window.MargaTerm;
var def = T.def;
function J(x) { return JSON.parse(JSON.stringify(x)); }

/* a small YAML reader: maps, nested maps, "- item" lists of scalars, scalars. Enough for Chart.yaml and values files. */
function scalar(v) {
  v = v.replace(/\s+#.*$/, '').trim();
  if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return v.slice(1, -1);
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  if (v === 'true') return true; if (v === 'false') return false; if (v === 'null' || v === '~' || v === '') return null;
  if (v === '{}') return {}; if (v === '[]') return [];
  return v;
}
function yaml(text) {
  var lines = text.split('\n').filter(function (l) { return l.trim() && l.trim()[0] !== '#'; }), pos = 0;
  function indent(l) { return l.match(/^ */)[0].length; }
  function block(ind) {
    var first = lines[pos]; if (first === undefined) return null;
    if (/^\s*- /.test(first)) { var arr = []; while (pos < lines.length && indent(lines[pos]) === ind && /^\s*- /.test(lines[pos])) { arr.push(scalar(lines[pos].replace(/^\s*- /, ''))); pos++; } return arr; }
    var obj = {};
    while (pos < lines.length && indent(lines[pos]) === ind) {
      var l = lines[pos], m = /^\s*("?[\w.\-\/]+"?)\s*:\s*(.*)$/.exec(l); if (!m) { pos++; continue; }
      var k = m[1].replace(/"/g, ''), rest = m[2]; pos++;
      if (rest === '' || /^#/.test(rest)) { if (pos < lines.length && indent(lines[pos]) > ind) obj[k] = block(indent(lines[pos])); else if (pos < lines.length && indent(lines[pos]) === ind && /^\s*- /.test(lines[pos])) obj[k] = block(ind); else obj[k] = null; }
      else obj[k] = scalar(rest);
    }
    return obj;
  }
  if (!lines.length) return {};
  return block(indent(lines[0]));
}
function merge(a, b) { Object.keys(b || {}).forEach(function (k) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) merge(a[k], b[k]); else a[k] = J(b[k]); }); return a; }
function setPath(o, p, v) { var parts = p.split('.'), i; for (i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; } o[parts[parts.length - 1]] = v; }
function toDump(o, ind) { ind = ind || 0; var pad = new Array(ind + 1).join(' '), out = ''; Object.keys(o).forEach(function (k) { var v = o[k]; if (v && typeof v === 'object' && !Array.isArray(v)) out += pad + k + ':\n' + toDump(v, ind + 2); else if (Array.isArray(v)) out += pad + k + ':\n' + v.map(function (x) { return pad + '- ' + x + '\n'; }).join(''); else out += pad + k + ': ' + (v === null ? 'null' : v) + '\n'; }); return out; }

/* the template language */
function Fail(msg) { this.msg = msg; }
function lookup(path, ctx, at) {
  var parts = path.replace(/^\./, '').split('.'), cur = ctx, i;
  for (i = 0; i < parts.length; i++) { if (cur === undefined || cur === null || typeof cur !== 'object') { if (i > 0) throw new Fail('template: ' + at.name + ':' + at.line + ': executing "' + at.name + '" at <' + path + '>: nil pointer evaluating interface {}.' + parts[i]); return undefined; } cur = cur[parts[i]]; }
  return cur;
}
function evalExpr(expr, ctx, at) {
  var segs = expr.split('|').map(function (x) { return x.trim(); }), val, i, m;
  function atom(t) {
    t = t.trim();
    if (/^".*"$/.test(t)) return t.slice(1, -1); if (/^-?\d+$/.test(t)) return parseInt(t, 10); if (t === 'true' || t === 'false') return t === 'true';
    if (t[0] === '.') return lookup(t, ctx, at);
    throw new Fail('template: ' + at.name + ':' + at.line + ': function "' + t.split(/\s/)[0] + '" not defined');
  }
  var first = segs[0];
  if ((m = /^required\s+("(?:[^"]*)")\s+(.+)$/.exec(first))) { var rv = atom(m[2]); if (rv === undefined || rv === null || rv === '') throw new Fail('execution error at (' + at.name + ':' + at.line + '): ' + m[1].slice(1, -1)); val = rv; }
  else if ((m = /^(default)\s+(.+?)\s+(\.\S+)$/.exec(first))) { var dv = atom(m[3]); val = (dv === undefined || dv === null || dv === '' || dv === 0 || dv === false) ? atom(m[2]) : dv; }
  else val = atom(first);
  for (i = 1; i < segs.length; i++) {
    var f = segs[i].split(/\s+/);
    if (f[0] === 'quote') val = '"' + (val === undefined || val === null ? '' : String(val)) + '"';
    else if (f[0] === 'upper') val = String(val).toUpperCase(); else if (f[0] === 'lower') val = String(val).toLowerCase();
    else if (f[0] === 'default') { if (val === undefined || val === null || val === '') val = atom(f.slice(1).join(' ')); }
    else if (f[0] === 'int') val = parseInt(val, 10); else if (f[0] === 'toString') val = String(val);
    else throw new Fail('template: ' + at.name + ':' + at.line + ': function "' + f[0] + '" not defined');
  }
  return val;
}
function truthy(v) { return !(v === undefined || v === null || v === false || v === 0 || v === '' || (Array.isArray(v) && !v.length) || (typeof v === 'object' && v && !Array.isArray(v) && !Object.keys(v).length)); }
function render(src, ctx, name) {
  var re = /\{\{(-?)\s*([\s\S]*?)\s*(-?)\}\}/g, out = '', last = 0, m, stack = [], on = true;
  function lineOf(idx) { return src.slice(0, idx).split('\n').length; }
  while ((m = re.exec(src))) {
    var before = src.slice(last, m.index); if (m[1] === '-') before = before.replace(/\s+$/, '');
    if (on) out += before;
    last = re.lastIndex; if (m[3] === '-') { var rest = src.slice(last), ws = /^\s+/.exec(rest); if (ws) { last += ws[0].length; re.lastIndex = last; } }
    var e = m[2].trim(), at = { name: name, line: lineOf(m.index) };
    if (/^\/\*/.test(e)) continue;
    var mm;
    if ((mm = /^if\s+(.+)$/.exec(e))) { var cond = on ? truthy(evalExpr(mm[1].replace(/^not\s+/, ''), ctx, at)) !== /^not\s/.test(mm[1]) : false; stack.push({ was: on, cond: cond }); on = on && cond; continue; }
    if (e === 'else') { var t = stack[stack.length - 1]; if (!t) throw new Fail('template: ' + name + ':' + at.line + ': unexpected {{else}}'); on = t.was && !t.cond; continue; }
    if (e === 'end') { var t2 = stack.pop(); if (!t2) throw new Fail('template: ' + name + ':' + at.line + ': unexpected {{end}}'); on = t2.was; continue; }
    if (!on) continue;
    var v = evalExpr(e, ctx, at); out += v === undefined || v === null ? '<no value>' : String(v);
  }
  if (stack.length) throw new Fail('template: ' + name + ': unexpected EOF');
  if (on) out += src.slice(last);
  return out;
}

/* kubernetes-ish checks on rendered manifests */
function kubeCheck(manifest) {
  var m = /\n\s*replicas:\s*(.*)\n/.exec('\n' + manifest + '\n');
  if (m && !/^\d+$/.test(m[1].trim())) return 'Deployment in version "v1" cannot be created: json: cannot unmarshal string into Go struct field DeploymentSpec.spec.replicas of type int32';
  var im = /\bimage:\s*(\S*)/.exec(manifest);
  if (im && (/:$/.test(im[1]) || im[1] === '""' || im[1] === '')) return 'Pod "' + 'app' + '" is invalid: spec.containers[0].image: Invalid value: "' + im[1] + '": invalid reference format';
  var pm = /\n\s*(?:containerPort|port):\s*(.*)\n/.exec('\n' + manifest + '\n');
  if (pm && !/^\d+$/.test(pm[1].trim())) return 'Service in version "v1" cannot be handled: port must be an integer, got ' + pm[1].trim();
  return null;
}
function chartOf(s, dir, io, cmd) {
  var base = s.abs(dir), meta = s.readRaw(base + '/Chart.yaml');
  if (meta === null) { io.e('Error: path "' + dir + '" not found\n'); return null; }
  var c = { dir: base, meta: yaml(meta) || {}, values: yaml(s.readRaw(base + '/values.yaml') || '') || {}, tpls: [] };
  var names = []; try { names = s.listDir(base + '/templates'); } catch (e) { names = []; }
  names.filter(function (n) { return /\.(ya?ml|tpl|txt)$/.test(n); }).sort().forEach(function (n) { if (n[0] === '_') return; c.tpls.push({ name: n, src: s.readRaw(base + '/templates/' + n) || '' }); });
  return c;
}
function parseOpts(s, a) {
  var o = { pos: [], files: [], sets: [], ns: 'default', flags: {} }, i;
  for (i = 0; i < a.length; i++) {
    var x = a[i];
    if ((x === '-f' || x === '--values') && a[i + 1]) { o.files.push(a[++i]); }
    else if (x === '--set' && a[i + 1]) o.sets.push(a[++i]); else if (x.indexOf('--set=') === 0) o.sets.push(x.slice(6));
    else if (x === '--set-string' && a[i + 1]) o.sets.push(a[++i]);
    else if ((x === '-n' || x === '--namespace') && a[i + 1]) o.ns = a[++i]; else if (x.indexOf('--namespace=') === 0) o.ns = x.slice(12);
    else if (x === '-A' || x === '--all-namespaces') o.flags.all = true;
    else if (x === '--version' && a[i + 1]) o.flags.version = a[++i];
    else if (x === '--create-namespace' || x === '--install' || x === '-i' || x === '--wait' || x === '--atomic' || x === '--dry-run' || x === '-a' || x === '--all' || x === '--short' || x === '--strict') { o.flags[x.replace(/^-+/, '')] = true; if (x === '-i') o.flags.install = true; if (x === '-a') o.flags.all = true; }
    else if (x === '-o' && a[i + 1]) o.flags.out = a[++i]; else if (x.indexOf('--output=') === 0) o.flags.out = x.slice(9);
    else if (x === '--revision' && a[i + 1]) o.flags.revision = a[++i];
    else if (x === '--timeout' && a[i + 1]) i++;
    else if (x[0] === '-') { /* unknown flag: ignore */ } else o.pos.push(x);
  }
  return o;
}
function buildValues(s, chart, o, io) {
  var vals = J(chart.values), user = {}, i;
  for (i = 0; i < o.files.length; i++) { var t = s.readRaw(s.abs(o.files[i])); if (t === null) { io.e('Error: INSTALLATION FAILED: open ' + o.files[i] + ': no such file or directory\n'); return null; } var yv = yaml(t) || {}; merge(vals, yv); merge(user, yv); }
  o.sets.forEach(function (st) { st.split(',').forEach(function (kv) { var m = /^([^=]+)=(.*)$/.exec(kv); if (m) { setPath(vals, m[1], scalar(m[2])); setPath(user, m[1], scalar(m[2])); } }); });
  o.user = user;
  return vals;
}
function renderChart(chart, vals, rel, io, verb) {
  var ctx = { Values: vals, Release: { Name: rel.name, Namespace: rel.ns, Revision: rel.rev, IsInstall: rel.rev === 1, IsUpgrade: rel.rev > 1 }, Chart: { Name: chart.meta.name, Version: chart.meta.version, AppVersion: chart.meta.appVersion } }, out = [];
  var i;
  for (i = 0; i < chart.tpls.length; i++) {
    var t = chart.tpls[i];
    try { var txt = render(t.src, ctx, chart.meta.name + '/templates/' + t.name); if (txt.trim()) out.push({ src: chart.meta.name + '/templates/' + t.name, text: txt.replace(/\n+$/, '\n') }); }
    catch (e) { if (e instanceof Fail) { io.e('Error: ' + verb + ' FAILED: ' + (e.msg.indexOf('execution error') === 0 ? e.msg : 'parse error at (' + e.msg.replace(/^template: /, '') + ')') + '\n'); return null; } throw e; }
  }
  return out;
}
function manifestText(parts) { return parts.map(function (p) { return '---\n# Source: ' + p.src + '\n' + p.text; }).join(''); }
function relKey(ns, n) { return ns + '/' + n; }
function fmtDate(d) { return d || 'Mon Nov  3 10:00:00 2026'; }
function table(rows) { var w = [], out = ''; rows.forEach(function (r) { r.forEach(function (c, i) { w[i] = Math.max(w[i] || 0, String(c).length); }); }); rows.forEach(function (r) { out += r.map(function (c, i) { return i === r.length - 1 ? c : String(c).padEnd(w[i] + 3, ' '); }).join('') + '\n'; }); return out; }
function helmHelp(io) { io.o('The Kubernetes package manager (simulated)\n\nCommands in this simulator:\n  lint CHART | template NAME CHART | install NAME CHART | upgrade [--install] NAME CHART\n  list [-A|-n NS] | status NAME | history NAME | rollback NAME [REVISION]\n  uninstall NAME | get values NAME [-a] | get manifest NAME\n\nFlags: -f FILE, --set key=value, -n NAMESPACE, --version\nThe simulator reads a chart folder and keeps releases in this terminal session. It has no cluster and no repositories.\n'); }

def('helm', function (a, io) {
  var s = this, mx = s.mxInit(), R = mx.helm.rel, sub = a[0];
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') { helmHelp(io); return 0; }
  if (sub === 'version') { io.o('version.BuildInfo{Version:"v3.16.2", GoVersion:"go1.22.7"}\n'); return 0; }
  var o = parseOpts(s, a.slice(1)), p = o.pos;
  if (sub === 'lint') {
    var dir = p[0] || '.', ch = chartOf(s, dir, io); if (!ch) return 1;
    var msgs = [], errs = 0;
    if (!ch.meta.name) { msgs.push('[ERROR] Chart.yaml: name is required'); errs++; }
    if (!ch.meta.version) { msgs.push('[ERROR] Chart.yaml: version is required'); errs++; }
    if (!ch.meta.apiVersion) { msgs.push('[ERROR] Chart.yaml: apiVersion is required'); errs++; }
    if (!ch.meta.icon) msgs.push('[INFO] Chart.yaml: icon is recommended');
    var vals = buildValues(s, ch, o, io); if (!vals) return 1;
    ch.tpls.forEach(function (t) { try { render(t.src, { Values: vals, Release: { Name: 'release-name', Namespace: 'default', Revision: 1 }, Chart: ch.meta }, ch.meta.name + '/templates/' + t.name); } catch (e) { if (e instanceof Fail) { msgs.push('[ERROR] templates/' + t.name + ': ' + e.msg.replace(/^template: /, 'parse error at (').replace(/$/, ')')); errs++; } else throw e; } });
    io.o('==> Linting ' + dir + '\n' + (msgs.length ? msgs.join('\n') + '\n' : '') + '\n' + (errs ? errs + ' chart(s) linted, 1 chart(s) failed\n' : '1 chart(s) linted, 0 chart(s) failed\n')); return errs ? 1 : 0;
  }
  if (sub === 'template' || sub === 'install' || sub === 'upgrade') {
    var name = p[0], dir2 = p[1];
    if (!name || !dir2) { io.e('Error: "helm ' + sub + '" requires 2 arguments: NAME CHART\n'); return 1; }
    var chart = chartOf(s, dir2, io); if (!chart) return 1;
    var vs = buildValues(s, chart, o, io); if (!vs) return 1;
    var key = relKey(o.ns, name), cur = R[key], verb = sub === 'upgrade' ? 'UPGRADE' : 'INSTALLATION';
    if (sub === 'install' && cur) { io.e('Error: INSTALLATION FAILED: cannot re-use a name that is still in use\n'); return 1; }
    if (sub === 'upgrade' && !cur && !o.flags.install) { io.e('Error: UPGRADE FAILED: "' + name + '" has no deployed releases\n'); return 1; }
    var rev = (cur && cur.revs.length ? cur.revs[cur.revs.length - 1].rev : 0) + 1;
    var parts = renderChart(chart, vs, { name: name, ns: o.ns, rev: rev }, io, sub === 'template' ? 'INSTALLATION' : verb); if (!parts) return 1;
    var man = manifestText(parts);
    if (sub === 'template') { io.o(man); return 0; }
    var bad = kubeCheck(man);
    var entry = { rev: rev, chart: chart.meta.name + '-' + chart.meta.version, appVersion: chart.meta.appVersion || '', values: vs, user: o.user, manifest: man, status: bad ? 'failed' : 'deployed', desc: bad ? (verb === 'UPGRADE' ? 'Upgrade' : 'Install') + ' "' + name + '" failed: ' + bad : (rev === 1 ? 'Install complete' : 'Upgrade complete'), updated: fmtDate() };
    if (bad) {
      if (o.flags.atomic) { io.e('Error: ' + verb + ' FAILED: ' + bad + '\nrolling back "' + name + '" changes...\n'); return 1; }
      if (cur) { cur.revs.forEach(function (r2) { if (r2.status === 'deployed') r2.status = 'superseded'; }); }
      if (!cur) { cur = R[key] = { ns: o.ns, name: name, revs: [] }; } cur.revs.push(entry);
      io.e('Error: ' + verb + ' FAILED: ' + bad + '\n'); return 1;
    }
    if (!cur) cur = R[key] = { ns: o.ns, name: name, revs: [] };
    cur.revs.forEach(function (r3) { if (r3.status === 'deployed') r3.status = 'superseded'; }); cur.revs.push(entry);
    io.o('Release "' + name + '" has been ' + (rev === 1 ? 'installed' : 'upgraded') + '. Happy Helming!\nNAME: ' + name + '\nLAST DEPLOYED: ' + entry.updated + '\nNAMESPACE: ' + o.ns + '\nSTATUS: deployed\nREVISION: ' + rev + '\n'); return 0;
  }
  if (sub === 'list' || sub === 'ls') {
    var rows = [['NAME', 'NAMESPACE', 'REVISION', 'UPDATED', 'STATUS', 'CHART', 'APP VERSION']];
    Object.keys(R).sort().forEach(function (k) { var r = R[k]; if (!o.flags.all && r.ns !== o.ns) return; var l = r.revs[r.revs.length - 1]; if (!l) return; rows.push([r.name, r.ns, l.rev, l.updated, l.status, l.chart, l.appVersion]); });
    io.o(table(rows)); return 0;
  }
  function need() { var n = p[0]; if (!n) { io.e('Error: "helm ' + sub + '" requires 1 argument\n'); return null; } var r = R[relKey(o.ns, n)]; if (!r) { io.e('Error: release: not found\n'); return null; } return r; }
  if (sub === 'status') { var r4 = need(); if (!r4) return 1; var l4 = r4.revs[r4.revs.length - 1]; io.o('NAME: ' + r4.name + '\nLAST DEPLOYED: ' + l4.updated + '\nNAMESPACE: ' + r4.ns + '\nSTATUS: ' + l4.status + '\nREVISION: ' + l4.rev + '\n' + (l4.status === 'failed' ? 'DESCRIPTION: ' + l4.desc + '\n' : '')); return 0; }
  if (sub === 'history') { var r5 = need(); if (!r5) return 1; var rows2 = [['REVISION', 'UPDATED', 'STATUS', 'CHART', 'APP VERSION', 'DESCRIPTION']]; r5.revs.forEach(function (x) { rows2.push([x.rev, x.updated, x.status, x.chart, x.appVersion, x.desc]); }); io.o(table(rows2)); return 0; }
  if (sub === 'get') {
    var what = p[0]; o.pos = p.slice(1); p = o.pos; var r6 = need(); if (!r6) return 1; var l6 = r6.revs[r6.revs.length - 1];
    if (what === 'values') { io.o(o.flags.all ? 'COMPUTED VALUES:\n' + toDump(l6.values) : (Object.keys(l6.user || {}).length ? 'USER-SUPPLIED VALUES:\n' + toDump(l6.user) : 'USER-SUPPLIED VALUES:\nnull\n')); return 0; }
    if (what === 'manifest') { io.o(l6.manifest); return 0; }
    io.e('helm get ' + (what || '') + ' is not part of this simulator (values, manifest).\n'); return 1;
  }
  if (sub === 'rollback') {
    var r7 = need(); if (!r7) return 1; var want = p[1] ? parseInt(p[1], 10) : r7.revs[r7.revs.length - 2] && r7.revs[r7.revs.length - 2].rev;
    var tgt = r7.revs.filter(function (x) { return x.rev === want; })[0];
    if (!tgt) { io.e('Error: release has no ' + (p[1] ? 'revision ' + p[1] : 'previous revision') + '\n'); return 1; }
    r7.revs.forEach(function (x) { if (x.status === 'deployed') x.status = 'superseded'; });
    var nx = r7.revs[r7.revs.length - 1].rev + 1; r7.revs.push({ rev: nx, chart: tgt.chart, appVersion: tgt.appVersion, values: J(tgt.values), user: J(tgt.user || {}), manifest: tgt.manifest, status: 'deployed', desc: 'Rollback to ' + tgt.rev, updated: fmtDate() });
    io.o('Rollback was a success! Happy Helming!\n'); return 0;
  }
  if (sub === 'uninstall' || sub === 'delete') { var r8 = need(); if (!r8) return 1; delete R[relKey(o.ns, p[0])]; io.o('release "' + p[0] + '" uninstalled\n'); return 0; }
  io.e('helm ' + sub + ' is not part of this simulator. Run helm help to see what it supports.\n'); return 1;
});
T.helmYaml = yaml;
if (typeof module === 'object' && module.exports) module.exports = T;
}());
