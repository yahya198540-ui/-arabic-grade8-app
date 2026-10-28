import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {galaxyMaterial,planetMaterial,atmosphereMaterial,ringMaterial,FinalPass} from './shaders.js';
import {rng} from './textures.js';

const params=new URLSearchParams(location.search);
const mobile=/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent)||Math.min(innerWidth,innerHeight)<560;
export const Quality=(()=>{const low=params.get('q')==='low'||mobile;return low?{pr:1,samples:0,stars:3800,bloomRes:.5,dust:260,low:true}:{pr:Math.min(window.devicePixelRatio||1,1.75),samples:4,stars:8000,bloomRes:1,dust:520,low:false}})();

/* بيئة لكل مرحلة: اتجاه الشمس، ألوان، ضباب، سدم */
const V=(x,y,z)=>new THREE.Vector3(x,y,z).normalize();
export const ENV=[
 {sun:V(.8,.32,.5),sunCol:new THREE.Color(1,.94,.86),sunI:3.6,hemi:new THREE.Color(.22,.38,.78),hemiI:.62,fog:new THREE.Color(.004,.008,.02),fd:.0013,neb1:new THREE.Color(.04,.12,.55),neb2:new THREE.Color(.32,.06,.36),rock:new THREE.Color(1,1,1),ex:1.05,bloom:.55,planet:0},
 {sun:V(-.72,.42,.55),sunCol:new THREE.Color(1,.82,.62),sunI:4.2,hemi:new THREE.Color(.62,.36,.2),hemiI:.5,fog:new THREE.Color(.05,.022,.01),fd:.0021,neb1:new THREE.Color(.5,.2,.04),neb2:new THREE.Color(.42,.07,.1),rock:new THREE.Color(.95,.78,.64),ex:1.1,bloom:.6,planet:1},
 {sun:V(.25,.22,.92),sunCol:new THREE.Color(.86,.92,1),sunI:3.8,hemi:new THREE.Color(.16,.42,.5),hemiI:.55,fog:new THREE.Color(.003,.012,.018),fd:.0016,neb1:new THREE.Color(.02,.42,.38),neb2:new THREE.Color(.1,.12,.5),rock:new THREE.Color(.82,.88,.95),ex:1.05,bloom:.65,planet:2}
];
const cl=e=>({sun:e.sun.clone(),sunCol:e.sunCol.clone(),sunI:e.sunI,hemi:e.hemi.clone(),hemiI:e.hemiI,fog:e.fog.clone(),fd:e.fd,neb1:e.neb1.clone(),neb2:e.neb2.clone(),rock:e.rock.clone(),ex:e.ex,bloom:e.bloom,planet:e.planet});
export const envNow=cl(ENV[0]);
export function lerpEnv(a,b,t){envNow.sun.copy(a.sun).lerp(b.sun,t).normalize();for(const k of['sunCol','hemi','fog','neb1','neb2','rock'])envNow[k].copy(a[k]).lerp(b[k],t);for(const k of['sunI','hemiI','fd','ex','bloom'])envNow[k]=a[k]+(b[k]-a[k])*t;envNow.planet=b.planet}

