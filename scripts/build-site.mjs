import fs from 'node:fs/promises';
import {generatePages,gameImage,ipImage} from './seo-pages.mjs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const policy=createRequire(import.meta.url)('../content-policy.js');
export const siteRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const publicFiles=['index.html','ip.html','app.js','core.js','ip.js','styles.css','.nojekyll'];
const safeId=/^[a-z0-9][a-z0-9-]*$/;
function fail(message){throw Error(message);}
function url(value,label){if(value==null||value==='')return;try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol))throw Error();}catch{fail(label+' はHTTP(S) URLにしてください');}}
function image(record,kind){const name=record.image||`images/${kind==='games'?'games':'ip'}/${kind==='games'?String(record.id).padStart(3,'0'):record.id}.png`;if(!/^images\/(games|ip)\/[a-zA-Z0-9_.-]+\.(png|jpe?g|webp)$/i.test(name))fail('画像パスが不正：'+name);return name;}
export function validateRecords(games,ips){
 if(!games.length)fail('ゲーム0件の公開は中止します。読み込み・削除内容を確認してください');
 for(const [kind,records] of [['games',games],['ips',ips]]){
  const ids=new Set();for(const r of records){
   if(!r||typeof r!=='object'||Array.isArray(r))fail('不正なレコード');
   if(kind==='games'?!Number.isSafeInteger(r.id)||r.id<1:typeof r.id!=='string'||!safeId.test(r.id))fail('識別IDが不正');
   if(ids.has(r.id))fail('識別IDが重複：'+r.id);ids.add(r.id);
   if(kind==='games'){
    if(typeof r.title!=='string'||!r.title.trim()||typeof r.genre!=='string'||!r.genre.trim())fail('作品名・ジャンルは必須');
    if(!Array.isArray(r.tags)||r.tags.some(t=>typeof t!=='string'))fail('タグは文字列の配列');
    if(!['published','upcoming','hidden'].includes(r.status))fail('公開状態が不正');
    for(const k of ['randomEligible','passwordProtected','showUpcomingLabel'])if(k in r&&typeof r[k]!=='boolean')fail(k+' は真偽値');
    if('minutes' in r&&r.minutes!==null&&(typeof r.minutes!=='number'||!Number.isFinite(r.minutes)||r.minutes<0))fail('minutes は非負の数値またはnull');
    if(r.releaseDate!=null&&r.releaseDate!==''){
     if(typeof r.releaseDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(r.releaseDate))fail('公開日はYYYY-MM-DDまたは空欄');
     const [y,m,d]=r.releaseDate.split('-').map(Number),dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)fail('存在しない公開日');
    }
    url(r.url,'ゲームURL');url(r.noteUrl,'note URL');
   }else{
    if(typeof r.name!=='string'||!r.name.trim())fail('IP名は必須');
    for(const [k,v] of Object.entries(r.links||{}))url(v,k);
    if(r.customLinks!==undefined&&!Array.isArray(r.customLinks))fail('自由リンクは配列');
    for(const link of r.customLinks||[]){if(!link.label||!link.url)fail('自由リンクには名前・URLの両方が必要');url(link.url,'自由リンク');}
    if(r.aliases!==undefined&&(!Array.isArray(r.aliases)||r.aliases.some(a=>typeof a!=='string'||!safeId.test(a))))fail('旧IDは識別IDの配列');
   }
   image(r,kind);
  }
 }
 const identifiers=new Set(ips.map(ip=>ip.id));for(const ip of ips)for(const id of ip.aliases||[]){if(identifiers.has(id))fail('旧IDと現在IDが重複：'+id);identifiers.add(id);}
}
export async function readContent(root=siteRoot){
 const groups={},files=[];
 for(const kind of ['games','ips']){
  const directory=path.join(root,'content',kind);groups[kind]=[];
  for(const name of (await fs.readdir(directory)).sort()){
   if(!/^[a-zA-Z0-9_-]+\.json$/.test(name))fail('content内に不正なファイル：'+name);
   const rel=`content/${kind}/${name}`,raw=await fs.readFile(path.join(root,rel));
   groups[kind].push(policy.transform(JSON.parse(raw.toString('utf8')),kind));files.push({path:rel,raw});
  }
 }
 validateRecords(groups.games,groups.ips);groups.games.sort((a,b)=>a.id-b.id);
 // Keep the current IP display order; new IPs follow the existing three.
 const order=['goldana','hamuji','mononoke'];groups.ips.sort((a,b)=>{const x=order.indexOf(a.id),y=order.indexOf(b.id);return (x<0?Infinity:x)-(y<0?Infinity:y)||a.id.localeCompare(b.id);});
 for(const [kind,records] of Object.entries(groups))for(const r of records){const rel=image(r,kind);await fs.access(path.join(root,rel));}
 const revision=createHash('sha256');for(const f of files)revision.update(f.path+'\0').update(f.raw);
 return {...groups,files,revision:revision.digest('hex')};
}
export function encode(data,symbol){return '/* 自動生成：正本は content/ のJSONです。直接編集しないでください。 */\nwindow.'+symbol+' = '+JSON.stringify(data,null,2)+';\n';}
export async function build({root=siteRoot,local=false,out=path.join(root,'dist')}={}){
 const content=await readContent(root);
 // Validate all inputs before writing anything. Dist is an allowlist, never a copy of the checkout.
 if(!local){await fs.mkdir(out,{recursive:true});if((await fs.readdir(out)).length)fail('出力先が空ではありません。新しい空の出力先を指定してください');for(const name of publicFiles)await fs.copyFile(path.join(root,name),path.join(out,name));const used=new Set([...content.games.filter(g=>g.status!=='hidden').map(gameImage),...content.ips.map(ipImage)]);for(const rel of used){await fs.mkdir(path.dirname(path.join(out,rel)),{recursive:true});await fs.copyFile(path.join(root,rel),path.join(out,rel));}await generatePages(out,content,await fs.readFile(path.join(root,'index.html'),'utf8'));}
 const target=local?root:out;
 await fs.writeFile(path.join(target,'data.js'),(local?'':'window.KAYANO_PUBLIC_DATA = true;\n')+encode(local?content.games:content.games.filter(g=>g.status!=='hidden'),'KAYANO_GAMES'));
 await fs.writeFile(path.join(target,'ip-data.js'),encode(content.ips,'KAYANO_IPS'));
 await fs.writeFile(path.join(target,'content-version.json'),JSON.stringify({revision:content.revision,registered:(local?content.games:content.games.filter(g=>g.status!=='hidden')).length,ips:content.ips.length}));
 return content;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const result=await build({local:process.argv.includes('--local')});console.log(`Validated/generated: ${result.games.length} games, ${result.ips.length} IPs; ${result.revision}`);}catch(e){console.error('公開を中止しました：'+e.message);process.exitCode=1;}
}
