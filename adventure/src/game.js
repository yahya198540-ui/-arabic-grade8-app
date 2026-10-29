import * as THREE from 'three';
import {QUESTIONS,STAGES,PASS_SCORE,toAr} from './data.js';
import {Snd} from './audio.js';
import {Scorm} from './scorm.js';
import {createGfx,gfx,ENV,envNow,lerpEnv,applyEnv,Quality,cloneEnv} from './scene.js';
import {initResources,R,makeShip,makeGate,makeRock,makeMeteor,makeCell,makeHeal,makeDebris,makeGantry,makeBeam,makeStation} from './objects.js';
import {buildLevel,BASE,STOP_BEFORE,SLOW_ZONE} from './level.js';
import {planetMaterial} from './shaders.js';

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const rnd=(a,b)=>a+Math.random()*(b-a);
const KEY='atf3d_v1';

let scene,camera,world,ship,gateMeshes=[],station,L,moonMat,S={mode:'boot'},paused=false;
let lo=0,hi=0,streamObjs=[],bigs=[],mets=[],activeMets=[];
const MAXP=1400;let P={pos:null,col:null,vel:null,life:null,max:null,base:null,n:0,pts:null};
let dust,dustAttr,lines,lineAttr,lineData,shocks=[];
const V3=()=>new THREE.Vector3();
const lookT=V3(),camPos=V3();
const AHEAD=520,BIG_AHEAD=2600;

/* ================= التهيئة ================= */
function boot(){
 createGfx($('gl'));initResources();scene=gfx.scene;camera=gfx.camera;
 world=new THREE.Group();scene.add(world);
 ship=makeShip();scene.add(ship);
 moonMat=planetMaterial(1);
 // بوابات
 const cols=[0x4fd8ff,0x4fd8ff,0x4fd8ff,0xffa94d,0xffa94d,0xffa94d,0xffa94d,0xff4d6d,0xff4d6d,0xff4d6d];
 const lv=buildLevel();
 lv.gates.forEach((g,i)=>{const m=makeGate(i,cols[i]);m.position.set(0,0,-g.d);scene.add(m);gateMeshes.push(m);
  const sh=new THREE.Mesh(new THREE.RingGeometry(12,13.4,72),new THREE.MeshBasicMaterial({color:0xaee8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));sh.position.copy(m.position);sh.visible=false;scene.add(sh);shocks.push(sh)});
 station=makeStation();station.rotation.y=Math.PI;station.visible=false;scene.add(station);
 buildEffects();buildHud();wireUi();
 const sv=null;Scorm.init();
 newRun();setStageEnv(0,0);S.mode='menu';
 $('loading').classList.add('hidden');$('start').classList.remove('hidden');offerResume();
 requestAnimationFrame(frame);
}

function buildEffects(){
 // جسيمات
 P.pos=new Float32Array(MAXP*3);P.col=new Float32Array(MAXP*3);P.vel=new Float32Array(MAXP*3);P.life=new Float32Array(MAXP);P.max=new Float32Array(MAXP);P.base=new Float32Array(MAXP*3);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P.pos,3));g.setAttribute('color',new THREE.BufferAttribute(P.col,3));
 P.pts=new THREE.Points(g,new THREE.PointsMaterial({size:.5,map:R.glow,sizeAttenuation:true,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));P.pts.frustumCulled=false;scene.add(P.pts);
 // غبار فضائي ثابت لإحساس السرعة
 const n=Quality.dust,dp=new Float32Array(n*3);for(let i=0;i<n;i++){dp[i*3]=rnd(-48,48);dp[i*3+1]=rnd(-30,30);dp[i*3+2]=-rnd(-30,230)}
 const dg=new THREE.BufferGeometry();dust_attr(dg,dp);dust=new THREE.Points(dg,new THREE.PointsMaterial({size:.2,map:R.glow,color:0xbfd8ff,sizeAttenuation:true,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));dust.frustumCulled=false;scene.add(dust);
 // خطوط السرعة
 const N=150;lineData=[];for(let i=0;i<N;i++){const a=Math.random()*6.283,r=rnd(5,38);lineData.push({x:Math.cos(a)*r,y:Math.sin(a)*r*.7,z:-rnd(0,250),l:rnd(.6,1.4)})}
 const lg=new THREE.BufferGeometry();lineAttr=new THREE.BufferAttribute(new Float32Array(N*6),3);lg.setAttribute('position',lineAttr);
 lines=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:0xaed8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));lines.frustumCulled=false;scene.add(lines);
}
function dust_attr(g,arr){dustAttr=new THREE.BufferAttribute(arr,3);g.setAttribute('position',dustAttr)}

function burst(p,n,color,speed=14,life=1,spread=1){
 const c=new THREE.Color(color);for(let k=0;k<n;k++){const i=P.n%MAXP;P.n++;
  const a=Math.random()*6.283,b=Math.acos(rnd(-1,1)),s=speed*rnd(.25,1);
  P.pos[i*3]=p.x;P.pos[i*3+1]=p.y;P.pos[i*3+2]=p.z;P.vel[i*3]=Math.sin(b)*Math.cos(a)*s*spread;P.vel[i*3+1]=Math.sin(b)*Math.sin(a)*s*spread;P.vel[i*3+2]=Math.cos(b)*s*spread+(S.dist?0:0);
  P.base[i*3]=c.r;P.base[i*3+1]=c.g;P.base[i*3+2]=c.b;P.life[i]=P.max[i]=life*rnd(.5,1.2)}
}
function updateParticles(dt){
 for(let i=0;i<MAXP;i++){if(P.life[i]<=0){P.col[i*3]=P.col[i*3+1]=P.col[i*3+2]=0;continue}
  P.life[i]-=dt;const f=Math.max(0,P.life[i]/P.max[i]);P.pos[i*3]+=P.vel[i*3]*dt;P.pos[i*3+1]+=P.vel[i*3+1]*dt;P.pos[i*3+2]+=P.vel[i*3+2]*dt;
  const k=f*f*2.2;P.col[i*3]=P.base[i*3]*k;P.col[i*3+1]=P.base[i*3+1]*k;P.col[i*3+2]=P.base[i*3+2]*k}
 P.pts.geometry.attributes.position.needsUpdate=true;P.pts.geometry.attributes.color.needsUpdate=true;
}

