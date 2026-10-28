import * as THREE from 'three';
import {rockTexture,rockGeometry,panelTexture,solarTexture,glowTexture,labelTexture} from './textures.js';
import {gateFieldMaterial,shieldMaterial,flameMaterial} from './shaders.js';
import {toAr} from './data.js';

export const R={};
export function initResources(){
 R.rockTex=[rockTexture(3,[150,142,132]),rockTexture(8,[128,100,78]),rockTexture(15,[96,98,104])];
 R.rockGeo=[1,2,3,4,5,6].map(s=>rockGeometry(s*7));
 R.rockMat=R.rockTex.map(t=>new THREE.MeshStandardMaterial({map:t,bumpMap:t,bumpScale:5,roughness:.96,metalness:.04,color:0xffffff}));
 R.panel=panelTexture();R.panelDark=panelTexture([120,128,138]);R.solar=solarTexture();R.glow=glowTexture();
 R.hull=new THREE.MeshStandardMaterial({map:R.panel,color:0xeef2f6,metalness:.5,roughness:.36});
 R.dark=new THREE.MeshStandardMaterial({color:0x232a33,metalness:.75,roughness:.42});
 R.metal=new THREE.MeshStandardMaterial({map:R.panelDark,color:0xbfc8d2,metalness:.7,roughness:.45});
 R.orange=new THREE.MeshStandardMaterial({color:0xff5a14,metalness:.25,roughness:.5});
 R.cellMat=new THREE.MeshStandardMaterial({color:0x2affd0,emissive:0x16f0c0,emissiveIntensity:2.4,metalness:.1,roughness:.2,transparent:true,opacity:.92});
 R.cellGeo=new THREE.OctahedronGeometry(.85,0);R.cellGeo.scale(.75,1.25,.75);
 R.healMat=new THREE.MeshStandardMaterial({color:0xff4d7a,emissive:0xff2a63,emissiveIntensity:2.2,roughness:.3});
 R.solarMat=new THREE.MeshStandardMaterial({map:R.solar,metalness:.6,roughness:.35,side:THREE.DoubleSide,emissive:0x0a1a40,emissiveIntensity:.3});
 R.glowMat=c=>new THREE.SpriteMaterial({map:R.glow,color:c,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
}

/* ====== المركبة ====== */
export function makeShip(){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const prof=[[0,2.7],[.16,2.55],[.42,2.1],[.66,1.35],[.8,.4],[.84,-.6],[.76,-1.5],[.6,-2.1],[.5,-2.25]].map(([r,y])=>new THREE.Vector2(r,y));
 const geo=new THREE.LatheGeometry(prof,32);geo.rotateX(-Math.PI/2);
 const fus=new THREE.Mesh(geo,R.hull);fus.scale.set(1,.78,1);body.add(fus);
 // أنف برتقالي
 const nose=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),R.orange);nose.position.set(0,0,-2.65);body.add(nose);
 // قمرة
 const can=new THREE.Mesh(new THREE.SphereGeometry(.55,28,16,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:0x07111d,metalness:.2,roughness:.04,clearcoat:1,clearcoatRoughness:.03,envMapIntensity:2.6}));
 can.scale.set(.85,.8,2.1);can.position.set(0,.4,-.7);body.add(can);
 // أجنحة
 const sh=new THREE.Shape();sh.moveTo(.5,-.6);sh.lineTo(3.5,1.55);sh.lineTo(3.45,2.15);sh.lineTo(.6,1.5);sh.lineTo(.5,-.6);
 const wg=new THREE.ExtrudeGeometry(sh,{depth:.14,bevelEnabled:true,bevelSize:.05,bevelThickness:.04,bevelSegments:1});wg.rotateX(Math.PI/2);wg.translate(0,.05,0);
 for(const s of[1,-1]){const w=new THREE.Mesh(wg,R.hull);w.scale.x=s;w.position.y=-.2;body.add(w);
  const st=new THREE.Mesh(new THREE.BoxGeometry(2.4,.05,.22),R.orange);st.position.set(s*2,-.1,.95);st.rotation.y=s*.1;body.add(st);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),new THREE.MeshBasicMaterial({color:s>0?0x2aff6a:0xff2a3a}));tip.position.set(s*3.5,-.12,1.85);tip.scale.setScalar(1.6);body.add(tip);
  const sp=new THREE.Sprite(R.glowMat(s>0?0x33ff77:0xff3344));sp.scale.setScalar(.9);sp.position.copy(tip.position);body.add(sp);}
 // زعنفة ذيلية
 const fs=new THREE.Shape();fs.moveTo(0,0);fs.lineTo(1.5,.95);fs.lineTo(1.9,.95);fs.lineTo(1.5,0);
 const fg=new THREE.ExtrudeGeometry(fs,{depth:.1,bevelEnabled:false});fg.rotateY(-Math.PI/2);fg.translate(-.05,0,0);const fin=new THREE.Mesh(fg,R.hull);fin.position.set(0,.4,1.7);fin.scale.set(1,1.1,1);body.add(fin);
 // محركان
 const flames=[];const fm=flameMaterial();
 for(const s of[1,-1]){const e=new THREE.Mesh(new THREE.CylinderGeometry(.42,.5,1.6,20),R.dark);e.rotation.x=Math.PI/2;e.position.set(s*1.05,-.12,1.75);body.add(e);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.46,.06,8,24),R.orange);ring.position.set(s*1.05,-.12,2.55);body.add(ring);
  const noz=new THREE.Mesh(new THREE.CircleGeometry(.4,20),new THREE.MeshBasicMaterial({color:0xaee4ff}));noz.position.set(s*1.05,-.12,2.56);noz.rotation.y=Math.PI;noz.scale.setScalar(1.2);body.add(noz);
  const fgm=new THREE.ConeGeometry(.4,1,18,1,true);fgm.rotateX(Math.PI/2);fgm.translate(0,0,.5);const f=new THREE.Mesh(fgm,fm);f.position.set(s*1.05,-.12,2.55);f.scale.set(1,1,3.4);body.add(f);flames.push(f);
  const gl=new THREE.Sprite(R.glowMat(0x66b8ff));gl.scale.setScalar(3.2);gl.position.set(s*1.05,-.12,2.8);body.add(gl);flames.push(gl);}
 // مركز المحرك
 const eg=new THREE.Mesh(new THREE.SphereGeometry(.3,12,8),new THREE.MeshBasicMaterial({color:0x99ddff}));eg.position.set(0,0,2.1);body.add(eg);
 const light=new THREE.PointLight(0x7ab8ff,26,16,2);light.position.set(0,0,3.6);body.add(light);
 // درع
 const sm=shieldMaterial();const shield=new THREE.Mesh(new THREE.SphereGeometry(3.4,32,20),sm);shield.scale.set(1,.7,1.5);body.add(shield);
 g.userData={body,flames,fm,sm,light};g.scale.setScalar(1.3);return g}

