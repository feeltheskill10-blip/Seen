'use strict';
const $=s=>document.querySelector(s),KEY='seen-library-v1';let posts=[],demoMode=false,view='all',status='all',list=false,activeCreator='';
try{posts=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(posts))posts=[]}catch{posts=[]}
const demos=Array.from({length:10},(_,i)=>({id:`demo/${i}`,title:['Back to Babylon 5 · Season 1 BTS','Doctor Who · The Zygon Inversion','Cowboy Bebop · Brain Scratch','Futurama · Fear of a Bot Planet','Vision Quest · Full Reaction','Castlevania · Broken Heart','Behind the Scenes · Studio Notes','Community Update · October','Late Night Watch · Episode 12','Director’s Commentary · Part 2'][i],creator:['Funnyligalreacts','Funnyligalreacts','Reaction Studio','Reaction Studio','Cinema Notes','Cinema Notes','Studio Journal','Studio Journal','Night Owl Club','Cinema Notes'][i],creatorId:String([0,0,1,1,2,2,3,3,4,2][i]),service:'patreon',seen:i<6,saved:i>=6,updatedAt:new Date(Date.now()-i*864e5).toISOString(),seenAt:i<6?new Date(Date.now()-i*864e5).toISOString():null}));
const data=()=>demoMode?demos:posts;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function save(){try{localStorage.setItem(KEY,JSON.stringify(posts));return true}catch{toast('Speichern fehlgeschlagen. Bitte ein Backup exportieren.');return false}}
const date=s=>s&&Number.isFinite(Date.parse(s))?new Date(s).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}):'Datum unbekannt';
const validSeenAt=s=>!!s&&Number.isFinite(Date.parse(s));
const historyDay=s=>validSeenAt(s)?new Date(s).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}):'Zeitpunkt unbekannt';
const historyTime=s=>validSeenAt(s)?new Date(s).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})+' Uhr':'Uhrzeit nicht gespeichert';
function urlInfo(raw){try{const u=new URL(raw);if(u.protocol!=='https:'||!['pawchive.pw','www.pawchive.pw'].includes(u.hostname))return null;const m=u.pathname.match(/^\/([^/]+)\/user\/([^/]+)\/post\/([^/]+)\/?$/);return m?{id:m.slice(1).join('/'),service:m[1],creatorId:m[2],postId:m[3],url:u.origin+u.pathname}:null}catch{return null}}
function safeThumbnail(value){try{if(typeof value!=='string'||!value)return '';const u=new URL(value,'https://pawchive.pw');return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
function normalize(p){if(!p||typeof p!=='object')throw Error('Ungültiger Eintrag');const info=urlInfo(p.url||`https://pawchive.pw/${String(p.id||'').replace(/^([^/]+)\/([^/]+)\/(.+)$/,'$1/user/$2/post/$3')}`);if(!info)throw Error('Eine Post-URL ist ungültig.');return {...info,title:String(p.title||`Post ${info.postId}`).slice(0,250),creator:String(p.creator||`Creator ${info.creatorId}`).slice(0,100),creatorAvatar:safeThumbnail(p.creatorAvatar),thumbnail:safeThumbnail(p.thumbnail),seen:p.seen===true,saved:p.saved===true,updatedAt:Number.isFinite(Date.parse(p.updatedAt))?p.updatedAt:null,seenAt:Number.isFinite(Date.parse(p.seenAt))?p.seenAt:null}}

const paths={grid:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',bookmark:'M6 3h12v18l-6-4-6 4Z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',clock:'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',shield:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7Z M8 12l3 3 5-6',sync:'M20 7a9 9 0 0 0-15-2L2 8 M2 3v5h5 M4 17a9 9 0 0 0 15 2l3-3 M22 21v-5h-5',download:'M12 3v12 M7 10l5 5 5-5 M4 17v4h16v-4',upload:'M12 16V4 M7 9l5-5 5 5 M4 17v4h16v-4',plus:'M12 5v14 M5 12h14',search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',list:'M9 5h12 M9 12h12 M9 19h12 M3 5h.01 M3 12h.01 M3 19h.01',spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z',check:'M5 12l4 4L19 6',arrow:'M7 17 17 7 M7 7h10v10',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',play:'M7 4.5v15l12.5-7.5Z',copy:'M9 9h11v11H9z M5 15H4V4h11v1',dots:'M5 12h.01 M12 12h.01 M19 12h.01',frame:'M4 4h16v16H4z M8 8h8v8H8z',left:'M15 18l-6-6 6-6',right:'M9 18l6-6-6-6'};
function icon(name){return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${name==='dots'?3:1.7}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.grid}"/></svg>`}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
$('#setupStatus').onclick=()=>$('#setup').showModal();
$('#backupSetup').onclick=()=>$('#backup').click();
let undoState=null;
function toast(message,undo=false){const el=$('#toast');el.replaceChildren(document.createTextNode(message));if(undo){const button=document.createElement('button');button.textContent='Rückgängig';button.onclick=undoLast;el.append(button)}el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),undo?8000:4000)}
function undoLast(){if(!undoState||undoState.demo!==demoMode)return;const target=data().find(p=>p.id===undoState.before.id);if(!target)return;Object.assign(target,undoState.before,{updatedAt:new Date().toISOString()});if(!demoMode){save();window.dispatchEvent(new CustomEvent('seen-local-change',{detail:target}))}undoState=null;
 // On a series page, undo glides back to the episode that is now current again, with the same fade-in.
 if(activeSeries)seriesAdvance='undo';
 render();toast('Änderung zurückgenommen')}
let prefs={};try{prefs=JSON.parse(localStorage.getItem('seen-ui-v3')||'{}')||{}}catch{}
list=!!prefs.list;$('#sort').value=['new','old','title'].includes(prefs.sort)?prefs.sort:'new';
function storePrefs(){try{localStorage.setItem('seen-ui-v3',JSON.stringify({list,sort:$('#sort').value}))}catch{}}
const initials=p=>String(p.creator||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
const keyOf=p=>`${p.service}/${p.creatorId}`;
const creatorLink=p=>'#creator/'+encodeURIComponent(keyOf(p));
const newest=(a,field='updatedAt')=>[...a].sort((x,y)=>(Date.parse(y[field])||0)-(Date.parse(x[field])||0));
// Stable hue per creator so missing thumbnails still look distinct.
const hue=p=>{let h=0;for(const c of keyOf(p))h=(h*31+c.charCodeAt(0))>>>0;return Math.round(h*137.508%360)};
// Remote images: loaded directly where allowed. Where the host blocks them (Claude artifacts),
// the userscript relays small data: URLs, which are cached per browser in IndexedDB.
const PROXY_ONLY=/\.claudeusercontent\.com$/.test(location.hostname);
const imgCache=new Map(),imgFailed=new Set(),imgPending=new Set(),imgQueue=new Set();let imgTimer=0,idb=null;
const idbReady=new Promise(done=>{try{const r=indexedDB.open('seen-images',1);r.onupgradeneeded=()=>r.result.createObjectStore('img');r.onsuccess=()=>{idb=r.result;done()};r.onerror=()=>done()}catch{done()}});
// One-time cleanup once script 2.19.1+ is connected: older scripts could relay images black (canvas blocked in Firefox).
// Everything cached is dropped and fetched again through the fixed relay.
window.addEventListener('seen-script-ready',e=>{
 const v=String(e.detail).split('.').map(Number);if(!(v[0]>2||v[0]===2&&(v[1]>16||v[1]===16&&(v[2]||0)>=3)))return;
 try{if(localStorage.getItem('seen-img-purge-2163'))return;localStorage.setItem('seen-img-purge-2163','1')}catch{return}
 cacheLoaded.then(()=>{
  imgCache.clear();imgFailed.clear();imgPending.clear();posterAsked.clear();posterState={};try{localStorage.removeItem(POSTER_KEY)}catch{}
  try{idb?.transaction('img','readwrite').objectStore('img').clear()}catch{}
  render();
 });
});
function idbPut(key,value){try{idb?.transaction('img','readwrite').objectStore('img').put(value,key)}catch{}}
function showImage(url,data){for(const img of document.querySelectorAll('img[data-orig]'))if(img.dataset.orig===url&&img.getAttribute('src')!==data){img.src=data;img.hidden=false}}
function requestImage(url){if(!url||imgCache.has(url)||imgFailed.has(url)||imgPending.has(url))return;imgQueue.add(url);if(!imgTimer)imgTimer=setTimeout(async()=>{await cacheLoaded;imgTimer=0;const urls=[...imgQueue].filter(u=>!imgCache.has(u));imgQueue.clear();urls.forEach(u=>imgPending.add(u));if(urls.length)window.dispatchEvent(new CustomEvent('seen-image-request',{detail:urls}))},250)}
const imgReasons=new Map();let imgLoaded=0;
// Plain-language report in "Bilder & Creator synchronisieren" so missing images can be traced.
function imageReport(){const el=document.getElementById('relayStatus');if(!el)return;const relevant=data().filter(p=>p.seen||p.saved),noThumb=relevant.filter(p=>!safeThumbnail(p.thumbnail)).length;const parts=[];if(imgLoaded)parts.push(imgLoaded+' Bilder über das Skript geladen');if(imgPending.size)parts.push(imgPending.size+' werden geladen');if(imgFailed.size)parts.push(imgFailed.size+' fehlgeschlagen ('+[...imgReasons].map(([r,n])=>r+': '+n).join(', ')+')');if(noThumb)parts.push(noThumb+' '+(noThumb===1?'Post hat':'Posts haben')+' noch kein gespeichertes Vorschaubild');el.textContent=parts.length?parts.join(' · ')+'.':(PROXY_ONLY?'Alle Vorschaubilder sind da.':'')}
window.addEventListener('seen-image-data',e=>{const {url,data}=e.detail||{};if(typeof url!=='string'||typeof data!=='string'||!data.startsWith('data:image/'))return;imgPending.delete(url);imgCache.set(url,data);idbPut(url,data);imgLoaded++;showImage(url,data);imageReport()});
window.addEventListener('seen-image-fail',e=>{const url=e.detail?.url;if(typeof url!=='string')return;imgPending.delete(url);if(!imgFailed.has(url)){imgFailed.add(url);const reason=String(e.detail.message||'Unbekannter Fehler').slice(0,60);imgReasons.set(reason,(imgReasons.get(reason)||0)+1)}imageReport()});
// "Jetzt nachladen" also retries images that failed earlier in this session.
document.getElementById('refreshImages')?.addEventListener('click',()=>{imgFailed.clear();imgReasons.clear();render();imageReport()});
const cacheLoaded=idbReady.then(()=>new Promise(done=>{if(!idb)return done();try{const req=idb.transaction('img').objectStore('img').openCursor();req.onerror=()=>done();req.onsuccess=()=>{const c=req.result;if(c){if(typeof c.value==='string'&&c.value.startsWith('data:image/'))imgCache.set(c.key,c.value);c.continue()}else{for(const [url,data] of imgCache)showImage(url,data);done()}}}catch{done()}}));
function image(p,field='thumbnail',className='post-thumbnail'){const url=safeThumbnail(p[field]);if(!url)return '';const cached=imgCache.get(url);if(cached)return `<img class="${className}" src="${cached}" data-orig="${esc(url)}" alt="" decoding="async">`;if(PROXY_ONLY){requestImage(url);return `<img class="${className}" data-orig="${esc(url)}" alt="" hidden>`}return `<img class="${className}" src="${esc(url)}" data-orig="${esc(url)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`}
// Always Pawchive's own profile picture (/icons/…); a stored avatar can be the creator's banner, which doesn't fit the square.
function avatar(p,cls='mini-avatar'){const src=p.service&&p.creatorId?{creatorAvatar:`https://pawchive.pw/icons/${encodeURIComponent(p.service)}/${encodeURIComponent(p.creatorId)}`}:p;return `<span class="${cls}" style="--h:${hue(p)}">${esc(initials(p))}${image(src,'creatorAvatar','creator-avatar')}</span>`}
function groupCreators(a){const groups=new Map();for(const p of a){const k=keyOf(p);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)}return groups}

// ── Creator feeds: newest posts per creator, delivered by the userscript ──
const FEEDS_KEY='seen-feeds-v1';let feeds={},renderTimer=0;
try{feeds=JSON.parse(localStorage.getItem(FEEDS_KEY)||'{}')||{}}catch{feeds={}}
function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(render,400)}
window.addEventListener('seen-feeds',e=>{
 const raw=e.detail;if(!raw||typeof raw!=='object')return;const next={};
 for(const [k,f] of Object.entries(raw)){
  if(!/^[-\w]+\/[^/\s?#]+$/.test(k)||!f||!Array.isArray(f.posts))continue;
  next[k]={fetchedAt:Number(f.fetchedAt)||0,posts:f.posts.slice(0,1500).filter(p=>p&&typeof p.id==='string'&&p.id.startsWith(k+'/')&&/^[^/\s?#]+$/.test(p.id.slice(k.length+1))).map(p=>({id:p.id,title:String(p.title||'').slice(0,250),thumbnail:safeThumbnail(p.thumbnail),published:Number.isFinite(Date.parse(p.published))?p.published:null}))};
 }
 feeds=next;try{localStorage.setItem(FEEDS_KEY,JSON.stringify(feeds))}catch{}scheduleRender();
});
function feedPosts(){
 if(demoMode)return [];
 const refs=new Map();for(const p of posts){const k=keyOf(p);if(!refs.has(k)||p.creatorAvatar)refs.set(k,p)}
 const out=[];
 for(const [k,f] of Object.entries(feeds)){const ref=refs.get(k);for(const fp of f.posts){const [service,creatorId,postId]=fp.id.split('/');out.push({id:fp.id,service,creatorId,postId,url:`https://pawchive.pw/${service}/user/${creatorId}/post/${postId}`,title:fp.title||`Post ${postId}`,thumbnail:fp.thumbnail,published:fp.published,creator:ref?.creator||`Creator ${creatorId}`,creatorAvatar:ref?.creatorAvatar||'',seen:false,saved:false,updatedAt:fp.published,seenAt:null,isFeed:true})}}
 return out;
}
// "New" means: published within the last 45 days and after the newest post you have seen from that creator.
// The 45-day floor keeps old series-search hits out of this row.
function newFromCreators(a){
 const known=new Map(a.map(p=>[p.id,p])),out=[],floor=Date.now()-45*864e5;
 for(const [,list] of groupCreators(feedPosts())){
  let threshold=floor;for(const fp of list)if(known.get(fp.id)?.seen)threshold=Math.max(threshold,Date.parse(fp.published)||0);
  out.push(...newest(list.filter(fp=>{const own=known.get(fp.id);return !(own&&(own.seen||own.saved))&&(Date.parse(fp.published)||0)>threshold}),'published').slice(0,8));
 }
 return newest(out,'published').slice(0,24);
}
function unseenFromCreator(a,creatorKey){const known=new Map(a.map(p=>[p.id,p]));return newest(feedPosts().filter(fp=>keyOf(fp)===creatorKey&&!(known.get(fp.id)?.seen||known.get(fp.id)?.saved)),'published')}
// Turns a feed post into a collection entry the first time it is marked.
function adoptFeedPost(id){const fp=feedPosts().find(p=>p.id===id);if(!fp)return null;try{const p=normalize({...fp,updatedAt:new Date().toISOString()});posts.push(p);return p}catch{return null}}

// ── Series: detected from post titles such as "Show 9×11 & 9×12", "S02E05", "Season 1 Episode 3" ──
const EP_RE=/\bS(\d{1,2})\s*E(\d{1,3})(?:\s*(?:-|–|&|\+|,)\s*(?:S\d{1,2}\s*)?E?(\d{1,3}))?|(?<![\w.])(\d{1,2})\s*[x×]\s*(\d{1,3})(?!\d)|\bSeason\s*(\d{1,2})[\s,:-]*(?:Episode|Ep\.?)\s*(\d{1,3})|\b(?:Episode|Ep\.?)\s*(\d{1,3})\b/gi;
function parseEpisodes(title){
 const t=String(title||''),matches=[...t.matchAll(EP_RE)],strong=matches.filter(m=>m[1]||m[4]||m[6]),use=strong.length?strong:matches.filter(m=>m[8]).slice(0,1);
 if(!use.length)return null;
 const eps=[];
 for(const m of use){
  if(m[1]){const s=+m[1],e=+m[2];eps.push({s,e});if(m[3]&&+m[3]>e&&+m[3]-e<=5)for(let x=e+1;x<=+m[3];x++)eps.push({s,e:x})}
  else if(m[4])eps.push({s:+m[4],e:+m[5]});
  else if(m[6])eps.push({s:+m[6],e:+m[7]});
  else eps.push({s:1,e:+m[8],noSeason:true});
 }
 let name=t.slice(0,use[0].index);
 for(let i=0;i<4;i++)name=name.replace(/[\s\-–—:|·,#(\[]+$/,'').replace(/\b(?:full\s+)?(?:reactions?|reacts?|season|staffel)$/i,'');
 name=name.trim();
 return name.length>1?{name,eps:eps.filter(x=>x.e>0)}:null;
}
const epId=(s,e)=>s*1000+e;
const epLabel=(ep,noSeason)=>noSeason?`Folge ${ep.e}`:`${ep.s}×${ep.e}`;
const seriesKeyOf=(creatorKey,name)=>creatorKey+'|'+name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'');
function buildSeries(a){
 const items=new Map();for(const p of a)if(p.seen||p.saved)items.set(p.id,p);for(const fp of feedPosts())if(!items.has(fp.id))items.set(fp.id,fp);
 const map=new Map();
 for(const p of items.values()){
  const parsed=parseEpisodes(p.title);if(!parsed||!parsed.eps.length)continue;
  const k=seriesKeyOf(keyOf(p),parsed.name);let s=map.get(k);
  if(!s){s={key:k,name:parsed.name,ref:p,entries:[],noSeason:true};map.set(k,s)}
  if(p.seen&&!s.named){s.name=parsed.name;s.named=true}
  if(!p.isFeed&&(p.creatorAvatar||s.ref.isFeed))s.ref=p;
  s.entries.push({p,eps:parsed.eps});if(parsed.eps.some(x=>!x.noSeason))s.noSeason=false;
 }
 const rank=p=>p.seen?3:p.saved?2:1,out=[];
 for(const s of map.values()){
  const seenPosts=s.entries.filter(x=>x.p.seen).map(x=>x.p);if(!seenPosts.length||s.entries.length<2)continue;
  const eps=new Map();
  for(const x of s.entries)for(const ep of x.eps){const id=epId(ep.s,ep.e),cur=eps.get(id);if(!cur||rank(x.p)>rank(cur.p))eps.set(id,{s:ep.s,e:ep.e,p:x.p})}
  const seenIds=[...eps.values()].filter(x=>x.p.seen).map(x=>epId(x.s,x.e)).sort((x,y)=>x-y),lastId=seenIds[seenIds.length-1],last=eps.get(lastId);
  const next=[...eps.values()].filter(x=>!x.p.seen&&epId(x.s,x.e)>lastId).sort((x,y)=>epId(x.s,x.e)-epId(y.s,y.e))[0]||{s:last.s,e:last.e+1,p:null};
  const gaps=[],seasons=new Map();for(const id of seenIds){const sn=Math.floor(id/1000);if(!seasons.has(sn))seasons.set(sn,[]);seasons.get(sn).push(id%1000)}
  for(const [sn,list] of seasons){const max=Math.max(...list);for(let e=Math.min(...list)+1;e<max&&gaps.length<200;e++)if(!list.includes(e))gaps.push({s:sn,e,p:eps.get(epId(sn,e))?.p||null})}
  const cover=newest(seenPosts.filter(p=>safeThumbnail(p.thumbnail)),'seenAt')[0]||s.entries.find(x=>safeThumbnail(x.p.thumbnail))?.p||s.ref;
  // A jump (e.g. 9×12 → 12×11) means the episodes in between are probably just older than the creator's newest posts.
  const jump=!!next.p&&!(next.s===last.s&&next.e===last.e+1)&&!(next.s===last.s+1&&next.e===1);
  // The earliest known episode isn't 1×1: older seasons probably sit further back in the creator's posts.
  const startsLate=Math.min(...eps.keys())>epId(1,1);
  const o={...s,eps,seenCount:seenIds.length,last,next,gaps,cover,jump,startsLate,lastSeenAt:Math.max(...seenPosts.map(p=>Date.parse(p.seenAt)||0))};
  // Every episode slot per season (from the first to the last known one), so missing episodes count as open too.
  o.total=seasonList(o).reduce((n,x)=>n+x.max-x.min+1,0);out.push(o);
 }
 return out.sort((x,y)=>y.lastSeenAt-x.lastSeenAt);
}
// Ask the userscript to search a creator's posts by series name when the next episode or a gap was not found.
let lastSeriesSearch='';
// Search progress reported by the userscript, shown where episodes are missing.
const searchStatus=new Map(),searchKey=(creator,name)=>creator+'|'+String(name).toLowerCase();
window.addEventListener('seen-search-status',e=>{const st=e.detail;if(!st?.creator)return;searchStatus.set(searchKey(st.creator,st.name),st);if(view==='series'||activeSeries)scheduleRender()});
function searchNote(s,side=false){
 const creator=keyOf(s.ref),st=searchStatus.get(searchKey(creator,s.name)),mins=st?.at?Math.max(1,Math.round((Date.now()-st.at)/60000)):0,ago=mins<60?mins+' Min.':Math.round(mins/60)+' Std.';
 const busy=st&&(st.state==='queued'||st.state==='running'),running=busy?`Das Skript sucht gerade auf Pawchive …${st.hits?` ${st.hits} Treffer bisher`:''}`:'';
 const text=side
  ?(!st?'Durchsucht alle Posts dieses Creators nach der Serie.':busy?running:st.state==='done'?`Zuletzt gesucht: gerade eben, ${st.hits} Treffer.`:st.state==='cached'?`Zuletzt gesucht vor ${ago}, ${st.hits} Treffer.`:`Suche fehlgeschlagen: ${st.message||'unbekannter Fehler'}.`)
  :(!st?'Die Suche auf Pawchive wird angefragt …':busy?running:st.state==='done'?`Suche abgeschlossen: ${st.hits} Treffer, die fehlenden Folgen waren nicht dabei.`:st.state==='cached'?`Letzte Suche vor ${ago} mit ${st.hits} Treffern, die fehlenden Folgen waren nicht dabei.`:`Suche fehlgeschlagen: ${st.message||'unbekannter Fehler'}.`);
 return `<span class="ep-search-text">${esc(text)}</span>${busy?'':`<button class="row-refresh" data-search-force data-creator="${esc(creator)}" data-name="${esc(s.name)}">${icon('search')}<span>${side?'Weitere Folgen suchen':'Jetzt neu suchen'}</span></button>`}`;
}
function requestSeriesSearch(series){
 if(demoMode)return;
 // Finished series need no search for a "next" episode that doesn't exist.
 const queries=series.filter(s=>(!s.next.p||s.jump||s.startsLate||s.gaps.some(g=>!g.p))&&!seriesComplete(s)).map(s=>({creator:keyOf(s.ref),name:s.name})),signature=JSON.stringify(queries);
 if(!queries.length||signature===lastSeriesSearch)return;
 lastSeriesSearch=signature;window.dispatchEvent(new CustomEvent('seen-series-search',{detail:queries}));
}
// Series posters from TVmaze, delivered by the userscript and cached in IndexedDB as "poster:<name>".
// While a poster is missing (or none exists) the latest episode thumbnail stays visible.
const POSTER_KEY='seen-posters-v1',posterAsked=new Set();let posterState={};
try{posterState=JSON.parse(localStorage.getItem(POSTER_KEY)||'{}')||{}}catch{posterState={}}
const posterKey=name=>String(name).trim().toLowerCase();
function requestPosters(series){
 if(demoMode)return;
 cacheLoaded.then(()=>{
  const names=series.map(s=>s.name).filter(n=>{const k=posterKey(n);return posterState[k]!=='none'&&!imgCache.has('poster:'+k)&&!posterAsked.has(k)});
  if(!names.length)return;names.forEach(n=>posterAsked.add(posterKey(n)));
  window.dispatchEvent(new CustomEvent('seen-posters-request',{detail:names}));
 });
}
window.addEventListener('seen-posters',e=>{
 const {name,data,show}=e.detail||{};if(typeof name!=='string')return;const k=posterKey(name);
 if(typeof data==='string'&&data.startsWith('data:image/')){imgCache.set('poster:'+k,data);idbPut('poster:'+k,data);posterState[k]=String(show||'ok').slice(0,100);showImage('poster:'+k,data)}
 else if(!e.detail.error)posterState[k]='none';
 try{localStorage.setItem(POSTER_KEY,JSON.stringify(posterState))}catch{}
});
function seriesCover(s){
 const k=posterKey(s.name),data=imgCache.get('poster:'+k),orig=esc('poster:'+k);
 const fallback=`<span class="tile-initial">${esc(s.name.slice(0,2).toUpperCase())}</span>${image(s.cover)}`;
 if(posterState[k]==='none')return fallback;
 // Portrait poster on top of the thumbnail fallback; stays hidden until the image has arrived.
 return `${fallback}<img class="poster-full" data-orig="${orig}" alt="" decoding="async"${data?` src="${data}"`:' hidden'}>`;
}
function seriesCard(s){
 // Poster first: progress bar and next episode sit on the image, the creator stands out below it.
 const next=epLabel(s.next,s.noSeason),total=s.total,pct=total?Math.round(s.seenCount/total*100):0;
 const warn=s.jump?`Folgen vor ${next} fehlen`:s.gaps.length?`${s.gaps.length} ${s.gaps.length===1?'Lücke':'Lücken'}`:'';
 const done=seriesComplete(s);
 const label=done?`${s.name} von ${s.ref.creator}: komplett gesehen, alle ${total} Folgen`:`${s.name} von ${s.ref.creator}: ${s.seenCount} von ${total} Folgen gesehen, als Nächstes ${next}${s.next.p?'':' (noch nicht gefunden)'}${warn?', '+warn:''}`;
 const chip=done?`<span class="cover-next cover-done">${icon('check')}Komplett gesehen</span>`:`<span class="cover-next${s.next.p?'':' is-missing'}">${icon('play')}${esc(next)}</span>`;
 return `<a class="series-card${done?' is-complete':''}" href="#serie/${encodeURIComponent(s.key)}" style="--h:${hue(s.ref)}" aria-label="${esc(label)}" title="${esc(s.name)}"><span class="series-cover">${seriesCover(s)}<span class="cover-title">${esc(s.name)}</span><span class="cover-shade"></span>${warn&&!done?`<span class="cover-warn" title="${esc(warn)}"></span>`:''}${chip}<span class="cover-progress"><i style="width:${pct}%"></i></span></span><span class="series-body"><span class="series-creator">${avatar(s.ref,'mini-avatar series-avatar')}<span>${esc(s.ref.creator)}</span></span></span></a>`;
}
// Episode codes a post covers, e.g. "4×8 & 4×9".
function postEpisodes(p,noSeason){const parsed=parseEpisodes(p.title);return parsed?parsed.eps.map(ep=>epLabel(ep,noSeason)).join(' & '):''}
// Post descriptions from Pawchive (plain text, delivered by the userscript), cached in this browser.
const DESC_KEY='seen-desc-v1',descAsked=new Set(),descWanted=new Set();let descs={},descTimer=0;
try{descs=JSON.parse(localStorage.getItem(DESC_KEY)||'{}')||{}}catch{descs={}}
function requestDescriptions(ids){
 for(const id of ids)if(!(id in descs)&&!descAsked.has(id)){descAsked.add(id);descWanted.add(id)}
 if(!descWanted.size||descTimer)return;
 descTimer=setTimeout(()=>{descTimer=0;const list=[...descWanted];descWanted.clear();window.dispatchEvent(new CustomEvent('seen-descriptions-request',{detail:list}))},200);
}
window.addEventListener('seen-descriptions',e=>{
 let changed=false;
 for(const [id,text] of Object.entries(e.detail||{})){
  if(typeof text!=='string')continue;const t=text.slice(0,1200);
  if(descs[id]!==t){descs[id]=t;changed=true}
  // Fill rows in place so the page keeps its scroll position.
  for(const el of document.querySelectorAll('.ep-desc[data-desc-for]'))if(el.dataset.descFor===id){el.textContent=t;el.hidden=!t}
 }
 if(changed)try{localStorage.setItem(DESC_KEY,JSON.stringify(descs))}catch{}
});
document.addEventListener('click',e=>{const d=e.target.closest('.ep-desc');if(d){d.classList.toggle('is-open');d.setAttribute('aria-expanded',String(d.classList.contains('is-open')))}});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.classList?.contains('ep-desc')){e.preventDefault();e.target.click()}});
// Strips what the row already shows (series name, episode code, platform, "Reaction"),
// so "Dr. Who Reaction 15x8 - The Reality War" becomes "The Reality War". Without a real title it returns
// `fallback` (where the episode code is shown anyway, pass '') or else the code itself, e.g. "15×8".
function episodeTitle(p,seriesName,fallback){
 if(fallback===undefined){const parsed=parseEpisodes(p.title);fallback=parsed?parsed.eps.map(ep=>epLabel(ep,ep.noSeason)).join(' & '):p.title}
 let t=String(p.title||'');
 if(seriesName)t=t.replace(new RegExp(seriesName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),' ');
 t=t.replace(EP_RE,' ')
  .replace(/\((?:patreon|fanbox|fantia|subscribestar|gumroad|discord|boosty|afdian)\)/gi,' ')
  .replace(/\([^)]*\breacts?\b[^)]*\)/gi,' ')
  .replace(/\b(?:full\s+)?(?:reactions?|reacts?)\b|\bfull\b/gi,' ')
  .replace(/\(\s*[-–—:|·,&+]*\s*\)/g,' ').replace(/\s+/g,' ')
  .replace(/^[\s\-–—:|·,&#+]+|[\s\-–—:|·,&#+]+$/g,'');
 return t.length>1?t:fallback;
}
// Series poster as art cover behind the episode thumbnail: visible when Pawchive has no image (or it fails to load).
function episodeArt(name){
 if(!name)return '';const k=posterKey(name);if(posterState[k]==='none')return '';
 const data=imgCache.get('poster:'+k),src=data?` src="${data}"`:' hidden',orig=esc('poster:'+k);
 return `<span class="ep-art" aria-hidden="true"><img class="ep-art-bg" data-orig="${orig}" alt=""${src}><img class="ep-art-fg" data-orig="${orig}" alt=""${src}></span>`;
}
// IMDb links per episode. The script looks up the show on TVmaze and the episode IDs on Wikidata;
// without an exact ID the link falls back to the season page, then to an IMDb search.
// v2: entries saved while an older script (without the "ended" info) was connected are dropped once.
const IMDB_KEY='seen-imdb-v2',imdbAsked=new Set();let imdbData={};
try{imdbData=JSON.parse(localStorage.getItem(IMDB_KEY)||'{}')||{}}catch{imdbData={}}
function requestImdb(name){
 const k=posterKey(name),old=imdbData[k];
 // Full episode lists are kept 7 days; an empty answer is asked again after a day.
 // Entries from older scripts lack the "ended" (2.18) or "backdrop" (2.19) info and are asked again.
 if(demoMode||imdbAsked.has(k)||(old&&'ended' in old&&'backdrop' in old&&Date.now()-(old.at||0)<(Object.keys(old.eps||{}).length?7:1)*864e5))return;
 // Sent after startup: the first render runs before sync.js listens, so a direct event would be lost.
 imdbAsked.add(k);const ask=()=>window.dispatchEvent(new CustomEvent('seen-imdb-request',{detail:[name]}));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ask,{once:true});else ask();
}
function imdbUrl(name,s,e){
 const d=imdbData[posterKey(name)];const id=d?.eps?.[s+'x'+e];
 if(/^tt\d+$/.test(id||''))return 'https://www.imdb.com/title/'+id+'/';
 if(/^tt\d+$/.test(d?.show||''))return `https://www.imdb.com/title/${d.show}/episodes/?season=${s}`;
 return 'https://www.imdb.com/find/?s=tt&q='+encodeURIComponent(name);
}
function imdbLinks(p,seriesName){
 const parsed=seriesName&&parseEpisodes(p.title);if(!parsed)return '';
 const eps=parsed.eps.slice(0,4),one=eps.length===1;
 const link=(ep,inner,cls)=>`<a class="${cls}" href="${esc(imdbUrl(seriesName,ep.s,ep.e))}" data-imdb="${esc(posterKey(seriesName))}" data-s="${ep.s}" data-e="${ep.e}" target="_blank" rel="noopener noreferrer" title="Folge ${ep.e} auf IMDb" aria-label="Folge ${ep.e} auf IMDb öffnen">${inner}</a>`;
 const logo='<span class="imdb-logo">IMDb</span>';
 return `<span class="ep-imdb">${one?link(eps[0],logo,'imdb-main'):logo+eps.map(ep=>link(ep,String(ep.e),'imdb-ep')).join('')}</span>`;
}
window.addEventListener('seen-imdb',e=>{
 const {name,show,eps,ended,final,backdrop}=e.detail||{};if(typeof name!=='string')return;const k=posterKey(name),wasEnded=!!imdbData[k]?.ended,hadBackdrop=!!imdbData[k]?.backdrop;
 const fin=final&&Number(final.s)>0&&Number(final.e)>0?{s:Number(final.s),e:Number(final.e)}:null;
 const wide=typeof backdrop==='string'&&/^https:\/\/([\w-]+\.)*tvmaze\.com\//.test(backdrop)?backdrop:'';
 // An older script sends no "ended"/"backdrop" at all: keep the keys out, so the series is asked again after a script update.
 imdbData[k]={show:String(show||''),eps:eps&&typeof eps==='object'?eps:{},...(typeof ended==='boolean'?{ended,final:fin}:{}),...(typeof backdrop==='string'?{backdrop:wide}:{}),at:Date.now()};
 if(!!wide!==hadBackdrop&&view==='all'&&!activeCreator&&!activeSeries)scheduleRender();
 try{localStorage.setItem(IMDB_KEY,JSON.stringify(imdbData))}catch{}
 for(const a of document.querySelectorAll('a[data-imdb]'))if(a.dataset.imdb===k)a.href=imdbUrl(name,a.dataset.s,a.dataset.e);
 if(!!ended!==wasEnded)scheduleRender();
});
// A series counts as finished when TVmaze says the show ended and you have seen everything up to its final episode.
function seriesComplete(s){
 const d=imdbData[posterKey(s.name)];
 return !s.noSeason&&!!d?.ended&&!!d.final&&s.seenCount>=s.total&&!s.gaps.length&&epId(s.last.s,s.last.e)>=epId(d.final.s,d.final.e);
}
// Junk thumbnails (tiny, nearly colourless like a white blob, or black) are hidden so the poster art shows instead.
// "Black" means really black (measured 0.000): dark but real movie thumbnails sit around 0.05-0.06 and must stay.
function junkThumb(img){
 if(img.naturalWidth&&img.naturalWidth<80)return true;
 try{const c=document.createElement('canvas');c.width=24;c.height=14;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,24,14);const d=g.getImageData(0,0,24,14).data,n=d.length/4;let sat=0,lum=0;for(let i=0;i<d.length;i+=4){const mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]);sat+=mx?(mx-mn)/mx:0;lum+=(d[i]*.299+d[i+1]*.587+d[i+2]*.114)/255}return sat/n<.06||lum/n<.02}catch{return false}
}
// Everywhere a post thumbnail is shown; behind it sits the series poster (if known) or the initials.
function checkThumb(img){if(img.complete&&img.naturalWidth&&junkThumb(img))img.hidden=true}
document.addEventListener('load',e=>{if(['post-thumbnail','hero-image','hero-bg'].some(c=>e.target.classList?.contains(c)))checkThumb(e.target)},true);
// Post id -> series name, so tiles outside the series page can show the poster art too.
let seriesByPost=new Map();
// Series name for a tile's poster art: a known series, or whatever show the title names. The poster sits behind the
// thumbnail, so it only shows when Pawchive has no image or its image URL doesn't load (common for fresh imports).
const artWanted=new Set();let artTimer=0;
function artName(p){
 const known=seriesByPost.get(p.id);if(known)return known;
 const name=parseEpisodes(p.title)?.name||'';
 if(name){artWanted.add(name);if(!artTimer)artTimer=setTimeout(()=>{artTimer=0;requestPosters([...artWanted].map(name=>({name})));artWanted.clear()},0)}
 return name;
}
// One episode row: big number, thumbnail, title and time, actions on the right.
function episodeRow(p,num,noSeason,seriesName=''){
 const label=p.saved?'Aus Merkliste entfernen':'Für später merken';
 // One episode: IMDb sits in the button row. Several: the IMDb group gets its own row below.
 const imdb=imdbLinks(p,seriesName),multi=imdb.includes('imdb-ep');
 return `<article class="ep-row ${p.seen?'is-seen':'is-open'}"><div class="ep-num" aria-hidden="true">${String(num).padStart(2,'0')}</div>
<div class="ep-thumb" style="--h:${hue(p)}"><span class="tile-initial">${esc(initials(p))}</span>${episodeArt(seriesName)}${image(p)}${p.url?`<a class="tile-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(p.title)} auf Pawchive öffnen"></a><span class="tile-play" aria-hidden="true">${icon('play')}</span>`:''}${p.seen?`<span class="ep-seen-badge">${icon('check')}</span>`:''}</div>
<div class="ep-body"><h3 title="${esc(p.title)}">${esc(episodeTitle(p,seriesName))}</h3><div class="tile-meta"><span>${p.seen?'Gesehen '+date(p.seenAt)+(validSeenAt(p.seenAt)?' · '+historyTime(p.seenAt):''):p.isFeed?'Erschienen '+date(p.published):'Gemerkt '+date(p.updatedAt)}</span></div>
<div class="ep-actions"><button class="${p.seen?'on':''}" data-action="seen" data-id="${esc(p.id)}" aria-label="${p.seen?'Als ungesehen markieren':'Als gesehen markieren'}: ${esc(p.title)}">${icon(p.seen?'check':'eye')}${p.seen?'Gesehen':'Gesehen markieren'}</button>${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Öffnen${icon('arrow')}</a>`:''}<button class="ep-save" data-action="saved" data-id="${esc(p.id)}" title="${label}" aria-label="${label}: ${esc(p.title)}" aria-pressed="${p.saved}">${icon('bookmark')}</button>${multi?'':imdb}</div>${multi?`<div class="ep-actions ep-imdb-row">${imdb}</div>`:''}</div>
<p class="ep-desc" data-desc-for="${esc(p.id)}" role="button" tabindex="0" aria-expanded="false" title="Klicken zum Auf- oder Zuklappen"${descs[p.id]?'':' hidden'}>${esc(descs[p.id]||'')}</p></article>`;
}
function seasonList(s){const seasons=new Map();for(const ep of s.eps.values()){if(!seasons.has(ep.s))seasons.set(ep.s,{eps:[],seen:0});const x=seasons.get(ep.s);x.eps.push(ep.e);if(ep.p.seen)x.seen++}return [...seasons].sort((a,b)=>a[0]-b[0]).map(([sn,x])=>({sn,min:Math.min(...x.eps),max:Math.max(...x.eps),seen:x.seen}))}
// Sticky side panel: cover, next episode, progress per season, gaps.
function seriesSide(s){
 const nextLabel=epLabel(s.next,s.noSeason),seasons=seasonList(s),total=s.total,pct=total?Math.round(s.seenCount/total*100):0,open=total-s.seenCount;
 const complete=seriesComplete(s);
 const cta=complete?`<div class="side-next is-complete"><span class="eyebrow">Geschafft</span><strong>Komplett gesehen</strong><p>Alle ${total} Folgen bis zum Finale ${esc(epLabel(s.last,s.noSeason))}.</p><button class="side-link" data-jump-current>Zum Finale ↓</button></div>`
  :s.next.p?`<div class="side-next"><span class="eyebrow">Als Nächstes</span><strong>${esc(nextLabel)}</strong><div class="side-actions">${s.next.p.url?`<a class="btn btn-light" href="${esc(s.next.p.url)}" target="_blank" rel="noopener noreferrer">${icon('play')}Ansehen</a>`:''}<button class="btn btn-ghost" data-action="seen" data-id="${esc(s.next.p.id)}">${icon('check')}Gesehen</button></div><button class="side-link" data-jump-current>Zur Folge in der Liste ↓</button></div>`
  :`<div class="side-next is-missing"><span class="eyebrow">Als Nächstes</span><strong>${esc(nextLabel)}</strong><p>Noch nicht auf Pawchive gefunden.</p><button class="side-link" data-jump-current>Zur letzten Folge ↓</button></div>`;
 return `<aside class="series-side" aria-label="Serienübersicht"><div class="side-head"><div class="side-poster" style="--h:${hue(s.ref)}">${seriesCover(s)}</div><div class="side-title"><span class="eyebrow">Serie</span><strong>${esc(s.name)}</strong><span>${esc(s.ref.creator)}</span></div></div>
