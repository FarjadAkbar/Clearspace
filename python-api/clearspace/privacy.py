import re
EMAIL=re.compile(r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b',re.I)
PHONE=re.compile(r'(?<!\w)(?:\+?\d[\d ()\-.]{7,}\d)(?!\w)')
URL=re.compile(r'(?:https?://|www\.)\S+|(?:linkedin\.com|github\.com)/\S+',re.I)
HEADINGS={'resume','résumé','cv','curriculum vitae','summary','professional summary','experience','work experience','skills','education'}
def redact(text,nlp,candidate_name=''):
    # Drop header lines until a content section. For a one-line CV, do not drop
    # the whole document: require a declared name, otherwise reject for review.
    lines=text.splitlines(); first=next((i for i,line in enumerate(lines) if line.strip()),0)
    if candidate_name.strip():text=re.sub(re.escape(candidate_name.strip()),'[REDACTED NAME]',text,flags=re.I)
    elif lines and lines[first].strip().lower().strip(':') not in HEADINGS:
        if len([line for line in lines if line.strip()])<3:
            raise ValueError('Provide the candidate name for redaction, or a CV with a separate name/header line.')
        lines[first]='[REDACTED HEADER]';text='\n'.join(lines)
    entities=nlp(text).ents
    for entity in sorted((e for e in entities if e.label_=='PERSON'),key=lambda e:e.start_char,reverse=True):
        text=text[:entity.start_char]+'[REDACTED NAME]'+text[entity.end_char:]
    text=EMAIL.sub('[REDACTED EMAIL]',text)
    def phone(match):
        value=match.group();digits=re.sub(r'\D','',value)
        # Preserve work date ranges such as 2020 - 2025.
        if re.fullmatch(r'\d{4}\s*[-–—]\s*\d{4}',value):return value
        return '[REDACTED PHONE]' if len(digits)>=7 else value
    text=PHONE.sub(phone,text);text=URL.sub('[REDACTED URL]',text)
    text=re.sub(r'(?im)^\s*(?:name|candidate name|full name|نام)\s*[:：].*$', '[REDACTED NAME]',text)
    return text
