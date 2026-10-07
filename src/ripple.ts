export type Ripple={time:number,x:number,y:number,stage:number,field:number,color:string,life:number};

// All contours use one radius in CSS pixels, independent of the screen aspect ratio.
export function rippleContour(g:CanvasRenderingContext2D,x:number,y:number,r:number,field:number){
 g.beginPath();
 if(field===0){g.rect(x-r,y-r,r*2,r*2)}
 else if(field===3){g.moveTo(x,y+r*.85);g.bezierCurveTo(x-r*1.4,y-r*.15,x-r*.9,y-r*1.1,x,y-r*.4);g.bezierCurveTo(x+r*.9,y-r*1.1,x+r*1.4,y-r*.15,x,y+r*.85)}
 else{const n=field===1?3:field===2?6:10;for(let i=0;i<n;i++){const a=-Math.PI/2+i*Math.PI*2/n,rr=field===4&&i%2?r*.48:r,px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;if(i===0)g.moveTo(px,py);else g.lineTo(px,py)}g.closePath()}
}

// At most three short-lived waves; render behind platforms, character and beat UI.
export function drawRipples(g:CanvasRenderingContext2D,w:number,h:number,now:number,ripples:readonly Ripple[],reduced:boolean){
 g.save();g.beginPath();g.rect(0,118,w,Math.max(0,h-246));g.clip();
 for(const wave of ripples){
  const p=Math.max(0,(now-wave.time)/wave.life);if(p>=1)continue;
  const x=wave.x*w,y=wave.y*h,power=Math.min(7,wave.stage+wave.field);
  if(reduced){
   g.globalAlpha=.32*(1-p);g.strokeStyle=wave.color;g.lineWidth=2;
   rippleContour(g,x,y,26+power*2,wave.field);g.stroke();continue;
  }
  const radius=14+(1-(1-p)**2)*Math.hypot(w,h)*(.50+power*.065+wave.field*.025);
  const strength=Math.sin(Math.min(1,p*5)*Math.PI/2)*(1-p);
  const rings=power>=4?3:power>=1?2:1;
  for(let i=0;i<rings;i++){
   const r=Math.max(3,radius-i*(14+power*2));
   g.strokeStyle=i===1&&power>=4?'#8bdfff':wave.color;
   g.globalAlpha=strength*(i===0?.38+wave.field*.02:.14);g.lineWidth=i===0?2+power*.15:1;
   if(power===0)g.setLineDash([6,5]);
   rippleContour(g,x,y,r,wave.field);g.stroke();g.setLineDash([]);
  }
  // Sparse glints travel with the front, rather than a screen-wide flash.
  if(power>=2){
   g.fillStyle=wave.color;g.globalAlpha=strength*.35;
   for(let i=0;i<6;i++){const angle=i*Math.PI/3+.2;const px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius*.9;g.fillRect(px-2,py-2,4,4)}
  }
 }
 g.restore();
}
