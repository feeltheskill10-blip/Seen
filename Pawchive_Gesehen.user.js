// ==UserScript==
// @name         Pawchive – Gesehen markieren
// @namespace    pawchive-seen-local
// @description  Markiert gesehene Pawchive-Posts und synchronisiert sie mit dem seen.-Dashboard.
// @author       feeltheskill10-blip
// @license      MIT
// @homepageURL  https://feeltheskill10-blip.github.io/Seen/
// @icon         https://feeltheskill10-blip.github.io/Seen/icon-512.png
// @version      2.19.3
// @downloadURL  https://gist.githubusercontent.com/feeltheskill10-blip/2b3bbeae125026fe5d7ead5dc2440737/raw/Pawchive_Gesehen.user.js
// @updateURL    https://gist.githubusercontent.com/feeltheskill10-blip/2b3bbeae125026fe5d7ead5dc2440737/raw/Pawchive_Gesehen.user.js
// @match        https://pawchive.pw/*
// @match        https://www.pawchive.pw/*
// @match        https://feeltheskill10-blip.github.io/Seen/*
// @match        https://feeltheskill10-blip.github.io/seen/*
// @grant        GM_xmlhttpRequest
// @connect      pawchive.pw
// @connect      www.pawchive.pw
// @connect      api.tvmaze.com
// @connect      static.tvmaze.com
// @connect      query.wikidata.org
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @inject-into  content
// @run-at       document-idle
// ==/UserScript==
(()=>{'use strict';
/* Shared by the dashboard and the generated Violentmonkey script. */
const SeenFrames = (() => {
  'use strict';
  const defaults = Object.freeze({seenColor:'#59f38c',savedColor:'#fbbf24',glow:80,speed:4,width:3,effect:'minimal'});
  const effects = [
    {id:'minimal',label:'Dezent',description:'Feine Linie, kein Leuchten.'},
    {id:'glow',label:'Glühen',description:'Ruhiger Rand mit weichem Schein.'},
    {id:'breathe',label:'Atmen',description:'Das Leuchten schwillt sanft an und ab.'},
    {id:'comet',label:'Komet',description:'Ein Lichtpunkt zieht seine Bahn.'},
    {id:'orbit',label:'Orbit',description:'Zwei Kometen kreisen gegenüber.'},
    {id:'aurora',label:'Aurora',description:'Ein Farbverlauf wandert ums Bild.'},
    {id:'neon',label:'Neon',description:'Kräftiges Leuchten, das kurz flackert.'},
    {id:'corners',label:'Ecken',description:'Nur die Ecken, wie ein Sucher.'},
    {id:'marching',label:'Laufband',description:'Gestrichelter Rand in Bewegung.'}
  ];
  // Effects from versions before 2.10 map onto their closest new counterpart.
  const legacy = {pulse:'breathe',heartbeat:'breathe',sweep:'comet',scanner:'comet',double:'orbit',static:'glow',prism:'aurora'};
  const effectIds = Object.freeze(effects.map(effect => effect.id));
  const animated = new Set(['breathe','comet','orbit','aurora','neon','corners','marching']);
  const glowing = new Set(['glow','breathe','comet','orbit','aurora','neon']);
  const clamp = (value,min,max,fallback) => Number.isFinite(Number(value)) ? Math.min(max,Math.max(min,Number(value))) : fallback;
  function normalize(value) {
    const v=value&&typeof value==='object'?value:{};
    const color=(s,fallback)=>typeof s==='string'&&/^#[0-9a-f]{6}$/i.test(s)?s.toLowerCase():fallback;
    const effect=legacy[v.effect]||v.effect;
    return {seenColor:color(v.seenColor,defaults.seenColor),savedColor:color(v.savedColor,defaults.savedColor),glow:clamp(v.glow,0,150,defaults.glow),speed:clamp(v.speed,1,10,defaults.speed),width:clamp(v.width,1,6,defaults.width),effect:effectIds.includes(effect)?effect:defaults.effect};
  }
  /* Every marked element gets two layers: ::before carries the glow, ::after the ring.
     The ring is a background clipped to the border band by a mask, so gradients can travel along the edge. */
  const M=':is(.paw-seen-marked,.paw-saved-marked)';
  const css = `
@property --paw-frame-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
@property --paw-frame-len{syntax:'<length>';initial-value:14px;inherits:false}
@property --paw-frame-shift{syntax:'<length>';initial-value:0px;inherits:false}
.paw-seen-marked{--paw-color:var(--paw-seen-color,#59f38c);--paw-glow:var(--paw-seen-glow,rgba(89,243,140,.6));--paw-soft:var(--paw-seen-soft,rgba(89,243,140,.28));--paw-aurora-a:var(--paw-seen-aurora-a,#3fd0ff);--paw-aurora-b:var(--paw-seen-aurora-b,#b98cff)}
.paw-saved-marked{--paw-color:var(--paw-saved-color,#fbbf24);--paw-glow:var(--paw-saved-glow,rgba(251,191,36,.6));--paw-soft:var(--paw-saved-soft,rgba(251,191,36,.28));--paw-aurora-a:var(--paw-saved-aurora-a,#ff6b8b);--paw-aurora-b:var(--paw-saved-aurora-b,#a8f06a)}
${M}::before,${M}::after{
  content:''!important;position:absolute!important;inset:calc(-1 * var(--paw-frame-outset,0px))!important;box-sizing:border-box!important;
  border-radius:calc(var(--paw-card-radius,10px) + var(--paw-frame-outset,0px))!important;pointer-events:none!important;z-index:90!important;animation:none;opacity:1;
}
${M}::before{box-shadow:0 0 var(--paw-glow-blur,16px) var(--paw-glow-spread,2px) var(--paw-glow),inset 0 0 var(--paw-glow-inner,12px) var(--paw-glow)!important;opacity:0}
${M}::after{
  padding:var(--paw-frame-w,3px)!important;background:var(--paw-color)!important;
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;-webkit-mask-composite:xor!important;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;mask-composite:exclude!important;
}
:is([data-paw-frame-effect=glow],[data-paw-frame-effect=breathe],[data-paw-frame-effect=neon]) ${M}::before{opacity:1}
:is([data-paw-frame-effect=comet],[data-paw-frame-effect=orbit]) ${M}::before{opacity:.45}
[data-paw-frame-effect=aurora] ${M}::before{opacity:.7}
[data-paw-frame-effect=minimal] ${M}::after{padding:max(1px,calc(var(--paw-frame-w,3px) - 1px))!important}
[data-paw-frame-effect=breathe] ${M}::before{animation:paw-frame-breathe var(--paw-frame-speed,4s) ease-in-out infinite!important}
[data-paw-frame-effect=breathe] ${M}::after{animation:paw-frame-breathe-ring var(--paw-frame-speed,4s) ease-in-out infinite!important}
[data-paw-frame-effect=comet] ${M}::after{
  background:conic-gradient(from var(--paw-frame-angle),transparent 0deg 190deg,var(--paw-color) 330deg,#fff 356deg,transparent 360deg),linear-gradient(var(--paw-soft) 0 0)!important;
  animation:paw-frame-spin var(--paw-frame-speed,4s) linear infinite!important;
}
[data-paw-frame-effect=orbit] ${M}::after{
  background:repeating-conic-gradient(from var(--paw-frame-angle),transparent 0deg 95deg,var(--paw-color) 165deg,#fff 178deg,transparent 180deg),linear-gradient(var(--paw-soft) 0 0)!important;
  animation:paw-frame-spin var(--paw-frame-speed,4s) linear infinite!important;
}
[data-paw-frame-effect=aurora] ${M}::after{
  background:conic-gradient(from var(--paw-frame-angle),var(--paw-color),var(--paw-aurora-a),var(--paw-aurora-b),var(--paw-color))!important;
  animation:paw-frame-spin calc(var(--paw-frame-speed,4s) * 2) linear infinite!important;
}
[data-paw-frame-effect=neon] ${M}::before{box-shadow:0 0 calc(var(--paw-glow-blur,16px) * 1.4) calc(var(--paw-glow-spread,2px) * 2) var(--paw-glow),inset 0 0 var(--paw-glow-inner,12px) var(--paw-glow)!important}
[data-paw-frame-effect=neon] ${M}::after{background:linear-gradient(90deg,var(--paw-color),color-mix(in srgb,var(--paw-color) 55%,#fff),var(--paw-color))!important}
[data-paw-frame-effect=neon] ${M}::before,[data-paw-frame-effect=neon] ${M}::after{animation:paw-frame-neon calc(var(--paw-frame-speed,4s) * 1.5) steps(1,end) infinite!important}
[data-paw-frame-effect=corners] ${M}::after{
  background:linear-gradient(var(--paw-color) 0 0) top left/var(--paw-frame-len) var(--paw-frame-len) no-repeat,linear-gradient(var(--paw-color) 0 0) top right/var(--paw-frame-len) var(--paw-frame-len) no-repeat,
             linear-gradient(var(--paw-color) 0 0) bottom left/var(--paw-frame-len) var(--paw-frame-len) no-repeat,linear-gradient(var(--paw-color) 0 0) bottom right/var(--paw-frame-len) var(--paw-frame-len) no-repeat!important;
  padding:calc(var(--paw-frame-w,3px) + 1px)!important;animation:paw-frame-corners var(--paw-frame-speed,4s) ease-in-out infinite alternate!important;
}
/* Even dashes along each edge, moving clockwise. */
[data-paw-frame-effect=marching] ${M}::after{
  background:linear-gradient(90deg,var(--paw-color) 0 9px,transparent 9px) var(--paw-frame-shift) 0/16px var(--paw-frame-w,3px) repeat-x,
             linear-gradient(90deg,var(--paw-color) 0 9px,transparent 9px) calc(-1 * var(--paw-frame-shift)) 100%/16px var(--paw-frame-w,3px) repeat-x,
             linear-gradient(0deg,var(--paw-color) 0 9px,transparent 9px) 0 calc(-1 * var(--paw-frame-shift))/var(--paw-frame-w,3px) 16px repeat-y,
             linear-gradient(0deg,var(--paw-color) 0 9px,transparent 9px) 100% var(--paw-frame-shift)/var(--paw-frame-w,3px) 16px repeat-y!important;
  animation:paw-frame-march calc(var(--paw-frame-speed,4s) / 4) linear infinite!important;
}
@keyframes paw-frame-spin{to{--paw-frame-angle:360deg}}
@keyframes paw-frame-breathe{0%,100%{opacity:.15}50%{opacity:1}}
@keyframes paw-frame-breathe-ring{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes paw-frame-neon{0%,88%{opacity:1}89%{opacity:.25}90%{opacity:1}92%{opacity:.4}93%,100%{opacity:1}}
@keyframes paw-frame-corners{from{--paw-frame-len:14px}to{--paw-frame-len:28px}}
@keyframes paw-frame-march{to{--paw-frame-shift:16px}}
@media(prefers-reduced-motion:reduce){[data-paw-frame-effect] ${M}::before,[data-paw-frame-effect] ${M}::after{animation:none!important}}
`;
  function hsl(hex,shift){
    const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;
    let h=0,s=0;
    if(d){s=d/(1-Math.abs(2*l-1));h=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h*=60}
    return `hsl(${Math.round((h+shift+360)%360)} ${Math.round(Math.max(s,.55)*100)}% ${Math.round(Math.min(Math.max(l,.5),.68)*100)}%)`;
  }
  // Custom properties only; apply() also sets the effect attribute on the scope.
  function setVars(value,scope) {
    const settings=normalize(value),amount=settings.glow/100,alpha=Math.min(1,.75*amount);
    for(const [key,color]of [['seen',settings.seenColor],['saved',settings.savedColor]]){
      const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)).join(',');
      scope.style.setProperty('--paw-'+key+'-color',color);
      scope.style.setProperty('--paw-'+key+'-glow',`rgba(${rgb},${alpha})`);
      scope.style.setProperty('--paw-'+key+'-soft',`rgba(${rgb},.28)`);
      scope.style.setProperty('--paw-'+key+'-aurora-a',hsl(color,70));
      scope.style.setProperty('--paw-'+key+'-aurora-b',hsl(color,-70));
    }
    for(const [name,size]of [['blur',18],['spread',2],['inner',12]])scope.style.setProperty('--paw-glow-'+name,(size*amount)+'px');
    scope.style.setProperty('--paw-frame-speed',settings.speed+'s');
    scope.style.setProperty('--paw-frame-w',settings.width+'px');
    return settings;
  }
  function apply(value,scope=document.documentElement) {
    const settings=normalize(value);
    // The stylesheet lives in the document so the animated custom properties are registered there too.
    let style=document.getElementById('paw-frame-design-style');
    if(!style){style=document.createElement('style');style.id='paw-frame-design-style';document.head.append(style)}
    if(style.textContent!==css)style.textContent=css;
    if(style.sheet?.disabled)style.sheet.disabled=false;
    scope.setAttribute('data-paw-frame-effect',settings.effect);
    setVars(settings,scope);
    scope.setAttribute('data-paw-frame-sig',JSON.stringify(settings));
    return settings;
  }
  const editorCss = `
:host{all:initial;font:clamp(14px,calc(.4vw + 6px),19px)/1.5 Inter,"Segoe UI",system-ui,sans-serif;color:#f4f4f6;color-scheme:dark}
*{box-sizing:border-box}
dialog{font:inherit;color:inherit;background:#16161a;border:1px solid #ffffff26;border-radius:20px;padding:0;width:min(56em,calc(100vw - 32px));max-height:92vh;max-height:92dvh;overflow:auto;box-shadow:0 30px 100px #000d}
dialog::backdrop{background:#000000b3;backdrop-filter:blur(6px)}
.inside{padding:clamp(20px,3vw,34px);display:grid;gap:22px}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}
.eyebrow{font-size:.72em;font-weight:650;letter-spacing:.14em;color:#a3a3ad}
h2{font-size:1.8em;letter-spacing:-.035em;margin:4px 0 6px;line-height:1.15}
.intro{color:#a3a3ad;margin:0;font-size:.92em}
button,input{font:inherit}
button{cursor:pointer;border:1px solid #ffffff26;border-radius:9px;background:#1e1e24;color:#f4f4f6;padding:9px 14px;line-height:1.4}
button:hover{background:#28282f}
.close{border:0;background:#1e1e24;width:2.2em;height:2.2em;border-radius:50%;padding:0;font-size:1.2em;flex:none}
fieldset{border:0;padding:0;margin:0}
legend{font-weight:650;margin-bottom:10px;font-size:.95em}
.choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.choice{position:relative;display:grid;gap:8px;cursor:pointer;border:1px solid #ffffff14;background:#0f0f12;border-radius:14px;padding:10px;transition:border-color .2s,background .2s}
.choice:hover{border-color:#ffffff33}
.choice:has(input:checked){border-color:var(--accent);background:#5ee08f0d}
.choice input{position:absolute;opacity:0;pointer-events:none}
.choice:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:2px}
.swatch{display:block;padding:7px}
.swatch i{display:block;position:relative;height:54px;border-radius:9px;--paw-card-radius:9px;--paw-frame-outset:0px;background:radial-gradient(ellipse at 30% 20%,#2c3a32,#121614 75%)}
.choice-text strong{display:block;font-size:.88em}
.choice-text small{display:block;color:#a3a3ad;font-size:.74em;line-height:1.45;margin-top:2px}
.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 22px}
.color-field{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #ffffff14;border-radius:12px;padding:10px 14px;background:#0f0f12}
.color-field label{font-size:.88em;font-weight:600}
.color-field input[type=color]{width:46px;height:34px;padding:0;background:none;border:0;cursor:pointer}
.color-field .hex{display:block;width:8ch;padding:2px 0;background:transparent;border:0;border-bottom:1px solid #ffffff33;color:#a3a3ad;font-size:.8em;margin-top:4px;letter-spacing:.04em}
.slider label{display:flex;justify-content:space-between;align-items:baseline;font-size:.88em;font-weight:600;margin-bottom:8px;gap:10px}
.slider output{font-variant-numeric:tabular-nums;color:#a3a3ad;font-weight:500}
.slider input{width:100%;accent-color:var(--accent);cursor:pointer}
.slider input:disabled{opacity:.35;cursor:default}
.range-ends{display:flex;justify-content:space-between;color:#71717b;font-size:.72em;margin-top:2px}
.preview-label{display:flex;justify-content:space-between;gap:15px;align-items:center}
.preview-label strong{font-size:.9em}
.preview-label span{font-size:.75em;color:#71717b}
.previews{display:grid;grid-template-columns:1fr 1fr;gap:26px;padding:14px 8px}
.sample{--paw-card-radius:12px;--paw-frame-outset:2px;position:relative;min-height:140px;border-radius:var(--paw-card-radius);background:radial-gradient(ellipse at top right,#385144,#151c19 75%);display:flex;align-items:end;padding:20px}
.sample.saved{background:radial-gradient(ellipse at top right,#53442b,#211b14 75%)}
.sample small{display:block;font-size:.65em;letter-spacing:.14em;color:#c3c6bb}
.sample strong{font-size:1.05em;display:block;margin-top:4px}
.status{font-size:.82em;color:#a3a3ad;line-height:1.6;margin:0}
.status.error{color:#f08a80}
.actions{display:flex;justify-content:space-between;align-items:center;gap:15px;border-top:1px solid #ffffff14;padding-top:18px}
.actions>div{display:flex;gap:8px}
.actions button{font-size:.88em}
.primary{background:#f4f4f6;border-color:#f4f4f6;color:#0b0b0d;font-weight:650}
.primary:hover{background:#fff}
.quiet{background:none}
.hex[aria-invalid=true]{border-color:#f08a80!important}
.primary:disabled{opacity:.4;cursor:not-allowed}
button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.reduced{font-size:.78em;color:#a3a3ad;margin:0}
.reduced:empty{display:none}
@media(max-width:700px){.choices{grid-template-columns:repeat(2,minmax(0,1fr))}.fields{grid-template-columns:1fr}}
@media(max-width:480px){.previews{grid-template-columns:1fr;gap:18px}.actions{flex-direction:column;align-items:stretch}.actions>div{justify-content:flex-end}}`;
  let active=null;
  function open(options={}) {
    if(active&&!active.host.isConnected)active=null;
    if(active){active.dialog.focus();return}
    const initial=normalize(options.settings),previous=document.activeElement;
    let draft={...initial},saved=false,working=false,disposed=false;
    const host=document.createElement('div');host.id='paw-frame-editor';
    const root=host.attachShadow({mode:'open'});
    const slider=(id,label,min,max,step,left,right)=>`<div class="slider"><label for="${id}">${label}<output id="${id}Value"></output></label><input id="${id}" name="${id}" type="range" min="${min}" max="${max}" step="${step}"><div class="range-ends"><span>${left}</span><span>${right}</span></div></div>`;
    root.innerHTML=`<style>${css}${editorCss}</style><dialog aria-labelledby="frame-heading"><div class="inside" style="--accent:#5ee08f"><header><div><div class="eyebrow">SEEN / RAHMEN</div><h2 id="frame-heading">Dein Rahmen. Dein Stil.</h2><p class="intro">So erkennst du gesehene und gemerkte Posts auf Pawchive wieder. Jede Kachel zeigt den Effekt live.</p></div><button type="button" class="close" aria-label="Schließen">×</button></header>
<fieldset><legend>Effekt</legend><div class="choices">${effects.map(({id,label,description})=>`<label class="choice"><input type="radio" name="effect" value="${id}"><span class="swatch" data-paw-frame-effect="${id}"><i class="paw-seen-marked"></i></span><span class="choice-text"><strong>${label}</strong><small>${description}</small></span></label>`).join('')}</div></fieldset>
<div class="fields"><div class="color-field"><div><label for="seenColor">Gesehen</label><input class="hex" id="seenHex" name="seenHex" type="text" aria-label="Hexcode für Gesehen" maxlength="7" spellcheck="false" autocomplete="off"></div><input id="seenColor" type="color" name="seenColor" aria-label="Farbe für gesehene Posts"></div><div class="color-field"><div><label for="savedColor">Merkliste</label><input class="hex" id="savedHex" name="savedHex" type="text" aria-label="Hexcode für Merkliste" maxlength="7" spellcheck="false" autocomplete="off"></div><input id="savedColor" type="color" name="savedColor" aria-label="Farbe für Merkliste"></div>
${slider('width','Rahmenstärke',1,6,1,'Fein','Kräftig')}${slider('glow','Leuchtkraft',0,150,10,'Schwach','Stark')}${slider('speed','Tempo',1,10,.5,'Schnell','Langsam')}</div>
<div><div class="preview-label"><strong>Vorschau</strong><span>So sehen deine Posts aus.</span></div><div class="previews"><article class="sample paw-seen-marked"><div><small>GESEHEN</small><strong>Schon entdeckt.</strong></div></article><article class="sample saved paw-saved-marked"><div><small>MERKLISTE</small><strong>Für später gemerkt.</strong></div></article></div></div>
<p class="reduced"></p><p class="status" role="status"></p><div class="actions"><button type="button" class="quiet reset">Standardwerte</button><div><button type="button" class="cancel">Abbrechen</button><button type="button" class="primary save">${options.saveLabel||'Look speichern'}</button></div></div></div></dialog>`;
    const dialog=root.querySelector('dialog'),inside=root.querySelector('.inside'),preview=root.querySelector('.previews'),status=root.querySelector('.status'),save=root.querySelector('.save');
    active={host,dialog};
    function updateControls(){root.querySelectorAll('.hex').forEach(input=>input.removeAttribute('aria-invalid'));for(const key of ['seenColor','savedColor','glow','speed','width'])root.querySelector('[name="'+key+'"]').value=draft[key];root.querySelector('[name=effect][value='+draft.effect+']').checked=true;renderPreview()}
    function renderPreview(){
      setVars(draft,inside);apply(draft,preview);
      root.querySelector('#seenHex').value=draft.seenColor.toUpperCase();root.querySelector('#savedHex').value=draft.savedColor.toUpperCase();
      const moving=animated.has(draft.effect),shining=glowing.has(draft.effect);
      root.querySelector('#widthValue').textContent=draft.width+' px';
      root.querySelector('#glowValue').textContent=shining?draft.glow+' %':'Kein Leuchten';
      root.querySelector('#speedValue').textContent=moving?draft.speed.toLocaleString('de-DE')+' s pro Runde':'Keine Animation';
      root.querySelector('#speed').disabled=!moving;root.querySelector('#glow').disabled=!shining;
      options.onPreview?.(draft);
    }
    root.addEventListener('input',event=>{const input=event.target;if(!input.name)return;const key=input.name==='seenHex'?'seenColor':input.name==='savedHex'?'savedColor':input.name;if(input.name.endsWith('Hex')&&!/^#[0-9a-f]{6}$/i.test(input.value)){input.setAttribute('aria-invalid','true');return}input.removeAttribute('aria-invalid');draft=normalize({...draft,[key]:input.value});renderPreview()});
    root.querySelector('.reset').onclick=()=>{draft={...defaults};updateControls()};
    const cleanup=()=>{if(disposed)return;disposed=true;if(!saved)options.onCancel?.(initial);host.remove();active=null;previous?.focus()};
    const close=()=>{if(!working){dialog.close();cleanup()}};
    root.querySelector('.close').onclick=close;root.querySelector('.cancel').onclick=close;
    dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
    dialog.addEventListener('close',cleanup,{once:true});
    save.disabled=options.canSave===false;
    status.textContent=options.status||'Deine Auswahl wird in diesem Violentmonkey-Profil gespeichert.';
    root.querySelector('.reduced').textContent=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'Dein System bevorzugt weniger Bewegung. Die Effekte bleiben deshalb stehen.':'';
    save.onclick=async()=>{if(working)return;const invalid=Array.from(root.querySelectorAll('.hex')).find(input=>!/^#[0-9a-f]{6}$/i.test(input.value));if(invalid){status.textContent='Bitte einen vollständigen Farbcode eingeben, zum Beispiel #59F38C.';status.classList.add('error');invalid.focus();return}working=true;save.disabled=true;dialog.setAttribute('aria-busy','true');root.querySelectorAll('input').forEach(input=>input.disabled=true);status.classList.remove('error');status.textContent='Dein Look wird gespeichert …';try{await options.onSave?.(normalize(draft));saved=true;dialog.close();cleanup()}catch(error){status.textContent=error?.message||'Speichern fehlgeschlagen. Bitte erneut versuchen.';status.classList.add('error')}finally{working=false;dialog.removeAttribute('aria-busy');if(!saved){save.disabled=options.canSave===false;root.querySelectorAll('input').forEach(input=>input.disabled=false);root.querySelector('#speed').disabled=!animated.has(draft.effect);root.querySelector('#glow').disabled=!glowing.has(draft.effect)}}};
    document.body.append(host);updateControls();dialog.showModal();
  }
  return {defaults,effectIds,normalize,css,apply,open,isOpen:()=>!!active?.host.isConnected};
})();

const FRAME_KEY='paw-frame-settings-v1';
const readFrameSettings=()=>SeenFrames.normalize(GM_getValue(FRAME_KEY,SeenFrames.defaults));
// 2.9.0 switched once to the quiet dashboard style; the LED effects stay selectable in the frame editor.
if(!GM_getValue('paw-style-v2',false)){GM_setValue(FRAME_KEY,{...readFrameSettings(),effect:'minimal'});GM_setValue('paw-style-v2',true)}

const P='paw-seen-v1:',M='paw-meta-v2:',C='paw-creator-v1:';let busy=false,timer,openMenu=null;
// Time of the last backup (download on Pawchive or export/copy in the dashboard) and a 7-day snooze for the reminder.
const BACKUP_KEY='paw-backup-at',BACKUP_SNOOZE='paw-backup-snooze';
function safeThumbnail(value){try{if(typeof value!=='string'||!value)return '';const u=new URL(value,'https://pawchive.pw');return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
// Only this exact origin gets the bridge.
// The GitHub Pages origin is shared by the account's sites; @match limits the script there to /Seen/.
const DASHBOARDS=['https://feeltheskill10-blip.github.io'];
function creatorFrom(doc,service,id,profilePage=false){
 const clean=v=>String(v||'').trim().replace(/\s+/g,' ').slice(0,100);
 let creator='',creatorAvatar='';
 const names=doc.querySelectorAll('.user-header__name,.user-header__name a,.post__user-name,[itemprop="name"],.creator-name');
 for(const el of names){const value=clean(el.textContent);if(value&&!/^Creator\s+\d+$/i.test(value)){creator=value;break}}
 const matching=[...doc.querySelectorAll('a[href]')].filter(a=>{try{return new URL(a.getAttribute('href'),'https://pawchive.pw').pathname.replace(/\/$/,'')===`/${service}/user/${id}`}catch{return false}});
 if(!creator)for(const a of matching){const value=clean(a.textContent);if(value&&!/^(?:posts|favorite|unfavorite|upload file)$/i.test(value)){creator=value;break}}
 if(!creator&&profilePage){const value=clean(doc.querySelector('h1')?.textContent);if(value&&!/^(?:posts|creators|login|sign in)$/i.test(value))creator=value}
 const avatarSelectors='.user-header__avatar img,img.user-header__avatar,.post__user-avatar img,img.post__user-avatar,.post__user img,[itemprop="image"],img.avatar';
 for(const img of [...doc.querySelectorAll(avatarSelectors),...matching.flatMap(a=>[...a.querySelectorAll('img')])]){
  // Post pages show the banner first inside .post__user; never take it as the avatar.
  creatorAvatar=safeThumbnail(img.getAttribute('data-src')||img.getAttribute('src')||img.getAttribute('content'));if(/\/banners\//.test(creatorAvatar))creatorAvatar='';if(creatorAvatar)break;
 }
 if(!creatorAvatar)for(const el of doc.querySelectorAll('.user-header__avatar,.post__user-avatar')){
  const raw=el.getAttribute('style')||'';const match=raw.match(/url\(\s*["']?([^"')]+)["']?\s*\)/);creatorAvatar=safeThumbnail(match?.[1]);if(creatorAvatar)break;
 }
 return {creator,creatorAvatar};
}
function rememberCreator(service,id,info){const k=C+service+'/'+id,old=GM_getValue(k,{}),value={creator:info.creator||old.creator||'',creatorAvatar:info.creatorAvatar||old.creatorAvatar||''};if(JSON.stringify(old)!==JSON.stringify(value))GM_setValue(k,value);return value}
function snapshot(){return GM_listValues().filter(k=>k.startsWith(P)).map(k=>{const id=k.slice(P.length),[service,creatorId,postId]=id.split('/'),meta=GM_getValue(M+id,{}),profile=GM_getValue(C+service+'/'+creatorId,{});return {...meta,id,service,creatorId,postId,url:`https://pawchive.pw/${service}/user/${creatorId}/post/${postId}`,creator:profile.creator||meta.creator||`Creator ${creatorId}`,creatorAvatar:safeThumbnail(profile.creatorAvatar||meta.creatorAvatar),seen:!!GM_getValue(k,false)}})}
if(DASHBOARDS.includes(location.origin)){
  const CHANNEL='paw-seen-sync-v1';let linked=false,last='',lastFrameSettings='';
  function publishFrameSettings(force=false,requestId){if(!linked)return;const settings=readFrameSettings(),signature=JSON.stringify(settings);if(force||signature!==lastFrameSettings){lastFrameSettings=signature;send('FRAME_SETTINGS',{settings,requestId,effects:SeenFrames.effectIds})}}
  function send(type,extra={}){document.dispatchEvent(new CustomEvent('paw-seen-response-v2',{detail:JSON.stringify({channel:CHANNEL,direction:'extension',type,...extra})}))}
  function publish(force=false){if(!linked)return;const posts=snapshot(),signature=JSON.stringify(posts);if(force||signature!==last){last=signature;send('SNAPSHOT',{posts})}else send('HEARTBEAT')}

  const attempted=new Set();let fetching=false,loaded=0,failed=0;
  function imageStatus(message){send('IMAGE_STATUS',{message,loaded,failed})}
  function resolveImage(raw,base){try{const url=new URL(raw,base);return safeThumbnail(url.href)}catch{return ''}}
  function readPostHTML(html,base){
    const doc=new DOMParser().parseFromString(html,'text/html');
    if(/verify you are human|checking your browser|just a moment/i.test(doc.title||''))throw Error('Pawchive verlangt eine Browser-Prüfung');
    const candidates=[];
    const add=raw=>{if(raw)candidates.push(resolveImage(raw,base))};
    for(const video of doc.querySelectorAll('video[poster]'))add(video.getAttribute('poster'));
    for(const image of doc.querySelectorAll('.post__thumbnail img,.post__files img,.post__content img,.post__body img')){
      add(image.getAttribute('data-src'));add(image.getAttribute('src'));
      const srcset=image.getAttribute('srcset')||image.getAttribute('data-srcset');
      if(srcset)for(const candidate of srcset.split(','))add(candidate.trim().split(/\s+/)[0]);
    }
    for(const m of doc.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]'))add(m.getAttribute('content'));
    for(const element of doc.querySelectorAll('.post__thumbnail,[class*="post__file"]')){
      const inline=element.getAttribute('style')||'';
      for(const match of inline.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g))add(match[1]||match[2]||match[3]);
    }
    const thumbnail=candidates.find(u=>u&&!/(?:logo|favicon|placeholder|avatar|spacer|blank)(?:[_.\/-])/i.test(u))||'';
    const title=doc.querySelector('.post__title,h1')?.textContent?.trim().replace(/\s+/g,' ').slice(0,250)||'';
    const creator=doc.querySelector('.post__user-name,.post__user a')?.textContent?.trim().slice(0,100)||'';
    return {thumbnail,title,creator};
  }
  function requestHTML(url){return new Promise((resolve,reject)=>{
    GM_xmlhttpRequest({method:'GET',url,responseType:'text',timeout:20000,
      onload:r=>{try{if(r.status!==200)return reject(Error('HTTP '+r.status));
        const final=new URL(r.finalUrl||url);
        if(!['pawchive.pw','www.pawchive.pw'].includes(final.hostname))return reject(Error('Unerwartete Weiterleitung'));
        resolve(readPostHTML(r.responseText||'',url));}catch(error){reject(error)}},
      onerror:()=>reject(Error('Netzwerk oder Berechtigung')),ontimeout:()=>reject(Error('Zeitüberschreitung'))});
  })}
  async function fillImages(reset=false){
    if(!linked||fetching)return;
    if(reset){attempted.clear();loaded=0;failed=0}
    const missing=()=>snapshot().filter(p=>!safeThumbnail(p.thumbnail)&&!attempted.has(p.id));
    if(!missing().length){if(reset)imageStatus('Keine weiteren fehlenden Bilder.');return}
    fetching=true;
    try{
      let next;
      while((next=missing()[0])){
        attempted.add(next.id);
        imageStatus('Bilder werden geladen … '+loaded+' ergänzt, '+failed+' nicht verfügbar');
        try{
          const info=await requestHTML(next.url);
          if(!info.thumbnail)throw Error('Kein Vorschaubild in der Post-Seite');
          const current=GM_getValue(M+next.id,{});
          // Read current data again so a status change made during the request survives.
          if(!safeThumbnail(current.thumbnail))GM_setValue(M+next.id,{...current,
            thumbnail:info.thumbnail,
            title:info.title||current.title||`Post ${next.postId}`,
            creator:info.creator||current.creator||`Creator ${next.creatorId}`});
          loaded++;publish(true);
        }catch(err){failed++;console.warn('Seen: Bild nicht verfügbar für '+next.id,err.message)}
        await new Promise(resolve=>setTimeout(resolve,600));
      }
      imageStatus(loaded+' Bilder ergänzt'+(failed?' · '+failed+' nicht verfügbar oder Anfrage blockiert':''));
    }finally{fetching=false}
  }

  const creatorAttempts=new Set();let creatorLoading=false;
  function profileHTML(url){return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url,responseType:'text',timeout:20000,onload:r=>{try{if(r.status!==200)throw Error('HTTP '+r.status);const doc=new DOMParser().parseFromString(r.responseText||'','text/html');if(/verify you are human|checking your browser|just a moment/i.test(doc.title||''))throw Error('Browser-Prüfung erforderlich');resolve(doc)}catch(e){reject(e)}},onerror:()=>reject(Error('Netzwerk oder Berechtigung')),ontimeout:()=>reject(Error('Zeitüberschreitung'))}))}
  async function fillCreators(reset=false){
   if(!linked||creatorLoading)return;
   if(reset)creatorAttempts.clear();
   creatorLoading=true;let good=0,bad=0;
   try{
    const profiles=new Map(snapshot().map(p=>[p.service+'/'+p.creatorId,p]));
    for(const [id,p] of profiles){
     if(creatorAttempts.has(id)||(!/^Creator\s+\d+$/i.test(p.creator||'')&&p.creator&&p.creatorAvatar))continue;
     creatorAttempts.add(id);send('CREATOR_STATUS',{message:'Creator-Profile werden geladen …'});
     try{const doc=await profileHTML(`https://pawchive.pw/${p.service}/user/${p.creatorId}`),info=creatorFrom(doc,p.service,p.creatorId,true);if(!info.creator&&!info.creatorAvatar)throw Error('Kein Profil gefunden');rememberCreator(p.service,p.creatorId,info);good++;publish(true)}catch(e){bad++;console.warn('Seen: Creator '+id,e.message)}
     await new Promise(resolve=>setTimeout(resolve,600));
    }
    if(good||bad)send('CREATOR_STATUS',{message:good+' Creator ergänzt'+(bad?' · '+bad+' Profile nicht verfügbar':'')});
   }finally{creatorLoading=false}
  }
  function safePost(p){if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^[-\w]+\/[^/\s?#]+\/[^/\s?#]+$/.test(p.id))throw Error('Ungültige Post-ID');const [service,creatorId,postId]=p.id.split('/');return {id:p.id,service,creatorId,postId,url:`https://pawchive.pw/${service}/user/${creatorId}/post/${postId}`,title:String(p.title||`Post ${postId}`).slice(0,250),creator:String(p.creator||`Creator ${creatorId}`).slice(0,100),creatorAvatar:safeThumbnail(p.creatorAvatar),thumbnail:safeThumbnail(p.thumbnail),seen:p.seen===true,saved:p.saved===true,updatedAt:Number.isFinite(Date.parse(p.updatedAt))?p.updatedAt:null,seenAt:Number.isFinite(Date.parse(p.seenAt))?p.seenAt:null}}
  // Image relay: dashboards that block remote images (Claude artifacts) get small data: URLs instead.
  // Only URLs already stored for a post or creator are fetched, so a page cannot use this as a general proxy.
  const imageJobs=[],imageBusy=new Set();let imageWorkers=0;
  function imageBlob(url){return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url,responseType:'blob',timeout:20000,headers:{Referer:'https://pawchive.pw/'},
    // Pawchive serves banners and icons as application/octet-stream; label them as images so they decode.
    onload:r=>{if(r.status!==200)return reject(Error('HTTP '+r.status));let blob=r.response;if(!blob||!blob.size)return reject(Error('Leere Antwort'));if(!/^image\//.test(blob.type||''))blob=new Blob([blob],{type:'image/jpeg'});resolve(blob)},
    onerror:()=>reject(Error('Netzwerk oder Berechtigung')),ontimeout:()=>reject(Error('Zeitüberschreitung'))}))}
  function blobToDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Bild nicht lesbar'));reader.readAsDataURL(blob)})}
  // Images go through unchanged. Re-encoding through a canvas comes out black when the browser blocks or fakes
  // canvas readout for the script (seen in Firefox), and a check can't tell faked pixels from real ones.
  async function shrinkImage(blob){
    if(blob.size>4000000)throw Error('Bild zu groß');
    return blobToDataURL(blob);
  }
  async function imageWorker(){
    imageWorkers++;
    try{let url;while((url=imageJobs.shift())){
      try{const data=await shrinkImage(await imageBlob(url));if(typeof data!=='string'||!data.startsWith('data:image/'))throw Error('Kein Bild');send('IMAGE_DATA',{url,data})}
      catch(err){send('IMAGE_FAIL',{url,message:err.message})}
      finally{imageBusy.delete(url)}
    }}finally{imageWorkers--}
  }
  function queueImages(urls){
    if(!Array.isArray(urls))return;
    const allowed=new Set();for(const p of snapshot())for(const u of [safeThumbnail(p.thumbnail),safeThumbnail(p.creatorAvatar),`https://pawchive.pw/banners/${p.service}/${p.creatorId}`,`https://pawchive.pw/icons/${p.service}/${p.creatorId}`])if(u)allowed.add(u);
    for(const feed of Object.values(readFeeds()))for(const p of feed.posts){const u=safeThumbnail(p.thumbnail);if(u)allowed.add(u)}
    for(const raw of urls.slice(0,300)){const url=safeThumbnail(raw);if(!url||imageBusy.has(url))continue;if(!allowed.has(url)){send('IMAGE_FAIL',{url:raw,message:'Unbekanntes Bild'});continue}imageBusy.add(url);imageJobs.push(url)}
    while(imageWorkers<3&&imageJobs.length)imageWorker();
  }
  // Creator feed: the newest posts from each followed creator's Pawchive page, cached for 30 minutes per creator.
  const FEED='paw-feed-v1:',FEED_TTL=30*60*1000;let feedLoading=false,lastFeeds='';
  function parseFeed(doc,service,creatorId){
    const out=[],ids=new Set();
    for(const card of doc.querySelectorAll('article.post-card')){
      let path='';try{path=new URL(card.querySelector('a[href*="/post/"]')?.getAttribute('href')||'','https://pawchive.pw').pathname}catch{continue}
      const m=path.match(/^\/([^/]+)\/user\/([^/]+)\/post\/([^/]+)\/?$/);
      if(!m||m[1]!==service||m[2]!==creatorId||ids.has(m[3]))continue;ids.add(m[3]);
      const raw=card.querySelector('time[datetime]')?.getAttribute('datetime')||'',when=Date.parse(raw.trim().replace(' ','T')+'Z');
      out.push({id:`${service}/${creatorId}/${m[3]}`,title:(card.querySelector('.post-card__header')?.textContent||'').trim().replace(/\s+/g,' ').slice(0,250),
        thumbnail:safeThumbnail(card.querySelector('img.post-card__image')?.getAttribute('src')),published:Number.isFinite(when)?new Date(when).toISOString():null});
    }
    return out.slice(0,50);
  }
  // Series search: older episodes are often beyond a creator's newest 50 posts, so search the creator's page by series name.
  const SEARCH='paw-search-v1:',SEARCH_TTL=6*60*60*1000,searchQueue=[];let searchRunning=false;
  function readFeeds(){
    const feeds={},add=(k,fetchedAt,list)=>{const f=feeds[k]||(feeds[k]={fetchedAt:0,posts:[],ids:new Set()});f.fetchedAt=Math.max(f.fetchedAt,fetchedAt||0);for(const p of list)if(p&&!f.ids.has(p.id)){f.ids.add(p.id);f.posts.push(p)}};
    const keys=GM_listValues();
    for(const k of keys)if(k.startsWith(FEED)){const v=GM_getValue(k,null);if(v&&Array.isArray(v.posts))add(k.slice(FEED.length),v.fetchedAt,v.posts)}
    for(const k of keys)if(k.startsWith(SEARCH)){const v=GM_getValue(k,null);if(v&&Array.isArray(v.posts)&&typeof v.creator==='string')add(v.creator,0,v.posts)}
    for(const f of Object.values(feeds))delete f.ids;
    return feeds;
  }
  function queueSeriesSearch(queries){
    if(!Array.isArray(queries))return;
    const followed=new Set(snapshot().filter(p=>p.seen).map(p=>p.service+'/'+p.creatorId));
    for(const q of queries.slice(0,40)){
      if(!q||typeof q.creator!=='string'||!followed.has(q.creator)||typeof q.name!=='string')continue;
      const name=q.name.trim().slice(0,100),key=SEARCH+q.creator+'|'+name.toLowerCase();
      if(name.length<2||searchQueue.some(x=>x.key===key))continue;
      const cached=GM_getValue(key,null);
      if(!q.force&&cached&&Date.now()-(cached.fetchedAt||0)<SEARCH_TTL){send('SEARCH_STATUS',{creator:q.creator,name,state:'cached',hits:cached.posts?.length||0,at:cached.fetchedAt});continue}
      searchQueue.push({key,creator:q.creator,name});send('SEARCH_STATUS',{creator:q.creator,name,state:'queued'});
    }
    runSeriesSearch();
  }
  async function runSeriesSearch(){
    if(searchRunning||!linked)return;searchRunning=true;
    try{let job;while((job=searchQueue.shift())){
      const [service,creatorId]=job.creator.split('/'),found=[];
      send('SEARCH_STATUS',{creator:job.creator,name:job.name,state:'running'});
      try{
        // Page through all results (long shows easily exceed 200 posts); results are saved after every page
        // so the dashboard fills up while the search is still running.
        for(let page=0;page<25;page++){
          const doc=await profileHTML(`https://pawchive.pw/${service}/user/${creatorId}?q=${encodeURIComponent(job.name)}${page?'&o='+page*50:''}`);
          const cards=doc.querySelectorAll('article.post-card').length;found.push(...parseFeed(doc,service,creatorId));
          GM_setValue(job.key,{fetchedAt:Date.now(),creator:job.creator,posts:found.slice(0,1250)});publishFeeds();
          send('SEARCH_STATUS',{creator:job.creator,name:job.name,state:'running',hits:found.length});
          await new Promise(resolve=>setTimeout(resolve,800));
          if(cards<50)break;
        }
        send('SEARCH_STATUS',{creator:job.creator,name:job.name,state:'done',hits:found.length,at:Date.now()});
      }catch(e){console.warn('Seen: Seriensuche '+job.name,e.message);send('SEARCH_STATUS',{creator:job.creator,name:job.name,state:'error',message:e.message})}
    }}finally{searchRunning=false}
  }
  function publishFeeds(force=false){if(!linked)return;const feeds=readFeeds(),signature=JSON.stringify(feeds);if(force||signature!==lastFeeds){lastFeeds=signature;send('FEEDS',{feeds})}}
  async function fillFeeds(force=false){
    if(!linked||feedLoading)return;feedLoading=true;
    try{
      const creators=new Map();for(const p of snapshot())if(p.seen)creators.set(p.service+'/'+p.creatorId,p);
      for(const [k,p] of creators){
        const cached=GM_getValue(FEED+k,null);
        if(!force&&cached&&Date.now()-(cached.fetchedAt||0)<FEED_TTL)continue;
        try{const doc=await profileHTML(`https://pawchive.pw/${p.service}/user/${p.creatorId}`);GM_setValue(FEED+k,{fetchedAt:Date.now(),posts:parseFeed(doc,p.service,p.creatorId)})}
        catch(e){GM_setValue(FEED+k,{fetchedAt:Date.now(),posts:cached?.posts||[]});console.warn('Seen: Feed '+k,e.message)}
        publishFeeds();
        await new Promise(resolve=>setTimeout(resolve,800));
      }
    }finally{feedLoading=false}
  }
  // Post descriptions: plain text from Pawchive's post API, cached for 30 days. Only posts the user already has
  // (collection or feeds) are fetched. The dashboard receives text only, never HTML.
  const DESC='paw-desc-v1:',DESC_TTL=30*24*60*60*1000,descQueue=[],descBusy=new Set();let descRunning=false;
  function htmlToText(html){
    const doc=new DOMParser().parseFromString('<div>'+String(html||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|li|h\d)>/gi,'\n')+'</div>','text/html');
    return (doc.body.textContent||'').replace(/[ \t ]+/g,' ').replace(/\s*\n\s*/g,'\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,1200);
  }
  function postJSON(url){return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url,responseType:'text',timeout:20000,headers:{Accept:'text/css'},
    onload:r=>{try{if(r.status!==200)throw Error('HTTP '+r.status);resolve(JSON.parse(r.responseText||'{}'))}catch(e){reject(e)}},
    onerror:()=>reject(Error('Netzwerk oder Berechtigung')),ontimeout:()=>reject(Error('Zeitüberschreitung'))}))}
  function queueDescriptions(ids){
    if(!Array.isArray(ids))return;
    const known=new Set(snapshot().map(p=>p.id));for(const feed of Object.values(readFeeds()))for(const p of feed.posts)known.add(p.id);
    const ready={};
    for(const id of ids.slice(0,400)){
      if(typeof id!=='string'||!known.has(id)||descBusy.has(id))continue;
      const cached=GM_getValue(DESC+id,null);
      if(cached&&Date.now()-(cached.at||0)<DESC_TTL){ready[id]=cached.text||'';continue}
      descBusy.add(id);descQueue.push(id);
    }
    if(Object.keys(ready).length)send('DESCRIPTIONS',{items:ready});
    runDescriptions();
  }
  async function runDescriptions(){
    if(descRunning||!linked)return;descRunning=true;
    try{let id;while((id=descQueue.shift())){
      const [service,creatorId,postId]=id.split('/');
      try{
        const post=await postJSON(`https://pawchive.pw/api/v1/${service}/user/${creatorId}/post/${postId}`);
        let text=htmlToText(post.content);
        // Video embeds often carry only a generic "Watch … on Streamable." line; skip that.
        const embed=typeof post.embed?.description==='string'?post.embed.description.trim():'';
        if(!text&&embed&&!/^watch\b/i.test(embed))text=embed.slice(0,1200);
        GM_setValue(DESC+id,{text,at:Date.now()});send('DESCRIPTIONS',{items:{[id]:text}});
      }catch(e){console.warn('Seen: Beschreibung '+id,e.message)}
      finally{descBusy.delete(id)}
      await new Promise(resolve=>setTimeout(resolve,500));
    }}finally{descRunning=false}
  }
  // Series posters from TVmaze (free TV database, no key). Only the series name is sent there.
  // The poster URL is cached for 30 days, a miss for 7 days; images go to the dashboard as data: URLs.
  const POSTER='paw-poster-v1:',POSTER_TTL=30*24*60*60*1000,MISS_TTL=7*24*60*60*1000,posterQueue=[],posterBusy=new Set();let posterRunning=false;
  function tvmazeJSON(url){return new Promise((resolve,reject)=>GM_xmlhttpRequest({method:'GET',url,responseType:'text',timeout:20000,
    onload:r=>{try{if(r.status===404)return resolve(null);if(r.status!==200)throw Error('HTTP '+r.status);resolve(JSON.parse(r.responseText||'null'))}catch(e){reject(e)}},
    onerror:()=>reject(Error('Netzwerk oder Berechtigung')),ontimeout:()=>reject(Error('Zeitüberschreitung'))}))}
  // "Dr. Who" is listed as "Doctor Who". A hit only counts when its name matches the series name,
  // so a loose search result never shows the wrong show.
  async function tvmazeShow(name){
    const query=name.replace(/^dr\.?\s+/i,'Doctor '),flat=s=>String(s||'').toLowerCase().replace(/^the\s+/,'').replace(/[^a-z0-9]/g,'');
    const found=await tvmazeJSON('https://api.tvmaze.com/singlesearch/shows?q='+encodeURIComponent(query));
    return found&&flat(found.name)&&(flat(found.name).includes(flat(query))||flat(query).includes(flat(found.name)))?found:null;
  }
  // IMDb episode IDs: show ID from TVmaze, episode IDs (season + number) from Wikidata. Cached for 14 days.
  // Also whether the show has ended and its final episode (TVmaze), so the dashboard can mark finished series,
  // and a wide background image (TVmaze) for the dashboard's header.
  const IMDB='paw-imdb-v3:',IMDB_TTL=14*24*60*60*1000,imdbQueue=[],imdbBusy=new Set();let imdbRunning=false;
  function queueImdb(names){
    if(!Array.isArray(names))return;
    for(const raw of names.slice(0,20)){
      if(typeof raw!=='string')continue;const name=raw.trim().slice(0,80),key=name.toLowerCase();
      if(name.length<2||imdbBusy.has(key))continue;
      const cached=GM_getValue(IMDB+key,null);
      if(cached&&Date.now()-(cached.at||0)<IMDB_TTL){send('IMDB',{name,show:cached.show,eps:cached.eps,ended:!!cached.ended,final:cached.final||null,backdrop:cached.backdrop||''});continue}
      imdbBusy.add(key);imdbQueue.push({name,key});
    }
    runImdb();
  }
  async function runImdb(){
    if(imdbRunning||!linked)return;imdbRunning=true;
    try{let job;while((job=imdbQueue.shift())){
      try{
        const found=await tvmazeShow(job.name),show=/^tt\d+$/.test(found?.externals?.imdb||'')?found.externals.imdb:'',eps={};
        // A failed Wikidata lookup still sends the show ID (season pages work) and is retried after a day.
        if(show)try{
          const q=`SELECT ?imdb ?s ?e WHERE{?show wdt:P345 "${show}".?season wdt:P179 ?show;p:P179 [ps:P179 ?show;pq:P1545 ?s].?ep wdt:P4908 ?season;wdt:P345 ?imdb;p:P4908 [ps:P4908 ?season;pq:P1545 ?e].}`;
          const r=await tvmazeJSON('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(q));
          for(const b of r?.results?.bindings||[]){const id=b.imdb?.value,s=parseInt(b.s?.value,10),e=parseInt(b.e?.value,10);if(/^tt\d+$/.test(id||'')&&s>0&&e>0)eps[s+'x'+e]=id}
        }catch(e){console.warn('Seen: Wikidata '+job.name,e.message)}
        let ended=false,final=null;
        if(found?.id)try{
          ended=found.status==='Ended';
          if(ended){const list=await tvmazeJSON(`https://api.tvmaze.com/shows/${encodeURIComponent(found.id)}/episodes`);const last=Array.isArray(list)?list.filter(x=>x?.season>0&&x?.number>0).pop():null;if(last)final={s:last.season,e:last.number}}
        }catch(e){console.warn('Seen: TVmaze-Folgen '+job.name,e.message)}
        // Prefer backgrounds up to 1920 px wide (4K originals load slowly), then TVmaze's main pick.
        let backdrop='';
        if(found?.id)try{
          const imgs=await tvmazeJSON(`https://api.tvmaze.com/shows/${encodeURIComponent(found.id)}/images`),w=x=>x.resolutions.original.width||0;
          const bg=(Array.isArray(imgs)?imgs:[]).filter(x=>x?.type==='background'&&x.resolutions?.original?.url).sort((a,b)=>((w(a)>1920)-(w(b)>1920))||(b.main-a.main)||(w(a)-w(b)))[0];
          backdrop=safeThumbnail(bg?.resolutions.original.url||'');if(backdrop&&!/(^|\.)tvmaze\.com$/.test(new URL(backdrop).hostname))backdrop='';
        }catch(e){console.warn('Seen: TVmaze-Bilder '+job.name,e.message)}
        const full=Object.keys(eps).length>0;
        GM_setValue(IMDB+job.key,{show,eps,ended,final,backdrop,at:full?Date.now():Date.now()-IMDB_TTL+24*60*60*1000});send('IMDB',{name:job.name,show,eps,ended,final,backdrop});
      }catch(e){console.warn('Seen: IMDb '+job.name,e.message)}
      finally{imdbBusy.delete(job.key)}
      await new Promise(resolve=>setTimeout(resolve,400));
    }}finally{imdbRunning=false}
  }
  function queuePosters(names){
    if(!Array.isArray(names))return;
    for(const raw of names.slice(0,60)){
      if(typeof raw!=='string')continue;
      const name=raw.trim().slice(0,80),key=name.toLowerCase();
      if(name.length<2||posterBusy.has(key))continue;
      const cached=GM_getValue(POSTER+key,null);
      if(cached&&!cached.url&&Date.now()-(cached.at||0)<MISS_TTL){send('POSTER',{name,data:null});continue}
      posterBusy.add(key);posterQueue.push({name,key,cached});
    }
    runPosters();
  }
  async function runPosters(){
    if(posterRunning||!linked)return;posterRunning=true;
    try{let job;while((job=posterQueue.shift())){
      try{
        let url='',show='';
        if(job.cached?.url&&Date.now()-(job.cached.at||0)<POSTER_TTL){url=job.cached.url;show=job.cached.show||''}
        else{
          // "Dr. Who" is listed as "Doctor Who". A hit only counts when its name matches the series name,
          // so a loose search result never shows the wrong poster.
          const found=await tvmazeShow(job.name);
          url=found?safeThumbnail(found.image?.original||found.image?.medium||''):'';show=found?String(found.name).slice(0,100):'';
          if(url&&!/(^|\.)tvmaze\.com$/.test(new URL(url).hostname))url='';
          GM_setValue(POSTER+job.key,{url,show,at:Date.now()});
        }
        if(!url){send('POSTER',{name:job.name,data:null});continue}
        const data=await shrinkImage(await imageBlob(url));
        send('POSTER',{name:job.name,data,show});
      }catch(e){console.warn('Seen: Poster '+job.name,e.message);send('POSTER',{name:job.name,data:null,error:e.message})}
      finally{posterBusy.delete(job.key)}
      await new Promise(resolve=>setTimeout(resolve,400));
    }}finally{posterRunning=false}
  }
  document.documentElement.setAttribute('data-paw-seen-bridge','2.19.3');
  document.addEventListener('paw-seen-request-v2',e=>{
    let m;try{if(typeof e.detail!=='string')return;m=JSON.parse(e.detail)}catch{return}
    if(m?.channel!==CHANNEL||m.direction!=='dashboard')return;
    try{
      if(m.type==='GET_IMAGES'&&linked)queueImages(m.urls);
      if(m.type==='REFRESH_FEEDS'&&linked)fillFeeds(true);
      if(m.type==='SERIES_SEARCH'&&linked)queueSeriesSearch(m.queries);
      if(m.type==='GET_DESCRIPTIONS'&&linked)queueDescriptions(m.ids);
      if(m.type==='GET_POSTERS'&&linked)queuePosters(m.names);
      if(m.type==='GET_IMDB'&&linked)queueImdb(m.names);
      if(m.type==='BACKUP_DONE'&&linked)GM_setValue(BACKUP_KEY,Date.now());
      if(m.type==='HELLO'){linked=true;send('READY',{version:'2.19.3'});publish(true);publishFrameSettings(true);publishFeeds(true);fillImages();fillCreators();fillFeeds()}
      if(m.type==='GET_FRAME_SETTINGS'){linked=true;publishFrameSettings(true,m.requestId)}
      if(m.type==='SET_FRAME_SETTINGS'&&linked){GM_setValue(FRAME_KEY,SeenFrames.normalize(m.settings));publishFrameSettings(true,m.requestId)}
      if(m.type==='ENRICH_IMAGES'&&linked){fillImages(true);fillCreators(true)}
      if(m.type==='UPSERT'&&linked){const p=safePost(m.post);GM_setValue(M+p.id,p);GM_setValue(P+p.id,p.seen);send('ACK',{requestId:m.requestId});publish(true)}
      if(m.type==='MERGE'&&linked){if(!Array.isArray(m.posts)||m.posts.length>50000)throw Error('Ungültige Sammlung');const rows=m.posts.map(safePost),known=new Set(GM_listValues());for(const p of rows){const old=GM_getValue(M+p.id,{});if(!known.has(P+p.id)||(Date.parse(p.updatedAt)||0)>(Date.parse(old.updatedAt)||0)){GM_setValue(M+p.id,{...old,...p});GM_setValue(P+p.id,p.seen)}}send('ACK',{requestId:m.requestId});publish(true)}
    }catch(err){send('ERROR',{requestId:m.requestId,message:err.message})}
  });
  // Feeds are sent after every write (and on HELLO); re-reading thousands of cached posts every 2 s stalled the
  // dashboard's animations.
  setInterval(()=>{publish();publishFrameSettings();fillImages();fillCreators();fillFeeds()},2000);
  return;
}


let frameSignature='';
function refreshFrameSettings(force=false){
 if(!force&&SeenFrames.isOpen())return;
 const value=readFrameSettings(),next=JSON.stringify(value),root=document.documentElement,style=document.getElementById('paw-frame-design-style');
 const missing=!style||style.textContent!==SeenFrames.css||style.sheet?.disabled||root.getAttribute('data-paw-frame-sig')!==next;
 if(force||next!==frameSignature||missing){frameSignature=next;SeenFrames.apply(value)}
}
function openFrameSettings(){SeenFrames.open({settings:readFrameSettings(),onPreview:value=>SeenFrames.apply(value),onCancel:()=>refreshFrameSettings(true),onSave:value=>{GM_setValue(FRAME_KEY,SeenFrames.normalize(value));refreshFrameSettings(true)}})}
GM_registerMenuCommand('Rahmen gestalten',openFrameSettings);
refreshFrameSettings(true);
setInterval(()=>refreshFrameSettings(),2000);

const key=h=>{try{const u=new URL(h,location.href);return /^(www\.)?pawchive\.pw$/.test(u.hostname)?u.pathname.match(/^\/([^/]+)\/user\/([^/]+)\/post\/([^/]+)\/?$/)?.slice(1).join('/')||null:null}catch{return null}};
// Backup file in the dashboard's format ("Backup importieren" reads it). Downloads work here, unlike on Claude.
function download(){const posts=snapshot(),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({format:'paw-seen',version:2,posts},null,2)],{type:'application/json'}));a.download=`seen-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);GM_setValue(BACKUP_KEY,Date.now());barSignature='';schedule()}
GM_registerMenuCommand('Backup herunterladen',download);
// Reminder text when the last backup is older than 30 days (or there is none) and it isn't snoozed.
function backupDue(){
 const at=Number(GM_getValue(BACKUP_KEY,0))||0,days=at?Math.floor((Date.now()-at)/864e5):-1;
 if((days>=0&&days<30)||Date.now()<(Number(GM_getValue(BACKUP_SNOOZE,0))||0)||!GM_listValues().some(k=>k.startsWith(P)))return '';
 return days<0?'Noch kein Backup deiner Sammlung.':`Letztes Backup vor ${days} Tagen.`;
}
function thumbnailFrom(tile,detail){
 const scope=detail?(document.querySelector('.post__files,.post__body,.post__content')||tile):tile;
 const candidates=[];
 function add(raw){if(typeof raw==='string'&&raw.trim())candidates.push(raw.trim())}
 function srcset(raw){if(raw)for(const part of raw.split(','))add(part.trim().split(/\s+/)[0])}
 function background(raw){if(!raw)return;for(const match of raw.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g))add(match[1]||match[2]||match[3])}
 if(detail){const video=document.querySelector('video[poster]');add(video?.getAttribute('poster'))}
 for(const img of scope.querySelectorAll('img')){
  add(img.currentSrc);
  for(const attr of ['data-src','data-original','data-lazy-src','data-url','src'])add(img.getAttribute(attr));
  srcset(img.getAttribute('srcset'));srcset(img.getAttribute('data-srcset'));
 }
 for(const source of scope.querySelectorAll('picture source')){srcset(source.getAttribute('srcset'));srcset(source.getAttribute('data-srcset'))}
 if(!detail){
  for(const element of [tile,...tile.querySelectorAll('*')]){
   for(const attr of ['data-background','data-bg','data-thumbnail','data-thumb','poster'])add(element.getAttribute(attr));
   for(const pseudo of [null,'::before','::after']){try{background(getComputedStyle(element,pseudo).backgroundImage)}catch{}}
   background(element.getAttribute('style'));
   if(element.tagName?.toLowerCase()==='image')add(element.getAttribute('href')||element.getAttribute('xlink:href'));
  }
 }
 const valid=candidates.map(safeThumbnail).filter(Boolean);
 // Prefer a real image over common loading placeholders.
 return valid.find(url=>!/(?:placeholder|transparent|loading|spacer|blank)\.(?:gif|png|svg)(?:[?#]|$)/i.test(url))||'';
}
function meta(k,tile,detail){
 const [service,creatorId,postId]=k.split('/'),old=GM_getValue(M+k,{});
 let title=detail?(document.querySelector('h1')?.textContent||''):(tile.querySelector('.post-card__header,.post-card__title')?.textContent||tile.querySelector('a')?.textContent||'');
 title=title.trim().replace(/\s+/g,' ').slice(0,250);
 const route=new URL(location.href).pathname.replace(/\/$/,'');const own=route===`/${service}/user/${creatorId}`||route.startsWith(`/${service}/user/${creatorId}/post/`);const live=creatorFrom(own?document:tile,service,creatorId,own&&!detail);const profile=rememberCreator(service,creatorId,live);const artist=profile.creator;
 return {...old,id:k,service,creatorId,postId,url:`https://pawchive.pw/${service}/user/${creatorId}/post/${postId}`,title:title||old.title||`Post ${postId}`,creator:artist||old.creator||`Creator ${creatorId}`,creatorAvatar:profile.creatorAvatar||old.creatorAvatar||'',thumbnail:detail?(safeThumbnail(old.thumbnail)||thumbnailFrom(tile,true)):(thumbnailFrom(tile,false)||safeThumbnail(old.thumbnail))};
}
function seenEye(){const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');for(const [k,v]of Object.entries({viewBox:'0 0 32 32',width:'22',height:'22',fill:'none',stroke:'currentColor','stroke-width':'2.2','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);const path=document.createElementNS(ns,'path');path.setAttribute('d','M3 16C9 5 23 5 29 16C23 27 9 27 3 16Z');const pupil=document.createElementNS(ns,'circle');pupil.setAttribute('cx','16');pupil.setAttribute('cy','16');pupil.setAttribute('r','5');svg.append(path,pupil);svg.style.cssText='display:block!important;flex-shrink:0!important;pointer-events:none!important';return svg}
function matchFavorite(button,favorite){
 const text=[...favorite.querySelectorAll('span,strong,b')].reverse().find(el=>/^(?:[☆★⭐]\s*)?(?:unfavorite|favorite)$/i.test(el.textContent.trim()))||favorite;
 const style=getComputedStyle(text),box=getComputedStyle(favorite);
 const set=(name,value)=>{if(value)button.style.setProperty(name,value,'important')};
 for(const name of ['font-family','font-size','font-weight','font-style','font-stretch','line-height','letter-spacing','word-spacing','text-transform','text-shadow'])set(name,style.getPropertyValue(name));
 for(const name of ['padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','vertical-align'])set(name,box.getPropertyValue(name));
 set('border-radius','0');set('display','inline-block');set('vertical-align','baseline');set('top','0');set('gap','0.3em');set('white-space','nowrap');set('text-decoration','none');
 const parent=getComputedStyle(favorite.parentElement);
 const gap=parseFloat(parent.columnGap)||parseFloat(parent.gap)||0;
 if(!gap&&!(parseFloat(box.marginLeft)||parseFloat(box.marginRight)))set('margin-left','1em');
 const icon=button.querySelector('svg');
 if(icon){icon.setAttribute('viewBox','2 6 28 20');icon.setAttribute('width','1em');icon.setAttribute('height','1em');icon.style.setProperty('display','inline-block','important');icon.style.setProperty('vertical-align','-0.13em','important');icon.style.setProperty('margin-right','0.3em','important');icon.style.setProperty('width','1em','important');icon.style.setProperty('height','1em','important');icon.style.setProperty('filter','drop-shadow(1px 1px 1px rgba(0,0,0,.85))','important')}
 const label=button.querySelector('span');
 if(label){
  for(const property of ['font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-shadow'])label.style.setProperty(property,'inherit','important');
  label.style.setProperty('display','inline','important');
  // Compare the actual text boxes, rather than aligning the SVG's baseline.
  const walker=document.createTreeWalker(text,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){
   const match=node.textContent.match(/unfavorite|favorite/i);if(!match)continue;
   const reference=document.createRange();reference.setStart(node,match.index);reference.setEnd(node,match.index+match[0].length);
   const own=document.createRange();own.selectNodeContents(label);
   const delta=reference.getBoundingClientRect().bottom-own.getBoundingClientRect().bottom;
   if(Number.isFinite(delta)&&Math.abs(delta)<parseFloat(style.fontSize)*2)set('top',delta+'px');
   break;
  }
 }
}
function svgIcon(kind,size=16){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
 for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:String(size),height:String(size),fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
 const d={seen:'M2.5 12s3.4-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.4 6.5-9.5 6.5S2.5 12 2.5 12Z M14.8 12a2.8 2.8 0 1 1-5.6 0 2.8 2.8 0 0 1 5.6 0',saved:'M6 3.5h12v17l-6-4-6 4z',check:'M5 12.5l4.2 4.2L19 7'}[kind];
 for(const part of d.split(' M')){const path=document.createElementNS(ns,'path');path.setAttribute('d',part.startsWith('M')?part:'M'+part);svg.append(path)}
 return svg;
}

