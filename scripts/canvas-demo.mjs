import {randomUUID} from 'node:crypto';
/** Original, disposable demo content. No local novel data is read. */
export async function seedCanvasDemo(store,actor){
 const novel=await store.dispatch('novel.create',{title:'雨城来信 · 画布试用'},actor);
 const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor);
 const chapter=await run('chapter.create',{title:'第一章 雨夜来信',content:'　　第三封信抵达旧书铺的时候，雨已经停了。林照把信放在父亲的笔记旁，那两个字的收笔几乎一样。\n\n　　她先看寄出日期，再看门口的钟。天黑之前，还有时间去一趟旧钟楼。'});
 const tx=await run('planning.apply',{requestId:randomUUID(),operations:[
  {op:'group.create',ref:'main',value:{name:'主线推进'}},{op:'group.create',ref:'option',value:{name:'备选走向'}},
  {op:'page.create',ref:'branch',value:{name:'码头支线',summary:'另一条独立路线，先保留在单独页面。'}},
  ...[
   ['p1','收到第三封信','熟悉的字迹，把林照引向旧钟楼。','第三封信没有署名。先核对寄出日期，再前往钟楼。',42,146,'main','written'],
   ['p2','进入旧钟楼','发现齿轮，陆行舟回避它的来历。','林照找到锈蚀的齿轮。陆行舟认识它，却刻意避开这个话题。\n\n先保留他的反常，再讨论何时揭露约定。',334,146,'main','selected'],
   ['p3','前往南岸码头','相信守夜人，还是继续追问同行者？','带着钟楼的齿轮前往码头。守夜人提出了一个交换条件。',626,146,'main','idea'],
   ['p4','追问同行者','给陆行舟一次坦白的机会。','备选方向：先在钟楼完成两人的对话，核对是否过早揭开悬念。',626,376,'option','idea'],
  ].map(([ref,title,summary,content,x,y,groupId,status])=>({op:'node.create',ref,value:{title,summary,content,position:{x,y},groupId,status,...(status==='written'?{chapterRefs:[{chapterId:chapter.id,revision:1}]}:{})}})),
  {op:'node.create',ref:'p5',value:{title:'码头的守夜人',summary:'灰帽女人知道十年前的航线。',content:'从守夜人的视角，讨论货船的去向。',pageId:'branch',groupId:'option',position:{x:70,y:155}}},
  {op:'node.create',ref:'p6',value:{title:'遗落的航海日志',summary:'缺失的一页，与信件时间重合。',content:'先保留在独立页面，暂不并入主线。',pageId:'branch',groupId:'option',position:{x:402,y:155}}},
  ...[['p1','p2'],['p2','p3'],['p2','p4'],['p5','p6']].map(([from,to])=>({op:'edge.create',value:{from,to}})),
  {op:'decoration.create',value:{kind:'frame',title:'钟楼之后，怎样接下去？',content:'先确认人物动机，再决定揭露的时机。',position:{x:305,y:66},width:586,height:262,color:'sky',fontSize:14,moveContents:true}},
  {op:'decoration.create',value:{kind:'note',title:'留给下一轮',content:'人物的沉默来自保护，\n还是愧疚？',position:{x:334,y:376},width:224,height:130,color:'sand',fontSize:14}},
 ]});
 const people=await run('graph.group.create',{name:'主要人物'}),world=await run('graph.group.create',{name:'雨城旧事'}),nodes=[];
 for(const [name,type,summary,content,x,y] of [
  ['林照','character_card','旧书铺店主，寻找失踪的父亲。','习惯先核对细节，再相信自己的直觉。她寻找父亲，但不愿伤害无辜的人。',42,125],
  ['陆行舟','character_card','旧钟楼修理员，守着不能说的约定。','熟悉钟楼内部结构。他的沉默有明确动机，不能简单写成冷漠。',374,125],
  ['旧钟楼','world_entry','封闭十年，每晚仍有人听见钟声。','雨夜的钟声是雨城的重要线索。',706,125],
  ['灰帽女人','character_card','南岸渡口的守夜人。','她知道旧货船的航线，也知道谁曾离开雨城。',374,355],
  ['南岸码头','world_entry','旧货船停泊的河岸。','码头保留着货船留下的标记。',706,355],
 ])nodes.push(await run('graph.create',{name,type,summary,content,position:{x,y},groupId:type==='character_card'?people.id:world.id}));
 for(const [a,b,name] of [[0,1,'互有隐瞒'],[1,2,'曾经维修'],[0,3,'寻找线索'],[3,4,'守夜']])await run('edge.create',{from:nodes[a].id,to:nodes[b].id,name});
 return novel.id;
}
