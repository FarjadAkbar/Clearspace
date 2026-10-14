export function startupError(code){const error=new Error(code);error.code=code;return error;}
const hints={
 CONFIG_HIVE_KEY:'Set HIVE_API_KEY in the server environment.',
 CONFIG_RATE_SECRET:'Set RATE_LIMIT_SECRET to at least 32 characters.',
 CONFIG_PROVIDER:'HIVE_ENDPOINT must be a supported Hive HTTPS endpoint.',
 CONFIG_ACCESS_HASHES:'ACCESS_TOKEN_HASHES must be a JSON array of SHA-256 hashes.',
 CONFIG_ACCESS_MODE:'Set PUBLIC_ACCESS=true for the public demo, or configure private access tokens.',
 CONFIG_DAILY_LIMIT:'GLOBAL_AI_DAILY_LIMIT must be an integer between 1 and 10000.',
 CONFIG_PROXY:'TRUST_PROXY cannot contain a wildcard.',
 CONFIG_PORT:'PORT must be an integer between 1 and 65535.',
 CONFIG_MONGO_URI:'Set MONGODB_URI to the Atlas mongodb+srv connection string.',
 CONFIG_PROMPTS:'src/prompts.json is missing or invalid.',
 NODE_VERSION:'Use Node.js 24 or newer.',
 MONGO_AUTH:'Atlas rejected the database credentials. Check database user and encoded password.',
 MONGO_PERMISSION:'Atlas user lacks permission to create quota collections/indexes. Grant readWrite on the configured database.',
 MONGO_DNS:'Atlas hostname lookup failed. Check the cluster URI and hosting DNS support.',
 MONGO_CONNECT:'Atlas connection failed. Check server outbound IP access, credentials, cluster availability, and outbound network permissions.',
 EADDRINUSE:'The configured port is already occupied. Stop the old process or select a different PORT.',
 EACCES:'The service cannot bind this address/port. Check HOST and PORT.'
};
export function startupDiagnostic(stage,error){
 const code=Object.hasOwn(hints,error?.code)?error.code:'STARTUP_FAILURE';
 return `Clearspace startup failed [${stage}/${code}]. ${hints[code]||'Check this stage of the deployment. No credentials are included in this diagnostic.'}`;
}
