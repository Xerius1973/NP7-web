/* NP7 V16 — voice input, photo meal recognition UI, theme/language/unit settings, PWA helpers */
(function(){
  'use strict';
  const KEY='np7SettingsV16';
  const defaults={theme:'dark',lang:'fr',unit:'kg'};
  let settings=Object.assign({},defaults,JSON.parse(localStorage.getItem(KEY)||'{}'));
  const save=()=>localStorage.setItem(KEY,JSON.stringify(settings));
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));

  function applyTheme(){
    document.documentElement.dataset.np7Theme=settings.theme;
    if(settings.theme==='light') document.documentElement.style.setProperty('--np7-bg','#f4f7fb');
    else document.documentElement.style.setProperty('--np7-bg','#071426');
  }
  function speechSupported(){return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;}
  function findMealInput(){
    return $$('textarea,input').find(el=>{
      const s=((el.placeholder||'')+' '+(el.getAttribute('aria-label')||'')+' '+(el.id||'')).toLowerCase();
      return /repas|manger|aliment|décrire|decrire/.test(s);
    }) || $('textarea');
  }
  function startVoice(input,button){
    if(!speechSupported()){toast('La saisie vocale n’est pas disponible sur ce navigateur.');return;}
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    const rec=new SR(); rec.lang=settings.lang==='en'?'en-US':settings.lang==='es'?'es-ES':'fr-FR'; rec.interimResults=false; rec.continuous=false;
    button.classList.add('np7-listening'); button.textContent='🎙️ Écoute…';
    rec.onresult=e=>{const text=e.results[0][0].transcript; input.value=(input.value?input.value+' ':'')+text; input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true}));};
    rec.onerror=()=>toast('Je n’ai pas réussi à comprendre la dictée.');
    rec.onend=()=>{button.classList.remove('np7-listening');button.textContent='🎙️ Dicter';};
    rec.start();
  }
  function toast(msg){
    let t=$('#np7V16Toast'); if(!t){t=document.createElement('div');t.id='np7V16Toast';t.style.cssText='position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:10001;background:#10223a;color:#fff;padding:11px 15px;border-radius:13px;box-shadow:0 8px 30px rgba(0,0,0,.3);font-size:13px;max-width:90%;text-align:center';document.body.appendChild(t)}
    t.textContent=msg;t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',2600);
  }
  function injectVoice(){
    const input=findMealInput(); if(!input || $('#np7VoiceBtn')) return;
    const b=document.createElement('button');b.id='np7VoiceBtn';b.type='button';b.className='btn ghost';b.textContent='🎙️ Dicter';b.style.cssText+='margin-left:6px;';
    b.onclick=()=>startVoice(input,b);
    input.insertAdjacentElement('afterend',b);
  }

  function injectPhoto(){
    if($('#np7PhotoCard')) return;
    const meals=$('#meals')||document.body;
    const card=document.createElement('div');card.id='np7PhotoCard';card.className='card';
    card.innerHTML='<h3>📸 Reconnaître un plat par photo</h3><p class="small">Prends une photo de ton repas et NP7 pourra identifier les aliments et estimer les calories. Cette fonction sera réservée au Premium.</p><input id="np7PhotoInput" type="file" accept="image/*" capture="environment" style="display:none"><button id="np7PhotoBtn" class="btn yellow" type="button">📸 Analyser mon repas</button><div id="np7PhotoPreview" style="margin-top:10px"></div>';
    const target=meals.querySelector('.card:nth-child(2)')||meals.firstElementChild; target?target.insertAdjacentElement('beforebegin',card):meals.appendChild(card);
    $('#np7PhotoBtn',card).onclick=()=>$('#np7PhotoInput',card).click();
    $('#np7PhotoInput',card).onchange=e=>{
      const f=e.target.files&&e.target.files[0]; if(!f)return;
      const url=URL.createObjectURL(f);$('#np7PhotoPreview',card).innerHTML='<img src="'+url+'" alt="Repas à analyser" style="max-width:100%;max-height:220px;border-radius:16px;display:block;margin-bottom:8px"><p class="small">📸 Photo prête. L’analyse par vision sera activée avec le backend Premium.</p><button class="btn primary" type="button" id="np7PhotoAnalyze">Analyser</button>';
      $('#np7PhotoAnalyze',card).onclick=()=>toast('Analyse vision Premium : backend/API à connecter.');
    };
  }

  function injectSettings(){
    if($('#np7V16Settings')) return;
    const anchor=$('#account')||document.body; const card=document.createElement('div');card.id='np7V16Settings';card.className='card';
    card.innerHTML='<h3>⚙️ Préférences</h3><div class="form"><div class="field"><label>Thème</label><select id="np7Theme"><option value="dark">Sombre</option><option value="light">Clair</option></select></div><div class="field"><label>Langue</label><select id="np7Lang"><option value="fr">Français</option><option value="en">English</option><option value="es">Español</option></select></div><div class="field"><label>Poids</label><select id="np7Unit"><option value="kg">kg</option><option value="lb">lb</option></select></div></div><p class="small">Les préférences sont enregistrées sur cet appareil.</p>';
    anchor.appendChild(card);
    $('#np7Theme').value=settings.theme;$('#np7Lang').value=settings.lang;$('#np7Unit').value=settings.unit;
    $('#np7Theme').onchange=e=>{settings.theme=e.target.value;save();applyTheme()};
    $('#np7Lang').onchange=e=>{settings.lang=e.target.value;save();toast(e.target.value==='fr'?'Langue : français':e.target.value==='en'?'Language: English':'Idioma: español')};
    $('#np7Unit').onchange=e=>{settings.unit=e.target.value;save();toast('Unité de poids : '+e.target.value)};
  }

  function addPwaHelpers(){
    if('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
    const install=document.createElement('div');install.id='np7PwaHint';install.className='small';install.style.cssText='text-align:center;margin:12px 0';install.textContent='📱 Astuce : ajoute NP7 à l’écran d’accueil pour retrouver rapidement tes actions.';
    const home=$('#home'); if(home && !$('#np7PwaHint')) home.appendChild(install);
  }

  function boot(){
    applyTheme();
    setTimeout(()=>{injectVoice();injectPhoto();injectSettings();addPwaHelpers()},500);
    setTimeout(()=>{injectVoice();injectPhoto();injectSettings()},1800);
    const mo=new MutationObserver(()=>{injectVoice();}); mo.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
