(function(root){
'use strict';
const optional={games:{description:'',image:undefined,tags:[],searchTerms:'',releaseDate:'',timeLabel:'',minutes:null,url:'',noteUrl:'',upcomingLabel:'公開予定',showUpcomingLabel:true,randomEligible:true,passwordProtected:false,art:'clean',artText:'GAME'},ips:{category:'',summary:'',description:'',image:undefined,gameTag:'',customLinks:[],aliases:undefined,'links.youtube':'','links.instagram':'','links.suzuri':'','links.lineStickers':'','links.x':'','links.website':''}};
const get=(obj,key)=>key.split('.').reduce((a,k)=>a?.[k],obj);
function set(obj,key,value,remove=false){const parts=key.split('.');let p=obj;for(const k of parts.slice(0,-1)){if(!p[k]||typeof p[k]!=='object')p[k]={};p=p[k];}if(remove)delete p[parts.at(-1)];else p[parts.at(-1)]=value;}
function transform(input,kind){const out=JSON.parse(JSON.stringify(input)),states=out._fieldStates||{};delete out._fieldStates;
for(const [key,fallback] of Object.entries(optional[kind])){
 const value=get(out,key),state=states[key.replaceAll('.','_')]||'auto',empty=value===undefined||value===null||value===''||(Array.isArray(value)&&value.length===0);
 if(empty){if(state==='missing')set(out,key,undefined,true);else if(state==='null')set(out,key,null);else if(state==='empty')set(out,key,'');else if(state==='empty-array')set(out,key,[]);else if(fallback===undefined)set(out,key,undefined,true);else set(out,key,JSON.parse(JSON.stringify(fallback)));}
 else if(state==='missing'&&typeof fallback==='boolean'&&value===fallback)set(out,key,undefined,true);
}
return out;}
const api={optional,transform};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KAYANO_CONTENT_POLICY=api;
})(typeof window!=='undefined'?window:globalThis);
