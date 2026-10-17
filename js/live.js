const API=atob("aHR0cHM6Ly9rbWNhcS1saXZlLmttLXRhbWFtaS53b3JrZXJzLmRldg==");
const CHECK_INTERVAL=60000;
const REQUEST_TIMEOUT=5000;

async function getLiveData(){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT);
 try{
  const response=await fetch(API,{cache:"no-store",headers:{Accept:"application/json"},signal:controller.signal});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const data=await response.json();
  if(!data||typeof data!=="object")throw new Error("Invalid live response");
  return data;
 }finally{clearTimeout(timeout)}
}

function updateStatus(data){
 const navStatus=document.getElementById("navStatus");
 const navDot=document.getElementById("navDot");
 const navText=document.getElementById("navText");
 if(!navStatus||!navDot||!navText)return;
 const live=Boolean(data&&data.live);
 navDot.style.background=live?"#ff4d6d":"#9c8db8";
 navText.textContent=live?"LIVE":"OFFLINE";
 if(live){
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

function updateCurrent(data){
 const title=document.getElementById("currentTitle"),text=document.getElementById("currentText"),button=document.getElementById("currentButton"),card=document.getElementById("currentCard");
 if(!title||!text||!button||!card)return;
 const game=document.getElementById("currentGame"),meta=document.getElementById("currentMeta"),cover=document.getElementById("currentCover");
 if(data.live){
  title.textContent="● СЕЙЧАС В ЭФИРЕ";
  if(game)game.textContent=data.game||"Прямой эфир";
  text.textContent=data.title||"Присоединяйся к трансляции на Twitch";
  if(meta)meta.textContent=Number.isFinite(Number(data.viewers))?"♙ "+Number(data.viewers).toLocaleString("ru-RU")+" зрителей":"";
  button.textContent="Смотреть на Twitch →";button.href="https://www.twitch.tv/kmcaq";
  card.classList.add("live-now");
 }else{
  title.textContent="● СЕЙЧАС НЕ В ЭФИРЕ";
  if(game)game.textContent="До встречи на стриме!";
  text.textContent=data.latestTitle||"Последние записи доступны на YouTube.";
  if(meta)meta.textContent="";
  button.textContent="Смотреть записи →";button.href=typeof data.latestVideo==="string"&&/^https:\/\//.test(data.latestVideo)?data.latestVideo:"https://www.youtube.com/@kmcaq";
  card.classList.remove("live-now");
 }
 button.target="_blank";button.rel="noopener noreferrer";
 if(cover){
  const art=data.live&&(data.box_art_url||data.boxArtUrl||data.gameCover||data.game_cover||data.cover);
  if(typeof art==="string"&&/^https:\/\/(?:static-cdn\.jtvnw\.net|images\.igdb\.com|.*\.twitch\.tv)\//i.test(art)){
   cover.src=art.replace("{width}","300").replace("{height}","400");
  }else if(data.live&&data.game){
   fetch("/data/games.json").then(r=>r.ok?r.json():[]).then(items=>{
    const match=Array.isArray(items)&&items.find(g=>g.name?.toLowerCase()===data.game.toLowerCase());
    if(match&&match.cover)cover.src=match.cover.replace(/^\.\.\//,"/");
   }).catch(()=>{});
  }
 }
}

async function refreshLive(){
 try{
  const data=await getLiveData();
  updateStatus(data);
  updateCurrent(data);
 }catch(error){
  console.error("Live widget error:",error);
  updateStatus({live:false});
  const title=document.getElementById("currentTitle");
  const message=document.getElementById("currentText");
  const button=document.getElementById("currentButton");
  const card=document.getElementById("currentCard");
  if(title&&message&&button&&card){
   title.textContent="● СТАТУС НЕДОСТУПЕН";
   const game=document.getElementById("currentGame");if(game)game.textContent="Загляни на Twitch";
   const meta=document.getElementById("currentMeta");if(meta)meta.textContent="";
   message.textContent="Не удалось проверить эфир. Попробуй позже.";
   button.textContent="Открыть Twitch →";
   button.href="https://www.twitch.tv/kmcaq";
   button.target="_blank";button.rel="noopener noreferrer";
   card.classList.remove("live-now");card.style.borderColor="";
  }
 }
}

window.initLive=function(){
 refreshLive();
 if(window.liveStatusInterval)clearInterval(window.liveStatusInterval);
 window.liveStatusInterval=setInterval(refreshLive,CHECK_INTERVAL);
};

function startLive(){window.initLive();}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startLive,{once:true});
else startLive();