${cta}
<div class="side-block"><div class="side-progress-head"><span>Fortschritt</span><b>${s.seenCount} / ${total}</b></div><div class="side-bar"><i style="width:${pct}%"></i></div><div class="side-stats"><span><b>${open}</b> offen</span><span>zuletzt ${esc(epLabel(s.last,s.noSeason))}</span>${s.gaps.length?`<span class="warn"><b>${s.gaps.length}</b> ${s.gaps.length===1?'Lücke':'Lücken'}</span>`:''}</div></div>
${seasons.length>1||!s.noSeason?`<div class="side-block"><span class="eyebrow">Staffeln</span><div class="side-seasons">${seasons.map(x=>{const count=x.max-x.min+1,w=Math.round(x.seen/count*100);return `<button class="side-season${x.seen>=count?' done':''}" data-season="${x.sn}"><span>${s.noSeason?'Folgen':'Staffel '+x.sn}</span><span class="side-season-bar"><i style="width:${w}%"></i></span><b>${x.seen}/${count}</b></button>`}).join('')}</div></div>`:''}
${s.gaps.length?`<div class="side-block"><span class="eyebrow">Übersprungen</span><div class="chips">${s.gaps.slice(0,10).map(g=>`<span class="chip chip-gap">${esc(epLabel(g,s.noSeason))}</span>`).join('')}${s.gaps.length>10?`<span class="chip">+${s.gaps.length-10}</span>`:''}</div></div>`:''}
${complete?'':`<div class="side-block side-search"><span class="eyebrow">Folgen auf Pawchive</span>${searchNote(s,true)}</div>`}
<a class="side-creator" href="${creatorLink(s.ref)}">${avatar(s.ref)}<span>${esc(s.ref.creator)}</span><span aria-hidden="true">↗</span></a></aside>`;
}
function seriesDetail(s){
 // Chronological (season 1 first). The current spot is the next unwatched episode, or your last one if the next is not on Pawchive yet.
 const target=s.next.p||s.last.p,nextLabel=epLabel(s.next,s.noSeason);
 let main='';const done=new Set();
 for(const x of seasonList(s)){
  const sn=x.sn;let rows='';
  for(let e=x.min;e<=x.max&&e-x.min<300;e++){
   const ep=s.eps.get(epId(sn,e));
   if(!ep){rows+=`<div class="ep-missing"><span class="ep-num" aria-hidden="true">${String(e).padStart(2,'0')}</span><span class="ep-code">${epLabel({s:sn,e},s.noSeason)}</span>Nicht gesehen und auf Pawchive nicht gefunden</div>`;continue}
   if(done.has(ep.p.id))continue;done.add(ep.p.id);
   if(ep.p.id!==target.id){rows+=episodeRow(ep.p,e,s.noSeason,s.name);if(s.jump&&ep.p.id===s.last.p.id)rows+=`<div class="ep-missing ep-search"><span class="ep-code">ab ${epLabel({s:s.last.s,e:s.last.e+1},s.noSeason)}</span><span>Die Folgen bis ${nextLabel} fehlen noch. ${searchNote(s)}</span></div>`;continue}
   const finale=seriesComplete(s);
   rows+=`<div class="ep-current${finale?' is-finale':''}" id="series-current"><span class="ep-current-label">${icon(s.next.p?'play':'check')}${s.next.p?'Als Nächstes · '+nextLabel:(finale?'Finale · ':'Zuletzt gesehen · ')+epLabel(s.last,s.noSeason)}</span>${episodeRow(ep.p,e,s.noSeason,s.name)}</div>`;
   if(!s.next.p&&!finale)rows+=`<div class="ep-missing ep-search"><span class="ep-code">${nextLabel}</span><span>Noch nicht auf Pawchive gefunden. ${searchNote(s)}</span></div>`;
  }
  const count=x.max-x.min+1,state=x.seen>=count?'done':sn===(s.next.p?s.next:s.last).s||x.seen?'active':'todo';
  main+=`<section class="season" id="season-${sn}"><h2 class="season-head" data-state="${state}"><span class="season-num" aria-hidden="true">${state==='done'?'✓':s.noSeason?'#':sn}</span><span class="season-info"><span>${s.noSeason?'Folgen':'Staffel '+sn}</span><small>${x.seen} von ${count} gesehen</small><i class="season-bar"><i style="width:${Math.round(x.seen/count*100)}%"></i></i></span></h2><div class="ep-list">${rows}</div></section>`;
 }
 if(!demoMode)requestDescriptions([...done]);
 return `<div class="series-layout"><div class="series-main">${main}</div>${seriesSide(s)}</div>`;
}

function filtered(){const q=$('#search').value.trim().toLocaleLowerCase(),creator=$('#creatorFilter').value;let a=data().filter(p=>(view==='saved'?p.saved:p.seen)&&(!q||`${p.title} ${p.creator}`.toLocaleLowerCase().includes(q))&&(!creator||keyOf(p)===creator)&&(!activeCreator||keyOf(p)===activeCreator)&&(view!=='saved'||status==='all'||p.seen===(status==='seen')));const sort=$('#sort').value;if(sort==='title')return a.sort((x,y)=>x.title.localeCompare(y.title,'de'));const field=view==='history'?'seenAt':'updatedAt';return a.sort((x,y)=>((Date.parse(y[field])||0)-(Date.parse(x[field])||0))*(sort==='old'?-1:1))}

function tile(p,history=false,badge='',badgeClass=''){
 const label=p.saved?'Aus Merkliste entfernen':'Für später merken';
 const open=p.url?`<a class="tile-link" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(p.title)} auf Pawchive öffnen"></a>`:'';
 const fresh=p.isFeed&&(Date.parse(p.published)||0)>Date.now()-14*864e5;
 return `<article class="tile ${p.seen?'is-seen':'is-open'} ${p.saved?'is-saved':''} ${fresh?'is-new':''}">
<div class="tile-media" style="--h:${hue(p)}"><span class="tile-initial">${esc(initials(p))}</span>${episodeArt(artName(p))}${image(p)}${open}
${badge?`<span class="tile-ep ${badgeClass}">${esc(badge)}</span>`:''}${fresh&&!p.seen?`<span class="tile-status">${icon('spark')}Neu</span>`:''}
<button class="tile-save" data-action="saved" data-id="${esc(p.id)}" title="${label}" aria-label="${label}: ${esc(p.title)}" aria-pressed="${p.saved}">${icon('bookmark')}</button>
${p.url?`<span class="tile-play" aria-hidden="true">${icon('play')}</span>`:''}</div>
<div class="tile-info"><div class="tile-creator">${avatar(p)}<a href="${creatorLink(p)}">${esc(p.creator)}</a></div><h3>${esc(p.title)}</h3>
<div class="tile-meta">${history?`<span class="time">${icon('clock')}${historyTime(p.seenAt)}</span>`:`<span>${p.seen?'Gesehen '+date(p.seenAt):p.isFeed?'Erschienen '+date(p.published):'Gemerkt '+date(p.updatedAt)}</span>`}</div>
<div class="tile-actions"><button class="${p.seen?'on':''}" data-action="seen" data-id="${esc(p.id)}" aria-label="${p.seen?'Als ungesehen markieren':'Als gesehen markieren'}: ${esc(p.title)}">${icon(p.seen?'check':'eye')}${p.seen?'Gesehen':'Gesehen markieren'}</button>${p.url?`<a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(p.title)} öffnen">Öffnen${icon('arrow')}</a>`:'<span class="demo-note">Demo</span>'}</div></div></article>`}

