import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {skyMaterial,FinalPass} from './shaders.js';
import {rng} from './textures.js';

const params=new URLSearchParams(location.search);
const mobile=/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent)||Math.min(innerWidth,innerHeight)<560;
export const Quality=(()=>{const low=params.get('q')==='low'||mobile;return low?{pr:1,samples:0,stars:3500,bloomRes:.5,dust:260,low:true}:{pr:Math.min(window.devicePixelRatio||1,1.75),samples:4,stars:9000,bloomRes:1,dust:520,low:false}})();

const V=(x,y,z)=>new THREE.Vector3(x,y,z).normalize();const C=(r,g,b)=>new THREE.Color(r,g,b);
/* sunVis: موضع الشمس المرئية (أمام المركبة عند حافة الكوكب)، fillI: إضاءة تعبئة من الخلف */
export const ENV=[
 {pSun:V(.35,.6,.72),sunVis:V(.34,.1,-.93),sunCol:C(1,.86,.62),sunI:3.0,fillI:.95,fillCol:C(.9,.95,1),hemi:C(.45,.62,1),hemiI:.5,rimA:C(1,.45,.7),rimB:C(.3,.7,1),fog:C(.04,.07,.2),fd:.0006,neb1:C(.15,.3,1),neb2:C(.6,.2,.9),top:C(.01,.02,.1),bot:C(.05,.12,.4),rock:C(.85,.82,.95),spiral:0,sunK:1,ex:1.1,bloom:.5},
 {pSun:V(.6,.42,.62),sunVis:V(-.55,.32,-.77),sunCol:C(1,.72,.42),sunI:3.6,fillI:.85,fillCol:C(1,.82,.7),hemi:C(.55,.4,.85),hemiI:.55,rimA:C(1,.35,.3),rimB:C(.45,.5,1),fog:C(.1,.05,.08),fd:.0008,neb1:C(1,.45,.12),neb2:C(.7,.15,.4),top:C(.04,.02,.1),bot:C(.32,.12,.16),rock:C(1,.86,.7),spiral:0,sunK:1,ex:1.12,bloom:.55},
 {pSun:V(-.25,.5,.82),sunVis:V(.2,.28,-.94),sunCol:C(.8,.82,1),sunI:2.2,fillI:.9,fillCol:C(.85,.8,1),hemi:C(.6,.45,1),hemiI:.7,rimA:C(.75,.3,1),rimB:C(.2,1,.9),fog:C(.05,.03,.18),fd:.0009,neb1:C(.3,.2,1),neb2:C(.15,.9,.9),top:C(.02,.01,.12),bot:C(.14,.05,.42),rock:C(.8,.75,1),spiral:1,sunK:0.18,ex:1.15,bloom:.7},
 {pSun:V(.4,.55,.7),sunVis:V(.5,.25,-.82),sunCol:C(1,.95,.88),sunI:3.0,fillI:.95,fillCol:C(.9,.95,1),hemi:C(.5,.68,1),hemiI:.55,rimA:C(1,.5,.25),rimB:C(.3,.75,1),fog:C(.03,.07,.2),fd:.0006,neb1:C(.2,.4,1),neb2:C(.5,.3,.9),top:C(.01,.03,.12),bot:C(.06,.16,.45),rock:C(.85,.85,.95),spiral:.25,sunK:0.55,ex:1.1,bloom:.5}
];
const cl=e=>{const o={};for(const k in e)o[k]=e[k].clone?e[k].clone():e[k];return o};
export const envNow=cl(ENV[0]);
export function lerpEnv(a,b,t){envNow.sunVis.copy(a.sunVis).lerp(b.sunVis,t).normalize();envNow.pSun.copy(a.pSun).lerp(b.pSun,t).normalize();for(const k of['sunCol','fillCol','hemi','rimA','rimB','fog','neb1','neb2','top','bot','rock'])envNow[k].copy(a[k]).lerp(b[k],t);for(const k of['sunI','fillI','hemiI','fd','ex','bloom','spiral','sunK'])envNow[k]=a[k]+(b[k]-a[k])*t}
export const cloneEnv=cl;

