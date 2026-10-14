import {readFileSync} from 'node:fs';
import {startupError} from './diagnostics.js';
export function config(env=process.env){
 let hashes;try{hashes=JSON.parse(env.ACCESS_TOKEN_HASHES||'[]');}catch{throw startupError('CONFIG_ACCESS_HASHES');}
 const providers=['https://api.thehive.ai/api/v3/chat/completions','https://api-cdn.thehive.ai/api/v3/chat/completions','https://api-va1.thehive.ai/api/v3/chat/completions'];
 const value={key:env.HIVE_API_KEY,provider:env.HIVE_ENDPOINT||providers[0],secret:env.RATE_LIMIT_SECRET,publicAccess:env.PUBLIC_ACCESS==='true',hashes,origins:(env.CORS_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean),daily:Number(env.GLOBAL_AI_DAILY_LIMIT||50),trustProxy:(env.TRUST_PROXY||'').split(',').map(v=>v.trim()).filter(Boolean),port:Number(env.PORT||8000),host:env.HOST||'127.0.0.1',database:env.MONGODB_DATABASE||'clearspace',uri:env.MONGODB_URI};
 const check=(condition,code)=>{if(!condition)throw startupError(code);};
 check(typeof value.key==='string'&&value.key.trim().length>0,'CONFIG_HIVE_KEY');
 check(typeof value.secret==='string'&&value.secret.length>=32,'CONFIG_RATE_SECRET');
 check(providers.includes(value.provider),'CONFIG_PROVIDER');
 check(Array.isArray(hashes)&&hashes.every(v=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v)),'CONFIG_ACCESS_HASHES');
 check(value.publicAccess||hashes.length>0,'CONFIG_ACCESS_MODE');
 check(Number.isInteger(value.daily)&&value.daily>=1&&value.daily<=10000,'CONFIG_DAILY_LIMIT');
 check(!value.trustProxy.includes('*'),'CONFIG_PROXY');
 check(Number.isInteger(value.port)&&value.port>=1&&value.port<=65535,'CONFIG_PORT');
 check(typeof value.uri==='string'&&value.uri.startsWith('mongodb+srv://'),'CONFIG_MONGO_URI');
 try{value.prompts=JSON.parse(readFileSync(new URL('./prompts.json',import.meta.url),'utf8'));if(!['organize','job-match'].every(k=>typeof value.prompts[k]==='string'&&value.prompts[k].trim()))throw Error();}catch{throw startupError('CONFIG_PROMPTS');}
 return value;
}