// Creator card: the creator's Pawchive banner fills the card (latest thumbnail as fallback), square avatar, service badge.
const serviceName=s=>({patreon:'Patreon',fanbox:'Fanbox',fantia:'Fantia',subscribestar:'SubscribeStar',gumroad:'Gumroad',discord:'Discord',boosty:'Boosty',afdian:'Afdian'}[s]||s);
function creatorTile(k,g){
 const p=g.find(p=>p.creatorAvatar)||g[0],last=newest(g,'seenAt')[0],cover=newest(g.filter(p=>safeThumbnail(p.thumbnail)),'seenAt')[0];
 const banner={banner:`https://pawchive.pw/banners/${p.service}/${p.creatorId}`};
 return `<a class="creator-tile" href="#creator/${encodeURIComponent(k)}" style="--h:${hue(p)}"><span class="creator-backdrop">${cover?image(cover,'thumbnail','creator-cover'):''}${image(banner,'banner','creator-banner')}</span><span class="creator-shade"></span>${avatar(p,'creator-avatar-sq')}<span class="creator-text"><span class="creator-badge" data-service="${esc(p.service)}">${esc(serviceName(p.service))}</span><strong>${esc(p.creator)}</strong><small><b>${g.length}</b> ${g.length===1?'Post':'Posts'} gesehen · zuletzt ${date(last.seenAt)}</small></span></a>`;
}

