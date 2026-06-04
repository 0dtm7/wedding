const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '2706';
const USE_POSTGRES = Boolean(process.env.DATABASE_URL);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const RSVP_FILE = path.join(DATA_DIR, 'rsvp.json');

let pool = null;

const STATUS_LABELS = {
  yes: 'Приду',
  plus_one: 'Приду с парой',
  no: 'Не смогу прийти'
};

app.use(express.json({ limit: '80kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

function getPgPool() {
  if (!USE_POSTGRES) return null;
  if (pool) return pool;

  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
  return pool;
}

async function ensureJsonStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(RSVP_FILE);
  } catch {
    await fs.writeFile(RSVP_FILE, '[]', 'utf8');
  }
}

async function ensurePostgresStorage() {
  const db = getPgPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS rsvp_answers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      status_label TEXT NOT NULL,
      guest_count INTEGER NOT NULL DEFAULT 0,
      comment TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureStorage() {
  if (USE_POSTGRES) {
    await ensurePostgresStorage();
    return;
  }
  await ensureJsonStorage();
}

function mapDbRow(row) {
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

async function readRsvp() {
  await ensureStorage();

  if (USE_POSTGRES) {
    const db = getPgPool();
    const result = await db.query('SELECT * FROM rsvp_answers ORDER BY created_at DESC');
    return result.rows.map(mapDbRow);
  }

  const raw = await fs.readFile(RSVP_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function addRsvp(item) {
  await ensureStorage();

  if (USE_POSTGRES) {
    const db = getPgPool();
    await db.query(
      `INSERT INTO rsvp_answers (id, name, status, status_label, guest_count, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [item.id, item.name, item.status, item.statusLabel, item.guestCount, item.comment, item.createdAt]
    );
    return;
  }

  const items = await readRsvp();
  items.push(item);
  await fs.writeFile(RSVP_FILE, JSON.stringify(items, null, 2), 'utf8');
}

async function deleteRsvp(id) {
  await ensureStorage();

  if (USE_POSTGRES) {
    const db = getPgPool();
    const result = await db.query('DELETE FROM rsvp_answers WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  const items = await readRsvp();
  const nextItems = items.filter((item) => item.id !== id);
  if (nextItems.length === items.length) return false;
  await fs.writeFile(RSVP_FILE, JSON.stringify(nextItems, null, 2), 'utf8');
  return true;
}

function normalizeGuestCount(status, value) {
  if (status === 'no') return 0;
  const number = Number(value);
  if (!Number.isFinite(number)) return status === 'plus_one' ? 2 : 1;
  return Math.min(Math.max(Math.round(number), 1), 20);
}

function checkAdminPassword(password) {
  return typeof password === 'string' && password === ADMIN_PASSWORD;
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

app.post('/api/rsvp', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 80);
    const status = String(req.body.status || '').trim();
    const comment = String(req.body.comment || '').trim().slice(0, 800);

    if (!name) {
      return res.status(400).json({ message: 'Укажите имя гостя.' });
    }

    if (!STATUS_LABELS[status]) {
      return res.status(400).json({ message: 'Выберите корректный вариант ответа.' });
    }

    const guestCount = normalizeGuestCount(status, req.body.guestCount);
    const item = {
      id: crypto.randomUUID(),
      name,
      status,
      statusLabel: STATUS_LABELS[status],
      guestCount,
      comment,
      createdAt: new Date().toISOString()
    };

    await addRsvp(item);
    res.status(201).json({ ok: true, item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сохранения ответа.' });
  }
});

app.post('/api/admin/rsvp', async (req, res) => {
  try {
    if (!checkAdminPassword(req.body.password)) {
      return res.status(401).json({ message: 'Неверный пароль администратора.' });
    }

    const items = await readRsvp();
    const sortedItems = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ ok: true, summary: buildSummary(items), items: sortedItems });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось загрузить список гостей.' });
  }
});

app.delete('/api/admin/rsvp/:id', async (req, res) => {
  try {
    if (!checkAdminPassword(req.body.password)) {
      return res.status(401).json({ message: 'Неверный пароль администратора.' });
    }

    const deleted = await deleteRsvp(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Ответ не найден.' });
    }

    const items = await readRsvp();
    res.json({ ok: true, summary: buildSummary(items) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Не удалось удалить ответ.' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, storage: USE_POSTGRES ? 'postgres' : 'json' });
});

ensureStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`Wedding invitation running: http://localhost:${PORT}`);
    console.log(`Admin page: http://localhost:${PORT}/admin.html`);
    console.log(`Storage: ${USE_POSTGRES ? 'PostgreSQL' : RSVP_FILE}`);
  });
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
