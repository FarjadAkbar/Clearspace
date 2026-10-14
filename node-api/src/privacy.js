import nlp from 'compromise';
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function redact(text,candidateName='',dropHeader=true){
 let safe=text;
 if(candidateName.trim())safe=safe.replace(new RegExp(escape(candidateName.trim()),'giu'),'[REDACTED NAME]');
 else if(dropHeader){
  const lines=safe.split(/\r?\n/),first=lines.findIndex(line=>line.trim());
  if(first>=0&&!/^(?:resume|résumé|cv|curriculum vitae|summary|professional summary|experience|work experience|skills|education):?$/iu.test(lines[first].trim())){
   if(lines.filter(line=>line.trim()).length<3)throw Error('Provide the candidate name for redaction or a CV with a separate header line.');
   lines[first]='[REDACTED HEADER]';safe=lines.join('\n');
  }
 }
 const people=nlp(safe).people().out('array');
 for(const name of people)if(name.trim())safe=safe.replace(new RegExp(escape(name),'giu'),'[REDACTED NAME]');
 safe=safe.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,'[REDACTED EMAIL]');
 safe=safe.replace(/(?<!\w)(?:\+?\d[\d ()\-.]{7,}\d)(?!\w)/gu,value=>/^\d{4}\s*[-–—]\s*\d{4}$/u.test(value)?value:'[REDACTED PHONE]');
 safe=safe.replace(/(?:https?:\/\/|www\.)\S+|(?:linkedin\.com|github\.com)\/\S+/giu,'[REDACTED URL]');
 return safe.replace(/^\s*(?:name|candidate name|full name|نام)\s*[:：].*$/gimu,'[REDACTED NAME]');
}
