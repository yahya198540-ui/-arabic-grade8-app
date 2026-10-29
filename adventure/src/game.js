import * as THREE from 'three';
import {QUESTIONS,STAGES,PASS_SCORE,toAr} from './data.js';
import {Snd} from './audio.js';
import {Scorm} from './scorm.js';
import {createGfx,gfx,ENV,envNow,lerpEnv,applyEnv,Quality,cloneEnv,adaptQuality} from './scene.js';
import {initResources,R,makeShip,makeRock,makeMeteor,makeCell,makeHeal,makeDebris,makeCloud,makeLamp,makeStrike,makeStation} from './objects.js';
import {buildLevel,BASE,CRUISE,STOPS,LEAD,ZONE_K} from './level.js';
import {Planets} from './planets.js';
import {Combat} from './combat.js';

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const rnd=(a,b)=>a+Math.random()*(b-a);
const KEY='atf3d_v3';

let scene,camera,world,ship,station,L,S={mode:'boot'},paused=false;
let lo=0,hi=0,streamObjs=[],mets=[],activeMets=[];
const MAXP=1400;let P={pos:null,col:null,vel:null,life:null,max:null,base:null,n:0,pts:null};
let dust,dustAttr,lines,lineAttr,lineData,backdrops=[];
let events=[],orbs=[],streamers,strData=[],comboTimer=0,lastTapT=0,lastKey={};
const V3=()=>new THREE.Vector3();const lookT=V3();
const AHEAD=520;
const ZONE_START=[0,STOPS[2]+200,STOPS[6]+200,STOPS[8]+200];
const ZONE_INFO=[{n:'الأرض'},{n:'حزام الكويكبات'},{n:'السديم'},{n:'المحطة'}];

/* كواكب الخلفية لكل منطقة (تتبع الكاميرا مع إزاحة منظورية) */
const BACK=[
 {z:0,b:9,R:950,dist:1650,dir:[-.28,-.78,-.56],k:-.45,seed:3},{z:0,b:0,R:95,dist:1500,dir:[.72,.3,-.62],k:.1,seed:5},
 {z:1,b:5,R:760,dist:2400,dir:[.5,.14,-.85],k:.32,seed:7},{z:1,b:0,R:70,dist:1150,dir:[-.62,.22,-.75],k:.2,seed:9},
 {z:2,b:8,R:470,dist:2500,dir:[-.58,.24,-.78],k:.25,seed:11},{z:2,b:1,R:190,dist:1900,dir:[.62,.3,-.72],k:.2,seed:13},
 {z:3,b:1,R:1250,dist:3200,dir:[.06,-.2,-.98],k:.4,seed:17},{z:3,b:0,R:120,dist:1800,dir:[-.66,.34,-.67],k:.1,seed:19}
];

/* ================= التهيئة ================= */
function boot(){
 createGfx($('gl'));initResources();Planets.init(gfx.renderer,Quality.low);scene=gfx.scene;camera=gfx.camera;
 world=new THREE.Group();scene.add(world);ship=makeShip();scene.add(ship);
 BACK.forEach(b=>{const g=Planets.create(b.b,b.R,b.seed,true);g.visible=false;g.userData.back=b;gfx.sky.add(g);backdrops.push(g)});
 station=makeStation();station.visible=false;scene.add(station);
 buildEffects();buildHud();wireUi();Scorm.init();initCombat();
 const nm=(Scorm.get&&Scorm.active&&Scorm.get('cmi.core.student_name'))||'';if(nm){const p=nm.split(',').map(s=>s.trim());$('nameInput').value=(p[1]||p[0]||'').slice(0,24)}
 newRun();setStageEnv(0,0);S.mode='menu';
 backdrops.forEach(g=>{if(g.userData.back.z===0)Planets.ensure(g)});
 $('loading').classList.add('hidden');$('start').classList.remove('hidden');offerResume();requestAnimationFrame(frame);
}
function buildEffects(){
 P.pos=new Float32Array(MAXP*3);P.col=new Float32Array(MAXP*3);P.vel=new Float32Array(MAXP*3);P.life=new Float32Array(MAXP);P.max=new Float32Array(MAXP);P.base=new Float32Array(MAXP*3);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P.pos,3));g.setAttribute('color',new THREE.BufferAttribute(P.col,3));
 P.pts=new THREE.Points(g,new THREE.PointsMaterial({size:.55,map:R.glow,sizeAttenuation:true,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));P.pts.frustumCulled=false;scene.add(P.pts);
 const n=Quality.dust,dp=new Float32Array(n*3);for(let i=0;i<n;i++){dp[i*3]=rnd(-48,48);dp[i*3+1]=rnd(-30,30);dp[i*3+2]=-rnd(-30,230)}
 const dg=new THREE.BufferGeometry();dustAttr=new THREE.BufferAttribute(dp,3);dg.setAttribute('position',dustAttr);
 dust=new THREE.Points(dg,new THREE.PointsMaterial({size:.22,map:R.glow,color:0xcfe0ff,sizeAttenuation:true,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));dust.frustumCulled=false;scene.add(dust);
 const N=150;lineData=[];for(let i=0;i<N;i++){const a=Math.random()*6.283,r=rnd(5,38);lineData.push({x:Math.cos(a)*r,y:Math.sin(a)*r*.7,z:-rnd(0,250),l:rnd(.6,1.4)})}
 const lg=new THREE.BufferGeometry();lineAttr=new THREE.BufferAttribute(new Float32Array(N*6),3);lg.setAttribute('position',lineAttr);
 lines=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({color:0xaed8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));lines.frustumCulled=false;scene.add(lines);
}
function burst(p,n,color,speed=14,life=1,spread=1){
 const c=new THREE.Color(color);for(let k=0;k<n;k++){const i=P.n%MAXP;P.n++;const a=Math.random()*6.283,b=Math.acos(rnd(-1,1)),s=speed*rnd(.25,1);
  P.pos[i*3]=p.x;P.pos[i*3+1]=p.y;P.pos[i*3+2]=p.z;P.vel[i*3]=Math.sin(b)*Math.cos(a)*s*spread;P.vel[i*3+1]=Math.sin(b)*Math.sin(a)*s*spread;P.vel[i*3+2]=Math.cos(b)*s*spread;
  P.base[i*3]=c.r;P.base[i*3+1]=c.g;P.base[i*3+2]=c.b;P.life[i]=P.max[i]=life*rnd(.5,1.2)}
}
function updateParticles(dt){
 for(let i=0;i<MAXP;i++){if(P.life[i]<=0){P.col[i*3]=P.col[i*3+1]=P.col[i*3+2]=0;continue}
  P.life[i]-=dt;const f=Math.max(0,P.life[i]/P.max[i]);P.pos[i*3]+=P.vel[i*3]*dt;P.pos[i*3+1]+=P.vel[i*3+1]*dt;P.pos[i*3+2]+=P.vel[i*3+2]*dt;
  const k=f*f*2.4;P.col[i*3]=P.base[i*3]*k;P.col[i*3+1]=P.base[i*3+1]*k;P.col[i*3+2]=P.base[i*3+2]*k}
 P.pts.geometry.attributes.position.needsUpdate=true;P.pts.geometry.attributes.color.needsUpdate=true;
}

/* ================= الحالة ================= */
function newRun(){
 [...world.children].forEach(c=>world.remove(c));
 L=buildLevel();streamObjs=[];mets=[];activeMets.length=0;
 events=[];L.objs.forEach(o=>{if(o.t==='meteor')mets.push(o);else if(o.t==='tip'||o.t==='boss'||o.t==='drones')events.push(o);else streamObjs.push(o)});
 const keepName=S.name||'';
 Object.assign(S,{mode:'menu',time:0,dist:0,speed:0,x:0,y:0,vx:0,vy:0,tx:0,ty:0,shield:3,inv:0,cells:0,points:0,gi:0,res:[],cp:0,cpCells:0,cpPoints:0,bst:1,boosting:false,
  warp:0,shake:0,flash:0,flashCol:new THREE.Color(1,1,1),damage:0,stage:0,god:false,cine:null,boost:0,bank:0,pitch:0,roll:0,
  envFrom:null,envT:1,envDur:1,qBlend:0,endGlow:0,crashT:0,hintT:0,flameP:.3,camMode:'orbit',name:keepName,qShown:false,landT:0,combo:0,kills:0,surgeT:0,dashT:0,dashCD:0,dashDir:0,recoil:0,firing:false,zoneK:1,bossP:0,droneWave:null});
 clearOrbs();if(Combat.reset)Combat.reset();
 station.visible=false;resetStream();setBlinkColor(0xff6a2a);ship.visible=true;ship.position.set(0,0,0);gfx.fin.uniforms.uDamage.value=0;
}
function setBlinkColor(c){station.userData.blink.forEach(l=>l.material=new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(1.6)}))}
function setStageEnv(i,dur){S.stage=i;Snd.setStage(Math.min(i,2));S.envFrom=cloneEnv(envNow);S.envTo=ENV[i];S.envT=dur?0:1;S.envDur=Math.max(.001,dur||.001);if(!dur)lerpEnv(ENV[i],ENV[i],1);station.visible=i>=3}
const zoneOfQ=i=>QUESTIONS[Math.min(i,9)].stage;

