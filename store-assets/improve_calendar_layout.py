from pathlib import Path
p=Path('calendar.js');s=p.read_text(encoding='utf-8-sig')
s=s.replace('return todaySessions()+`','return `<div class="calendar-focus-dock">${focusCard()}</div>`+todaySessions()+`')
old='${blocks.length?blocks.map(b=>`<div class="calendar-event"><div class="event-time">${esc(b.time)}<small>${b.duration} min</small></div><div dir="auto"><strong>${esc(b.title)}</strong>${state.tasks.find(t=>t.id===b.taskId)?.done?\'<small>Completed</small>\':\'\'}</div></div>${blockRow(b)}`).join(\'\'):'
new='${blocks.length?blocks.map(b=>`<article class="agenda-task"><div class="agenda-task-heading"><span class="event-time">${esc(b.time)}<small>${b.duration} min</small></span><strong dir="auto">${esc(b.title)}</strong></div>${state.tasks.find(t=>t.id===b.taskId)?.done?\'<small class="agenda-completed">Completed</small>\':\'\'}<div class="agenda-task-actions">${state.tasks.some(t=>t.id===b.taskId&&!t.done)?`<button class="primary" data-focus="${b.taskId}" data-block="${b.id}">▶ Start focus</button>`:\'\'}<button class="agenda-remove" data-remove-block="${b.id}" aria-label="Remove time block for ${esc(b.title)}">× Remove</button></div></article>`).join(\'\'):'
assert old in s;s=s.replace(old,new)
s=s.replace('<div>${focusCard()}</div></div>`;','</div>`;')
p.write_text(s,encoding='utf-8')
