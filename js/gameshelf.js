/* ================================
   Игровая полка kmcaq
================================ */

const TIERS = [
  { id: "S", title: "Легендарно", glow: "0 0 28px rgba(214,108,255,.45)" },
  { id: "A", title: "Отлично", glow: "0 0 18px rgba(214,108,255,.30)" },
  { id: "B", title: "Хорошо", glow: "0 0 12px rgba(214,108,255,.18)" },
  { id: "C", title: "Нормально", glow: "0 0 8px rgba(214,108,255,.10)" },
  { id: "D", title: "Слабо", glow: "none" },
  { id: "F", title: "Не понравилось", glow: "none" }
];

const style = document.createElement("style");
style.textContent = `
#gameshelfContainer{
 display:flex;
 flex-direction:column;
 gap:26px;
}

.tier-row{
 background:var(--card);
 backdrop-filter:blur(22px);
 border:1px solid var(--border);
 border-radius:28px;
 padding:24px;
}

.tier-head{
 display:flex;
 align-items:center;
 gap:18px;
 margin-bottom:18px;
}

.tier-box{
 width:56px;
 height:56px;
 border-radius:18px;
 display:flex;
 align-items:center;
 justify-content:center;
 font-size:30px;
 font-weight:800;
 background:rgba(214,108,255,.14);
 border:1px solid rgba(214,108,255,.28);
 color:white;
}

.tier-grid{
 display:grid;
 grid-template-columns:repeat(auto-fill,minmax(120px,1fr));
 gap:18px;
}

.game-card{
 cursor:pointer;
 transition:.22s;
}

.game-card:hover{
 transform:translateY(-6px);
}

.game-card.active{
 transform:translateY(-4px) scale(1.03);
}

.game-cover{
 width:100%;
 aspect-ratio:2/3;
 object-fit:cover;
 border-radius:16px;
 border:1px solid rgba(255,255,255,.12);
 transition:.22s;
}

.game-name{
 margin-top:8px;
 text-align:center;
 font-size:15px;
 font-weight:700;
 color:white;
}

/* -------- Модалка -------- */

.gm-overlay{
 position:fixed;
 inset:0;
 background:rgba(8,6,14,.74);
 backdrop-filter:blur(12px);
 display:flex;
 align-items:center;
 justify-content:center;
 padding:24px;
 opacity:0;
 visibility:hidden;
 transition:.2s;
 z-index:3000;
}

.gm-overlay.show{
 opacity:1;
 visibility:visible;
}

.gm-modal{
 background:rgba(24,18,38,.95);
 border:1px solid rgba(255,255,255,.12);
 border-radius:28px;
 width:min(760px,100%);
 padding:28px;
 position:relative;
 transform:scale(.95);
 transition:.22s;
}

.gm-overlay.show .gm-modal{
 transform:scale(1);
}

.gm-close{
 position:absolute;
 right:16px;
 top:16px;
 background:none;
 border:none;
 color:white;
 font-size:30px;
 cursor:pointer;
}

.gm-content{
 display:grid;
 grid-template-columns:190px 1fr;
 gap:26px;
}

.gm-cover{
 width:100%;
 border-radius:18px;
}

.gm-tier{
 display:inline-flex;
 padding:7px 16px;
 border-radius:999px;
 background:rgba(214,108,255,.15);
 border:1px solid rgba(214,108,255,.3);
 font-weight:800;
 margin-bottom:10px;
}

.gm-title{
 font-size:34px;
 margin-bottom:18px;
}

.gm-grid{
 display:grid;
 grid-template-columns:repeat(2,minmax(120px,1fr));
 gap:14px;
}

.gm-item{
 background:rgba(255,255,255,.05);
 border-radius:16px;
 padding:14px;
}

.gm-item span{
 display:block;
 color:var(--muted);
 font-size:13px;
 margin-bottom:6px;
}

.gm-btn{
 display:inline-flex;
 justify-content:center;
 align-items:center;
 margin-top:24px;
 padding:14px 22px;
 border-radius:16px;
 background:linear-gradient(135deg,#d66cff,#9146ff);
 color:white;
 text-decoration:none;
 font-weight:700;
 transition:.2s;
}

.gm-btn:hover{
 transform:translateY(-2px);
}

@media(max-width:720px){

 .gm-content{
  grid-template-columns:1fr;
 }

 .gm-cover{
  max-width:220px;
  margin:auto;
 }

 .gm-grid{
  grid-template-columns:1fr;
 }

 .tier-grid{
  grid-template-columns:repeat(2,1fr);
 }

}
`;
document.head.appendChild(style);

