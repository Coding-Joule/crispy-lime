
const TRACKED=[...Array(20)].map((_,i)=>i+11);
const KEY="crispyLimeyEngineV1";
let state;

const clone=x=>JSON.parse(JSON.stringify(x));
function laToday(){
  const p=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Los_Angeles",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const m=Object.fromEntries(p.map(x=>[x.type,x.value]));
  return `${m.year}-${m.month}-${m.day}`;
}
const dateObj=s=>new Date(`${s}T12:00:00`);
const daysInclusive=(a,b)=>Math.floor((dateObj(b)-dateObj(a))/86400000)+1;
const futureDays=t=>Math.max(0,daysInclusive(t,state.settings.campaignDeadline)-1);
const pretty=s=>new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",timeZone:"America/Los_Angeles"}).format(dateObj(s));
const fmt=(n,d=3)=>Number.isFinite(n)?Number(n).toFixed(d).replace(/0+$/,"").replace(/\.$/,""):"∞";

async function load(){
  const saved=localStorage.getItem(KEY);
  if(saved){try{state=JSON.parse(saved)}catch{}}
  if(!state) state=await fetch("initial_state.json").then(r=>r.json());
  save(false); render();
}
function save(doRender=true){localStorage.setItem(KEY,JSON.stringify(state)); if(doRender)render()}

function remChapter(ch){return TRACKED.filter(n=>!ch.completed.includes(n)&&!ch.permanentSkipped.includes(n)).length}
function invRemaining(){return state.chapters.reduce((s,c)=>s+remChapter(c),0)}
function remCat(cat){return state.chapters.filter(c=>c.category===cat).reduce((s,c)=>s+remChapter(c),0)}
function logFor(date,create=true){
  let d=state.dailyLog.find(x=>x.date===date);
  if(!d&&create){d={date,events:[]};state.dailyLog.push(d)}
  return d;
}
function counted(date){
  const d=logFor(date,false); if(!d)return 0;
  return d.events.filter(e=>e.counted&&["done","permanent-skip"].includes(e.type)).length;
}
function cpRemaining(){
  const cp=state.campaignCheckpoint;
  const n=state.dailyLog.filter(d=>d.date>cp.date).flatMap(d=>d.events).filter(e=>e.counted&&["done","permanent-skip"].includes(e.type)).length;
  return cp.remainingAfterDay-n;
}
function audit(){return {inventory:invRemaining(),checkpoint:cpRemaining(),ok:invRemaining()===cpRemaining()}}
function rawAvg(t=laToday()){return invRemaining()/daysInclusive(t,state.settings.campaignDeadline)}
function safeTarget(t=laToday()){return Math.ceil(rawAvg(t))}
function futureAvg(t=laToday()){const d=futureDays(t);return d?invRemaining()/d:(invRemaining()?Infinity:0)}
function startRemain(t=laToday()){return invRemaining()+counted(t)}
function tomorrowNeed(t=laToday()){return Math.max(0,startRemain(t)-futureDays(t)*safeTarget(t))}
function buffer(t=laToday()){return futureDays(t)*safeTarget(t)-invRemaining()}
function zeroDays(t=laToday()){const s=safeTarget(t);return s?Math.max(0,Math.floor(buffer(t)/s)):0}
function sixFrontier(t=laToday()){return Math.max(0,invRemaining()-6*futureDays(t))}
function iPad(){return remCat("RACE")===0&&remCat("CRISP")===0}

function raceInfo(t=laToday()){
  const rs=state.chapters.filter(c=>c.category==="RACE"&&remChapter(c)>0);
  const dated=rs.filter(c=>c.due);
  if(!dated.length)return {remaining:remCat("RACE"),pressure:null,due:null,tent:false};
  const due=dated.map(c=>c.due).sort()[0];
  const same=dated.filter(c=>c.due===due);
  const r=same.reduce((s,c)=>s+remChapter(c),0);
  const d=Math.max(1,daysInclusive(t,due));
  return {remaining:r,pressure:r/d,due,tent:same.some(c=>c.dueTentative)}
}
function binding(t=laToday()){const r=raceInfo(t).pressure;return r!=null&&r>rawAvg(t)?"RACE":"Campaign"}

