/* حزمة «مغامرة العطف في الفضاء» — الصف الثامن */
export {QUESTIONS,STAGES,PASS_SCORE,toAr} from '../data.js';
export {BASE,CRUISE,STOPS,LEAD,ZONE_K,buildLevel} from '../level.js';
export const TRANS=[2,6,8];                 // أسئلة يعقبها انتقال إلى منطقة جديدة
export const CFG={shield:3,hit:1};
export const META={id:'atf',docTitle:'مغامرة العطف في الفضاء',title1:'مغامرة العطف',title2:'في الفضاء',
 certTitle:'شهادة مستكشف العطف',certFile:'Alatf-Explorer-Certificate.png',rule:'',
 certLines:(sc,N)=>['لإتمامه بنجاح مهمة «مغامرة العطف في الفضاء» وإنقاذ المحطة الفضائية،',`وحصوله على درجة تعليمية قدرها ${sc} من ${N} في درس العطف — الصف الثامن الأساسي.`]};
