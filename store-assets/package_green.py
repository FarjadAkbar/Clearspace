from pathlib import Path
import zipfile
root=Path('.')
with zipfile.ZipFile('clearspace-extension-2.7.0.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in root.iterdir():
  if p.is_file() and (p.suffix in ['.html','.js','.css'] or p.name in ['manifest.json','icon.png','icon.svg']):z.write(p,p.name)
 for folder in ['fonts','sounds']:
  for p in (root/folder).rglob('*'):
   if p.is_file():z.write(p,p.as_posix())
with zipfile.ZipFile('website/clearspace-website.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in Path('website').rglob('*'):
  if p.is_file() and p.suffix!='.zip':z.write(p,p.relative_to('website').as_posix())
print('Extension and website packages rebuilt with local fonts.')












