const navbarHTML = `
<nav class="site-navbar">
  <a href="/" class="logo-wrap" aria-label="Главная"><span class="logo-symbol">✧</span><span class="logo">kmcaq</span></a>
  <div class="menu"><a href="/" data-nav="home">Главная</a><a href="/games/" data-nav="games">Игровая полка</a><a href="/links/" data-nav="links">Ссылки</a><a href="/feedback/" data-nav="feedback">Обратная связь</a></div>
  <div class="social" aria-label="Социальные сети"><a href="https://www.twitch.tv/kmcaq" target="_blank" rel="noopener noreferrer" aria-label="Twitch">♜</a><a href="https://www.youtube.com/@kmcaq" target="_blank" rel="noopener noreferrer" aria-label="YouTube">▶</a><a href="https://t.me/kmcaq" target="_blank" rel="noopener noreferrer" aria-label="Telegram">➤</a></div>
</nav>`;

const navbarStyles = `
.site-navbar{position:relative;z-index:1000;width:min(1530px,calc(100% - 36px));margin:10px auto 0;min-height:60px;padding:10px 25px;display:grid;grid-template-columns:minmax(150px,1fr) auto minmax(150px,1fr);align-items:center;gap:22px;background:rgba(25,16,12,.92);border:1px solid rgba(234,182,127,.24);border-radius:16px;box-shadow:0 12px 35px rgba(0,0,0,.28);backdrop-filter:blur(18px);font-family:Nunito,sans-serif}
.site-navbar *{box-sizing:border-box}.site-navbar .logo-wrap{display:flex;align-items:center;gap:9px;text-decoration:none;justify-self:start}.site-navbar .logo-symbol{font-size:23px;color:#f5d3a7}.site-navbar .logo{font:italic 29px Georgia,serif;color:#ffe1b7}
.site-navbar .menu{display:flex;align-items:center;justify-content:center;gap:clamp(16px,2.4vw,42px)}.site-navbar .menu a{color:#f4ddc6;font-size:14px;text-decoration:none;white-space:nowrap;position:relative}.site-navbar .menu a:hover,.site-navbar .menu a.active{color:#fff3df}.site-navbar .menu a.active:after{content:"";position:absolute;bottom:-9px;left:0;right:0;height:2px;background:#f2c18c}
.site-navbar .social{display:flex;justify-content:flex-end;align-items:center;gap:12px;justify-self:end}.site-navbar .social a{display:grid;place-items:center;width:26px;height:28px;color:#f8dbc0;text-decoration:none;font-size:19px;font-weight:800}.site-navbar .social a:hover{color:white}
@media(max-width:980px){.site-navbar{grid-template-columns:auto 1fr;gap:8px 20px}.site-navbar .social{grid-column:2;grid-row:1}.site-navbar .menu{grid-column:1/-1;grid-row:2;flex-wrap:wrap;padding:8px 0 2px;gap:12px 25px}}
@media(max-width:600px){.site-navbar{width:calc(100% - 20px);padding:10px 12px}.site-navbar .logo{font-size:24px}.site-navbar .menu{gap:10px 16px}.site-navbar .menu a{font-size:12px}.site-navbar .social{gap:5px}.site-navbar .social a{font-size:17px;width:24px}}
`;

function initNavbar(){const mount=document.getElementById("navbar");if(!mount)return false;if(!document.getElementById("navbar-styles")){const style=document.createElement("style");style.id="navbar-styles";style.textContent=navbarStyles;document.head.appendChild(style)}mount.innerHTML=navbarHTML;const path=window.location.pathname.replace(/index\.html$/i,"");let active="home";if(path.startsWith("/games/"))active="games";else if(path.startsWith("/links/"))active="links";else if(path.startsWith("/feedback/"))active="feedback";const link=mount.querySelector(`[data-nav="${active}"]`);if(link)link.classList.add("active");window.dispatchEvent(new Event("navbarReady"));return true}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initNavbar,{once:true});else initNavbar();