/* ===== بث العالم ===== */
function spawn(o){
 let m;switch(o.t){
  case'cell':m=makeCell();break;case'heal':m=makeHeal();break;
  case'rock':m=makeRock(o.v,o.r,Math.floor(o.seed)%3,o.shard);break;
  case'debris':m=makeDebris(o.kind,o.r,o.seed);break;
  case'cloud':if(Quality.low&&(o.d|0)%2)return;m=makeCloud(o.c,o.add);m.scale.setScalar(o.sz);break;
  case'lamp':m=makeLamp();break;
  case'strike':m=makeStrike();break;
  case'current':case'surge':{m=new THREE.Group();const n=Quality.low?40:90,pp=new Float32Array(n*3);for(let i=0;i<n;i++){pp[i*3]=rnd(-o.w/2,o.w/2);pp[i*3+1]=rnd(-o.h/2,o.h/2);pp[i*3+2]=rnd(-o.len/2,o.len/2)}
   const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.BufferAttribute(pp,3));
   const pt=new THREE.Points(gg,new THREE.PointsMaterial({size:1.6,map:R.glow,color:o.t==='surge'?0xffd35a:0x66e8ff,sizeAttenuation:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));pt.frustumCulled=false;m.add(pt);m.userData.pts=pt;
   const bx=new THREE.Mesh(new THREE.BoxGeometry(o.w,o.h,o.len),new THREE.MeshBasicMaterial({color:o.t==='surge'?0xffb030:0x2fb8ff,transparent:true,opacity:o.t==='surge'?.09:.05,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide,fog:false}));m.add(bx);
   m.position.set(o.x,o.y,-(o.d+o.len/2));o.m=m;o.born=S.time;o.base=1;world.add(m);return}
 }
 if(!m)return;m.position.set(o.x,o.y,-o.d);o.m=m;o.born=S.time;o.base=m.scale.x;world.add(m);
}
function despawn(o){if(o.m){world.remove(o.m);o.m=null}}
function resetStream(){streamObjs.forEach(despawn);lo=0;while(lo<streamObjs.length&&streamObjs[lo].d+(streamObjs[lo].len||0)<S.dist-30)lo++;hi=lo;
 activeMets.forEach(a=>world.remove(a.m));activeMets.length=0;mets.forEach(o=>{o.spawned=false;o.warned=false});advanceStream()}
function advanceStream(){
 while(hi<streamObjs.length&&streamObjs[hi].d<S.dist+AHEAD){const o=streamObjs[hi];if(o.d+(o.len||0)>=S.dist-30&&!o.got)spawn(o);hi++}
 while(lo<hi&&streamObjs[lo].d+(streamObjs[lo].len||0)<S.dist-30){despawn(streamObjs[lo]);lo++}
}
let genBudget=0;
function updateBackdrops(dt){
 genBudget=1;const nextZ=S.cine&&S.cine.type==='stage'?S.cine.arg:-1;
 backdrops.forEach(g=>{const b=g.userData.back,show=b.z===S.stage;g.visible=show;
  const want=(b.z===S.stage||b.z===nextZ);
  if(want&&!g.userData.tex&&genBudget>0){genBudget--;Planets.ensure(g)}
  if(!want&&g.userData.tex&&b.z<S.stage-0)Planets.release(g);
  if(show){const d=new THREE.Vector3(...b.dir).normalize().multiplyScalar(b.dist);d.z+=(S.dist-ZONE_START[b.z])*b.k;g.position.copy(d);Planets.update(g,envNow.pSun,envNow.sunCol,S.time,dt)}});
}

/* ================= الإدخال ================= */
const keys={};let touch=null;
function wireInput(){
 const cv=$('gl');
 cv.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'){const now=performance.now();if(now-lastTapT<280&&S.mode==='play')dash(e.clientX<innerWidth/2?-1:1);lastTapT=now;touch={x:e.clientX,y:e.clientY};try{cv.setPointerCapture(e.pointerId)}catch(_){}}
  else{pointerAbs(e);if(e.button===0)S.firing=true}});
 cv.addEventListener('pointermove',e=>{if(e.pointerType==='touch'){if(!touch||S.mode!=='play')return;S.tx=clamp(S.tx+(e.clientX-touch.x)*20/innerWidth*1.7,-10,10);S.ty=clamp(S.ty-(e.clientY-touch.y)*12/innerHeight*1.7,-6,6);touch={x:e.clientX,y:e.clientY}}else pointerAbs(e)});
 const up=()=>{touch=null;S.firing=false};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);addEventListener('blur',up);
 cv.addEventListener('contextmenu',e=>e.preventDefault());
 addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();if(!keys[k]){ // أول ضغطة
   if(k==='q')dash(-1);else if(k==='e')dash(1);else if(k==='f'||k==='control')S.firing=true;else if(['arrowleft','a','arrowright','d'].includes(k)){const now=performance.now(),dir=(k==='arrowleft'||k==='a')?-1:1;if(lastKey[k]&&now-lastKey[k]<230)dash(dir);lastKey[k]=now}
   else if(['1','2','3'].includes(k)&&S.mode==='question')pickOrb(+k-1)}
  keys[k]=1;if(e.key.startsWith('Arrow')||e.key===' ')e.preventDefault()});
 addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=0;if(k==='f'||k==='control')S.firing=false});
 const bb=$('boostBtn');bb.addEventListener('pointerdown',e=>{keys[' ']=1;e.stopPropagation()});['pointerup','pointercancel','pointerleave'].forEach(t=>bb.addEventListener(t,()=>{keys[' ']=0}));
 const fb=$('fireBtn');fb.addEventListener('pointerdown',e=>{S.firing=true;e.stopPropagation()});['pointerup','pointercancel','pointerleave'].forEach(t=>fb.addEventListener(t,()=>{S.firing=false}));
}
function dash(dir){if(S.mode!=='play'||S.dashCD>0)return;S.dashT=.34;S.dashCD=1.1;S.dashDir=dir;S.vx+=dir*38;S.tx=clamp(S.x+dir*9,-10,10);S.inv=Math.max(S.inv,.42);Snd.sfx('dash');burst(new THREE.Vector3(S.x,S.y,-S.dist),24,0x7fe6ff,16,.5)}
function pointerAbs(e){if(S.mode!=='play'&&S.mode!=='question')return;if(e.pointerType==='touch')return;S.tx=clamp((e.clientX/innerWidth*2-1)*11,-10,10);S.ty=clamp(-(e.clientY/innerHeight*2-1)*7,-6,6)}

/* ================= الاصطدام ================= */
const SHIP_SPH=[[0,0,-1.8,.8],[0,0,.1,1.15],[0,0,1.8,.9],[-2.6,-.15,1.1,.75],[2.6,-.15,1.1,.75]];
function hitSphere(ox,oy,oz,rad){const sz=-S.dist;if(Math.abs(oz-sz)>rad+5)return false;
 for(const s of SHIP_SPH){const dx=S.x+s[0]-ox,dy=S.y+s[1]-oy,dz=sz+s[2]-oz,rr=rad+s[3];if(dx*dx+dy*dy+dz*dz<rr*rr)return true}return false}
