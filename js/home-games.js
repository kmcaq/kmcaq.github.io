(()=>{"use strict";
const track=document.getElementById("recentGames"),prev=document.getElementById("gamesPrev"),next=document.getElementById("gamesNext");
if(!track||!prev||!next)return;
const safeCover=(cover)=>{if(typeof cover!=="string")return "/avatar.png";const path=cover.replace(/^\.\.\//,"/");return /^\/covers\/[\w.%-]+\.(png|jpe?g|webp)$/i.test(path)?path:"/avatar.png"};
const badge=(g)=>g.tier==="NOW"?["ИГРАЮ СЕЙЧАС","now"]:g.status==="Завершено"?["ПРОЙДЕНО","done"]:["ИГРА","plan"];
fetch("/data/games.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(games=>{
if(!Array.isArray(games))throw Error("Invalid games");
track.replaceChildren();
// There are no completion dates in the source. Preserve editorial order and exclude planned games.
const featured=games.filter(g=>g&&g.name&&g.cover&&(g.status==="Завершено"||(g.tier==="NOW"&&g.status!=="В планах"))).slice(0,18);
for(const g of featured){
const a=document.createElement("a");a.className="recent-game";a.href="/games/?game="+encodeURIComponent(g.name);a.title=g.name+" — подробнее";
const img=document.createElement("img");img.src=safeCover(g.cover);img.alt="Обложка "+g.name;img.loading="lazy";img.onerror=()=>{img.onerror=null;img.src="/avatar.png"};
const cap=document.createElement("div");cap.className="game-caption";const name=document.createElement("strong");name.textContent=g.name;
const status=document.createElement("span");const [label,type]=badge(g);status.className="game-badge "+type;status.textContent=label;
cap.append(name,status);a.append(img,cap);track.append(a);
}
if(!featured.length)track.textContent="Пока нет завершённых игр.";
const update=()=>{prev.disabled=track.scrollLeft<10;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-10};
track.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update);requestAnimationFrame(update);
}).catch(err=>{console.error("Games load error",err);track.textContent="Игры временно недоступны.";prev.disabled=next.disabled=true});
prev.addEventListener("click",()=>track.scrollBy({left:-track.clientWidth*.8,behavior:"smooth"}));
next.addEventListener("click",()=>track.scrollBy({left:track.clientWidth*.8,behavior:"smooth"}));
})();