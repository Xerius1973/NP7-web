/* NP7 — contrôleur d'interface v2. Ne contient aucune donnée nutritionnelle :
   il s'appuie sur la logique existante (S, foods(), save(), parse(), analyze(), workout()…). */
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const fmt=n=>Math.round(n).toLocaleString('fr-FR').replace(/\u202f/g,' ');
const fmt1=n=>(Math.round(n*10)/10).toLocaleString('fr-FR');
const esc2=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const SETTINGS_KEY='np7SettingsV16';
const settings=Object.assign({theme:'system',lang:'fr',unit:'kg'},(()=>{try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}catch(e){return{}}})());

/* ---------- thème ---------- */
const mq=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;
function applyTheme(){
  const t=settings.theme==='system'?(mq&&mq.matches?'dark':'light'):settings.theme;
  document.documentElement.dataset.theme=t;
  const m=$('meta[name=theme-color]');if(m)m.content=t==='dark'?'#07142b':'#0a2457';
  $$('#themeOpts .opt').forEach(b=>b.classList.toggle('on',b.dataset.theme===settings.theme));
}
if(mq&&mq.addEventListener)mq.addEventListener('change',applyTheme);
applyTheme();

/* ---------- navigation ---------- */
const TAB_OF={home:'home',calories:'home',meals:'meals',sport:'sport'};
const BACK_OF={calories:'home',weight:'np7MoreView',account:'weight'};
function go(id){
  if(id==='ai')id='meals';
  const t=document.getElementById(id);if(!t||!t.classList.contains('view'))return;
  $$('.view').forEach(v=>v.classList.remove('active'));
  t.classList.add('active');
  const tab=TAB_OF[id]||'np7MoreView';
  $$('#tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.tab===tab));
  if(id!=='meals')stopScan();
  window.scrollTo({top:0});
  if(id==='calories')drawCalories();
  if(id==='weight')drawWeight();
  if(id==='reference')paintReference();
  if(id==='settings')paintOffline();
}
window.view=go;window.showView=go;
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');if(g){e.preventDefault();go(g.dataset.go);return}
  const t=e.target.closest('#tabbar [data-tab]');if(t){go(t.dataset.tab)}
});
function stopScan(){try{if(typeof stopBarcodeScanner==='function')stopBarcodeScanner()}catch(e){}}

