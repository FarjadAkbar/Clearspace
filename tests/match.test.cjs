const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const ctx=vm.createContext({URL});vm.runInContext(fs.readFileSync('match-core.js','utf8')+';globalThis.match=JobMatch;',ctx);
const cv='Built applications with JavaScript and SQL.',job='Must have JavaScript experience. SQL preferred.';
const requirements=[{requirement:'JavaScript',importance:'required',status:'met',jobEvidence:'JavaScript experience',cvEvidence:'JavaScript'},{requirement:'SQL',importance:'preferred',status:'partial',jobEvidence:'SQL preferred',cvEvidence:'SQL'}];
test('weighted score is computed locally from evidenced requirements',()=>{assert.equal(ctx.match.parse(JSON.stringify({requirements}),cv,job).score,83);});
test('unsupported CV evidence is downgraded to unknown rather than credited',()=>{const r=ctx.match.parse(JSON.stringify({requirements:[{...requirements[0],cvEvidence:'Five years of JavaScript'}]}),cv,job);assert.equal(r.score,0);assert.equal(r.unknown,1);});
test('invented job requirements and invalid schemas cannot produce a score',()=>{for(const content of ['{}','plain prose',JSON.stringify({requirements:[{...requirements[0],jobEvidence:'Must have Python'}]}),JSON.stringify({requirements:[{...requirements[0],status:'excellent'}]})])assert.throws(()=>ctx.match.parse(content,cv,job));});
test('CV and job are transmitted as data and identity scoring is excluded',()=>{const messages=ctx.match.messages(cv,job);assert.equal(JSON.parse(messages[1].content).cv,cv);assert.ok(messages[0].content.includes('UNTRUSTED DATA'));assert.ok(messages[0].content.includes('Never score personal identity'));});
test('generic personality and aspirational duties do not lower the qualification score',()=>{
 const generic=['Obsession with customer outcomes','Systems thinking','Low ego and organisational awareness','Solution-oriented approach','Discover the right problem','Earn the customer’s trust','Make delivery repeatable','Follow through after launch','Improve the factory','Exercise judgement'];
 const jobText=job+' '+generic.join('. ');
 const rows=[requirements[0],...generic.map(requirement=>({requirement,importance:'required',status:'missing',jobEvidence:requirement,cvEvidence:''}))];
 const result=ctx.match.parse(JSON.stringify({requirements:rows}),cv,jobText);
 assert.equal(result.score,100);assert.equal(result.requirements.length,1);assert.equal(result.excluded,generic.length);
});
test('concrete customer delivery and integrations remain scored even when missing',()=>{
 const requirement={requirement:'Enterprise integrations',category:'experience',importance:'required',status:'missing',jobEvidence:'Enterprise integrations',cvEvidence:''};
 const result=ctx.match.parse(JSON.stringify({requirements:[requirements[0],requirement]}),cv,job+' Enterprise integrations');assert.equal(result.score,50);assert.equal(result.requirements.length,2);
});
test('repeated requirements do not add extra penalty and only generic results cannot yield a score',()=>{
 const result=ctx.match.parse(JSON.stringify({requirements:[requirements[0],requirements[1],requirements[1]]}),cv,job);assert.equal(result.score,83);assert.equal(result.requirements.length,2);
 assert.throws(()=>ctx.match.parse(JSON.stringify({requirements:[{requirement:'Low ego',importance:'required',status:'missing',jobEvidence:'Low ego',cvEvidence:''}]}),cv,'Low ego'),/No concrete qualifications/);
});
test('server and local fallback use the same concrete qualification prompt',()=>{
 const prompts=JSON.parse(fs.readFileSync('api-examples/prompts.json','utf8'));assert.equal(ctx.match.messages(cv,job)[0].content,prompts['job-match']);assert.match(prompts['job-match'],/Python OR TypeScript/);
});
test('transferable skill evidence earns partial credit without treating tools as identical',()=>{
 const row={requirement:'Redux',importance:'required',status:'met',category:'skill',jobEvidence:'Redux experience',cvEvidence:'Zustand',basis:'transferable'};
 const result=ctx.match.parse(JSON.stringify({requirements:[row]}),'Built frontend state with Zustand','Redux experience required');assert.equal(result.score,50);
});
