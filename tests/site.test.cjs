const { test } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sourceGames = JSON.parse(read("data/games.json"));
const turn = () => new Promise((resolve) => setTimeout(resolve, 0));
function game(name, extra = {}) {
  return {
    name,
    tier: "A",
    status: "Завершено",
    hours: 1,
    deaths: 0,
    cover: "../covers/re2.png",
    playlist: "",
    ...extra,
  };
}
async function setup({
  games = sourceGames,
  admin = false,
  saveOK = true,
  hasToken = true,
  sessionStatus = 200,
  authenticated = true,
} = {}) {
  const navigationAttempts = [];
  const virtualConsole = new VirtualConsole().sendTo(console, {
    omitJSDOMErrors: true,
  });
  virtualConsole.on("jsdomError", (error) => {
    if (error.message.startsWith("Not implemented: navigation"))
      navigationAttempts.push(error);
    else throw error;
  });
  const dom = new JSDOM(read("games/index.html"), {
    virtualConsole,
    url: "https://kmcaq.github.io/games/" + (admin ? "?admin=1" : ""),
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new w.Event("close"));
  };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.confirm = () => true;
  const alerts = [];
  w.alert = (message) => alerts.push(message);
  if (hasToken) w.sessionStorage.setItem("admin_token", "test-token");
  const requests = [];
  const writes = [];
  w.fetch = async (url, options = {}) => {
    requests.push(String(url));
    if (url === "/data/games.json")
      return { ok: true, json: async () => structuredClone(games) };
    if (String(url).includes("/session"))
      return {
        ok: sessionStatus === 200,
        status: sessionStatus,
        text: async () => JSON.stringify({ authenticated }),
      };
    if (String(url).includes("api.github.com"))
      return {
        ok: true,
        json: async () => [{ name: "re2.png", type: "file" }],
      };
    if (options.method === "PUT") {
      writes.push(JSON.parse(options.body));
      return {
        ok: saveOK,
        status: saveOK ? 200 : 500,
        text: async () => JSON.stringify({ ok: saveOK }),
      };
    }
    throw Error("Unexpected request: " + url);
  };
  w.eval(read("js/game-data.js"));
  w.eval(read("js/gameshelf.js"));
  await w.GameShelf.ready;
  if (admin) {
    w.eval(read("admin.js"));
    await turn();
    await turn();
  }
  return {
    dom,
    w,
    writes,
    alerts,
    requests,
    navigationAttempts,
    close: () => w.close(),
  };
}
function editor(w, name) {
  if (name)
    [...w.document.querySelectorAll(".game-card")]
      .find((c) => c.dataset.gameName === name)
      .querySelector(".edit")
      .click();
  else w.document.getElementById("admin-add").click();
  return w.document.querySelector(".admin-form");
}
function submit(w, form) {
  form.dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
}

test("all stored records are valid and all games appear on the shelf", async () => {
  const s = await setup();
  try {
    assert.equal(
      s.w.document.querySelectorAll(".game-open").length,
      sourceGames.length,
    );
    assert(s.w.document.querySelector(".game-open").hasAttribute("aria-label"));
  } finally {
    s.close();
  }
});

test("rejected duplicate and empty-name edits leave records unchanged", async () => {
  const s = await setup({
    games: [game("First"), game("Second")],
    admin: true,
  });
  try {
    const before = JSON.stringify(s.w.GameShelf.games);
    const form = editor(s.w, "First");
    form.elements.name.value = " second ";
    form.elements.hours.value = "999";
    submit(s.w, form);
    assert.equal(JSON.stringify(s.w.GameShelf.games), before);
    assert.match(
      form.querySelector(".admin-editor-error").textContent,
      /существует/,
    );
    form.elements.name.value = " ";
    submit(s.w, form);
    assert.equal(JSON.stringify(s.w.GameShelf.games), before);
  } finally {
    s.close();
  }
});

test("editing preserves the selected section without rating or mode controls", async () => {
  const s = await setup({ games: [game("First")], admin: true });
  try {
    const form = editor(s.w, "First");
    assert.equal(form.elements.tier.value, "A");
    assert.equal(form.elements.tierMode, undefined);
    assert.equal(form.elements.rating, undefined);
    assert.equal(form.elements.tier.options.length, 8);
    form.elements.status.value = "Дроп";
    submit(s.w, form);
    assert.equal(s.w.GameShelf.games[0].tier, "A");
    assert.equal(s.w.GameShelf.games[0].status, "Дроп");
    assert.equal(
      s.w.document.querySelector(".game-card").closest(".tier-row").dataset
        .tier,
      "A",
    );
  } finally {
    s.close();
  }
});

