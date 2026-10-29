import * as THREE from 'three';
import {rockGeometry,rockPBR,panelTexture,glowTexture} from './textures.js';
import {flameMaterial,shieldMaterial} from './shaders.js';

export const R={};
export const ol=m=>m; // لا حواف: مظهر حديث
const phys=(o)=>new THREE.MeshPhysicalMaterial(o);

export function initResources(){
 R.glow=glowTexture();R.panel=panelTexture([238,242,248],512);
 R.rockSets=[3,8,15].map(s=>rockPBR(s));
 R.rockGeo=[1,2,3,4,5,6].map(s=>rockGeometry(s*7));
 R.rockMat=R.rockSets.map((s,i)=>{const m=new THREE.MeshStandardMaterial({map:s.a,bumpMap:s.a,bumpScale:6,roughness:.82,metalness:.12,emissive:0xffffff,emissiveMap:s.e,emissiveIntensity:1.3,envMapIntensity:.7});m.userData.base=new THREE.Color([0x8a8a90,0x927f78,0x7c8290][i]);return m});
 R.pearl=phys({color:0xf6f8ff,metalness:.25,roughness:.22,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.6,map:R.panel});
 R.candy=phys({color:0xff3558,metalness:.3,roughness:.2,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.7});
 R.blue=phys({color:0x2f7bff,metalness:.4,roughness:.2,clearcoat:1,envMapIntensity:1.6});
 R.gold=phys({color:0xffc83d,metalness:.9,roughness:.22,clearcoat:.6,envMapIntensity:1.8,emissive:0xff9a00,emissiveIntensity:.18});
 R.metal=phys({color:0xb8c2d6,metalness:.9,roughness:.28,envMapIntensity:1.6});
 R.dark=phys({color:0x22283c,metalness:.7,roughness:.4,envMapIntensity:1.2});
 R.glass=phys({color:0x9fdcff,metalness:0,roughness:.03,transparent:true,opacity:.34,clearcoat:1,envMapIntensity:3});
 R.cellMat=phys({color:0xffd23f,metalness:.75,roughness:.18,clearcoat:1,emissive:0xff9a00,emissiveIntensity:1.1,envMapIntensity:2});
 R.healMat=phys({color:0xff4d88,metalness:.2,roughness:.15,clearcoat:1,emissive:0xff1f6a,emissiveIntensity:1.1});
 R.solarMat=phys({color:0x2457d6,metalness:.8,roughness:.25,clearcoat:.8,emissive:0x0a2a80,emissiveIntensity:.5,side:THREE.DoubleSide,envMapIntensity:1.6});
 R.mint=phys({color:0x39e0b0,metalness:.3,roughness:.25,clearcoat:1});
 R.orange=phys({color:0xff7a2a,metalness:.4,roughness:.25,clearcoat:1});R.yellow=R.gold;R.red=R.candy;R.hull=R.pearl;
 R.glowMat=c=>new THREE.SpriteMaterial({map:R.glow,color:c,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true});
 R.starGeo=(()=>{const sh=new THREE.Shape();for(let i=0;i<10;i++){const a=i*Math.PI/5+Math.PI/2,rr=i%2?.52:1.18;const x=Math.cos(a)*rr,y=Math.sin(a)*rr;i?sh.lineTo(x,y):sh.moveTo(x,y)}sh.closePath();
  const g=new THREE.ExtrudeGeometry(sh,{depth:.36,bevelEnabled:true,bevelSize:.16,bevelThickness:.16,bevelSegments:5,curveSegments:8});g.center();return g})();
 R.heartGeo=(()=>{const sh=new THREE.Shape();sh.moveTo(0,-.9);sh.bezierCurveTo(-1.5,.1,-.9,1.2,0,.55);sh.bezierCurveTo(.9,1.2,1.5,.1,0,-.9);
  const g=new THREE.ExtrudeGeometry(sh,{depth:.3,bevelEnabled:true,bevelSize:.14,bevelThickness:.14,bevelSegments:5,curveSegments:12});g.center();return g})();
}

