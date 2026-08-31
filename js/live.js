const API=atob("aHR0cHM6Ly9rbWNhcS1saXZlLmttLXRhbWFtaS53b3JrZXJzLmRldg==");

async function updateStatus(){

 try{

  const r=await fetch(API,{cache:"no-store"});
  if(!r.ok) throw new Error();

  const d=await r.json();

  const navStatus=document.getElementById("navStatus");

  document.getElementById("navDot").style.background=
   d.live?"#ff4d6d":"#9c8db8";

  document.getElementById("navText").textContent=
   d.live?"LIVE":"OFFLINE";

  if(d.live){

   navStatus.href="https://www.twitch.tv/kmcaq";
   navStatus.target="_blank";
   navStatus.classList.add("live");

  }else{

   navStatus.href="#";
   navStatus.removeAttribute("target");
   navStatus.classList.remove("live");

  }

 }catch(e){

  console.error(e);

 }

}

async function updateCurrent(){

 const title=document.getElementById("currentTitle");
 const text=document.getElementById("currentText");
 const button=document.getElementById("currentButton");
 const card=document.getElementById("currentCard");

 try{

  const response=await fetch(API,{
   cache:"no-store",
   headers:{Accept:"application/json"}
  });

  if(!response.ok) throw new Error();

  const data=await response.json();

  if(data.live){

   title.innerHTML='<span class="live-indicator"></span>Сейчас в эфире';
   text.innerHTML=`<strong>${data.game}</strong><br>👀 ${data.viewers} зрителей`;

   button.textContent="Открыть стрим";
   button.href="https://www.twitch.tv/kmcaq";

   card.style.borderColor="#ff4d6d";
   card.classList.add("live-now");

  }else{

   title.innerHTML='<span class="live-indicator"></span>Последняя серия';
   text.textContent=data.latestTitle||"Последняя запись";

   button.textContent="Смотреть VOD";
   button.href=data.latestVideo||"https://www.youtube.com/@kmcaq";

   card.style.borderColor="rgba(255,255,255,.12)";
   card.classList.remove("live-now");

  }

 }catch(error){

  console.error(error);

 }

}

window.initLive=function(){

 updateStatus();
 updateCurrent();

 setInterval(()=>{
  updateStatus();
  updateCurrent();
 },60000);

};
