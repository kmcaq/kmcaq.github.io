(() => {
  "use strict";
  const container = document.getElementById("gameshelfContainer");
  if (!container) return;
  const data = window.GameData;
  const dialog = document.createElement("dialog");
  dialog.className = "gm-overlay";
  dialog.setAttribute("aria-labelledby", "gm-title");
  dialog.innerHTML = `<div class="gm-modal">
    <button class="gm-close" type="button" aria-label="Закрыть подробности">×</button>
    <div class="gm-content"><img class="gm-cover" alt=""><div>
    <div class="gm-tier"></div><h2 class="gm-title" id="gm-title"></h2>
    <div class="gm-grid">
      <div class="gm-item gm-rating-item"><span>Оценка</span><div class="gm-rating"></div></div>
      <div class="gm-item"><span>Статус</span><div class="gm-status"></div></div>
      <div class="gm-item gm-hours-item"><span>Часы</span><div class="gm-hours"></div></div>
      <div class="gm-item gm-deaths-item"><span>Смерти</span><div class="gm-deaths"></div></div>
    </div><a class="gm-btn" target="_blank" rel="noopener noreferrer">▶ Открыть плейлист</a>
    <p class="gm-no-playlist">Запись пока недоступна.</p></div></div></div>`;
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
      [".gm-tier", tier.title],
      [".gm-title", game.name],
      [".gm-rating", game.rating != null ? `${game.rating}/10` : "—"],
      [".gm-status", game.status],
      [".gm-hours", `${game.hours} ч.`],
      [".gm-deaths", game.deaths],
    ])
      dialog.querySelector(selector).textContent = value;
    const compact = ["NOW", "PLANNED"].includes(game.tier);
    for (const selector of [
      ".gm-rating-item",
      ".gm-hours-item",
      ".gm-deaths-item",
    ])
      dialog.querySelector(selector).hidden = compact;
    const link = dialog.querySelector(".gm-btn");
    const playlist = data.safePlaylist(game.playlist);
    link.hidden = !playlist;
    if (playlist) link.href = playlist;
    else link.removeAttribute("href");
    dialog.querySelector(".gm-no-playlist").hidden = Boolean(playlist);
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