/* ================= الحالة ================= */
function newRun(){
 // أزل العناصر القديمة
 [...world.children].forEach(c=>world.remove(c));
 L=buildLevel();streamObjs=[];bigs=[];mets=[];activeMets.length=0;
 L.objs.forEach(o=>{if(o.t==='moon')bigs.push(o);else if(o.t==='meteor')mets.push(o);else streamObjs.push(o)});
 Object.assign(S,{mode:'menu',time:0,dist:0,speed:0,x:0,y:0,vx:0,vy:0,tx:0,ty:0,shield:3,inv:0,cells:0,gi:0,res:[],cp:0,cpCells:0,
  warp:0,shake:0,flash:0,flashCol:new THREE.Color(1,1,1),damage:0,stage:0,god:false,cine:null,worldOn:true,boost:0,bank:0,pitch:0,roll:0,
  envFrom:null,envT:1,envDur:1,recede:0,qBlend:0,endGlow:0,crashT:0,hintT:0,qHold:0,flameP:.3,camMode:'orbit',orbitA:0});
 gateMeshes.forEach((m,i)=>{m.userData.open=0;m.userData.field.visible=true;m.userData.fm.uniforms.uAlpha.value=1;m.scale.setScalar(1);shocks[i].visible=false});
 station.visible=false;resetStream();setBlinkColor(0xff2244);
 ship.visible=true;ship.position.set(0,0,0);
 gfx.fin.uniforms.uDamage.value=0;
}
function setBlinkColor(c){station.userData.blink.forEach(l=>l.material.color.setHex(c))}
function setStageEnv(i,dur){S.stage=i;Snd.setStage(i);S.envFrom=cloneEnv(envNow);S.envTo=ENV[i];S.envT=dur?0:1;S.envDur=Math.max(.001,dur||.001);if(!dur){lerpEnv(ENV[i],ENV[i],1)}
 station.visible=i===2;
}
const stageOf=i=>QUESTIONS[Math.min(i,9)].stage;

/* ===== بث العالم ===== */
function spawn(o){
 let m;
 switch(o.t){
  case'cell':m=makeCell();break;case'heal':m=makeHeal();break;
  case'rock':m=makeRock(o.v,o.r,Math.floor(o.seed)%3);break;
  case'debris':m=makeDebris(o.kind,o.r,o.seed);break;
  case'gantry':m=makeGantry();break;case'beam':m=makeBeam();break;
 }
 if(!m)return;m.position.set(o.x,o.y,-o.d);o.m=m;o.born=S.time;o.base=m.scale.x;world.add(m);
}
function despawn(o){if(o.m){world.remove(o.m);o.m=null}}
function resetStream(){
 streamObjs.forEach(despawn);bigs.forEach(despawn);
 lo=0;while(lo<streamObjs.length&&streamObjs[lo].d<S.dist-30)lo++;hi=lo;
 activeMets.forEach(a=>world.remove(a.m));activeMets.length=0;
 mets.forEach(o=>{o.spawned=false;o.warned=false});
 advanceStream();
}
function advanceStream(){
 while(hi<streamObjs.length&&streamObjs[hi].d<S.dist+AHEAD){const o=streamObjs[hi];if(o.d>=S.dist-30&&!o.got)spawn(o);hi++}
 while(lo<hi&&streamObjs[lo].d<S.dist-30){despawn(streamObjs[lo]);lo++}
 for(const o of bigs){if(!o.m&&o.d-S.dist<BIG_AHEAD&&o.d>S.dist-120){const m=new THREE.Mesh(new THREE.SphereGeometry(o.r,64,48),moonMat);m.position.set(o.x,o.y,-o.d);o.m=m;world.add(m)}else if(o.m&&o.d<S.dist-300)despawn(o)}
}

/* ================= الإدخال ================= */
const keys={};let touch=null;
function wireInput(){
 const cv=$('gl');
 cv.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){touch={x:e.clientX,y:e.clientY};try{cv.setPointerCapture(e.pointerId)}catch(_){}}else pointerAbs(e)});
 cv.addEventListener('pointermove',e=>{if(e.pointerType==='touch'){if(!touch||S.mode!=='play')return;S.tx=clamp(S.tx+(e.clientX-touch.x)*20/innerWidth*1.7,-10,10);S.ty=clamp(S.ty-(e.clientY-touch.y)*12/innerHeight*1.7,-6,6);touch={x:e.clientX,y:e.clientY}}else pointerAbs(e)});
 cv.addEventListener('pointerup',()=>{touch=null});
 addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key.startsWith('Arrow')||e.key===' ')e.preventDefault()});
 addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=0});
}
function pointerAbs(e){if(S.mode!=='play')return;S.tx=clamp((e.clientX/innerWidth*2-1)*11,-10,10);S.ty=clamp(-(e.clientY/innerHeight*2-1)*7,-6,6)}

