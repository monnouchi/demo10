// One bounded scene per field: beat-driven geometry, never camera shake or a flash.
export function drawShowcase(g:CanvasRenderingContext2D,w:number,h:number,field:number,rich:number,color:string,phase:number,local:number,reduced:boolean,opacity=1){
 const p=reduced?0:phase,phrase=reduced?0:Math.floor(local/8)%3,pulse=Math.sin(p*Math.PI),cx=w*.62,cy=h*.35;
 g.save();g.beginPath();g.rect(0,128,w,Math.max(0,h*.53-128));g.clip();g.strokeStyle=g.fillStyle=color;g.lineWidth=1;g.globalAlpha=(.08+rich*.012)*opacity;
 if(field===0){
  for(let row=0;row<3;row++){const y=h*(.32+row*.065),start=w*(.1+row*.06);g.beginPath();g.moveTo(start,y);g.lineTo(w*.85,y);g.stroke();
   const x=start+(w*.75-start)*p;g.globalAlpha=(.22+rich*.02)*opacity;g.fillRect(x-3,y-3,6,6);g.globalAlpha=(.08+rich*.012)*opacity;
   if(phrase===1){g.strokeRect(w*.7-8,y-8,16,16)}else if(phrase===2){g.beginPath();g.moveTo(w*.64,y);g.lineTo(w*.72,y-12);g.lineTo(w*.80,y);g.stroke()}
  }
 }else if(field===1){
  for(let i=0;i<4;i++){const x=w*(.16+i*.21),top=h*(.27+(i%2)*.04),width=w*.11;
   g.strokeRect(x,top,width,h*.20);const y=top+(h*.20-5)*p;g.globalAlpha=(.22+rich*.018)*opacity;g.fillRect(x,y,width,3);g.globalAlpha=(.08+rich*.012)*opacity;
   if(phrase!==0){g.beginPath();g.moveTo(x+width/2,top);g.lineTo(cx,h*.21+phrase*8);g.stroke()}
  }
 }else if(field===2){
  for(let i=4;i>=0;i--){const size=(16+i*18+(reduced?0:p*16))*(1+rich*.035),turn=phrase===1?Math.PI/6:phrase===2?p*.12:0;g.beginPath();for(let j=0;j<6;j++){const a=j*Math.PI/3+turn,x=cx+Math.cos(a)*size,y=cy+Math.sin(a)*size*.55;if(j===0)g.moveTo(x,y);else g.lineTo(x,y)}g.closePath();g.stroke()}
 }else if(field===3){
  for(let row=0;row<4;row++){g.beginPath();for(let i=0;i<=12;i++){const x=w*i/12,y=h*(.30+row*.04)+Math.sin(i*.65-p*Math.PI*2+row)*(4+rich+phrase*3);if(i===0)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke()}
  for(let i=0;i<3;i++){const x=w*(.22+i*.28),y=h*.39+Math.sin(p*Math.PI*2+i)*8;g.strokeRect(x-4,y-4,8,8)}
 }else{
  for(let i=0;i<3;i++){const r=30+i*22,tilt=phrase===0?.35:phrase===1?.65:.9;g.beginPath();g.ellipse(cx,cy,r*(1+rich*.04),r*tilt,phrase*Math.PI/6,0,Math.PI*2);g.stroke();const angle=(p+i/3)*Math.PI*2;g.fillRect(cx+Math.cos(angle)*r-3,cy+Math.sin(angle)*r*tilt-3,6,6)}
  g.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+(reduced?0:p*.15),r=14+pulse*6,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)}g.closePath();g.stroke();
 }
 g.restore();
}
// Different moves are discovered by field/phrase, not exhausted at an early combo.
export function trick(field:number,local:number,p:number,extra:number,rich:number,reduced:boolean){
 const variant=(Math.floor(local/4)+field)%3,s=Math.sin(p*Math.PI);
 if(reduced)return {angle:0,lean:0,arms:extra>0?1:0,feet:0};
 const angle=field===0?s*(variant===0?.12:-.12):field===1?s*(variant===0?.32:-.28):field===2?variant===1&&rich>=2?p*Math.PI*2:s*.38:field===3?s*(variant===2?-.50:.45):variant===1&&rich>=2?p*Math.PI*2:s*(variant===2?-.65:.55);
 return {angle:angle+extra*(.1+field*.10),lean:field===1?s*.13:field===3?s*.10:0,arms:extra>.05?field>=2?2:1:variant===2&&field>=3?1:0,feet:field>=2?s*(variant===0?7:-4):s*3};
}
