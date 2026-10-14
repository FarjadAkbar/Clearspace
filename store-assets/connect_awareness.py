from pathlib import Path
p=Path('awareness.js');s=p.read_text(encoding='utf-8-sig');i=s.index('let scrollStats');s=s[:i]+'''async function connectAwareness(){
 if(!globalThis.chrome?.runtime?.id||!location.protocol.startsWith('chrome-extension'))throw Error('Open Clearspace from the installed Chrome extension. Website previews cannot connect to its background worker.');
 for(let attempt=0;attempt<3;attempt++){
  try{const response=await chrome.runtime.sendMessage({type:'scroll-sync'});if(response)return response;}catch(error){if(!/Receiving end does not exist|Could not establish connection/i.test(error.message))throw error;}
  if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
 }
 throw Error('Your site choices are saved, but tracking could not connect. Reload Clearspace at chrome://extensions, close this old planner tab, then open Clearspace again and save. If it still fails, open the extension’s Errors panel and share the background.js error.');
}
'''+s[i:];s=s.replace("const result=await chrome.runtime.sendMessage({type:'scroll-sync'});", "const result=await connectAwareness();");p.write_text(s,encoding='utf-8')
