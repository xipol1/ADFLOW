# -*- coding: utf-8 -*-
"""Build the Channelad 'El algoritmo no decide' LinkedIn carousel (6 pages, 1080x1350)."""
import base64, os, subprocess, tempfile, sys, random
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
INK="#070A0E"; BONE="#ECE7DC"; MUTE="#6F7B88"; FAINT="#9AA4AE"; ACCENT="#34E29B"; DIM="#2F3845"

def field(cols, rows, cell, r, lit="none", accent=ACCENT, dim=DIM, dim_r=None, seed=7):
    """lit: 'none' (all dim) | 'all' (all accent) | float fraction lit (scattered, deterministic)."""
    N=cols*rows; w=cols*cell; h=rows*cell; dim_r = dim_r if dim_r else r*0.86
    if lit=="all": litset=set(range(N))
    elif lit=="none": litset=set()
    else:
        k=max(1,round(float(lit)*N)); litset=set(random.Random(seed).sample(range(N),k))
    out=[]
    for i in range(N):
        cx=(i%cols)*cell+cell/2; cy=(i//cols)*cell+cell/2
        if i in litset:
            out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>'%(cx,cy,r,accent))
        else:
            out.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="%s"/>'%(cx,cy,dim_r,dim))
    return '<svg width="%d" height="%d" viewBox="0 0 %d %d" style="display:block">%s</svg>'%(w,h,w,h,"".join(out))

def chrome(left, right, idxnum):
    top = ('<div class="top"><span>%s</span><span>%s</span></div><div class="hr"></div>'%(left,right))
    foot= ('<div class="hr"></div><div class="foot"><span>channelad.io</span>'
           '<span>RED DE CANALES · WHATSAPP</span><span>%s / 06</span></div>'%idxnum)
    return top, foot

# ---------- PAGE 1 : COVER ----------
t,f = chrome("CHANNELAD","FIG. 01 — EL ALGORITMO","01")
p1 = t + '''
<div class="c1b">
  <div class="ovl acc">EL IMPUESTO INVISIBLE DE TU PUBLICIDAD</div>
  <div class="h1">Pagas por 570.000.</div>
  <div class="h1b">Llegan <span class="num acc">40.000</span>.</div>
  <div class="fieldwrap">''' + field(30,17,29,4.4, lit=0.07, seed=11) + '''</div>
  <div class="line2">El resto se lo queda <span class="acc">el algoritmo</span>.</div>
</div>''' + f

# ---------- PAGE 2 : CÓMO FUNCIONA ----------
t,f = chrome("CHANNELAD","FIG. 02 — LA MECÁNICA","02")
p2 = t + '''
<div class="c2b">
  <div class="ovl">CÓMO FUNCIONA CASI TODA LA PUBLICIDAD DIGITAL</div>
  <div class="bigstmt">Compras alcance.<br>El algoritmo decide<br>cuánto se entrega.</div>
  <div class="body">Subes el contenido y el feed elige a qué fracción se lo enseña.
  Pagas por el número grande y recibes el pequeño.</div>
  <div class="step">
     <div class="sb"><div class="sa">570.000</div><div class="sl">comprados</div></div>
     <div class="arr">&rarr;</div>
     <div class="sb"><div class="sa acc">40.000</div><div class="sl">entregados</div></div>
  </div>
</div>''' + f

# ---------- PAGE 3 : EL EJEMPLO ----------
t,f = chrome("CHANNELAD","FIG. 03 — UN EJEMPLO","03")
p3 = t + '''
<div class="c3b">
  <div class="ovl">UN EJEMPLO</div>
  <div class="ex">Un perfil con 570.000 seguidores<br>publica tu anuncio.</div>
  <div class="exbig acc">40.000<span class="exu"> lo ven</span></div>
  <div class="expct">El 7&nbsp;%. El resto, invisible.</div>
  <div class="body3b">No porque el contenido sea malo — porque el algoritmo
  prioriza otra cosa en ese momento.</div>
  <div class="caveat">Alcance orgánico típico de redes e influencers; varía por plataforma, formato y momento.</div>
</div>''' + f

# ---------- PAGE 4 : EL CANAL ----------
t,f = chrome("CHANNELAD","FIG. 04 — SIN ALGORITMO","04")
p4 = t + '''
<div class="c4b">
  <div class="ovl acc">EN UN CANAL NO HAY ALGORITMO</div>
  <div class="bigstmt">Publicas una vez.<br>Le llega a cada<br>suscriptor.</div>
  <div class="fieldwrap4">''' + field(30,13,29,4.4, lit="all") + '''</div>
  <div class="body">Sin feed. Sin ranking. Sin pujar por visibilidad.
  Llega directo a quien eligió suscribirse.</div>
</div>''' + f

# ---------- PAGE 5 : EL CONTRASTE ----------
t,f = chrome("CHANNELAD","FIG. 05 — EL CONTRASTE","05")
p5 = t + '''
<div class="c5b">
  <div class="ovl">MISMO NÚMERO COMPRADO · DISTINTO NÚMERO ENTREGADO</div>
  <div class="twofield">
     <div class="col">
        <div class="collbl">Redes · influencers</div>
        ''' + field(19,26,18,2.7, lit=0.07, seed=11) + '''
        <div class="colcount dim">40.000<span class="cu"> entregados</span></div>
     </div>
     <div class="vrule"></div>
     <div class="col">
        <div class="collbl acc">Canal verificado</div>
        ''' + field(19,26,18,2.7, lit="all") + '''
        <div class="colcount acc">570.000<span class="cu"> entregados</span></div>
     </div>
  </div>
  <div class="twoline">Alcance potencial &nbsp;vs.&nbsp; alcance entregado.</div>
</div>''' + f

# ---------- PAGE 6 : REFRAME + CTA ----------
t,f = chrome("CHANNELAD","FIG. 06 — EL CIERRE","06")
p6 = t + '''
<div class="c6b">
  <div class="ovl acc">PAGA POR LO QUE LLEGA, NO POR LO QUE PROMETE</div>
  <div class="h6">El número que compras<br>y al que llegas,<br>por una vez, son el mismo.</div>
  <div class="pillars">
     <div class="pl"><span class="pn">01</span><span class="pt">Sin algoritmo en medio</span></div>
     <div class="pl"><span class="pn">02</span><span class="pt">Llega a cada suscriptor</span></div>
     <div class="pl"><span class="pn">03</span><span class="pt">Audiencia que se suscribió a propósito</span></div>
  </div>
  <div class="cta">
     <div class="ctabtn">Ver canales y alcance real&nbsp;&rarr;</div>
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
.ovl{font-family:'Geist',monospace;font-size:14.5px;letter-spacing:.24em;text-transform:uppercase;color:%(FAINT)s;}
.acc{color:%(ACCENT)s;}
b{font-weight:700;}

/* p1 cover */
.c1b{flex:1;display:flex;flex-direction:column;}
.h1{font-family:'Outfit';font-weight:700;font-size:82px;line-height:1.0;letter-spacing:-.025em;margin-top:26px;}
.h1b{font-family:'Outfit';font-weight:700;font-size:82px;line-height:1.04;letter-spacing:-.025em;}
.h1b .num{font-family:'Geist',monospace;font-weight:700;letter-spacing:-.03em;}
.fieldwrap{flex:1;display:flex;align-items:center;justify-content:center;}
.line2{font-family:'Outfit';font-size:31px;color:%(FAINT)s;letter-spacing:-.01em;margin-bottom:6px;}

/* p2 + p4 shared statement */
.c2b,.c4b{flex:1;display:flex;flex-direction:column;}
.bigstmt{font-family:'Outfit';font-weight:700;font-size:64px;line-height:1.05;letter-spacing:-.025em;margin-top:26px;}
.body{font-family:'Outfit';font-size:30px;line-height:1.36;color:%(FAINT)s;max-width:820px;margin-top:38px;letter-spacing:-.005em;}
.step{margin-top:auto;display:flex;align-items:flex-end;gap:40px;}
.step .sb{display:flex;flex-direction:column;gap:8px;}
.step .sa{font-family:'Geist',monospace;font-weight:700;font-size:62px;letter-spacing:-.025em;color:%(BONE)s;}
.step .sl{font-family:'Geist',monospace;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:%(MUTE)s;}
.step .arr{font-family:'Geist',monospace;font-size:40px;color:%(MUTE)s;padding-bottom:20px;}

/* p3 example */
.c3b{flex:1;display:flex;flex-direction:column;}
.ex{font-family:'Outfit';font-weight:700;font-size:48px;line-height:1.12;letter-spacing:-.02em;margin-top:24px;}
.exbig{font-family:'Geist',monospace;font-weight:700;font-size:150px;line-height:.9;letter-spacing:-.03em;margin-top:36px;}
.exbig .exu{font-family:'Outfit';font-weight:400;font-size:44px;color:%(FAINT)s;letter-spacing:-.01em;}
.expct{font-family:'Outfit';font-weight:700;font-size:34px;color:%(BONE)s;margin-top:10px;letter-spacing:-.01em;}
.body3b{font-family:'Outfit';font-size:28px;line-height:1.4;color:%(MUTE)s;max-width:760px;margin-top:34px;}
.caveat{margin-top:auto;font-family:'Geist',monospace;font-size:13.5px;letter-spacing:.06em;color:%(MUTE)s;line-height:1.5;max-width:840px;}

/* p4 field */
.fieldwrap4{flex:1;display:flex;align-items:center;justify-content:flex-start;}

/* p5 contrast */
.c5b{flex:1;display:flex;flex-direction:column;}
.twofield{flex:1;display:flex;gap:0;align-items:center;justify-content:space-between;margin-top:24px;}
.col{display:flex;flex-direction:column;align-items:center;gap:24px;flex:1;}
.collbl{font-family:'Geist',monospace;font-size:14px;letter-spacing:.16em;text-transform:uppercase;color:%(MUTE)s;}
.colcount{font-family:'Geist',monospace;font-weight:700;font-size:34px;letter-spacing:-.025em;}
.colcount.dim{color:%(FAINT)s;}
.colcount .cu{font-family:'Outfit';font-weight:400;font-size:18px;letter-spacing:0;}
.colcount.dim .cu{color:%(MUTE)s;}
.colcount.acc .cu{color:%(FAINT)s;}
.vrule{width:1px;align-self:stretch;background:rgba(236,231,220,.12);margin:30px 8px;}
.twoline{font-family:'Outfit';font-weight:700;font-size:38px;letter-spacing:-.02em;margin-top:20px;text-align:center;}

/* p6 */
.c6b{flex:1;display:flex;flex-direction:column;}
.h6{font-family:'Outfit';font-weight:700;font-size:64px;line-height:1.06;letter-spacing:-.025em;margin-top:26px;}
.pillars{margin-top:60px;display:flex;flex-direction:column;}
.pl{display:flex;align-items:center;gap:30px;padding:28px 0;border-top:1px solid rgba(236,231,220,.14);}
.pl:last-child{border-bottom:1px solid rgba(236,231,220,.14);}
.pl .pn{font-family:'Geist',monospace;font-size:18px;color:%(ACCENT)s;letter-spacing:.1em;}
.pl .pt{font-family:'Outfit';font-weight:400;font-size:36px;letter-spacing:-.01em;}
.cta{margin-top:auto;display:flex;align-items:baseline;justify-content:space-between;}
.ctabtn{font-family:'Outfit';font-weight:700;font-size:33px;letter-spacing:-.01em;}
.ctaurl{font-family:'Geist',monospace;font-weight:700;font-size:33px;letter-spacing:-.01em;}
''' % dict(INK=INK,BONE=BONE,MUTE=MUTE,FAINT=FAINT,ACCENT=ACCENT)

HTML = ("<!doctype html><html><head><meta charset='utf-8'><style>"+FACES+CSS+"</style></head><body>"
        + "".join('<div class="page">%s</div>'%p for p in [p1,p2,p3,p4,p5,p6])
        + "</body></html>")

html_path = os.path.join(HERE, "deck2.html")
with open(html_path,"w",encoding="utf-8") as fh: fh.write(HTML)

pdf_path = os.path.join(HERE, "channelad-el-algoritmo-no-decide.pdf")
udd = tempfile.mkdtemp(prefix="edgepdf2_")
cmd = [EDGE,"--headless=new","--disable-gpu","--no-sandbox","--user-data-dir="+udd,
       "--print-to-pdf-no-header","--print-to-pdf="+pdf_path,"file:///"+html_path.replace("\\","/")]
r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
print("edge rc", r.returncode)
if not os.path.exists(pdf_path):
    print("STDERR", r.stderr[-1500:]); sys.exit(1)

doc = fitz.open(pdf_path)
print("pages", doc.page_count, "size", doc[0].rect)
os.makedirs(os.path.join(HERE,"preview2"), exist_ok=True)
for i,pg in enumerate(doc):
    pix = pg.get_pixmap(matrix=fitz.Matrix(0.52,0.52))
    pix.save(os.path.join(HERE,"preview2","p%d.png"%(i+1)))
print("done", pdf_path)
