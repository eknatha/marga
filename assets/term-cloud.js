/* MARGA terminal engine, part 12: a small simulated cloud with an aws command and an az command.
   Nothing here talks to a cloud. The "account" is data in the lab (buckets, servers, security groups, roles, resource groups, network
   security groups, storage accounts), and the two commands read and change that data. Output follows the shape of the real tools
   for the commands listed in "aws help" and "az help", and the rest report that they are not part of the simulator. It is a model, not a cloud. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-docker.js') : window.MargaTerm;
var def = T.def, P = T.Session.prototype;
function J(x) { return JSON.parse(JSON.stringify(x)); }
function hex(s, n) { var h = 2166136261, i, out = ''; for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } while (out.length < n) { out += ('00000000' + h.toString(16)).slice(-8); h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; } return out.slice(0, n); }

/* ---------------------------------------------------------------- state */
P.cloudInit = function () {
  if (this.cl) return this.cl;
  var w = (this.world && this.world.cloud) || null; if (!w) return null;
  var c = J(w);
  c.aws = c.aws || null; c.az = c.az || null;
  if (c.aws) {
    var a = c.aws; a.account = a.account || '123456789012'; a.region = a.region || 'eu-west-1'; a.profile = a.profile || 'default';
    a.profiles = a.profiles || { 'default': { user: 'student', allow: ['*'] } };
    a.buckets = a.buckets || {}; a.instances = a.instances || []; a.sgs = a.sgs || []; a.volumes = a.volumes || []; a.roles = a.roles || {}; a.policies = a.policies || {};
    Object.keys(a.buckets).forEach(function (n) { var b = a.buckets[n]; b.objects = b.objects || {}; b.versioning = b.versioning || 'Off'; b.acl = b.acl || 'private'; b.block = b.block || { BlockPublicAcls: false, IgnorePublicAcls: false, BlockPublicPolicy: false, RestrictPublicBuckets: false }; });
  }
  if (c.az) {
    var z = c.az; z.user = z.user || 'student@example.com'; z.sub = z.sub || 'Training subscription'; z.subId = z.subId || '11111111-2222-3333-4444-555555555555';
    z.groups = z.groups || []; z.vms = z.vms || []; z.nsgs = z.nsgs || []; z.storage = z.storage || []; z.roles = z.roles || []; z.blobs = z.blobs || {};
  }
  this.cl = c; return c;
};
var origClone = P.clone;
P.clone = function () { var s = origClone.call(this); if (this.cl) s.cl = J(this.cl); return s; };

/* ---------------------------------------------------------------- flags */
/* words before the first flag are the service and operation; "--name a b c" collects every value up to the next flag */
function parse(a) {
  var o = { pos: [], f: {} }, i = 0, cur = null;
  for (; i < a.length; i++) {
    var x = a[i];
    if (x.indexOf('--') === 0 && x.length > 2) { var kv = x.slice(2).split('='); cur = kv[0]; o.f[cur] = kv.length > 1 ? [kv.slice(1).join('=')] : []; if (kv.length > 1) cur = null; continue; }
    if (/^-[a-zA-Z]$/.test(x)) { var L = { o: 'output', g: 'resource-group', n: 'name', d: 'show-details', l: 'location', p: 'profile' }[x.slice(1)] || x.slice(1); cur = L; o.f[cur] = []; continue; }
    if (cur) o.f[cur].push(x); else o.pos.push(x);
  }
  return o;
}
function fv(o, k) { return o.f[k] === undefined ? undefined : (o.f[k].length ? o.f[k][0] : true); }
function fl(o, k) { return o.f[k] || []; }
function has(o, k) { return o.f[k] !== undefined; }

