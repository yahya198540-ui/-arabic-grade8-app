import * as THREE from 'three';
import {cartoonRockTexture,glowTexture,labelTexture} from './textures.js';
import {gateFieldMaterial,shieldMaterial,outlineMaterial} from './shaders.js';
import {toAr} from './data.js';

export const R={};
const INK=0x2a1b5a;
const toon=(color,extra={})=>new THREE.MeshToonMaterial(Object.assign({color,gradientMap:R.grad},extra));
export function ol(mesh,t=.05,c=INK){const o=new THREE.Mesh(mesh.geometry,outlineMaterial(t,c));o.userData.outline=true;mesh.add(o);return mesh}
function rock3(seed){return Math.floor(seed)%3}

export function initResources(){
 const g=new THREE.DataTexture(new Uint8Array([120,175,225,255]),4,1,THREE.RedFormat);g.minFilter=g.magFilter=THREE.NearestFilter;g.needsUpdate=true;R.grad=g;
 R.glow=glowTexture();
 R.rockTex=[cartoonRockTexture(3),cartoonRockTexture(8),cartoonRockTexture(15)];
 R.rockGeo=null;
 R.rockMat=[0xffffff,0xfff0d8,0xe6f0ff].map((b,i)=>{const m=toon(0xffffff,{map:R.rockTex[i]});m.userData.base=new THREE.Color(b);return m});
 R.hull=toon(0xffffff);R.red=toon(0xff4d6d);R.blue=toon(0x3a9bff);R.yellow=toon(0xffd23f);R.orange=toon(0xff8a3d);R.dark=toon(0x5b4fa8);R.metal=toon(0xffc83d);R.mint=toon(0x59e3b4);
 R.cellMat=toon(0xffd23f,{emissive:0xffa000,emissiveIntensity:.6});
 R.healMat=toon(0xff5d9a,{emissive:0xff2a70,emissiveIntensity:.5});
 R.solarMat=toon(0x3a8bff,{emissive:0x1c4fc0,emissiveIntensity:.35,side:THREE.DoubleSide});
 R.glowMat=c=>new THREE.SpriteMaterial({map:R.glow,color:c,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
 // هندسة الصخور: كرات مضغوطة بعيوب لطيفة (ناعمة)
 R.rockGeo=[1,2,3,4,5,6].map(s=>{const g=new THREE.IcosahedronGeometry(1,3);const p=g.attributes.position,v=new THREE.Vector3();
  const r=(n)=>{const x=Math.sin(n*127.1+s*311.7)*43758.5;return x-Math.floor(x)};
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const d=1+(r(Math.round(v.x*4)+Math.round(v.y*4)*7+Math.round(v.z*4)*13)-.5)*.18;p.setXYZ(i,v.x*d*(.9+r(s)*.2),v.y*d*(.85+r(s+1)*.25),v.z*d*(.9+r(s+2)*.2))}
  g.deleteAttribute('normal');return merge(g)});
 R.starGeo=(()=>{const sh=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,rr=i%2?.5:1.15;const x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?sh.lineTo(x,y):sh.moveTo(x,y)}sh.closePath();
  const g=new THREE.ExtrudeGeometry(sh,{depth:.35,bevelEnabled:true,bevelSize:.14,bevelThickness:.12,bevelSegments:2});g.center();return g})();
 R.heartGeo=(()=>{const sh=new THREE.Shape();sh.moveTo(0,-.9);sh.bezierCurveTo(-1.5,.1,-.9,1.2,0,.55);sh.bezierCurveTo(.9,1.2,1.5,.1,0,-.9);
  const g=new THREE.ExtrudeGeometry(sh,{depth:.3,bevelEnabled:true,bevelSize:.12,bevelThickness:.1,bevelSegments:2});g.center();return g})();
}
function merge(g){ // دمج رؤوس متطابقة للحصول على تنعيم
 const pos=g.attributes.position,map=new Map(),idx=[],verts=[];
 for(let i=0;i<pos.count;i++){const k=pos.getX(i).toFixed(3)+','+pos.getY(i).toFixed(3)+','+pos.getZ(i).toFixed(3);let j=map.get(k);if(j===undefined){j=verts.length/3;map.set(k,j);verts.push(pos.getX(i),pos.getY(i),pos.getZ(i))}idx.push(j)}
 const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));out.setIndex(idx);
 const uv=new Float32Array(verts.length/3*2),v=new THREE.Vector3();for(let i=0;i<verts.length/3;i++){v.set(verts[i*3],verts[i*3+1],verts[i*3+2]).normalize();uv[i*2]=Math.atan2(v.z,v.x)/6.2832+.5;uv[i*2+1]=Math.acos(v.y)/Math.PI}
 out.setAttribute('uv',new THREE.BufferAttribute(uv,2));out.computeVertexNormals();return out}

