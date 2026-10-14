import {config} from './config.js';
import {connectProtection} from './protection.js';
import {buildApp} from './app.js';
import {startupError,startupDiagnostic} from './diagnostics.js';
let app,connection,stage='CONFIG';
try{
 if(Number(process.versions.node.split('.')[0])<24)throw startupError('NODE_VERSION');
 const settings=config();stage='ATLAS';connection=await connectProtection(settings.uri,settings.database);
 stage='APP';app=await buildApp({config:settings,store:connection.store});
 stage='LISTEN';await app.listen({host:settings.host,port:settings.port});console.log('Clearspace API started.');
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();await connection.close();process.exit(0);});
}catch(error){console.error(startupDiagnostic(stage,error));await app?.close();await connection?.close();process.exitCode=1;}
