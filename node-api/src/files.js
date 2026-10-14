import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ServiceError} from './provider.js';
export function parseDocument(content,filename){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,['--max-old-space-size=128',fileURLToPath(new URL('./parse-worker.js',import.meta.url))],{stdio:['pipe','pipe','pipe'],windowsHide:true,env:{NODE_ENV:'production',...(process.env.SystemRoot?{SystemRoot:process.env.SystemRoot}:{})}});
 let output='',settled=false;
 const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timeout);error?reject(error):resolve(value);};
 const invalid=()=>new ServiceError(422,'Cannot safely read this file. Use a text-based PDF, DOCX or TXT under 5 MB.');
 const timeout=setTimeout(()=>{child.kill();finish(invalid());},10000);
 child.stdout.on('data',chunk=>{output+=chunk.toString();if(Buffer.byteLength(output)>400000){child.kill();finish(invalid());}});
 // Drain parser diagnostics without logging private document content.
 child.stderr.on('data',()=>{});child.stdin.on('error',()=>{});child.on('error',()=>finish(invalid()));
 child.on('close',code=>{try{const result=JSON.parse(output);if(code||typeof result.text!=='string')throw Error();finish(null,result.text);}catch{finish(invalid());}});
 child.stdin.end(JSON.stringify({data:content.toString('base64'),filename}));
});}