/* ================= الاصطدام ================= */
const SHIP_SPH=[[0,0,-1.5,.95],[0,0,.1,1.15],[0,0,1.5,.95],[-2.4,-.15,.9,.7],[2.4,-.15,.9,.7]];
function hitSphere(ox,oy,oz,rad){
 const sz=-S.dist;if(Math.abs(oz-sz)>rad+4.5)return false;
 for(const s of SHIP_SPH){const dx=S.x+s[0]-ox,dy=S.y+s[1]-oy,dz=sz+s[2]-oz,rr=rad+s[3];if(dx*dx+dy*dy+dz*dz<rr*rr)return true}return false}
function hitShip(px,py,pz){
 if(S.inv>0||S.god)return;S.shield--;S.inv=1.8;S.shake=.7;S.flash=.28;S.flashCol.setRGB(1,.3,.15);S.damage=1;Snd.sfx('hit');
 const p=new THREE.Vector3(px??S.x,py??S.y,pz??-S.dist);burst(p,60,0xff9a4d,22,.9);burst(p,30,0xffffff,12,.5);
 gfx.sun.intensity+=0;updHud();gateMeshes;ship.userData.sm.uniforms.uHit.value=1;
 if(S.shield<=0)crash();
}
function crash(){S.mode='crash';S.crashT=0;Snd.sfx('crash');ship.visible=false;burst(new THREE.Vector3(S.x,S.y,-S.dist),160,0xffa24d,30,1.6);burst(new THREE.Vector3(S.x,S.y,-S.dist),80,0xffffff,18,1);$('crash').classList.remove('hidden')}
function respawn(){
 $('crash').classList.add('hidden');ship.visible=true;S.dist=S.cp;S.speed=0;S.shield=3;S.inv=2.5;S.cells=S.cpCells;S.x=S.y=S.tx=S.ty=0;S.vx=S.vy=0;
 const forget=o=>{if(o.t==='cell'||o.t==='heal')o.got=false};streamObjs.forEach(o=>{if(o.d>S.cp)forget(o)});
 resetStream();S.mode='play';updHud();
}
function collisions(dt){
 const sz=-S.dist;
 for(let i=lo;i<hi;i++){const o=streamObjs[i];if(!o.m||o.got)continue;
  switch(o.t){
   case'cell':if(hitSphere(o.x,o.y,-o.d,1.5)){o.got=true;o.m.visible=false;S.cells++;Snd.sfx('cell');burst(o.m.position,14,0x2affd0,9,.6);$('cellsN').textContent=toAr(S.cells)}break;
   case'heal':if(hitSphere(o.x,o.y,-o.d,1.6)){o.got=true;o.m.visible=false;Snd.sfx('heal');burst(o.m.position,26,0xff5a8a,10,.9);if(S.shield<3){S.shield++;updHud()}}break;
   case'rock':if(hitSphere(o.x,o.y,-o.d,o.r*.78))hitShip(o.x,o.y,-o.d);break;
   case'debris':if(hitSphere(o.x,o.y,-o.d,o.r*1.05))hitShip(o.x,o.y,-o.d);break;
   case'gantry':if(Math.abs(-o.d-sz)<1.3&&Math.hypot(S.x-o.x,S.y-o.y)>5.1)hitShip(S.x,S.y,sz);break;
   case'beam':{if(Math.abs(-o.d-sz)<1){const th=o.ph+o.w*S.time,c=Math.cos(th),s=Math.sin(th);
     const dl=(x,y)=>Math.abs(-s*(x-o.x)+c*(y-o.y));if(dl(S.x,S.y)<1.5||dl(S.x-2.4,S.y)<.9||dl(S.x+2.4,S.y)<.9)hitShip(S.x,S.y,sz)}break}
  }}
 // نيازك
 for(const a of activeMets){const m=a.m.position;if(hitSphere(m.x,m.y,m.z,a.o.r*.85))hitShip(m.x,m.y,m.z)}
}

/* ================= الحركة ================= */
function steer(dt){
 const kx=(keys['arrowright']||keys['d']?1:0)-(keys['arrowleft']||keys['a']?1:0),ky=(keys['arrowup']||keys['w']?1:0)-(keys['arrowdown']||keys['s']?1:0);
 if(kx||ky){S.tx=clamp(S.tx+kx*17*dt,-10,10);S.ty=clamp(S.ty+ky*11*dt,-6,6)}
 const ax=(S.tx-S.x)*34-S.vx*9.5,ay=(S.ty-S.y)*34-S.vy*9.5;S.vx=clamp(S.vx+ax*dt,-26,26);S.vy=clamp(S.vy+ay*dt,-18,18);
 S.x=clamp(S.x+S.vx*dt,-10.5,10.5);S.y=clamp(S.y+S.vy*dt,-6.4,6.4);
}
function playStep(dt){
 const g=L.gates[S.gi];let tgt=BASE;
 if(g&&!g.open){const rem=g.d-STOP_BEFORE-S.dist;if(rem<SLOW_ZONE)tgt=BASE*Math.max(.12,rem/SLOW_ZONE)}
 S.speed+=(tgt-S.speed)*Math.min(1,dt*(tgt<S.speed?9:1.7));
 S.dist+=S.speed*dt;
 if(g&&!g.open&&S.dist>=g.d-STOP_BEFORE-.05){S.dist=g.d-STOP_BEFORE;S.speed=0;enterQuestion()}
 steer(dt);if(S.inv>0)S.inv-=dt;
 advanceStream();collisions(dt);updateMeteors(dt);
 // انتقالات المراحل بعد عبور البوابة
 L.gates.forEach((gt,i)=>{if(gt.open&&gt.cine&&S.dist>gt.d+30){gt.cine=0;if(i===9)startCine('end');else startCine('stage',stageOf(i+1))}});
}
function updateMeteors(dt){
 for(const o of mets){
  if(!o.spawned){
   if(!o.warned&&S.dist>=o.trig-100){o.warned=true;Snd.sfx('warn')}
   if(S.dist>=o.trig&&S.mode==='play'){o.spawned=true;const m=makeMeteor(o.r);m.position.set(o.x,o.y,-(S.dist+300));world.add(m);m.userData.rock.rotation.set(Math.random()*3,Math.random()*3,0);
    // اتجاه الذيل عكس الحركة
    activeMets.push({o,m,vx:o.vx,vy:o.vy})}
  }}
 for(let i=activeMets.length-1;i>=0;i--){const a=activeMets[i];const p=a.m.position;p.z+=34*dt;p.x+=a.vx*dt;p.y+=a.vy*dt;a.m.userData.rock.rotation.x+=dt*1.2;a.m.userData.rock.rotation.y+=dt*.8;
  a.m.lookAt(p.x-a.vx,p.y-a.vy,p.z-34);
  if(p.z>-S.dist+25){world.remove(a.m);activeMets.splice(i,1)}}
}

