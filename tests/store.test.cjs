const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function context(){let data={};const ctx=vm.createContext({Date,crypto:require('node:crypto').webcrypto,localStorage:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v}});vm.runInContext(fs.readFileSync('store.js','utf8')+';globalThis.api={Store,dayKey};',ctx);return ctx.api;}
test('empty store starts with task and session collections',async()=>{const {Store}=context();const s=await Store.get();assert.equal(s.tasks.length,0);assert.equal(s.sessions.length,0);assert.equal(s.timer,null);});
test('capture persists through storage reads',async()=>{const {Store}=context();await Store.update(s=>s.tasks.push({id:'one',title:'Reply to a message'}));const s=await Store.get();assert.equal(s.tasks[0].title,'Reply to a message');await Store.update(s=>s.tasks[0].done=true);assert.equal((await Store.get()).tasks[0].done,true);});
test('day key is an ISO local calendar date',()=>{assert.match(context().dayKey(),/^\d{4}-\d{2}-\d{2}$/);});
test('thought extraction preserves Urdu, next steps and completion without HTML',()=>{
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync('store.js','utf8')+';globalThis.extract=thoughtsText;',ctx);
 const text=ctx.extract([{title:'کل اسائنمنٹ',done:false,nextSteps:[{title:'تحقیق کرنا',done:true}]},{title:'Reply',done:true}]);
 assert.match(text,/کل اسائنمنٹ/);assert.match(text,/\[x\] تحقیق کرنا/);assert.match(text,/\[Done\] Reply/);
});
test('saved thoughts survive a new extension page context',async()=>{
 const storage={};const create=()=>{const ctx=vm.createContext({chrome:{storage:{local:{get:async key=>({[key]:storage[key]}),set:async value=>Object.assign(storage,value)}}}});vm.runInContext(fs.readFileSync('store.js','utf8')+';globalThis.store=Store;',ctx);return ctx.store;};
 await create().update(s=>s.tasks.push({id:'saved',title:'My thought'}));const reopened=await create().get();assert.equal(reopened.tasks[0].title,'My thought');
});
