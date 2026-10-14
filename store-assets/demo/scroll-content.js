(() => {
 const site=location.hostname.includes('instagram')?'instagram':location.hostname.includes('facebook')?'facebook':'youtube';
 let enabled=false,badge,activeKey='',candidate='',since=0,sequence=0,inFlight=false;
 const ids=new WeakMap(),seenDocument=crypto.randomUUID();let objectId=0;
 const day=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 function cleanup(){badge?.remove();badge=null;document.querySelectorAll('[data-clearspace-video]').forEach(el=>{el.style.outline=el.dataset.clearspaceOutline||'';delete el.dataset.clearspaceVideo;delete el.dataset.clearspaceOutline;});}
 async function config(){const data=(await chrome.storage.local.get('scrollAwareness')).scrollAwareness;enabled=!!data?.sites?.includes(site);if(!enabled)cleanup();}
 function mark(video){if(!video.dataset.clearspaceVideo){video.dataset.clearspaceOutline=video.style.outline;video.dataset.clearspaceVideo='1';video.style.outline='3px solid #e34255';}}
 async function scan(){
  if(!enabled||document.hidden||inFlight)return;
  const videos=[...document.querySelectorAll('video')].map(video=>{const r=video.getBoundingClientRect(),visible=Math.max(0,Math.min(r.right,innerWidth)-Math.max(0,r.left))*Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(0,r.top));return {video,ratio:r.width*r.height?visible/(r.width*r.height):0,area:visible};}).filter(v=>v.ratio>=.6&&v.area>10000).sort((a,b)=>b.area-a.area);
  videos.forEach(v=>mark(v.video));
  const selected=videos[0];if(!selected){candidate='';activeKey='';return;}
  const video=selected.video;if(!ids.has(video))ids.set(video,++objectId);
  const key=location.pathname+'|'+(video.currentSrc||video.src||String(ids.get(video))); 
  if(candidate!==key){candidate=key;since=Date.now();return;}if(key===activeKey||Date.now()-since<1000)return;
  const reel=/\/(reel|reels|shorts)(\/|\?|$)/i.test(location.pathname)||!!video.closest('ytd-reel-video-renderer')||!!video.closest('article,[role="article"],[role="dialog"]')?.querySelector('a[href*="/reel/"],a[href*="/reels/"]');
  inFlight=true;
  try{const result=await chrome.runtime.sendMessage({type:'scroll-view',site,kind:reel?'reels':'videos',token:seenDocument+':'+(++sequence),date:day()});if(result?.ok){activeKey=key;if(!badge){badge=document.createElement('div');badge.setAttribute('role','status');badge.style.cssText='position:fixed;bottom:24px;right:24px;z-index:2147483647;background:#b91f35;color:white;padding:12px 18px;border-radius:14px;font:600 14px system-ui;box-shadow:0 4px 18px #0003;pointer-events:none';document.documentElement.append(badge);}badge.textContent=`Clearspace · ${result.reels} reels / Shorts · ${result.videos} videos today`;}}catch{}finally{inFlight=false;}
 }
 config();chrome.storage.onChanged.addListener(changes=>{if(changes.scrollAwareness)config();});setInterval(scan,500);document.addEventListener('visibilitychange',()=>{candidate='';since=Date.now();});
})();
