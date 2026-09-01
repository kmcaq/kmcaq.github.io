const navbarHTML = `
<nav class="site-navbar">
  <a href="/" class="logo-wrap" aria-label="Главная">
    <img src="/avatar.png" alt="Кэм">
    <span class="logo">kmcaq</span>
  </a>
  <div class="nav-right">
    <a id="navStatus" class="nav-status" href="#" aria-label="Статус трансляции">
      <span id="navDot" class="nav-dot"></span><span id="navText">OFFLINE</span>
    </a>
    <div class="social" aria-label="Социальные сети">
      <a href="https://www.twitch.tv/kmcaq" target="_blank" rel="noopener noreferrer" aria-label="Twitch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2 2 6v14h5v4l4-4h3l8-8V2H4Zm16 9-4 4h-4l-3 3v-3H5V4h15v7Z"/></svg></a>
      <a href="https://www.youtube.com/@kmcaq" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.4-2.4C19 3.2 12 3.2 12 3.2s-7 0-9.1.6A3 3 0 0 0 .5 6.2C0 8.3 0 12 0 12s0 3.7.5 5.8a3 3 0 0 0 2.4 2.4c2.1.6 9.1.6 9.1.6s7 0 9.1-.6a3 3 0 0 0 2.4-2.4c.5-2.1.5-5.8.5-5.8s0-3.7-.5-5.8ZM9.8 15.5v-7l6 3.5-6 3.5Z"/></svg></a>
      <a href="https://t.me/kmcaq" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 2.6 1.7 10.4c-1.4.6-1.4 1.4-.2 1.8l5.2 1.6 2 6.3c.3.9.2 1.3 1.1 1.3 0 .7.3 1 1.4.7l2.5-2.4 5.2 3.8c1 .5 1.7.3 2-1l3.7-17.5c.5-1.6-.5-2.3-1.5-1.9Zm-5.7 5.2-7.1 6.5-.3 3.1-1.1-3.4-3.5-1.1 12.7-5.1c.6-.2.7-.1-.7 0Z"/></svg></a>
    </div>
    <div class="menu">
      <a href="/" data-nav="home">Главная</a><a href="/about/" data-nav="about">О канале</a><a href="/games/" data-nav="games">Игры</a><a href="/schedule/" data-nav="schedule">Расписание</a><a href="/links/" data-nav="links">Ссылки</a>
    </div>
  </div>
</nav>`;

const navbarStyles = `
.site-navbar{position:fixed;top:10px;left:50%;transform:translateX(-50%);width:min(1120px,calc(100% - 24px));padding:10px 18px;display:flex;justify-content:space-between;align-items:center;background:rgba(18,15,30,.78);backdrop-filter:blur(22px);border:1px solid rgba(214,108,255,.16);border-radius:999px;z-index:1000;font-family:Nunito,sans-serif}.site-navbar *{box-sizing:border-box}.site-navbar .logo-wrap{display:flex;align-items:center;gap:12px;text-decoration:none}.site-navbar .logo-wrap img{width:44px;height:44px;border-radius:50%;border:2px solid rgba(214,108,255,.45)}.site-navbar .logo{font-size:28px;font-weight:800;color:#d66cff}.site-navbar .nav-right{display:flex;align-items:center;gap:18px}.site-navbar .nav-status{display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:rgba(180,120,255,.12);border:1px solid rgba(180,120,255,.25);font-size:14px;font-weight:700;text-decoration:none;color:white}.site-navbar .nav-status.live{background:rgba(255,77,109,.12);border-color:rgba(255,77,109,.35)}.site-navbar .nav-dot{width:10px;height:10px;border-radius:50%;background:#9c8db8}.site-navbar .social{display:flex;gap:10px}.site-navbar .social a{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:white}.site-navbar .social svg{width:20px;height:20px;fill:currentColor}.site-navbar .menu{display:flex;gap:22px}.site-navbar .menu a{position:relative;color:white;text-decoration:none;font-weight:700}.site-navbar .menu a:hover,.site-navbar .menu a.active{color:#d66cff}.site-navbar .menu a.active:after{content:"";position:absolute;left:0;bottom:-8px;width:100%;height:3px;border-radius:999px;background:linear-gradient(90deg,#d66cff,#9146ff)}@media(max-width:980px){.site-navbar .nav-status,.site-navbar .social,.site-navbar .menu{display:none}}`;

function initNavbar(){
  const mount=document.getElementById("navbar");
  if(!mount)return;
  if(!document.getElementById("navbar-styles")){const style=document.createElement("style");style.id="navbar-styles";style.textContent=navbarStyles;document.head.appendChild(style)}
  mount.innerHTML=navbarHTML;
  const path=window.location.pathname.replace(/index\.html$/i,"");
  let active="home";
  if(path.startsWith("/about/"))active="about";else if(path.startsWith("/games/"))active="games";else if(path.startsWith("/schedule/"))active="schedule";else if(path.startsWith("/links/"))active="links";
  const link=mount.querySelector(`[data-nav="${active}"]`);if(link)link.classList.add("active");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initNavbar);else initNavbar();
