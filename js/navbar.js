const navbarHTML = `
<nav class="site-navbar">
  <a href="/" class="logo-wrap" aria-label="Главная">
    <img src="/avatar.png" alt="Кэм">
    <span class="logo">kmcaq</span>
  </a>

  <div class="nav-right">
    <a id="navStatus" class="nav-status" href="#" aria-label="Статус трансляции">
      <span id="navDot" class="nav-dot"></span>
      <span id="navText">OFFLINE</span>
    </a>

    <div class="social" aria-label="Социальные сети">
      <a href="https://www.twitch.tv/kmcaq" target="_blank" rel="noopener noreferrer" aria-label="Twitch">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2 2 6v14h5v4l4-4h3l8-8V2H4Zm16 9-4 4h-4l-3 3v-3H5V4h15v7Z"/></svg>
      </a>
      <a href="https://www.youtube.com/@kmcaq" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.4-2.4C19 3.2 12 3.2 12 3.2s-7 0-9.1.6A3 3 0 0 0 .5 6.2C0 8.3 0 12 0 12s0 3.7.5 5.8a3 3 0 0 0 2.4 2.4c2.1.6 9.1.6 9.1.6s7 0 9.1-.6a3 3 0 0 0 2.4-2.4c.5-2.1.5-5.8.5-5.8s0-3.7-.5-5.8ZM9.8 15.5v-7l6 3.5-6 3.5Z"/></svg>
      </a>
      <a href="https://t.me/kmcaq" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.9 2.6 1.7 10.4c-1.4.6-1.4 1.4-.2 1.8l5.2 1.6 2 6.3c.3.9.2 1.3 1.1 1.3 0 .7.3 1 1.4.7l2.5-2.4 5.2 3.8c1 .5 1.7.3 2-1l3.7-17.5c.5-1.6-.5-2.3-1.5-1.9Zm-5.7 5.2-7.1 6.5-.3 3.1-1.1-3.4-3.5-1.1 12.7-5.1c.6-.2.7-.1-.7 0Z"/></svg>
      </a>
    </div>

    <div class="menu">
      <a href="/" data-nav="home">Главная</a>
      <a href="/about/" data-nav="about">О канале</a>
      <a href="/games/" data-nav="games">Игры</a>
      <a href="/schedule/" data-nav="schedule">Расписание</a>
      <a href="/links/" data-nav="links">Ссылки</a>
    </div>
  </div>
</nav>`;

function initNavbar() {
  const mount = document.getElementById("navbar");
  if (!mount) return;

  mount.innerHTML = navbarHTML;

  const path = window.location.pathname.replace(/index\.html$/, "");
  let active = "home";

  if (path.startsWith("/about/")) active = "about";
  else if (path.startsWith("/games/")) active = "games";
  else if (path.startsWith("/schedule/")) active = "schedule";
  else if (path.startsWith("/links/")) active = "links";

  const activeLink = mount.querySelector(`[data-nav="${active}"]`);
  if (activeLink) activeLink.classList.add("active");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNavbar);
} else {
  initNavbar();
}
