import {rng} from './textures.js';
/* وحدات المسافة ≈ متر. السرعة المعتادة 44 وحدة/ث → 900–1100 وحدة ≈ 20–25 ثانية (+ تباطؤ عند البوابة) */
export const BASE=44,STOP_BEFORE=16,SLOW_ZONE=70;
export const SEG=[900,980,1020,1000,1080,980,1040,960,1020,1060];
export const LEAD=150,CLEAR=130;
export function buildLevel(){
 const r=rng(2024),objs=[],gates=[],starts=[];let acc=0;
 SEG.forEach(l=>{starts.push(acc);acc+=l;gates.push({d:acc,open:false,t:0})});
 const P=o=>{objs.push(o);return o};
 const cell=(d,x,y)=>P({t:'cell',d,x,y,got:false});
 const cellLine=(d,x,y,n,st=7,dx=0,dy=0)=>{for(let i=0;i<n;i++)cell(d+i*st,x+i*dx,y+i*dy)};
 const cellWave=(d,n,amp,per=6,st=7,cx=0,cy=0)=>{for(let i=0;i<n;i++)cell(d+i*st,cx+Math.sin(i*6.283/per)*amp,cy+Math.cos(i*6.283/per)*amp*.45)};
 const cellArc=(d,x,y,rad,n=8)=>{for(let i=0;i<n;i++){const a=i/n*6.283;cell(d,x+Math.cos(a)*rad,y+Math.sin(a)*rad*.7)}};
 const rock=(d,x,y,rr,v=-1)=>P({t:'rock',d,x,y,r:rr,v:v<0?(r()*6)|0:v,seed:r()*9,spin:(r()-.5)*.5});
 const meteor=(trig,x,y,vx,vy,rr=2.4)=>P({t:'meteor',d:trig,trig,x,y,vx,vy,r:rr,spawned:false,warned:false});
 const debris=(d,x,y,rr,k)=>P({t:'debris',d,x,y,r:rr,kind:k,seed:r()*6,spin:(r()-.5)*1.2});
 const heal=(d,x,y)=>P({t:'heal',d,x,y,got:false});
 const gantry=(d,x,y)=>P({t:'gantry',d,x,y});
 const beam=(d,x,y,w,ph)=>P({t:'beam',d,x,y,w,ph});
 const moon=(d,x,y,rr)=>P({t:'moon',d,x,y,r:rr});
 const tunnel=(d0,len,A,B,per,Rr=6.6,cells=true)=>{
  const fx=dd=>A*Math.sin(dd/per)*Math.min(1,dd/50)*Math.min(1,(len-dd)/50),fy=dd=>B*Math.sin(dd/per*1.3+1)*Math.min(1,dd/50)*Math.min(1,(len-dd)/50);
  for(let dd=0;dd<=len;dd+=11){const cx=fx(dd),cy=fy(dd);for(let k=0;k<8;k++){const a=k/8*6.283+dd*.06;const rr=2.9+r()*1.1;rock(d0+dd,cx+Math.cos(a)*(Rr+2.6),cy+Math.sin(a)*(Rr+2.6),rr)}}
  if(cells)for(let dd=30;dd<len-20;dd+=14)cell(d0+dd,fx(dd),fy(dd));return {fx,fy}};
 const S=i=>starts[i]+LEAD,E=i=>gates[i].d-CLEAR,G=i=>gates[i].d;

 /* ===== المرحلة ١: الانطلاق ===== */
 { // ١: حطام مداري خفيف
  const s=S(0);cellLine(s+10,0,0,7);debris(s+110,-6,2.5,1.6,0);debris(s+130,6.5,-2,1.4,1);cellWave(s+190,10,4);
  rock(s+320,0,0,4.2);cellArc(s+320,0,0,7.5);rock(s+440,-6.5,3,3.2);rock(s+470,6.5,-3,3.4);cellLine(s+430,0,0,5);
  debris(s+560,-5,-2,1.8,2);rock(s+590,6,2,3);cellWave(s+540,9,3.5,5,7,-1,0);cellLine(E(0)-110,0,0,6)}
 { // ٢: انزلاق بين الصخور + حلقات هيكلية
  const s=S(1);for(let k=0;k<6;k++){const sd=k%2?1:-1;rock(s+10+k*75,sd*5.4,sd*1.4,3.8);cell(s+48+k*75,-sd*4,-sd*1.2);cell(s+58+k*75,-sd*3.2,-sd*1)}
  gantry(s+520,0,0);gantry(s+590,2,-1);gantry(s+660,-2,1);cellLine(s+500,0,0,4,6);cellLine(s+575,1.5,-.8,3,10,.4,-.2);
  rock(s+720,-6,2,3.6);rock(s+745,6,-2,3.6);cellLine(E(1)-80,0,0,5)}
 { // ٣: القمر + وابل نيازك
  const s=S(2);moon(s+260,-64,-9,30);
  const sp=[[-7,3.5,2.2,-1.1],[7,-3,-2.2,1],[-3,4.5,1.2,-1.5],[6,3,-2,-1],[-6,-3.5,2.4,1.2],[2,5,-.8,-1.6],[-4,-4,1.6,1.6],[5,-4.5,-1.4,1.8]];
  sp.forEach((m,k)=>meteor(s+10+k*92,m[0]*1.25,m[1],m[2],m[3]));
  rock(s+160,0,0,4);rock(s+520,2,0,4.4);rock(s+700,-5,-2,3.6);cellWave(s+60,8,3.5);cellWave(s+400,8,4,6,7,0,-.5);heal(s+470,3,2);cellWave(s+590,7,3);cellLine(E(2)-90,0,0,5)}

 /* ===== المرحلة ٢: حزام الكويكبات ===== */
 { // ٤: حقل كثيف
  const s=S(3);const ys=[2.6,-3,.5,4,-1.5,3.2,-3.8,1,-2.4,3.8,0,-3.2,2];
  for(let k=0;k<13;k++){const d=s+k*36,y=ys[k],x=(k*5.3%15)-7.5,rr=4.4+(k%4)*.9;rock(d,x,y,rr);
   if(k%3===0){const x2=x<0?x+12:x-12;rock(d,Math.max(-9.5,Math.min(9.5,x2)),-y,3.3)}cell(d+18,-x*.7,-y*.8);cell(d+24,-x*.6,-y*.7)}
  rock(s+300,-8,0,7);rock(s+300,8,.5,7);cellLine(E(3)-100,0,0,5)}
 { // ٥: نفق صخري طويل
  const s=S(4);const T=tunnel(s+60,500,5,2.4,52,6.6);
  rock(s+620,-7,0,6.2);rock(s+620,7,0,6.2);cellLine(s+600,0,0,6,6);
  rock(s+700,2,3,3.8);rock(s+750,-2,-3,3.8);cellWave(s+660,8,3.5);cellLine(E(4)-80,0,0,5)}
 { // ٦: نيازك مائلة + أعمدة صخرية
  const s=S(5);const cols=[[100,4,2],[190,-4,-2],[280,3,-3],[370,-5,2],[460,2,3],[550,-3,-1.5],[640,5,1]];
  cols.forEach(c=>rock(s+c[0],c[1],c[2],4.6+r()*1.6));
  for(let k=0;k<8;k++)meteor(s+10+k*98,(k%2?1:-1)*(6+k%3),(k%3-1)*3.5,-(k%2?1:-1)*1.9,(k%3-1)*-1.2,2.6);
  heal(s+330,0,0);cellWave(s+150,8,3.4);cellWave(s+420,8,3.8);cellLine(E(5)-90,0,0,5)}
 { // ٧: أخاديد ضيقة
  const s=S(6);tunnel(s+20,280,4,4,28,6.2);rock(s+340,-5,-2,3.8);rock(s+370,5,2,3.8);tunnel(s+430,330,6.2,2,40,6.2);cellLine(E(6)-90,0,0,5)}

 /* ===== المرحلة ٣: المحطة ===== */
 { // ٨: حطام المحطة + أول حزمة
  const s=S(7);for(let k=0;k<12;k++){const d=s+k*30;debris(d,((k*7.1)%16)-8,(((k*3.7)%9)-4.5),2.2+(k%3)*.6,k%3)}
  beam(s+420,0,0,.9,0);cellLine(s+380,0,0,4,6);heal(s+520,0,0);beam(s+640,0,0,-.9,1.3);cellWave(s+470,6,3.4);cellLine(E(7)-90,0,0,5)}
 { // ٩: ممر الحزم
  const s=S(8);beam(s+30,0,0,1,0);beam(s+160,0,0,-1.1,1.1);gantry(s+260,0,0);beam(s+360,0,0,1.2,2.3);gantry(s+440,1.5,-1);beam(s+540,0,0,-1.3,.7);
  debris(s+620,-6,2,2.4,1);debris(s+660,6,-2,2.4,2);cellLine(s+20,0,0,4,6);cellLine(s+250,0,0,4,6);cellLine(s+430,1.2,-.8,4,6);cellWave(s+560,8,3.5);cellLine(E(8)-90,0,0,5)}
 { // ١٠: الانطلاقة الأخيرة
  const s=S(9);meteor(s+10,-7,3,2,-1.2,2.8);meteor(s+60,7,-3,-2,1.2,2.8);debris(s+130,-6,2,2.6,0);debris(s+160,6,-2,2.6,1);
  beam(s+240,0,0,1.2,0);beam(s+330,0,0,-1.3,1.5);heal(s+390,0,0);tunnel(s+450,260,4.6,2.5,34,6.4);
  meteor(s+740,-6,-2,2,1,2.8);cellLine(E(9)-110,0,0,6)}
 objs.sort((a,b)=>a.d-b.d);
 return {objs,gates,starts};
}