function hitShip(px,py,pz){
 if(S.inv>0||S.god||S.mode!=='play')return;S.combo=0;updCombo();S.shield--;S.inv=1.8;S.shake=.7;S.flash=.25;S.flashCol.setRGB(1,.4,.2);S.damage=1;S.speed*=.55;Snd.sfx('hit');
 const p=new THREE.Vector3(px??S.x,py??S.y,pz??-S.dist);burst(p,70,0xffa04d,22,.9);burst(p,40,0xfff0c0,12,.5);burst(p,30,0x66d8ff,16,.7);updHud();ship.userData.sm.uniforms.uHit.value=1;
 if(S.shield<=0)crash();
}
function crash(){S.mode='crash';S.crashT=0;Snd.sfx('crash');ship.visible=false;burst(new THREE.Vector3(S.x,S.y,-S.dist),180,0xffa24d,30,1.6);burst(new THREE.Vector3(S.x,S.y,-S.dist),90,0xffffff,18,1);$('crash').classList.remove('hidden')}
function respawn(){
 $('crash').classList.add('hidden');ship.visible=true;S.dist=S.cp;S.speed=0;S.shield=3;S.inv=2.5;S.cells=S.cpCells;S.points=S.cpPoints;S.x=S.y=S.tx=S.ty=0;S.vx=S.vy=0;
 streamObjs.forEach(o=>{if(o.d>S.cp&&(o.t==='cell'||o.t==='heal'))o.got=false;if(o.t==='strike')o.fired=false;if(o.t==='rock'){o.grazed=false}});events.forEach(e=>{if(e.d>S.cp)e.done=false});Combat.reset();S.droneWave=null;resetStream();S.mode='play';updHud();
}
function collisions(){
 const sz=-S.dist;
 for(let i=lo;i<hi;i++){const o=streamObjs[i];if(!o.m||o.got)continue;
  switch(o.t){
   case'cell':if(hitSphere(o.x,o.y,-o.d,1.6)){o.got=true;o.m.visible=false;collectCrystal(o.m.position.clone())}break;
   case'heal':if(hitSphere(o.x,o.y,-o.d,1.8)){o.got=true;o.m.visible=false;Snd.sfx('heal');burst(o.m.position,34,0x55ffaa,10,.9);if(S.shield<3){S.shield++;updHud()}}break;
   case'rock':{if(!o.decor||Math.hypot(o.x-S.x,o.y-S.y)<o.r*.9+4){const rr=o.r*(o.shard?.8:.78);if(hitSphere(o.x,o.y,-o.d,rr))hitShip(o.x,o.y,-o.d);
     else if(!o.grazed&&!o.decor){const dd=o.d-S.dist;if(dd<1&&dd>-4){o.grazed=true;const gap=Math.hypot(o.x-S.x,o.y-S.y)-rr;if(gap<3.1&&S.inv<=0)graze(o)}}}break}
   case'surge':if(S.dist>o.d&&S.dist<o.d+o.len&&Math.abs(S.x-o.x)<o.w/2&&Math.abs(S.y-o.y)<o.h/2){if(S.surgeT<=.3){Snd.sfx('combo');hint('🚀 تيار تسارع!',1200)}S.surgeT=1.6}break;
   case'debris':if(hitSphere(o.x,o.y,-o.d,o.r*1.05))hitShip(o.x,o.y,-o.d);break;
   case'current':if(S.dist>o.d&&S.dist<o.d+o.len&&Math.abs(S.x-o.x)<o.w/2&&Math.abs(S.y-o.y)<o.h/2){S.vx+=o.fx*.9*S.dt;S.vy+=o.fy*.9*S.dt}break;
   case'strike':{const dd=o.d-S.dist;if(!o.fired&&dd<16&&dd>-6){o.fired=true;o.fireT=0;Snd.sfx('hit');S.flash=Math.max(S.flash,.15);S.flashCol.setRGB(.7,.6,1);if(Math.hypot(S.x-o.x,S.y-o.y)<o.r)hitShip(o.x,o.y,-o.d)}break}
  }}
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
 const st=L.gates[S.gi];
 S.zoneK=ZONE_K[Math.min(S.stage,3)];
 const wantBoost=(keys[' ']||keys['shift'])&&S.bst>.04;S.boosting=!!wantBoost;
 S.bst=clamp(S.bst+(wantBoost?-.34:.11)*dt,0,1);
 if(S.surgeT>0)S.surgeT-=dt;if(S.dashCD>0)S.dashCD-=dt;if(S.dashT>0)S.dashT-=dt;if(S.recoil>0)S.recoil-=dt*3;
 const tgt=BASE*S.zoneK*(wantBoost?1.7:1)*(S.surgeT>0?1.75:1);S.speed+=(tgt-S.speed)*Math.min(1,dt*(tgt<S.speed?4:2.6));
 S.boost+=((wantBoost||S.surgeT>0?1:0)-S.boost)*Math.min(1,dt*5);
 S.dist+=S.speed*dt;
 steer(dt);if(S.inv>0)S.inv-=dt;
 advanceStream();collisions();updateMeteors(dt);Combat.update(dt);
 // مؤقّت الكومبو
 if(S.combo>0){comboTimer-=dt;if(comboTimer<=0){S.combo=0;updCombo()}else updCombo(true)}
 // أحداث المستوى (نصائح، الزعيم، المسيّرات)
 for(const ev of events){if(ev.done||S.dist<ev.d)continue;ev.done=true;
  if(ev.t==='tip')hint(ev.text,ev.ms);else if(ev.t==='boss'){if(!st||S.dist<st.d-200)Combat.startBoss()}else if(ev.t==='drones'){S.droneWave={started:true,done:false};Combat.startDrones(ev)}}
 if(st&&!st.open&&S.dist>=st.d){Combat.clearEnemies();enterQuestion()}
 L.gates.forEach((gt,i)=>{if(gt.open&&gt.cine&&S.dist>gt.d+170){gt.cine=0;startCine('stage',zoneOfQ(i+1))}});
}
function updateMeteors(dt){
 for(const o of mets){
  if(!o.spawned){if(!o.warned&&S.dist>=o.trig-100){o.warned=true;Snd.sfx('warn')}
   if(S.dist>=o.trig&&S.mode==='play'){o.spawned=true;const m=makeMeteor(o.r);m.position.set(o.x,o.y,-(S.dist+300));world.add(m);activeMets.push({o,m,vx:o.vx,vy:o.vy})}}}
 for(let i=activeMets.length-1;i>=0;i--){const a=activeMets[i];const p=a.m.position;p.z+=34*dt;p.x+=a.vx*dt;p.y+=a.vy*dt;a.m.userData.rock.rotation.x+=dt*1.2;a.m.userData.rock.rotation.y+=dt*.8;
  a.m.userData.fm.uniforms.uTime.value=S.time;a.m.lookAt(p.x-a.vx,p.y-a.vy,p.z-34);if(p.z>-S.dist+25){world.remove(a.m);activeMets.splice(i,1)}}
}

/* ================= السينمائيات ================= */
function startCine(type,arg){
 S.mode='cine';S.cine={type,t:0,arg,did:{}};$('bars').classList.add('on');
 if(type==='stage'){S.cine.dur=7;Snd.sfx('warp');S.camMode='chase'}
 if(type==='launch'){S.cine.dur=6;S.camMode='orbit'}
 if(type==='landing'){S.cine.dur=26;S.camMode='chase';S.landT=0;beginLanding()}
 if(type==='resume'){S.cine.dur=3.2;S.camMode='chase'}
 $('hint').classList.remove('show');$('target').classList.remove('show');
}
function showTitle(info,sub){const c=$('cine');c.classList.remove('show','hidden');void c.offsetWidth;c.querySelector('.k').textContent=info.k;c.querySelector('.t').textContent=info.t;c.querySelector('.s').textContent=sub||info.s;c.classList.add('show')}
function endCine(){S.cine=null;S.camMode='chase';S.mode='play';$('bars').classList.remove('on');$('cine').classList.add('hidden');$('cine').classList.remove('show');$('count').classList.add('hidden');
 S.warp=0;resetStream();world.visible=true;updHud();$('hud').classList.remove('hidden')}
