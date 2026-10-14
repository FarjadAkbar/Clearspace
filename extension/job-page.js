// Self-contained because Chrome serializes this function into the active tab.
function captureJobPage(){
 const visible=el=>el&&el.getClientRects().length>0;
 const read=el=>(el?.innerText||'').trim();
 const linkedin=/(^|\.)linkedin\.com$/i.test(location.hostname);
 const selectors=linkedin?['.jobs-description__content .jobs-box__html-content','.jobs-description-content__text','.jobs-description__content','.jobs-description','.job-details-about-the-job-module__description','[data-testid="expandable-text-box"]']:['[itemprop="description"]','[data-testid="job-description"]','#job-description','.job-description','.jobDescriptionContent'];
 let node;
 for(const selector of selectors){node=[...document.querySelectorAll(selector)].find(el=>visible(el)&&read(el).length>=100);if(node)break;}
 if(!node){
  const heading=[...document.querySelectorAll('h1,h2,h3,h4')].find(el=>visible(el)&&/^(about (the|this) job|job description|job overview)$/i.test(read(el)));
  if(heading){let parent=heading.parentElement;for(let i=0;parent&&i<3;i++,parent=parent.parentElement){const text=read(parent);if(text.length>=150&&!/Jobs that match your profile|How promoted jobs are ranked/i.test(text)){node=parent;break;}}}
 }
 if(!node&&!linkedin)node=document.querySelector('main')||document.querySelector('[role="main"]');
 if(!node)throw Error('Job description not found. Open the selected job details and expand About the job, then try again. You can also paste the description.');
 const text=read(node).slice(0,30000);
 if(text.length<100||/Jobs that match your profile|How promoted jobs are ranked/i.test(text))throw Error('This looks like a job results list. Open a single job and expand About the job, or paste its description.');
 const title=read(document.querySelector('.job-details-jobs-unified-top-card__job-title h1,.jobs-unified-top-card__job-title'))||document.title;
 return {title,text,source:linkedin?'LinkedIn selected job description':'Job description',targeted:!!node};
}
