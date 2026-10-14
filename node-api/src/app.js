import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import {randomUUID,randomBytes,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {jobInput,organizeInput,thoughts,verifyAssessment,experienceTimeline} from './analysis.js';
import {redact} from './privacy.js';
import {ServiceError,providerCall} from './provider.js';
import {parseDocument} from './files.js';
export async function buildApp({config,store,provider=providerCall,parser=parseDocument}){
 const app=Fastify({logger:false,bodyLimit:6*1024*1024,requestTimeout:15000,trustProxy:config.trustProxy.length?config.trustProxy:false,genReqId:()=>randomUUID()});
 await app.register(helmet);await app.register(cors,{origin:config.origins,credentials:false,methods:['GET','POST'],allowedHeaders:['Content-Type','Authorization'],exposedHeaders:['X-Request-ID','Retry-After']});
 await app.register(multipart,{limits:{fileSize:5*1024*1024,files:1,fields:0,parts:1,headerPairs:100}});
 const quota=async(key,limit,seconds)=>{
  let count,ttl;try{[count,ttl]=await store.increment(key,seconds);}catch{throw new ServiceError(503,'Request protection is temporarily unavailable');}
  if(count>limit)throw new ServiceError(429,'Usage limit reached',ttl);
 };
 app.addHook('onRequest',async(req,reply)=>{
  reply.header('X-Request-ID',req.id).header('Cache-Control','no-store');
  const hostname=(req.headers.host||'').toLowerCase().split(':')[0];
  if(!['clearspace.decentgatewaysllc.com','localhost','127.0.0.1'].includes(hostname))throw new ServiceError(400,'Invalid host');
  if(req.url.split('?')[0]==='/health'||req.method==='OPTIONS')return;
  const auth=req.headers.authorization;
  if(auth){
   if(!auth.startsWith('Bearer ')||auth.length>512)throw new ServiceError(401,'Invalid access token');
   const hash=createHash('sha256').update(auth.slice(7)).digest('hex');
   if(!config.hashes.some(value=>timingSafeEqual(Buffer.from(hash),Buffer.from(value))))throw new ServiceError(401,'Invalid access token');
   req.identity='token:'+hash;
  }else{
   if(!config.publicAccess)throw new ServiceError(401,'Access token required');
   req.identity='ip:'+createHmac('sha256',config.secret).update(req.ip).digest('hex');
  }
  await quota('requests:'+req.identity,60,60);
 });
 app.setErrorHandler((error,req,reply)=>{
  if(error instanceof ServiceError){if(error.retryAfter)reply.header('Retry-After',String(error.retryAfter));return reply.code(error.statusCode).send({message:error.message});}
  const status=error.statusCode===413||['FST_REQ_FILE_TOO_LARGE','FST_ERR_CTP_BODY_TOO_LARGE'].includes(error.code)?413:error.statusCode>=400&&error.statusCode<500?error.statusCode:500;
  return reply.code(status).send({message:status===413?'Maximum upload is 5 MB; maximum request is 6 MB.':status<500?'Invalid request. Check the required fields and file format.':'Service error',requestId:req.id});
 });
 const ask=async(req,feature,text)=>{
  await quota('ai-hour:'+req.identity,10,3600);await quota('ai-day:'+req.identity,25,86400);await quota('ai-global-day',config.daily,86400);
  const lease='busy:'+req.identity,owner=randomBytes(16).toString('hex');let acquired;
  try{acquired=await store.acquire(lease,owner,55);}catch{throw new ServiceError(503,'Request protection is temporarily unavailable');}
  if(!acquired)throw new ServiceError(409,'An AI request is already running');
  try{return await provider(config,feature,text);}
  finally{try{await store.release(lease,owner);}catch{throw new ServiceError(503,'Request protection is temporarily unavailable');}}
 };
 const input=(schema,body)=>{const result=schema.safeParse(body);if(!result.success)throw new ServiceError(422,'Invalid input. Check text length and required fields.');return result.data;};
 app.get('/health',async()=>({status:'ok'}));
 app.post('/api/clearspace/job-match',async req=>{
  const data=input(jobInput,req.body);let cv;
  try{cv=redact(data.cv,data.candidateName);}catch{throw new ServiceError(422,'Provide the candidate name for redaction or a CV with a separate header line.');}
  const job=redact(data.job,'',false);
  const result=await ask(req,'job-match',JSON.stringify({cv,jobDescription:job,experienceTimeline:experienceTimeline(cv)}));
  try{return verifyAssessment(result,cv,job);}catch{throw new ServiceError(502,'Unverifiable AI assessment');}
 });
 app.post('/api/clearspace/organize',async req=>{
  const data=input(organizeInput,req.body),result=await ask(req,'organize',JSON.stringify({date:data.date,transcript:redact(data.transcript,'',false)}));
  const parsed=thoughts.safeParse(result);if(!parsed.success)throw new ServiceError(502,'Invalid AI response');return parsed.data;
 });
 app.post('/api/clearspace/resume-extract',async req=>{
  await quota('uploads:'+req.identity,10,3600);
  const part=await req.file();if(!part||!/^.+\.(pdf|docx|txt)$/i.test(part.filename))throw new ServiceError(422,'Use PDF, DOCX or TXT');
  const content=await part.toBuffer();if(part.file.truncated)throw new ServiceError(413,'Maximum upload size is 5 MB');
  const text=await parser(content,part.filename);let safe;
  try{safe=redact(text);}catch{throw new ServiceError(422,'Could not identify a safe resume header. Paste your CV and supply your name for redaction.');}
  return {text:safe,redactionNotice:'Automatic redaction can miss names, especially Urdu names. Review the text before running a match.'};
 });
 return app;
}
