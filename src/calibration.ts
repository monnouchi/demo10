// Estimate a player's repeatable tap bias, never the device's physical latency.
export class IntroCalibration {
 private samples=new Map<number,number>();
 private last=-Infinity;
 private disabled=false;
 done=false;
 constructor(muted:boolean,private span=.5){this.disabled=muted}
 mute(){this.disabled=true}
 tap(elapsed:number){
  if(this.done||this.disabled||elapsed-this.last<.18)return;
  this.last=elapsed;
  const beat=Math.round(elapsed/this.span),error=elapsed-beat*this.span;
  if(beat<1||beat>6||Math.abs(error)>.16||this.samples.has(beat))return;
  this.samples.set(beat,error);
 }
 finish():number|null{
  if(this.done)return null;this.done=true;
  if(this.disabled||this.samples.size<4)return null;
  const values=[...this.samples.values()].sort((a,b)=>a-b);
  const median=(v:number[])=>v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;
  const center=median(values),inliers=values.filter(v=>Math.abs(v-center)<=.045);
  if(inliers.length<4||inliers.length/values.length<.75||inliers.at(-1)!-inliers[0]>.06)return null;
  const bias=median(inliers);
  // Reject implausible bias rather than force a noisy estimate to the limit.
  return Math.abs(bias)<=.12?bias:null;
 }
}
