const TIERS = [
  { id: "NOW", title: "Играю сейчас", mark: "▶", special: true, glow: "0 0 14px rgba(214,108,255,.30)" },
  { id: "S", title: "Легендарно", mark: "S", glow: "0 0 22px rgba(214,108,255,.45)" },
  { id: "A", title: "Отлично", mark: "A", glow: "0 0 14px rgba(214,108,255,.30)" },
  { id: "B", title: "Хорошо", mark: "B", glow: "0 0 10px rgba(214,108,255,.18)" },
  { id: "C", title: "Нормально", mark: "C", glow: "0 0 8px rgba(214,108,255,.12)" },
  { id: "D", title: "Слабо", mark: "D", glow: "none" },
  { id: "F", title: "Не понравилось", mark: "F", glow: "none" },
  { id: "PLANNED", title: "В планах", mark: "…", special: true, glow: "none" }
];

const container = document.getElementById("gameshelfContainer");

if (container) {
  const style = document.createElement("style");
  style.textContent = `
    #gameshelfContainer{display:flex;flex-direction:column;gap:5px}
    .tier-row{display:grid;grid-template-columns:64px 1fr;align-items:center;gap:8px;background:var(--card);backdrop-filter:blur(22px);border:1px solid var(--border);border-radius:16px;padding:6px 8px;min-height:64px}
    .tier-box{width:46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:23px;font-weight:800;color:white;background:rgba(214,108,255,.14);border:1px solid rgba(214,108,255,.28);margin:auto;text-align:center}
    .tier-box.special{width:58px;height:46px;font-size:11px;line-height:1.05;padding:5px}
    .tier-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:6px;min-width:0}
    .game-card{cursor:pointer;transition:.22s;min-width:0}
    .game-card:hover{transform:translateY(-2px) scale(1.015)}
    .game-cover{width:100%;aspect-ratio:460/215;object-fit:cover;border-radius:9px;border:1px solid rgba(255,255,255,.1);display:block}
    .gm-overlay{position:fixed;inset:0;background:rgba(8,6,14,.74);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;visibility:hidden;transition:.2s;z-index:3000}
    .gm-overlay.show{opacity:1;visibility:visible}
    .gm-modal{background:rgba(24,18,38,.96);border:1px solid rgba(255,255,255,.12);border-radius:28px;width:min(760px,100%);padding:28px;position:relative}
    .gm-close{position:absolute;right:16px;top:16px;background:none;border:0;color:white;font-size:30px;cursor:pointer}
    .gm-content{display:grid;grid-template-columns:190px 1fr;gap:26px}
    .gm-cover{width:100%;border-radius:18px}
    .gm-tier{display:inline-flex;padding:7px 16px;border-radius:999px;background:rgba(214,108,255,.15);border:1px solid rgba(214,108,255,.3);font-weight:800}
    .gm-title{font-size:34px;margin:12px 0 18px}
    .gm-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}
    .gm-item{background:rgba(255,255,255,.05);border-radius:16px;padding:14px}
    .gm-item span{display:block;color:var(--muted);font-size:13px;margin-bottom:6px}
    .gm-btn{display:inline-flex;margin-top:24px;padding:14px 22px;border-radius:16px;background:linear-gradient(135deg,#d66cff,#9146ff);color:white;text-decoration:none;font-weight:700}
    @media(max-width:1100px){
      .tier-row{grid-template-columns:58px 1fr}
      .tier-box{width:44px;height:44px}
      .tier-box.special{width:52px;height:44px;font-size:10px}
      .tier-grid{grid-template-columns:repeat(auto-fill,minmax(125px,1fr))}
    }
    @media(max-width:720px){
      .tier-row{grid-template-columns:52px 1fr;padding:5px 6px}
      .tier-box{width:40px;height:40px;font-size:20px}
      .tier-box.special{width:46px;height:40px;font-size:9px}
      .tier-grid{grid-template-columns:repeat(2,1fr);gap:5px}
      .gm-content{grid-template-columns:1fr}
      .gm-cover{max-width:220px;margin:auto}
      .gm-grid{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(style);

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
            <div class="gm-item gm-rating-item"><span>Оценка</span><div class="gm-rating"></div></div>
            <div class="gm-item"><span>Статус</span><div class="gm-status"></div></div>
            <div class="gm-item gm-hours-item"><span>Часы</span><div class="gm-hours"></div></div>
            <div class="gm-item gm-deaths-item"><span>Смерти</span><div class="gm-deaths"></div></div>
          </div>
          <a class="gm-btn" target="_blank" rel="noopener noreferrer">▶ Открыть плейлист</a>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.classList.remove("show");
  overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
  overlay.querySelector(".gm-close").onclick = close;
  window.addEventListener("keydown", e => { if (e.key === "Escape") close(); });

  fetch("../data/games.json", { cache: "no-cache" })
    .then(r => {
      if (!r.ok) throw Error("Не удалось загрузить games.json");
      return r.json();
    })
    .then(games => {
      window.GameShelf = { games };

      TIERS.forEach(tier => {
        const row = document.createElement("div");
        row.className = "tier-row";
        row.dataset.tier = tier.id;
        const boxClass = tier.special ? "tier-box special" : "tier-box";
        row.innerHTML = `<div class="${boxClass}">${tier.special ? tier.title : tier.mark}</div><div class="tier-grid"></div>`;
        row.querySelector(".tier-box").style.boxShadow = tier.glow;

        const grid = row.querySelector(".tier-grid");
        games
          .filter(game => game.tier === tier.id)
          .forEach(game => {
            const card = document.createElement("div");
            card.className = "game-card";
            card.dataset.gameName = game.name || "";
            card.innerHTML = `<img class="game-cover" src="${game.cover}" alt="${game.name}">`;
            card.querySelector(".game-cover").style.boxShadow = tier.glow;
            card.onclick = () => {
              overlay.querySelector(".gm-cover").src = game.cover;
              overlay.querySelector(".gm-cover").alt = game.name;
              overlay.querySelector(".gm-tier").textContent = tier.title;
              overlay.querySelector(".gm-title").textContent = game.name;
              overlay.querySelector(".gm-rating").textContent = game.rating != null ? `${game.rating}/10` : "—";
              overlay.querySelector(".gm-status").textContent = game.status ?? "—";
              overlay.querySelector(".gm-hours").textContent = game.hours != null ? `${game.hours} ч.` : "—";
              overlay.querySelector(".gm-deaths").textContent = game.deaths != null ? game.deaths : "—";

              const compactCard = tier.id === "NOW" || tier.id === "PLANNED";
              overlay.querySelector(".gm-rating-item").style.display = compactCard ? "none" : "";
              overlay.querySelector(".gm-hours-item").style.display = compactCard ? "none" : "";
              overlay.querySelector(".gm-deaths-item").style.display = compactCard ? "none" : "";

              overlay.querySelector(".gm-btn").href = game.playlist || "#";
              overlay.classList.add("show");
            };
            grid.appendChild(card);
          });
        container.appendChild(row);
      });

      window.dispatchEvent(new CustomEvent("gameshelf:loaded", { detail: { games } }));
    })
    .catch(err => {
      console.error("Ошибка загрузки games.json:", err);
      container.innerHTML = "<p>Не удалось загрузить игровую полку.</p>";
    });
}