let landPath=null;
function beginLanding(){
 station.updateMatrixWorld(true);const pw=new THREE.Vector3();station.userData.pad.getWorldPosition(pw);
 const p0=new THREE.Vector3(S.x,S.y,-S.dist),p3=pw.clone().add(new THREE.Vector3(0,4.2,0)),p1=p0.clone().add(new THREE.Vector3(0,2,-170)),p2=p3.clone().add(new THREE.Vector3(0,26,95));
 landPath={p0,p1,p2,p3};S.cine.pad=pw;
}
function bez(t,o){const a=landPath,u=1-t;return o.set(0,0,0).addScaledVector(a.p0,u*u*u).addScaledVector(a.p1,3*u*u*t).addScaledVector(a.p2,3*u*t*t).addScaledVector(a.p3,t*t*t)}
const _b=V3(),_b2=V3();
function cineStep(dt){
 const c=S.cine,t=c.t+=dt;
 if(c.type==='launch'){
  S.flameP=t<4.4?.28:1;S.speed=0;
  if(!c.did.ti&&t>.4){c.did.ti=1;showTitle(STAGES[0],'ثلاثة… اثنان… واحد')}
  [[2.1,'٣'],[3,'٢'],[3.9,'١']].forEach(([tt,tx],i)=>{if(!c.did['c'+i]&&t>=tt){c.did['c'+i]=1;const e=$('count');e.textContent=tx;e.classList.remove('hidden','pop');void e.offsetWidth;e.classList.add('pop');Snd.sfx('beep')}});
  if(!c.did.ig&&t>=4.8){c.did.ig=1;Snd.sfx('ignite');S.flash=.5;S.flashCol.setRGB(.7,.85,1);S.shake=1;S.camMode='chase'}
  if(t>=5.7){S.mode='play';S.speed=6;endCine();hint('وجّه المركبة بالفأرة أو بإصبعك · Space للدفع ⚡ · اجمع بلورات الطاقة 💎 وتفادَ الحطام',8000)}
 }else if(c.type==='stage'){
  const up=ease(clamp(t/1.8,0,1)),dn=t>5.2?1-ease(clamp((t-5.2)/1.6,0,1)):1;S.warp=up*dn;S.speed=BASE*(1+S.warp*2);world.visible=false;
  if(!c.did.sw&&t>=2.0){c.did.sw=1;S.flash=1;S.flashCol.setRGB(.8,.9,1);setStageEnv(c.arg,3.5);showTitle(STAGES[c.arg])}
  if(c.did.sw&&S.flash>0)S.flash=Math.max(0,S.flash-dt*.8);
  if(t>=c.dur){S.speed=BASE;endCine()}
 }else if(c.type==='resume'){
  if(!c.did.ti){c.did.ti=1;showTitle(STAGES[S.stage],'نكمل رحلتنا!')}S.warp=.35*Math.sin(clamp(t/c.dur,0,1)*3.14);if(t>=c.dur){S.speed=BASE*.6;endCine()}
 }else if(c.type==='landing'){
  S.landT+=dt;const T=18,u=clamp(S.landT/T,0,1),e=u<.85?u/.85*.9:.9+(u-.85)/.15*.1;const tt=ease(clamp(u,0,1))*1.0;
  bez(Math.min(1,tt),_b);bez(Math.min(1,tt+.015),_b2);S.vx=(_b2.x-_b.x)/dt*.2;S.vy=(_b2.y-_b.y)/dt*.2;
  S.x=_b.x;S.y=_b.y;S.dist=-_b.z;S.speed=Math.max(0,(1-tt)*30+2);S.tx=S.x;S.ty=S.y;
  if(!c.did.ti&&t>.4){c.did.ti=1;showTitle({k:'المنطقة الأخيرة',t:'الهبوط على المحطة',s:'تابع الإضاءة الإرشادية نحو المنصة'})}
  if(u>=1&&!c.did.land){c.did.land=1;S.speed=0;S.flameP=.1;Snd.sfx('win');setBlinkColor(0x3dff9a);S.flash=.4;S.flashCol.setRGB(.8,1,.9);burst(_b.clone(),160,0x7fffc0,26,1.8);burst(_b.clone(),120,0xffd35a,20,1.6);S.camMode='landorbit';S.endGlow=1;
   showTitle({k:'مهمة ناجحة',t:'تم إنقاذ المحطة الفضائية!',s:'عادت وحدات المعرفة العشر للمحطة'});startConfetti(7)}
  if(c.did.land){c.lt=(c.lt||0)+dt;S.flameP=.1;if(c.lt>5.5&&!c.did.end){c.did.end=1;showEnd()}}
 }
}

/* ================= الأسئلة: الإجابة بالطيران نحو كرة الإجابة ================= */
const ORB_AHEAD=72;
function enterQuestion(){
 S.mode='question';S.qShown=false;S.boosting=false;S.boost=0;S.firing=false;Snd.duck(.55);$('target').classList.remove('show');
 const nv=$('nav');nv.classList.add('show');Snd.sfx('warn');setTimeout(()=>Snd.sfx('beep'),180);
 setTimeout(()=>{if(S.mode!=='question'||S.qShown)return;S.qShown=true;nv.classList.remove('show');showQuestion(S.gi);hint('✈️ طِر نحو الإجابة الصحيحة (أو اضغط عليها) — المفاتيح 1 · 2 · 3',6000)},1500);
}
const Q={i:0,att:0,locked:false,prev:'',hint:0,done:false};
const LET=['أ','ب','ج'];
function shuf(arr,prev){let a;for(let k=0;k<8;k++){a=arr.map(o=>({t:o.t,ok:!!o.ok}));for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}if(a.map(o=>o.t).join('|')!==prev)break}return a}
function setFb(c,t){const f=$('fb');f.className=c;f.textContent=t}
function showQuestion(i){
 const q=QUESTIONS[i];Q.i=i;Q.att=0;Q.locked=false;Q.prev='';Q.hint=0;Q.done=false;
 $('qnum').textContent=`السؤال ${toAr(i+1)} من ${toAr(10)}`;$('sentence').textContent=q.sentence;$('qprompt').textContent=q.prompt;setFb('','');$('att').textContent='';
 renderOpts();$('qwrap').classList.remove('hidden');const w=$('qwrap');w.style.animation='none';void w.offsetWidth;w.style.animation='';
}
function renderOpts(){
 const q=QUESTIONS[Q.i],arr=shuf(q.options,Q.prev);Q.prev=arr.map(o=>o.t).join('|');const box=$('opts');box.innerHTML='';
 arr.forEach((o,k)=>{const b=document.createElement('button');b.className='opt';b.dataset.ok=o.ok?'1':'0';const l=document.createElement('span');l.className='lt';l.textContent=LET[k];const t=document.createElement('span');t.textContent=o.t;b.append(l,t);b.onclick=()=>choose(b,o);box.append(b)});
 spawnOrbs(arr);
}
/* كرات الإجابة: ثلاث كرات مضيئة أمام المركبة */
const ORB_COL=[0xff5a9a,0x3fc8ff,0xa070ff];
function orbLabel(text,col){const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'rgba(12,30,90,.92)');g.addColorStop(1,'rgba(4,12,50,.92)');x.fillStyle=g;x.beginPath();x.roundRect(10,30,492,196,60);x.fill();x.lineWidth=10;x.strokeStyle='#'+new THREE.Color(col).getHexString();x.stroke();
 x.fillStyle='#fff';x.textAlign='center';x.textBaseline='middle';x.direction='rtl';let fs=84;x.font=`900 ${fs}px "Segoe UI","Noto Sans Arabic",Tahoma,sans-serif`;while(x.measureText(text).width>420&&fs>30){fs-=6;x.font=`900 ${fs}px "Segoe UI","Noto Sans Arabic",Tahoma,sans-serif`}
 x.shadowColor='#' + new THREE.Color(col).getHexString();x.shadowBlur=24;x.fillText(text,256,132);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function clearOrbs(){orbs.forEach(o=>world.remove(o.g));orbs=[]}