/* ================= السينمائيات ================= */
function startCine(type,arg){
 S.mode='cine';S.cine={type,t:0,arg,did:{}};
 $('bars').classList.add('on');
 if(type==='stage'){S.cine.dur=7;Snd.sfx('warp');S.camMode='chase'}
 if(type==='launch'){S.cine.dur=6;S.camMode='orbit'}
 if(type==='end'){S.cine.dur=9;S.camMode='endorbit'}
 if(type==='resume'){S.cine.dur=3.2;S.camMode='chase'}
 $('hint').classList.remove('show');
}
function showTitle(info,sub){const c=$('cine');c.classList.remove('show','hidden');void c.offsetWidth;c.querySelector('.k').textContent=info.k;c.querySelector('.t').textContent=info.t;c.querySelector('.s').textContent=sub||info.s;c.classList.add('show')}
function endCine(){S.cine=null;S.camMode='chase';S.mode='play';$('bars').classList.remove('on');$('cine').classList.add('hidden');$('cine').classList.remove('show');$('count').classList.add('hidden');
 S.warp=0;resetStream();world.visible=true;S.worldFade=0;updHud();$('hud').classList.remove('hidden')}
function cineStep(dt){
 const c=S.cine,t=c.t+=dt;
 if(c.type==='launch'){
  S.flameP=t<4.4?.28:1;S.speed=0;
  if(!c.did.ti&&t>.4){c.did.ti=1;showTitle(STAGES[0],'ثلاثة… اثنان… واحد')}
  [[2.1,'٣'],[3,'٢'],[3.9,'١']].forEach(([tt,tx],i)=>{if(!c.did['c'+i]&&t>=tt){c.did['c'+i]=1;const e=$('count');e.textContent=tx;e.classList.remove('hidden','pop');void e.offsetWidth;e.classList.add('pop');Snd.sfx('beep')}});
  if(!c.did.ig&&t>=4.8){c.did.ig=1;Snd.sfx('ignite');S.flash=.5;S.flashCol.setRGB(.7,.85,1);S.shake=1;S.camMode='chase'}
  S.recede=Math.max(0,(t-4.8))*.05;
  if(t>=5.7){c.did.end=1;S.mode='play';S.speed=6;endCine();hint('وجّه المركبة بالفأرة أو بإصبعك — اجمع خلايا الطاقة ⚡ وتفادَ الصخور',7000)}
 }else if(c.type==='stage'){
  const up=ease(clamp(t/1.8,0,1)),dn=t>5.2?1-ease(clamp((t-5.2)/1.6,0,1)):1;S.warp=up*dn;S.boost=S.warp;
  S.speed=BASE*(1+S.warp*2);S.dist+=S.speed*dt*.0; // المركبة ثابتة والعالم يتمدد بصريًّا
  world.visible=false;
  if(!c.did.sw&&t>=2.0){c.did.sw=1;S.flash=1;S.flashCol.setRGB(.8,.9,1);setStageEnv(c.arg,3.5);S.recede=0;showTitle(STAGES[c.arg])}
  if(c.did.sw&&S.flash>0)S.flash=Math.max(0,S.flash-dt*.8);
  if(t>=c.dur){S.speed=BASE;endCine()}
 }else if(c.type==='resume'){
  if(!c.did.ti){c.did.ti=1;showTitle(STAGES[S.stage],'نكمل رحلتنا!')}
  S.warp=.35*Math.sin(clamp(t/c.dur,0,1)*3.14);if(t>=c.dur){S.speed=BASE*.6;endCine()}
 }else if(c.type==='end'){
  S.speed=Math.max(0,S.speed-BASE*dt*.5);S.dist+=S.speed*dt;
  if(!c.did.ti&&t>.3){c.did.ti=1;Snd.sfx('win');showTitle({k:'مهمة ناجحة',t:'تم إنقاذ المحطة الفضائية!',s:'عادت وحدات المعرفة العشر للمحطة'})}
  if(!c.did.gr&&t>1.2){c.did.gr=1;setBlinkColor(0x3dff9a)}
  S.endGlow=clamp(t/3,0,1);
  if(t>=c.dur&&!c.did.end){c.did.end=1;showEnd()}
 }
}

