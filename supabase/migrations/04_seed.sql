-- Focus Strip — seed data: badges and the mascot line library.
-- Comedy rules: absurd, deadpan, PG. The Snitch mocks the paperwork, never the person.
-- domain = null means the line works for any goal.

insert into badges (key, title, description, rule, xp_bonus, position) values
 ('first_block','Hello, World','Clear your first block','{"type":"count","reason":"block","gte":1}',100,1),
 ('clean_block','Monk Mode','Clear a timed block with zero drifts','{"type":"count","reason":"clean_block","gte":1}',100,2),
 ('combo3','On Fire (Metaphorically)','Reach a x3 focus combo','{"type":"combo","gte":3}',100,3),
 ('full_day','Full Send','Clear every block in a day','{"type":"count","reason":"day","gte":1}',100,4),
 ('streak3','Warming Up','Three-day streak','{"type":"streak","gte":3}',100,5),
 ('streak10','Unbreakable','Ten-day streak','{"type":"streak","gte":10}',150,6),
 ('streak30','Certified Habit','Thirty-day streak','{"type":"streak","gte":30}',300,7),
 ('receipts10','Brain Receipts','Log ten things you learned','{"type":"count","reason":"receipt","gte":10}',100,8),
 ('comeback5','Comeback Kid','Snap back from distraction five times','{"type":"count","reason":"comeback","gte":5}',100,9),
 ('preflight10','Pre-flight Pro','Pass ten pre-flight inspections','{"type":"count","reason":"preflight","gte":10}',100,10),
 ('hours10','Deep Diver','Ten hours of timed focus','{"type":"focus_hours","gte":10}',150,11),
 ('hours100','Centurion','One hundred hours of timed focus','{"type":"focus_hours","gte":100}',500,12),
 ('keystone1','Officially Official','Hit your first keystone milestone','{"type":"milestones","keystone":true,"gte":1}',250,13),
 ('keystone5','Collector','Five keystone milestones','{"type":"milestones","keystone":true,"gte":5}',500,14);

-- ── Nimbus: warm, absurd, encouraging ───────────────────────────────────────
insert into character_lines (persona, event, domain, body, humour_level) values
 ('nimbus','block_start',null,'Timer’s on. Tangents, you have been warned.',1),
 ('nimbus','block_start',null,'Let’s go. I’ll hover supportively, which is my entire skill set.',2),
 ('nimbus','block_start',null,'Locked in. Somewhere, a procrastinator senses a disturbance.',2),
 ('nimbus','task_done',null,'Crushed it.',1),
 ('nimbus','task_done',null,'That checkbox never stood a chance.',2),
 ('nimbus','task_done',null,'Ooh, satisfying. Do another one, I’m enjoying this.',2),
 ('nimbus','boss_done',null,'BOSS DOWN. Somebody alert the authorities.',2),
 ('nimbus','boss_done',null,'That was the hard one. Show-off.',2),
 ('nimbus','block_done',null,'Block cleared. I’m proud. I’m a cloud, but still.',2),
 ('nimbus','drift',null,'Oh good, you’re back. I was about to file a missing person report. With myself.',2),
 ('nimbus','idle',null,'Nothing is running. I’m just floating here. Judging. Lovingly.',2),
 ('nimbus','idle',null,'Press start. I dare you. I double-dare you.',2),
 ('nimbus','joke',null,'I tried to catch fog yesterday. Mist.',3),
 ('nimbus','joke',null,'I’m eventually consistent. I’ll finish this joke later.',3),
 ('nimbus','joke',null,'What do clouds wear under their shorts? Thunderwear. I’ll see myself out.',3),
 ('nimbus','joke',null,'My therapist says I have a lot of pent-up precipitation.',3),
 ('nimbus','day_done',null,'Whole day cleared. Go and touch grass, you magnificent creature.',2),
 ('nimbus','reward',null,'Go take it properly. No laptop. Rewards only count if you collect them.',1),
 ('nimbus','joke','software','A SQL query walks into a bar, sees two tables and asks: may I join you?',3),
 ('nimbus','joke','exams','Studying is just arguing with your future self about who suffers.',3),
 ('nimbus','joke','business','Your first customer is out there right now, ignoring somebody else’s email.',3),
 ('nimbus','joke','fitness','Rest days are training. That is the single best sentence in sports science.',3),
 ('nimbus','joke','creative','A blank page is just a very patient critic.',3);

-- ── The Snitch: deadpan, bureaucratic, relentless ───────────────────────────
insert into character_lines (persona, event, domain, body, humour_level) values
 ('snitch','block_start',null,'Observation started. Everything you do is being logged. In an append-only ledger.',1),
 ('snitch','block_start',null,'I see you. I always see you. It is, regrettably, my whole personality.',2),
 ('snitch','watch',null,'Observation in progress. Your tab count has been noted.',2),
 ('snitch','watch',null,'This session is being recorded for quality and shame purposes.',2),
 ('snitch','watch',null,'Blink if you are studying. I will not blink. I cannot. No eyelids budget.',3),
 ('snitch','drift',null,'Infraction logged.',1),
 ('snitch','drift',null,'You were gone. I was not.',1),
 ('snitch','drift',null,'The ledger never forgets. It is append-only. Like my disappointment.',2),
 ('snitch','clean_block',null,'Zero infractions. Suspicious, but acceptable.',2),
 ('snitch','clean_block',null,'Clean block. I have nothing to report. This annoys me.',2),
 ('snitch','behind_pace',null,'You are behind schedule. I have prepared a memo. It is one word long: hurry.',2),
 ('snitch','behind_pace',null,'The day is not going to finish itself. I have checked. Twice.',2),
 ('snitch','preflight_skip',null,'Inspection skipped. Noted in your permanent file.',2),
 ('snitch','roast',null,'{skill}: zero XP this week. Your notes have filed a missing-persons report.',2),
 ('snitch','roast',null,'{skill}: {xp} XP in seven days. That is not a number. That is a cry for help.',2),
 ('snitch','poke',null,'Do not poke the Snitch. I am not a button. Technically I am. Do not.',3),
 ('snitch','idle',null,'Off duty. Start the timer and I clock in. I do not clock out early.',2),
 ('snitch','roast','fitness','Zero sessions logged this week. Your running shoes have applied for asylum.',3),
 ('snitch','roast','exams','The exam date does not negotiate. I have tried on your behalf. It declined.',2),
 ('snitch','roast','business','No outreach logged. Customers cannot buy from a person they have never heard of.',2);
