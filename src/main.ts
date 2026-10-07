import './style.css';
import {roadAt,drawRoad,stumblePose} from './transition';
import {IntroCalibration} from './calibration';
import {resultCard,saveCard,publicURL,type RunResult} from './share';
import {drawBuddy} from './character';
import {drawPerfectFinale,drawStageEntry} from './celebration';
import {hasShard,shardPosition,drawShards,type ShardBurst} from './shards';
import {journey,targets,levels,duration as journeyDuration,finale,position,pitch,windowFor,offWindow,type Beat,} from './journey';
import {drawField,platform,fireworks} from './field';
import {drawRipples,type Ripple} from './ripple';
import {drawFeedback,drawHopTrail} from './feedback';
import {drawShowcase,trick} from './showcase';
import {drawGuests,drawCheer,drawCrowd,dancerCount,type Guest} from './guests';
const $ = <T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=$<HTMLCanvasElement>('canvas'), g=canvas.getContext('2d')!;
const panel=$('#panel'), start=$<HTMLButtonElement>('#start'), message=$('#message'),share=$<HTMLButtonElement>('#share');
let runVersion=0,card:File|null=null,result:RunResult|null=null,sharing=false,saveOnly=false;
const WORLD_SCALE=.85;
const BEAT=journey[0].span, INTRO_BEATS=8, TOTAL=300;
let audio:AudioContext, master:GainNode, voices:OscillatorNode[]=[], gains:GainNode[]=[], noise:AudioBufferSourceNode, noiseGain:GainNode, noiseFilter:BiquadFilterNode;
let resultShown=false,learning=false,endedAt=0;
let calibration=new IntroCalibration(false,journey[0].span);
function freezeCalibration(elapsed:number){if(calibration.done||elapsed<targets[0].at-windowFor(targets[0])-.02)return;const bias=calibration.finish();if(bias!==null){offset=bias;try{localStorage.setItem('pulse-offset',String(offset))}catch{}}}
let running=false, muted=false, beginning=0, scheduled=0, combo=0,best=0,hits=0,perfectHits=0,goodHits=0,offset=0,lastInput=-1,jump=-10,flash='', feedbackUntil=0,feedbackStarted=-10;
let successful=new Set<number>(), extras=new Set<number>(), landing=-10, secondJump=-10;
let ripples:Ripple[]=[];let shardsTaken=new Set<number>(),shardBursts:ShardBurst[]=[];
let guests:Guest[]=[],guestOrdinal=0,guestLast=-10,guestLastKind=-1;let crowd=0,crowdAt=0,dancerChain=0,dancerLast=-2;
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
let stumbleAt=-10;
let jumpBeat:Beat|null=null;
let growthPoints=0,worldFrom=0,worldChanged=-10,lastWorldLoss=-10;
const layerGains:GainNode[]=[];
const worldLosses=new Set<number>();
function musicStage(){const stage=worldStage();return stage>=4?3:stage>=2?2:stage>=1?1:0}
function visualWorld(now:number){const p=Math.max(0,Math.min(1,(now-worldChanged)/.4));return worldFrom+(worldStage()-worldFrom)*p}
function changeGrowth(points:number){
 const now=audio.currentTime,prior=worldStage(),from=visualWorld(now);growthPoints=points;if(worldStage()===prior)return;worldFrom=from;worldChanged=now;
 const stage=worldStage(),strength=.65+.35*stage/7;
 layerGains.forEach((layer,i)=>{const threshold=i===2?1:i===1?2:4,param=layer.gain;param.cancelScheduledValues(now);param.setValueAtTime(param.value,now);param.linearRampToValueAtTime(stage>=threshold?strength:0,now+.35)});
}
function breakCombo(hit?:number){
 combo=0;if(hit!==undefined){if(worldLosses.has(hit))return;worldLosses.add(hit)}stumbleAt=audio.currentTime;const stage=worldStage();if(stage>0&&audio.currentTime-lastWorldLoss>=1.2){lastWorldLoss=audio.currentTime;changeGrowth(stages[stage-1].at)}
 // Existing phrase and note envelopes continue; only layer gain fades.
 lastHarmonyLevel=rewardLevel();
}
function rewardLevel(){return growthPoints>=48?4:growthPoints>=36?3:growthPoints>=18?2:growthPoints>=8?1:0}
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
 // The bass wavetable keeps its low fundamental and adds audible chip harmonics.
 const bassHarmonics=new Float32Array(10);bassHarmonics[1]=1;bassHarmonics[3]=.45;bassHarmonics[5]=.26;bassHarmonics[7]=.15;bassHarmonics[9]=.08;
 const bassWave=audio.createPeriodicWave(new Float32Array(10),bassHarmonics);
 for(let i=0;i<3;i++){const o=audio.createOscillator(),v=audio.createGain();o.type='square';if(i===2)o.setPeriodicWave(bassWave);v.gain.value=0;
  if(i===0){const soft=audio.createBiquadFilter();soft.type='lowpass';soft.frequency.value=2000;soft.Q.value=.5;o.connect(soft).connect(v)}else o.connect(v);
  const layer=audio.createGain();layer.gain.value=0;v.connect(layer).connect(master);layerGains.push(layer);o.start();voices.push(o);gains.push(v)
 }
 const b=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=b.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1}
 noise=audio.createBufferSource();noise.buffer=b;noise.loop=true;noiseGain=audio.createGain();noiseGain.gain.value=0;noiseFilter=audio.createBiquadFilter();noiseFilter.type='bandpass';noiseFilter.Q.value=.7;noise.connect(noiseFilter).connect(noiseGain).connect(master);noise.start();
}
function note(voice:number,midi:number,t:number,duration:number,level:number){const gain=gains[voice].gain;gain.setValueAtTime(0,t);voices[voice].frequency.setValueAtTime(440*2**((midi-69)/12),t);gain.setValueAtTime(level*(voice===0?.55:voice===1?.85:1),t+.002);gain.linearRampToValueAtTime(0,t+duration)}
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
  if(b.kind==='intro'){drum(t,k===7?2400:k>=4?1800:1200,.10,k>=4?.15:.14);if(k===7){drum(t+d*.5,3400,.055,.065);drum(t+d*.75,4600,.055,.075)}continue}
  if(b.kind==='bridge'){
   // The old tonic opens into the next dominant on the same three tonal voices.
   const pivot=pivots[b.stage],bass=k===0?pitch(36,b.stage-1):pivot[0]-24;
   note(2,bass,t,d*.7,.14);note(1,k===0?pitch(64,b.stage-1):pivot[k%4],t,d*.65,.035);
   note(0,k===0?pitch(72,b.stage-1):pivot[(k+1)%4]+12,t,d*.45,.055);
   drum(t,k%2?1600:1000,d*.20,.14);if(k>=2){drum(t+d*.5,3400,d*.12,.04);if(k===3)drum(t+d*.75,4600,d*.10,.06)}
   continue;
  }
  if(b.kind==='outro'){
   // Four-beat lift, a shared victory hit, then four beats of breathing room.
   if(k<4){note(0,pitch([79,81,83,86][k],4),t,d*.65,.065);note(1,pitch([59,62,65,67][k],4),t,d*.7,.04);note(2,pitch(43,4),t,d*.6,.15);drum(t,1600+k*300,d*.20,.14);drum(t+d*.5,3200+k*300,d*.12,.04);if(k===3)drum(t+d*.75,4800,d*.10,.06)}
   else if(k<8){const o=k-4;note(0,pitch([84,79,76,72][o],4),t,d*(o===3?1.8:.7),.07);note(1,pitch([64,67,64,64][o],4),t,d*.9,.04);note(2,pitch(36,4),t,d*.9,.16);drum(t,o===0?1400:2200,d*(o===0?.40:.20),o===0?.18:.13);if(o<3)drum(t+d*.5,6000,d*.15,.035)}
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
  drum(t,k===0?1200:snare?1600+growth*300+b.stage*80:800+b.stage*70,k===0?d*.24:d*.20,k===0?.15:.13+.015*growth);
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
async function begin(){if(running&&!resultShown)return;if(running)finish();resultShown=false;endedAt=0;runVersion++;card=null;result=null;sharing=false;share.hidden=true;share.disabled=true;$('#share-status').textContent='';start.disabled=true;try{if(!audio)initAudio();await audio.resume();master.gain.setValueAtTime(muted?0:.55,audio.currentTime);silence();judged.clear();successful.clear();extras.clear();ripples=[];shardsTaken.clear();shardBursts=[];guests=[];guestOrdinal=0;guestLast=-10;guestLastKind=-1;dancerChain=0;dancerLast=-2;crowd=0;crowdAt=audio.currentTime;practiceBeats.clear();practiceJump=practiceLanding=lastPractice=practiceFeedback=-10;secondJump=landing=-10;harmonyLevels.clear();lastHarmonyLevel=0;combo=best=hits=perfectHits=goodHits=scheduled=0;worldLosses.clear();stumbleAt=-10;jumpBeat=null;growthPoints=worldFrom=0;worldChanged=lastWorldLoss=-10;layerGains.forEach(layer=>{layer.gain.cancelScheduledValues(audio.currentTime);layer.gain.setValueAtTime(0,audio.currentTime)});lastInput=-1;jump=feedbackStarted=-10;feedbackUntil=0;beginning=audio.currentTime+.05;calibration=new IntroCalibration(muted,BEAT);learning=true;running=true;panel.hidden=true;$('main').dataset.screen='play';$('main').dataset.result='false';panel.dataset.perfect='false';panel.dataset.result='false';$('#precision').hidden=true;start.blur();updateStats();timer=window.setInterval(schedule,25);schedule()}catch{message.textContent='音の起動に失敗しました。もう一度お試しください。'}finally{start.disabled=false}}
function allPerfect(){return !learning&&(running?audio.currentTime-beginning:endedAt)>=finale&&perfectHits===300&&goodHits===0&&hits===300&&judged.size===300}
function showResult(interrupted=false){if(resultShown&&!interrupted)return;const completed=(running?audio.currentTime-beginning:endedAt)>=finale&&judged.size===300,stopped=interrupted&&!completed,perfect=completed&&allPerfect();resultShown=true;panel.hidden=false;$('main').dataset.screen='result';$('main').dataset.result='true';panel.dataset.perfect=String(perfect);panel.dataset.result='true';$('h1').textContent=stopped?'ひと休み。もう一度？':perfect?'ALL PERFECT!':hits>=225?'世界が、色づいた！':'もう一歩、拍に乗ろう。';message.textContent=stopped?'画面を離れたため停止しました。':`${hits} / 300 HIT · BEST COMBO ${best}`;$('#precision').hidden=false;$('#perfect-count').textContent=String(perfectHits);$('#good-count').textContent=String(goodHits);$('#miss-count').textContent=String(Math.max(0,judged.size-hits));start.textContent='もう一度';result=Object.freeze({hits,perfect:perfectHits,good:goodHits,miss:Math.max(0,judged.size-hits),best,completed,allPerfect:perfect});share.hidden=false;share.disabled=true;share.textContent='画像を準備中';void prepareCard(result,runVersion)}
async function prepareCard(snapshot:RunResult,version:number){try{const file=await resultCard(snapshot);if(version!==runVersion||!resultShown||result!==snapshot)return;card=file;saveOnly=true;try{saveOnly=!(typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[file]}))}catch{}share.textContent=saveOnly?'PNGを保存':'画像を共有';share.disabled=false}catch{if(version===runVersion&&result===snapshot){share.textContent='画像を再作成';share.disabled=false;$('#share-status').textContent='画像を作れませんでした。もう一度お試しください。'}}}
share.addEventListener('click',async()=>{if(sharing||!resultShown||!result)return;if(!card){share.disabled=true;void prepareCard(result,runVersion);return}const version=runVersion,snapshot=result,file=card;sharing=true;share.disabled=true;$('#share-status').textContent='';try{if(saveOnly){saveCard(file);$('#share-status').textContent='PNGの保存を開始しました。'}else{await navigator.share({files:[file],title:'Pulse Hop',text:`Pulse Hop · ${snapshot.allPerfect?'ALL PERFECT · ':''}PERFECT ${snapshot.perfect} / GOOD ${snapshot.good} · BEST COMBO ${snapshot.best}
${publicURL}`})}}catch(error){if(version===runVersion&&(error as DOMException).name!=='AbortError'){saveOnly=true;share.textContent='PNGを保存';$('#share-status').textContent=(error as DOMException).name==='NotAllowedError'?'この環境では共有が許可されていません。PNGを保存できます。':'共有できませんでした。PNGを保存できます。'}}finally{if(version===runVersion){sharing=false;share.disabled=false}}});

