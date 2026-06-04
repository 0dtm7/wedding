const reveals = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.18 });

reveals.forEach((item) => revealObserver.observe(item));

const form = document.getElementById('rsvpForm');
const result = document.getElementById('result');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');
const copyBtn = document.getElementById('copyBtn');
const statusSelect = form.querySelector('[name="status"]');
const guestCountInput = form.querySelector('[name="guestCount"]');

const statusText = {
  yes: 'Приду',
  plus_one: 'Приду с парой',
  no: 'Не смогу прийти'
};

function syncGuestCountWithStatus() {
  if (statusSelect.value === 'no') {
    guestCountInput.value = 0;
    guestCountInput.disabled = true;
  } else {
    guestCountInput.disabled = false;
    if (!guestCountInput.value || Number(guestCountInput.value) === 0) {
      guestCountInput.value = statusSelect.value === 'plus_one' ? 2 : 1;
    }
  }
}

statusSelect.addEventListener('change', syncGuestCountWithStatus);
syncGuestCountWithStatus();

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const button = form.querySelector('button[type="submit"]');
  const data = new FormData(form);
  const payload = {
    name: data.get('name').trim(),
    status: data.get('status'),
    guestCount: Number(data.get('guestCount')),
    comment: data.get('comment').trim()
  };

  button.disabled = true;
  button.textContent = 'Сохраняем ответ...';

  try {
    const response = await fetch('/api/rsvp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const answer = await response.json();

    if (!response.ok) {
      throw new Error(answer.message || 'Не удалось сохранить ответ');
    }

    const message = `Спасибо! Ваш ответ сохранён.\n\n${payload.name}: ${statusText[payload.status]} на свадьбу 27 июня.\nГостей: ${payload.status === 'no' ? 0 : payload.guestCount}.\n${payload.comment ? `Комментарий: ${payload.comment}` : 'Комментарий: —'}`;

    resultText.textContent = message;
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    form.reset();
    syncGuestCountWithStatus();
  } catch (error) {
    resultText.textContent = `Ответ не сохранился. Скорее всего сайт открыт как обычный index.html без сервера.\n\nЧтобы ответы сохранялись, запустите сайт командой pnpm dev или npm run dev.\n\nТекст ошибки: ${error.message}`;
    result.hidden = false;
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } finally {
    button.disabled = false;
    button.textContent = 'Отправить ответ';
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(resultText.textContent);
    copyBtn.textContent = 'Скопировано';
    setTimeout(() => copyBtn.textContent = 'Скопировать', 1600);
  } catch (error) {
    copyBtn.textContent = 'Скопируйте вручную';
  }
});
