/* NP7 — langage naturel : aliments, nombres dits à l'oral, mesures usuelles, sports.
   Dépend de la logique existante (DB, PORTIONS, MET, S). Doit être chargé avant np7-ui.js. */
(function(){
'use strict';

/* ================= normalisation ================= */
function prep(t){
  let s=String(t==null?'':t).toLowerCase().replace(/œ/g,'oe').replace(/æ/g,'ae').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  s=s.replace(/(\d)\s*[,.]\s*(\d)/g,'$1.$2').replace(/\d+(?:\.\d+)?\s*(?:%|pour cent)/g,' ');
  s=s.replace(/[’'`´]/g,' ').replace(/-/g,' ').replace(/[^a-z0-9. ]+/g,' ');
  s=s.replace(/(^|[^0-9])\.|\.(?![0-9])/g,'$1 ').replace(/\s+/g,' ').trim();
  return s;
}
window.np7Prep=prep;

/* ---- nombres écrits en toutes lettres (dictée vocale) : « cent cinquante » → 150 ---- */
const NUM={zero:0,deux:2,trois:3,quatre:4,cinq:5,six:6,sept:7,huit:8,neuf:9,dix:10,onze:11,douze:12,treize:13,quatorze:14,quinze:15,seize:16,vingt:20,vingts:20,trente:30,quarante:40,cinquante:50,soixante:60};
function frNumbers(s){
  const w=s.split(' ');const out=[];let run=null;
  const flush=()=>{if(run){out.push(String(run.total+run.cur));run=null}};
  for(let i=0;i<w.length;i++){
    const t=w[i];
    if(/^\d/.test(t)){flush();out.push(t);continue}
    const next=w[i+1];
    if(t in NUM){
      if(!run)run={total:0,cur:0,last:''};
      if((t==='vingt'||t==='vingts')&&run.last==='quatre'&&run.cur===4)run.cur=80;else run.cur+=NUM[t];
      run.last=t;continue;
    }
    if(run&&(t==='un'||t==='une')){run.cur+=1;run.last=t;continue}
    if(run&&t==='et'&&(next==='un'||next==='une'||next==='onze')){continue}
    if(t==='cent'||t==='cents'){if(!run)run={total:0,cur:0,last:''};run.cur=(run.cur||1)*100;run.last=t;continue}
    if(t==='mille'){if(!run)run={total:0,cur:0,last:''};run.total+=(run.cur||1)*1000;run.cur=0;run.last=t;continue}
    flush();out.push(t);
  }
  flush();return out.join(' ');
}
window.np7FrNumbers=frNumbers;

function normUnits(s){
  return s
   .replace(/\bdemi kilo(?:gramme)?s?\b/g,'500 g').replace(/\bdemi litre\b/g,'500 ml')
   .replace(/\b(?:un|une) (?:kilo|kilos|kilogramme|kilogrammes)\b/g,'1 kg').replace(/\b(?:un|une) litre\b/g,'1 l')
   .replace(/(\d)\s*(?:grammes?|grs?|gram)\b/g,'$1 g').replace(/(\d)\s*(?:kilos?|kilogrammes?)\b/g,'$1 kg')
   .replace(/(\d)\s*(?:millilitres?)\b/g,'$1 ml').replace(/(\d)\s*(?:centilitres?)\b/g,'$1 cl')
   .replace(/(\d)\s*(?:decilitres?)\b/g,'$1 dl').replace(/(\d)\s*(?:litres?)\b/g,'$1 l')
   .replace(/(\d+(?:\.\d+)?) (kg|l) et demie?\b/g,(m,a,u)=>(+a+.5)+' '+u);
}
const FILLER=/\b(?:je viens de|j ai|je vais|ajoute|ajouter|rajoute|rajouter|note|noter|enregistre|mange|manger|mangee|mangees|pris|prendre|bu|boire|bois|au petit dejeuner|petit dejeuner|au dejeuner|dejeuner|au diner|diner|au gouter|gouter|comme collation|en collation|collation|ce matin|ce midi|ce soir|hier soir|hier|aujourd hui|environ|a peu pres|presque|un peu de|un peu d|quelques|beaucoup de|avec|dans mon repas|mon repas|repas)\b/g;

/* ================= liste d'aliments courants (pour 100 g, tel que consommé) =================
   alias;alias | nom affiché | kcal | prot | gluc | lip | poids d'une pièce (g, facultatif)            */
const COMMON=`
riz complet;riz brun|Riz complet cuit|123|2.7|25.6|1
riz basmati;riz thai;riz long;riz blanc|Riz cuit|130|2.7|28.2|0.3
semoule;couscous;graines de couscous|Semoule cuite|112|3.8|23|0.2
boulgour;boulghour|Boulgour cuit|83|3.1|18.6|0.2
quinoa|Quinoa cuit|120|4.4|21.3|1.9
lentilles;lentille;lentilles vertes;lentilles corail|Lentilles cuites|116|9|20|0.4
pois chiches;pois chiche|Pois chiches cuits|164|8.9|27.4|2.6
haricots rouges;haricot rouge|Haricots rouges cuits|127|8.7|22.8|0.5
haricots blancs;haricot blanc;flageolets;flageolet|Haricots blancs cuits|139|9.7|25|0.5
pates completes;pate complete|Pâtes complètes cuites|124|5.3|25|0.5
spaghetti;spaghettis;tagliatelles;tagliatelle;penne;fusilli;macaroni;macaronis;coquillettes;coquillette;farfalle;rigatoni|Pâtes cuites|158|5.8|30.9|0.9
nouilles;nouille;nouilles chinoises;vermicelles|Nouilles cuites|138|4.5|25|2.1
gnocchis;gnocchi|Gnocchis|170|4|35|1
pommes de terre;pomme de terre;patates;patate|Pomme de terre cuite|86|1.8|19|0.1|150
puree;puree de pommes de terre|Purée de pommes de terre|90|2|15|2.5
frites;frite;frites de patate|Frites|312|3.8|41|15
patate douce;patates douces|Patate douce cuite|90|2|20.7|0.2|150
mais;mais doux;epi de mais|Maïs|96|3.4|21|1.5
muesli;granola|Muesli|370|9|66|6
corn flakes;cereales;cereales petit dejeuner;special k;chocapic|Céréales petit-déjeuner|378|7|84|0.9
pain complet;pain aux cereales;pain de campagne;pain complet tranche|Pain complet|247|9|41|3.4|30
baguette;baguettes;demi baguette|Baguette|270|9|55|1|250
pain de mie;toast;toasts|Pain de mie|265|8|49|3.5|25
biscotte;biscottes|Biscotte|400|11|72|6|9
tortilla;tortillas;wrap;wraps;galette de ble|Wrap / tortilla|300|8|50|7|60
pizza;pizzas;pizza margherita;pizza reine|Pizza|250|11|33|8|
croissant;croissants|Croissant|406|8|45|21|60
brioche;brioches|Brioche|380|8|50|17|50
crepe;crepes|Crêpe|200|6|28|7|60
gaufre;gaufres|Gaufre|320|6|40|15|75
pancake;pancakes|Pancake|230|6|32|9|50
boeuf;viande rouge;entrecote;rumsteck;bavette;rosbif;viande de boeuf;boeuf cuit|Bœuf cuit|250|26|0|16
steak hache;steaks haches;viande hachee|Steak haché|250|26|0|17|125
jambon blanc;jambon cuit;jambon de paris|Jambon blanc|115|20|0.5|3|35
jambon cru;jambon de bayonne;jambon sec;prosciutto;jambon de pays|Jambon cru|220|26|0.3|12|20
lardons;lardon;bacon;poitrine fumee|Lardons|300|18|0.5|25
saucisse;saucisses;knacki;knackis;chipolata;chipolatas;saucisse de toulouse|Saucisse|300|13|2|27|50
saucisson;saucisson sec;rosette|Saucisson sec|400|25|2|32|5
merguez|Merguez|290|15|1|25|50
porc;filet mignon;cote de porc;roti de porc;escalope de porc|Porc cuit|190|27|0|8.5
veau;escalope de veau;roti de veau|Veau cuit|150|28|0|4
agneau;gigot;gigot d agneau;cotelettes d agneau|Agneau cuit|250|25|0|17
canard;magret;magret de canard;confit de canard|Canard cuit|200|24|0|11
lapin|Lapin cuit|160|25|0|6.5
nuggets;nugget;nuggets de poulet|Nuggets de poulet|250|15|16|14|18
cuisse de poulet;cuisses de poulet;pilon;pilons;pilon de poulet|Cuisse de poulet cuite|210|26|0|12|120
poulet roti|Poulet rôti|190|27|0|9
thon;thon en boite;thon naturel;thon au naturel;thon en conserve|Thon au naturel|110|25|0|1
saumon fume|Saumon fumé|180|22|0|10|30
cabillaud;colin;merlu;lieu;poisson blanc;dorade;bar;sole|Poisson blanc cuit|105|23|0|1
truite|Truite cuite|150|22|0|7
sardine;sardines;sardines a l huile|Sardines en conserve|210|25|0|12
maquereau;maquereaux|Maquereau|240|22|0|17
crevette;crevettes;gambas|Crevettes cuites|99|21|0.2|1.1
surimi;batonnets de surimi|Surimi|100|8.5|9|1|15
moules;moule|Moules cuites|172|24|7|4.5
poisson pane;poissons panes;fish and chips|Poisson pané|230|12|20|11
blanc d oeuf;blancs d oeufs;blanc d oeufs|Blanc d'œuf|52|11|0.7|0.2|33
tofu|Tofu|130|14|2|7.5
tempeh|Tempeh|190|19|9|11
seitan|Seitan|120|24|4|2
steak vegetal;steaks vegetaux;steak de soja|Steak végétal|200|18|10|9|100
proteine;proteines;shaker;shaker de proteine;proteine en poudre;proteines en poudre;poudre de proteine|Protéine en poudre|400|80|8|6|30
lait entier|Lait entier|64|3.3|4.7|3.6
lait ecreme;lait demi ecreme|Lait écrémé|35|3.4|5|0.1
lait d amande|Lait d'amande|20|0.5|2.5|1.1
lait de soja|Lait de soja|40|3.3|2.5|1.8
lait d avoine|Lait d'avoine|45|1|7|1.5
yaourt grec;yaourt a la grecque|Yaourt grec|115|5.5|4.5|8|125
yaourt aux fruits;yaourt sucre;yaourt vanille|Yaourt aux fruits|90|3.5|14|2|125
yaourt nature;yaourts nature;yaourts;yaourt;yogourt;yogurt|Yaourt nature|50|4|4.5|1.5|125
skyr|Skyr|63|11|4|0.2|150
fromage blanc;faisselle|Fromage blanc|75|7|4|3
petit suisse;petits suisses|Petit-suisse|115|9|3.5|7.5|60
emmental;gruyere;comte;cantal;edam;gouda;fromage rape;fromage a pate dure;mimolette;tomme|Fromage à pâte dure|390|28|1|30|25
mozzarella|Mozzarella|250|18|1.5|19|125
parmesan;grana padano|Parmesan|400|36|0|28
camembert;coulommiers|Camembert|275|19|0.5|22
brie|Brie|330|20|0.5|27
chevre;fromage de chevre;buche de chevre;chevre frais|Fromage de chèvre|270|18|1|21
feta|Feta|265|14|4|21
raclette;fromage a raclette|Fromage à raclette|330|22|0.5|26
creme fraiche;creme;creme epaisse|Crème fraîche|300|2.3|3|30
creme legere;creme fraiche legere|Crème légère|160|3|4|15
beurre|Beurre|740|0.6|0.7|82|10
margarine|Margarine|720|0.2|0.7|80|10
glace;glaces;creme glacee|Glace|200|3.5|24|10
orange;oranges|Orange|47|0.9|11.8|0.1|130
clementine;clementines|Clémentine|47|0.9|12|0.2|60
mandarine;mandarines|Mandarine|53|0.8|13|0.3|70
poire;poires|Poire|57|0.4|15|0.1|170
fraise;fraises|Fraises|33|0.7|7.7|0.3|15
framboise;framboises|Framboises|52|1.2|12|0.7
myrtille;myrtilles|Myrtilles|57|0.7|14.5|0.3
raisin;raisins|Raisin|69|0.7|18|0.2
cerise;cerises|Cerises|63|1|16|0.2|8
peche;peches;nectarine;nectarines|Pêche|39|0.9|9.5|0.3|150
abricot;abricots|Abricot|48|1.4|11|0.4|45
prune;prunes;pruneaux|Prune|46|0.7|11|0.3|35
kiwi;kiwis|Kiwi|61|1.1|14.7|0.5|75
ananas|Ananas|50|0.5|13|0.1
mangue;mangues|Mangue|60|0.8|15|0.4|200
melon|Melon|34|0.8|8|0.2
pasteque|Pastèque|30|0.6|7.6|0.2
citron;citrons|Citron|29|1.1|9|0.3|80
pamplemousse|Pamplemousse|42|0.8|11|0.1|250
avocat;avocats|Avocat|160|2|8.5|14.7|150
datte;dattes|Datte|282|2.5|75|0.4|10
figue;figues|Figue|74|0.8|19|0.3|50
raisins secs|Raisins secs|299|3|79|0.5
compote;compote de pomme;compote de pommes|Compote de pomme|70|0.3|16|0.2|100
fruits rouges|Fruits rouges|45|0.9|9|0.4
amande;amandes|Amandes|580|21|22|50
noix;noix de grenoble|Noix|650|15|10|65
noisette;noisettes|Noisettes|630|15|17|61
cacahuete;cacahuetes;cacahouetes;arachides|Cacahuètes|580|26|16|49
noix de cajou;cajou;cajous|Noix de cajou|580|18|30|44
pistache;pistaches|Pistaches|560|20|28|45
beurre de cacahuete;beurre d arachide;peanut butter|Beurre de cacahuète|590|25|20|50
carotte;carottes|Carotte|41|0.9|9.6|0.2|80
brocoli;brocolis|Brocoli cuit|35|2.4|7|0.4
courgette;courgettes|Courgette|17|1.2|3|0.3|200
tomate;tomates|Tomate|18|0.9|3.9|0.2|120
tomates cerises;tomate cerise|Tomates cerises|18|0.9|3.9|0.2|15
concombre;concombres|Concombre|15|0.7|3.6|0.1|300
salade;salade verte;laitue;mesclun;roquette;mache;batavia;endive;endives|Salade verte|15|1.4|2.9|0.2
epinards;epinard|Épinards cuits|23|3|3.6|0.3
haricots verts;haricot vert|Haricots verts|31|1.8|4.7|0.2
poivron;poivrons|Poivron|31|1|6|0.3|150
oignon;oignons|Oignon|40|1.1|9|0.1|100
champignon;champignons;champignons de paris|Champignons|22|3.1|3.3|0.3|20
chou fleur;choux fleur|Chou-fleur|25|1.9|5|0.3
chou;chou rouge;choux de bruxelles;chou blanc|Chou|25|1.5|5|0.2
aubergine;aubergines|Aubergine|25|1|6|0.2|250
poireau;poireaux|Poireau|31|1.5|7|0.3
radis|Radis|16|0.7|3.4|0.1|8
betterave;betteraves|Betterave cuite|44|1.7|10|0.2
courge;potiron;butternut;citrouille|Courge cuite|26|1|6.5|0.1
petits pois;petit pois|Petits pois cuits|80|5.4|14|0.4
asperge;asperges|Asperges|20|2.2|3.9|0.1|20
ratatouille|Ratatouille|60|1.2|6|3
legumes;legume;legumes vapeur;poelee de legumes;legumes grilles|Légumes mélangés|35|2|5|0.4
soupe;soupe de legumes;veloute|Soupe de légumes|35|1|5|1
olive;olives|Olives|145|1|4|15|4
cornichon;cornichons|Cornichons|12|0.5|2|0.1|10
guacamole|Guacamole|150|2|6|14
houmous;hummus|Houmous|265|8|10|20
huile;huile d olive;huile de tournesol;huile de colza;huile de coco|Huile|900|0|0|100
mayonnaise;mayo|Mayonnaise|700|1|2|77
ketchup|Ketchup|110|1.2|24|0.2
moutarde|Moutarde|65|4|5|4
vinaigrette|Vinaigrette|350|0.3|4|37
sauce tomate;coulis de tomate|Sauce tomate|40|1.5|7|0.8
pesto|Pesto|450|5|6|45
sauce bolognaise;bolognaise|Sauce bolognaise|100|7|6|5.5
sauce soja|Sauce soja|60|6|5|0
sucre;sucre en poudre;sucre blanc;morceau de sucre;morceaux de sucre|Sucre|400|0|100|0|6
miel|Miel|305|0.3|82|0
confiture|Confiture|250|0.4|62|0.1
nutella;pate a tartiner;pate a tartiner chocolat noisette|Pâte à tartiner chocolat-noisette|540|6|58|31
chocolat noir|Chocolat noir|570|8|35|41|5
chocolat au lait;chocolat|Chocolat au lait|535|7.5|58|30|5
madeleine;madeleines|Madeleine|450|6|55|23|25
muffin;muffins|Muffin|380|5|50|18|110
brownie;brownies|Brownie|450|5|52|25|60
gateau;gateaux;cake;part de gateau|Gâteau|400|5|50|20
biscuit;biscuits;sable;sables;petit beurre|Biscuit|470|6|66|20|10
cookie;cookies|Cookie|480|5|64|23|30
barre de cereales;barres de cereales|Barre de céréales|400|6|68|11|25
barre proteinee;barres proteinees|Barre protéinée|380|30|35|12|55
chips;chips de pomme de terre|Chips|540|6|50|35
popcorn;pop corn|Popcorn|380|12|74|4
bonbon;bonbons;haribo|Bonbons|380|0|90|0|4
eau;eau plate;eau gazeuse|Eau|0|0|0|0|200
cafe;cafes;expresso;espresso;cafe noir|Café noir|2|0.1|0|0|100
the;the vert;the noir;infusion;tisane|Thé|1|0|0.2|0|200
jus d orange;jus de pomme;jus de fruit;jus de raisin;jus;jus multifruits|Jus de fruit|45|0.6|10.5|0.2
coca;coca cola;cola;soda;limonade;fanta;sprite;orangina;ice tea|Soda|42|0|10.6|0
coca zero;coca light;soda zero;boisson zero|Soda zéro|0|0|0|0
biere;bieres;pinte;demi de biere|Bière|43|0.5|3.6|0
vin;vin rouge;vin blanc;vin rose;champagne|Vin|83|0.1|2.6|0
smoothie;smoothies|Smoothie|55|0.6|12|0.3
boisson energisante;red bull;monster|Boisson énergisante|45|0|11|0
burger;hamburger;cheeseburger|Burger|250|13|24|11|200
kebab;kebabs;sandwich kebab;grec|Kebab (sandwich)|215|12|20|10|350
tacos;taco|Tacos|220|11|22|10|300
sushi;sushis;maki;makis;california roll|Sushi|150|6|28|1.5|30
lasagne;lasagnes|Lasagnes|150|8|14|7
quiche;quiche lorraine|Quiche|270|9|20|17
hachis parmentier|Hachis parmentier|125|7|11|6
croque monsieur;croque madame|Croque-monsieur|280|13|22|15|150
sandwich;sandwichs;sandwich jambon beurre;jambon beurre|Sandwich jambon-beurre|250|11|30|9|200
paella|Paëlla|150|8|17|5
chili con carne;chili|Chili con carne|120|9|11|4.5
carbonara;pates carbonara|Pâtes carbonara|180|8|22|7
nems;nem|Nems|220|7|24|11|70
riz cantonais|Riz cantonais|160|6|23|5
raviolis;ravioli|Raviolis sauce tomate|95|4|15|2
cassoulet|Cassoulet|150|9|10|8
tarte aux pommes;tarte;tartelette;tarte aux fruits|Tarte aux pommes|240|3|35|10
flan;flan patissier|Flan pâtissier|130|4|20|4
mousse au chocolat|Mousse au chocolat|190|5|22|9
riz au lait|Riz au lait|120|3.5|20|2.5
creme dessert;danette|Crème dessert|110|3|19|2.5|125
gratin dauphinois|Gratin dauphinois|140|3|13|8
`.trim().split('\n');

const UNIT={},PORT={};
const REG=[];                      // [{key,re,v,unit}]
function addCommon(){
  if(typeof DB==='undefined')return;
  COMMON.forEach(line=>{
    const f=line.split('|');if(f.length<6)return;
    const v=[f[1],+f[2],+f[3],+f[4],+f[5]],u=f[6]?+f[6]:0;
    f[0].split(';').forEach(a=>{const k=prep(a);if(!k)return;
      if(!REG.some(r=>r.key===k))REG.push({key:k,v,unit:u,src:'common'});
    });
  });
  // aliments d'origine de l'application (DB) : on garde leurs valeurs, sans écraser
  Object.keys(DB).forEach(k0=>{const k=prep(k0);if(!k||REG.some(r=>r.key===k))return;const v=DB[k0];REG.push({key:k,v:Array.isArray(v)?v:[v.name,v.kcal,v.prot,v.carbs,v.fat],unit:0,src:'db',orig:k0})});
  REG.forEach(r=>{r.re=new RegExp('(^| )'+r.key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:s|x)?(?= |$)')});
  REG.sort((a,b)=>b.key.length-a.key.length);
  if(typeof PORTIONS!=='undefined')Object.keys(PORTIONS).forEach(k=>{PORT[prep(k)]=PORTIONS[k]});
  // poids usuels des aliments d'origine
  Object.assign(UNIT,{oeuf:60,yaourt:125,pomme:150,banane:120,fromage:25,pain:30,jambon:35,'pain au chocolat':70});
}

/* ================= mesures du quotidien ================= */
const MEAS_RE=/(?:(\d+(?:\.\d+)?|un|une|deux|trois)\s+)?(demi\s+)?(cuilleres? a soupe|cuilleres? a cafe|cuilleres? a dessert|c a s|c a c|cas|cac|verres?|bols?|tasses?|poignees?|tranches?|pots?|canettes?|boules?|carres?|parts?|scoops?|doses?|assiettes?)(?:\s+(?:de|d))?(?= |$)/;
function measureGrams(unit,key){
  const tbsp=()=>/huile/.test(key)?13:/sucre/.test(key)?12:/miel|confiture|nutella|tartiner/.test(key)?20:/cacahuete|arachide/.test(key)?16:/beurre/.test(key)?14:/rape|parmesan/.test(key)?8:/proteine|whey/.test(key)?30:15;
  if(/soupe|^c a s$|^cas$/.test(unit))return tbsp();
  if(/cafe|dessert|^c a c$|^cac$/.test(unit))return Math.round(tbsp()/3*10)/10;
  if(/^verre/.test(unit))return /vin|champagne/.test(key)?125:200;
  if(/^bol/.test(unit))return /cereale|muesli|avoine|granola|flocons/.test(key)?40:250;
  if(/^tasse/.test(unit))return /cafe|expresso|espresso/.test(key)?100:150;
  if(/^poignee/.test(unit))return 30;
  if(/^tranche/.test(unit))return /jambon/.test(key)?35:/fromage|emmental|comte|cantal|gouda|edam/.test(key)?25:/saumon/.test(key)?30:/pizza/.test(key)?120:30;
  if(/^pot/.test(unit))return /skyr/.test(key)?150:125;
  if(/^canette/.test(unit))return 330;
  if(/^boule/.test(unit))return 50;
  if(/^carre/.test(unit))return 5;
  if(/^(scoop|dose)/.test(unit))return 30;
  if(/^part/.test(unit))return /pizza/.test(key)?120:/quiche|tarte/.test(key)?150:/gateau|cake/.test(key)?80:0;
  if(/^assiette/.test(unit))return /soupe/.test(key)?300:/pates|riz|semoule|boulgour|quinoa|lentille/.test(key)?200:250;
  return 0;
}
function pieceWeight(r){
  if(/^oeuf$/.test(r.key)||/oeuf/.test(r.key)&&!/blanc/.test(r.key))return 60;
  if(r.unit)return r.unit;
  const p=PORT[r.key];if(p&&p.length)return p[Math.min(1,p.length-1)][1];
  return UNIT[r.key]||0;
}

/* ================= recherche Ciqual (3 484 aliments) pour tout le reste ================= */
const STOP=new Set('de du des d la le les l au aux a en et un une bio frais fraiche fraiches petit petite petits grand grande gros grosse mon ma mes ce cette de la sans avec pour'.split(' '));
const stem=t=>t.length>3&&/[sx]$/.test(t)?t.slice(0,-1):t;
let IDX=null,IDXN=0;
function buildIdx(){
  if(typeof CIQUAL==='undefined'||!CIQUAL.length)return false;
  if(IDX&&IDXN===CIQUAL.length)return true;
  IDX=CIQUAL.map(x=>{const n=prep(x.n),toks=n.split(' ').map(stem);return{x,n,toks,set:new Set(toks)}});IDXN=CIQUAL.length;return true;
}
function shortName(n){const p=String(n).split(',').map(s=>s.trim()).filter(Boolean);let s=p.slice(0,3).join(', ');return s.length>58?s.slice(0,57)+'…':s}
function ciqualFind(phrase){
  if(!buildIdx())return null;
  const q=prep(phrase).split(' ').filter(t=>t&&!STOP.has(t)&&!/^\d/.test(t)).map(stem);
  if(!q.length)return null;
  const raw=q.includes('cru')||q.includes('crue');
  let best=null,bs=-1e9;
  for(const it of IDX){
    if(!q.every(t=>it.set.has(t)))continue;
    let s=100-(it.toks.length-q.length)*6;
    if(it.toks[0]===q[0])s+=25;
    if(!raw&&it.set.has('cuit'))s+=8;
    if(it.n.includes('aliment moyen'))s+=10;
    if(/\b(sec|seche|poudre|deshydrate|lyophilise|concentre|instantane|farine)\b/.test(it.n)&&!q.some(t=>/sec|poudre|farine/.test(t)))s-=14;
    if(/\b(pour|rayon|preemballe|prepare|surgele|conserve|appertise)\b/.test(it.n))s-=4;
    if(s>bs){bs=s;best=it.x}
  }
  return best;
}
window.np7CiqualFind=ciqualFind;

/* portion standard quand aucune quantité n'est donnée (signalée à l'utilisateur) */
function defaultServing(name){
  const s=prep(name);
  if(/huile/.test(s))return 10;if(/beurre|margarine/.test(s))return 10;if(/^sucre/.test(s))return 6;
  if(/miel|confiture|tartiner/.test(s))return 15;if(/mayonnaise|ketchup|moutarde|vinaigrette|pesto|sauce/.test(s))return 20;
  if(/cafe|^the|infusion/.test(s))return 120;if(/^eau|soda|jus|biere|^vin|smoothie|boisson/.test(s))return 200;
  if(/fromage blanc|yaourt|skyr|creme dessert|petit suisse/.test(s))return 125;
  if(/fromage|emmental|comte|parmesan|camembert|brie|feta|chevre|mozzarella|raclette/.test(s))return 30;
  if(/^lait/.test(s))return 200;
  if(/poulet|boeuf|steak|porc|veau|agneau|dinde|canard|lapin|jambon|saucisse|poisson|saumon|thon|cabillaud|crevette|truite|sardine|maquereau|tofu|seitan|tempeh|moules|merguez|lardons|nuggets|surimi/.test(s))return 120;
  if(/frites|chips/.test(s))return 150;
  if(/riz|pates|semoule|boulgour|quinoa|lentille|pois chiche|haricots rouges|haricots blancs|pomme de terre|puree|gnocchi|nouilles|mais|patate/.test(s))return 180;
  if(/salade|legume|brocoli|courgette|epinard|carotte|haricots verts|tomate|concombre|chou|aubergine|poivron|ratatouille|soupe|champignon|poireau|betterave|courge|asperge/.test(s))return 150;
  if(/amande|noix|noisette|cacahu|cajou|pistache|olive/.test(s))return 30;
  if(/chocolat|biscuit|gateau|cookie|bonbon|barre|glace|brioche|croissant|madeleine|muffin/.test(s))return 40;
  return 100;
}

/* ================= analyse d'une phrase ================= */
const COMPOSITE=/^(sandwich|burger|hamburger|cheeseburger|croque|kebab|tacos|taco|pizza|quiche|lasagne|lasagnes|paella|chili|carbonara|hachis|cassoulet|tarte|nems?|sushis?|maki|wrap)/;
function splitByQty(seg){
  const re=/(\d+(?:\.\d+)?)\s*(?:kg|g|ml|cl|dl|l)\b/g;const pos=[];let m;while((m=re.exec(seg)))pos.push([m.index,m.index+m[0].length]);
  if(pos.length<2)return[seg];
  const cuts=/^\s*$/.test(seg.slice(0,pos[0][0]))?pos.slice(1).map(p=>p[0]):pos.slice(0,-1).map(p=>p[1]);
  const parts=[];let last=0;cuts.forEach(c=>{parts.push(seg.slice(last,c));last=c});parts.push(seg.slice(last));return parts.filter(x=>x.trim());
}
const SEP=/\s*(?:,|;|\+|&|\bet\b|\bpuis\b|\bplus\b|\baussi\b)\s*/;
const QTY=/(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|dl|l)\b/;
function toGrams(n,u){n=+n;return u==='kg'?n*1000:u==='cl'?n*10:u==='dl'?n*100:u==='l'?n*1000:n}
const NUMW={un:1,une:1,deux:2,trois:3};

function parseText(text){
  if(!REG.length)addCommon();
  let s=normUnits(frNumbers(prep(text)));
  s=s.replace(FILLER,' ').replace(/\s+/g,' ').trim();
  const custom=Object.values((typeof S!=='undefined'&&S.custom)||{}).map(c=>{const k=prep(c.name);return{key:k,v:[c.name,+c.k||0,+c.pr||0,+c.ca||0,+c.f||0],unit:0,src:'custom',re:new RegExp('(^| )'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:s|x)?(?= |$)')}}).filter(r=>r.key);
  const keys=custom.concat(REG).sort((a,b)=>b.key.length-a.key.length);
  const out=[],unmatched=[],est=[];
  const push=(v,q,estimated)=>{
    const ex=out.find(x=>x.v[0]===v[0]);
    if(ex){if(ex.q!=null&&q!=null)ex.q+=q;else if(q!=null)ex.q=q;return}
    out.push({v,q:q==null?null:Math.round(q)});if(estimated&&q!=null)est.push(v[0]);
  };
  s.split(SEP).filter(Boolean).flatMap(splitByQty).forEach(seg=>{
    let work=' '+seg+' ';
    let qty=null,meas=null;
    let m=work.match(QTY);if(m){qty=toGrams(m[1],m[2]);work=work.replace(m[0],' @ ')}
    if(qty==null){const mm=work.match(MEAS_RE);if(mm){const n=mm[1]?(NUMW[mm[1]]||+mm[1]):1;meas={n:n*(mm[2]?.5:1),unit:mm[3]};work=work.replace(mm[0],' @ ')}}
    const found=[];
    for(const r of keys){const mt=r.re.exec(work);if(!mt)continue;found.push({r,idx:mt.index});work=work.replace(r.re,' ')}
    found.sort((a,b)=>a.idx-b.idx);
    if(found.length>1){const comp=found.find(f=>COMPOSITE.test(f.r.key));if(comp){found.length=0;found.push(comp)}}
    if(found.length){
      // la quantité (g, ml, cuillère…) va à l'aliment qui suit (« 150 g de riz ») sinon à celui qui précède (« riz 150 g »)
      const qi=work.indexOf(' @ ');let target=-1;
      if(qi>=0){target=found.findIndex(f=>f.idx>qi);if(target<0)target=found.length-1}
      found.forEach((f,i)=>{
        const r=f.r;let q=null,e=false;
        if(i===target&&qty!=null)q=qty;
        else if(i===target&&meas){const g=measureGrams(meas.unit,r.key);if(g){q=g*meas.n;e=true}}
        if(q==null){
          const pw=pieceWeight(r);
          if(pw){
            const pre=work.slice(0,f.idx),cm=pre.match(/(\d+(?:\.\d+)?|un|une)((?: [a-z]+){0,2})\s*$/);
            let c=cm&&!/@/.test(cm[2])?(NUMW[cm[1]]||+cm[1]):1;
            if(/\bdemi\b/.test(pre.slice(-18)))c*=.5;
            q=pw*c;e=true;
          }
        }
        push(r.v,q,e);
      });
      return;
    }
    // inconnu de la liste : recherche dans la base Ciqual
    const phrase=work.replace(/\b(?:cuilleres? a soupe|cuilleres? a cafe|verres?|bols?|tasses?|portions?|morceaux?|boites?|barquettes?|sachets?)\b/g,' ').replace(/\s+/g,' ').trim();
    const hit=phrase&&ciqualFind(phrase);
    if(hit){
      const q=qty!=null?qty:meas?(measureGrams(meas.unit,prep(phrase))*meas.n||null):null;
      push([shortName(hit.n),+hit.k||0,+hit.p||0,+hit.gld||0,+hit.l||0],q,!!meas&&q!=null);
    }else if(phrase&&/[a-z]{3}/.test(phrase)){unmatched.push(phrase)}
  });
  out.forEach(o=>{if(o.q==null){o.q=defaultServing(o.v[0]);if(!est.includes(o.v[0]))est.push(o.v[0])}});
  window.__np7Unmatched=unmatched;window.__np7Est=est;
  return out;
}
window.parse=parseText;
window.np7ParseDebug=parseText;

/* ================= sports ================= */
const SPORTS=[
['muscu','Musculation',5,'musculation;muscu;salle;poids;fonte;salle de sport;developpe couche;squat;halteres'],
['circuit','Circuit training',8,'circuit training;circuit;cardio training'],
['running','Course à pied',9.8,'course;courir;cours;couru;courais;jogging;running;footing;course a pied'],
['trail','Trail',9,'trail'],
['athle','Athlétisme / sprint',8,'athletisme;sprint;fractionne'],
['walking','Marche',3.5,'marche;marcher;balade;promenade;se promener'],
['marche_rapide','Marche rapide',4.3,'marche rapide;marche active;marche soutenue'],
['marche_nordique','Marche nordique',6.8,'marche nordique'],
['dog','Promenade du chien',3,'promener le chien;promenade du chien;balade du chien'],
['hiking','Randonnée',6,'randonnee;rando;randonner;randonne'],
['cycling','Vélo',7.5,'velo;cyclisme;cycling;cycliste;faire du velo;pedale;pedalais;route'],
['vtt','VTT',8.5,'vtt;velo tout terrain'],
['velo_app','Vélo d’appartement',7,'velo d appartement;home trainer;velo stationnaire'],
['spinning','Spinning / RPM',8.5,'spinning;rpm;biking;cycle indoor'],
['velo_elec','Vélo électrique',4.5,'velo electrique;velo a assistance'],
['elliptique','Vélo elliptique',5,'elliptique;velo elliptique;cross trainer'],
['swimming','Natation',8,'natation;nage;nager;nageais;piscine;crawl;brasse;papillon'],
['aquagym','Aquagym',5.3,'aquagym;aqua gym;aquafitness'],
['football','Football',8,'football;foot;match de foot'],
['futsal','Futsal',8,'futsal;foot en salle'],
['basketball','Basketball',7.5,'basket;basketball'],
['handball','Handball',8,'handball;hand'],
['volley','Volley-ball',4,'volley;volleyball;volley ball'],
['beach_volley','Beach-volley',8,'beach volley;volley de plage'],
['rugby','Rugby',9,'rugby'],
['tennis','Tennis',7,'tennis'],
['padel','Padel',6,'padel'],
['badminton','Badminton',6,'badminton;bad'],
['squash','Squash',12,'squash'],
['pingpong','Tennis de table',4,'ping pong;tennis de table;pingpong'],
['golf','Golf',4.8,'golf'],
['baseball','Baseball',5,'baseball;softball'],
['hockey','Hockey',8,'hockey'],
['combat','Jiu-jitsu brésilien / grappling',8.5,'jiu jitsu;jjb;bjj;grappling;combat;sambo'],
['judo','Judo',10,'judo'],
['karate','Karaté',10,'karate'],
['taekwondo','Taekwondo',10,'taekwondo;taekwon do'],
['aikido','Aïkido',5,'aikido'],
['lutte','Lutte',6,'lutte'],
['boxing','Boxe',9,'boxe;boxing;sac de frappe;shadow boxing'],
['kickboxing','Kick-boxing / Muay Thaï',10,'kick boxing;kickboxing;muay thai;boxe thai;boxe pieds poings'],
['mma','MMA',11,'mma'],
['krav','Krav-maga',8,'krav maga;krav'],
['escrime','Escrime',6,'escrime'],
['crossfit','CrossFit',8.5,'crossfit;cross fit'],
['hiit','HIIT',9,'hiit;tabata;intervalles'],
['kettlebell','Kettlebell',9.8,'kettlebell'],
['callisthenics','Callisthénie / street workout',6,'callisthenie;street workout;pompes;tractions;barres'],
['abdos','Abdos / gainage',3.8,'abdos;abdominaux;gainage;planche'],
['jump_rope','Corde à sauter',11,'corde a sauter;corde'],
['step','Step',8.5,'step'],
['aerobic','Aérobic',7,'aerobic;aerobique'],
['zumba','Zumba',6.5,'zumba'],
['dance','Danse',5,'danse;danser;salsa;bachata;rock;valse;classique;modern jazz'],
['hiphop','Danse hip-hop',6,'hip hop;hiphop;breakdance'],
['yoga','Yoga',2.5,'yoga;hatha'],
['vinyasa','Yoga dynamique',4,'vinyasa;power yoga;ashtanga;yoga dynamique'],
['pilates','Pilates',3,'pilates'],
['stretching','Étirements',2.3,'etirements;stretching;souplesse'],
['taichi','Tai-chi',3,'tai chi;taichi;qi gong'],
['rowing','Aviron / rameur',7,'aviron;rameur;rowing;ergometre'],
['kayak','Canoë / kayak',5,'canoe;kayak;pagaie'],
['sup','Stand-up paddle',6,'stand up paddle;paddle;sup'],
['surf','Surf',3,'surf;surfe;bodyboard'],
['voile','Voile',3,'voile;catamaran'],
['escalade','Escalade',8,'escalade;bloc;varappe;grimpe;grimper'],
['ski','Ski alpin',6,'ski;skie;ski alpin;piste'],
['ski_fond','Ski de fond',9,'ski de fond'],
['snowboard','Snowboard',5.3,'snowboard;snow'],
['patin','Patinage',7,'patin a glace;patinage;patinoire;patine'],
['roller','Roller',7.5,'roller;rollers;patins a roulettes;skate;trottinette'],
['equitation','Équitation',5.5,'equitation;cheval;poney'],
['stairs','Escaliers',8.8,'escaliers;monter les escaliers;stairmaster'],
['trampoline','Trampoline',3.5,'trampoline'],
['gym','Gymnastique',3.8,'gymnastique;gym'],
['triathlon','Triathlon',10,'triathlon'],
['bowling','Bowling',3,'bowling'],
['billard','Billard',2.5,'billard'],
['petanque','Pétanque',3,'petanque'],
['menage','Ménage',3.3,'menage;nettoyage;ranger;passer l aspirateur'],
['jardin','Jardinage',4,'jardinage;jardin;tondre;bechage'],
['bricolage','Bricolage',3.5,'bricolage;bricoler;travaux'],
['demenage','Déménagement',7.5,'demenagement;demenager;porter des cartons']
].map(([key,name,met,al])=>({key,name,met,aliases:al.split(';').map(prep)}));
window.NP7_SPORTS=SPORTS;
SPORTS.forEach(s=>{if(typeof MET!=='undefined'&&!(s.key in MET))MET[s.key]=s.met});
// valeurs d'origine conservées pour les clés historiques
window.findSportAI=function(text){
  const t=' '+normUnits(frNumbers(prep(text)))+' ';let best=null,bl=0;
  SPORTS.forEach(sp=>sp.aliases.forEach(a=>{
    if(!a)return;const re=new RegExp('(^| )'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:s|e|es)?(?= )');
    if(re.test(t)&&a.length>bl){bl=a.length;best=sp}
  }));
  return best?{key:best.key,name:best.name,met:best.met,aliases:best.aliases}:undefined;
};
window.parseSportDuration=function(text){
  let s=normUnits(frNumbers(prep(text)));
  let m;
  if((m=s.match(/(\d+)\s*h\s*(\d{1,2})\b/)))return +m[1]*60+ +m[2];
  if(/\bune heure et demie?\b|\b1 heure et demi/.test(s))return 90;
  if((m=s.match(/(\d+(?:\.\d+)?)\s*(?:h|heures?|hr)\b/)))return Math.round(parseFloat(m[1])*60);
  if(/\bun quart d heure\b|\bquart d heure\b/.test(s))return 15;
  if(/\bdemi heure\b/.test(s))return 30;
  if(/\bune heure\b/.test(s))return 60;
  if((m=s.match(/(\d+)\s*(?:min|minutes?|mn)\b/)))return +m[1];
  if((m=s.match(/\b(\d+)\b/)))return +m[1];
  return 0;
};
})();
