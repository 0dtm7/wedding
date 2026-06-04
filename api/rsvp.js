const crypto = require('crypto');
const {
  STATUS_LABELS,
  ensureStorage,
  getSql,
  json,
  normalizeGuestCount,
  readBody
} = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { message: 'Метод не поддерживается.' });
  }

  try {
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 80);
    const status = String(body.status || '').trim();
    const comment = String(body.comment || '').trim().slice(0, 800);

    if (!name) {
      return json(res, 400, { message: 'Укажите имя гостя.' });
    }

    if (!STATUS_LABELS[status]) {
      return json(res, 400, { message: 'Выберите корректный вариант ответа.' });
    }

    await ensureStorage();

    const item = {
      id: crypto.randomUUID(),
      name,
      status,
      statusLabel: STATUS_LABELS[status],
      guestCount: normalizeGuestCount(status, body.guestCount),
      comment,
      createdAt: new Date().toISOString()
    };

    const sql = getSql();
    await sql`
      INSERT INTO rsvp_answers (id, name, status, status_label, guest_count, comment, created_at)
      VALUES (${item.id}, ${item.name}, ${item.status}, ${item.statusLabel}, ${item.guestCount}, ${item.comment}, ${item.createdAt})
    `;

    return json(res, 201, { ok: true, item });
  } catch (error) {
    console.error(error);
    return json(res, 500, {
      message: 'Ошибка сохранения ответа. Проверьте переменную DATABASE_URL в Vercel.'
    });
  }
};
