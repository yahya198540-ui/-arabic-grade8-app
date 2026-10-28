import * as THREE from 'three';
import {mergeVertices} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const h3=(x,y,z)=>{const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n)};
export function vnoise(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),w=fz*fz*(3-2*fz);
 const a=(dx,dy,dz)=>h3(ix+dx,iy+dy,iz+dz),l=(p,q,t)=>p+(q-p)*t;
 return l(l(l(a(0,0,0),a(1,0,0),u),l(a(0,1,0),a(1,1,0),u),v),l(l(a(0,0,1),a(1,0,1),u),l(a(0,1,1),a(1,1,1),u),v),w)}
export function fbm3(x,y,z,o=5){let a=.5,s=0,f=1;for(let i=0;i<o;i++){s+=a*vnoise(x*f,y*f,z*f);f*=2.03;a*=.5}return s}

/* خامة صخرية بحُفَر */
export function rockTexture(seed,base,size=384){
 const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d'),im=x.createImageData(size,size),r=rng(seed);
 for(let j=0;j<size;j++)for(let i=0;i<size;i++){
  // ضجيج دائري التكرار تقريبًا عبر إسقاط على أسطوانة
  const u=i/size*6.2832,w=Math.cos(u)*1.2,z=Math.sin(u)*1.2,y=j/size*3+seed;
  const n=fbm3(w+seed,y,z,6),m=fbm3(w*4+9,y*4,z*4,3),k=.35+n*.9+(m-.5)*.25;
  const p=(j*size+i)*4;im.data[p]=Math.min(255,base[0]*k);im.data[p+1]=Math.min(255,base[1]*k);im.data[p+2]=Math.min(255,base[2]*k);im.data[p+3]=255}
 x.putImageData(im,0,0);
 for(let n=0;n<26;n++){const cx=r()*size,cy=r()*size,rad=6+r()*r()*40;
  for(const ox of[-size,0,size]){const g=x.createRadialGradient(cx+ox,cy,rad*.2,cx+ox,cy,rad);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(.7,'rgba(0,0,0,.25)');g.addColorStop(.9,'rgba(255,255,255,.28)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.beginPath();x.arc(cx+ox,cy,rad,0,6.283);x.fill()}}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t}

/* هندسة صخرة (كوكبية غير منتظمة) */
export function rockGeometry(seed){
 let g=new THREE.IcosahedronGeometry(1,4);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g,1e-4);
 const p=g.attributes.position,r=rng(seed),sx=.8+r()*.4,sy=.7+r()*.4,sz=.8+r()*.4,v=new THREE.Vector3();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const n=fbm3(v.x*1.6+seed,v.y*1.6,v.z*1.6,4),m=fbm3(v.x*5+seed,v.y*5,v.z*5,3);
  const d=1+(n-.5)*.7+(m-.5)*.16;p.setXYZ(i,v.x*d*sx,v.y*d*sy,v.z*d*sz)}
 g.computeVertexNormals();
 const uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).normalize();uv[i*2]=Math.atan2(v.z,v.x)/6.2832+.5;uv[i*2+1]=Math.acos(v.y)/Math.PI}
 g.setAttribute('uv',new THREE.BufferAttribute(uv,2));return g}

/* لوحات معدنية للمركبة والمحطة */
export function panelTexture(base=[225,230,236],size=512,stripe=null){
 const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
 x.fillStyle=`rgb(${base})`;x.fillRect(0,0,size,size);
 const r=rng(5);
 for(let i=0;i<400;i++){x.fillStyle=`rgba(${r()<.5?0:255},${r()<.5?0:255},${r()<.5?0:255},${.02+r()*.05})`;x.fillRect(r()*size,r()*size,r()*60,r()*40)}
 x.strokeStyle='rgba(30,40,55,.55)';x.lineWidth=2;
 for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*size/4,0);x.lineTo(i*size/4,size);x.stroke();x.beginPath();x.moveTo(0,i*size/4);x.lineTo(size,i*size/4);x.stroke()}
 x.fillStyle='rgba(30,40,55,.7)';for(let i=0;i<4;i++)for(let j=0;j<4;j++)for(const[a,b]of[[8,8],[size/4-8,8],[8,size/4-8],[size/4-8,size/4-8]]){x.beginPath();x.arc(i*size/4+a,j*size/4+b,2.2,0,6.283);x.fill()}
 if(stripe){x.fillStyle=stripe;x.fillRect(0,size*.42,size,size*.07)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t}

export function solarTexture(){
 const s=256,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');
 const g=x.createLinearGradient(0,0,s,s);g.addColorStop(0,'#0e2a6b');g.addColorStop(.5,'#1b46a8');g.addColorStop(1,'#0b1f55');x.fillStyle=g;x.fillRect(0,0,s,s);
 x.strokeStyle='rgba(200,215,255,.35)';x.lineWidth=1.5;for(let i=0;i<=8;i++){x.beginPath();x.moveTo(i*s/8,0);x.lineTo(i*s/8,s);x.stroke();x.beginPath();x.moveTo(0,i*s/8);x.lineTo(s,i*s/8);x.stroke()}
 x.strokeStyle='#d8b45a';x.lineWidth=6;x.strokeRect(0,0,s,s);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t}

export function glowTexture(){
 const s=128,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d'),g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.2,'rgba(255,255,255,.55)');g.addColorStop(.5,'rgba(255,255,255,.12)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,s,s);
 return new THREE.CanvasTexture(c)}

export function labelTexture(text,color='#ffffff',size=256){
 const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
 x.font=`900 ${size*.62}px "Segoe UI",Tahoma,"Noto Sans Arabic",sans-serif`;x.textAlign='center';x.textBaseline='middle';
 x.shadowColor=color;x.shadowBlur=24;x.fillStyle=color;x.fillText(text,size/2,size/2+size*.03);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
