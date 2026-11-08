import {rng} from '../textures.js';
/* مستوى «تحدي الهمزة»: أسهل (سرعة أقل، عقبات أقل، لا زعيم) وبالإيقاع نفسه: 6 مقاطع في 4 مناطق */
export const BASE=38,CRUISE=14,LEAD=240,CLEAR=40;
export const ZONE_K=[1,1.08,1,.9];
export const SEG=[1000,1000,1060,1060,1000,900];
export const STOPS=SEG.reduce((a,l)=>{a.push((a.length?a[a.length-1]:0)+l);return a},[]);
export function buildLevel(){
 const r=rng(2031),objs=[],gates=[],starts=[];let acc=0;
 SEG.forEach(l=>{starts.push(acc);acc+=l;gates.push({d:acc,open:false,t:0})});
 const P=o=>{objs.push(o);return o};
 const cell=(d,x,y)=>P({t:'cell',d,x,y,got:false});
 const cellLine=(d,x,y,n,st=7,dx=0,dy=0)=>{for(let i=0;i<n;i++)cell(d+i*st,x+i*dx,y+i*dy)};
 const cellWave=(d,n,amp,per=6,st=7,cx=0,cy=0)=>{for(let i=0;i<n;i++)cell(d+i*st,cx+Math.sin(i*6.283/per)*amp,cy+Math.cos(i*6.283/per)*amp*.45)};
 const cellArc=(d,x,y,rad,n=8)=>{for(let i=0;i<n;i++){const a=i/n*6.283;cell(d,x+Math.cos(a)*rad,y+Math.sin(a)*rad*.7)}};
 const rock=(d,x,y,rr,o={})=>P(Object.assign({t:'rock',d,x,y,r:rr,v:(r()*6)|0,seed:r()*9,spin:(r()-.5)*.7,vx:0,vy:0},o));
 const hero=(d,x,y,rr)=>{const sx=x<0?-1:1,mx=Math.max(Math.abs(x),rr+30);return rock(d,sx*mx,y,rr,{decor:true,spin:(r()-.5)*.12})};
 const shard=(d,x,y,rr)=>rock(d,x,y,rr,{shard:true,spin:(r()-.5)*.3});
 const meteor=(trig,x,y,vx,vy,rr=2.4)=>P({t:'meteor',d:trig,trig,x,y,vx,vy,r:rr,spawned:false,warned:false});
 const debris=(d,x,y,rr,k)=>P({t:'debris',d,x,y,r:rr,kind:k,seed:r()*6,spin:(r()-.5)*1.2});
 const heal=(d,x,y)=>P({t:'heal',d,x,y,got:false});
 const strike=(d,x,y)=>P({t:'strike',d,x,y,r:5.6,ph:r()*3});
 const current=(d,len,x,y,w,h,fx,fy)=>P({t:'current',d,len,x,y,w,h,fx,fy});
 const surge=(d,len,x,y)=>P({t:'surge',d,len,x,y,w:22,h:12,fx:0,fy:0});
 const cloud=(d,x,y,sz,c,add=true)=>P({t:'cloud',d,x,y,sz,c,add});
 const lights=(d,n,st)=>{for(let i=0;i<n;i++){P({t:'lamp',d:d+i*st,x:-12,y:-4});P({t:'lamp',d:d+i*st,x:12,y:-4})}};
 const tip=(d,text,ms=5200)=>P({t:'tip',d,text,ms});
 const drones=(d,end,n,cd)=>P({t:'drones',d,end,n,cd});
 const S=i=>starts[i]+LEAD;

 /* ===== المنطقة ١: الانطلاق من الأرض (سؤالان) ===== */
 {const s=S(0);tip(s+5,'🖱️ حرّك الفأرة (أو اسحب بإصبعك) لتوجيه المركبة · اجمع بلورات الطاقة 💎');
  cellLine(s+10,0,0,7);cellWave(s+100,10,4);surge(s+160,110,0,0);cellLine(s+170,0,0,9,11);
  tip(s+300,'💥 اضغط زر الفأرة (أو F أو زر 🔥) لإطلاق الطاقة وتحطيم الصخور — تُسقط بلورات!');
  rock(s+380,0,0,2.8);rock(s+430,-6,1,2.8);rock(s+480,6,-1,2.8);cellArc(s+540,0,0,7.5);
  tip(s+620,'⚡ Space للدفع الإضافي · Q وE للمناورة السريعة بلا اصطدام',5600);rock(s+660,-5,0,3,{vx:1.2});cellWave(s+700,8,3.2);hero(s+300,-70,-60,28)}
 {const s=S(1);for(let k=0;k<5;k++){const sd=k%2?1:-1;rock(s+50+k*96,sd*5.6,sd*1.2,3.4,{vx:-sd*1.2});cell(s+98+k*96,sd*7.4,sd*1.6);cell(s+108+k*96,-sd*3.6,-sd*1.2)}
  debris(s+560,-2,3,2.2,0);debris(s+610,3,-2,2,1);cellWave(s+520,10,3.6);heal(s+660,2,1);
  tip(s+700,'☄️ مذنّبات! تفادَها أو أسقطها بالإطلاق',4400);meteor(s+720,-7,3,2,-1.1);meteor(s+790,7,-3,-2,1);surge(s+800,100,0,0);cellLine(s+810,0,0,7,12);hero(s+420,60,50,34)}

 /* ===== المنطقة ٢: حزام الكويكبات (سؤالان، بلا زعيم) ===== */
 {const s=S(2);tip(s+10,'🪨 الصخور الكبيرة تنقسم عند تدميرها — استمر بالإطلاق واجمع الغنيمة',5200);
  const rows=[[0,0,4.6],[-6,2,4],[6,-2,4],[0,3.4,3.4],[-5,-3,4.4],[5,3,4.4],[0,-1,5]];
  rows.forEach((q,k)=>{const d=s+50+k*100;rock(d,q[0],q[1],q[2],{vx:(k%3-1)*1.1});cell(d+46,-q[0]*.7,-q[1]*.8);cell(d+54,-q[0]*.6,-q[1]*.7)});
  surge(s+420,120,0,0);cellLine(s+430,0,0,10,11);heal(s+640,0,0);hero(s+60,-60,10,40);hero(s+300,70,-20,46);hero(s+600,55,40,38)}
 {const s=S(3);tip(s+8,'ثلاثة مسارات: اختر الأخطر لتجمع بلورات أكثر! 💎',4600);
  for(let k=0;k<6;k++){const d=s+50+k*105;rock(d,-5.6,0,3.4,{spin:.5});rock(d,5.6,0,3.2,{spin:-.5});
   const lane=[-8.8,0,8.8][(k*7)%3];cellLine(d+24,lane,0,3,9);cell(d+52,lane*.5,1.2)}
  meteor(s+300,-8,3,2.4,-1,2.4);meteor(s+500,8,-3,-2.4,1,2.4);heal(s+700,0,0);hero(s+120,-65,30,44);hero(s+400,60,-30,50);surge(s+800,100,0,0);cellLine(s+810,0,0,8,12)}

 /* ===== المنطقة ٣: السديم (سؤال) ===== */
 {const s=S(4);
  for(let k=0;k<22;k++){const d=s+k*38-80;cloud(d,((k*53)%140)-70,((k*29)%80)-40,70+(k%4)*40,k%4,k%3!==0)}
  tip(s+10,'🌀 تيارات الطاقة تدفعك جانبًا — استغلّها لتجمع البلورات ⚡',5000);
  shard(s+80,-6,2,3.2);shard(s+260,6,-2,3.4);shard(s+520,-3,3,3);
  current(s+130,200,0,0,26,14,5,0);current(s+480,180,0,0,26,14,-5.5,2);
  tip(s+400,'⚡ البرق: ابتعد عن الحلقة المضيئة قبل أن تضرب',4600);strike(s+440,-6,1);strike(s+560,6,-1.5);strike(s+680,0,2);
  cellWave(s+40,12,3.8,6,9);cellWave(s+300,12,3.8,6,9);heal(s+390,0,0);surge(s+760,100,0,0);cellLine(s+770,0,0,7,12)}

 /* ===== المنطقة ٤: المحطة (سؤال ثم الهبوط) ===== */
 {const s=S(5);drones(s+60,s+640,2,3.6);tip(s+8,'🎯 دفاعات المحطة! أسقط الطائرات المسيّرة بالإطلاق وتفادَ قذائفها',5200);
  for(let k=0;k<6;k++){const d=s+60+k*95;debris(d,((k*7.1)%16)-8,(((k*3.7)%9)-4.5),2.2+(k%3)*.6,k%3)}
  rock(s+260,-5,2,3.4,{vx:1.2});rock(s+460,5,-2,3.4,{vx:-1.2});
  cellWave(s+60,12,3.6,6,9);cellWave(s+330,12,3.6,6,9);heal(s+300,0,0);cellLine(s+560,0,0,7,12);
  for(let k=0;k<4;k++)cloud(s+k*160,((k*61)%100)-50,((k*37)%50)-25,90,k%4,true);lights(s+700,6,24)}
 objs.sort((a,b)=>a.d-b.d);
 return {objs,gates,starts};
}
