import {extract} from './extract.js';
let input='';
process.stdin.setEncoding('utf8');
process.stdin.on('data',chunk=>{input+=chunk;if(input.length>8*1024*1024)process.exit(1);});
process.stdin.on('end',async()=>{
 try{const {data,filename}=JSON.parse(input);const text=await extract(Buffer.from(data,'base64'),filename);process.stdout.write(JSON.stringify({text}));}
 catch{process.stdout.write(JSON.stringify({error:'Cannot safely read this file. Use a text-based PDF, DOCX or TXT.'}));process.exitCode=1;}
});
