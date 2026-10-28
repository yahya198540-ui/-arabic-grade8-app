import {build} from 'esbuild';import fs from 'fs';import path from 'path';import {execSync} from 'child_process';
const here=path.dirname(new URL(import.meta.url).pathname);
const out=await build({entryPoints:[path.join(here,'src/main.js')],bundle:true,minify:true,format:'iife',charset:'utf8',write:false,target:'es2020',legalComments:'none'});
let js=out.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=fs.readFileSync(path.join(here,'template.html'),'utf8').replace('<!--GAME_JS-->',()=>`<script>${js}</script>`);
const dist=path.join(here,'dist');fs.mkdirSync(dist,{recursive:true});
fs.writeFileSync(path.join(dist,'index.html'),html);
fs.writeFileSync(path.join(here,'../public/adventure.html'),html);
// حزمة SCORM 1.2
const sc=path.join(dist,'scorm');fs.rmSync(sc,{recursive:true,force:true});fs.mkdirSync(sc,{recursive:true});
fs.writeFileSync(path.join(sc,'index.html'),html);
fs.writeFileSync(path.join(sc,'imsmanifest.xml'),`<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="ATTF-ARABIC8-ATF" version="1.0" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
 <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
 <organizations default="ORG1"><organization identifier="ORG1"><title>مغامرة العطف في الفضاء</title>
  <item identifier="ITEM1" identifierref="RES1"><title>مغامرة العطف في الفضاء — اللغة العربية الصف الثامن</title><adlcp:masteryscore>${6*10}</adlcp:masteryscore></item>
 </organization></organizations>
 <resources><resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html"><file href="index.html"/></resource></resources>
</manifest>
`);
const zip=path.join(dist,'adventure-scorm12.zip');fs.rmSync(zip,{force:true});
execSync(`python3 -m zipfile -c "${zip}" index.html imsmanifest.xml`,{cwd:sc});
fs.copyFileSync(zip,path.join(here,'../public/adventure-scorm12.zip'));
console.log('built',(html.length/1024|0)+'KB html;',zip);
