import * as THREE from 'three';
export const NOISE_GLSL=`
float hash(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<6;i++){s+=a*noise(p);p=p*2.02+vec3(1.7,9.2,3.1);a*=.5;}return s;}
`;
const PV=`varying vec3 vP;varying vec3 vN;varying vec3 vW;
void main(){vP=position;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;

/* كوكب: 0 أرض، 1 قمر، 2 عملاق غازي، 3 زحل */
export function planetMaterial(type){
 return new THREE.ShaderMaterial({uniforms:{uSun:{value:new THREE.Vector3(1,.3,.4).normalize()},uTime:{value:0},uType:{value:type},uTint:{value:new THREE.Color(1,1,1)}},
 vertexShader:PV,fragmentShader:`uniform vec3 uSun;uniform float uTime;uniform int uType;uniform vec3 uTint;varying vec3 vP;varying vec3 vN;varying vec3 vW;${NOISE_GLSL}
 void main(){vec3 n=normalize(vN);vec3 p=normalize(vP);vec3 V=normalize(cameraPosition-vW);float ndl=dot(n,uSun);vec3 col=vec3(.5);float spec=0.;float night=0.;
  if(uType==0){float h=fbm(p*2.4+3.0);float land=smoothstep(.50,.53,h);float lat=abs(p.y);
   vec3 ocean=mix(vec3(.004,.03,.11),vec3(.02,.14,.34),smoothstep(.2,.5,h));
   vec3 grass=mix(vec3(.07,.20,.05),vec3(.36,.28,.15),smoothstep(.52,.74,h+fbm(p*9.)*.18));
   vec3 desert=vec3(.55,.43,.26);float dz=smoothstep(.34,.1,lat)*step(.5,fbm(p*3.+9.));
   vec3 ln=mix(grass,desert,dz*.75);col=mix(ocean,ln,land);
   float ice=smoothstep(.8,.92,lat+(fbm(p*6.)-.5)*.14);col=mix(col,vec3(.92,.95,1.),ice);
   float cl=smoothstep(.56,.86,fbm(p*4.6+vec3(uTime*.012,0.,0.)+7.));col=mix(col,vec3(.86,.89,.94),cl*.8);
   spec=(1.-land)*(1.-cl)*pow(max(dot(reflect(-uSun,n),V),0.),70.)*.9;
   night=(1.-smoothstep(-.12,.06,ndl))*land*(1.-cl)*step(.64,noise(p*70.))*(1.-ice);}
  else if(uType==1){float h=fbm(p*3.5);col=mix(vec3(.10),vec3(.58,.56,.53),h);col*=.75+.5*fbm(p*22.);
   float c1=smoothstep(.66,.74,noise(p*13.));float c2=smoothstep(.68,.76,noise(p*29.+4.));col*=1.-.38*c1-.25*c2;
   col=mix(col,vec3(.07),smoothstep(.55,.68,fbm(p*1.7+11.))*.55);}
  else{float y=p.y;float t=fbm(vec3(p.x*2.,y*13.,p.z*2.)+vec3(uTime*.006,0.,0.));float fr=uType==2?26.:19.;float b=sin(y*fr+t*3.6)*.5+.5;
   vec3 a=uType==2?vec3(.74,.50,.30):vec3(.82,.72,.50);vec3 c2=uType==2?vec3(.96,.88,.74):vec3(.66,.56,.40);col=mix(a,c2,b);
   if(uType==2){col=mix(col,vec3(.52,.26,.16),smoothstep(.68,.9,fbm(p*vec3(5.,16.,5.)))*.55);float s=length((p.xz-vec2(.62,.0))*vec2(1.,1.))+abs(y+.28)*1.2;col=mix(col,vec3(.7,.22,.12),smoothstep(.2,.0,s)*.7);}}
  float lit=smoothstep(-.03,.38,ndl);vec3 c=col*(lit*.9+.012)+spec+vec3(1.,.78,.45)*night*1.6;
  float term=smoothstep(.0,.2,ndl)*(1.-smoothstep(.2,.45,ndl));c+=vec3(.5,.18,.05)*term*.05;
  gl_FragColor=vec4(c*uTint,1.);}`});
}
export function atmosphereMaterial(color){
 return new THREE.ShaderMaterial({uniforms:{uSun:{value:new THREE.Vector3(1,.3,.4).normalize()},uCol:{value:new THREE.Color(color)}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`uniform vec3 uSun;uniform vec3 uCol;varying vec3 vN;varying vec3 vW;void main(){vec3 n=normalize(vN);vec3 V=normalize(cameraPosition-vW);float f=pow(1.-max(dot(n,V),0.),3.2);float lit=smoothstep(-.35,.45,dot(n,uSun));gl_FragColor=vec4(uCol*f*lit*1.1,f*lit*.8);}`});
}
export function ringMaterial(){
 return new THREE.ShaderMaterial({uniforms:{uSun:{value:new THREE.Vector3(1,.3,.4).normalize()}},transparent:true,side:THREE.DoubleSide,depthWrite:false,
 vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 vP;${NOISE_GLSL}void main(){float r=length(vP.xy);float t=(r-1.3)/1.0;float b=fbm(vec3(r*38.,0.,0.));float gap=smoothstep(.0,.04,t)*smoothstep(.0,.04,1.-t);
  float cassini=1.-smoothstep(.0,.03,abs(t-.62))*.0-(1.-smoothstep(.0,.05,abs(t-.6)))*.9;float a=gap*(.25+.75*b)*cassini;vec3 c=mix(vec3(.62,.54,.42),vec3(.9,.82,.68),b);gl_FragColor=vec4(c*1.1,a*.92);}`});
}
export function galaxyMaterial(){
 return new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uTint:{value:new THREE.Color(.1,.15,.5)},uTint2:{value:new THREE.Color(.4,.1,.3)}},
 vertexShader:`varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform vec3 uTint;uniform vec3 uTint2;varying vec3 vD;${NOISE_GLSL}
 void main(){vec3 d=normalize(vD);vec3 gn=normalize(vec3(.35,.82,.3));float b=dot(d,gn);float band=exp(-b*b*30.);
  float dust=fbm(d*5.)*fbm(d*12.+3.);float n=fbm(d*3.+1.);float core=exp(-b*b*160.);
  vec3 col=mix(vec3(.10,.12,.2),vec3(.95,.78,.58),n)*band*(.35+1.5*dust)*.35;col*=smoothstep(.04,.34,dust+.22);col+=vec3(1.,.85,.6)*core*n*.22;
  float neb=pow(fbm(d*2.2+7.),3.);col+=uTint*neb*.85+uTint2*pow(fbm(d*2.6+19.),3.)*.7;col+=vec3(.002,.003,.007);gl_FragColor=vec4(col,1.);}`});
}
export function gateFieldMaterial(color){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{uTime:{value:0},uAlpha:{value:1},uCol:{value:new THREE.Color(color)}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform float uTime;uniform float uAlpha;uniform vec3 uCol;varying vec2 vUv;${NOISE_GLSL}
 void main(){vec2 p=vUv-.5;float r=length(p)*2.;float sw=fbm(vec3(p*4.+vec2(cos(uTime*.4),sin(uTime*.3)),uTime*.25));
  float rings=.5+.5*sin(r*26.-uTime*3.2+sw*7.);float edge=smoothstep(.5,1.,r);float al=(.07+.4*edge+.16*rings*sw)*uAlpha*(1.-smoothstep(.97,1.,r));
  gl_FragColor=vec4(uCol*(1.+edge*2.5)*(.7+sw),al);}`});
}
export function shieldMaterial(){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{uHit:{value:0},uTime:{value:0},uLevel:{value:1}},
 vertexShader:`varying vec3 vN;varying vec3 vV;varying vec3 vP;void main(){vP=position;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform float uHit;uniform float uTime;uniform float uLevel;varying vec3 vN;varying vec3 vV;varying vec3 vP;
 void main(){float f=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),2.5);vec2 g=vec2(atan(vP.z,vP.x)*6.,vP.y*5.);float hex=smoothstep(.45,.5,abs(sin(g.x+uTime*.5)*sin(g.y*1.7)));
  float a=(f*.03+hex*f*.1)*uLevel+uHit*(f*1.2+.25);vec3 c=mix(vec3(.2,.7,1.),vec3(1.,.4,.25),uHit);gl_FragColor=vec4(c*a*2.,a);}`});
}
export function flameMaterial(){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{uTime:{value:0},uPow:{value:1}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform float uTime;uniform float uPow;varying vec2 vUv;
 void main(){float l=vUv.y;float fl=.75+.25*sin(uTime*60.+l*12.)*sin(uTime*37.);vec3 core=vec3(.75,.9,1.);vec3 out_=vec3(.2,.45,1.);vec3 c=mix(core,out_,smoothstep(.0,.8,l));
  float a=(1.-l)*(1.-l)*fl;gl_FragColor=vec4(c*3.*uPow,a*uPow);}`});
}
export const FinalPass={
 uniforms:{tDiffuse:{value:null},uTime:{value:0},uAberr:{value:.0015},uVig:{value:.55},uFlash:{value:0},uFlashCol:{value:new THREE.Color(1,1,1)},uDamage:{value:0}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;uniform float uAberr;uniform float uVig;uniform float uFlash;uniform vec3 uFlashCol;uniform float uDamage;varying vec2 vUv;
 void main(){vec2 uv=vUv;vec2 c=uv-.5;float r=dot(c,c);vec2 off=c*(uAberr*(.4+r*3.));
  vec3 col=vec3(texture2D(tDiffuse,uv+off).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-off).b);
  col*=1.-uVig*smoothstep(.1,.62,r*1.5);
  float g=fract(sin(dot(uv*vec2(1731.,1113.)+fract(uTime)*91.,vec2(12.9898,78.233)))*43758.5453);col+=(g-.5)*.022;
  col=mix(col,uFlashCol*3.,uFlash);col+=vec3(.95,.04,.06)*uDamage*smoothstep(.05,.55,r*2.2);gl_FragColor=vec4(col,1.);}`
};
