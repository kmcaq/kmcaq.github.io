(()=>{"use strict";
const track=document.getElementById("recentGames"),prev=document.getElementById("gamesPrev"),next=document.getElementById("gamesNext");
if(!track||!prev||!next)return;

 // Mouse dragging supplements native touch scrolling and the arrow buttons.
let gesture=null,suppressClick=false;
const finishDrag=()=>{
 if(!gesture)return;
 const {id,dragging}=gesture;
 gesture=null;
 if(dragging)suppressClick=true;
 track.classList.remove("is-dragging");
 if(track.hasPointerCapture(id))track.releasePointerCapture(id);
};
track.addEventListener("pointerdown",event=>{
 if(event.pointerType!=="mouse"||event.button!==0||gesture)return;
 const bounds=track.getBoundingClientRect();
 // Leave the native scrollbar available.
 if(event.clientY>=bounds.top+track.clientTop+track.clientHeight)return;
 suppressClick=false;
 gesture={id:event.pointerId,x:event.clientX,left:track.scrollLeft,dragging:false};
});
track.addEventListener("pointermove",event=>{
 if(!gesture||event.pointerId!==gesture.id)return;
 if(!(event.buttons&1)){finishDrag();return;}
 const delta=event.clientX-gesture.x;
 if(!gesture.dragging){
  if(Math.abs(delta)<6)return;
  gesture.dragging=true;
  track.classList.add("is-dragging");
  track.setPointerCapture(event.pointerId);
 }
 event.preventDefault();
 track.scrollLeft=gesture.left-delta;
});
for(const type of ["pointerup","pointercancel","lostpointercapture"]){
 track.addEventListener(type,event=>{if(gesture&&event.pointerId===gesture.id)finishDrag();});
}
window.addEventListener("pointerup",finishDrag);
window.addEventListener("blur",finishDrag);
track.addEventListener("dragstart",event=>event.preventDefault());
track.addEventListener("click",event=>{
 if(!suppressClick||event.detail===0)return;
 event.preventDefault();
 event.stopPropagation();
 suppressClick=false;
},true);

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