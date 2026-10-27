import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getDatabase,ref,onValue,query,limitToLast} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {firebaseConfig,OFFLINE_AFTER_MS,SECTION_NAME} from "./config.js";
const $=i=>document.getElementById(i), fmt=t=>t?new Date(t).toLocaleString("en-IN"):"—";
$("sec").textContent=SECTION_NAME+" · ESP32-CAM NODE";
// ---- landing animation ----
const cv=$("rails"),x=cv.getContext("2d");let T=0,run=true;
function draw(){if(!run)return;const w=cv.width=innerWidth,h=cv.height=innerHeight,vx=w/2,vy=h*.42;T+=.012;x.clearRect(0,0,w,h);
x.strokeStyle="#9aa7ab";x.lineWidth=2;for(const s of[-1,1]){x.beginPath();x.moveTo(vx+s*8,vy);x.lineTo(vx+s*w*.42,h);x.stroke()}
for(let i=0;i<14;i++){const p=((i/14+T)%1)**2.2,y=vy+(h-vy)*p,half=8+(w*.42-8)*p+14*p;x.strokeStyle="rgba(255,176,0,"+(.15+p*.5)+")";x.lineWidth=1+p*5;x.beginPath();x.moveTo(vx-half-10*p,y);x.lineTo(vx+half+10*p,y);x.stroke()}
const g=x.createRadialGradient(vx,vy,0,vx,vy,120);g.addColorStop(0,"rgba(255,176,0,.9)");g.addColorStop(1,"transparent");x.fillStyle=g;x.fillRect(vx-120,vy-120,240,240);requestAnimationFrame(draw)}
const L=["> power-on self test .......... OK","> wireless link to ESP32-CAM ... scanning","> opening realtime database ... asia-southeast1","> arming obstacle watch ........ ONLINE"];
function boot(){if(sessionStorage.seen){$("boot").remove();document.body.classList.remove("booting");return}
draw();L.forEach((t,i)=>setTimeout(()=>$("log").textContent+=t+"\n",700+i*600));
setTimeout(()=>{$("boot").classList.add("out");sessionStorage.seen=1;setTimeout(()=>{run=false;$("boot").remove()},1000)},3600)}boot();
// ---- live data ----
const db=getDatabase(initializeApp(firebaseConfig));let off=0,st=null,feedOn=true,lastFrameTs=0,first=true,seen=new Set();
onValue(ref(db,".info/serverTimeOffset"),s=>off=s.val()||0);
onValue(ref(db,"track/status"),s=>{st=s.val();render()});
onValue(ref(db,"track/live"),s=>{const v=s.val();if(!v||!v.frame)return;lastFrameTs=v.ts;$("frame").src="data:image/jpeg;base64,"+v.frame;$("ftime").textContent=fmt(v.ts);paintFeed()});
function paintFeed(){const has=$("frame").src&&lastFrameTs;$("frame").style.display=feedOn&&has?"block":"none";$("nofeed").style.display=feedOn&&has?"none":"grid"}
$("vt").onclick=()=>{feedOn=!feedOn;$("vt").textContent=feedOn?"HIDE FEED":"SHOW FEED";paintFeed()};
const tween=(el,to,suf="")=>{const f=parseFloat(el.dataset.v||0);if(f===to)return;el.dataset.v=to;const t0=performance.now();(function s(t){const k=Math.min(1,(t-t0)/500);el.textContent=Math.round(f+(to-f)*k)+suf;if(k<1)requestAnimationFrame(s)})(t0)};
function render(){const now=Date.now()+off,on=st&&now-st.lastSeen<OFFLINE_AFTER_MS;
document.body.classList.toggle("offline",!on);const c=$("link");c.className="chip "+(on?"on":"off");c.lastChild.textContent=on?"DEVICE ONLINE":"DEVICE OFFLINE";
$("stale").classList.toggle("hide",!!on);if(!st){$("stale").textContent="⚠ NO DATA RECEIVED YET FROM THE DEVICE";$("stale").classList.remove("hide");return}
if(!on)$("stale").textContent="⚠ CAUTION: DEVICE IS OFFLINE. Values shown are OLD — last recorded "+fmt(st.lastSeen);
const det=on&&st.detected;$("alert").classList.toggle("hide",!det);if(det)$("alert").textContent="⚠ OBSTACLE ON TRACK: "+String(st.label).toUpperCase()+" ("+Math.round(st.conf*100)+"%) — ALERT CONTROL ROOM";
$("l-g").className=on&&!det&&!st.trigger?"g":"";$("l-a").className=on&&!det&&st.trigger?"a":"";$("l-r").className=det?"r":"";
$("aspect").textContent=!on?"NO SIGNAL":det?"DANGER — STOP":st.trigger?"CAUTION — OBJECT NEAR":"TRACK CLEAR";
document.querySelector(".track").classList.toggle("hot",!!det);
const cb=$("cbadge");cb.textContent=!on?"OFFLINE":st.camera?"● LIVE":"STANDBY";cb.className="badge"+(on&&st.camera?" live":"");
const cf=Math.round((st.conf||0)*100);$("ring").style.strokeDashoffset=213.6*(1-cf/100);tween($("v-conf"),cf,"%");
$("v-trig").textContent=st.trigger?"OBJECT NEAR":"CLEAR";$("v-trig").style.color=st.trigger?"var(--am)":"";$("b-trig").style.width=st.trigger?"100%":"4%";
$("v-label").textContent=st.label||"none";tween($("v-count"),st.count||0);
const q=Math.max(0,Math.min(100,2*((st.rssi||-100)+100)));$("v-rssi").textContent=(st.rssi||"—")+" dBm";$("b-rssi").style.width=q+"%";
const u=st.uptime||0;$("v-up").textContent=Math.floor(u/3600)+"h "+Math.floor(u%3600/60)+"m "+u%60+"s"}
setInterval(render,1000);
// ---- incident history ----
onValue(query(ref(db,"track/events"),limitToLast(40)),s=>{const a=[];s.forEach(c=>{a.push({id:c.key,...c.val()})});a.reverse();
$("evn").textContent=a.length+" RECORDED";
$("events").innerHTML=a.map(e=>`<div class="e" data-i="${e.id}"><img src="${e.image?"data:image/jpeg;base64,"+e.image:""}" alt=""><div><b>${e.label}</b> · ${Math.round((e.conf||0)*100)}%<br>${fmt(e.ts)}</div></div>`).join("")||"<small style='padding:14px'>No incidents recorded.</small>";
document.querySelectorAll(".e").forEach(n=>n.onclick=()=>pop(a.find(e=>e.id===n.dataset.i)));
const hr=Array(24).fill(0),n0=Date.now();a.forEach(e=>{const d=Math.floor((n0-e.ts)/36e5);if(d>=0&&d<24)hr[23-d]++});const m=Math.max(1,...hr);
$("hours").innerHTML=hr.map((v,i)=>`<i title="${v} in hour -${23-i}" style="height:${v/m*100}%"></i>`).join("");
if(!first)a.filter(e=>!seen.has(e.id)).slice(0,1).forEach(pop);a.forEach(e=>seen.add(e.id));first=false});
function pop(e){if(!e)return;$("mhead").textContent="⚠ OBSTACLE: "+String(e.label).toUpperCase()+" · "+fmt(e.ts);$("mimg").src="data:image/jpeg;base64,"+(e.image||"");$("modal").classList.remove("hide")}
$("mclose").onclick=()=>$("modal").classList.add("hide");
