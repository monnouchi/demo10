import {drawBuddy} from './character';
import {drawQuirk} from './quirks';
export type Guest={kind:number,time:number,life:number,field:number,color:string,dancers?:number,born?:number};
export function drawGuests(g:CanvasRenderingContext2D,w:number,h:number,now:number,guests:readonly Guest[],phase:number,reduced:boolean){
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();
 for(const guest of guests){const p=(now-guest.time)/guest.life;if(p<0||p>=1)continue;const fade=guest.kind===2?Math.min(1,(now-(guest.born??guest.time))*2,(1-p)*6):Math.min(1,p*8,(1-p)*6);g.globalAlpha=fade*.7;g.fillStyle=g.strokeStyle=guest.color;g.lineWidth=1;
  if(guest.kind>=3)drawQuirk(g,w,h,p,guest.kind,guest.field,guest.color,reduced);
  if(guest.kind===0)drawPhenomenon(g,w,h,p,guest.field,reduced);
  if(guest.kind===1)drawCraft(g,w,h,p,guest.field,fade,reduced);
  if(guest.kind===2){const count=Math.max(2,Math.min(6,guest.dancers??2)),rest=Math.max(0,(now-guest.time-.8)/.8),visible=Math.max(2,count-rest);
   for(let i=0;i<count;i++){const opacity=i<2?1:Math.max(0,Math.min(1,visible-i));if(!opacity)continue;const formation=dancePosition(i,guest.field,phase,reduced),x=w*formation.x,y=h*formation.y,bounce=reduced?0:Math.sin(phase*Math.PI+i*.4)*5,step=reduced?0:Math.sin(phase*Math.PI*2+i*.5)*4;
    g.save();g.globalAlpha=fade*.7*opacity;g.translate(x,y-bounce);g.scale(.50,.50);g.rotate(reduced?0:Math.sin(phase*Math.PI*2+i*.4)*(.08+guest.field*.035));drawBuddy(g,i%2?'#e1a5ff':guest.color,'#151823',false,guest.field>=2,4+step,step,true);
    if((guest.field+i)%3===0){g.fillStyle=guest.color;g.fillRect(-20,-38,40,4);g.fillRect(-8,-46,16,8)}else{g.fillStyle='#f3f5e9';g.fillRect(-13,-9,26,3)}g.restore();}
  }

 }
 g.restore();
}
export function drawCheer(g:CanvasRenderingContext2D,w:number,h:number,phase:number,local:number,color:string,reduced:boolean){
 const progress=(local+phase)/4,fade=Math.min(1,progress*6,(1-progress)*6);
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();g.fillStyle=g.strokeStyle=color;g.globalAlpha=fade*.65;g.lineWidth=1;
 for(let i=0;i<3;i++){const x=w*(.85+i*.22-(local+phase)*.22),y=h*.45,bounce=reduced?0:Math.sin(phase*Math.PI+i*.4)*3;
  if(x<-24||x>w+24)continue;g.save();g.translate(x,y-bounce);g.scale(.55,.55);drawBuddy(g,color,'#151823',false,true,0,0,true);
  // A headband and a tiny flag distinguish the cheering friends.
  g.fillStyle='#f3f5e9';g.fillRect(-15,-27,30,3);g.fillStyle=g.strokeStyle=color;g.beginPath();g.moveTo(23,-19);g.lineTo(23,-55);g.stroke();g.fillRect(23,-55,22,12);g.fillStyle='#151823';g.fillRect(30,-51,8,3);g.restore();

 }
 g.restore();
}
// World-anchored side lane: the same .22 screen-width per beat as the platforms.
export function sideLane(w:number,h:number,count:number,progress:number){
 const friends:{slot:number,x:number,y:number,opacity:number}[]=[];
 for(let i=0;i<8;i++){const slot=Math.floor(progress)-2+i,x=w*(.28+(slot-progress)*.22),rank=((slot%6)+6)%6,opacity=Math.max(0,Math.min(1,count-rank));
  if(x<-16||x>w+16||!opacity)continue;friends.push({slot,x,y:h*(.43+(slot%2? .04:0)),opacity})}
 return friends.slice(0,6);
}
export function drawCrowd(g:CanvasRenderingContext2D,w:number,h:number,count:number,phase:number,progress:number,color:string,reduced:boolean){
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();
 for(const friend of sideLane(w,h,count,progress)){const bounce=reduced?0:Math.sin(phase*Math.PI+friend.slot*.5)*2;
  g.save();g.globalAlpha=friend.opacity*.5;g.translate(friend.x,friend.y-bounce);g.scale(.43,.43);drawBuddy(g,color,'#151823',false,true,0,0,true);g.fillStyle=friend.slot%2?'#f3f5e9':color;g.fillRect(-17,-27,34,3);g.restore();
 }
 g.restore();
}

