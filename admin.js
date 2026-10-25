(() => {
  const API = "https://admin.km-tamami.workers.dev",
    TOKEN_KEY = "admin_token";
  const url = new URL(location.href);
  if (
    url.searchParams.get("admin") !== "1" ||
    location.pathname.split("/").filter(Boolean)[0] !== "games"
  )
    return;
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/css/admin.css?v=20261025-audit-1";
  document.head.append(stylesheet);
  let games = [],
    covers = [],
    dirty = false,
    revision = 0,
    draggedGame = null,
    draggedCard = null;
  const data = window.GameData;
  const TIERS = data.tiers.map((tier) => tier.id);
  const getToken = () => sessionStorage.getItem(TOKEN_KEY),
    coverName = (p) =>
      String(p || "")
        .split("/")
        .pop();
  function saveHashToken() {
    const h = new URLSearchParams(location.hash.slice(1)),
      t = h.get("token");
    if (t) {
      sessionStorage.setItem(TOKEN_KEY, t);
      history.replaceState(null, "", location.pathname + location.search);
    }
  }
  class LoginRedirect extends Error {}
  let redirectingToLogin = false;
  function redirectToLogin() {
    if (!redirectingToLogin) {
      redirectingToLogin = true;
      location.replace(
        `${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`,
      );
    }
    return new LoginRedirect("Требуется авторизация");
  }
  async function authFetch(resource, options = {}) {
    const token = getToken();
    if (!token) {
      throw redirectToLogin();
    }
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        throw redirectToLogin();
      }
      const body = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        json: async () => JSON.parse(body),
      };
    } finally {
      clearTimeout(timer);
    }
  }
  const normalizeStatus = data.normalizeStatus,
    automaticTier = data.automaticTier;
  function markDirty() {
    dirty = true;
    revision++;
    const b = document.getElementById("admin-save");
    if (b) b.textContent = "💾 Сохранить*";
  }
  function uploadStatus(m) {
    document.querySelector(".admin-upload-status")?.remove();
    const e = document.createElement("div");
    e.className = "admin-upload-status";
    e.textContent = m;
    document.body.appendChild(e);
    return e;
  }
  async function refreshCovers() {
    const r = await fetch(
      `https://api.github.com/repos/kmcaq/kmcaq.github.io/contents/covers?ref=main&_=${Date.now()}`,
      { cache: "no-store", headers: { Accept: "application/vnd.github+json" } },
    );
    if (!r.ok) throw Error(`Не удалось обновить список обложек: ${r.status}`);
    const d = await r.json();
    covers = Array.isArray(d)
      ? d
          .filter(
            (c) => c.type === "file" && /\.(png|jpe?g|webp)$/i.test(c.name),
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];
  }
  async function uploadCover(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type))
      return void uploadStatus("Можно загрузить только PNG, JPEG или WebP.");
    if (file.size > 10 * 1024 * 1024)
      return void uploadStatus("Обложка слишком большая. Максимум — 10 МБ.");
    if (
      dirty &&
      !confirm(
        "Есть несохранённые изменения. Загрузка обложки их не сбросит. Продолжить?",
      )
    )
      return;
    const name = prompt(
      "Название игры для обложки:",
      file.name.replace(/\.[^.]+$/, ""),
    );
    if (name === null) return;
    const game = name.trim();
    if (!game) return void uploadStatus("Название игры не может быть пустым.");
    const form = new FormData();
    form.append("file", file);
    form.append("game", game);
    const msg = uploadStatus("Загружаю обложку…"),
      button = document.getElementById("admin-upload-cover");
    if (button) button.disabled = true;
    try {
      const r = await authFetch(`${API}/upload-cover`, {
          method: "POST",
          body: form,
        }),
        d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok)
        throw Error(d.error || "Не удалось загрузить обложку.");
      await new Promise((resolve) => setTimeout(resolve, 700));
      await refreshCovers();
      msg.textContent = "Обложка загружена и доступна в выборе.";
      setTimeout(() => msg.remove(), 2200);
    } catch (e) {
      if (e instanceof LoginRedirect) return;
      msg.textContent = e?.message || "Не удалось загрузить обложку.";
    } finally {
      if (button) button.disabled = false;
    }
  }
  function createToolbar() {
    if (document.getElementById("admin-toolbar")) return;
    const b = document.createElement("div");
    b.id = "admin-toolbar";
    b.innerHTML = `<button id="admin-back">← Обычная</button><div class="admin-title">Игровая полка • Админ</div><button id="admin-upload-cover" type="button">🖼️ Обложка</button><button id="admin-add">➕ Добавить</button><button id="admin-save">💾 Сохранить</button><input id="admin-cover-file" type="file" accept="image/png,image/jpeg,image/webp">`;
    document.body.prepend(b);
    document.body.classList.add("admin-mode");
    for (const id of ["admin-add", "admin-save", "admin-upload-cover"])
      document.getElementById(id).disabled = true;
    document.getElementById("admin-back").onclick = () => {
      if (
        dirty &&
        !confirm("Есть несохранённые изменения. Выйти без сохранения?")
      )
        return;
      const u = new URL(location.href);
      u.searchParams.delete("admin");
      location.href = u.pathname + u.search;
    };
    document.getElementById("admin-add").onclick = () => openEditor(null);
    document.getElementById("admin-save").onclick = saveGames;
    const input = document.getElementById("admin-cover-file");
    document.getElementById("admin-upload-cover").onclick = () => input.click();
    input.onchange = () => {
      const f = input.files?.[0];
      input.value = "";
      uploadCover(f);
    };
  }
  const getGameName = (g) => String(g?.name || ""),
    findGameIndex = (n) =>
      games.findIndex(
        (g) => getGameName(g) === (typeof n === "string" ? n : getGameName(n)),
      ),
    findGameCard = (n) =>
      [...document.querySelectorAll("#gameshelfContainer .game-card")].find(
        (c) =>
          c.dataset.gameName === (typeof n === "string" ? n : getGameName(n)),
      ) || null,
    findGrid = (t) =>
      [...document.querySelectorAll("#gameshelfContainer .tier-row")]
        .find((row) => row.dataset.tier === t)
        ?.querySelector(".tier-grid");
  function addActions(card) {
    if (!card || card.querySelector(".admin-actions")) return;
    const a = document.createElement("div");
    a.className = "admin-actions";
    a.innerHTML = `<button class="edit" type="button" aria-label="Редактировать">✏️</button><button class="delete" type="button" aria-label="Удалить">🗑</button>`;
    a.querySelector(".edit").onclick = (e) => {
      e.stopPropagation();
      openEditor(card.dataset.gameName);
    };
    a.querySelector(".delete").onclick = (e) => {
      e.stopPropagation();
      deleteGame(card.dataset.gameName);
    };
    card.appendChild(a);
  }
  function decorateCard(card) {
    if (!card || card.dataset.adminDecorated === "1") return;
    card.dataset.adminDecorated = "1";
    card.classList.add("admin-game-card");
    card.draggable = true;
    card.title = "Перетащите игру, чтобы изменить раздел и порядок";
    addActions(card);
    setupDrag(card);
  }
  function setupRows() {
    document
      .querySelectorAll("#gameshelfContainer .tier-row")
      .forEach((row) => {
        const tier = row.dataset.tier,
          grid = row.querySelector(":scope > .tier-grid");
        if (!tier || !grid || grid.dataset.adminDropReady === "1") return;
        grid.dataset.adminDropReady = "1";
        grid.classList.add("admin-drop-zone");
        grid.addEventListener("dragover", (e) => {
          if (!draggedGame || e.target.closest(".game-card")) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          grid.classList.add("admin-over");
        });
        grid.addEventListener("dragleave", (e) => {
          if (!grid.contains(e.relatedTarget))
            grid.classList.remove("admin-over");
        });
        grid.addEventListener("drop", (e) => {
          if (!draggedGame || e.target.closest(".game-card")) return;
          e.preventDefault();
          e.stopPropagation();
          moveToGrid(draggedGame, grid, tier);
        });
      });
  }
  function setupDrag(card) {
    card.addEventListener("dragstart", (e) => {
      if (e.target.closest(".admin-actions")) {
        e.preventDefault();
        return;
      }
      const n = card.dataset.gameName;
      if (findGameIndex(n) < 0) return;
      draggedGame = n;
      draggedCard = card;
      card.classList.add("admin-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", n);
    });
    card.addEventListener("dragend", clearDragState);
    card.addEventListener("dragover", (e) => {
      if (!draggedGame || draggedGame === card.dataset.gameName) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      card.classList.add("admin-drop-target");
    });
    card.addEventListener("dragleave", () =>
      card.classList.remove("admin-drop-target"),
    );
    card.addEventListener("drop", (e) => {
      if (!draggedGame || draggedGame === card.dataset.gameName) return;
      e.preventDefault();
      e.stopPropagation();
      const r = card.getBoundingClientRect();
      moveToCard(
        draggedGame,
        card.dataset.gameName,
        card.parentElement,
        e.clientX < r.left + r.width / 2,
      );
    });
  }
  function clearDragState() {
    document
      .querySelectorAll(".admin-dragging,.admin-drop-target,.admin-over")
      .forEach((e) =>
        e.classList.remove("admin-dragging", "admin-drop-target", "admin-over"),
      );
    draggedGame = null;
    draggedCard = null;
  }
  function moveToGrid(n, g, t) {
    const i = findGameIndex(n);
    if (i < 0 || !draggedCard) return;
    Object.assign(games[i], data.moveToTier(games[i], t));
    g.appendChild(draggedCard);
    rebuildOrderFromDom();
    markDirty();
    clearDragState();
  }
  function moveToCard(n, targetName, targetGrid, before) {
    const i = findGameIndex(n);
    if (i < 0 || !draggedCard) return;
    Object.assign(
      games[i],
      data.moveToTier(
        games[i],
        targetGrid.closest(".tier-row")?.dataset.tier || "PLANNED",
      ),
    );
    const target = [...targetGrid.children].find(
      (c) => c.dataset.gameName === targetName,
    );
    if (target)
      before
        ? targetGrid.insertBefore(draggedCard, target)
        : targetGrid.insertBefore(draggedCard, target.nextSibling);
    else targetGrid.appendChild(draggedCard);
    rebuildOrderFromDom();
    markDirty();
    clearDragState();
  }
  function rebuildOrderFromDom() {
    const byName = new Map(games.map((g) => [getGameName(g), g])),
      ordered = [];
    document
      .querySelectorAll("#gameshelfContainer .tier-row")
      .forEach((row) => {
        const tier = row.dataset.tier;
        row
          .querySelectorAll(":scope > .tier-grid > .game-card")
          .forEach((card) => {
            const g = byName.get(card.dataset.gameName);
            if (!g) return;
            g.tier = tier;
            ordered.push(g);
          });
      });
    const seen = new Set(ordered.map(getGameName));
    games.forEach((g) => {
      if (!seen.has(getGameName(g))) ordered.push(g);
    });
    games.splice(0, games.length, ...ordered);
  }
  function deleteGame(n) {
    const i = findGameIndex(n);
    if (i < 0 || !confirm(`Удалить игру «${games[i].name}»?`)) return;
    games.splice(i, 1);
    findGameCard(n)?.remove();
    markDirty();
  }
  function availableCovers(current) {
    const used = new Set(games.map((g) => coverName(g.cover)).filter(Boolean));
    return covers.filter((c) => c.name === current || !used.has(c.name));
  }
  function appendGameCard(game, tier) {
    const grid = findGrid(tier);
    if (!grid) throw Error("Не найден раздел игровой полки.");
    const card = window.GameShelf.createCard(game);
    grid.appendChild(card);
    decorateCard(card);
    return card;
  }
  function refreshCard(card, game) {
    if (!card) return;
    card.dataset.gameName = game.name;
    const image = card.querySelector(".game-cover");
    image.src = data.safeCover(game.cover) || "/avatar.webp";
    image.alt = "Обложка " + game.name;
    card
      .querySelector(".game-open")
      .setAttribute("aria-label", game.name + " — подробнее");
  }
  function moveCardToTier(card, t) {
    const grid = findGrid(t);
    if (grid && card && card.parentElement !== grid) grid.appendChild(card);
  }
  function openEditor(gameName = null) {
    const index = gameName === null ? -1 : findGameIndex(gameName);
    if (gameName !== null && index < 0) return;
    const source =
      index < 0
        ? {
            name: "",
            tier: "PLANNED",
            rating: "",
            status: "В планах",
            hours: 0,
            deaths: 0,
            cover: "",
            playlist: "",
          }
        : { ...games[index], status: normalizeStatus(games[index].status) };
    source.tier = TIERS.includes(source.tier)
      ? source.tier
      : source.status === "Прохожу"
        ? "NOW"
        : source.status === "Дроп"
          ? "F"
          : source.status === "В планах"
            ? "PLANNED"
            : "PLANNED";
    const current = coverName(source.cover),
      available = availableCovers(current),
      backdrop = document.createElement("dialog");
    backdrop.className = "admin-modal-backdrop";
    backdrop.setAttribute("aria-labelledby", "admin-editor-title");
    backdrop.innerHTML = `<div class="admin-modal"><h2 id="admin-editor-title">${index < 0 ? "Новая игра" : "Редактирование игры"}</h2><form class="admin-form"><label>Название<input name="name" required></label><label>Статус<select name="status"><option>Прохожу</option><option>Завершено</option><option>Дроп</option><option>В планах</option><option>Заморозка</option></select></label><label>Оценка<input name="rating" type="number" min="0" max="10" step="0.1" inputmode="decimal"></label><label>Режим тира<select name="tierMode"><option value="manual">Выбрать вручную</option><option value="auto">Определять по оценке и статусу</option></select></label><label>Тир<select name="tier"><option value="NOW">Играю сейчас</option><option value="S">S — Легендарно</option><option value="A">A — Отлично</option><option value="B">B — Хорошо</option><option value="C">C — Нормально</option><option value="D">D — Слабо</option><option value="F">F — Не понравилось</option><option value="PLANNED">В планах</option></select></label><label>Часы<input name="hours" type="number" min="0" step="1"></label><label>Смерти<input name="deaths" type="number" min="0" step="1"></label><label>Обложка<select name="cover"><option value="">— Без обложки —</option></select></label><div class="admin-cover-preview-wrap"><img class="admin-cover-preview" alt="Предпросмотр" style="display:none"></div><label>Плейлист<input name="playlist" type="url" placeholder="https://youtube.com/playlist?..." ></label><p class="admin-editor-error" role="alert"></p><div class="admin-form-actions"><button class="secondary" type="button" data-cancel>Отмена</button><button class="primary" type="submit">Сохранить</button></div></form></div>`;
    document.body.appendChild(backdrop);
    const returnFocus = document.activeElement;
    backdrop.addEventListener(
      "close",
      () => {
        backdrop.remove();
        if (returnFocus?.isConnected) returnFocus.focus();
        else document.getElementById("admin-add").focus();
      },
      { once: true },
    );
    window.GameShelf.setupDialogFocus(backdrop);
    backdrop.showModal();
    const form = backdrop.querySelector("form"),
      tierInput = form.elements.tier,
      ratingInput = form.elements.rating,
      statusInput = form.elements.status,
      coverInput = form.elements.cover,
      preview = backdrop.querySelector(".admin-cover-preview");
    for (const cover of available) {
      const option = document.createElement("option");
      option.value = cover.name;
      option.textContent = cover.name;
      form.elements.cover.append(option);
    }
    form.elements.name.value = source.name ?? "";
    tierInput.value = source.tier;
    ratingInput.value = source.rating ?? "";
    statusInput.value = source.status;
    form.elements.hours.value = source.hours ?? 0;
    form.elements.deaths.value = source.deaths ?? 0;
    form.elements.playlist.value = source.playlist ?? "";
    if (
      current &&
      !Array.from(coverInput.options).some((o) => o.value === current)
    ) {
      const o = document.createElement("option");
      o.value = current;
      o.textContent = `${current} (текущая)`;
      coverInput.append(o);
    }
    coverInput.value = current || "";
    const updatePreview = () => {
      const name = coverInput.value;
      if (!name) {
        preview.removeAttribute("src");
        preview.parentElement.hidden = true;
        preview.style.display = "none";
        return;
      }
      preview.parentElement.hidden = false;
      preview.onerror = () => {
        preview.parentElement.hidden = true;
        preview.style.display = "none";
      };
      preview.onload = () => {
        preview.style.display = "block";
      };
      preview.src = data.safeCover(`../covers/${name}`) || "/avatar.webp";
    };
    coverInput.onchange = updatePreview;
    updatePreview();
    const mode = form.elements.tierMode;
    mode.value = index < 0 ? "auto" : "manual";
    const applyTier = () => {
      tierInput.disabled = mode.value === "auto";
      if (mode.value === "auto") {
        const tier = automaticTier(ratingInput.value, statusInput.value);
        if (tier) tierInput.value = tier;
      }
    };
    ratingInput.addEventListener("input", applyTier);
    mode.addEventListener("change", applyTier);
    statusInput.addEventListener("change", () => {
      if (mode.value === "auto") return applyTier();
      const status = statusInput.value;
      if (status === "Прохожу") tierInput.value = "NOW";
      else if (["В планах", "Заморозка"].includes(status))
        tierInput.value = "PLANNED";
      else if (["NOW", "PLANNED"].includes(tierInput.value))
        tierInput.value = automaticTier(ratingInput.value, status) || "F";
    });
    tierInput.addEventListener("change", () => {
      if (tierInput.value === "NOW") statusInput.value = "Прохожу";
      else if (tierInput.value === "PLANNED") {
        if (statusInput.value !== "Заморозка") statusInput.value = "В планах";
      } else if (
        ["Прохожу", "В планах", "Заморозка"].includes(statusInput.value)
      )
        statusInput.value = ratingInput.value === "" ? "Дроп" : "Завершено";
    });
    applyTier();
    backdrop.querySelector("[data-cancel]").onclick = () => backdrop.close();
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const error = backdrop.querySelector(".admin-editor-error");
      error.textContent = "";
      try {
        applyTier();
        const fields = {
          name: form.elements.name.value,
          status: statusInput.value,
          rating: ratingInput.value === "" ? null : Number(ratingInput.value),
          tier: tierInput.value,
          hours: Number(form.elements.hours.value || 0),
          deaths: Number(form.elements.deaths.value || 0),
          cover: coverInput.value ? `../covers/${coverInput.value}` : "",
          playlist: form.elements.playlist.value.trim(),
        };
        const draft = data.prepareGame(source, fields, games, gameName);
        if (index < 0) {
          games.push(draft);
          appendGameCard(draft, draft.tier);
        } else {
          const current = games.find((game) => game.name === gameName);
          if (!current) throw Error("Игра больше не существует.");
          const card = findGameCard(gameName);
          Object.assign(current, draft);
          refreshCard(card, current);
          moveCardToTier(card, draft.tier);
        }
        rebuildOrderFromDom();
        markDirty();
        backdrop.close();
      } catch (problem) {
        error.textContent = problem.message;
      }
    });
  }

  async function saveGames() {
    const button = document.getElementById("admin-save");
    if (button.disabled) return;
    button.disabled = true;
    const savedRevision = revision;
    try {
      // Never silently remove records or mutate the working list during validation.
      const snapshot = games.map((game) => ({ ...game }));
      data.validateGames(snapshot);
      const response = await authFetch(`${API}/games`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games: snapshot }),
      });
      if (!response.ok)
        throw Error(`Сохранение не удалось: ${response.status}`);
      const result = await response.json().catch(() => null);
      if (result?.ok === false)
        throw Error(result.error || "Сервер не подтвердил сохранение.");
      if (revision === savedRevision) {
        dirty = false;
        button.textContent = "💾 Сохранено";
      } else button.textContent = "💾 Сохранить*";
    } catch (error) {
      if (error instanceof LoginRedirect) return;
      console.error("Ошибка сохранения игровой полки:", error);
      alert(
        `Не удалось сохранить изменения.\n${error.message || "Неизвестная ошибка"}`,
      );
      button.textContent = dirty ? "💾 Сохранить*" : "💾 Сохранить";
    } finally {
      button.disabled = false;
    }
  }
  async function init() {
    saveHashToken();
    if (!getToken()) {
      redirectToLogin();
      return;
    }
    createToolbar();
    try {
      const [sessionRes, coversRes] = await Promise.all([
        authFetch(`${API}/session`),
        fetch(
          `https://api.github.com/repos/kmcaq/kmcaq.github.io/contents/covers?ref=main&_=${Date.now()}`,
          {
            cache: "no-store",
            headers: { Accept: "application/vnd.github+json" },
          },
        ),
      ]);
      if (!sessionRes.ok)
        throw Error(`Session check failed: ${sessionRes.status}`);
      const session = await sessionRes.json();
      if (!session.authenticated) {
        sessionStorage.removeItem(TOKEN_KEY);
        throw redirectToLogin();
      }
      const coverList = await coversRes.json();
      covers = Array.isArray(coverList)
        ? coverList
            .filter(
              (c) => c.type === "file" && /\.(png|jpe?g|webp)$/i.test(c.name),
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        : [];
      await window.GameShelf.ready;
      games = window.GameShelf.games;
      data.validateGames(games);
      const decorateAll = () =>
        document
          .querySelectorAll("#gameshelfContainer .game-card")
          .forEach(decorateCard);
      decorateAll();
      setupRows();
      for (const id of ["admin-add", "admin-save", "admin-upload-cover"])
        document.getElementById(id).disabled = false;
    } catch (e) {
      if (e instanceof LoginRedirect) return;
      console.error("Ошибка запуска админки:", e);
      alert("Не удалось загрузить данные игровой полки.");
    }
  }
  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });
  init();
})();
