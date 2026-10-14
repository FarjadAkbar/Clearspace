chrome.runtime.onMessage.addListener(message=>{
 if(message.target!=='session-audio')return;
 const audio=document.querySelector('#session-sound');audio.currentTime=0;audio.play().catch(()=>{});
});
