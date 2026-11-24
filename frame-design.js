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
