import test from 'node:test';
import assert from 'node:assert/strict';
import {config} from '../src/config.js';
import {startupDiagnostic} from '../src/diagnostics.js';
const valid={HIVE_API_KEY:'private-key',RATE_LIMIT_SECRET:'x'.repeat(48),PUBLIC_ACCESS:'true',MONGODB_URI:'mongodb+srv://user:private-password@cluster.example/'};
test('configuration errors identify the field without exposing secret values',()=>{
 for(const [key,value,code] of [['HIVE_API_KEY','','CONFIG_HIVE_KEY'],['RATE_LIMIT_SECRET','short','CONFIG_RATE_SECRET'],['PUBLIC_ACCESS','false','CONFIG_ACCESS_MODE'],['MONGODB_URI','','CONFIG_MONGO_URI'],['ACCESS_TOKEN_HASHES','private-invalid-json','CONFIG_ACCESS_HASHES']]){
  try{config({...valid,[key]:value});assert.fail('must reject');}catch(error){assert.equal(error.code,code);const output=startupDiagnostic('CONFIG',error);assert.ok(!output.includes('private-password'));assert.ok(!output.includes('private-key'));assert.ok(!output.includes('private-invalid-json'));}
 }
});
test('unknown driver errors never expose their raw message or connection string',()=>{
 const output=startupDiagnostic('ATLAS',{code:'UNKNOWN',message:'mongodb+srv://user:secret@private-host'});assert.match(output,/ATLAS\/STARTUP_FAILURE/);assert.ok(!output.includes('secret'));assert.ok(!output.includes('private-host'));
});
