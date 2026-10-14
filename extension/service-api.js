const ClearspaceAPI={
 base:'https://clearspace.decentgatewaysllc.com/api/clearspace',
 // Keep only the most recent successful result for each feature, in this page's
 // memory. No polling, automatic retries, or persistent copies of CV/transcripts.
 pending:new Map(),recent:new Map(),
 async uploadResume(file){
  const form=new FormData();form.append('file',file);
  const response=await fetch(`${this.base}/resume-extract`,{method:'POST',body:form,credentials:'omit',redirect:'error'});
  if(!response.ok)throw Error(`Could not read this file (HTTP ${response.status}). Use a text-based PDF, DOCX or TXT under 5 MB.`);
  const result=await response.json();if(typeof result.text!=='string'||result.text.length>30000)throw Error('Invalid extracted resume.');return result;
 },
 async request(feature,data,signal){
  if(!['organize','job-match'].includes(feature))throw Error('Unknown AI feature.');
  if(signal?.aborted){const error=Error('Request cancelled.');error.name='AbortError';throw error;}
  const body=JSON.stringify(data),cached=this.recent.get(feature);
  if(cached&&cached.body===body&&Date.now()-cached.time<300000)return JSON.parse(cached.result);
  if(this.pending.has(feature))throw Error('A request for this feature is already running. Wait for it to finish or cancel it.');
  this.pending.set(feature,true);
  try{
   const response=await fetch(`${this.base}/${feature}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body,signal,redirect:'error',credentials:'omit'});
   if(!response.ok){
    const messages={401:'Your access could not be verified.',402:'This feature requires an active plan.',403:'This feature is unavailable for your account.',404:'The AI service is not deployed yet.',422:'Check your text and try again.',429:'Usage limit reached. Please try again later.',500:'The Clearspace server failed to process this request. You can try again without refreshing.',502:'The AI provider could not complete this request. You can try again without refreshing.',503:'The AI service is temporarily unavailable.',504:'The AI service took too long to respond. You can try again without refreshing.'};
    const error=Error((messages[response.status]||'The AI service could not complete your request.')+` (HTTP ${response.status})`);
    error.status=response.status;
    const requestId=response.headers?.get?.('X-Request-ID');
    if(requestId&&/^[a-zA-Z0-9_-]{1,100}$/.test(requestId))error.message+=` Reference: ${requestId}.`;
    throw error;
   }
   let payload;try{payload=await response.json();}catch{throw Error('The AI service returned an invalid response. You can try again without refreshing.');}
   // Validate before caching so a malformed result cannot poison later attempts.
   if(feature==='organize'&&typeof Organize!=='undefined')Organize.parse(JSON.stringify(payload));
   if(feature==='job-match'&&typeof JobMatch!=='undefined')JobMatch.parse(JSON.stringify(payload),data.cv,data.job);
   this.recent.set(feature,{body,time:Date.now(),result:JSON.stringify(payload)});
   return payload;
  }finally{this.pending.delete(feature);}
 }
};
