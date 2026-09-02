(() => {
  const API = "https://admin.km-tamami.workers.dev";
  const TOKEN_KEY = "admin_token";
  const url = new URL(location.href);
  const isAdmin = url.searchParams.get("admin") === "1";
  const section = location.pathname.split("/").filter(Boolean)[0] || "home";
  let games = [];
  let dirty = false;
  let draggedGame = null;

  const TIERS = [
    { id: "NOW", label: "Играю сейчас", special: true },
    { id: "S", label: "Легендарно" },
    { id: "A", label: "Отлично" },
    { id: "B", label: "Хорошо" },
    { id: "C", label: "Нормально" },
    { id: "D", label: "Слабо" },
    { id: "F", label: "Не понравилось" },
    { id: "PLANNED", label: "Не отсортировано", special: true }
  ];

  function getToken() { return sessionStorage.getItem(TOKEN_KEY); }

  function saveHashToken() {
    const hash = new URLSearchParams(location.hash.slice(1));
    const token = hash.get("token");
    if (!token) return false;
    sessionStorage.setItem(TOKEN_KEY, token);
    history.replaceState(null, "", location.pathname + location.search);
    return true;
  }

  async function authFetch(resource, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(resource, { ...options, headers });
    if (res.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      location.replace(`${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      throw new Error("Unauthorized");
    }
    return res;
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function markDirty() {
    dirty = true;
    const button = document.getElementById("admin-save");
    if (button) button.textContent = "💾 Сохранить*";
  }

  function addStyles() {
    if (document.getElementById("games-admin-style")) return;
    const style = document.createElement("style");
    style.id = "games-admin-style";
    style.textContent = `
      .admin-mode{padding-top:72px}
      #admin-toolbar{position:fixed;top:0;left:0;right:0;height:60px;display:flex;align-items:center;gap:12px;padding:0 20px;background:#0d1117;border-bottom:1px solid rgba(255,255,255,.08);z-index:99999}
      #admin-toolbar button{border:none;border-radius:10px;padding:10px 16px;cursor:pointer;color:#fff;background:#ef4444;font:inherit}
      #admin-toolbar button:disabled{opacity:.55;cursor:wait}
      .admin-title{flex:1;font-weight:700}
      .admin-drag-hint{color:#9ca3af;font-size:13px;margin:0 0 18px}
      .admin-tier-row{position:relative}
      .admin-drop-zone{min-height:130px;border-radius:16px;transition:.15s;background:rgba(214,108,255,.025)}
      .admin-drop-zone.admin-over{background:rgba(214,108,255,.1);outline:2px dashed rgba(214,108,255,.55);outline-offset:-2px}
      .admin-dragging{opacity:.35!important;transform:scale(.98)!important}
      .admin-drop-target{outline:2px dashed rgba(214,108,255,.8);outline-offset:4px}
      .admin-actions{position:absolute;left:6px;right:6px;bottom:6px;display:flex;justify-content:center;gap:5px;margin:0!important;z-index:20;pointer-events:none}
      .admin-actions button{pointer-events:auto;white-space:nowrap;background:rgba(17,24,39,.94);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:7px;padding:5px 7px;cursor:pointer;font:11px/1.1 inherit;box-shadow:0 2px 8px rgba(0,0,0,.45)}
      .admin-actions .delete{background:rgba(127,29,29,.96)}
      .admin-game-card{position:relative!important;overflow:hidden}
      .admin-game-card .game-cover{display:block}
      .admin-tier-label{font-size:14px;font-weight:700;color:#d1d5db;margin:0 0 8px 0}
      .admin-tier-label strong{color:#fff}
      .admin-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;z-index:100000}
      .admin-modal{width:min(560px,100%);max-height:90vh;overflow:auto;background:#151922;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:24px;color:#fff;box-shadow:0 20px 70px rgba(0,0,0,.5)}
      .admin-modal h2{margin-bottom:18px}
      .admin-form{display:grid;gap:12px}
      .admin-form label{display:grid;gap:6px;font-size:13px;color:#cbd5e1}
      .admin-form input,.admin-form select{width:100%;box-sizing:border-box;background:#0d1117;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:11px 12px;font:inherit}
      .admin-form-actions{display:flex;gap:10px;margin-top:6px}
      .admin-form-actions button{flex:1;border:0;border-radius:10px;padding:11px 14px;cursor:pointer;font:inherit}
      .admin-form-actions .primary{background:#9146ff;color:#fff}
      .admin-form-actions .secondary{background:#374151;color:#fff}
    `;
    document.head.append(style);
  }

  function createToolbar() {
    if (document.getElementById("admin-toolbar")) return;
    const bar = document.createElement("div");
    bar.id = "admin-toolbar";
    bar.innerHTML = `<button id="admin-back">← Обычная страница</button><div class="admin-title">Игровая полка • Админ</div><button id="admin-add">➕ Добавить</button><button id="admin-save">💾 Сохранить</button>`;
    document.body.prepend(bar);
    document.getElementById("admin-back").onclick = () => {
      if (dirty && !confirm("Есть несохранённые изменения. Выйти без сохранения?")) return;
      const clean = new URL(location.href); clean.searchParams.delete("admin"); location.href = clean.pathname + clean.search;
    };
    document.getElementById("admin-add").onclick = () => openEditor(-1);
    document.getElementById("admin-save").onclick = saveGames;
  }

  async function loadGames() {
    const res = await authFetch(`${API}/games`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Games load failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("API /games returned invalid data");
    games = data.map(game => ({ ...game }));
  }

  function normalizeTier(game) {
    if (game.tier === "NOW" || game.status === "Играю сейчас") return "NOW";
    if (game.tier === "PLANNED" || game.tier === "PLAN" || game.status === "В планах") return "PLANNED";
    return game.tier || "PLANNED";
  }

  function openEditor(index) {
    const source = index < 0 ? { name:"", tier:"PLANNED", rating:0, status:"", hours:0, deaths:0, cover:"", playlist:"" } : { ...games[index] };
    const currentTier = normalizeTier(source);
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true">
        <h2>${index < 0 ? "Новая игра" : "Редактирование игры"}</h2>
        <form class="admin-form">
          <label>Название<input name="name" required value="${escapeHtml(source.name)}"></label>
          <label>Раздел<select name="tier">
            ${TIERS.map(t => `<option value="${t.id}">${escapeHtml(t.id === "NOW" || t.id === "PLANNED" ? t.label : `${t.id} — ${t.label}`)}</option>`).join("")}
          </select></label>
          <label>Оценка<input name="rating" type="number" min="0" max="10" step="0.1" value="${escapeHtml(source.rating)}"></label>
          <label>Статус<input name="status" value="${escapeHtml(source.status)}" placeholder="Пройдено / Прохожу"></label>
          <label>Часы<input name="hours" type="number" min="0" step="1" value="${escapeHtml(source.hours)}"></label>
          <label>Смерти<input name="deaths" type="number" min="0" step="1" value="${escapeHtml(source.deaths)}"></label>
          <label>Обложка<input name="cover" required value="${escapeHtml(source.cover)}" placeholder="../covers/game.png"></label>
          <label>Плейлист<input name="playlist" value="${escapeHtml(source.playlist)}" placeholder="https://youtube.com/playlist?list="></label>
          <div class="admin-form-actions"><button type="button" class="secondary" data-cancel>Отмена</button><button type="submit" class="primary">${index < 0 ? "Добавить" : "Применить"}</button></div>
        </form>
      </div>`;
    document.body.append(backdrop);
    const form = backdrop.querySelector("form");
    form.elements.tier.value = currentTier;
    backdrop.querySelector("[data-cancel]").onclick = () => backdrop.remove();
    backdrop.addEventListener("click", event => { if (event.target === backdrop) backdrop.remove(); });
    form.addEventListener("submit", event => {
      event.preventDefault();
      const value = {
        name: form.elements.name.value.trim(), tier: form.elements.tier.value,
        rating: Number(form.elements.rating.value) || 0, status: form.elements.status.value.trim(),
        hours: Number(form.elements.hours.value) || 0, deaths: Number(form.elements.deaths.value) || 0,
        cover: form.elements.cover.value.trim(), playlist: form.elements.playlist.value.trim()
      };
      if (!value.name || !value.cover) { alert("Название и обложка обязательны."); return; }
      if (index < 0) games.push(value); else games[index] = value;
      markDirty(); backdrop.remove(); renderAdminView();
    });
    form.elements.name.focus();
  }

  function moveGame(movingGame, targetGame, targetTier, before) {
    const sourceIndex = games.indexOf(movingGame);
    if (sourceIndex < 0) return;
    games.splice(sourceIndex, 1);
    movingGame.tier = targetTier;
    if (!targetGame) { games.push(movingGame); return; }
    const targetIndex = games.indexOf(targetGame);
    if (targetIndex < 0) { games.push(movingGame); return; }
    games.splice(before ? targetIndex : targetIndex + 1, 0, movingGame);
  }

  function clearDragState() {
    document.querySelectorAll(".admin-dragging,.admin-drop-target,.admin-over").forEach(el => el.classList.remove("admin-dragging","admin-drop-target","admin-over"));
    draggedGame = null;
  }

  function setupDrag(card, game, grid, tier) {
    card.draggable = true;
    card.addEventListener("dragstart", event => {
      draggedGame = game;
      card.classList.add("admin-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", game.name || "game");
    });
    card.addEventListener("dragend", clearDragState);
    card.addEventListener("dragover", event => {
      if (!draggedGame || draggedGame === game) return;
      event.preventDefault(); event.dataTransfer.dropEffect = "move"; card.classList.add("admin-drop-target");
    });
    card.addEventListener("dragleave", () => card.classList.remove("admin-drop-target"));
    card.addEventListener("drop", event => {
      event.preventDefault(); event.stopPropagation();
      if (!draggedGame || draggedGame === game) return;
      const rect = card.getBoundingClientRect();
      moveGame(draggedGame, game, tier, event.clientX < rect.left + rect.width / 2);
      markDirty(); clearDragState(); renderAdminView();
    });
  }

  function setupGridDrop(grid, tier) {
    grid.addEventListener("dragover", event => {
      if (!draggedGame) return;
      if (event.target.closest(".game-card")) return;
      event.preventDefault(); event.dataTransfer.dropEffect = "move"; grid.classList.add("admin-over");
    });
    grid.addEventListener("dragleave", event => { if (!grid.contains(event.relatedTarget)) grid.classList.remove("admin-over"); });
    grid.addEventListener("drop", event => {
      if (!draggedGame || event.target.closest(".game-card")) return;
      event.preventDefault();
      moveGame(draggedGame, null, tier, false);
      markDirty(); clearDragState(); renderAdminView();
    });
  }

  function renderAdminView() {
    const container = document.getElementById("gameshelfContainer");
    if (!container) return;
    container.innerHTML = "";

    const hint = document.createElement("p");
    hint.className = "admin-drag-hint";
    hint.textContent = "Перетаскивай игры между строками или меняй их порядок внутри строки. Тир изменится автоматически.";
    container.append(hint);

    const tierGlows = { S:"0 0 22px rgba(214,108,255,.45)", A:"0 0 14px rgba(214,108,255,.30)", B:"0 0 10px rgba(214,108,255,.18)", C:"0 0 8px rgba(214,108,255,.12)", D:"none", F:"none", NOW:"0 0 14px rgba(214,108,255,.30)", PLANNED:"none" };

    TIERS.forEach(tier => {
      const row = document.createElement("div");
      row.className = "tier-row admin-tier-row";
      const label = document.createElement("div");
      label.className = "admin-tier-label";
      label.innerHTML = tier.special ? `<strong>${escapeHtml(tier.label)}</strong>` : `<strong>${tier.id}</strong> — ${escapeHtml(tier.label)}`;
      row.append(label);

      const grid = document.createElement("div");
      grid.className = "tier-grid admin-drop-zone";
      const tierGames = games.filter(game => normalizeTier(game) === tier.id);

      tierGames.forEach(game => {
        const card = document.createElement("div");
        card.className = "game-card admin-game-card";
        card.title = "Перетащите игру, чтобы изменить раздел и порядок";
        card.innerHTML = `<img class="game-cover" src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.name)}">`;
        card.querySelector(".game-cover").style.boxShadow = tierGlows[tier.id] || "none";

        const actions = document.createElement("div");
        actions.className = "admin-actions";
        actions.innerHTML = `<button class="edit" type="button">✏️</button><button class="delete" type="button">🗑</button>`;
        actions.querySelector(".edit").onclick = event => { event.stopPropagation(); openEditor(games.indexOf(game)); };
        actions.querySelector(".delete").onclick = event => {
          event.stopPropagation();
          if (!confirm(`Удалить игру «${game.name}»?\n\nИзменение вступит в силу после сохранения.`)) return;
          const index = games.indexOf(game); if (index >= 0) games.splice(index, 1); markDirty(); renderAdminView();
        };
        card.append(actions);
        setupDrag(card, game, grid, tier.id);
        grid.append(card);
      });

      setupGridDrop(grid, tier.id);
      row.append(grid);
      container.append(row);
    });
  }

  async function saveGames() {
    const button = document.getElementById("admin-save");
    if (!button || !dirty) return;
    button.disabled = true; button.textContent = "Сохраняю…";
    try {
      const res = await authFetch(`${API}/games`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ games }) });
      if (!res.ok) { const message = await res.text().catch(() => ""); throw new Error(`Save failed: ${res.status}${message ? ` — ${message}` : ""}`); }
      dirty = false; button.textContent = "✓ Сохранено"; renderAdminView();
    } catch (error) {
      console.error("Games save failed:", error); button.textContent = "Ошибка сохранения"; alert(`Не удалось сохранить изменения.\n\n${error.message}`);
    } finally {
      button.disabled = false;
      if (!dirty) setTimeout(() => { if (button && !dirty) button.textContent = "💾 Сохранить"; }, 1500);
    }
  }

  async function init() {
    if (!isAdmin || section !== "games") return;
    saveHashToken();
    if (!getToken()) { location.replace(`${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
    try {
      const sessionRes = await authFetch(`${API}/session`, { cache:"no-store" });
      if (!sessionRes.ok) throw new Error(`Session check failed: ${sessionRes.status}`);
      const session = await sessionRes.json();
      if (!session.authenticated) { sessionStorage.removeItem(TOKEN_KEY); location.replace(`${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`); return; }
      addStyles(); createToolbar(); await loadGames(); renderAdminView();
    } catch (error) {
      console.error("Admin initialization failed:", error); alert(`Не удалось открыть админку игр.\n\n${error.message}`);
    }
  }

  init();
})();