/* ====== مركبة الولد ====== */
export function makeShip(){
 const g=new THREE.Group(),body=new THREE.Group();g.add(body);
 const add=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);body.add(m);return m};
 const pod=add(new THREE.SphereGeometry(1,64,40),R.pearl,0,0,.1);pod.scale.set(1.1,.98,2.4);
 const nose=add(new THREE.SphereGeometry(1,40,28),R.candy,0,0,-1.98);nose.scale.set(.8,.76,.95);
 for(const z of[-.35,.8]){const t=add(new THREE.TorusGeometry(1,.13,16,64),R.blue,0,0,z);t.scale.set(1.08,.98,1)}
 const strip=add(new THREE.BoxGeometry(.06,.06,3),new THREE.MeshBasicMaterial({color:0x7ff3ff}),0,-.96,.2);
 // قمرة + الولد
 const cap=new THREE.Mesh(new THREE.SphereGeometry(.8,40,28),R.glass);cap.position.set(0,.68,-.35);cap.scale.set(.95,.9,1.28);body.add(cap);
 const helm=add(new THREE.SphereGeometry(.42,28,20),R.pearl,0,.62,-.3);
 const face=new THREE.Mesh(new THREE.SphereGeometry(.34,20,14),new THREE.MeshStandardMaterial({color:0xffcf9f,roughness:.6}));face.position.set(0,.62,-.46);body.add(face);
 add(new THREE.SphereGeometry(.09,12,10),R.candy,0,1.1,-.3);
 // أجنحة
 const sh=new THREE.Shape();sh.moveTo(.7,-.2);sh.bezierCurveTo(1.8,-.2,3.2,.6,3.7,1.5);sh.bezierCurveTo(3.9,1.9,3.5,2.2,3.1,2.0);sh.bezierCurveTo(2,1.8,1.2,1.5,.7,1.3);sh.closePath();
 const wg=new THREE.ExtrudeGeometry(sh,{depth:.1,bevelEnabled:true,bevelSize:.14,bevelThickness:.12,bevelSegments:5,curveSegments:14});wg.rotateX(Math.PI/2);
 for(const s of[1,-1]){const w=new THREE.Mesh(wg,R.candy);w.scale.x=s;w.position.set(0,-.12,0);body.add(w);
  const tip=add(new THREE.SphereGeometry(.13,16,12),new THREE.MeshBasicMaterial({color:s>0?0x44ff88:0xff4466}),s*3.5,-.1,1.75);
  const sp=new THREE.Sprite(R.glowMat(s>0?0x33ff77:0xff3355));sp.scale.setScalar(1.3);sp.position.copy(tip.position);body.add(sp)}
 // زعنفة
 const fs=new THREE.Shape();fs.moveTo(0,0);fs.bezierCurveTo(.2,1.0,.9,1.6,1.6,1.8);fs.lineTo(1.9,1.2);fs.bezierCurveTo(1.3,.7,.9,.3,.8,0);fs.closePath();
 const fg=new THREE.ExtrudeGeometry(fs,{depth:.1,bevelEnabled:true,bevelSize:.08,bevelThickness:.07,bevelSegments:4});fg.rotateY(-Math.PI/2);fg.translate(-.05,.6,.9);body.add(new THREE.Mesh(fg,R.candy));
 // محرك
 const eng=add(new THREE.CylinderGeometry(.6,.78,.75,40),R.metal,0,0,2.55);eng.rotation.x=Math.PI/2;
 const ring=add(new THREE.TorusGeometry(.66,.07,12,40),new THREE.MeshBasicMaterial({color:0x7ff3ff}),0,0,2.93);
 const noz=new THREE.Mesh(new THREE.CircleGeometry(.52,28),new THREE.MeshBasicMaterial({color:0xcff6ff}));noz.position.set(0,0,2.95);noz.rotation.y=Math.PI;body.add(noz);
 // لهب حجمي
 const fm=flameMaterial();const flames=[];
 const mk=(r)=>{const gg=new THREE.ConeGeometry(r,1,24,1,true);gg.rotateX(Math.PI/2);gg.translate(0,0,.5);const m=new THREE.Mesh(gg,fm);m.position.set(0,0,2.95);body.add(m);flames.push(m)};
 mk(.52);mk(.34);
 const gs=new THREE.Sprite(R.glowMat(0x88c8ff));gs.scale.setScalar(1.6);gs.position.set(0,0,3.2);body.add(gs);flames.push(gs);
 const light=new THREE.PointLight(0x88b8ff,14,16,2);light.position.set(0,0,3.6);body.add(light);
 const sm=shieldMaterial();const shield=new THREE.Mesh(new THREE.SphereGeometry(3.3,40,24),sm);shield.scale.set(1.05,.72,1.45);body.add(shield);
 g.userData={body,flames,fm,sm,light};g.scale.setScalar(1.25);return g}

