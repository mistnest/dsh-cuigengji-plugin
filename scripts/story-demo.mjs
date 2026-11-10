import {randomUUID} from 'node:crypto';
/** Original, disposable demo content. No local novel data is read. */
export async function seedStoryDemo(store,actor){
 const novel=await store.dispatch('novel.create',{title:'雨城来信 · 创作工作台试用'},actor);
 const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor);
 const created=[];
 const plan=[
  ['第一章 雨夜来信','　　第三封信抵达旧书铺的时候，雨已经停了。林照把信放在父亲的笔记旁，那两个字的收笔几乎一样。\n\n　　她先看寄出日期，再看门口的钟。天黑之前，还有时间去一趟旧钟楼。\n\n　　信里没有署名，只有一枚干枯的银杏叶。林照认得这种压叶的方法，父亲从前教过她。'],
  ['第二章 旧钟楼','　　钟楼的铁门开着。陆行舟站在齿轮之间，像在等一个迟到了十年的人。\n\n　　“这机器坏了很多年。”他说，“但我每周都会上来一次。”\n\n　　林照没有追问原因，只记下了他手背上那道旧伤。'],
  ['第三章 南岸码头','　　码头的守夜人戴着灰帽，听见旧钟楼三个字时，手指在栏杆上敲了四下。\n\n　　“你要找的人，十年前坐最后一班货船离开。”她说，“也知道不会再回来。”\n\n　　林照把银杏叶收进袖口，决定先不告诉陆行舟。\n\n　　她没有回头，也没有说话，只是把信攥得更紧了一点。她知道，这意味着一切都将改变。命运的齿轮开始转动。\n\n　　这一切，才刚刚开始。'],
  ['第四章 未写完的约定','　　店里下了一整夜的雨，林照把三封信并排摊开，字迹从潦草变得端正。'],
 ];
 const chapters=[];
 for(const [title,content] of plan)chapters.push(await run('chapter.create',{title,content}));
 const empty=await run('chapter.create',{title:'第五章 齿轮下的名字',content:''});
 // Two volumes so the volume board has a real three-level structure to draw.
 const volumeOne=await run('volume.create',{title:'第一卷 来信',order:0});
 const volumeTwo=await run('volume.create',{title:'第二卷 潮汐',order:1});
 for(const [index,chapter] of chapters.entries()) await run('chapter.update',{chapterId:chapter.id,expectedRevision:chapter.revision,volumeId:index<2?volumeOne.id:volumeTwo.id});
 const card=await run('graph.create',{name:'林照',type:'character_card',summary:'旧书铺店主，寻找失踪的父亲。',content:'习惯先核对细节，再相信直觉。'});
 const mate=await run('graph.create',{name:'陆行舟',type:'character_card',summary:'旧钟楼修理员，守着不能说的约定。',content:'沉默有明确动机。'});
 // Moving chapters between volumes bumped each chapter's revision.
 const fresh=(await run('story.get')).chapters;
 const at=id=>fresh.find(chapter=>chapter.id===id).revision;
 const story=await run('story.get');
 // One line here is deliberately at risk so the unit board shows real diagnostics.
 const lineSeeds={main:{title:'主线：第三封信是谁寄的',kind:'main',driver:'寄信人每章留一处可核对的细节',junction:'第二章并回钟楼，决定她是否告诉陆行舟',canCarryChapter:'yes'},
   romance:{title:'支线：林照与陆行舟的旧约',kind:'subplot',driver:'两人都在守别人的秘密',junction:'第四章摊开三封信时并回主线',canCarryChapter:'half'},
   father:{title:'暗线：父亲最后出现的地方',kind:'subplot',driver:'守夜人零散的口述',junction:'第三卷揭开',canCarryChapter:'no'}};
 const seeded=await run('story.apply',{expectedRevision:story.story.revision,requestId:randomUUID(),operations:Object.values(lineSeeds).map(value=>({op:'storyline.upsert',value}))});
 const lines={main:seeded.results[0].id,romance:seeded.results[1].id,father:seeded.results[2].id};
 const units=[
  {title:'锈住的钟',volumeId:volumeOne.id,order:'L1-01',promise:'读者要知道陆行舟为什么每周都上一次钟楼',emotionEngine:'信件带来的不确定→见到活人的踏实→伤口的疑点',causeEntry:'第三封信把林照引向旧钟楼',blocker:'陆行舟回避齿轮来历',choice:'林照选择不追问，只记录细节',payoff:'读者拿到“有人在等”的信息，功劳归林照的克制',hook:'守夜人提到最后一班货船',lineIds:[lines.main,lines.romance],chapterIds:[chapters[0].id,chapters[1].id],contractRisk:'safe'},
  {title:'码头上的十年',volumeId:volumeTwo.id,order:'L2-01',promise:'读者要知道十年前那班货船载走了谁',emotionEngine:'逼问→隐瞒→暂时和解',causeEntry:'守夜人的口述',blocker:'守夜人只肯说一半',choice:'林照决定先不告诉陆行舟',payoff:'读者知道父亲离开，但不知道原因',hook:'陆行舟问起码头',lineIds:[lines.main,lines.father],chapterIds:[chapters[2].id,chapters[3].id],contractRisk:'reinforce'},
 ];
 const current=await run('story.apply',{expectedRevision:seeded.story.revision,requestId:randomUUID(),operations:units.map(value=>({op:'unit.upsert',value}))});
 // Rhythm and style give the heat map and the style board real content. The
 // tones below are the author's judgement, not something derived from prose.
 const rhythms=[
  [chapters[0],'tense','setup','一封迟到的信把日常推开，读者先拿到疑问。'],
  [chapters[1],'oppressive','escalate','钟楼里的沉默让疑点变重，但还没给答案。'],
  [chapters[2],'sad','turn','守夜人的口述把私人线索推向十年前的事件。'],
  [chapters[3],'warm','aftermath','三封信摊开，情绪落回可以继续生活的地方。'],
 ];
 const rhythmOps=rhythms.map(([chapter,tone,role,note])=>({op:'rhythm.upsert',value:{chapterId:chapter.id,expectedChapterRevision:at(chapter.id),tone,role,note}}));
 const styled=await run('story.apply',{expectedRevision:current.story.revision,requestId:randomUUID(),operations:rhythmOps});
 const final=await run('story.apply',{expectedRevision:styled.story.revision,requestId:randomUUID(),operations:[
  {op:'style.upsert',value:{targetSentence:30,dialogueRatio:35,viewpoint:'第三人称限知，始终贴着林照',tense:'过去时，按当日推进',diction:'克制、冷色调，少形容词',avoid:'避免直接抒情和替读者总结',anchors:['信里没有署名，只有一枚干枯的银杏叶。']}},
 ]});
 // A demo-only 对标 copy; a real import reads a 拆文库 folder from disk.
 const demoReference={id:'ref-demo-rain-city',title:'对标示例 · 雨城来信拆文',source:'演示数据（非真实拆文库）',importedAt:new Date().toISOString(),
  report:'# 拆文报告（示例）\n\n这本书用一封迟到十年的信作为入口，前三章分别完成「日常被打破→旧人现身→真相推进」。\n\n## 可借鉴\n- 每章只解释一个新事实，其余留到下一章。\n- 章尾用具体动作收束，不用总结句。',
  style:'# 文风（示例）\n\n- 句长偏短，平均 18–22 字。\n- 对白占比约 25%–35%，关键信息用对话推进。\n- 冷色调，少形容词，避免直接抒情。',
  rhythm:'# 节奏（示例）\n\n第1章 紧张 / 建立\n第2章 压抑 / 升级\n第3章 悲伤 / 转折\n第4章 温馨 / 余波',
  emotion:'# 情绪模块（示例）\n\n- 期待：读者想知道信为什么现在才到。\n- 缺口：主角不知道父亲是否还活着。\n- 兑现：每次只给一个可核对的小答案。',
  chapters:[
   {index:0,title:'第1章 雨夜来信',summary:'主角收到第三封信，决定去旧钟楼。',tone:'紧张',role:'建立',wordCount:2200},
   {index:1,title:'第2章 旧钟楼',summary:'旧人现身，刻意回避关键问题。',tone:'压抑',role:'升级',wordCount:2400},
   {index:2,title:'第3章 南岸码头',summary:'守夜人说出十年前最后一班货船。',tone:'悲伤',role:'转折',wordCount:2600},
   {index:3,title:'第4章 未写完的约定',summary:'三封信摊开，主角决定继续。',tone:'温馨',role:'余波',wordCount:1800},
  ],counts:{chapters:4,characters:3,settings:5}};
 const referenced=await run('story.apply',{expectedRevision:final.story.revision,requestId:randomUUID(),operations:[{op:'reference.upsert',value:demoReference}]});
 const operations=[
  {op:'configure',value:{mode:'long',stage:'outline',brief:{premise:'一封迟到十年的信，把林照引向父亲最后出现的地方。',readerPromise:'读者想知道那封信为什么现在才到，以及父亲是否还活着。',protagonistGoal:'找到父亲，又不伤害仍在等她的人。',coreConflict:'追问真相会揭开陆行舟守护的秘密，也会让父亲更难回头。',ending:'林照决定不再等回信，自己寄出第一封。',style:'克制、冷色调，避免直接抒情。'}}},
  {op:'outline.upsert',value:{chapterId:chapters[0].id,intent:'用第三封信把林照从日常推向旧钟楼。',beats:['收到第三封信','比对父亲笔迹','前往旧钟楼'],endingHook:'钟楼里已经有人。',minWords:1800,maxWords:2600}},
  {op:'outline.upsert',value:{chapterId:chapters[1].id,intent:'让陆行舟现身，暗示他与约定有关。',beats:['遇见陆行舟','听见齿轮声','避开伤口的来历'],endingHook:'守夜人提到最后一班货船。',minWords:1800,maxWords:2600}},
  {op:'outline.upsert',value:{chapterId:chapters[2].id,intent:'把读者从私人线索带向十年前的事件。',beats:['见到守夜人','得知货船','选择暂时隐瞒'],endingHook:'陆行舟问起码头。',minWords:1800,maxWords:2600}},
  {op:'tracking.commit',value:{chapterId:chapters[0].id,expectedChapterRevision:at(chapters[0].id),summary:'林照收到第三封信，决定天黑前前往旧钟楼。',storyTime:'雨天傍晚',location:'旧书铺',activeCharacterIds:[card.id],commitments:['天黑前抵达旧钟楼'],risks:['第三封信没有署名，来源尚未交代'],authorTruth:['第三封信是陆行舟寄出的','父亲十年前并没有死'],readerKnown:['第三封信没有署名','信里夹着一枚干枯的银杏叶']}},
  {op:'tracking.commit',value:{chapterId:chapters[1].id,expectedChapterRevision:at(chapters[1].id),summary:'林照在钟楼遇到陆行舟，对方刻意回避齿轮来历。',storyTime:'当日入夜',location:'旧钟楼',activeCharacterIds:[card.id,mate.id],commitments:['守夜人提到的货船去向仍未说明'],risks:['陆行舟手背的旧伤没有解释'],authorTruth:['陆行舟在等的人是林照的父亲','齿轮之间藏着最后一封信'],readerKnown:['钟楼里有人','陆行舟每周都会来一次','他手背上有一道旧伤']}},
  {op:'thread.upsert',value:{kind:'foreshadow',title:'银杏压叶的笔迹',detail:'前两封信也用同样的方法压着叶子。',status:'open',sourceChapterId:chapters[0].id,sourceRevision:at(chapters[0].id),dueChapterId:chapters[2].id}},
  {op:'thread.upsert',value:{kind:'foreshadow',title:'陆行舟手背的旧伤',detail:'与钟楼齿轮有关，尚未说明。',status:'progressing',sourceChapterId:chapters[1].id,sourceRevision:at(chapters[1].id),dueChapterId:chapters[3].id}},
  {op:'thread.upsert',value:{kind:'promise',title:'守夜人的货船去向',detail:'第三章承诺交代十年前最后一班货船。',status:'progressing',sourceChapterId:chapters[2].id,sourceRevision:at(chapters[2].id),dueChapterId:chapters[2].id}},
  {op:'thread.upsert',value:{kind:'expectation',title:'父亲是否还活着',detail:'长期期待，最后才揭晓。',status:'open'}},
  {op:'thread.upsert',value:{kind:'constraint',title:'林照不愿伤害无辜的人',detail:'决定行动前必须先排除会伤害他人的可能。',status:'open',sourceChapterId:chapters[0].id,sourceRevision:at(chapters[0].id)}},
  {op:'review.upsert',value:{chapterId:chapters[2].id,expectedChapterRevision:at(chapters[2].id),severity:'blocking',category:'causality',location:'开场第三段',evidence:'“你要找的人，十年前坐最后一班货船离开。”',issue:'守夜人没有理由主动透露全部信息。',suggestion:'先给出交换条件或她本人的动机，再让信息出现。',status:'open'}},
  {op:'review.upsert',value:{chapterId:chapters[1].id,expectedChapterRevision:at(chapters[1].id),severity:'suggestion',category:'pacing',location:'中段对话',evidence:'“这机器坏了很多年。”',issue:'连续两句解释性对白拖慢节奏。',suggestion:'改成动作先行，让台词更短。',status:'open'}},
  {op:'review.upsert',value:{chapterId:chapters[0].id,expectedChapterRevision:at(chapters[0].id),severity:'note',category:'prose',location:'末段',evidence:'信里没有署名，只有一枚干枯的银杏叶。',issue:'意象很好，可以留到第二章再解释压叶方法。',suggestion:'把解释后移，第一章只保留疑惑。',status:'resolved'}},
 ];
 await run('story.apply',{expectedRevision:referenced.story.revision,requestId:randomUUID(),operations});
 return {novelId:novel.id,chapterId:chapters[0].id,emptyChapterId:empty.id};
}
