import {build} from 'esbuild';import fs from 'fs';import path from 'path';import {execSync} from 'child_process';
const here=path.dirname(new URL(import.meta.url).pathname);
/* الحزم: لكل لعبة ملف HTML وحزمة SCORM 1.2 */
const PACKS={
 atf:{title:'مغامرة العطف في الفضاء — اللغة العربية الصف الثامن',id:'ATTF-ARABIC8-ATF',mastery:60,html:'adventure.html',zip:'adventure-scorm12.zip',legacyDist:true},
 hamza:{title:'تحدي الهمزة — اللغة العربية الصف السادس',id:'ATTF-ARABIC6-HAMZA',mastery:67,html:'hamza.html',zip:'hamza-scorm12.zip'}
};
const want=process.argv[2]&&process.argv[2]!=='all'?[process.argv[2]]:Object.keys(PACKS);
const hero='data:image/jpeg;base64,'+fs.readFileSync(path.join(here,'assets/hero.jpg')).toString('base64');
for(const name of want){
 const P=PACKS[name];if(!P)throw new Error('حزمة غير معروفة: '+name);
 const out=await build({entryPoints:[path.join(here,'src/main.js')],bundle:true,minify:true,format:'iife',charset:'utf8',write:false,target:'es2020',legalComments:'none',alias:{pack:path.join(here,'src/packs/'+name+'.js')}});
 const js=out.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
 const html=fs.readFileSync(path.join(here,'template.html'),'utf8').replaceAll('__HERO__',hero).replace('<!--GAME_JS-->',()=>`<script>${js}</script>`);
 const dist=path.join(here,'dist',name);fs.mkdirSync(dist,{recursive:true});
 fs.writeFileSync(path.join(dist,'index.html'),html);
 if(P.legacyDist)fs.writeFileSync(path.join(here,'dist','index.html'),html);
 fs.writeFileSync(path.join(here,'../public',P.html),html);
 const sc=path.join(dist,'scorm');fs.rmSync(sc,{recursive:true,force:true});fs.mkdirSync(sc,{recursive:true});
 fs.writeFileSync(path.join(sc,'index.html'),html);
 fs.writeFileSync(path.join(sc,'imsmanifest.xml'),`<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${P.id}" version="1.0" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
 <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
 <organizations default="ORG1"><organization identifier="ORG1"><title>${P.title.split(' — ')[0]}</title>
  <item identifier="ITEM1" identifierref="RES1"><title>${P.title}</title><adlcp:masteryscore>${P.mastery}</adlcp:masteryscore></item>
 </organization></organizations>
 <resources><resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources>
</manifest>
`);
 const zip=path.join(dist,P.zip);fs.rmSync(zip,{force:true});
 execSync(`python3 -m zipfile -c "${zip}" index.html imsmanifest.xml`,{cwd:sc});
 fs.copyFileSync(zip,path.join(here,'../public',P.zip));
 if(P.legacyDist)fs.copyFileSync(zip,path.join(here,'dist','adventure-scorm12.zip'));
 console.log('built',name,(html.length/1024|0)+'KB ->',P.html,P.zip);
}
