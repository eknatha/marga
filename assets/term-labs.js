/* MARGA terminal engine, part 10: building a lab session and evaluating its checks. */
(function () {
'use strict';
var T = (typeof module === 'object' && module.exports) ? require('./term-net.js') : window.MargaTerm;

T.newLab = function (lab, opts) {
  var w = JSON.parse(JSON.stringify(lab.world || {}));
  w.files = (w.files || []).concat(lab.files.map(function (f) { return { path: f.path, data: f.data, m: f.m, o: f.o, g: f.g, size: f.size }; }));
  return new T.Session(w, opts || {});
};
function re(src) { return new RegExp(src, 'm'); }
T.evalCheck = async function (s, c) {
  var ok = false, detail = '';
  try {
    switch (c.t) {
      case 'file': { var ex = s.readRaw(c.path) !== null || (function () { try { s.walk(c.path, true, true); return true; } catch (e) { return false; } })(); ok = c.exists === false ? !ex : ex; break; }
      case 'contains': { var t = s.readRaw(c.path); if (t === null) { ok = c.not === true; detail = 'file not found'; break; } var hit = c.re ? re(c.re).test(t) : t.indexOf(c.text) >= 0; ok = c.not ? !hit : hit; break; }
      case 'equals': { var t2 = s.readRaw(c.path); ok = t2 !== null && t2.replace(/\n+$/, '') === c.text.replace(/\n+$/, ''); break; }
      case 'mode': { var n = s.walk(c.path, true, true); ok = (n.m & 4095).toString(8) === String(c.mode).replace(/^0+/, '') || (n.m & 4095).toString(8) === c.mode; break; }
      case 'owner': { var n2 = s.walk(c.path, true, true); ok = (!c.owner || n2.o === c.owner) && (!c.group || n2.g === c.group); break; }
      case 'unchanged': { ok = s.readRaw(c.path) === s.snapshotFiles[c.path]; break; }
      case 'service': { var sv = s.services[c.name]; ok = !!sv && (!c.state || sv.state === c.state) && (c.enabled === undefined || !!sv.enabled === c.enabled); break; }
      case 'proc': { var rx = new RegExp(c.cmd); var present = s.procs.some(function (p) { return rx.test(p.cmd); }); ok = c.present === false ? !present : present; break; }
      case 'disk': { var d = s.diskFor(c.mount || '/'); var used = s.diskUsed(d); ok = used * 100 / d.size < c.below; detail = Math.round(used * 100 / d.size) + '% used'; break; }
      case 'cron': { var ct = s.cron[c.user || s.eu]; ok = ct !== undefined && re(c.re).test(ct); break; }
      case 'ran': { var r2 = re(c.re); ok = s.history.some(function (h) { return r2.test(h); }); break; }
      case 'group': { ok = !!s.groups[c.group] && s.groups[c.group].members.indexOf(c.user) >= 0; break; }
      case 'cmd': {
        var cl = s.clone(); cl.eu = c.as || cl.eu; cl.cwd = c.cwd || s.cwd;
        var res = await cl.exec1(c.run), good = true;
        if (c.code !== undefined && res.code !== c.code) { good = false; detail = 'exit status ' + res.code; }
        if (c.out && !re(c.out).test(res.out)) { good = false; detail = detail || 'output did not match'; }
        if (c.notOut && re(c.notOut).test(res.out + res.err)) { good = false; detail = detail || 'unwanted output'; }
        ok = good; break;
      }
      default: detail = 'unknown check type ' + c.t;
    }
  } catch (e) { ok = false; detail = e && e.message ? e.message : 'error'; }
  return { label: c.label || c.t, ok: ok, detail: detail };
};
T.evalChecks = async function (s, checks) { var out = []; for (var i = 0; i < checks.length; i++) out.push(await T.evalCheck(s, checks[i])); return out; };
if (typeof module === 'object' && module.exports) module.exports = T;
}());
