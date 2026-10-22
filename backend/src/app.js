import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DB_PATH = path.join(__dirname, 'banco.db');
const PORT = Number(process.env.PORT) || 3000;

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(FRONTEND_DIR));

const imageTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif']
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOADS_DIR),
  filename: (_req, file, callback) => {
    const extension = imageTypes.get(file.mimetype);
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!imageTypes.has(file.mimetype)) {
      return callback(new Error('Formato de imagem inválido. Use JPG, PNG, WEBP ou GIF.'));
    }
    callback(null, true);
  }
});

let db;

async function initializeDatabase() {
  db = await open({ filename: DB_PATH, driver: sqlite3.Database });
  await db.exec('PRAGMA foreign_keys = ON;');

  const currentTable = await db.get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'eventos'"
  );

  if (currentTable) {
    const columns = await db.all('PRAGMA table_info(eventos)');
    const names = columns.map(column => column.name);
    const required = ['id', 'title', 'date', 'start', 'end', 'location', 'park', 'category', 'description', 'image', 'featured'];

    if (!required.every(name => names.includes(name))) {
      const legacyTable = await db.get(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'eventos_legacy'"
      );
      if (!legacyTable) {
        await db.exec('ALTER TABLE eventos RENAME TO eventos_legacy');
      } else {
        let suffix = 2;
        let alternateName = `eventos_legacy_${suffix}`;
        while (await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", alternateName)) {
          suffix += 1;
          alternateName = `eventos_legacy_${suffix}`;
        }
        await db.exec(`ALTER TABLE eventos RENAME TO ${alternateName}`);
      }
    }
  }

  await db.exec(`
    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL DEFAULT '',
      start TEXT NOT NULL DEFAULT '',
      "end" TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      park TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const legacyMigration = await db.get('SELECT version FROM schema_migrations WHERE version = ?', 'legacy-events-v1');
  if (!legacyMigration) {
    const legacyTables = await db.all("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'eventos_legacy%' ORDER BY name");
    for (const legacy of legacyTables) {
      const legacyColumns = (await db.all(`PRAGMA table_info(${legacy.name})`)).map(column => column.name);
      if (legacyColumns.includes('title')) {
        const legacyRows = await db.all(`SELECT * FROM ${legacy.name}`);
        for (const row of legacyRows) {
          const rawDate = String(row.date || '').trim();
          const dates = rawDate.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/g) || [];
          const toIso = value => {
            if (!value) return '';
            if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
            const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            return match ? `${match[3]}-${String(match[2]).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}` : '';
          };
          const start = String(row.start || toIso(dates[0] || '')).trim();
          const end = String(row.end || toIso(dates[1] || '')).trim();
          await db.run(
            `INSERT OR IGNORE INTO eventos
              (id, title, date, start, "end", location, park, category, description, image, featured)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            row.id || null, textValue(row.title), rawDate, start, end,
            textValue(row.location), textValue(row.park), textValue(row.category),
            textValue(row.description), textValue(row.image),
            row.featured === true || row.featured === 1 || row.featured === 'true' || row.featured === '1' ? 1 : 0
          );
        }
      }
    }
    await db.run('INSERT INTO schema_migrations (version) VALUES (?)', 'legacy-events-v1');
  }
}

function textValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateEvent(body) {
  if (!textValue(body.title)) return 'O título do evento é obrigatório.';
  if (!textValue(body.start)) return 'A data de início é obrigatória.';
  if (body.end && textValue(body.end) < textValue(body.start)) {
    return 'A data de término não pode ser anterior à data de início.';
  }
  return null;
}

function isUploadedImage(image) {
  return typeof image === 'string' && image.startsWith('/uploads/');
}

async function removeUploadedImageIfUnused(image) {
  if (!isUploadedImage(image)) return;
  const used = await db.get('SELECT COUNT(*) AS total FROM eventos WHERE image = ?', image);
  if (used.total > 0) return;
  const filename = path.basename(image);
  const filePath = path.join(UPLOADS_DIR, filename);
  if (path.dirname(filePath) !== UPLOADS_DIR) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(error);
  }
}

