-- Migrasi Awal: Tabel pids, import_batches, activities, login_attempts

CREATE TABLE IF NOT EXISTS pids (
  pid          TEXT PRIMARY KEY,
  display_name TEXT,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT OR IGNORE INTO pids (pid, display_name) VALUES 
  ('AGSB', 'Agus Sobarna (AGSB)'),
  ('MUKB', 'M. Ulin Nuha (MUKB)'),
  ('IKJA', 'Iksan Jaelani (IKJA)'),
  ('AHIK', 'Ahmad Hikmat (AHIK)');

CREATE TABLE IF NOT EXISTS import_batches (
  id            TEXT PRIMARY KEY,
  pid           TEXT NOT NULL REFERENCES pids(pid),
  filename      TEXT,
  rows_read     INTEGER NOT NULL DEFAULT 0,
  rows_inserted INTEGER NOT NULL DEFAULT 0,
  rows_skipped  INTEGER NOT NULL DEFAULT 0,
  rows_rejected INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  undone_at     TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id    TEXT NOT NULL UNIQUE,
  pid          TEXT NOT NULL REFERENCES pids(pid),
  tanggal      TEXT NOT NULL,
  hari         TEXT NOT NULL CHECK (hari IN ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')),
  start_time   TEXT NOT NULL CHECK (start_time  GLOB '[0-2][0-9]:[0-5][0-9]'),
  finish_time  TEXT NOT NULL CHECK (finish_time GLOB '[0-2][0-9]:[0-5][0-9]'),
  duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 0 AND 1439),
  kegiatan     TEXT NOT NULL CHECK (length(kegiatan) BETWEEN 1 AND 1000),
  kategori     TEXT CHECK (kategori IS NULL OR length(kategori) <= 100),
  keterangan   TEXT CHECK (keterangan IS NULL OR length(keterangan) <= 1000),
  highlight    INTEGER NOT NULL DEFAULT 0,
  source       TEXT NOT NULL DEFAULT 'app' CHECK (source IN ('app','import')),
  import_id    TEXT REFERENCES import_batches(id),
  created_at   TEXT NOT NULL,
  updated_at   TEXT,
  edit_count   INTEGER NOT NULL DEFAULT 0,
  deleted_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_activities_pid_tanggal
  ON activities (pid, tanggal DESC, id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS login_attempts (
  ip           TEXT NOT NULL,
  attempted_at TEXT NOT NULL,
  success      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts (ip, attempted_at);
