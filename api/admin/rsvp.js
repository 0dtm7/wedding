const {
  buildSummary,
  checkAdminPassword,
  ensureStorage,
  getSql,
  json,
  mapRow,
  readBody
} = require('../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { message: 'Метод не поддерживается.' });
  }

  try {
    const body = await readBody(req);

    if (!checkAdminPassword(body.password)) {
      return json(res, 401, { message: 'Неверный пароль администратора.' });
    }

    await ensureStorage();
    const sql = getSql();
    const rows = await sql`SELECT * FROM rsvp_answers ORDER BY created_at DESC`;
    const items = rows.map(mapRow);

    return json(res, 200, {
      ok: true,
      summary: buildSummary(items),
      items
    });
  } catch (error) {
    console.error(error);
    return json(res, 500, {
      message: 'Не удалось загрузить список гостей. Проверьте DATABASE_URL в Vercel.'
    });
  }
};