function eventValues(body, image) {
  const start = textValue(body.start);
  const end = textValue(body.end);
  const displayDate = textValue(body.date) || start;
  return [
    textValue(body.title), displayDate, start, end,
    textValue(body.location), textValue(body.park), textValue(body.category),
    textValue(body.description), image, body.featured === 'true' || body.featured === true || body.featured === '1' || body.featured === 1 ? 1 : 0
  ];
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: 'SQLite3' });
});

app.get('/api/events', async (_req, res, next) => {
  try {
    const events = await db.all('SELECT * FROM eventos ORDER BY start ASC, id DESC');
    res.json(events.map(event => ({ ...event, featured: Boolean(event.featured) })));
  } catch (error) {
    next(error);
  }
});

app.get('/api/events/:id', async (req, res, next) => {
  try {
    const event = await db.get('SELECT * FROM eventos WHERE id = ?', Number(req.params.id));
    if (!event) return res.status(404).json({ error: 'Evento não encontrado.' });
    res.json({ ...event, featured: Boolean(event.featured) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/events', upload.single('imageFile'), async (req, res, next) => {
  try {
    const validationError = validateEvent(req.body);
    if (validationError) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: validationError });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : textValue(req.body.image);
    const values = eventValues(req.body, image);
    const result = await db.run(
      `INSERT INTO eventos
        (title, date, start, "end", location, park, category, description, image, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...values
    );
    const created = await db.get('SELECT * FROM eventos WHERE id = ?', result.lastID);
    res.status(201).json({ ...created, featured: Boolean(created.featured) });
  } catch (error) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    next(error);
  }
});

app.put('/api/events/:id', upload.single('imageFile'), async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'Identificador de evento inválido.' });
    }

    const current = await db.get('SELECT * FROM eventos WHERE id = ?', id);
    if (!current) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    const validationError = validateEvent(req.body);
    if (validationError) {
      if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: validationError });
    }

    let image = current.image;
    if (req.file) image = `/uploads/${req.file.filename}`;
    else if (req.body.removeImage === 'true') image = '';
    else if (typeof req.body.image === 'string') image = textValue(req.body.image);

    const values = eventValues(req.body, image);
    await db.run(
      `UPDATE eventos SET
        title = ?, date = ?, start = ?, "end" = ?, location = ?, park = ?, category = ?,
        description = ?, image = ?, featured = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      ...values, id
    );

    if (current.image && current.image !== image) await removeUploadedImageIfUnused(current.image);
    const updated = await db.get('SELECT * FROM eventos WHERE id = ?', id);
    res.json({ ...updated, featured: Boolean(updated.featured) });
  } catch (error) {
    if (req.file) await fs.promises.unlink(req.file.path).catch(() => {});
    next(error);
  }
});

app.delete('/api/events/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador de evento inválido.' });
    const current = await db.get('SELECT * FROM eventos WHERE id = ?', id);
    if (!current) return res.status(404).json({ error: 'Evento não encontrado.' });
    await db.run('DELETE FROM eventos WHERE id = ?', id);
    await removeUploadedImageIfUnused(current.image);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'A imagem deve ter no máximo 5 MB.'
      : 'Não foi possível receber o arquivo enviado.';
    return res.status(400).json({ error: message });
  }
  if (error.message && error.message.startsWith('Formato de imagem inválido')) {
    return res.status(400).json({ error: error.message });
  }
  console.error(error);
  res.status(500).json({ error: 'Ocorreu um erro interno ao processar a solicitação.' });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Servidor iniciado em http://localhost:${PORT}`));
  })
  .catch(error => {
    console.error('Não foi possível iniciar o banco de dados:', error);
    process.exitCode = 1;
  });