// ── Card actions ──────────────────────────────────────
function toggleSeen(k,tile){const metadata=meta(k,tile,false),now=new Date().toISOString(),next=!GM_getValue(P+k,false);GM_setValue(P+k,next);GM_setValue(M+k,{...metadata,saved:next?false:metadata.saved,updatedAt:now,seenAt:next?now:null});schedule()}
function toggleSaved(k,tile){const old=GM_getValue(M+k,{}),metadata=meta(k,tile,false);GM_setValue(P+k,!!GM_getValue(P+k,false));GM_setValue(M+k,{...metadata,saved:!old.saved,updatedAt:new Date().toISOString()});schedule()}
function actionButton(kind){
 const b=document.createElement('button');b.type='button';b.className='paw-act paw-act-'+kind;b.append(svgIcon(kind));
 b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const tile=b.closest('.paw-seen-tile'),k=tile?.dataset.pawKey;if(!k)return;kind==='seen'?toggleSeen(k,tile):toggleSaved(k,tile)});
 return b;
}
// Builds the overlay once per card; later scans only update its state.
function decorate(tile,k){
 let ui=tile.querySelector(':scope>.paw-card-ui');
 if(!ui){
  ui=document.createElement('div');ui.className='paw-card-ui';
  const pill=document.createElement('span');pill.className='paw-pill';
  const actions=document.createElement('div');actions.className='paw-actions';actions.append(actionButton('seen'),actionButton('saved'));
  ui.append(pill,actions);ui.addEventListener('click',e=>{if(e.target===ui)return;e.stopPropagation()});
  tile.append(ui);tile.classList.add('paw-seen-tile');
 }
 if(tile.dataset.pawKey!==k){tile.dataset.pawKey=k;const metadata=meta(k,tile,false);if(JSON.stringify(metadata)!==JSON.stringify(GM_getValue(M+k,{})))GM_setValue(M+k,metadata)}
 const seen=!!GM_getValue(P+k,false),saved=!!GM_getValue(M+k,{}).saved,frame=tile.matches('.post-card:has(> .image-link)')?ui:tile;
 tile.classList.toggle('paw-is-seen',seen);tile.classList.toggle('paw-is-saved',saved);
 frame.classList.toggle('paw-seen-marked',seen);frame.classList.toggle('paw-saved-marked',saved);
 const pill=ui.querySelector('.paw-pill'),label=seen?'Gesehen':saved?'Merkliste':'';
 if(pill.dataset.state!==label){pill.dataset.state=label;pill.replaceChildren();if(label){pill.append(svgIcon(seen?'check':'saved',12),document.createTextNode(label))}}
 const seenBtn=ui.querySelector('.paw-act-seen'),savedBtn=ui.querySelector('.paw-act-saved');
 seenBtn.setAttribute('aria-pressed',String(seen));seenBtn.title=seen?'Als ungesehen markieren':'Als gesehen markieren';seenBtn.setAttribute('aria-label',seenBtn.title);
 savedBtn.setAttribute('aria-pressed',String(saved));savedBtn.title=saved?'Aus Merkliste entfernen':'Für später merken';savedBtn.setAttribute('aria-label',savedBtn.title);
}
function detailButton(k){
 const fav=[...document.querySelectorAll('a,button,[role="button"]')].find(e=>!e.closest('nav,aside,footer')&&/^(?:[☆★⭐]\s*)?(?:unfavorite|favorite)$/i.test(e.textContent.trim())&&e.getClientRects().length);
 const anchor=fav||document.querySelector('h1');if(!anchor)return;
 let b=document.getElementById('paw-seen-detail');
 if(!b||b.dataset.pawKey!==k){
  b?.remove();b=document.createElement('button');b.id='paw-seen-detail';b.className='paw-seen-button';b.dataset.pawKey=k;b.append(seenEye());b.append(document.createElement('span'));
  b.onclick=e=>{e.preventDefault();e.stopPropagation();const next=!GM_getValue(P+k,false);GM_setValue(P+k,next);GM_setValue(M+k,{...meta(k,document.body,true),saved:next?false:GM_getValue(M+k,{}).saved,updatedAt:new Date().toISOString(),seenAt:next?new Date().toISOString():null});schedule()};
  anchor.after(b);
 }
 const s=!!GM_getValue(P+k,false);
 b.style.cssText=`all:initial!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;cursor:pointer!important;font:600 20px system-ui!important;color:${s?'var(--paw-seen-color,#5ee08f)':'#eee'}!important;background:transparent!important;padding:4px 0!important;border:0!important;border-radius:0!important;position:relative!important;margin-left:20px!important;z-index:100!important;`;
 if(fav)matchFavorite(b,fav);
 b.querySelector('span').textContent=s?'Gesehen':'Als gesehen markieren';b.title=s?'Markierung aufheben':'Als gesehen markieren';b.setAttribute('aria-pressed',String(s));
 const metadata=meta(k,document.body,true);if(JSON.stringify(metadata)!==JSON.stringify(GM_getValue(M+k,{})))GM_setValue(M+k,metadata);
}

