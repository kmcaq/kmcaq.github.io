const API = "https://admin.km-tamami.workers.dev";
const TOKEN_KEY = "admin_token";

const path = location.pathname.replace(/^\/+/, "");
const parts = path.split("/");

const isAdmin = parts.at(-1) === "admin";
const section = isAdmin ? parts[0] : null;

// ---------- JWT ----------

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

(function restoreToken() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const token = hash.get("token");

  if (!token) return;

  sessionStorage.setItem(TOKEN_KEY, token);
  history.replaceState(null, "", location.pathname);
})();

// ---------- API ----------

async function authFetch(url, options = {}) {
  const token = getToken();

  const headers = {
    ...(options.headers || {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

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

// ---------- INIT ----------

(async function init() {
  if (!isAdmin) return;

  if (!getToken()) {
    location.href = `${API}/login`;
    return;
  }

  const session = await (await authFetch(`${API}/session`)).json();

  if (!session.authenticated) {
    sessionStorage.removeItem(TOKEN_KEY);
    location.href = `${API}/login`;
    return;
  }

  enableAdminMode();
})();

// ---------- ADMIN MODE ----------

function enableAdminMode() {
  document.body.classList.add("admin-mode");

  switch (section) {
    case "games":
      enableGamesAdmin();
      break;

    case "links":
      console.log("Links admin");
      break;

    case "about":
      console.log("About admin");
      break;
  }
}

// ---------- GAMES ----------

function enableGamesAdmin() {

  const bar = document.createElement("div");

  bar.id = "admin-toolbar";

  bar.innerHTML = `
    <button id="admin-back">← Сайт</button>
    <div class="admin-title">Игровая полка • Админ</div>
    <button id="admin-add">➕ Добавить</button>
    <button id="admin-save">💾 Сохранить</button>
  `;

  document.body.prepend(bar);

  document.getElementById("admin-back").onclick = () => {
    location.href = "/games";
  };

  document.getElementById("admin-add").onclick = () => {
    console.log("Новая игра");
  };

  document.getElementById("admin-save").onclick = async () => {

    const games = window.gamesData || [];

    const res = await authFetch(`${API}/games`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ games })
    });

    if (res.ok) {

      const btn = document.getElementById("admin-save");

      btn.textContent = "✓";

      setTimeout(() => btn.textContent = "💾 Сохранить", 1000);
    }

  };

  addCardControls();
}

// ---------- CARD CONTROLS ----------

function addCardControls() {

  const cards = document.querySelectorAll(".game-card");

  cards.forEach(card => {

    const actions = document.createElement("div");

    actions.className = "admin-actions";

    actions.innerHTML = `
      <button class="edit">✏️</button>
      <button class="delete">🗑️</button>
    `;

    card.append(actions);

  });

}

// ---------- STYLES ----------

const style = document.createElement("style");

style.textContent = `
.admin-mode{
    padding-top:74px;
}

#admin-toolbar{
    position:fixed;
    top:0;
    left:0;
    right:0;
    height:60px;
    display:flex;
    align-items:center;
    gap:12px;
    padding:0 20px;
    background:#0d1117;
    border-bottom:1px solid rgba(255,255,255,.08);
    z-index:99999;
}

#admin-toolbar button{
    background:#ef4444;
    color:white;
    border:none;
    border-radius:10px;
    padding:10px 16px;
    cursor:pointer;
}

#admin-toolbar .admin-title{
    flex:1;
    font-weight:600;
}

.admin-actions{
    display:flex;
    gap:8px;
    margin-top:12px;
}

.admin-actions button{
    background:#111827;
    color:white;
    border:none;
    border-radius:8px;
    padding:8px 12px;
    cursor:pointer;
}
`;

document.head.append(style);
