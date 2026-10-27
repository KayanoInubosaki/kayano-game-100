(function(root){
'use strict';
const fields={
 common:['siteName','browserTitle','description','ogDescription','brandTitle','brandSubtitle','ribbonText','authorName','authorEnglish','copyright','backToTop'],
 navigation:['games','ip','diary','about'],
 home:['heading','introduction','browseLabel','randomLabel','collectionHeading','diaryHeading','diaryDescription','diaryLinkLabel','ipHeading','ipLinkLabel'],
 ipList:['heading','introduction'],
 diary:['heading','introduction','noteTitle','description','noteLabel','noteUrl'],
 about:['heading','introduction']
};
const required=new Set(['common.siteName','common.browserTitle','common.authorName','home.heading','home.collectionHeading','home.browseLabel','home.randomLabel','ipList.heading','diary.heading','about.heading',...fields.navigation.map(k=>'navigation.'+k)]);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeURL(value){if(!value)return '';const u=new URL(value);if(!['https:','http:'].includes(u.protocol))throw Error('URLは http:// または https:// から入力してください');return u.href;}
function normalize(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('サイト設定が不足または破損しています');
 const result={};
 for(const [group,keys] of Object.entries(fields)){
  if(!input[group]||typeof input[group]!=='object'||Array.isArray(input[group]))throw Error('サイト設定の項目が不足：'+group);
  result[group]={};
  for(const key of keys){const value=input[group][key]??'';if(typeof value!=='string')throw Error(group+'.'+key+' は文章にしてください');if(required.has(group+'.'+key)&&!value.trim())throw Error('必須の文章が空欄：'+group+'.'+key);result[group][key]=value;}
 }
 safeURL(result.diary.noteUrl);
 for(const [group,key] of [['diary','articles'],['about','links']]){
  const list=input[group][key]??[];if(!Array.isArray(list))throw Error(group+'.'+key+' はリンクの配列にしてください');
  result[group][key]=list.map(row=>{if(!row||typeof row.title!=='string'||!row.title.trim()||typeof row.url!=='string'||!row.url.trim())throw Error('リンクにはタイトルとURLの両方が必要です');safeURL(row.url);return {title:row.title,url:row.url};});
 }
 return result;
}
function get(settings,key){const [group,name]=key.split('.');if(!fields[group]?.includes(name))throw Error('未定義の文章キー：'+key);return settings[group][name];}
function linksHTML(list){return list.map(row=>`<a href="${escapeHTML(safeURL(row.url))}" target="_blank" rel="noopener noreferrer">${escapeHTML(row.title)} ↗</a>`).join('');}
function renderHTML(template,settings){
 let html=template.replace(/(<([a-z][a-z0-9]*)\b[^>]*\bdata-site-text="([a-zA-Z.]+)"[^>]*>)[\s\S]*?<\/\2>/g,(_,opening,tag,key)=>opening+escapeHTML(get(settings,key))+`</${tag}>`);
 html=html.replace(/<meta\b[^>]*\bdata-site-meta="([a-zA-Z.]+)"[^>]*>/g,(tag,key)=>tag.replace(/\bcontent="[^"]*"/,()=>`content="${escapeHTML(get(settings,key))}"`));
 html=html.replace(/<a\b([^>]*\bdata-site-link="([a-zA-Z.]+)"[^>]*)>([\s\S]*?)<\/a>/g,(_,attrs,key,body)=>{const url=safeURL(get(settings,key));return url?`<a${attrs.replace(/\bhref="[^"]*"/,()=>`href="${escapeHTML(url)}"`)}>${body}</a>`:'';});
 html=html.replace(/(<div\b[^>]*\bdata-site-list="(diary\.articles|about\.links)"[^>]*>)[\s\S]*?<\/div>/g,(_,opening,key)=>{const [group,name]=key.split('.');return opening+linksHTML(settings[group][name])+'</div>';});
 return html;
}
function apply(document,settings){
 for(const node of document.querySelectorAll('[data-site-text]'))node.textContent=get(settings,node.dataset.siteText);
 for(const node of document.querySelectorAll('[data-site-meta]'))node.setAttribute('content',get(settings,node.dataset.siteMeta));
 for(const node of document.querySelectorAll('[data-site-link]')){const url=safeURL(get(settings,node.dataset.siteLink));if(url)node.setAttribute('href',url);else{node.removeAttribute('href');node.hidden=true;}}
 for(const node of document.querySelectorAll('[data-site-list]')){const [group,key]=node.dataset.siteList.split('.');node.replaceChildren();for(const row of settings[group][key]){const anchor=document.createElement('a');anchor.href=safeURL(row.url);anchor.target='_blank';anchor.rel='noopener noreferrer';anchor.textContent=row.title+' ↗';node.appendChild(anchor);}}
}
const api=Object.freeze({normalize,renderHTML,apply,fields,required,safeURL});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else {root.KAYANO_SITE_VIEW=api;document.addEventListener('DOMContentLoaded',()=>{try{root.KAYANO_SITE=normalize(root.KAYANO_SITE);apply(document,root.KAYANO_SITE);}catch(error){const warning=document.createElement('p');warning.setAttribute('role','alert');warning.textContent='サイト設定を読み込めません。'+error.message;document.body.prepend(warning);}});}
})(typeof window!=='undefined'?window:globalThis);
