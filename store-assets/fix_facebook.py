from pathlib import Path
p=Path('scroll-content.js');s=p.read_text(encoding='utf-8-sig');s=s.replace("const unobscured=!topElement||topElement===video||video.contains(topElement)||video.parentElement?.contains(topElement);",'''let unobscured=!topElement||topElement===video||video.contains(topElement);
   // Facebook places playback controls beside the video in nested player wrappers.
   // Accept that player's overlays, but never a page-wide body/html ancestor.
   let player=video.parentElement;
   for(let depth=0;!unobscured&&player&&depth<4;depth++,player=player.parentElement){
    if(player===document.body||player===document.documentElement)break;
    if(player.contains(topElement))unobscured=true;
   }''');p.write_text(s,encoding='utf-8')
p=Path('background.js');s=p.read_text(encoding='utf-8-sig');s=s.replace("if(sender.id!==chrome.runtime.id||sender.tab)return;","if(sender.id!==chrome.runtime.id||!sender.url?.startsWith('chrome-extension://'+chrome.runtime.id+'/')){respond({ok:false,error:'Open awareness settings inside the installed extension.'});return true;}");s=s.replace("return {connected:0,failed:0};","return {connected:0,failed:0,registered:scripts.length};");s=s.replace("return {connected:results.filter", "return {registered:scripts.length,connected:results.filter");p.write_text(s,encoding='utf-8')
p=Path('awareness.js');s=p.read_text(encoding='utf-8-sig');s=s.replace("if(target)target.textContent=sites.length?", "if(sites.length&&!result.registered)throw Error('Tracking permission is missing. Re-select the sites and allow the Chrome permission request.');if(target)target.textContent=sites.length?");s=s.replace('badge on Instagram.','badge on your selected sites.');p.write_text(s,encoding='utf-8')
p=Path('tests/scroll-content.test.cjs');s=p.read_text(encoding='utf-8-sig');s=s.replace('return {video,doc,messages,badges,ctx,', 'return {video,doc,messages,badges,ctx,');s+='''
test('Facebook nested playback overlays do not hide a visible video from tracking',async()=>{const env=setup();env.ctx.location.hostname='www.facebook.com';env.ctx.location.pathname='/watch/';const overlay={};env.doc.elementFromPoint=()=>overlay;env.video.parentElement={contains:()=>false,parentElement:{contains:el=>el===overlay}};await env.ready();await env.tick(0);await env.tick(1000);assert.equal(env.messages.length,1);assert.equal(env.messages[0].kind,'videos');});
test('unrelated overlays covering a player still prevent counting',async()=>{const env=setup();env.doc.elementFromPoint=()=>({});env.video.parentElement={contains:()=>false};await env.ready();await env.tick(0);await env.tick(2000);assert.equal(env.messages.length,0);});
''';p.write_text(s,encoding='utf-8')
