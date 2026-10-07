import {drawBuddy} from './character';
export type Guest={kind:number,time:number,life:number,field:number,color:string,dancers?:number,born?:number};
export function drawGuests(g:CanvasRenderingContext2D,w:number,h:number,now:number,guests:readonly Guest[],phase:number,reduced:boolean){
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();
 for(const guest of guests){const p=(now-guest.time)/guest.life;if(p<0||p>=1)continue;const fade=guest.kind===2?Math.min(1,(now-(guest.born??guest.time))*2,(1-p)*6):Math.min(1,p*8,(1-p)*6);g.globalAlpha=fade*.7;g.fillStyle=g.strokeStyle=guest.color;g.lineWidth=1;
  if(guest.kind===0){const x=w*(reduced?.70:.12+p*.75),y=h*(reduced?.25:.22+p*.15),tail=reduced?8:28+guest.field*3;g.beginPath();g.moveTo(x-tail,y-tail*.22);g.lineTo(x,y);g.stroke();g.fillRect(x-3,y-3,6,6);g.fillRect(x-1,y-7,2,14);g.fillRect(x-7,y-1,14,2)}
  if(guest.kind===1){const x=w*(reduced?.68:.88-p*.55),y=h*.27+(reduced?0:Math.sin(p*Math.PI*2)*8);g.fillRect(x-9,y-12,18,6);g.fillRect(x-15,y-6,30,6);g.fillRect(x-20,y,40,4);g.fillRect(x-13,y+5,4,3);g.fillRect(x-2,y+5,4,3);g.fillRect(x+9,y+5,4,3);if(guest.field>=2){g.globalAlpha=fade*.08;g.beginPath();g.moveTo(x-8,y+9);g.lineTo(x-23,y+47);g.lineTo(x+23,y+47);g.lineTo(x+8,y+9);g.closePath();g.fill()}}
  if(guest.kind===2){const count=Math.max(2,Math.min(6,guest.dancers??2)),rest=Math.max(0,(now-guest.time-.8)/.8),visible=Math.max(2,count-rest);
   for(let i=0;i<count;i++){const opacity=i<2?1:Math.max(0,Math.min(1,visible-i));if(!opacity)continue;const x=w*(.51+(i%3)*.15),y=h*(.575-Math.floor(i/3)*.075),bounce=reduced?0:Math.sin(phase*Math.PI+i*.4)*5,step=reduced?0:Math.sin(phase*Math.PI*2+i*.5)*4;
    g.save();g.globalAlpha=fade*.7*opacity;g.translate(x,y-bounce);g.scale(.50,.50);g.rotate(reduced?0:Math.sin(phase*Math.PI*2+i*.4)*.12);drawBuddy(g,i%2?'#e1a5ff':guest.color,'#151823',false,guest.field>=2,4+step,step,true);
    if((guest.field+i)%3===0){g.fillStyle=guest.color;g.fillRect(-20,-38,40,4);g.fillRect(-8,-46,16,8)}else{g.fillStyle='#f3f5e9';g.fillRect(-13,-9,26,3)}g.restore();}
  }

 }
 g.restore();
}
export function drawCheer(g:CanvasRenderingContext2D,w:number,h:number,phase:number,local:number,color:string,reduced:boolean){
 const progress=(local+phase)/4,fade=Math.min(1,progress*6,(1-progress)*6);
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();g.fillStyle=g.strokeStyle=color;g.globalAlpha=fade*.65;g.lineWidth=1;
 for(let i=0;i<3;i++){const x=w*(.56+i*.17),y=h*.53,bounce=reduced?0:Math.sin(phase*Math.PI+i*.4)*3;
  g.save();g.translate(x,y-bounce);g.scale(.55,.55);drawBuddy(g,color,'#151823',false,true,0,0,true);
  // A headband and a tiny flag distinguish the cheering friends.
  g.fillStyle='#f3f5e9';g.fillRect(-15,-27,30,3);g.fillStyle=g.strokeStyle=color;g.beginPath();g.moveTo(23,-19);g.lineTo(23,-55);g.stroke();g.fillRect(23,-55,22,12);g.fillStyle='#151823';g.fillRect(30,-51,8,3);g.restore();

 }
 g.restore();
}
// Fixed six positions in the distant side lane; count can fade between levels.
export function drawCrowd(g:CanvasRenderingContext2D,w:number,h:number,count:number,phase:number,color:string,reduced:boolean){
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();
 for(let i=0;i<6;i++){const opacity=Math.max(0,Math.min(1,count-i));if(!opacity)continue;const x=w*(.48+i*.085),y=h*(.49+(i%2)*.045),bounce=reduced?0:Math.sin(phase*Math.PI+i*.5)*2;
  g.save();g.globalAlpha=opacity*.5;g.translate(x,y-bounce);g.scale(.43,.43);drawBuddy(g,color,'#151823',false,true,0,0,true);g.fillStyle=i%2?'#f3f5e9':color;g.fillRect(-17,-27,34,3);g.restore();
 }
 g.restore();
}
