const TIERS = [
  { id: "NOW", title: "Играю сейчас", mark: "▶", special: true, glow: "0 0 14px rgba(216,137,72,.30)" },
  { id: "S", title: "Легендарно", mark: "S", glow: "0 0 22px rgba(216,137,72,.45)" },
  { id: "A", title: "Отлично", mark: "A", glow: "0 0 14px rgba(216,137,72,.30)" },
  { id: "B", title: "Хорошо", mark: "B", glow: "0 0 10px rgba(216,137,72,.18)" },
  { id: "C", title: "Нормально", mark: "C", glow: "0 0 8px rgba(216,137,72,.12)" },
  { id: "D", title: "Слабо", mark: "D", glow: "none" },
  { id: "F", title: "Не понравилось", mark: "F", glow: "none" },
  { id: "PLANNED", title: "В планах", mark: "…", special: true, glow: "none" }
];

const container = document.getElementById("gameshelfContainer");

if (container) {


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

      // Open a requested game from the homepage once cards are rendered.
      const requested=new URLSearchParams(location.search).get("game");
      if(requested){
        const card=Array.from(container.querySelectorAll(".game-card")).find(el=>el.dataset.gameName===requested);
        if(card){card.scrollIntoView({block:"center",behavior:"auto"});card.click()}
      }
      window.dispatchEvent(new CustomEvent("gameshelf:loaded", { detail: { games } }));
    })
    .catch(err => {
      console.error("Ошибка загрузки games.json:", err);
      container.innerHTML = "<p>Не удалось загрузить игровую полку.</p>";
    });
}