function spawnOrbs(arr){
 clearOrbs();const lanes=[-8.6,0,8.6],z=-(S.dist+ORB_AHEAD);
 arr.forEach((o,i)=>{const g=new THREE.Group();const col=ORB_COL[i];
  const core=new THREE.Mesh(new THREE.SphereGeometry(3.3,32,24),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:1.5,roughness:.15,metalness:.1,transparent:true,opacity:.92}));g.add(core);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(4.5,.16,10,60),new THREE.MeshBasicMaterial({color:new THREE.Color(col).multiplyScalar(2.2)}));ring.rotation.x=1.2;g.add(ring);
  const gl=new THREE.Sprite(R.glowMat(col));gl.scale.setScalar(22);g.add(gl);
  const lb=new THREE.Sprite(new THREE.SpriteMaterial({map:orbLabel(o.t,col),transparent:true,depthWrite:false,depthTest:false}));lb.scale.set(15,7.5,1);lb.position.y=6.4;lb.renderOrder=20;g.add(lb);
  g.position.set(lanes[i],i===1?-.2:.9,z);world.add(g);orbs.push({g,ring,core,o,i,dead:false})})
}
function pickOrb(i){if(S.mode!=='question'||Q.locked||!orbs[i])return;const b=document.querySelectorAll('#opts .opt')[i];if(b)b.click()}
function updateOrbs(dt){
 const sz=-S.dist;for(const ob of orbs){ob.ring.rotation.z+=dt*1.6;ob.g.position.y+=Math.sin(S.time*2+ob.i)*.01;ob.g.scale.setScalar(ob.dead?Math.max(.01,ob.g.scale.x-dt*4):1+.04*Math.sin(S.time*4+ob.i))}
 if(!S.qShown||Q.locked||Q.done)return;
 for(const ob of orbs){if(ob.dead)continue;const p=ob.g.position;if(hitSphere(p.x,p.y,p.z,3.5)){Snd.sfx('orb');pickOrb(ob.i);return}}
 // إن تجاوزت المركبة الكرات دون اختيار: أعد وضعها أمامها
 if(orbs.length&&orbs[0].g.position.z>sz+9){const arr=orbs.map(o=>o.o);spawnOrbs(arr);hint('↩️ لم تختر بعد — طِر نحو إحدى الكرات',2400)}
}
function choose(btn,o){
 if(Q.locked)return;Q.locked=true;Q.att++;const q=QUESTIONS[Q.i];const idx=[...document.querySelectorAll('#opts .opt')].indexOf(btn);const ob=orbs[idx];
 if(o.ok){
  Q.done=true;btn.classList.add('good');document.querySelectorAll('.opt').forEach(b=>b.classList.add('lock'));Snd.sfx('right');
  const first=Q.att===1;S.res[Q.i]={first};addPoints(first?100:50,new THREE.Vector3(S.x,S.y+2,-S.dist-8),first?'🌟 +١٠٠':'✅ +٥٠',true);
  setFb('good',(first?'🌟 أحسنت! إجابة صحيحة من المحاولة الأولى! ':'✅ صحيح! ')+q.explain+' — استُعيدت وحدة معرفة ⚡');
  S.flash=.28;S.flashCol.setRGB(.6,1,.85);if(ob){burst(ob.g.position.clone(),160,ORB_COL[idx],26,1.4);burst(ob.g.position.clone(),80,0xffffff,18,.9);orbs.forEach(x=>{if(x!==ob)x.dead=true})}
  S.cp=L.gates[Q.i].d+170;S.cpCells=S.cells;S.cpPoints=S.points;S.gi=Q.i+1;L.gates[Q.i].open=true;save();updHud();
  setTimeout(()=>{$('qwrap').classList.add('hidden');clearOrbs();Q.locked=false;Q.done=false;Snd.duck(1);
   if(Q.i===9){startCine('landing')}
   else{L.gates[Q.i].cine=(Q.i===2||Q.i===6||Q.i===8)?1:0;S.mode='play';S.inv=1.5;Snd.sfx('gate');S.flash=.2;burst(new THREE.Vector3(S.x,S.y,-S.dist),60,0x66d8ff,26,1,1);hint(Q.i===2||Q.i===6||Q.i===8?'استعد للانتقال إلى منطقة جديدة…':'ممتاز! تُستأنف الرحلة ✨',2600)}
  },1500);
 }else{
  btn.classList.add('bad');Snd.sfx('wrong');S.shake=.3;if(ob){ob.core.material.color.set(0xff3030);ob.core.material.emissive.set(0xff2020);burst(ob.g.position.clone(),50,0xff5050,16,.8);ob.dead=true}
  const h=q.hints;setFb('bad','❌ ليست الإجابة الصحيحة — '+h[Math.min(Q.att-1,h.length-1)]);$('att').textContent='المحاولات: '+toAr(Q.att);
  setTimeout(()=>{if(Q.done)return;renderOpts();Q.locked=false},1500);
 }
}

/* ================= المكافآت والمؤثرات ================= */
function pop(text,world3,cls=''){const el=document.createElement('div');el.className='pop '+cls;el.textContent=text;const v=world3.clone().project(camera);
 el.style.left=clamp((v.x*.5+.5)*innerWidth,40,innerWidth-40)+'px';el.style.top=clamp((-v.y*.5+.5)*innerHeight,90,innerHeight-90)+'px';$('pops').append(el);setTimeout(()=>el.remove(),1100)}
function addPoints(n,pos,label,big){const m=S.combo>=4?1+Math.min(4,Math.floor(S.combo/4)):1;const v=Math.round(n*(label&&label.includes('+')?1:m));S.points+=v;if(pos&&label!=='')pop(label?`${label}`:`+${toAr(v)}`,pos,big?'big':'');updHud()}
function collectCrystal(pos){
 S.cells++;S.combo++;comboTimer=2.4;const m=1+Math.min(4,Math.floor(S.combo/4));S.points+=10*m;S.bst=Math.min(1,S.bst+.1);
 Snd.sfx(S.combo%4===0?'combo':'cell');burst(pos,14,0x66e0ff,10,.6);if(S.combo%4===0)pop(`كومبو ×${toAr(m)}`,pos.clone().add(new THREE.Vector3(0,2,0)),'combo');updHud();updCombo()}
function graze(o){const pos=new THREE.Vector3(S.x,S.y+1.6,-S.dist-4);S.points+=25;Snd.sfx('graze');pop('كدتَ تصطدم! +٢٥',pos,'graze');burst(new THREE.Vector3(S.x,S.y,-S.dist),10,0xffe08a,12,.4);S.combo+=2;comboTimer=2.4;updHud();updCombo()}
function updCombo(live){const c=$('combo');if(S.combo>=3){const m=1+Math.min(4,Math.floor(S.combo/4));c.textContent=`🔥 كومبو ×${toAr(m)}`;c.classList.add('show');c.style.setProperty('--k',clamp(comboTimer/2.4,0,1))}else c.classList.remove('show')}
function initCombat(){
 Combat.init({S,world,Snd,hud:{boss:f=>{const b=$('bossbar');if(f==null){b.classList.remove('show');return}b.classList.add('show');b.firstElementChild.firstElementChild.style.width=(f*100)+'%'}},
  burst,hitShip,hitSphere,stream:()=>[lo,hi,streamObjs],mets:()=>activeMets,despawn:o=>despawn(o),killMeteor:a=>{world.remove(a.m);const i=activeMets.indexOf(a);if(i>=0)activeMets.splice(i,1)},
  collectCrystal,addPoints,hint,muzzle:()=>{S.recoil=.6},get droneWave(){return S.droneWave}});
 // نثار قريب من المسار لإحساس السرعة
 const geo=new THREE.IcosahedronGeometry(1,1);const n=Quality.low?70:150;streamers=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({color:0x9a8a80,roughness:.9,metalness:.05,flatShading:true}),n);streamers.frustumCulled=false;scene.add(streamers);
 strData=Array.from({length:n},()=>({a:Math.random()*6.283,r:rnd(9,26),z:-rnd(0,320),s:rnd(.25,1.1),sp:rnd(-1,1)}));
}
const _m4=new THREE.Matrix4(),_q=new THREE.Quaternion(),_e=new THREE.Euler(),_s=new THREE.Vector3(),_p=new THREE.Vector3();
function updateStreamers(dt){
 if(!streamers)return;const cz=camera.position.z,cx=camera.position.x,cy=camera.position.y;const adv=S.speed*dt;
 strData.forEach((d,i)=>{d.z+=adv;d.a+=d.sp*dt*.2;if(d.z>40){d.z=-rnd(260,340);d.a=Math.random()*6.283;d.r=rnd(9,26);d.s=rnd(.25,1.1)}
  _p.set(cx+Math.cos(d.a)*d.r,cy*.5+Math.sin(d.a)*d.r*.7,cz+d.z);_e.set(S.time*d.sp,S.time*.5*d.sp,d.a);_q.setFromEuler(_e);_s.setScalar(d.s);_m4.compose(_p,_q,_s);streamers.setMatrixAt(i,_m4)});
 streamers.instanceMatrix.needsUpdate=true;streamers.visible=S.mode!=='menu'&&S.mode!=='question'||S.mode==='question';
 streamers.material.color.copy(envNow.rock).multiplyScalar(.32);
}

/* ================= الواجهة ================= */
function hint(t,ms=4500){const h=$('hint');h.textContent=t;h.classList.add('show');clearTimeout(hint.t);hint.t=setTimeout(()=>h.classList.remove('show'),ms)}
function buildHud(){const tr=$('track');tr.innerHTML='';QUESTIONS.forEach((q,i)=>{if(i&&QUESTIONS[i-1].stage!==q.stage){const s=document.createElement('div');s.className='sep';tr.append(s)}const d=document.createElement('div');d.className='nd';d.id='nd'+i;tr.append(d)})}
function updHud(){
 const sb=$('shbar');sb.classList.toggle('low',S.shield<=1);sb.firstElementChild.style.width=(S.shield/3*100)+'%';
 $('pointsN').textContent=toAr(S.points);$('unitsN').textContent=toAr(S.gi)+'/'+toAr(10);$('pname').textContent=S.name||'مستكشف';
 QUESTIONS.forEach((_,i)=>{const n=$('nd'+i);if(n)n.className='nd'+(i<S.gi?' done':i===S.gi?' cur':'')});
}
function save(){const d={res:S.res,cells:S.cells,points:S.points,name:S.name,v:3};try{sessionStorage.setItem(KEY,JSON.stringify(d))}catch(e){}Scorm.progress(d)}
function load(){try{const j=JSON.parse(sessionStorage.getItem(KEY)||'null');if(j&&Array.isArray(j.res))return j}catch(e){}const s=Scorm.getSuspend();return s&&Array.isArray(s.res)?s:null}
function clear(){try{sessionStorage.removeItem(KEY)}catch(e){}}
function offerResume(){const sv=load();const n=sv?sv.res.filter(Boolean).length:0;
 if(n>0&&n<10){const b=document.createElement('button');b.className='btn green';b.textContent=`⟳ متابعة من السؤال ${toAr(n+1)}`;b.onclick=()=>{if(sv.name)$('nameInput').value=sv.name;startGame(n)};$('startBtns').prepend(b);$('goBtn').textContent='▶ ابدأ من جديد';if(sv.name&&!$('nameInput').value)$('nameInput').value=sv.name}}
