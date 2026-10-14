importScripts('store.js');
chrome.alarms.onAlarm.addListener(async alarm=>{
 if(alarm.name!=='focus-end')return;
 let completed;
 await Store.update(state=>{completed=completeTimer(state);});
 if(completed){
  const next=await Store.get();
  if(next.timer&&!next.timer.logged)await chrome.alarms.create('focus-end',{when:next.timer.end});
  if(completed.autoCycle){if(completed.mode==='focus')await beginRest(next.timer.end);else playSessionSound().catch(console.error);}
  chrome.notifications.create({type:'basic',iconUrl:'icon.png',title:completed.autoCycle?(completed.mode==='focus'?'Time for a 10-minute break.':'Your next focus session has started.'):'Session complete.',message:completed.autoCycle?(completed.mode==='focus'?'Rest for 10 minutes. Focus restarts automatically.':'25 minutes of focus. Pause or reset any time.'):'Session complete.'});
 }
});

// Keep a running timer alarm available after the planner closes.
async function syncTimer(){const s=await Store.get();if(s.timer&&!s.timer.paused&&!s.timer.logged)await chrome.alarms.create('focus-end',{when:Math.max(Date.now()+100,s.timer.end)});else await chrome.alarms.clear('focus-end');}
if(chrome.storage?.onChanged){chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.clearspace)syncTimer().catch(console.error);});chrome.runtime.onStartup.addListener(()=>syncTimer().catch(console.error));chrome.runtime.onInstalled.addListener(()=>syncTimer().catch(console.error));syncTimer().catch(console.error);}

let audioSetup;
async function playSessionSound(){
 if(!chrome.offscreen)return;
 if(!audioSetup)audioSetup=(async()=>{if(!await chrome.offscreen.hasDocument())await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['AUDIO_PLAYBACK'],justification:'Play a short sound when a break starts or focus restarts.'});})().finally(()=>audioSetup=null);
 await audioSetup;await chrome.runtime.sendMessage({target:'session-audio'});
}

let announcedRestEnd=0;
async function beginRest(expectedEnd){
 const s=await Store.get(),t=s.timer;if(!t||t.mode!=='break'||t.paused||t.logged||t.end!==expectedEnd||announcedRestEnd===expectedEnd)return;
 announcedRestEnd=expectedEnd;
 await playSessionSound().catch(console.error);
 if(s.preferences?.minimizeOnBreak===false||!chrome.windows?.getLastFocused)return;
 try{const window=await chrome.windows.getLastFocused({windowTypes:['normal']});if(window.focused&&window.id!==undefined&&window.state!=='minimized')await chrome.windows.update(window.id,{state:'minimized'});}catch(error){console.error('Could not minimize Chrome for the break.',error);}
}
if(chrome.runtime?.onMessage)chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message.type!=='rest-started')return;
 if(sender.id!==chrome.runtime.id||!sender.url?.startsWith('chrome-extension://'+chrome.runtime.id+'/'))return;
 beginRest(message.end).then(()=>respond({ok:true}),error=>respond({ok:false,error:error.message}));return true;
});

