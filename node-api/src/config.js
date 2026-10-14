import {readFileSync} from 'node:fs';
export function config(env=process.env){
 const hashes=JSON.parse(env.ACCESS_TOKEN_HASHES||'[]');
 const providers=['https://api.thehive.ai/api/v3/chat/completions','https://api-cdn.thehive.ai/api/v3/chat/completions','https://api-va1.thehive.ai/api/v3/chat/completions'];
 const value={key:env.HIVE_API_KEY,provider:env.HIVE_ENDPOINT||providers[0],secret:env.RATE_LIMIT_SECRET,publicAccess:env.PUBLIC_ACCESS==='true',hashes,origins:(env.CORS_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean),daily:Number(env.GLOBAL_AI_DAILY_LIMIT||50),trustProxy:(env.TRUST_PROXY||'').split(',').map(v=>v.trim()).filter(Boolean),port:Number(env.PORT||8000),host:env.HOST||'127.0.0.1',database:env.MONGODB_DATABASE||'clearspace',uri:env.MONGODB_URI};
 if(!value.key||!value.secret||value.secret.length<32||!providers.includes(value.provider)||!Array.isArray(hashes)||hashes.some(v=>typeof v!=='string'||!/^[a-f0-9]{64}$/i.test(v))||(!value.publicAccess&&!hashes.length)||!Number.isInteger(value.daily)||value.daily<1||value.daily>10000||value.trustProxy.includes('*'))throw Error('Invalid server configuration');
 value.prompts=JSON.parse(readFileSync(new URL('./prompts.json',import.meta.url),'utf8'));
 return value;
}
