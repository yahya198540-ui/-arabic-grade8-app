import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {rockGeometry,rockTexture,panelTexture,glowTexture,cloudTexture,windowTexture,padTexture} from './textures.js';
import {flameMaterial,shieldMaterial} from './shaders.js';

export const R={};
const phys=o=>new THREE.MeshPhysicalMaterial(o);
const RB=(w,h,d,r=.08,s=3)=>new RoundedBoxGeometry(w,h,d,s,r);

export function initResources(){
 R.glow=glowTexture();R.panel=panelTexture([240,244,250],512);
 R.rockTex=[rockTexture(4,[172,138,108]),rockTexture(11,[150,120,98]),rockTexture(23,[184,150,118])];
 R.rockGeo=[1,2,3,4,5,6].map(s=>rockGeometry(s*7));
 R.rockMat=R.rockTex.map(t=>{const m=new THREE.MeshStandardMaterial({map:t,bumpMap:t,bumpScale:9,roughness:.92,metalness:.04,envMapIntensity:.55});m.userData.base=new THREE.Color(1,1,1);return m});
 R.pearl=phys({color:0xc4ccda,metalness:.3,roughness:.34,clearcoat:.8,clearcoatRoughness:.1,envMapIntensity:1.05,map:R.panel});
 R.orange=phys({color:0xf06a10,metalness:.35,roughness:.32,clearcoat:.9,clearcoatRoughness:.08,envMapIntensity:1.1});
 R.dark=phys({color:0x262e44,metalness:.8,roughness:.34,envMapIntensity:1.3});
 R.metal=phys({color:0xaab4c8,metalness:.9,roughness:.3,envMapIntensity:1.5});
 R.glass=phys({color:0x0b1a38,metalness:.1,roughness:.04,clearcoat:1,clearcoatRoughness:.02,envMapIntensity:3.2,transparent:true,opacity:.93});
 R.blueGlow=new THREE.MeshBasicMaterial({color:new THREE.Color(.35,.85,1.6)});
 R.orangeGlow=new THREE.MeshBasicMaterial({color:new THREE.Color(1.8,.8,.2)});
 R.crystalMat=phys({color:0x39d8ff,metalness:.1,roughness:.12,clearcoat:1,emissive:0x12b8ff,emissiveIntensity:1.8,transparent:true,opacity:.92,flatShading:true,envMapIntensity:2.5});
 R.healMat=phys({color:0x44ff9a,metalness:.1,roughness:.1,clearcoat:1,emissive:0x16d070,emissiveIntensity:1.6,transparent:true,opacity:.9});
 R.shardMat=phys({color:0xb35cff,metalness:.1,roughness:.12,clearcoat:1,emissive:0x7a22ff,emissiveIntensity:1.5,transparent:true,opacity:.9,flatShading:true,envMapIntensity:2.5});
 R.solarMat=phys({color:0x2457d6,metalness:.8,roughness:.25,clearcoat:.8,emissive:0x0a2a80,emissiveIntensity:.5,side:THREE.DoubleSide,envMapIntensity:1.6});
 R.mint=phys({color:0x39e0b0,metalness:.3,roughness:.25,clearcoat:1});
 R.glowMat=c=>new THREE.SpriteMaterial({map:R.glow,color:c,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
 R.crystalGeo=new THREE.OctahedronGeometry(1,0);R.crystalGeo.scale(.58,1.4,.58);
 R.cloudTex=[1,2,3,4].map(s=>cloudTexture(s*1.7));
 R.cloudCols=[0x7a3cff,0x2fe0e8,0xc04bff,0x3a7bff];
 R.lampGeo=new THREE.CylinderGeometry(.18,.3,3,10);
}

/* ========== المركبة (نموذج موحّد): أبيض/برتقالي/معدن داكن، محركان أزرقان ========== */
export function makeShip(){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const add=(geo,mat,x=0,y=0,z=0,parent=body)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m};
 // جسم
 const fus=add(new THREE.CapsuleGeometry(.78,3.3,12,40),R.pearl);fus.rotation.x=Math.PI/2;fus.scale.set(1.15,1,.8);fus.position.set(0,0,.1);
 const nose=add(new THREE.ConeGeometry(.55,1.5,32),R.dark,0,-.02,-2.55);nose.rotation.x=-Math.PI/2;
 add(new THREE.SphereGeometry(.2,16,12),R.orange,0,-.02,-3.3);
 add(RB(1.25,.12,2.4,.05),R.orange,0,.64,.5);add(RB(.9,.1,1.2,.04),R.orange,0,.6,-1.4);
 for(const s of[-1,1]){add(RB(.1,.12,2.6,.03),R.blueGlow,s*.9,.05,-.2);add(RB(.5,.3,.9,.08),R.dark,s*.55,.5,-.6)}
 // قمرة
 const can=new THREE.Mesh(new THREE.SphereGeometry(.62,36,24,0,Math.PI*2,0,Math.PI/2),R.glass);can.scale.set(1,.85,1.55);can.position.set(0,.6,-.95);body.add(can);
 const fr=add(new THREE.TorusGeometry(.64,.07,12,40),R.orange,0,.62,-.95);fr.rotation.x=Math.PI/2;fr.scale.set(1,1.55,1);
 const pil=add(new THREE.SphereGeometry(.28,18,14),new THREE.MeshStandardMaterial({color:0xffcf9f,roughness:.6}),0,.92,-.9);
 add(new THREE.SphereGeometry(.31,18,14),R.pearl,0,.97,-.78).scale.set(1,.85,1);
 // أجنحة (مائلة للخلف)
 const sh=new THREE.Shape();sh.moveTo(.7,-.7);sh.lineTo(3.9,1.35);sh.lineTo(3.95,2.15);sh.lineTo(1.1,1.6);sh.lineTo(.7,.9);sh.closePath();
 const wg=new THREE.ExtrudeGeometry(sh,{depth:.12,bevelEnabled:true,bevelSize:.08,bevelThickness:.06,bevelSegments:3});wg.rotateX(Math.PI/2);
 const op=new THREE.Shape();op.moveTo(1.2,-.35);op.lineTo(3.55,1.2);op.lineTo(3.6,1.55);op.lineTo(1.5,1.1);op.closePath();
 const og=new THREE.ExtrudeGeometry(op,{depth:.05,bevelEnabled:true,bevelSize:.04,bevelThickness:.03,bevelSegments:2});og.rotateX(Math.PI/2);
 for(const s of[1,-1]){const w=new THREE.Mesh(wg,R.pearl);w.scale.x=s;w.position.set(0,-.18,0);w.rotation.z=s*-.05;body.add(w);
  const o=new THREE.Mesh(og,R.orange);o.scale.x=s;o.position.set(0,-.1,0);body.add(o);
  add(RB(.55,.34,1.5,.1),R.dark,s*3.85,-.12,1.75);add(RB(.1,.1,1.3,.03),R.blueGlow,s*3.85,-.12,1.75).position.y=-.12;
  const tl=new THREE.Sprite(R.glowMat(0x66d8ff));tl.scale.setScalar(1.2);tl.position.set(s*3.85,-.12,2.55);body.add(tl);
  add(RB(.08,.9,1.2,.03),R.orange,s*1.9,.28,2.1).rotation.z=s*.35;} // زعنفة
 // المحركان التوأم
 const cones=[],sprites=[];const fm=flameMaterial();
 for(const s of[-1,1]){const x=s*1.35,y=-.12,z=1.65,eg=new THREE.Group();eg.position.set(x,y,z);body.add(eg);
  const nac=new THREE.Mesh(new THREE.CylinderGeometry(.66,.6,2.8,40),R.pearl);nac.rotation.x=Math.PI/2;eg.add(nac);
  const intake=add(new THREE.TorusGeometry(.64,.1,12,36),R.dark,0,0,-1.38,eg);
  const band=add(new THREE.TorusGeometry(.64,.09,12,36),R.orange,0,0,.35,eg);
  const nz=new THREE.Mesh(new THREE.CylinderGeometry(.62,.5,.55,36),R.dark);nz.rotation.x=Math.PI/2;nz.position.z=1.55;eg.add(nz);
  const core=new THREE.Mesh(new THREE.CircleGeometry(.46,32),R.blueGlow);core.position.z=1.84;core.rotation.y=Math.PI;eg.add(core);
  for(const[rad,len,k]of[[.5,1,2.6],[.3,.8,1.8]]){const cg=new THREE.ConeGeometry(rad,1,28,1,true);cg.rotateX(Math.PI/2);cg.translate(0,0,.5);const c=new THREE.Mesh(cg,fm);c.position.z=1.86;c.userData.k=k;eg.add(c);cones.push(c)}
  const gs=new THREE.Sprite(R.glowMat(0x4db8ff));gs.scale.setScalar(1.8);gs.position.z=2.2;eg.add(gs);sprites.push(gs);}
 const light=new THREE.PointLight(0x4db8ff,18,18,2);light.position.set(0,0,3.8);body.add(light);
 const sm=shieldMaterial();const shield=new THREE.Mesh(new THREE.SphereGeometry(3.7,40,24),sm);shield.scale.set(1.15,.7,1.3);shield.position.z=.4;body.add(shield);
 g.userData={body,cones,sprites,fm,sm,light};g.scale.setScalar(1.1);return g}

/* ========== أجسام العالم ========== */
export function makeRock(variant,r,seed=0,shard=false){
 if(shard){const g=new THREE.Group();for(let i=0;i<4;i++){const m=new THREE.Mesh(R.crystalGeo,R.shardMat);m.scale.set(1,1,1).multiplyScalar(r*(.5+Math.random()*.5));m.rotation.set((Math.random()-.5)*1.1,Math.random()*3,(Math.random()-.5)*1.1);m.position.set((Math.random()-.5)*r*.9,(Math.random()-.5)*r*.7,(Math.random()-.5)*r*.9);g.add(m)}
  const s=new THREE.Sprite(R.glowMat(0xa050ff));s.scale.setScalar(r*5.5);g.add(s);g.userData.shard=true;return g}
 const m=new THREE.Mesh(R.rockGeo[variant%6],R.rockMat[(variant+Math.floor(seed))%3]);m.scale.setScalar(r);m.rotation.set(seed*1.7,seed*2.3,seed*.9);return m}
export function makeMeteor(r){
 const g=new THREE.Group();const rock=new THREE.Mesh(R.rockGeo[2],new THREE.MeshStandardMaterial({map:R.rockTex[1],color:0xffb080,emissive:0xff4a10,emissiveIntensity:1.5,roughness:.7}));rock.scale.setScalar(r);g.add(rock);
 const fm=flameMaterial();fm.uniforms.uPow.value=.5;
 const mkc=(rad,len)=>{const tg=new THREE.ConeGeometry(rad,len,20,1,true);tg.rotateX(-Math.PI/2);tg.translate(0,0,-len/2);const m=new THREE.Mesh(tg,fm);g.add(m);return m};
 const tail=mkc(r*1.3,r*9);mkc(r*.8,r*6);const gl=new THREE.Sprite(R.glowMat(0xff8a40));gl.scale.setScalar(r*5);g.add(gl);g.userData={rock,tail,fm};return g}
export function makeCell(){const g=new THREE.Group();const m=new THREE.Mesh(R.crystalGeo,R.crystalMat);m.scale.setScalar(1.05);g.add(m);const s=new THREE.Sprite(R.glowMat(0x4dc8ff));s.scale.setScalar(4.6);g.add(s);g.userData={m};return g}
export function makeHeal(){const g=new THREE.Group();const o=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),R.healMat);o.scale.setScalar(1.1);g.add(o);
 const a=new THREE.Mesh(RB(1.5,.42,.42,.1),R.pearl),b=new THREE.Mesh(RB(.42,1.5,.42,.1),R.pearl);g.add(a,b);const s=new THREE.Sprite(R.glowMat(0x44ff9a));s.scale.setScalar(4.6);g.add(s);return g}
