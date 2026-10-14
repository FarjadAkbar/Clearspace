from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math, zipfile

OUT = Path(__file__).parent
PURPLE = '#6952e8'
NAVY = '#171c32'

def font(size, bold=False):
    return ImageFont.truetype('C:/Windows/Fonts/' + ('segoeuib.ttf' if bold else 'segoeui.ttf'), size)

def tile(w,h,name):
    scale=3
    im=Image.new('RGB',(w*scale,h*scale),NAVY)
    d=ImageDraw.Draw(im)
    elements=[]
    def rect(box,fill,r=0):
        d.rounded_rectangle(tuple(int(v*scale) for v in box),radius=int(r*scale),fill=fill)
        x,y,x2,y2=box
        elements.append(f'<rect x="{x}" y="{y}" width="{x2-x}" height="{y2-y}" rx="{r}" fill="{fill}"/>')
    def text(x,y,s,size,fill='#ffffff',bold=False):
        d.text((x*scale,y*scale),s,font=font(size*scale,bold),fill=fill)
        elements.append(f'<text x="{x}" y="{y+size}" fill="{fill}" font-family="Segoe UI,Arial,sans-serif" font-size="{size}" font-weight="{700 if bold else 400}">{s}</text>')
    def line(points,fill,width):
        d.line([(int(x*scale),int(y*scale)) for x,y in points],fill=fill,width=int(width*scale))
        elements.append(f'<polyline points="{" ".join(f"{x},{y}" for x,y in points)}" stroke="{fill}" stroke-width="{width}" fill="none" stroke-linecap="round"/>')
    rect((0,0,w,h),NAVY)
    large=w>500
    x,y=(76,67) if large else (28,24)
    for angle in range(0,180,45):
        a=math.radians(angle)
        line([(x+14-math.cos(a)*12,y+15-math.sin(a)*12),(x+14+math.cos(a)*12,y+15+math.sin(a)*12)],'#b7a8ff',3)
    text(x+40,y-2,'clearspace',28 if large else 23,bold=True)
    text(x,155 if large else 83,'Less mental clutter.',53 if large else 28,bold=True)
    text(x,222 if large else 121,'More room to focus.',53 if large else 28,'#b9aaff',True)
    text(x,321 if large else 181,'Capture. Prioritize. Plan. Focus.',24 if large else 16,'#d3d6e4')
    if large:
        text(x,426,'YOUR PERSONAL PLANNING SPACE',15,'#aaaec7')
        rect((850,75,1325,485),'#f6f5fc',26)
        text(883,101,'A little structure for your day',24,NAVY,True)
        for i,(label,time) in enumerate([('Portfolio case study','10:00'),('Amal assignment','11:30'),('Interview preparation','14:00')]):
            yy=165+i*78
            rect((879,yy,1297,yy+62),'#ffffff',12)
            rect((891,yy+14,897,yy+48),PURPLE,3)
            text(914,yy+9,label,19,NAVY,True)
            text(914,yy+34,time+'  /  One clear next step',14,'#70758c')
        rect((879,412,1297,458),PURPLE,12)
        text(939,420,'Make space for what matters',17,bold=True)
    else:
        rect((28,226,412,252),PURPLE,13)
        text(85,229,'One thought. One next step.',12,bold=True)
    im.resize((w,h),Image.Resampling.LANCZOS).save(OUT/(name+'.png'))
    (OUT/(name+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">' + ''.join(elements)+'</svg>',encoding='utf-8')

tile(440,280,'small-promo-440x280')
tile(1400,560,'marquee-promo-1400x560')
icon=Image.new('RGBA',(512,512),(0,0,0,0)); d=ImageDraw.Draw(icon)
d.rounded_rectangle((64,64,448,448),radius=104,fill=PURPLE)
for angle in range(0,180,45):
    a=math.radians(angle); dx=math.cos(a)*104;dy=math.sin(a)*104
    d.line((256-dx,256-dy,256+dx,256+dy),fill='white',width=24)
icon.resize((128,128),Image.Resampling.LANCZOS).save(OUT/'store-icon-128.png')
(OUT/'store-icon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect x="16" y="16" width="96" height="96" rx="26" fill="#6952e8"/><path d="M38 64h52M64 38v52M46 46l36 36M46 82l36-36" stroke="white" stroke-width="6" stroke-linecap="round"/></svg>',encoding='utf-8')
for p in OUT.glob('screenshot-*.jpg'):
    im=Image.open(p).convert('RGB')
    # Browser captures may omit the scrollbar strip. Pad that strip, without scaling UI.
    if im.size != (1280,800):
        canvas=Image.new('RGB',(1280,800),'#f6f7fb');canvas.paste(im,(0,0));im=canvas
    im.save(p,quality=95)
files=list(OUT.glob('*.png'))+list(OUT.glob('*.jpg'))+list(OUT.glob('*.svg'))
with zipfile.ZipFile(OUT/'clearspace-store-assets.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in files:z.write(p,p.name)
for p in files:
    if p.suffix!='.svg':
        im=Image.open(p);print(p.name,im.size,im.mode)