let heroIndex=0,heroCount=0,heroPaused=false,heroStart=performance.now(),heroTick=performance.now(),lastHeroHtml='';const HERO_MS=9000;
// The overview header rotates after 9 s of visible, unpaused time: while hovered/focused, hidden or on another view
// the start time moves along, so the clock stands still. The active dash fills up (CSS) over exactly that time.
const heroElapsed=()=>performance.now()-heroStart;
setInterval(()=>{
 const now=performance.now(),dt=now-heroTick;heroTick=now;
 if(heroCount<2||heroPaused||document.hidden||view!=='all'||activeCreator||activeSeries){heroStart+=dt;return}
 if(heroElapsed()>=HERO_MS){heroIndex=(heroIndex+1)%heroCount;showHero()}
},100);
function showHero(){const a=data(),h=$('#hero');heroStart=performance.now();renderHero(a,buildSeries(a));h.classList.remove('is-switching');void h.offsetWidth;h.classList.add('is-switching')}
// Puts the filling dash at the clock's position: after a rebuild and when coming back to the tab.
function syncHeroBar(restart=false){
 // Pausing only toggles the class (CSS pauses the running fill); a changed delay would make it jump.
 const h=$('#hero'),b=h.querySelector('.hero-dots [aria-selected=true]');h.classList.toggle('is-paused',heroPaused);if(!b||!restart)return;
 b.style.setProperty('--hero-delay',-Math.round(heroElapsed())+'ms');b.classList.remove('is-filling');void b.offsetWidth;b.classList.add('is-filling');
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-hero-index]');if(b){heroIndex=+b.dataset.heroIndex;showHero()}});
for(const [type,paused] of [['pointerenter',true],['pointerleave',false],['focusin',true],['focusout',false]])$('#hero').addEventListener(type,()=>{heroPaused=paused;syncHeroBar()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncHeroBar(true)});
// The preview card's light reflex follows the pointer (no 3D tilt: Firefox clipped tilted rounded edges unevenly).
$('#hero').addEventListener('pointermove',e=>{const c=e.target.closest('.hero-poster');if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--gx',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');c.style.setProperty('--gy',((e.clientY-r.top)/r.height*100).toFixed(1)+'%')});
function renderHero(a,series=[]){
 const seen=a.filter(p=>p.seen),saved=a.filter(p=>p.saved),open=saved.filter(p=>!p.seen),creators=new Set(seen.map(keyOf)),week=seen.filter(p=>Date.parse(p.seenAt)>Date.now()-7*864e5).length;
 const latest=newest(seen,'seenAt')[0],hero=$('#hero');
 const chips=`<div class="hero-stats"><a href="#library"><b>${seen.length.toLocaleString('de-DE')}</b>gesehen</a><a href="#saved"><b>${open.length.toLocaleString('de-DE')}</b>auf der Merkliste</a><a href="#creators"><b>${creators.size.toLocaleString('de-DE')}</b>Creator</a>${week?`<span class="accent"><b>+${week}</b>diese Woche</span>`:''}</div>`;
 if(!latest){lastHeroHtml='';hero.className='hero hero-welcome';hero.innerHTML=`<div class="hero-backdrop"></div><div class="hero-inner"><div class="hero-copy"><span class="kicker"><span class="live-dot"></span>Willkommen in deinem Space</span><h1>Deine Sammlung.<br>Alles im Blick.</h1><p class="hero-lead">Ein Ort für alles, was du auf Pawchive schon gesehen hast, und alles, was du dir noch ansehen möchtest.</p><div class="hero-actions"><button class="btn btn-light" data-open-setup>${icon('sync')}Auto-Sync verbinden</button><button class="btn btn-ghost" data-import>${icon('upload')}Backup importieren</button>${demoMode?'':`<button class="btn btn-ghost" data-demo>${icon('play')}Demo ansehen</button>`}</div>${a.length?chips:''}</div></div>`;return}
 // Next episodes of your running series, most recently watched first; the header rotates through them.
 const list=series.filter(s=>s.next.p&&s.last.p&&!seriesComplete(s)).sort((x,y)=>(Date.parse(y.last.p.seenAt)||0)-(Date.parse(x.last.p.seenAt)||0)).slice(0,6);
 heroCount=list.length;heroIndex%=Math.max(1,heroCount);
 const cont=list[heroIndex];
 if(cont){
  const p=cont.next.p,code=postEpisodes(p,cont.noSeason)||epLabel(cont.next,cont.noSeason);
  // Wide TVmaze background when known (not on Claude, which blocks outside images); else the blurred thumbnail.
  const wide=!PROXY_ONLY&&imdbData[posterKey(cont.name)]?.backdrop;
  const dots=heroCount>1?`<div class="hero-dots" role="tablist" aria-label="Serien im Kopfbereich">${list.map((s,i)=>`<button role="tab" data-hero-index="${i}" aria-selected="${i===heroIndex}" aria-label="${esc(s.name)}" title="${esc(s.name)}"></button>`).join('')}</div>`:'';
  // Only a real title next to the code ("10×9 The Holiday Summation"), never "Folge 9" again.
  const title=episodeTitle(p,cont.name,'');
  const html=`<div class="hero-backdrop" style="--h:${hue(cont.ref)}">${wide?`<img class="hero-wide" src="${esc(wide)}" alt="" decoding="async">`:image(p,'thumbnail','hero-bg')}</div><div class="hero-inner"><div class="hero-copy"><span class="kicker"><span class="live-dot"></span>Als Nächstes · ${esc(code)}</span><h1>${esc(cont.name)}</h1><p class="hero-lead">${title?esc(title)+' · ':''}Zuletzt gesehen ${esc(epLabel(cont.last,cont.noSeason))} am ${date(cont.last.p.seenAt)}</p><div class="hero-creator">${avatar(cont.ref)}<a href="${creatorLink(cont.ref)}">${esc(cont.ref.creator)}</a><span class="service">${esc(cont.ref.service)}</span></div><div class="hero-actions">${p.url?`<a class="btn btn-light" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${icon('play')}Ansehen</a>`:''}<button class="btn btn-ghost" data-action="seen" data-id="${esc(p.id)}">${icon('check')}Gesehen</button><a class="btn btn-ghost" href="#serie/${encodeURIComponent(cont.key)}">Zur Serie</a></div>${chips}${dots}</div><${p.url?`a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(cont.name)} ${esc(code)} ansehen"`:'div'} class="hero-poster" style="--h:${hue(cont.ref)}"><span class="tile-initial">${esc(initials(p))}</span>${episodeArt(cont.name)}${image(p,'thumbnail','hero-image')}<span class="hero-play" aria-hidden="true">${icon('play')}</span><span class="hero-ep"><b>${esc(code)}</b>${title?`<span>${esc(title)}</span>`:''}</span></${p.url?'a':'div'}></div>`;
  // Rebuild only when something changed: frequent data refreshes would otherwise restart the dash and animations.
  if(html!==lastHeroHtml){lastHeroHtml=html;hero.className='hero'+(wide?' has-wide':'');hero.innerHTML=html;syncHeroBar(true)}else syncHeroBar();
  return;
 }
 lastHeroHtml='';hero.className='hero';
 hero.innerHTML=`<div class="hero-backdrop" style="--h:${hue(latest)}">${image(latest,'thumbnail','hero-bg')}</div><div class="hero-inner"><div class="hero-copy"><span class="kicker"><span class="live-dot"></span>Zuletzt gesehen · ${date(latest.seenAt)}</span><h1>${esc(latest.title)}</h1><div class="hero-creator">${avatar(latest)}<a href="${creatorLink(latest)}">${esc(latest.creator)}</a><span class="service">${esc(latest.service)}</span></div><div class="hero-actions">${latest.url?`<a class="btn btn-light" href="${esc(latest.url)}" target="_blank" rel="noopener noreferrer">${icon('play')}Post öffnen</a>`:''}<a class="btn btn-ghost" href="#history">${icon('clock')}Verlauf</a></div>${chips}</div><div class="hero-poster" style="--h:${hue(latest)}"><span class="tile-initial">${esc(initials(latest))}</span>${episodeArt(seriesByPost.get(latest.id))}${image(latest,'thumbnail','hero-image')}</div></div>`;
}
function row(eyebrow,title,link,items,cls='',extra=''){return `<section class="row ${cls}"><div class="row-head"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2></div><div class="row-nav">${extra}${link?`<a href="${link}">Alle ansehen<span aria-hidden="true">↗</span></a>`:''}<button class="row-btn" data-scroll="-1" aria-label="${title}: zurückblättern">${icon('left')}</button><button class="row-btn" data-scroll="1" aria-label="${title}: weiterblättern">${icon('right')}</button></div></div><div class="row-track" tabindex="-1">${items}</div></section>`}
function renderRows(a,series){
 // Order: recently watched, continue series, watch list (only when it has entries), creators.
 const seen=a.filter(p=>p.seen),open=newest(a.filter(p=>p.saved&&!p.seen)).slice(0,14),recent=newest(seen,'seenAt').slice(series.some(s=>s.next.p&&s.last.p&&!seriesComplete(s))?0:1).slice(0,14),groups=[...groupCreators(seen)].sort((x,y)=>y[1].length-x[1].length).slice(0,14);
 if(!a.length){$('#rows').innerHTML='';return}
 let html='';
 if(recent.length)html+=row('Dein Rückblick','Zuletzt gesehen','#library',recent.map(p=>tile(p)).join(''));
 if(series.length)html+=row('Deine Serien','Weiterschauen','#series',series.slice(0,14).map(seriesCard).join(''),'row-series');
 if(open.length)html+=row('Merkliste','Für einen freien Moment','#saved',open.map(p=>tile(p)).join(''));
 if(groups.length)html+=row('Deine Creator','Immer wieder gern gesehen','#creators',groups.map(([k,g])=>creatorTile(k,g)).join(''),'row-creators');
 $('#rows').innerHTML=html;
}