if(chrome.scripting&&chrome.runtime?.onMessage){
const scrollOrigins={instagram:'https://www.instagram.com/*',facebook:'https://*.facebook.com/*',youtube:'https://www.youtube.com/*'};
let scrollQueue=Promise.resolve();const scrollTokens=new Map();
async function syncScrollScripts(){
 const settings=(await chrome.storage.local.get('scrollAwareness')).scrollAwareness||{sites:[]};
 const existing=await chrome.scripting.getRegisteredContentScripts();const old=existing.filter(s=>s.id.startsWith('clearspace-scroll-')).map(s=>s.id);if(old.length)await chrome.scripting.unregisterContentScripts({ids:old});
 const scripts=[];for(const site of settings.sites){let origin=scrollOrigins[site];if(site==='facebook'&&!await chrome.permissions.contains({origins:[origin]})&&await chrome.permissions.contains({origins:['https://www.facebook.com/*']}))origin='https://www.facebook.com/*';if(origin&&await chrome.permissions.contains({origins:[origin]}))scripts.push({id:'clearspace-scroll-'+site,matches:[origin],js:['scroll-content.js'],runAt:'document_idle',persistAcrossSessions:true});}
 if(scripts.length)await chrome.scripting.registerContentScripts(scripts);
 // Registration handles future navigation; attach to already-open opted-in tabs too.
 const origins=scripts.flatMap(s=>s.matches);
 if(!origins.length||!chrome.tabs?.query)return {connected:0,failed:0,registered:scripts.length};
 const tabs=await chrome.tabs.query({url:origins});
 const results=await Promise.allSettled(tabs.filter(tab=>tab.id!==undefined).map(tab=>chrome.scripting.executeScript({target:{tabId:tab.id},files:['scroll-content.js']})));
 return {registered:scripts.length,connected:results.filter(r=>r.status==='fulfilled').length,failed:results.filter(r=>r.status==='rejected').length};
}
let scriptsQueue=Promise.resolve();function queueScripts(){scriptsQueue=scriptsQueue.catch(()=>{}).then(syncScrollScripts);return scriptsQueue;}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message.type==='scroll-sync'){if(sender.id!==chrome.runtime.id||!sender.url?.startsWith('chrome-extension://'+chrome.runtime.id+'/')){respond({ok:false,error:'Open awareness settings inside the installed extension.'});return true;}queueScripts().then(result=>respond({ok:true,...result}),error=>respond({ok:false,error:error.message}));return true;}
 if(message.type!=='scroll-view')return;
 scrollQueue=scrollQueue.catch(()=>{}).then(async()=>{
  let host;try{host=new URL(sender.url).hostname;}catch{respond({ok:false});return;}
  const hosts={instagram:'www.instagram.com',facebook:'facebook.com',youtube:'www.youtube.com'};const trustedHost=message.site==='facebook'?(host==='facebook.com'||host.endsWith('.facebook.com')):host===hosts[message.site];
  if(sender.tab?.id===undefined||!trustedHost||!['reels','videos'].includes(message.kind)||typeof message.token!=='string'||message.token.length>100){respond({ok:false});return;}
  const data=(await chrome.storage.local.get('scrollAwareness')).scrollAwareness||{sites:[],days:{}};
  if(!data.sites.includes(message.site)){respond({ok:false});return;}
  const key=sender.tab.id+':'+message.site;if(scrollTokens.get(key)===message.token){respond({ok:false});return;}
  const date=dayKey();data.days||={};data.days[date]||={};const counts=data.days[date][message.site]||={reels:0,videos:0};counts[message.kind]++;
  for(const old of Object.keys(data.days).sort().slice(0,-90))delete data.days[old];
  await chrome.storage.local.set({scrollAwareness:data});scrollTokens.set(key,message.token);if(scrollTokens.size>500)scrollTokens.delete(scrollTokens.keys().next().value);
  const total=Object.values(data.days[date]).reduce((n,v)=>({reels:n.reels+v.reels,videos:n.videos+v.videos}),{reels:0,videos:0});respond({ok:true,...total});
 }).catch(()=>respond({ok:false}));return true;
});
chrome.storage.onChanged.addListener(changes=>{const change=changes.scrollAwareness;if(change&&JSON.stringify(change.oldValue?.sites)!==JSON.stringify(change.newValue?.sites))queueScripts().catch(console.error);});
chrome.runtime.onInstalled.addListener(()=>queueScripts().catch(console.error));chrome.runtime.onStartup.addListener(()=>queueScripts().catch(console.error));chrome.permissions.onAdded.addListener(()=>queueScripts().catch(console.error));chrome.permissions.onRemoved.addListener(()=>queueScripts().catch(console.error));queueScripts().catch(console.error);

}