// ── Creator page bar: progress, filter, dimming ────────
const UI_KEY='paw-ui-v1';
const readUi=()=>{const v=GM_getValue(UI_KEY,{});return {filter:['all','unseen','seen'].includes(v?.filter)?v.filter:'all',dim:v?.dim===true}};
const barCss=`:host{all:initial;display:block;box-sizing:border-box;width:min(1100px,calc(100% - 24px));margin:14px auto 12px;font:14px/1.4 Inter,"Segoe UI",system-ui,sans-serif;color:#f4f4f6;color-scheme:dark}
*{box-sizing:border-box}
.bar{display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;padding:12px 16px;background:#16161a;border:1px solid #ffffff1f;border-radius:14px;box-shadow:0 10px 30px #0006}
.brand{font-weight:800;font-size:15px;letter-spacing:-.03em}.brand b{color:var(--seen)}
.progress{display:grid;gap:6px;flex:1 1 220px;min-width:0}
.progress-text{font-size:13px;color:#a3a3ad;font-variant-numeric:tabular-nums}.progress-text strong{color:#f4f4f6;font-size:15px}
.track{height:6px;border-radius:99px;background:#ffffff14;overflow:hidden}.fill{height:100%;border-radius:inherit;background:var(--seen);transition:width .4s}
.seg{display:flex;padding:3px;border-radius:10px;background:#0f0f12;border:1px solid #ffffff14}
.seg button{all:unset;cursor:pointer;padding:6px 12px;border-radius:7px;font-size:13px;font-weight:600;color:#a3a3ad;white-space:nowrap}
.seg button:hover{color:#f4f4f6}.seg button[aria-pressed=true]{background:#28282f;color:#f4f4f6}
.seg small{color:#71717b;margin-left:5px;font-weight:600;font-variant-numeric:tabular-nums}
.toggle{all:unset;cursor:pointer;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#a3a3ad;white-space:nowrap}.toggle:hover{color:#f4f4f6}
.switch{width:32px;height:18px;border-radius:99px;background:#ffffff26;position:relative;transition:background .2s;flex:none}
.switch:after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .2s}
.toggle[aria-pressed=true] .switch{background:var(--seen)}.toggle[aria-pressed=true] .switch:after{transform:translateX(14px)}
.icon-btn{all:unset;cursor:pointer;width:32px;height:32px;display:grid;place-items:center;border-radius:9px;border:1px solid #ffffff1f;font-size:16px;color:#f4f4f6}.icon-btn:hover{background:#ffffff12}
.note{flex-basis:100%;margin-top:-4px;font-size:12px;color:#71717b}
.backup{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:8px 12px;border-radius:10px;background:#f5b83d14;border:1px solid #f5b83d40;color:#f5d38a;font-size:13px}
.backup span{margin-right:auto}
.backup button{all:unset;cursor:pointer;padding:5px 10px;border-radius:7px;font-weight:650;font-size:12.5px}
.backup [data-backup]{background:#f5b83d;color:#1d1300}.backup [data-backup]:hover{filter:brightness(1.08)}
.backup [data-snooze]{color:#a3a3ad}.backup [data-snooze]:hover{color:#f4f4f6}
:focus-visible{outline:2px solid var(--seen);outline-offset:2px}
@media(max-width:640px){.bar{gap:10px 14px}.seg button{padding:6px 9px}}
@media(prefers-reduced-motion:reduce){.fill,.switch,.switch:after{transition:none}}`;
function creatorRoute(){const m=location.pathname.match(/^\/([^/]+)\/user\/([^/]+)\/?$/);return m?{service:m[1],creatorId:m[2],query:new URLSearchParams(location.search).get('q')||''}:null}
let barSignature='';
function renderBar(){
 const route=creatorRoute(),root=document.documentElement;
 let host=document.getElementById('paw-bar-host');
 if(!route){host?.remove();root.removeAttribute('data-paw-filter');root.removeAttribute('data-paw-dim');barSignature='';return}
 const ui=readUi();
 root.setAttribute('data-paw-filter',ui.filter);root.toggleAttribute('data-paw-dim',ui.dim);
 const tiles=[...document.querySelectorAll('.card-list .paw-seen-tile')],pageSeen=tiles.filter(t=>t.classList.contains('paw-is-seen')).length;
 const prefix=P+route.service+'/'+route.creatorId+'/',creatorSeen=GM_listValues().filter(k=>k.startsWith(prefix)&&GM_getValue(k,false)).length;
 const totalMatch=(document.querySelector('#paginator-top small')?.textContent||'').match(/of\s+([\d.,]+)/i),total=totalMatch?Number(totalMatch[1].replace(/[.,]/g,'')):0;
 const due=backupDue(),signature=JSON.stringify([ui,tiles.length,pageSeen,creatorSeen,total,route.query,due]);
 const anchor=document.querySelector('#paginator-top')||document.querySelector('.card-list');if(!anchor)return;
 if(host&&host.isConnected&&host.nextElementSibling===anchor&&signature===barSignature)return;
 if(!host){
  host=document.createElement('div');host.id='paw-bar-host';host.attachShadow({mode:'open'});
  // Pawchive resets margins on this section's children, which beats :host rules; inline !important keeps the bar centred.
  for(const [k,v] of [['display','block'],['box-sizing','border-box'],['width','min(1100px, calc(100% - 24px))'],['margin','14px auto 12px'],['float','none'],['clear','both']])host.style.setProperty(k,v,'important');
 }
 if(host.nextElementSibling!==anchor)anchor.before(host);
 barSignature=signature;
 const shadow=host.shadowRoot,fmt=n=>n.toLocaleString('de-DE');
 const progress=route.query||!total?`<strong>${fmt(pageSeen)}</strong> von ${fmt(tiles.length)} auf dieser Seite gesehen`:`<strong>${fmt(creatorSeen)}</strong> von ${fmt(total)} Posts gesehen`;
 const ratio=route.query||!total?(tiles.length?pageSeen/tiles.length:0):Math.min(1,creatorSeen/total);
 const seg=(id,label,count)=>`<button data-filter="${id}" aria-pressed="${ui.filter===id}">${label}<small>${fmt(count)}</small></button>`;
 shadow.innerHTML=`<style>${barCss}</style><div class="bar" role="region" aria-label="Seen: Fortschritt und Filter">
<span class="brand">seen<b>.</b></span>
<div class="progress"><span class="progress-text">${progress}</span><div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(ratio*100)}"><div class="fill" style="width:${(ratio*100).toFixed(1)}%"></div></div></div>
<div class="seg" role="group" aria-label="Posts auf dieser Seite filtern">${seg('all','Alle',tiles.length)}${seg('unseen','Ungesehen',tiles.length-pageSeen)}${seg('seen','Gesehen',pageSeen)}</div>
<button class="toggle" data-dim aria-pressed="${ui.dim}"><span class="switch"></span>Gesehene abdunkeln</button>
<button class="icon-btn" data-backup title="Backup herunterladen" aria-label="Backup herunterladen">⤓</button>
<button class="icon-btn" data-design title="Darstellung anpassen" aria-label="Darstellung anpassen">⚙</button>
${ui.filter!=='all'?'<span class="note">Der Filter gilt für die Posts auf dieser Seite.</span>':''}
${due?`<div class="backup" role="status"><span>${due} Deine Sammlung liegt nur in diesem Browser.</span><button data-backup>Jetzt sichern</button><button data-snooze>Später</button></div>`:''}</div>`;
 shadow.host.style.setProperty('--seen',getComputedStyle(root).getPropertyValue('--paw-seen-color')||'#5ee08f');
 shadow.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{GM_setValue(UI_KEY,{...readUi(),filter:b.dataset.filter});barSignature='';renderBar()});
 shadow.querySelector('[data-dim]').onclick=()=>{GM_setValue(UI_KEY,{...readUi(),dim:!readUi().dim});barSignature='';renderBar()};
 shadow.querySelector('[data-design]').onclick=openFrameSettings;
 shadow.querySelectorAll('[data-backup]').forEach(b=>b.onclick=download);
 const snooze=shadow.querySelector('[data-snooze]');if(snooze)snooze.onclick=()=>{GM_setValue(BACKUP_SNOOZE,Date.now()+7*864e5);barSignature='';renderBar()};
}

