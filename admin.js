(() => {
  const API = "https://admin.km-tamami.workers.dev";
  const TOKEN_KEY = "admin_token";
  const url = new URL(location.href);
  if (url.searchParams.get("admin") !== "1") return;
  const section = location.pathname.split("/").filter(Boolean)[0] || "home";
  if (section !== "games") return;

  let games = [];
  let dirty = false;
  let draggedGame = null;
  let draggedCard = null;
  let dragScrollDirection = 0;
  let dragScrollRunning = false;

  const TIERS = ["NOW", "S", "A", "B", "C", "D", "F", "PLANNED"];
  const STATUSES = ["Прохожу", "Завершено", "Дроп", "В планах"];

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

  function normalizeStatus(status) {
    if (status === "Пройдено") return "Завершено";
    if (status === "Запланировано") return "В планах";
    return STATUSES.includes(status) ? status : "Прохожу";
  }

  function normalizeTier(game) {
    if (game.tier === "NOW" || game.status === "Играю сейчас" || game.status === "Прохожу") return "NOW";
    if (game.tier === "PLANNED" || game.tier === "PLAN" || game.status === "В планах" || game.status === "Запланировано") return "PLANNED";
    if (game.status === "Дроп") return "F";
    return TIERS.includes(game.tier) ? game.tier : "PLANNED";
  }

  function automaticTier(rating, status) {
    if (status === "Играю сейчас" || status === "Прохожу") return "NOW";
    if (status === "В планах" || status === "Запланировано") return "PLANNED";
    if (status === "Дроп") return "F";

    const value = Math.floor(Number(rating));
    if (!Number.isFinite(value) || value <= 0) return null;
    if (value >= 10) return "S";
    if (value >= 8) return "A";
    if (value >= 6) return "B";
    if (value >= 4) return "C";
    if (value >= 2) return "D";
    return "F";
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
      #admin-toolbar{position:fixed;top:0;left:0;right:0;height:60px;display:flex;align-items:center;gap:12px;padding:0 20px;background:#0d1117;border-bottom:1px solid rgba(255,255,255,.08);z-index:99999;box-sizing:border-box}
      #admin-toolbar button{border:0;border-radius:10px;padding:10px 16px;cursor:pointer;color:#fff;background:#ef4444;font:inherit}
      #admin-toolbar button:disabled{opacity:.55;cursor:wait}
      .admin-title{flex:1;font-weight:700}
      .admin-drop-zone{min-height:48px;border-radius:16px;transition:.15s}
      .admin-drop-zone.admin-over{background:rgba(214,108,255,.10);outline:2px dashed rgba(214,108,255,.55);outline-offset:-2px}
      .admin-dragging{opacity:.35!important;transform:scale(.98)!important}
      .admin-drop-target{outline:2px dashed rgba(214,108,255,.8);outline-offset:4px}
      .admin-game-card{position:relative!important}
      .admin-actions{position:absolute;left:7px;right:7px;top:7px;display:flex;justify-content:flex-end;gap:5px;margin:0!important;z-index:20;pointer-events:none}
      .admin-actions button{pointer-events:auto;width:30px;height:30px;padding:0;border:1px solid rgba(255,255,255,.22);border-radius:8px;background:rgba(17,24,39,.90);color:#fff;cursor:pointer;font:15px/30px sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.45);backdrop-filter:blur(5px)}
      .admin-actions .delete{background:rgba(127,29,29,.92)}
      .admin-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;z-index:100000}
      .admin-modal{width:min(560px,100%);max-height:90vh;overflow:auto;background:#151922;border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:24px;color:#fff;box-shadow:0 20px 70px rgba(0,0,0,.5);box-sizing:border-box}
      .admin-modal h2{margin:0 0 18px}
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
    if (document.getElementById("admin-toolbar")) return;
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
    document.getElementById("admin-add").onclick = () => openEditor(null);
    document.getElementById("admin-save").onclick = saveGames;
  }

  async function loadGames() {
    const response = await authFetch(`${API}/games`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Games load failed: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("API /games returned invalid data");
    games = data.map(game => ({ ...game, status: normalizeStatus(game.status), tier: normalizeTier(game) }));
  }

  function getGameName(game) {
    return String(game?.name || "");
  }

  function findGameIndex(gameOrName) {
    const name = typeof gameOrName === "string" ? gameOrName : getGameName(gameOrName);
    return games.findIndex(game => getGameName(game) === name);
  }

  function findGameCard(gameOrName) {
    const name = typeof gameOrName === "string" ? gameOrName : getGameName(gameOrName);
    return [...document.querySelectorAll("#gameshelfContainer .game-card")].find(card => card.dataset.gameName === name) || null;
  }

  function findGrid(tier) {
    return document.querySelector(`#gameshelfContainer .tier-row[data-tier="${CSS.escape(tier)}"] .tier-grid`);
  }

  function addActions(card) {
    if (!card || card.querySelector(".admin-actions")) return;
    const actions = document.createElement("div");
    actions.className = "admin-actions";
    actions.innerHTML = `<button class="edit" type="button" aria-label="Редактировать">✏️</button><button class="delete" type="button" aria-label="Удалить">🗑</button>`;
    actions.querySelector(".edit").onclick = event => {
      event.stopPropagation();
      openEditor(card.dataset.gameName);
    };
    actions.querySelector(".delete").onclick = event => {
      event.stopPropagation();
      deleteGame(card.dataset.gameName);
    };
    card.appendChild(actions);
  }

  function decorateCard(card) {
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

    addActions(card);
    setupDrag(card);
  }

  function decorateExistingCards() {
    games.forEach(game => decorateCard(findGameCard(game)));
  }

  function setupRows() {
    document.querySelectorAll("#gameshelfContainer .tier-row").forEach(row => {
      const tier = row.dataset.tier;
      const grid = row.querySelector(":scope > .tier-grid");
      if (!tier || !grid || grid.dataset.adminDropReady === "1") return;

      grid.dataset.adminDropReady = "1";
      grid.classList.add("admin-drop-zone");
      grid.addEventListener("dragover", event => {
        if (!draggedGame || event.target.closest(".game-card")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        grid.classList.add("admin-over");
      });
      grid.addEventListener("dragleave", event => {
        if (!grid.contains(event.relatedTarget)) grid.classList.remove("admin-over");
      });
      grid.addEventListener("drop", event => {
        if (!draggedGame || event.target.closest(".game-card")) return;
        event.preventDefault();
        event.stopPropagation();
        moveToGrid(draggedGame, grid, tier);
      });
    });
  }

  function setupGlobalDragScroll() {
    if (document.body.dataset.adminGlobalDrag === "1") return;
    document.body.dataset.adminGlobalDrag = "1";
    document.addEventListener("dragover", event => {
      if (!draggedGame) return;
      const edge = 120;
      if (event.clientY < edge) dragScrollDirection = -1;
      else if (event.clientY > window.innerHeight - edge) dragScrollDirection = 1;
      else dragScrollDirection = 0;
      runDragScroll();
    });
  }

  function runDragScroll() {
    if (dragScrollRunning || !dragScrollDirection) return;
    dragScrollRunning = true;
    const tick = () => {
      if (!draggedGame || !dragScrollDirection) {
        dragScrollRunning = false;
        return;
      }
      window.scrollBy(0, dragScrollDirection * 16);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function setupDrag(card) {
    card.addEventListener("dragstart", event => {
      if (event.target.closest("button")) {
        event.preventDefault();
        return;
      }
      const name = card.dataset.gameName;
      if (findGameIndex(name) < 0) return;
      draggedGame = name;
      draggedCard = card;
      card.classList.add("admin-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", name);
    });

    card.addEventListener("dragend", clearDragState);
    card.addEventListener("dragover", event => {
      if (!draggedGame || draggedGame === card.dataset.gameName) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      card.classList.add("admin-drop-target");
    });
    card.addEventListener("dragleave", () => card.classList.remove("admin-drop-target"));
    card.addEventListener("drop", event => {
      if (!draggedGame || draggedGame === card.dataset.gameName) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = card.getBoundingClientRect();
      moveToCard(draggedGame, card.dataset.gameName, card.parentElement, event.clientX < rect.left + rect.width / 2);
    });
  }

  function clearDragState() {
    document.querySelectorAll(".admin-dragging,.admin-drop-target,.admin-over").forEach(element => {
      element.classList.remove("admin-dragging", "admin-drop-target", "admin-over");
    });
    draggedGame = null;
    draggedCard = null;
    dragScrollDirection = 0;
  }

  function moveToGrid(gameName, grid, tier) {
    const sourceIndex = findGameIndex(gameName);
    if (sourceIndex < 0 || !draggedCard) return;
    const game = games[sourceIndex];
    game.tier = tier;
    grid.appendChild(draggedCard);
    rebuildOrderFromDom();
    markDirty();
    clearDragState();
  }

  function moveToCard(gameName, targetName, targetGrid, before) {
    const sourceIndex = findGameIndex(gameName);
    if (sourceIndex < 0 || !draggedCard) return;
    const game = games[sourceIndex];
    game.tier = targetGrid.closest(".tier-row")?.dataset.tier || "PLANNED";
    const targetCard = [...targetGrid.children].find(card => card.dataset.gameName === targetName);
    if (targetCard) {
      if (before) targetGrid.insertBefore(draggedCard, targetCard);
      else targetGrid.insertBefore(draggedCard, targetCard.nextSibling);
    } else {
      targetGrid.appendChild(draggedCard);
    }
    rebuildOrderFromDom();
    markDirty();
    clearDragState();
  }

  function rebuildOrderFromDom() {
    const byName = new Map(games.map(game => [getGameName(game), game]));
    const ordered = [];

    document.querySelectorAll("#gameshelfContainer .tier-row").forEach(row => {
      const tier = row.dataset.tier;
      row.querySelectorAll(":scope > .tier-grid > .game-card").forEach(card => {
        const game = byName.get(card.dataset.gameName);
        if (!game) return;
        game.tier = tier;
        ordered.push(game);
      });
    });

    const seen = new Set(ordered.map(getGameName));
    games.forEach(game => {
      if (!seen.has(getGameName(game))) ordered.push(game);
    });

    games = ordered;
  }

  function deleteGame(gameName) {
    const index = findGameIndex(gameName);
    if (index < 0) return;
    if (!confirm(`Удалить игру «${games[index].name}»?`)) return;
    games.splice(index, 1);
    const card = findGameCard(gameName);
    if (card) card.remove();
    markDirty();
  }

  function createCardFromExisting(game, tier) {
    const grid = findGrid(tier);
    if (!grid) return null;
    const template = grid.querySelector(":scope > .game-card") || document.querySelector("#gameshelfContainer .game-card");
    if (!template) return null;
    const card = template.cloneNode(true);
    card.dataset.gameName = game.name || "";
    card.dataset.adminDecorated = "";
    card.classList.add("admin-game-card");
    const image = card.querySelector(".game-cover");
    if (image) {
      image.src = game.cover || "";
      image.alt = game.name || "";
    }
    const oldActions = card.querySelector(".admin-actions");
    if (oldActions) oldActions.remove();
    grid.appendChild(card);
    decorateCard(card);
    return card;
  }

  function refreshCard(card, game) {
    if (!card) return;
    card.dataset.gameName = game.name || "";
    const image = card.querySelector(".game-cover");
    if (image) {
      image.src = game.cover || "";
      image.alt = game.name || "";
    }
  }

  function moveCardToTier(card, tier) {
    const grid = findGrid(tier);
    if (grid && card && card.parentElement !== grid) grid.appendChild(card);
  }

  function openEditor(gameName = null) {
    const index = gameName === null ? -1 : findGameIndex(gameName);
    if (gameName !== null && index < 0) return;

    const source = index < 0
      ? { name: "", tier: "PLANNED", rating: "", status: "В планах", hours: 0, deaths: 0, cover: "", playlist: "" }
      : { ...games[index], status: normalizeStatus(games[index].status) };

    source.tier = normalizeTier(source);
    if (!STATUSES.includes(source.status)) source.status = source.tier === "PLANNED" ? "В планах" : "Прохожу";

    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true">
        <h2>${index < 0 ? "Новая игра" : "Редактирование игры"}</h2>
        <form class="admin-form">
          <label>Название<input name="name" required></label>
          <label>Тир<select name="tier">
            <option value="NOW">Играю сейчас</option>
            <option value="S">S — Легендарно</option>
            <option value="A">A — Отлично</option>
            <option value="B">B — Хорошо</option>
            <option value="C">C — Нормально</option>
            <option value="D">D — Слабо</option>
            <option value="F">F — Не понравилось</option>
            <option value="PLANNED">В планах</option>
          </select></label>
          <label>Оценка<input name="rating" type="number" min="0" max="10" step="0.1" inputmode="decimal"></label>
          <label>Статус<select name="status">
            <option value="Прохожу">Прохожу</option>
            <option value="Завершено">Завершено</option>
            <option value="Дроп">Дроп</option>
            <option value="В планах">В планах</option>
          </select></label>
          <label>Часы<input name="hours" type="number" min="0" step="1"></label>
          <label>Смерти<input name="deaths" type="number" min="0" step="1"></label>
          <label>Обложка<input name="cover" type="text" placeholder="../covers/game.png"></label>
          <label>Плейлист<input name="playlist" type="url" placeholder="https://youtube.com/playlist?..." ></label>
          <div class="admin-form-actions">
            <button class="secondary" type="button" data-cancel>Отмена</button>
            <button class="primary" type="submit">Сохранить</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(backdrop);

    const form = backdrop.querySelector("form");
    const tierInput = form.elements.tier;
    const ratingInput = form.elements.rating;
    const statusInput = form.elements.status;

    form.elements.name.value = source.name ?? "";
    tierInput.value = source.tier;
    ratingInput.value = source.rating ?? "";
    statusInput.value = source.status;
    form.elements.hours.value = source.hours ?? 0;
    form.elements.deaths.value = source.deaths ?? 0;
    form.elements.cover.value = source.cover ?? "";
    form.elements.playlist.value = source.playlist ?? "";

    const applyAutomaticTier = () => {
      const tier = automaticTier(ratingInput.value, statusInput.value);
      if (tier) tierInput.value = tier;
    };

    const clampRating = () => {
      if (ratingInput.value === "") {
        applyAutomaticTier();
        return;
      }
      const value = Number(ratingInput.value);
      if (Number.isFinite(value)) {
        const clamped = Math.min(10, Math.max(0, value));
        if (value !== clamped) ratingInput.value = String(clamped);
      }
      applyAutomaticTier();
    };

    ratingInput.addEventListener("input", clampRating);
    statusInput.addEventListener("change", applyAutomaticTier);

    backdrop.querySelector("[data-cancel]").onclick = () => backdrop.remove();
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) backdrop.remove();
    });

    form.addEventListener("submit", event => {
      event.preventDefault();

      const oldName = gameName;
      let game;
      if (index < 0) {
        game = {};
        games.push(game);
      } else {
        const currentIndex = findGameIndex(oldName);
        if (currentIndex < 0) return;
        game = games[currentIndex];
      }

      game.name = form.elements.name.value.trim();
      game.status = normalizeStatus(statusInput.value);

      const rawRating = ratingInput.value;
      if (rawRating === "") {
        game.rating = null;
      } else {
        const value = Number(rawRating);
        game.rating = Number.isFinite(value) ? Math.min(10, Math.max(0, value)) : null;
      }

      game.tier = automaticTier(game.rating, game.status) || tierInput.value;
      game.hours = Number(form.elements.hours.value || 0);
      game.deaths = Number(form.elements.deaths.value || 0);
      game.cover = form.elements.cover.value.trim();
      game.playlist = form.elements.playlist.value.trim();

      if (!game.name) {
        if (index < 0) games.pop();
        return;
      }

      if (index < 0) {
        createCardFromExisting(game, game.tier);
      } else {
        const card = findGameCard(oldName);
        refreshCard(card, game);
        moveCardToTier(card, game.tier);
        if (card) {
          card.dataset.gameName = game.name;
          card.dataset.adminDecorated = "1";
        }
      }

      rebuildOrderFromDom();
      markDirty();
      backdrop.remove();
    });
  }

  async function saveGames() {
    const button = document.getElementById("admin-save");
    if (button) button.disabled = true;
    try {
      rebuildOrderFromDom();
      const response = await authFetch(`${API}/games`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games })
      });
      if (!response.ok) throw new Error(`Save failed: ${response.status}`);
      dirty = false;
      if (button) button.textContent = "💾 Сохранено";
    } catch (error) {
      console.error(error);
      alert("Не удалось сохранить изменения.");
      if (button) button.textContent = "💾 Сохранить*";
    } finally {
      if (button) button.disabled = false;
    }
  }

  function waitForShelf() {
    return new Promise((resolve, reject) => {
      const shelf = document.getElementById("gameshelfContainer");
      if (!shelf) {
        reject(new Error("gameshelfContainer not found"));
        return;
      }
      if (shelf.querySelector(".tier-row")) {
        resolve();
        return;
      }
      const observer = new MutationObserver(() => {
        if (shelf.querySelector(".tier-row")) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(shelf, { childList: true });
      setTimeout(() => {
        observer.disconnect();
        if (shelf.querySelector(".tier-row")) resolve();
        else reject(new Error("gameshelf did not render"));
      }, 10000);
    });
  }

  async function init() {
    saveHashToken();
    addStyles();
    createToolbar();
    setupGlobalDragScroll();

    try {
      await loadGames();
      await waitForShelf();
      decorateExistingCards();
      setupRows();
    } catch (error) {
      console.error("Ошибка запуска админки:", error);
      alert("Не удалось загрузить данные игровой полки.");
    }
  }

  window.addEventListener("beforeunload", event => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  init();
})();
