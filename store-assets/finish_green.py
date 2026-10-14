from pathlib import Path
import re,colorsys
for p in list(Path('.').glob('*.css'))+[Path('website/site.css')]:
 def color(m):
  raw=m.group()[1:];r,g,b=[int(raw[i:i+2],16)/255 for i in (0,2,4)];h,s,v=colorsys.rgb_to_hsv(r,g,b)
  if 215/360<h<300/360 and s>.035:
   r,g,b=colorsys.hsv_to_rgb(151/360,s,v);return '#'+''.join(f'{round(x*255):02x}' for x in (r,g,b))
  return m.group()
 p.write_text(re.sub(r'#[0-9a-fA-F]{6}\b',color,p.read_text(encoding='utf-8-sig')),encoding='utf-8')
for p in [Path('index.html'),Path('ats.html'),Path('popup.html')]:
 s=p.read_text(encoding='utf-8-sig');s=re.sub(r'href="([\w-]+\.css)(?:\?[^\"]*)?"',r'href="\1?v=2.5.1"',s);p.write_text(s,encoding='utf-8')
import shutil
for p in Path('.').glob('*.css'):shutil.copy(p,Path('store-assets/demo')/p.name)
for name in ['index.html','ats.html','popup.html']:shutil.copy(name,Path('store-assets/demo')/name)
shutil.copy('theme.css','website/theme.css')