// ── Episode navigation on post pages ──────────────────
// Same title parsing as the dashboard (app.js parseEpisodes): keep both in step.
const EP_RE=/\bS(\d{1,2})\s*E(\d{1,3})(?:\s*(?:-|–|&|\+|,)\s*(?:S\d{1,2}\s*)?E?(\d{1,3}))?|(?<![\w.])(\d{1,2})\s*[x×]\s*(\d{1,3})(?!\d)|\bSeason\s*(\d{1,2})[\s,:-]*(?:Episodes?|Eps?\.?)\s*(\d{1,3})(?:\s*(?:-|–|&|\+|,|and|und)\s*(\d{1,3}))?|\b(?:Episodes?|Ep\.?)\s*(\d{1,3})\b/gi;
function parseEpisodes(title){
 const t=String(title||''),matches=[...t.matchAll(EP_RE)],strong=matches.filter(m=>m[1]||m[4]||m[6]),use=strong.length?strong:matches.filter(m=>m[9]).slice(0,1);
 if(!use.length)return null;
 const eps=[];
 for(const m of use){
  if(m[1]){const s=+m[1],e=+m[2];eps.push({s,e});if(m[3]&&+m[3]>e&&+m[3]-e<=5)for(let x=e+1;x<=+m[3];x++)eps.push({s,e:x})}
  else if(m[4])eps.push({s:+m[4],e:+m[5]});
  else if(m[6]){const s=+m[6],e=+m[7];eps.push({s,e});if(m[8]&&+m[8]>e&&+m[8]-e<=5)for(let x=e+1;x<=+m[8];x++)eps.push({s,e:x})}
  else eps.push({s:1,e:+m[9],noSeason:true});
 }
 let name=t.slice(0,use[0].index);
 for(let i=0;i<4;i++)name=name.replace(/[\s\-–—:|·,#(\[]+$/,'').replace(/\b(?:full\s+)?(?:reactions?|reacts?|season|staffel)$/i,'');
 name=name.trim();
 return name.length>1?{name,eps:eps.filter(x=>x.e>0)}:null;
}
const epNum=ep=>ep.s*1000+ep.e,epCode=ep=>ep.noSeason?`Folge ${ep.e}`:`${ep.s}×${ep.e}`,seriesNorm=n=>n.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'');
const escHtml=v=>String(v).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
// Every post of this creator the script knows: your collection, the creator feed and the series searches.
function creatorPosts(service,creatorId){
 const base=service+'/'+creatorId+'/',out=new Map(),add=(id,title)=>{if(typeof id==='string'&&id.startsWith(base)&&typeof title==='string'&&title&&!out.has(id))out.set(id,title)};
 for(const k of GM_listValues()){
  if(k.startsWith(M+base))add(k.slice(M.length),GM_getValue(k,{})?.title);
  else if(k==='paw-feed-v1:'+service+'/'+creatorId||k.startsWith('paw-search-v1:'+service+'/'+creatorId+'|'))for(const p of GM_getValue(k,{})?.posts||[])add(p?.id,p?.title);
 }
 return out;
}
let navCache={k:'',at:0,info:null};
// Previous and next episode of the same series for post k (cached for 15 s, scans run often).
function episodeInfo(k){
 if(navCache.k===k&&Date.now()-navCache.at<15000)return navCache.info;
 const [service,creatorId]=k.split('/'),title=GM_getValue(M+k,{}).title||document.querySelector('.post__title,h1')?.textContent||'';
 const cur=parseEpisodes(title.trim().replace(/\s+/g,' '));let info=null;
 if(cur&&cur.eps.length){
  const norm=seriesNorm(cur.name),nums=cur.eps.map(epNum),first=Math.min(...nums),lastNum=Math.max(...nums);let prev=null,next=null;
  for(const [id,t] of creatorPosts(service,creatorId)){
   if(id===k)continue;const p=parseEpisodes(t);if(!p||!p.eps.length||seriesNorm(p.name)!==norm)continue;
   const n=p.eps.map(epNum),lo=Math.min(...n),hi=Math.max(...n);
   if(lo>lastNum&&(!next||lo<next.lo))next={id,lo,eps:p.eps};
   if(hi<first&&(!prev||hi>prev.hi))prev={id,hi,eps:p.eps};
  }
  const lastEp=cur.eps.reduce((a,b)=>epNum(b)>epNum(a)?b:a);
  info={name:cur.name,service,creatorId,prev,next,want:{...lastEp,e:lastEp.e+1}};
 }
 navCache={k,at:Date.now(),info};return info;
}
const postUrl=(info,x)=>`https://pawchive.pw/${info.service}/user/${info.creatorId}/post/${x.id.split('/')[2]}`;
const navCss=`:host{all:initial;display:block;margin:14px 0!important;color-scheme:dark}
*{box-sizing:border-box}
.nav{display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;padding:10px 14px;background:#16161a;border:1px solid #ffffff1f;border-radius:14px;font:14px/1.4 Inter,"Segoe UI",system-ui,sans-serif;color:#f4f4f6}
.brand{font-weight:800;font-size:15px;letter-spacing:-.03em}.brand b{color:var(--seen)}
.series{flex:1 1 140px;min-width:0;font-weight:650;color:#a3a3ad;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:9px;border:1px solid #ffffff26;color:#f4f4f6;text-decoration:none;font-weight:650;font-size:13px;white-space:nowrap}
.btn:hover{background:#ffffff12}
.btn.next{background:var(--seen);border-color:transparent;color:#06210f}.btn.next:hover{filter:brightness(1.08)}
.btn.missing{color:#a3a3ad;border-style:dashed}
.keys{flex-basis:100%;font-size:12px;color:#71717b}
kbd{font:600 11px ui-monospace,Consolas,monospace;padding:1px 5px;border-radius:4px;border:1px solid #ffffff2e;color:#d4d4d8}
:focus-visible{outline:2px solid var(--seen);outline-offset:2px}`;
// Bar between the post header and its content: series name, previous / next episode, shortcut hint.
function episodeNav(k){
 let host=document.getElementById('paw-epnav-host');
 const anchor=document.querySelector('.post__header'),info=k&&anchor?episodeInfo(k):null;
 if(!info){host?.remove();return}
 const signature=JSON.stringify([k,info.prev?.id,info.next?.id]);
 if(host&&host.isConnected&&host.previousElementSibling===anchor&&host.dataset.sig===signature)return;
 if(!host){
  host=document.createElement('div');host.id='paw-epnav-host';host.attachShadow({mode:'open'});
  // Like the creator bar: inline !important survives Pawchive's margin reset on section children.
  for(const [p,v] of [['display','block'],['margin','14px 0'],['float','none'],['clear','both']])host.style.setProperty(p,v,'important');
 }
 if(host.previousElementSibling!==anchor)anchor.after(host);
 host.dataset.sig=signature;host.style.setProperty('--seen',getComputedStyle(document.documentElement).getPropertyValue('--paw-seen-color')||'#5ee08f');
 const codes=x=>escHtml(x.eps.map(epCode).join(' & ')),search=`https://pawchive.pw/${info.service}/user/${info.creatorId}?q=${encodeURIComponent(info.name)}`;
 host.shadowRoot.innerHTML=`<style>${navCss}</style><nav class="nav" aria-label="Folgen dieser Serie"><span class="brand">seen<b>.</b></span><span class="series" title="${escHtml(info.name)}">${escHtml(info.name)}</span>
${info.prev?`<a class="btn" href="${postUrl(info,info.prev)}" title="Vorherige Folge">◀ ${codes(info.prev)}</a>`:''}
${info.next?`<a class="btn next" href="${postUrl(info,info.next)}" title="Nächste Folge (Taste N)">Nächste Folge: ${codes(info.next)} ▶</a>`:`<a class="btn missing" href="${search}" title="Auf Pawchive nach der Serie suchen">${escHtml(epCode(info.want))} noch nicht gefunden · Suchen</a>`}
<span class="keys"><kbd>N</kbd> nächste Folge · <kbd>G</kbd> als gesehen markieren</span></nav>`;
}
// Shortcuts on post pages: N opens the next episode, G toggles "gesehen". Ignored while typing.
addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
 const target=e.composedPath()[0];if(target&&(target.isContentEditable||/^(?:input|textarea|select)$/i.test(target.tagName||'')))return;
 const k=key(location.href),ch=e.key.toLowerCase();if(!k||(ch!=='n'&&ch!=='g'))return;
 if(ch==='n'){const info=episodeInfo(k);if(info?.next){e.preventDefault();location.assign(postUrl(info,info.next))}}
 else{const b=document.getElementById('paw-seen-detail');if(b){e.preventDefault();b.click()}}
});

