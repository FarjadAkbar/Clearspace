const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(fetch){const ctx=vm.createContext({fetch});vm.runInContext(fs.readFileSync('extension/service-api.js','utf8')+';globalThis.api=ClearspaceAPI;',ctx);return ctx.api;}
test('service requests send feature inputs to the fixed server without a provider key',async()=>{let request;const api=setup(async(url,options)=>{request={url,options};return {ok:true,json:async()=>({items:[]})};});await api.request('organize',{transcript:'hello',date:'2026-10-07'});assert.equal(request.url,'https://clearspace.decentgatewaysllc.com/api/clearspace/organize');assert.equal(request.options.credentials,'omit');assert.equal(request.options.headers.Authorization,undefined);assert.equal(JSON.parse(request.options.body).transcript,'hello');});
test('unsupported features and API quota failures are reported',async()=>{const api=setup(async()=>({ok:false,status:429}));await assert.rejects(api.request('other',{}),/Unknown/);await assert.rejects(api.request('job-match',{}),/Usage limit/);});
test('repeated successful inputs reuse a recent result, changed inputs make a new call',async()=>{
 let calls=0;const api=setup(async()=>{calls++;return {ok:true,json:async()=>({items:[{title:'one'}]})};});
 const first=await api.request('organize',{transcript:'first'});first.items[0].title='edited';
 const again=await api.request('organize',{transcript:'first'});assert.equal(again.items[0].title,'one');assert.equal(calls,1);
 await api.request('organize',{transcript:'second'});assert.equal(calls,2);
});
test('failed second request releases state so a third request succeeds without refreshing',async()=>{
 let calls=0;const api=setup(async()=>++calls===2?{ok:false,status:500}:{ok:true,json:async()=>({items:[]})});
 await api.request('organize',{transcript:'first'});
 await assert.rejects(api.request('organize',{transcript:'second'}),/HTTP 500/);
 await api.request('organize',{transcript:'second'});assert.equal(calls,3);assert.equal(api.pending.size,0);
});
test('overlapping requests do not produce duplicate API calls',async()=>{
 let finish,calls=0;const api=setup(()=>{calls++;return new Promise(resolve=>finish=resolve);});
 const first=api.request('job-match',{cv:'cv',job:'job'});
 await assert.rejects(api.request('job-match',{cv:'cv',job:'job'}),/already running/);assert.equal(calls,1);
 finish({ok:true,json:async()=>({score:80})});await first;assert.equal(api.pending.size,0);
});
test('aborted and invalid responses are not cached and can be retried',async()=>{
 let calls=0;const api=setup(async()=>{calls++;if(calls===1){const error=Error('cancel');error.name='AbortError';throw error;}if(calls===2)return {ok:true,json:async()=>{throw Error('invalid');}};return {ok:true,json:async()=>({items:[]})};});
 await assert.rejects(api.request('organize',{}),{name:'AbortError'});
 await assert.rejects(api.request('organize',{}),/invalid response/);
 await api.request('organize',{});assert.equal(calls,3);assert.equal(api.pending.size,0);
});
test('AI is never called merely by loading the API script',()=>{
 let calls=0;setup(async()=>{calls++;});assert.equal(calls,0);
});
