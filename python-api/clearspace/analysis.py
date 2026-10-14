import json, re
from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class Strict(BaseModel):
    model_config = ConfigDict(extra='forbid')
class JobInput(Strict):
    cv: str = Field(min_length=80,max_length=30000)
    job: str = Field(min_length=80,max_length=30000)
    candidateName: str = Field(default='',max_length=150)
class OrganizeInput(Strict):
    transcript: str = Field(min_length=1,max_length=20000)
    date: date
class Requirement(Strict):
    requirement: str = Field(min_length=1,max_length=500)
    category: Literal['skill','experience','education','certification']
    importance: Literal['required','preferred']
    status: Literal['met','partial','missing','unknown']
    jobEvidence: str = Field(min_length=3,max_length=1000)
    cvEvidence: str = Field(default='',max_length=1000)
    basis: Literal['exact','transferable','demonstrated','none'] = 'none'
class Assessment(Strict):
    requirements: list[Requirement] = Field(min_length=1,max_length=20)
    suggestions: list[str] = Field(default_factory=list,max_length=3)
class Thought(Strict):
    title: str = Field(min_length=1,max_length=500)
    kind: Literal['task','idea','note']
    nextSteps: list[str] = Field(default_factory=list,max_length=15)
    dueDate: date | None = None
class Thoughts(Strict):
    items: list[Thought] = Field(max_length=50)

def verify_assessment(data,cv,job):
    result=Assessment.model_validate(data)
    rows=[]; seen=set()
    for row in result.requirements:
        if row.requirement.strip().lower() in {'low ego','low ego and organisational awareness','obsession with customer outcomes','exercise judgement','systems thinking','solution-oriented approach'}:continue
        if row.jobEvidence.casefold() not in job.casefold():
            raise ValueError('Unverified job evidence')
        if row.status in ('met','partial') and (len(row.cvEvidence.strip())<3 or row.cvEvidence.casefold() not in cv.casefold() or '[REDACTED' in row.cvEvidence):
            row.status='unknown'; row.cvEvidence=''; row.basis='none'
        if row.basis=='transferable' and row.status=='met': row.status='partial'
        key=re.sub(r'\W+',' ',row.requirement.casefold()).strip()
        if key not in seen: rows.append(row); seen.add(key)
    if not rows:raise ValueError('No concrete requirements')
    result.requirements=rows
    if any(len(s)>800 for s in result.suggestions):raise ValueError('Suggestion too long')
    total=sum(2 if r.importance=='required' else 1 for r in rows)
    earned=sum((2 if r.importance=='required' else 1)*{'met':1,'partial':.5,'missing':0,'unknown':0}[r.status] for r in rows)
    return {**result.model_dump(), 'score':int(earned/total*100+.5)}

MONTHS={name:i+1 for i,name in enumerate(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'])}
DATE=r'(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?(?:19|20)\d{2}'
RANGE=re.compile(r'('+DATE+r')\s*(?:[-–—]|to)\s*('+DATE+r'|present|current|now)',re.I)
def experience_timeline(cv,today=None):
    today=today or date.today(); lines=cv.splitlines(); active=False; intervals=[]; quotes=[]
    headings={'experience','work experience','professional experience','employment history','employment','career history'}
    stop={'education','projects','skills','certifications','volunteering','summary','references'}
    for line in lines:
        heading=line.strip().lower().strip(':')
        if heading in headings:active=True;continue
        if heading in stop:active=False
        if not active:continue
        for match in RANGE.finditer(line):
            a,b=match.groups()
            def month(value):
                if value.lower() in ('present','current','now'):return today.year*12+today.month-1
                year=int(re.search(r'\d{4}',value).group()); part=value.split()[0].lower()[:3]
                return year*12+MONTHS[part]-1 if part in MONTHS else None
            start,end=month(a),month(b)
            # Year-only spans cannot provide a precise duration; leave them to review.
            if start is not None and end is not None and start<=end<=today.year*12+today.month-1:
                intervals.append((start,end));quotes.append(match.group())
    merged=[]
    for start,end in sorted(intervals):
        if merged and start<=merged[-1][1]:merged[-1][1]=max(end,merged[-1][1])
        else:merged.append([start,end])
    return {'years':round(sum(end-start for start,end in merged)/12,2) if merged else None,'evidence':quotes,'note':'Month-based, non-overlapping experience-section dates only. Total duration does not prove years using a particular technology.'}