/* ---------- accueil : anneau, macros, liste ---------- */
function paintHome(){
  const t=totals(),p=S.p,burn=sport(),net=t.k-burn,rest=p.k-net,C=2*Math.PI*50;
  const frac=Math.max(0,Math.min(1,net/(p.k||1)));
  $('#ringArc').setAttribute('stroke-dasharray',(C*frac).toFixed(1)+' '+C.toFixed(1));
  $('#ringArc').style.visibility=net>0?'visible':'hidden';
  $('#ring').classList.toggle('over',rest<0);
  $('#ringMain').textContent=fmt(Math.abs(rest));
  $('#ringLabel').textContent=rest<0?'kcal en trop':'kcal restantes';
  $('#ringGoal').textContent='/ '+fmt(p.k)+' kcal';
  const b=$('#ringBonus');b.textContent=burn>0?'+ '+fmt(burn)+' kcal gagnées grâce au sport':'';b.hidden=!(burn>0);
  $('#sumIn').textContent=fmt(t.k);$('#sumOut').textContent=fmt(burn);$('#sumNet').textContent=fmt(net);
  [['mp',t.pr,p.pr],['mc',t.ca,p.ca],['ml',t.f,p.f]].forEach(([k,v,z])=>{
    $('#'+k+'V').textContent=fmt(v)+' g';$('#'+k+'T').textContent='/ '+fmt(z)+' g';
    $('#'+k+'B').style.width=Math.min(100,v/(z||1)*100)+'%';
  });
}
const EMO=[[/poulet|dinde|viande|boeuf|bœuf|steak|porc|jambon/i,'🍗'],[/poisson|saumon|thon|cabillaud|crevette|sardine/i,'🐟'],[/riz|pate|pâte|quinoa|semoule|boulgour/i,'🍚'],[/oeuf|œuf|omelette/i,'🥚'],[/pain|baguette|sandwich|croissant|biscotte/i,'🥖'],[/salade|laitue|tomate|concombre|carotte|brocoli|courgette|legume|légume|haricot/i,'🥗'],[/pomme|poire|orange|banane|fruit|fraise|avocat|raisin/i,'🍎'],[/yaourt|skyr|fromage|lait|creme|crème/i,'🥛'],[/burger|big mac|whopper|frites|pizza|tacos|kebab/i,'🍔'],[/chocolat|gateau|gâteau|biscuit|glace|bonbon/i,'🍫']];
const emo=n=>(EMO.find(([r])=>r.test(n))||[0,'🍽️'])[1];
window.renderFoods=function(id){
  const e=document.getElementById(id);if(!e)return;
  let a=foods();const home=id==='homeFoods';
  const idx=a.map((x,i)=>i);const show=home?idx.slice(-3).reverse():idx.slice().reverse();
  e.innerHTML=a.length?show.map(i=>{const x=a[i];return `<div class="food"><div class="thumb" aria-hidden="true">${emo(x.name)}</div><div><b>${esc(x.name)}</b><div class="meta">${Math.round(x.k)} kcal · ${(+x.pr||0).toFixed(0)} g P · ${(+x.ca||0).toFixed(0)} g G · ${(+x.f||0).toFixed(0)} g L</div></div><button class="icon" type="button" aria-label="Supprimer ${esc2(x.name)}" onclick="del(${i})">✕</button></div>`}).join(''):'<div class="empty">Rien d’ajouté aujourd’hui. Décris ton premier repas !</div>';
};
window.renderWorks=function(){
  const nm=k=>{const s=(window.NP7_SPORTS||[]).find(x=>x.key===k);return s?s.name:null};
  const e=document.getElementById('works');
  e.innerHTML=S.wo.length?S.wo.slice(0,20).map((x,i)=>`<div class="food"><div class="thumb" aria-hidden="true">🏃</div><div><b>${esc(x.name||nm(x.type)||'Séance')}</b><div class="meta">${x.date} · ${x.min||'–'} min · ${Math.round(x.k)} kcal brûlées</div></div><button class="icon" type="button" aria-label="Supprimer la séance" onclick="S.wo.splice(${i},1);save()">✕</button></div>`).join(''):'<div class="empty">Aucune séance enregistrée.</div>';
};
window.renderWeights=function(){
  const e=document.getElementById('wh');
  e.innerHTML=S.wh.length?S.wh.slice(0,8).map(x=>`<div class="food"><div><b>${x.w} kg</b><div class="meta">${x.date}</div></div></div>`).join(''):'<div class="empty">Aucune pesée.</div>';
};
window.renderHist=function(){
  const ds=[...new Set([...Object.keys(S.d),...S.wo.map(x=>x.date),...S.wh.map(x=>x.date)])].sort().reverse().slice(0,14);
  $('#hist').innerHTML=ds.length?ds.map(d=>{const k=(S.d[d]||[]).reduce((a,x)=>a+(+x.k||0),0),s=S.wo.filter(x=>x.date===d).reduce((a,x)=>a+x.k,0),w=S.wh.find(x=>x.date===d);const dl=new Date(d+'T12:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});return `<div class="food"><div><b>${dl.charAt(0).toUpperCase()+dl.slice(1)}</b><div class="meta">${Math.round(k)} kcal mangées · ${Math.round(s)} kcal sport${w?' · '+w.w+' kg':''}</div></div></div>`}).join(''):'<div class="empty">Ton historique apparaîtra ici.</div>';
};

/* ---------- graphiques (SVG) ---------- */
function drawCalories(){
  const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d.toISOString().slice(0,10))}
  const inn=days.map(d=>(S.d[d]||[]).reduce((a,x)=>a+(+x.k||0),0));
  const out=days.map(d=>S.wo.filter(x=>x.date===d).reduce((a,x)=>a+(+x.k||0),0));
  const max=Math.max(S.p.k,...inn,...out,500)*1.1,H=150,W=340,bw=16,step=W/7;
  const y=v=>H-(v/max)*H+10;
  let g=`<line x1="0" x2="${W}" y1="${y(S.p.k)}" y2="${y(S.p.k)}" stroke="var(--muted)" stroke-dasharray="4 4" stroke-width="1.2"/>`;
  days.forEach((d,i)=>{const x=i*step+step/2,lab=new Date(d+'T12:00').toLocaleDateString('fr-FR',{weekday:'short'}).replace('.','');
    g+=`<rect x="${x-bw-1}" y="${y(inn[i])}" width="${bw}" height="${Math.max(0,H+10-y(inn[i]))}" rx="5" fill="var(--blue)"/><rect x="${x+1}" y="${y(out[i])}" width="${bw}" height="${Math.max(0,H+10-y(out[i]))}" rx="5" fill="var(--yellow)"/><text x="${x}" y="182" text-anchor="middle" font-size="11" fill="var(--muted)">${lab}</text>`});
  $('#calChart').innerHTML=g;
  const logged=inn.filter(v=>v>0);
  $('#calAvg').textContent=logged.length?`Moyenne sur les jours renseignés : ${fmt(logged.reduce((a,b)=>a+b,0)/logged.length)} kcal mangées · objectif ${fmt(S.p.k)} kcal.`:'Ajoute des repas pour voir ton évolution sur 7 jours.';
}
function drawWeight(){
  const pts=S.wh.slice(0,30).reverse();const el=$('#wChart');
  if(pts.length<2){el.innerHTML='<text x="170" y="64" text-anchor="middle" font-size="13" fill="var(--muted)">Ajoute au moins deux pesées pour voir la courbe.</text>';return}
  const ws=pts.map(p=>p.w),mn=Math.min(...ws)-1,mx=Math.max(...ws)+1,W=340,H=100;
  const xy=pts.map((p,i)=>[8+i*(W-16)/(pts.length-1),10+(1-(p.w-mn)/(mx-mn))*H]);
  el.innerHTML=`<polyline fill="none" stroke="var(--blue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${xy.map(p=>p.join(',')).join(' ')}"/>`+xy.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="var(--yellow)" stroke="var(--blue)" stroke-width="1.5"/>`).join('')+`<text x="8" y="118" font-size="11" fill="var(--muted)">${ws[0]} kg</text><text x="332" y="118" text-anchor="end" font-size="11" fill="var(--muted)">${ws[ws.length-1]} kg</text>`;
}
function paintReference(){$('#rfK').textContent=fmt(S.p.k);$('#rfP').textContent=fmt(S.p.pr);$('#rfC').textContent=fmt(S.p.ca);$('#rfF').textContent=fmt(S.p.f)}

/* ---------- eau (même stockage qu'avant : np7_water_tracker_v1) ---------- */
const WKEY='np7_water_tracker_v1',wday=()=>new Date().toLocaleDateString('sv-SE');
const wread=()=>{try{return JSON.parse(localStorage.getItem(WKEY)||'{}')}catch(e){return{}}};
function wget(){const x=wread(),d=wday();x[d]=x[d]||{taken:0,goal:2500,history:[]};x[d].taken=Math.max(0,+x[d].taken||0);x[d].goal=+x[d].goal||2500;x[d].history=Array.isArray(x[d].history)?x[d].history:[];return[x,x[d]]}
function paintWater(){
  const[,e]=wget(),pct=Math.min(100,Math.round(e.taken/e.goal*100));
  $('#np7BottleLitres').textContent=(e.taken/1000).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})+' L';
  $('#np7WaterGoal').textContent=e.goal+' ml';$('#np7WaterPercent').textContent=pct+' %';$('#np7WaterBar').style.width=pct+'%';
  const h=90*pct/100,l=$('#np7BottleLiquid');l.setAttribute('y',String(98-h));l.setAttribute('height',String(h));
}
function water(delta){
  const[x,e]=wget();
  if(delta<0&&e.taken<250)return;
  e.taken=Math.max(0,e.taken+delta);delta>0?e.history.push(delta):e.history.pop();
  try{localStorage.setItem(WKEY,JSON.stringify(x))}catch(err){}
  paintWater();const b=$('#waterCard .bottle');b.classList.remove('pop');void b.getBoundingClientRect();b.classList.add('pop');
}
$('#waterPlus').onclick=()=>water(250);$('#waterMinus').onclick=()=>water(-250);

/* ---------- salutation / avatar ---------- */
const PKEY='NP7_ACCOUNT_PROFILE';
function profile(){try{return JSON.parse(localStorage.getItem(PKEY)||'{}')}catch(e){return{}}}
function paintName(){
  const n=(profile().firstName||'').trim(),nm=n?n.charAt(0).toLocaleUpperCase('fr-FR')+n.slice(1):'';
  const g=$('#np7Greeting');if(g&&!/@/.test(g.textContent)&&nm)g.textContent='Bonjour '+nm;
  const ini=(nm||'N').charAt(0);$('#avatar').textContent=ini;$('#avatar2').textContent=ini;
  const fi=$('#firstName');if(fi&&document.activeElement!==fi)fi.value=nm;
}
$('#firstName').addEventListener('input',e=>{const p=profile();p.firstName=e.target.value.trim();try{localStorage.setItem(PKEY,JSON.stringify(p))}catch(err){}const g=$('#np7Greeting');g.textContent=p.firstName?'Bonjour '+p.firstName:'Bonjour';$('#avatar').textContent=$('#avatar2').textContent=(p.firstName||'N').charAt(0).toLocaleUpperCase('fr-FR')});

/* ---------- Repas : modes, suggestions, résultat ---------- */
const CHIPS=[['Poulet + riz','150 g de poulet et 150 g de riz'],['Pâtes bolognaise','200 g de pâtes et 150 g de boeuf'],['Sandwich','80 g de pain et 60 g de jambon et 20 g de fromage'],['Salade','150 g de salade et 100 g de poulet et 10 g d’huile d’olive'],['Omelette','3 oeufs'],['Smoothie','200 g de banane et 150 g de yaourt']];
$('#chips').innerHTML=CHIPS.map(c=>`<button class="chip" type="button" data-t="${esc2(c[1])}">${c[0]}</button>`).join('');
$('#chips').addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;const a=$('#aii');a.value=c.dataset.t;a.focus()});
function setMode(m){
  $$('.modes button').forEach(b=>b.classList.toggle('on',b.dataset.mode===(m==='voice'?'text':m)));
  $('#paneText').hidden=m==='photo';$('#panePhoto').hidden=m!=='photo';
}
$('.modes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const m=b.dataset.mode;if(m==='voice'){setMode('text');openVoice('meal')}else setMode(m)});
document.addEventListener('click',e=>{const a=e.target.closest('[data-act]');if(!a)return;
  if(a.dataset.act==='describe'){go('meals');setMode('text');setTimeout(()=>$('#aii').focus(),50)}
  if(a.dataset.act==='photo'){go('meals');setMode('photo')}});
$('#scanBtn').onclick=()=>openBarcodeScanner();
window.goAIWithNutrition=function(){go('meals');setMode('text');setTimeout(()=>$('#aii').focus(),50)};

/* résultat détaillé après analyse (carte « Ingrédients détectés ») */
const prevAnalyze=window.analyze;
window.analyze=async function(){
  const input=$('#aii'),text=input.value.trim(),before=foods().length;
  const res=$('#mealResult');
  if(!text)return toast('Décris ton repas pour continuer');
  $('#chat').innerHTML='';
  try{if(typeof CIQUAL!=='undefined'&&!CIQUAL.length&&typeof loadCiqual==='function')await loadCiqual()}catch(e){}
  await prevAnalyze();
  const added=foods().slice(before);
  if(!added.length){res.hidden=true;return}
  $('#chat').innerHTML='';
  const T=added.reduce((a,x)=>({k:a.k+x.k,pr:a.pr+x.pr,ca:a.ca+x.ca,f:a.f+x.f}),{k:0,pr:0,ca:0,f:0});
  const h=new Date().getHours(),slot=h<11?'Petit-déjeuner':h<15?'Déjeuner':h<18?'Collation':'Dîner';
  const hh=String(h).padStart(2,'0')+':'+String(new Date().getMinutes()).padStart(2,'0');
  const cols=['#e5484d','#f5a524','#1fa968','#4a93ff','#9b6bff','#14b8a6'];
  const title=added.map(x=>x.name.split(' — ').pop().replace(/ cuits?| cuite?s?/i,'')).slice(0,3).join(' · ');
  const miss=(window.__np7Unmatched||[]).filter(Boolean),est=(window.__np7Est||[]).filter(Boolean);
  res.dataset.before=before;res.dataset.count=added.length;res.dataset.text=text;
  res.innerHTML=`<div class="row"><div><h3>${esc(title)}</h3><div class="small">${slot} · ${hh}</div></div><span class="pill est">Estimation</span></div>
    <div class="kc">${fmt(T.k)} <span class="small">kcal</span></div>
    <div class="macros" style="margin:10px 0"><div class="mtile p"><div class="n">Protéines</div><div class="v">${fmt(T.pr)} g</div></div><div class="mtile c"><div class="n">Glucides</div><div class="v">${fmt(T.ca)} g</div></div><div class="mtile l"><div class="n">Lipides</div><div class="v">${fmt(T.f)} g</div></div></div>
    <div class="note"><svg class="i"><use href="#i-info"/></svg><div>Estimation basée sur une base de données nutritionnelle.<br>Fourchette possible : <b>${fmt(T.k*.85)} – ${fmt(T.k*1.15)} kcal</b></div></div>
    ${miss.length?`<div class="note" style="margin-top:10px;background:var(--carb-bg)"><svg class="i"><use href="#i-info"/></svg><div>Non reconnu, donc non compté : <b>${esc2(miss.join(', '))}</b>. Essaie un autre nom, ou ajoute-le dans « Mes aliments personnalisés ».</div></div>`:''}
    ${est.length?`<div class="note" style="margin-top:10px"><svg class="i"><use href="#i-info"/></svg><div>Poids estimé (pièce, cuillère ou portion standard) pour : <b>${esc2(est.join(', '))}</b>. Touche « Modifier » pour préciser les grammes.</div></div>`:''}
    <div class="label" style="margin:14px 0 4px">Ingrédients détectés</div>
    ${added.map((x,i)=>`<div class="ing"><span class="d" style="background:${cols[i%cols.length]}"></span>${esc(x.name)}<b>${Math.round(x.q)} g</b></div>`).join('')}
    <div class="row wrap" style="margin-top:14px"><button class="btn block" type="button" id="editMeal">Modifier</button></div>
    <p class="small" style="margin:8px 0 0">Ajouté à ta journée. « Modifier » annule cet ajout et te laisse corriger le texte.</p>`;
  res.hidden=false;res.scrollIntoView({behavior:'smooth',block:'nearest'});
};
$('#analyzeBtn').onclick=()=>window.analyze();
$('#mealResult').addEventListener('click',e=>{
  if(!e.target.closest('#editMeal'))return;
  const r=$('#mealResult'),b=+r.dataset.before,c=+r.dataset.count;
  foods().splice(b,c);save();$('#aii').value=r.dataset.text||'';r.hidden=true;$('#aii').focus();toast('Ajout annulé : corrige ton texte');
});
$('#aii').addEventListener('input',()=>{$('#mealResult').hidden=true});

/* photo (aperçu seulement : l'analyse d'image arrive avec Premium) */
function preview(f){if(!f)return;const u=URL.createObjectURL(f);$('#photoDrop').innerHTML=`<img alt="Aperçu du repas" src="${u}"><p class="small" style="margin:8px 0 0">Analyse de la photo : bientôt disponible avec Premium. Décris le repas en texte pour l’ajouter dès maintenant.</p>`}
$('#photoFile').onchange=e=>preview(e.target.files[0]);$('#photoCam').onchange=e=>preview(e.target.files[0]);

/* ---------- voix ---------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null,vTarget='meal',vDone=false,vLast='';
function openVoice(target){
  vTarget=target||'meal';
  if(!SR){toast('La dictée n’est pas disponible sur ce navigateur (essaie Chrome ou Safari). Écris ton message à la place.');return}
  $('#voiceHint').innerHTML=vTarget==='sport'?'Dites par exemple :<br><b style="color:#fff">« j’ai couru quarante minutes »</b>':'Dites par exemple :<br><b style="color:#fff">« deux œufs, cent cinquante grammes de riz et du poulet »</b>';
  $('#voice').hidden=false;$('#voiceText').textContent='';startRec();
}
function finishVoice(t){
  if(vDone)return;vDone=true;t=(t||'').trim();closeVoice();if(!t)return;
  if(vTarget==='sport'){const a=$('#sportAi');a.value=t;if(typeof analyzeSportAI==='function')analyzeSportAI()}
  else{const a=$('#aii');a.value=a.value.trim()?a.value.trim()+' et '+t:t;go('meals');setMode('text');window.analyze()}
}
function startRec(){
  try{vDone=false;vLast='';rec=new SR();rec.lang='fr-FR';rec.interimResults=true;rec.continuous=false;rec.maxAlternatives=1;
    $('#voice').classList.add('live');$('#voiceTitle').textContent='Écoute en cours…';
    rec.onresult=e=>{let t='',fin=false;for(const r of e.results){t+=r[0].transcript;if(r.isFinal)fin=true}vLast=t;$('#voiceText').textContent=t;if(fin)finishVoice(t)};
    rec.onerror=ev=>{$('#voice').classList.remove('live');const m={'not-allowed':'Micro refusé : autorise-le dans le navigateur','service-not-allowed':'Micro refusé : autorise-le dans le navigateur','no-speech':'Je n’ai rien entendu, réessaie','network':'Connexion requise pour la dictée','audio-capture':'Aucun micro détecté'};$('#voiceTitle').textContent=m[ev.error]||'Je n’ai pas compris, réessaie'};
    rec.onend=()=>{$('#voice').classList.remove('live');if(!vDone&&vLast)finishVoice(vLast)};
    rec.start();
  }catch(e){toast('Impossible de démarrer la dictée')}
}
function closeVoice(){try{rec&&rec.stop()}catch(e){}$('#voice').classList.remove('live');$('#voice').hidden=true}
$('#voiceClose').onclick=()=>{vDone=true;closeVoice()};$('#micInline').onclick=()=>openVoice('meal');$('#micSport').onclick=()=>openVoice('sport');
$('#voiceMic').onclick=()=>{$('#voice').classList.contains('live')?(()=>{try{rec.stop()}catch(e){}})():startRec()};

/* ---------- Sport ---------- */
const SP=window.NP7_SPORTS||[];
const ICONS={muscu:'dumb',running:'run',cycling:'bike',swimming:'swim',football:'ball',basketball:'hoop',walking:'walk'};
const FEATURED=['muscu','running','cycling','swimming','football','basketball','walking'];
$('#st').innerHTML=SP.map(s=>`<option value="${s.key}">${s.name}</option>`).join('');
let showAll=false;
function spLabel(k){const s=SP.find(x=>x.key===k);return s?s.name:k}
function paintActs(){
  const st=$('#st'),cur=st.value,q=window.np7Prep?np7Prep($('#actSearch').value):'';
  const grid=$('#acts'),list=$('#allActs');
  grid.innerHTML=FEATURED.map(k=>`<button type="button" class="act${k===cur?' on':''}" data-k="${k}" aria-pressed="${k===cur}"><span class="c"><svg class="i"><use href="#i-${ICONS[k]}"/></svg></span>${spLabel(k).split(' ')[0]}</button>`).join('')+`<button type="button" class="act${showAll?' on':''}" data-k="__other"><span class="c"><svg class="i"><use href="#i-dots"/></svg></span>Autre</button>`;
  grid.hidden=!!q;
  const items=SP.filter(s=>!q||np7Prep(s.name).includes(q)||s.aliases.some(a=>a.includes(q))).sort((a,b)=>a.name.localeCompare(b.name,'fr'));
  list.hidden=!(q||showAll);
  list.innerHTML=items.length?items.map(s=>`<button type="button" class="chip${s.key===cur?' on':''}" data-k="${s.key}">${s.name}</button>`).join(''):'<p class="small" style="margin:0">Aucune activité trouvée. Utilise l’onglet « Manuel » pour saisir toi-même les calories.</p>';
  $('#selSport').innerHTML='Activité choisie : <b>'+spLabel(cur)+'</b>';
}
function pickSport(k){$('#st').value=k;showAll=false;$('#actSearch').value='';paintActs();estimate()}
$('#acts').addEventListener('click',e=>{const b=e.target.closest('.act');if(!b)return;const k=b.dataset.k;if(k==='__other'){showAll=!showAll;paintActs();return}pickSport(k)});
$('#allActs').addEventListener('click',e=>{const b=e.target.closest('.chip');if(b)pickSport(b.dataset.k)});
$('#actSearch').addEventListener('input',paintActs);
function estimate(){const met=(MET[$('#st').value]||5)*(+$('#si').value||1),min=+$('#sm').value||0;$('#metEst').textContent='≈ '+fmt(met*3.5*S.p.w/200*min)+' kcal brûlées'}
$('#si').addEventListener('change',estimate);$('#sm').addEventListener('input',estimate);
$('#smMinus').onclick=()=>{$('#sm').value=Math.max(5,(+$('#sm').value||0)-5);estimate()};
$('#smPlus').onclick=()=>{$('#sm').value=(+$('#sm').value||0)+5;estimate()};
function sportTab(m){$$('#sportSeg button').forEach(b=>b.classList.toggle('on',b.dataset.sp===m));$('#sportPick').hidden=m!=='pick';$('#sportManual').hidden=m!=='manual'}
$('#sportSeg').addEventListener('click',e=>{const b=e.target.closest('button');if(b)sportTab(b.dataset.sp)});
$('#toManual').addEventListener('click',e=>{e.preventDefault();sportTab('manual')});
$('#mAdd').onclick=()=>{const name=$('#mName').value.trim()||'Séance',min=+$('#mMin').value||0,k=+$('#mKcal').value||0;if(k<=0)return toast('Indique les calories brûlées');S.wo.unshift({date:today(),type:'manual',name,min,k:Math.round(k),source:'manuel'});save();$('#mName').value=$('#mMin').value=$('#mKcal').value='';toast('Séance ajoutée')};
const prevWorkout=window.workout;window.workout=function(){const n=S.wo.length;prevWorkout();if(S.wo.length>n)go('home')};

/* ---------- Paramètres ---------- */
$('#themeOpts').addEventListener('click',e=>{const b=e.target.closest('.opt');if(!b)return;settings.theme=b.dataset.theme;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch(err){}applyTheme()});
function paintOffline(){
  const on=!!(navigator.serviceWorker&&navigator.serviceWorker.controller);
  $('#offTitle').textContent=on?'Mode hors ligne activé':'Hors ligne : en cours d’activation';
  $('#np7CiqualCacheStatus').textContent=on?'L’application et la base Ciqual fonctionnent sans connexion.':'Recharge l’application une fois en ligne pour activer le mode hors ligne.';
}
$('#exportBtn').onclick=()=>{
  const data={app:'NP7',version:2,exported:new Date().toISOString(),state:S,water:wread(),profile:profile()};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,1)],{type:'application/json'}));a.download='np7-sauvegarde-'+today()+'.json';a.click();
};
$('#importFile').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{const d=JSON.parse(await f.text());if(d.app!=='NP7'||!d.state||!d.state.p)throw 0;
    if(!confirm('Remplacer les données actuelles par cette sauvegarde ?'))return;
    localStorage.setItem('NP7V4',JSON.stringify(d.state));if(d.water)localStorage.setItem(WKEY,JSON.stringify(d.water));if(d.profile)localStorage.setItem(PKEY,JSON.stringify(d.profile));location.reload();
  }catch(err){toast('Fichier de sauvegarde non reconnu')}
};

/* ---------- première ouverture : accueil puis proposition de connexion ---------- */
const WKEY2='np7_welcomed';
const signedIn=()=>/Connecté/.test(($('#np7AccountEmail')||{}).textContent||'');
function closeWelcome(){try{localStorage.setItem(WKEY2,'1')}catch(e){}$('#welcome').hidden=true}
if(!localStorage.getItem(WKEY2)){$('#welcome').hidden=false}
$('#startBtn').onclick=()=>{
  const n=$('#welcomeName').value.trim();
  if(n){const p=profile();p.firstName=n;try{localStorage.setItem(PKEY,JSON.stringify(p))}catch(e){}$('#np7Greeting').textContent='Bonjour '+n;paintName()}
  if(signedIn()){closeWelcome();return}
  $('#obIntro').hidden=true;$('#obLogin').hidden=false;setTimeout(()=>$('#obEmail').focus(),50);
};
function obSend(fn){
  const e=$('#obEmail').value.trim(),p=$('#obPass').value;
  $('#accountEmail').value=e;$('#accountPassword').value=p;
  $('#obStatus').textContent='Un instant…';
  Promise.resolve(window[fn]&&window[fn]()).then(()=>{$('#obStatus').textContent=($('#accountStatus').textContent||'').trim();if(signedIn()){toast('Connecté. Tes données seront sauvegardées.');closeWelcome()}});
}
$('#obSignUp').onclick=()=>obSend('np7SignUp');$('#obSignIn').onclick=()=>obSend('np7SignIn');
$('#obSkip').onclick=e=>{e.preventDefault();closeWelcome();toast('Tu pourras te connecter plus tard : Plus › Mon profil › Compte')};
new MutationObserver(()=>{if(!$('#welcome').hidden&&!$('#obLogin').hidden&&signedIn())closeWelcome()}).observe($('#np7AccountEmail'),{childList:true,characterData:true,subtree:true});

/* ---------- liaison avec render() existant ---------- */
const prevRender=window.render;
window.render=function(){prevRender();paintHome();paintReference()};
window.addEventListener('np7:ready',()=>{});
paintHome();paintWater();paintName();paintActs();estimate();paintReference();
window.render();
setTimeout(paintName,600);

/* ---------- liens profonds du manifeste (#meals, #sport, #scanner) ---------- */
function hash(){const h=location.hash.slice(1);if(!h)return;
  if(h==='scanner'){go('meals');setTimeout(()=>openBarcodeScanner(),200)}else if(document.getElementById(h))go(h)}
hash();window.addEventListener('hashchange',hash);

/* ---------- PWA ---------- */
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').then(()=>paintOffline()).catch(()=>{}));navigator.serviceWorker.addEventListener('controllerchange',paintOffline)}
})();