export const gfx={};
export function createGfx(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Quality.pr);renderer.setSize(innerWidth,innerHeight,false);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x02040a,.0013);
 const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.5,9000);scene.add(camera);

 // إضاءة
 const sun=new THREE.DirectionalLight(0xfff0dd,3.6);scene.add(sun,sun.target);
 const hemi=new THREE.HemisphereLight(0x3a60c0,0x050505,.6);scene.add(hemi);
 const rim=new THREE.DirectionalLight(0x4a78ff,.35);rim.position.set(-.6,-.4,.8);scene.add(rim);

 // مجموعة السماء تتبع الكاميرا
 const sky=new THREE.Group();scene.add(sky);
 const gal=new THREE.Mesh(new THREE.SphereGeometry(5200,48,32),galaxyMaterial());gal.renderOrder=-20;gal.frustumCulled=false;sky.add(gal);
 // نجوم بدرجات حرارة حقيقية
 {const n=Quality.stars,pos=new Float32Array(n*3),col=new Float32Array(n*3),r=rng(11),c=new THREE.Color();
  for(let i=0;i<n;i++){let x,y,z,l;do{x=r()*2-1;y=r()*2-1;z=r()*2-1;l=x*x+y*y+z*z}while(l>1||l<.01);l=Math.sqrt(l);const R=3600;pos.set([x/l*R,y/l*R,z/l*R],i*3);
   const t=r();c.setRGB(...(t<.12?[1,.72,.45]:t<.3?[1,.9,.75]:t<.75?[1,1,1]:t<.92?[.78,.86,1]:[.6,.74,1]));const b=Math.pow(r(),5)*2.8+.25;col.set([c.r*b,c.g*b,c.b*b],i*3)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.PointsMaterial({size:1.7,sizeAttenuation:false,vertexColors:true,depthWrite:false,fog:false,transparent:false,blending:THREE.AdditiveBlending});
  const pts=new THREE.Points(g,m);pts.renderOrder=-15;pts.frustumCulled=false;sky.add(pts);gfx.stars=pts}
 // الشمس
 const sunDisc=new THREE.Mesh(new THREE.SphereGeometry(70,24,16),new THREE.MeshBasicMaterial({color:new THREE.Color(14,12,9),fog:false}));sky.add(sunDisc);
 const sunGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:glow(),color:0xffd9a0,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));sunGlow.scale.setScalar(1500);sky.add(sunGlow);
 const sunGlow2=sunGlow.clone();sunGlow2.material=sunGlow.material.clone();sunGlow2.material.color.set(0xffa860);sunGlow2.material.opacity=.4;sunGlow2.scale.setScalar(3600);sky.add(sunGlow2);

 // كواكب الخلفية
 const pm=[0,2,3].map(t=>planetMaterial(t));
 const mk=(mat,R,atm)=>{const g=new THREE.Group();const m=new THREE.Mesh(new THREE.SphereGeometry(R,96,64),mat);g.add(m);if(atm){const a=new THREE.Mesh(new THREE.SphereGeometry(R*1.05,64,48),atmosphereMaterial(atm));g.add(a);g.userData.atm=a}g.userData.m=m;g.userData.R=R;return g};
 const earth=mk(pm[0],1700,0x5aa8ff),jup=mk(pm[1],1500,0xd9a070),sat=mk(pm[2],900,0xe8d5a0);
 {const rg=new THREE.Mesh(new THREE.RingGeometry(1.3,2.3,160),ringMaterial());rg.scale.setScalar(900);rg.rotation.x=Math.PI/2-.45;sat.add(rg);sat.userData.ring=rg}
 const back=[earth,jup,sat];back.forEach(b=>{b.rotation.x=-.7;sky.add(b);b.visible=false});sat.userData.ring.rotation.x=Math.PI/2;
 earth.userData.dir=V(-.36,-.8,-.5).multiplyScalar(2500);jup.userData.dir=V(.62,.3,-.72).multiplyScalar(3600);sat.userData.dir=V(.55,.2,-.82).multiplyScalar(3800);
 const planetMats=[...pm,...[]];

 // خريطة البيئة للانعكاسات
 {const pmrem=new THREE.PMREMGenerator(renderer);const es=new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(60,16,12),new THREE.MeshBasicMaterial({color:0x04070f,side:THREE.BackSide})));
  const s=new THREE.Mesh(new THREE.SphereGeometry(7,12,8),new THREE.MeshBasicMaterial({color:new THREE.Color(40,36,28)}));s.position.copy(ENV[0].sun).multiplyScalar(44);es.add(s);
  const e=new THREE.Mesh(new THREE.SphereGeometry(22,12,8),new THREE.MeshBasicMaterial({color:new THREE.Color(.06,.16,.4)}));e.position.set(-18,-40,-10);es.add(e);
  scene.environment=pmrem.fromScene(es,.02).texture;pmrem.dispose()}

 // معالجة لاحقة
 const size=new THREE.Vector2(innerWidth,innerHeight);
 const rt=new THREE.WebGLRenderTarget(innerWidth*Quality.pr,innerHeight*Quality.pr,{type:THREE.HalfFloatType,samples:Quality.samples});
 const composer=new EffectComposer(renderer,rt);composer.setPixelRatio(Quality.pr);composer.setSize(innerWidth,innerHeight);
 composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth*Quality.bloomRes,innerHeight*Quality.bloomRes),.6,.55,1.05);composer.addPass(bloom);
 const fin=new ShaderPass(FinalPass);composer.addPass(fin);composer.addPass(new OutputPass());

 Object.assign(gfx,{renderer,scene,camera,sun,hemi,rim,sky,sunDisc,sunGlow,sunGlow2,back,pm,bloom,fin,composer,earth,jup,sat});
 addEventListener('resize',resize);resize();
 return gfx}

function glow(){const s=256,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d'),g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.08,'rgba(255,240,210,.7)');g.addColorStop(.25,'rgba(255,200,140,.22)');g.addColorStop(.6,'rgba(255,170,100,.05)');g.addColorStop(1,'rgba(255,160,90,0)');x.fillStyle=g;x.fillRect(0,0,s,s);return new THREE.CanvasTexture(c)}

export function resize(){
 if(!gfx.renderer)return;const w=innerWidth,h=innerHeight;gfx.renderer.setSize(w,h,false);gfx.composer.setPixelRatio(Quality.pr);gfx.composer.setSize(w,h);
 gfx.camera.aspect=w/h;gfx.camera.updateProjectionMatrix();gfx.bloom.resolution.set(w*Quality.bloomRes,h*Quality.bloomRes)}

/* تطبيق البيئة الحالية على الإضاءة والضباب والكواكب */
export function applyEnv(time,recede=0){
 const e=envNow,g=gfx;
 g.sun.color.copy(e.sunCol);g.sun.intensity=e.sunI;g.sun.position.copy(e.sun).multiplyScalar(200);
 g.hemi.color.copy(e.hemi);g.hemi.intensity=e.hemiI;
 g.scene.fog.color.copy(e.fog);g.scene.fog.density=e.fd;g.renderer.toneMappingExposure=e.ex;
 g.sunDisc.position.copy(e.sun).multiplyScalar(4300);g.sunGlow.position.copy(g.sunDisc.position);g.sunGlow2.position.copy(g.sunDisc.position);
 const gm=g.sky.children[0].material;gm.uniforms.uTint.value.copy(e.neb1);gm.uniforms.uTint2.value.copy(e.neb2);
 g.back.forEach((b,i)=>{b.visible=(e.planet===i);if(!b.visible)return;const d=b.userData.dir.clone();d.multiplyScalar(1+recede*(i===0?1.4:.15));b.position.copy(d);
  b.userData.m.rotation.y=time*.004;const u=b.userData.m.material.uniforms;u.uSun.value.copy(e.sun);u.uTime.value=time;if(b.userData.atm)b.userData.atm.material.uniforms.uSun.value.copy(e.sun);if(b.userData.ring)b.userData.ring.material.uniforms.uSun.value.copy(e.sun)});
 g.bloom.strength=e.bloom;
}
export const cloneEnv=cl;