const css=`.paw-seen-tile{--paw-card-radius:10px;position:relative!important;border-radius:var(--paw-card-radius)!important;overflow:hidden!important}
.paw-seen-tile:has(>.image-link){--paw-frame-outset:2px;--paw-frame-width:4px;overflow:visible!important}
.paw-seen-tile>.image-link{border-radius:inherit!important}
.paw-card-ui{position:absolute!important;inset:0!important;z-index:110!important;pointer-events:none!important;border-radius:inherit!important;font:600 11px/1 Inter,"Segoe UI",system-ui,sans-serif!important}
/* Follow Pawchive's 5px lift on hover so the frame and buttons stay on the card. */
.paw-seen-tile.post-card:has(>.image-link)>.paw-card-ui{height:100%!important;bottom:auto!important;transition:top .1s ease!important}
.paw-seen-tile.post-card:has(>.image-link):is(:hover,:has(>.image-link:is(:active,:focus)))>.paw-card-ui{top:-5px!important}
.paw-pill{position:absolute!important;left:8px!important;top:50%!important;transform:translateY(-50%)!important;display:none!important;align-items:center!important;gap:4px!important;padding:5px 9px 5px 7px!important;border-radius:99px!important;background:#000000c2!important;color:var(--paw-seen-color,#5ee08f)!important;letter-spacing:.02em!important;box-shadow:0 2px 10px #0009!important;-webkit-backdrop-filter:blur(6px)!important;backdrop-filter:blur(6px)!important}
.paw-is-seen>.paw-card-ui>.paw-pill,.paw-is-saved>.paw-card-ui>.paw-pill{display:inline-flex!important}
.paw-is-saved:not(.paw-is-seen)>.paw-card-ui>.paw-pill{color:var(--paw-saved-color,#fbbf24)!important}
.paw-pill svg{display:block!important;flex:none!important}
.paw-actions{position:absolute!important;right:8px!important;top:50%!important;transform:translateY(-50%)!important;display:flex!important;flex-direction:column!important;gap:6px!important;opacity:0!important;transition:opacity .18s ease!important}
.paw-seen-tile:is(:hover,:focus-within)>.paw-card-ui>.paw-actions{opacity:1!important}
@media(hover:none){.paw-actions{opacity:1!important}}
.paw-act{all:initial!important;box-sizing:border-box!important;pointer-events:auto!important;cursor:pointer!important;width:32px!important;height:32px!important;display:grid!important;place-items:center!important;border-radius:50%!important;background:#000000c8!important;border:1px solid #ffffff40!important;color:#fff!important;box-shadow:0 2px 10px #000a!important;-webkit-backdrop-filter:blur(6px)!important;backdrop-filter:blur(6px)!important;transition:transform .15s ease,background .15s,border-color .15s!important}
.paw-act:hover{transform:scale(1.08)!important;background:#111!important;border-color:#ffffff8c!important}
.paw-act svg{display:block!important;pointer-events:none!important}
.paw-act-seen[aria-pressed=true]{color:var(--paw-seen-color,#5ee08f)!important;border-color:var(--paw-seen-color,#5ee08f)!important}
.paw-act-saved[aria-pressed=true]{color:var(--paw-saved-color,#fbbf24)!important;border-color:var(--paw-saved-color,#fbbf24)!important}
.paw-act-saved[aria-pressed=true] svg{fill:currentColor!important}
.paw-act:focus-visible{outline:2px solid var(--paw-seen-color,#5ee08f)!important;outline-offset:2px!important}
html[data-paw-dim] .paw-seen-tile.paw-is-seen>a{opacity:.35!important;filter:grayscale(.7)!important;transition:opacity .2s,filter .2s!important}
html[data-paw-dim] .paw-seen-tile.paw-is-seen:is(:hover,:focus-within)>a{opacity:1!important;filter:none!important}
html[data-paw-filter=unseen] .card-list .paw-seen-tile.paw-is-seen,html[data-paw-filter=seen] .card-list .paw-seen-tile:not(.paw-is-seen){display:none!important}
@media(prefers-reduced-motion:reduce){.paw-card-ui,.paw-actions,.paw-act{transition:none!important}}`;

