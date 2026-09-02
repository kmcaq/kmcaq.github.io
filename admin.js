(() => {
  const API = "https://admin.km-tamami.workers.dev";
  const TOKEN_KEY = "admin_token";
  const url = new URL(location.href);
  const isAdmin = url.searchParams.get("admin") === "1";
  const section = location.pathname.split("/").filter(Boolean)[0] || "home";
  if (!isAdmin || section !== "games") return;

  let games = [];
  let dirty = false;
  let draggedGame = null;
  let draggedCard = null;
  let dragAutoScroll = 0;

  const SPECIAL = { NOW: "Играю сейчас", PLANNED: "Не отсортировано" };
  const getToken = () => sessionStorage.getItem(TOKEN_KEY);

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
    const response = await fetch(resource, { ...options, headers });
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      location.replace(`${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      throw new Error("Unauthorized");
    }
    return response;
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function normalizeTier(game) {
    if (game.tier === "NOW" || game.status === SPECIAL.NOW) return "NOW";
    if (game.tier === "PLANNED" || game.tier === "PLAN" || game.status === "В планах") return "PLANNED";
    return game.tier || "PLANNED";
  }

  function markDirty() {
    dirty = true;
    const save = document.getElementById("admin-save");
    if (save) save.textContent = "💾 Сохранить*";
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
      .admin-drop-zone{min-height:48px;border-radius:16px;transition:.15s}
      .admin-drop-zone.admin-over{background:rgba(214,108,255,.10);outline:2px dashed rgba(214,108,255,.55);outline-offset:-2px}
      .admin-dragging{opacity:.35!important;transform:scale(.98)!important}
      .admin-drop-target{outline:2px dashed rgba(214,108,255,.8);outline-offset:4px}
      .admin-game-card{position:relative!important}
      .admin-actions{position:absolute;left:7px;right:7px;top:7px;display:flex;justify-content:flex-end;gap:5px;margin:0!important;z-index:20;pointer-events:none}
      .admin-actions button{pointer-events:auto;width:30px;height:30px;padding:0;border:1px solid rgba(255,255,255,.22);border-radius:8px;background:rgba(17,24,39,.90);color:#fff;cursor:pointer;font:15px/30px sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.45);backdrop-filter:blur(5px)}
      .admin-actions .delete{background:rgba(127,29,29,.92)}
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
    document.head.appendChild(style);
  }

  function createToolbar() {
    const bar = document.createElement("div");
    bar.id = "admin-toolbar";
    bar.innerHTML = `<button id="admin-back">← Обычная страница</button><div class="admin-title">Игровая полка • Админ</div><button id="admin-add">➕ Добавить</button><button id="admin-save">💾 Сохранить</button>`;
    document.body.prepend(bar);
    document.getElementById("admin-back").onclick = () => {
      if (dirty && !confirm("Есть несохранённые изменения. Выйти без сохранения?")) return;
      const clean = new URL(location.href);
      clean.searchParams.delete("admin");
      location.href = clean.pathname + clean.search;
    };
    document.getElementById("admin-add").onclick = () => openEditor(-1);
    document.getElementById("admin-save").onclick = saveGames;
  }

  async function loadGames() {
    const response = await authFetch(`${API}/games`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Games load failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("API /games returned invalid data");
    games = data.map(game => ({ ...game, tier: normalizeTier(game) }));
  }

  function findGameCard(game) {
    return [...document.querySelectorAll("#gameshelfContainer .game-card")].find(card => card.dataset.gameName === (game.name || ""));
  }

  function decorateExistingCards() {
    games.forEach(game => {
      const card = findGameCard(game);
      if (!card || card.dataset.adminDecorated === "1") return;
      card.dataset.adminDecorated = "1";
      card.classList.add("admin-game-card");
      card.draggable = true;
      card.title = "Перетащите игру, чтобы изменить раздел и порядок";
      const publicClick = card.onclick;
      card.onclick = null;
      card.addEventListener("click", event => {
        if (event.target.closest(".admin-actions")) return;
        if (typeof publicClick === "function") publicClick.call(card, event);
      });

      const actions = document.createElement("div");
      actions.className = "admin-actions";
      actions.innerHTML = `<button class="edit" type="button" aria-label="Редактировать">✏️</button><button class="delete" type="button" aria-label="Удалить">🗑</button>`;
      actions.querySelector(".edit").onclick = event => { event.stopPropagation(); openEditor(games.indexOf(game)); };
      actions.querySelector(".delete").onclick = event => { event.stopPropagation(); deleteGame(game); };
      card.appendChild(actions);
      setupDrag(card, game);
    });
  }

  function setupRows() {
    document.querySelectorAll("#gameshelfContainer .tier-row").forEach(row => {
      const tier = row.dataset.tier;
      if (!tier || row.dataset.adminDropReady === "1") return;
      row.dataset.adminDropReady = "1";
      const grid = row.querySelector(".tier-grid");
      if (!grid) return;
      grid.classList.add("admin-drop-zone");
      grid.addEventListener("dragover", event => {
        if (!draggedGame || event.target.closest(".game-card")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        grid.classList.add("admin-over");
        autoScroll(event.clientY);
      });
      grid.addEventListener("dragleave", event => { if (!grid.contains(event.relatedTarget)) grid.classList.remove("admin-over"); });
      grid.addEventListener("drop", event => {
        if (!draggedGame || event.target.closest(".game-card")) return;
        event.preventDefault();
        event.stopPropagation();
        moveToGrid(draggedGame, grid, tier);
      });
    });
  }

  function setupDrag(card, game) {
    card.addEventListener("dragstart", event => {
      if (event.target.closest("button")) { event.preventDefault(); return; }
      draggedGame = game;
      draggedCard = card;
      card.classList.add("admin-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", game.name || "game");
    });
    card.addEventListener("dragend", clearDragState);
    card.addEventListener("dragover", event => {
      if (!draggedGame || draggedGame === game) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      card.classList.add("admin-drop-target");
      autoScroll(event.clientY);
    });
    card.addEventListener("dragleave", () => card.classList.remove("admin-drop-target"));
    card.addEventListener("drop", event => {
      if (!draggedGame || draggedGame === game) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = card.getBoundingClientRect();
      moveToCard(draggedGame, game, card.parentElement, event.clientX < rect.left + rect.width / 2);
    });
  }

  function clearDragState() {
    document.querySelectorAll(".admin-dragging,.admin-drop-target,.admin-over").forEach(element => element.classList.remove("admin-dragging", "admin-drop-target", "admin-over"));
    draggedGame = null;
    draggedCard = null;
    cancelAutoScroll();
  }

  function autoScroll(y) {
    const edge = 80;
    const speed = 14;
    if (y < edge) dragAutoScroll = -speed;
    else if (y > window.innerHeight - edge) dragAutoScroll = speed;
    else dragAutoScroll = 0;
    if (dragAutoScroll && !autoScroll.running) {
      autoScroll.running = true;
      const tick = () => {
        if (!draggedGame || !dragAutoScroll) { autoScroll.running = false; return; }
        window.scrollBy(0, dragAutoScroll);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  function cancelAutoScroll() { dragAutoScroll = 0; }

  function moveToGrid(game, grid, tier) {
    const sourceIndex = games.indexOf(game);
    if (sourceIndex < 0) return;
    games.splice(sourceIndex, 1);
    game.tier = tier;
    const targetCards = [...grid.querySelectorAll(":scope > .game-card")].filter(card => card !== draggedCard);
    if (draggedCard) grid.appendChild(draggedCard);
    insertGameObjectAtTierIndex(game, tier, targetCards.length);
    markDirty();
    clearDragState();
  }

  function moveToCard(game, targetGame, targetGrid, before) {
    const sourceIndex = games.indexOf(game);
    if (sourceIndex < 0) return;
    games.splice(sourceIndex, 1);
    const tier = targetGrid.closest(".tier-row")?.dataset.tier || "PLANNED";
    game.tier = tier;
    if (draggedCard) {
      if (before) targetGrid.insertBefore(draggedCard, targetGrid.querySelector(`[data-game-name="${CSS.escape(targetGame.name)}"]`));
      else {
        const targetCard = targetGrid.querySelector(`[data-game-name="${CSS.escape(targetGame.name)}"]`);
        if (targetCard) targetGrid.insertBefore(draggedCard, targetCard.nextSibling);
      }
    }
    rebuildOrderFromDom();
    markDirty();
    clearDragState();
  }

  function insertGameObjectAtTierIndex(game, tier, index) {
    const tierGames = games.filter(item => normalizeTier(item) === tier && item !== game);
    const before = tierGames[index];
    if (!before) games.push(game);
    else games.splice(games.indexOf(before), 0, game);
  }

  function rebuildOrderFromDom() {
    const ordered = [];
    document.querySelectorAll("#gameshelfContainer .tier-row").forEach(row => {
      const tier = row.dataset.tier;
      row.querySelectorAll(":scope > .tier-grid > .game-card").forEach(card => {
        const game = games.find(item => item.name === card.dataset.gameName);
        if (game) { game.tier = tier; ordered.push(game); }
      });
    });
    games = ordered;
  }

  function deleteGame(game) {
    if (!confirm(`Удалить игру «${game.name}»?`)) return;
    const index = games.indexOf(game);
    if (index >= 0) games.splice(index, 1);
    const card = findGameCard(game);
    if (card) card.remove();
    markDirty();
  }

  function openEditor(index) {
    const source = index < 0 ? { name: "", tier: "PLANNED", rating: 0, status: "", hours: 0, deaths: 0, cover: "", playlist: "" } : { ...games[index] };
    const currentTier = normalizeTier(source);
    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true">
        <h2>${index < 0 ? "Новая игра" : "Редактирование игры"}</h2>
        <form class="admin-form">
          <label>Название<input name="name" required value="${escapeHtml(source.name)}"></label>
          <label>Раздел<select name="tier"><option value="NOW">Играю сейчас</option><option value="S">S — Легендарно</option><option value="A">A — Отлично</option><option value="B">B — Хорошо</option><option value="C">C — Нормально</option><option value="D">D — Слабо</option><option value="F">F — Не понравилось</option><option value="PLANNED">Не отсортировано</option></select></label>
          <label>Оценка<input name="rating" type="number" min="0" max="10" step="0.1" value="${escapeHtml(source.rating)}"></label>
          <label>Статус<input name="status" value="${escapeHtml(source.status)}" placeholder="Пройдено / Прохожу"></label>
          <label>Часы<input name="hours" type="number" min="0" step="1" value="${escapeHtml(source.hours)}"></label>
          <label>Смерти<input name="deaths" type="number" min="0" step="1" value="${escapeHtml(source.deaths)}"></label>
          <label>Обложка<input name="cover" required value="${escapeHtml(source.cover)}" placeholder="../covers/game.png"></label>
          <label>Плейлист<input name="playlist" value="${escapeHtml(source.playlist)}" placeholder="https://youtube.com/playlist?list="></label>
          <div class="admin-form-actions"><button type="button" class="secondary" data-cancel>Отмена</button><button type="submit" class="primary">${index < 0 ? "Добавить" : "Применить"}</button></div>
        </form>
      </div>`;
    document.body.appendChild(backdrop);
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
      if (index < 0) {
        games.push(value);
        appendNewGameCard(value);
      } else {
        const oldName = games[index].name;
        games[index] = value;
        const card = [...document.querySelectorAll("#gameshelfContainer .game-card")].find(item => item.dataset.gameName === oldName);
        if (card) {
          card.dataset.gameName = value.name;
          card.querySelector(".game-cover").src = value.cover;
          card.querySelector(".game-cover").alt = value.name;
          const targetGrid = document.querySelector(`#gameshelfContainer .tier-row[data-tier="${CSS.escape(value.tier)}"] .tier-grid`);
          if (targetGrid && card.parentElement !== targetGrid) targetGrid.appendChild(card);
        }
      }
      rebuildOrderFromDom();
      markDirty();
      backdrop.remove();
    });
    form.elements.name.focus();
  }

  function appendNewGameCard(game) {
    const grid = document.querySelector('#gameshelfContainer .tier-row[data-tier="PLANNED"] .tier-grid');
    if (!grid) return;
    const card = document.createElement("div");
    card.className = "game-card admin-game-card";
    card.dataset.gameName = game.name;
    card.draggable = true;
    card.title = "Перетащите игру, чтобы изменить раздел и порядок";
    card.innerHTML = `<img class="game-cover" src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.name)}">`;
    const actions = document.createElement("div");
    actions.className = "admin-actions";
    actions.innerHTML = `<button class="edit" type="button" aria-label="Редактировать">✏️</button><button class="delete" type="button" aria-label="Удалить">🗑</button>`;
    actions.querySelector(".edit").onclick = event => { event.stopPropagation(); openEditor(games.indexOf(game)); };
    actions.querySelector(".delete").onclick = event => { event.stopPropagation(); deleteGame(game); };
    card.appendChild(actions);
    setupDrag(card, game);
    grid.appendChild(card);
  }

  async function saveGames() {
    const button = document.getElementById("admin-save");
    if (button) button.disabled = true;
    try {
      rebuildOrderFromDom();
      const response = await authFetch(`${API}/games`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ games }) });
      if (!response.ok) throw new Error(`Games save failed: ${response.status}`);
      dirty = false;
      if (button) button.textContent = "💾 Сохранить";
    } catch (error) {
      console.error(error);
      alert("Не удалось сохранить игры.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function waitForShelf() {
    const container = document.getElementById("gameshelfContainer");
    if (!container) return;
    if (container.querySelectorAll(".tier-row").length < 8) { setTimeout(waitForShelf, 50); return; }
    decorateExistingCards();
    setupRows();
    const hint = document.createElement("p");
    hint.className = "admin-drag-hint";
    hint.textContent = "Перетаскивай игры между строками и внутри строк. При подведении к краю экрана страница прокручивается автоматически.";
    container.prepend(hint);
  }

  async function init() {
    addStyles();
    createToolbar();
    try {
      saveHashToken();
      if (!getToken()) {
        location.replace(`${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }
      const session = await authFetch(`${API}/session`, { cache: "no-store" });
      if (!session.ok) throw new Error("Session check failed");
      await loadGames();
      document.body.classList.add("admin-mode");
      waitForShelf();
    } catch (error) {
      console.error(error);
      alert("Не удалось открыть режим администратора.");
    }
  }

  init();
})();
