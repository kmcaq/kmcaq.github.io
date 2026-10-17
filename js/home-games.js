(()=>{"use strict";
const track=document.getElementById("recentGames");if(!track)return;
const prev=document.getElementById("gamesPrev"),next=document.getElementById("gamesNext");
const safeCover=(cover)=>{if(typeof cover!=="string")return "/avatar.png";const name=cover.replace(/^\.\.\//,"/");return /^\/(covers\/[^?#]+\.(?:png|jpe?g|webp)|avatar\.png)$/i.test(name)?name:"/avatar.png"};
const badge=(g)=>{if(g.status==="Завершено")return ["ПРОЙДЕНО","done"];if(g.status==="В планах")return ["В ПЛАНАХ","plan"];return [g.status||"ИГРА","now"]};
fetch("/data/games.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}).then(games=>{
if(!Array.isArray(games))throw new Error("Неверный формат игровой полки");
track.replaceChildren();
const featured=games.filter(g=>g&&g.name&&g.cover).slice(0,18);
for(const g of featured){const a=document.createElement("a");a.className="recent-game";a.href="/games/";a.title=g.name+" — открыть игровую полку";
const img=document.createElement("img");img.src=safeCover(g.cover);img.alt="Обложка "+g.name;img.loading="lazy";img.onerror=()=>{img.onerror=null;img.src="/avatar.png"};
const cap=document.createElement("div");cap.className="game-caption";const name=document.createElement("strong");name.textContent=g.name;const status=document.createElement("span");const [label,type]=badge(g);status.className="game-badge "+type;status.textContent=label;cap.append(name,status);a.append(img,cap);track.append(a)}
if(!featured.length)track.textContent="Пока нет игр для отображения.";
const update=()=>{prev.disabled=track.scrollLeft<10;next.disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-10};track.addEventListener("scroll",update,{passive:true});window.addEventListener("resize",update);update();
}).catch(e=>{console.error("Не удалось загрузить недавние игры",e);track.textContent="Игры временно недоступны. Посмотри игровую полку.";});
prev.addEventListener("click",()=>track.scrollBy({left:-track.clientWidth*.8,behavior:"smooth"}));next.addEventListener("click",()=>track.scrollBy({left:track.clientWidth*.8,behavior:"smooth"}));
})();