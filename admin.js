const API = "https://admin.km-tamami.workers.dev";
const TOKEN_KEY = "admin_token";

const url = new URL(location.href);
const isAdmin = url.searchParams.get("admin") === "1";
const section = location.pathname.split("/").filter(Boolean)[0] || "home";

function getToken(){return sessionStorage.getItem(TOKEN_KEY)}
(function(){const h=new URLSearchParams(location.hash.slice(1));const t=h.get("token");if(t){sessionStorage.setItem(TOKEN_KEY,t);history.replaceState(null,"",location.pathname+location.search)}})();
async function authFetch(u,o={}){const h={...(o.headers||{})};const t=getToken();if(t)h.Authorization=`Bearer ${t}`;const r=await fetch(u,{...o,headers:h});if(r.status===401){sessionStorage.removeItem(TOKEN_KEY);const next=encodeURIComponent(location.pathname+"?admin=1");location.href=`${API}/login?next=${next}`;throw new Error("Unauthorized")}return r}
(async function(){if(!isAdmin)return;if(!getToken()){const next=encodeURIComponent(location.pathname+"?admin=1");location.href=`${API}/login?next=${next}`;return}const s=await (await authFetch(`${API}/session`)).json();if(!s.authenticated){sessionStorage.removeItem(TOKEN_KEY);const next=encodeURIComponent(location.pathname+"?admin=1");location.href=`${API}/login?next=${next}`;return}enableAdmin()})();
function enableAdmin(){document.body.classList.add("admin-mode");createToolbar();if(section==="games")enableGames()}
function createToolbar(){const b=document.createElement("div");b.id="admin-toolbar";b.innerHTML=`<button id="admin-back">← Обычная страница</button><div class="admin-title">${section} • Админ</div><button id="admin-save">💾 Сохранить</button>`;document.body.prepend(b);document.getElementById("admin-back").onclick=()=>{const clean=new URL(location.href);clean.searchParams.delete("admin");location.href=clean.pathname+clean.search}}
function enableGames(){const save=document.getElementById("admin-save");const add=document.createElement("button");add.textContent="➕ Добавить";save.before(add);document.querySelectorAll(".game-card").forEach(c=>{if(c.querySelector(".admin-actions"))return;const a=document.createElement("div");a.className="admin-actions";a.innerHTML=`<button>✏️</button><button>🗑️</button>`;c.append(a)})}
const st=document.createElement("style");st.textContent=`.admin-mode{padding-top:72px}#admin-toolbar{position:fixed;top:0;left:0;right:0;height:60px;display:flex;align-items:center;gap:12px;padding:0 20px;background:#0d1117;border-bottom:1px solid rgba(255,255,255,.08);z-index:99999}#admin-toolbar button{border:none;border-radius:10px;padding:10px 16px;cursor:pointer;color:#fff;background:#ef4444}.admin-title{flex:1;font-weight:600}.admin-actions{display:flex;gap:8px;margin-top:12px}.admin-actions button{background:#111827}`;document.head.append(st);