function showEnd(){
 S.mode='end';$('hud').classList.add('hidden');$('bars').classList.remove('on');$('cine').classList.add('hidden');$('warns').innerHTML='';
 const score=S.res.filter(r=>r&&r.first).length,passed=score>=PASS_SCORE;S.score=score;
 $('stPts').textContent=toAr(S.points);$('stUnits').textContent=toAr(10)+'/'+toAr(10);$('stScore').textContent=toAr(score)+'/'+toAr(10);
 $('endMsg').textContent=score===10?'مذهل! أجبتَ عن جميع الأسئلة من المحاولة الأولى — أنت قائد فضاء حقيقي! 🚀':score>=8?'ممتاز! فهمك لحروف العطف رائع، وبقليل من التركيز تصل إلى العلامة الكاملة.':score>=5?'جيد! راجع معاني حروف العطف (الواو، الفاء، ثم، أو) وجرّب مغامرة جديدة.':'لا بأس! المحطة أُنقذت بالمثابرة. راجع الدرس ثم أعد المغامرة لتحسّن درجتك.';
 const rows=$('endRows');rows.innerHTML='';QUESTIONS.forEach((q,i)=>{const r=S.res[i],d=document.createElement('div');d.className=r&&r.first?'ok':'no';d.textContent=`${toAr(i+1)} ${r&&r.first?'✅':'🔁'}`;rows.append(d)});
 $('end').classList.remove('hidden');$('endEy').textContent=passed?'مهمة ناجحة':'اكتملت المهمة';Scorm.finish(score,passed);$('endLms').textContent=Scorm.active?'أُرسلت درجتك إلى نظام إدارة التعلم.':'';clear();startConfetti(5);
}
function certData(){const n=(S.name||'مستكشف').trim();const sc=S.score==null?S.res.filter(r=>r&&r.first).length:S.score;const d=new Date().toLocaleDateString('ar-SA-u-nu-arab',{year:'numeric',month:'long',day:'numeric'});return {n,sc,d}}
function showCert(){const c=certData();$('cName').textContent=c.n;$('cScore').textContent=toAr(c.sc);$('cScore2').textContent=toAr(c.sc)+'/'+toAr(10);$('cDate').textContent=c.d;$('cert').classList.remove('hidden');startConfetti(4)}
function saveCertPng(){
 const c=certData(),W=1600,H=1131,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
 const bg=x.createRadialGradient(W/2,H*.4,100,W/2,H/2,W*.7);bg.addColorStop(0,'#fffaf0');bg.addColorStop(1,'#f1deb0');x.fillStyle=bg;x.fillRect(0,0,W,H);
 x.strokeStyle='#b98a22';x.lineWidth=18;x.strokeRect(30,30,W-60,H-60);x.lineWidth=4;x.strokeRect(62,62,W-124,H-124);x.strokeStyle='#1a2c6a';x.lineWidth=6;x.strokeRect(46,46,W-92,H-92);
 x.direction='rtl';x.textAlign='center';x.textBaseline='middle';const F='"Segoe UI","Noto Sans Arabic","Noto Kufi Arabic",Tahoma,sans-serif';
 const seal=x.createRadialGradient(W/2-12,170,6,W/2,180,70);seal.addColorStop(0,'#ffe9a0');seal.addColorStop(1,'#d09a20');x.fillStyle=seal;x.beginPath();x.arc(W/2,180,66,0,6.283);x.fill();x.strokeStyle='#8a5a00';x.lineWidth=6;x.stroke();x.font='64px '+F;x.fillStyle='#fff';x.fillText('🚀',W/2,184);
 x.fillStyle='#1a2c6a';x.font='900 96px '+F;x.fillText('شهادة مستكشف العطف',W/2,330);
 x.fillStyle='#6a5020';x.font='700 38px '+F;x.fillText('تُمنح هذه الشهادة للطالب:',W/2,430);
 x.fillStyle='#a64a00';let fs=120;x.font=`900 ${fs}px ${F}`;while(x.measureText(c.n).width>W*.72&&fs>40){fs-=6;x.font=`900 ${fs}px ${F}`}x.fillText(c.n,W/2,560);
 x.strokeStyle='rgba(185,138,34,.7)';x.lineWidth=5;x.beginPath();x.moveTo(W*.2,620);x.lineTo(W*.8,620);x.stroke();
 x.fillStyle='#3a2a10';x.font='700 42px '+F;x.fillText('لإتمامه بنجاح مهمة «مغامرة العطف في الفضاء» وإنقاذ المحطة الفضائية،',W/2,720);
 x.fillText(`وحصوله على درجة تعليمية قدرها ${toAr(c.sc)} من ${toAr(10)} في درس العطف — الصف الثامن الأساسي.`,W/2,790);
 x.fillStyle='#1a2c6a';x.font='900 66px '+F;x.fillText(`الدرجة: ${toAr(c.sc)}/${toAr(10)}`,W/2,910);
 x.fillStyle='#6a5020';x.font='700 32px '+F;x.textAlign='right';x.fillText('إعداد وتنفيذ: الأستاذ يحيى عبدالله الجابري',W-110,1020);x.textAlign='left';x.fillText('التاريخ: '+c.d,110,1020);
 const a=document.createElement('a');a.download='شهادة-مستكشف-العطف.png';a.href=cv.toDataURL('image/png');document.body.append(a);a.click();a.remove();
}
let confetti={on:false,parts:[]};
function startConfetti(sec){const cv=$('confetti');cv.classList.remove('hidden');cv.width=innerWidth;cv.height=innerHeight;const x=cv.getContext('2d');const cols=['#ffd35a','#4dd8ff','#ff6fa8','#7cf5b6','#c08cff','#fff'];
 confetti.parts=Array.from({length:150},()=>({x:Math.random()*cv.width,y:-Math.random()*cv.height*.6,vx:(Math.random()-.5)*3,vy:2+Math.random()*4,s:6+Math.random()*8,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:cols[(Math.random()*cols.length)|0]}));
 const t0=performance.now();confetti.on=true;
 (function loop(){if(!confetti.on)return;const el=(performance.now()-t0)/1000;x.clearRect(0,0,cv.width,cv.height);
  confetti.parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;if(p.y>cv.height&&el<sec){p.y=-10;p.x=Math.random()*cv.width}x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/3,p.s,p.s*.6);x.restore()});
  if(el>sec+2.5){confetti.on=false;cv.classList.add('hidden');return}requestAnimationFrame(loop)})()}
function startGame(resumeN){
 const nm=($('nameInput').value||'').trim();S.name=nm||'مستكشف';
 const st=$('start');st.classList.add('out');Snd.init();if(Snd.ctx&&Snd.ctx.state==='suspended')Snd.ctx.resume();Snd.sfx('ignite');
 setTimeout(()=>{st.classList.add('hidden');st.classList.remove('out');beginRun(resumeN||0)},700);
}
function beginRun(resumeN){
 $('end').classList.add('hidden');$('cert').classList.add('hidden');$('hud').classList.remove('hidden');
 const nm=S.name;const sv=resumeN?load():null;if(!resumeN)clear();newRun();S.name=nm;
 if(resumeN&&sv){
  S.res=sv.res.slice(0,resumeN);S.cells=sv.cells||0;S.points=sv.points||0;S.gi=resumeN;L.gates.forEach((g,i)=>{if(i<resumeN)g.open=true});
  S.dist=L.gates[resumeN-1].d+180;S.cp=S.dist;S.cpCells=S.cells;S.cpPoints=S.points;S.speed=BASE*.5;S.mode='play';
  const z=zoneOfQ(resumeN);setStageEnv(z,0);backdrops.forEach(g=>{if(g.userData.back.z===z)Planets.ensure(g)});resetStream();buildHud();updHud();startCine('resume');
 }else{buildHud();setStageEnv(0,0);updHud();S.dist=0;S.mode='play';startCine('launch')}
}
function wireUi(){
 wireInput();
 $('goBtn').onclick=()=>startGame(0);
 $('howBtn').onclick=()=>$('how').classList.toggle('hidden');
 $('sndBtn').onclick=()=>{Snd.init();Snd.setMute(!Snd.muted);$('sndBtn').textContent=Snd.muted?'🔇 الصوت':'🔊 الصوت';$('muteBtn').textContent=Snd.muted?'🔇':'🔊'};
 $('againBtn').onclick=()=>{$('end').classList.add('hidden');beginRun(0)};
 $('certBtn').onclick=showCert;$('closeCert').onclick=()=>$('cert').classList.add('hidden');$('saveCert').onclick=saveCertPng;$('printCert').onclick=()=>window.print();
 $('muteBtn').onclick=()=>{Snd.setMute(!Snd.muted);$('muteBtn').textContent=Snd.muted?'🔇':'🔊'};
 $('pauseBtn').onclick=()=>{paused=!paused;$('pauseBtn').textContent=paused?'▶':'⏸';if(Snd.ctx)paused?Snd.ctx.suspend():Snd.ctx.resume()};
 $('hintBtn').onclick=()=>{if(Q.done)return;const h=QUESTIONS[Q.i].hints;setFb('hint','💡 '+h[Math.min(Q.hint,h.length-1)]);Q.hint++;Snd.sfx('beep')};
 $('nameInput').addEventListener('keydown',e=>{if(e.key==='Enter')startGame(0)});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&S.mode==='play'&&!paused)$('pauseBtn').click()});
}

