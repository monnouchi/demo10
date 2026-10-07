export type Guest={kind:number,time:number,life:number,field:number,color:string};
export function drawGuests(g:CanvasRenderingContext2D,w:number,h:number,now:number,guests:readonly Guest[],phase:number,reduced:boolean){
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();
 for(const guest of guests){const p=(now-guest.time)/guest.life;if(p<0||p>=1)continue;const fade=Math.min(1,p*8,(1-p)*6);g.globalAlpha=fade*.7;g.fillStyle=g.strokeStyle=guest.color;g.lineWidth=1;
  if(guest.kind===0){const x=w*(reduced?.70:.12+p*.75),y=h*(reduced?.25:.22+p*.15),tail=reduced?8:28+guest.field*3;g.beginPath();g.moveTo(x-tail,y-tail*.22);g.lineTo(x,y);g.stroke();g.fillRect(x-3,y-3,6,6);g.fillRect(x-1,y-7,2,14);g.fillRect(x-7,y-1,14,2)}
  if(guest.kind===1){const x=w*(reduced?.68:.88-p*.55),y=h*.27+(reduced?0:Math.sin(p*Math.PI*2)*8);g.fillRect(x-9,y-12,18,6);g.fillRect(x-15,y-6,30,6);g.fillRect(x-20,y,40,4);g.fillRect(x-13,y+5,4,3);g.fillRect(x-2,y+5,4,3);g.fillRect(x+9,y+5,4,3);if(guest.field>=2){g.globalAlpha=fade*.08;g.beginPath();g.moveTo(x-8,y+9);g.lineTo(x-23,y+47);g.lineTo(x+23,y+47);g.lineTo(x+8,y+9);g.closePath();g.fill()}}
  if(guest.kind===2){const x=w*.70,y=h*.58,bounce=reduced?0:Math.sin(phase*Math.PI)*8,step=reduced?0:Math.sin(phase*Math.PI*2)*5;
   // A separate small visitor, behind the path, dances in time without changing play.
   g.fillRect(x-7,y-25-bounce,14,12);g.fillRect(x-5,y-13-bounce,10,12);g.fillRect(x-12,y-17-bounce-step,5,3);g.fillRect(x+7,y-17-bounce+step,5,3);g.fillRect(x-5,y-1-bounce+step,3,7);g.fillRect(x+2,y-1-bounce-step,3,7);g.fillStyle='#151823';g.fillRect(x-4,y-22-bounce,2,2);g.fillRect(x+2,y-22-bounce,2,2);g.fillStyle=guest.color;if(guest.field>=3){g.fillRect(x-10,y-28-bounce,20,3);g.fillRect(x-4,y-34-bounce,8,6)}}
 }
 g.restore();
}
export function drawCheer(g:CanvasRenderingContext2D,w:number,h:number,phase:number,local:number,color:string,reduced:boolean){
 const progress=(local+phase)/4,fade=Math.min(1,progress*6,(1-progress)*6);
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();g.fillStyle=g.strokeStyle=color;g.globalAlpha=fade*.65;g.lineWidth=1;
 for(let i=0;i<3;i++){const x=w*(.56+i*.17),y=h*.53,bounce=reduced?0:Math.sin(phase*Math.PI+i*.4)*3;
  g.fillRect(x-6,y-23-bounce,12,10);g.fillRect(x-4,y-13-bounce,8,12);g.fillRect(x-5,y-bounce,3,5);g.fillRect(x+2,y-bounce,3,5);g.fillRect(x-11,y-20-bounce,4,9);g.fillRect(x+7,y-24-bounce,4,12);
  g.beginPath();g.moveTo(x+11,y-15-bounce);g.lineTo(x+11,y-38-bounce);g.stroke();g.fillRect(x+11,y-38-bounce,13,8);g.fillStyle='#151823';g.fillRect(x+15,y-35-bounce,5,2);g.fillRect(x-3,y-20-bounce,2,2);g.fillRect(x+2,y-20-bounce,2,2);g.fillStyle=color;
 }
 g.restore();
}
