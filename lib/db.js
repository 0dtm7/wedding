const { neon } = require('@neondatabase/serverless');

const STATUS_LABELS = {
  yes: 'Приду',
  plus_one: 'Приду с парой',
  no: 'Не смогу прийти'
};

let sqlClient;
let readyPromise;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }

  return sqlClient;
}

async function ensureStorage() {
  if (!readyPromise) {
    const sql = getSql();
    readyPromise = sql`
      CREATE TABLE IF NOT EXISTS rsvp_answers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        status_label TEXT NOT NULL,
        guest_count INTEGER NOT NULL DEFAULT 0,
        comment TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
  }

  return readyPromise;
}

function normalizeGuestCount(status, value) {
  if (status === 'no') return 0;
  const number = Number(value);
  if (!Number.isFinite(number)) return status === 'plus_one' ? 2 : 1;
  return Math.min(Math.max(Math.round(number), 1), 20);
}

function checkAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD || '2706';
  return typeof password === 'string' && password === expected;
}

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    statusLabel: row.status_label,
    guestCount: Number(row.guest_count || 0),
    comment: row.comment || '',
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  };
}

function buildSummary(items) {
  const attending = items.filter((item) => item.status !== 'no');
  const declined = items.filter((item) => item.status === 'no');

  return {
    totalAnswers: items.length,
    attendingAnswers: attending.length,
    declinedAnswers: declined.length,
    totalGuests: attending.reduce((sum, item) => sum + Number(item.guestCount || 0), 0)
  };
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

module.exports = {
  STATUS_LABELS,
  buildSummary,
  checkAdminPassword,
  ensureStorage,
  getSql,
  json,
  mapRow,
  normalizeGuestCount,
  readBody
};