/* ================= البوابات والأسئلة ================= */
function enterQuestion(){S.mode='question';S.tx=S.x;S.ty=S.y;showQuestion(S.gi);Snd.duck(.4)}
const Q={i:0,att:0,locked:false,prev:'',hint:0,done:false};
const LET=['أ','ب','ج'];
function shuf(arr,prev){let a;for(let k=0;k<8;k++){a=arr.map(o=>({t:o.t,ok:!!o.ok}));for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}if(a.map(o=>o.t).join('|')!==prev)break}return a}
function setFb(c,t){const f=$('fb');f.className=c;f.textContent=t}
function showQuestion(i){
 const q=QUESTIONS[i];Q.i=i;Q.att=0;Q.locked=false;Q.prev='';Q.hint=0;Q.done=false;
 $('qnum').textContent=`السؤال ${toAr(i+1)} من ${toAr(10)}`;$('qstage').textContent=STAGES[q.stage].short;$('sentence').textContent=q.sentence;$('qprompt').textContent=q.prompt;setFb('','');$('att').textContent='';
 renderOpts();$('frame').classList.remove('hidden');const w=$('qwrap');w.classList.remove('hidden');w.style.animation='none';void w.offsetWidth;w.style.animation='';Snd.sfx('beep');
}
function renderOpts(){
 const q=QUESTIONS[Q.i],arr=shuf(q.options,Q.prev);Q.prev=arr.map(o=>o.t).join('|');const box=$('opts');box.innerHTML='';
 arr.forEach((o,k)=>{const b=document.createElement('button');b.className='opt';b.dataset.ok=o.ok?'1':'0';const l=document.createElement('span');l.className='lt';l.textContent=LET[k];const t=document.createElement('span');t.textContent=o.t;b.append(l,t);b.onclick=()=>choose(b,o);box.append(b)});
}
function choose(btn,o){
 if(Q.locked)return;Q.locked=true;Q.att++;const q=QUESTIONS[Q.i];
 if(o.ok){
  Q.done=true;btn.classList.add('good');document.querySelectorAll('.opt').forEach(b=>b.classList.add('lock'));Snd.sfx('right');
  const first=Q.att===1;S.res[Q.i]={first};
  setFb('good',(first?'🌟 أحسنت! إجابة صحيحة من المحاولة الأولى! ':'✅ صحيح! ')+q.explain+' — استُعيدت وحدة معرفة ⚡');
  const k=$('kc'+Q.i);k.classList.add('on','pop');S.flash=.35;S.flashCol.setRGB(.6,1,.85);
  burst(new THREE.Vector3(S.x,S.y,-S.dist),90,0xffd27a,18,1.4);
  S.cp=L.gates[Q.i].d+22;S.cpCells=S.cells;S.gi=Q.i+1;save();
  setTimeout(()=>{$('qwrap').classList.add('hidden');$('frame').classList.add('hidden');Q.locked=false;Q.done=false;openGate(Q.i);S.mode='play';updHud();Snd.duck(1)},2300);
 }else{
  btn.classList.add('bad');Snd.sfx('wrong');S.shake=.15;const h=q.hints;setFb('bad','❌ ليست الإجابة الصحيحة — '+h[Math.min(Q.att-1,h.length-1)]);$('att').textContent='المحاولات: '+toAr(Q.att);
  setTimeout(()=>{if(Q.done)return;renderOpts();Q.locked=false},1500);
 }
}
function openGate(i){
 const g=L.gates[i];g.open=true;g.t=0;g.cine=(i===2||i===6||i===9)?1:0;Snd.sfx('gate');S.flash=.55;S.flashCol.setRGB(.8,.95,1);S.shake=.6;
 const p=new THREE.Vector3(0,0,-g.d);burst(p,260,0x9fe8ff,34,1.8,1);burst(p,120,0xffe08a,22,1.4,1);
 const sh=shocks[i];sh.visible=true;sh.userData.t=0;
}
function updateGates(dt){
 L.gates.forEach((g,i)=>{const m=gateMeshes[i],u=m.userData,dd=g.d-S.dist;m.visible=dd<900&&dd>-120;if(!m.visible)return;
  u.fm.uniforms.uTime.value=S.time;u.rot.rotation.z+=dt*(g.open?3:.5);
  u.lights.forEach((l,k)=>{l.material.emissiveIntensity=g.open?4:1.2+2.2*Math.max(0,Math.sin(S.time*3-k*.5))});
  if(g.open){g.t+=dt;const p=clamp(g.t/1.1,0,1);u.fm.uniforms.uAlpha.value=1-ease(p);u.field.visible=p<1;m.scale.setScalar(1+Math.sin(p*3.14)*.08);u.inner.material.emissiveIntensity=3+6*(1-p);
   u.lights.forEach(l=>l.material.color.setHex(0x112))}
  const sh=shocks[i];if(sh.visible){sh.userData.t+=dt;const p=sh.userData.t/1.6;sh.scale.setScalar(1+p*3.4);sh.material.opacity=Math.max(0,.9*(1-p));if(p>=1)sh.visible=false}
 });
}

