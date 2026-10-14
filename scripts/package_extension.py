"""Optional packaging helper. Run from any directory; archives contain extension only."""
from pathlib import Path
import argparse,json,zipfile
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=None)
args=parser.parse_args()
source=ROOT/'extension'
version=json.loads((source/'manifest.json').read_text())['version']
output=args.output or ROOT/f'clearspace-extension-{version}.zip'
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as archive:
 for file in source.rglob('*'):
  if file.is_file():archive.write(file,file.relative_to(source).as_posix())
print(output)