function dancePosition(i:number,field:number,phase:number,reduced:boolean){
 if(field===0)return{x:.48+i*.075,y:.56};
 if(field===1)return{x:.51+(i%3)*.15,y:.57-Math.floor(i/3)*.075-(i%3)*.012};
 if(field===2)return{x:.65+(i%2?1:-1)*(.06+Math.floor(i/2)*.07),y:.57-Math.floor(i/2)*.045};
 if(field===3)return{x:.51+(i%3)*.15,y:.57-Math.floor(i/3)*.075+(reduced?0:Math.sin(phase*Math.PI*2+i)*.009)};
 return{x:.66+Math.cos(i*Math.PI/3)*.17,y:.535+Math.sin(i*Math.PI/3)*.045};
}
function polygon(g:CanvasRenderingContext2D,x:number,y:number,r:number,n:number,star=false){g.beginPath();for(let i=0;i<n;i++){const a=-Math.PI/2+i*Math.PI*2/n,rr=star&&i%2?r*.45:r,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;if(i===0)g.moveTo(px,py);else g.lineTo(px,py)}g.closePath();g.stroke()}
function drawPhenomenon(g:CanvasRenderingContext2D,w:number,h:number,progress:number,field:number,reduced:boolean){
 const p=reduced?.35:progress;
 if(field===0){const x=w*(.15+Math.floor(p*8)/8*.7),y=h*.29;g.fillRect(x-4,y-4,8,8);g.beginPath();g.moveTo(x-35,y+12);g.lineTo(x-15,y+12);g.lineTo(x-15,y);g.lineTo(x,y);g.stroke()}
 else if(field===1){const x=w*.76,y=h*(.23+p*.17);polygon(g,x,y,7,4);g.beginPath();g.moveTo(x,y-30);g.lineTo(x,y-9);g.moveTo(x-8,y-20);g.lineTo(x-8,y-10);g.stroke()}
 else if(field===2){const x=w*(.75-p*.2),y=h*(.25+p*.1),r=4+p*10;polygon(g,x,y,r,3);g.beginPath();g.moveTo(x+r,y-6);g.lineTo(x+35,y-20);g.moveTo(x+r,y);g.lineTo(x+40,y-12);g.stroke()}
 else if(field===3){const x=w*(.7+Math.sin(p*Math.PI*2)*.07),y=h*(.38-p*.14);g.beginPath();g.moveTo(x,y+8);g.bezierCurveTo(x-15,y-2,x-8,y-13,x,y-5);g.bezierCurveTo(x+8,y-13,x+15,y-2,x,y+8);g.stroke();g.strokeRect(x-19,y+15,3,3);g.strokeRect(x+16,y+22,3,3)}
 else{const a=p*Math.PI*2,x=w*(.68+Math.cos(a)*.16),y=h*(.30+Math.sin(a)*.07);polygon(g,x,y,9,10,true);for(let i=1;i<=3;i++){const aa=a-i*.13;g.fillRect(w*(.68+Math.cos(aa)*.16),h*(.30+Math.sin(aa)*.07),2,2)}}
}
function drawCraft(g:CanvasRenderingContext2D,w:number,h:number,progress:number,field:number,fade:number,reduced:boolean){
 const p=reduced?.4:progress;g.save();
 if(field===0){g.translate(w*(.88-p*.55),h*.29);g.fillRect(-9,-12,18,6);g.fillRect(-15,-6,30,6);g.fillRect(-20,0,40,4);for(let i=-1;i<=1;i++)g.fillRect(i*11-2,5,4,3)}
 else if(field===1){g.translate(w*(.76-p*.3),h*(.25+p*.12));polygon(g,0,0,15,4);g.fillRect(-5,-7,10,14);g.fillRect(-24,-5,5,10);g.fillRect(19,-5,5,10);g.beginPath();g.moveTo(-19,0);g.lineTo(19,0);g.stroke()}
 else if(field===2){g.translate(w*.72,h*.30);g.rotate(reduced?0:p*.6);const scale=.65+p*.5;g.scale(scale,scale);polygon(g,0,0,22,6);polygon(g,0,0,12,6);g.fillRect(-4,-4,8,8)}
 else if(field===3){g.translate(w*(.83-p*.4),h*.29+(reduced?0:Math.sin(p*Math.PI*2)*12));g.beginPath();g.moveTo(-22,4);g.lineTo(22,4);g.lineTo(13,12);g.lineTo(-13,12);g.closePath();g.fill();g.beginPath();g.moveTo(0,1);g.lineTo(0,-24);g.lineTo(17,-3);g.closePath();g.stroke();g.fillRect(-24,16,48,2)}
 else{const a=p*Math.PI*2;g.translate(w*(.68+Math.cos(a)*.14),h*(.28+Math.sin(a)*.05));g.beginPath();g.ellipse(0,0,24,8,-.3,0,Math.PI*2);g.stroke();g.fillRect(-8,-8,16,16);for(let i=0;i<3;i++){const aa=i*Math.PI*2/3;g.fillRect(Math.cos(aa)*29-2,Math.sin(aa)*12-2,4,4)}}
 if(field>=2){g.globalAlpha=fade*.07;g.beginPath();g.moveTo(-8,15);g.lineTo(-23,48);g.lineTo(23,48);g.lineTo(8,15);g.closePath();g.fill()}g.restore();
}