/* ================= الكاميرا والمؤثرات ================= */
const tmpP=V3(),tmpL=V3();
function updateCamera(dt){
 const z=-S.dist;let kxy=6,kz=14,lk=8;
 if(S.mode==='menu'){const a=S.time*.12;tmpP.set(Math.sin(a)*16,4+Math.sin(S.time*.2)*1.5,Math.cos(a)*16);tmpL.set(0,.4,0);kxy=kz=3;lk=3}
 else if(S.camMode==='orbit'){const a=S.time*.12+S.cine.t*.08;const r=14-S.cine.t*.3;tmpP.set(Math.sin(a)*r,3.4+Math.sin(S.time*.4)*.6,z+Math.cos(a)*r);tmpL.set(0,.4,z);kxy=kz=3.2;lk=4}
 else if(S.camMode==='landorbit'){const c=S.cine,a=(c.lt||0)*.35+.4,p=c.pad;tmpP.set(p.x+Math.sin(a)*34,p.y+13+Math.sin((c.lt||0)*.6)*3,p.z+Math.cos(a)*34);tmpL.set(p.x,p.y+3,p.z);kxy=kz=2.2;lk=3}
 else{tmpP.set(S.x*.55,S.y*.55+6.4,z+11.4+S.recoil*.25);tmpL.set(S.x*.4,S.y*.4-.2,z-15)}
 const fx=1-Math.exp(-dt*kxy),fz=1-Math.exp(-dt*kz);
 camera.position.x+=(tmpP.x-camera.position.x)*fx;camera.position.y+=(tmpP.y-camera.position.y)*fx;camera.position.z+=(tmpP.z-camera.position.z)*fz;
 lookT.lerp(tmpL,1-Math.exp(-dt*lk));
 if(S.shake>0){const s=S.shake*S.shake*.5+S.warp*.03+S.boost*.05;camera.position.x+=rnd(-s,s);camera.position.y+=rnd(-s,s)}
 camera.lookAt(lookT);S.roll+=(-S.vx*.012-S.roll)*Math.min(1,dt*4);camera.rotateZ(S.roll+Math.sin(S.time*.5)*.002);
 const asp=camera.aspect,base=62+(asp<1.2?(1.2-asp)*34:0);const fov=base+(S.speed/BASE)*2.5+S.warp*50+S.boost*14;
 if(Math.abs(camera.fov-fov)>.01){camera.fov+=(fov-camera.fov)*Math.min(1,dt*6);camera.updateProjectionMatrix()}
}
function updateShip(dt){
 const z=-S.dist;ship.position.set(S.x,S.y,z);
 const bank=clamp(-S.vx*.052,-.75,.75),pitch=clamp(S.vy*.028,-.4,.4);S.bank+=(bank-S.bank)*Math.min(1,dt*7);S.pitch+=(pitch-S.pitch)*Math.min(1,dt*7);
 const hover=S.mode==='question'||S.mode==='menu'?Math.sin(S.time*1.6)*.25:0;ship.userData.body.rotation.set(S.pitch,-S.vx*.012,S.bank+(S.dashT>0?(1-S.dashT/.34)*6.283*(S.dashDir||1)*-1:0));ship.position.y+=hover;
 const u=ship.userData;const sp=S.speed/BASE;
 const target=S.mode==='cine'&&S.cine&&S.cine.type==='launch'?S.flameP:(S.mode==='cine'&&S.cine&&S.cine.type==='landing'?clamp(S.flameP,.1,1):clamp(.35+sp*.8+S.boost*.9,0,1.8));S.flameP+=(target-S.flameP)*Math.min(1,dt*5);
 u.fm.uniforms.uTime.value=S.time;u.fm.uniforms.uPow.value=.18+S.flameP*.22;
 {const fk=1+.1*Math.sin(S.time*50);u.cones.forEach(c=>c.scale.set(1,1,c.userData.k*(.35+S.flameP*.85)*fk));u.sprites.forEach(s=>s.scale.setScalar(1.1+S.flameP*1.0))}
 u.light.intensity=4+S.flameP*10;
 u.sm.uniforms.uTime.value=S.time;u.sm.uniforms.uHit.value=Math.max(0,u.sm.uniforms.uHit.value-dt*1.8);u.sm.uniforms.uLevel.value=S.shield/3;
 ship.visible=S.mode!=='crash';if(S.inv>0&&S.mode==='play')ship.visible=Math.floor(S.time*16)%2===0||S.inv>1.5;
 if(S.mode!=='menu'&&S.speed>2&&Math.random()<.9){for(const sx of[-1.35,1.35]){burst(new THREE.Vector3(S.x+sx*1.1,S.y-.14,z+3.6),1,0x66b8ff,1.6,.6,1)}}
}
function drawRadar(){
 const cv=$('radar'),x=cv.getContext('2d'),W=cv.width,H=cv.height,cx=W/2,sy=H*.8,sc=5.2,fw=.42;x.clearRect(0,0,W,H);
 x.strokeStyle='rgba(77,216,255,.3)';x.lineWidth=2;for(const r of[.28,.56,.84]){x.beginPath();x.arc(cx,H/2,W/2*r,0,6.283);x.stroke()}x.beginPath();x.moveTo(cx,6);x.lineTo(cx,H-6);x.moveTo(6,H/2);x.lineTo(W-6,H/2);x.stroke();
 const sw=(S.time*1.4)%6.283;x.save();x.translate(cx,H/2);x.rotate(sw);const g=x.createLinearGradient(0,0,W/2,0);g.addColorStop(0,'rgba(77,216,255,.45)');g.addColorStop(1,'rgba(77,216,255,0)');x.fillStyle=g;x.beginPath();x.moveTo(0,0);x.arc(0,0,W/2,-.35,0);x.closePath();x.fill();x.restore();
 const dot=(o,col,r)=>{const dz=(o.d-S.dist);if(dz<-30||dz>380)return;const px=cx+(o.x-S.x)*sc*.0+o.x*sc,py=sy-dz*fw;if(py<8||px<8||px>W-8)return;x.fillStyle=col;x.beginPath();x.arc(px,py,r,0,6.283);x.fill()};
 for(let i=lo;i<hi;i++){const o=streamObjs[i];if(!o.m||o.got)continue;if(o.t==='rock'&&!o.decor)dot(o,'#ff6a6a',5);else if(o.t==='cell')dot(o,'#5ae0ff',3.5);else if(o.t==='heal')dot(o,'#55ffaa',5);else if(o.t==='strike')dot(o,'#c08cff',7);else if(o.t==='debris')dot(o,'#ffae4d',4)}
 for(const a of activeMets)dot({d:-a.m.position.z,x:a.m.position.x},'#ff9a3a',5);
 const st=L.gates[S.gi];if(st&&!st.open){const dz=st.d-S.dist;const py=dz>380?10:sy-dz*fw;x.fillStyle='#ffd35a';x.beginPath();x.moveTo(cx,py-8);x.lineTo(cx+9,py+6);x.lineTo(cx-9,py+6);x.closePath();x.fill()}
 x.fillStyle='#fff';x.beginPath();x.moveTo(cx+S.x*sc,sy-9);x.lineTo(cx+S.x*sc+8,sy+8);x.lineTo(cx+S.x*sc-8,sy+8);x.closePath();x.fill();
}
function updateFx(dt){
 const dyn=S.mode==='question'?0:dt;
 const cz=camera.position.z;let ch=false;
 for(let i=0;i<dustAttr.count;i++){if(dustAttr.getZ(i)>cz+30){dustAttr.setXYZ(i,camera.position.x+rnd(-48,48),camera.position.y+rnd(-30,30),cz-rnd(190,240));ch=true}}if(ch)dustAttr.needsUpdate=true;
 dust.material.color.copy(envNow.neb1).lerp(new THREE.Color(1,1,1),.55);
 const sp=S.speed/BASE,intens=S.mode==='menu'?0:clamp(.05+sp*.1+S.warp*.85+S.boost*.45,0,1);lines.material.opacity=intens;lines.visible=intens>.02;lines.position.copy(camera.position);
 if(lines.visible){const adv=(S.speed*1.4+S.warp*1100)*dt;lineData.forEach((d,i)=>{d.z+=adv;const len=(2+S.speed*.05)*d.l*(1+S.warp*22);if(d.z>25){d.z=-rnd(120,260);const a=Math.random()*6.283,r=rnd(4,40);d.x=Math.cos(a)*r;d.y=Math.sin(a)*r*.7}
  lineAttr.setXYZ(i*2,d.x,d.y,d.z);lineAttr.setXYZ(i*2+1,d.x,d.y,d.z-len)});lineAttr.needsUpdate=true}
 for(let k=lo;k<hi;k++){const o=streamObjs[k],m=o.m;if(!m)continue;const age=S.time-o.born;if(age<.7&&o.t!=='current')m.scale.setScalar(o.base*ease(clamp(age/.7,.001,1)));
  switch(o.t){
   case'rock':if(o.pulse>0){o.pulse=Math.max(0,o.pulse-dt*3);m.scale.setScalar(o.base*(1+o.pulse*.22))}m.rotation.y+=o.spin*dyn;if(o.vx||o.vy){o.x+=o.vx*dyn;o.y+=o.vy*dyn;if(Math.abs(o.x)>13)o.vx*=-1;if(Math.abs(o.y)>7.5)o.vy*=-1;m.position.x=o.x;m.position.y=o.y}break;
   case'debris':m.rotation.x+=o.spin*dyn;m.rotation.z+=o.spin*dyn*.7;break;
   case'cell':m.rotation.y+=dt*2.2;m.position.y=o.y+Math.sin(S.time*2+o.d)*.25;break;
   case'heal':m.rotation.y+=dt*1.5;break;
   case'cloud':{const mt=m.material;mt.rotation=(o.d%7)*.3;const dd=Math.hypot(o.d-S.dist,o.x-camera.position.x,o.y-camera.position.y);const k=clamp((dd-o.sz*.35)/(o.sz*.7),0,1);mt.opacity=(o.add?.16:.3)*k*k;break}
   case'lamp':m.userData.l.scale.setScalar(.7+.5*Math.sin(S.time*5+o.d*.1)+.3);break;
   case'current':case'surge':{const a=m.userData.pts.geometry.attributes.position;const zs=o.t==='surge'?190:55;for(let i=0;i<a.count;i++){let px=a.getX(i)+o.fx*dyn*2.2,py=a.getY(i)+o.fy*dyn*2.2,pz=a.getZ(i)+dyn*zs;if(px>o.w/2)px-=o.w;if(px<-o.w/2)px+=o.w;if(py>o.h/2)py-=o.h;if(py<-o.h/2)py+=o.h;if(pz>o.len/2)pz-=o.len;a.setXYZ(i,px,py,pz)}a.needsUpdate=true;break}
   case'strike':{const u=m.userData,dd=o.d-S.dist;const prox=clamp(1-(dd-16)/130,0,1);
    if(o.fired&&o.fireT!=null){o.fireT+=dyn;const f=o.fireT;const on=f<.45;u.bolt.material.opacity=u.bolt2.material.opacity=on?1:0;
     if(on){const n=14;for(let i=0;i<n;i++){const t=i/(n-1);u.pts[i*3]=(Math.random()-.5)*(i===0||i===n-1?0:3.4);u.pts[i*3+1]=(t-.5)*90;u.pts[i*3+2]=(Math.random()-.5)*2}u.geo.attributes.position.needsUpdate=true}
     u.ring.material.opacity=Math.max(0,.9-f*2.2);u.core.material.opacity=Math.max(0,1-f*2);}
    else{u.ring.material.opacity=(dd<150&&dd>-4)?(.15+.65*prox)*(.7+.3*Math.sin(S.time*(8+prox*14))):0;u.ring.scale.setScalar(1+.12*Math.sin(S.time*6));u.core.material.opacity=.15+.6*prox;u.bolt.material.opacity=u.bolt2.material.opacity=0}
    break}
  }}
 if(station.visible){station.position.set(0,-4,-(STOPS[9]+420));station.rotation.set(-.34,0,0);station.scale.setScalar(1.15);station.userData.body.rotation.y+=dt*.01;
  station.userData.blink.forEach((l,i)=>{const on=S.endGlow>0?1:(Math.sin(S.time*4+i*1.7)>-.2?1:.3);l.scale.setScalar(on)});
  station.userData.drones.forEach(d=>{const u=d.userData;u.a+=dt*u.sp;d.position.set(Math.cos(u.a)*u.r,u.y,Math.sin(u.a)*u.r);d.rotation.y=-u.a+Math.PI}) }
 const tg=$('target');if(S.mode==='play'&&S.gi<10){const st=L.gates[S.gi];const dd=Math.max(0,st.d-S.dist);tg.textContent=`🧠 وحدة المعرفة ${toAr(S.gi+1)} · ${toAr(Math.round(dd))} م`;tg.classList.add('show')}else if(S.mode!=='play')tg.classList.remove('show');
 const wr=$('warns');let k=0;
 if(S.mode==='play'){for(const o of mets){if(!o.spawned&&S.dist>=o.trig-100&&S.dist<o.trig+4){tmpP.set(o.x+o.vx*3.5,o.y+o.vy*3.5,-(S.dist+100)).project(camera);
   const x=clamp((tmpP.x*.5+.5)*innerWidth,30,innerWidth-30),y=clamp((-tmpP.y*.5+.5)*innerHeight,90,innerHeight-90);let e=wr.children[k];if(!e){e=document.createElement('div');e.className='w';e.textContent='!';wr.append(e)}e.style.display='flex';e.style.left=x+'px';e.style.top=y+'px';k++}}}
 for(;k<wr.children.length;k++)wr.children[k].style.display='none';
 // أشرطة الدفع
 $('bsbar').firstElementChild.style.width=(S.bst*100)+'%';
 const f=gfx.fin.uniforms;f.uTime.value=S.time;f.uAberr.value=.0012+S.warp*.012+S.damage*.004+S.boost*.004;f.uBlur.value=S.boost*.05+S.warp*.07;f.uFlash.value=clamp(S.flash,0,1);f.uFlashCol.value.copy(S.flashCol);
 S.damage=Math.max(0,S.damage-dt*1.4);f.uDamage.value=S.damage*.7+(S.shield===1&&S.mode==='play'?.1+.06*Math.sin(S.time*6):0);
 gfx.bloom.strength=envNow.bloom+S.warp*.6+S.flash*.5+S.boost*.15;
 if(S.mode==='play'||S.mode==='question'){S.hintT+=dt;if(S.hintT>.05){S.hintT=0;drawRadar()}}
}

