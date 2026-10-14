const DEFAULT_STATE = {tasks:[],blocks:[],sessions:[],timer:null,capacity:{available:480,buffer:60},blocking:{enabled:false,domains:[],overrideUntil:0}};
const Store = {
 async get(){const data=globalThis.chrome?.storage?(await chrome.storage.local.get('clearspace')).clearspace:JSON.parse(localStorage.getItem('clearspace')||'{}');return {...DEFAULT_STATE,...data,tasks:data?.tasks||[],blocks:data?.blocks||[],sessions:data?.sessions||[],capacity:{...DEFAULT_STATE.capacity,...data?.capacity},blocking:{...DEFAULT_STATE.blocking,...data?.blocking}};},
 async set(state){if(globalThis.chrome?.storage) await chrome.storage.local.set({clearspace:state}); else localStorage.setItem('clearspace',JSON.stringify(state));},
 async update(fn){const mutate=async()=>{const state=await this.get();fn(state);await this.set(state);return state;};return globalThis.navigator?.locks? navigator.locks.request('clearspace-write',mutate):mutate();}
};
const uid=()=>crypto.randomUUID();
// One atomic transition shared by the page and background alarm.
function completeTimer(s,now=Date.now()){
 const t=s.timer;if(!t||t.paused||t.logged||now<t.end)return null;
 s.sessions.push({id:uid(),mode:t.mode||'focus',completed:true,taskId:t.taskId,blockId:t.blockId,label:t.label,seconds:t.duration,date:dayKey(),endedAt:now});
 if(t.autoCycle){const mode=t.mode==='focus'?'break':'focus',duration=mode==='break'?600:1500;s.timer={...t,mode,duration,remaining:duration,end:now+duration*1000,started:true,paused:false,logged:false,cycle:(t.cycle||0)+1};}
 else s.timer={...t,logged:true};
 return t;
}
const dayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const taskSeconds=(s,id)=>s.sessions.filter(x=>x.taskId===id&&(x.mode||'focus')==='focus').reduce((sum,x)=>sum+x.seconds,0);
function capacityFor(s,date){const planned=s.blocks.filter(b=>b.date===date&&s.tasks.some(t=>t.id===b.taskId&&!['drop','delegate'].includes(t.quadrant))).reduce((n,b)=>n+b.duration,0);const usable=Math.max(0,s.capacity.available-s.capacity.buffer);return {planned,usable,remaining:usable-planned};}
function normalizeDomains(value){return [...new Set(value.split(/[\s,]+/).filter(Boolean).map(raw=>{const url=new URL(raw.includes('://')?raw:`https://${raw}`);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.port||url.pathname!=='/'||url.search||url.hash||!url.hostname.includes('.')||url.hostname.length>253||!url.hostname.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)))throw Error('Use domains only, such as youtube.com (without paths or ports).');return url.hostname.toLowerCase().replace(/^www\./,'');}))];}
function blockingRules(s,now=Date.now()){const t=s.timer;if(!s.blocking?.enabled||!t||t.mode!=='focus'||t.paused||t.logged||t.end<=now||s.blocking.overrideUntil>now)return [];return s.blocking.domains.map((domain,i)=>({id:i+1,priority:1,action:{type:'block'},condition:{requestDomains:[domain],resourceTypes:['main_frame']}}));}

function ensureFocusBlock(s,taskId,preferredId,now=new Date()){
 const task=s.tasks.find(t=>t.id===taskId);if(!task)return;
 const date=dayKey();let block=s.blocks.find(b=>b.id===preferredId&&b.taskId===taskId&&b.date===date)||s.blocks.find(b=>b.taskId===taskId&&b.date===date);
 if(!block){const start=now.getHours()*60+now.getMinutes();block={id:uid(),taskId,title:task.title,date,time:`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,duration:Math.min(25,1440-start),source:'focus'};s.blocks.push(block);}
 return block.id;
}

// Restore merges saved lists and never starts a timer from a backup.
function validateBackup(data){
 if(!data||typeof data!=='object'||!Array.isArray(data.tasks)||!Array.isArray(data.sessions))throw Error('Choose a Clearspace JSON backup.');
 for(const task of data.tasks)if(!task||typeof task.id!=='string'||typeof task.title!=='string'||task.title.length>500||task.nextSteps!==undefined&&(!Array.isArray(task.nextSteps)||task.nextSteps.some(step=>!step||typeof step.id!=='string'||typeof step.title!=='string'||step.title.length>500)))throw Error('This backup contains an invalid thought.');
 for(const session of data.sessions)if(!session||typeof session.id!=='string'||typeof session.seconds!=='number'||!Number.isFinite(session.seconds)||session.seconds<0||typeof session.date!=='string')throw Error('This backup contains an invalid session.');
 if(data.blocks!==undefined&&!Array.isArray(data.blocks))throw Error('This backup contains an invalid schedule.');
 for(const block of data.blocks||[])if(!block||typeof block.id!=='string'||typeof block.title!=='string')throw Error('This backup contains an invalid time block.');
}
function mergeBackup(state,backup){validateBackup(backup);for(const key of ['tasks','sessions','blocks']){state[key]||=[];const ids=new Set(state[key].map(item=>item.id));for(const item of backup[key]||[])if(!ids.has(item.id)){state[key].push(item);ids.add(item.id);}}}

function thoughtsText(tasks){return tasks.map(task=>`${task.done?'[Done] ':''}${task.title}${task.dueDate?' — Due '+task.dueDate:''}\n${(task.nextSteps||[]).map(step=>`  ${step.done?'[x]':'[ ]'} ${step.title}`).join('\n')}`).join('\n\n').trim();}
