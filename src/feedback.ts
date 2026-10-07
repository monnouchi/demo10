export function drawFeedback(g:CanvasRenderingContext2D,w:number,h:number,label:string,age:number,color:string,power:number,reduced:boolean){
 const perfect=label==='PERFECT',good=label==='GOOD',life=perfect?.28:good?.24:.22,p=age/life;if(p<0||p>=1)return;
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h*.48-128));g.clip();
 const scale=reduced?1:age<.08?1+(perfect?.18:good?.09:.06)*Math.sin(age/.08*Math.PI):1-.035*p;
 g.translate(w*.5,h*.32-(reduced?0:Math.sin(p*Math.PI)*(perfect?5:2)));g.scale(scale,scale);
 g.globalAlpha=Math.min(1,(1-p)*4);g.textAlign='center';g.textBaseline='alphabetic';g.fillStyle=color;
 g.font=`bold ${perfect?24+power*.65:good?22:17}px PulsePixel, monospace`;
 if(perfect&&!reduced){g.shadowColor=color;g.shadowBlur=5+power;g.strokeStyle=color+'30';g.lineWidth=3;g.strokeText(label,0,0)}
 g.fillText(label,0,0);g.shadowBlur=0;
 if(perfect){g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.moveTo(-35,10);g.lineTo(35,10);g.stroke();
  if(!reduced)for(let i=0;i<Math.min(8,4+power);i++){const a=i*Math.PI*2/Math.min(8,4+power),r=38+p*(18+power*2);g.globalAlpha=(1-p)*.65;g.fillRect(Math.cos(a)*r-2,Math.sin(a)*r*.55-9,3,3)}
 }else if(good){g.globalAlpha=(1-p)*.4;g.fillRect(-22,8,44,2)}
 g.restore();
}
export function drawHopTrail(g:CanvasRenderingContext2D,w:number,h:number,x:number,y:number,now:number,jump:number,second:number,landing:number,scale:number,power:number,field:number,color:string,reduced:boolean){
 if(second<=jump||now<second||now>=landing)return;
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h-256));g.clip();
 if(reduced){g.fillStyle=color;g.globalAlpha=.35;g.fillRect(x-22*scale,y-42*scale,3,3);g.fillRect(x+19*scale,y-42*scale,3,3);g.restore();return}
 const count=Math.min(6,3+Math.floor(power/2));
 for(let i=count;i>=1;i--){const sample=now-i*.022;if(sample<second)continue;
  const p=Math.max(0,Math.min(1,(sample-jump)/Math.max(.05,landing-jump))),q=Math.max(0,Math.min(1,(sample-second)/(landing-second)));
  const height=(Math.sin(p*Math.PI)*64+Math.sin(q*Math.PI)*34)*.85,px=x-i*(2+power*.3+field*.35),py=y-6*.85-height-15*scale;
  g.globalAlpha=(1-i/(count+1))*.35;g.strokeStyle=color;g.lineWidth=1;g.beginPath();g.rect(px-6*scale,py-6*scale,12*scale,12*scale);g.stroke();
  if(power>=3){g.fillStyle=i%2?'#8bdfff':color;g.fillRect(px-11*scale,py,3,3);if(field>=3){g.beginPath();g.moveTo(px-12*scale,py+5*scale);g.lineTo(px-18*scale,py+5*scale);g.stroke()}}
 }
 g.restore();
}
