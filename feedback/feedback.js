const WORKER_URL = "https://resend.km-tamami.workers.dev/feedback";

const form = document.getElementById("feedback-form");
const category = document.getElementById("feedback-category");
const message = document.getElementById("feedback-message");
const submitButton = document.getElementById("feedback-submit");
const status = document.getElementById("feedback-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const selectedCategory = category.value;
  const text = message.value.trim();

  if (!selectedCategory || !text) {
    showStatus("Пожалуйста, заполни сообщение.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Отправляем...";
  showStatus("", "");

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        category: selectedCategory,
        message: text
      })
    });

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    // Никогда не выводим текст ошибки сервера в консоль или интерфейс.
    if (!response.ok || !data?.ok) {
      throw new Error("FEEDBACK_SEND_FAILED");
    }

    form.reset();
    showStatus("Сообщение отправлено 💜 Спасибо!", "success");
  } catch {
    // Не логируем объект ошибки: ответ Worker может содержать внутренние данные.
    console.error("Feedback submission failed");

    showStatus(
      "Не получилось отправить сообщение. Попробуй ещё раз немного позже.",
      "error"
    );
  } finally {
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
