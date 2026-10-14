import {z} from 'zod';
const text=(min,max)=>z.string().trim().min(min).max(max);
const iso=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
export const jobInput=z.object({cv:text(80,30000),job:text(80,30000),candidateName:text(0,150).default('')}).strict();
export const organizeInput=z.object({transcript:text(1,20000),date:iso}).strict();
export const thoughts=z.object({items:z.array(z.object({title:text(1,500),kind:z.enum(['task','idea','note']),nextSteps:z.array(text(1,500)).max(15).default([]),dueDate:iso.nullable().default(null)}).strict()).max(50)}).strict();
const requirement=z.object({requirement:text(1,500),category:z.enum(['skill','experience','education','certification']),importance:z.enum(['required','preferred']),status:z.enum(['met','partial','missing','unknown']),jobEvidence:text(3,1000),cvEvidence:text(0,1000).default(''),basis:z.enum(['exact','transferable','demonstrated','none']).default('none')}).strict();
const assessment=z.object({requirements:z.array(requirement).min(1).max(20),suggestions:z.array(text(0,800)).max(3).default([])}).strict();
export function verifyAssessment(data,cv,job){
 const result=assessment.parse(data),seen=new Set();
 result.requirements=result.requirements.filter(row=>{
  if(/^(low ego(?: and organisational awareness)?|obsession with customer outcomes|exercise judgement|systems thinking|solution-oriented approach)$/iu.test(row.requirement))return false;
  if(!job.toLowerCase().includes(row.jobEvidence.toLowerCase()))throw Error('Unverified job evidence');
  if(['met','partial'].includes(row.status)&&(row.cvEvidence.length<3||!cv.toLowerCase().includes(row.cvEvidence.toLowerCase())||row.cvEvidence.includes('[REDACTED'))){row.status='unknown';row.cvEvidence='';row.basis='none';}
  if(row.status==='met'&&row.basis==='transferable')row.status='partial';
  const key=row.requirement.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();if(seen.has(key))return false;seen.add(key);return true;
 });
 if(!result.requirements.length)throw Error('No concrete requirements');
 const weight=row=>row.importance==='required'?2:1;
 const total=result.requirements.reduce((n,r)=>n+weight(r),0),earned=result.requirements.reduce((n,r)=>n+weight(r)*({met:1,partial:.5,missing:0,unknown:0}[r.status]),0);
 const order=r=>(r.importance==='required'?0:2)+(['missing','unknown'].includes(r.status)?0:1);
 result.suggestions=result.requirements.filter(r=>r.status!=='met').sort((a,b)=>order(a)-order(b)).slice(0,3).map(r=>{
  const label=r.requirement.slice(0,180),quote=r.cvEvidence.slice(0,200);
  if(r.status==='partial'&&r.basis==='transferable')return `${label}: retain your existing evidence (${quote}). Explain the transferable work; do not claim the requested tool unless you have used it.`;
  if(quote)return `${label}: expand the existing example (${quote}) with your actual responsibility and outcome. Add numbers only if you can verify them.`;
  return `${label}: your CV has no verified example. If you have this experience, add a specific project or role demonstrating it; otherwise keep it as a skill gap.`;
 });
 return {...result,score:Math.round(earned/total*100)};
}
export function experienceTimeline(cv,today=new Date()){
 const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
 const date='(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+)?(?:19|20)\\d{2}';
 const range=new RegExp('('+date+')\\s*(?:[-–—]|to)\\s*('+date+'|present|current|now)','giu');
 const index=value=>{
  if(/^(present|current|now)$/i.test(value))return today.getUTCFullYear()*12+today.getUTCMonth();
  const month=months.indexOf(value.slice(0,3).toLowerCase());return month<0?null:Number(value.match(/\d{4}/)[0])*12+month;
 };
 let active=false;const spans=[],evidence=[];
 for(const line of cv.split(/\r?\n/)){
  const heading=line.trim().toLowerCase().replace(/:$/,'');
  if(['experience','work experience','professional experience','employment history','employment','career history'].includes(heading)){active=true;continue;}
  if(['education','projects','skills','certifications','volunteering','summary','references'].includes(heading))active=false;
  if(!active)continue;
  for(const match of line.matchAll(range)){const a=index(match[1]),b=index(match[2]);if(a!==null&&b!==null&&a<=b&&b<=today.getUTCFullYear()*12+today.getUTCMonth()){spans.push([a,b]);evidence.push(match[0]);}}
 }
 const merged=[];for(const [a,b] of spans.sort((a,b)=>a[0]-b[0])){const last=merged.at(-1);if(last&&a<=last[1])last[1]=Math.max(b,last[1]);else merged.push([a,b]);}
 return {years:merged.length?Math.round(merged.reduce((n,[a,b])=>n+b-a,0)/12*100)/100:null,evidence,note:'Month-based, non-overlapping work-section dates only; duration does not establish time using a specific technology.'};
}
