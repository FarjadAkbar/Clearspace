const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const ctx=vm.createContext({document:{addEventListener:()=>{}},Date,dayKey:()=> '2026-10-06',bind:()=>{}});vm.runInContext(fs.readFileSync('extension/calendar.js','utf8')+';globalThis.days=monthDays;',ctx);
test('calendar is Monday-first and spans leap day and month edges',()=>{const days=ctx.days('2028-02');assert.equal(days.length,42);assert.equal(new Date(days[0]+'T12:00:00').getDay(),1);assert.ok(days.includes('2028-02-29'));assert.equal(new Set(days).size,42);});