/* ================= الصوت/الواجهة ================= */
function hint(t,ms=4500){const h=$('hint');h.textContent=t;h.classList.add('show');clearTimeout(hint.t);hint.t=setTimeout(()=>h.classList.remove('show'),ms)}
function buildHud(){
 const tr=$('track');tr.innerHTML='';QUESTIONS.forEach((q,i)=>{if(i&&QUESTIONS[i-1].stage!==q.stage){const s=document.createElement('div');s.className='sep';tr.append(s)}const d=document.createElement('div');d.className='nd';d.id='nd'+i;tr.append(d)});
 const kc=$('kcells');kc.innerHTML='';QUESTIONS.forEach((_,i)=>{const d=document.createElement('i');d.id='kc'+i;kc.append(d)});
}
function updHud(){
 const sh=$('shield');sh.classList.toggle('low',S.shield<=1);[...sh.children].forEach((e,i)=>e.classList.toggle('on',i<S.shield));
 $('cellsN').textContent=toAr(S.cells);
 QUESTIONS.forEach((_,i)=>{const n=$('nd'+i);n.className='nd'+(i<S.gi?' done':i===S.gi?' cur':'');$('kc'+i).classList.toggle('on',i<S.gi)});
 $('stg').textContent=STAGES[stageOf(S.gi)].short;
}
function save(){const d={res:S.res,cells:S.cells,v:1};try{sessionStorage.setItem(KEY,JSON.stringify(d))}catch(e){}Scorm.progress(d)}
function load(){try{const j=JSON.parse(sessionStorage.getItem(KEY)||'null');if(j&&Array.isArray(j.res))return j}catch(e){}const s=Scorm.getSuspend();return s&&Array.isArray(s.res)?s:null}
function clear(){try{sessionStorage.removeItem(KEY)}catch(e){}}
function offerResume(){const sv=load();const n=sv?sv.res.filter(Boolean).length:0;
 if(n>0&&n<10){const b=document.createElement('button');b.className='go alt';b.textContent=`متابعة من السؤال ${toAr(n+1)}`;b.onclick=()=>beginRun(n);$('startBtns').prepend(b);$('goBtn').textContent='ابدأ من جديد'}}

function showEnd(){
 S.mode='end';$('hud').classList.add('hidden');$('bars').classList.remove('on');$('cine').classList.add('hidden');$('warns').innerHTML='';
 const score=S.res.filter(r=>r&&r.first).length,passed=score>=PASS_SCORE;
 $('endScore').textContent=`${toAr(score)}/${toAr(10)}`;
 $('endMsg').textContent=score===10?'مذهل! أجبت عن جميع الأسئلة من المحاولة الأولى — أنت قائد فضاء حقيقي! 🚀':score>=8?'ممتاز! فهمك لحروف العطف رائع، وبقليل من التركيز تصل إلى العلامة الكاملة.':score>=5?'جيد! راجع معاني حروف العطف (الواو، الفاء، ثم، أو) وجرّب مغامرة جديدة.':'لا بأس! المحطة أُنقذت بالمثابرة. راجع الدرس ثم أعد المغامرة لتحسّن درجتك.';
 const rows=$('endRows');rows.innerHTML='';QUESTIONS.forEach((q,i)=>{const r=S.res[i],d=document.createElement('div');d.className=r&&r.first?'ok':'no';d.textContent=`${toAr(i+1)} ${r&&r.first?'✅':'🔁'}`;rows.append(d)});
 $('end').classList.remove('hidden');requestAnimationFrame(()=>$('ringC').style.strokeDashoffset=String(465*(1-score/10)));
 $('endEy').textContent=passed?'مهمة ناجحة':'اكتملت المهمة';Scorm.finish(score,passed);$('endLms').textContent=Scorm.active?'أُرسلت درجتك إلى نظام إدارة التعلم.':'';clear();
}

function beginRun(resumeN){
 $('start').classList.add('hidden');$('end').classList.add('hidden');$('hud').classList.remove('hidden');
 Snd.init();if(Snd.ctx&&Snd.ctx.state==='suspended')Snd.ctx.resume();
 const sv=resumeN?load():null;if(!resumeN)clear();
 newRun();
 if(resumeN&&sv){
  S.res=sv.res.slice(0,resumeN);S.cells=sv.cells||0;S.gi=resumeN;L.gates.forEach((g,i)=>{if(i<resumeN)g.open=true});
  gateMeshes.forEach((m,i)=>{if(i<resumeN){m.userData.open=1;m.userData.field.visible=false;m.userData.fm.uniforms.uAlpha.value=0}});
  S.dist=L.gates[resumeN-1].d+40;S.cp=S.dist;S.cpCells=S.cells;S.speed=BASE*.5;S.mode='play';
  QUESTIONS.slice(0,resumeN).forEach((_,i)=>{});
  const st=stageOf(resumeN);setStageEnv(st,0);S.stage=st;resetStream();buildHud();updHud();
  S.res.forEach((r,i)=>{if(r)$('kc'+i).classList.add('on')});startCine('resume');
 }else{buildHud();setStageEnv(0,0);updHud();S.dist=0;S.mode='play';startCine('launch')}
}
function buildIntro(){
 const sky=document.querySelector('#start .sky');for(let i=0;i<110;i++){const d=document.createElement('i');d.className='st';d.style.left=Math.random()*100+'%';d.style.top=Math.random()*85+'%';const z=Math.random()*5+2;d.style.width=d.style.height=z+'px';d.style.animationDelay=(Math.random()*-3)+'s';d.style.animationDuration=(1.6+Math.random()*2.4)+'s';sky.append(d)}
 const fit=()=>{$('scene').setAttribute('viewBox',innerWidth/innerHeight<.9?'300 -40 980 960':'0 0 1600 900')};fit();addEventListener('resize',fit);
}
function liftoffIntro(done){
 const st=$('start');if(st.classList.contains('go'))return;st.classList.add('go');Snd.init();if(Snd.ctx&&Snd.ctx.state==='suspended')Snd.ctx.resume();Snd.sfx('ignite');
 setTimeout(()=>st.classList.add('out'),1500);setTimeout(()=>{done();st.classList.remove('go','out');st.classList.add('hidden')},2300);
}
function wireUi(){
 buildIntro();
 wireInput();
 $('goBtn').onclick=()=>liftoffIntro(()=>beginRun(0));
 $('againBtn').onclick=()=>{$('end').classList.add('hidden');beginRun(0)};
 $('muteBtn').onclick=()=>{Snd.setMute(!Snd.muted);$('muteBtn').textContent=Snd.muted?'🔇':'🔊'};
 $('pauseBtn').onclick=()=>{paused=!paused;$('pauseBtn').textContent=paused?'▶':'⏸';if(Snd.ctx)paused?Snd.ctx.suspend():Snd.ctx.resume()};
 $('hintBtn').onclick=()=>{if(Q.done)return;const h=QUESTIONS[Q.i].hints;setFb('hint','💡 '+h[Math.min(Q.hint,h.length-1)]);Q.hint++;Snd.sfx('beep')};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.mode==='play'&&!paused)$('pauseBtn').click()});
}

