import json,sys,os,re
N='/home/claude/new44'; I='src/i18n'
keys=[l.split('|',1)[0] for l in open(N+'/en.txt',encoding='utf8').read().split('\n') if l.strip()]
bad=0
for code in 'te hi ta kn ml bn es de fr pt mr id gu ru'.split():
    lines=[l for l in open(f'{N}/tr-{code}.txt',encoding='utf8').read().split('\n') if l.strip()]
    if len(lines)!=len(keys): print('COUNT',code,len(lines),len(keys)); bad+=1; continue
    tr=dict(zip(keys,lines))
    if code in('te','hi'):
        p=I+'/lessons.json'; d=json.load(open(p,encoding='utf8'))
        for k,v in tr.items(): d.setdefault(k,{})[code]=v
        json.dump(d,open(p,'w',encoding='utf8'),ensure_ascii=False,indent=1)
    else:
        p=f'{I}/lang-{code}.json'; d=json.load(open(p,encoding='utf8'))
        d['lessons'].update(tr)
        json.dump(d,open(p,'w',encoding='utf8'),ensure_ascii=False,indent=1)
print('bad',bad)
