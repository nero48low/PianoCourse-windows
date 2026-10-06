'use strict';
const T=window.__TAURI__;
const NAMES=['Do','Do♯','Re','Re♯','Mi','Fa','Fa♯','Sol','Sol♯','La','La♯','Si'];
const nm=n=>NAMES[((n%12)+12)%12];
const $=s=>document.querySelector(s);
const view=$('#view'), modal=$('#modal');
const isBlack=n=>[1,3,6,8,10].includes(((n%12)+12)%12);
const show=h=>{view.innerHTML=h;};
let prog={lessons:{}};

// ---------- audio
let AC=null;
function ac(){if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC;}
function beep(f,d=.5,v=.15,type='triangle'){const a=ac(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+d);}
const tone=(n,d=.6)=>beep(440*2**((n-69)/12),d);

// ---------- input (MIDI da Rust + tastiera PC)
const down=new Set(), wrong=new Map(); let handler=null;
function noteEvent(on,n){
  if(on){if(down.has(n))return;down.add(n);tone(n);}else down.delete(n);
  if(handler)handler(on,n);
}
if(T)T.event.listen('midi',e=>noteEvent(e.payload.kind==='on',e.payload.note));
const KEYS='awsedftgyhujkolp'; let kbBase=60; const held={};
addEventListener('keydown',e=>{
  if(e.repeat||e.target.tagName==='INPUT')return;
  if(e.key==='z')kbBase-=12; if(e.key==='x')kbBase+=12;
  const i=KEYS.indexOf(e.key); if(i>=0&&!held[e.key]){held[e.key]=kbBase+i;noteEvent(true,held[e.key]);}
});
addEventListener('keyup',e=>{if(held[e.key]!==undefined){noteEvent(false,held[e.key]);delete held[e.key];}});

// ---------- loop e disegno
let raf=0;
function loop(fn){cancelAnimationFrame(raf);const f=t=>{fn(t);raf=requestAnimationFrame(f);};raf=requestAnimationFrame(f);}
const stopLoop=()=>cancelAnimationFrame(raf);
function mkCanvas(W,H){const c=document.createElement('canvas');c.width=W;c.height=H;$('#cvwrap').replaceChildren(c);return c;}
function range(steps){
  const ns=steps.flatMap(s=>s.notes);let lo=Math.min(...ns)-4,hi=Math.max(...ns)+4;
  while(hi-lo<24){hi++;if(hi-lo<24)lo--;}
  while(isBlack(lo))lo--;while(isBlack(hi))hi++;return [lo,hi];
}
function layout(lo,hi,W){
  const whites=[];for(let n=lo;n<=hi;n++)if(!isBlack(n))whites.push(n);
  const ww=W/whites.length,pos={};
  whites.forEach((n,i)=>pos[n]={x:i*ww,w:ww,b:false});
  for(let n=lo;n<=hi;n++)if(isBlack(n)){const p=pos[n-1];pos[n]={x:(p?p.x+p.w:0)-ww*.3,w:ww*.6,b:true};}
  return pos;
}
function keyColor(n){const e=wrong.get(n);if(e&&e>performance.now())return '#e5484d';if(down.has(n))return '#6e8bff';return null;}
function drawKeys(ctx,pos,y,h,colorOf){
  for(const n in pos){const p=pos[n];if(p.b)continue;ctx.fillStyle=colorOf(+n)||'#e8e8f0';ctx.fillRect(p.x+1,y,p.w-2,h);}
  for(const n in pos){const p=pos[n];if(!p.b)continue;ctx.fillStyle=colorOf(+n)||'#15151f';ctx.fillRect(p.x,y,p.w,h*.62);}
}
function drawFalling(ctx,W,H,pos,steps,beat,st){
  const kb=110,hit=H-kb,ppb=120;
  ctx.fillStyle='#0d0d14';ctx.fillRect(0,0,W,H);
  for(const n in pos){const p=pos[n];if(!p.b){ctx.fillStyle='#ffffff10';ctx.fillRect(p.x,0,1,hit);}}
  steps.forEach((s,i)=>{if(st.hide(i))return;s.notes.forEach(n=>{
    const p=pos[n];if(!p)return;
    const yb=hit-(s.beat-beat)*ppb,yt=yb-s.dur*ppb;if(yb<0||yt>hit)return;
    const a=Math.max(yt,0),b=Math.min(yb,hit);
    ctx.fillStyle=st.done[i]?'#2fb36b':'#8b5cf6';ctx.fillRect(p.x+2,a,p.w-4,b-a);
  });});
  ctx.fillStyle='#ffffff55';ctx.fillRect(0,hit,W,2);
  drawKeys(ctx,pos,hit+2,kb-2,keyColor);
}
function drawRoll(ctx,W,H,lo,hi,steps,beat,st){
  const px=120,ppb=90,top=8,rows=hi-lo+1,rh=(H-top)/rows;
  const X=b=>px+(b-beat)*ppb,Y=n=>top+(hi-n)*rh;
  ctx.fillStyle='#0d0d14';ctx.fillRect(0,0,W,H);
  ctx.font='11px sans-serif';
  for(let n=lo;n<=hi;n++){
    ctx.fillStyle=isBlack(n)?'#10101a':'#161622';ctx.fillRect(0,Y(n),W,rh-1);
    if(n%12===0){ctx.fillStyle='#8a8aa3';ctx.fillText(nm(n)+(Math.floor(n/12)-1),8,Y(n)+rh-3);}
  }
  for(let b=Math.floor(beat-px/ppb);b<=beat+(W-px)/ppb;b++){ctx.fillStyle=b%4===0?'#ffffff33':'#ffffff14';ctx.fillRect(X(b),top,1,H-top);}
  steps.forEach((s,i)=>{if(!st.done[i])return;s.notes.forEach(n=>{ctx.strokeStyle='#2fb36b';ctx.strokeRect(X(s.beat)+.5,Y(n)+1,s.dur*ppb,rh-2);});});
  st.played.forEach(p=>{const e=p.off==null?beat:p.off;ctx.fillStyle='#6e8bff';ctx.fillRect(X(p.on),Y(p.n)+1,Math.max(4,(e-p.on)*ppb),rh-2);});
  ctx.fillStyle='#fff';ctx.fillRect(px,top,2,H-top);
}

