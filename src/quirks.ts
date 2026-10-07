import {drawBuddy} from './character';
// Seven deliberately silly guests. Every shape is procedural and original.
export function drawQuirk(g:CanvasRenderingContext2D,w:number,h:number,progress:number,kind:number,field:number,color:string,reduced:boolean){
 const p=reduced?.45:progress;g.save();g.fillStyle=g.strokeStyle=color;g.lineWidth=1.5;
 if(kind===3){ // Flying fish: a low-to-high arc, with flapping fins.
  g.translate(w*(.46+p*.42),h*(.39-Math.sin(p*Math.PI)*.15));g.rotate(reduced?0:(p-.5)*.8);const flap=reduced?3:Math.sin(p*Math.PI*10)*5;
  g.fillRect(-15,-5,25,10);g.fillRect(-9,-8,14,16);g.beginPath();g.moveTo(8,0);g.lineTo(22,-10);g.lineTo(22,10);g.closePath();g.fill();g.beginPath();g.moveTo(-7,1);g.lineTo(3,15+flap);g.lineTo(8,2);g.stroke();g.beginPath();g.moveTo(-6,-4);g.lineTo(4,-13-flap);g.lineTo(9,-3);g.stroke();g.fillStyle='#151823';g.fillRect(-12,-3,3,3);
 }else if(kind===4){ // Ninja: dart, stop, vanish; scarf follows the dart.
  const dash=p<.45?p/.45:1;g.translate(w*(.88-dash*.3),h*.30);g.scale(.7,.7);g.rotate(reduced?0:Math.sin(p*Math.PI*2)*.2);drawBuddy(g,color,'#151823',false,false,7,3,false);g.fillStyle='#151823';g.fillRect(-15,-29,30,11);g.fillStyle='#f3f5e9';g.fillRect(-10,-23,20,4);g.fillStyle='#151823';g.fillRect(-7,-23,3,3);g.fillRect(4,-23,3,3);g.fillStyle=color;g.fillRect(12,-27,28*(1-p)+6,3);g.fillRect(30,-25,4,7);g.beginPath();g.moveTo(-27,-20);g.lineTo(-40,-35);g.stroke();
 }else if(kind===5){ // Giant whale: slow horizontal crossing with a water spout.
  g.translate(w*(1.12-p*.9),h*.27);const size=Math.min(1,w/390);g.scale(size,size);g.beginPath();g.moveTo(-52,-13);g.lineTo(-36,-26);g.lineTo(23,-26);g.lineTo(43,-12);g.lineTo(49,11);g.lineTo(32,23);g.lineTo(-33,23);g.lineTo(-52,9);g.closePath();g.fill();g.beginPath();g.moveTo(43,0);g.lineTo(76,-19);g.lineTo(65,1);g.lineTo(77,18);g.closePath();g.fill();g.fillStyle='#151823';g.fillRect(-34,-11,5,5);g.fillRect(-32,12,29,3);g.fillStyle=color;g.fillRect(-5,15,15,18);const spout=reduced?12:Math.sin(p*Math.PI)*26;g.beginPath();g.moveTo(-8,-26);g.lineTo(-8,-26-spout);g.lineTo(-19,-31-spout);g.moveTo(-8,-26-spout);g.lineTo(3,-31-spout);g.stroke();
 }else if(kind===6){ // Balloon: rises slowly, basket and strings sway below it.
  g.translate(w*(.73+(reduced?0:Math.sin(p*Math.PI*2)*.05)),h*(.43-p*.20));g.beginPath();g.moveTo(-15,-21);g.lineTo(15,-21);g.lineTo(24,-9);g.lineTo(21,10);g.lineTo(8,24);g.lineTo(-8,24);g.lineTo(-21,10);g.lineTo(-24,-9);g.closePath();g.stroke();g.fillRect(-4,-19,8,40);g.beginPath();g.moveTo(-8,24);g.lineTo(-6,39);g.lineTo(6,39);g.lineTo(8,24);g.stroke();g.fillRect(-8,37,16,9);
 }else if(kind===7){ // Bodybuilder: same species, double biceps and a belt.
  g.translate(w*.72,h*.33);g.scale(.85,.85);g.rotate(reduced?0:Math.sin(p*Math.PI*4)*.06);drawBuddy(g,color,'#151823',false,true,0,0,true);g.fillStyle=color;g.fillRect(-29,-35,9,10);g.fillRect(20,-35,9,10);g.fillRect(-28,-29,13,5);g.fillRect(15,-29,13,5);g.fillStyle='#f3f5e9';g.fillRect(-14,-5,28,4);g.fillStyle='#151823';g.fillRect(-3,-6,6,6);
 }else if(kind===8){ // Kung-fu: lift, airborne kick, landing pose.
  const kick=reduced?.65:Math.sin(p*Math.PI);g.translate(w*(.57+p*.22),h*(.38-kick*.10));g.scale(.72,.72);g.rotate(reduced?0:-kick*.3);drawBuddy(g,color,'#151823',false,false,9,0,true);g.fillStyle='#f3f5e9';g.fillRect(-15,-26,30,3);g.fillRect(-12,-6,24,3);g.fillStyle=color;g.fillRect(10,-4,8+kick*22,6);g.fillRect(30* kick+12,-8,6,9);g.fillRect(-9,5,6,10);g.fillStyle='#151823';g.fillRect(-2,-6,4,4);
 }else if(kind===9){ // Banana: a tumbling curved silhouette with a peel tip.
  g.translate(w*(.83-p*.30),h*(.29+Math.sin(p*Math.PI)*.06));g.rotate(reduced?-.4:p*Math.PI*2*(field%2?-1:1));g.fillStyle='#ffd588';g.beginPath();g.moveTo(-21,-18);g.bezierCurveTo(-8,20,20,17,24,-12);g.bezierCurveTo(8,7,-2,6,-21,-18);g.closePath();g.fill();g.strokeStyle='#c1ff88';g.beginPath();g.moveTo(-21,-18);g.lineTo(-23,-25);g.stroke();g.fillStyle='#151823';g.fillRect(19,-12,4,4);
 }
 g.restore();
}
