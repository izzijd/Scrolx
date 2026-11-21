// ---- Réglages ----
// Nom affiché -> catégorie Wikipédia (modifiable à volonté)
const CATS = {Tech:'Informatique', IA:'Intelligence artificielle', Sciences:'Physique', Espace:'Astronomie',
  Histoire:'Histoire', Économie:'Économie', Philosophie:'Philosophie'};
const THEMES = ['noir','casino','glace'];
const DEMO = [
  {title:'Alan Turing', text:"Alan Turing est un mathématicien britannique, pionnier de l'informatique. Sa machine de Turing, décrite en 1936, formalise la notion d'algorithme. Pendant la Seconde Guerre mondiale, il participe au déchiffrement des messages chiffrés par la machine Enigma.", url:'https://fr.wikipedia.org/wiki/Alan_Turing'},
  {title:'Réseau de neurones artificiels', text:"Un réseau de neurones artificiels est un modèle de calcul inspiré du cerveau. Il apprend en ajustant des poids à partir d'exemples, et se trouve au cœur de nombreuses applications d'intelligence artificielle.", url:'https://fr.wikipedia.org/wiki/R%C3%A9seau_de_neurones_artificiels'},
  {title:'Chiffrement', text:"Le chiffrement transforme un message lisible en message inintelligible sans la clé appropriée. Il protège aujourd'hui les paiements, les messageries et la plupart des sites web.", url:'https://fr.wikipedia.org/wiki/Chiffrement'}];

// ---- Stockage local ----
const $ = s => document.querySelector(s);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} };
let cat = load('cat', 'Tech'), seen = new Set(load('seen', [])), flash = load('flashcards', []), loading = false;
const feed = $('#feed');

// ---- Thème ----
function setTheme(t){ document.documentElement.dataset.theme = t; save('theme', t); }
setTheme(load('theme', 'noir'));
$('#themeBtn').onclick = () => setTheme(THEMES[(THEMES.indexOf(document.documentElement.dataset.theme) + 1) % THEMES.length]);

// ---- Message flottant ----
let tt; function toast(m){ const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 1800); }

// ---- Catégories ----
function drawChips(){
  $('#chips').replaceChildren(...Object.keys(CATS).map(k => {
    const b = document.createElement('button'); b.className = 'chip' + (k === cat ? ' on' : ''); b.textContent = k;
    b.onclick = () => { cat = k; save('cat', k); drawChips(); feed.replaceChildren(); feed.scrollTop = 0; more(); };
    return b;
  }));
}

// ---- Wikipédia ----
async function fetchBatch(){
  for (const off of [Math.floor(Math.random() * 300), 0]) {
    const u = 'https://fr.wikipedia.org/w/api.php?' + new URLSearchParams({action:'query', format:'json', origin:'*',
      generator:'search', gsrsearch:`deepcategory:"${CATS[cat]}"`, gsrnamespace:0, gsrlimit:12, gsroffset:off,
      prop:'extracts|pageimages|info', exintro:1, explaintext:1, exsentences:4, exlimit:'max',
      piprop:'thumbnail', pithumbsize:700, inprop:'url'});
    const j = await (await fetch(u)).json();
    const ok = Object.values(j.query?.pages || {}).filter(p => p.extract && p.extract.length > 160
      && !/^(Liste|Catégorie|Portail)/.test(p.title) && !/peut désigner|peut faire référence/.test(p.extract) && !seen.has(p.title));
    if (ok.length) return ok.map(p => ({title:p.title, text:p.extract, img:p.thumbnail?.source, url:p.fullurl}));
  }
  return [];
}

// ---- Cartes ----
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('on');
  if (+e.target.dataset.i >= feed.children.length - 3) more();
}), {root:feed, threshold:.6});

function add(c){
  seen.add(c.title);
  const el = document.createElement('article'); el.className = 'card'; el.dataset.i = feed.children.length;
  const ap = document.createElement('div'); ap.className = 'aperture';
  let media;
  if (c.img) { media = document.createElement('img'); media.src = c.img; media.alt = ''; media.loading = 'lazy'; }
  else { media = document.createElement('div'); media.className = 'ph'; media.textContent = c.title[0]; }
  ap.append(media);
  const h = document.createElement('h2'); h.textContent = c.title;
  const p = document.createElement('p'); p.textContent = c.text;
  const row = document.createElement('div'); row.className = 'row';
  const a = document.createElement('a'); a.textContent = "Lire l'article"; a.href = c.url; a.target = '_blank'; a.rel = 'noopener';
  const b = document.createElement('button'); b.className = 'save';
  const has = () => flash.some(f => f.title === c.title);
  const paint = () => { b.textContent = has() ? 'Dans mes flashcards' : 'Ajouter aux flashcards'; b.classList.toggle('done', has()); };
  b.onclick = () => {
    if (!has()) { flash.push({title:c.title, text:c.text, url:c.url, added:Date.now(), due:0, ease:2.5, interval:0}); save('flashcards', flash); toast('Carte ajoutée'); }
    paint();
  };
  paint(); row.append(a, b); el.append(ap, h, p, row); feed.append(el); io.observe(el);
}

async function more(){
  if (loading) return; loading = true;
  let list = []; try { list = await fetchBatch(); } catch {}
  if (!list.length && !feed.children.length) { list = DEMO.filter(d => !seen.has(d.title)); if (!list.length) { seen.clear(); list = DEMO; } toast('Mode démo : Wikipédia injoignable'); }
  list.forEach(add); save('seen', [...seen].slice(-500)); loading = false;
}

drawChips(); more();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
