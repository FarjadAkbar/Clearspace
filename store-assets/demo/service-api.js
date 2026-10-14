const ClearspaceAPI={
 base:'https://decentgatewaysllc.com/api/clearspace',
 async request(feature,data,signal){
  if(!['organize','job-match'].includes(feature))throw Error('Unknown AI feature.');
  const response=await fetch(`${this.base}/${feature}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data),signal,redirect:'error',credentials:'omit'});
  if(!response.ok){const messages={401:'Your access could not be verified.',402:'This feature requires an active plan.',403:'This feature is unavailable for your account.',404:'The AI service is not deployed yet.',422:'Check your text and try again.',429:'Usage limit reached. Please try again later.',503:'The AI service is not configured yet.'};throw Error(messages[response.status]||'The AI service could not complete your request. Please try again later.');}
  return response.json();
 }
};