/* ================= الكاميرا والمؤثرات المرئية ================= */
const tmpP=V3(),tmpL=V3();
function updateCamera(dt){
 const z=-S.dist;let kxy=6,kz=14,lk=8;
 if(S.mode==='menu'){const a=S.time*.12;tmpP.set(Math.sin(a)*16,4+Math.sin(S.time*.2)*1.5,Math.cos(a)*16);tmpL.set(0,.4,0);kxy=kz=3;lk=3}
 else if(S.camMode==='orbit'){const a=S.time*.12+S.cine.t*.08;const r=14-S.cine.t*.3;tmpP.set(Math.sin(a)*r,3.4+Math.sin(S.time*.4)*.6,z+Math.cos(a)*r);tmpL.set(0,.4,z);kxy=kz=3.2;lk=4}
 else if(S.camMode==='endorbit'){const c=station.position,a=S.cine.t*.2+.6;tmpP.set(c.x+Math.sin(a)*150,c.y+28+Math.sin(S.cine.t*.3)*8,c.z+Math.cos(a)*150+60);tmpL.copy(c);kxy=kz=1.6;lk=2.2}
 else{ // مطاردة
  const qb=S.qBlend;tmpP.set(S.x*.55,S.y*.55+2.7-qb*1.2,z+9.6-qb*1.6);tmpL.set(S.x*.4,S.y*.4+.4-qb*9.5,z-18);
  if(S.mode==='question'){S.qBlend=Math.min(1,S.qBlend+dt*1.1)}else S.qBlend=Math.max(0,S.qBlend-dt*1.6)}
 const fx=1-Math.exp(-dt*kxy),fz=1-Math.exp(-dt*kz);
 camera.position.x+=(tmpP.x-camera.position.x)*fx;camera.position.y+=(tmpP.y-camera.position.y)*fx;camera.position.z+=(tmpP.z-camera.position.z)*fz;
 lookT.lerp(tmpL,1-Math.exp(-dt*lk));
 if(S.shake>0){const s=S.shake*S.shake*.5+S.warp*.03;camera.position.x+=rnd(-s,s);camera.position.y+=rnd(-s,s)}
 camera.lookAt(lookT);
 S.roll+=(-S.vx*.012-S.roll)*Math.min(1,dt*4);camera.rotateZ(S.roll+Math.sin(S.time*.5)*.002);
 const asp=camera.aspect,base=62+(asp<1.2?(1.2-asp)*34:0);
 const fov=base+(S.speed/BASE)*3+S.warp*50+S.boost*0;if(Math.abs(camera.fov-fov)>.01){camera.fov+=(fov-camera.fov)*Math.min(1,dt*6);camera.updateProjectionMatrix()}
}
function updateShip(dt){
 const z=-S.dist;ship.position.set(S.x,S.y,z);
 const bank=clamp(-S.vx*.052,-.75,.75),pitch=clamp(S.vy*.028,-.4,.4);
 S.bank+=(bank-S.bank)*Math.min(1,dt*7);S.pitch+=(pitch-S.pitch)*Math.min(1,dt*7);
 const hover=S.mode==='question'||S.mode==='menu'?Math.sin(S.time*1.6)*.25:0;
 ship.userData.body.rotation.set(S.pitch,-S.vx*.012,S.bank);ship.position.y+=hover;
 const u=ship.userData;const sp=S.speed/BASE;
 const target=S.mode==='cine'&&S.cine&&S.cine.type==='launch'?S.flameP:clamp(.35+sp*.8+S.boost*.7,0,1.6);S.flameP+=(target-S.flameP)*Math.min(1,dt*5);
 u.fm.uniforms.uTime.value=S.time;u.fm.uniforms.uPow.value=S.flameP*.55;u.flames.forEach((f,i)=>{if(f.isSprite)f.scale.setScalar(1.6+S.flameP*1.6);else f.scale.set(.8,.8,1.2+S.flameP*2.4)});
 u.light.intensity=10+S.flameP*30;
 u.sm.uniforms.uTime.value=S.time;u.sm.uniforms.uHit.value=Math.max(0,u.sm.uniforms.uHit.value-dt*1.8);u.sm.uniforms.uLevel.value=S.shield/3;
 ship.visible=S.mode!=='crash'&&S.mode!=='end'||S.mode==='end';if(S.mode==='crash')ship.visible=false;
 if(S.inv>0&&S.mode==='play'){ship.visible=Math.floor(S.time*16)%2===0||S.inv>1.5}
 // أثر المحرك
 if(S.mode!=='menu'&&S.speed>2&&Math.random()<.9){for(const sx of[-1.0,1.0]){const p=new THREE.Vector3(S.x+sx*.95,S.y-.12,z+2.7);burst(p,1,0x7ab8ff,1.5,.55,1);}}
}
function updateFx(dt){
 const cz=camera.position.z;
 // غبار
 let ch=false;for(let i=0;i<dustAttr.count;i++){if(dustAttr.getZ(i)>cz+30){dustAttr.setXYZ(i,camera.position.x+rnd(-48,48),camera.position.y+rnd(-30,30),cz-rnd(190,240));ch=true}}if(ch)dustAttr.needsUpdate=true;
 // خطوط السرعة
 const sp=S.speed/BASE,intens=S.mode==='menu'?0:clamp(.07+sp*.14+S.warp*.85,0,1);lines.material.opacity=intens;lines.visible=intens>.02;lines.position.copy(camera.position);
 lines.material.color.setRGB(.65+S.warp*.0,.82,1);
 if(lines.visible){const adv=(S.speed*1.4+S.warp*1100)*dt;lineData.forEach((d,i)=>{d.z+=adv;const len=(2+S.speed*.05)*d.l*(1+S.warp*22);if(d.z-0>25){d.z=-rnd(120,260);const a=Math.random()*6.283,r=rnd(4,40);d.x=Math.cos(a)*r;d.y=Math.sin(a)*r*.7}
  lineAttr.setXYZ(i*2,d.x,d.y,d.z);lineAttr.setXYZ(i*2+1,d.x,d.y,d.z-len)});lineAttr.needsUpdate=true}
 // أضواء المحطة وتحديث الصخور
 const w=world.children;for(const o of streamObjs.slice(lo,hi)){const m=o.m;if(!m)continue;
  const age=S.time-o.born;if(age<.7){m.scale.setScalar(o.base*ease(clamp(age/.7,.001,1)))}
  if(o.t==='rock'){m.rotation.y+=o.spin*dt}else if(o.t==='debris'){m.rotation.x+=o.spin*dt;m.rotation.z+=o.spin*dt*.7}
  else if(o.t==='cell'){m.rotation.y+=dt*2.2;m.position.y=o.y+Math.sin(S.time*2+o.d)*.25}
  else if(o.t==='heal'){m.rotation.y+=dt*1.5}
  else if(o.t==='beam'){m.rotation.z=o.ph+o.w*S.time;const f=.75+.25*Math.sin(S.time*40);m.userData.glow.material.opacity=.3*f}
  else if(o.t==='gantry'){m.rotation.z+=dt*.2}}
 if(station.visible){const t=S.time;station.userData.blink.forEach((l,i)=>{const on=S.endGlow>0?1:(Math.sin(t*4+i*1.7)>-.2?1:.15);l.scale.setScalar(on)});
  station.position.set(0,0,-(L.gates[9].d+34));station.userData.arrays.forEach((a,i)=>{if(i===2||i===5||i===6)return})}
 // تحذير النيازك على الشاشة
 const wr=$('warns');let k=0;
 if(S.mode==='play'){for(const o of mets){if(!o.spawned&&S.dist>=o.trig-100&&S.dist<o.trig+4){tmpP.set(o.x+o.vx*3.5,o.y+o.vy*3.5,-(S.dist+100)).project(camera);
   const x=clamp((tmpP.x*.5+.5)*innerWidth,30,innerWidth-30),y=clamp((-tmpP.y*.5+.5)*innerHeight,90,innerHeight-90);
   let e=wr.children[k];if(!e){e=document.createElement('div');e.className='w';e.textContent='!';wr.append(e)}e.style.display='flex';e.style.left=x+'px';e.style.top=y+'px';k++}}}
 for(;k<wr.children.length;k++)wr.children[k].style.display='none';
 // درجات ما بعد المعالجة
 const f=gfx.fin.uniforms;f.uTime.value=S.time;f.uAberr.value=.0012+S.warp*.012+S.damage*.004;f.uFlash.value=clamp(S.flash,0,1);f.uFlashCol.value.copy(S.flashCol);
 S.damage=Math.max(0,S.damage-dt*1.4);f.uDamage.value=S.damage*.7+(S.shield===1&&S.mode==='play'?.1+.06*Math.sin(S.time*6):0);
 gfx.bloom.strength=envNow.bloom+S.warp*.6+S.flash*.5;
}