export const gfx={};
export function createGfx(canvas){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Quality.pr);renderer.setSize(innerWidth,innerHeight,false);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x0c0c30,.0007);
 const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.5,14000);scene.add(camera);
 const sun=new THREE.DirectionalLight(0xfff2e0,3.3);scene.add(sun,sun.target);
 const hemi=new THREE.HemisphereLight(0x8cb4ff,0x201040,.55);scene.add(hemi);
 const fill=new THREE.DirectionalLight(0xffffff,1.5);fill.position.set(-.25,.9,1);scene.add(fill);
 const rimA=new THREE.DirectionalLight(0xff59b0,.9);rimA.position.set(-.7,.3,.8);scene.add(rimA);
 const rimB=new THREE.DirectionalLight(0x4db8ff,.8);rimB.position.set(.8,-.3,.9);scene.add(rimB);

 const sky=new THREE.Group();scene.add(sky);
 const gal=new THREE.Mesh(new THREE.SphereGeometry(9000,48,32),skyMaterial());gal.renderOrder=-20;gal.frustumCulled=false;sky.add(gal);
 {const n=Quality.stars,pos=new Float32Array(n*3),col=new Float32Array(n*3),r=rng(11),c=new THREE.Color();
  for(let i=0;i<n;i++){let x,y,z,l;do{x=r()*2-1;y=r()*2-1;z=r()*2-1;l=x*x+y*y+z*z}while(l>1||l<.01);l=Math.sqrt(l);const R=7000;pos.set([x/l*R,y/l*R,z/l*R],i*3);
   const t=r();c.setRGB(...(t<.12?[1,.7,.45]:t<.3?[1,.9,.75]:t<.75?[1,1,1]:t<.92?[.78,.86,1]:[.6,.74,1]));const b=Math.pow(r(),5)*3+.3;col.set([c.r*b,c.g*b,c.b*b],i*3)}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));
  const m=new THREE.PointsMaterial({size:2.1,map:dotTex(),alphaTest:.02,sizeAttenuation:false,vertexColors:true,depthWrite:false,fog:false,transparent:true,blending:THREE.AdditiveBlending});
  const pts=new THREE.Points(g,m);pts.renderOrder=-15;pts.frustumCulled=false;sky.add(pts)}
 const sunDisc=new THREE.Mesh(new THREE.SphereGeometry(190,32,20),new THREE.MeshBasicMaterial({color:new THREE.Color(14,12,9),fog:false}));sky.add(sunDisc);
 const mkGlow=(col,sc,op)=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glow(),color:col,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false,opacity:op}));s.scale.setScalar(sc);sky.add(s);return s};
 const sunGlow=mkGlow(0xffe0b0,2000,.9),sunGlow2=mkGlow(0xffa060,5200,.3);

 // بيئة الانعكاسات من السماء نفسها
 {const pmrem=new THREE.PMREMGenerator(renderer);const es=new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(60,32,20),(()=>{const m=skyMaterial();m.uniforms.uTop.value.set(.1,.12,.35);m.uniforms.uBot.value.set(.5,.25,.7);return m})()));
  const s=new THREE.Mesh(new THREE.SphereGeometry(6,12,8),new THREE.MeshBasicMaterial({color:C(60,52,40)}));s.position.copy(ENV[0].sunVis).multiplyScalar(44);es.add(s);
  for(const[x,y,z,col]of[[-30,10,20,C(8,2.5,6)],[30,-10,25,C(2,5,9)],[0,35,-20,C(5,6,9)]]){const c=new THREE.Mesh(new THREE.SphereGeometry(8,10,8),new THREE.MeshBasicMaterial({color:col}));c.position.set(x,y,z);es.add(c)}
  scene.environment=pmrem.fromScene(es,.03).texture;pmrem.dispose()}

 const rt=new THREE.WebGLRenderTarget(innerWidth*Quality.pr,innerHeight*Quality.pr,{type:THREE.HalfFloatType,samples:Quality.samples});
 const composer=new EffectComposer(renderer,rt);composer.setPixelRatio(Quality.pr);composer.setSize(innerWidth,innerHeight);
 composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth*Quality.bloomRes,innerHeight*Quality.bloomRes),.5,.6,1.15);composer.addPass(bloom);
 const fin=new ShaderPass(FinalPass);composer.addPass(fin);composer.addPass(new OutputPass());
 Object.assign(gfx,{renderer,scene,camera,sun,fill,hemi,rimA,rimB,sky,sunDisc,sunGlow,sunGlow2,bloom,fin,composer});
 addEventListener('resize',resize);resize();return gfx}
