'use strict';
(() => {
  const CHANNEL='paw-seen-sync-v1';
  let connected=false,lastHeartbeat=0,seeded=false,serial=0;
  const pending=new Map();
  let transport=null;
  function send(type,payload={}){
    const data={channel:CHANNEL,direction:'dashboard',type,...payload};
    if(transport!=='legacy')document.dispatchEvent(new CustomEvent('paw-seen-request-v2',{detail:JSON.stringify(data)}));
    if(transport!=='dom')window.postMessage(data,location.origin);
  }
  function state(text,ok=false){
    const el=document.getElementById('syncStatus');
    if(el){el.textContent=(ok?'● ':'○ ')+text;el.closest('.sync-pill')?.classList.toggle('is-connected',ok)}
  }
  function push(post){
    const requestId=String(++serial);
    pending.set(requestId,{post,time:Date.now()});
    send('UPSERT',{post,requestId});
    state('Auto-Sync: wird gespeichert …');
  }
  function receive(m,kind){
    if(m?.channel!==CHANNEL||m.direction!=='extension')return;
    transport=kind;
    lastHeartbeat=Date.now();
    if(m.type==='CREATOR_STATUS'){const el=document.getElementById('creatorStatus');if(el)el.textContent=String(m.message||'')}
    if(m.type==='IMAGE_STATUS'){
      const el=document.getElementById('imageStatus');
      if(el)el.textContent=String(m.message||'');
    }
    if(m.type==='SEARCH_STATUS')window.dispatchEvent(new CustomEvent('seen-search-status',{detail:{creator:String(m.creator||''),name:String(m.name||''),state:String(m.state||''),hits:Number(m.hits)||0,at:Number(m.at)||0,message:String(m.message||'')}}));
    if(m.type==='POSTER'&&typeof m.name==='string'){wantedPosters.delete(m.name);window.dispatchEvent(new CustomEvent('seen-posters',{detail:{name:m.name,data:typeof m.data==='string'?m.data:null,show:String(m.show||''),error:m.error?String(m.error):''}}))}
    if(m.type==='IMDB'&&typeof m.name==='string'){wantedImdb.delete(m.name);window.dispatchEvent(new CustomEvent('seen-imdb',{detail:{name:m.name,show:String(m.show||''),eps:m.eps,ended:'ended' in m?!!m.ended:undefined,final:m.final||null,backdrop:typeof m.backdrop==='string'?m.backdrop:undefined}}))}
    if(m.type==='DESCRIPTIONS'&&m.items&&typeof m.items==='object'){for(const id of Object.keys(m.items))wantedDescriptions.delete(id);window.dispatchEvent(new CustomEvent('seen-descriptions',{detail:m.items}))}
    if(m.type==='FEEDS'&&m.feeds&&typeof m.feeds==='object')window.dispatchEvent(new CustomEvent('seen-feeds',{detail:m.feeds}));
    if(m.type==='IMAGE_DATA'&&typeof m.url==='string'){wantedImages.delete(m.url);window.dispatchEvent(new CustomEvent('seen-image-data',{detail:{url:m.url,data:m.data}}))}
    if(m.type==='IMAGE_FAIL'&&typeof m.url==='string'){wantedImages.delete(m.url);window.dispatchEvent(new CustomEvent('seen-image-fail',{detail:{url:m.url,message:String(m.message||'Unbekannter Fehler')}}))}
    if(m.type==='READY'){
      // Lets the dashboard drop images an older script relayed black (see app.js), before images are re-requested.
      window.dispatchEvent(new CustomEvent('seen-script-ready',{detail:String(m.version||'')}));
      connected=true;
      state('Auto-Sync verbunden',true);
      // Re-request images that were asked for before the script answered (or after it reloaded).
      if(wantedImages.size)send('GET_IMAGES',{urls:[...wantedImages]});
      if(seriesQueries)send('SERIES_SEARCH',{queries:seriesQueries});
      if(wantedDescriptions.size)send('GET_DESCRIPTIONS',{ids:[...wantedDescriptions]});
      if(wantedPosters.size)send('GET_POSTERS',{names:[...wantedPosters]});
      if(wantedImdb.size)send('GET_IMDB',{names:[...wantedImdb]});
      document.getElementById('imageStatus').textContent='Fehlende Bilder werden im Hintergrund ergänzt.';
      // Merge the existing dashboard collection without replacing newer script records.
      if(!seeded){seeded=true;send('MERGE',{posts,requestId:'initial'})}
    }
    if(m.type==='HEARTBEAT'){
      connected=true;
      if(!pending.size)state('Auto-Sync verbunden',true);
    }
    if(m.type==='ACK'){
      pending.delete(m.requestId);
      connected=true;
      state('Auto-Sync verbunden',true);
    }
    if(m.type==='ERROR'){
      pending.delete(m.requestId);
      state('Auto-Sync: Übertragung fehlgeschlagen');
      toast('Sync fehlgeschlagen: '+String(m.message||'Unbekannter Fehler'));
    }
    if(m.type==='SNAPSHOT'){
      if(!Array.isArray(m.posts))return;
      try{
        const remote=m.posts.map(normalize);
        const map=new Map(posts.map(p=>[p.id,p]));
        const pendingIds=new Set([...pending.values()].map(x=>x.post.id));
        for(const p of remote){
          if(pendingIds.has(p.id))continue;
          map.set(p.id,p);
        }
        const next=[...map.values()];
        if(JSON.stringify(next)!==JSON.stringify(posts)){
          posts=next;save();render();
        }
        connected=true;
        if(!pending.size)state('Auto-Sync verbunden',true);
      }catch{state('Auto-Sync: Daten konnten nicht gelesen werden')}
    }
  }
  document.addEventListener('paw-seen-response-v2',event=>{
    try{if(typeof event.detail==='string')receive(JSON.parse(event.detail),'dom')}catch{state('Auto-Sync: Verbindungsfehler')}
  });
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin)return;
    receive(event.data,'legacy');
  });
  window.addEventListener('seen-local-change',event=>{
    if(demoMode)return;
    if(connected)push(event.detail);
    else state('Lokal gespeichert · Auto-Sync getrennt');
  });
  window.addEventListener('seen-feed-refresh',()=>{if(connected)send('REFRESH_FEEDS')});
  window.addEventListener('seen-backup-done',()=>{if(connected)send('BACKUP_DONE')});
  let seriesQueries=null;
  const wantedDescriptions=new Set(),wantedPosters=new Set(),wantedImdb=new Set();
  window.addEventListener('seen-imdb-request',event=>{if(!Array.isArray(event.detail))return;for(const n of event.detail)wantedImdb.add(n);if(connected)send('GET_IMDB',{names:event.detail})});
  window.addEventListener('seen-posters-request',event=>{if(!Array.isArray(event.detail))return;for(const n of event.detail)wantedPosters.add(n);if(connected)send('GET_POSTERS',{names:event.detail})});
  window.addEventListener('seen-descriptions-request',event=>{if(!Array.isArray(event.detail))return;for(const id of event.detail)wantedDescriptions.add(id);if(connected)send('GET_DESCRIPTIONS',{ids:event.detail})});
  window.addEventListener('seen-series-search',event=>{if(!Array.isArray(event.detail))return;
    // A forced search ("Jetzt neu suchen") is sent once; the automatic list is kept for reconnects.
    if(!event.detail.some(q=>q&&q.force))seriesQueries=event.detail;
    if(connected)send('SERIES_SEARCH',{queries:event.detail});
    else if(event.detail.some(q=>q&&q.force))window.dispatchEvent(new CustomEvent('seen-search-status',{detail:{creator:event.detail[0].creator,name:event.detail[0].name,state:'error',message:'Auto-Sync ist nicht verbunden'}}));
  });
  const wantedImages=new Set();
  window.addEventListener('seen-image-request',event=>{
    if(!Array.isArray(event.detail))return;
    for(const url of event.detail)wantedImages.add(url);
    if(connected)send('GET_IMAGES',{urls:event.detail});
  });
  window.addEventListener('seen-local-import',event=>{
    if(connected)send('MERGE',{posts:event.detail,requestId:'import-'+(++serial)});
  });
  function handshake(){
    if(Date.now()-lastHeartbeat>8000){
      connected=false;seeded=false;transport=null;
      state(document.documentElement.getAttribute('data-paw-seen-bridge')
        ? 'Auto-Sync: Verbindung wird erneut aufgebaut …'
        : 'Auto-Sync: Skript 2.19.0 einrichten');
      send('HELLO');
    }
    for(const [id,item] of pending){
      if(Date.now()-item.time>10000){
        pending.delete(id);
        state('Lokal gespeichert · Sync nicht bestätigt');
      }
    }
  }
  document.getElementById('refreshImages').addEventListener('click',()=>{
    if(!connected){document.getElementById('imageStatus').textContent='Bitte zuerst Skript 2.19.0 aktivieren und beide Seiten neu laden.';return}
    document.getElementById('imageStatus').textContent='Bildabfrage wird gestartet …';
    send('ENRICH_IMAGES');
  });
  send('HELLO');
  setInterval(handshake,3000);
  window.addEventListener('pageshow',()=>send('HELLO'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)send('HELLO')});
})();
