/* Voice drafts live separately from planner data so timer renders cannot erase them. */
const VoiceText = {
 items(text){return text.split(/\r?\n/).map(line=>line.replace(/^\s*(?:[-*•]\s+|[0-9۰-۹٠-٩]+[.)۔]\s+)/, '').trim()).filter(Boolean);},
 thought(text){return text.trim().replace(/(?:\b(?:next|new) task\b|اگلا کام|نیا کام)\s*[:،,۔.]?/gi,'\n').split('\n').map(t=>t.trim()).filter(Boolean).join('\n');},
 append(draft,text){const thought=this.thought(text);return thought?`${draft.trimEnd()}${draft.trim()?'\n':''}${thought}`:draft;}
};

(() => {
 const Recognition=globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition;
 const voiceCapture=capture;
 capture=function(){return voiceCapture().replace('<button class="primary">','<button type="button" class="voice-open" data-voice>Speak your thoughts</button><button class="primary">');};
 const dialog=document.createElement('dialog');
 dialog.className='voice-dialog';
 dialog.innerHTML=`<div class="section-head"><div><div class="eyebrow">A LITTLE ROOM IN YOUR HEAD</div><h2 id="voice-title">Talk it out.</h2></div><button type="button" id="voice-close" aria-label="Close voice capture">×</button></div><p>Speak a thought, pause, then continue. Review the lines before saving.</p><div class="voice-toolbar"><label for="voice-language">Recognition language</label><select id="voice-language"><option value="ur-PK">اردو — Urdu (Pakistan)</option><option value="en-PK">English (Pakistan)</option><option value="en-US">English (US)</option></select><button id="voice-start" class="primary">Start listening</button><button id="voice-stop" disabled>Stop</button></div><p class="voice-privacy">Microphone use starts only when you click Start. Chrome may send audio to its speech service; internet access may be required. Urdu/English mixing can be inaccurate. Your saved tasks stay on this device.</p><div id="voice-status" role="status" aria-live="polite"></div><div id="voice-interim" dir="auto" aria-label="Unconfirmed speech"></div><label for="voice-draft">Review your brain dump — one item per line</label><textarea id="voice-draft" dir="auto" rows="7" placeholder="کل اسائنمنٹ شروع کرنی ہے&#10;Reply to a message"></textarea><div class="voice-edit-actions"><button id="voice-line">Add a new line</button><span>Say “next task” or “نیا کام” to separate thoughts. You can also edit the lines.</span></div><div class="voice-preview"><h3>Items to save <span id="voice-count">0</span></h3><ol id="voice-items"></ol></div><div class="voice-actions"><button id="voice-save" class="primary" disabled>Save items to brain dump</button></div>`;
 dialog.setAttribute('aria-labelledby','voice-title');document.body.append(dialog);
 const find=id=>dialog.querySelector('#'+id), draft=find('voice-draft'),language=find('voice-language');
 let recognition=null,active=false,pending=false,saving=false,error='',finalResults=new Set(),spokenParts=[],finishRequested=false;
 const status=message=>find('voice-status').textContent=message;
 function controls(){find('voice-start').disabled=active||pending||saving||!Recognition;find('voice-stop').disabled=!active&&!pending;language.disabled=active||pending||saving;draft.disabled=active||pending||saving;find('voice-line').disabled=active||pending||saving;find('voice-save').disabled=active||pending||saving||!VoiceText.items(draft.value).length;}
 const DraftStore={
  async get(){try{return globalThis.chrome?.storage?(await chrome.storage.local.get('voiceDraft')).voiceDraft:JSON.parse(localStorage.getItem('voiceDraft')||'null');}catch{return null;}},
  async set(value){if(globalThis.chrome?.storage)await chrome.storage.local.set({voiceDraft:value});else localStorage.setItem('voiceDraft',JSON.stringify(value));}
 };
 function update(){const items=VoiceText.items(draft.value);find('voice-count').textContent=items.length;find('voice-items').replaceChildren(...items.map(text=>{const li=document.createElement('li');li.dir='auto';li.textContent=text;return li;}));controls();}
 let draftWrites=Promise.resolve();
 function persist(){const value={text:draft.value,language:language.value};draftWrites=draftWrites.catch(()=>{}).then(()=>DraftStore.set(value)).catch(()=>status('Draft could not be saved on this device. Keep this page open until you save the items.'));return draftWrites;}
 function stop(){if(recognition&&(active||pending)){try{finishRequested=true;recognition.stop();status('Finishing your full thought…');}catch{recognition.abort();recognition=null;active=false;pending=false;controls();status('Listening stopped. Your confirmed text is available for review.');}}else controls();}
 function close(){const spoken=spokenParts.filter(Boolean).join(' ').trim();if(recognition&&spoken){draft.value=draft.value.trimEnd()+(draft.value.trim()?'\n':'')+spoken;draft.dispatchEvent(new Event('input'));}spokenParts=[];finishRequested=false;if(recognition){recognition.abort();recognition=null;}active=false;pending=false;find('voice-interim').textContent='';persist();dialog.close();controls();}
 const ready=DraftStore.get().then(value=>{if(value){draft.value=value.text||'';if(['ur-PK','en-PK','en-US'].includes(value.language))language.value=value.language;}update();});
 async function open(){await ready;if(!dialog.open)dialog.showModal();update();if(!Recognition)status('Voice recognition is unavailable in this browser. Use desktop Google Chrome, or type and save your list here.');else status('Ready. Choose the main language of your next thought, then click Start listening.');}
 document.addEventListener('click',e=>{if(e.target.closest('[data-voice]'))open();});
 find('voice-close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 draft.oninput=()=>{update();persist();};language.onchange=persist;
 find('voice-line').onclick=()=>{draft.value=draft.value.trimEnd()+'\n';draft.focus();draft.setSelectionRange(draft.value.length,draft.value.length);persist();};
 find('voice-start').onclick=()=>{
  if(!Recognition||pending||active||saving)return;
  error='';finalResults=new Set();spokenParts=[];finishRequested=false;pending=true;controls();status('Waiting for microphone access…');
  const r=new Recognition();recognition=r;r.lang=language.value;r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
  r.onstart=()=>{if(recognition!==r)return;pending=false;active=true;controls();status('Listening… take your time. Your draft will appear after you finish.');};
  r.onresult=e=>{if(recognition!==r)return;let interim='';for(let i=0;i<e.results.length;i++){const result=e.results[i];if(result.isFinal){if(!finalResults.has(i)){spokenParts[i]=result[0].transcript;finalResults.add(i);}}else interim+=result[0].transcript+' ';}find('voice-interim').textContent='Listening privately in this dialog. Finish when you have said everything.';};
  r.onerror=e=>{if(recognition!==r)return;const messages={'not-allowed':'Microphone access was denied. Allow the microphone in Chrome settings, then try again.','service-not-allowed':'Chrome’s speech service is unavailable here. Try desktop Google Chrome.','audio-capture':'No working microphone was found. Check your microphone and system permissions.','network':'Speech recognition could not connect. Check your internet connection and try again.','no-speech':'No speech was detected. Try again closer to your microphone.','language-not-supported':'This speech service does not support the selected language. Try another language or use typed capture.','aborted':'Listening stopped.'};error=messages[e.error]||'Speech recognition stopped. Your confirmed text is still available.';status(error);};
  r.onend=()=>{if(recognition!==r)return;recognition=null;active=false;pending=false;const spoken=spokenParts.filter(Boolean).join(' ').trim();if(spoken){draft.value=draft.value.trimEnd()+(draft.value.trim()?'\n':'')+spoken;draft.dispatchEvent(new Event('input'));}find('voice-interim').textContent='';controls();status(error||'Your full thought is ready. Organize it into bullets, then review before saving.');if(finishRequested&&!error&&spoken)document.dispatchEvent(new Event('voice-complete'));finishRequested=false;};
  try{r.start();}catch{recognition=null;pending=false;controls();status('Could not start speech recognition. Try again in desktop Chrome.');}
 };
 find('voice-stop').onclick=stop;
 find('voice-save').onclick=async()=>{
  if(active||pending||saving)return;const items=VoiceText.items(draft.value);if(!items.length)return;
  if(items.some(text=>text.length>500)){status('One item is longer than 500 characters. Split it into smaller lines before saving.');return;}
  saving=true;controls();
  try{await Store.update(s=>items.forEach(title=>s.tasks.push({id:uid(),title,quadrant:'inbox',done:false,highlight:null,estimate:30})));draft.value='';await persist();state=await Store.get();view='brain';render();update();status(`Saved ${items.length} ${items.length===1?'item':'items'} to your brain dump.`);}catch{status('Could not finish saving. Check your brain dump before retrying to avoid duplicates.');}finally{saving=false;controls();}
 };
 addEventListener('pagehide',()=>{recognition?.abort();});
 document.addEventListener('clearspace-ready',()=>{if(new URLSearchParams(location.search).has('voice'))open();},{once:true});
})();
