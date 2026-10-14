from pathlib import Path
from PIL import Image,ImageDraw
out=Path('store-assets/green')
canvas=Image.new('RGB',(1000,1070),'#eaf5ee')
d=ImageDraw.Draw(canvas)
for i,p in enumerate(sorted(out.glob('screenshot-*.jpg'))):
 im=Image.open(p);im.thumbnail((480,300));x=10+(i%2)*500;y=30+(i//2)*350;canvas.paste(im,(x,y));d.text((x,y+306),p.stem,fill='#103d2e')
canvas.save(out/'preview.jpg',quality=92)