function dotTex(){const s=64,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d'),g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,s,s);return new THREE.CanvasTexture(c)}
function glow(){const s=256,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d'),g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.06,'rgba(255,245,220,.8)');g.addColorStop(.22,'rgba(255,200,140,.22)');g.addColorStop(.6,'rgba(255,170,100,.05)');g.addColorStop(1,'rgba(255,160,90,0)');x.fillStyle=g;x.fillRect(0,0,s,s);return new THREE.CanvasTexture(c)}
export function resize(){if(!gfx.renderer)return;const w=innerWidth,h=innerHeight;gfx.renderer.setSize(w,h,false);gfx.composer.setPixelRatio(Quality.pr);gfx.composer.setSize(w,h);
 gfx.camera.aspect=w/h;gfx.camera.updateProjectionMatrix();gfx.bloom.resolution.set(w*Quality.bloomRes,h*Quality.bloomRes)}
export function applyEnv(){
 const e=envNow,g=gfx;g.sun.color.copy(e.sunCol);g.sun.intensity=e.sunI;g.sun.position.copy(e.sunVis).multiplyScalar(300);
 g.fill.color.copy(e.fillCol);g.fill.intensity=e.fillI;g.hemi.color.copy(e.hemi);g.hemi.intensity=e.hemiI;g.rimA.color.copy(e.rimA);g.rimB.color.copy(e.rimB);
 g.scene.fog.color.copy(e.fog);g.scene.fog.density=e.fd;g.renderer.toneMappingExposure=e.ex;
 const p=e.sunVis.clone().multiplyScalar(7800);g.sunDisc.position.copy(p);g.sunGlow.position.copy(p);g.sunGlow2.position.copy(p);g.sunGlow.material.opacity=.9*e.sunK;g.sunGlow2.material.opacity=.3*e.sunK;g.sunDisc.visible=e.sunK>.3;
 const gm=g.sky.children[0].material.uniforms;gm.uTint.value.copy(e.neb1);gm.uTint2.value.copy(e.neb2);gm.uTop.value.copy(e.top);gm.uBot.value.copy(e.bot);gm.uSpiral.value=e.spiral;
 g.bloom.strength=e.bloom}
/* خفض/رفع دقة العرض تلقائيًّا للحفاظ على السلاسة (هدف ≈ 60 إطارًا) */
let _acc=0,_n=0,_pr=null;
export function adaptQuality(dt){
 if(_pr===null)_pr=Quality.pr;_acc+=dt;_n++;
 if(_acc>1.6){const avg=_acc/_n;_acc=0;_n=0;let np=_pr;
  if(avg>.026&&_pr>.6)np=Math.max(.6,_pr-.2);else if(avg<.0185&&_pr<Quality.pr)np=Math.min(Quality.pr,_pr+.1);
  if(Math.abs(np-_pr)>.01){_pr=np;gfx.renderer.setPixelRatio(np);gfx.composer.setPixelRatio(np);gfx.composer.setSize(innerWidth,innerHeight)}}
}
