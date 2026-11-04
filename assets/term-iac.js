/* MARGA terminal engine, part 13: a small simulated Terraform and Helm.
   Both read ordinary files in the lab (.tf files, a chart folder) and keep their own state in the session. They follow the shape of the real
   tools' output for a short list of commands (terraform help, helm help) and refuse the rest. They are models, not the tools. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-cloud.js') : window.MargaTerm;
var def = T.def, P = T.Session.prototype;
function J(x) { return JSON.parse(JSON.stringify(x)); }
P.mxInit = function () {
  if (this.mx) return this.mx;
  var w = (this.world && this.world.more) || {}; this.mx = { tf: { state: J((w.tf && w.tf.state) || {}), real: J((w.tf && w.tf.real) || {}), init: !!(w.tf && w.tf.init), serial: 1 }, helm: { rel: J((w.helm && w.helm.releases) || {}) }, w: w };
  return this.mx;
};
var origClone2 = P.clone;
P.clone = function () { var s = origClone2.call(this); if (this.mx) s.mx = J(this.mx); return s; };

/* ---------------------------------------------------------------- terraform */
function tokenValue(raw, ctx) {
  var v = raw.trim().replace(/\s+#.*$/, '');
  if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\$\{([^}]+)\}/g, function (m, e) { var r = ref(e.trim(), ctx); return r === undefined ? m : String(r); });
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (v === 'true' || v === 'false') return v === 'true';
  if (/^\[.*\]$/.test(v)) { var inner = v.slice(1, -1).trim(); return inner ? inner.split(/\s*,\s*/).map(function (x) { return tokenValue(x, ctx); }) : []; }
  var r2 = ref(v, ctx); return r2 === undefined ? { ref: v } : r2;
}
function ref(e, ctx) {
  var m = /^var\.(\w+)$/.exec(e); if (m) { if (ctx.vars[m[1]] === undefined) { ctx.missing = ctx.missing || {}; ctx.missing[m[1]] = true; } return ctx.vars[m[1]]; }
  m = /^local\.(\w+)$/.exec(e); if (m) return ctx.locals[m[1]];
  return undefined;
}
function parseHcl(text, file, ctx) {
  var lines = text.split('\n'), i = 0, depth = 0, cur = null, stack = [], errors = [];
  function lineNo() { return i + 1; }
  for (; i < lines.length; i++) {
    var raw = lines[i], ln = raw.replace(/^\s+|\s+$/g, '');
    if (!ln || ln[0] === '#' || ln.indexOf('//') === 0) continue;
    var m;
    if (depth === 0) {
      if ((m = /^(resource|data)\s+"([^"]+)"\s+"([^"]+)"\s*\{$/.exec(ln))) { cur = { kind: m[1], type: m[2], name: m[3], attrs: {}, file: file, line: lineNo(), raw: [] }; ctx.blocks.push(cur); depth = 1; stack = [cur]; continue; }
      if ((m = /^(variable|output|provider|module)\s+"([^"]+)"\s*\{$/.exec(ln))) { cur = { kind: m[1], name: m[2], attrs: {}, file: file, line: lineNo() }; ctx.blocks.push(cur); depth = 1; stack = [cur]; continue; }
      if ((m = /^(terraform|locals|moved|provider)\s*(?:"[^"]*")?\s*\{$/.exec(ln))) { cur = { kind: m[1], attrs: {}, file: file, line: lineNo() }; ctx.blocks.push(cur); depth = 1; stack = [cur]; continue; }
      if (/\{\s*$/.test(ln)) { errors.push({ file: file, line: lineNo(), msg: 'Unsupported block type; Blocks of type "' + ln.split(/\s/)[0] + '" are not expected here.' }); depth = 1; cur = { kind: 'junk', attrs: {} }; stack = [cur]; continue; }
      errors.push({ file: file, line: lineNo(), msg: 'Argument or block definition required.' }); continue;
    }
    if (ln === '}') { depth--; stack.pop(); if (depth === 0) cur = null; continue; }
    if ((m = /^([\w-]+)\s*(?:=)?\s*(?:"[^"]*")?\s*\{$/.exec(ln))) { var nb = { attrs: {}, name: m[1] }; var parent = stack[stack.length - 1]; (parent.blocks = parent.blocks || []).push(nb); stack.push(nb); depth++; continue; }
    if ((m = /^("?[\w-]+"?)\s*=\s*(.*)$/.exec(ln))) { stack[stack.length - 1].attrs[m[1].replace(/"/g, '')] = m[2]; continue; }
    if (cur && cur.kind === 'moved') continue;
    errors.push({ file: file, line: lineNo(), msg: 'Argument or block definition required. An argument or block definition is required here.' });
  }
  if (depth !== 0) errors.push({ file: file, line: lines.length, msg: 'Unclosed configuration block. There is no closing brace for this block before the end of the file. This may be caused by incorrect brace nesting elsewhere in this file.' });
  return errors;
}
var FORCE_NEW = { ami: 1, availability_zone: 1, bucket: 1, name: 1, engine: 1, identifier: 1, subnet_id: 0 };
function loadTf(s) {
  var ctx = { blocks: [], vars: {}, locals: {}, errors: [] }, names = [], files = [];
  try { names = s.listDir(s.cwd); } catch (e) { names = []; }
  names.filter(function (n) { return /\.tf$/.test(n); }).sort().forEach(function (n) { var p = (s.cwd === '/' ? '' : s.cwd) + '/' + n, t = s.readRaw(p); if (t !== null) { files.push(n); parseHcl(t, n, ctx).forEach(function (er) { ctx.errors.push(er); }); } });
  ctx.files = files;
  var tfv = {}; ['terraform.tfvars'].concat(names.filter(function (n) { return /\.auto\.tfvars$/.test(n); })).forEach(function (n) { var t = s.readRaw((s.cwd === '/' ? '' : s.cwd) + '/' + n); if (t === null) return; t.split('\n').forEach(function (l) { var m = /^\s*(\w+)\s*=\s*(.*)$/.exec(l); if (m) tfv[m[1]] = tokenValue(m[2], { vars: {}, locals: {} }); }); });
  ctx.tfvars = tfv;
  return ctx;
}
function resolve(ctx, cli) {
  ctx.blocks.filter(function (b) { return b.kind === 'variable'; }).forEach(function (b) {
    var name = b.name, v;
    if (cli && cli[name] !== undefined) v = cli[name]; else if (ctx.tfvars[name] !== undefined) v = ctx.tfvars[name]; else if (b.attrs['default'] !== undefined) v = tokenValue(b.attrs['default'], { vars: {}, locals: {} });
    ctx.vars[name] = v; b.hasValue = v !== undefined;
  });
  ctx.blocks.filter(function (b) { return b.kind === 'locals'; }).forEach(function (b) { Object.keys(b.attrs).forEach(function (k) { ctx.locals[k] = tokenValue(b.attrs[k], ctx); }); });
  var res = {}, blocks = ctx.blocks;
  blocks.filter(function (b) { return b.kind === 'resource'; }).forEach(function (b) {
    var a = {}, c2 = { vars: ctx.vars, locals: ctx.locals, missing: null };
    Object.keys(b.attrs).forEach(function (k) { var v = tokenValue(b.attrs[k], c2); a[k] = v; if (v && typeof v === 'object' && v.ref && /^var\./.test(v.ref)) ctx.undeclared = (ctx.undeclared || []).concat([{ b: b, ref: v.ref, k: k }]); });
    (b.blocks || []).forEach(function (nb) { Object.keys(nb.attrs).forEach(function (k) { a[nb.name + '.' + k] = tokenValue(nb.attrs[k], c2); }); });
    res[b.type + '.' + b.name] = { type: b.type, name: b.name, attrs: a, blk: b };
  });
  ctx.res = res; ctx.outputs = blocks.filter(function (b) { return b.kind === 'output'; });
  return ctx;
}
function show(v) { return Array.isArray(v) ? '[' + v.map(function (x) { return JSON.stringify(x); }).join(', ') + ']' : typeof v === 'string' ? JSON.stringify(v) : String(v); }
function pr(pl, prefix, key, v, w) { return prefix + ' ' + (key + ' ').padEnd(w, ' ') + '= ' + v; }
function tfPrep(s, a, io, needInit) {
  var mx = s.mxInit(), tf = mx.tf, cli = {}, i;
  for (i = 0; i < a.length; i++) if (a[i] === '-var' && a[i + 1]) { var m = /^(\w+)=(.*)$/.exec(a[i + 1]); if (m) cli[m[1]] = tokenValue(/^[\d]|^true$|^false$/.test(m[2]) ? m[2] : '"' + m[2] + '"', { vars: {}, locals: {} }); i++; }
  var ctx = loadTf(s);
  if (!ctx.files.length) { io.e('Error: No configuration files\n\nPlan requires configuration to be present. Planning without a configuration would mark everything for destruction, which is normally not what is desired. Run this command in a folder that has .tf files.\n'); return null; }
  if (needInit && !tf.init) { io.e('Error: Terraform initialization required: please run "terraform init"\n\nReason: Initial configuration of the requested backend has not been done.\n'); return null; }
  if (ctx.errors.length) { var er = ctx.errors[0]; io.e('Error: ' + er.msg.split('.')[0] + '\n\n  on ' + er.file + ' line ' + er.line + ':\n\n' + er.msg + '\n'); return null; }
  resolve(ctx, cli);
  var missing = ctx.blocks.filter(function (b) { return b.kind === 'variable' && !b.hasValue && Object.keys(ctx.res).some(function (k) { return JSON.stringify(ctx.res[k].blk.attrs).indexOf('var.' + b.name) >= 0; }); });
  if (missing.length) { var mv = missing[0]; io.e('Error: No value for required variable\n\n  on ' + mv.file + ' line ' + mv.line + ':\n   ' + mv.line + ': variable "' + mv.name + '" {\n\nThe root module input variable "' + mv.name + '" is not set, and has no default value. Use a -var or -var-file command line argument to provide a value for this variable.\n'); return null; }
  var und = (ctx.undeclared || []).filter(function (u) { return !ctx.blocks.some(function (b) { return b.kind === 'variable' && 'var.' + b.name === u.ref; }); });
  if (und.length) { var u = und[0]; io.e('Error: Reference to undeclared input variable\n\n  on ' + u.b.file + ' line ' + u.b.line + ', in resource "' + u.b.type + '" "' + u.b.name + '":\n   ' + u.k + ' = ' + u.ref + '\n\nAn input variable with the name "' + u.ref.slice(4) + '" has not been declared. This variable can be declared with a variable "' + u.ref.slice(4) + '" {} block.\n'); return null; }
  return { mx: mx, tf: tf, ctx: ctx };
}
function moves(ctx, state) {
  var out = [];
  ctx.blocks.filter(function (b) { return b.kind === 'moved'; }).forEach(function (b) { var f = (b.attrs.from || '').trim(), t = (b.attrs.to || '').trim(); if (state[f] && !state[t]) out.push([f, t]); });
  return out;
}
function plan(p, io) {
  var ctx = p.ctx, state = p.tf.state, real = p.tf.real, adds = [], chg = [], del = [], drift = [], mv = moves(ctx, state), lines = [];
  var st = J(state); mv.forEach(function (m) { st[m[1]] = st[m[0]]; delete st[m[0]]; });
  Object.keys(st).forEach(function (k) { if (real[k]) { var d = {}; Object.keys(real[k]).forEach(function (a) { if (JSON.stringify(real[k][a]) !== JSON.stringify(st[k][a])) d[a] = [st[k][a], real[k][a]]; }); if (Object.keys(d).length) { drift.push({ k: k, d: d }); Object.keys(d).forEach(function (a) { st[k][a] = d[a][1]; }); } } });
  if (drift.length) {
    lines.push('Note: Objects have changed outside of Terraform\n\nTerraform detected the following changes made outside of Terraform since the last "terraform apply":\n');
    drift.forEach(function (x) { var r = ctx.res[x.k] || { type: x.k.split('.')[0], name: x.k.split('.')[1] }; lines.push('  # ' + x.k + ' has changed\n  ~ resource "' + r.type + '" "' + r.name + '" {'); Object.keys(x.d).forEach(function (a) { lines.push('      ~ ' + a + ' = ' + show(x.d[a][0]) + ' -> ' + show(x.d[a][1])); }); lines.push('    }\n'); });
  }
  Object.keys(ctx.res).forEach(function (k) {
    var r = ctx.res[k];
    if (!st[k]) { adds.push(k); return; }
    var d = []; Object.keys(r.attrs).forEach(function (a) { var v = r.attrs[a]; if (v && typeof v === 'object' && !Array.isArray(v) && v.ref) return; if (JSON.stringify(st[k][a]) !== JSON.stringify(v)) d.push([a, st[k][a], v]); });
    Object.keys(st[k]).forEach(function (a) { if (r.attrs[a] === undefined && st[k][a] !== undefined && /^(tags|ingress|egress)/.test(a)) d.push([a, st[k][a], undefined]); });
    if (d.length) chg.push({ k: k, d: d, replace: d.some(function (x) { return FORCE_NEW[x[0]]; }) });
  });
  Object.keys(st).forEach(function (k) { if (!ctx.res[k]) del.push(k); });
  var body = [], nAdd = 0, nChg = 0, nDel = 0;
  adds.forEach(function (k) { var r = ctx.res[k]; nAdd++; body.push('  # ' + k + ' will be created\n  + resource "' + r.type + '" "' + r.name + '" {'); Object.keys(r.attrs).forEach(function (a) { var v = r.attrs[a]; body.push('      + ' + (a + ' ').padEnd(14, ' ') + '= ' + (v && v.ref ? '(known after apply)' : show(v))); }); body.push('    }\n'); });
  chg.forEach(function (c) { var r = ctx.res[c.k]; if (c.replace) { nAdd++; nDel++; body.push('  # ' + c.k + ' must be replaced\n-/+ resource "' + r.type + '" "' + r.name + '" {'); } else { nChg++; body.push('  # ' + c.k + ' will be updated in-place\n  ~ resource "' + r.type + '" "' + r.name + '" {'); }
    c.d.forEach(function (x) { body.push('      ' + (c.replace && FORCE_NEW[x[0]] ? '~' : '~') + ' ' + x[0] + ' = ' + (x[1] === undefined ? '(unset)' : show(x[1])) + ' -> ' + (x[2] === undefined ? 'null' : show(x[2])) + (c.replace && FORCE_NEW[x[0]] ? ' # forces replacement' : '')); }); body.push('    }\n'); });
  del.forEach(function (k) { nDel++; var ty = k.split('.')[0], nm = k.split('.').slice(1).join('.'); body.push('  # ' + k + ' will be destroyed\n  # (because ' + k + ' is not in configuration)\n  - resource "' + ty + '" "' + nm + '" {'); Object.keys(st[k]).forEach(function (a) { body.push('      - ' + (a + ' ').padEnd(14, ' ') + '= ' + show(st[k][a]) + ' -> null'); }); body.push('    }\n'); });
  var res = { lines: lines, body: body, nAdd: nAdd, nChg: nChg, nDel: nDel, mv: mv, st: st, destroys: del.concat(chg.filter(function (c) { return c.replace; }).map(function (c) { return c.k; })), none: !body.length && !mv.length };
  return res;
}
function outputPlan(r, io) {
  if (r.lines.length) io.o(r.lines.join('\n') + '\n');
  if (r.none) { io.o((r.lines.length ? 'Unless you have made equivalent changes to your configuration, or ignored the relevant attributes using ignore_changes, the following plan may include actions to undo or respond to these changes.\n\n' : '') + (r.lines.length ? '' : '') + 'No changes. Your infrastructure matches the configuration.\n\nTerraform has compared your real infrastructure against your configuration and found no differences, so no changes are needed.\n'); return; }
  r.mv.forEach(function (m) { io.o('  # ' + m[0] + ' has moved to ' + m[1] + '\n    resource "' + m[1].split('.')[0] + '" "' + m[1].split('.')[1] + '" {\n        # (all attributes unchanged)\n    }\n\n'); });
  io.o('Terraform used the selected providers to generate the following execution plan. Resource actions are indicated with the following symbols:\n  + create\n  ~ update in-place\n  - destroy\n-/+ destroy and then create replacement\n\nTerraform will perform the following actions:\n\n' + r.body.join('\n') + '\nPlan: ' + r.nAdd + ' to add, ' + r.nChg + ' to change, ' + r.nDel + ' to destroy.\n');
}
function applyPlan(p, r, io) {
  var ctx = p.ctx, tf = p.tf;
  var st = r.st; Object.keys(st).forEach(function (k) { if (!ctx.res[k]) delete st[k]; });
  Object.keys(ctx.res).forEach(function (k) { var a = {}; Object.keys(ctx.res[k].attrs).forEach(function (x) { var v = ctx.res[k].attrs[x]; a[x] = v && v.ref ? 'id-' + Math.abs(hash(k + x)).toString(16).slice(0, 8) : v; }); st[k] = a; });
  tf.state = st; tf.real = {}; tf.serial++;
  ctx.res && Object.keys(st).length;
}
function hash(s) { var h = 0, i; for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
function tfHelp(io) { io.o('Usage: terraform <command> [options]\n\nCommands in this simulator:\n  init | validate | plan | apply | destroy\n  state list | state show ADDR | state rm ADDR | state mv A B\n  import ADDR ID\n  output [NAME] | version\n\nOptions: -var name=value, -auto-approve\nThe simulator reads the .tf files in the current folder.\n'); }
def('terraform tofu', function (a, io) {
  var s = this, sub = a[0], rest = a.slice(1);
  if (!sub || sub === 'help' || sub === '-help' || sub === '--help') { tfHelp(io); return 0; }
  var mx = s.mxInit(), tf = mx.tf;
  if (sub === 'version' || sub === '-version') { io.o('Terraform v1.9.8\non linux_amd64\n'); return 0; }
  if (sub === 'init') {
    var c0 = loadTf(s); if (!c0.files.length) { io.e('Terraform initialized in an empty directory!\n\nThe directory has no Terraform configuration files. You may begin working with Terraform immediately by creating Terraform configuration files.\n'); return 0; }
    tf.init = true; io.o('Initializing the backend...\n\nInitializing provider plugins...\n- Finding latest version of hashicorp/aws...\n- Installing hashicorp/aws v5.70.0...\n- Installed hashicorp/aws v5.70.0 (signed by HashiCorp)\n\nTerraform has created a lock file .terraform.lock.hcl to record the provider selections it made above.\n\nTerraform has been successfully initialized!\n'); return 0;
  }
  if (sub === 'validate') {
    var p0 = tfPrep(s, rest, io, false); if (!p0) return 1;
    io.o('Success! The configuration is valid.\n'); return 0;
  }
  if (sub === 'plan' || sub === 'apply' || sub === 'destroy') {
    var p = tfPrep(s, rest, io, true); if (!p) return 1;
    var auto = rest.indexOf('-auto-approve') >= 0;
    if (sub === 'destroy') {
      var keys = Object.keys(tf.state); if (!keys.length) { io.o('No changes. There are no objects to destroy.\n'); return 0; }
      io.o('Terraform will destroy all your managed infrastructure, as shown above. There is no undo.\n\nPlan: 0 to add, 0 to change, ' + keys.length + ' to destroy.\n');
      if (!auto) { io.e('\nError: this simulator cannot ask for confirmation. Add -auto-approve to destroy, after you have read the list above.\n'); return 1; }
      keys.forEach(function (k) { io.o(k + ': Destroying...\n' + k + ': Destruction complete\n'); }); tf.state = {}; tf.real = {};
      io.o('\nDestroy complete! Resources: ' + keys.length + ' destroyed.\n'); return 0;
    }
    var r = plan(p, io); outputPlan(r, io);
    if (sub === 'plan') { return 0; }
    if (r.none) return 0;
    if (!auto) { io.e('\nError: this simulator cannot ask for confirmation. Read the plan above, then add -auto-approve to apply it.\n'); return 1; }
    r.mv.forEach(function (m) { io.o(m[0] + ': Moved to ' + m[1] + '\n'); });
    applyPlan(p, r, io);
    io.o('\nApply complete! Resources: ' + r.nAdd + ' added, ' + r.nChg + ' changed, ' + r.nDel + ' destroyed.\n'); return 0;
  }
  if (sub === 'import') {
    if (!tf.init) { io.e('Error: Terraform initialization required: please run "terraform init"\n'); return 1; }
    var ia = rest.filter(function (x) { return x[0] !== '-'; }), addr = ia[0], rid = ia[1];
    if (!addr || !rid) { io.e('Usage: terraform import [options] ADDRESS ID\n'); return 1; }
    var ci = loadTf(s); var rr = ci.res && ci.res[addr];
    if (!rr) { io.e('Error: Resource address "' + addr + '" does not exist in the configuration.\n\nBefore importing this resource, please create its configuration in the root module.\n'); return 1; }
    if (tf.state[addr]) { io.e('Error: Resource already managed by Terraform\n\nTerraform is already managing a remote object for ' + addr + '.\n'); return 1; }
    if (!tf.real[addr]) { io.e('Error: Cannot import non-existent remote object\n\nWhile attempting to import an existing object to "' + addr + '", the provider detected that no object exists with the given id (' + rid + ').\n'); return 1; }
    tf.state[addr] = J(tf.real[addr]); io.o(addr + ': Importing from ID "' + rid + '"...\n' + addr + ': Import prepared!\n' + addr + ': Refreshing state...\n\nImport successful!\n\nThe resources that were imported are shown above. These resources are now in\nyour Terraform state and will henceforth be managed by Terraform.\n'); return 0;
  }
  if (sub === 'state') {
    var op = rest[0], st = tf.state;
    if (op === 'list') { Object.keys(st).sort().forEach(function (k) { io.o(k + '\n'); }); return 0; }
    if (op === 'show') { var k = rest[1]; if (!k || !st[k]) { io.e('No instance found for the given address!\n\nThis command requires that the address references one specific instance. To view the available instances, use "terraform state list".\n'); return 1; } io.o('# ' + k + ':\nresource "' + k.split('.')[0] + '" "' + k.split('.')[1] + '" {\n'); Object.keys(st[k]).forEach(function (x) { io.o('    ' + (x + ' ').padEnd(14, ' ') + '= ' + show(st[k][x]) + '\n'); }); io.o('}\n'); return 0; }
    if (op === 'rm') { var k2 = rest[1]; if (!k2 || !st[k2]) { io.e('No matching objects found.\n'); return 1; } delete st[k2]; io.o('Removed ' + k2 + '\nSuccessfully removed 1 resource instance(s).\n'); return 0; }
    if (op === 'mv') { var f = rest[1], t = rest[2]; if (!f || !t) { io.e('Usage: terraform state mv SOURCE DESTINATION\n'); return 1; } if (!st[f]) { io.e('Error: Invalid source address: no matching objects found.\n'); return 1; } st[t] = st[f]; delete st[f]; io.o('Move "' + f + '" to "' + t + '"\nSuccessfully moved 1 object(s).\n'); return 0; }
    io.e('terraform state ' + (op || '') + ' is not part of this simulator (list, show, rm, mv).\n'); return 1;
  }
  if (sub === 'output') {
    var p2 = tfPrep(s, rest, io, true); if (!p2) return 1;
    var outs = p2.ctx.outputs; if (!outs.length) { io.o('Warning: No outputs found\n'); return 0; }
    var want = rest.filter(function (x) { return x[0] !== '-'; })[0], found = false;
    outs.forEach(function (b) { if (want && b.name !== want) return; found = true; var v = tokenValue(b.attrs.value || '""', p2.ctx); var shown = v && v.ref ? '(known after apply)' : show(v); io.o(want ? String(v && v.ref ? shown : (typeof v === 'string' ? v : shown)) + '\n' : b.name + ' = ' + shown + '\n'); });
    if (want && !found) { io.e('Error: Output "' + want + '" not found\n'); return 1; }
    return 0;
  }
  io.e('terraform ' + sub + ' is not part of this simulator. Run terraform help to see what it supports.\n'); return 1;
});
T.tfPlan = plan;
if (typeof module === 'object' && module.exports) module.exports = T;
}());
