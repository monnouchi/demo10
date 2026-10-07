// Shared species silhouette for the player and the visitors.
export function drawBuddy(g:CanvasRenderingContext2D,color:string,bg:string,pixel=false,celebrate=false,armRise=0,feet=0,cheeks=true){
 g.fillStyle=color;
 if(pixel){g.fillRect(-12,-32,24,4);g.fillRect(-16,-28,32,24);g.fillRect(-12,-4,24,4);g.fillRect(-8,-37,8,6)}
 else{g.beginPath();g.roundRect(-16,-32,32,32,11);g.fill();g.beginPath();g.ellipse(-5,-34,4,6,-.4,0,Math.PI*2);g.fill()}
 g.shadowBlur=0;
 if(celebrate){g.save();g.translate(-17,-22);g.rotate(-.7);g.fillRect(-3,-13,5,16);g.restore();g.save();g.translate(17,-22);g.rotate(.7);g.fillRect(-2,-13,5,16);g.restore()}else{g.fillRect(-20,-16-armRise,5,9);g.fillRect(15,-16-armRise,5,9)}
 g.fillRect(-11,feet,7,6);g.fillRect(4,-feet,7,6);
 g.fillStyle=bg;g.fillRect(-7,-22,4,5);g.fillRect(4,-22,4,5);
 g.beginPath();g.arc(0,-13,3,0,Math.PI);g.strokeStyle=bg;g.lineWidth=1.5;g.stroke();
 if(cheeks){g.fillStyle='#ff9aaf99';g.fillRect(-12,-15,4,3);g.fillRect(8,-15,4,3)}
}
