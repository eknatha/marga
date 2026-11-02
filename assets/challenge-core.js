/* MARGA challenge checker. Pure functions, used by the lesson page and by tools/validate.js.
   A command, answer or query challenge passes when the text matches one of the accepted patterns.
   A fix challenge passes when every rule holds: a "has" rule needs its pattern to match, a "not" rule needs it to be absent. */
(function (root) {
'use strict';
function clean(t) { return String(t == null ? '' : t).replace(/\r/g, ''); }
function grade(ch, input) {
  var text = clean(input), fails = [];
  if (ch.kind === 'fix') {
    (ch.rules || []).forEach(function (r) {
      var hit = false; try { hit = new RegExp(r.re, r.i ? 'mi' : 'm').test(text); } catch (x) { hit = false; }
      if (r.not ? hit : !hit) fails.push(r.msg);
    });
    return { ok: fails.length === 0, fails: fails };
  }
  var t = text.trim().replace(/^\$\s+/, '').replace(/\s+/g, ' ');
  if (!t) return { ok: false, fails: ['Type your answer first.'] };
  var ok = (ch.accept || []).some(function (p) { try { return new RegExp(p, ch.ci ? 'i' : '').test(t); } catch (x) { return false; } });
  return { ok: ok, fails: ok ? [] : [ch.kind === 'answer' ? 'That is not the answer yet. Try a hint.' : 'That is not quite right yet. Re-read the task, or open a hint.'] };
}
var api = { grade: grade };
if (typeof module === 'object' && module.exports) module.exports = api; else root.MargaChallengeCore = api;
}(typeof window !== 'undefined' ? window : this));
