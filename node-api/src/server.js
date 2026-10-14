import {config} from './config.js';
import {connectProtection} from './protection.js';
import {buildApp} from './app.js';
let app,connection;
try{
 const settings=config();connection=await connectProtection(settings.uri,settings.database);app=await buildApp({config:settings,store:connection.store});
 await app.listen({host:settings.host,port:settings.port});console.log('Clearspace API started.');
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();await connection.close();process.exit(0);});
}catch{console.error('Clearspace API could not start. Check server configuration and Atlas access.');await app?.close();await connection?.close();process.exitCode=1;}
