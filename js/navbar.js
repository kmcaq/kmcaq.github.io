const navbarHTML = `
<nav class="site-navbar">
  <a href="/" class="logo-wrap" aria-label="Главная"><span class="logo-symbol">✧</span><span class="logo">kmcaq</span></a>
  <div class="nav-right">
    <a id="navStatus" class="nav-status" href="#" aria-label="Статус трансляции"><span id="navDot" class="nav-dot"></span><span id="navText">OFFLINE</span></a>
    <div class="social" aria-label="Социальные сети">
      <a href="https://www.twitch.tv/kmcaq" target="_blank" rel="noopener noreferrer" aria-label="Twitch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2h19v12l-5 5h-4l-4 4v-4H3V2Zm2 2v13h5v2.2l2.2-2.2H16l4-4V4H5Zm3 3h2v5H8V7Zm5 0h2v5h-2V7Z"/></svg></a>
      <a href="https://www.youtube.com/@kmcaq" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.1a3 3 0 0 0-2.1-2.1C19.1 4.5 12 4.5 12 4.5s-7.1 0-8.9.5A3 3 0 0 0 1 7.1C.5 8.9.5 12 .5 12s0 3.1.5 4.9A3 3 0 0 0 3.1 19c1.8.5 8.9.5 8.9.5s7.1 0 8.9-.5a3 3 0 0 0 2.1-2.1c.5-1.8.5-4.9.5-4.9s0-3.1-.5-4.9ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg></a>
      <a href="https://t.me/kmcaq" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 3.3 18 20.1c-.3 1.2-1 1.5-2 .9l-5.5-4.1-2.7 2.6c-.3.3-.5.5-1 .5l.4-5.7 10.4-9.4c.5-.4-.1-.6-.7-.2L4 12.6l-5.4-1.7c-1.2-.4-1.2-1.2.3-1.8l21-8.1c1.1-.4 2 .3 1.7 2.3Z"/></svg></a>
    </div>
    <div class="menu"><a href="/" data-nav="home">Главная</a><a href="/games/" data-nav="games">Игровая полка</a><a href="/links/" data-nav="links">Ссылки</a><a href="/feedback/" data-nav="feedback">Обратная связь</a></div>
  </div>
</nav>`;

const navbarStyles = `
.site-navbar{position:relative;z-index:1000;width:min(1480px,calc(100% - 48px));margin:14px auto 0;min-height:66px;padding:12px 28px;display:flex;align-items:center;justify-content:space-between;gap:26px;background:rgba(25,16,12,.91);border:1px solid rgba(234,182,127,.2);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.25);backdrop-filter:blur(18px);font-family:Nunito,sans-serif}
.site-navbar *{box-sizing:border-box}.site-navbar .logo-wrap{display:flex;align-items:center;gap:10px;flex-shrink:0;text-decoration:none}.site-navbar .logo-symbol{font-size:27px;color:#f5d3a7}.site-navbar .logo{font-family:Georgia,serif;font-size:31px;font-style:italic;color:#ffe1b7}
.site-navbar .nav-right{display:contents}.site-navbar .menu{display:flex;align-items:center;justify-content:center;gap:clamp(16px,2.4vw,42px);flex-wrap:wrap}.site-navbar .menu a{color:#f4ddc6;font-size:14px;text-decoration:none;white-space:nowrap;position:relative}.site-navbar .menu a:hover,.site-navbar .menu a.active{color:#fff3df}.site-navbar .menu a.active:after{content:"";position:absolute;bottom:-9px;left:0;right:0;height:2px;background:#f2c18c}
.site-navbar .social{display:flex;gap:9px;align-items:center}.site-navbar .social a{display:grid;place-items:center;color:#f8dbc0;width:30px;height:30px}.site-navbar .social svg{width:21px;height:21px;fill:currentColor}.site-navbar .social a:hover{color:white}
.site-navbar .nav-status{display:none}.site-navbar .nav-dot{width:8px;height:8px;border-radius:50%;background:#aaa}
@media(max-width:1020px){.site-navbar{width:calc(100% - 24px);padding:12px 16px;gap:12px}.site-navbar .social{gap:4px}.site-navbar .social a{width:26px}.site-navbar .menu{gap:14px}.site-navbar .logo{font-size:26px}}
@media(max-width:650px){.site-navbar{flex-wrap:wrap;justify-content:center;margin-top:8px;border-radius:16px}.site-navbar .menu{order:3;width:100%;gap:12px 18px}.site-navbar .social{order:2;display:flex}.site-navbar .social a{width:30px}.site-navbar .menu a{font-size:12px}.site-navbar .logo{font-size:25px}}
`;

function initNavbar(){const mount=document.getElementById("navbar");if(!mount)return false;if(!document.getElementById("navbar-styles")){const style=document.createElement("style");style.id="navbar-styles";style.textContent=navbarStyles;document.head.appendChild(style)}mount.innerHTML=navbarHTML;const path=window.location.pathname.replace(/index\.html$/i,"");let active="home";if(path.startsWith("/games/"))active="games";else if(path.startsWith("/links/"))active="links";else if(path.startsWith("/feedback/"))active="feedback";const link=mount.querySelector(`[data-nav="${active}"]`);if(link)link.classList.add("active");window.dispatchEvent(new Event("navbarReady"));return true}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initNavbar,{once:true});else initNavbar();