export function makeDebris(kind,r,seed){
 const g=new THREE.Group();const add=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
 if(kind===0){add(RB(r*2.6,r*.14,r*1.5,.04),R.solarMat);add(new THREE.CylinderGeometry(r*.08,r*.08,r*1.8,10),R.metal,-r*1.5,0,0).rotation.z=Math.PI/2}
 else if(kind===1){add(RB(r*1.4,r*1.2,r*1.4,.12),R.metal);add(new THREE.CylinderGeometry(r*.35,r*.35,r*1.5,20),R.pearl,r*.4,r*.3,0);add(RB(r*1.5,r*.2,r*.3,.04),R.orange,0,0,r*.7)}
 else{add(new THREE.CylinderGeometry(r*.6,r*.6,r*1.6,28,1,true),R.metal).material=R.metal.clone();g.children[0].material.side=THREE.DoubleSide;add(new THREE.TorusGeometry(r*.6,r*.06,10,28),R.orange,0,r*.8,0).rotation.x=Math.PI/2}
 g.rotation.set(seed,seed*2,seed*3);return g}
export function makeCloud(idx,add){const m=new THREE.SpriteMaterial({map:R.cloudTex[idx%4],color:R.cloudCols[idx%4],transparent:true,depthWrite:false,blending:add?THREE.AdditiveBlending:THREE.NormalBlending,opacity:add?.16:.3,fog:false});return new THREE.Sprite(m)}
export function makeLamp(){const g=new THREE.Group();g.add(new THREE.Mesh(R.lampGeo,R.dark));const l=new THREE.Mesh(new THREE.SphereGeometry(.45,12,10),R.orangeGlow);l.position.y=1.7;g.add(l);const s=new THREE.Sprite(R.glowMat(0xffa030));s.scale.setScalar(5);s.position.y=1.7;g.add(s);g.userData.l=l;return g}
export function makeStrike(){ // برق كوني: حلقة تحذير + شعاع متعرّج
 const g=new THREE.Group();
 const ring=new THREE.Mesh(new THREE.RingGeometry(5.2,6.4,48),new THREE.MeshBasicMaterial({color:0xc08cff,transparent:true,opacity:.0,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,depthWrite:false}));g.add(ring);
 const core=new THREE.Sprite(R.glowMat(0xb27cff));core.scale.setScalar(12);g.add(core);
 const pts=new Float32Array(14*3);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pts,3));
 const bolt=new THREE.Line(geo,new THREE.LineBasicMaterial({color:new THREE.Color(1.6,1.6,2.4),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));bolt.frustumCulled=false;g.add(bolt);
 const bolt2=new THREE.Line(geo,new THREE.LineBasicMaterial({color:new THREE.Color(.6,.9,2.4),transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));bolt2.frustumCulled=false;bolt2.position.x=.25;g.add(bolt2);
 g.userData={ring,core,bolt,bolt2,pts,geo};return g}

/* ========== المحطة: حلقة ضخمة + أبراج + منصة هبوط ========== */
export function makeStation(){
 const g=new THREE.Group(),blink=[];const win=windowTexture();win.repeat.set(14,1);
 const body=new THREE.Group();g.add(body);
 const add=(geo,mat,x=0,y=0,z=0,p=body)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);p.add(m);return m};
 // الحلقة (أفقية)
 const ring=add(new THREE.TorusGeometry(80,7.5,32,160),R.pearl);ring.rotation.x=Math.PI/2;ring.scale.set(1,1,.6);
 const bandMat=new THREE.MeshStandardMaterial({map:win,emissiveMap:win,emissive:0xffffff,emissiveIntensity:1.4,color:0x1a2040,roughness:.5});
 const band=add(new THREE.TorusGeometry(80,7.9,24,160),bandMat);band.rotation.x=Math.PI/2;band.scale.set(1,1,.26);
 for(const s of[-1,1]){const t=add(new THREE.TorusGeometry(80,7.7,10,160),R.orange);t.rotation.x=Math.PI/2;t.position.y=s*4.6;t.scale.set(1,1,.05)}
 const inner=add(new THREE.TorusGeometry(72,.9,12,160),R.blueGlow);inner.rotation.x=Math.PI/2;
 // مركز + أبراج
 add(new THREE.CylinderGeometry(24,28,6,48),R.metal,0,-16,0);
 add(new THREE.CylinderGeometry(15,19,34,48),R.pearl,0,4,0);
 for(const[y,rad]of[[-6,21],[8,25],[22,18]]){add(new THREE.CylinderGeometry(rad,rad,3.4,56),R.pearl,0,y,0);const ln=add(new THREE.TorusGeometry(rad,.45,10,64),R.blueGlow,0,y+1.8,0);ln.rotation.x=Math.PI/2}
 add(new THREE.CylinderGeometry(7,10,36,36),R.pearl,0,40,0);add(new THREE.CylinderGeometry(1.4,3,50,20),R.metal,0,80,0);
 add(new THREE.SphereGeometry(2.2,18,14),R.orangeGlow,0,106,0);const bc=new THREE.Sprite(R.glowMat(0xff9a30));bc.scale.setScalar(26);bc.position.set(0,106,0);body.add(bc);
 const dish=add(new THREE.SphereGeometry(8,32,16,0,Math.PI*2,0,Math.PI/2.4),R.pearl,10,56,0);dish.rotation.set(-.5,0,.4);
 // أذرع تصل المركز بالحلقة
 for(let i=0;i<4;i++){const a=i*Math.PI/2;const sp=add(new THREE.CylinderGeometry(3,3,66,20),R.metal,Math.cos(a)*45,0,Math.sin(a)*45);sp.rotation.z=Math.PI/2;sp.rotation.y=-a}
 // أبراج صغيرة على الحلقة
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.3;const x=Math.cos(a)*80,z=Math.sin(a)*80;const tw=add(new THREE.CylinderGeometry(2.4,3.4,22,20),R.pearl,x,14,z);add(new THREE.SphereGeometry(3,16,12),R.orange,x,27,z);
  const l=add(new THREE.SphereGeometry(.9,10,8),R.orangeGlow,x,31,z);blink.push(l);const s=new THREE.Sprite(R.glowMat(0xff9a30));s.scale.setScalar(9);s.position.set(x,31,z);body.add(s)}
 // أضواء زرقاء/برتقالية موزعة على الحلقة (Instanced)
 const lg=new THREE.SphereGeometry(.7,8,6);const lm=new THREE.InstancedMesh(lg,R.blueGlow,160);const lo=new THREE.InstancedMesh(lg,R.orangeGlow,80);const m4=new THREE.Matrix4();
 for(let i=0;i<160;i++){const a=i/160*Math.PI*2;m4.makeTranslation(Math.cos(a)*86.4,-1.5+Math.sin(i*3)*.8,Math.sin(a)*86.4);lm.setMatrixAt(i,m4)}
 for(let i=0;i<80;i++){const a=i/80*Math.PI*2+.02;m4.makeTranslation(Math.cos(a)*73.5,4.8,Math.sin(a)*73.5);lo.setMatrixAt(i,m4)}body.add(lm,lo);
 // منصة الهبوط (بارزة نحو الجهة القريبة من المركبة: +z)
 const pad=new THREE.Group();pad.position.set(0,0,108);body.add(pad);
 add(RB(46,3,62,.5),R.dark,0,0,0,pad);const pt=add(new THREE.PlaneGeometry(38,52),new THREE.MeshStandardMaterial({map:padTexture(),roughness:.6,emissive:0xffffff,emissiveMap:padTexture(),emissiveIntensity:.5}),0,1.6,0,pad);pt.rotation.x=-Math.PI/2;
 for(let i=0;i<9;i++)for(const s of[-1,1]){const l=add(new THREE.SphereGeometry(.6,10,8),i%2?R.orangeGlow:R.blueGlow,s*22.4,1.9,-28+i*7,pad);blink.push(l)}
 add(RB(46,2,6,.4),R.orange,0,-.4,32,pad);
 // سفن صغيرة تدور حول المحطة
 const drones=[];for(let i=0;i<5;i++){const d=new THREE.Group();add(RB(3.2,1,6,.3),R.pearl,0,0,0,d);add(RB(7,.2,1.6,.05),R.orange,0,0,1,d);const e=add(new THREE.SphereGeometry(.45,10,8),R.blueGlow,0,0,3.2,d);const gs=new THREE.Sprite(R.glowMat(0x4db8ff));gs.scale.setScalar(5);gs.position.z=3.4;d.add(gs);body.add(d);d.userData={a:i/5*6.283,r:110+i*12,y:20+i*7,sp:.12+i*.02};drones.push(d)}
 g.userData={blink,body,pad,drones};return g}
