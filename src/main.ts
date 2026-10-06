import './style.css';
const $ = <T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=$<HTMLCanvasElement>('canvas'), g=canvas.getContext('2d')!;
const panel=$('#panel'), start=$<HTMLButtonElement>('#start'), message=$('#message');
const WORLD_SCALE=.85;
const BEAT=.5, INTRO_BEATS=8, OUTRO_BEATS=4, TOTAL=60, WINDOW=.14;
let audio:AudioContext, master:GainNode, voices:OscillatorNode[]=[], gains:GainNode[]=[], noise:AudioBufferSourceNode, noiseGain:GainNode;
let resultShown=false;
let running=false, muted=false, beginning=0, scheduled=0, combo=0,best=0,hits=0,offset=0,lastInput=-1,jump=-10,flash='', feedbackUntil=0;
let successful=new Set<number>(), extras=new Set<number>(), landing=-10, secondJump=-10;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let judged=new Set<number>(), timer:number, w=390,h=800;
const melody=[72,76,79,76,74,76,81,79,72,76,79,84,81,79,76,74];
function initAudio(){
 audio=new AudioContext(); master=audio.createGain();master.gain.value=.55;master.connect(audio.destination);
 for(let i=0;i<3;i++){const o=audio.createOscillator(),v=audio.createGain();o.type=i===2?'triangle':'square';v.gain.value=0;o.connect(v).connect(master);o.start();voices.push(o);gains.push(v)}
 const b=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=b.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1}
 noise=audio.createBufferSource();noise.buffer=b;noise.loop=true;noiseGain=audio.createGain();noiseGain.gain.value=0;noise.connect(noiseGain).connect(master);noise.start();
}
function note(voice:number,midi:number,t:number,duration:number,level:number){const gain=gains[voice].gain;gain.setValueAtTime(0,t);voices[voice].frequency.setValueAtTime(440*2**((midi-69)/12),t);gain.setValueAtTime(level,t+.002);gain.linearRampToValueAtTime(0,t+duration)}
function schedule(){if(!running)return;while(scheduled<INTRO_BEATS+TOTAL+OUTRO_BEATS&&beginning+scheduled*BEAT<audio.currentTime+.12){const n=scheduled++,t=beginning+n*BEAT;if(n<INTRO_BEATS){note(0,[72,76,79,76,74,76,79,83][n],t,.18,.055);note(1,n<4?60:67,t,.24,.035);note(2,n<4?36:43,t,.25,.14);noiseGain.gain.setValueAtTime(n%2?.04:.025,t);noiseGain.gain.linearRampToValueAtTime(0,t+.055);continue}const k=n-INTRO_BEATS;if(k>=TOTAL){const o=k-TOTAL;note(0,[79,76,74,72][o],t,o===3?.44:.25,.065);note(1,o===3?64:60,t,.44,.04);note(2,36,t,.45,.16);if(o===0){noiseGain.gain.setValueAtTime(.06,t);noiseGain.gain.linearRampToValueAtTime(0,t+.12)}continue}note(0,k>=52?[76,74,72,71,67,69,71,72][(k-52)%8]:melody[k%16],t,.20,.07);note(1,[60,65,57,67][Math.floor(k/8)%4]+(k%2?7:0),t,.26,.045);note(2,k>=56?36:[36,41,33,43][Math.floor(k/8)%4],t,.28,.17);noiseGain.gain.setValueAtTime(k%2?.065:.035,t);noiseGain.gain.linearRampToValueAtTime(0,t+.065)}}
function silence(){for(const v of gains){v.gain.cancelScheduledValues(audio.currentTime);v.gain.setValueAtTime(0,audio.currentTime)}noiseGain.gain.cancelScheduledValues(audio.currentTime);noiseGain.gain.setValueAtTime(0,audio.currentTime)}
async function begin(){if(running&&!resultShown)return;if(running)finish();resultShown=false;start.disabled=true;try{if(!audio)initAudio();await audio.resume();master.gain.setValueAtTime(muted?0:.55,audio.currentTime);silence();judged.clear();successful.clear();extras.clear();secondJump=landing=-10;combo=best=hits=scheduled=0;lastInput=-1;jump=-10;beginning=audio.currentTime+.3;running=true;panel.hidden=true;start.blur();updateStats();timer=window.setInterval(schedule,25);schedule()}catch{message.textContent='音の起動に失敗しました。もう一度お試しください。'}finally{start.disabled=false}}
function showResult(interrupted=false){resultShown=true;panel.hidden=false;$('h1').textContent=interrupted?'ひと休み。もう一度？':hits>=45?'世界が、色づいた！':'もう一歩、拍に乗ろう。';message.textContent=interrupted?'画面を離れたため停止しました。':`${hits} / 60 HIT · BEST COMBO ${best}`;start.textContent='もう一度あそぶ'}
function finish(interrupted=false){running=false;clearInterval(timer);silence();showResult(interrupted)}
function leadMidi(n:number){if(n<INTRO_BEATS)return [72,76,79,76,74,76,79,83][n];const k=n-INTRO_BEATS;return k>=TOTAL?[79,76,74,72][k-TOTAL]:k>=52?[76,74,72,71,67,69,71,72][(k-52)%8]:melody[k%16]}
function articulate(midi:number,now:number){
 gains[0].gain.cancelScheduledValues(now);note(0,midi,now,.055,.10);
 // Keep any already-reserved following beat after the short articulation.
 for(let n=0;n<scheduled;n++){const t=beginning+n*BEAT;if(t>now+.055)note(0,leadMidi(n),t,n<INTRO_BEATS?.18:n>=INTRO_BEATS+TOTAL?(n===INTRO_BEATS+TOTAL+3?.44:.25):.20,n<INTRO_BEATS?.055:n>=INTRO_BEATS+TOTAL?.065:.07)}
}
function tap(){
 if(!running||resultShown)return;const now=audio.currentTime,song=now-beginning-INTRO_BEATS*BEAT-offset;
 if(song < -WINDOW||song>(TOTAL-1)*BEAT+WINDOW)return;
 const n=Math.round(song/BEAT),error=Math.abs(song-n*BEAT);
 // Mandatory beats always take priority, including already judged beats.
 if(n>=0&&n<TOTAL&&error<=WINDOW){
  if(judged.has(n))return;lastInput=now;judged.add(n);successful.add(n);hits++;combo++;best=Math.max(best,combo);jump=now;secondJump=-10;landing=beginning+INTRO_BEATS*BEAT+(n+1)*BEAT;flash=error<.065?'PERFECT':'GOOD';feedbackUntil=now+.35;articulate(leadMidi(n+INTRO_BEATS)+12,now);updateStats();return;
 }
 const prior=Math.floor(song/BEAT),offError=Math.abs(song-(prior+.5)*BEAT);
 if(prior>=0&&prior<TOTAL-1&&offError<=.075){
  if(successful.has(prior)&&!extras.has(prior)&&now<landing-.04){extras.add(prior);lastInput=now;secondJump=now;flash='DOUBLE HOP';feedbackUntil=now+.22;articulate(leadMidi(prior+INTRO_BEATS)+19,now)}
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
 // Effects stay behind the fixed beat target. Fixed counts bound rendering cost.
 if(stage>=3){g.fillStyle=accent+'12';for(let i=0;i<3;i++){const drift=gentle?0:Math.sin(now*.25+i)*14;g.beginPath();g.moveTo(-40,h*.47+i*30+drift);g.quadraticCurveTo(w*.5,h*.31+i*24,w+40,h*.48+i*30);g.lineTo(w+40,h*.60+i*30);g.quadraticCurveTo(w*.5,h*.46+i*24,-40,h*.61+i*30);g.fill()}}
 if(stage>=4){const grad=g.createRadialGradient(w*.7,h*.35,10,w*.7,h*.35,w*.7);grad.addColorStop(0,accent+'20');grad.addColorStop(1,accent+'00');g.fillStyle=grad;g.fillRect(0,100,w,h-220)}
 if(stage>=5){g.fillStyle=accent+'55';for(let i=0;i<18;i++){const px=(i*71+19)%w,py=h*.22+(i*53)%(h*.24);g.fillRect(px,py,gentle?2:2+Math.sin(now*.7+i),2)}}
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
