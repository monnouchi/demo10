import {drawBuddy} from './character';
export function drawPerfectFinale(g:CanvasRenderingContext2D,w:number,h:number,beat:number,reduced:boolean){
 if(beat<0)return;g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();
 const colors=['#c1ff88','#ffd588','#8bdfff','#e1a5ff'];
 for(let i=0;i<4;i++){const x=w*[.14,.30,.70,.86][i],y=h*.76,bob=reduced?0:Math.sin(beat*Math.PI+i*.4)*3;
  g.save();g.globalAlpha=Math.min(1,beat/2)*.85;g.translate(x,y-bob);g.scale(.65,.65);drawBuddy(g,colors[i],'#151823',false,beat>=4,beat<4?5:0,0,true);g.fillStyle=colors[i];g.fillRect(-10,-42,4,4);g.fillRect(0,-46,4,4);g.fillRect(10,-42,4,4);g.restore();
 }
 if(beat>=4&&beat<8){g.fillStyle='#fff5b2';g.textAlign='center';g.font=`bold ${Math.min(30,(w-48)/7)}px PulsePixel, monospace`;g.fillText('ALL PERFECT',w/2,Math.max(154,h*.24));}
 g.restore();
}
export function drawStageEntry(g:CanvasRenderingContext2D,w:number,kind:string,local:number,phase:number,name:string){
 if(kind!=='main'&&kind!=='bridge')return;const opacity=kind==='bridge'?Math.max(0,(local+phase-2)/2):Math.min(1,Math.max(0,3-local-phase));if(opacity<=0)return;
 g.save();g.globalAlpha=opacity*.85;g.textAlign='center';g.fillStyle='#f3f5e9';g.font=`bold ${Math.min(32,(w-48)/(name.length*.6))}px PulsePixel, monospace`;g.fillText(name,w/2,154);g.restore();
}
