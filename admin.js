(() => {
  const API = "https://admin.km-tamami.workers.dev";
  const TOKEN_KEY = "admin_token";

  const url = new URL(location.href);
  const isAdmin = url.searchParams.get("admin") === "1";
  const section = location.pathname.split("/").filter(Boolean)[0] || "home";

  let games = [];
  let dirty = false;

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
  }

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
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
      .admin-actions{display:flex;gap:8px;margin-top:12px;position:relative;z-index:5}
      .admin-actions button{background:#111827;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 12px;cursor:pointer;font:inherit}
      .admin-actions .delete{background:#7f1d1d}
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
    bar.innerHTML = `
      <button id="admin-back">← Обычная страница</button>
      <div class="admin-title">Игровая полка • Админ</div>
      <button id="admin-add">➕ Добавить</button>
      <button id="admin-save">💾 Сохранить</button>
    `;
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
    const res = await authFetch(`${API}/games`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Games load failed: ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("API /games returned invalid data");

    games = data.map(game => ({ ...game }));
  }

  function findGameIndex(card) {
    const name = card.querySelector(".game-cover")?.alt || "";
    const cover = card.querySelector(".game-cover")?.getAttribute("src") || "";

    let index = games.findIndex(game => game.name === name && game.cover === cover);
    if (index < 0) index = games.findIndex(game => game.name === name);
    return index;
  }

  function attachButtons() {
    if (section !== "games") return;

    document.querySelectorAll(".game-card").forEach(card => {
      if (card.querySelector(".admin-actions")) return;

      const index = findGameIndex(card);
      const actions = document.createElement("div");
      actions.className = "admin-actions";
      actions.innerHTML = `
        <button class="edit" type="button">✏️ Редактировать</button>
        <button class="delete" type="button">🗑 Удалить</button>
      `;

      actions.querySelector(".edit").onclick = event => {
        event.stopPropagation();
        const currentIndex = findGameIndex(card);
        if (currentIndex >= 0) openEditor(currentIndex);
      };

      actions.querySelector(".delete").onclick = event => {
        event.stopPropagation();
        const currentIndex = findGameIndex(card);
        if (currentIndex < 0) return;

        const game = games[currentIndex];
        if (!confirm(`Удалить игру «${game.name}»?\n\nИзменение вступит в силу на сайте после сохранения.`)) return;

        games.splice(currentIndex, 1);
        markDirty();
        card.remove();
        rebuildEmptyTiers();
      };

      card.append(actions);
    });
  }

  function rebuildEmptyTiers() {
    document.querySelectorAll(".tier-row").forEach(row => {
      const grid = row.querySelector(".tier-grid");
      if (!grid) return;
      const tierId = row.querySelector(".tier-box")?.textContent.trim();
      if (!tierId) return;
      row.style.display = games.some(game => game.tier === tierId) ? "" : "none";
    });
  }

  function openEditor(index) {
    const source = index < 0
      ? {
          name: "",
          tier: "C",
          rating: 0,
          status: "",
          hours: 0,
          deaths: 0,
          cover: "",
          playlist: ""
        }
      : { ...games[index] };

    const backdrop = document.createElement("div");
    backdrop.className = "admin-modal-backdrop";
    backdrop.innerHTML = `
      <div class="admin-modal" role="dialog" aria-modal="true">
        <h2>${index < 0 ? "Новая игра" : "Редактирование игры"}</h2>
        <form class="admin-form">
          <label>Название<input name="name" required value="${escapeHtml(source.name)}"></label>
          <label>Уровень<select name="tier">
            <option value="S">S — Легендарно</option>
            <option value="A">A — Отлично</option>
            <option value="B">B — Хорошо</option>
            <option value="C">C — Нормально</option>
            <option value="D">D — Слабо</option>
            <option value="F">F — Не понравилось</option>
          </select></label>
          <label>Оценка<input name="rating" type="number" min="0" max="10" step="0.1" value="${escapeHtml(source.rating)}"></label>
          <label>Статус<input name="status" value="${escapeHtml(source.status)}" placeholder="Пройдено / Прохожу"></label>
          <label>Часы<input name="hours" type="number" min="0" step="1" value="${escapeHtml(source.hours)}"></label>
          <label>Смерти<input name="deaths" type="number" min="0" step="1" value="${escapeHtml(source.deaths)}"></label>
          <label>Обложка<input name="cover" required value="${escapeHtml(source.cover)}" placeholder="../covers/game.png"></label>
          <label>Плейлист<input name="playlist" value="${escapeHtml(source.playlist)}" placeholder="https://youtube.com/playlist?list="></label>
          <div class="admin-form-actions">
            <button type="button" class="secondary" data-cancel>Отмена</button>
            <button type="submit" class="primary">${index < 0 ? "Добавить" : "Применить"}</button>
          </div>
        </form>
      </div>
    `;

    document.body.append(backdrop);

    const form = backdrop.querySelector("form");
    form.elements.tier.value = source.tier || "C";

    backdrop.querySelector("[data-cancel]").onclick = () => backdrop.remove();
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop) backdrop.remove();
    });

    form.addEventListener("submit", event => {
      event.preventDefault();

      const value = {
        name: form.elements.name.value.trim(),
        tier: form.elements.tier.value,
        rating: Number(form.elements.rating.value) || 0,
        status: form.elements.status.value.trim(),
        hours: Number(form.elements.hours.value) || 0,
        deaths: Number(form.elements.deaths.value) || 0,
        cover: form.elements.cover.value.trim(),
        playlist: form.elements.playlist.value.trim()
      };

      if (!value.name || !value.cover) {
        alert("Название и обложка обязательны.");
        return;
      }

      if (index < 0) games.push(value);
      else games[index] = value;

      markDirty();
      backdrop.remove();
      renderAdminView();
    });

    form.elements.name.focus();
  }

  function renderAdminView() {
    const container = document.getElementById("gameshelfContainer");
    if (!container) return;

    container.innerHTML = "";

    const tierNames = {
      S: "Легендарно",
      A: "Отлично",
      B: "Хорошо",
      C: "Нормально",
      D: "Слабо",
      F: "Не понравилось"
    };

    const tierGlows = {
      S: "0 0 22px rgba(214,108,255,.45)",
      A: "0 0 14px rgba(214,108,255,.30)",
      B: "0 0 10px rgba(214,108,255,.18)",
      C: "0 0 8px rgba(214,108,255,.12)",
      D: "none",
      F: "none"
    };

    ["S", "A", "B", "C", "D", "F"].forEach(tier => {
      const tierGames = games.filter(game => game.tier === tier);
      if (!tierGames.length) return;

      const row = document.createElement("div");
      row.className = "tier-row";
      row.innerHTML = `
        <div class="tier-box">${tier}</div>
        <div class="tier-grid"></div>
      `;
      row.querySelector(".tier-box").style.boxShadow = tierGlows[tier];

      const grid = row.querySelector(".tier-grid");
      tierGames.forEach(game => {
        const card = document.createElement("div");
        card.className = "game-card";
        card.innerHTML = `<img class="game-cover" src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.name)}">`;
        card.querySelector(".game-cover").style.boxShadow = tierGlows[tier];

        card.onclick = () => {
          const modalButton = document.querySelector(".gm-close");
          if (modalButton) {
            const event = new Event("click");
            modalButton.dispatchEvent(event);
          }
        };

        grid.append(card);
      });

      container.append(row);
    });

    attachButtons();
  }

  async function saveGames() {
    const button = document.getElementById("admin-save");
    if (!button || !dirty) return;

    button.disabled = true;
    button.textContent = "Сохраняю…";

    try {
      const res = await authFetch(`${API}/games`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games })
      });

      if (!res.ok) {
        const message = await res.text().catch(() => "");
        throw new Error(`Save failed: ${res.status}${message ? ` — ${message}` : ""}`);
      }

      dirty = false;
      button.textContent = "✓ Сохранено";
      renderAdminView();
    } catch (error) {
      console.error("Games save failed:", error);
      button.textContent = "Ошибка сохранения";
      alert(`Не удалось сохранить изменения.\n\n${error.message}`);
    } finally {
      button.disabled = false;
      if (!dirty) {
        setTimeout(() => {
          if (button && !dirty) button.textContent = "💾 Сохранить";
        }, 1500);
      }
    }
  }

  async function init() {
    if (!isAdmin || section !== "games") return;

    saveHashToken();

    if (!getToken()) {
      location.replace(`${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    try {
      const sessionRes = await authFetch(`${API}/session`, { cache: "no-store" });
      if (!sessionRes.ok) throw new Error(`Session check failed: ${sessionRes.status}`);

      const session = await sessionRes.json();
      if (!session.authenticated) {
        sessionStorage.removeItem(TOKEN_KEY);
        location.replace(`${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }

      addStyles();
      createToolbar();
      await loadGames();

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderAdminView, { once: true });
      } else {
        renderAdminView();
      }
    } catch (error) {
      console.error("Admin initialization failed:", error);
      alert(`Не удалось открыть админку игр.\n\n${error.message}`);
    }
  }

  init();
})();