// ---------- spiegazioni errori (calcolate dalla teoria)
const pcList=s=>s.notes.map(nm).join(' – ');
function explainWrong(s,n){
  const iv=((n%12)-s.root+12)%12;
  const minor3=s.pcs.includes((s.root+3)%12), major3=s.pcs.includes((s.root+4)%12);
  const head=`Hai suonato <b>${nm(n)}</b> su ${s.name} (${pcList(s)}).`;
  if(iv===4&&minor3)return head+` È la terza <b>maggiore</b>: nell'accordo minore la terza è un semitono più in basso, cioè <b>${nm(s.root+3)}</b>.`;
  if(iv===3&&major3)return head+` È la terza <b>minore</b>: nell'accordo maggiore la terza è un semitono più in alto, cioè <b>${nm(s.root+4)}</b>.`;
  if(iv===6||iv===8)return head+` Non è la quinta giusta: sta a 7 semitoni dalla fondamentale, cioè <b>${nm(s.root+7)}</b>.`;
  return head+` Questa nota non fa parte dell'accordo: fondamentale, terza e quinta sono ${pcList(s)}.`;
}
function explainMiss(s,miss,none){
  if(none)return `Non hai suonato <b>${s.name}</b> in tempo. Segui il metronomo: l'accordo va suonato sul battito.`;
  return `Per ${s.name} mancavano: <b>${miss.map(nm).join(', ')}</b>. Una triade ha tre note (${pcList(s)}) da suonare insieme, sul battito.`;
}

// ---------- una passata di pratica
function runPass(steps,o){
  return new Promise(res=>{
    const [lo,hi]=range(steps),W=900,H=460;
    const cv=mkCanvas(W,H),ctx=cv.getContext('2d'),pos=layout(lo,hi,W);
    const spb=60/o.bpm,lead=o.wait?-3:-4;
    let beat=lead,last=performance.now(),cur=0,lastClick=lead-1,over=false;
    const done=steps.map(()=>false),got=steps.map(()=>new Set()),played=[],offs=[];
    const st={done,played,hide:o.hide||(()=>false)};
    const end=r=>{if(over)return;over=true;handler=null;stopLoop();res(r);};
    handler=(on,n)=>{
      if(over)return;
      if(!on){const p=[...played].reverse().find(p=>p.n===n&&p.off==null);if(p)p.off=beat;return;}
      if(!o.wait&&beat<-.4)return;
      played.push({n,on:beat,off:null});
      const i=o.wait?cur:steps.findIndex((s,k)=>!done[k]&&beat>=s.beat-.4&&beat<=s.beat+.6);
      if(i<0||i>=steps.length)return;
      const s=steps[i];
      if(!s.pcs.includes(n%12)){wrong.set(n,performance.now()+700);return end({error:explainWrong(s,n),step:s.src});}
      got[i].add(n%12);
      if(s.pcs.every(p=>got[i].has(p))){
        done[i]=true;offs.push(beat-s.beat);if(o.wait)cur++;
        if(done.every(Boolean))setTimeout(()=>end({done:true,offs}),500);
      }
    };
    loop(now=>{
      const dt=Math.max(0,(now-last)/1000);last=now;
      if(!over){
        let nb=beat+dt/spb;
        if(o.wait&&cur<steps.length)nb=Math.min(nb,steps[cur].beat);
        beat=nb;
        if(!o.wait){
          const k=Math.floor(beat);
          if(k>lastClick){lastClick=k;beep(k%4===0?1600:1100,.05,.08,'square');}
          const mi=steps.findIndex((s,j)=>!done[j]&&beat>s.beat+.6);
          if(mi>=0){const s=steps[mi];return end({error:explainMiss(s,s.pcs.filter(p=>!got[mi].has(p)),got[mi].size===0),step:s.src});}
        }
      }
      if(o.roll)drawRoll(ctx,W,H,lo,hi,steps,beat,st);else drawFalling(ctx,W,H,pos,steps,beat,st);
      if(!o.wait&&beat<0){ctx.fillStyle='#fff';ctx.font='bold 80px sans-serif';ctx.textAlign='center';ctx.fillText(Math.ceil(-beat),W/2,H/2);}
    });
  });
}