/* ====== مركبة الولد الكرتونية ====== */
export function makeShip(){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const add=(geo,mat,x=0,y=0,z=0,t=.05)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);ol(m,t);body.add(m);return m};
 // الجسم: بيضة بيضاء
 const pod=add(new THREE.SphereGeometry(1,40,28),R.hull,0,0,.1,.06);pod.scale.set(1.12,1,2.35);
 // الأنف الأحمر
 const nose=add(new THREE.SphereGeometry(1,28,20),R.red,0,0,-1.95,.06);nose.scale.set(.82,.78,.95);
 // أحزمة زرقاء
 for(const z of[-.3,.8]){const t=add(new THREE.TorusGeometry(1,.14,12,44),R.blue,0,0,z,.04);t.scale.set(1.1,1,1)}
 // قمرة زجاجية + الولد
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.78,28,20),new THREE.MeshToonMaterial({color:0xaee9ff,gradientMap:R.grad,transparent:true,opacity:.55}));cap.position.set(0,.7,-.35);cap.scale.set(.95,.9,1.25);ol(cap,.045);body.add(cap);
 const helmet=add(new THREE.SphereGeometry(.42,20,16),R.hull,0,.62,-.3,.04);
 const vis=new THREE.Mesh(new THREE.SphereGeometry(.36,16,12,0,Math.PI*2,0,Math.PI*.55),toon(0xffd0a0));vis.position.set(0,.62,-.38);vis.rotation.x=Math.PI*.5;body.add(vis);
 const ant=add(new THREE.SphereGeometry(.09,10,8),R.red,0,1.08,-.3,.03);
 // الأجنحة
 const sh=new THREE.Shape();sh.moveTo(.7,-.2);sh.bezierCurveTo(1.8,-.2,3.2,.6,3.6,1.5);sh.bezierCurveTo(3.8,1.9,3.4,2.2,3,2.0);sh.bezierCurveTo(2,1.8,1.2,1.5,.7,1.3);sh.closePath();
 const wg=new THREE.ExtrudeGeometry(sh,{depth:.12,bevelEnabled:true,bevelSize:.12,bevelThickness:.1,bevelSegments:2});wg.rotateX(Math.PI/2);
 for(const s of[1,-1]){const w=new THREE.Mesh(wg,R.red);w.scale.x=s;w.position.set(0,-.12,.0);ol(w,.04);body.add(w);
  const tip=add(new THREE.SphereGeometry(.2,12,10),R.yellow,s*3.35,-.1,1.75,.04);}
 // الزعنفة الخلفية
 const fs=new THREE.Shape();fs.moveTo(0,0);fs.bezierCurveTo(.2,1.0,.9,1.6,1.6,1.8);fs.lineTo(1.9,1.2);fs.bezierCurveTo(1.3,.7,.9,.3,.8,0);fs.closePath();
 const fg=new THREE.ExtrudeGeometry(fs,{depth:.12,bevelEnabled:true,bevelSize:.08,bevelThickness:.06,bevelSegments:1});fg.rotateY(-Math.PI/2);fg.translate(-.06,.6,.9);
 const fin=new THREE.Mesh(fg,R.red);ol(fin,.04);body.add(fin);
 // محرك
 const eng=add(new THREE.CylinderGeometry(.62,.8,.7,22),R.yellow,0,0,2.55,.05);eng.rotation.x=Math.PI/2;
 const noz=new THREE.Mesh(new THREE.CircleGeometry(.5,20),new THREE.MeshBasicMaterial({color:0xfff3a0}));noz.position.set(0,0,2.92);noz.rotation.y=Math.PI;body.add(noz);
 // لهب كرتوني من طبقتين
 const flames=[];
 const mk=(r,l,c)=>{const gg=new THREE.ConeGeometry(r,1,16);gg.rotateX(Math.PI/2);gg.translate(0,0,.5);const m=new THREE.Mesh(gg,new THREE.MeshBasicMaterial({color:c}));m.position.set(0,0,2.9);body.add(m);flames.push(m);return m};
 const f1=mk(.5,1,0xff7a1a);const f2=mk(.3,1,0xffe14d);
 const glowS=new THREE.Sprite(R.glowMat(0xffb04d));glowS.scale.set(3.6,3.6,1);glowS.position.set(0,0,3.3);body.add(glowS);flames.push(glowS);
 const light=new THREE.PointLight(0xffa65a,8,14,2);light.position.set(0,0,3.6);body.add(light);
 // درع فقاعة
 const sm=shieldMaterial();const shield=new THREE.Mesh(new THREE.SphereGeometry(3.3,32,20),sm);shield.scale.set(1.05,.72,1.45);body.add(shield);
 g.userData={body,flames,fm:{uniforms:{uTime:{value:0},uPow:{value:1}}},sm,light};g.scale.setScalar(1.25);return g}

