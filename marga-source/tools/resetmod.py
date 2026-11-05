#!/usr/bin/env python3
"""python3 tools/resetmod.py <module> <slug> ... : remove generated lessons by slug so they can be regenerated"""
import sys,os,glob,re,json
C=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','src/content'); mod=sys.argv[1]
refs=json.load(open(C+'/refs.json'));lev=json.load(open(C+'/levels.json'));sp=C+'/stories/'+mod+'.json';st=json.load(open(sp))
for f in glob.glob(f'{C}/{mod}/*.md'):
    sl=re.sub(r'^\d+-|\.md$','',os.path.basename(f))
    if sl in sys.argv[2:]:
        os.remove(f);refs['lessons'].pop(f'{mod}/{sl}',None);lev.pop(f'{mod}/{sl}',None);st.pop(sl,None)
json.dump(refs,open(C+'/refs.json','w'),ensure_ascii=False,indent=1);json.dump(lev,open(C+'/levels.json','w'),ensure_ascii=False,indent=1);json.dump(st,open(sp,'w'),ensure_ascii=False,indent=1)
