const API = "https://admin.km-tamami.workers.dev";

const loginBtn = document.getElementById("login");
const logoutBtn = document.getElementById("logout");
const app = document.getElementById("app");

if (location.hash.startsWith("#token=")) {
  const token = location.hash.slice(7);
  sessionStorage.setItem("adminToken", token);
  history.replaceState(null, "", location.pathname);
}

const token = sessionStorage.getItem("adminToken");

if (!token) {
  loginBtn.onclick = () => location.href = `${API}/login`;
} else {
  init();
}

async function init() {

  const res = await fetch(`${API}/session`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const auth = await res.json();

  if (!auth.authenticated) {
    sessionStorage.removeItem("adminToken");
    return location.reload();
  }

  loginBtn.hidden = true;
  logoutBtn.hidden = false;
  app.hidden = false;

  logoutBtn.onclick = () => {
    sessionStorage.removeItem("adminToken");
    location.reload();
  };

  const gamesRes = await fetch(`${API}/games`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const games = await gamesRes.json();

  app.innerHTML = games.map(g => `
    <div>
      <h3>${g.name}</h3>
      <p>${g.status}</p>
    </div>
  `).join("");
}