/* ====== بوابة (ستُستبدل لاحقًا بمحطات الكواكب) ====== */
export function makeGate(index,color=0x4fd8ff){
 const g=new THREE.Group(),Rr=13;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(Rr,.95,20,96),R.metal);ol(ring,.08);g.add(ring);
 const inner=new THREE.Mesh(new THREE.TorusGeometry(Rr-1.7,.22,10,96),new THREE.MeshStandardMaterial({color:0x111,emissive:color,emissiveIntensity:3}));g.add(inner);
 const lights=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const l=new THREE.Mesh(new THREE.BoxGeometry(.9,.45,.45),new THREE.MeshStandardMaterial({color:0x111,emissive:0xffb020,emissiveIntensity:3}));l.position.set(Math.cos(a)*Rr,Math.sin(a)*Rr,.55);l.rotation.z=a;g.add(l);lights.push(l)}
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;const p=new THREE.Mesh(new THREE.BoxGeometry(1.4,5.5,1.4),R.red);ol(p,.06);p.position.set(Math.cos(a)*(Rr+2.8),Math.sin(a)*(Rr+2.8),0);p.rotation.z=a-Math.PI/2;g.add(p)}
 const rot=new THREE.Group();for(let i=0;i<3;i++){const arc=new THREE.Mesh(new THREE.TorusGeometry(Rr-3,.18,8,40,Math.PI*.5),new THREE.MeshStandardMaterial({color:0x111,emissive:color,emissiveIntensity:2.6}));arc.rotation.z=i*Math.PI*2/3;rot.add(arc)}g.add(rot);
 const fm=gateFieldMaterial(color);const field=new THREE.Mesh(new THREE.CircleGeometry(Rr-.9,64),fm);g.add(field);
 const lab=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(toAr(index+1),'#ffe27a'),transparent:true,depthWrite:false}));lab.scale.setScalar(5.5);lab.position.set(0,Rr+6.5,0);g.add(lab);
 g.userData={ring,lights,rot,field,fm,lab,inner,open:0,color};return g}

/* ====== صخور / نيازك / خلايا / حطام ====== */
export function makeRock(variant,r,seed=0){
 const m=new THREE.Mesh(R.rockGeo[variant%6],R.rockMat[rock3(variant+seed)]);m.scale.setScalar(r);m.rotation.set(seed*1.7,seed*2.3,seed*.9);ol(m,.07);return m}
export function makeMeteor(r){
 const g=new THREE.Group();const rock=new THREE.Mesh(R.rockGeo[2],toon(0xff8a4d,{map:R.rockTex[1],emissive:0xff4400,emissiveIntensity:.5}));rock.scale.setScalar(r);ol(rock,.07);g.add(rock);
 const cone=(rad,len,col,op)=>{const tg=new THREE.ConeGeometry(rad,len,14,1,true);tg.rotateX(-Math.PI/2);tg.translate(0,0,-len/2);const m=new THREE.Mesh(tg,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op,side:THREE.DoubleSide,depthWrite:false}));g.add(m);return m};
 const tail=cone(r*1.15,r*8,0xff6a1a,.9);cone(r*.7,r*6,0xffe14d,.95);
 const gl=new THREE.Sprite(R.glowMat(0xff9a40));gl.scale.setScalar(r*4.5);g.add(gl);g.userData={rock,tail};return g}
export function makeCell(){const g=new THREE.Group();const m=new THREE.Mesh(R.starGeo,R.cellMat);m.scale.setScalar(1.2);ol(m,.07);g.add(m);const s=new THREE.Sprite(R.glowMat(0xffd23f));s.scale.setScalar(4.4);g.add(s);g.userData={m};return g}
export function makeHeal(){const g=new THREE.Group();const m=new THREE.Mesh(R.heartGeo,R.healMat);m.scale.setScalar(1.3);ol(m,.07);g.add(m);const s=new THREE.Sprite(R.glowMat(0xff5d9a));s.scale.setScalar(4.4);g.add(s);return g}
export function makeDebris(kind,r,seed){
 const g=new THREE.Group();const add=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);ol(m,.05);g.add(m);return m};
 if(kind===0){add(new THREE.BoxGeometry(r*2.6,r*.16,r*1.5),R.solarMat);add(new THREE.BoxGeometry(r*.3,r*.3,r*1.7),R.yellow,-r*1.5,0,0)}
 else if(kind===1){add(new THREE.BoxGeometry(r*1.4,r*1.2,r*1.4),R.yellow);add(new THREE.BoxGeometry(r*1.5,r*.2,r*.3),R.orange,0,0,r*.7)}
 else{const c=add(new THREE.CylinderGeometry(r*.6,r*.6,r*1.6,18),R.red);add(new THREE.CylinderGeometry(r*.64,r*.64,r*.2,18),R.hull,0,r*.4,0)}
 g.rotation.set(seed,seed*2,seed*3);return g}
