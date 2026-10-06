import './style.css';
import {drawBackdrop} from './background';
const $ = <T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=$<HTMLCanvasElement>('canvas'), g=canvas.getContext('2d')!;
const panel=$('#panel'), start=$<HTMLButtonElement>('#start'), message=$('#message');
const WORLD_SCALE=.85;
const BEAT=.5, INTRO_BEATS=8, OUTRO_BEATS=4, TOTAL=60, WINDOW=.14;
let audio:AudioContext, master:GainNode, voices:OscillatorNode[]=[], gains:GainNode[]=[], noise:AudioBufferSourceNode, noiseGain:GainNode, noiseFilter:BiquadFilterNode;
let resultShown=false;
let running=false, muted=false, beginning=0, scheduled=0, combo=0,best=0,hits=0,offset=0,lastInput=-1,jump=-10,flash='', feedbackUntil=0;
let successful=new Set<number>(), extras=new Set<number>(), landing=-10, secondJump=-10;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let judged=new Set<number>(), timer:number, w=390,h=800;
const melody=[72,76,79,76,74,76,81,79,72,76,79,84,81,79,76,74];
type Harmony={name:string,bass:number,inner:readonly number[],tones:readonly number[]};
const harmonyPath:readonly Harmony[]=[
 {name:'Cadd9',bass:36,inner:[64,62,67,64],tones:[60,64,67,74]},
 {name:'Fmaj7',bass:41,inner:[64,65,69,64],tones:[60,64,65,69]},
 {name:'Dm7',bass:38,inner:[65,60,69,65],tones:[60,62,65,69]},
 {name:'G7',bass:43,inner:[65,59,62,65],tones:[55,59,62,65]},
 {name:'Cmaj7',bass:36,inner:[64,59,67,64],tones:[60,64,67,71]},
 {name:'Dm9',bass:38,inner:[65,64,60,65],tones:[60,62,64,65,69]},
 {name:'Am/E',bass:40,inner:[64,60,67,64],tones:[57,60,64,67]},
 {name:'Bbmaj7#11',bass:34,inner:[62,65,69,64],tones:[58,62,65,69,76]},
 {name:'F/A',bass:33,inner:[65,64,60,65],tones:[60,64,65,69]},
 {name:'Fm7/Ab',bass:32,inner:[65,63,60,65],tones:[60,63,65,68]},
 {name:'G7sus4',bass:43,inner:[65,60,62,65],tones:[55,60,62,65]},
 {name:'G7',bass:43,inner:[65,59,62,65],tones:[55,59,62,65]},
 {name:'Am7',bass:33,inner:[64,67,60,64],tones:[57,60,64,67]},
 {name:'Dm7',bass:38,inner:[65,60,69,65],tones:[60,62,65,69]},
 {name:'G7',bass:43,inner:[65,59,62,65],tones:[55,59,62,65]},
];
const basicTriads:readonly (readonly number[])[]=[
 [60,64,67],[65,69,72],[62,65,69],[55,59,62],[60,64,67],
 [62,65,69],[57,60,64],[58,62,65],[65,69,72],[65,68,72],
 [55,59,62],[55,59,62],[57,60,64],[62,65,69],[55,59,62],
];
const sevenths=[71,64,60,65,71,60,67,69,64,63,65,65,67,60,65];
const ninths=[74,67,64,69,74,64,71,72,67,67,60,69,71,64,69];
let harmonyLevels=new Map<number,number>(),lastHarmonyLevel=0;
function rewardLevel(){return combo>=48?4:combo>=36?3:combo>=18?2:combo>=8?1:0}
function latchHarmony(k:number){
 if(k>=0&&k<TOTAL&&k%4===0&&!harmonyLevels.has(k/4)){
  lastHarmonyLevel+=Math.sign(rewardLevel()-lastHarmonyLevel);harmonyLevels.set(k/4,lastHarmonyLevel);
 }
}
function toneNear(target:number,tones:readonly number[]){
 let best=target,bestDistance=Infinity;
 for(let midi=target-12;midi<=target+12;midi++){if(tones.some(t=>t%12===midi%12)&&Math.abs(midi-target)<bestDistance){best=midi;bestDistance=Math.abs(midi-target)}}return best;
}
function harmonyAt(k:number):Harmony{
 if(k<0)return k< -4?{name:'C',bass:36,inner:[64,67,60,64],tones:[60,64,67]}:harmonyPath[11];
 // Resolve every ending to a clear tonic, even after a rewarded suspension.
 if(k>=TOTAL-1)return {name:'C',bass:36,inner:[64,67,60,64],tones:[60,64,67]};
 const index=Math.floor(k/4),base=harmonyPath[index],level=harmonyLevels.get(index)??lastHarmonyLevel;
 const triad=basicTriads[index];let tones=[...triad];
 if(level>=1)tones.push(sevenths[index]);if(level>=2)tones.push(ninths[index]);
 if(index===10&&level>=2)tones=tones.filter(t=>t%12!==11); // sus4 resolves to B in the next G7 bar.
 const colorTone=index===7?76:index===9?62:index===10||index===11||index===14?64:undefined;
 if(level>=3&&colorTone!==undefined)tones.push(colorTone);
 const third=index===10&&level>=2?60:toneNear(64,[triad[1]]),fifth=toneNear(64,[triad[2]]);
 const seventh=toneNear(64,[sevenths[index]]),ninth=toneNear(64,[ninths[index]]);
 const inner=level===0?[third,fifth,third,toneNear(64,[triad[0]])]:level===1?[third,seventh,third,fifth]:[third,seventh,level>=3&&colorTone!==undefined?toneNear(64,[colorTone]):ninth,third];
 return {name:base.name,bass:base.bass,inner,tones};
}
function chordToneNear(target:number,k:number){return toneNear(target,harmonyAt(k).tones)}
function initAudio(){
 audio=new AudioContext(); master=audio.createGain();master.gain.value=.55;master.connect(audio.destination);
 for(let i=0;i<3;i++){const o=audio.createOscillator(),v=audio.createGain();o.type=i===2?'triangle':'square';v.gain.value=0;o.connect(v).connect(master);o.start();voices.push(o);gains.push(v)}
 const b=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=b.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1}
 noise=audio.createBufferSource();noise.buffer=b;noise.loop=true;noiseGain=audio.createGain();noiseGain.gain.value=0;noiseFilter=audio.createBiquadFilter();noiseFilter.type='bandpass';noiseFilter.Q.value=.7;noise.connect(noiseFilter).connect(noiseGain).connect(master);noise.start();
}
function note(voice:number,midi:number,t:number,duration:number,level:number){const gain=gains[voice].gain;gain.setValueAtTime(0,t);voices[voice].frequency.setValueAtTime(440*2**((midi-69)/12),t);gain.setValueAtTime(level,t+.002);gain.linearRampToValueAtTime(0,t+duration)}
function leadSettings(n:number){
 const k=n-INTRO_BEATS;
 return {duration:n<INTRO_BEATS?.18:k>=TOTAL?(k===TOTAL+3?.44:.25):k===TOTAL-1?.36:.20,
  level:n<INTRO_BEATS?.045:k>=TOTAL?.065:.045+.025*Math.min(7,Math.floor(k/8))/7};
}
function playLead(n:number,t:number){const v=leadSettings(n);note(0,leadMidi(n),t,v.duration,v.level)}
function drum(t:number,tone:number,duration:number,level:number){
 noiseFilter.frequency.setValueAtTime(tone,t);noiseGain.gain.setValueAtTime(0,t);
 noiseGain.gain.setValueAtTime(level,t+.002);noiseGain.gain.linearRampToValueAtTime(0,t+duration);
}
function schedule(){
 if(!running)return;
 while(scheduled<INTRO_BEATS+TOTAL+OUTRO_BEATS&&beginning+scheduled*BEAT<audio.currentTime+.12){
  const n=scheduled++,t=beginning+n*BEAT;latchHarmony(n-INTRO_BEATS);playLead(n,t);
  if(n<INTRO_BEATS){const intro=harmonyAt(n-INTRO_BEATS);note(1,intro.inner[n%4],t,.24,.03);note(2,intro.bass,t,.22,.12);drum(t,n%2?1800:220,.055,n%2?.035:.025);continue}
  const k=n-INTRO_BEATS;
  if(k>=TOTAL){const o=k-TOTAL;note(1,[64,67,62,64][o],t,.44,.04);note(2,36,t,.45,.16);if(o===0)drum(t,220,.12,.055);continue}
  // The same two-beat rhythmic nucleus grows by song time, independent of combo.
  const section=Math.min(7,Math.floor(k/8)),growth=section/7,fill=section>=3&&k%8===7;
  const harmony=harmonyAt(k),root=harmony.bass;
  note(1,harmony.inner[k%4],t,section>=3?.17:.26,.028+.012*growth);
  note(2,root,t,k===59?.42:section>=2?.18:.25,.12+.055*growth);
  drum(t,k%2?1800+growth*700:220+growth*100,k%2?.085:.075,.032+.025*growth);
  if(section>=1&&(section>=2||k%2===0)){
   note(2,root+(section>=3&&k%2?12:0),t+.25,.085,.085+.045*growth);
   if(!fill)drum(t+.25,5500+growth*1000,.035,.020+.010*growth);
  }
  if(section>=3)note(1,harmony.inner[(k+1)%4]+((harmonyLevels.get(Math.floor(k/4))??0)>=4?12:0),t+.25,.11,.024+.012*growth);
  if(section>=4&&k%2===1&&!fill)drum(t+.375,6500,.025,.018+.008*growth);
  if(section>=5&&k%4===3)note(2,chordToneNear(root+7,k),t+.375,.065,.105);
  if(section>=6&&k%2===1)drum(t+.125,6000,.028,.023);
  if(fill){drum(t+.25,2100,.055,.04);drum(t+.375,2600,.06,.045)}
 }
}
function silence(){
 for(let i=0;i<gains.length;i++){gains[i].gain.cancelScheduledValues(audio.currentTime);gains[i].gain.setValueAtTime(0,audio.currentTime);voices[i].frequency.cancelScheduledValues(audio.currentTime)}
 noiseGain.gain.cancelScheduledValues(audio.currentTime);noiseGain.gain.setValueAtTime(0,audio.currentTime);noiseFilter.frequency.cancelScheduledValues(audio.currentTime);
}
async function begin(){if(running&&!resultShown)return;if(running)finish();resultShown=false;start.disabled=true;try{if(!audio)initAudio();await audio.resume();master.gain.setValueAtTime(muted?0:.55,audio.currentTime);silence();judged.clear();successful.clear();extras.clear();secondJump=landing=-10;harmonyLevels.clear();lastHarmonyLevel=0;combo=best=hits=scheduled=0;lastInput=-1;jump=-10;beginning=audio.currentTime+.3;running=true;panel.hidden=true;start.blur();updateStats();timer=window.setInterval(schedule,25);schedule()}catch{message.textContent='音の起動に失敗しました。もう一度お試しください。'}finally{start.disabled=false}}
function showResult(interrupted=false){resultShown=true;panel.hidden=false;$('h1').textContent=interrupted?'ひと休み。もう一度？':hits>=45?'世界が、色づいた！':'もう一歩、拍に乗ろう。';message.textContent=interrupted?'画面を離れたため停止しました。':`${hits} / 60 HIT · BEST COMBO ${best}`;start.textContent='もう一度あそぶ'}
function finish(interrupted=false){running=false;clearInterval(timer);silence();showResult(interrupted)}
function leadMidi(n:number){
 if(n<INTRO_BEATS)return [72,76,79,76,74,76,79,83][n];const k=n-INTRO_BEATS;
 if(k>=TOTAL)return [79,76,74,72][k-TOTAL];
 const motif=k>=52?[76,74,72,71,67,69,71,72][(k-52)%8]:k>=36&&k<40?[75,77,80,79][k-36]:melody[k%16];
 // Preserve the motif's contour; anchor strong beats to the current voicing.
 return k%2===0||k===TOTAL-1?chordToneNear(motif,k):motif;
}
function articulate(midi:number,now:number){
 gains[0].gain.cancelScheduledValues(now);note(0,midi,now,.055,.10);
 // Keep any already-reserved following beat after the short articulation.
 for(let n=0;n<scheduled;n++){const t=beginning+n*BEAT;if(t>now+.055)playLead(n,t)}
}
function tap(){
 if(!running||resultShown)return;const now=audio.currentTime,song=now-beginning-INTRO_BEATS*BEAT-offset;
 if(song < -WINDOW||song>(TOTAL-1)*BEAT+WINDOW)return;
 const n=Math.round(song/BEAT),error=Math.abs(song-n*BEAT);
 // Mandatory beats always take priority, including already judged beats.
 if(n>=0&&n<TOTAL&&error<=WINDOW){
  if(judged.has(n))return;lastInput=now;judged.add(n);successful.add(n);hits++;combo++;best=Math.max(best,combo);jump=now;secondJump=-10;landing=beginning+INTRO_BEATS*BEAT+(n+1)*BEAT;flash=error<.065?'PERFECT':'GOOD';feedbackUntil=now+.35;articulate(chordToneNear(leadMidi(n+INTRO_BEATS)+12,n),now);updateStats();return;
 }
 const prior=Math.floor(song/BEAT),offError=Math.abs(song-(prior+.5)*BEAT);
 if(prior>=0&&prior<TOTAL-1&&offError<=.075){
  if(successful.has(prior)&&!extras.has(prior)&&now<landing-.04){extras.add(prior);lastInput=now;secondJump=now;flash='DOUBLE HOP';feedbackUntil=now+.22;articulate(chordToneNear(leadMidi(prior+INTRO_BEATS)+19,Math.max(0,Math.min(TOTAL-1,Math.floor((now-beginning-INTRO_BEATS*BEAT)/BEAT)))),now)}
  return; // Optional offbeats never punish or award score.
 }
 if(now-lastInput<.08)return;lastInput=now;
 if(n>=0&&n<TOTAL&&!judged.has(n)){combo=0;flash='拍を待とう';feedbackUntil=now+.25;updateStats()}
}
function updateStats(){$('#score').textContent=`${String(hits).padStart(2,'0')} / 60`;$('#combo').textContent=`COMBO ${combo}`}
start.addEventListener('click',begin);$('main').addEventListener('pointerdown',e=>{if((e.target as HTMLElement).closest('button,label,#panel'))return;e.preventDefault();tap()});window.addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();if(e.repeat)return;if(running&&!resultShown)tap();else void begin()}});
$('#mute').addEventListener('click',()=>{muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.55,audio.currentTime,.01);$('#mute').textContent=muted?'♪ OFF':'♪ ON';$('#mute').setAttribute('aria-label',muted?'音をオン':'音をミュート');$('#mute').blur()});
$<HTMLInputElement>('#offset').addEventListener('input',e=>{offset=Number((e.target as HTMLInputElement).value)/1000;$('#value').textContent=`${offset*1000}ms`;try{localStorage.setItem('pulse-offset',String(offset))}catch{}});try{offset=Math.max(-.15,Math.min(.15,Number(localStorage.getItem('pulse-offset'))||0));$<HTMLInputElement>('#offset').value=String(offset*1000);$('#value').textContent=`${offset*1000}ms`}catch{}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)finish(true)});
let pixelX=1,pixelY=1;
function resize(){
 const bounds=$('main').getBoundingClientRect();w=Math.max(1,bounds.width);h=Math.max(1,bounds.height);
 // Explicit CSS dimensions isolate layout from the canvas intrinsic bitmap size.
 canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
 const d=Math.min(devicePixelRatio,2);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);
 pixelX=canvas.width/w;pixelY=canvas.height/h;g.setTransform(pixelX,0,0,pixelY,0,0);
}
window.addEventListener('resize',resize);new ResizeObserver(resize).observe($('main'));resize();
const stages=[
 {at:0,name:'PIXEL',color:'#f3f5e9',bg:'#151823'},
 {at:4,name:'MINT',color:'#c1ff88',bg:'#142421'},
 {at:8,name:'BLOOM',color:'#ffd588',bg:'#272031'},
 {at:12,name:'SKY',color:'#8bdfff',bg:'#14283e'},
 {at:18,name:'NEON',color:'#e1a5ff',bg:'#251b3b'},
 {at:26,name:'ORBIT',color:'#ffafcc',bg:'#292038'},
 {at:36,name:'AURORA',color:'#91ffe1',bg:'#102c36'},
 {at:48,name:'STARDUST',color:'#fff5b2',bg:'#222640'},
];
function draw(){
 requestAnimationFrame(draw);
 // Start every frame in CSS coordinates; character transforms cannot accumulate.
 g.setTransform(pixelX,0,0,pixelY,0,0);
 const now=audio?.currentTime??0,t=running?now-beginning-INTRO_BEATS*BEAT:0,progress=Math.max(0,t/BEAT);
 const stage=stages.reduce((v,s,i)=>combo>=s.at?i:v,0),style=stages[stage],accent=style.color;
 const gentle=reducedMotion.matches;
 g.fillStyle=style.bg;g.fillRect(0,0,w,h);
 // All scenery remains behind the beat rings and uses the audio clock.
 drawBackdrop(g,w,h,stage,accent,now-beginning,gentle);
 const y=h*.64,spacing=w*.22,x=w*.28;
 g.strokeStyle=accent+'0b';g.lineWidth=1;for(let i=0;i<14;i++){g.beginPath();g.moveTo(0,y+i*22);g.lineTo(w,y+i*22);g.stroke()}
 if(stage>=6){g.strokeStyle=accent+'12';for(let i=-3;i<5;i++){g.beginPath();g.moveTo(w*.5,y);g.lineTo(w*.5+i*w*.3,h);g.stroke()}}
 for(let i=-2;i<6;i++){const px=x+(i-(progress%1))*spacing;g.fillStyle=i===1?accent:'#515667';g.fillRect(px-26*WORLD_SCALE,y+Math.sin(i)*9*WORLD_SCALE,52*WORLD_SCALE,10*WORLD_SCALE);if(stage>=4){g.fillStyle=accent+'13';g.fillRect(px-26*WORLD_SCALE,y+10*WORLD_SCALE,52*WORLD_SCALE,h-y)}}
 const phase=((t%BEAT)+BEAT)%BEAT/BEAT;
 // Beat rings always retain position, contrast and timing in all stages.
 g.strokeStyle=accent;g.lineWidth=3;g.beginPath();g.arc(x,y-70*WORLD_SCALE,(18+(1-phase)*(Math.min(58,w*.15)-18))*WORLD_SCALE,0,Math.PI*2);g.stroke();g.globalAlpha=.4;g.beginPath();g.arc(x,y-70*WORLD_SCALE,18*WORLD_SCALE,0,Math.PI*2);g.stroke();g.globalAlpha=1;
 const introMotion=running&&t<0&&now>=beginning,age=introMotion?((now-beginning)%BEAT):now-jump;
 const duration=introMotion?BEAT:Math.max(.05,landing-jump),p=Math.min(1,Math.max(0,age/duration));
 const airborne=age>=0&&age<duration,flight=airborne?Math.sin(p*Math.PI):0;
 const extra=now>=secondJump&&now<landing&&secondJump>jump?Math.sin((now-secondJump)/(landing-secondJump)*Math.PI):0;
 const jumpHeight=(gentle?flight*24+extra*10:flight*64+extra*34)*WORLD_SCALE;
 const variant=Math.floor(hits/4)%3;
 g.save();g.translate(x,y-6*WORLD_SCALE-jumpHeight);
 const characterScale=Math.min(1,w/390,h/664)*WORLD_SCALE;g.scale(characterScale,characterScale);
 if(!gentle&&airborne){if(stage>=5&&variant===2)g.rotate(Math.sin(p*Math.PI)*.55);else if(stage>=4&&variant===1)g.rotate(p*Math.PI*2);else if(stage>=2)g.rotate(Math.sin(p*Math.PI)*.18*(variant===0?1:-1));if(extra&&stage>=6)g.rotate(extra*.35)}
 const squash=gentle?0:airborne?Math.sin(p*Math.PI)*.10:(now>=landing&&now-landing<.12?-.15*Math.sin((now-landing)/.12*Math.PI):0);
 g.scale(1-Math.max(-.15,Math.min(.10,squash)),1+Math.max(-.15,Math.min(.10,squash)));
 g.fillStyle=accent;
 if(stage>=4&&!gentle){g.shadowColor=accent;g.shadowBlur=stage>=7?20:12}
 // Same round body, little tuft, eyes and short limbs throughout the evolution.
 if(stage===0){g.fillRect(-12,-32,24,4);g.fillRect(-16,-28,32,24);g.fillRect(-12,-4,24,4);g.fillRect(-8,-37,8,6)}
 else{g.beginPath();g.roundRect(-16,-32,32,32,11);g.fill();g.beginPath();g.ellipse(-5,-34,4,6,-.4,0,Math.PI*2);g.fill()}
 g.shadowBlur=0;
 g.fillRect(-20,-16-flight*4,5,9);g.fillRect(15,-16-flight*4,5,9);
 g.fillRect(-11,0,7,6);g.fillRect(4,0,7,6);
 g.fillStyle=style.bg;g.fillRect(-7,-22,4,5);g.fillRect(4,-22,4,5);
 g.beginPath();g.arc(0,-13,3,0,Math.PI);g.strokeStyle=style.bg;g.lineWidth=1.5;g.stroke();
 if(stage>=1){g.fillStyle='#ff9aaf99';g.fillRect(-12,-15,4,3);g.fillRect(8,-15,4,3)}
 if(stage>=7){g.fillStyle=accent;g.fillRect(-9,-42,3,3);g.fillRect(0,-45,3,3);g.fillRect(9,-42,3,3)}g.restore();
 g.textAlign='center';g.fillStyle=accent;g.font='bold 16px monospace';
 if(running){
  if(t<0){g.fillText(t < -4*BEAT?'LISTEN':String(Math.max(1,Math.ceil(-t/BEAT))),w/2,h*.32);$('#hint').textContent='INTRO · 拍を聴こう → 4・3・2・1'}
  else{
   $('#hint').textContent=`${stage+1} / 8 · ${style.name}`;
   if(now<feedbackUntil)g.fillText(flash,w/2,h*.32);
   for(let n=0;n<TOTAL;n++){if(t>n*BEAT+WINDOW+offset&&!judged.has(n)){judged.add(n);combo=0;updateStats()}}
   if(t>=TOTAL*BEAT&&!resultShown)showResult();if(resultShown)$('#hint').textContent='FINALE · おつかれさま';if(t>=(TOTAL+OUTRO_BEATS)*BEAT)finish();
  }
 }
 g.fillStyle='#ffffff20';g.fillRect(24,h-108,w-48,3);g.fillStyle=accent;g.fillRect(24,h-108,(w-48)*Math.min(1,progress/TOTAL),3);
}draw();
