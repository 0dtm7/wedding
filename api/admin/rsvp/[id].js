const {
  buildSummary,
  checkAdminPassword,
  ensureStorage,
  getSql,
  json,
  mapRow,
  readBody
} = require('../../../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return json(res, 405, { message: 'Метод не поддерживается.' });
  }

  try {
    const body = await readBody(req);

    if (!checkAdminPassword(body.password)) {
      return json(res, 401, { message: 'Неверный пароль администратора.' });
    }

    const id = String(req.query.id || '').trim();
    if (!id) {
      return json(res, 400, { message: 'Не указан ID ответа.' });
    }

    await ensureStorage();
    const sql = getSql();
    const deletedRows = await sql`DELETE FROM rsvp_answers WHERE id = ${id} RETURNING id`;

    if (!deletedRows.length) {
      return json(res, 404, { message: 'Ответ не найден.' });
    }

    const rows = await sql`SELECT * FROM rsvp_answers ORDER BY created_at DESC`;
    const items = rows.map(mapRow);

    return json(res, 200, { ok: true, summary: buildSummary(items) });
  } catch (error) {
    console.error(error);
    return json(res, 500, { message: 'Не удалось удалить ответ.' });
  }
};
