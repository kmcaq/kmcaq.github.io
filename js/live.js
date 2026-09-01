const API=atob("aHR0cHM6Ly9rbWNhcS1saXZlLmttLXRhbWFtaS53b3JrZXJzLmRldg==");
const CHECK_INTERVAL=60000;
const REQUEST_TIMEOUT=5000;

async function getLiveData(){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT);
 try{
  const r=await fetch(API,{cache:"no-store",headers:{Accept:"application/json"},signal:controller.signal});
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
 }finally{
  clearTimeout(timeout);
 }
}

function updateStatus(d){
 const navStatus=document.getElementById("navStatus");
 const navDot=document.getElementById("navDot");
 const navText=document.getElementById("navText");
 if(!navStatus||!navDot||!navText) return;

 navDot.style.background=d.live?"#ff4d6d":"#9c8db8";
 navText.textContent=d.live?"LIVE":"OFFLINE";

 if(d.live){
  navStatus.href="https://www.twitch.tv/kmcaq";
  navStatus.target="_blank";
  navStatus.rel="noopener noreferrer";
  navStatus.classList.add("live");
 }else{
  navStatus.href="#";
  navStatus.removeAttribute("target");
  navStatus.removeAttribute("rel");
  navStatus.classList.remove("live");
 }
}

function updateCurrent(d){
 const title=document.getElementById("currentTitle");
 const text=document.getElementById("currentText");
 const button=document.getElementById("currentButton");
 const card=document.getElementById("currentCard");
 if(!title||!text||!button||!card) return;

 if(d.live){
  title.innerHTML='<span class="live-indicator"></span>Сейчас в эфире';
  text.innerHTML=`<strong>${d.game||"Без названия"}</strong><br>👀 ${d.viewers??0} зрителей`;
  button.textContent="Открыть стрим";
  button.href="https://www.twitch.tv/kmcaq";
  button.target="_blank";
  button.rel="noopener noreferrer";
  card.style.borderColor="#ff4d6d";
  card.classList.add("live-now");
 }else{
  title.innerHTML='<span class="live-indicator"></span>Последняя серия';
  text.textContent=d.latestTitle||"Последняя запись";
  button.textContent="Смотреть VOD";
  button.href=d.latestVideo||"https://www.youtube.com/@kmcaq";
  button.target="_blank";
  button.rel="noopener noreferrer";
  card.style.borderColor="rgba(255,255,255,.12)";
  card.classList.remove("live-now");
 }
}

function showOfflineFallback(){
 const navStatus=document.getElementById("navStatus");
 const navDot=document.getElementById("navDot");
 const navText=document.getElementById("navText");
 if(navDot) navDot.style.background="#9c8db8";
 if(navText) navText.textContent="OFFLINE";
 if(navStatus){
  navStatus.href="#";
  navStatus.removeAttribute("target");
  navStatus.removeAttribute("rel");
  navStatus.classList.remove("live");
 }
}

async function refreshLive(){
 try{
  const data=await getLiveData();
  updateStatus(data);
  updateCurrent(data);
 }catch(error){
  console.error("Live widget error:",error);
  showOfflineFallback();
 }
}

window.initLive=function(){
 refreshLive();

 if(window.liveStatusInterval){
  clearInterval(window.liveStatusInterval);
 }
 window.liveStatusInterval=setInterval(refreshLive,CHECK_INTERVAL);

 if(!window.liveVisibilityHandler){
  window.liveVisibilityHandler=()=>{
   if(!document.hidden) refreshLive();
  };
  document.addEventListener("visibilitychange",window.liveVisibilityHandler);
 }
};

if(document.readyState==="loading"){
 document.addEventListener("DOMContentLoaded",window.initLive,{once:true});
}else{
 window.initLive();
}
