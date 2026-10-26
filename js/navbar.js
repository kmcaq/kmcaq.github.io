const navbarHTML = `
<nav class="site-navbar">
  <a href="/" class="logo-wrap" aria-label="Главная"><img class="logo-symbol" src="/brand-logo.png?v=20261026-brand-1" alt="" width="44" height="44" decoding="async"><span class="logo">kmcaq</span></a>
  <div class="menu"><a href="/" data-nav="home">Главная</a><a href="/games/" data-nav="games">Игровая полка</a><a href="/links/" data-nav="links">Ссылки</a><a href="/feedback/" data-nav="feedback">Обратная связь</a></div>
  <div class="social" aria-label="Социальные сети"><a href="https://www.twitch.tv/kmcaq" target="_blank" rel="noopener noreferrer" aria-label="Twitch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 2h19v12l-5 5h-4l-4 4v-4H3V2Zm2 2v13h5v2.2l2.2-2.2H16l4-4V4H5Zm3 3h2v5H8V7Zm5 0h2v5h-2V7Z"/></svg></a><a href="https://www.youtube.com/@kmcaq" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.1a3 3 0 0 0-2.1-2.1C19.1 4.5 12 4.5 12 4.5s-7.1 0-8.9.5A3 3 0 0 0 1 7.1C.5 8.9.5 12 .5 12s0 3.1.5 4.9A3 3 0 0 0 3.1 19c1.8.5 8.9.5 8.9.5s7.1 0 8.9-.5a3 3 0 0 0 2.1-2.1c.5-1.8.5-4.9.5-4.9s0-3.1-.5-4.9ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg></a><a href="https://t.me/kmcaq" target="_blank" rel="noopener noreferrer" aria-label="Telegram"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 3.3 18 20.1c-.3 1.2-1 1.5-2 .9l-5.5-4.1-2.7 2.6c-.3.3-.5.5-1 .5l.4-5.7 10.4-9.4c.5-.4-.1-.6-.7-.2L4 12.6l-5.4-1.7c-1.2-.4-1.2-1.2.3-1.8l21-8.1c1.1-.4 2 .3 1.7 2.3Z"/></svg></a></div>
</nav>`;

function initNavbar() {
  const mount = document.getElementById("navbar");
  if (!mount) return false;
  mount.innerHTML = navbarHTML;
  const path = window.location.pathname.replace(/index\.html$/i, "");
  let active = "home";
  if (path.startsWith("/games/")) active = "games";
  else if (path.startsWith("/links/")) active = "links";
  else if (path.startsWith("/feedback/")) active = "feedback";
  const link = mount.querySelector(`[data-nav="${active}"]`);
  if (link) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  }
  window.dispatchEvent(new Event("navbarReady"));
  return true;
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", initNavbar, { once: true });
else initNavbar();

