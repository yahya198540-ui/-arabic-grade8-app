import * as THREE from 'three';
import {R,makeCell,makeRock} from './objects.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const rnd=(a,b)=>a+Math.random()*(b-a);
let ctx,bolts=[],frags=[],pickups=[],shots=[],enemies=[],rings=[],T=[];
let boltGeo,boltMat,fireCD=0,alt=1,shotGeo,shotMat;
const segD2=(p0,p1,c)=>{const dx=p1.x-p0.x,dy=p1.y-p0.y,dz=p1.z-p0.z,l=dx*dx+dy*dy+dz*dz||1;let t=((c.x-p0.x)*dx+(c.y-p0.y)*dy+(c.z-p0.z)*dz)/l;t=Math.max(0,Math.min(1,t));const x=p0.x+dx*t-c.x,y=p0.y+dy*t-c.y,z=p0.z+dz*t-c.z;return x*x+y*y+z*z};
const P0=new THREE.Vector3(),P1=new THREE.Vector3(),C=new THREE.Vector3();

export const Combat={
 init(c){ctx=c;boltGeo=new THREE.CapsuleGeometry(.14,1.8,4,8);boltGeo.rotateX(Math.PI/2);boltMat=new THREE.MeshBasicMaterial({color:new THREE.Color(.6,1.9,2.8)});
  shotGeo=new THREE.SphereGeometry(1,16,12);shotMat=new THREE.MeshBasicMaterial({color:new THREE.Color(2.4,.9,.25)})},
 reset(){for(const a of[bolts,frags,pickups,shots,enemies,rings])for(const o of a)ctx.world.remove(o.m);bolts.length=frags.length=pickups.length=shots.length=enemies.length=rings.length=0;fireCD=0;ctx.hud.boss(null)},
 bossAlive(){return enemies.some(e=>e.kind==='boss'&&!e.dead&&!e.leaving)},
 anyEnemy(){return enemies.some(e=>!e.dead&&!e.leaving)},
 /* ===== التصويب ===== */
 buildTargets(){
  T.length=0;const [lo,hi,arr]=ctx.stream();
  for(let i=lo;i<hi;i++){const o=arr[i];if(!o.m||o.got||o.decor||o.t!=='rock')continue;T.push({k:'rock',o,x:o.x,y:o.y,z:-o.d,r:o.r*.85+.6})}
  for(const f of frags)T.push({k:'frag',f,x:f.m.position.x,y:f.m.position.y,z:f.m.position.z,r:f.r+.6});
  for(const a of ctx.mets())T.push({k:'met',a,x:a.m.position.x,y:a.m.position.y,z:a.m.position.z,r:a.o.r+1});
  for(const e of enemies)if(!e.dead&&!e.leaving)T.push({k:'enemy',e,x:e.m.position.x,y:e.m.position.y,z:e.m.position.z,r:e.r+.8});
  for(const s of shots)T.push({k:'shot',s,x:s.m.position.x,y:s.m.position.y,z:s.m.position.z,r:s.r+.7});
 },
 pickTarget(x,y,z){let best=null,bd=1e9;for(const t of T){const dz=z-t.z;if(dz<8||dz>190)continue;const lat=Math.hypot(t.x-x,t.y-y);if(lat>11)continue;const sc=dz+lat*3;if(sc<bd){bd=sc;best=t}}return best},
 fire(){
  const S=ctx.S;if(fireCD>0||S.mode!=='play')return;fireCD=.15;alt=-alt;
  const sx=S.x+alt*.8,sy=S.y-.05,sz=-S.dist-4.2,vz=-250;let vx=S.vx*.15,vy=S.vy*.15;
  const t=this.pickTarget(sx,sy,sz);if(t){const tm=Math.max(.05,(sz-t.z)/-vz);vx=Math.max(-70,Math.min(70,(t.x-sx)/tm));vy=Math.max(-70,Math.min(70,(t.y-sy)/tm))}
  const m=new THREE.Mesh(boltGeo,boltMat);m.position.set(sx,sy,sz);ctx.world.add(m);bolts.push({m,vx,vy,vz,life:1.2,p:new THREE.Vector3(sx,sy,sz)});
  ctx.muzzle();ctx.Snd.sfx('shoot');S.recoil=.5;
 },
 /* ===== تأثيرات ===== */
 explosion(pos,r,col){
  ctx.burst(pos,Math.round(26+r*8),col||0xffa04d,14+r*1.5,.9);ctx.burst(pos,16,0xffffff,10,.5);ctx.burst(pos,12,0x66d8ff,18,.6);
  const s=new THREE.Sprite(R.glowMat(0xffc070));s.position.copy(pos);s.scale.setScalar(2);ctx.world.add(s);rings.push({m:s,t:0,max:r*7+8,dur:.55});
  ctx.Snd.sfx('boom');ctx.S.shake=Math.max(ctx.S.shake,.12+r*.025);
 },
 drop(pos,n){for(let i=0;i<n;i++){const m=makeCell();m.scale.setScalar(.75);m.position.copy(pos);ctx.world.add(m);const a=Math.random()*6.283,b=rnd(-.6,.6),s=rnd(8,18);pickups.push({m,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.7+b*4,vz:rnd(-6,10),age:0})}},
 killRock(o){
  const pos=new THREE.Vector3(o.x,o.y,-o.d);ctx.despawn(o);o.got=true;this.explosion(pos,o.r,o.shard?0xb070ff:0xffa04d);this.drop(pos,2+Math.floor(o.r*.7));
  if(o.r>=5&&!o.shard)for(let i=0;i<2;i++)this.frag(pos,o.r*.5,i?1:-1);
  ctx.addPoints(20+Math.round(o.r*4),pos,'💥');ctx.S.kills++;
 },
 frag(pos,r,side){const m=makeRock(Math.floor(Math.random()*6),r,Math.random()*3);m.position.copy(pos);ctx.world.add(m);frags.push({m,r,vx:side*rnd(5,10),vy:rnd(-4,4),vz:rnd(4,12),spin:rnd(-2,2),age:0})},
 killMeteor(a){const pos=a.m.position.clone();ctx.killMeteor(a);this.explosion(pos,2.4,0xff8a3a);this.drop(pos,4);ctx.addPoints(40,pos,'☄️');ctx.S.kills++},
 hitRock(o){o.hp=(o.hp??Math.max(1,Math.round(o.r/2.5)))-1;ctx.Snd.sfx('tick');if(o.hp<=0)this.killRock(o);else{o.pulse=.8;ctx.burst(new THREE.Vector3(o.x,o.y,-o.d+o.r),8,0xffe0a0,8,.4)}},
 /* ===== أعداء ===== */
 spawnShot(from,to,speed,big){
  const m=new THREE.Group();const c=new THREE.Mesh(shotGeo,shotMat);c.scale.setScalar(big?2.1:1.05);m.add(c);const g=new THREE.Sprite(R.glowMat(0xff8a30));g.scale.setScalar(big?9:5);m.add(g);m.position.copy(from);
  const d=to.clone().sub(from).normalize().multiplyScalar(speed);ctx.world.add(m);shots.push({m,vx:d.x,vy:d.y,vz:d.z,r:big?2.1:1.05,hp:big?2:1,life:9});ctx.Snd.sfx('warn');
 },
 startBoss(){
  if(this.bossAlive())return;const g=new THREE.Group();
  const mat=R.rockMat[1].clone();mat.emissive=new THREE.Color(0xff3a10);mat.emissiveIntensity=.35;
  const body=new THREE.Mesh(R.rockGeo[0],mat);body.scale.setScalar(19);g.add(body);
  const eyes=[];for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(2.5,20,14),new THREE.MeshBasicMaterial({color:new THREE.Color(3,1,.2)}));e.position.set(s*7,4.6,15.5);g.add(e);eyes.push(e);const sp=new THREE.Sprite(R.glowMat(0xff8030));sp.scale.setScalar(10);sp.position.copy(e.position);g.add(sp)}
  for(let i=0;i<3;i++){const c=new THREE.Mesh(R.crystalGeo,R.shardMat);c.scale.setScalar(5);c.position.set((i-1)*7.5,17,3);c.rotation.z=(i-1)*.4;g.add(c)}
  const aura=new THREE.Sprite(R.glowMat(0xff5a20));aura.scale.setScalar(76);g.add(aura);
  g.position.set(0,0,-(ctx.S.dist+420));ctx.world.add(g);
  enemies.push({kind:'boss',m:g,body,eyes,hp:42,max:42,r:19,cd:3,t:0,tele:0,flash:0,dead:false,leaving:false});ctx.hud.boss(1);ctx.hint('⚠️ العملاق الصخري! أطلق النار على جسمه وتفادَ قذائفه',6000);ctx.Snd.sfx('warn');
 },
 startDrones(ev){
  for(let i=0;i<3;i++){const g=new THREE.Group();const add=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
   add(new RoundedBoxGeometry(2.6,1.2,4.2,3,.3),R.pearl);add(new RoundedBoxGeometry(7.4,.22,1.8,2,.08),R.orange,0,0,.4);add(new RoundedBoxGeometry(1.2,.8,1.4,2,.2),R.dark,0,.7,-.4);
   const eye=add(new THREE.SphereGeometry(.55,14,10),new THREE.MeshBasicMaterial({color:new THREE.Color(3,.3,.3)}),0,.1,2.2);const gl=new THREE.Sprite(R.glowMat(0xff3030));gl.scale.setScalar(6);gl.position.set(0,.1,2.3);g.add(gl);
   const th=new THREE.Sprite(R.glowMat(0x4db8ff));th.scale.setScalar(4);th.position.z=-2.4;g.add(th);
   g.position.set(0,0,-(ctx.S.dist+300));ctx.world.add(g);enemies.push({kind:'drone',m:g,eye,gl,idx:i,hp:3,max:3,r:3,cd:1.6+i*.9,t:rnd(0,6),tele:0,flash:0,dead:false,leaving:false,end:ev.end})}
  ctx.hint('🎯 دفاعات المحطة! أسقط الطائرات المسيّرة قبل أن تصيبك',5500);ctx.Snd.sfx('warn');
 },
 clearEnemies(){for(const e of enemies){if(!e.dead)e.leaving=true}for(const s of shots)ctx.world.remove(s.m);shots.length=0;ctx.hud.boss(null)},
 damageEnemy(e,n=1){
  e.hp-=n;e.flash=.2;ctx.Snd.sfx('bosshit');ctx.burst(e.m.position.clone().add(new THREE.Vector3(rnd(-3,3),rnd(-2,3),e.kind==='boss'?9:1)),10,0xffd090,10,.5);
  if(e.kind==='boss')ctx.hud.boss(Math.max(0,e.hp/e.max));
  if(e.hp<=0&&!e.dead){e.dead=true;const pos=e.m.position.clone();
   if(e.kind==='boss'){for(let i=0;i<5;i++)setTimeout(()=>{this.explosion(pos.clone().add(new THREE.Vector3(rnd(-8,8),rnd(-6,6),rnd(-4,8))),9,0xffa040)},i*180);this.drop(pos,34);ctx.addPoints(600,pos,'🏆');ctx.hint('🏆 هزمتَ العملاق الصخري!',4500);ctx.hud.boss(null);ctx.S.flash=Math.max(ctx.S.flash,.35);ctx.S.flashCol.setRGB(1,.9,.7)}
   else{this.explosion(pos,3.4,0xff7040);this.drop(pos,6);ctx.addPoints(120,pos,'🎯')}
   ctx.S.kills++;}
 },
 /* ===== التحديث ===== */
 update(dt){
  const S=ctx.S;fireCD-=dt;this.buildTargets();if(S.firing)this.fire();
  // الإطلاقات
  for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];P0.copy(b.p);b.life-=dt;b.p.x+=b.vx*dt;b.p.y+=b.vy*dt;b.p.z+=b.vz*dt;b.m.position.copy(b.p);b.m.lookAt(b.p.x+b.vx,b.p.y+b.vy,b.p.z+b.vz);P1.copy(b.p);
   let hit=false;for(const t of T){C.set(t.x,t.y,t.z);if(segD2(P0,P1,C)<t.r*t.r){hit=true;
     if(t.k==='rock'){if(!t.o.got)this.hitRock(t.o)}else if(t.k==='frag'){this.killFrag(t.f)}else if(t.k==='met'){this.killMeteor(t.a)}else if(t.k==='enemy'){this.damageEnemy(t.e)}else if(t.k==='shot'){t.s.hp--;if(t.s.hp<=0){this.removeShot(t.s);ctx.burst(C.clone(),10,0xffa040,10,.4)}}
     break}}
   if(hit||b.life<=0){ctx.world.remove(b.m);bolts.splice(i,1)}}
  // الأعداء
  for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];e.t+=dt;if(e.flash>0)e.flash-=dt;
   if(e.dead){e.m.scale.multiplyScalar(1-dt*4);if(e.m.scale.x<.05){ctx.world.remove(e.m);enemies.splice(i,1)}continue}
   const sz=-S.dist;
   if(e.kind==='boss'){
    const appr=Math.min(1,e.t/3);const dz=420-(420-140)*(1-Math.pow(1-appr,3));
    if(e.leaving){e.m.position.z-=70*dt;e.m.position.y+=14*dt;if(e.m.position.z<sz-520){ctx.world.remove(e.m);enemies.splice(i,1)}continue}
    e.m.position.set(7.5*Math.sin(e.t*.55),1+2.6*Math.sin(e.t*.4),sz-dz);e.body.rotation.y=Math.sin(e.t*.3)*.2;
    e.m.scale.setScalar(1+(e.flash>0?.04:0));e.eyes.forEach(m=>m.scale.setScalar(1+(e.tele>0?.5+.3*Math.sin(e.t*40):0)));
    if(appr>=1){e.cd-=dt;if(e.cd<.7&&e.tele<=0&&e.cd>0){e.tele=.7;ctx.Snd.sfx('warn')}if(e.tele>0)e.tele-=dt;
     if(e.cd<=0){const f=e.hp/e.max;const from=e.m.position.clone().add(new THREE.Vector3(0,2,10));const tg=new THREE.Vector3(S.x+S.vx*.35,S.y+S.vy*.35,sz);
      this.spawnShot(from,tg,78,false);if(f<.55){for(const sp of[-9,9])this.spawnShot(from,tg.clone().add(new THREE.Vector3(sp,0,0)),78,false)}
      if(f<.28)this.spawnShot(from,tg.clone().add(new THREE.Vector3(0,3,0)),52,true);
      e.cd=f>.55?2.3:f>.28?1.9:1.5;e.tele=0}}
   }else{ // مسيّرة
    if(e.leaving||S.dist>e.end){e.m.position.z-=60*dt;e.m.position.y+=10*dt;if(e.m.position.z<sz-400){ctx.world.remove(e.m);enemies.splice(i,1)}continue}
    const ap=Math.min(1,e.t/2.4),dz=300-(300-(95+e.idx*10))*(1-Math.pow(1-ap,3));
    e.m.position.set(7.8*Math.sin(e.t*.8+e.idx*2.1),3.2*Math.sin(e.t*.65+e.idx*1.7)+.4,sz-dz);e.m.lookAt(S.x,S.y,sz);e.m.rotation.z=Math.sin(e.t*.8+e.idx*2.1)*.5;
    e.gl.scale.setScalar(6+(e.tele>0?4:0)+e.flash*20);
    if(ap>=1){e.cd-=dt;if(e.cd<.55&&e.tele<=0&&e.cd>0){e.tele=.55;ctx.Snd.sfx('warn')}if(e.tele>0)e.tele-=dt;
     if(e.cd<=0){this.spawnShot(e.m.position.clone(),new THREE.Vector3(S.x+S.vx*.3,S.y+S.vy*.3,sz),56,false);e.cd=2.7+Math.random()*.6;e.tele=0}}
   }
  }
  // انتهاء موجة المسيّرات
  const dr=enemies.filter(e=>e.kind==='drone');if(ctx.droneWave&&dr.length===0&&ctx.droneWave.started){if(!ctx.droneWave.done){ctx.droneWave.done=true;ctx.hint('✅ أُخمدت دفاعات المحطة! طريق الهبوط مفتوح',4000);ctx.addPoints(200,new THREE.Vector3(S.x,S.y,-S.dist-10),'🛡️')}}
  // قذائف الأعداء
  for(let i=shots.length-1;i>=0;i--){const s=shots[i];s.life-=dt;s.m.position.x+=s.vx*dt;s.m.position.y+=s.vy*dt;s.m.position.z+=s.vz*dt;
   const p=s.m.position;if(ctx.hitSphere(p.x,p.y,p.z,s.r)){ctx.hitShip(p.x,p.y,p.z);this.removeShot(s,true);continue}
   if(s.life<=0||p.z>-S.dist+30)this.removeShot(s)}
  // شظايا
  for(let i=frags.length-1;i>=0;i--){const f=frags[i];f.age+=dt;const p=f.m.position;p.x+=f.vx*dt;p.y+=f.vy*dt;p.z+=f.vz*dt;f.m.rotation.x+=f.spin*dt;f.m.rotation.y+=f.spin*.7*dt;
   if(ctx.hitSphere(p.x,p.y,p.z,f.r*.8)){ctx.hitShip(p.x,p.y,p.z);this.killFrag(f);continue}
   if(p.z>-S.dist+25||Math.abs(p.x)>40){ctx.world.remove(f.m);frags.splice(i,1)}}
  // بلورات متساقطة (تنجذب للمركبة)
  for(let i=pickups.length-1;i>=0;i--){const k=pickups[i];k.age+=dt;const p=k.m.position;p.x+=k.vx*dt;p.y+=k.vy*dt;p.z+=k.vz*dt;k.vx*=1-dt*1.6;k.vy*=1-dt*1.6;k.vz*=1-dt*1.6;k.m.rotation.y+=dt*4;
   const dx=S.x-p.x,dy=S.y-p.y,dz=-S.dist-p.z,d=Math.hypot(dx,dy,dz)||1;
   if(k.age>.45&&d<42){const a=(70+(42-d)*5)*dt;k.vx+=dx/d*a*8;k.vy+=dy/d*a*8;k.vz+=dz/d*a*8}
   if(d<2.4||k.age>14||p.z>-S.dist+40){if(d<2.4)ctx.collectCrystal(p.clone());ctx.world.remove(k.m);pickups.splice(i,1)}}
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.t+=dt;const u=r.t/r.dur;r.m.scale.setScalar(2+r.max*u);r.m.material.opacity=Math.max(0,1-u);if(u>=1){ctx.world.remove(r.m);rings.splice(i,1)}}
 },
 killFrag(f){const i=frags.indexOf(f);if(i<0)return;const pos=f.m.position.clone();ctx.world.remove(f.m);frags.splice(i,1);this.explosion(pos,f.r,0xffa04d);this.drop(pos,2);ctx.addPoints(15,pos,'')},
 removeShot(s,hitShip){const i=shots.indexOf(s);if(i<0)return;if(hitShip)ctx.burst(s.m.position.clone(),20,0xff8a30,14,.5);ctx.world.remove(s.m);shots.splice(i,1)}
};