function finish(interrupted=false){endedAt=Math.min(journeyDuration,Math.max(0,audio.currentTime-beginning));learning=false;ripples=[];shardsTaken.clear();shardBursts=[];guests=[];crowd=0;dancerChain=0;dancerLast=-2;running=false;clearInterval(timer);silence();showResult(interrupted)}
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
 if(musicStage()<3){if(!drumCues.some(c=>now<c.end&&now+.04>c.start))drum(now,musicStage()===0?2200:2800,.035,.055);return}
 gains[0].gain.cancelScheduledValues(now);note(0,midi,now,.055,.065);
 // Keep any already-reserved following beat after the short articulation.
 for(let n=0;n<scheduled;n++){const t=beginning+journey[n].at;if(t>now+.055)playLead(n,t)}
}
function ripple(now:number){
 const stage=worldStage(),field=position(now-beginning).beat.stage;
 const p=Math.max(0,Math.min(1,(now-jump)/Math.max(.05,landing-jump)));
 const scale=Math.min(1,w/390,h/664)*WORLD_SCALE;
 const y=h*.64-6*WORLD_SCALE-Math.sin(p*Math.PI)*(reducedMotion.matches?24:64)*WORLD_SCALE-16*scale;
 ripples.push({time:now,x:.28,y:y/h,stage,field,color:stages[stage].color,life:reducedMotion.matches?.45:1.15+Math.min(7,stage+field)*.025});
 ripples=ripples.slice(-3);
}
function inviteGuest(now:number,field:number,hit:number){
 guests=guests.filter(v=>now-v.time<v.life);
 dancerChain=hit===dancerLast+1?Math.min(5,dancerChain+1):1;dancerLast=hit;
 const dancers=guests.find(v=>v.kind===2);if(dancers){dancers.wasDancers=dancerCount(dancers,now);dancers.changed=now;dancers.dancers=Math.min(6,1+dancerChain);dancers.time=now;dancers.field=field}
 if(now-guestLast<.9||guests.length>=2)return;
 const pools=[[0,6,3,2,9,1,4],[1,7,6,2,4,0,9],[4,8,1,2,0,3,9,5],[3,5,0,2,6,9,1],[9,8,1,2,0,7,5,6]],pool=pools[field];
 let pick=0;while(pick<pool.length&&(pool[(guestOrdinal+pick)%pool.length]===guestLastKind||guests.some(v=>v.kind===pool[(guestOrdinal+pick)%pool.length])))pick++;
 if(pick===pool.length)return;const kind=pool[(guestOrdinal+pick)%pool.length],lives=[1.35,3.6,4,2,2.5,3.8,3.8,2.4,2.2,2.8],colors=['#8bdfff','#e1a5ff','#91ffe1'];
 guests.push({kind,time:now,life:lives[kind],field,color:colors[kind%3],...(kind===2?{dancers:Math.min(6,1+dancerChain),born:now,wasDancers:2,changed:now}:{})});guestOrdinal+=pick+1;guestLast=now;guestLastKind=kind;
}
function tap(){
 if(!running||resultShown)return;const now=audio.currentTime;
 if(learning){learning=false;beginning=now+.05;practiceJump=lastPractice=now;practiceLanding=now+.40;practiceFlash='JUMP!';practiceFeedback=now+.3;drum(now,3200,.03,.04);schedule();return}
 freezeCalibration(now-beginning);
 const song=now-beginning-offset;
 let nearest=targets[0];for(const b of targets)if(Math.abs(song-b.at)<Math.abs(song-nearest.at))nearest=b;
 const error=Math.abs(song-nearest.at),n=nearest.hit;
 // Main targets win before practice/debounce, including early inputs at every boundary.
 if(error<=windowFor(nearest)){
  if(judged.has(n))return;lastInput=now;judged.add(n);successful.add(n);hits++;combo++;stumbleAt=-10;changeGrowth(Math.min(48,growthPoints+1));best=Math.max(best,combo);jumpBeat=nearest;jump=now;secondJump=-10;
  landing=beginning+nearest.at+nearest.span+offset;flash=error<nearest.span*.13?'PERFECT':'GOOD';if(flash==='PERFECT')perfectHits++;else goodHits++;feedbackStarted=now;feedbackUntil=now+.30;
  articulate(chordToneNear(leadMidi(journey.indexOf(nearest))+12,n),now);updateStats();return;
 }
 const current=position(song).beat;
 if(current.kind==='bridge'){if(!drumCues.some(c=>now<c.end&&now+.025>c.start)&&now-lastPractice>=.18){lastPractice=now;drum(now,2800,.025,.035)}return}
 if(current.kind==='intro'){
  if(current.kind==='intro')calibration.tap(now-beginning);
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
  if(successful.has(prior)&&!extras.has(prior)&&now<landing-.02){extras.add(prior);lastInput=now;secondJump=now;ripple(now);inviteGuest(now,current.stage,prior);flash='DOUBLE HOP';feedbackStarted=now;feedbackUntil=now+.22;articulate(chordToneNear(leadMidi(journey.indexOf(current))+19,prior),now)}return;
 }
 if(now-lastInput<.08)return;lastInput=now;
 if(!judged.has(n)&&song>=targets[0].at&&song<finale){breakCombo(n);flash='拍を待とう';feedbackStarted=now;feedbackUntil=now+.25;updateStats()}
}
function updateStats(){
 $('#score').textContent=`HIT ${String(hits).padStart(3,'0')} / 300`;$('#combo').textContent=`COMBO ${combo}`;
 const level=worldStage();$('#growth').setAttribute('aria-label','彩り');$('#growth').setAttribute('aria-valuenow',String(level));$('#growth').dataset.level=String(level);
}