const container = document.getElementById("gameshelfContainer");

const overlay = document.createElement("div");
overlay.className = "gm-overlay";

overlay.innerHTML = `
<div class="gm-modal">

<button class="gm-close">&times;</button>

<div class="gm-content">

<img class="gm-cover">

<div>

<div class="gm-tier"></div>

<div class="gm-title"></div>

<div class="gm-grid">

<div class="gm-item">
<span>Оценка</span>
<div class="gm-rating"></div>
</div>

<div class="gm-item">
<span>Статус</span>
<div class="gm-status"></div>
</div>

<div class="gm-item">
<span>Часы</span>
<div class="gm-hours"></div>
</div>

<div class="gm-item">
<span>Смерти</span>
<div class="gm-deaths"></div>
</div>

</div>

<a class="gm-btn" target="_blank">
▶ Открыть плейлист
</a>

</div>

</div>

</div>
`;

document.body.appendChild(overlay);

let activeCard = null;

function closeModal(){

 overlay.classList.remove("show");

 if(activeCard){

  activeCard.classList.remove("active");

  activeCard.querySelector(".game-cover").style.boxShadow = activeCard.dataset.shadow;

 }

 activeCard = null;

}

overlay.addEventListener("click", e=>{

 if(e.target===overlay) closeModal();

});

overlay.querySelector(".gm-close").onclick = closeModal;

window.addEventListener("keydown",e=>{

 if(e.key==="Escape") closeModal();

});

fetch("games.json?v=" + Date.now())

.then(r=>r.json())

.then(games=>{

 TIERS.forEach(tier=>{

  const row=document.createElement("div");

  row.className="tier-row";

  row.innerHTML=`
  <div class="tier-head">

    <div class="tier-box">${tier.id}</div>

    <div>
      <h3>${tier.title}</h3>
    </div>

  </div>

  <div class="tier-grid"></div>
  `;

  row.querySelector(".tier-box").style.boxShadow=tier.glow;

  const grid=row.querySelector(".tier-grid");

  games

   .filter(g=>g.tier===tier.id)

   .forEach(game=>{

    const card=document.createElement("div");

    card.className="game-card";

    card.dataset.shadow=tier.glow;

    card.innerHTML=`
      <img class="game-cover"
           src="${game.cover}"
           alt="${game.name}">
      <div class="game-name">${game.name}</div>
    `;

    card.querySelector(".game-cover").style.boxShadow=tier.glow;

    card.onclick=()=>{

      if(activeCard){

        activeCard.classList.remove("active");

        activeCard.querySelector(".game-cover").style.boxShadow=activeCard.dataset.shadow;

      }

      activeCard=card;

      card.classList.add("active");

      card.querySelector(".game-cover").style.boxShadow=
        "0 0 30px rgba(214,108,255,.55)";

      overlay.querySelector(".gm-cover").src=game.cover;
      overlay.querySelector(".gm-cover").alt=game.name;

      overlay.querySelector(".gm-tier").textContent=game.tier;
      overlay.querySelector(".gm-title").textContent=game.name;
      overlay.querySelector(".gm-rating").textContent=`${game.rating}/10`;
      overlay.querySelector(".gm-status").textContent=game.status;
      overlay.querySelector(".gm-hours").textContent=game.hours;
      overlay.querySelector(".gm-deaths").textContent=game.deaths;
      overlay.querySelector(".gm-btn").href=game.playlist;

      overlay.classList.add("show");

    };

    grid.appendChild(card);

   });

  container.appendChild(row);

 });

})

.catch(()=>{

 container.innerHTML="<p>Не удалось загрузить игровую полку.</p>";

});