function emptyState(){const a=data(),q=$('#search').value||$('#creatorFilter').value||status!=='all';let title,copy;if(q){title='Gerade kein Treffer.';copy='Versuche einen anderen Suchbegriff oder setze deine Filter zurück.'}else if(view==='saved'){title='Platz für deine nächsten Entdeckungen.';copy='Klicke auf das Lesezeichen an einem Post, um ihn für später aufzuheben.'}else if(view==='history'){title='Dein Rückblick beginnt mit dem ersten Post.';copy='Sobald du einen Post als gesehen markierst, findest du ihn hier mit Datum und Uhrzeit.'}else if(a.length){title='Hier entsteht deine Mediathek.';copy='Gesehene Posts erscheinen hier. Du kannst einen Post hinzufügen oder dein Skript verbinden.'}else{title='Ein neuer Platz für deine Sammlung.';copy='Verbinde dein Violentmonkey-Skript oder importiere dein Backup. Deine Posts und Creator finden dann automatisch hier zusammen.'}return `<div class="empty"><div class="empty-icon">${icon(q?'search':view==='saved'?'bookmark':view==='history'?'clock':'grid')}</div><h3>${title}</h3><p>${copy}</p><div class="empty-buttons">${q?'<button class="btn btn-light" data-reset-filters>Filter zurücksetzen</button>':`<button class="btn btn-light" data-open-setup>Auto-Sync einrichten</button><button class="btn btn-ghost" data-import>Backup importieren</button>`}</div></div>`}

