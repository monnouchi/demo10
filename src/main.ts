import './style.css';
import {journey,targets,levels,duration as journeyDuration,finale,position,pitch,windowFor,offWindow,} from './journey';
import {drawField,platform,fireworks} from './field';
import {drawRipples,type Ripple} from './ripple';
import {drawFeedback,drawHopTrail} from './feedback';
import {drawShowcase,trick} from './showcase';
import {drawGuests,drawCheer,type Guest} from './guests';
const $ = <T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=$<HTMLCanvasElement>('canvas'), g=canvas.getContext('2d')!;
const panel=$('#panel'), start=$<HTMLButtonElement>('#start'), message=$('#message');
const WORLD_SCALE=.85;
const BEAT=.5, INTRO_BEATS=8, TOTAL=300;
let audio:AudioContext, master:GainNode, voices:OscillatorNode[]=[], gains:GainNode[]=[], noise:AudioBufferSourceNode, noiseGain:GainNode, noiseFilter:BiquadFilterNode;
let resultShown=false,learning=false,endedAt=0;
let running=false, muted=false, beginning=0, scheduled=0, combo=0,best=0,hits=0,offset=0,lastInput=-1,jump=-10,flash='', feedbackUntil=0,feedbackStarted=-10;
let successful=new Set<number>(), extras=new Set<number>(), landing=-10, secondJump=-10;
let ripples:Ripple[]=[];
let guests:Guest[]=[],guestOrdinal=0,guestLast=-10;
let practiceJump=-10,practiceLanding=-10,lastPractice=-10,practiceFeedback=-10,practiceFlash='';
let practiceBeats=new Set<number>(),drumCues:{start:number,end:number}[]=[];
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let judged=new Set<number>(), timer:number, w=390,h=800;

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
function musicStage(){return combo>=18?3:combo>=8?2:combo>=4?1:0}
function breakCombo(){
 combo=0;harmonyLevels.clear();lastHarmonyLevel=0;
 const now=audio.currentTime;
 for(let i=0;i<3;i++){const param=gains[i].gain;const value=param.value;param.cancelScheduledValues(now);param.setValueAtTime(value,now);param.linearRampToValueAtTime(0,now+.03);voices[i].frequency.cancelScheduledValues(now)}
}
function rewardLevel(){return combo>=48?4:combo>=36?3:combo>=18?2:combo>=8?1:0}
function latchHarmony(k:number){
 if(k>=0&&k<TOTAL&&k%4===0&&!harmonyLevels.has(k/4)){
  lastHarmonyLevel=rewardLevel();harmonyLevels.set(k/4,lastHarmonyLevel);
 }
}
function toneNear(target:number,tones:readonly number[]){
 let best=target,bestDistance=Infinity;
 for(let midi=target-12;midi<=target+12;midi++){if(tones.some(t=>t%12===midi%12)&&Math.abs(midi-target)<bestDistance){best=midi;bestDistance=Math.abs(midi-target)}}return best;
}
function harmonyAt(k:number):Harmony{
 const field=Math.max(0,Math.min(4,Math.floor(k/60))),local=Math.max(0,k)%60;
 const index=levels[field].chords[Math.floor(local/4)],base=harmonyPath[index],level=harmonyLevels.get(Math.floor(k/4))??lastHarmonyLevel;
 const triad=local===59?[60,64,67]:basicTriads[index];let tones=[...triad];
 if(local!==59){if(level>=1)tones.push(sevenths[index]);if(level>=2)tones.push(ninths[index]);
 if(index===10&&level>=2)tones=tones.filter(t=>t%12!==11);
 const colorTone=index===7?76:index===9?62:index===10||index===11||index===14?64:undefined;
 if(level>=3&&colorTone!==undefined)tones.push(colorTone)}
 const third=toneNear(64,[triad[1]]),fifth=toneNear(64,[triad[2]]),seventh=toneNear(64,[sevenths[index]]),ninth=toneNear(64,[ninths[index]]);
 const inner=local===59||level===0?[third,fifth,third,toneNear(64,[triad[0]])]:level===1?[third,seventh,third,fifth]:[third,seventh,ninth,third];
 const convert=(m:number)=>levels[field].minor&&[3,11,14].includes(index)&&m%12===11?m+levels[field].key:pitch(m,field);
 return {name:base.name,bass:convert(local===59?36:base.bass),inner:inner.map(convert),tones:tones.map(convert)};
}
function chordToneNear(target:number,k:number){return toneNear(target,harmonyAt(k).tones)}
function initAudio(){
 audio=new AudioContext(); master=audio.createGain();master.gain.value=.55;master.connect(audio.destination);
 for(let i=0;i<3;i++){const o=audio.createOscillator(),v=audio.createGain();o.type=i===2?'triangle':'square';v.gain.value=0;o.connect(v).connect(master);o.start();voices.push(o);gains.push(v)}
 const b=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=b.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1}
 noise=audio.createBufferSource();noise.buffer=b;noise.loop=true;noiseGain=audio.createGain();noiseGain.gain.value=0;noiseFilter=audio.createBiquadFilter();noiseFilter.type='bandpass';noiseFilter.Q.value=.7;noise.connect(noiseFilter).connect(noiseGain).connect(master);noise.start();
}
function note(voice:number,midi:number,t:number,duration:number,level:number){if(musicStage()<(voice===2?1:voice===1?2:3))return;const gain=gains[voice].gain;gain.setValueAtTime(0,t);voices[voice].frequency.setValueAtTime(440*2**((midi-69)/12),t);gain.setValueAtTime(level,t+.002);gain.linearRampToValueAtTime(0,t+duration)}
function leadSettings(n:number){const b=journey[n];return {duration:b.span*(b.kind==='outro'?.85:b.stage===3?.56:b.stage===1?.28:.40),level:.045+.025*Math.min(7,Math.floor(b.local/8))/7}}
function playLead(n:number,t:number){const v=leadSettings(n);note(0,leadMidi(n),t,v.duration,v.level)}
function drum(t:number,tone:number,duration:number,level:number){
 drumCues=drumCues.filter(c=>c.end>audio.currentTime-.1);drumCues.push({start:t,end:t+duration});
 noiseFilter.frequency.setValueAtTime(tone,t);noiseGain.gain.setValueAtTime(0,t);
 noiseGain.gain.setValueAtTime(level,t+.002);noiseGain.gain.linearRampToValueAtTime(0,t+duration);
}
const pivots=[[],[57,61,64,67],[64,68,71,74],[60,64,67,70],[62,66,69,72]];
function schedule(){
 if(!running||learning)return;
 while(scheduled<journey.length&&beginning+journey[scheduled].at<audio.currentTime+.12){
  const n=scheduled++,b=journey[n],t=beginning+b.at,k=b.local,d=b.span,scale=d/.5;
  if(b.kind==='intro'){drum(t,k===7?2400:k>=4?1800:1200,.10,k>=4?.10:.085);if(k===7){drum(t+d*.5,3400,.055,.065);drum(t+d*.75,4600,.055,.075)}continue}
  if(b.kind==='bridge'){
   // The old tonic opens into the next dominant on the same three tonal voices.
   const pivot=pivots[b.stage],bass=k===0?pitch(36,b.stage-1):pivot[0]-24;
   note(2,bass,t,d*.7,.14);note(1,k===0?pitch(64,b.stage-1):pivot[k%4],t,d*.65,.035);
   note(0,k===0?pitch(72,b.stage-1):pivot[(k+1)%4]+12,t,d*.45,.055);
   drum(t,k%2?1800:1200,d*.18,.07);if(k>=2){drum(t+d*.5,3400,d*.12,.04);if(k===3)drum(t+d*.75,4600,d*.10,.06)}
   continue;
  }
  if(b.kind==='outro'){
   // Four-beat lift, a shared victory hit, then four beats of breathing room.
   if(k<4){note(0,pitch([79,81,83,86][k],4),t,d*.65,.065);note(1,pitch([59,62,65,67][k],4),t,d*.7,.04);note(2,pitch(43,4),t,d*.6,.15);drum(t,1600+k*300,d*.18,.075);drum(t+d*.5,3200+k*300,d*.12,.04);if(k===3)drum(t+d*.75,4800,d*.10,.06)}
   else if(k<8){const o=k-4;note(0,pitch([84,79,76,72][o],4),t,d*(o===3?1.8:.7),.07);note(1,pitch([64,67,64,64][o],4),t,d*.9,.04);note(2,pitch(36,4),t,d*.9,.16);drum(t,o===0?1400:2200,d*(o===0?.40:.20),o===0?.12:.065);if(o<3)drum(t+d*.5,6000,d*.15,.035)}
   else if(k===8){note(1,pitch(64,4),t,d*2.5,.03);note(2,pitch(36,4),t,d*2.8,.11);drum(t,4000,d*.5,.04)}
   else if(k<=10)drum(t,3600-(k-9)*800,d*.35,k===9?.022:.012);
   continue;
  }
  latchHarmony(b.hit);playLead(n,t);
  const section=Math.min(7,Math.floor(k/8)),growth=section/7,fill=section>=3&&k%8===7,harmony=harmonyAt(b.hit),root=harmony.bass;
  const innerDuration=b.stage===3?.45:b.stage===1?.28:section>=3?.34:.52;
  note(1,harmony.inner[k%4],t,d*innerDuration,.028+.012*growth);
  note(2,root,t,k===59?d*.84:d*(b.stage===2?.58:section>=2?.36:.5),.12+.055*growth);
  const snare=b.stage===1?k%4===1||k%4===2:b.stage===2?k%4===3:b.stage===3?k%4===2:k%2===1;
  drum(t,k===0?1200:snare?1800+growth*700+b.stage*140:320+b.stage*180,k===0?d*.24:d*.17,k===0?.105:.035+.025*growth);
  if(section>=1&&(section>=2||k%2===0)){
   note(2,root+((b.stage===1||b.stage===4||section>=3)&&k%2?12:0),t+d*.5,.085*scale,.085+.045*growth);
   if(!fill)drum(t+d*.5,5500+b.stage*180,.035*scale,.020+.010*growth);
  }
  if(section>=3)note(1,harmony.inner[(k+(b.stage===3?2:1))%4]+(rewardLevel()>=4?12:0),t+d*.5,.11*scale,.024+.012*growth);
  if(section>=4&&k%2===1&&!fill)drum(t+d*.75,6500,.025*scale,.018+.008*growth);
  if(section>=5&&k%4===3)note(2,chordToneNear(root+7,b.hit),t+d*.75,.065*scale,.105);
  if((section>=6||b.stage===4&&section>=2)&&k%2===1)drum(t+d*.25,6000,.028*scale,.023);
  if(fill){drum(t+d*.5,2100+b.stage*120,.055*scale,.04);drum(t+d*.75,2600+b.stage*180,.06*scale,.045)}
 }
}
function silence(){
 drumCues=[];
 for(let i=0;i<gains.length;i++){gains[i].gain.cancelScheduledValues(audio.currentTime);gains[i].gain.setValueAtTime(0,audio.currentTime);voices[i].frequency.cancelScheduledValues(audio.currentTime)}
 noiseGain.gain.cancelScheduledValues(audio.currentTime);noiseGain.gain.setValueAtTime(0,audio.currentTime);noiseFilter.frequency.cancelScheduledValues(audio.currentTime);
}
async function begin(){if(running&&!resultShown)return;if(running)finish();resultShown=false;endedAt=0;start.disabled=true;try{if(!audio)initAudio();await audio.resume();master.gain.setValueAtTime(muted?0:.55,audio.currentTime);silence();judged.clear();successful.clear();extras.clear();ripples=[];guests=[];guestOrdinal=0;guestLast=-10;practiceBeats.clear();practiceJump=practiceLanding=lastPractice=practiceFeedback=-10;secondJump=landing=-10;harmonyLevels.clear();lastHarmonyLevel=0;combo=best=hits=scheduled=0;lastInput=-1;jump=feedbackStarted=-10;feedbackUntil=0;beginning=audio.currentTime+.05;learning=true;running=true;panel.hidden=true;start.blur();updateStats();timer=window.setInterval(schedule,25);schedule()}catch{message.textContent='音の起動に失敗しました。もう一度お試しください。'}finally{start.disabled=false}}
function showResult(interrupted=false){resultShown=true;panel.hidden=false;$('h1').textContent=interrupted?'ひと休み。もう一度？':hits>=225?'世界が、色づいた！':'もう一歩、拍に乗ろう。';message.textContent=interrupted?'画面を離れたため停止しました。':`${hits} / 300 HIT · BEST COMBO ${best}`;start.textContent='もう一度あそぶ'}
function finish(interrupted=false){endedAt=Math.min(journeyDuration,Math.max(0,audio.currentTime-beginning));learning=false;ripples=[];guests=[];running=false;clearInterval(timer);silence();showResult(interrupted)}
function leadMidi(n:number){
 const b=journey[n],k=b.local;
 if(b.kind==='intro')return 72;
 if(b.kind==='outro')return pitch([79,81,83,86,84,79,76,72,72,72,72,72][k],4);
 if(b.kind==='bridge')return k===0?pitch(72,b.stage-1):pivots[b.stage][(k+1)%4]+12;
 const motif=pitch(k>=52?[76,74,72,71,67,69,71,72][(k-52)%8]:levels[b.stage].motif[k%16],b.stage);
 return k%2===0||k===59?chordToneNear(motif,b.hit):motif;
}
function articulate(midi:number,now:number){
 // A single noise articulation keeps early taps playable without tonal layers.
 if(musicStage()<3){drum(now,musicStage()===0?3200:4200,.03,.04);return}
 gains[0].gain.cancelScheduledValues(now);note(0,midi,now,.055,.10);
 // Keep any already-reserved following beat after the short articulation.
 for(let n=0;n<scheduled;n++){const t=beginning+journey[n].at;if(t>now+.055)playLead(n,t)}
}
function ripple(now:number){
 const stage=stages.reduce((v,s,i)=>combo>=s.at?i:v,0),field=position(now-beginning).beat.stage;
 const p=Math.max(0,Math.min(1,(now-jump)/Math.max(.05,landing-jump)));
 const scale=Math.min(1,w/390,h/664)*WORLD_SCALE;
 const y=h*.64-6*WORLD_SCALE-Math.sin(p*Math.PI)*(reducedMotion.matches?24:64)*WORLD_SCALE-16*scale;
 ripples.push({time:now,x:.28,y:y/h,stage,field,color:stages[stage].color,life:reducedMotion.matches?.45:1.15+Math.min(7,stage+field)*.025});
 ripples=ripples.slice(-3);
}
function inviteGuest(now:number,field:number){
 guests=guests.filter(v=>now-v.time<v.life);
 if(now-guestLast<.9||guests.length>=2)return;
 let kind=(field+guestOrdinal)%3;for(let i=0;i<3&&guests.some(v=>v.kind===kind);i++)kind=(kind+1)%3;
 if(guests.some(v=>v.kind===kind))return;
 const colors=['#8bdfff','#e1a5ff','#91ffe1'];
 guests.push({kind,time:now,life:kind===0?1.35:kind===1?3.6:4,field,color:colors[kind]});guestOrdinal++;guestLast=now;
}
function tap(){
 if(!running||resultShown)return;const now=audio.currentTime;
 if(learning){learning=false;beginning=now+.05;practiceJump=lastPractice=now;practiceLanding=now+.40;practiceFlash='JUMP!';practiceFeedback=now+.3;drum(now,3200,.03,.04);schedule();return}
 const song=now-beginning-offset;
 let nearest=targets[0];for(const b of targets)if(Math.abs(song-b.at)<Math.abs(song-nearest.at))nearest=b;
 const error=Math.abs(song-nearest.at),n=nearest.hit;
 // Main targets win before practice/debounce, including early inputs at every boundary.
 if(error<=windowFor(nearest)){
  if(judged.has(n))return;lastInput=now;judged.add(n);successful.add(n);hits++;combo++;best=Math.max(best,combo);jump=now;secondJump=-10;
  landing=beginning+nearest.at+nearest.span+offset;flash=error<nearest.span*.13?'PERFECT':'GOOD';feedbackStarted=now;feedbackUntil=now+.30;
  articulate(chordToneNear(leadMidi(journey.indexOf(nearest))+12,n),now);updateStats();return;
 }
 const current=position(song).beat;
 if(current.kind==='intro'||current.kind==='bridge'){
  if(song<-.14||now-lastPractice<.08)return;
  const aligned=Math.abs(song-current.at)<=windowFor(current),id=journey.indexOf(current);
  if(aligned&&practiceBeats.has(id))return;if(aligned)practiceBeats.add(id);
  lastPractice=practiceJump=now;practiceLanding=Math.max(now+.10,beginning+current.at+current.span+offset);
  practiceFlash=aligned?'NICE!':'TAP';practiceFeedback=now+.22;
  if(!drumCues.some(c=>now<c.end&&now+.04>c.start))drum(now,3200,.03,.04);return;
 }
 if(current.kind!=='main')return;
 const prior=current.hit,offError=Math.abs(song-current.at-current.span*.5);
 if(current.local<59&&offError<=offWindow(current)){
  if(successful.has(prior)&&!extras.has(prior)&&now<landing-.02){extras.add(prior);lastInput=now;secondJump=now;ripple(now);inviteGuest(now,current.stage);flash='DOUBLE HOP';feedbackStarted=now;feedbackUntil=now+.22;articulate(chordToneNear(leadMidi(journey.indexOf(current))+19,prior),now)}return;
 }
 if(now-lastInput<.08)return;lastInput=now;
 if(!judged.has(n)&&song>=targets[0].at&&song<finale){breakCombo();flash='拍を待とう';feedbackStarted=now;feedbackUntil=now+.25;updateStats()}
}
function updateStats(){$('#score').textContent=`${String(hits).padStart(3,'0')} / 300`;$('#combo').textContent=`COMBO ${combo}`}
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
 const now=audio?.currentTime??0,song=running&&!learning?now-beginning:resultShown?endedAt:0,frame=position(song),beat=frame.beat;
 const t=learning?-4:song-4,progress=learning?0:Math.max(0,frame.index-INTRO_BEATS+frame.phase);
 const stage=stages.reduce((v,s,i)=>combo>=s.at?i:v,0),style=stages[stage],accent=style.color;
 const gentle=reducedMotion.matches;
 g.fillStyle=style.bg;g.fillRect(0,0,w,h);
 // All scenery remains behind the beat rings and uses the audio clock.
 const mix=beat.kind==='bridge'?(beat.local+frame.phase)/4:1;
 if(beat.kind==='bridge'){g.save();g.globalAlpha=1-mix;drawField(g,w,h,beat.stage-1,stage,accent,song,gentle,1-mix);g.restore()}
 g.save();g.globalAlpha=mix;drawField(g,w,h,beat.stage,stage,accent,song,gentle,mix);g.restore();
 if(!learning&&beat.kind!=='intro'&&beat.kind!=='outro'){
  if(beat.kind==='bridge')drawShowcase(g,w,h,beat.stage-1,stage,accent,frame.phase,beat.local,gentle,1-mix);
  drawShowcase(g,w,h,beat.stage,stage,accent,frame.phase,beat.local,gentle,mix);
 }
 guests=guests.filter(v=>now-v.time<v.life);
 if(beat.kind==='bridge')drawCheer(g,w,h,frame.phase,beat.local,accent,gentle);
 if(beat.kind!=='outro')drawGuests(g,w,h,now,guests,frame.phase,gentle);
 fireworks(g,w,h,now-beginning-finale,gentle);
 ripples=ripples.filter(wave=>now-wave.time<wave.life);
 drawRipples(g,w,h,now,ripples,gentle);
 const finishTime=now-beginning-finale,finishBeat=finishTime/(60/168),finishing=beat.kind==='outro';
 const y=h*(.64+(finishing?.08*Math.min(1,Math.max(0,finishBeat/4)):0)),spacing=w*.22;
 const x=w*(.28+(finishing?.22*Math.min(1,Math.max(0,finishBeat/4)):0));
 g.strokeStyle=accent+'0b';g.lineWidth=1;for(let i=0;i<14;i++){g.beginPath();g.moveTo(0,y+i*22);g.lineTo(w,y+i*22);g.stroke()}
 if(stage>=6){g.strokeStyle=accent+'12';for(let i=-3;i<5;i++){g.beginPath();g.moveTo(w*.5,y);g.lineTo(w*.5+i*w*.3,h);g.stroke()}}
 for(let i=-2;i<6;i++){const px=x+(i-(progress%1))*spacing;g.fillStyle=i===1?accent:'#515667';platform(g,px,y,WORLD_SCALE,beat.kind==='bridge'&&i<6-8*mix?beat.stage-1:beat.stage,i===1?accent:'#515667',stage)}
 if(finishing)platform(g,x,y,WORLD_SCALE,4,accent,stage);
 if(!finishing)drawHopTrail(g,w,h,x,y,now,jump,secondJump,landing,Math.min(1,w/390,h/664)*WORLD_SCALE,Math.min(7,stage+beat.stage),beat.stage,accent,gentle);
 const phase=learning?0:frame.phase;
 // Beat rings always retain position, contrast and timing in all stages.
 g.strokeStyle=accent;g.lineWidth=3;g.beginPath();g.arc(x,y-70*WORLD_SCALE,(18+(1-phase)*(Math.min(58,w*.15)-18))*WORLD_SCALE,0,Math.PI*2);g.stroke();g.globalAlpha=.4;g.beginPath();g.arc(x,y-70*WORLD_SCALE,18*WORLD_SCALE,0,Math.PI*2);g.stroke();g.globalAlpha=1;
 const introMotion=running&&(learning||beat.kind==='intro'||beat.kind==='bridge'),practicing=introMotion&&now<practiceLanding&&now>=practiceJump&&now-jump>now-practiceJump,age=practicing?now-practiceJump:learning?-10:now-jump;
 const duration=practicing?practiceLanding-practiceJump:Math.max(.05,landing-jump),p=Math.min(1,Math.max(0,age/duration));
 const airborne=age>=0&&age<duration,flight=airborne?Math.sin(p*Math.PI):0;
 const extra=now>=secondJump&&now<landing&&secondJump>jump?Math.sin((now-secondJump)/(landing-secondJump)*Math.PI):0;
 const victory=finishing&&finishBeat>=4&&finishBeat<6?Math.sin((finishBeat-4)/2*Math.PI):0;
 const jumpHeight=(finishing?(gentle?victory*18:victory*84):(gentle?flight*24+extra*10:flight*64+extra*34))*WORLD_SCALE;
 const move=trick(beat.stage,beat.local,p,extra,stage,gentle);
 g.save();g.translate(x,y-6*WORLD_SCALE-jumpHeight);
 const characterScale=Math.min(1,w/390,h/664)*WORLD_SCALE;g.scale(characterScale,characterScale);
 if(airborne&&!finishing){g.rotate(move.angle);g.transform(1,0,move.lean,1,0,0)}
 const squash=gentle?0:airborne?Math.sin(p*Math.PI)*.10:(now>=landing&&now-landing<.12?-.15*Math.sin((now-landing)/.12*Math.PI):0);
 g.scale(1-Math.max(-.15,Math.min(.10,squash)),1+Math.max(-.15,Math.min(.10,squash)));
 g.fillStyle=accent;
 if(stage>=4&&!gentle){g.shadowColor=accent;g.shadowBlur=stage>=7?20:12}
 // Same round body, little tuft, eyes and short limbs throughout the evolution.
 if(stage===0){g.fillRect(-12,-32,24,4);g.fillRect(-16,-28,32,24);g.fillRect(-12,-4,24,4);g.fillRect(-8,-37,8,6)}
 else{g.beginPath();g.roundRect(-16,-32,32,32,11);g.fill();g.beginPath();g.ellipse(-5,-34,4,6,-.4,0,Math.PI*2);g.fill()}
 g.shadowBlur=0;
 const celebrate=finishing&&finishBeat>=4||!finishing&&airborne&&move.arms===2;
 if(celebrate){g.save();g.translate(-17,-22);g.rotate(-.7);g.fillRect(-3,-13,5,16);g.restore();g.save();g.translate(17,-22);g.rotate(.7);g.fillRect(-2,-13,5,16);g.restore()}else{g.fillRect(-20,-16-flight*4-extra*8-(airborne?move.arms*5:0),5,9);g.fillRect(15,-16-flight*4-extra*8-(airborne?move.arms*5:0),5,9)}
 g.fillRect(-11,airborne&&!finishing?move.feet:0,7,6);g.fillRect(4,airborne&&!finishing?-move.feet:0,7,6);
 g.fillStyle=style.bg;g.fillRect(-7,-22,4,5);g.fillRect(4,-22,4,5);
 g.beginPath();g.arc(0,-13,3,0,Math.PI);g.strokeStyle=style.bg;g.lineWidth=1.5;g.stroke();
 if(stage>=1){g.fillStyle='#ff9aaf99';g.fillRect(-12,-15,4,3);g.fillRect(8,-15,4,3)}
 if(stage>=7){g.fillStyle=accent;g.fillRect(-9,-42,3,3);g.fillRect(0,-45,3,3);g.fillRect(9,-42,3,3)}g.restore();
 g.textAlign='center';g.fillStyle=accent;g.font='bold 16px monospace';
 if(running){
  if(learning||beat.kind==='intro'){
   const counting=!learning&&now>=beginning&&t>=-4*BEAT;
   g.font=counting?'bold 36px monospace':'bold 16px monospace';
   g.fillText(counting?String(Math.max(1,Math.ceil(-t/BEAT))):'TAP',w/2,h*.32);
   if(now<practiceFeedback){g.font='bold 14px monospace';g.fillText(practiceFlash,w/2,h*.32+42)}
   $('#hint').textContent=counting?(t>=-BEAT?'次の拍から本番!':'そのまま 4 → 3 → 2 → 1'):learning?'タップでジャンプ!':'拍に合わせてタップ · 練習';
  }
  else{
   $('#hint').textContent=finishing?'FINALE · 走破!':beat.kind==='bridge'?`${levels[beat.stage].name} → ${Math.round(60/beat.span)} BPM`:`${beat.stage+1} / 5 · ${levels[beat.stage].name} · ${levels[beat.stage].bpm} BPM`;
   if(now<feedbackUntil)drawFeedback(g,w,h,flash,now-feedbackStarted,accent,Math.min(7,stage+beat.stage),gentle);else if(t<.35){g.font='bold 28px monospace';g.fillText('TAP!',w/2,h*.32)}
   for(const b of targets){if(song>b.at+windowFor(b)+offset&&!judged.has(b.hit)){judged.add(b.hit);if(combo>0)breakCombo();updateStats()}}
   if(song>=finale+8*(60/168)&&!resultShown)showResult();if(resultShown)$('#hint').textContent='FINALE · 旅の終わり';if(song>=journeyDuration)finish();
  }
 }
 g.fillStyle='#ffffff20';g.fillRect(24,h-108,w-48,3);g.fillStyle=accent;g.fillRect(24,h-108,(w-48)*Math.min(1,song/journeyDuration),3);
}draw();
