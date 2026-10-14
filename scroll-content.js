(() => {
 // Save/startup can inject more than once into the same page.
 if(globalThis.__clearspaceScrollTracker)return;
 globalThis.__clearspaceScrollTracker=true;
 const site=location.hostname.includes('instagram')?'instagram':location.hostname.includes('facebook')?'facebook':'youtube';
 let enabled=false,badge,sequence=0,inFlight=false;
 const watching=new Map(),counted=new Set();
 const ids=new WeakMap(),seenDocument=crypto.randomUUID();let objectId=0;
 function showBadge(text){if(!badge){badge=document.createElement('div');badge.setAttribute('role','status');badge.style.cssText='position:fixed;bottom:24px;right:24px;z-index:2147483647;background:#b91f35;color:white;padding:12px 18px;border-radius:14px;font:600 14px system-ui;box-shadow:0 4px 18px #0003;pointer-events:none';document.documentElement.append(badge);}badge.textContent=text;}
 function cleanup(){badge?.remove();badge=null;watching.clear();document.querySelectorAll('[data-clearspace-video]').forEach(el=>{el.style.outline=el.dataset.clearspaceOutline||'';delete el.dataset.clearspaceVideo;delete el.dataset.clearspaceOutline;});}
 async function config(saved){try{const data=saved===undefined?(await chrome.storage.local.get('scrollAwareness')).scrollAwareness:saved;enabled=!!data?.sites?.includes(site);if(!enabled){cleanup();return;}const d=new Date(),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;const total=Object.values(data.days?.[day]||{}).reduce((n,v)=>({reels:n.reels+(v.reels||0),videos:n.videos+(v.videos||0)}),{reels:0,videos:0});showBadge(`Clearspace · Tracking on · ${total.reels+total.videos} videos today`);}catch{enabled=false;cleanup();}}
 function mark(video){if(!video.dataset.clearspaceVideo){video.dataset.clearspaceOutline=video.style.outline;video.dataset.clearspaceVideo='1';video.style.outline='3px solid #e34255';}}
 async function scan(){
  if(!enabled||document.hidden||inFlight)return;
  const videos=[...document.querySelectorAll('video')].map(video=>{
   const r=video.getBoundingClientRect(),style=getComputedStyle(video);
   if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)return {video,ratio:0,area:0};
   const left=Math.max(0,r.left),top=Math.max(0,r.top),right=Math.min(r.right,innerWidth),bottom=Math.min(r.bottom,innerHeight);
   const visible=Math.max(0,right-left)*Math.max(0,bottom-top);
   // A reel taller than the window can still fill the available viewing area.
   const available=Math.min(r.width,innerWidth)*Math.min(r.height,innerHeight);
   // Social sites layer controls over their players. Visibility is based on
   // the video rectangle, without rejecting those overlays or paused players.
   return {video,ratio:available?visible/available:0,area:visible};
  }).filter(v=>v.ratio>=.25&&v.area>=2500);
  const visibleKeys=new Set(),pending=[];
  for(const {video} of videos){
   mark(video);
   if(!ids.has(video))ids.set(video,++objectId);
   const key=location.pathname+'|'+(video.currentSrc||video.src||String(ids.get(video)));
   visibleKeys.add(key);
   if(counted.has(key))continue;
   if(!watching.has(key))watching.set(key,Date.now());
   if(Date.now()-watching.get(key)>=1000)pending.push({video,key});
  }
  for(const key of watching.keys())if(!visibleKeys.has(key))watching.delete(key);
  if(!pending.length)return;
  inFlight=true;
  try{
   for(const {video,key} of pending){
    const reel=/\/(reel|reels|shorts)(\/|\?|$)/i.test(location.pathname)||!!video.closest('ytd-reel-video-renderer')||!!video.closest('article,[role="article"],[role="dialog"]')?.querySelector('a[href*="/reel/"],a[href*="/reels/"]');
    const result=await chrome.runtime.sendMessage({type:'scroll-view',site,kind:reel?'reels':'videos',token:seenDocument+':'+(++sequence)});
    if(result?.ok){counted.add(key);watching.delete(key);showBadge(`Clearspace · ${result.reels+result.videos} videos today`);}
    else{showBadge('Clearspace · Tracking could not save. Re-save awareness settings.');break;}
   }
  }catch{showBadge('Clearspace · Reconnect: reload this tab after updating the extension.');enabled=false;}finally{inFlight=false;}

 }
 config();chrome.storage.onChanged.addListener(changes=>{if(changes.scrollAwareness)config(changes.scrollAwareness.newValue||null);});setInterval(scan,500);document.addEventListener('visibilitychange',()=>{watching.clear();});
})();
