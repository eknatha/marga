#!/usr/bin/env python3
"""Build printable PDF packs (one per module + all cheat sheets) with a watermark on every page.
Output: src/packs/*.pdf and src/packs/index.json (copied to dist/packs by build.js)."""
import re, os, json, glob, sys, html
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Preformatted, Table, TableStyle, KeepTogether, ListFlowable, ListItem
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
OUT = os.path.join(SRC, 'packs')
FD = '/usr/share/fonts/truetype/dejavu/'
for n, f in [('DV', 'DejaVuSans.ttf'), ('DV-B', 'DejaVuSans-Bold.ttf'), ('DV-I', 'DejaVuSans-Oblique.ttf'), ('DV-M', 'DejaVuSansMono.ttf')]:
    pdfmetrics.registerFont(TTFont(n, FD + f))
pdfmetrics.registerFontFamily('DV', normal='DV', bold='DV-B', italic='DV-I', boldItalic='DV-B')
WM = 'MARGA by EknathaLabs'
SITE = 'marga.eknathalabs.com'
TEAL = colors.HexColor('#0B2B2E'); ACC = colors.HexColor('#0E7C86'); GREY = colors.HexColor('#5B6770')
S = {
 'body': ParagraphStyle('body', fontName='DV', fontSize=9, leading=13.2, spaceAfter=5),
 'h1': ParagraphStyle('h1', fontName='DV-B', fontSize=18, leading=22, textColor=TEAL, spaceBefore=4, spaceAfter=4),
 'h2': ParagraphStyle('h2', fontName='DV-B', fontSize=12, leading=15, textColor=ACC, spaceBefore=9, spaceAfter=3, keepWithNext=1),
 'h3': ParagraphStyle('h3', fontName='DV-B', fontSize=10, leading=13, textColor=TEAL, spaceBefore=6, spaceAfter=2, keepWithNext=1),
 'meta': ParagraphStyle('meta', fontName='DV', fontSize=8, leading=11, textColor=GREY, spaceAfter=6),
 'code': ParagraphStyle('code', fontName='DV-M', fontSize=7.4, leading=9.6, backColor=colors.HexColor('#F1F4F6'), borderPadding=(4, 4, 4, 4), spaceBefore=3, spaceAfter=8, leftIndent=4, rightIndent=4),
 'cell': ParagraphStyle('cell', fontName='DV', fontSize=8, leading=10.5),
 'cellb': ParagraphStyle('cellb', fontName='DV-B', fontSize=8, leading=10.5),
 'quote': ParagraphStyle('quote', fontName='DV-I', fontSize=8.8, leading=12.6, leftIndent=8, textColor=colors.HexColor('#33424B'), spaceAfter=6),
 'cover': ParagraphStyle('cover', fontName='DV-B', fontSize=26, leading=31, textColor=TEAL, spaceAfter=8),
 'coversub': ParagraphStyle('coversub', fontName='DV', fontSize=11, leading=16, textColor=GREY, spaceAfter=10),
 'toc': ParagraphStyle('toc', fontName='DV', fontSize=9.5, leading=15),
}

def inline(t):
    codes = []
    def keep(m):
        codes.append('<font name="DV-M" size="8">' + html.escape(m.group(1), quote=False) + '</font>'); return '\x00%d\x00' % (len(codes) - 1)
    t = re.sub(r'`([^`]+)`', keep, t)
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<![\w*])\*([^*\n]+)\*(?![\w*])', r'<i>\1</i>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1', t)
    return re.sub('\x00(\\d+)\x00', lambda m: codes[int(m.group(1))], t)

def wrap_code(code, width=98):
    out = []
    for ln in code.rstrip('\n').split('\n'):
        ln = ln.expandtabs(4)
        while len(ln) > width:
            out.append(ln[:width] + ' \\'); ln = '    ' + ln[width:]
        out.append(ln)
    return '\n'.join(out)

def code_flow(code):
    return Preformatted(wrap_code(code), S['code'])

def diagram_flow(block):
    title = ''; nodes = []; edges = []
    for ln in block.strip().split('\n'):
        if ln.startswith('title:'): title = ln[6:].strip()
        elif ln.startswith('node:'):
            p = [x.strip() for x in ln[5:].split('|')]
            nodes.append(p)
        elif ln.startswith('edge:'):
            a, b = [x.strip() for x in ln[5:].split('|')][:2]; edges.append((a, b))
    lab = {n[0]: n[1] for n in nodes}
    rows = [[Paragraph('Part', S['cellb']), Paragraph('What it does', S['cellb']), Paragraph('What goes wrong', S['cellb'])]]
    for n in nodes:
        rows.append([Paragraph(inline(n[1]), S['cellb']), Paragraph(inline(n[4] if len(n) > 4 else ''), S['cell']), Paragraph(inline(n[5] if len(n) > 5 else ''), S['cell'])])
    t = Table(rows, colWidths=[34 * mm, 74 * mm, 66 * mm], repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DCEFF1')), ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#B8C4CA')), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
    flow = ' > '.join(lab.get(a, a) + ' to ' + lab.get(b, b) for a, b in edges[:8]) if edges else ''
    out = [Paragraph('Diagram: ' + inline(title), S['h3']), t]
    if edges:
        out.append(Spacer(1, 3)); out.append(Paragraph('Flow: ' + ' / '.join(lab.get(a, a) + ' to ' + lab.get(b, b) for a, b in edges), S['meta']))
    out.append(Spacer(1, 6))
    return out

