import type {Beat} from './journey';
export function roadSegment(beat:Beat,x:number,spacing:number){
 const u=beat.local;
 if(beat.kind==='main'&&u===59&&beat.stage<4)return {entry:x+spacing,exit:x+5*spacing};
 if(beat.kind==='bridge')return {entry:x-u*spacing,exit:x+(4-u)*spacing};
 if(beat.kind==='main'&&u<2&&beat.stage>0)return {entry:x-(4+u)*spacing,exit:x-u*spacing};
 return null;
}
export function roadAt(beat:Beat,phase:number,x:number,spacing:number){
 const road=roadSegment(beat,x,spacing);return road?{entry:road.entry-phase*spacing,exit:road.exit-phase*spacing}:null;
}
export function drawRoad(g:CanvasRenderingContext2D,w:number,y:number,entry:number,exit:number,scale:number,color:string){
 const half=26*scale,left=Math.max(-half,entry-half),right=Math.min(w+half,exit+half);
 if(right<=left)return;
 g.save();g.fillStyle=color;g.fillRect(left,y,right-left,4*scale);g.globalAlpha=.35;g.fillRect(left,y+4*scale,right-left,12*scale);
 for(let px=entry;px<=exit;px+=w*.22){if(px<-30||px>w+30)continue;g.fillRect(px-2*scale,y+7*scale,4*scale,5*scale)}
 // Small finish/start posts move with the road, outside the player's path.
 g.globalAlpha=.8;for(const [px,height] of [[entry-half,18],[exit+half,28]]){if(px<-30||px>w+30)continue;g.fillRect(px-1*scale,y-height*scale,2*scale,height*scale);g.fillRect(px,y-height*scale,9*scale,4*scale)}
 g.restore();
}
export function stumblePose(age:number,reduced:boolean){
 const strength=age>=0&&age<.18?Math.sin(age/.18*Math.PI):0;
 return {angle:strength*(reduced?.045:.22),squash:strength*(reduced?.025:.07)};
}
