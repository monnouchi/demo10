import './style.css';
const $ = <T extends HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=$<HTMLCanvasElement>('canvas'), g=canvas.getContext('2d')!;
const panel=$('#panel'), start=$<HTMLButtonElement>('#start'), message=$('#message');
const BEAT=.5, TOTAL=60, WINDOW=.14;
let audio:AudioContext, master:GainNode, voices:OscillatorNode[]=[], gains:GainNode[]=[], noise:AudioBufferSourceNode, noiseGain:GainNode;
let running=false, muted=false, beginning=0, scheduled=0, combo=0,best=0,hits=0,offset=0,lastInput=-1,jump=-10,flash='', feedbackUntil=0;
let judged=new Set<number>(), timer:number, w=390,h=800;
const melody=[72,76,79,76,74,76,81,79,72,76,79,84,81,79,76,74];
function initAudio(){
 audio=new AudioContext(); master=audio.createGain();master.gain.value=.55;master.connect(audio.destination);
 for(let i=0;i<3;i++){const o=audio.createOscillator(),v=audio.createGain();o.type=i===2?'triangle':'square';v.gain.value=0;o.connect(v).connect(master);o.start();voices.push(o);gains.push(v)}
 const b=audio.createBuffer(1,audio.sampleRate,audio.sampleRate),data=b.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1}
 noise=audio.createBufferSource();noise.buffer=b;noise.loop=true;noiseGain=audio.createGain();noiseGain.gain.value=0;noise.connect(noiseGain).connect(master);noise.start();
}
function note(voice:number,midi:number,t:number,duration:number,level:number){const gain=gains[voice].gain;gain.setValueAtTime(0,t);voices[voice].frequency.setValueAtTime(440*2**((midi-69)/12),t);gain.setValueAtTime(level,t+.002);gain.linearRampToValueAtTime(0,t+duration)}
function schedule(){if(!running)return;while(scheduled<64&&beginning+scheduled*BEAT<audio.currentTime+.12){const n=scheduled++,t=beginning+n*BEAT;if(n<4){note(2,60,t,.08,.13);continue}const k=n-4;note(0,melody[k%16],t,.20,.07);note(1,[60,65,57,67][Math.floor(k/8)%4]+(k%2?7:0),t,.26,.045);note(2,[36,41,33,43][Math.floor(k/8)%4],t,.28,.17);noiseGain.gain.setValueAtTime(k%2?.065:.035,t);noiseGain.gain.linearRampToValueAtTime(0,t+.065)}}
function silence(){for(const v of gains){v.gain.cancelScheduledValues(audio.currentTime);v.gain.setValueAtTime(0,audio.currentTime)}noiseGain.gain.cancelScheduledValues(audio.currentTime);noiseGain.gain.setValueAtTime(0,audio.currentTime)}
async function begin(){if(running)return;start.disabled=true;try{if(!audio)initAudio();await audio.resume();master.gain.setValueAtTime(muted?0:.55,audio.currentTime);silence();judged.clear();combo=best=hits=scheduled=0;lastInput=-1;jump=-10;beginning=audio.currentTime+.3;running=true;panel.hidden=true;start.blur();updateStats();timer=window.setInterval(schedule,25);schedule()}catch{message.textContent='音の起動に失敗しました。もう一度お試しください。'}finally{start.disabled=false}}
function finish(interrupted=false){running=false;clearInterval(timer);silence();panel.hidden=false;$('h1').textContent=interrupted?'ひと休み。もう一度？':hits>=45?'世界が、色づいた！':'もう一歩、拍に乗ろう。';message.textContent=interrupted?'画面を離れたため停止しました。':`${hits} / 60 HIT · BEST COMBO ${best}`;start.textContent='もう一度あそぶ'}
function tap(){if(!running)return;const now=audio.currentTime;if(now-lastInput<.08)return;lastInput=now;const song=now-beginning-4*BEAT-offset;const n=Math.round(song/BEAT);if(n<0||n>=TOTAL)return;if(judged.has(n))return;const error=Math.abs(song-n*BEAT);if(error<=WINDOW){judged.add(n);hits++;combo++;best=Math.max(best,combo);jump=now;flash=error<.065?'PERFECT':'GOOD';feedbackUntil=now+.35;
 // Tap articulation replaces lead voice; never adds a fifth sound.
 const v=gains[0].gain;v.cancelScheduledValues(now);note(0,melody[n%16]+12,now,.055,.10);
}else{combo=0;flash='拍を待とう';feedbackUntil=now+.25}updateStats()}
function updateStats(){$('#score').textContent=`${String(hits).padStart(2,'0')} / 60`;$('#combo').textContent=`COMBO ${combo}`}
start.addEventListener('click',begin);$('main').addEventListener('pointerdown',e=>{if((e.target as HTMLElement).closest('button,label,#panel'))return;e.preventDefault();tap()});window.addEventListener('keydown',e=>{if((e.code==='Space'||e.code==='Enter')&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();if(e.repeat)return;if(running)tap();else void begin()}});
$('#mute').addEventListener('click',()=>{muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:.55,audio.currentTime,.01);$('#mute').textContent=muted?'♪ OFF':'♪ ON';$('#mute').setAttribute('aria-label',muted?'音をオン':'音をミュート');$('#mute').blur()});
$<HTMLInputElement>('#offset').addEventListener('input',e=>{offset=Number((e.target as HTMLInputElement).value)/1000;$('#value').textContent=`${offset*1000}ms`;try{localStorage.setItem('pulse-offset',String(offset))}catch{}});try{offset=Math.max(-.15,Math.min(.15,Number(localStorage.getItem('pulse-offset'))||0));$<HTMLInputElement>('#offset').value=String(offset*1000);$('#value').textContent=`${offset*1000}ms`}catch{}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)finish(true)});
function resize(){w=canvas.clientWidth;h=canvas.clientHeight;const d=Math.min(devicePixelRatio,2);canvas.width=w*d;canvas.height=h*d;g.setTransform(d,0,0,d,0,0)}window.addEventListener('resize',resize);resize();
function draw(){requestAnimationFrame(draw);const now=audio?.currentTime??0;const t=running?now-beginning-2:0;const progress=Math.max(0,t/BEAT);const stage=combo>=16?2:combo>=8?1:0;const accent=stage===0?'#f3f5e9':stage===1?'#c1ff66':'#66ecff';g.fillStyle=stage===2?'#10172c':'#151823';g.fillRect(0,0,w,h);
 if(stage===2){const grad=g.createRadialGradient(w*.5,h*.5,10,w*.5,h*.5,w);grad.addColorStop(0,'#5b3b7144');grad.addColorStop(1,'#10172c00');g.fillStyle=grad;g.fillRect(0,0,w,h)}
 const y=h*.64,spacing=w*.28,x=w*.34;g.strokeStyle='#ffffff0b';g.lineWidth=1;for(let i=0;i<14;i++){g.beginPath();g.moveTo(0,y+i*22);g.lineTo(w,y+i*22);g.stroke()}
 for(let i=-2;i<6;i++){const px=x+(i-(progress%1))*spacing;g.fillStyle=i===1?accent:'#515667';g.fillRect(px-26,y+Math.sin(i)*9,52,10);if(stage===2){g.fillStyle='#66ecff13';g.fillRect(px-26,y+10,52,h-y)}}
 const phase=((t%BEAT)+BEAT)%BEAT/BEAT;g.strokeStyle=accent;g.lineWidth=3;g.beginPath();g.arc(x,y-70,18+(1-phase)*40,0,Math.PI*2);g.stroke();g.globalAlpha=.4;g.beginPath();g.arc(x,y-70,18,0,Math.PI*2);g.stroke();g.globalAlpha=1;
 const age=now-jump,flight=age>=0&&age<BEAT?Math.sin(age/BEAT*Math.PI):0;g.save();g.translate(x,y-24-flight*70);if(combo>=16&&flight)g.rotate(age/BEAT*Math.PI*2);else if(combo>=8&&flight)g.rotate(Math.sin(age/BEAT*Math.PI)*.4);g.fillStyle=accent; if(stage===2){g.shadowColor=accent;g.shadowBlur=16;g.beginPath();g.roundRect(-16,-30,32,30,8);g.fill()}else{g.fillRect(-16,-30,32,30);g.fillRect(-10,-36,8,8)}g.shadowBlur=0;g.fillStyle='#151823';g.fillRect(-7,-23,4,5);g.fillRect(5,-23,4,5);g.fillStyle=accent;g.fillRect(-13,0,8,7);g.fillRect(5,0,8,7);g.restore();
 g.textAlign='center';g.fillStyle=accent;g.font='bold 16px monospace';if(running){if(t<0){g.fillText(String(Math.max(1,Math.ceil(-t/BEAT))),w/2,h*.32);$('#hint').textContent='4拍聴いて、そのままタップ'}else{$('#hint').textContent=stage===2?'FLOW · 光の世界':stage===1?'COLOR · 色が目覚める':'PIXEL · 拍に乗ろう';if(now<feedbackUntil)g.fillText(flash,w/2,h*.32);for(let n=0;n<TOTAL;n++){if(t>n*BEAT+WINDOW+offset&&!judged.has(n)){judged.add(n);combo=0;updateStats()}}if(t>(TOTAL-1)*BEAT+.5)finish()}}
 g.fillStyle='#ffffff20';g.fillRect(24,h-108,w-48,3);g.fillStyle=accent;g.fillRect(24,h-108,(w-48)*Math.min(1,progress/TOTAL),3)}draw();