function scan(){
 busy=true;obs.disconnect();
 try{
  refreshFrameSettings();
  let st=document.getElementById('paw-v2-style');if(!st){st=document.createElement('style');st.id='paw-v2-style';document.head.append(st)}if(st.textContent!==css)st.textContent=css;
  const done=new Set();
  for(const a of document.querySelectorAll('a[href*="/post/"]')){
   if(a.closest('nav,header,footer,.post__content,.comment'))continue;
   const k=key(a.href);if(!k)continue;
   const tile=a.closest('.post-card,article')||a.parentElement;
   if(!tile||tile.matches('a,body,main,section')||done.has(tile))continue;
   const ks=new Set([...tile.querySelectorAll('a[href*="/post/"]')].map(x=>key(x.href)).filter(Boolean));if(ks.size!==1)continue;
   done.add(tile);decorate(tile,k);
  }
  const current=key(location.href);if(current)detailButton(current);else document.getElementById('paw-seen-detail')?.remove();
  episodeNav(current);
  renderBar();
 }finally{busy=false;obs.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['href','src','srcset','data-src','data-original','data-srcset','data-lazy-src','data-background','data-bg','poster']})}
}
GM_registerMenuCommand('Gesehene auf Creator-Seiten abdunkeln (an/aus)',()=>{GM_setValue(UI_KEY,{...readUi(),dim:!readUi().dim});barSignature='';schedule()});
function schedule(){if(busy||timer)return;timer=setTimeout(()=>{timer=null;scan()},120)}
const obs=new MutationObserver(schedule);
let last=location.href,navigationTimers=[];
function cancelNavigationWork(){if(timer)clearTimeout(timer);timer=null;for(const id of navigationTimers)clearTimeout(id);navigationTimers=[]}
function recoverNavigation(event){
 cancelNavigationWork();last=location.href;barSignature='';
 // Back/forward can restore a stale bar from the browser's page cache; rebuild it from scratch.
 if(event?.type==='popstate'||(event?.type==='pageshow'&&event.persisted))document.getElementById('paw-bar-host')?.remove();
 refreshFrameSettings();schedule();
 // Cached history and partial navigation can restore or replace content later.
 navigationTimers=[setTimeout(schedule,250),setTimeout(schedule,900)];
}
window.addEventListener('pagehide',cancelNavigationWork);
window.addEventListener('pageshow',recoverNavigation);
window.addEventListener('popstate',recoverNavigation);
window.addEventListener('hashchange',recoverNavigation);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)recoverNavigation()});
if(document.fonts)document.fonts.ready.then(schedule);
setInterval(()=>{
 if(last!==location.href)recoverNavigation();
 else if(!document.hidden&&(!document.getElementById('paw-v2-style')||!document.getElementById('paw-frame-design-style')||(creatorRoute()&&!document.getElementById('paw-bar-host')?.shadowRoot?.querySelector('.bar'))))schedule();
},600);
// Storage can change from other tabs or the dashboard; refresh card states and fill in late-loading thumbnails.
let signature='';
setInterval(()=>{const next=JSON.stringify(snapshot());if(next!==signature){signature=next;barSignature='';schedule()}else if(!document.hidden){for(const tile of document.querySelectorAll('.paw-seen-tile')){const k=tile.dataset.pawKey;if(k){const value=meta(k,tile,false);if(JSON.stringify(value)!==JSON.stringify(GM_getValue(M+k,{})))GM_setValue(M+k,value)}}}},2000);
scan();})();
