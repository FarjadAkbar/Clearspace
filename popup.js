document.querySelector('#capture').addEventListener('submit',async e=>{e.preventDefault();const input=document.querySelector('#thought');const title=input.value.trim();if(!title)return;await Store.update(s=>s.tasks.push({id:uid(),title,quadrant:'inbox',done:false,highlight:null}));input.value='';document.querySelector('#feedback').textContent='Saved. One less thing to hold in your head.';});
document.querySelector('#open').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('index.html')});
document.querySelector('#voice-open').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('index.html?voice=1')});

document.querySelectorAll('[data-popup-tab]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-popup-tab]').forEach(b=>b.classList.toggle('active',b===button));['capture-panel','match-panel'].forEach(id=>document.getElementById(id).hidden=id!==button.dataset.popupTab);});
