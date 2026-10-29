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

/* كوكب كرتوني: 0 أرض، 2 عملاق، 3 زحل، 4 قمر بوجه */
export function planetMaterial(type){
 return new THREE.ShaderMaterial({uniforms:{uSun:{value:new THREE.Vector3(1,.3,.4).normalize()},uTime:{value:0},uType:{value:type},uTint:{value:new THREE.Color(1,1,1)}},
 vertexShader:PV,fragmentShader:`uniform vec3 uSun;uniform float uTime;uniform int uType;uniform vec3 uTint;varying vec3 vP;varying vec3 vN;varying vec3 vW;${NOISE_GLSL}
 void main(){vec3 n=normalize(vN);vec3 p=normalize(vP);vec3 V=normalize(cameraPosition-vW);float ndl=dot(n,uSun);vec3 col=vec3(.5);
  if(uType==0){float h=fbm(p*2.3+3.0);float land=step(.55,h);col=mix(vec3(.16,.58,1.),vec3(.38,.88,.38),land);
   col=mix(col,vec3(.98,.86,.4),land*step(.66,h)*.9);
   float cl=step(.66,fbm(p*3.6+vec3(uTime*.01,0.,0.)+7.));col=mix(col,vec3(1.),cl);
   float ice=step(.86,abs(p.y)+(fbm(p*5.)-.5)*.1);col=mix(col,vec3(1.),ice);}
  else if(uType==4){col=vec3(1.,.93,.62);float c1=step(.7,noise(p*8.));col=mix(col,vec3(.97,.78,.42),c1*.9);
   vec3 f=normalize(vec3(0.,0.,1.));
   float e1=length(p-normalize(vec3(-.3,.2,1.)));float e2=length(p-normalize(vec3(.3,.2,1.)));
   if(e1<.09||e2<.09)col=vec3(.16,.1,.35);
   float mr=abs(length(p.xy-vec2(0.,.08))-.36);if(mr<.035&&p.y<-.12&&p.z>0.)col=vec3(.16,.1,.35);
   if(length(p.xy-vec2(-.5,-.12))<.075||length(p.xy-vec2(.5,-.12))<.075)col=mix(col,vec3(1.,.55,.65),.8);}
  else{float y=p.y+(fbm(p*vec3(3.,5.,3.)+uTime*.01)-.5)*.16;float fr=uType==2?7.:5.;float b=floor(fract(y*fr)*4.);
   vec3 a=uType==2?vec3(1.,.66,.3):vec3(1.,.82,.3);vec3 b2=uType==2?vec3(1.,.42,.55):vec3(.98,.6,.78);vec3 c3=uType==2?vec3(1.,.9,.68):vec3(1.,.95,.7);vec3 d4=uType==2?vec3(.86,.38,.62):vec3(.7,.5,.95);
   col=b<1.?a:b<2.?b2:b<3.?c3:d4;
   if(uType==2){float sp=length((p.xz-vec2(.6,.0)))+abs(y+.3)*1.3;col=mix(col,vec3(.9,.25,.3),step(sp,.22));}}
  float s=ndl>.3?1.:ndl>-.15?.82:.62;col*=s;
  float rim=smoothstep(.6,.66,1.-max(dot(n,V),0.));col=mix(col,vec3(.16,.1,.35),rim);
  gl_FragColor=vec4(col*uTint,1.);}`});
}
export function atmosphereMaterial(color){
 return new THREE.ShaderMaterial({uniforms:{uSun:{value:new THREE.Vector3(1,.3,.4).normalize()},uCol:{value:new THREE.Color(color)}},transparent:true,depthWrite:false,
 vertexShader:`varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
 fragmentShader:`uniform vec3 uCol;varying vec3 vN;varying vec3 vW;void main(){vec3 n=normalize(vN);vec3 V=normalize(cameraPosition-vW);float f=1.-max(dot(n,V),0.);float a=smoothstep(.55,.95,f)*.55;gl_FragColor=vec4(uCol,a);}`});
}
export function ringMaterial(){
 return new THREE.ShaderMaterial({uniforms:{uSun:{value:new THREE.Vector3(1,.3,.4).normalize()}},transparent:true,side:THREE.DoubleSide,depthWrite:false,
 vertexShader:`varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 vP;void main(){float r=length(vP.xy);float t=(r-1.3);float bnd=floor(t*5.);vec3 c=mod(bnd,2.)<1.?vec3(1.,.62,.8):vec3(1.,.9,.45);float a=t>0.&&t<1.?1.:0.;float edge=smoothstep(.0,.03,t)*smoothstep(.0,.03,1.-t);if(t<.035||t>.965)c=vec3(.16,.1,.35);if(abs(t-.55)<.03)a=0.;gl_FragColor=vec4(c,a*edge);}`});
}
export function galaxyMaterial(){
 return new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uTop:{value:new THREE.Color(.1,.06,.45)},uBot:{value:new THREE.Color(.55,.25,.85)},uTint:{value:new THREE.Color(.35,.55,1)},uTint2:{value:new THREE.Color(1,.45,.8)}},
 vertexShader:`varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform vec3 uTop;uniform vec3 uBot;uniform vec3 uTint;uniform vec3 uTint2;varying vec3 vD;${NOISE_GLSL}
 void main(){vec3 d=normalize(vD);vec3 col=mix(uBot,uTop,smoothstep(-.55,.85,d.y));
  float n=fbm(d*2.2+1.3);float n2=fbm(d*3.1+9.);
  col=mix(col,uTint,step(.56,n)*.5);col=mix(col,uTint*1.25,step(.64,n)*.35);
  col=mix(col,uTint2,step(.6,n2)*.4);col=mix(col,uTint2*1.2,step(.68,n2)*.3);
  gl_FragColor=vec4(col,1.);}`});
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
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uHit:{value:0},uTime:{value:0},uLevel:{value:1}},
 vertexShader:`varying vec3 vN;varying vec3 vV;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform float uHit;uniform float uTime;uniform float uLevel;varying vec3 vN;varying vec3 vV;
 void main(){float f=1.-max(dot(normalize(vN),normalize(vV)),0.);float rim=smoothstep(.72,.9,f);float a=(rim*.1)*uLevel+uHit*(.25+f*.6);vec3 c=mix(vec3(.55,.95,1.),vec3(1.,.5,.4),uHit);gl_FragColor=vec4(c,a);}`});
}
export function flameMaterial(){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,uniforms:{uTime:{value:0},uPow:{value:1}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform float uTime;uniform float uPow;varying vec2 vUv;
 void main(){float l=vUv.y;float fl=.75+.25*sin(uTime*60.+l*12.)*sin(uTime*37.);vec3 core=vec3(.75,.9,1.);vec3 out_=vec3(.2,.45,1.);vec3 c=mix(core,out_,smoothstep(.0,.8,l));
  float a=(1.-l)*(1.-l)*fl;gl_FragColor=vec4(c*2.4*uPow,a*uPow);}`});
}
export const FinalPass={
 uniforms:{tDiffuse:{value:null},uTime:{value:0},uAberr:{value:.0015},uVig:{value:.55},uFlash:{value:0},uFlashCol:{value:new THREE.Color(1,1,1)},uDamage:{value:0},uBlur:{value:0},uSat:{value:1.18},uCon:{value:1.06}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform float uTime;uniform float uAberr;uniform float uVig;uniform float uFlash;uniform vec3 uFlashCol;uniform float uDamage;uniform float uBlur;uniform float uSat;uniform float uCon;varying vec2 vUv;
 void main(){vec2 uv=vUv;vec2 c=uv-.5;float r=dot(c,c);vec2 off=c*(uAberr*(.4+r*3.));vec3 col=vec3(0.);
  for(int i=0;i<6;i++){float k=float(i)/5.;vec2 o=c*uBlur*k;col+=vec3(texture2D(tDiffuse,uv-o+off).r,texture2D(tDiffuse,uv-o).g,texture2D(tDiffuse,uv-o-off).b)/6.;}
  float l=dot(col,vec3(.2126,.7152,.0722));col=mix(vec3(l),col,uSat);col=(col-.18)*uCon+.18;
  col+=vec3(-.012,.004,.022)*(1.-smoothstep(0.,.5,l));col+=vec3(.035,.014,-.01)*smoothstep(.6,2.,l);
  col*=1.-uVig*.55*smoothstep(.12,.7,r*1.5);
  float g=fract(sin(dot(uv*vec2(1731.,1113.)+fract(uTime)*91.,vec2(12.9898,78.233)))*43758.5453);col+=(g-.5)*.012;
  col=mix(col,uFlashCol*1.6,uFlash);col+=vec3(.95,.04,.06)*uDamage*smoothstep(.05,.55,r*2.2);gl_FragColor=vec4(max(col,0.),1.);}`
};
const _om={};
export function outlineMaterial(t=.05,c=0x2a1b5a){const k=t+'_'+c;if(_om[k])return _om[k];
 return _om[k]=new THREE.ShaderMaterial({side:THREE.BackSide,uniforms:{uT:{value:t},uC:{value:new THREE.Color(c)}},fog:false,
 vertexShader:`uniform float uT;void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position+normal*uT,1.);}`,
 fragmentShader:`uniform vec3 uC;void main(){gl_FragColor=vec4(uC,1.);}`})}

export function skyMaterial(){
 return new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{uTop:{value:new THREE.Color(.02,.03,.12)},uBot:{value:new THREE.Color(.12,.1,.4)},uTint:{value:new THREE.Color(.2,.35,1)},uTint2:{value:new THREE.Color(.9,.25,.75)},uSpiral:{value:0}},
 vertexShader:`varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform vec3 uTop;uniform vec3 uBot;uniform vec3 uTint;uniform vec3 uTint2;uniform float uSpiral;varying vec3 vD;${NOISE_GLSL}
 void main(){vec3 d=normalize(vD);vec3 base=mix(uBot,uTop,smoothstep(-.6,.9,d.y))*.55;
  vec3 gn=normalize(vec3(.35,.82,.3));float b=dot(d,gn);float band=exp(-b*b*20.);float core=exp(-b*b*120.);
  float dust=fbm(d*5.)*fbm(d*12.+3.);float n=fbm(d*3.+1.);
  vec3 mw=mix(uTint2*.9,vec3(1.,.92,.8),n)*band*(.4+1.8*dust);mw*=smoothstep(.03,.3,dust+.22);mw+=vec3(1.,.85,.6)*core*n*.35;
  float n1=smoothstep(.46,.86,fbm(d*2.1+7.));float n2=smoothstep(.5,.88,fbm(d*2.7+19.));float n3=smoothstep(.55,.9,fbm(d*4.4+3.));vec3 neb=uTint*n1*n1*1.5+uTint2*n2*n2*1.3+mix(uTint,uTint2,.5)*n3*.7;
  vec3 sp=vec3(0.);if(uSpiral>.01){vec3 c=normalize(vec3(.3,.42,-.85));vec3 ax=normalize(cross(c,vec3(0.,1.,0.)));vec3 ay=cross(c,ax);float rr=acos(clamp(dot(d,c),-1.,1.))/.55;float an=atan(dot(d,ay),dot(d,ax));
  float arms=pow(.5+.5*sin(2.*an+rr*9.-fbm(d*6.)*2.),2.5);float fall=exp(-rr*rr*1.6)*step(0.,dot(d,c));float core=exp(-rr*rr*14.);
  sp=(mix(uTint,uTint2,.5+.5*sin(an*2.+rr*3.))*arms*.75+vec3(1.,.85,.7)*core*.6)*fall*uSpiral;}
  gl_FragColor=vec4(base*.32+mw*.42+neb*.36+sp,1.);}`});
}
