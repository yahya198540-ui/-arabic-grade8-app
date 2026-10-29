import {rng} from './textures.js';
/* وحدات المسافة ≈ متر. السرعة المعتادة 44 وحدة/ث.
   عند نقطة السؤال (STOPS) تتحول المركبة إلى «التحليق الآمن» (سرعة هادئة وبلا اصطدام)،
   ثم تُستأنف العقبات بعد LEAD وحدة. بين سؤالين نحو 22–26 ثانية طيران فعلي. */
export const BASE=44,CRUISE=9,LEAD=260,CLEAR=40;
export const SEG=[1150,1200,1200,1250,1250,1200,1250,1200,1250,1200];
export const STOPS=SEG.reduce((a,l)=>{a.push((a.length?a[a.length-1]:0)+l);return a},[]);
export const ZONE_OF_SEG=[0,0,0,1,1,1,1,2,2,3];
export function buildLevel(){
 const r=rng(2030),objs=[],gates=[],starts=[];let acc=0;
 SEG.forEach(l=>{starts.push(acc);acc+=l;gates.push({d:acc,open:false,t:0})});
 const P=o=>{objs.push(o);return o};
 const cell=(d,x,y)=>P({t:'cell',d,x,y,got:false});
 const cellLine=(d,x,y,n,st=7,dx=0,dy=0)=>{for(let i=0;i<n;i++)cell(d+i*st,x+i*dx,y+i*dy)};
 const cellWave=(d,n,amp,per=6,st=7,cx=0,cy=0)=>{for(let i=0;i<n;i++)cell(d+i*st,cx+Math.sin(i*6.283/per)*amp,cy+Math.cos(i*6.283/per)*amp*.45)};
 const cellArc=(d,x,y,rad,n=8)=>{for(let i=0;i<n;i++){const a=i/n*6.283;cell(d,x+Math.cos(a)*rad,y+Math.sin(a)*rad*.7)}};
 const rock=(d,x,y,rr,o={})=>P(Object.assign({t:'rock',d,x,y,r:rr,v:(r()*6)|0,seed:r()*9,spin:(r()-.5)*.7,vx:0,vy:0},o));
 const hero=(d,x,y,rr)=>{const sx=x<0?-1:1,mx=Math.max(Math.abs(x),rr+30);return rock(d,sx*mx,y,rr,{decor:true,spin:(r()-.5)*.12})}; // صخور ضخمة جانبية للعمق (لا تعترض المسار)
 const shard=(d,x,y,rr)=>rock(d,x,y,rr,{shard:true,spin:(r()-.5)*.3});
 const meteor=(trig,x,y,vx,vy,rr=2.4)=>P({t:'meteor',d:trig,trig,x,y,vx,vy,r:rr,spawned:false,warned:false});
 const debris=(d,x,y,rr,k)=>P({t:'debris',d,x,y,r:rr,kind:k,seed:r()*6,spin:(r()-.5)*1.2});
 const heal=(d,x,y)=>P({t:'heal',d,x,y,got:false});
 const strike=(d,x,y)=>P({t:'strike',d,x,y,r:6.5,ph:r()*3});
 const current=(d,len,x,y,w,h,fx,fy)=>P({t:'current',d,len,x,y,w,h,fx,fy});
 const cloud=(d,x,y,sz,c,add=true)=>P({t:'cloud',d,x,y,sz,c,add});
 const lights=(d,n,st)=>{for(let i=0;i<n;i++){P({t:'lamp',d:d+i*st,x:-12,y:-4});P({t:'lamp',d:d+i*st,x:12,y:-4})}};
 const S=i=>starts[i]+LEAD,E=i=>gates[i].d-CLEAR,T=i=>gates[i].d;

 /* ======== المنطقة ١: الانطلاق من الأرض ======== */
 {const s=S(0);cellLine(s+10,0,0,7);cellWave(s+120,10,4);
  debris(s+250,-6,2.5,1.7,0);debris(s+300,6.5,-2,1.5,1);rock(s+420,-7,1,2.6,{vx:1.2});rock(s+470,7,-2,2.8,{vx:-1.3});
  cellArc(s+560,0,0,7.5);rock(s+560,0,0,2.4);debris(s+700,-4,-2,1.8,2);rock(s+760,5,2,3.2,{vy:-1});cellLine(s+640,0,0,5);
  cellWave(s+820,8,3.2);hero(s+300,-70,-60,28)}
 {const s=S(1);for(let k=0;k<6;k++){const sd=k%2?1:-1;rock(s+10+k*80,sd*5.4,sd*1.4,3.6,{vx:-sd*1.4});cell(s+50+k*80,-sd*4,-sd*1.2);cell(s+60+k*80,-sd*3.2,-sd)}
  debris(s+560,-2,3,2.2,0);debris(s+610,3,-2,2,1);debris(s+660,0,0,2.2,2);cellWave(s+520,10,3.6);heal(s+700,2,1);
  rock(s+780,-6,2,3.8,{vy:-1.2});rock(s+800,6,-2,3.6,{vy:1.2});cellLine(s+740,0,0,4);hero(s+400,60,50,34)}
 {const s=S(2);const sp=[[-7,3.5,2.2,-1.1],[7,-3,-2.2,1],[-3,4.5,1.2,-1.5],[6,3,-2,-1],[-6,-3.5,2.4,1.2],[2,5,-.8,-1.6],[-4,-4,1.6,1.6],[5,-4.5,-1.4,1.8]];
  sp.forEach((m,k)=>meteor(s+10+k*92,m[0]*1.25,m[1],m[2],m[3]));
  rock(s+160,0,0,3.6);rock(s+520,2,0,4);rock(s+700,-5,-2,3.4,{vx:1});cellWave(s+60,8,3.5);cellWave(s+400,8,4,6,7,0,-.5);heal(s+470,3,2);cellWave(s+590,7,3);cellLine(s+780,0,0,5)}

 /* ======== المنطقة ٢: حزام الكويكبات ======== */
 {const s=S(3);const ys=[2.6,-3,.5,4,-1.5,3.2,-3.8,1,-2.4,3.8,0,-3.2,2];
  for(let k=0;k<12;k++){const d=s+k*36,y=ys[k],x=(k*5.3%15)-7.5,rr=3.4+(k%4)*.8;rock(d,x,y,rr,{vx:(k%3-1)*1.6,vy:(k%2?1:-1)*.8});
   if(k%3===0){const x2=x<0?x+12:x-12;rock(d,Math.max(-9.5,Math.min(9.5,x2)),-y,2.8)}cell(d+18,-x*.7,-y*.8);cell(d+24,-x*.6,-y*.7)}
  hero(s+60,-60,10,40);hero(s+300,70,-20,46);hero(s+520,-50,-40,32);hero(s+700,55,40,38)}
 {const s=S(4); // ثلاثة مسارات آمنة: يسار/وسط/يمين
  for(let k=0;k<9;k++){const d=s+30+k*80;rock(d,-5,0,3.6+(k%3),{spin:.5});rock(d,5,0,3.4+(k%2)*1.2,{spin:-.5});rock(d,0,(k%2?3.2:-3.2),3,{spin:.6}) ;
   const lane=[-8,0,8][(k*7)%3];cell(d+20,lane*.8,0);cell(d+30,lane*.8,0)}
  hero(s+120,-65,30,44);hero(s+400,60,-30,50);hero(s+650,-55,-45,36)}
 {const s=S(5); // وادٍ بين كويكبين عملاقين مع تعرّج
  const cx=dd=>5*Math.sin(dd/70)*Math.min(1,dd/60);for(let dd=0;dd<=520;dd+=26){const c=cx(dd);rock(s+80+dd,c-11-(dd%52?0:2),((dd/26)%2?2:-2),5.2+((dd/26)%3));rock(s+80+dd,c+11+(dd%52?2:0),((dd/26)%2?-2:2),5.2+((dd/26)%3))}
  for(let dd=40;dd<500;dd+=14)cell(s+80+dd,cx(dd),Math.sin(dd/50)*2);
  meteor(s+300,-9,3,3,-1.2,2.6);meteor(s+420,9,-3,-3,1.2,2.6);hero(s+200,-80,40,50);hero(s+520,80,-30,56)}
 {const s=S(6); // أحجار تعبر عرضيًّا بسرعات مختلفة
  for(let k=0;k<12;k++){const d=s+k*70;rock(d,(k%2?-9:9),((k*3)%5)-2,3.2+(k%3)*.8,{vx:(k%2?1:-1)*(3+(k%3)*1.4),vy:((k%3)-1)*.8})}
  for(let k=0;k<6;k++)meteor(s+60+k*120,(k%2?1:-1)*(6+k%3),(k%3-1)*3.5,-(k%2?1:-1)*2,(k%3-1)*-1.2,2.6);
  heal(s+330,0,0);cellLine(s+100,-8,-3,12,40,1.4,.5);cellLine(s+130,6,3,10,40,-1.2,-.4);hero(s+200,-70,-30,42);hero(s+620,70,35,48)}

 /* ======== المنطقة ٣: السديم الكوني ======== */
 {const s=S(7);
  for(let k=0;k<26;k++){const d=s+k*38-80;cloud(d,((k*53)%140)-70,((k*29)%80)-40,70+(k%4)*40,k%4,k%3!==0)}
  shard(s+60,-6,2,3.4);shard(s+80,-5,-1,2.4);shard(s+250,6,-2,3.6);shard(s+270,7,1,2.6);shard(s+460,-3,3,3.2);shard(s+620,5,0,3.8);
  current(s+120,220,0,0,26,14,5.5,0);current(s+520,200,0,0,26,14,-6,2.5);
  cellWave(s+40,12,3.8,6,9);cellWave(s+300,12,3.8,6,9);heal(s+410,0,0);cellLine(s+700,0,0,6,12)}
 {const s=S(8);
  for(let k=0;k<26;k++){const d=s+k*38-80;cloud(d,((k*71)%150)-75,((k*37)%90)-45,80+(k%4)*40,(k+1)%4,k%2===0)}
  strike(s+60,-6,1);strike(s+160,6,-1.5);strike(s+260,0,2);strike(s+360,-7,-2);strike(s+460,7,2);strike(s+560,0,-1);strike(s+660,-5,2);
  shard(s+110,0,-3,3);shard(s+310,-3,1,3.4);shard(s+520,4,2,3.2);current(s+200,170,0,0,26,14,-5,-2);current(s+600,160,0,0,26,14,5,2);
  cellWave(s+30,14,4,7,9);cellWave(s+400,10,4,6,9);heal(s+300,3,0);cellLine(s+740,0,0,6,12)}

 /* ======== المنطقة ٤: الاقتراب من المحطة ======== */
 {const s=S(9);
  for(let k=0;k<10;k++){const d=s+k*70;debris(d,((k*7.1)%16)-8,(((k*3.7)%9)-4.5),2.2+(k%3)*.6,k%3)}
  rock(s+150,-5,2,3.6,{vx:1.5});rock(s+330,5,-2,3.6,{vx:-1.5});rock(s+560,0,3,3.2,{vy:-1.4});
  cellWave(s+60,12,3.6,6,9);cellWave(s+360,12,3.6,6,9);heal(s+300,0,0);cellLine(s+620,0,0,8,12);
  for(let k=0;k<5;k++)cloud(s+k*160,((k*61)%100)-50,((k*37)%50)-25,90,k%4,true);lights(s+880,6,26)}
 objs.sort((a,b)=>a.d-b.d);
 return {objs,gates,starts};
}
