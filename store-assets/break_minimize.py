from pathlib import Path
p=Path('background.js');s=p.read_text(encoding='utf-8-sig');s=s.replace("if(completed.autoCycle&&completed.mode==='break')playSessionSound().catch(console.error);", "if(completed.autoCycle){if(completed.mode==='focus')await beginRest(next.timer.end);else playSessionSound().catch(console.error);}");i=s.index('if(chrome.scripting&&chrome.runtime?.onMessage)');s=s[:i]+'''let announcedRestEnd=0;
async function beginRest(expectedEnd){
 const s=await Store.get(),t=s.timer;if(!t||t.mode!=='break'||t.paused||t.logged||t.end!==expectedEnd||announcedRestEnd===expectedEnd)return;
 announcedRestEnd=expectedEnd;
 await playSessionSound().catch(console.error);
 if(!chrome.windows?.getLastFocused)return;
 try{const window=await chrome.windows.getLastFocused({windowTypes:['normal']});if(window.focused&&window.id!==undefined&&window.state!=='minimized')await chrome.windows.update(window.id,{state:'minimized'});}catch(error){console.error('Could not minimize Chrome for the break.',error);}
}
if(chrome.runtime?.onMessage)chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message.type!=='rest-started')return;
 if(sender.id!==chrome.runtime.id||!sender.url?.startsWith('chrome-extension://'+chrome.runtime.id+'/'))return;
 beginRest(message.end).then(()=>respond({ok:true}),error=>respond({ok:false,error:error.message}));return true;
});

'''+s[i:];s=s.replace('Play a short sound when a focus session restarts after a break.','Play a short sound when a break starts or focus restarts.');p.write_text(s,encoding='utf-8')
p=Path('app.js');s=p.read_text(encoding='utf-8-sig');s=s.replace("if(completed.autoCycle&&completed.mode==='break')sessionSound();", "if(completed.autoCycle){if(completed.mode==='focus'&&globalThis.chrome?.runtime?.id)chrome.runtime.sendMessage({type:'rest-started',end:state.timer.end}).catch(()=>sessionSound());else sessionSound();}");p.write_text(s,encoding='utf-8')
p=Path('tests/background.test.cjs');s=p.read_text(encoding='utf-8-sig');s=s.replace('function setup(timer){let callback;', 'function setup(timer,focused=true){let callback;const minimized=[];');s=s.replace('chrome:{alarms:',"chrome:{windows:{getLastFocused:async()=>({id:12,focused,state:'normal'}),update:async(id,change)=>minimized.push({id,...change})},alarms:");s=s.replace('return {state,notifications,fire:', 'return {state,notifications,minimized,fire:');s+='''
test('break start minimizes the focused Chrome window once',async()=>{const env=setup({mode:'focus',duration:1500,end:Date.now()-1,autoCycle:true});await env.fire();await env.fire();assert.equal(env.minimized.length,1);assert.equal(env.minimized[0].id,12);assert.equal(env.minimized[0].state,'minimized');});
test('break does not minimize a background Chrome window when another app is active',async()=>{const env=setup({mode:'focus',duration:1500,end:Date.now()-1,autoCycle:true},false);await env.fire();assert.equal(env.minimized.length,0);});
''';p.write_text(s,encoding='utf-8')