start.addEventListener('click',begin);$('main').addEventListener('pointerdown',e=>{if((e.target as HTMLElement).closest('button,label,#panel'))return;e.preventDefault();tap()});window.addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();if(e.repeat)return;if(running&&!resultShown)tap();else void begin()}});
$('#mute').addEventListener('click',()=>{muted=!muted;if(muted)calibration.mute();if(master)master.gain.setTargetAtTime(muted?0:.55,audio.currentTime,.01);$('#mute').textContent=muted?'♪ OFF':'♪ ON';$('#mute').setAttribute('aria-label',muted?'音をオン':'音をミュート');$('#mute').blur()});
try{const saved=Number(localStorage.getItem('pulse-offset'));offset=Number.isFinite(saved)?Math.max(-.15,Math.min(.15,saved)):0}catch{}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)finish(!resultShown)});
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
function worldStage(){return stages.reduce((v,s,i)=>growthPoints>=s.at?i:v,0)}
function draw(){
 requestAnimationFrame(draw);
 // Start every frame in CSS coordinates; character transforms cannot accumulate.
 g.setTransform(pixelX,0,0,pixelY,0,0);
 const now=audio?.currentTime??0,song=running&&!learning?now-beginning:resultShown?endedAt:0,frame=position(song),beat=frame.beat;
 const t=learning?-targets[0].at:song-targets[0].at,progress=learning?0:Math.max(0,frame.index-INTRO_BEATS+frame.phase);
 if(running&&!learning)freezeCalibration(song);
 const stage=worldStage(),visual=visualWorld(now),lo=Math.floor(visual),hi=Math.ceil(visual);
 const blend=(a:string,b:string)=>{const f=visual-lo;return '#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-f)+parseInt(b.slice(i,i+2),16)*f).toString(16).padStart(2,'0')).join('')};
 const style={bg:blend(stages[lo].bg,stages[hi].bg)},accent=blend(stages[lo].color,stages[hi].color);
 $('#growth-fill').style.width=`${visual/7*100}%`;
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
 const crowdDelta=Math.max(0,Math.min(.1,now-crowdAt));crowdAt=now;const crowdTarget=running&&!learning?Math.min(6,stage):0;
 crowd+=Math.sign(crowdTarget-crowd)*Math.min(Math.abs(crowdTarget-crowd),crowdDelta*(crowdTarget<crowd?1.5:3));
 if(!learning&&beat.kind!=='intro'&&beat.kind!=='outro')drawCrowd(g,w,h,crowd,frame.phase,progress,accent,gentle);
 if(beat.kind==='bridge')drawCheer(g,w,h,frame.phase,beat.local,accent,gentle);
 if(beat.kind!=='outro')drawGuests(g,w,h,now,guests,frame.phase,gentle);
 fireworks(g,w,h,song-finale,gentle,allPerfect());if(allPerfect())drawPerfectFinale(g,w,h,(song-finale)/(60/168),gentle);
 ripples=ripples.filter(wave=>now-wave.time<wave.life);
 drawRipples(g,w,h,now,ripples,gentle);
 const finishTime=now-beginning-finale,finishBeat=finishTime/(60/168),finishing=beat.kind==='outro';
 const y=h*(.64+(finishing?.08*Math.min(1,Math.max(0,finishBeat/4)):0)),spacing=w*.22;
 const x=w*(.28+(finishing?.22*Math.min(1,Math.max(0,finishBeat/4)):0));
 g.strokeStyle=accent+'0b';g.lineWidth=1;for(let i=0;i<14;i++){g.beginPath();g.moveTo(0,y+i*22);g.lineTo(w,y+i*22);g.stroke()}
 if(stage>=6){g.strokeStyle=accent+'12';for(let i=-3;i<5;i++){g.beginPath();g.moveTo(w*.5,y);g.lineTo(w*.5+i*w*.3,h);g.stroke()}}
 const road=roadAt(beat,frame.phase,x,spacing);
 if(road){
  drawRoad(g,w,y,road.entry,road.exit,WORLD_SCALE,accent);
  // Stable launch/landing pads make the road handoff readable even on late taps.
  if(beat.kind==='main'&&beat.local<2)platform(g,x,y,WORLD_SCALE,beat.stage,accent,stage);
  for(let i=1;i<6;i++){const px=road.exit+i*spacing;if(px<w+30)platform(g,px,y,WORLD_SCALE,beat.kind==='bridge'?beat.stage:Math.min(4,beat.stage+(beat.local===59?1:0)),'#515667',stage)}
  for(let i=1;i<6;i++){const px=road.entry-i*spacing;if(px>-30)platform(g,px,y,WORLD_SCALE,beat.kind==='bridge'?beat.stage-1:beat.stage,Math.abs(px-x)<spacing*.5?accent:'#515667',stage)}
 }else for(let i=-2;i<6;i++){const px=x+(i-(progress%1))*spacing;platform(g,px,y,WORLD_SCALE,beat.stage,i===1?accent:'#515667',stage)}
 if(finishing)platform(g,x,y,WORLD_SCALE,4,accent,stage);
 if(!finishing&&beat.kind!=='bridge')drawHopTrail(g,w,h,x,y,now,jump,secondJump,landing,Math.min(1,w/390,h/664)*WORLD_SCALE,Math.min(7,stage+beat.stage),beat.stage,accent,gentle);
 const phase=learning?0:frame.phase;
 const introMotion=running&&(learning||beat.kind==='intro'),practicing=introMotion&&now<practiceLanding&&now>=practiceJump&&now-jump>now-practiceJump,age=practicing?now-practiceJump:learning?-10:now-jump;
 const duration=practicing?practiceLanding-practiceJump:Math.max(.05,landing-jump),p=Math.min(1,Math.max(0,age/duration));
 const airborne=age>=0&&age<duration,flight=airborne?Math.sin(p*Math.PI):0;
 const extra=now>=secondJump&&now<landing&&secondJump>jump?Math.sin((now-secondJump)/(landing-secondJump)*Math.PI):0;
 const victory=finishing&&finishBeat>=4&&finishBeat<6?Math.sin((finishBeat-4)/2*Math.PI):0;
 const jumpHeight=(finishing?(gentle?victory*18:victory*84):(gentle?flight*24+extra*(hasShard(beat)?24:10):flight*64+extra*(hasShard(beat)?52:34)))*WORLD_SCALE;
 const moveBeat=airborne&&!practicing&&jumpBeat?jumpBeat:beat;
 const move=trick(moveBeat.stage,moveBeat.local,p,extra,stage,gentle);
 const runningRoad=beat.kind==='bridge'&&!airborne,runStep=Math.sin((beat.local+frame.phase)*Math.PI*2),stumble=stumblePose(now-stumbleAt,gentle);
 const characterScale=Math.min(1,w/390,h/664)*WORLD_SCALE;
 if(hasShard(beat)&&extras.has(beat.hit)&&!shardsTaken.has(beat.hit)&&extra>0){const crystal=shardPosition(frame.index-8,progress,w,h,characterScale,WORLD_SCALE,gentle),head=y-6*WORLD_SCALE-jumpHeight-40*characterScale;crystal.x+=(x-5*characterScale-crystal.x)*Math.min(1,extra*3);
  if(Math.abs(crystal.x-x)<16*characterScale+4&&head<=crystal.y+(gentle?1.5:4)){shardsTaken.add(beat.hit);shardBursts.push({time:now,x:crystal.x,y:crystal.y,color:accent});shardBursts=shardBursts.slice(-3);const wave=ripples.at(-1);if(wave){wave.time=now;wave.x=crystal.x/w;wave.y=crystal.y/h}}
 }
 shardBursts=shardBursts.filter(b=>now-b.time<.3);if(!finishing&&!learning)drawShards(g,w,h,progress,characterScale,WORLD_SCALE,gentle,shardsTaken,now,shardBursts,accent,{hit:beat.hit,x:x-5*characterScale,amount:extras.has(beat.hit)?Math.min(1,extra*3):0});
 // Beat rings always retain position, contrast and timing in all stages.
 g.save();g.globalAlpha=beat.kind==='bridge'?Math.max(0,beat.local+frame.phase-3):1;g.strokeStyle=accent;g.lineWidth=3;g.beginPath();g.arc(x,y-70*WORLD_SCALE,(18+(1-phase)*(Math.min(58,w*.15)-18))*WORLD_SCALE,0,Math.PI*2);g.stroke();g.globalAlpha=.4*(beat.kind==='bridge'?Math.max(0,beat.local+frame.phase-3):1);g.beginPath();g.arc(x,y-70*WORLD_SCALE,18*WORLD_SCALE,0,Math.PI*2);g.stroke();g.restore();
 g.save();g.translate(x,y-6*WORLD_SCALE-jumpHeight-(runningRoad&&!gentle?Math.abs(runStep)*1.5:0));
 g.scale(characterScale,characterScale);
 if(airborne&&!finishing){g.rotate(gentle?0:hasShard(beat)?Math.sin(p*Math.PI)*.05:move.angle);g.transform(1,0,hasShard(beat)?0:move.lean,1,0,0)}
 if(runningRoad)g.rotate(gentle?.025:.07);g.rotate(stumble.angle);g.scale(1+stumble.squash,1-stumble.squash);
 const squash=runningRoad||gentle||hasShard(beat)?0:airborne?Math.sin(p*Math.PI)*.10:(now>=landing&&now-landing<.12?-.15*Math.sin((now-landing)/.12*Math.PI):0);
 g.scale(1-Math.max(-.15,Math.min(.10,squash)),1+Math.max(-.15,Math.min(.10,squash)));
 g.fillStyle=accent;
 if(stage>=4&&!gentle){g.shadowColor=accent;g.shadowBlur=stage>=7?20:12}
 const celebrate=stumble.angle===0&&(finishing&&finishBeat>=4||!finishing&&airborne&&move.arms===2);
 drawBuddy(g,accent,style.bg,stage===0,celebrate,runningRoad?2+runStep:flight*4+extra*8+(airborne?move.arms*5:0),runningRoad?runStep*(gentle?.7:3):airborne&&!finishing?move.feet:0,stage>=1);
 if(stage>=7&&!hasShard(beat)){g.fillStyle=accent;g.fillRect(-9,-42,3,3);g.fillRect(0,-45,3,3);g.fillRect(9,-42,3,3)}g.restore();
 if(running&&!learning)drawStageEntry(g,w,beat.kind,beat.local,frame.phase,levels[beat.stage].name);
 g.textAlign='center';g.fillStyle=accent;g.font='bold 16px PulsePixel, monospace';
 if(running){
  if(learning||beat.kind==='intro'){
   const counting=!learning&&now>=beginning&&t>=-4*BEAT;
   g.font=counting?'bold 36px PulsePixel, monospace':'bold 16px PulsePixel, monospace';
   if(learning||beat.local<4){g.font='24px PulsePixel, monospace';g.fillStyle='#f3f5e9';g.fillText('Prelude',w/2,154);g.fillStyle=accent;g.font=counting?'36px PulsePixel, monospace':'16px PulsePixel, monospace'}
   g.fillText(counting?String(Math.max(1,Math.ceil(-t/BEAT))):'TAP',w/2,h*.32);

   $('#hint').textContent=counting?(t>=-BEAT?'次の拍からスタート':'そのまま、拍に合わせて'):learning?'タップでジャンプ':'Prelude · リズムに合わせて';
  }
  else{
   $('#hint').textContent=finishing?'FINALE':beat.kind==='bridge'?`${levels[beat.stage].name} → ${Math.round(60/beat.span)} BPM`:`${beat.stage+1} / 5 · ${levels[beat.stage].name} · ${levels[beat.stage].bpm} BPM`;
   if(now<feedbackUntil)drawFeedback(g,w,h,flash,now-feedbackStarted,accent,Math.min(7,stage+beat.stage),gentle);
   for(const b of targets){if(song>b.at+windowFor(b)+offset&&!judged.has(b.hit)){judged.add(b.hit);breakCombo(b.hit);updateStats()}}
   if(song>=finale+8*(60/168)&&!resultShown)showResult();if(resultShown)$('#hint').textContent='旅の終わり';if(song>=journeyDuration)finish();
  }
 }
 g.fillStyle='#ffffff20';g.fillRect(24,h-108,w-48,3);g.fillStyle=accent;g.fillRect(24,h-108,(w-48)*Math.min(1,song/journeyDuration),3);
}draw();