/* ====== أجسام ====== */
export function makeRock(variant,r,seed=0){
 const m=new THREE.Mesh(R.rockGeo[variant%6],R.rockMat[(variant+Math.floor(seed))%3]);m.scale.setScalar(r);m.rotation.set(seed*1.7,seed*2.3,seed*.9);return m}
export function makeMeteor(r){
 const g=new THREE.Group();const rock=new THREE.Mesh(R.rockGeo[2],new THREE.MeshStandardMaterial({map:R.rockSets[1].a,color:0xffb080,emissive:0xff4a10,emissiveIntensity:1.6,roughness:.7}));rock.scale.setScalar(r);g.add(rock);
 const fm=flameMaterial();fm.uniforms.uPow.value=.5;
 const mkc=(rad,len)=>{const tg=new THREE.ConeGeometry(rad,len,20,1,true);tg.rotateX(-Math.PI/2);tg.translate(0,0,-len/2);const m=new THREE.Mesh(tg,fm);g.add(m);return m};
 const tail=mkc(r*1.3,r*9);mkc(r*.8,r*6);
 const gl=new THREE.Sprite(R.glowMat(0xff8a40));gl.scale.setScalar(r*5);g.add(gl);g.userData={rock,tail,fm};return g}
export function makeCell(){const g=new THREE.Group();const m=new THREE.Mesh(R.starGeo,R.cellMat);m.scale.setScalar(1.25);g.add(m);const s=new THREE.Sprite(R.glowMat(0xffc83d));s.scale.setScalar(4.8);g.add(s);g.userData={m};return g}
export function makeHeal(){const g=new THREE.Group();const m=new THREE.Mesh(R.heartGeo,R.healMat);m.scale.setScalar(1.3);g.add(m);const s=new THREE.Sprite(R.glowMat(0xff4d88));s.scale.setScalar(4.6);g.add(s);return g}
export function makeDebris(kind,r,seed){
 const g=new THREE.Group();const add=(geo,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);g.add(m);return m};
 if(kind===0){add(new THREE.BoxGeometry(r*2.6,r*.14,r*1.5),R.solarMat);add(new THREE.CylinderGeometry(r*.08,r*.08,r*1.8,10),R.metal,-r*1.5,0,0).rotation.z=Math.PI/2}
 else if(kind===1){add(new THREE.BoxGeometry(r*1.4,r*1.2,r*1.4),R.metal);add(new THREE.CylinderGeometry(r*.35,r*.35,r*1.5,20),R.pearl,r*.4,r*.3,0)}
 else{add(new THREE.CylinderGeometry(r*.6,r*.6,r*1.6,28,1,true),R.metal).material.side=THREE.DoubleSide;add(new THREE.TorusGeometry(r*.6,r*.06,10,28),R.candy,0,r*.8,0).rotation.x=Math.PI/2}
 g.rotation.set(seed,seed*2,seed*3);return g}
export function makeGantry(){
 const g=new THREE.Group();g.add(new THREE.Mesh(new THREE.TorusGeometry(7.2,.6,20,64),R.gold));
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const s=new THREE.Mesh(new THREE.BoxGeometry(.6,5,.6),R.metal);s.position.set(Math.cos(a)*10,Math.sin(a)*10,0);s.rotation.z=a-Math.PI/2;g.add(s)}
 g.add(new THREE.Mesh(new THREE.TorusGeometry(12.4,.45,14,64),R.metal));
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const l=new THREE.Mesh(new THREE.SphereGeometry(.3,12,10),new THREE.MeshBasicMaterial({color:i%2?0xff4060:0x7ff3ff}));l.position.set(Math.cos(a)*7.2,Math.sin(a)*7.2,.5);g.add(l)}
 return g}