/* ====== بوابة السؤال ====== */
export function makeGate(index,color=0x4fd8ff){
 const g=new THREE.Group(),Rr=13;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(Rr,.95,20,96),R.metal);g.add(ring);
 const inner=new THREE.Mesh(new THREE.TorusGeometry(Rr-1.7,.22,10,96),new THREE.MeshStandardMaterial({color:0x111,emissive:color,emissiveIntensity:3}));g.add(inner);
 const lights=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const l=new THREE.Mesh(new THREE.BoxGeometry(.9,.45,.45),new THREE.MeshStandardMaterial({color:0x111,emissive:0xffb020,emissiveIntensity:3}));
  l.position.set(Math.cos(a)*Rr,Math.sin(a)*Rr,.55);l.rotation.z=a;g.add(l);lights.push(l)}
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;const p=new THREE.Mesh(new THREE.BoxGeometry(1.4,5.5,1.4),R.metal);p.position.set(Math.cos(a)*(Rr+2.8),Math.sin(a)*(Rr+2.8),0);p.rotation.z=a-Math.PI/2;g.add(p);
  const d=new THREE.Mesh(new THREE.BoxGeometry(2.2,.35,1.8),R.dark);d.position.copy(p.position);d.rotation.z=a;g.add(d)}
 const rot=new THREE.Group();for(let i=0;i<3;i++){const arc=new THREE.Mesh(new THREE.TorusGeometry(Rr-3,.18,8,40,Math.PI*.5),new THREE.MeshStandardMaterial({color:0x111,emissive:color,emissiveIntensity:2.6}));arc.rotation.z=i*Math.PI*2/3;rot.add(arc)}g.add(rot);
 const fm=gateFieldMaterial(color);const field=new THREE.Mesh(new THREE.CircleGeometry(Rr-.9,64),fm);g.add(field);
 const lab=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(toAr(index+1),'#ffe27a'),transparent:true,depthWrite:false}));lab.scale.setScalar(5.5);lab.position.set(0,Rr+6.5,0);g.add(lab);
 g.userData={ring,lights,rot,field,fm,lab,inner,open:0,color};return g}

