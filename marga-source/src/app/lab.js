/* MARGA lab engine: a small HCL reader, a path lookup and a checker, shared by the Terraform (HCL) and YAML exercises.
   Works in the browser and in Node (tools use it to prove that every exercise solution passes its own checks).
   The HCL reader understands blocks, attributes, comments, strings, heredocs and nested brackets. It checks structure,
   not provider schemas, so it is a learning aid and not a replacement for terraform validate. */
(function (root) {
'use strict';

/* ---------- HCL reader ---------- */
function hclParse(src) {
  var i = 0, n = src.length, line = 1;
  function fail(msg, ln) { var e = new Error(msg); e.line = ln || line; throw e; }
  function ws() {
    for (;;) {
      var c = src[i];
      if (c === '\n') { line++; i++; }
      else if (c === ' ' || c === '\t' || c === '\r') i++;
      else if (c === '#' || (c === '/' && src[i + 1] === '/')) { while (i < n && src[i] !== '\n') i++; }
      else if (c === '/' && src[i + 1] === '*') {
        var st = line; i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
        if (i >= n) fail('Comment that starts with /* is never closed.', st);
        i += 2;
      } else break;
    }
  }
  function ident() { var s = i; while (i < n && /[A-Za-z0-9_\-]/.test(src[i])) i++; return src.slice(s, i); }
  function str() {
    var st = line, s = i; i++;
    var depth = 0;
    while (i < n) {
      var c = src[i];
      if (c === '\\' && depth === 0) { i += 2; continue; }
      if (c === '$' && src[i + 1] === '{' || (c === '%' && src[i + 1] === '{')) { depth++; i += 2; continue; }
      if (c === '}' && depth > 0) { depth--; i++; continue; }
      if (c === '\n' && depth === 0) fail('A string is not closed on this line. Add the closing double quote.', st);
      if (c === '"' && depth === 0) { i++; return src.slice(s, i); }
      i++;
    }
    fail('A string is never closed.', st);
  }
  function heredoc() {
    var st = line, m = /^<<(-?)([A-Za-z_][A-Za-z0-9_]*)\r?\n/.exec(src.slice(i));
    if (!m) fail('Unexpected "<<". A heredoc looks like <<EOT on its own line.');
    var s = i; i += m[0].length; line++;
    var re = new RegExp('^[ \\t]*' + m[2] + '[ \\t]*$');
    for (;;) {
      var e = src.indexOf('\n', i), ln = src.slice(i, e < 0 ? n : e);
      if (re.test(ln)) { i = e < 0 ? n : e; return src.slice(s, i); }
      if (e < 0) fail('The heredoc <<' + m[2] + ' is never closed.', st);
      i = e + 1; line++;
    }
  }
  function expr() {
    // raw text up to the end of the line, following brackets, strings and heredocs across lines
    var s = i, depth = 0, st = line;
    while (i < n) {
      var c = src[i];
      if (c === '"') { str(); continue; }
      if (c === '<' && src[i + 1] === '<' && /[-A-Za-z_]/.test(src[i + 2] || '')) { heredoc(); continue; }
      if (c === '#' || (c === '/' && src[i + 1] === '/')) { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') { ws(); continue; }
      if (c === '{' || c === '[' || c === '(') depth++;
      if (c === '}' || c === ']' || c === ')') { if (depth === 0) break; depth--; }
      if (c === '\n') { if (depth === 0) break; line++; }
      i++;
    }
    if (depth > 0) fail('A bracket opened on line ' + st + ' is never closed.', st);
    var text = src.slice(s, i).replace(/\s*(#|\/\/).*$/, '').trim();
    if (!text) fail('There is no value after the equals sign.', st);
    return text;
  }
  function body(top, openLine) {
    var attrs = [], blocks = [];
    for (;;) {
      ws();
      if (i >= n) { if (top) break; fail('A block opened on line ' + openLine + ' is never closed. Add a closing }.', openLine); }
      if (src[i] === '}') { if (top) fail('There is a } with no matching {.'); i++; break; }
      var ln = line, name = ident();
      if (!name) fail('Unexpected character "' + src[i] + '". Expected an argument name or a block type.');
      var save = i; ws();
      if (src[i] === '=' && src[i + 1] !== '=') { i++; attrs.push({ name: name, value: expr(), line: ln }); continue; }
      var labels = [];
      for (;;) {
        ws();
        if (src[i] === '"') { var q = str(); labels.push(q.slice(1, -1)); }
        else if (/[A-Za-z_]/.test(src[i] || '')) labels.push(ident());
        else break;
      }
      ws();
      if (src[i] !== '{') fail('After "' + name + (labels.length ? ' ' + labels.join(' ') : '') + '" expected = or {.', ln);
      i++;
      var b = body(false, ln); b.type = name; b.labels = labels; b.line = ln; blocks.push(b);
    }
    return { attrs: attrs, blocks: blocks };
  }
  var out = body(true, 1);
  return out;
}
function unq(v) {
  var m = /^"((?:[^"\\]|\\.)*)"$/.exec(v);
  if (m && m[1].indexOf('${') < 0) return m[1].replace(/\\"/g, '"');
  return v;
}
function bodyObject(b) {
  var o = {};
  b.attrs.forEach(function (a) { o[a.name] = unq(a.value); });
  b.blocks.forEach(function (x) {
    var cur = o, t = x.type, inner = bodyObject(x);
    if (x.labels.length === 0) { if (!Array.isArray(cur[t])) cur[t] = []; cur[t].push(inner); return; }
    if (!cur[t] || typeof cur[t] !== 'object' || Array.isArray(cur[t])) cur[t] = {};
    cur = cur[t];
    for (var k = 0; k < x.labels.length - 1; k++) { var l = x.labels[k]; if (!cur[l] || typeof cur[l] !== 'object') cur[l] = {}; cur = cur[l]; }
    cur[x.labels[x.labels.length - 1]] = inner;
  });
  return o;
}
function hclObject(src) { return bodyObject(hclParse(src)); }

/* ---------- path lookup and checks ---------- */
function getPath(obj, path, keep) {
  var parts = String(path).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean), cur = [obj];
  parts.forEach(function (p) {
    var next = [];
    cur.forEach(function (c) {
      if (Array.isArray(c)) { if (/^\d+$/.test(p)) { if (c[+p] !== undefined) next.push(c[+p]); } else c.forEach(function (d) { if (d && typeof d === 'object' && p in d) next.push(d[p]); }); }
      else if (c && typeof c === 'object' && p in c) next.push(c[p]);
    });
    cur = next;
  });
  var flat = [];
  if (keep) return cur;
  cur.forEach(function (c) { if (Array.isArray(c)) c.forEach(function (d) { flat.push(d); }); else flat.push(c); });
  return flat;
}
function norm(v) { return typeof v === 'string' ? unq(v.trim()) : String(v); }
function kindOf(v, raw) { if (!raw) return Array.isArray(v) ? 'list' : v === null ? 'null' : typeof v === 'object' ? 'map' : typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? 'number' : 'string'; return Array.isArray(v) ? 'list' : v === null ? 'null' : typeof v === 'object' ? 'map' : typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? 'number' : /^(true|false)$/.test(v) ? 'bool' : /^-?\d+(\.\d+)?$/.test(v) ? 'number' : /^\[/.test(v) ? 'list' : /^\{/.test(v) ? 'map' : 'string'; }
/* check lines: "op path value | optional message" */
function runChecks(docs, text, source, isRaw) {
  var fails = [];
  String(text || '').split('\n').forEach(function (raw) {
    var line = raw.trim(); if (!line || line[0] === '#') return;
    var custom = ''; var bar = line.indexOf(' | '); if (bar > 0) { custom = line.slice(bar + 3).trim(); line = line.slice(0, bar).trim(); }
    var m = /^(\S+)\s*(.*)$/.exec(line), op = m[1], rest = m[2], doc = 0;
    if (op === 'docs') { if (docs.length !== +rest) fails.push(custom || 'Expected ' + rest + ' document(s), found ' + docs.length + '.'); return; }
    if (op === 'src' || op === 'nosrc') { var hit = new RegExp(rest).test(source || ''); if (op === 'src' ? !hit : hit) fails.push(custom || (op === 'src' ? 'The file should contain: ' : 'The file should not contain: ') + rest); return; }
    var pm = /^(?:@(\d+)\s+)?(\S+)\s*(.*)$/.exec(rest); if (pm[1]) doc = +pm[1];
    var d = docs[doc]; var path = pm[2], val = pm[3];
    var vals = d === undefined ? [] : getPath(d, path, op === 'len' || op === 'type'), msg = custom, ok = true;
    if (op === 'has') { ok = vals.length > 0 && vals.some(function (v) { return v !== null && v !== ''; }); msg = msg || 'Missing: ' + path; }
    else if (op === 'no') { ok = vals.length === 0; msg = msg || 'Remove: ' + path; }
    else if (op === 'eq') { ok = vals.some(function (v) { return norm(v) === val; }); msg = msg || path + ' should be ' + val + (vals.length ? ' (found ' + vals.map(norm).join(', ') + ')' : ' (not set)'); }
    else if (op === 'ne') { ok = vals.length > 0 && vals.every(function (v) { return norm(v) !== val; }); msg = msg || path + ' must not be ' + val; }
    else if (op === 'match') { var re = new RegExp(val); ok = vals.some(function (v) { return re.test(norm(v)); }); msg = msg || path + ' does not look right (expected a match for ' + val + ')'; }
    else if (op === 'type') { ok = vals.length > 0 && vals.every(function (v) { return kindOf(v, isRaw) === val; }); msg = msg || path + ' should be a ' + val; }
    else if (op === 'count') { var cm = /^(>=|<=|==|>|<)\s*(\d+)$/.exec(val), c = vals.length; var N = +cm[2]; ok = cm[1] === '>=' ? c >= N : cm[1] === '<=' ? c <= N : cm[1] === '==' ? c === N : cm[1] === '>' ? c > N : c < N; msg = msg || 'Expected ' + path + ' ' + val + ', found ' + c; }
    else if (op === 'len') { var lm = /^(>=|<=|==|>|<)\s*(\d+)$/.exec(val), l = vals.length && Array.isArray(vals[0]) ? vals[0].length : vals.length; var L = +lm[2]; ok = lm[1] === '>=' ? l >= L : lm[1] === '<=' ? l <= L : lm[1] === '==' ? l === L : lm[1] === '>' ? l > L : l < L; msg = msg || path + ' should have ' + val + ' item(s), found ' + l; }
    else { ok = false; msg = 'Unknown check: ' + op; }
    if (!ok) fails.push(msg);
  });
  return fails;
}

/* ---------- Terraform lint for free play ---------- */
function hclLint(src, obj) {
  var out = [];
  if (/\b(AKIA|ASIA)[A-Z0-9]{16}\b/.test(src)) out.push({ level: 'error', msg: 'This looks like an AWS access key. Never put keys in code. Use a role or environment variables.' });
  if (/(password|secret|token)\s*=\s*"[^"$]{4,}"/i.test(src)) out.push({ level: 'warn', msg: 'A password or secret is written in the code. Use a variable marked sensitive = true or a secrets manager.' });
  var res = obj.resource || {};
  Object.keys(res).forEach(function (t) { Object.keys(res[t]).forEach(function (nm) {
    var r = res[t][nm], addr = t + '.' + nm;
    if (t === 'aws_security_group' || t === 'aws_security_group_rule') {
      var ing = r.ingress || (r.cidr_blocks ? [r] : []);
      ing.forEach(function (g) { if (/0\.0\.0\.0\/0/.test(g.cidr_blocks || '') && /^(22|3389|3306|5432)$/.test(norm(g.from_port || ''))) out.push({ level: 'error', msg: addr + ' opens port ' + norm(g.from_port) + ' to the whole internet.' }); });
    }
    if (t === 'aws_s3_bucket' && /public-read/.test(r.acl || '')) out.push({ level: 'error', msg: addr + ' uses a public ACL.' });
    if (t === 'aws_db_instance' && /^(true)$/.test(norm(r.publicly_accessible || ''))) out.push({ level: 'warn', msg: addr + ' is publicly accessible.' });
    if (t === 'aws_db_instance' && !/^(true)$/.test(norm(r.storage_encrypted || ''))) out.push({ level: 'info', msg: addr + ' has no storage_encrypted = true.' });
  }); });
  var vars = obj.variable || {};
  Object.keys(vars).forEach(function (k) { if (!vars[k].description) out.push({ level: 'info', msg: 'variable "' + k + '" has no description.' }); if (!vars[k].type) out.push({ level: 'info', msg: 'variable "' + k + '" has no type.' }); });
  return out;
}

var api = { hclParse: hclParse, hclObject: hclObject, getPath: getPath, runChecks: runChecks, hclLint: hclLint, norm: norm };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MargaLab = api;
})(typeof window !== 'undefined' ? window : this);