test("adding to an empty shelf creates a keyboard button with working details", async () => {
  const s = await setup({ games: [], admin: true });
  try {
    const form = editor(s.w);
    form.elements.name.value = "New Game";
    submit(s.w, form);
    assert.equal(s.w.GameShelf.games.length, 1);
    const button = s.w.document.querySelector(".game-open");
    button.click();
    assert(s.w.document.querySelector(".gm-overlay").open);
    assert.equal(
      s.w.document.querySelector(".gm-title").textContent,
      "New Game",
    );
    assert(s.w.document.querySelector(".gm-btn").hidden);
    assert(!s.w.document.querySelector(".gm-no-playlist").hidden);
  } finally {
    s.close();
  }
});

test("edited cards open the updated title and tier", async () => {
  const s = await setup({ games: [game("First")], admin: true });
  try {
    const form = editor(s.w, "First");
    form.elements.name.value = "Renamed";
    submit(s.w, form);
    s.w.document.querySelector(".game-open").click();
    assert.equal(
      s.w.document.querySelector(".gm-title").textContent,
      "Renamed",
    );
    assert.equal(s.w.document.querySelector(".gm-tier").textContent, "Отлично");
    assert.match(
      s.w.document.querySelector(".game-open").getAttribute("aria-label"),
      /Renamed/,
    );
  } finally {
    s.close();
  }
});

test("game names are text and unsafe URLs are rejected", async () => {
  const name = '\"><img src=x onerror="alert(1)">';
  const s = await setup({ games: [game(name)] });
  try {
    assert.equal(s.w.document.querySelectorAll(".game-card img").length, 1);
    assert.equal(s.w.document.querySelectorAll("[onerror]").length, 0);
    s.w.document.querySelector(".game-open").click();
    assert.equal(s.w.document.querySelector(".gm-title").textContent, name);
    assert.equal(s.w.GameData.safePlaylist("javascript:alert(1)"), "");
    assert.equal(
      s.w.GameData.safePlaylist("https://youtube.com.evil.test/"),
      "",
    );
    assert.equal(s.w.GameData.safeCover('../covers/a.png" onerror="x'), "");
  } finally {
    s.close();
  }
});

test("tier moves keep status consistent and invalid numeric data is rejected", async () => {
  const s = await setup({ games: [] });
  try {
    const data = s.w.GameData;
    assert.equal(data.moveToTier(game("X"), "NOW").status, "Прохожу");
    assert.equal(data.moveToTier(game("X"), "PLANNED").status, "В планах");
    assert.equal(
      data.moveToTier(game("X", { tier: "PLANNED", status: "В планах" }), "F")
        .status,
      "Завершено",
    );
    assert.throws(() => data.validateGames([game("X", { deaths: -1 })]));
    assert.throws(() => data.validateGames([game("X", { tier: "unknown" })]));
    assert.throws(() => data.validateGames([game("X"), game("x")]));
  } finally {
    s.close();
  }
});

test("saving preserves every record and rejected writes keep unsaved edits", async () => {
  for (const saveOK of [true, false]) {
    const s = await setup({
      games: [game("First"), game("Second")],
      admin: true,
      saveOK,
    });
    try {
      const form = editor(s.w, "First");
      form.elements.name.value = "Changed";
      submit(s.w, form);
      s.w.document.getElementById("admin-save").click();
      await turn();
      await turn();
      assert.equal(s.writes[0].games.length, 2);
      assert.equal(s.w.GameShelf.games.length, 2);
      assert.match(
        s.w.document.getElementById("admin-save").textContent,
        saveOK ? /Сохранено/ : /Сохранить\*/,
      );
    } finally {
      s.close();
    }
  }
});

