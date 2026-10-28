/* واجهة SCORM 1.2 / 2004 — تعمل بصمت إذا لم يوجد نظام إدارة تعلّم */
function findAPI(win,name){let n=0;while(win&&n++<12){try{if(win[name])return win[name]}catch(e){}if(win.parent===win)break;win=win.parent}return null}
let api=null,ver=null,started=false;
export const Scorm={
 get active(){return !!api},
 init(){
  try{
   let a=findAPI(window,'API_1484_11');
   if(!a&&window.opener)a=findAPI(window.opener,'API_1484_11');
   if(a){api=a;ver='2004';if(a.Initialize('')==='true'||a.Initialize('')===true){started=true}}
   else{a=findAPI(window,'API')||(window.opener&&findAPI(window.opener,'API'));if(a){api=a;ver='1.2';a.LMSInitialize('');started=true}}
  }catch(e){api=null}
  return this.active;
 },
 get(k){try{return ver==='2004'?api.GetValue(k):api.LMSGetValue(k)}catch(e){return ''}},
 set(k,v){try{return ver==='2004'?api.SetValue(k,String(v)):api.LMSSetValue(k,String(v))}catch(e){}},
 commit(){try{ver==='2004'?api.Commit(''):api.LMSCommit('')}catch(e){}},
 getSuspend(){if(!api)return null;try{const s=this.get('cmi.suspend_data');return s?JSON.parse(s):null}catch(e){return null}},
 progress(data){if(!api)return;this.set('cmi.suspend_data',JSON.stringify(data));
  if(ver==='1.2'){if(this.get('cmi.core.lesson_status')!=='completed'&&this.get('cmi.core.lesson_status')!=='passed')this.set('cmi.core.lesson_status','incomplete')}
  else this.set('cmi.completion_status','incomplete');this.commit()},
 finish(score,passed){if(!api)return;
  if(ver==='1.2'){this.set('cmi.core.score.min',0);this.set('cmi.core.score.max',10);this.set('cmi.core.score.raw',score);this.set('cmi.core.lesson_status',passed?'passed':'failed')}
  else{this.set('cmi.score.min',0);this.set('cmi.score.max',10);this.set('cmi.score.raw',score);this.set('cmi.score.scaled',score/10);this.set('cmi.completion_status','completed');this.set('cmi.success_status',passed?'passed':'failed')}
  this.commit()},
 exit(){if(!api||!started)return;started=false;try{ver==='2004'?api.Terminate(''):api.LMSFinish('')}catch(e){}}
};
addEventListener('beforeunload',()=>Scorm.exit());
