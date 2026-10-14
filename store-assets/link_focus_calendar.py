from pathlib import Path
p=Path('store.js');s=p.read_text(encoding='utf-8-sig');s+='''
function ensureFocusBlock(s,taskId,preferredId,now=new Date()){
 const task=s.tasks.find(t=>t.id===taskId);if(!task)return;
 const date=dayKey();let block=s.blocks.find(b=>b.id===preferredId&&b.taskId===taskId&&b.date===date)||s.blocks.find(b=>b.taskId===taskId&&b.date===date);
 if(!block){const start=now.getHours()*60+now.getMinutes();block={id:uid(),taskId,title:task.title,date,time:`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,duration:Math.min(25,1440-start),source:'focus'};s.blocks.push(block);}
 return block.id;
}
''';p.write_text(s,encoding='utf-8')
p=Path('app.js');s=p.read_text(encoding='utf-8-sig');s=s.replace('<h2>The 25-minute deal</h2>','<h2>The 25-minute deal</h2>${t?.started&&!t.logged?`<div class="active-focus-task"><small>${t.mode===\'break\'?\'BREAK AFTER\':t.paused?\'PAUSED TASK\':\'FOCUSING ON\'}</small><strong dir="auto">${esc(t.label||\'Open focus session\')}</strong></div>`:\'\'}');s=s.replace('blockId:t?.blockId,logged:false','blockId:duration===1500&&task?ensureFocusBlock(s,task.id,t?.blockId):t?.blockId,logged:false');p.write_text(s,encoding='utf-8')
p=Path('productivity.js');s=p.read_text(encoding='utf-8-sig');s=s.replace("view='overview';render();$('#focus-task').value=id;", "view='overview';if(typeof calendarDay!=='undefined'){calendarDay=dayKey();calendarMonth=calendarDay.slice(0,7);}render();$('#focus-task').value=id;");p.write_text(s,encoding='utf-8')
p=Path('calendar.js');s=p.read_text(encoding='utf-8-sig');s=s.replace('<article class="agenda-task">','<article class="agenda-task ${state.timer?.started&&!state.timer.logged&&state.timer.mode===\'focus\'&&state.timer.blockId===b.id?\'is-focusing\':\'\'}">');s=s.replace('<div class="agenda-task-actions">','${state.timer?.started&&!state.timer.logged&&state.timer.blockId===b.id?`<span class="agenda-live">${state.timer.mode===\'break\'?\'On a break\':state.timer.paused?\'Focus paused\':\'● Focusing now\'}</span>`:\'\'}<div class="agenda-task-actions">');p.write_text(s,encoding='utf-8')