test("homepage shows every completed game and puts current games first", async () => {
  const current = game("Playing", {
    status: "Прохожу",
    tier: "NOW",
  });
  const records = [...sourceGames, current];
  const dom = new JSDOM(read("index.html"), {
    url: "https://kmcaq.github.io/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  try {
    w.fetch = async () => ({
      ok: true,
      json: async () => structuredClone(records),
    });
    w.ResizeObserver = class {
      observe() {}
    };
    w.eval(read("js/game-data.js"));
    w.eval(read("js/home-games.js"));
    await turn();
    await turn();
    assert.equal(
      w.document.querySelectorAll(".recent-game").length,
      records.filter((g) => g.status === "Завершено" || g.tier === "NOW")
        .length,
    );
    assert.equal(
      w.document.querySelector(".recent-game strong").textContent,
      "Playing",
    );
    assert.equal(
      w.document.querySelectorAll(".recent-game img").length,
      records.filter((g) => g.status === "Завершено" || g.tier === "NOW")
        .length,
    );
  } finally {
    w.close();
  }
});

test("feedback timeout restores the button and preserves the message", async () => {
  const dom = new JSDOM(read("feedback/index.html"), {
    url: "https://kmcaq.github.io/feedback/",
    runScripts: "outside-only",
  });
  const w = dom.window;
  try {
    let timeout;
    w.setTimeout = (fn) => {
      timeout = fn;
      return 1;
    };
    w.clearTimeout = () => {};
    w.fetch = (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () =>
          reject(new w.DOMException("Aborted", "AbortError")),
        ),
      );
    w.eval(read("feedback/feedback.js"));
    const form = w.document.getElementById("feedback-form");
    w.document.getElementById("feedback-message").value = "Keep this message";
    submit(w, form);
    assert(w.document.getElementById("feedback-submit").disabled);
    timeout();
    await turn();
    assert(!w.document.getElementById("feedback-submit").disabled);
    assert.equal(
      w.document.getElementById("feedback-message").value,
      "Keep this message",
    );
    assert.match(
      w.document.getElementById("feedback-status").textContent,
      /не ответил вовремя/,
    );
    assert(!form.hasAttribute("aria-busy"));
  } finally {
    w.close();
  }
});

test("page asset references and all cover paths exist", () => {
  for (const file of [
    "index.html",
    "games/index.html",
    "links/index.html",
    "feedback/index.html",
  ]) {
    const dom = new JSDOM(read(file));
    try {
      assert.equal(dom.window.document.querySelectorAll("style").length, 0);
      for (const element of dom.window.document.querySelectorAll(
        "script[src],link[href],img[src]",
      )) {
        const value = element.getAttribute(
          element.tagName === "LINK" ? "href" : "src",
        );
        if (/^https?:/.test(value)) continue;
        const pathname = value.split("?")[0];
        const target = pathname.startsWith("/")
          ? path.join(root, pathname)
          : path.resolve(root, path.dirname(file), pathname);
        assert(
          fs.existsSync(target),
          file + " references missing file " + value,
        );
      }
    } finally {
      dom.window.close();
    }
  }
  for (const game of sourceGames)
    assert(
      fs.existsSync(path.resolve(root, "games", game.cover)),
      game.name + " has a missing cover",
    );
});

test("first visit without a session redirects without an alert or admin API requests", async () => {
  const s = await setup({ admin: true, hasToken: false });
  try {
    assert.deepEqual(s.alerts, []);
    assert.equal(s.navigationAttempts.length, 1);
    assert(
      !s.requests.some(
        (url) => url.includes("/session") || url.includes("api.github.com"),
      ),
    );
    assert.equal(s.w.document.getElementById("admin-toolbar"), null);
  } finally {
    s.close();
  }
});

test("expired and rejected sessions redirect without reporting a shelf loading failure", async () => {
  for (const options of [{ sessionStatus: 401 }, { authenticated: false }]) {
    const s = await setup({ admin: true, ...options });
    try {
      assert.deepEqual(s.alerts, []);
      assert.equal(s.navigationAttempts.length, 1);
      assert.equal(s.w.sessionStorage.getItem("admin_token"), null);
      assert(s.w.document.getElementById("admin-add").disabled);
    } finally {
      s.close();
    }
  }
});

