from pathlib import Path
p=Path('calendar.js');s=p.read_text(encoding='utf-8-sig');a=s.index('<div class="agenda-task-actions">');b=s.index('</div></article>',a);actions=s[a:b+6];s=s[:a]+"${state.timer?.started&&!state.timer.logged&&state.timer.blockId===b.id?'':`"+actions+"`}"+s[b+6:];p.write_text(s,encoding='utf-8')
