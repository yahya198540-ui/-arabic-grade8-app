/* صوت فضائي مولّد برمجيًّا: بساط موسيقي بصدى، نبض، محرك مرتبط بالسرعة، ومؤثرات */
const mtof=m=>440*Math.pow(2,(m-69)/12);
// لكل مرحلة: أوتار البساط (نوتات midi) + إيقاع النبض + مفتاح النغمات
const SONGS=[
 {bpm:72,chords:[[50,57,62,69],[46,53,60,65],[43,50,57,62],[45,52,57,64]],scale:[62,64,65,69,72,74,77],pulse:0,bell:.5,bright:1400,alarm:0},
 {bpm:84,chords:[[40,47,52,59],[41,48,53,60],[38,45,50,57],[40,47,52,59]],scale:[52,53,57,59,60,64,65],pulse:1,bell:.35,bright:900,alarm:0},
 {bpm:104,chords:[[36,43,48,55],[34,41,46,53],[39,46,51,58],[38,45,50,57]],scale:[48,51,53,55,58,60,63],pulse:2,bell:.45,bright:1100,alarm:1}
];
export const Snd={
 ctx:null,master:null,mus:null,verb:null,muted:false,stage:0,nextBar:0,beat:0,timer:null,eng:null,duckV:1,
 init(){
  if(this.ctx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  const c=this.ctx=new AC();
  this.master=c.createGain();this.master.gain.value=this.muted?0:.85;
  const comp=c.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=4;
  this.master.connect(comp);comp.connect(c.destination);
  this.mus=c.createGain();this.mus.gain.value=.5;this.mus.connect(this.master);
  // صدى (impulse مولّد)
  const len=c.sampleRate*3.2,ir=c.createBuffer(2,len,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}
  this.verb=c.createConvolver();this.verb.buffer=ir;const vg=c.createGain();vg.gain.value=.55;this.verb.connect(vg);vg.connect(this.mus);
  // محرك: ضجيج منخفض التمرير
  const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),nd=nb.getChannelData(0);let l=0;for(let i=0;i<nd.length;i++){l=(l+0.02*(Math.random()*2-1))/1.02;nd[i]=l*3.5}
  const ns=c.createBufferSource();ns.buffer=nb;ns.loop=true;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=160;
  const eg=c.createGain();eg.gain.value=0;ns.connect(lp);lp.connect(eg);eg.connect(this.master);ns.start();this.eng={g:eg,f:lp};
  // همهمة عميقة
  const o=c.createOscillator();o.type='sine';o.frequency.value=41;const og=c.createGain();og.gain.value=.12;o.connect(og);og.connect(this.mus);o.start();
  this.nextBar=c.currentTime+.2;this.timer=setInterval(()=>this.tick(),120);
 },
 setMute(m){this.muted=m;if(this.master)this.master.gain.value=m?0:.85},
 duck(v){this.duckV=v;if(this.mus)this.mus.gain.setTargetAtTime(.5*v,this.ctx.currentTime,.4)},
 engine(speedNorm,boost){if(!this.eng)return;const t=this.ctx.currentTime;this.eng.g.gain.setTargetAtTime((.05+.2*speedNorm)*(this.muted?0:1),t,.15);this.eng.f.frequency.setTargetAtTime(110+380*speedNorm+300*(boost||0),t,.2)},
 setStage(i){this.stage=i;this.beat=0;this.nextBar=this.ctx?this.ctx.currentTime+.1:0},
 env(g,t,a,d,v){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.linearRampToValueAtTime(0.0001,t+a+d)},
 tick(){if(!this.ctx)return;const c=this.ctx;while(this.nextBar<c.currentTime+.6){this.bar(this.nextBar);this.nextBar+=60/SONGS[this.stage].bpm*4;this.beat++}},
 pad(m,t,dur,v,bright){const c=this.ctx,g=c.createGain(),f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(bright*.5,t);f.frequency.linearRampToValueAtTime(bright,t+dur*.5);f.frequency.linearRampToValueAtTime(bright*.4,t+dur);
  this.env(g,t,dur*.4,dur*.6,v);f.connect(g);g.connect(this.mus);g.connect(this.verb);
  for(const dt of[-7,0,7]){const o=c.createOscillator();o.type='sawtooth';o.frequency.value=mtof(m);o.detune.value=dt;o.connect(f);o.start(t);o.stop(t+dur+.2)}},
 bell(m,t,v){const c=this.ctx;for(const[k,a]of[[1,1],[2.76,.35],[5.4,.15]]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=mtof(m)*k;this.env(g,t,.01,1.8,v*a);o.connect(g);g.connect(this.mus);g.connect(this.verb);o.start(t);o.stop(t+2)}},
 hit(t,v,f){const c=this.ctx,n=c.sampleRate*.5|0,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
  const s=c.createBufferSource();s.buffer=b;const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=f;const g=c.createGain();g.gain.value=v;s.connect(fl);fl.connect(g);g.connect(this.mus);s.start(t);
  const o=c.createOscillator(),og=c.createGain();o.frequency.setValueAtTime(90,t);o.frequency.exponentialRampToValueAtTime(38,t+.4);og.gain.setValueAtTime(v*1.4,t);og.gain.exponentialRampToValueAtTime(.0001,t+.5);o.connect(og);og.connect(this.mus);o.start(t);o.stop(t+.6)},
 bar(t){const S=SONGS[this.stage],spb=60/S.bpm,bd=spb*4,ch=S.chords[this.beat%4];
  ch.forEach((m,i)=>this.pad(m,t+i*.05,bd*1.25,.05,S.bright));
  const n=S.pulse?8:4;
  for(let i=0;i<n;i++){const tt=t+i*(bd/n);
   if(Math.random()<S.bell+(i%4===0?.3:0))this.bell(S.scale[(Math.random()*S.scale.length)|0]+(Math.random()<.3?12:0),tt,.045);
   if(S.pulse>=1&&i%2===0)this.hit(tt,S.pulse===2?.35:.2,S.pulse===2?260:180);
   if(S.pulse===2&&i%2===1){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='square';o.frequency.value=mtof(ch[0]-12);this.env(g,tt,.01,.12,.04);o.connect(g);g.connect(this.mus);o.start(tt);o.stop(tt+.2)}}
  if(S.alarm){const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(660,t+bd*.5);o.frequency.linearRampToValueAtTime(880,t+bd*.5+.4);this.env(g,t+bd*.5,.05,.4,.03);o.connect(g);g.connect(this.mus);g.connect(this.verb);o.start(t+bd*.5);o.stop(t+bd*.5+.6)}
 },
 tone(f,t,d,type,v,f2){const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(this.master);g.connect(this.verb);o.start(t);o.stop(t+d+.05)},
 noise(t,d,v,f0,f1){const c=this.ctx,n=c.sampleRate*d|0,b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;
  const s=c.createBufferSource();s.buffer=b;const fl=c.createBiquadFilter();fl.type='bandpass';fl.frequency.setValueAtTime(f0,t);fl.frequency.exponentialRampToValueAtTime(f1,t+d);const g=c.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl);fl.connect(g);g.connect(this.master);s.start(t)},
 sfx(n){if(!this.ctx)return;const t=this.ctx.currentTime;
  switch(n){
   case'cell':this.tone(1320,t,.14,'sine',.12,1980);this.tone(1980,t+.06,.2,'sine',.08);break;
   case'heal':this.tone(520,t,.12,'triangle',.18);this.tone(780,t+.1,.2,'triangle',.18);break;
   case'hit':this.noise(t,.6,.7,1500,90);this.tone(150,t,.5,'sawtooth',.3,40);break;
   case'warn':this.tone(980,t,.07,'square',.05);this.tone(980,t+.13,.07,'square',.05);break;
   case'right':[523,659,784,1046].forEach((f,i)=>this.tone(f,t+i*.09,.5,'triangle',.2));break;
   case'wrong':this.tone(220,t,.3,'sawtooth',.1,130);break;
   case'gate':this.noise(t,1.2,.5,200,6000);this.tone(110,t,1.2,'sawtooth',.14,880);break;
   case'warp':this.noise(t,2.6,.55,150,7000);this.tone(60,t,2.6,'sawtooth',.14,420);break;
   case'beep':this.tone(760,t,.09,'sine',.1);break;
   case'ignite':this.noise(t,2.2,.5,100,1800);this.tone(55,t,2.2,'sawtooth',.12,120);break;
   case'win':[392,523,659,784,1046,1318].forEach((f,i)=>this.tone(f,t+i*.14,.9,'triangle',.18));break;
   case'shoot':this.tone(1300,t,.1,'square',.05,320);break;
   case'boom':this.noise(t,.6,.6,1200,60);this.tone(110,t,.4,'sawtooth',.22,38);break;
   case'tick':this.tone(520,t,.05,'square',.05,380);break;
   case'bosshit':this.tone(170,t,.14,'square',.09,90);this.noise(t,.12,.2,800,200);break;
   case'graze':this.noise(t,.28,.28,3200,600);this.tone(900,t,.12,'sine',.05,1500);break;
   case'dash':this.noise(t,.4,.32,300,3200);break;
   case'combo':this.tone(740,t,.1,'triangle',.12);this.tone(1110,t+.07,.14,'triangle',.12);break;
   case'orb':this.tone(660,t,.2,'triangle',.14,990);break;
   case'crash':this.noise(t,1.4,.8,1800,60);this.tone(90,t,1.2,'sawtooth',.3,30);break;
  }}
};