/* ================= الخطوة الرئيسية ================= */
export function step(dt){
 S.time+=dt;
 if(S.envT<1){S.envT=Math.min(1,S.envT+dt/S.envDur);lerpEnv(S.envFrom,S.envTo,ease(S.envT))}
 R.rockMat.forEach(m=>m.color.copy(envNow.rock));
 S.shake=Math.max(0,S.shake-dt);if(S.mode!=='cine'||!S.cine||S.cine.type!=='stage')S.flash=Math.max(0,S.flash-dt*(S.mode==='cine'?1.2:2.2));
 switch(S.mode){
  case'play':playStep(dt);break;
  case'cine':cineStep(dt);if(S.mode==='cine'){steer(dt)}break;
  case'question':S.speed=0;steer(dt);advanceStream();updateMeteors(0);break;
  case'crash':S.crashT+=dt;if(S.crashT>2.6)respawn();break;
  case'menu':S.speed=0;break;
 }
 updateGates(dt);updateShip(dt);updateParticles(dt);updateCamera(dt);gfx.sky.position.copy(camera.position);updateFx(dt);
 applyEnv(S.time,S.recede);
 Snd.engine(clamp(S.speed/BASE,0,1.4),S.warp);
 S.hintT+=dt;if(S.hintT>.3){S.hintT=0;$('spd').textContent='السرعة '+toAr(Math.round(S.speed*10))+' كم/ث'}
}
let last=0;
function frame(ts){
 const dt=Math.min(.05,(ts-last)/1000||0);last=ts;
 if(!paused){step(dt)}
 gfx.composer.render();
 requestAnimationFrame(frame);
}
window.__g={setEnv:i=>setStageEnv(i,0),S,step,get L(){return L},gateMeshes,ship,get lo(){return lo},get hi(){return hi},gfx,Q,QUESTIONS,beginRun,hitShip,respawn,showEnd,get world(){return world},get activeMets(){return activeMets}};
requestAnimationFrame(()=>setTimeout(boot,40));
