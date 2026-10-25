const API = atob("aHR0cHM6Ly9rbWNhcS1saXZlLmttLXRhbWFtaS53b3JrZXJzLmRldg==");
const CHECK_INTERVAL = 60000;
const REQUEST_TIMEOUT = 5000;

async function getLiveData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(API, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || typeof data !== "object")
      throw new Error("Invalid live response");
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function updateStatus(data) {
  const navStatus = document.getElementById("navStatus");
  const navDot = document.getElementById("navDot");
  const navText = document.getElementById("navText");
  if (!navStatus || !navDot || !navText) return;
  const live = Boolean(data && data.live);
  navDot.style.background = live ? "#ff4d6d" : "#9c8db8";
  navText.textContent = live ? "LIVE" : "OFFLINE";
  if (live) {
    navStatus.href = "https://www.twitch.tv/kmcaq";
    navStatus.target = "_blank";
    navStatus.rel = "noopener noreferrer";
    navStatus.classList.add("live");
  } else {
    navStatus.href = "#";
    navStatus.removeAttribute("target");
    navStatus.removeAttribute("rel");
    navStatus.classList.remove("live");
  }
}

let coverRequest = 0;
function setLiveCover(url, alt) {
  const cover = document.getElementById("currentCover");
  if (!cover) return;
  if (!url) {
    cover.hidden = true;
    cover.removeAttribute("src");
    return;
  }
  cover.hidden = false;
  cover.alt = alt || "Обложка игры";
  cover.onerror = () => {
    cover.onerror = null;
    cover.hidden = true;
    cover.removeAttribute("src");
  };
  cover.src = url;
}
function safeArt(url) {
  if (typeof url !== "string") return "";
  try {
    const u = new URL(url);
    if (
      u.protocol !== "https:" ||
      !["static-cdn.jtvnw.net", "images.igdb.com"].includes(u.hostname)
    )
      return "";
    return url.replaceAll("{width}", "300").replaceAll("{height}", "400");
  } catch {
    return "";
  }
}
function safeLocalCover(path) {
  if (typeof path !== "string") return "";
  const url = path.replace(/^\.\.\//, "/");
  return /^\/covers\/[\w.%-]+\.(?:png|jpe?g|webp)$/i.test(url) ? url : "";
}
function formatDuration(data) {
  const started = data.started_at || data.startedAt || data.start_time;
  if (!started) return "";
  const time = Date.parse(started);
  if (!Number.isFinite(time) || time > Date.now()) return "";
  const mins = Math.floor((Date.now() - time) / 60000);
  return (
    "◷ " +
    String(Math.floor(mins / 60)).padStart(2, "0") +
    ":" +
    String(mins % 60).padStart(2, "0") +
    " в эфире"
  );
}
function updateCurrent(data) {
  const title = document.getElementById("currentTitle"),
    message = document.getElementById("currentText"),
    button = document.getElementById("currentButton"),
    card = document.getElementById("currentCard");
  if (!title || !message || !button || !card) return;
  const game = document.getElementById("currentGame"),
    meta = document.getElementById("currentMeta");
  const request = ++coverRequest;
  card.classList.toggle("live-now", Boolean(data.live));
  if (data.live) {
    title.textContent = "СЕЙЧАС В ЭФИРЕ";
    game.textContent = data.game || "Прямой эфир";
    message.textContent = data.title || "Присоединяйся к трансляции на Twitch";
    const viewers = Number(data.viewers);
    meta.textContent = [
      Number.isFinite(viewers) && data.viewers != null
        ? "♙ " + viewers.toLocaleString("ru-RU") + " зрителей"
        : "",
      formatDuration(data),
    ]
      .filter(Boolean)
      .join("   ");
    button.textContent = "Смотреть на Twitch →";
    button.href = "https://www.twitch.tv/kmcaq";
    const art = safeArt(
      data.box_art_url ||
        data.boxArtUrl ||
        data.gameCover ||
        data.game_cover ||
        data.cover,
    );
    if (art) setLiveCover(art, "Обложка " + (data.game || "игры"));
    else {
      setLiveCover("", "");
      if (data.game)
        window.GameData.loadGames()
          .then((items) => {
            if (request !== coverRequest || !Array.isArray(items)) return;
            const match = items.find(
              (g) =>
                g.name &&
                g.name.trim().toLowerCase() === data.game.trim().toLowerCase(),
            );
            const local = safeLocalCover(match?.cover);
            if (local) setLiveCover(local, "Обложка " + data.game);
          })
          .catch(() => {});
    }
  } else {
    title.textContent = "СЕЙЧАС НЕ В ЭФИРЕ";
    game.textContent = "До встречи на стриме!";
    message.textContent =
      data.latestTitle || "Последние записи доступны на YouTube.";
    meta.textContent = "";
    setLiveCover("", "");
    button.textContent = "Смотреть записи →";
    button.href =
      typeof data.latestVideo === "string" &&
      /^https:\/\//.test(data.latestVideo)
        ? data.latestVideo
        : "https://www.youtube.com/@kmcaq";
  }
  button.target = "_blank";
  button.rel = "noopener noreferrer";
}

async function refreshLive() {
  try {
    const data = await getLiveData();
    updateStatus(data);
    updateCurrent(data);
  } catch (error) {
    console.error("Live widget error:", error);
    updateStatus({ live: false });
    ++coverRequest;
    setLiveCover("", "");
    const title = document.getElementById("currentTitle");
    const message = document.getElementById("currentText");
    const button = document.getElementById("currentButton");
    const card = document.getElementById("currentCard");
    if (title && message && button && card) {
      title.textContent = "● СТАТУС НЕДОСТУПЕН";
      const game = document.getElementById("currentGame");
      if (game) game.textContent = "Загляни на Twitch";
      const meta = document.getElementById("currentMeta");
      if (meta) meta.textContent = "";
      message.textContent = "Не удалось проверить эфир. Попробуй позже.";
      button.textContent = "Открыть Twitch →";
      button.href = "https://www.twitch.tv/kmcaq";
      button.target = "_blank";
      button.rel = "noopener noreferrer";
      card.classList.remove("live-now");
      card.style.borderColor = "";
    }
  }
}

window.initLive = function () {
  refreshLive();
  if (window.liveStatusInterval) clearInterval(window.liveStatusInterval);
  window.liveStatusInterval = setInterval(refreshLive, CHECK_INTERVAL);
};

function startLive() {
  window.initLive();
}

if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", startLive, { once: true });
else startLive();
