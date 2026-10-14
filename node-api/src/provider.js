export class ServiceError extends Error{
 constructor(status,message,retryAfter){super(message);this.statusCode=status;this.retryAfter=retryAfter;}
}
export async function providerCall(config,feature,text,fetchImpl=fetch){
 let response;
 try{
  response=await fetchImpl(config.provider,{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({model:'deepseek-ai/deepseek-v4.1-flash',messages:[{role:'system',content:config.prompts[feature]},{role:'user',content:text}],temperature:.1,max_completion_tokens:4096,reasoning_effort:'none',stream:false}),redirect:'error',signal:AbortSignal.timeout(45000)});
  if(!response.ok){await response.body?.cancel();throw new ServiceError(response.status===429?429:502,'AI provider could not complete the request');}
  const reader=response.body.getReader();let bytes=0;const parts=[];
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>100000){await reader.cancel();throw Error('Output too large');}parts.push(value);}
  const payload=JSON.parse(Buffer.concat(parts).toString('utf8')),choice=payload.choices?.[0];
  if(!choice||choice.finish_reason==='length'||typeof choice.message?.content!=='string')throw Error('Invalid output');
  return JSON.parse(choice.message.content.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
 }catch(error){if(error instanceof ServiceError)throw error;throw new ServiceError(502,'Invalid or unavailable AI response');}
}