let activeSeries='',seriesJumpPending=false,seriesAdvance='',seriesFollow=false,spyFrame=0;
// Marks the season you are scrolling through in the side panel: the last season whose heading has reached the top bar.
function updateSeasonSpy(){
 if(!activeSeries)return;
 const sections=document.querySelectorAll('.season');if(!sections.length)return;
 const line=(document.querySelector('.topbar')?.offsetHeight||64)+60;let current=sections[0].id;
 for(const section of sections)if(section.getBoundingClientRect().top<=line)current=section.id;
 const n=current.replace('season-','');
 for(const b of document.querySelectorAll('.side-season')){const on=b.dataset.season===n;b.classList.toggle('is-active',on);if(on)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')}
}
addEventListener('scroll',()=>{if(!spyFrame)spyFrame=requestAnimationFrame(()=>{spyFrame=0;updateSeasonSpy()})},{passive:true});
// After the jump the page keeps the current episode in view while more episodes load above it,
// until the user scrolls on their own.
for(const type of ['wheel','touchmove','mousedown'])addEventListener(type,()=>{seriesFollow=false},{passive:true});
addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))seriesFollow=false});
// The current episode lands right below its sticky season heading, so heading, side panel and episode show the same season.
function scrollToCurrent(smooth=true){
 const el=document.getElementById('series-current');if(!el)return;
 const head=el.closest('.season')?.querySelector('.season-head'),offset=head?(parseFloat(getComputedStyle(head).top)||0)+head.offsetHeight:(document.querySelector('.topbar')?.offsetHeight||64);
 scrollTo({top:Math.max(0,el.getBoundingClientRect().top+scrollY-offset-12),behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'auto'});
}
const config={series:['Deine Serien','Serien','Automatisch aus den Post-Titeln erkannt: wie weit du bist, welche Folgen fehlen und was als Nächstes kommt.'],library:['Deine Mediathek','Mediathek','Alles, was du schon gesehen hast. Gesammelt an einem Ort.'],saved:['Merkliste','Für später','Deine nächste Entdeckung wartet schon.'],creators:['Deine Creator','Creator','Menschen, deren Inhalte du immer wieder gerne ansiehst.'],history:['Ein Blick zurück','Verlauf','Jeder gesehene Post mit seinem Zeitpunkt, in deiner lokalen Zeit.']};
function render(){
 clearTimeout(renderTimer);
 const a=data(),home=view==='all'&&!activeCreator&&!activeSeries,series=buildSeries(a);
 seriesByPost=new Map();for(const s of series)for(const ep of s.eps.values())seriesByPost.set(ep.p.id,s.name);
 requestSeriesSearch(series);requestPosters(series);
 // IMDb links on the series page, and the "finished" state for every series card.
 for(const s of series)requestImdb(s.name);
 $('#navCount').textContent=a.filter(p=>p.seen).length;$('#savedCount').textContent=a.filter(p=>p.saved).length;$('#seriesCount').textContent=series.length;
 $('#demoBanner').hidden=!demoMode;$('#demo').hidden=demoMode;
 $('#home').hidden=!home;$('#browse').hidden=home;
 setTimeout(imageReport,400);
 if(home){renderHero(a,series);renderRows(a,series);sync();return}
 // Creator page: posts from the creator's feed that are not in the collection yet.
 const extra=$('#creatorExtra'),unseen=activeCreator?unseenFromCreator(a,activeCreator):[];
 // Only the 30 newest as tiles: hundreds of tiles (each fetching its image through the script) made opening a creator slow.
 const [csvc,ccid]=(activeCreator||'').split('/'),more=unseen.length-30;
 const moreTile=more>0?`<a class="row-more" href="https://pawchive.pw/${encodeURIComponent(csvc)}/user/${encodeURIComponent(ccid)}" target="_blank" rel="noopener noreferrer"><b>+${more}</b><span>weitere auf Pawchive</span>${icon('arrow')}</a>`:'';
 extra.hidden=!unseen.length;extra.innerHTML=unseen.length?row('Auf Pawchive','Noch nicht gesehen ('+unseen.length+')','',unseen.slice(0,30).map(p=>tile(p)).join('')+moreTile,'',`<button class="row-refresh" data-refresh-feeds title="Neue Posts jetzt auf Pawchive suchen">${icon('sync')}<span>Aktualisieren</span></button>`):'';
 // Creator page: Patreon logo linking to the creator's Patreon page (Pawchive keeps the Patreon user ID).
 const [svc,cid]=(activeCreator||'').split('/'),origin=$('#creatorOrigin');
 origin.hidden=svc!=='patreon'||!cid;
 if(!origin.hidden){origin.href=/^\d+$/.test(cid)?'https://www.patreon.com/user?u='+cid:'https://www.patreon.com/'+encodeURIComponent(cid);origin.title='Auf Patreon öffnen';origin.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.231 1.093 7.391 1.046 11.54c-.039 3.411.302 12.396 5.369 12.46 3.765.047 4.326-4.804 6.068-7.141 1.24-1.662 2.836-2.132 4.801-2.618 3.376-.836 5.678-3.501 5.673-7.031Z"/></svg>Patreon<span aria-hidden="true">↗</span>`}
 const seriesView=view==='series'||!!activeSeries;
 $('.tools').hidden=seriesView;
 if(seriesView){
  const s=activeSeries?series.find(x=>x.key===activeSeries):null,content=$('#content'),back=$('#creatorBack');
  back.hidden=!activeSeries;back.href='#series';back.textContent='← Alle Serien';
  $('#detailAvatar').hidden=!s;$('#detailAvatar').innerHTML=s?avatar(s.ref,'creator-avatar-lg'):'';
  if(activeSeries){
   $('#pageEyebrow').textContent='Serie · '+(s?.ref.creator||'');$('#pageTitle').textContent=s?.name||'Serie';
   $('#pageDescription').textContent=s?`${s.seenCount} ${s.seenCount===1?'Folge':'Folgen'} gesehen, zuletzt ${epLabel(s.last,s.noSeason)}.${s.gaps.length?' Lücken: '+s.gaps.slice(0,8).map(g=>epLabel(g,s.noSeason)).join(', ')+(s.gaps.length>8?' …':'')+'.':''}`:'Diese Serie gibt es in deiner Sammlung nicht mehr.';
   $('#resultCount').textContent=s?s.total+' Folgen':'';
   content.className='';content.innerHTML=s?seriesDetail(s):'';
   // Jump once per opening, after route() has reset the scroll position; later re-renders keep your place.
   if(s&&seriesJumpPending){seriesJumpPending=false;seriesFollow=true;requestAnimationFrame(()=>scrollToCurrent(false))}
   else if(s&&seriesFollow&&!seriesAdvance)scrollToCurrent(false);
   // After marking an episode as seen: flash it, then glide to the next one, which fades in.
   else if(s&&seriesAdvance){
    const doneId=seriesAdvance;seriesAdvance='';
    if(doneId!=='undo')document.querySelector(`[data-action="seen"][data-id="${CSS.escape(doneId)}"]`)?.closest('.ep-row,.tile')?.classList.add('just-seen');
    const next=document.getElementById('series-current');
    if(next){next.classList.add('is-arriving');setTimeout(()=>scrollToCurrent(true),280)}
   }
   updateSeasonSpy();
  }else{
   const c=config.series;$('#pageEyebrow').textContent=c[1];$('#pageTitle').textContent=c[0];$('#pageDescription').textContent=c[2];
   $('#resultCount').textContent=series.length+(series.length===1?' Serie':' Serien');
   content.className=series.length?'series-grid':'';
   content.innerHTML=series.length?series.map(seriesCard).join(''):`<div class="empty"><div class="empty-icon">${icon('list')}</div><h3>Noch keine Serie erkannt.</h3><p>Serien werden aus Titeln wie „Show 9×11“, „S02E05“ oder „Season 1 Episode 3“ erkannt. Sobald du zwei Folgen derselben Serie bei einem Creator hast, erscheint sie hier.</p></div>`;
  }
  sync();return;
 }
 $('#creatorBack').href='#creators';$('#creatorBack').textContent='← Alle Creator';
 const selected=$('#creatorFilter').value,groups=new Map();for(const p of a.filter(p=>view==='saved'?p.saved:p.seen))if(!groups.has(keyOf(p)))groups.set(keyOf(p),p);
 $('#creatorFilter').innerHTML='<option value="">Alle Creator</option>'+[...groups].sort(([,a],[,b])=>a.creator.localeCompare(b.creator,'de')).map(([k,p])=>`<option value="${esc(k)}">${esc(p.creator)}</option>`).join('');
 $('#creatorFilter').value=groups.has(selected)?selected:'';$('#creatorFilter').hidden=!!activeCreator||view==='creators';
 const detailPost=a.find(p=>keyOf(p)===activeCreator),c=config[view]||config.library;
 $('#pageTitle').textContent=activeCreator?(detailPost?.creator||'Creator'):c[0];
 $('#pageEyebrow').textContent=activeCreator?'Creator · '+(detailPost?.service||''):c[1];
 $('#pageDescription').textContent=activeCreator?'Alle gesehenen Posts dieses Creators in deiner Sammlung.':c[2];
 $('#creatorBack').hidden=!activeCreator;$('#detailAvatar').hidden=!activeCreator||!detailPost;$('#detailAvatar').innerHTML=activeCreator&&detailPost?avatar(detailPost,'creator-avatar-lg'):'';
 $('#statusFilters').hidden=view!=='saved';
 const layout=$('#layout');layout.hidden=view==='history'||view==='creators';layout.setAttribute('aria-pressed',String(list));layout.setAttribute('aria-label',list?'Zur Kachelansicht wechseln':'Zur Listenansicht wechseln');layout.title=layout.getAttribute('aria-label');layout.innerHTML=icon(list?'grid':'list');
 const f=filtered(),content=$('#content');
 $('#resultCount').textContent=f.length.toLocaleString('de-DE')+(f.length===1?' Post':' Posts');
 if(!f.length){content.className='';content.innerHTML=emptyState()}
 else if(view==='creators'){const g=[...groupCreators(f)].sort((x,y)=>x[1][0].creator.localeCompare(y[1][0].creator,'de'));$('#resultCount').textContent=g.length+' Creator';content.className='creator-grid';content.innerHTML=g.map(([k,g])=>creatorTile(k,g)).join('')}
 else if(view==='history'){content.className='history';let html='',day='';for(const p of f){const d=historyDay(p.seenAt);if(d!==day){if(day)html+='</div></section>';day=d;html+=`<section class="history-day"><h2 class="history-date">${d}</h2><div class="list">`}html+=tile(p,true)}content.innerHTML=html+'</div></section>'}
 else{content.className=list?'list':'grid';content.innerHTML=f.map(p=>tile(p)).join('')}
 sync();
}
function sync(){document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===(activeCreator?'creators':activeSeries?'series':view);b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});document.querySelectorAll('[data-status]').forEach(b=>{b.classList.toggle('selected',b.dataset.status===status);b.setAttribute('aria-pressed',String(b.dataset.status===status))})}
function navigate(next){const hash=next==='all'?'':('#'+next);if(location.hash===hash)route();else location.hash=hash}
function route(){activeCreator='';activeSeries='';const hash=location.hash.slice(1);if(hash.startsWith('creator/')){try{activeCreator=decodeURIComponent(hash.slice(8))}catch{}view='library'}else if(hash.startsWith('serie/')){try{activeSeries=decodeURIComponent(hash.slice(6))}catch{}view='series';seriesJumpPending=true}else view=['library','creators','history','saved','series'].includes(hash)?hash:'all';$('#creatorFilter').value='';$('#search').value='';status='all';sync();render();window.scrollTo({top:0})}
window.addEventListener('hashchange',route);
function focusSearch(){if(view==='all'||view==='creators'||view==='series'||activeCreator)navigate('library');requestAnimationFrame(()=>$('#search').focus())}
const more=$('#moreMenu');
document.addEventListener('click',e=>{
 if(more.open&&!e.target.closest('#moreMenu'))more.open=false;
 const b=e.target.closest('button');if(!b)return;
 if(b.closest('.menu-panel'))more.open=false;
 if(b.dataset.view)navigate(b.dataset.view);
 if(b.dataset.status){status=b.dataset.status;render()}
 if(b.dataset.scroll){const track=b.closest('.row').querySelector('.row-track');track.scrollBy({left:Number(b.dataset.scroll)*track.clientWidth*.85,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
 if(b.hasAttribute('data-jump-current'))scrollToCurrent(true);
 if(b.dataset.season)document.getElementById('season-'+b.dataset.season)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 if(b.hasAttribute('data-search-force')){const creator=b.dataset.creator,name=b.dataset.name;searchStatus.set(searchKey(creator,name),{creator,name,state:'queued'});window.dispatchEvent(new CustomEvent('seen-series-search',{detail:[{creator,name,force:true}]}));render()}
 if(b.hasAttribute('data-refresh-feeds')){window.dispatchEvent(new CustomEvent('seen-feed-refresh'));toast('Suche auf Pawchive nach neuen Posts …')}
 if(b.dataset.action){const p=data().find(p=>p.id===b.dataset.id)||(!demoMode&&adoptFeedPost(b.dataset.id));if(!p)return;undoState={before:{...p},demo:demoMode};p[b.dataset.action]=!p[b.dataset.action];p.updatedAt=new Date().toISOString();if(b.dataset.action==='seen'){p.seenAt=p.seen?p.updatedAt:null;if(p.seen)p.saved=false}if(!demoMode){save();window.dispatchEvent(new CustomEvent('seen-local-change',{detail:p}))}if(activeSeries&&b.dataset.action==='seen'&&p.seen)seriesAdvance=p.id;render();toast(b.dataset.action==='saved'?(p.saved?'Für später gemerkt':'Aus der Merkliste entfernt'):(p.seen?'Als gesehen markiert':'Als ungesehen markiert'),true)}
 if(b.hasAttribute('data-close'))b.closest('dialog').close();
 if(b.hasAttribute('data-open-setup'))$('#setup').showModal();
 if(b.hasAttribute('data-import'))$('#file').click();
 if(b.hasAttribute('data-demo'))$('#demo').click();
 if(b.hasAttribute('data-reset-filters')){$('#search').value='';$('#creatorFilter').value='';status='all';render()}
});
$('#search').oninput=render;$('#creatorFilter').onchange=render;$('#sort').onchange=()=>{storePrefs();render()};$('#layout').onclick=()=>{list=!list;storePrefs();render()};$('#setupOpen').onclick=()=>$('#setup').showModal();$('#addOpen').onclick=()=>$('#add').showModal();$('#importTop').onclick=$('#importSetup').onclick=()=>$('#file').click();$('#demo').onclick=()=>{demoMode=true;undoState=null;render()};$('#exitDemo').onclick=()=>{demoMode=false;undoState=null;render()};$('#searchJump').onclick=focusSearch;
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();focusSearch()}if(e.key==='Escape'&&more.open){more.open=false;more.querySelector('summary').focus()}if(e.key==='Escape'&&e.target===$('#search')){$('#search').value='';render();$('#search').blur()}});
// Shadow the top bar once the page scrolls.
const topbar=$('.topbar');addEventListener('scroll',()=>topbar.classList.toggle('scrolled',scrollY>8),{passive:true});

