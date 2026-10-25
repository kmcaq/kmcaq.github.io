(() => {
  const button = document.querySelector('.copy-email');
  const email = document.querySelector('.email');
  const status = document.querySelector('.copy-status');
  if (!button || !email || !status) return;

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await navigator.clipboard.writeText(email.textContent.trim());
      status.textContent = 'Почта скопирована';
    } catch {
      status.textContent = 'Не удалось скопировать. Выделите адрес или нажмите на него, чтобы написать письмо.';
    } finally {
      button.disabled = false;
    }
  });
})();
