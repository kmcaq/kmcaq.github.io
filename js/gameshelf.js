(() => {
  "use strict";
  const container = document.getElementById("gameshelfContainer");
  if (!container) return;
  const data = window.GameData;
  const dialog = document.createElement("dialog");
  dialog.className = "gm-overlay";
  dialog.setAttribute("aria-labelledby", "gm-title");
  const icon = (paths) =>
    `<svg class="gm-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  dialog.innerHTML = `<div class="gm-modal">
    <button class="gm-close" type="button" aria-label="Закрыть подробности">×</button>
    <div class="gm-content">
      <img class="gm-cover" width="460" height="215" alt="">
      <div class="gm-intro">
        <div class="gm-rank"><span class="gm-rank-mark" aria-hidden="true"></span><span class="gm-tier"></span></div>
        <h2 class="gm-title" id="gm-title"></h2>
        <div class="gm-status-line">${icon('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>')}<span class="gm-status"></span></div>
      </div>
    </div>
    <div class="gm-grid">
      <div class="gm-item gm-hours-item">${icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')}<div><span class="gm-label">Время в игре</span><strong class="gm-value gm-hours"></strong></div></div>
      <div class="gm-item gm-deaths-item">${icon('<path d="M9 18H7v-3a7 7 0 1 1 10 0v3h-2v3H9z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="m11 14 1-2 1 2M12 18v3"/>')}<div><span class="gm-label">Смерти</span><strong class="gm-value gm-deaths"></strong></div></div>
    </div>
    <a class="gm-btn" target="_blank" rel="noopener noreferrer" hidden>${icon('<path d="m9 5 11 7-11 7z"/>')}<span>Открыть плейлист</span></a>
  </div>`;
  function setupDialogFocus(element) {
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const controls = [
        ...element.querySelectorAll(
          'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
        ),
      ].filter(
        (control) =>
          control.getClientRects().length && !control.closest("[hidden]"),
      );
      if (!controls.length) {
        event.preventDefault();
        return;
      }
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }
  setupDialogFocus(dialog);
  document.body.append(dialog);
  let invoker;
  dialog
    .querySelector(".gm-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (invoker?.isConnected) invoker.focus();
  });
  function openGame(game, button) {
    const tier = data.tiers.find((t) => t.id === game.tier);
    const cover = dialog.querySelector(".gm-cover");
    cover.src = data.safeCover(game.cover) || "/avatar.webp";
    cover.alt = "Обложка " + game.name;
    cover.onerror = () => {
      cover.onerror = null;
      cover.src = "/avatar.webp";
    };
    for (const [selector, value] of [
      [".gm-rank-mark", tier.special ? tier.mark : tier.id],
      [".gm-tier", tier.title],
      [".gm-title", game.name],
      [".gm-status", game.status],
      [".gm-hours", `${game.hours} ч.`],
      [".gm-deaths", game.deaths],
    ])
      dialog.querySelector(selector).textContent = value;
    dialog
      .querySelector(".gm-status-line .gm-icon")
      .toggleAttribute("hidden", game.status !== "Завершено");
    const compact = ["NOW", "PLANNED"].includes(game.tier);
    dialog.querySelector(".gm-grid").hidden = compact;
    const link = dialog.querySelector(".gm-btn");
    const playlist = data.safePlaylist(game.playlist);
    link.hidden = !playlist;
    if (playlist) link.href = playlist;
    else link.removeAttribute("href");
    invoker = button;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector(".gm-close").focus();
  }
  function createCard(game) {
    const card = document.createElement("div");
    card.className = "game-card";
    card.dataset.gameName = game.name;
    const button = document.createElement("button");
    button.className = "game-open";
    button.type = "button";
    button.setAttribute("aria-label", game.name + " — подробнее");
    const image = document.createElement("img");
    image.className = "game-cover";
    image.src = data.safeCover(game.cover) || "/avatar.webp";
    image.alt = "Обложка " + game.name;
    image.loading = "lazy";
    image.width = 460;
    image.height = 215;
    image.draggable = false;
    image.onerror = () => {
      image.onerror = null;
      image.src = "/avatar.webp";
    };
    button.append(image);
    button.addEventListener("click", () => openGame(game, button));
    card.append(button);
    return card;
  }
  function render(games) {
    data.validateGames(games);
    const fragment = document.createDocumentFragment();
    for (const tier of data.tiers) {
      const row = document.createElement("div");
      row.className = "tier-row";
      row.dataset.tier = tier.id;
      const label = document.createElement("div");
      label.className = "tier-box" + (tier.special ? " special" : "");
      label.textContent = tier.special ? tier.title : tier.mark;
      label.title = tier.title;
      const grid = document.createElement("div");
      grid.className = "tier-grid";
      for (const game of games.filter((g) => g.tier === tier.id))
        grid.append(createCard(game));
      row.append(label, grid);
      fragment.append(row);
    }
    container.replaceChildren(fragment);
    window.dispatchEvent(new CustomEvent("gameshelf:rendered"));
  }
  const shelf = { games: [], createCard, render, setupDialogFocus };
  window.GameShelf = shelf;
  shelf.ready = data.loadGames().then((games) => {
    shelf.games = games;
    render(games);
    const requested = new URLSearchParams(location.search).get("game");
    const card = Array.from(container.querySelectorAll(".game-card")).find(
      (c) => c.dataset.gameName === requested,
    );
    if (card) {
      card.scrollIntoView({ block: "center" });
      card.querySelector(".game-open").click();
    }
    window.dispatchEvent(
      new CustomEvent("gameshelf:loaded", { detail: { games } }),
    );
    return games;
  });
  shelf.ready.catch((error) => {
    console.error("Ошибка загрузки игровой полки:", error);
    container.textContent =
      "Не удалось загрузить игровую полку. Попробуй обновить страницу.";
  });
})();