// ---------- UI di supporto
function popup(title,html,btn){
  return new Promise(r=>{
    modal.hidden=false;
    modal.innerHTML=`<div class="card"><h2>${title}</h2><p>${html}</p><button id="mok" class="primary">${btn}</button></div>`;
    $('#mok').onclick=()=>{modal.hidden=true;r();};
  });
}
async function practice(title,hint,steps,o,E){
  for(;;){
    show(`<h2>${title}</h2><p class="hint">${hint}</p><div id="cvwrap"></div>`);
    const r=await runPass(steps,o);
    if(r.done)return r;
    E.set.add(r.step);E.n++;
    await popup('Errore',r.error,'Ricomincia da capo');
  }
}
function theory(L,steps){
  return new Promise(r=>{
    show(`<h2>${L.title}</h2>${L.theory.map(p=>`<p>${p}</p>`).join('')}<div>${L.demo.map((d,i)=>`<button class="demo" data-i="${i}">▶ ${d.label}</button> `).join('')}</div><div id="cvwrap"></div><button id="go" class="primary">Passa alla pratica →</button>`);
    const [lo,hi]=range(steps),W=900,cv=mkCanvas(W,150),ctx=cv.getContext('2d'),pos=layout(lo,hi,W),lit=new Set();
    document.querySelectorAll('.demo').forEach(b=>b.onclick=()=>{
      const d=L.demo[+b.dataset.i];
      d.notes.forEach((n,k)=>setTimeout(()=>tone(n,.8),k*260));
      setTimeout(()=>{d.notes.forEach(n=>{tone(n,1.4);lit.add(n);});setTimeout(()=>lit.clear(),1400);},900);
    });
    loop(()=>{ctx.fillStyle='#0d0d14';ctx.fillRect(0,0,W,150);drawKeys(ctx,pos,0,150,n=>lit.has(n)?'#8b5cf6':keyColor(n));});
    $('#go').onclick=()=>{stopLoop();r();};
  });
}
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/♯/g,'#').replace(/\s*diesis/g,'#').replace(/[.,;:!?"]/g,'').replace(/\s+/g,' ').trim();
const match=(q,a)=>{a=' '+norm(a)+' ';return q.accept.some(x=>a.includes(' '+norm(x)+' '));};
async function quiz(L){
  let score=0;
  for(const [i,q] of L.quiz.entries()){
    show(`<h2>Test · domanda ${i+1}/${L.quiz.length}</h2><div class="card"><p>${q.q}</p>${q.type==='mc'?q.options.map((o,k)=>`<button class="opt" data-i="${k}">${o}</button>`).join(''):'<input id="ans" size="30"> <button id="send" class="primary">Invia</button>'}</div><div id="fb"></div>`);
    const ok=await new Promise(r=>{
      if(q.type==='mc')document.querySelectorAll('.opt').forEach(b=>b.onclick=()=>r(+b.dataset.i===q.answer));
      else{const go=()=>r(match(q,$('#ans').value));$('#send').onclick=go;$('#ans').onkeydown=e=>{if(e.key==='Enter')go();};$('#ans').focus();}
    });
    const final=await new Promise(r=>{
      $('#fb').innerHTML=`<p class="${ok?'good':'bad'}">${ok?'Giusto!':'Sbagliato.'} ${q.why}</p>${!ok&&q.type==='open'?'<button id="ovr">La mia risposta era giusta</button> ':''}<button id="nx" class="primary">Avanti</button>`;
      $('#nx').onclick=()=>r(ok);if($('#ovr'))$('#ovr').onclick=()=>r(true);
    });
    if(final)score++;
  }
  return score;
}

// ---------- lezione: teoria → pratica guidata (3) → test → pratica libera → ripasso errori
async function playLesson(L){
  const steps=L.pattern.steps.map((s,i)=>({...s,src:i,pcs:s.notes.map(n=>n%12)}));
  const bpm=L.pattern.bpm,E={set:new Set(),n:0},offs=[];
  await theory(L,steps);
  const passes=[
    ['Passaggio 1/3 · tutte le note','Suona gli accordi quando arrivano sulla tastiera. Il tempo si ferma finché non suoni.',{wait:true}],
    ['Passaggio 2/3 · meno note','Alcuni accordi spariscono: ricordali. Segui il metronomo.',{hide:i=>i%2===1}],
    ['Passaggio 3/3 · a memoria','Nessuna nota sullo schermo. Suona il pattern a memoria, a tempo.',{hide:()=>true}]
  ];
  for(const [t,h,o] of passes){
    const r=await practice(t,h,steps,{bpm,...o},E);
    if(r.offs)offs.push(...r.offs);
    await popup('Passaggio superato','Bene, avanti.','Avanti');
  }
  const score=await quiz(L);
  const r=await practice('Pratica libera · piano roll','Niente note che cadono: suona sul roll il pattern che hai ripassato.',steps,{bpm,roll:true,hide:()=>true},E);
  offs.push(...r.offs);
  if(E.set.size){
    const rev=[...E.set].map((src,k)=>({...steps[src],beat:k*2}));
    await popup('Ripasso errori',`Hai sbagliato ${E.n} volte. Ora rifai gli accordi in cui hai sbagliato.`,'Inizia');
    await practice('Ripasso degli errori','Suona gli accordi che ti hanno dato problemi.',rev,{bpm,wait:true},E);
  }
  const avg=offs.length?(offs.reduce((a,b)=>a+Math.abs(b),0)/offs.length).toFixed(2):'–';
  prog.lessons[L.id]={quiz:score,errors:E.n};await store.save(prog);
  show(`<h2>Lezione completata</h2><div class="card"><p>Test: <b>${score}/${L.quiz.length}</b></p><p>Errori nella pratica: <b>${E.n}</b></p><p>Scarto medio dal tempo: <b>${avg}</b> battiti</p></div><button class="primary" id="back">Torna alle lezioni</button>`);
  $('#back').onclick=home;
}

// ---------- salvataggio, home, MIDI
const store={
  async load(){try{return T?JSON.parse(await T.core.invoke('load_progress')):JSON.parse(localStorage.getItem('pc')||'{}');}catch(e){return {};}},
  async save(d){try{if(T)await T.core.invoke('save_progress',{data:JSON.stringify(d)});else localStorage.setItem('pc',JSON.stringify(d));}catch(e){}}
};
function home(){
  stopLoop();handler=null;
  show(`<h2>Corso di piano</h2>${LESSONS.map((L,i)=>{const p=prog.lessons[L.id];return `<div class="card lesson"><div><small class="hint">${L.course}</small><br><b>${L.title}</b></div><span>${p?`✓ ${p.quiz}/${L.quiz.length} `:''}<button class="primary go" data-i="${i}">Inizia</button></span></div>`;}).join('')}`);
  document.querySelectorAll('.go').forEach(b=>b.onclick=()=>playLesson(LESSONS[+b.dataset.i]));
}
async function connect(){
  try{$('#midiState').textContent='● '+await T.core.invoke('connect',{index:+$('#ports').value});}
  catch(e){$('#midiState').textContent='Errore MIDI: '+e;}
}
async function refreshPorts(){
  const sel=$('#ports');
  if(!T){sel.hidden=true;$('#refresh').hidden=true;$('#midiState').textContent='Browser: tastiera PC (A W S E D F T G Y H U J K O L P, Z/X = ottava)';return;}
  const list=await T.core.invoke('list_ports');
  sel.innerHTML=list.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
  if(list.length){const m=list.findIndex(n=>/mpk/i.test(n));sel.value=m>=0?m:0;await connect();}
  else $('#midiState').textContent='Nessun dispositivo MIDI (puoi usare la tastiera del PC)';
}
$('#refresh').onclick=refreshPorts;$('#ports').onchange=connect;$('#homeBtn').onclick=home;
(async()=>{prog=Object.assign({lessons:{}},await store.load());await refreshPorts();home();})();
