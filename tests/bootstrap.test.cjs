const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('bootstrap.js','utf8');
test('planner waits for scripts and stored data, then renders once and preserves settings link',async()=>{
 let ready,finishStats,reads=0,renders=0,events=0;
 const ctx=vm.createContext({plannerReady:false,state:undefined,view:'overview',location:{search:'?settings=1'},URLSearchParams,Event,console,
 Store:{get:async()=>{reads++;return {tasks:[]};}},loadScrollStats:()=>new Promise(resolve=>finishStats=resolve),
 render:()=>{assert.equal(ctx.plannerReady,true);renders++;},document:{readyState:'loading',addEventListener:(name,fn)=>{assert.equal(name,'DOMContentLoaded');ready=fn;},dispatchEvent:()=>events++}});
 vm.runInContext(source,ctx);assert.equal(reads,0);assert.equal(renders,0);
 const started=ready();assert.equal(reads,1);assert.equal(renders,0);assert.equal(ready(),started);
 finishStats();await started;assert.equal(renders,1);assert.equal(events,1);assert.equal(ctx.view,'settings');
});
test('planner initial data is loaded only by central bootstrap',()=>{
 for(const name of ['app.js','productivity.js','workspace.js','voice.js'])assert.doesNotMatch(fs.readFileSync(name,'utf8'),/\bStore\.get\(\)\.then/);
 const html=fs.readFileSync('index.html','utf8');assert.ok(html.indexOf('bootstrap.js')>html.indexOf('awareness.js'));assert.ok(!html.includes('src="calendar.js'));
});

