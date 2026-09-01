const API = atob("aHR0cHM6Ly9rbWNhcS1saXZlLmttLXRhbWFtaS53b3JrZXJzLmRldg==");
const CHECK_INTERVAL = 60000;
const REQUEST_TIMEOUT = 5000;

async function fetchLiveData() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(API, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function updateStatus(data) {
  const navStatus = document.getElementById("navStatus");
  const navDot = document.getElementById("navDot");
  const navText = document.getElementById("navText");

  if (!navStatus || !navDot || !navText) return;

  navDot.style.background = data.live ? "#ff4d6d" : "#9c8db8";
  navText.textContent = data.live ? "LIVE" : "OFFLINE";

  if (data.live) {
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

function updateCurrent(data) {
  const title = document.getElementById("currentTitle");
  const text = document.getElementById("currentText");
  const button = document.getElementById("currentButton");
  const card = document.getElementById("currentCard");

  if (!title || !text || !button || !card) return;

  if (data.live) {
    title.innerHTML = '<span class="live-indicator"></span>Сейчас в эфире';
    text.innerHTML = `<strong>${data.game ?? "Без названия"}</strong><br>👀 ${data.viewers ?? 0} зрителей`;

    button.textContent = "Открыть стрим";
    button.href = "https://www.twitch.tv/kmcaq";
    button.target = "_blank";
    button.rel = "noopener noreferrer";

    card.style.borderColor = "#ff4d6d";
    card.classList.add("live-now");
  } else {
    title.innerHTML = '<span class="live-indicator"></span>Последняя серия';
    text.textContent = data.latestTitle || "Последняя запись";

    button.textContent = "Смотреть VOD";
    button.href = data.latestVideo || "https://www.youtube.com/@kmcaq";
    button.target = "_blank";
    button.rel = "noopener noreferrer";

    card.style.borderColor = "rgba(255,255,255,.12)";
    card.classList.remove("live-now");
  }
}

async function refreshLive() {
  try {
    const data = await fetchLiveData();
    updateStatus(data);
    updateCurrent(data);
  } catch (err) {
    console.error("Live widget error:", err);

    const navDot = document.getElementById("navDot");
    const navText = document.getElementById("navText");
    const navStatus = document.getElementById("navStatus");

    if (navDot) navDot.style.background = "#9c8db8";
    if (navText) navText.textContent = "OFFLINE";
    if (navStatus) {
      navStatus.href = "#";
      navStatus.removeAttribute("target");
      navStatus.removeAttribute("rel");
      navStatus.classList.remove("live");
    }
  }
}

window.initLive = function () {
  refreshLive();

  if (window.liveStatusInterval) {
    clearInterval(window.liveStatusInterval);
  }

  window.liveStatusInterval = setInterval(refreshLive, CHECK_INTERVAL);

  if (!window.liveVisibilityHandler) {
    window.liveVisibilityHandler = () => {
      if (!document.hidden) refreshLive();
    };

    document.addEventListener("visibilitychange", window.liveVisibilityHandler);
  }
};