export function makeGantry(){
 const g=new THREE.Group();const t=new THREE.Mesh(new THREE.TorusGeometry(7.2,.6,14,48),R.yellow);ol(t,.07);g.add(t);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const s=new THREE.Mesh(new THREE.BoxGeometry(.6,5,.6),i%2?R.red:R.blue);ol(s,.05);s.position.set(Math.cos(a)*10,Math.sin(a)*10,0);s.rotation.z=a-Math.PI/2;g.add(s)}
 const o=new THREE.Mesh(new THREE.TorusGeometry(12.4,.45,10,48),R.orange);ol(o,.06);g.add(o);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const l=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),new THREE.MeshBasicMaterial({color:i%2?0xff3b30:0xfff04d}));l.position.set(Math.cos(a)*7.2,Math.sin(a)*7.2,.5);g.add(l)}
 return g}
export function makeBeam(){
 const g=new THREE.Group();const core=new THREE.Mesh(new THREE.BoxGeometry(26,.5,.5),new THREE.MeshBasicMaterial({color:0xffffff}));
 const glow=new THREE.Mesh(new THREE.BoxGeometry(26,1.5,1.5),new THREE.MeshBasicMaterial({color:0xff3d9a,transparent:true,opacity:.55,depthWrite:false}));
 g.add(core,glow);for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.CylinderGeometry(1,1.3,2.4,14),R.dark);ol(e,.07);e.rotation.z=Math.PI/2;e.position.x=s*13.5;g.add(e);const sp=new THREE.Sprite(R.glowMat(0xff5aa8));sp.scale.setScalar(5);sp.position.x=s*12.4;g.add(sp)}
 const hub=new THREE.Mesh(new THREE.SphereGeometry(.9,14,10),R.dark);ol(hub,.06);g.add(hub);g.userData={core,glow};return g}

/* ====== المحطة الفضائية (ملوّنة) ====== */
export function makeStation(){
 const g=new THREE.Group(),blink=[];
 const box=(w,h,d,m,x=0,y=0,z=0)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);ol(b,.25);g.add(b);return b};
 const cyl=(r,l,m,x,y,z,axis='x')=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,24),m);if(axis==='x')c.rotation.z=Math.PI/2;else if(axis==='z')c.rotation.x=Math.PI/2;c.position.set(x,y,z);ol(c,.25);g.add(c);return c};
 box(150,3.4,3.4,R.yellow);for(let i=-7;i<=7;i++)box(.8,5.4,5.4,R.orange,i*10,0,0);
 cyl(6,36,R.hull,0,0,14,'z');cyl(5,26,R.mint,-18,0,-14,'z');cyl(5.5,30,R.hull,18,0,-16,'z');cyl(4.5,18,R.blue,0,10,0,'y');cyl(4.5,18,R.red,0,-10,0,'y');
 box(12,12,12,R.hull,0,0,0);
 for(let i=0;i<14;i++)box(.9,.9,.2,new THREE.MeshBasicMaterial({color:0xfff2a8}),-10+i*1.9,3.2,20.1);
 const arrays=[];for(const x of[-66,-48,48,66])for(const s of[1,-1]){const a=new THREE.Mesh(new THREE.BoxGeometry(14,.5,44),R.solarMat);ol(a,.3);a.position.set(x,s*26,0);const m=new THREE.Mesh(new THREE.BoxGeometry(1.2,s*22,1.2),R.yellow);m.position.set(x,s*11,0);g.add(m,a);arrays.push(a)}
 box(.5,18,30,R.hull,26,0,16);box(.5,18,30,R.hull,-26,0,16);
 const dish=new THREE.Mesh(new THREE.SphereGeometry(5,24,12,0,Math.PI*2,0,Math.PI/2.6),R.hull);ol(dish,.2);dish.position.set(10,12,-6);dish.rotation.x=-.5;g.add(dish);
 const dock=new THREE.Mesh(new THREE.TorusGeometry(5,.9,12,32),R.red);ol(dock,.2);dock.position.set(0,0,-30);g.add(dock);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const l=new THREE.Mesh(new THREE.SphereGeometry(.5,8,8),new THREE.MeshBasicMaterial({color:0xff2244}));l.position.set(Math.cos(a)*5,Math.sin(a)*5,-30.4);g.add(l);blink.push(l)}
 for(let i=0;i<14;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(.7,8,8),new THREE.MeshBasicMaterial({color:0xff2244}));l.position.set((Math.random()-.5)*140,(Math.random()-.5)*12,(Math.random()-.5)*30);g.add(l);blink.push(l)}
 arrays[2].rotation.z=.5;arrays[5].rotation.x=.4;arrays[6].scale.z=.5;
 g.userData={blink,arrays};return g}
