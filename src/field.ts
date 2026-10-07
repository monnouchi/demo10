// Fixed procedural counts, monochrome silhouettes first; no external assets.
export function drawField(g:CanvasRenderingContext2D,w:number,h:number,field:number,rich:number,color:string,time:number,reduced:boolean,opacity=1){
 g.save();g.beginPath();g.rect(0,118,w,Math.max(0,h-246));g.clip();
 const travel=reduced?0:time*w*.04,span=w*.24,shift=travel%span,tile=Math.floor(travel/span);
 g.strokeStyle=color;g.fillStyle=color;g.globalAlpha=(.09+rich*.012)*opacity;g.lineWidth=1;
 for(let i=-1;i<7;i++){const x=i*span-shift;
  if(field===0){g.beginPath();g.moveTo(x,h*.51);g.lineTo(x+span*.35,h*.51);g.lineTo(x+span*.35,h*.44);g.lineTo(x+span*.75,h*.44);g.stroke();g.fillRect(x+span*.75-3,h*.44-3,6,6)}
  if(field===1){const top=h*(.28+(i+tile+8)%3*.05);g.fillRect(x,top,span*.55,h*.61-top);g.globalAlpha=(.16+rich*.02)*opacity;for(let j=0;j<3+rich;j++)g.fillRect(x+span*.1,top+12+j*14,span*.35,2);g.globalAlpha=(.09+rich*.012)*opacity}
  if(field===2){g.beginPath();g.moveTo(x,h*.25);g.lineTo(x+span*.72,h*.40);g.lineTo(x+span*.72,h*.58);g.lineTo(x,h*.72);g.stroke();if(rich>1){g.beginPath();g.moveTo(x+span*.2,h*.28);g.lineTo(x+span*.9,h*.41);g.lineTo(x+span*.9,h*.57);g.stroke()}}
  if(field===3){for(let j=0;j<3+Math.floor(rich/2);j++){const y=h*(.40+j*.045);g.beginPath();g.moveTo(x,y);g.lineTo(x+span*.28,y-8);g.lineTo(x+span*.58,y+8);g.lineTo(x+span*.86,y);g.stroke()}}
  if(field===4){g.beginPath();g.arc(x,h*.40,span*.30,0,Math.PI*2);g.stroke();g.fillRect(x-3,h*.40-3,6,6);if(rich>2){g.beginPath();g.moveTo(x,h*.4);g.lineTo(x+span,h*.3);g.stroke()}}
 }
 if(rich>=4){g.globalAlpha=.12*opacity;for(let i=0;i<12;i++)g.fillRect((i*67+time*(reduced?0:9))%w,h*.24+(i*37)%(h*.2),2,2)}
 g.restore();
}
export function platform(g:CanvasRenderingContext2D,x:number,y:number,scale:number,field:number,color:string,rich:number){
 const half=26*scale;g.fillStyle=color;g.fillRect(x-half,y,half*2,4*scale);
 g.globalAlpha=.7;
 if(field===0){g.fillRect(x-half+4*scale,y+4*scale,half*2-8*scale,7*scale);for(let i=-2;i<=2;i++)g.fillRect(x+i*8*scale,y+11*scale,3*scale,4*scale)}
 if(field===1){g.fillRect(x-half,y+5*scale,half*2,3*scale);g.fillRect(x-3*scale,y+8*scale,6*scale,10*scale)}
 if(field===2){g.beginPath();g.moveTo(x-half,y+4*scale);g.lineTo(x-half*.5,y+13*scale);g.lineTo(x+half*.5,y+13*scale);g.lineTo(x+half,y+4*scale);g.closePath();g.fill()}
 if(field===3){g.fillRect(x-half+3*scale,y+6*scale,half*2-6*scale,3*scale);g.fillRect(x-half+8*scale,y+12*scale,half*2-16*scale,2*scale)}
 if(field===4){g.beginPath();g.moveTo(x-half,y+4*scale);g.lineTo(x,y+16*scale);g.lineTo(x+half,y+4*scale);g.strokeStyle=color;g.lineWidth=2*scale;g.stroke()}
 if(rich>=4){g.globalAlpha=.08;g.fillRect(x-half,y+16*scale,half*2,60*scale)}
 g.globalAlpha=1;
}
export function fireworks(g:CanvasRenderingContext2D,w:number,h:number,time:number,reduced:boolean){
 const beat=time/(60/168);if(beat<0||beat>13)return;
 g.save();g.beginPath();g.rect(0,118,w,Math.max(0,h*.52-118));g.clip();
 const colors=['#8bdfff','#e1a5ff','#91ffe1','#fff5b2'];
 // Seven launches, at most three live bursts / 72 dots, lifetime 1.2s.
 const launches=[0,2,4,4.5,5,6.5,8];let active=0;
 for(let b=launches.length-1;b>=0;b--){const age=time-launches[b]*(60/168);if(age<0||age>1.2||active>=3)continue;active++;
  const p=age/1.2,x=w*[.22,.78,.50,.18,.82,.35,.67][b],y=h*(b===2?.26:.30);g.fillStyle=g.strokeStyle=colors[b%4];g.globalAlpha=(reduced?.40:.60)*(1-p);g.lineWidth=1;g.shadowColor=colors[b%4];g.shadowBlur=reduced?0:5;
  const r=reduced?24:10+(1-(1-p)**2)*Math.min(b===2?110:88,w*(b===2?.28:.23));
  if(!reduced){g.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3,px=x+Math.cos(a)*r*.55,py=y+Math.sin(a)*r*.55;if(i===0)g.moveTo(px,py);else g.lineTo(px,py)}g.closePath();g.stroke()}
  for(let i=0;i<(reduced?8:24);i++){const a=i*Math.PI*2/(reduced?8:24),px=x+Math.cos(a)*r,py=y+Math.sin(a)*r+(reduced?0:p*p*18);g.fillRect(px-2,py-2,4,4);if(!reduced&&i%4===0){g.beginPath();g.moveTo(px,py);g.lineTo(px-Math.cos(a)*12,py-Math.sin(a)*12);g.stroke()}}
 }
 g.restore();
}
