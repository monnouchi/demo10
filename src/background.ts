// Procedural scenery: fixed shape counts, no images, particles or extra animation clocks.
export function drawBackdrop(g:CanvasRenderingContext2D,w:number,h:number,stage:number,color:string,time:number,reduced:boolean){
 if(stage<1)return;
 const t=reduced?0:Math.max(0,time);
 g.save();g.beginPath();g.rect(0,118,w,Math.max(0,h-246));g.clip();
 const band=h*.50;
 g.fillStyle=color+'0a';g.fillRect(0,band,w,h-band);
 // Distant sky travels slowly; closer silhouettes grow and travel faster.
 if(stage>=2){
  const span=w*.65,shift=(t*w*.012)%span;g.fillStyle=color+'14';
  for(let i=-1;i<3;i++){const x=i*span-shift;g.beginPath();g.moveTo(x,band);g.lineTo(x+span*.28,band-h*.15);g.lineTo(x+span*.52,band-h*.08);g.lineTo(x+span*.78,band-h*.19);g.lineTo(x+span,band);g.closePath();g.fill()}
 }
 if(stage>=3){
  const span=w*.8,shift=(t*w*.032)%span;g.fillStyle=color+'19';
  for(let i=-1;i<3;i++){const x=i*span-shift;g.beginPath();g.moveTo(x,h*.57);g.quadraticCurveTo(x+span*.25,h*.39,x+span*.5,h*.52);g.quadraticCurveTo(x+span*.7,h*.43,x+span,h*.57);g.lineTo(x+span,h);g.lineTo(x,h);g.closePath();g.fill()}
 }
 if(stage>=4){
  const span=w*.22,shift=(t*w*.055)%span;g.fillStyle=color+'1a';
  for(let i=-1;i<6;i++){const x=i*span-shift,top=h*.56-(3+(i+6)%3)*h*.025;g.fillRect(x,top,span*.58,h*.62-top);if(stage>=6){g.fillStyle=color+'25';g.fillRect(x+span*.13,top+8,3,4);g.fillRect(x+span*.36,top+16,3,4);g.fillStyle=color+'1a'}}
 }
 if(stage>=5){
  const span=w*.46,shift=(t*w*.11)%span;g.fillStyle=color+'14';
  for(let i=-1;i<4;i++){const x=i*span-shift;g.beginPath();g.moveTo(x,h*.83);g.lineTo(x+span*.10,h*.72);g.lineTo(x+span*.29,h*.75);g.lineTo(x+span*.42,h*.68);g.lineTo(x+span,h*.83);g.closePath();g.fill()}
 }
 if(stage>=6){
  g.fillStyle=color+'55';
  for(let i=0;i<12;i++){const x=((i*71+19-t*w*.005)%w+w)%w,y=h*.23+(i*29)%(h*.16);g.fillRect(x,y,2,2)}
 }
 if(stage>=7){
  const span=w*.7,shift=(t*w*.18)%span;g.strokeStyle=color+'1c';g.lineWidth=2;
  for(let i=-1;i<3;i++){const x=i*span-shift;g.beginPath();g.moveTo(x,h*.81);g.lineTo(x+span*.22,h*.76);g.lineTo(x+span*.62,h*.82);g.stroke()}
 }
 g.restore();
}
