const app = document.querySelector('#app');
let token = sessionStorage.getItem('gruppenzeit-token') || '';
if (location.hash.startsWith('#invite=')) {
  token = decodeURIComponent(location.hash.slice(8));
  sessionStorage.setItem('gruppenzeit-token',token);
  history.replaceState(null,'',location.pathname);
}
let me = null, events = [], members = [], month = new Date(), selected = null, message = '';
month.setDate(1);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const dayKey = date => { const d=new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const formatDate = date => new Date(date).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'short'});
const formatTime = date => new Date(date).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
async function api(path,options={}) {
  let response;
  try { response = await fetch('/api'+path,{...options,headers:{Authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{})}}); }
  catch { throw new Error('Keine Verbindung zum Server. Bitte später erneut versuchen.'); }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Die Aktion ist fehlgeschlagen.');
  return data;
}
function login(error='') {
  app.innerHTML = `<header><div class="wrap"><strong>Gruppenzeit</strong></div></header><main class="wrap page"><section class="card login"><p class="eyebrow">Gemeinsam planen</p><h1>Willkommen</h1><p>Öffne deinen persönlichen Einladungslink oder gib den Admin-Schlüssel ein.</p>${error?`<div class="error" role="alert">${escapeHtml(error)}</div>`:''}<form id="login"><label>Admin-Schlüssel<input name="token" type="password" required autocomplete="off"></label><button class="primary">Öffnen</button></form></section></main>`;
  document.querySelector('#login').onsubmit = async event => { event.preventDefault(); token = new FormData(event.target).get('token').trim(); sessionStorage.setItem('gruppenzeit-token',token); await load(); };
}
async function load() {
  if (!token) return login();
  try { me = await api('/me'); [events,members] = await Promise.all([api('/events'),me.role==='admin'?api('/members'):Promise.resolve([])]); render(); }
  catch(error) { if (/Schlüssel|Einladungslink/.test(error.message)) {token='';sessionStorage.removeItem('gruppenzeit-token');} login(error.message); }
}
function render() {
  const year=month.getFullYear(), number=month.getMonth(), first=new Date(year,number,1), offset=(first.getDay()+6)%7, total=new Date(year,number+1,0).getDate();
  const days=['Mo','Di','Mi','Do','Fr','Sa','So'].map(day=>`<div class="weekday">${day}</div>`);
  for(let index=0;index<Math.ceil((offset+total)/7)*7;index++){
    const date=new Date(year,number,index-offset+1), key=dayKey(date), entries=events.filter(item=>dayKey(item.start)===key);
    days.push(`<button type="button" class="day ${date.getMonth()!==number?'other':''} ${key===dayKey(new Date())?'today':''} ${selected===key?'selected':''}" data-day="${key}" aria-label="${escapeHtml(date.toLocaleDateString('de-DE',{day:'numeric',month:'long'}))}, ${entries.length} Einträge"><b>${date.getDate()}</b>${entries.slice(0,2).map(item=>`<span class="dot">${escapeHtml(item.title)}</span>`).join('')}${entries.length>2?`<span class="dot">+${entries.length-2}</span>`:''}</button>`);
  }
  const filtered=events.filter(item=>!selected||dayKey(item.start)===selected).filter(item=>new Date(item.start)>=new Date(new Date().setHours(0,0,0,0))||Boolean(selected));
  const sorted=filtered.sort((a,b)=>a.start.localeCompare(b.start));
  app.innerHTML=`<header><div class="wrap"><strong>Gruppenzeit</strong><button class="secondary" id="logout">Abmelden</button></div></header><main class="wrap page"><section class="hero"><div><p class="eyebrow">${me.role==='admin'?'Verwaltung':'Hallo '+escapeHtml(me.name)}</p><h1>Gemeinsam planen.</h1><span class="muted">Termine, Anfragen und freie Zeiten auf einen Blick.</span></div></section>${message?`<div class="notice" role="status">${escapeHtml(message)}</div>`:''}<div class="toolbar"><button class="secondary" id="prev" aria-label="Vorheriger Monat">←</button><h2>${escapeHtml(first.toLocaleDateString('de-DE',{month:'long',year:'numeric'}))}</h2><button class="secondary" id="next" aria-label="Nächster Monat">→</button>${selected?'<button class="secondary" id="all">Alle kommenden</button>':''}</div><section class="calendar" aria-label="Kalender">${days.join('')}</section><h2>${selected?'Einträge am '+escapeHtml(new Date(selected+'T12:00:00').toLocaleDateString('de-DE',{day:'numeric',month:'long'})):'Kommende Einträge'}</h2><section class="events">${sorted.length?sorted.map(eventCard).join(''):'<div class="card empty">Hier gibt es noch keine Einträge.</div>'}</section>${me.role==='admin'?adminPanel():''}</main>`;
  bind();
}
function eventCard(item){const full=item.confirmed>=item.capacity && item.my_answer!=='ja';return `<article class="card event"><div class="datebox">${escapeHtml(new Date(item.start).toLocaleDateString('de-DE',{day:'2-digit',month:'short'}))}<small>${formatTime(item.start)}</small></div><div><div class="event-head"><h3>${escapeHtml(item.title)}</h3><span class="badge">${{termin:'Termin',anfrage:'Anfrage',slot:'Buchbarer Slot'}[item.kind]}</span></div><p>${formatTime(item.start)}–${formatTime(item.end)} Uhr · ${item.confirmed}/${item.capacity} Plätze zugesagt</p>${me.role==='member'?`<div class="responses" aria-label="Antwort für ${escapeHtml(item.title)}">${[['ja','Ich kann'],['vielleicht','Vielleicht'],['nein','Ich kann nicht']].map(([answer,label])=>`<button type="button" data-response="${item.id}" data-answer="${answer}" aria-pressed="${item.my_answer===answer}" ${answer==='ja'&&full?'disabled title="Ausgebucht"':''}>${label}</button>`).join('')}</div>`:''}</div></article>`;}
function adminPanel(){return `<div class="grid"><section class="card"><p class="eyebrow">Planung</p><h2>Eintrag erstellen</h2><form id="event-form" class="formgrid"><label class="full">Titel<input name="title" maxlength="120" required placeholder="Wer kann am Dienstag helfen?"></label><label>Art<select name="kind"><option value="anfrage">Anfrage</option><option value="termin">Termin</option><option value="slot">Buchbarer Slot</option></select></label><label>Plätze<input name="capacity" type="number" min="1" max="1000" value="1" required></label><label>Beginn<input name="start" type="datetime-local" required></label><label>Ende<input name="end" type="datetime-local" required></label><button class="primary full">Eintrag erstellen</button></form></section><section class="card"><p class="eyebrow">Gruppe</p><h2>Mitglieder</h2><form id="member-form"><label>Name<input name="name" maxlength="80" required placeholder="Vorname"></label><button class="primary">Einladen</button></form><div id="invite-link"></div><div>${members.map(member=>`<div class="member"><span>${escapeHtml(member.name)}</span><button class="secondary" data-renew="${member.id}" title="Alter Link wird ungültig">Link erneuern</button></div>`).join('')}</div></section></div>`;}
function showInvite(value){const url=location.origin+location.pathname+'#invite='+encodeURIComponent(value.token);const box=document.querySelector('#invite-link');box.innerHTML=`<div class="notice"><strong>Persönlichen Link jetzt kopieren:</strong><div class="linkbox"><code>${escapeHtml(url)}</code><button type="button" class="secondary" id="copy">Kopieren</button></div><small>Dieser Link wird nur jetzt angezeigt. Wer ihn besitzt, kann für dieses Mitglied antworten.</small></div>`;document.querySelector('#copy').onclick=async()=>{await navigator.clipboard.writeText(url);document.querySelector('#copy').textContent='Kopiert';};}
function bind(){document.querySelector('#logout').onclick=()=>{token='';sessionStorage.removeItem('gruppenzeit-token');me=null;login();};document.querySelector('#prev').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);selected=null;render();};document.querySelector('#next').onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);selected=null;render();};document.querySelector('#all')?.addEventListener('click',()=>{selected=null;render();});document.querySelectorAll('[data-day]').forEach(button=>button.onclick=()=>{selected=button.dataset.day;render();});document.querySelectorAll('[data-response]').forEach(button=>button.onclick=async()=>{try{await api('/events/'+button.dataset.response+'/response',{method:'PUT',body:JSON.stringify({answer:button.dataset.answer})});message='Deine Antwort wurde gespeichert.';events=await api('/events');render();}catch(error){message=error.message;render();}});
  document.querySelector('#event-form')?.addEventListener('submit',async e=>{e.preventDefault();const data=new FormData(e.target);try{await api('/events',{method:'POST',body:JSON.stringify({title:data.get('title'),kind:data.get('kind'),capacity:Number(data.get('capacity')),start:new Date(data.get('start')).toISOString(),end:new Date(data.get('end')).toISOString()})});message='Eintrag erstellt.';events=await api('/events');month=new Date(data.get('start'));month.setDate(1);render();}catch(error){message=error.message;render();}});
  document.querySelector('#member-form')?.addEventListener('submit',async e=>{e.preventDefault();try{const result=await api('/members',{method:'POST',body:JSON.stringify({name:new FormData(e.target).get('name')})});members=await api('/members');message='Mitglied angelegt.';render();showInvite(result);}catch(error){message=error.message;render();}});
  document.querySelectorAll('[data-renew]').forEach(button=>button.onclick=async()=>{if(!confirm('Der bisherige Link wird sofort ungültig. Neuen Link erzeugen?'))return;try{const result=await api('/members/'+button.dataset.renew+'/renew',{method:'POST',body:'{}'});message='Link erneuert.';render();showInvite(result);}catch(error){message=error.message;render();}});
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
load();