test("dragging a card sets its tier by section and saving retains that position", async () => {
  const s = await setup({ games: [game("First")], admin: true });
  try {
    const card = s.w.document.querySelector(".game-card");
    function dropInto(tier) {
      const transfer = { effectAllowed: "", setData() {} };
      const start = new s.w.Event("dragstart", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(start, "dataTransfer", { value: transfer });
      card.dispatchEvent(start);
      const grid = s.w.document.querySelector(
        '[data-tier="' + tier + '"] .tier-grid',
      );
      const drop = new s.w.Event("drop", { bubbles: true, cancelable: true });
      grid.dispatchEvent(drop);
      assert.equal(card.closest(".tier-row").dataset.tier, tier);
      assert.equal(s.w.GameShelf.games[0].tier, tier);
    }
    dropInto("NOW");
    assert.equal(s.w.GameShelf.games[0].status, "Прохожу");
    dropInto("PLANNED");
    assert.equal(s.w.GameShelf.games[0].status, "В планах");
    dropInto("S");
    assert.equal(s.w.GameShelf.games[0].status, "Завершено");
    const form = editor(s.w, "First");
    form.elements.hours.value = "100";
    submit(s.w, form);
    assert.equal(s.w.GameShelf.games[0].tier, "S");
    s.w.document.getElementById("admin-save").click();
    await turn();
    await turn();
    assert.equal(s.writes[0].games[0].tier, "S");
    assert(!("rating" in s.writes[0].games[0]));
  } finally {
    s.close();
  }
});

test("old numeric ratings are discarded and all game dialogs omit ratings", async () => {
  const records = [
    game("Completed", { rating: 10 }),
    game("Current", { tier: "NOW", status: "Прохожу", rating: 5 }),
    game("Future", { tier: "PLANNED", status: "В планах", rating: 1 }),
  ];
  const s = await setup({ games: records, admin: true });
  try {
    assert(s.w.GameShelf.games.every((game) => !("rating" in game)));
    for (const card of s.w.document.querySelectorAll(".game-card")) {
      card.querySelector(".game-open").click();
      assert.equal(s.w.document.querySelector(".gm-rating"), null);
      s.w.document.querySelector(".gm-close").click();
      card.querySelector(".edit").click();
      assert.equal(
        s.w.document.querySelector(".admin-form").elements.rating,
        undefined,
      );
      s.w.document.querySelector("[data-cancel]").click();
    }
    s.w.document.getElementById("admin-save").click();
    await turn();
    await turn();
    assert(s.writes[0].games.every((game) => !("rating" in game)));
  } finally {
    s.close();
  }
});

test("tier selection moves existing cards and stores the same tier without reordering unchanged cards", async () => {
  const s = await setup({
    games: [game("First"), game("Second")],
    admin: true,
  });
  try {
    const card = s.w.document.querySelector(".game-card");
    for (const tier of ["S", "NOW", "PLANNED", "B"]) {
      const form = editor(s.w, "First");
      form.elements.tier.value = tier;
      form.elements.tier.dispatchEvent(new s.w.Event("change"));
      submit(s.w, form);
      assert.equal(card.closest(".tier-row").dataset.tier, tier);
      const record = s.w.GameShelf.games.find((g) => g.name === "First");
      assert.equal(record.tier, tier);
      assert.equal(
        record.status,
        tier === "NOW"
          ? "Прохожу"
          : tier === "PLANNED"
            ? "В планах"
            : "Завершено",
      );
      card.querySelector(".game-open").click();
      assert.equal(
        s.w.document.querySelector(".gm-tier").textContent,
        s.w.GameData.tiers.find((t) => t.id === tier).title,
      );
      s.w.document.querySelector(".gm-close").click();
    }
    s.w.document.getElementById("admin-save").click();
    await turn();
    await turn();
    assert.equal(s.writes[0].games.find((g) => g.name === "First").tier, "B");
    assert(s.writes[0].games.every((g) => !("rating" in g)));
  } finally {
    s.close();
  }
});

test("cancelled or invalid edits do not move a card; new cards can use any selected tier", async () => {
  const s = await setup({
    games: [game("First"), game("Second")],
    admin: true,
  });
  try {
    const card = s.w.document.querySelector(".game-card");
    let form = editor(s.w, "First");
    form.elements.tier.value = "S";
    form.elements.tier.dispatchEvent(new s.w.Event("change"));
    form.querySelector("[data-cancel]").click();
    assert.equal(card.closest(".tier-row").dataset.tier, "A");
    form = editor(s.w, "First");
    form.elements.name.value = "Second";
    form.elements.tier.value = "S";
    form.elements.tier.dispatchEvent(new s.w.Event("change"));
    submit(s.w, form);
    assert.equal(card.closest(".tier-row").dataset.tier, "A");
    assert.equal(s.w.GameShelf.games.find((g) => g.name === "First").tier, "A");
    form.querySelector("[data-cancel]").click();
    form = editor(s.w);
    form.elements.name.value = "New ranked game";
    form.elements.tier.value = "D";
    form.elements.tier.dispatchEvent(new s.w.Event("change"));
    submit(s.w, form);
    const added = [...s.w.document.querySelectorAll(".game-card")].find(
      (c) => c.dataset.gameName === "New ranked game",
    );
    assert.equal(added.closest(".tier-row").dataset.tier, "D");
    assert.equal(
      s.w.GameShelf.games.find((g) => g.name === "New ranked game").status,
      "Завершено",
    );
  } finally {
    s.close();
  }
});
