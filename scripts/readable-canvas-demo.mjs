import {randomUUID} from 'node:crypto';

/** Synthetic, disposable writing work. Never imports an author's novel. */
export async function seedReadableCanvasDemo(store,actor){
  const novel=await store.dispatch('novel.create',{title:'旧港来信 · 连线试用'},actor);
  const run=(action,args={})=>store.dispatch(action,{novelId:novel.id,...args},actor);
  await run('chapter.create',{title:'第一章 潮声里的信',content:'　　雨水沿着信封的边角滴下来，陆沉却迟迟没有拆开它。\n\n　　沈雁说，旧港从不在夜里收信。可现在，远处的第三声钟已经响了。'});
  const tx=await run('planning.apply',{requestId:randomUUID(),operations:[
    ...[['lead','主角动线'],['opposition','守方动线'],['ally','同伴动线']].map(([ref,name])=>({op:'group.create',ref,value:{name}})),
    {op:'page.create',ref:'past',value:{name:'旧案线索',summary:'独立推演十年前的事故与遗失账本，尚未决定如何揭露。'}},
    ...[
      ['a1','潜入旧港','陆沉借送货的身份进入仓库，试图带走账本。','先呈现陆沉的目标：账本能证明父亲没有私吞船工的赔偿。\n\n他用送货人的身份进门，但不应一开始就知道仓库里有埋伏。','lead'],
      ['a2','识破诱饵','账本的缺页暴露陷阱，他必须换一条出路。','让识破来自可见的细节：灰尘、封条和账本页码。\n\n待讨论：他是继续取证，还是先救被困的船工？','lead'],
      ['b1','留下假账本','贺辞用假账本引人入局，希望找出递信的人。','贺辞不是等着主角上门的静态反派。他知道账本被人盯上，主动留下诱饵，并把守卫调往水门。','opposition'],
      ['b2','封锁水门','守方提前放闸，原定撤退路线变成死路。','封锁出路是反派行动的结果。水位上涨，把原本独立的搜查和潜入变成同一场危机。','opposition'],
      ['c1','追查旧案','沈雁查到潮汐机关记录，发现仓库另有出口。','同伴有自己的目标和调查过程。她查到的不是完整答案，而是一条必须赶在涨潮前交给陆沉的信息。','ally'],
      ['c2','送出密信','她赶在涨潮前送来机关图，给陆沉第二种选择。','用机关图兑现前面旧案的线索；它只提供选择，不替主角解决全部困难。','ally'],
      ['g','潮汐对决','陷阱、情报和救人抉择在水门交汇。','三条动线在此成为同一事件。\n\n陆沉可以保住账本独自脱身，也可以毁掉部分证据换取船工逃生。作者尚未决定代价的具体形式。',null],
      ['h','带着代价离开','人救下来了，真相却仍缺关键一页。','留给后续的变化：陆沉与沈雁有了共同秘密，贺辞知道递信者仍在港内。\n\n这里先记录故事变化，暂不绑定某一章。',null],
    ].map(([ref,title,summary,content,groupId])=>({op:'node.create',ref,value:{title,summary,content,groupId,status:'idea'}})),
    ...[['a1','a2'],['b1','b2'],['c1','c2'],['a2','g'],['b2','g'],['c2','g'],['g','h']].map(([from,to])=>({op:'edge.create',value:{from,to}})),
    {op:'decoration.create',value:{kind:'frame',title:'三方动线',content:'各方先独立行动，在高潮交汇。',members:['a1','a2','b1','b2','c1','c2'],moveContents:true,color:'sky'}},
    {op:'node.create',ref:'pastEvent',value:{pageId:'past',title:'十年前的水门事故',summary:'账本中的支出与事故记录对不上。',content:'独立讨论页：先厘清事故中的各方立场，再决定哪些线索进入主线。'}},
  ]});
  const layout=await run('planning.layout',{pageId:null,expectedSequence:tx.sequence,requestId:randomUUID()});
  const climax=layout.positions[tx.mapping.g];
  await run('planning.apply',{requestId:randomUUID(),operations:[{op:'decoration.create',value:{kind:'note',title:'还没决定的代价',content:'救人与保住证据，\n要让陆沉失去哪一项？',position:{x:climax.x,y:climax.y+240},width:248,height:150,color:'sand'}}]});
  const people=await run('graph.group.create',{name:'主要人物'}),places=await run('graph.group.create',{name:'旧港与势力'}),settings=[];
  for(const [name,type,summary,content] of [
    ['陆沉','character_card','想查清父亲旧案，愿意冒险却不愿伤及无辜。','以送货人的身份进入旧港。信任沈雁，但不知道她与旧案的关系。'],
    ['沈雁','character_card','追查旧账本，也在隐瞒家族的往事。','她独立寻找潮汐机关图，再把关键线索交给陆沉。'],
    ['贺辞','character_card','掌握水门钥匙，试图揪出递信的人。','他的目标是保住旧港交易，而不是毫无缘由地与主角作对。'],
    ['港口卫队','world_entry','负责仓库与水门的日常看守。','奉命封锁水门；普通守卫并不知道十年前事故的全部真相。'],
    ['潮汐会','world_entry','控制旧港交易，与失踪船工有关。','一个组织条目。成员立场可以有分歧，不能把组织知识默认等同于每个成员的知识。'],
    ['旧港','world_entry','涨潮后通路改变，仓库下藏有潮汐机关。','地点与机关规则。涨潮既改变出路，也为主角提供一次有代价的机会。'],
  ])settings.push(await run('graph.create',{name,type,summary,content,groupId:type==='character_card'?people.id:places.id}));
  for(const [from,to,name,content] of [[0,1,'同行','彼此信任，仍各有隐瞒。'],[0,2,'对立','账本争夺使双方目标冲突。'],[1,2,'旧识','两人认识，陆沉暂不知情。'],[2,4,'掌事','贺辞负责旧港事务。'],[3,2,'听命','只了解封锁命令。'],[3,5,'驻守','守卫仓库和水门。'],[4,5,'据点','潮汐会的交易场所。']])await run('edge.create',{from:settings[from].id,to:settings[to].id,name,content});
  await run('graph.arrange',{requestId:randomUUID(),members:settings.map(n=>({id:n.id,expectedRevision:n.revision}))});
  return novel.id;
}