def table_flow(lines):
    rows = []
    for ln in lines:
        if re.match(r'^\|[\s:|-]+\|?$', ln): continue
        cells = [c.strip() for c in ln.strip().strip('|').split('|')]
        rows.append(cells)
    if not rows: return []
    n = max(len(r) for r in rows); W = 174 * mm / n
    data = [[Paragraph(inline(c), S['cellb'] if i == 0 else S['cell']) for c in r + [''] * (n - len(r))] for i, r in enumerate(rows)]
    t = Table(data, colWidths=[W] * n, repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#DCEFF1')), ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#B8C4CA')), ('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    return [t, Spacer(1, 7)]

def quiz_flow(block):
    out = [Paragraph('Check yourself', S['h3'])]
    for q in re.split(r'\n\s*\n', block.strip()):
        qm = re.search(r'^Q:\s*(.+)$', q, re.M)
        if not qm: continue
        ans = re.search(r'^\+\s*(.+?)(?:\s*::.*)?$', q, re.M)
        out.append(Paragraph('<b>' + inline(qm.group(1)) + '</b>', S['body']))
        if ans: out.append(Paragraph('Answer: ' + inline(ans.group(1)), S['meta']))
    return out

def md_flow(md):
    fl = []; lines = md.split('\n'); i = 0; para = []
    def flush():
        nonlocal para
        if para: fl.append(Paragraph(inline(' '.join(para)), S['body'])); para = []
    while i < len(lines):
        ln = lines[i]
        m = re.match(r'^```(\w*)\s*$', ln)
        if m:
            flush(); lang = m.group(1); j = i + 1; buf = []
            while j < len(lines) and not lines[j].startswith('```'): buf.append(lines[j]); j += 1
            block = '\n'.join(buf); i = j + 1
            if lang == 'diagram': fl.extend(diagram_flow(block))
            elif lang == 'quiz': fl.extend(quiz_flow(block))
            elif lang in ('cards', 'predict', 'wrongpath'): continue
            else: fl.append(code_flow(block))
            continue
        if ln.startswith('|'):
            flush(); j = i
            while j < len(lines) and lines[j].startswith('|'): j += 1
            fl.extend(table_flow(lines[i:j])); i = j; continue
        if ln.startswith('## '): flush(); fl.append(Paragraph(inline(ln[3:]), S['h2'])); i += 1; continue
        if ln.startswith('### '): flush(); fl.append(Paragraph(inline(ln[4:]), S['h3'])); i += 1; continue
        if ln.startswith('>'):
            flush(); buf = []
            while i < len(lines) and lines[i].startswith('>'): buf.append(lines[i].lstrip('> ').strip()); i += 1
            fl.append(Paragraph(inline(' '.join(buf)), S['quote'])); continue
        if re.match(r'^(\d+\.|[-*])\s', ln):
            flush(); items = []; ordered = bool(re.match(r'^\d+\.', ln))
            while i < len(lines) and (re.match(r'^(\d+\.|[-*])\s', lines[i]) or (lines[i].startswith('  ') and items)):
                if re.match(r'^(\d+\.|[-*])\s', lines[i]): items.append(re.sub(r'^(\d+\.|[-*])\s+', '', lines[i]))
                else: items[-1] += ' ' + lines[i].strip()
                i += 1
            fl.append(ListFlowable([ListItem(Paragraph(inline(t), S['body']), leftIndent=14) for t in items], bulletType='1' if ordered else 'bullet', bulletFontName='DV', bulletFontSize=8, leftIndent=14, start=1 if ordered else '•'))
            fl.append(Spacer(1, 3)); continue
        if not ln.strip(): flush(); i += 1; continue
        para.append(ln.strip()); i += 1
    flush(); return fl

def front(path):
    t = open(path, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---\n', t, re.S)
    fm = {}
    for ln in m.group(1).split('\n'):
        k, _, v = ln.partition(':'); fm[k.strip()] = v.strip().strip('"\'')
    return fm, t[m.end():]

class Doc(BaseDocTemplate):
    def __init__(self, fn, title):
        super().__init__(fn, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=20 * mm, bottomMargin=20 * mm, title=title, author='MARGA by EknathaLabs', subject='Printable study pack, free and offline', creator='MARGA by EknathaLabs')
        self.pt = title
        fr = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id='f')
        self.addPageTemplates([PageTemplate(id='p', frames=[fr], onPage=self.deco)])
    def deco(self, c, d):
        c.saveState()
        # diagonal watermark on every page
        c.setFillColor(colors.Color(0.05, 0.3, 0.33, alpha=0.09)); c.setFont('DV-B', 40)
        c.translate(A4[0] / 2, A4[1] / 2); c.rotate(42)
        c.drawCentredString(0, 14, WM); c.setFont('DV-B', 22); c.drawCentredString(0, -18, SITE)
        c.restoreState(); c.saveState()
        c.setStrokeColor(colors.HexColor('#B8C4CA')); c.setLineWidth(0.4); c.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
        c.setFont('DV', 7.5); c.setFillColor(GREY)
        c.drawString(18 * mm, 10.5 * mm, WM + '  |  ' + SITE + '  |  free and offline')
        c.drawRightString(A4[0] - 18 * mm, 10.5 * mm, 'Page %d' % d.page)
        c.drawString(18 * mm, A4[1] - 12 * mm, self.pt)
        c.restoreState()

def cover(title, sub, toc=None):
    f = [Spacer(1, 50 * mm), Paragraph(inline(title), S['cover']), Paragraph(inline(sub), S['coversub']),
         Paragraph('A MARGA printable pack. Free, offline, no sign-up. Learn online at ' + SITE + '.', S['meta'])]
    if toc:
        f += [Spacer(1, 10 * mm), Paragraph('Contents', S['h2'])] + [Paragraph(inline(t), S['toc']) for t in toc]
    return f + [PageBreak()]

def module_pack(mod, title, summary):
    files = sorted(glob.glob(os.path.join(SRC, 'content', mod, '[0-9]*.md')))
    items = []
    for f in files: fm, body = front(f); items.append((fm, body))
    toc = ['%d. %s (%s min)' % (n + 1, fm['title'], fm.get('minutes', '?')) for n, (fm, _) in enumerate(items)]
    sheet = os.path.join(SRC, 'cheatsheets', mod + '.md')
    if os.path.exists(sheet): toc.append('Cheat sheet')
    fn = os.path.join(OUT, mod + '.pdf'); d = Doc(fn, 'MARGA: ' + title)
    fl = cover(title, summary, toc)
    for n, (fm, body) in enumerate(items):
        fl.append(Paragraph('Lesson %d. %s' % (n + 1, inline(fm['title'])), S['h1']))
        fl.append(Paragraph('%s minutes. %s' % (fm.get('minutes', '?'), inline(fm.get('summary', ''))), S['meta']))
        fl.extend(md_flow(body)); fl.append(PageBreak())
    if os.path.exists(sheet):
        fm, body = front(sheet)
        fl.append(Paragraph('Cheat sheet: ' + inline(fm['title']), S['h1'])); fl.append(Paragraph(inline(fm.get('summary', '')), S['meta']))
        fl.extend(md_flow(body))
    d.build(fl); return fn, len(items)

def sheets_pack(mods):
    fn = os.path.join(OUT, 'cheat-sheets.pdf'); d = Doc(fn, 'MARGA: all cheat sheets')
    fl = cover('All cheat sheets', 'One page-sized reference for each tool, from Linux to Vault.', None); n = 0
    for mid, _ in mods:
        p = os.path.join(SRC, 'cheatsheets', mid + '.md')
        if not os.path.exists(p): continue
        fm, body = front(p); n += 1
        fl.append(Paragraph(inline(fm['title']), S['h1'])); fl.append(Paragraph(inline(fm.get('summary', '')), S['meta']))
        fl.extend(md_flow(body)); fl.append(PageBreak())
    d.build(fl); return fn, n

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    mods = json.load(open(os.path.join(SRC, 'content', 'modules.json')))
    only = sys.argv[1:]
    idx = []
    for m in mods:
        if only and m['id'] not in only: continue
        fn, n = module_pack(m['id'], m['title'], m['summary'])
        idx.append({'id': m['id'], 'title': m['title'], 'summary': m['summary'], 'lessons': n, 'file': os.path.basename(fn), 'bytes': os.path.getsize(fn)})
        print(m['id'], n, os.path.getsize(fn) // 1024, 'KB')
    if not only:
        fn, n = sheets_pack([(m['id'], m['title']) for m in mods])
        json.dump({'packs': idx, 'sheets': {'file': 'cheat-sheets.pdf', 'count': n, 'bytes': os.path.getsize(fn)}}, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)
        print('sheets', n)
