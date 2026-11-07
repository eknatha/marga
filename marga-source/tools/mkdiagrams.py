#!/usr/bin/env python3
"""Backfill a 'How the parts fit together' diagram into lessons that have none.
Nodes come from the lesson's own H2 sections; pitfalls from its Common mistakes."""
import re, glob, os, sys
ROOT = os.path.join(os.path.dirname(__file__), '..', 'src', 'content')
SKIP = re.compile(r'^(what you will learn|common mistakes|incident|predict|interview question|how it fails|how the parts fit)', re.I)
KINDS = [
 (r'verif|test|check|monitor|observ|debug|troubleshoot|log|metric|alert|audit', 'observe'),
 (r'secur|auth|identity|access|permission|encrypt|secret|policy|polic|rbac|tls|certificate|harden', 'security'),
 (r'queue|stream|event|message|topic|schedul|pipeline|workflow', 'queue'),
 (r'store|storage|disk|volume|database|state|backup|data|cache|index', 'store'),
 (r'network|route|proxy|gateway|dns|edge|ingress|load', 'edge'),
 (r'client|user|request|browser|api|cli', 'client'),
 (r'cloud|provider|external|vendor|registry|repository', 'external'),
]
def clean(t):
    t = re.sub(r'`([^`]*)`', r'\1', t)
    t = re.sub(r'\*\*([^*]*)\*\*|\*([^*]*)\*', lambda m: m.group(1) or m.group(2), t)
    t = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', t)
    t = t.replace('|', '/').replace('\n', ' ')
    return re.sub(r'\s+', ' ', t).strip()
def trunc(t, n):
    if len(t) <= n: return t
    cut = t[:n].rsplit(' ', 1)[0].rstrip(',;:-')
    return cut + '...'
def first_sentence(body):
    lines = body.split('\n'); para = []; infence = False
    for ln in lines:
        if ln.startswith('```'): infence = not infence; continue
        if infence: continue
        s = ln.strip()
        if not s:
            if para: break
            continue
        if s.startswith(('#', '|', '>', ':::')): 
            if para: break
            continue
        if re.match(r'^(\d+\.|[-*])\s', s):
            if para: break
            para.append(re.sub(r'^(\d+\.|[-*])\s+', '', s)); break
        para.append(s)
    t = clean(' '.join(para))
    m = re.match(r'(.+?[.!?])(\s|$)', t)
    out = m.group(1) if m else t
    rest = t[len(out):].strip()
    if (out.endswith(':') or len(out) < 40) and rest:
        m2 = re.match(r'(.+?[.!?])(\s|$)', rest)
        if m2: out = out.rstrip(':').rstrip('.') + ('. ' if not out.endswith(':') else ': ') + m2.group(1)
    out = out.rstrip(':')
    if not out.endswith(('.', '!', '?')): out += '.'
    return trunc(out.replace(': ' + '', ': ', 1), 170)
def words(t): return {w for w in re.findall(r'[a-z]{4,}', t.lower())}
def best_mistake(ms, text, used):
    tw = words(text); best = None; sc = 0
    for j, m in enumerate(ms):
        if j in used: continue
        v = len(words(m) & tw)
        if v > sc: best, sc = j, v
    if best is None:
        prose = clean(re.sub(r'```.*?```', ' ', text, flags=re.S))
        for sent in re.split(r'(?<=[.!?])\s+', prose):
            if re.search(r"\b(never|avoid|do not|don't|cannot|can't|must not|without|unless|fails?|lost|breaks?|only if|careful)\b", sent, re.I) and 30 < len(sent) < 220:
                return sent
        return 'Check the Common mistakes list below this diagram for what usually goes wrong here.'
    used.add(best); return ms[best]
def kind_for(label, i, n):
    l = label.lower()
    for rx, k in KINDS:
        if re.search(rx, l): return k
    return 'process'
def build(path):
    s = open(path, encoding='utf-8').read()
    if '```diagram' in s: return False
    fm = re.match(r'---\n(.*?)\n---\n', s, re.S)
    title = re.search(r'^title:\s*(.+)$', fm.group(1), re.M).group(1).strip().strip('"\'') if fm else 'Lesson'
    parts = re.split(r'(?m)^(?=## )', s)
    secs = []; mistakes = []; anchor = None
    for p in parts[1:]:
        h = re.match(r'## (.+)', p).group(1).strip()
        if re.match(r'common mistakes', h, re.I):
            mistakes = [clean(x) for x in re.findall(r'(?m)^[-*] (.+)$', p.split('```')[0])]
        if SKIP.match(h):
            continue
        secs.append((re.sub(r'^\d+\.\s*', '', h), p.split('\n', 1)[1] if '\n' in p else ''))
    if len(secs) < 3:
        for p in parts[1:]:
            h = re.match(r'## (.+)', p).group(1).strip()
            if re.match(r'(incident|predict)', h, re.I):
                secs.append((re.sub(r'^(incident|predict)[^:]*:?\s*', '', h) or h, p.split('\n', 1)[1] if '\n' in p else ''))
    if len(secs) < 3: return False
    # pick up to 6 sections evenly
    if len(secs) > 6:
        idx = sorted({round(i * (len(secs) - 1) / 5) for i in range(6)})
        secs = [secs[i] for i in idx]
    n = len(secs)
    nodes = []; used = set()
    for i, (h, body) in enumerate(secs):
        label = clean(h)
        if len(label) > 36: label = label[:36].rsplit(' ', 1)[0]
        nid = 'n%d' % (i + 1)
        desc = first_sentence(body) or ('How ' + label.lower() + ' fits into ' + title.lower() + '.')
        pit = best_mistake(mistakes, h + ' ' + body, used)
        pit = trunc(pit, 140)
        if not pit.endswith(('.', '!', '?', '...')): pit += '.'
        nodes.append((nid, label, i, i % 2, desc, pit, kind_for(label, i, n)))
    lines = ['title: How ' + trunc(title, 50) + ' fits together']
    for nid, label, c, r, d, p, k in nodes:
        lines.append('node: %s | %s | %d | %d | %s | %s | %s' % (nid, label, c, r, d, p, k))
    for i in range(n - 1): lines.append('edge: n%d | n%d' % (i + 1, i + 2))
    sec = ('## How the parts fit together\n\nThe lesson in one picture: each box is a section of this lesson, in the order you meet it. '
           'Select a box to see what it does and the mistake that usually goes with it.\n\n```diagram\n' + '\n'.join(lines) + '\n```\n\n')
    m = re.search(r'(?m)^## (Incident|Predict|Common mistakes)', s)
    if not m: return False
    s = s[:m.start()] + sec + s[m.start():]
    open(path, 'w', encoding='utf-8').write(s)
    return True
if __name__ == '__main__':
    n = tot = 0
    for f in sorted(glob.glob(os.path.join(ROOT, '*', '[0-9]*.md'))):
        tot += 1
        if build(f): n += 1
        elif '```diagram' not in open(f, encoding='utf-8').read(): print('SKIPPED', f)
    print('added', n, 'of', tot)
