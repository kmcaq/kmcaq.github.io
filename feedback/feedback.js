const WORKER_URL = "https://resend.km-tamami.workers.dev/feedback";

const form = document.getElementById("feedback-form");
const category = document.getElementById("feedback-category");
const message = document.getElementById("feedback-message");
const submitButton = document.getElementById("feedback-submit");
const status = document.getElementById("feedback-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;

  const selectedCategory = category.value;
  const text = message.value.trim();

  if (!selectedCategory || !text) {
    showStatus("Пожалуйста, заполни сообщение.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Отправляем...";
  showStatus("", "");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  form.setAttribute("aria-busy", "true");
  try {
    const response = await fetch(WORKER_URL, {
      signal: controller.signal,
      method: "POST",
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        category: selectedCategory,
        message: text,
      }),
    });

    const responseText = await response.text();
    let data = null;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("Сервер вернул некорректный ответ.");
    }

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Не удалось отправить сообщение.");
    }

    form.reset();
    showStatus("Сообщение отправлено 💜 Спасибо!", "success");
  } catch (error) {
    console.error("Feedback error:", error);
    showStatus(
      error.name === "AbortError"
        ? "Сервер не ответил вовремя. Текст сохранён в поле; попробуй отправить его ещё раз."
        : "Не получилось отправить сообщение. Текст сохранён в поле; попробуй ещё раз немного позже.",
      "error",
    );
  } finally {
    clearTimeout(timeout);
    form.removeAttribute("aria-busy");
    submitButton.disabled = false;
    submitButton.textContent = "Отправить сообщение";
  }
});

function showStatus(text, type) {
  status.textContent = text;
  status.className = "feedback-status";

  if (type) {
    status.classList.add(`feedback-status-${type}`);
  }
}
