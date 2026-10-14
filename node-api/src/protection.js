import {MongoClient} from 'mongodb';
export class MongoProtection{
 constructor(db){this.quotas=db.collection('quotas');this.leases=db.collection('leases');}
 async initialize(){await this.quotas.createIndex({expiresAt:1},{expireAfterSeconds:0});await this.leases.createIndex({expiresAt:1},{expireAfterSeconds:0});}
 async increment(key,seconds){
  const now=new Date();
  const alive={$gt:[{$ifNull:['$expiresAt',new Date(0)]},'$$NOW']};
  const update=[{$set:{count:{$cond:[alive,{$add:['$count',1]},1]},expiresAt:{$cond:[alive,'$expiresAt',{$dateAdd:{startDate:'$$NOW',unit:'second',amount:seconds}}]}}}];
  let result;
  for(let attempt=0;attempt<2;attempt++){try{result=await this.quotas.findOneAndUpdate({_id:key},update,{upsert:true,returnDocument:'after',includeResultMetadata:false});break;}catch(error){if(error.code!==11000||attempt)throw error;}}
  return [result.count,Math.max(1,Math.ceil((result.expiresAt-now)/1000))];
 }
 async acquire(key,owner,seconds){
  try{await this.leases.findOneAndUpdate({_id:key,expiresAt:{$lte:new Date()}},{$set:{owner,expiresAt:new Date(Date.now()+seconds*1000)}},{upsert:true});return true;}
  catch(error){if(error.code===11000)return false;throw error;}
 }
 async release(key,owner){await this.leases.deleteOne({_id:key,owner});}
}
export async function connectProtection(uri,database){
 if(!uri?.startsWith('mongodb+srv://'))throw Error('Use a MongoDB Atlas SRV connection string');
 const client=new MongoClient(uri,{tls:true,maxPoolSize:10,serverSelectionTimeoutMS:5000,connectTimeoutMS:5000,socketTimeoutMS:5000,writeConcern:{w:'majority'}});
 try{await client.connect();const store=new MongoProtection(client.db(database));await store.initialize();return {store,close:()=>client.close()};}
 catch{await client.close();throw Error('Cannot connect to the quota database');}
}
