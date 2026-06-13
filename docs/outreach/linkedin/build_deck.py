# -*- coding: utf-8 -*-
"""Build the Channelad 'Coste por impacto' LinkedIn carousel (6 pages, 1080x1350)."""
import base64, os, subprocess, tempfile, sys
import fitz  # PyMuPDF

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = r"C:\Users\win\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\3b43743c-374c-450c-b2ca-0743564baffe\ce8e7f2b-a2d9-415b-8c57-8b411a1f31bc\skills\canvas-design\canvas-fonts"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

def font_face(family, fname, weight):
    with open(os.path.join(FONTS, fname), "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return ("@font-face{font-family:'%s';font-style:normal;font-weight:%s;"
            "src:url(data:font/ttf;base64,%s) format('truetype');}" % (family, weight, b64))

FACES = "".join([
    font_face("Outfit", "Outfit-Regular.ttf", 400),
    font_face("Outfit", "Outfit-Bold.ttf", 700),
    font_face("Geist", "GeistMono-Regular.ttf", 400),
    font_face("Geist", "GeistMono-Bold.ttf", 700),
])

# palette
INK="#070A0E"; BONE="#ECE7DC"; MUTE="#6F7B88"; FAINT="#9AA4AE"; ACCENT="#34E29B"

def field(cols, rows, cell, r, highlight=None, accent=ACCENT, base=BONE, base_op=0.28, hr=None):
    w=cols*cell; h=rows*cell; out=[]
    for i in range(cols*rows):
        cx=(i%cols)*cell+cell/2; cy=(i//cols)*cell+cell/2
        if highlight is not None and i==highlight:
            rr=hr if hr else r*1.75
            out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>'%(cx,cy,rr,accent))
        else:
            out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s" fill-opacity="%s"/>'%(cx,cy,r,base,base_op))
    return '<svg width="%d" height="%d" viewBox="0 0 %d %d" style="display:block">%s</svg>'%(w,h,w,h,"".join(out))

def chrome(left, right, idxnum):
    top = ('<div class="top"><span>%s</span><span>%s</span></div><div class="hr"></div>'%(left,right))
    foot= ('<div class="hr"></div><div class="foot"><span>channelad.io</span>'
           '<span>RED DE CANALES · WHATSAPP</span><span>%s / 06</span></div>'%idxnum)
    return top, foot

# ---------- PAGE 1 : COVER ----------
t,f = chrome("CHANNELAD","FIG. 01 — COSTE POR IMPACTO","01")
fld = field(30,19,29,4.2, highlight=9*30+15, hr=8.5)
p1 = t + '''
<div class="c1">
  <div class="ovl acc">EL COSTE QUE IMPORTA NO ES EL QUE MIRAS</div>
  <div class="h1">570.000<span class="thin"> personas.</span></div>
  <div class="h1b">Una sola publicación.</div>
  <div class="fieldwrap">''' + fld + '''</div>
  <div class="cap"><span class="dot"></span>1 punto = 1.000 personas alcanzadas</div>
  <div class="line"><span class="big acc">3&nbsp;€</span><span class="lbl">por cada 1.000 &nbsp;·&nbsp; CPM 3&nbsp;€</span></div>
</div>''' + f

# ---------- PAGE 2 : LA FACTURA ----------
t,f = chrome("CHANNELAD","FIG. 02 — LA CIFRA BRUTA","02")
fld2 = field(38,15,21,3.0, base_op=0.22)
p2 = t + '''
<div class="c2">
  <div class="ovl">LO QUE VE EL ANUNCIANTE</div>
  <div class="hero">1.710&nbsp;€</div>
  <div class="sub">coste de una publicación &nbsp;·&nbsp; canal grande</div>
  <div class="body2">La cifra que asusta. Y la que, por sí sola, no dice nada:
  no sabes si es cara hasta que sabes a cuánta gente llega.</div>
  <div class="fieldwrap2">''' + fld2 + '''<div class="cap2">= 570.000 personas</div></div>
</div>''' + f

# ---------- PAGE 3 : LA DIVISION ----------
t,f = chrome("CHANNELAD","FIG. 03 — LA DIVISIÓN","03")
p3 = t + '''
<div class="c3">
  <div class="ovl acc">DIVIDE</div>
  <div class="frac">
     <div class="fnum">1.710&nbsp;€</div>
     <div class="fbar"></div>
     <div class="fden">570.000 personas</div>
  </div>
  <div class="eq">=</div>
  <div class="result acc">0,003<span class="eur">€</span><span class="rlbl"> / persona</span></div>
  <div class="chain">= 3&nbsp;€ por cada 1.000 &nbsp;&rarr;&nbsp; <b>CPM 3&nbsp;€</b></div>
  <div class="body3">El CPM es el precio real: lo que cuesta llegar a una persona.
  Todo lo demás es tamaño.</div>
</div>''' + f

# ---------- PAGE 4 : CONTEXTO ----------
t,f = chrome("CHANNELAD","FIG. 04 — CONTEXTO","04")
p4 = t + '''
<div class="c4">
  <div class="ovl">¿3 € ES MUCHO?</div>
  <div class="h4">Depende de con qué<br>lo compares.</div>
  <div class="scale">
     <div class="srow up">
        <div class="sbar up"></div>
        <div class="sval">por encima</div>
        <div class="sname">Social de pago · influencers</div>
     </div>
     <div class="srow base">
        <div class="sbar base"></div>
        <div class="sval acc">CPM 3&nbsp;€</div>
        <div class="sname">Canales verificados · Channelad</div>
     </div>
  </div>
  <div class="axis">longitud de barra = coste por cada impacto</div>
  <div class="peajes">
     <div class="pj"><span class="acc">—</span> En social, el algoritmo decide quién lo ve.</div>
     <div class="pj"><span class="acc">—</span> Con influencers, nadie garantiza que se publique.</div>
  </div>
  <div class="caveat">Comparativa direccional: el CPM de cada medio varía por formato y objetivo.</div>
</div>''' + f

# ---------- PAGE 5 : ESCALA ----------
t,f = chrome("CHANNELAD","FIG. 05 — LO QUE ESCALA","05")
def trow(cols,reach,cost):
    return ('<div class="trow"><div class="tfield">%s</div>'
            '<div class="treach">%s<span class="tu"> personas</span></div>'
            '<div class="tcost">%s</div></div>'%(field(cols,5,8,1.7,base_op=0.32),reach,cost))
rows = trow(16,"190.000","570 €") + trow(30,"570.000","1.710 €") + trow(46,"1.140.000","3.420 €")
p5 = t + '''
<div class="c5">
  <div class="ovl">LO ÚNICO QUE CAMBIA ES EL ALCANCE</div>
  <div class="thead"><span>alcance</span><span>coste · a 3 € CPM</span></div>
  ''' + rows + '''
  <div class="h5">Eliges a cuánta gente quieres llegar.<br><span class="acc">El precio por persona no se mueve.</span></div>
</div>''' + f

# ---------- PAGE 6 : MOAT + CTA ----------
t,f = chrome("CHANNELAD","FIG. 06 — LA RED DE SEGURIDAD","06")
p6 = t + '''
<div class="c6">
  <div class="ovl acc">IMPACTO CON RED DE SEGURIDAD</div>
  <div class="h6">Compra impacto,<br>no promesas.</div>
  <div class="pillars">
     <div class="pl"><span class="pn">01</span><span class="pt">Canales verificados</span></div>
     <div class="pl"><span class="pn">02</span><span class="pt">Métricas auditadas</span></div>
     <div class="pl"><span class="pn">03</span><span class="pt">Pagas solo si se publica</span></div>
  </div>
  <div class="cta">
     <div class="ctabtn">Ver canales y tarifas&nbsp;&rarr;</div>
     <div class="ctaurl acc">channelad.io</div>
  </div>
</div>''' + f

CSS = '''
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
@page{size:1080px 1350px;margin:0;}
html,body{background:%(INK)s;}
.page{width:1080px;height:1350px;position:relative;overflow:hidden;padding:78px 80px 70px 80px;
  display:flex;flex-direction:column;color:%(BONE)s;
  background:radial-gradient(125%% 78%% at 50%% 16%%, #0D131A 0%%, %(INK)s 62%%);
  page-break-after:always;font-family:'Outfit',sans-serif;}
.page:last-child{page-break-after:auto;}
.top,.foot{display:flex;justify-content:space-between;align-items:center;
  font-family:'Geist',monospace;font-size:13px;letter-spacing:.17em;text-transform:uppercase;color:%(MUTE)s;}
.foot{font-size:12px;letter-spacing:.15em;}
.hr{height:1px;background:rgba(236,231,220,.13);margin:20px 0;}
.foot+.hr{margin:0;}
.ovl{font-family:'Geist',monospace;font-size:14.5px;letter-spacing:.26em;text-transform:uppercase;color:%(FAINT)s;}
.acc{color:%(ACCENT)s;}
b{font-weight:700;}

/* ---- page 1 ---- */
.c1{flex:1;display:flex;flex-direction:column;}
.h1{font-weight:700;font-size:96px;line-height:.96;letter-spacing:-.02em;margin-top:26px;
  font-family:'Geist',monospace;font-feature-settings:"tnum";}
.h1 .thin{font-family:'Outfit';font-weight:400;color:%(BONE)s;letter-spacing:-.01em;}
.h1b{font-family:'Outfit';font-weight:400;font-size:40px;color:%(MUTE)s;margin-top:6px;letter-spacing:-.01em;}
.fieldwrap{flex:1;display:flex;align-items:center;justify-content:center;}
.cap{font-family:'Geist',monospace;font-size:14px;letter-spacing:.13em;color:%(FAINT)s;
  display:flex;align-items:center;gap:11px;justify-content:center;margin-bottom:30px;}
.cap .dot{width:9px;height:9px;border-radius:50%%;background:%(ACCENT)s;display:inline-block;}
.line{display:flex;align-items:baseline;gap:20px;}
.line .big{font-family:'Geist',monospace;font-weight:700;font-size:74px;letter-spacing:-.02em;}
.line .lbl{font-family:'Outfit';font-size:26px;color:%(FAINT)s;}

/* ---- page 2 ---- */
.c2{flex:1;display:flex;flex-direction:column;}
.hero{font-family:'Geist',monospace;font-weight:700;font-size:208px;line-height:.86;letter-spacing:-.03em;
  margin-top:34px;font-feature-settings:"tnum";}
.sub{font-family:'Geist',monospace;font-size:16px;letter-spacing:.12em;text-transform:uppercase;color:%(MUTE)s;margin-top:14px;}
.body2{font-family:'Outfit';font-weight:400;font-size:33px;line-height:1.34;color:%(BONE)s;
  max-width:780px;margin-top:40px;letter-spacing:-.005em;}
.fieldwrap2{display:flex;flex-direction:column;align-items:flex-start;margin-top:74px;}
.cap2{font-family:'Geist',monospace;font-size:14px;letter-spacing:.16em;color:%(FAINT)s;margin-top:22px;text-transform:uppercase;}

/* ---- page 3 ---- */
.c3{flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding-top:20px;}
.frac{display:inline-flex;flex-direction:column;align-items:center;align-self:flex-start;margin-top:8px;}
.fnum{font-family:'Geist',monospace;font-weight:700;font-size:64px;letter-spacing:-.02em;}
.fbar{height:3px;background:rgba(236,231,220,.55);width:100%%;margin:14px 0;}
.fden{font-family:'Geist',monospace;font-weight:400;font-size:40px;color:%(FAINT)s;letter-spacing:-.01em;}
.eq{font-family:'Geist',monospace;font-size:46px;color:%(MUTE)s;margin:30px 0 18px;}
.result{font-family:'Geist',monospace;font-weight:700;font-size:150px;line-height:.9;letter-spacing:-.03em;}
.result .eur{margin-left:14px;}
.result .rlbl{font-family:'Outfit';font-weight:400;font-size:46px;color:%(FAINT)s;letter-spacing:-.01em;}
.chain{font-family:'Outfit';font-size:38px;color:%(BONE)s;margin-top:30px;letter-spacing:-.01em;}
.chain b{color:%(ACCENT)s;}
.body3{font-family:'Outfit';font-size:27px;line-height:1.4;color:%(MUTE)s;margin-top:auto;max-width:720px;}

/* ---- page 4 ---- */
.c4{flex:1;display:flex;flex-direction:column;}
.h4{font-family:'Outfit';font-weight:700;font-size:62px;line-height:1.02;letter-spacing:-.02em;margin-top:20px;}
.scale{margin-top:54px;display:flex;flex-direction:column;gap:30px;}
.srow{display:flex;align-items:center;gap:26px;}
.sbar{height:54px;border-radius:5px;}
.sbar.up{width:440px;background:repeating-linear-gradient(135deg,#3B4651,#3B4651 9px,#283038 9px,#283038 18px);}
.sbar.base{width:150px;background:%(ACCENT)s;}
.sval{font-family:'Geist',monospace;font-weight:700;font-size:34px;letter-spacing:-.01em;min-width:150px;white-space:nowrap;}
.sval.up{color:%(MUTE)s;}
.srow.up .sval{font-family:'Outfit';font-weight:400;font-size:26px;color:%(MUTE)s;min-width:0;}
.sname{font-family:'Outfit';font-size:23px;color:%(FAINT)s;white-space:nowrap;}
.axis{margin-top:26px;font-family:'Geist',monospace;font-size:13px;letter-spacing:.13em;text-transform:uppercase;color:%(MUTE)s;}
.peajes{margin-top:64px;display:flex;flex-direction:column;gap:20px;}
.pj{font-family:'Outfit';font-size:30px;color:%(BONE)s;letter-spacing:-.005em;}
.pj .acc{margin-right:14px;font-family:'Geist',monospace;}
.caveat{margin-top:auto;font-family:'Geist',monospace;font-size:13.5px;letter-spacing:.06em;color:%(MUTE)s;line-height:1.5;}

/* ---- page 5 ---- */
.c5{flex:1;display:flex;flex-direction:column;}
.thead{display:flex;justify-content:space-between;font-family:'Geist',monospace;font-size:13px;
  letter-spacing:.16em;text-transform:uppercase;color:%(MUTE)s;margin-top:40px;
  border-bottom:1px solid rgba(236,231,220,.13);padding-bottom:14px;}
.trow{display:flex;align-items:center;gap:34px;padding:26px 0;border-bottom:1px solid rgba(236,231,220,.08);}
.tfield{flex:0 0 auto;}
.treach{flex:1;font-family:'Geist',monospace;font-weight:700;font-size:36px;letter-spacing:-.02em;}
.treach .tu{font-family:'Outfit';font-weight:400;font-size:20px;color:%(MUTE)s;}
.tcost{font-family:'Geist',monospace;font-weight:700;font-size:40px;color:%(ACCENT)s;letter-spacing:-.02em;min-width:150px;text-align:right;}
.h5{font-family:'Outfit';font-weight:700;font-size:46px;line-height:1.12;letter-spacing:-.02em;margin-top:auto;}

/* ---- page 6 ---- */
.c6{flex:1;display:flex;flex-direction:column;}
.h6{font-family:'Outfit';font-weight:700;font-size:84px;line-height:1.0;letter-spacing:-.025em;margin-top:26px;}
.pillars{margin-top:64px;display:flex;flex-direction:column;}
.pl{display:flex;align-items:center;gap:30px;padding:30px 0;border-top:1px solid rgba(236,231,220,.14);}
.pl:last-child{border-bottom:1px solid rgba(236,231,220,.14);}
.pl .pn{font-family:'Geist',monospace;font-size:18px;color:%(ACCENT)s;letter-spacing:.1em;}
.pl .pt{font-family:'Outfit';font-weight:400;font-size:40px;letter-spacing:-.01em;}
.cta{margin-top:auto;display:flex;align-items:baseline;justify-content:space-between;}
.ctabtn{font-family:'Outfit';font-weight:700;font-size:34px;letter-spacing:-.01em;}
.ctaurl{font-family:'Geist',monospace;font-weight:700;font-size:34px;letter-spacing:-.01em;}
''' % dict(INK=INK,BONE=BONE,MUTE=MUTE,FAINT=FAINT,ACCENT=ACCENT)

HTML = ("<!doctype html><html><head><meta charset='utf-8'><style>"+FACES+CSS+"</style></head><body>"
        + "".join('<div class="page">%s</div>'%p for p in [p1,p2,p3,p4,p5,p6])
        + "</body></html>")

html_path = os.path.join(HERE, "deck.html")
with open(html_path,"w",encoding="utf-8") as fh: fh.write(HTML)

pdf_path = os.path.join(HERE, "channelad-coste-por-impacto.pdf")
udd = tempfile.mkdtemp(prefix="edgepdf_")
cmd = [EDGE,"--headless=new","--disable-gpu","--no-sandbox","--user-data-dir="+udd,
       "--print-to-pdf-no-header","--print-to-pdf="+pdf_path,"file:///"+html_path.replace("\\","/")]
r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
print("edge rc", r.returncode)
if not os.path.exists(pdf_path):
    print("STDERR", r.stderr[-1500:]); sys.exit(1)

doc = fitz.open(pdf_path)
print("pages", doc.page_count, "size", doc[0].rect)
os.makedirs(os.path.join(HERE,"preview"), exist_ok=True)
for i,pg in enumerate(doc):
    pix = pg.get_pixmap(matrix=fitz.Matrix(0.52,0.52))
    pix.save(os.path.join(HERE,"preview","p%d.png"%(i+1)))
print("done", pdf_path)
