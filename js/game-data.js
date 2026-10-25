/* Data rules shared by the shelf, homepage and editor. */
(() => {
  "use strict";
  const tiers = [
    { id: "NOW", title: "Играю сейчас", mark: "▶", special: true },
    { id: "S", title: "Легендарно", mark: "S" },
    { id: "A", title: "Отлично", mark: "A" },
    { id: "B", title: "Хорошо", mark: "B" },
    { id: "C", title: "Нормально", mark: "C" },
    { id: "D", title: "Слабо", mark: "D" },
    { id: "F", title: "Не понравилось", mark: "F" },
    { id: "PLANNED", title: "В планах", mark: "…", special: true },
  ];
  const statuses = ["Прохожу", "Завершено", "Дроп", "В планах", "Заморозка"];
  const normalizeStatus = (status) =>
    status === "Пройдено"
      ? "Завершено"
      : status === "Запланировано"
        ? "В планах"
        : status;
  function safeCover(value) {
    if (typeof value !== "string") return "";
    const path = value.replace(/^\.\.\//, "/");
    return /^\/covers\/[\w%-]+\.(?:png|jpe?g|webp)$/i.test(path) ? path : "";
  }
  function safePlaylist(value) {
    if (!value) return "";
    try {
      const url = new URL(value);
      return url.protocol === "https:" &&
        [
          "youtube.com",
          "www.youtube.com",
          "youtu.be",
          "m.youtube.com",
        ].includes(url.hostname) &&
        !url.username &&
        !url.password &&
        !url.port
        ? url.href
        : "";
    } catch {
      return "";
    }
  }
  // Legacy numeric ratings are deliberately not part of game records anymore.
  function withoutRating(game) {
    const { rating, tierMode, ...record } = game;
    return record;
  }
  function validateGame(game) {
    if (!game || typeof game !== "object" || Array.isArray(game))
      throw Error("Некорректная запись игры.");
    if (typeof game.name !== "string" || !game.name.trim())
      throw Error("Название игры не может быть пустым.");
    if (!tiers.some((t) => t.id === game.tier))
      throw Error("Выбери существующий тир.");
    if (!statuses.includes(game.status))
      throw Error("Выбери существующий статус.");
    const planned = ["В планах", "Заморозка"].includes(game.status);
    if (
      (game.tier === "PLANNED") !== planned ||
      (game.tier === "NOW") !== (game.status === "Прохожу")
    ) {
      throw Error(
        "Статус и тир не совпадают. Для текущей игры выбери «Играю сейчас», для планов и заморозки — «В планах».",
      );
    }
    for (const key of ["hours", "deaths"]) {
      if (
        typeof game[key] !== "number" ||
        !Number.isFinite(game[key]) ||
        game[key] < 0 ||
        (key === "deaths" && !Number.isInteger(game[key]))
      )
        throw Error(
          "Часы и смерти должны быть неотрицательными числами; смерти — целым числом.",
        );
    }
    if (game.cover && !safeCover(game.cover))
      throw Error("Выбери обложку из списка.");
    if (game.playlist && !safePlaylist(game.playlist))
      throw Error("Укажи HTTPS-ссылку на YouTube.");
    return game;
  }
  function validateGames(games) {
    if (!Array.isArray(games)) throw Error("Список игр должен быть массивом.");
    const names = new Set();
    for (const game of games) {
      validateGame(game);
      const name = game.name.trim().toLocaleLowerCase("ru-RU");
      if (names.has(name))
        throw Error("Игра с таким названием уже существует: " + game.name);
      names.add(name);
    }
    return games;
  }
  function readGames(value) {
    if (!Array.isArray(value)) throw Error("Некорректный список игр.");
    return validateGames(
      value.map((g) => ({
        ...withoutRating(g),
        status: normalizeStatus(g.status),
      })),
    );
  }
  function prepareGame(source, fields, games, oldName = null) {
    // Validate a detached draft. Rejected edits cannot mutate the original record.
    const draft = {
      ...withoutRating(source),
      ...withoutRating(fields),
      name: String(fields.name || "").trim(),
      status: normalizeStatus(fields.status),
    };
    validateGame(draft);
    const key = draft.name.toLocaleLowerCase("ru-RU");
    if (
      games.some(
        (g) =>
          g.name !== oldName &&
          g.name.trim().toLocaleLowerCase("ru-RU") === key,
      )
    )
      throw Error("Игра с таким названием уже существует.");
    return draft;
  }
  function moveToTier(game, tier) {
    const draft = { ...withoutRating(game), tier };
    if (tier === "NOW") draft.status = "Прохожу";
    else if (tier === "PLANNED")
      draft.status = game.status === "Заморозка" ? "Заморозка" : "В планах";
    else if (["Прохожу", "В планах", "Заморозка"].includes(game.status))
      draft.status = "Завершено";
    return validateGame(draft);
  }
  let loadPromise;
  function loadGames() {
    if (!loadPromise)
      loadPromise = (async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const response = await fetch("/data/games.json", {
            cache: "no-cache",
            signal: controller.signal,
          });
          if (!response.ok) throw Error("Не удалось загрузить список игр.");
          return readGames(await response.json());
        } finally {
          clearTimeout(timeout);
        }
      })().catch((error) => {
        loadPromise = null;
        throw error;
      });
    return loadPromise;
  }
  window.GameData = {
    tiers,
    statuses,
    normalizeStatus,
    safeCover,
    safePlaylist,
    validateGames,
    prepareGame,
    moveToTier,
    loadGames,
  };
})();
