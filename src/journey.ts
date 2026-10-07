export const levels=[
 {name:'CIRCUIT ROAD',bpm:120,key:0,minor:false,motif:[72,76,79,76,74,76,81,79,72,76,79,84,81,79,76,74],chords:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14]},
 {name:'DATA TOWERS',bpm:132,key:2,minor:false,motif:[72,76,79,76,81,79,74,79,76,84,81,79,74,79,76,72],chords:[0,6,2,3,1,5,4,3,8,6,2,11,12,1,14]},
 {name:'LIGHT TUNNEL',bpm:144,key:-3,minor:true,motif:[72,76,79,76,71,72,74,79,81,79,76,74,72,71,67,72],chords:[0,2,6,3,0,1,5,3,6,2,9,11,0,13,14]},
 {name:'SIGNAL SEA',bpm:156,key:5,minor:false,motif:[72,76,79,76,81,84,79,76,74,79,81,79,76,74,72,76],chords:[0,4,1,5,6,2,8,3,1,7,5,11,12,13,14]},
 {name:'STAR CORE',bpm:168,key:7,minor:false,motif:[72,76,79,76,84,81,79,84,86,84,81,79,76,79,83,84],chords:[0,3,1,4,6,5,2,11,7,8,10,3,12,13,14]},
] as const;
export type Beat={at:number,span:number,stage:number,local:number,hit:number,kind:'intro'|'main'|'bridge'|'outro'};
export const journey:Beat[]=[];
let at=0;
function add(kind:Beat['kind'],stage:number,local:number,span:number,hit=-1){journey.push({at,span,stage,local,hit,kind});at+=span}
for(let i=0;i<8;i++)add('intro',0,i,.5);
for(let stage=0;stage<5;stage++){
 if(stage>0)for(let i=0;i<4;i++){const bpm=levels[stage-1].bpm+(levels[stage].bpm-levels[stage-1].bpm)*(i+1)/4;add('bridge',stage,i,60/bpm)}
 for(let i=0;i<60;i++)add('main',stage,i,60/levels[stage].bpm,stage*60+i);
}
for(let i=0;i<12;i++)add('outro',4,i,60/168);
export const duration=at,targets=journey.filter(b=>b.kind==='main'),finale=journey.find(b=>b.kind==='outro')!.at;
export function windowFor(b:Beat){return Math.min(.14,b.span*.28)}
export function offWindow(b:Beat){return Math.min(.075,b.span*.15)}
export function position(time:number){let index=0;while(index+1<journey.length&&journey[index+1].at<=time)index++;const beat=journey[index];return {beat,index,phase:Math.max(0,Math.min(1,(time-beat.at)/beat.span))}}
export function pitch(midi:number,stage:number){const s=levels[stage],pc=((midi%12)+12)%12;return midi+s.key-(s.minor&&[4,9,11].includes(pc)?1:0)}
