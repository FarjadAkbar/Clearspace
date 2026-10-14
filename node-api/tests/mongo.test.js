import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient} from 'mongodb';
import {randomUUID} from 'node:crypto';
import {MongoProtection} from '../src/protection.js';
test('Mongo counter uses atomic update and lease ownership is checked',async()=>{
 const calls=[];const quotas={findOneAndUpdate:async(query,update,options)=>{calls.push({query,update,options});return {count:3,expiresAt:new Date(Date.now()+60000)};},createIndex:async()=>{}};
 const leases={findOneAndUpdate:async()=>{const error=Error('active');error.code=11000;throw error;},deleteOne:async query=>calls.push(query),createIndex:async()=>{}};
 const store=new MongoProtection({collection:name=>name==='quotas'?quotas:leases});await store.initialize();assert.equal((await store.increment('user',60))[0],3);assert.equal(calls[0].options.upsert,true);assert.ok(Array.isArray(calls[0].update));assert.equal(await store.acquire('busy','new-owner',55),false);await store.release('busy','owner');assert.deepEqual(calls.at(-1),{_id:'busy',owner:'owner'});
});
test('Atlas integration: concurrent quotas, expired records and owner-checked leases',{skip:!process.env.TEST_MONGODB_URI},async()=>{
 const client=new MongoClient(process.env.TEST_MONGODB_URI);await client.connect();const db=client.db('clearspace_test_'+randomUUID().replaceAll('-',''));
 try{const store=new MongoProtection(db);await store.initialize();const values=await Promise.all(Array.from({length:25},()=>store.increment('one',60)));assert.deepEqual(values.map(v=>v[0]).sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i+1));await db.collection('quotas').updateOne({_id:'one'},{$set:{expiresAt:new Date(0)}});assert.equal((await store.increment('one',60))[0],1);assert.equal(await store.acquire('busy','a',55),true);assert.equal(await store.acquire('busy','b',55),false);await store.release('busy','b');assert.equal(await store.acquire('busy','b',55),false);await store.release('busy','a');assert.equal(await store.acquire('busy','b',55),true);}finally{await db.dropDatabase();await client.close();}
});
