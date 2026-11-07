#!/usr/bin/env python3
"""Generate lessons from compact sources: python3 tools/addlessons.py <module> /home/claude/new46/<module>.txt"""
import sys, os, re, json, glob
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
C = os.path.join(ROOT, 'src/content')
mod, srcf = sys.argv[1], sys.argv[2]
text = open(srcf, encoding='utf8').read()
blocks = [b for b in re.split(r'^=== ', text, flags=re.M) if b.strip()]
refs = json.load(open(C + '/refs.json')); lev = json.load(open(C + '/levels.json'))
sp = C + '/stories/' + mod + '.json'
st = json.load(open(sp)) if os.path.exists(sp) else {}
d = C + '/' + mod; os.makedirs(d, exist_ok=True)
existing = sorted(glob.glob(d + '/*.md'))
nxt = len(existing) + 1
have = {re.sub(r'^\d+-|\.md$', '', os.path.basename(f)) for f in existing}
en = []
for b in blocks:
    lines = b.split('\n'); head = lines[0].split('|'); slug, title, mins = [x.strip() for x in head]
    if slug in have: continue
    f = {'ref': [], 'learn': [], 'q': [], 'c': [], 'con': [], 'm': []}; body = []; mode = None
    for ln in lines[1:]:
        if mode == 'body':
            if re.match(r'^(inc|con|m|q|c|endbody):', ln): mode = None
            else: body.append(ln); continue
        mm = re.match(r'^(sum|s|i|r|x|ref|intro|learn|inc|con|m|q|c|body):\s?(.*)$', ln)
        if not mm:
            if ln.strip() and 'inc' in f: f['story'] = (f.get('story','') + ' ' + ln.strip()).strip()
            continue
        k, v = mm.groups()
        if k == 'body': mode = 'body'; continue
        if k in ('ref', 'learn', 'q', 'c', 'con', 'm'): f[k].append(v)
        else: f[k] = v
    out = ['---', f'title: {title}', f'minutes: {mins}', f'summary: {f["sum"]}', '---', '', f['intro'], '', '## What you will learn', '']
    for l in f['learn']: out.append('- ' + l)
    out += [''] + body + ['']
    it, ih = [x.strip() for x in f['inc'].split('|')[:2]]; itxt = f['story']
    out += [f'## Incident: {it}', '', f'> **Incident:** {ih}', '', '```console'] + f['con'] + ['```', '', itxt, '', '## Common mistakes', '']
    for m in f['m']: out.append('- ' + m)
    out += ['', '```quiz']
    for q in f['q']:
        p = [x.strip() for x in q.split('|')]
        out += [f'Q: {p[0]}', f'+ {p[1]}'] + [f'- {w} :: No.' for w in p[2:5]] + [f'> {p[5] if len(p[5]) >= 20 else p[5].rstrip(".") + ". The lesson section above explains why."}', '']
    out[-1] = '```'; out += ['', '```cards'] + [c for c in f['c']] + ['```', '']
    fn = f'{d}/{nxt:02d}-{slug}.md'; nxt += 1
    open(fn, 'w', encoding='utf8').write('\n'.join(out))
    key = f'{mod}/{slug}'
    refs['lessons'][key] = [[a.split('|')[0].strip(), a.split('|')[1].strip()] for a in f['ref']]
    lev[key] = {'s': f['s'], 'i': f['i']}; st[slug] = {'r': f['r'], 'x': f['x']}
    en.append(f'{key}|{f["sum"]}')
# renumber: original lessons first, then new lessons in source order
order = [re.split(r'\s*\|', b.split('\n')[0])[0].strip() for b in blocks]
cur = {re.sub(r'^\d+-|\.md$', '', os.path.basename(f)): f for f in sorted(glob.glob(d + '/*.md'))}
seq = [k for k in cur if k not in order] + [k for k in order if k in cur]
for i, k in enumerate(seq, 1):
    os.rename(cur[k], f'{d}/tmp-{k}.md')
for i, k in enumerate(seq, 1):
    os.rename(f'{d}/tmp-{k}.md', f'{d}/{i:02d}-{k}.md')
json.dump(refs, open(C + '/refs.json', 'w'), ensure_ascii=False, indent=1)
json.dump(lev, open(C + '/levels.json', 'w'), ensure_ascii=False, indent=1)
json.dump(st, open(sp, 'w'), ensure_ascii=False, indent=1)
open(os.environ.get('ENFILE','/home/claude/new46/en.txt'), 'a', encoding='utf8').write('\n'.join(en) + '\n')
print(mod, 'added', len(en), 'total', nxt - 1)
