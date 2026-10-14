importScripts('store.js');
chrome.alarms.onAlarm.addListener(async alarm=>{
 if(alarm.name!=='focus-end')return;
 let completed;
 await Store.update(state=>{completed=completeTimer(state);});
 if(completed){
  const next=await Store.get();
  if(next.timer&&!next.timer.logged)await chrome.alarms.create('focus-end',{when:next.timer.end});
  if(completed.autoCycle&&completed.mode==='break')playSessionSound().catch(console.error);
  chrome.notifications.create({type:'basic',iconUrl:'icon.png',title:completed.autoCycle?(completed.mode==='focus'?'Time for a 10-minute break.':'Your next focus session has started.'):'Session complete.',message:completed.autoCycle?(completed.mode==='focus'?'Rest for 10 minutes. Focus restarts automatically.':'25 minutes of focus. Pause or reset any time.'):'Session complete.'});
 }
});

// Keep a running timer alarm available after the planner closes.
async function syncTimer(){const s=await Store.get();if(s.timer&&!s.timer.paused&&!s.timer.logged)await chrome.alarms.create('focus-end',{when:Math.max(Date.now()+100,s.timer.end)});else await chrome.alarms.clear('focus-end');}
if(chrome.storage?.onChanged){chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.clearspace)syncTimer().catch(console.error);});chrome.runtime.onStartup.addListener(()=>syncTimer().catch(console.error));chrome.runtime.onInstalled.addListener(()=>syncTimer().catch(console.error));syncTimer().catch(console.error);}

let audioSetup;
async function playSessionSound(){
 if(!chrome.offscreen)return;
 if(!audioSetup)audioSetup=(async()=>{if(!await chrome.offscreen.hasDocument())await chrome.offscreen.createDocument({url:'offscreen.html',reasons:['AUDIO_PLAYBACK'],justification:'Play a short sound when a focus session restarts after a break.'});})().finally(()=>audioSetup=null);
 await audioSetup;await chrome.runtime.sendMessage({target:'session-audio'});
}

if(chrome.scripting&&chrome.runtime?.onMessage){
const scrollOrigins={instagram:'https://www.instagram.com/*',facebook:'https://www.facebook.com/*',youtube:'https://www.youtube.com/*'};
let scrollQueue=Promise.resolve();const scrollTokens=new Map();
async function syncScrollScripts(){
 const settings=(await chrome.storage.local.get('scrollAwareness')).scrollAwareness||{sites:[]};
 const existing=await chrome.scripting.getRegisteredContentScripts();const old=existing.filter(s=>s.id.startsWith('clearspace-scroll-')).map(s=>s.id);if(old.length)await chrome.scripting.unregisterContentScripts({ids:old});
 const scripts=[];for(const site of settings.sites){const origin=scrollOrigins[site];if(origin&&await chrome.permissions.contains({origins:[origin]}))scripts.push({id:'clearspace-scroll-'+site,matches:[origin],js:['scroll-content.js'],runAt:'document_idle',persistAcrossSessions:true});}
 if(scripts.length)await chrome.scripting.registerContentScripts(scripts);
}
let scriptsQueue=Promise.resolve();function queueScripts(){scriptsQueue=scriptsQueue.catch(()=>{}).then(syncScrollScripts);return scriptsQueue;}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(message.type!=='scroll-view')return;
 scrollQueue=scrollQueue.catch(()=>{}).then(async()=>{
  let host;try{host=new URL(sender.url).hostname;}catch{respond({ok:false});return;}
  const hosts={instagram:'www.instagram.com',facebook:'www.facebook.com',youtube:'www.youtube.com'};
  if(sender.tab?.id===undefined||host!==hosts[message.site]||!['reels','videos'].includes(message.kind)||typeof message.token!=='string'||message.token.length>100){respond({ok:false});return;}
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