$('#file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>20*1024*1024)throw Error('Die Datei ist zu groß (max. 20 MB).');const parsed=JSON.parse(await file.text());const rows=Array.isArray(parsed)?parsed:parsed.posts;if(!Array.isArray(rows)||rows.length>50000)throw Error('Keine gültige Post-Liste gefunden.');const incoming=rows.map(normalize),map=new Map(posts.map(p=>[p.id,p]));for(const p of incoming){const old=map.get(p.id);map.set(p.id,{...old,...p,saved:!!(old?.saved||p.saved)})}posts=[...map.values()];demoMode=false;save();window.dispatchEvent(new CustomEvent('seen-local-import',{detail:posts}));render();toast(incoming.length+' Posts importiert');$('#setup').close()}catch(err){toast('Import fehlgeschlagen: '+err.message)}finally{e.target.value=''}};
// Copy-to-clipboard backup: works where downloads are blocked (Claude artifacts).
const backupJSON=()=>JSON.stringify({format:'paw-seen',version:2,posts:data()},null,2);
// Tells the script a backup was made, so its reminder on Pawchive resets.
const backupDone=()=>{if(!demoMode)window.dispatchEvent(new CustomEvent('seen-backup-done'))};
async function copyBackup(){const text=backupJSON(),count=data().length;try{await navigator.clipboard.writeText(text);backupDone();toast(`Backup mit ${count} ${count===1?'Post':'Posts'} kopiert. Füge es in eine Textdatei ein und speichere sie als .json.`)}catch{$('#backupText').value=text;$('#backupDialog').showModal();$('#backupText').focus();$('#backupText').select();toast('Kopiere den markierten Text mit Strg+C.')}}
$('#backupCopy').onclick=copyBackup;$('#backupCopySetup').onclick=copyBackup;
if(PROXY_ONLY){$('#backup').hidden=true;$('#backupSetup').hidden=true}
$('#backup').onclick=()=>{const blob=new Blob([backupJSON()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=demoMode?'seen-demo.json':'seen-backup.json';a.click();backupDone();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$('#addForm').onsubmit=e=>{e.preventDefault();if(demoMode){toast('Bitte zuerst die Demo schließen.');return}const f=new FormData(e.target),info=urlInfo(f.get('url'));if(!info){toast('Bitte eine gültige Pawchive-Post-URL verwenden.');return}const old=posts.find(p=>p.id===info.id),p={...old,...info,title:f.get('title').trim()||`Post ${info.postId}`,creator:f.get('creator').trim()||`Creator ${info.creatorId}`,seen:f.has('seen'),saved:!f.has('seen'),updatedAt:new Date().toISOString(),seenAt:f.has('seen')?new Date().toISOString():null};posts=posts.filter(x=>x.id!==p.id).concat(p);save();window.dispatchEvent(new CustomEvent('seen-local-change',{detail:p}));e.target.reset();$('#add').close();render();toast('Post gespeichert')};

let script='';fetch('Pawchive_Gesehen.user.js?v=2.19.1',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.text()}).then(s=>{script=s;$('#scriptCode').value=s;updateCheck()}).catch(()=>{$('#scriptCode').value='Skript konnte nicht geladen werden. Bitte Seite neu laden.'});$('#copyScript').onclick=async()=>{if(!script){toast('Das Skript lädt noch.');return}try{await navigator.clipboard.writeText(script);toast('Vollständiger Code kopiert')}catch{$('#scriptCode').closest('details').open=true;$('#scriptCode').select();toast('Bitte den markierten Code mit Strg+C kopieren.')}};window.addEventListener('storage',e=>{if(e.key===KEY){try{const value=JSON.parse(e.newValue||'[]');if(Array.isArray(value)){posts=value;render()}}catch{}}});
// Script update: the connected script's version (sent on READY) against the one published next to this dashboard.
let connectedVersion='';
const olderVersion=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++)if((x[i]||0)!==(y[i]||0))return (x[i]||0)<(y[i]||0);return false};
function updateCheck(){
 const bundled=(script.match(/@version\s+([\d.]+)/)||[])[1]||'',show=!!(connectedVersion&&bundled&&olderVersion(connectedVersion,bundled));
 $('#updateScript').hidden=!show;$('#moreMenu').classList.toggle('has-update',show);
 if(show)$('#updateLabel').textContent=`Skript-Update ${connectedVersion} → ${bundled}`;
}
window.addEventListener('seen-script-ready',e=>{connectedVersion=String(e.detail||'');updateCheck()});
$('#updateScript').onclick=async()=>{
 // The script is published as a GitHub gist (same address as its @updateURL); Violentmonkey shows its install page
 // for any opened *.user.js address. Claude's own files can't be opened in a tab (COOP), the gist can.
 $('#moreMenu').open=false;
 window.open('https://gist.githubusercontent.com/feeltheskill10-blip/2b3bbeae125026fe5d7ead5dc2440737/raw/Pawchive_Gesehen.user.js','_blank','noopener');
 toast('Violentmonkey zeigt im neuen Tab „Aktualisieren“. Danach Pawchive und dieses Dashboard neu laden.');
};
route();

// Keep the initial-letter fallback visible if a remote image is unavailable.
// A blocked or broken remote image is hidden and requested through the userscript instead.
document.addEventListener('error',event=>{const img=event.target;if(!(img instanceof HTMLImageElement)||!['post-thumbnail','creator-avatar','hero-image','hero-bg','creator-cover','creator-banner'].some(name=>img.classList.contains(name)))return;img.hidden=true;if(img.dataset.orig&&!img.src.startsWith('data:'))requestImage(img.dataset.orig)},true);
