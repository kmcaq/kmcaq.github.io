const API = "https://admin.km-tamami.workers.dev";
const TOKEN_KEY = "admin_token";

const path = location.pathname.replace(/^\/+/, "");
const parts = path.split("/");

const isAdmin = parts.at(-1) === "admin";
const section = isAdmin ? parts[0] : null;
const publicPath = "/" + parts.slice(0, -1).join("/");

function getToken(){return sessionStorage.getItem(TOKEN_KEY)}
(function(){const h=new URLSearchParams(location.hash.slice(1));const t=h.get("token");if(t){sessionStorage.setItem(TOKEN_KEY,t);history.replaceState(null,"",location.pathname)}})();
async function authFetch(url,o={}){const t=getToken();const h={...(o.headers||{})};if(t)h.Authorization=`Bearer ${t}`;const r=await fetch(url,{...o,headers:h});if(r.status===401){sessionStorage.removeItem(TOKEN_KEY);location.href=`${API}/login`;throw new Error("Unauthorized")}return r}
(async function(){if(!isAdmin)return;if(!getToken()){location.href=`${API}/login`;return}const s=await (await authFetch(`${API}/session`)).json();if(!s.authenticated){sessionStorage.removeItem(TOKEN_KEY);location.href=`${API}/login`;return}enableAdminMode()})();
function enableAdminMode(){document.body.classList.add("admin-mode");if(section==="games")enableGamesAdmin()}
function enableGamesAdmin(){const b=document.createElement("div");b.id="admin-toolbar";b.innerHTML=`<button id="admin-back">← Сайт</button><div class="admin-title">Игровая полка • Админ</div><button id="admin-add">➕ Добавить</button><button id="admin-save">💾 Сохранить</button>`;document.body.prepend(b);document.getElementById("admin-back").onclick=()=>location.href=publicPath||"/";document.getElementById("admin-add").onclick=()=>console.log("Новая игра");document.getElementById("admin-save").onclick=async()=>{const g=window.gamesData||[];const r=await authFetch(`${API}/games`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({games:g})});if(r.ok){const btn=document.getElementById("admin-save");btn.textContent="✓";setTimeout(()=>btn.textContent="💾 Сохранить",1000)}};document.querySelectorAll(".game-card").forEach(c=>{if(c.querySelector(".admin-actions"))return;const a=document.createElement("div");a.className="admin-actions";a.innerHTML=`<button>✏️</button><button>🗑️</button>`;c.append(a)})}
const st=document.createElement("style");st.textContent=`.admin-mode{padding-top:74px}#admin-toolbar{position:fixed;top:0;left:0;right:0;height:60px;display:flex;align-items:center;gap:12px;padding:0 20px;background:#0d1117;border-bottom:1px solid rgba(255,255,255,.08);z-index:99999}#admin-toolbar button{background:#ef4444;color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer}.admin-title{flex:1;font-weight:600}.admin-actions{display:flex;gap:8px;margin-top:12px}.admin-actions button{background:#111827;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer}`;document.head.append(st);