/* ---------------------------------------------------------------- a small JMESPath */
function tokens(e) {
  var t = [], i = 0, m;
  while (i < e.length) {
    var r = e.slice(i);
    if ((m = /^\s+/.exec(r))) { i += m[0].length; continue; }
    if ((m = /^(\[\?|\[\]|\[\*\]|\[|\]|\.|,|\{|\}|:|\(|\)|==|!=|\|)/.exec(r))) { t.push({ k: m[0] }); i += m[0].length; continue; }
    if ((m = /^'((?:[^'\\]|\\.)*)'/.exec(r))) { t.push({ k: 'raw', v: m[1] }); i += m[0].length; continue; }
    if ((m = /^`([^`]*)`/.exec(r))) { var lit; try { lit = JSON.parse(m[1]); } catch (x) { lit = m[1]; } t.push({ k: 'lit', v: lit }); i += m[0].length; continue; }
    if ((m = /^"((?:[^"\\]|\\.)*)"/.exec(r))) { t.push({ k: 'id', v: m[1] }); i += m[0].length; continue; }
    if ((m = /^-?\d+/.exec(r)) && t.length && t[t.length - 1].k === '[') { t.push({ k: 'num', v: parseInt(m[0], 10) }); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_][A-Za-z0-9_\-]*/.exec(r))) { t.push({ k: 'id', v: m[0] }); i += m[0].length; continue; }
    throw new Error('Bad jmespath expression: unexpected "' + r.charAt(0) + '"');
  }
  return t;
}
function jm(expr, data) {
  var t = tokens(expr), p = 0;
  function pk() { return t[p]; }
  function eat(k) { if (!t[p] || t[p].k !== k) throw new Error('Bad jmespath expression: expected ' + k); return t[p++]; }
  function cmpExpr() {
    var l = chain(false);
    if (pk() && (pk().k === '==' || pk().k === '!=')) { var op = t[p++].k, rv = lit(); return { f: function (x) { var a = l.f(x); var eq = (a !== null && typeof a !== 'object' && rv !== null && typeof rv !== 'object') ? String(a) === String(rv) : JSON.stringify(a) === JSON.stringify(rv); return op === '==' ? eq : !eq; } }; }
    return l;
  }
  function lit() { var x = t[p++]; if (!x) throw new Error('Bad jmespath expression'); if (x.k === 'raw' || x.k === 'lit') return x.v; throw new Error('Bad jmespath expression: expected a literal in quotes'); }
  function fn() {
    var name = t[p++].v; eat('(');
    var args = []; while (pk() && pk().k !== ')') { if (pk().k === 'raw' || pk().k === 'lit') args.push({ f: (function (v) { return function () { return v; }; }(t[p++].v)) }); else args.push(chain(false)); if (pk() && pk().k === ',') p++; }
    eat(')');
    return { f: function (x) {
      var v = args.map(function (g) { return g.f(x); });
      if (name === 'contains') return v[0] !== null && v[0] !== undefined && (typeof v[0] === 'string' ? v[0].indexOf(v[1]) >= 0 : Array.isArray(v[0]) && v[0].indexOf(v[1]) >= 0);
      if (name === 'length') return v[0] === null || v[0] === undefined ? null : v[0].length === undefined ? Object.keys(v[0]).length : v[0].length;
      if (name === 'starts_with') return typeof v[0] === 'string' && v[0].indexOf(v[1]) === 0;
      if (name === 'sort') return Array.isArray(v[0]) ? v[0].slice().sort() : null;
      throw new Error('Unknown function ' + name);
    } };
  }
  /* one step list: each step is a function of the current value; projections apply the rest of the chain to every element */
  function chain(top) {
    var steps = [];
    function atom() {
      var x = pk();
      if (!x) throw new Error('Bad jmespath expression');
      if (x.k === 'id' && t[p + 1] && t[p + 1].k === '(') return fn();
      if (x.k === 'id') { p++; return { f: function (v) { return v !== null && typeof v === 'object' && !Array.isArray(v) && v[x.v] !== undefined ? v[x.v] : null; } }; }
      if (x.k === 'raw' || x.k === 'lit') { p++; return { f: function () { return x.v; } }; }
      if (x.k === '[') {
        /* multiselect list */
        p++; var items = []; while (pk() && pk().k !== ']') { items.push(chain(false)); if (pk() && pk().k === ',') p++; } eat(']');
        return { f: function (v) { return v === null ? null : items.map(function (g) { return g.f(v); }); } };
      }
      if (x.k === '{') {
        p++; var kv = []; while (pk() && pk().k !== '}') { var key = t[p++].v; eat(':'); kv.push([key, chain(false)]); if (pk() && pk().k === ',') p++; } eat('}');
        return { f: function (v) { if (v === null) return null; var r = {}; kv.forEach(function (e) { r[e[0]] = e[1].f(v); }); return r; } };
      }
      throw new Error('Bad jmespath expression: unexpected ' + x.k);
    }
    if (pk() && (pk().k === '[]' || pk().k === '[*]' || pk().k === '[?' || (pk().k === '[' && t[p + 1] && t[p + 1].k === 'num'))) steps.push({ type: 'one', g: { f: function (v) { return v; } } });
    else steps.push({ type: 'one', g: atom() });
    for (;;) {
      var x = pk();
      if (!x) break;
      if (x.k === '.') { p++; steps.push({ type: 'one', g: atom() }); continue; }
      if (x.k === '[]') { p++; steps.push({ type: 'flat' }); continue; }
      if (x.k === '[*]') { p++; steps.push({ type: 'star' }); continue; }
      if (x.k === '[?') { p++; var fe = cmpExpr(); eat(']'); steps.push({ type: 'filter', g: fe }); continue; }
      if (x.k === '[' && t[p + 1] && t[p + 1].k === 'num') { p++; var n = t[p++].v; eat(']'); steps.push({ type: 'idx', n: n }); continue; }
      break;
    }
    return { f: function (v) { return run(steps, 0, v); } };
  }
  function run(steps, i, v, end) {
    end = end === undefined ? steps.length : end;
    if (v === null || v === undefined) return null;
    if (i >= end) return v;
    var s = steps[i];
    if (s.type === 'one') return run(steps, i + 1, s.g.f(v), end);
    if (s.type === 'idx') { if (!Array.isArray(v)) return null; var e = v[s.n < 0 ? v.length + s.n : s.n]; return run(steps, i + 1, e === undefined ? null : e, end); }
    if (!Array.isArray(v)) return null;
    var list = v;
    if (s.type === 'flat') { var fl2 = []; list.forEach(function (x) { if (Array.isArray(x)) x.forEach(function (y) { fl2.push(y); }); else fl2.push(x); }); list = fl2; }
    if (s.type === 'filter') list = list.filter(function (x) { return !!s.g.f(x); });
    /* the projection covers the steps up to the next flatten, which then works on the collected results */
    var k = i + 1; while (k < end && steps[k].type !== 'flat') k++;
    var out = [];
    list.forEach(function (x) { var r = run(steps, i + 1, x, k); if (r !== null && r !== undefined) out.push(r); });
    return k < end ? run(steps, k, out, end) : out;
  }
  var tree = chain(true), res = tree.f(data);
  if (p < t.length && t[p].k === '|') { p++; var rest = chain(true); res = rest.f(res); }
  if (p < t.length) throw new Error('Bad jmespath expression: unexpected ' + t[p].k);
  return res === undefined ? null : res;
}

/* ---------------------------------------------------------------- output */
function scalar(v) { return v === null || v === undefined ? 'None' : typeof v === 'boolean' ? (v ? 'True' : 'False') : String(v); }
function textOut(v) {
  if (v === null || v === undefined) return 'None\n';
  if (!Array.isArray(v) && typeof v !== 'object') return scalar(v) + '\n';
  if (Array.isArray(v)) {
    if (v.every(function (x) { return x === null || typeof x !== 'object'; })) return v.length ? v.map(scalar).join('\t') + '\n' : '';
    return v.map(function (x) { return Array.isArray(x) ? x.map(scalar).join('\t') : typeof x === 'object' ? Object.keys(x).map(function (k) { return scalar(x[k] !== null && typeof x[k] === 'object' ? JSON.stringify(x[k]) : x[k]); }).join('\t') : scalar(x); }).join('\n') + '\n';
  }
  return Object.keys(v).sort().map(function (k) { var x = v[k]; return x !== null && typeof x === 'object' ? textOut(x).trimEnd() : scalar(x); }).join('\t') + '\n';
}
function tableOut(v, title) {
  var rows = Array.isArray(v) ? v : [v];
  if (!rows.length) return '';
  if (rows.every(function (x) { return x === null || typeof x !== 'object'; })) return rows.map(scalar).join('\n') + '\n';
  var keys = [], seen = {};
  rows.forEach(function (r) { Object.keys(r || {}).forEach(function (k) { if (!seen[k] && (r[k] === null || typeof r[k] !== 'object')) { seen[k] = 1; keys.push(k); } }); });
  var cells = [keys.map(function (k) { return k; })].concat(rows.map(function (r) { return keys.map(function (k) { return r && r[k] !== undefined ? scalar(r[k]) : ''; }); }));
  var w = keys.map(function (k, i) { return Math.max.apply(null, cells.map(function (r) { return r[i].length; })); });
  var line = '+' + w.map(function (n) { return new Array(n + 3).join('-'); }).join('+') + '+';
  var out = [line];
  if (title) out.push('|' + T.pad(title, line.length - 2 + 0, true).slice(0, line.length - 2) + '|'), out.push(line);
  cells.forEach(function (r, ri) { out.push('|' + r.map(function (c, i) { return ' ' + T.pad(c, w[i], true) + ' '; }).join('|') + '|'); if (ri === 0) out.push(line); });
  out.push(line); return out.join('\n') + '\n';
}
function emit(o, io, val, azMode) {
  var q = fv(o, 'query'), fmt = fv(o, 'output') || (azMode ? 'json' : 'json');
  if (fmt === 'tsv') fmt = 'text';
  if (fmt === 'yaml' || fmt === 'yamlc') { io.o(toYaml(val, 0)); return 0; }
  if (q && q !== true) { try { val = jm(q, val); } catch (e) { io.e((azMode ? 'ERROR: ' : '\nAn error occurred (ParamValidation): ') + e.message + '\n'); return 255; } }
  if (fmt === 'table') { io.o('\n' + tableOut(val)); return 0; }
  if (fmt === 'text') { io.o(textOut(val)); return 0; }
  if (val === undefined) return 0;
  if (val === null && q) { io.o('null\n'); return 0; }
  io.o(JSON.stringify(val, null, 4) + '\n'); return 0;
}
function toYaml(v, ind) {
  var pad = new Array(ind + 1).join(' ');
  if (Array.isArray(v)) return v.map(function (x) { return x !== null && typeof x === 'object' ? pad + '- ' + toYaml(x, ind + 2).replace(/^\s+/, '') : pad + '- ' + scalarY(x) + '\n'; }).join('');
  if (v !== null && typeof v === 'object') return Object.keys(v).map(function (k) { var x = v[k]; return x !== null && typeof x === 'object' ? pad + k + ':\n' + toYaml(x, ind + 2) : pad + k + ': ' + scalarY(x) + '\n'; }).join('');
  return pad + scalarY(v) + '\n';
}
function scalarY(v) { return v === null ? 'null' : String(v); }

/* ================================================================ AWS */
function awsAllowed(a, prof, action) {
  var p = a.profiles[prof]; if (!p) return false;
  return (p.allow || []).some(function (rule) { var rx = new RegExp('^' + rule.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i'); return rx.test(action); });
}
function deny(io, svc, op, flavor) {
  if (flavor === 's3cp') return;
  if (svc === 'ec2') io.e('\nAn error occurred (UnauthorizedOperation) when calling the ' + op + ' operation: You are not authorized to perform this operation.\n');
  else io.e('\nAn error occurred (AccessDenied) when calling the ' + op + ' operation: ' + (svc === 'iam' ? 'User is not authorized to perform: iam:' + op : 'Access Denied') + '\n');
  return 254;
}
function s3parse(u) { var m = /^s3:\/\/([^\/]+)\/?(.*)$/.exec(u || ''); return m ? { b: m[1], k: m[2] } : null; }
var ISO = '2026-11-02T10:00:00+00:00';
function bucketPublic(b) { var pub = b.acl === 'public-read' || b.acl === 'public-read-write' || b.policyPublic === true; return pub && !(b.block.RestrictPublicBuckets && b.block.IgnorePublicAcls); }
function inst(a, id) { var i; for (i = 0; i < a.instances.length; i++) if (a.instances[i].id === id) return a.instances[i]; return null; }
function sg(a, id) { var i; for (i = 0; i < a.sgs.length; i++) if (a.sgs[i].id === id) return a.sgs[i]; return null; }
function tagList(t) { return Object.keys(t || {}).map(function (k) { return { Key: k, Value: t[k] }; }); }
function instJson(i) { return { InstanceId: i.id, InstanceType: i.type || 't3.micro', State: { Code: i.state === 'running' ? 16 : i.state === 'stopped' ? 80 : i.state === 'terminated' ? 48 : 0, Name: i.state }, PrivateIpAddress: i.ip || '10.0.1.10', PublicIpAddress: i.state === 'running' ? (i.pub || '203.0.113.10') : undefined, Placement: { AvailabilityZone: i.az || 'eu-west-1a' }, SecurityGroups: (i.sgs || []).map(function (g) { return { GroupId: g, GroupName: g }; }), Tags: tagList(i.tags), SubnetId: i.subnet || 'subnet-0a1b2c3d' }; }
function sgJson(g) { return { GroupId: g.id, GroupName: g.name, Description: g.desc || g.name, VpcId: 'vpc-0a1b2c3d', IpPermissions: (g.ingress || []).map(function (r) { return { IpProtocol: r.proto, FromPort: r.from, ToPort: r.to, IpRanges: [{ CidrIp: r.cidr }] }; }) }; }
function tagArgs(o, k) {
  var tags = {}, bad = false;
  fl(o, k).forEach(function (x) { var m = /^Key=([^,]+),Value=(.*)$/.exec(x); if (m) tags[m[1]] = m[2]; else bad = true; });
  return bad ? null : tags;
}
function filters(list, o, tagOf, fieldOf) {
  fl(o, 'filters').forEach(function (f) {
    var m = /^Name=([^,]+),Values=(.*)$/.exec(f); if (!m) return; var vals = m[2].split(',');
    list = list.filter(function (x) { var nm = m[1], v; if (nm.indexOf('tag:') === 0) v = tagOf(x)[nm.slice(4)]; else v = fieldOf(x, nm); return v !== undefined && vals.indexOf(String(v)) >= 0; });
  });
  return list;
}
function awsHelp(io) {
  io.o('usage: aws <service> <operation> [options]\n\nCommands in this simulator:\n  sts get-caller-identity\n  s3 ls | mb | cp | rm | rb          s3 paths look like s3://bucket/key\n  s3api list-buckets | get-bucket-acl | put-bucket-acl | get-public-access-block | put-public-access-block |\n        get-bucket-policy-status | get-bucket-versioning | put-bucket-versioning | list-object-versions\n  ec2 describe-instances | start-instances | stop-instances | terminate-instances | describe-security-groups |\n      authorize-security-group-ingress | revoke-security-group-ingress | describe-volumes | delete-volume | create-tags\n  iam get-user | list-roles | list-attached-role-policies | attach-role-policy | detach-role-policy\n\nOptions: --profile NAME, --region NAME, --output json|text|table, --query "JMESPATH" (paths, [], [?x==\'y\'], [a,b], {A:a}).\nThe profile can also come from the AWS_PROFILE variable.\n');
}
def('aws', function (a, io) {
  var s = this, c = s.cloudInit();
  if (!c || !c.aws) { io.e('aws: command not found\n'); return 127; }
  var A = c.aws, o = parse(a), svc = o.pos[0], op = o.pos[1];
  if (!svc || svc === 'help' || a.indexOf('--help') >= 0 || svc === '--help') { awsHelp(io); return svc ? 0 : 252; }
  var prof = fv(o, 'profile') || s.env.AWS_PROFILE || s.vars.AWS_PROFILE || A.profile;
  if (prof === true) prof = A.profile;
  if (!A.profiles[prof]) { io.e('\nThe config profile (' + prof + ') could not be found\n'); return 255; }
  var P0 = A.profiles[prof], region = fv(o, 'region') || s.env.AWS_REGION || s.env.AWS_DEFAULT_REGION || A.region;
  function need(action) { return awsAllowed(A, prof, action); }
  function bad(msg) { io.e('\n' + msg + '\n'); return 252; }
  function missing(k) { io.e('usage: aws [options] <command> <subcommand> [<subcommand> ...] [parameters]\naws: error: the following arguments are required: ' + k + '\n'); return 252; }
  function noBucket(n, opn) { io.e('\nAn error occurred (NoSuchBucket) when calling the ' + opn + ' operation: The specified bucket does not exist\n'); return 254; }
  var out = function (v) { return emit(o, io, v, false); };

  if (svc === 'sts') {
    if (op !== 'get-caller-identity') return bad('Operation ' + op + ' is not part of this simulator. It supports get-caller-identity.');
    return out({ UserId: 'AIDA' + hex(prof, 16).toUpperCase(), Account: A.account, Arn: 'arn:aws:iam::' + A.account + ':user/' + P0.user });
  }
  if (svc === 's3') {
    var p1 = o.pos[1], p2 = o.pos[2], p3 = o.pos[3];
    if (p1 === 'ls') {
      if (!need('s3:ListBucket') && p2) { io.e('\nAn error occurred (AccessDenied) when calling the ListObjectsV2 operation: Access Denied\n'); return 254; }
      if (!p2) { if (!need('s3:ListAllMyBuckets')) { io.e('\nAn error occurred (AccessDenied) when calling the ListBuckets operation: Access Denied\n'); return 254; } Object.keys(A.buckets).sort().forEach(function (n) { io.o('2026-10-01 09:00:00 ' + n + '\n'); }); return 0; }
      var pr = s3parse(p2.indexOf('s3://') === 0 ? p2 : 's3://' + p2); if (!pr) return bad('Bad path');
      var b = A.buckets[pr.b]; if (!b) return noBucket(pr.b, 'ListObjectsV2');
      Object.keys(b.objects).sort().forEach(function (k) { if (k.indexOf(pr.k) === 0) io.o('2026-11-01 08:30:00 ' + T.pad(String(b.objects[k].length), 10) + ' ' + k + '\n'); });
      return 0;
    }
    if (p1 === 'mb') {
      var mp = s3parse(p2); if (!mp) { io.e('\nmake_bucket failed: ' + (p2 || '') + ' Parameter validation failed: bucket must be given as s3://name\n'); return 252; }
      if (!need('s3:CreateBucket')) { io.e('\nmake_bucket failed: s3://' + mp.b + ' An error occurred (AccessDenied) when calling the CreateBucket operation: Access Denied\n'); return 1; }
      if (A.buckets[mp.b]) { io.e('\nmake_bucket failed: s3://' + mp.b + ' An error occurred (BucketAlreadyOwnedByYou) when calling the CreateBucket operation: Your previous request to create the named bucket succeeded and you already own it.\n'); return 1; }
      if (!/^[a-z0-9][a-z0-9.\-]{2,62}$/.test(mp.b)) { io.e('\nmake_bucket failed: s3://' + mp.b + ' An error occurred (InvalidBucketName) when calling the CreateBucket operation: The specified bucket is not valid.\n'); return 1; }
      A.buckets[mp.b] = { objects: {}, versioning: 'Off', acl: 'private', block: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true } };
      io.o('make_bucket: ' + mp.b + '\n'); return 0;
    }
    if (p1 === 'cp') {
      var src = p2, dst = p3; if (!src || !dst) return missing('paths');
      var sS = s3parse(src), dS = s3parse(dst);
      if (dS && !sS) {
        var data = s.readRaw(s.abs(src)); if (data === null) { io.e('\nThe user-provided path ' + src + ' does not exist.\n'); return 255; }
        var db = A.buckets[dS.b]; if (!db) { io.e('upload failed: ' + src + ' to ' + dst + ' An error occurred (NoSuchBucket) when calling the PutObject operation: The specified bucket does not exist\n'); return 1; }
        if (!need('s3:PutObject')) { io.e('upload failed: ' + src + ' to ' + dst + ' An error occurred (AccessDenied) when calling the PutObject operation: Access Denied\n'); return 1; }
        var key = dS.k === '' || /\/$/.test(dS.k) ? dS.k + src.split('/').pop() : dS.k; db.objects[key] = data; io.o('upload: ' + src + ' to s3://' + dS.b + '/' + key + '\n'); return 0;
      }
      if (sS && !dS) {
        var sb = A.buckets[sS.b]; if (!sb) { io.e('\nfatal error: An error occurred (NoSuchBucket) when calling the HeadObject operation: The specified bucket does not exist\n'); return 1; }
        if (!need('s3:GetObject')) { io.e('\nfatal error: An error occurred (403) when calling the HeadObject operation: Forbidden\n'); return 1; }
        if (sb.objects[sS.k] === undefined) { io.e('\nfatal error: An error occurred (404) when calling the HeadObject operation: Key "' + sS.k + '" does not exist\n'); return 1; }
        if (dst === '-') io.o(sb.objects[sS.k]); else { try { s.writeFile(s.abs(dst), sb.objects[sS.k], false); } catch (e) { io.e('download failed: ' + e.message + '\n'); return 1; } io.o('download: s3://' + sS.b + '/' + sS.k + ' to ' + dst + '\n'); }
        return 0;
      }
      return bad('This simulator copies between a local file and s3://bucket/key.');
    }
    if (p1 === 'rm') {
      var rp = s3parse(p2); if (!rp) return missing('path');
      var rb = A.buckets[rp.b]; if (!rb) { io.e('\nfatal error: An error occurred (NoSuchBucket) when calling the DeleteObject operation: The specified bucket does not exist\n'); return 1; }
      if (!need('s3:DeleteObject')) { io.e('delete failed: s3://' + rp.b + '/' + rp.k + ' An error occurred (AccessDenied) when calling the DeleteObject operation: Access Denied\n'); return 1; }
      if (rb.objects[rp.k] === undefined) return 0;
      delete rb.objects[rp.k]; io.o('delete: s3://' + rp.b + '/' + rp.k + '\n'); return 0;
    }
    if (p1 === 'rb') {
      var xp = s3parse(p2); if (!xp || !A.buckets[xp.b]) { io.e('\nremove_bucket failed: Unable to delete all objects in the bucket, bucket will not be deleted.\n'); return 1; }
      if (Object.keys(A.buckets[xp.b].objects).length) { io.e('\nremove_bucket failed: s3://' + xp.b + ' An error occurred (BucketNotEmpty) when calling the DeleteBucket operation: The bucket you tried to delete is not empty\n'); return 1; }
      delete A.buckets[xp.b]; io.o('remove_bucket: ' + xp.b + '\n'); return 0;
    }
    return bad('s3 ' + (p1 || '') + ' is not part of this simulator. It supports ls, mb, cp, rm and rb.');
  }
  if (svc === 's3api') {
    var bn = fv(o, 'bucket');
    var OPS = { 'list-buckets': 'ListBuckets', 'get-bucket-acl': 'GetBucketAcl', 'put-bucket-acl': 'PutBucketAcl', 'get-public-access-block': 'GetPublicAccessBlock', 'put-public-access-block': 'PutPublicAccessBlock', 'get-bucket-policy-status': 'GetBucketPolicyStatus', 'get-bucket-versioning': 'GetBucketVersioning', 'put-bucket-versioning': 'PutBucketVersioning', 'list-object-versions': 'ListObjectVersions' };
    if (!OPS[op]) return bad('s3api ' + (op || '') + ' is not part of this simulator. Run aws help to see what it supports.');
    if (op !== 'list-buckets' && (!bn || bn === true)) return missing('--bucket');
    if (!need('s3:' + OPS[op])) { io.e('\nAn error occurred (AccessDenied) when calling the ' + OPS[op] + ' operation: Access Denied\n'); return 254; }
    if (op === 'list-buckets') return out({ Buckets: Object.keys(A.buckets).sort().map(function (n) { return { Name: n, CreationDate: '2026-10-01T09:00:00+00:00' }; }), Owner: { DisplayName: P0.user, ID: hex(A.account, 32) } });
    var B = A.buckets[bn]; if (!B) return noBucket(bn, OPS[op]);
    if (op === 'get-bucket-acl') { var gr = [{ Grantee: { DisplayName: P0.user, Type: 'CanonicalUser' }, Permission: 'FULL_CONTROL' }]; if (B.acl === 'public-read') gr.push({ Grantee: { Type: 'Group', URI: 'http://acs.amazonaws.com/groups/global/AllUsers' }, Permission: 'READ' }); return out({ Owner: { DisplayName: P0.user }, Grants: gr }); }
    if (op === 'put-bucket-acl') { var acl = fv(o, 'acl'); if (['private', 'public-read', 'public-read-write', 'authenticated-read'].indexOf(acl) < 0) return bad('Parameter validation failed: --acl must be private, public-read, public-read-write or authenticated-read'); if (B.block.BlockPublicAcls && acl.indexOf('public') === 0) { io.e('\nAn error occurred (AccessDenied) when calling the PutBucketAcl operation: Access Denied\n'); return 254; } B.acl = acl; return 0; }
    if (op === 'get-public-access-block') { if (!B.blockSet) { io.e('\nAn error occurred (NoSuchPublicAccessBlockConfiguration) when calling the GetPublicAccessBlock operation: The public access block configuration was not found\n'); return 254; } return out({ PublicAccessBlockConfiguration: J(B.block) }); }
    if (op === 'put-public-access-block') {
      var cfg = fv(o, 'public-access-block-configuration'); if (!cfg || cfg === true) return missing('--public-access-block-configuration');
      var nb = { BlockPublicAcls: false, IgnorePublicAcls: false, BlockPublicPolicy: false, RestrictPublicBuckets: false }, okc = true;
      cfg.split(',').forEach(function (kv) { var m = /^(BlockPublicAcls|IgnorePublicAcls|BlockPublicPolicy|RestrictPublicBuckets)=(true|false)$/.exec(kv.trim()); if (m) nb[m[1]] = m[2] === 'true'; else okc = false; });
      if (!okc) return bad('Error parsing parameter \'--public-access-block-configuration\': Expected: \'=\', received: \',\' for input: ' + cfg);
      B.block = nb; B.blockSet = true; return 0;
    }
    if (op === 'get-bucket-policy-status') return out({ PolicyStatus: { IsPublic: bucketPublic(B) } });
    if (op === 'get-bucket-versioning') return out(B.versioning === 'Off' ? {} : { Status: B.versioning });
    if (op === 'put-bucket-versioning') { var vc = fv(o, 'versioning-configuration'), mm = /Status=(Enabled|Suspended)/.exec(vc || ''); if (!mm) return bad('Error parsing parameter \'--versioning-configuration\': expected Status=Enabled or Status=Suspended'); B.versioning = mm[1]; return 0; }
    if (op === 'list-object-versions') { var vs = []; Object.keys(B.objects).sort().forEach(function (k) { vs.push({ Key: k, VersionId: B.versioning === 'Enabled' ? hex(k + 'v', 16) : 'null', IsLatest: true, Size: B.objects[k].length }); }); return out({ Versions: vs }); }
  }
  if (svc === 'ec2') {
    var EO = { 'describe-instances': 'DescribeInstances', 'start-instances': 'StartInstances', 'stop-instances': 'StopInstances', 'terminate-instances': 'TerminateInstances', 'describe-security-groups': 'DescribeSecurityGroups', 'authorize-security-group-ingress': 'AuthorizeSecurityGroupIngress', 'revoke-security-group-ingress': 'RevokeSecurityGroupIngress', 'describe-volumes': 'DescribeVolumes', 'delete-volume': 'DeleteVolume', 'create-tags': 'CreateTags' };
    if (!EO[op]) return bad('ec2 ' + (op || '') + ' is not part of this simulator. Run aws help to see what it supports.');
    if (!need('ec2:' + EO[op])) return deny(io, 'ec2', EO[op]);
    if (op === 'describe-instances') {
      var ids = fl(o, 'instance-ids'), list = A.instances.slice();
      if (ids.length) { var unk = ids.filter(function (x) { return !inst(A, x); }); if (unk.length) { io.e('\nAn error occurred (InvalidInstanceID.NotFound) when calling the DescribeInstances operation: The instance ID \'' + unk[0] + '\' does not exist\n'); return 254; } list = list.filter(function (i) { return ids.indexOf(i.id) >= 0; }); }
      list = filters(list, o, function (i) { return i.tags || {}; }, function (i, nm) { return nm === 'instance-state-name' ? i.state : nm === 'instance-type' ? i.type : nm === 'instance-id' ? i.id : undefined; });
      return out({ Reservations: list.map(function (i) { return { ReservationId: 'r-' + hex(i.id, 17), OwnerId: A.account, Instances: [instJson(i)] }; }) });
    }
    if (op === 'start-instances' || op === 'stop-instances' || op === 'terminate-instances') {
      var tid = fl(o, 'instance-ids'); if (!tid.length) return missing('--instance-ids');
      var key2 = { 'start-instances': 'StartingInstances', 'stop-instances': 'StoppingInstances', 'terminate-instances': 'TerminatingInstances' }[op], rs = [], code = { running: 16, stopped: 80, terminated: 48 };
      for (var q = 0; q < tid.length; q++) {
        var ii = inst(A, tid[q]); if (!ii) { io.e('\nAn error occurred (InvalidInstanceID.NotFound) when calling the ' + EO[op] + ' operation: The instance ID \'' + tid[q] + '\' does not exist\n'); return 254; }
        var prev = ii.state;
        if (op === 'start-instances') { if (ii.state === 'terminated') { io.e('\nAn error occurred (IncorrectInstanceState) when calling the StartInstances operation: The instance \'' + ii.id + '\' is not in a state from which it can be started.\n'); return 254; } ii.state = 'running'; }
        else if (op === 'stop-instances') { if (ii.state === 'terminated') { io.e('\nAn error occurred (IncorrectInstanceState) when calling the StopInstances operation: The instance \'' + ii.id + '\' is not in a state from which it can be stopped.\n'); return 254; } ii.state = 'stopped'; }
        else { if (ii.protect) { io.e('\nAn error occurred (OperationNotPermitted) when calling the TerminateInstances operation: The instance \'' + ii.id + '\' may not be terminated. Modify its \'disableApiTermination\' instance attribute and try again.\n'); return 254; } ii.state = 'terminated'; }
        rs.push({ InstanceId: ii.id, CurrentState: { Code: op === 'start-instances' ? 0 : 64, Name: op === 'start-instances' ? 'pending' : op === 'stop-instances' ? 'stopping' : 'shutting-down' }, PreviousState: { Code: code[prev] || 0, Name: prev } });
      }
      var res = {}; res[key2] = rs; return out(res);
    }
    if (op === 'describe-security-groups') {
      var gids = fl(o, 'group-ids'), gl = A.sgs.slice();
      if (gids.length) { var ug = gids.filter(function (x) { return !sg(A, x); }); if (ug.length) { io.e('\nAn error occurred (InvalidGroup.NotFound) when calling the DescribeSecurityGroups operation: The security group \'' + ug[0] + '\' does not exist\n'); return 254; } gl = gl.filter(function (g) { return gids.indexOf(g.id) >= 0; }); }
      gl = filters(gl, o, function (g) { return g.tags || {}; }, function (g, nm) { return nm === 'group-name' ? g.name : nm === 'group-id' ? g.id : undefined; });
      return out({ SecurityGroups: gl.map(sgJson) });
    }
    if (op === 'authorize-security-group-ingress' || op === 'revoke-security-group-ingress') {
      var gid = fv(o, 'group-id'); if (!gid || gid === true) return missing('--group-id');
      var G = sg(A, gid); if (!G) { io.e('\nAn error occurred (InvalidGroup.NotFound) when calling the ' + EO[op] + ' operation: The security group \'' + gid + '\' does not exist\n'); return 254; }
      var proto = fv(o, 'protocol') || 'tcp', port = parseInt(fv(o, 'port'), 10), cidr = fv(o, 'cidr');
      if (isNaN(port) || !cidr || cidr === true) return bad('This simulator needs --protocol, --port and --cidr (for example --protocol tcp --port 22 --cidr 203.0.113.7/32).');
      if (!/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(cidr)) { io.e('\nAn error occurred (InvalidParameterValue) when calling the ' + EO[op] + ' operation: Value (' + cidr + ') for parameter cidrIp is invalid. This is not a valid CIDR block.\n'); return 254; }
      var idx = -1; (G.ingress = G.ingress || []).forEach(function (r, i) { if (r.proto === proto && r.from === port && r.to === port && r.cidr === cidr) idx = i; });
      if (op === 'authorize-security-group-ingress') {
        if (idx >= 0) { io.e('\nAn error occurred (InvalidPermission.Duplicate) when calling the AuthorizeSecurityGroupIngress operation: the specified rule "peer: ' + cidr + ', ' + proto.toUpperCase() + ', from port: ' + port + ', to port: ' + port + ', ALLOW" already exists\n'); return 254; }
        G.ingress.push({ proto: proto, from: port, to: port, cidr: cidr });
        return out({ 'Return': true, SecurityGroupRules: [{ SecurityGroupRuleId: 'sgr-' + hex(gid + port + cidr, 17), GroupId: gid, IpProtocol: proto, FromPort: port, ToPort: port, CidrIpv4: cidr }] });
      }
      if (idx < 0) { io.e('\nAn error occurred (InvalidPermission.NotFound) when calling the RevokeSecurityGroupIngress operation: The specified rule does not exist in this security group.\n'); return 254; }
      G.ingress.splice(idx, 1); return out({ 'Return': true });
    }
    if (op === 'describe-volumes') {
      var vl = A.volumes.slice();
      vl = filters(vl, o, function () { return {}; }, function (v, nm) { return nm === 'status' ? (v.attachedTo ? 'in-use' : 'available') : nm === 'volume-id' ? v.id : undefined; });
      return out({ Volumes: vl.map(function (v) { return { VolumeId: v.id, Size: v.size, VolumeType: v.type || 'gp3', State: v.attachedTo ? 'in-use' : 'available', Attachments: v.attachedTo ? [{ InstanceId: v.attachedTo, State: 'attached', Device: '/dev/sdf' }] : [], Tags: tagList(v.tags), CreateTime: ISO }; }) });
    }
    if (op === 'delete-volume') {
      var vid = fv(o, 'volume-id'); if (!vid || vid === true) return missing('--volume-id');
      var vi = -1; A.volumes.forEach(function (v, i) { if (v.id === vid) vi = i; });
      if (vi < 0) { io.e('\nAn error occurred (InvalidVolume.NotFound) when calling the DeleteVolume operation: The volume \'' + vid + '\' does not exist.\n'); return 254; }
      if (A.volumes[vi].attachedTo) { io.e('\nAn error occurred (VolumeInUse) when calling the DeleteVolume operation: Volume ' + vid + ' is currently attached to ' + A.volumes[vi].attachedTo + '\n'); return 254; }
      A.volumes.splice(vi, 1); return 0;
    }
    if (op === 'create-tags') {
      var rids = fl(o, 'resources'); if (!rids.length) return missing('--resources');
      var tg = tagArgs(o, 'tags'); if (!tg || !Object.keys(tg).length) return bad('Error parsing parameter \'--tags\': use Key=name,Value=text, for example --tags Key=owner,Value=platform');
      for (var r = 0; r < rids.length; r++) {
        var tgt = inst(A, rids[r]) || sg(A, rids[r]) || A.volumes.filter(function (v) { return v.id === rids[r]; })[0];
        if (!tgt) { io.e('\nAn error occurred (InvalidID) when calling the CreateTags operation: The ID \'' + rids[r] + '\' is not valid\n'); return 254; }
        tgt.tags = Object.assign(tgt.tags || {}, tg);
      }
      return 0;
    }
  }
  if (svc === 'iam') {
    var IO = { 'get-user': 'GetUser', 'list-roles': 'ListRoles', 'list-attached-role-policies': 'ListAttachedRolePolicies', 'attach-role-policy': 'AttachRolePolicy', 'detach-role-policy': 'DetachRolePolicy' };
    if (!IO[op]) return bad('iam ' + (op || '') + ' is not part of this simulator. Run aws help to see what it supports.');
    if (!need('iam:' + IO[op])) { io.e('\nAn error occurred (AccessDenied) when calling the ' + IO[op] + ' operation: User: arn:aws:iam::' + A.account + ':user/' + P0.user + ' is not authorized to perform: iam:' + IO[op] + ' on resource: ' + (fv(o, 'role-name') || 'the requested resource') + ' because no identity-based policy allows the iam:' + IO[op] + ' action\n'); return 254; }
    if (op === 'get-user') return out({ User: { UserName: P0.user, UserId: 'AIDA' + hex(prof, 16).toUpperCase(), Arn: 'arn:aws:iam::' + A.account + ':user/' + P0.user, CreateDate: '2026-01-10T09:00:00+00:00' } });
    if (op === 'list-roles') return out({ Roles: Object.keys(A.roles).sort().map(function (n) { return { RoleName: n, Arn: 'arn:aws:iam::' + A.account + ':role/' + n, Path: '/' }; }) });
    var rn = fv(o, 'role-name'); if (!rn || rn === true) return missing('--role-name');
    var R = A.roles[rn]; if (!R) { io.e('\nAn error occurred (NoSuchEntity) when calling the ' + IO[op] + ' operation: The role with name ' + rn + ' cannot be found.\n'); return 254; }
    R.policies = R.policies || [];
    function pname(arn) { return A.policies[arn] ? A.policies[arn].name : arn.split('/').pop(); }
    if (op === 'list-attached-role-policies') return out({ AttachedPolicies: R.policies.map(function (x) { return { PolicyName: pname(x), PolicyArn: x }; }) });
    var parn = fv(o, 'policy-arn'); if (!parn || parn === true) return missing('--policy-arn');
    if (op === 'attach-role-policy') {
      if (!A.policies[parn]) { io.e('\nAn error occurred (NoSuchEntity) when calling the AttachRolePolicy operation: Policy ' + parn + ' does not exist or is not attachable.\n'); return 254; }
      if (R.policies.indexOf(parn) < 0) R.policies.push(parn); return 0;
    }
    if (R.policies.indexOf(parn) < 0) { io.e('\nAn error occurred (NoSuchEntity) when calling the DetachRolePolicy operation: Policy ' + parn + ' was not found.\n'); return 254; }
    R.policies = R.policies.filter(function (x) { return x !== parn; }); return 0;
  }
  io.e('\naws: error: service "' + svc + '" is not part of this simulator. Run aws help to see what it supports.\n'); return 252;
});

/* ================================================================ Azure */
function azHelp(io) {
  io.o('Usage: az <group> <command> [options]\n\nCommands in this simulator:\n  account show\n  group list | show | delete\n  resource list\n  vm list | show | start | stop | deallocate | delete\n  network nsg list | show\n  network nsg rule list | create | delete\n  storage account list | show | update\n  storage blob list\n  role assignment list | create | delete\n\nOptions: -g/--resource-group, -n/--name, -o json|table|tsv|yaml, --query "JMESPATH". Add -d (--show-details) to vm list and show for the power state.\n');
}
function azErr(io, msg) { io.e('ERROR: ' + msg + '\n'); return 1; }
function azTags(o) { var t = {}; fl(o, 'tags').forEach(function (x) { var m = /^([^=]+)=(.*)$/.exec(x); if (m) t[m[1]] = m[2]; }); return t; }
def('az', function (a, io) {
  var s = this, c = s.cloudInit();
  if (!c || !c.az) { io.e('az: command not found\n'); return 127; }
  var Z = c.az, o = parse(a), w = o.pos, g = w[0];
  if (!g || g === 'help' || a.indexOf('--help') >= 0 || g === '--help') { azHelp(io); return 0; }
  var rgF = fv(o, 'resource-group'), nameF = fv(o, 'name'), sub = '/subscriptions/' + Z.subId;
  var out = function (v) { return emit(o, io, v, true); };
  function rg(n) { var i; for (i = 0; i < Z.groups.length; i++) if (Z.groups[i].name.toLowerCase() === String(n).toLowerCase()) return Z.groups[i]; return null; }
  function needRg() { if (!rgF || rgF === true) { io.e('ERROR: the following arguments are required: --resource-group/-g\n'); return false; } if (!rg(rgF)) { io.e('ERROR: (ResourceGroupNotFound) Resource group \'' + rgF + '\' could not be found.\nCode: ResourceGroupNotFound\n'); return false; } return true; }
  function needName() { if (!nameF || nameF === true) { io.e('ERROR: the following arguments are required: --name/-n\n'); return false; } return true; }
  function notFound(type, n, group) { io.e('ERROR: (ResourceNotFound) The Resource \'' + type + '/' + n + '\' under resource group \'' + group + '\' was not found.\nCode: ResourceNotFound\n'); return 3; }
  function grpJson(x) { return { id: sub + '/resourceGroups/' + x.name, location: x.location || 'westeurope', name: x.name, properties: { provisioningState: 'Succeeded' }, tags: x.tags || null, type: 'Microsoft.Resources/resourceGroups' }; }
  function vmJson(v, det) { var r = { id: sub + '/resourceGroups/' + v.rg + '/providers/Microsoft.Compute/virtualMachines/' + v.name, name: v.name, resourceGroup: v.rg, location: v.location || 'westeurope', hardwareProfile: { vmSize: v.size || 'Standard_B2s' }, provisioningState: 'Succeeded', tags: v.tags || null, type: 'Microsoft.Compute/virtualMachines' }; if (det) { r.powerState = v.state === 'running' ? 'VM running' : v.state === 'stopped' ? 'VM stopped' : 'VM deallocated'; r.privateIps = '10.1.0.4'; r.publicIps = v.state === 'running' ? '20.50.60.70' : ''; } return r; }
  function ruleJson(n, r) { return { name: r.name, priority: r.priority, access: r.access, direction: r.direction, protocol: r.protocol, sourceAddressPrefix: r.source, sourcePortRange: '*', destinationAddressPrefix: '*', destinationPortRange: r.port, resourceGroup: n.rg, provisioningState: 'Succeeded' }; }
  function stJson(x) { return { id: sub + '/resourceGroups/' + x.rg + '/providers/Microsoft.Storage/storageAccounts/' + x.name, name: x.name, resourceGroup: x.rg, location: x.location || 'westeurope', kind: 'StorageV2', sku: { name: x.sku || 'Standard_LRS' }, allowBlobPublicAccess: !!x.publicBlob, minimumTlsVersion: x.tls || 'TLS1_2', enableHttpsTrafficOnly: x.httpsOnly !== false, tags: x.tags || null, type: 'Microsoft.Storage/storageAccounts' }; }

  if (g === 'account') { if (w[1] !== 'show') return azErr(io, 'only "az account show" is part of this simulator'); return out({ environmentName: 'AzureCloud', id: Z.subId, isDefault: true, name: Z.sub, state: 'Enabled', tenantId: '99999999-8888-7777-6666-555555555555', user: { name: Z.user, type: 'user' } }); }
  if (g === 'group') {
    if (w[1] === 'list') { var gl = Z.groups.slice(); var tg = azTags(o); if (has(o, 'tag')) { var tt = fl(o, 'tag')[0] || ''; var tm = /^([^=]+)(?:=(.*))?$/.exec(tt); if (tm) gl = gl.filter(function (x) { return x.tags && x.tags[tm[1]] !== undefined && (tm[2] === undefined || x.tags[tm[1]] === tm[2]); }); } return out(gl.map(grpJson)); }
    if (w[1] === 'show') { if (!needName()) return 2; var sg2 = rg(nameF); if (!sg2) { io.e('ERROR: (ResourceGroupNotFound) Resource group \'' + nameF + '\' could not be found.\nCode: ResourceGroupNotFound\n'); return 3; } return out(grpJson(sg2)); }
    if (w[1] === 'delete') {
      if (!needName()) return 2; var dg = rg(nameF); if (!dg) { io.e('ERROR: (ResourceGroupNotFound) Resource group \'' + nameF + '\' could not be found.\nCode: ResourceGroupNotFound\n'); return 3; }
      if (!has(o, 'yes')) { io.e('Are you sure you want to perform this operation? (y/n): \nERROR: this simulator cannot ask. Add --yes to confirm the delete.\n'); return 1; }
      if (dg.lock) { io.e('ERROR: (ScopeLocked) The scope \'' + sub + '/resourceGroups/' + dg.name + '\' cannot perform delete operation because following scope(s) are locked. Please remove the lock and try again.\nCode: ScopeLocked\n'); return 1; }
      Z.groups = Z.groups.filter(function (x) { return x !== dg; }); Z.vms = Z.vms.filter(function (x) { return x.rg !== dg.name; }); Z.nsgs = Z.nsgs.filter(function (x) { return x.rg !== dg.name; }); Z.storage = Z.storage.filter(function (x) { return x.rg !== dg.name; }); return 0;
    }
    return azErr(io, 'az group ' + (w[1] || '') + ' is not part of this simulator (list, show, delete).');
  }
  if (g === 'resource') {
    if (w[1] !== 'list') return azErr(io, 'only "az resource list" is part of this simulator');
    var rs = [];
    Z.vms.forEach(function (v) { rs.push({ name: v.name, resourceGroup: v.rg, type: 'Microsoft.Compute/virtualMachines', location: v.location || 'westeurope', tags: v.tags || null }); });
    Z.storage.forEach(function (v) { rs.push({ name: v.name, resourceGroup: v.rg, type: 'Microsoft.Storage/storageAccounts', location: v.location || 'westeurope', tags: v.tags || null }); });
    Z.nsgs.forEach(function (v) { rs.push({ name: v.name, resourceGroup: v.rg, type: 'Microsoft.Network/networkSecurityGroups', location: v.location || 'westeurope', tags: v.tags || null }); });
    if (rgF && rgF !== true) { if (!rg(rgF)) { io.e('ERROR: (ResourceGroupNotFound) Resource group \'' + rgF + '\' could not be found.\nCode: ResourceGroupNotFound\n'); return 3; } rs = rs.filter(function (x) { return x.resourceGroup.toLowerCase() === rgF.toLowerCase(); }); }
    return out(rs);
  }
  if (g === 'vm') {
    var det = has(o, 'show-details');
    if (w[1] === 'list') { var vl = Z.vms.slice(); if (rgF && rgF !== true) { if (!rg(rgF)) { io.e('ERROR: (ResourceGroupNotFound) Resource group \'' + rgF + '\' could not be found.\nCode: ResourceGroupNotFound\n'); return 3; } vl = vl.filter(function (v) { return v.rg.toLowerCase() === rgF.toLowerCase(); }); } return out(vl.map(function (v) { return vmJson(v, det); })); }
    if (w[1] === 'delete') {
      if (!needName() || !needRg()) return 2; var DV = Z.vms.filter(function (v) { return v.name === nameF && v.rg.toLowerCase() === rgF.toLowerCase(); })[0];
      if (!DV) return notFound('virtualMachines', nameF, rgF);
      if (!has(o, 'yes')) { io.e('Are you sure you want to perform this operation? (y/n): \nERROR: this simulator cannot ask. Add --yes to confirm the delete.\n'); return 1; }
      Z.vms = Z.vms.filter(function (v) { return v !== DV; }); return 0;
    }
    if (['show', 'start', 'stop', 'deallocate'].indexOf(w[1]) < 0) return azErr(io, 'az vm ' + (w[1] || '') + ' is not part of this simulator (list, show, start, stop, deallocate, delete).');
    if (!needName() || !needRg()) return 2;
    var V = Z.vms.filter(function (v) { return v.name.toLowerCase() === nameF.toLowerCase() && v.rg.toLowerCase() === rgF.toLowerCase(); })[0]; if (!V) return notFound('virtualMachines', nameF, rgF);
    if (w[1] === 'show') return out(vmJson(V, det));
    if (V.quota && w[1] === 'start') { io.e('ERROR: (OperationNotAllowed) Operation could not be completed as it results in exceeding approved Total Regional Cores quota.\nCode: OperationNotAllowed\n'); return 1; }
    V.state = w[1] === 'start' ? 'running' : w[1] === 'stop' ? 'stopped' : 'deallocated'; return 0;
  }
  if (g === 'network' && w[1] === 'nsg') {
    if (w[2] === 'list') { var nl = Z.nsgs.slice(); if (rgF && rgF !== true) nl = nl.filter(function (n) { return n.rg.toLowerCase() === rgF.toLowerCase(); }); return out(nl.map(function (n) { return { name: n.name, resourceGroup: n.rg, location: n.location || 'westeurope', provisioningState: 'Succeeded' }; })); }
    if (w[2] === 'show') { if (!needName() || !needRg()) return 2; var N0 = Z.nsgs.filter(function (n) { return n.name === nameF && n.rg.toLowerCase() === rgF.toLowerCase(); })[0]; if (!N0) return notFound('networkSecurityGroups', nameF, rgF); return out({ name: N0.name, resourceGroup: N0.rg, securityRules: (N0.rules || []).map(function (r) { return ruleJson(N0, r); }) }); }
    if (w[2] === 'rule') {
      var nsgName = fv(o, 'nsg-name'); if (!nsgName || nsgName === true) { io.e('ERROR: the following arguments are required: --nsg-name\n'); return 2; }
      if (!needRg()) return 2;
      var N = Z.nsgs.filter(function (n) { return n.name === nsgName && n.rg.toLowerCase() === rgF.toLowerCase(); })[0]; if (!N) return notFound('networkSecurityGroups', nsgName, rgF);
      N.rules = N.rules || [];
      if (w[3] === 'list') return out(N.rules.map(function (r) { return ruleJson(N, r); }));
      if (w[3] === 'delete') { if (!needName()) return 2; var before = N.rules.length; N.rules = N.rules.filter(function (r) { return r.name !== nameF; }); if (N.rules.length === before) { io.e('ERROR: (SecurityRuleNotFound) Rule ' + nameF + ' not found.\nCode: SecurityRuleNotFound\n'); return 3; } return 0; }
      if (w[3] === 'create') {
        if (!needName()) return 2;
        var pri = parseInt(fv(o, 'priority'), 10); if (isNaN(pri)) { io.e('ERROR: the following arguments are required: --priority\n'); return 2; }
        if (pri < 100 || pri > 4096) { io.e('ERROR: (SecurityRuleInvalidPriority) Rule priority ' + pri + ' is outside the allowed range 100 to 4096.\nCode: SecurityRuleInvalidPriority\n'); return 1; }
        if (N.rules.some(function (r) { return r.priority === pri && r.name !== nameF && r.direction === (fv(o, 'direction') || 'Inbound'); })) { io.e('ERROR: (SecurityRuleParameterPriorityAlreadyTaken) Priority ' + pri + ' is already in use by another rule in this security group.\nCode: SecurityRuleParameterPriorityAlreadyTaken\n'); return 1; }
        var acc = fv(o, 'access') || 'Allow', dirn = fv(o, 'direction') || 'Inbound', pro = fv(o, 'protocol') || '*', prt = fv(o, 'destination-port-ranges') || '*', src = fv(o, 'source-address-prefixes') || '*';
        if (['Allow', 'Deny'].indexOf(acc) < 0) { io.e('ERROR: argument --access: invalid choice: \'' + acc + '\' (choose from Allow, Deny)\n'); return 2; }
        N.rules = N.rules.filter(function (r) { return r.name !== nameF; });
        var nr = { name: nameF, priority: pri, access: acc, direction: dirn, protocol: pro, port: prt, source: src }; N.rules.push(nr); return out(ruleJson(N, nr));
      }
      return azErr(io, 'az network nsg rule ' + (w[3] || '') + ' is not part of this simulator (list, create, delete).');
    }
    return azErr(io, 'az network nsg ' + (w[2] || '') + ' is not part of this simulator.');
  }
  if (g === 'storage' && w[1] === 'account') {
    if (w[2] === 'list') { var sl = Z.storage.slice(); if (rgF && rgF !== true) sl = sl.filter(function (x) { return x.rg.toLowerCase() === rgF.toLowerCase(); }); return out(sl.map(stJson)); }
    if (w[2] === 'show' || w[2] === 'update') {
      if (!needName() || !needRg()) return 2;
      var S = Z.storage.filter(function (x) { return x.name === nameF && x.rg.toLowerCase() === rgF.toLowerCase(); })[0]; if (!S) return notFound('storageAccounts', nameF, rgF);
      if (w[2] === 'update') {
        if (has(o, 'allow-blob-public-access')) { var pv = String(fv(o, 'allow-blob-public-access')).toLowerCase(); if (pv !== 'true' && pv !== 'false') { io.e('ERROR: argument --allow-blob-public-access: invalid value \'' + pv + '\' (use true or false)\n'); return 2; } S.publicBlob = pv === 'true'; }
        if (has(o, 'min-tls-version')) { var tv = fv(o, 'min-tls-version'); if (['TLS1_0', 'TLS1_1', 'TLS1_2'].indexOf(tv) < 0) { io.e('ERROR: argument --min-tls-version: invalid choice (choose from TLS1_0, TLS1_1, TLS1_2)\n'); return 2; } S.tls = tv; }
        if (has(o, 'https-only')) S.httpsOnly = String(fv(o, 'https-only')).toLowerCase() === 'true';
      }
      return out(stJson(S));
    }
    return azErr(io, 'az storage account ' + (w[2] || '') + ' is not part of this simulator (list, show, update).');
  }
  if (g === 'storage' && w[1] === 'blob' && w[2] === 'list') {
    var an = fv(o, 'account-name'), cn = fv(o, 'container-name'); if (!an || an === true || !cn || cn === true) { io.e('ERROR: the following arguments are required: --account-name, --container-name\n'); return 2; }
    var SA = Z.storage.filter(function (x) { return x.name === an; })[0]; if (!SA) { io.e('ERROR: The storage account ' + an + ' was not found.\n'); return 1; }
    if (fv(o, 'auth-mode') !== 'login') { io.e('ERROR: this simulator signs in with your Azure login. Add --auth-mode login.\n'); return 1; }
    var scope = sub + '/resourceGroups/' + SA.rg + '/providers/Microsoft.Storage/storageAccounts/' + SA.name, okR = ['Storage Blob Data Reader', 'Storage Blob Data Contributor', 'Storage Blob Data Owner'];
    var allowed = Z.roles.some(function (r) { return (r.assignee === Z.user || r.assignee === Z.userId) && okR.indexOf(r.role) >= 0 && (scope === r.scope || scope.indexOf(r.scope.replace(/\/$/, '') + '/') === 0); });
    if (!allowed) { io.e('You do not have the required permissions needed to perform this operation.\nDepending on your operation, you may need to be assigned one of the following roles:\n    "Storage Blob Data Owner"\n    "Storage Blob Data Contributor"\n    "Storage Blob Data Reader"\n    "Storage Queue Data Contributor"\n    "Storage Queue Data Reader"\nIf you want to use the old authentication method and allow querying for the right account key, please use the "--auth-mode" parameter and "key" value.\n'); return 1; }
    return out(((Z.blobs[an + '/' + cn]) || []).map(function (b) { return { name: b, container: cn }; }));
  }
  if (g === 'role' && w[1] === 'assignment') {
    if (w[2] === 'list') { var rl = Z.roles.slice(); var ag = fv(o, 'assignee'); if (ag && ag !== true) rl = rl.filter(function (r) { return r.assignee === ag; }); if (has(o, 'scope') && fv(o, 'scope') !== true) { var sc = fv(o, 'scope'); rl = rl.filter(function (r) { return r.scope === sc; }); } return out(rl.map(function (r) { return { principalName: r.assignee, roleDefinitionName: r.role, scope: r.scope, type: 'Microsoft.Authorization/roleAssignments' }; })); }
    if (w[2] === 'create') {
      var asg = fv(o, 'assignee'), role = fv(o, 'role'), scp = fv(o, 'scope');
      if (!asg || asg === true || !role || role === true) { io.e('ERROR: the following arguments are required: --assignee, --role\n'); return 2; }
      if (!scp || scp === true) scp = sub;
      var KNOWN = ['Reader', 'Contributor', 'Owner', 'Storage Blob Data Reader', 'Storage Blob Data Contributor', 'Storage Blob Data Owner', 'Virtual Machine Contributor', 'Monitoring Reader'];
      if (KNOWN.indexOf(role) < 0) { io.e('ERROR: Cannot find role definition \'' + role + '\'. Check the spelling and capitals. The simulator knows: ' + KNOWN.join(', ') + '.\n'); return 1; }
      if (scp.indexOf(sub) !== 0) { io.e('ERROR: (MissingSubscription) The request did not have a subscription or a valid tenant level resource provider.\nCode: MissingSubscription\n'); return 1; }
      if (Z.roles.some(function (r) { return r.assignee === asg && r.role === role && r.scope === scp; })) { io.e('ERROR: (RoleAssignmentExists) The role assignment already exists.\nCode: RoleAssignmentExists\n'); return 1; }
      var rr = { assignee: asg, role: role, scope: scp }; Z.roles.push(rr); return out({ principalName: asg, roleDefinitionName: role, scope: scp, type: 'Microsoft.Authorization/roleAssignments' });
    }
    if (w[2] === 'delete') {
      var dasg = fv(o, 'assignee'), drole = fv(o, 'role'), dscp = fv(o, 'scope');
      if ((!dasg || dasg === true) && (!drole || drole === true)) { io.e('ERROR: Please provide at least one of --assignee, --role or --scope to select the assignments to delete.\n'); return 2; }
      var keep = Z.roles.filter(function (r) { return !((!dasg || dasg === true || r.assignee === dasg) && (!drole || drole === true || r.role === drole) && (!dscp || dscp === true || r.scope === dscp)); });
      if (keep.length === Z.roles.length) { io.e('ERROR: No matched assignments were found to delete\n'); return 1; }
      Z.roles = keep; return 0;
    }
    return azErr(io, 'az role assignment ' + (w[2] || '') + ' is not part of this simulator (list, create, delete).');
  }
  io.e('ERROR: \'' + w.slice(0, 2).join(' ') + '\' is not part of this simulator. Run az help to see what it supports.\n'); return 2;
});
T.cloudQuery = jm;
if (typeof module === 'object' && module.exports) module.exports = T;
}());
