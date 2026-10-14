from pathlib import Path
for name in ['background.js','awareness.js']:
 p=Path(name);s=p.read_text(encoding='utf-8-sig').replace("facebook:'https://www.facebook.com/*'","facebook:'https://*.facebook.com/*'");
 if name=='background.js':
  s=s.replace("const origin=scrollOrigins[site];if(origin&&await chrome.permissions.contains({origins:[origin]}))scripts.push", "let origin=scrollOrigins[site];if(site==='facebook'&&!await chrome.permissions.contains({origins:[origin]})&&await chrome.permissions.contains({origins:['https://www.facebook.com/*']}))origin='https://www.facebook.com/*';if(origin&&await chrome.permissions.contains({origins:[origin]}))scripts.push")
  s=s.replace("const hosts={instagram:'www.instagram.com',facebook:'www.facebook.com',youtube:'www.youtube.com'};", "const hosts={instagram:'www.instagram.com',facebook:'facebook.com',youtube:'www.youtube.com'};const trustedHost=message.site==='facebook'?(host==='facebook.com'||host.endsWith('.facebook.com')):host===hosts[message.site];")
  s=s.replace("host!==hosts[message.site]", "!trustedHost")
 p.write_text(s,encoding='utf-8')
import json
p=Path('manifest.json');m=json.loads(p.read_text(encoding='utf-8-sig'));m['version']='2.5.8';m['optional_host_permissions'].append('https://*.facebook.com/*');p.write_text(json.dumps(m,indent=2),encoding='utf-8')
p=Path('tests/blocking-worker.test.cjs');s=p.read_text(encoding='utf-8-sig');s+='''
test('Facebook alternate hosts count only when opted in, excluding lookalike domains',async()=>{const env=setup();env.values.scrollAwareness.sites=['facebook'];const msg={type:'scroll-view',site:'facebook',kind:'videos',token:'document:fb'};assert.equal((await env.send(msg,{tab:{id:4},url:'https://web.facebook.com/watch/'})).videos,1);assert.equal((await env.send({...msg,token:'document:evil'},{tab:{id:4},url:'https://fakefacebook.com/watch/'})).ok,false);});
''';p.write_text(s,encoding='utf-8')
for name in ['index.html','ats.html','popup.html']:
 p=Path(name);p.write_text(p.read_text(encoding='utf-8-sig').replace('v=2.5.7','v=2.5.8'),encoding='utf-8')
p=Path('store-assets/package_green.py');p.write_text(p.read_text(encoding='utf-8-sig').replace('clearspace-extension-2.5.7.zip','clearspace-extension-2.5.8.zip'),encoding='utf-8')
