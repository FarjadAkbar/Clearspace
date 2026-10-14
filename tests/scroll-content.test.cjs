const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('scroll-content.js','utf8');
function setup({hidden=false,tall=true}={}){
 let now=0,scan,intervals=0;const messages=[],badges=[];
 const video={paused:false,currentSrc:'first-reel',src:'',dataset:{},style:{outline:''},getBoundingClientRect:()=>({left:100,top:0,right:500,bottom:tall?1400:600,width:400,height:tall?1400:600}),closest:()=>null,contains:el=>el===video};
 const doc={hidden,querySelectorAll:s=>s==='video'?[video]:[],elementFromPoint:()=>video,createElement:()=>({style:{},setAttribute:()=>{},remove:()=>{}}),documentElement:{append:el=>badges.push(el)},addEventListener:()=>{}};
 const ctx=vm.createContext({Date:class extends Date{static now(){return now;}},crypto:{randomUUID:()=> 'doc'},location:{hostname:'www.instagram.com',pathname:'/reels/'},document:doc,innerWidth:1200,innerHeight:700,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),setInterval:fn=>{scan=fn;intervals++;},chrome:{storage:{local:{get:async()=>({scrollAwareness:{sites:['instagram'],days:{}}})},onChanged:{addListener:()=>{}}},runtime:{sendMessage:async msg=>{messages.push(msg);return {ok:true,reels:messages.length,videos:0};}}}});
 vm.runInContext(source,ctx);
 return {video,doc,messages,badges,ctx,intervals:()=>intervals,tick:async time=>{now=time;await scan();},ready:()=>new Promise(resolve=>setImmediate(resolve))};
}
test('Instagram reels taller than the viewport count after one second, once per view',async()=>{const env=setup();await env.ready();assert.match(env.badges[0].textContent,/Tracking on/);await env.tick(0);await env.tick(500);assert.equal(env.messages.length,0);await env.tick(1000);assert.equal(env.messages.length,1);assert.equal(env.messages[0].kind,'reels');assert.match(env.video.style.outline,/#e34255/);await env.tick(3000);assert.equal(env.messages.length,1);env.video.currentSrc='second-reel';await env.tick(3500);await env.tick(4500);assert.equal(env.messages.length,2);assert.match(env.badges[0].textContent,/2 videos/);});
test('hidden tabs do not count and repeated injection does not create duplicate scanners',async()=>{const env=setup({hidden:true});await env.ready();await env.tick(0);await env.tick(1500);assert.equal(env.messages.length,0);vm.runInContext(source,env.ctx);assert.equal(env.intervals(),1);env.doc.hidden=false;await env.tick(2000);await env.tick(3000);assert.equal(env.messages.length,1);});
test('offscreen reels are ignored',async()=>{const env=setup();await env.ready();env.video.getBoundingClientRect=()=>({left:100,top:800,right:500,bottom:1400,width:400,height:600});await env.tick(0);await env.tick(2000);assert.equal(env.messages.length,0);});

test('Facebook nested playback overlays do not hide a visible video from tracking',async()=>{const env=setup();env.ctx.location.hostname='www.facebook.com';env.ctx.location.pathname='/watch/';const overlay={};env.doc.elementFromPoint=()=>overlay;env.video.parentElement={contains:()=>false,parentElement:{contains:el=>el===overlay}};await env.ready();await env.tick(0);await env.tick(1000);assert.equal(env.messages.length,1);assert.equal(env.messages[0].kind,'videos');});
test('social player overlays do not prevent counting',async()=>{const env=setup();env.doc.elementFromPoint=()=>({});env.video.parentElement={contains:()=>false};await env.ready();await env.tick(0);await env.tick(2000);assert.equal(env.messages.length,1);});
test('all visible videos count even when paused, without repeatedly counting the same player',async()=>{
 const env=setup();await env.ready();env.ctx.location.pathname='/feed/';
 env.video.paused=true;
 const second={...env.video,currentSrc:'another-video',dataset:{},style:{outline:''}};
 env.doc.querySelectorAll=s=>s==='video'?[env.video,second]:[];
 await env.tick(0);await env.tick(1000);assert.equal(env.messages.length,2);
 assert.ok(env.messages.every(m=>m.kind==='videos'));
 await env.tick(2000);assert.equal(env.messages.length,2);
 env.doc.querySelectorAll=s=>s==='video'?[second]:[];await env.tick(2500);
 env.doc.querySelectorAll=s=>s==='video'?[env.video,second]:[];await env.tick(3000);await env.tick(4000);
 assert.equal(env.messages.length,2);
});
test('partially visible videos count and a brief scroll past does not',async()=>{
 const env=setup();await env.ready();
 env.video.getBoundingClientRect=()=>({left:100,top:500,right:500,bottom:1100,width:400,height:600});
 await env.tick(0);await env.tick(500);assert.equal(env.messages.length,0);
 env.video.getBoundingClientRect=()=>({left:100,top:800,right:500,bottom:1400,width:400,height:600});
 await env.tick(1000);
 env.video.getBoundingClientRect=()=>({left:100,top:500,right:500,bottom:1100,width:400,height:600});
 await env.tick(1500);await env.tick(2000);assert.equal(env.messages.length,0);
 await env.tick(2500);assert.equal(env.messages.length,1);
});