/* ================= الخطوة الرئيسية ================= */
export function step(dt){
 S.dt=dt;S.time+=dt;
 if(S.envT<1){S.envT=Math.min(1,S.envT+dt/S.envDur);lerpEnv(S.envFrom,S.envTo,ease(S.envT))}
 R.rockMat.forEach(m=>m.color.copy(envNow.rock));
 S.shake=Math.max(0,S.shake-dt);if(S.mode!=='cine'||!S.cine||S.cine.type!=='stage')S.flash=Math.max(0,S.flash-dt*(S.mode==='cine'?1.2:2.2));
 switch(S.mode){
  case'play':playStep(dt);break;
  case'cine':cineStep(dt);if(S.mode==='cine'&&S.cine&&S.cine.type!=='landing')steer(dt);break;
  case'question':S.speed+=(CRUISE-S.speed)*Math.min(1,dt*1.6);S.dist+=S.speed*dt;steer(dt);advanceStream();updateOrbs(dt);break;
  case'crash':S.crashT+=dt;if(S.crashT>2.6)respawn();break;
  case'menu':S.speed=0;break;
 }
 updateBackdrops(dt);updateStreamers(dt);updateShip(dt);updateParticles(dt);updateCamera(dt);gfx.sky.position.copy(camera.position);updateFx(dt);applyEnv();
 Snd.engine(clamp(S.speed/BASE,0,1.8),S.warp+S.boost);
}
let last=0;
function frame(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;if(!paused){step(dt);adaptQuality(dt)}gfx.composer.render();requestAnimationFrame(frame)}
window.__g={setEnv:i=>setStageEnv(i,0),S,step,get L(){return L},gfx,Q,QUESTIONS,beginRun,startGame,hitShip,respawn,showEnd,showCert,get world(){return world},get activeMets(){return activeMets},Planets,backdrops,station:()=>station,keys};
requestAnimationFrame(()=>setTimeout(boot,40));
