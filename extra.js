import {getApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getDatabase,ref,onValue,query,limitToLast} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {OFFLINE_AFTER_MS} from "./config.js";
const $=i=>document.getElementById(i),db=getDatabase(getApp());let off=0,st=null,prev={},hist=[],ac=null,sound=false;
const tz={timeZone:"Asia/Kolkata"};
setInterval(()=>{const d=new Date();$("clk").textContent=d.toLocaleTimeString("en-GB",{...tz,hour12:false});$("dte").textContent=d.toLocaleDateString("en-IN",{...tz,weekday:"short",day:"2-digit",month:"short",year:"numeric"}).toUpperCase()+" · IST";$("hts").textContent=$("clk").textContent},1000);
const log=t=>{const l=$("syslog"),r=document.createElement("div");r.textContent=new Date().toLocaleTimeString("en-GB",{...tz,hour12:false})+"  "+t;l.prepend(r);while(l.children.length>30)l.lastChild.remove()};
$("snd").onclick=()=>{sound=!sound;ac=ac||new AudioContext();$("snd").textContent="ALARM SOUND: "+(sound?"ON":"OFF");$("snd").classList.toggle("armed",sound)};
const beep=()=>{if(!sound||!ac)return;for(let i=0;i<4;i++){const o=ac.createOscillator(),g=ac.createGain();o.type="square";o.frequency.value=i%2?620:880;g.gain.value=.08;o.connect(g).connect(ac.destination);o.start(ac.currentTime+i*.25);o.stop(ac.currentTime+i*.25+.2)}};
function spark(){const c=$("spark"),w=c.width=c.clientWidth,h=c.height,x=c.getContext("2d");x.clearRect(0,0,w,h);x.strokeStyle="#222b2e";for(let i=0;i<4;i++){x.beginPath();x.moveTo(0,i*h/3);x.lineTo(w,i*h/3);x.stroke()}
if(hist.length<2)return;const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,"#ffb00055");g.addColorStop(1,"transparent");x.beginPath();hist.forEach((v,i)=>x[i?"lineTo":"moveTo"](i/59*w,h-v*h));x.strokeStyle="#ffb000";x.lineWidth=2;x.stroke();x.lineTo((hist.length-1)/59*w,h);x.lineTo(0,h);x.fillStyle=g;x.fill()}
onValue(ref(db,".info/serverTimeOffset"),s=>off=s.val()||0);
onValue(ref(db,"track/status"),s=>{st=s.val();if(!st)return;hist.push(st.conf||0);if(hist.length>60)hist.shift();spark();tick()});
function tick(){if(!st)return;const on=Date.now()+off-st.lastSeen<OFFLINE_AFTER_MS,det=on&&st.detected;
if(prev.on!==undefined&&prev.on!==on)log(on?"Device back ONLINE":"Device went OFFLINE");if(prev.on===undefined)log(on?"Device online":"Device offline (old data shown)");
if(prev.cam!==undefined&&prev.cam!==!!st.camera)log(st.camera?"Camera woke up (trigger)":"Camera back to standby");
if(det&&!prev.det){log("OBSTACLE: "+st.label+" "+Math.round(st.conf*100)+"%");beep();const a=Math.random()*6.28,r=18+Math.random()*24;$("blip").style.cssText=`left:${50+Math.cos(a)*r}%;top:${50+Math.sin(a)*r}%`}
if(!det&&prev.det)log("Track clear again");
$("blip").style.display=det?"block":"none";$("rec").style.visibility=on&&st.camera?"visible":"hidden";document.body.classList.toggle("danger",!!det);
prev={on,det,cam:!!st.camera}}
setInterval(tick,1000);
onValue(query(ref(db,"track/events"),limitToLast(60)),s=>{const a=[];s.forEach(c=>{a.push(c.val())});a.reverse();const t0=new Date().toLocaleDateString("en-IN",tz);
const today=a.filter(e=>new Date(e.ts).toLocaleDateString("en-IN",tz)===t0).length;
if(!a.length){$("tk").textContent="NO INCIDENTS RECORDED · TRACK HISTORY CLEAN";return}
const ago=Math.max(0,Math.round((Date.now()+off-a[0].ts)/60000));
$("tk").textContent=`TODAY: ${today} INCIDENT(S)   ◆   LAST: ${a[0].label.toUpperCase()} ${ago} MIN AGO   ◆   `+a.slice(0,6).map(e=>e.label.toUpperCase()+" @ "+new Date(e.ts).toLocaleTimeString("en-GB",{...tz,hour12:false})).join("   ◆   ")});
