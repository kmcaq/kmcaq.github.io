(() => {
  const API = "https://admin.km-tamami.workers.dev";
  const TOKEN_KEY = "admin_token";
  const url = new URL(location.href);

  if (url.searchParams.get("admin") !== "1") return;
  if (location.pathname.split("/").filter(Boolean)[0] !== "games") return;

  const token = () => sessionStorage.getItem(TOKEN_KEY);

  function addStyles() {
    if (document.getElementById("admin-cover-upload-style")) return;
    const style = document.createElement("style");
    style.id = "admin-cover-upload-style";
    style.textContent = `
      #admin-upload-cover{background:#374151}
      #admin-upload-cover:hover{background:#4b5563}
      #admin-cover-file{display:none}
      .admin-upload-status{position:fixed;left:50%;top:72px;transform:translateX(-50%);z-index:100001;max-width:min(560px,calc(100vw - 32px));padding:10px 16px;border-radius:12px;background:#151922;border:1px solid rgba(255,255,255,.14);box-shadow:0 12px 40px rgba(0,0,0,.35);color:#fff;font:14px/1.4 Nunito,sans-serif;text-align:center}
    `;
    document.head.appendChild(style);
  }

  function status(message) {
    document.querySelector(".admin-upload-status")?.remove();
    const el = document.createElement("div");
    el.className = "admin-upload-status";
    el.textContent = message;
    document.body.appendChild(el);
    return el;
  }

  async function upload(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      status("Можно загрузить только PNG, JPEG или WebP.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      status("Обложка слишком большая. Максимум — 10 МБ.");
      return;
    }

    const currentToken = token();
    if (!currentToken) {
      status("Сессия администратора не найдена. Обновите страницу.");
      return;
    }

    const name = prompt("Название игры для обложки:", file.name.replace(/\\.[^.]+$/, ""));
    if (name === null) return;
    const game = name.trim();
    if (!game) {
      status("Название игры не может быть пустым.");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("game", game);

    const message = status("Загружаю обложку…");
    const button = document.getElementById("admin-upload-cover");
    if (button) button.disabled = true;

    try {
      const response = await fetch(`${API}/upload-cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
        body: form
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        throw new Error("Сессия истекла. Обновите страницу и войдите снова.");
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось загрузить обложку.");
      }

      message.textContent = "Обложка загружена. Обновляю список обложек…";
      setTimeout(() => location.reload(), 500);
    } catch (error) {
      message.textContent = error?.message || "Не удалось загрузить обложку.";
      if (button) button.disabled = false;
    }
  }

  function install() {
    const toolbar = document.getElementById("admin-toolbar");
    if (!toolbar || document.getElementById("admin-upload-cover")) return;

    const addButton = document.getElementById("admin-add");
    if (!addButton) return;

    addStyles();

    const button = document.createElement("button");
    button.id = "admin-upload-cover";
    button.type = "button";
    button.textContent = "🖼️ Загрузить обложку";
    button.title = "Загрузить новую обложку в covers";

    const input = document.createElement("input");
    input.id = "admin-cover-file";
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";

    button.onclick = () => input.click();
    input.onchange = () => {
      const file = input.files?.[0];
      input.value = "";
      upload(file);
    };

    toolbar.insertBefore(button, addButton);
    toolbar.appendChild(input);
  }

  const observer = new MutationObserver(install);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  install();
})();
