import * as THREE from 'three';
import {NOISE_GLSL} from './shaders.js';

/* ============ مولّد خامات الكواكب على بطاقة الرسوم ============ */
const GEN_FRAG=`precision highp float;varying vec2 vUv;uniform int uType;uniform float uSeed;uniform int uOut;
const float PI=3.14159265;
float h13(vec3 p){p=fract(p*.1031);p+=dot(p,p.zyx+31.32);return fract((p.x+p.y)*p.z);}
vec3 h33(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
float nz(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<7;i++){s+=a*nz(p);p=p*2.03+vec3(7.1,3.7,1.3);a*=.5;}return s;}
float rdg(vec3 p){float a=.5,s=0.;for(int i=0;i<6;i++){float n=1.-abs(nz(p)*2.-1.);s+=a*n*n;p=p*2.1+vec3(3.3,1.7,9.2);a*=.5;}return s;}
vec3 vor(vec3 p){vec3 ip=floor(p),fp=fract(p);float f1=8.,f2=8.,id=0.;
 for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++)for(int k=-1;k<=1;k++){vec3 g=vec3(float(i),float(j),float(k));vec3 o=h33(ip+g);vec3 r=g+o-fp;float d=dot(r,r);if(d<f1){f2=f1;f1=d;id=h13(ip+g+7.);}else if(d<f2)f2=d;}
 return vec3(sqrt(f1),sqrt(f2),id);}
float crater(vec3 p,float s){vec3 v=vor(p*s);float d=v.x;float bowl=-smoothstep(.42,.0,d)*.9;float rim=smoothstep(.34,.46,d)*(1.-smoothstep(.46,.6,d))*.5;return (bowl+rim)*step(.35,v.z);}
vec3 ramp(float t,vec3 a,vec3 b,vec3 c){return t<.5?mix(a,b,t*2.):mix(b,c,t*2.-1.);}
void main(){
 float lon=(vUv.x-.5)*2.*PI;float lat=(vUv.y-.5)*PI;vec3 d=vec3(cos(lat)*cos(lon),sin(lat),cos(lat)*sin(lon));
 vec3 q=d*2.+uSeed;vec3 alb=vec3(.5);float h=.5;vec3 emi=vec3(0.);float gl=.1;float la=abs(d.y);
 if(uType==0){ // قمر فضي
  float c=crater(d,3.)+crater(d+4.,7.)*.7+crater(d+9.,15.)*.5+crater(d+2.,34.)*.35;float b=fbm(q*1.4);
  h=.5+c*.5+b*.2;float maria=smoothstep(.5,.58,fbm(q*.9+3.));
  alb=mix(vec3(.74,.76,.82),vec3(.97,.98,1.),b);alb=mix(alb,vec3(.34,.38,.52),maria*.8);alb*=1.+c*.55;
  alb+=vec3(.05,.07,.14)*smoothstep(.55,.9,fbm(q*5.))*.5;gl=.05;}
 else if(uType==1){ // كوكب البحار
  float hh=fbm(q*1.15);float land=smoothstep(.57,.6,hh);vec3 deep=vec3(.015,.16,.55),shal=vec3(.05,.78,.82);
  alb=mix(deep,shal,smoothstep(.35,.57,hh));
  vec3 gr=mix(vec3(.12,.62,.28),vec3(.98,.86,.52),smoothstep(.6,.64,hh));alb=mix(alb,gr,land);
  float sw=fbm(q*2.2+fbm(q*3.)*2.);float cl=smoothstep(.52,.74,sw);alb=mix(alb,vec3(1.),cl*.88);h=mix(.35,.5+hh*.4,land)+cl*.1;
  gl=(1.-land)*(1.-cl)*.95;emi=vec3(.1,.9,1.)*step(.8,nz(q*40.))*(1.-land)*(1.-cl)*.7;}
 else if(uType==2){ // كوكب النار
  float hh=fbm(q*1.6);float cr=rdg(q*2.4+fbm(q*1.5)*1.2);float lava=smoothstep(.62,.9,cr);
  alb=mix(vec3(.07,.04,.05),vec3(.2,.1,.09),hh);alb=mix(alb,vec3(.28,.28,.3),smoothstep(.6,.75,fbm(q*5.))*.5);
  h=.5+hh*.5-lava*.3;emi=ramp(lava,vec3(0.),vec3(1.,.28,.02),vec3(1.,.85,.25))*lava*1.1;gl=0.;}
 else if(uType==3){ // الغابات النيونية
  float hh=fbm(q*1.3);float land=smoothstep(.48,.51,hh);vec3 sea=mix(vec3(.12,.04,.4),vec3(.3,.12,.65),fbm(q*3.));
  vec3 forest=mix(vec3(.02,.3,.24),vec3(.1,.7,.45),fbm(q*8.));alb=mix(sea,forest,land);
  float v1=smoothstep(.76,.92,rdg(q*4.));float v2=smoothstep(.78,.93,rdg(q*7.+9.));
  emi=(vec3(0.,1.,.85)*v1+vec3(1.,.2,.9)*v2)*land+vec3(.5,.2,1.)*step(.86,nz(q*26.))*(1.-land)*.8;
  h=.5+hh*.5;gl=(1.-land)*.7;}
 else if(uType==4){ // كوكب الجليد
  float hh=fbm(q*1.8);float cr=rdg(q*3.+fbm(q*2.)*1.4);float crev=smoothstep(.7,.93,cr);
  alb=mix(vec3(.5,.72,.95),vec3(.78,.9,1.),hh);alb=mix(alb,vec3(.05,.4,.8),crev*.85);alb=mix(alb,vec3(.4,.65,.95),smoothstep(.55,.8,fbm(q*5.))*.3);
  h=.5+hh*.4-crev*.2;gl=.85-crev*.4;
  float au=smoothstep(.62,.8,la)*(1.-smoothstep(.9,1.,la));vec3 ac=mix(vec3(.1,1.,.6),vec3(.9,.2,1.),fbm(q*3.));emi=ac*au*(.4+.8*fbm(vec3(lon*3.,la*9.,uSeed)));}
 else if(uType==5){ // العملاق الغازي
  float wy=d.y*4.+fbm(vec3(d.x*2.,d.y*3.,d.z*2.)+uSeed)*1.3;float band=fract(wy*1.15);float bi=floor(wy*1.15);
  float t=.5+.5*sin(wy*5.+fbm(q*3.)*4.);vec3 c1=vec3(1.,.82,.52),c2=vec3(.96,.46,.18),c3=vec3(.62,.2,.16),c4=vec3(.98,.9,.78);
  alb=ramp(t,c1,c2,c3);alb=mix(alb,c4,smoothstep(.6,1.,sin(wy*11.+1.)*.5+.5)*.5);alb*=.85+.3*fbm(vec3(d.x*10.,d.y*40.,d.z*10.));
  vec2 s=vec2(atan(d.z,d.x)-1.2,d.y+.32);float sd=length(s*vec2(1.,2.2));float sw=smoothstep(.32,.0,sd);float spin=sin(atan(s.y,s.x*1.)*4.+sd*34.)*.5+.5;
  alb=mix(alb,mix(vec3(.9,.25,.2),vec3(1.,.8,.6),spin),sw);h=.5+fbm(q*3.)*.2+sw*.1;gl=.1;}
 else if(uType==6){ // كوكب الكريستال
  vec3 v=vor(d*4.2+uSeed);vec3 col=.5+.5*cos(6.2831*(v.z+vec3(0.,.33,.67))*.8+vec3(3.7,2.,5.));alb=col*.85;
  float edge=smoothstep(.12,.0,v.y-v.x);alb=mix(alb,vec3(.9,1.,1.),edge*.8);h=.5+v.x*.5;
  vec3 v2=vor(d*13.+4.);alb*=.85+.3*v2.x;emi=vec3(.4,.9,1.)*edge*1.1+vec3(1.,.4,.9)*step(.93,v2.z)*smoothstep(.5,.0,v2.x)*1.2;gl=.9;}
 else if(uType==7){ // كوكب الصحراء
  float dn=fbm(vec3(d.x*3.,d.y*14.,d.z*3.)+uSeed);float hh=fbm(q*1.5);float cy=smoothstep(.72,.9,rdg(q*2.2));
  alb=mix(vec3(.95,.55,.2),vec3(.99,.8,.45),dn);alb=mix(alb,vec3(.62,.25,.12),smoothstep(.55,.7,hh)*.6);alb=mix(alb,vec3(.28,.12,.1),cy*.8);alb=mix(alb,vec3(1.,.95,.85),smoothstep(.76,.86,fbm(q*3.+5.))*.7);
  h=.5+dn*.4-cy*.3;gl=.05;emi=vec3(1.,.72,.3)*step(.9,nz(q*45.))*smoothstep(.45,.6,hh)*.7;}
 else if(uType==8){ // كوكب العواصف
  vec3 w=q*1.4;float f=fbm(w+fbm(w*2.+uSeed)*1.7);alb=ramp(f,vec3(.12,.06,.32),vec3(.42,.22,.78),vec3(.95,.72,1.));
  float lt=smoothstep(.9,.97,nz(q*10.)*nz(q*17.+3.)*2.1);emi=vec3(.5,.8,1.)*lt*1.3;h=.5+f*.5;gl=.35;}
 else { // الأرض (الوطن)
  float hh=fbm(q*1.1+1.7);float land=smoothstep(.52,.55,hh);vec3 deep=vec3(.01,.12,.45),shal=vec3(.04,.4,.78);alb=mix(deep,shal,smoothstep(.38,.52,hh));
  vec3 gr=mix(vec3(.1,.5,.14),vec3(.55,.42,.2),smoothstep(.58,.74,fbm(q*3.)+(1.-la)*.1));gr=mix(gr,vec3(.9,.78,.5),smoothstep(.28,.0,la-.1)*step(.5,fbm(q*2.+8.)));alb=mix(alb,gr,land);
  float ice=smoothstep(.8,.9,la+(fbm(q*5.)-.5)*.15);alb=mix(alb,vec3(.96,.98,1.),ice);
  float sw=fbm(q*2.3+fbm(q*3.5)*1.8);float cl=smoothstep(.55,.74,sw);alb=mix(alb,vec3(1.),cl*.9);h=mix(.35,.5+hh*.45,land)+cl*.12;
  gl=(1.-land)*(1.-cl)*.95;emi=vec3(1.,.74,.35)*step(.7,nz(q*60.))*smoothstep(.5,.0,fbm(q*14.)-.3)*land*(1.-cl)*(1.-ice)*1.3;}
 if(uOut==0)gl_FragColor=vec4(alb,clamp(h,0.,1.));else gl_FragColor=vec4(emi,gl);
}`;
let genCam,genQuad,genScene;
function genInit(){if(genScene)return;genScene=new THREE.Scene();genCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 genQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({uniforms:{uType:{value:0},uSeed:{value:0},uOut:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:GEN_FRAG}));genScene.add(genQuad)}
export function generateTextures(renderer,biome,seed,w,h){
 genInit();const mk=()=>new THREE.WebGLRenderTarget(w,h,{type:THREE.UnsignedByteType,minFilter:THREE.LinearMipmapLinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:true,wrapS:THREE.RepeatWrapping,colorSpace:THREE.NoColorSpace});
 const A=mk(),E=mk();const u=genQuad.material.uniforms;u.uType.value=biome;u.uSeed.value=seed;
 const prev=renderer.getRenderTarget();
 u.uOut.value=0;renderer.setRenderTarget(A);renderer.render(genScene,genCam);
 u.uOut.value=1;renderer.setRenderTarget(E);renderer.render(genScene,genCam);
 renderer.setRenderTarget(prev);A.texture.anisotropy=8;E.texture.anisotropy=4;
 return {A,E,dispose(){A.dispose();E.dispose()}};
}

