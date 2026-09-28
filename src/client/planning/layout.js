export function arrange(nodes,edges) {
 const ids=new Set(nodes.map(n=>n.id)),levels=new Map(nodes.map(n=>[n.id,0]));
 const links=edges.filter(e=>e.type!=='requires'&&ids.has(e.from)&&ids.has(e.to));
 for(let step=0;step<nodes.length;step++){let changed=false;for(const e of links){const next=Math.min(nodes.length-1,levels.get(e.from)+1);if(next>levels.get(e.to)){levels.set(e.to,next);changed=true;}}if(!changed)break;}
 const rows=new Map();return Object.fromEntries(nodes.map(n=>{const level=levels.get(n.id),row=rows.get(level)||0;rows.set(level,row+1);return [n.id,{x:24+level*280,y:24+row*170}];}));
}