function parseProblem(s){
  const m=s.trim().toUpperCase().match(/^([A-Z]+\d*)\.(\d+)$/);
  return m?{id:m[1],n:Number(m[2])}:null
}
function ch(id){return state.chapters.find(c=>c.id===id)}
function add(type){
  const p=parseProblem(document.getElementById("problem").value);
  if(!p||!TRACKED.includes(p.n)||!ch(p.id)){alert("Use something like NT5.21 or A5.24.");return}
  const c=ch(p.id),date=document.getElementById("eventDate").value||laToday(),parts=document.getElementById("parts").value.trim();
  let countedFlag=false;
  if(type==="done"){
    if(!c.completed.includes(p.n)&&!c.permanentSkipped.includes(p.n)){c.completed.push(p.n);countedFlag=true}
    c.unresolvedSkipped=c.unresolvedSkipped.filter(n=>n!==p.n)
  }else if(type==="part"){
    countedFlag=false
  }else if(type==="skip"){
    if(!c.unresolvedSkipped.includes(p.n)&&!c.completed.includes(p.n))c.unresolvedSkipped.push(p.n)
  }else if(type==="permanent-skip"){
    if(!c.completed.includes(p.n)&&!c.permanentSkipped.includes(p.n)){c.permanentSkipped.push(p.n);countedFlag=true}
    c.unresolvedSkipped=c.unresolvedSkipped.filter(n=>n!==p.n)
  }
  logFor(date).events.push({type,problem:`${p.id}.${p.n}`,parts:parts||undefined,counted:countedFlag,ts:new Date().toISOString()});
  save()
}
function undoLast(){
  const all=state.dailyLog.flatMap(d=>d.events.map((e,i)=>({d,i,e}))).sort((a,b)=>(a.e.ts||a.d.date).localeCompare(b.e.ts||b.d.date));
  const x=all.at(-1); if(!x)return;
  const p=parseProblem(x.e.problem),c=p&&ch(p.id);
  if(c&&x.e.counted&&x.e.type==="done")c.completed=c.completed.filter(n=>n!==p.n);
  if(c&&x.e.counted&&x.e.type==="permanent-skip")c.permanentSkipped=c.permanentSkipped.filter(n=>n!==p.n);
  if(c&&x.e.type==="skip")c.unresolvedSkipped=c.unresolvedSkipped.filter(n=>n!==p.n);
  x.d.events.splice(x.i,1); save()
}
function setCategory(id,cat){const c=ch(id);if(!c)return;c.category=cat;c.assigned=cat!=="FUTURE";save()}
function applyShock(i){
  const s=state.plannedShocks[i]; if(!s||s.applied)return;
  if(!confirm(`Move ${s.chapters.join(" + ")} FUTURE → RACE? Campaign total will stay unchanged.`))return;
  s.chapters.forEach(id=>{const c=ch(id);c.category="RACE";c.assigned=true});
  s.applied=true;s.appliedDate=laToday();save()
}