/* ============ مادة سطح الكوكب (إضاءة فيزيائية مبسّطة + موجة الإحياء) ============ */
const PV=`varying vec2 vUv;varying vec3 vP;varying vec3 vNW;varying vec3 vW;
void main(){vUv=uv;vP=position;vNW=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const PF=`uniform sampler2D tA;uniform sampler2D tE;uniform vec3 uSun;uniform vec3 uSunCol;uniform vec3 uAtm;uniform float uBump;uniform float uEmi;uniform float uEmiDay;
uniform float uRestore;uniform float uWave;uniform float uWaveOn;uniform vec3 uWaveO;uniform float uTime;
varying vec2 vUv;varying vec3 vP;varying vec3 vNW;varying vec3 vW;
vec3 pert(vec3 pos,vec3 N,vec2 dH){vec3 sx=normalize(dFdx(pos)),sy=normalize(dFdy(pos));vec3 R1=cross(sy,N),R2=cross(N,sx);float fd=dot(sx,R1);vec3 g=sign(fd)*(dH.x*R1+dH.y*R2);return normalize(abs(fd)*N-g);}
void main(){
 vec4 A=texture2D(tA,vUv);vec4 E=texture2D(tE,vUv);
 vec2 dx=dFdx(vUv),dy=dFdy(vUv);float h0=A.a;float hx=texture2D(tA,vUv+dx).a-h0;float hy=texture2D(tA,vUv+dy).a-h0;
 vec3 N0=normalize(vNW);vec3 N=pert(vW,N0,vec2(hx,hy)*uBump);
 vec3 V=normalize(cameraPosition-vW);float ndl=dot(N,uSun);
 vec3 on=normalize(vP);float ang=acos(clamp(dot(on,uWaveO),-1.,1.))/3.14159;float inside=1.-smoothstep(uWave-.1,uWave,ang);float res=max(uRestore,inside);
 vec3 alb=A.rgb;float lum=dot(alb,vec3(.3,.59,.11));alb=mix(vec3(lum)*.45,alb,res);
 float diff=smoothstep(-.12,.75,ndl);vec3 col=alb*(vec3(.05,.07,.13)+uSunCol*diff*.7);
 vec3 H=normalize(uSun+V);float sp=pow(max(dot(N,H),0.),mix(10.,160.,E.a))*E.a*step(0.,ndl);col+=uSunCol*sp*.7*res;
 float nightK=1.-smoothstep(-.1,.3,ndl);col+=E.rgb*uEmi*res*mix(uEmiDay,1.,nightK);
 float term=smoothstep(-.12,.0,ndl)*(1.-smoothstep(.0,.25,ndl));col+=vec3(1.,.5,.2)*term*.12*res;
 float f=pow(1.-max(dot(N0,V),0.),3.);col+=uAtm*f*(.25+.75*smoothstep(-.35,.5,ndl))*mix(.25,1.,res);
 col+=vec3(.7,1.,.9)*smoothstep(.07,.0,abs(ang-uWave))*uWaveOn*2.2;
 gl_FragColor=vec4(col,1.);}`;
export function planetMaterial(tex,opts){
 return new THREE.ShaderMaterial({uniforms:{tA:{value:tex.A.texture},tE:{value:tex.E.texture},uSun:{value:new THREE.Vector3(1,0,0)},uSunCol:{value:new THREE.Color(1,.95,.88)},uAtm:{value:new THREE.Color(opts.atm)},
  uBump:{value:opts.bump||1.5},uEmi:{value:opts.emi||1.6},uEmiDay:{value:opts.emiDay==null?.2:opts.emiDay},uRestore:{value:opts.restored?1:0},uWave:{value:0},uWaveOn:{value:0},uWaveO:{value:new THREE.Vector3(0,0,1)},uTime:{value:0}},
  vertexShader:PV,fragmentShader:PF,extensions:{derivatives:true}});
}
function atmoMaterial(color){
 return new THREE.ShaderMaterial({uniforms:{uSun:{value:new THREE.Vector3(1,0,0)},uCol:{value:new THREE.Color(color)},uPow:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`uniform vec3 uSun;uniform vec3 uCol;uniform float uPow;varying vec3 vN;varying vec3 vW;void main(){vec3 n=normalize(vN);vec3 V=normalize(cameraPosition-vW);float f=1.-max(dot(n,V),0.);float a=pow(f,5.)*.55+pow(f,12.)*.7;float lit=smoothstep(-.4,.5,dot(n,uSun));a=min(a,.9);gl_FragColor=vec4(uCol*a*lit*uPow,a*lit*uPow*.5);}`});
}
function ringTexture(colors){const w=1024,c=document.createElement('canvas');c.width=w;c.height=4;const x=c.getContext('2d');
 for(let i=0;i<w;i++){const t=i/w;let a=.0;const n=Math.sin(t*130)*.5+Math.sin(t*47+2)*.3+Math.sin(t*310)*.2;a=.55+.45*n;if(t<.04||t>.97)a*=.1;if(t>.55&&t<.6)a=.03;
  const col=colors[Math.floor(t*colors.length)%colors.length];x.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},${Math.max(0,Math.min(1,a))})`;x.fillRect(i,0,1,4)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}

