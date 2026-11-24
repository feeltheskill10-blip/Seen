'use strict';
(() => {
  const channel='paw-seen-sync-v1';
  let settings={...SeenFrames.defaults},lastSettings=0,serial=0;
  let supportedEffects=['pulse','sweep','static'];
  const pending=new Map();
  function send(type,payload={}){document.dispatchEvent(new CustomEvent('paw-seen-request-v2',{detail:JSON.stringify({channel,direction:'dashboard',type,...payload})}))}
  function receive(message){
    if(message?.channel!==channel||message.direction!=='extension'||message.type!=='FRAME_SETTINGS')return;
    if(Array.isArray(message.effects))supportedEffects=message.effects;
    settings=SeenFrames.normalize(message.settings);lastSettings=Date.now();
    const request=pending.get(message.requestId);if(request){clearTimeout(request.timer);pending.delete(message.requestId);request.resolve()}
  }
  document.addEventListener('paw-seen-response-v2',event=>{try{if(typeof event.detail==='string')receive(JSON.parse(event.detail))}catch{}});
  window.addEventListener('message',event=>{if(event.source===window&&event.origin===location.origin)receive(event.data)});
  function open(){
    const connected=Date.now()-lastSettings<10000;
    const update='Skript 2.14.2 unter „Auto-Sync & Skript“ kopieren, das bestehende Skript aktualisieren und beide Seiten neu laden.';
    SeenFrames.open({
      settings,
      canSave:connected,
      status:connected?'Speichern überträgt deinen Look an das Userscript. Offene Pawchive-Tabs übernehmen ihn automatisch.':'Zum Speichern auf Pawchive: '+update+' Die Vorschau kannst du schon ausprobieren.',
      onSave(next){
        if(!supportedEffects.includes(next.effect))throw Error('Für diesen Effekt brauchst du das neue Userscript. '+update);
        return new Promise((resolve,reject)=>{
          const requestId='frames-'+(++serial);
          const timer=setTimeout(()=>{pending.delete(requestId);reject(Error('Das Skript antwortet nicht. Bitte Pawchive und das Dashboard neu laden und erneut versuchen.'))},8000);
          pending.set(requestId,{resolve,timer});send('SET_FRAME_SETTINGS',{settings:next,requestId});
        });
      }
    });
  }
  document.getElementById('frameSettingsOpen').onclick=open;
  document.getElementById('frameSettingsSetup').onclick=()=>{document.getElementById('setup').close();open()};
  send('GET_FRAME_SETTINGS');
  setInterval(()=>send('GET_FRAME_SETTINGS'),4000);
})();