function metrics(){
  const t=laToday(),r=raceInfo(t);
  const data=[
    ["Campaign",invRemaining(),`${daysInclusive(t,state.settings.campaignDeadline)} days incl. today`],
    ["Raw avg",fmt(rawAvg(t)),`safe ${safeTarget(t)}/day`],
    ["Future avg",fmt(futureAvg(t)),`${futureDays(t)} untouched future days`],
    ["RACE",remCat("RACE"),r.pressure!=null?`${fmt(r.pressure,2)}/day to ${pretty(r.due)}${r.tent?"*":""}`:"no dated pressure"],
    ["Today",counted(t),`tomorrow-proof threshold ${tomorrowNeed(t)}`],
    ["Buffer",buffer(t),`${zeroDays(t)} zero-day(s)`]
  ];
  document.getElementById("metrics").innerHTML=data.map(x=>`<div class="card"><div class="label">${x[0]}</div><div class="value">${x[1]}</div><div class="small">${x[2]}</div></div>`).join("");
  document.getElementById("binding").textContent=binding(t);
  document.getElementById("six").textContent=sixFrontier(t);
  document.getElementById("ipad").textContent=iPad()?"UNLOCKED 📱":"locked";
  const a=audit(),el=document.getElementById("audit");
  el.textContent=a.ok?`Audit OK: ${a.inventory} = ${a.checkpoint}`:`RECONCILE: inventory ${a.inventory}, checkpoint model ${a.checkpoint}`;
  el.style.color=a.ok?"var(--green)":"var(--danger)"
}
function chapterHTML(c){
  const rem=remChapter(c);
  const sq=TRACKED.map(n=>`<span class="sq ${c.completed.includes(n)?"done":c.permanentSkipped.includes(n)?"perm":c.unresolvedSkipped.includes(n)?"skip":""}" title="${c.id}.${n}"></span>`).join("");
  return `<div class="chapter"><div class="chapter-head"><div><strong>${c.label}</strong><div class="small">${c.topic||""}</div></div><div><strong>${20-rem}/20</strong><div class="small">${rem} left</div></div></div><div class="squares">${sq}</div><div class="small" style="margin-top:6px">11–20 quick · 21–30 show-your-work</div><div class="actions">${["RACE","CRISP","FUTURE"].map(k=>`<button class="btn" onclick="setCategory('${c.id}','${k}')">${k}</button>`).join("")}</div></div>`
}
function chapters(){
  document.getElementById("chapters").innerHTML=["RACE","CRISP","FUTURE"].map(cat=>`<div class="card"><h2 class="section"><span class="${cat}">${cat}</span> · ${remCat(cat)}</h2>${state.chapters.filter(c=>c.category===cat).map(chapterHTML).join("")||'<div class="small">Nothing here.</div>'}</div>`).join("")
}
function history(){
  const cp=state.campaignCheckpoint; let r=cp.remainingAfterDay;
  const pts=[{date:cp.date,r,done:0,avg:r/futureDays(cp.date)}];
  state.dailyLog.filter(d=>d.date>cp.date).sort((a,b)=>a.date.localeCompare(b.date)).forEach(d=>{
    const n=d.events.filter(e=>e.counted&&["done","permanent-skip"].includes(e.type)).length;r-=n;
    const fd=futureDays(d.date);pts.push({date:d.date,r,done:n,avg:fd?r/fd:0})
  });return pts
}
function chart(){
  const pts=history(),svg=document.getElementById("chart"),W=760,H=310,L=50,R=18,T=20,B=42;
  const vals=pts.map(p=>p.avg),mn=Math.min(...vals)-.15,mx=Math.max(...vals)+.15;
  const x=i=>L+(W-L-R)*(pts.length===1?.5:i/(pts.length-1)),y=v=>T+(H-T-B)*(mx-v)/(mx-mn||1);
  let o="";
  for(let k=0;k<=4;k++){const v=mn+(mx-mn)*k/4,yy=y(v);o+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="var(--line)" stroke-dasharray="3 5"/><text x="${L-8}" y="${yy+4}" text-anchor="end" font-size="11" fill="var(--muted)">${v.toFixed(2)}</text>`}
  o+=`<polyline fill="none" stroke="var(--green)" stroke-width="3" points="${pts.map((p,i)=>`${x(i)},${y(p.avg)}`).join(" ")}"/>`;
  pts.forEach((p,i)=>o+=`<circle cx="${x(i)}" cy="${y(p.avg)}" r="5" fill="#fff" stroke="var(--green)" stroke-width="3"/><text x="${x(i)}" y="${H-14}" text-anchor="middle" font-size="11" fill="var(--muted)">${pretty(p.date)}</text>`);
  svg.innerHTML=o
}
function shocks(){document.getElementById("shocks").innerHTML=state.plannedShocks.map((s,i)=>`<div class="shock"><strong>${pretty(s.date)} · ${s.chapters.join(" + ")}</strong><div>${s.count} may move FUTURE → RACE; campaign total stays unchanged.</div><div class="small">${s.note}</div><div class="actions"><button class="btn" onclick="applyShock(${i})" ${s.applied?"disabled":""}>${s.applied?"APPLIED":"Apply when confirmed"}</button></div></div>`).join("")}
function logs(){
  document.getElementById("log").innerHTML=[...state.dailyLog].sort((a,b)=>b.date.localeCompare(a.date)).map(d=>{
    const n=d.events.filter(e=>e.counted&&["done","permanent-skip"].includes(e.type)).length;
    return `<div class="log-row"><div><strong>${pretty(d.date)}</strong><div class="small">${d.events.map(e=>e.problem+(e.parts?`(${e.parts})`:"")).join(", ")}</div></div><strong>${n}</strong></div>`
  }).join("")
}
function render(){document.getElementById("today").textContent=pretty(laToday());document.getElementById("eventDate").value=laToday();metrics();chapters();chart();shocks();logs()}

function exportState(){const b=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`crispy-limey-${laToday()}.json`;a.click()}
function importStateFile(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);save()}catch{alert("Bad JSON")}};r.readAsText(f)}
async function resetState(){if(!confirm("Reset to bundled Aug 15 checkpoint?"))return;state=await fetch("initial_state.json").then(r=>r.json());save()}

Object.assign(window,{setCategory,applyShock,undoLast,exportState,importStateFile,resetState});
document.addEventListener("DOMContentLoaded",async()=>{
  await load();
  document.getElementById("lime").onclick=()=>add("done");
  document.getElementById("part").onclick=()=>add("part");
  document.getElementById("skip").onclick=()=>add("skip");
  document.getElementById("perm").onclick=()=>add("permanent-skip")
});
