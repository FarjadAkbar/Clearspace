import path from 'node:path';
import AdmZip from 'adm-zip';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
export async function extract(data,filename){
 const ext=path.extname(filename).toLowerCase();let text;
 if(data.length>5*1024*1024)throw Error('Too large');
 if(ext==='.txt')text=new TextDecoder('utf-8',{fatal:true}).decode(data);
 else if(ext==='.docx'){
  if(data.subarray(0,2).toString()!=='PK')throw Error('Invalid DOCX');
  const zip=new AdmZip(data),entries=zip.getEntries();
  if(entries.length>256||entries.reduce((n,e)=>n+e.header.size,0)>16*1024*1024||!entries.some(e=>e.entryName==='word/document.xml')||entries.some(e=>/vbaproject/i.test(e.entryName)))throw Error('Invalid document');
  for(const entry of entries)if(entry.entryName.endsWith('.rels')&&/TargetMode\s*=\s*["']External["']/i.test(entry.getData().toString('utf8')))throw Error('External references rejected');
  const xml=zip.getEntry('word/document.xml').getData().toString('utf8');
  if(/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw Error('Invalid document XML');
  const parsed=new XMLParser({preserveOrder:true,ignoreAttributes:true,processEntities:true,parseTagValue:false}).parse(xml);
  const walk=(nodes,depth=0)=>{
   if(depth>64)throw Error('Document nesting limit');
   let value='';
   for(const node of Array.isArray(nodes)?nodes:[]){
    for(const [tag,children] of Object.entries(node)){
     if(tag==='#text')value+=String(children);
     else if(tag==='w:tab')value+='\t';
     else if(tag==='w:br')value+='\n';
     else value+=walk(children,depth+1)+(tag==='w:p'?'\n':'');
    }
   }
   return value;
  };
  text=walk(parsed);
 }else if(ext==='.pdf'){
  if(data.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid PDF');
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const document=await getDocument({data:new Uint8Array(data),isEvalSupported:false,useSystemFonts:false,disableFontFace:true,stopAtErrors:true}).promise;
  try{
   if(document.numPages>20)throw Error('Too many pages');
   text='';for(let i=1;i<=document.numPages;i++){const page=await document.getPage(i),content=await page.getTextContent();text+=content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('')+'\n';if(text.length>30000)throw Error('Too long');page.cleanup();}
  }finally{await document.destroy();}
 }else throw Error('Use PDF, DOCX or TXT');
 if(!text||text.trim().length<80||text.length>30000)throw Error('Not enough text or too long');
 return text.trim();
}