/* ====== صخور / نيازك / خلايا / حطام ====== */
export function makeRock(variant,r,seed=0){
 const m=new THREE.Mesh(R.rockGeo[variant%6],R.rockMat[(variant+seed)%3]);m.scale.setScalar(r);m.rotation.set(seed*1.7,seed*2.3,seed*.9);return m}
export function makeMeteor(r){
 const g=new THREE.Group();const rock=makeRock(2,r,3);const hot=new THREE.MeshStandardMaterial({map:R.rockTex[1],color:0xffa070,emissive:0xff4400,emissiveIntensity:1.4,roughness:.9});rock.material=hot;g.add(rock);
 const tg=new THREE.ConeGeometry(r*1.1,r*9,16,1,true);tg.rotateX(-Math.PI/2);tg.translate(0,0,-r*4.5);
 const tm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;void main(){float l=vUv.y;gl_FragColor=vec4(mix(vec3(1.,.85,.5),vec3(1.,.25,.05),l)*2.2,(1.-l)*(1.-l)*.8);}`});
 const tail=new THREE.Mesh(tg,tm);g.add(tail);const gl=new THREE.Sprite(R.glowMat(0xff7a30));gl.scale.setScalar(r*5);g.add(gl);g.userData={rock,tail};return g}
export function makeCell(){const g=new THREE.Group();const m=new THREE.Mesh(R.cellGeo,R.cellMat);g.add(m);const s=new THREE.Sprite(R.glowMat(0x28ffc8));s.scale.setScalar(3.6);g.add(s);g.userData={m};return g}
export function makeHeal(){const g=new THREE.Group();const a=new THREE.Mesh(new THREE.BoxGeometry(1.8,.55,.55),R.healMat),b=new THREE.Mesh(new THREE.BoxGeometry(.55,1.8,.55),R.healMat);g.add(a,b);const s=new THREE.Sprite(R.glowMat(0xff3a6e));s.scale.setScalar(4.2);g.add(s);return g}
export function makeDebris(kind,r,seed){
 const g=new THREE.Group();
 if(kind===0){const p=new THREE.Mesh(new THREE.BoxGeometry(r*2.6,r*.12,r*1.5),R.solarMat);g.add(p);const a=new THREE.Mesh(new THREE.CylinderGeometry(r*.07,r*.07,r*1.8,8),R.metal);a.rotation.z=Math.PI/2;a.position.x=-r*1.4;g.add(a)}
 else if(kind===1){const b=new THREE.Mesh(new THREE.BoxGeometry(r*1.2,r*.9,r*1.6),R.metal);g.add(b);const c=new THREE.Mesh(new THREE.CylinderGeometry(r*.35,r*.35,r*1.4,12),R.hull);c.position.set(r*.5,r*.3,0);g.add(c)}
 else{const c=new THREE.Mesh(new THREE.CylinderGeometry(r*.5,r*.5,r*2.2,16,1,true),new THREE.MeshStandardMaterial({map:R.panel,metalness:.6,roughness:.5,side:THREE.DoubleSide}));c.rotation.z=1.2;g.add(c)}
 g.rotation.set(seed,seed*2,seed*3);return g}
export function makeGantry(){ // حلقة هيكلية قابلة للعبور
 const g=new THREE.Group();const t=new THREE.Mesh(new THREE.TorusGeometry(7.2,.55,12,48),R.metal);g.add(t);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const s=new THREE.Mesh(new THREE.BoxGeometry(.5,5,.5),R.metal);s.position.set(Math.cos(a)*10,Math.sin(a)*10,0);s.rotation.z=a-Math.PI/2;g.add(s)}
 const o=new THREE.Mesh(new THREE.TorusGeometry(12.4,.4,8,48),R.metal);g.add(o);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const l=new THREE.Mesh(new THREE.SphereGeometry(.22,8,8),new THREE.MeshBasicMaterial({color:i%2?0xff3b30:0xffd23f}));l.position.set(Math.cos(a)*7.2,Math.sin(a)*7.2,.4);g.add(l)}
 return g}
export function makeBeam(){ // حزمة بلازما دوّارة
 const g=new THREE.Group();const core=new THREE.Mesh(new THREE.BoxGeometry(26,.35,.35),new THREE.MeshBasicMaterial({color:0xffffff}));
 const glow=new THREE.Mesh(new THREE.BoxGeometry(26,1.1,1.1),new THREE.MeshBasicMaterial({color:0xff2a6a,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));
 g.add(core,glow);for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.2,2.2,12),R.dark);e.rotation.z=Math.PI/2;e.position.x=s*13.5;g.add(e);const sp=new THREE.Sprite(R.glowMat(0xff3a7a));sp.scale.setScalar(5);sp.position.x=s*12.6;g.add(sp)}
 const hub=new THREE.Mesh(new THREE.SphereGeometry(.8,12,8),R.dark);g.add(hub);g.userData={core,glow};return g}

/* ====== المحطة الفضائية (تشبه المحطة الدولية) ====== */
export function makeStation(){
 const g=new THREE.Group(),blink=[];
 const box=(w,h,d,m,x=0,y=0,z=0)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);g.add(b);return b};
 const cyl=(r,l,m,x,y,z,axis='x')=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,24),m);if(axis==='x')c.rotation.z=Math.PI/2;else if(axis==='z')c.rotation.x=Math.PI/2;c.position.set(x,y,z);g.add(c);return c};
 box(150,3.4,3.4,R.metal);for(let i=-7;i<=7;i++)box(.6,5.4,5.4,R.dark,i*10,0,0);
 // وحدات مضغوطة
 cyl(6,36,R.hull,0,0,14,'z');cyl(5,26,R.hull,-18,0,-14,'z');cyl(5.5,30,R.hull,18,0,-16,'z');cyl(4.5,18,R.hull,0,10,0,'y');cyl(4.5,18,R.hull,0,-10,0,'y');
 box(12,12,12,R.hull,0,0,0);
 // نوافذ مضيئة
 for(let i=0;i<14;i++){const w=box(.9,.9,.2,new THREE.MeshBasicMaterial({color:0xffe8a8}),-10+i*1.9,3.2,20.1);}
 // ألواح شمسية
 const arrays=[];for(const x of[-66,-48,48,66])for(const s of[1,-1]){const a=new THREE.Mesh(new THREE.BoxGeometry(14,.3,44),R.solarMat);a.position.set(x,s*26,0);const m=new THREE.Mesh(new THREE.BoxGeometry(1,s*22,1),R.metal);m.position.set(x,s*11,0);g.add(m);g.add(a);arrays.push(a);
  const bm=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),R.dark);bm.position.set(x,s*3,0);g.add(bm)}
 // مشعّات وصحون
 box(.4,18,30,R.hull,26,0,16);box(.4,18,30,R.hull,-26,0,16);
 const dish=new THREE.Mesh(new THREE.SphereGeometry(5,24,12,0,Math.PI*2,0,Math.PI/2.6),R.hull);dish.position.set(10,12,-6);dish.rotation.x=-.5;g.add(dish);
 // ميناء الالتحام (أمام) — حلقة تعلوها أضواء
 const dock=new THREE.Mesh(new THREE.TorusGeometry(5,.9,12,32),R.metal);dock.position.set(0,0,-30);g.add(dock);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const l=new THREE.Mesh(new THREE.SphereGeometry(.45,8,8),new THREE.MeshBasicMaterial({color:0xff2244}));l.position.set(Math.cos(a)*5,Math.sin(a)*5,-30.4);g.add(l);blink.push(l)}
 for(let i=0;i<14;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(.6,8,8),new THREE.MeshBasicMaterial({color:0xff2244}));l.position.set((Math.random()-.5)*140,(Math.random()-.5)*12,(Math.random()-.5)*30);g.add(l);blink.push(l)}
 // أضرار: لوحات مائلة ومكسورة
 arrays[2].rotation.z=.5;arrays[5].rotation.x=.4;arrays[6].scale.z=.5;
 g.userData={blink,arrays};return g}