/* ============ الكواكب ============ */
export const BIOMES=[
 {name:'moon',atm:0x9fb8ff,atmC:0x8fa8ff,bump:2.4,emi:1,emiDay:.1},
 {name:'ocean',atm:0x4fb8ff,atmC:0x6fc8ff,bump:.8,emi:1.1,emiDay:.1},
 {name:'lava',atm:0xff7a3a,atmC:0xff6a2a,bump:2.4,emi:2.2,emiDay:1},
 {name:'jungle',atm:0x58ffd0,atmC:0x4affc8,bump:1.4,emi:1.7,emiDay:.6},
 {name:'ice',atm:0x9fe4ff,atmC:0xa8ecff,bump:1.8,emi:.8,emiDay:.4},
 {name:'gas',atm:0xffc18a,atmC:0xffb070,bump:.3,emi:1,emiDay:.1,ring:[[255,226,170],[240,190,140],[255,240,210],[230,170,120]]},
 {name:'crystal',atm:0xd49bff,atmC:0xe0a8ff,bump:2,emi:.9,emiDay:.5},
 {name:'desert',atm:0xffa860,atmC:0xff9a50,bump:2,emi:1.1,emiDay:.1},
 {name:'storm',atm:0xb48aff,atmC:0xa070ff,bump:1,emi:1.4,emiDay:.5,ring:[[200,170,255],[170,140,240],[230,210,255]]},
 {name:'earth',atm:0x5ab8ff,atmC:0x70c4ff,bump:1.1,emi:2.2,emiDay:.05}
];
const live=new Set();
export const Planets={
 renderer:null,res:{w:1536,h:768},
 init(renderer,low){this.renderer=renderer;this.res=low?{w:1024,h:512}:{w:2048,h:1024}},
 /** يُنشئ كوكبًا (بدون خامات حتى تُطلب) */
 create(biome,R,seed,restored){
  const B=BIOMES[biome],g=new THREE.Group();g.userData={biome,R,seed,restored:!!restored,tex:null,wave:0,waveOn:0,B};
  const body=new THREE.Mesh(new THREE.SphereGeometry(R,128,96),new THREE.MeshBasicMaterial({color:0x222233}));g.add(body);g.userData.body=body;
  const atm=new THREE.Mesh(new THREE.SphereGeometry(R*1.07,64,48),atmoMaterial(B.atmC));g.add(atm);g.userData.atm=atm;
  if(B.ring){const rg=new THREE.Mesh(new THREE.RingGeometry(R*1.35,R*2.3,160,1),new THREE.MeshBasicMaterial({map:ringTexture(B.ring),transparent:true,side:THREE.DoubleSide,depthWrite:false}));
   const uv=rg.geometry.attributes.uv,p=rg.geometry.attributes.position,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);uv.setXY(i,(v.length()-R*1.35)/(R*.95),.5)}
   rg.rotation.x=Math.PI/2-.42;rg.rotation.y=.15;g.add(rg);g.userData.ring=rg}
  body.visible=false;atm.visible=false;g.visible=false;return g},
 ensure(g){const u=g.userData;if(u.tex)return;u.tex=generateTextures(this.renderer,u.biome,u.seed,this.res.w,this.res.h);
  const m=planetMaterial(u.tex,{...u.B,restored:u.restored,atm:u.B.atm});u.body.material.dispose();u.body.material=m;u.body.visible=true;u.atm.visible=true;u.mat=m},
 release(g){const u=g.userData;if(!u.tex)return;u.tex.dispose();u.tex=null;u.body.visible=false;u.atm.visible=false;u.body.material=new THREE.MeshBasicMaterial({color:0x222233})},
 /** تحديث الإضاءة والموجة */
 update(g,sunDir,sunCol,time,dt){const u=g.userData;if(!u.mat)return;const m=u.mat.uniforms;m.uSun.value.copy(sunDir);m.uSunCol.value.copy(sunCol);m.uTime.value=time;
  u.atm.material.uniforms.uSun.value.copy(sunDir);g.rotation.y+=dt*.006;
  if(u.waveOn>0){u.wave+=dt/3.2;m.uWave.value=u.wave*1.25;m.uWaveOn.value=u.wave<1.1?1:Math.max(0,1-(u.wave-1.1)*3);if(u.wave>1.35){u.waveOn=0;u.restored=true;m.uRestore.value=1;m.uWaveOn.value=0}}
  m.uRestore.value=u.restored?1:0;u.atm.material.uniforms.uPow.value=u.restored?1:.35},
 restore(g,dirWorld){const u=g.userData;if(!u.mat){this.ensure(g)}u.waveOn=1;u.wave=0;
  const inv=new THREE.Matrix4().copy(g.matrixWorld).invert();const d=dirWorld.clone().transformDirection(inv).normalize();u.mat.uniforms.uWaveO.value.copy(d)},
 dull(g){const u=g.userData;u.restored=false;u.wave=0;u.waveOn=0;if(u.mat){u.mat.uniforms.uRestore.value=0;u.mat.uniforms.uWave.value=0;u.mat.uniforms.uWaveOn.value=0}}
};