export function makeBeam(){
 const g=new THREE.Group();const core=new THREE.Mesh(new THREE.BoxGeometry(26,.45,.45),new THREE.MeshBasicMaterial({color:0xffffff}));
 const glow=new THREE.Mesh(new THREE.BoxGeometry(26,1.6,1.6),new THREE.MeshBasicMaterial({color:0xff3d9a,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending}));
 g.add(core,glow);for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.CylinderGeometry(1,1.3,2.4,24),R.dark);e.rotation.z=Math.PI/2;e.position.x=s*13.5;g.add(e);const sp=new THREE.Sprite(R.glowMat(0xff5aa8));sp.scale.setScalar(6);sp.position.x=s*12.4;g.add(sp)}
 g.add(new THREE.Mesh(new THREE.SphereGeometry(.9,20,14),R.dark));g.userData={core,glow};return g}

/* ====== المحطة الفضائية ====== */
export function makeStation(){
 const g=new THREE.Group(),blink=[];
 const box=(w,h,d,m,x=0,y=0,z=0)=>{const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);b.position.set(x,y,z);g.add(b);return b};
 const cyl=(r,l,m,x,y,z,axis='x')=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,40),m);if(axis==='x')c.rotation.z=Math.PI/2;else if(axis==='z')c.rotation.x=Math.PI/2;c.position.set(x,y,z);g.add(c);return c};
 box(150,3.4,3.4,R.metal);for(let i=-7;i<=7;i++)box(.8,5.4,5.4,R.dark,i*10,0,0);
 cyl(6,36,R.pearl,0,0,14,'z');cyl(5,26,R.mint,-18,0,-14,'z');cyl(5.5,30,R.pearl,18,0,-16,'z');cyl(4.5,18,R.blue,0,10,0,'y');cyl(4.5,18,R.candy,0,-10,0,'y');
 box(12,12,12,R.pearl,0,0,0);
 for(let i=0;i<14;i++)box(.9,.9,.2,new THREE.MeshBasicMaterial({color:0xfff2b8}),-10+i*1.9,3.2,20.1);
 const arrays=[];for(const x of[-66,-48,48,66])for(const s of[1,-1]){const a=new THREE.Mesh(new THREE.BoxGeometry(14,.4,44),R.solarMat);a.position.set(x,s*26,0);const m=new THREE.Mesh(new THREE.BoxGeometry(1.2,s*22,1.2),R.metal);m.position.set(x,s*11,0);g.add(m,a);arrays.push(a)}
 box(.5,18,30,R.pearl,26,0,16);box(.5,18,30,R.pearl,-26,0,16);
 const dish=new THREE.Mesh(new THREE.SphereGeometry(5,32,16,0,Math.PI*2,0,Math.PI/2.6),R.pearl);dish.position.set(10,12,-6);dish.rotation.x=-.5;g.add(dish);
 const dock=new THREE.Mesh(new THREE.TorusGeometry(5,.9,16,40),R.candy);dock.position.set(0,0,-30);g.add(dock);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const l=new THREE.Mesh(new THREE.SphereGeometry(.5,10,8),new THREE.MeshBasicMaterial({color:0xff2244}));l.position.set(Math.cos(a)*5,Math.sin(a)*5,-30.4);g.add(l);blink.push(l)}
 for(let i=0;i<14;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(.7,10,8),new THREE.MeshBasicMaterial({color:0xff2244}));l.position.set((Math.random()-.5)*140,(Math.random()-.5)*12,(Math.random()-.5)*30);g.add(l);blink.push(l)}
 arrays[2].rotation.z=.5;arrays[5].rotation.x=.4;arrays[6].scale.z=.5;
 g.userData={blink,arrays};return g}
