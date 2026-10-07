import {drawBuddy} from './character';
export type RunResult=Readonly<{hits:number,perfect:number,good:number,miss:number,best:number,completed:boolean,allPerfect:boolean}>;
export const publicURL='https://monnouchi.github.io/demo10/';
export async function resultCard(result:RunResult){
 await document.fonts.load('32px PulsePixel');await document.fonts.ready;
 const c=document.createElement('canvas');c.width=c.height=1080;const g=c.getContext('2d')!;
 const colors=['#c1ff88','#ffd588','#8bdfff','#e1a5ff','#ffafcc','#91ffe1','#fff5b2'],accent=result.allPerfect?'#fff5b2':'#c1ff88';
 g.fillStyle='#10141f';g.fillRect(0,0,1080,1080);g.strokeStyle='#293448';g.lineWidth=2;
 for(let y=740;y<980;y+=36){g.beginPath();g.moveTo(48,y);g.lineTo(1032,y);g.stroke()}
 for(let i=-4;i<=4;i++){g.beginPath();g.moveTo(540,740);g.lineTo(540+i*190,990);g.stroke()}
 g.strokeStyle=accent;g.lineWidth=6;g.strokeRect(32,32,1016,1016);g.strokeStyle='#4f5b67';g.lineWidth=2;g.strokeRect(46,46,988,988);
 const text=(s:string,x:number,y:number,size:number,color=accent)=>{g.fillStyle=color;g.font=`${size}px PulsePixel, monospace`;g.fillText(s,x,y)};
 text('PULSE HOP',80,150,80);text('CHIP RHYTHM / ONE TAP',84,198,24,'#a4b1a4');
 if(result.allPerfect)for(let i=0;i<7;i++){g.fillStyle=colors[i];g.fillRect(696+i*38,94,25,48)}
 g.fillStyle='#1e2b34';g.fillRect(80,242,920,96);g.strokeStyle=accent;g.lineWidth=3;g.strokeRect(80,242,920,96);
 text(result.allPerfect?'ALL PERFECT':result.completed?'RHYTHM TRIP COMPLETE':'KEEP HOPPING',110,309,result.allPerfect?54:40);
 const counts=[result.perfect,result.good,result.miss],labels=['PERFECT','GOOD','MISS'];
 for(let i=0;i<3;i++){const x=80+i*320;g.fillStyle='#18212c';g.fillRect(x,384,280,190);text(labels[i],x+24,434,28,'#a4b1a4');text(String(counts[i]).padStart(3,'0'),x+24,536,96,i===2?'#d5dacf':colors[i])}
 text('BEST COMBO',80,647,28,'#a4b1a4');text(String(result.best),80,738,80,'#f3f5e9');text('HIT',716,647,28,'#a4b1a4');text(`${result.hits} / 300`,716,738,44,'#f3f5e9');
 g.save();g.translate(540,916);g.scale(3.6,3.6);drawBuddy(g,accent,'#10141f',false,true,0,0,true);g.restore();
 if(result.allPerfect)for(let i=0;i<4;i++){g.save();g.translate([180,350,730,900][i],916);g.scale(2,2);drawBuddy(g,colors[i],'#10141f',false,true,0,0,true);g.fillStyle=colors[i];g.fillRect(-10,-43,4,4);g.fillRect(0,-47,4,4);g.fillRect(10,-43,4,4);g.restore();}
 for(const x of result.allPerfect?[180,350,540,730,900]:[540]){g.fillStyle=accent;g.fillRect(x-54,947,108,8);for(let i=0;i<8;i++)g.fillRect(x-48+i*13,955,5,5)}
 text('5 STAGES / 300 BEATS',80,1000,22,'#a4b1a4');text('MONNOUCHI.GITHUB.IO/DEMO10',80,1030,22,'#a4b1a4');
 const blob=await new Promise<Blob>((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('PNG creation failed')),'image/png'));
 return new File([blob],`pulse-hop-${result.allPerfect?'all-perfect':result.completed?'complete':'retry'}.png`,{type:'image/png'});
}
export function saveCard(file:File){const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
