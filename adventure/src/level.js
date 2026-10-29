import {rng} from './textures.js';
/* وحدات المسافة ≈ متر. عند نقطة السؤال (STOPS) تتحول المركبة إلى «التحليق الآمن»، ثم تُستأنف العقبات بعد LEAD.
   لكل منطقة إحساس مختلف: الأرض (تعلّم + دفع)، الكويكبات (إطلاق + زعيم)، السديم (برق وتيارات)، المحطة (مسيّرات معادية). */
export const BASE=44,CRUISE=16,LEAD=260,CLEAR=40;
export const ZONE_K=[1,1.1,1,.88];
export const SEG=[1150,1200,1200,1300,1300,1300,1350,1200,1250,1080];
export const STOPS=SEG.reduce((a,l)=>{a.push((a.length?a[a.length-1]:0)+l);return a},[]);
export function buildLevel(){
 const r=rng(2030),objs=[],gates=[],starts=[];let acc=0;
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
 const strike=(d,x,y)=>P({t:'strike',d,x,y,r:6.5,ph:r()*3});
 const current=(d,len,x,y,w,h,fx,fy)=>P({t:'current',d,len,x,y,w,h,fx,fy});
 const surge=(d,len,x,y)=>P({t:'surge',d,len,x,y,w:22,h:12,fx:0,fy:0});
 const cloud=(d,x,y,sz,c,add=true)=>P({t:'cloud',d,x,y,sz,c,add});
 const lights=(d,n,st)=>{for(let i=0;i<n;i++){P({t:'lamp',d:d+i*st,x:-12,y:-4});P({t:'lamp',d:d+i*st,x:12,y:-4})}};
 const tip=(d,text,ms=5200)=>P({t:'tip',d,text,ms});
 const boss=d=>P({t:'boss',d});
 const drones=(d,end)=>P({t:'drones',d,end});
 const S=i=>starts[i]+LEAD;

 /* ===== المنطقة ١: الانطلاق (تعلّم الأفكار واحدة بعد أخرى) ===== */
 {const s=S(0);tip(s+5,'🖱️ حرّك الفأرة (أو اسحب بإصبعك) لتوجيه المركبة · اجمع بلورات الطاقة 💎');
  cellLine(s+10,0,0,7);cellWave(s+110,10,4);surge(s+170,110,0,0);cellLine(s+180,0,0,9,11);
  tip(s+330,'💥 اضغط زر الفأرة (أو F أو زر 🔥) لإطلاق الطاقة وتحطيم الصخور — تُسقط بلورات!');
  rock(s+420,0,0,2.8);rock(s+455,-5.5,1,2.8);rock(s+490,5.5,-1,2.8);rock(s+540,0,2,3.2);debris(s+590,-6,-2,1.8,0);cellArc(s+600,0,0,7.5);
  tip(s+680,'⚡ Space للدفع الإضافي · Q وE للمناورة السريعة بلا اصطدام',5600);rock(s+700,-4,0,3,{vx:1.4});rock(s+740,5,1,3,{vx:-1.4});cellWave(s+780,8,3.2);hero(s+300,-70,-60,28)}
 {const s=S(1);tip(s+20,'احذر! كل صخرة تدمّرها تمنحك نقاطًا · والاقتراب الشديد دون اصطدام يمنحك «كدتَ تصطدم!»',5200);
  for(let k=0;k<7;k++){const sd=k%2?1:-1;rock(s+40+k*78,sd*5.2,sd*1.2,3.6,{vx:-sd*1.5});cell(s+78+k*78,sd*7.4,sd*1.6)}
  debris(s+620,-2,3,2.2,0);debris(s+660,3,-2,2,1);debris(s+700,0,0,2.2,2);cellWave(s+590,10,3.6);heal(s+760,2,1);
  rock(s+820,-6,2,3.8,{vy:-1.2});rock(s+840,6,-2,3.6,{vy:1.2});cellLine(s+790,0,0,4);surge(s+880,100,0,0);cellLine(s+890,0,0,8,12);hero(s+400,60,50,34)}
 {const s=S(2);const sp=[[-7,3.5,2.2,-1.1],[7,-3,-2.2,1],[-3,4.5,1.2,-1.5],[6,3,-2,-1],[-6,-3.5,2.4,1.2],[2,5,-.8,-1.6],[-4,-4,1.6,1.6],[5,-4.5,-1.4,1.8]];
  tip(s+8,'☄️ المذنّبات! تفادَها أو أسقطها بالإطلاق قبل وصولها',4800);sp.forEach((m,k)=>meteor(s+30+k*92,m[0]*1.25,m[1],m[2],m[3]));
  rock(s+170,0,0,3.6);rock(s+520,2,0,4);rock(s+700,-5,-2,3.4,{vx:1});cellWave(s+60,8,3.5);cellWave(s+400,8,4,6,7,0,-.5);heal(s+470,3,2);cellWave(s+590,7,3);cellLine(s+790,0,0,5)}

 /* ===== المنطقة ٢: حزام الكويكبات (إطلاق ومطاردة ثم زعيم) ===== */
 {const s=S(3);tip(s+10,'🪨 الصخور الكبيرة تنقسم عند تدميرها — استمر بالإطلاق واجمع الغنيمة',5200);
  const rows=[[0,0,5.4],[-6,2,4.4],[6,-2,4.4],[0,3.6,3.6],[-4.5,-3,5],[4.5,3,5],[0,-1,6.2],[-7,0,4],[7,0,4],[0,2,5.4]];
  rows.forEach((q,k)=>{const d=s+30+k*84;rock(d,q[0],q[1],q[2],{vx:(k%3-1)*1.4,vy:(k%2?1:-1)*.8});cell(d+40,-q[0]*.7,-q[1]*.8);cell(d+48,-q[0]*.6,-q[1]*.7)});
  surge(s+400,120,0,0);cellLine(s+410,0,0,10,11);hero(s+60,-60,10,40);hero(s+300,70,-20,46);hero(s+520,-50,-40,32);hero(s+700,55,40,38)}
 {const s=S(4);tip(s+8,'ثلاثة مسارات: اختر الأخطر لتجمع بلورات أكثر! 💎',4600);
  for(let k=0;k<9;k++){const d=s+40+k*85;rock(d,-5.2,0,3.6+(k%3),{spin:.5});rock(d,5.2,0,3.4+(k%2)*1.2,{spin:-.5});rock(d,0,(k%2?3.4:-3.4),3,{spin:.6});
   const lane=[-8.5,0,8.5][(k*7)%3];cellLine(d+20,lane,0,3,9);cell(d+46,lane*.5,1.2)}
  hero(s+120,-65,30,44);hero(s+400,60,-30,50);hero(s+650,-55,-45,36);surge(s+830,100,0,0);cellLine(s+840,0,0,8,12)}
 {const s=S(5);tip(s+8,'🏞️ وادٍ ضيق بين كويكبين عملاقين — تحكّم بدقة!',4600);
  const cx=dd=>5*Math.sin(dd/70)*Math.min(1,dd/60);for(let dd=0;dd<=560;dd+=26){const c=cx(dd);rock(s+80+dd,c-11-(dd%52?0:2),((dd/26)%2?2:-2),5.2+((dd/26)%3));rock(s+80+dd,c+11+(dd%52?2:0),((dd/26)%2?-2:2),5.2+((dd/26)%3))}
  for(let dd=40;dd<540;dd+=14)cell(s+80+dd,cx(dd),Math.sin(dd/50)*2);
  meteor(s+300,-9,3,3,-1.2,2.6);meteor(s+420,9,-3,-3,1.2,2.6);meteor(s+560,0,5,0,-2,2.8);hero(s+200,-80,40,50);hero(s+520,80,-30,56);heal(s+700,0,0)}
 {const s=S(6);boss(s+30);rock(s+120,-7,2,3.4,{vx:1.4});rock(s+170,7,-2,3.4,{vx:-1.4});heal(s+260,0,0);
  for(let k=0;k<6;k++)rock(s+330+k*90,((k*37)%15)-7,((k*5)%7)-3,3+(k%3)*.7,{vx:(k%2?-1:1)*(1.6+k*.2)});
  cellLine(s+300,-8,-3,10,40,1.7,.6);hero(s+200,-70,-30,42);hero(s+620,70,35,48);surge(s+960,100,0,0);cellLine(s+970,0,0,8,12)}

 /* ===== المنطقة ٣: السديم (برق وتيارات) ===== */
 {const s=S(7);
  for(let k=0;k<26;k++){const d=s+k*38-80;cloud(d,((k*53)%140)-70,((k*29)%80)-40,70+(k%4)*40,k%4,k%3!==0)}
  tip(s+10,'🌀 تيارات الطاقة تدفعك جانبًا — استغلّها لتجمع البلورات وفاجئ البرق ⚡',5400);
  shard(s+60,-6,2,3.4);shard(s+80,-5,-1,2.4);shard(s+250,6,-2,3.6);shard(s+270,7,1,2.6);shard(s+460,-3,3,3.2);shard(s+620,5,0,3.8);
  current(s+120,220,0,0,26,14,5.5,0);current(s+520,200,0,0,26,14,-6,2.5);
  cellWave(s+40,12,3.8,6,9);cellWave(s+300,12,3.8,6,9);heal(s+410,0,0);surge(s+760,110,0,0);cellLine(s+770,0,0,8,12)}
 {const s=S(8);
  for(let k=0;k<26;k++){const d=s+k*38-80;cloud(d,((k*71)%150)-75,((k*37)%90)-45,80+(k%4)*40,(k+1)%4,k%2===0)}
  tip(s+8,'⚡ البرق الكوني! ابتعد عن الحلقة المضيئة قبل أن تضرب',5000);
  strike(s+60,-6,1);strike(s+160,6,-1.5);strike(s+260,0,2);strike(s+360,-7,-2);strike(s+460,7,2);strike(s+560,0,-1);strike(s+660,-5,2);strike(s+740,5,-1);
  shard(s+110,0,-3,3);shard(s+310,-3,1,3.4);shard(s+520,4,2,3.2);current(s+200,170,0,0,26,14,-5,-2);current(s+600,160,0,0,26,14,5,2);
  cellWave(s+30,14,4,7,9);cellWave(s+400,10,4,6,9);heal(s+300,3,0);cellLine(s+800,0,0,6,12)}

 /* ===== المنطقة ٤: المحطة (دفاعات معادية) ===== */
 {const s=S(9);drones(s+60,s+760);tip(s+8,'🎯 دفاعات المحطة تهاجمك! أسقط الطائرات المسيّرة بالإطلاق وتفادَ قذائفها',5600);
  for(let k=0;k<8;k++){const d=s+50+k*80;debris(d,((k*7.1)%16)-8,(((k*3.7)%9)-4.5),2.2+(k%3)*.6,k%3)}
  rock(s+250,-5,2,3.6,{vx:1.5});rock(s+420,5,-2,3.6,{vx:-1.5});rock(s+560,0,3,3.2,{vy:-1.4});
  cellWave(s+60,12,3.6,6,9);cellWave(s+360,12,3.6,6,9);heal(s+300,0,0);cellLine(s+620,0,0,8,12);
  for(let k=0;k<5;k++)cloud(s+k*160,((k*61)%100)-50,((k*37)%50)-25,90,k%4,true);lights(s+880,6,26)}
 objs.sort((a,b)=>a.d-b.d);
 return {objs,gates,starts};
}
