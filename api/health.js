const { ensureStorage, json } = require('../lib/db');

module.exports = async function handler(_req, res) {
  try {
    await ensureStorage();
    return json(res, 200, { ok: true, storage: 'neon-postgres' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { ok: false, message: 'DATABASE_URL is not configured or database is unavailable.' });
  }
};
