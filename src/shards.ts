import {journey,targets,type Beat} from './journey';
export type ShardBurst={time:number,x:number,y:number,color:string};
export function hasShard(b:Beat){return b.kind==='main'&&b.local<59&&([15].includes(b.local%16)&&b.stage<2||[14].includes(b.local%16)&&b.stage===2||[14,15].includes(b.local%16)&&b.stage===3||[13,14,15].includes(b.local%16)&&b.stage===4)}
const shards=targets.filter(hasShard).map(beat=>({beat,index:journey.indexOf(beat)-8}));
export function shardHeight(worldScale:number,charScale:number,reduced:boolean){return (reduced?24:64)*worldScale+40*charScale+(reduced?2.5:8)}
export function shardPosition(index:number,progress:number,w:number,h:number,charScale:number,worldScale:number,reduced:boolean){return{x:w*(.28+(index+.66-progress)*.22),y:h*.64-6*worldScale-shardHeight(worldScale,charScale,reduced)}}
export function drawShards(g:CanvasRenderingContext2D,w:number,h:number,progress:number,charScale:number,worldScale:number,reduced:boolean,taken:ReadonlySet<number>,now:number,bursts:readonly ShardBurst[],color:string,magnet:{hit:number,x:number,amount:number}){
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();
 let count=0;for(const shard of shards){const distance=shard.index+.66-progress;if(distance<-.7||distance>3.3||taken.has(shard.beat.hit)||count>=3)continue;const pos=shardPosition(shard.index,progress,w,h,charScale,worldScale,reduced);const x=pos.x+(shard.beat.hit===magnet.hit?(magnet.x-pos.x)*magnet.amount:0),y=pos.y;if(x<-8||x>w+8)continue;count++;
  const r=reduced?1.5:4;g.strokeStyle=g.fillStyle=color;g.globalAlpha=.6;g.lineWidth=1;g.strokeRect(x-r*1.4,y-r*1.4,r*2.8,r*2.8);g.globalAlpha=1;g.fillRect(x-1,y-r,2,r*2);g.fillRect(x-r,y-1,r*2,2);
 }
 for(const burst of bursts){const p=(now-burst.time)/.3;if(p<0||p>=1)continue;g.fillStyle=burst.color;g.globalAlpha=1-p;for(let i=0;i<(reduced?4:6);i++){const a=i*Math.PI/3,r=reduced?5:5+p*19;g.fillRect(burst.x+Math.cos(a)*r-1,burst.y+Math.sin(a)*r-1,2,2)}}g.restore();
}
