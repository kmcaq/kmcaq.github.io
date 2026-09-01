(() => {
  const API = "https://admin.km-tamami.workers.dev";
  const TOKEN_KEY = "admin_token";

  const url = new URL(location.href);
  const isAdmin = url.searchParams.get("admin") === "1";
  const section = location.pathname.split("/").filter(Boolean)[0] || "home";

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

  async function authFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = getToken();

    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      location.replace(`${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      throw new Error("Unauthorized");
    }

    return res;
  }

  async function init() {
    if (!isAdmin) return;

    saveHashToken();

    if (!getToken()) {
      location.replace(`${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    try {
      const session = await (await authFetch(`${API}/session`)).json();

      if (!session.authenticated) {
        sessionStorage.removeItem(TOKEN_KEY);
        location.replace(`${API}/login?next=${encodeURIComponent(location.pathname + location.search)}`);
        return;
      }

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", enableAdmin, { once: true });
      } else {
        enableAdmin();
      }
    } catch (e) {
      console.error("Admin init failed:", e);
    }
  }

  function enableAdmin() {
    document.body.classList.add("admin-mode");

    if (!document.getElementById("admin-toolbar")) {
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
        const clean = new URL(location.href);
        clean.searchParams.delete("admin");
        location.href = clean.pathname + clean.search;
      };
    }

    if (section !== "games") return;

    const attachButtons = () => {
      document.querySelectorAll(".game-card").forEach((card) => {
        if (card.querySelector(".admin-actions")) return;

        const actions = document.createElement("div");
        actions.className = "admin-actions";
        actions.innerHTML = `
          <button class="edit">✏️</button>
          <button class="delete">🗑️</button>
        `;
        card.append(actions);
      });
    };

    attachButtons();

    new MutationObserver(attachButtons).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  const style = document.createElement("style");
  style.textContent = `
    .admin-mode{padding-top:72px}
    #admin-toolbar{position:fixed;top:0;left:0;right:0;height:60px;display:flex;align-items:center;gap:12px;padding:0 20px;background:#0d1117;border-bottom:1px solid rgba(255,255,255,.08);z-index:99999}
    #admin-toolbar button{border:none;border-radius:10px;padding:10px 16px;cursor:pointer;color:#fff;background:#ef4444}
    .admin-title{flex:1;font-weight:600}
    .admin-actions{display:flex;gap:8px;margin-top:12px}
    .admin-actions button{background:#111827;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer}
  `;
  document.head.append(style);

  init();
})();