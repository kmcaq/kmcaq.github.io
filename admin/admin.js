const API = "https://admin.km-tamami.workers.dev";
const TOKEN_KEY = "admin_token";

const grid = document.getElementById("gamesGrid");
const login = document.getElementById("login");
const logout = document.getElementById("logout");
const add = document.getElementById("addGameBtn");
const save = document.getElementById("saveBtn");

let games = [];

const TIERS = ["NOW", "S", "A", "B", "C", "D", "F", "PLANNED"];
const STATUSES = ["Прохожу", "Завершено", "Дроп", "В планах"];

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

(function restoreToken() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const token = hash.get("token");

  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
    history.replaceState(null, "", location.pathname + location.search);
  }
})();

async function authFetch(url, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    location.href = `${API}/login`;
    throw new Error("Unauthorized");
  }

  return res;
}

function normalizeStatus(status) {
  if (status === "Пройдено") return "Завершено";
  if (status === "Запланировано") return "В планах";
  return STATUSES.includes(status) ? status : "Прохожу";
}

function normalizeTier(tier) {
  return TIERS.includes(tier) ? tier : "PLANNED";
}

init();

async function init() {
  if (!getToken()) {
    location.href = `${API}/login`;
    return;
  }

  try {
    const sessionRes = await authFetch(`${API}/session`);

    if (!sessionRes.ok) {
      throw new Error(`Session check failed: ${sessionRes.status}`);
    }

    const session = await sessionRes.json();

    if (!session.authenticated) {
      sessionStorage.removeItem(TOKEN_KEY);
      location.href = `${API}/login`;
      return;
    }

    login.hidden = true;
    logout.hidden = false;
    add.hidden = false;
    save.hidden = false;

    const gamesRes = await authFetch(`${API}/games`);

    if (!gamesRes.ok) {
      throw new Error(`Games load failed: ${gamesRes.status}`);
    }

    const data = await gamesRes.json();
    games = Array.isArray(data)
      ? data.map(game => ({
          ...game,
          status: normalizeStatus(game.status),
          tier: normalizeTier(game.tier)
        }))
      : [];

    render();
  } catch (error) {
    console.error("Admin initialization failed:", error);
  }
}

function render() {
  grid.innerHTML = "";

  games.forEach((g, i) => {
    const card = document.createElement("div");

    card.style.cssText =
      "background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:18px;overflow:hidden";

    card.innerHTML = `
      <img src="${g.cover}" style="width:100%;aspect-ratio:2/3;object-fit:cover">
      <div style="padding:18px">
        <h3>${g.name}</h3>
        <p style="color:#9ca3af">${g.status} • ${g.tier} • ⭐ ${g.rating ?? "—"}</p>
        <div style="display:flex;gap:8px;margin-top:16px">
          <button class="edit">✏️</button>
          <button class="delete">🗑</button>
        </div>
      </div>
    `;

    card.querySelector(".edit").onclick = () => edit(i);

    card.querySelector(".delete").onclick = () => {
      games.splice(i, 1);
      render();
    };

    grid.append(card);
  });
}

function edit(i) {
  const g =
    i === -1
      ? {
          name: "",
          status: "В планах",
          rating: null,
          tier: "PLANNED",
          hours: 0,
          deaths: 0,
          playlist: "",
          cover: "../covers/placeholder.png"
        }
      : { ...games[i] };

  g.status = normalizeStatus(g.status);
  g.tier = normalizeTier(g.tier);

  const modal = document.createElement("div");

  modal.style.cssText =
    "position:fixed;inset:0;background:#0008;display:flex;justify-content:center;align-items:center";

  modal.innerHTML = `
    <div style="background:#151922;padding:28px;border-radius:22px;width:min(500px,92%)">
      <h2>${i === -1 ? "Новая игра" : "Редактирование"}</h2>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">
        <input id="n" value="${g.name}">

        <label>
          Статус
          <select id="s">
            <option value="Прохожу">Прохожу</option>
            <option value="Завершено">Завершено</option>
            <option value="Дроп">Дроп</option>
            <option value="В планах">В планах</option>
          </select>
        </label>

        <label>
          Оценка
          <input id="r" type="number" min="0" max="10" step=".1" value="${g.rating ?? ""}">
        </label>

        <label>
          Тир
          <select id="t">
            <option value="NOW">Играю сейчас</option>
            <option value="S">S</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="F">F</option>
            <option value="PLANNED">В планах</option>
          </select>
        </label>

        <input id="h" type="number" value="${g.hours ?? 0}">
        <input id="d" type="number" value="${g.deaths ?? 0}">
        <input id="p" value="${g.playlist ?? ""}">
        <button id="ok">Сохранить</button>
        <button id="cancel">Отмена</button>
      </div>
    </div>
  `;

  document.body.append(modal);

  const statusInput = modal.querySelector("#s");
  const ratingInput = modal.querySelector("#r");
  const tierInput = modal.querySelector("#t");

  statusInput.value = g.status;
  ratingInput.value = g.rating ?? "";
  tierInput.value = g.tier;

  modal.querySelector("#cancel").onclick = () => modal.remove();

  modal.querySelector("#ok").onclick = () => {
    const updated = {
      name: modal.querySelector("#n").value.trim(),
      status: normalizeStatus(statusInput.value),
      rating: ratingInput.value === "" ? null : Number(ratingInput.value),
      tier: normalizeTier(tierInput.value),
      hours: +modal.querySelector("#h").value,
      deaths: +modal.querySelector("#d").value,
      playlist: modal.querySelector("#p").value,
      cover: g.cover
    };

    if (i === -1) {
      games.push(updated);
    } else {
      games[i] = updated;
    }

    modal.remove();
    render();
  };
}

add.onclick = () => edit(-1);

logout.onclick = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  location.href = `${API}/login`;
};

save.onclick = async () => {
  save.textContent = "Сохраняю…";
  save.disabled = true;

  try {
    const res = await authFetch(`${API}/games`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ games })
    });

    if (!res.ok) {
      throw new Error(`Save failed: ${res.status}`);
    }

    save.textContent = "✓ Сохранено";
  } catch (error) {
    console.error("Games save failed:", error);
    save.textContent = "Ошибка сохранения";
  } finally {
    save.disabled = false;

    setTimeout(() => {
      save.textContent = "💾 Сохранить изменения";
    }, 1500);
  }
};