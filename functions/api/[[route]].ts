import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";

export type Bindings = {
  DB: D1Database;
  JWT_SECRET?: string;
};

export type Variables = {
  pid: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const DEFAULT_JWT_SECRET = "log_harian_pid_dev_secret_2026_wib_security";
const SESSION_COOKIE_NAME = "pid_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

let dbInitialized = false;
async function ensureTables(db: D1Database) {
  if (dbInitialized) return;
  try {
    await db.prepare("CREATE TABLE IF NOT EXISTS pids (pid TEXT PRIMARY KEY, display_name TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')))").run();
    await db.prepare("INSERT INTO pids (pid, display_name) VALUES ('AGSB', 'Agus Sobarna (AGSB)'), ('MUKB', 'Muhammad Dimas F A (MUKB)'), ('IKJA', 'Diki Jaelani (IKJA)'), ('AHIK', 'Ahmad Abdul Malik (AHIK)') ON CONFLICT(pid) DO UPDATE SET display_name = excluded.display_name").run();
    await db.prepare("CREATE TABLE IF NOT EXISTS import_batches (id TEXT PRIMARY KEY, pid TEXT NOT NULL, filename TEXT, rows_read INTEGER NOT NULL DEFAULT 0, rows_inserted INTEGER NOT NULL DEFAULT 0, rows_skipped INTEGER NOT NULL DEFAULT 0, rows_rejected INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, undone_at TEXT)").run();
    await db.prepare("CREATE TABLE IF NOT EXISTS activities (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL UNIQUE, pid TEXT NOT NULL, tanggal TEXT NOT NULL, hari TEXT NOT NULL, start_time TEXT NOT NULL, finish_time TEXT NOT NULL, duration_min INTEGER NOT NULL, kegiatan TEXT NOT NULL, kategori TEXT, keterangan TEXT, highlight INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'app', import_id TEXT, created_at TEXT NOT NULL, updated_at TEXT, edit_count INTEGER NOT NULL DEFAULT 0, deleted_at TEXT)").run();
    await db.prepare("CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, attempted_at TEXT NOT NULL, success INTEGER NOT NULL)").run();
    dbInitialized = true;
  } catch (err) {
    console.error("ensureTables error:", err);
  }
}

app.use("*", async (c, next) => {
  await ensureTables(c.env.DB);
  return next();
});

// Helper for Web Crypto HMAC token
async function signSessionToken(pid: string, secretStr: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secretStr),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const payload = JSON.stringify({ pid, exp: Date.now() + SESSION_MAX_AGE * 1000 });
  const payloadB64 = btoa(payload).replace(/=/g, "");
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "");
  return `${payloadB64}.${sigB64}`;
}

async function verifySessionToken(token: string, secretStr: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sigB64] = parts;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secretStr),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigStr = atob(sigB64);
    const sigBytes = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) sigBytes[i] = sigStr.charCodeAt(i);

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payloadB64));
    if (!isValid) return null;

    const payload = JSON.parse(atob(payloadB64));
    if (!payload || !payload.pid || Date.now() > payload.exp) return null;
    return payload.pid as string;
  } catch {
    return null;
  }
}

// Current WIB Time helper
function getWIBDetails() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  let y = "2026", m = "01", d = "01", h = "00", min = "00";
  for (const part of parts) {
    if (part.type === "year") y = part.value;
    if (part.type === "month") m = part.value;
    if (part.type === "day") d = part.value;
    if (part.type === "hour") h = part.value === "24" ? "00" : part.value;
    if (part.type === "minute") min = part.value;
  }

  const isoDate = `${y}-${m}-${d}`;
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0));
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;
  const dayName = dayNames[dt.getUTCDay()];
  const timeStr = `${h.padStart(2, "0")}:${min.padStart(2, "0")}`;

  return { isoDate, dayName, timeStr };
}

// Duration & midnight rollover calculation (R5, R6)
function calcDuration(start: string, finish: string): { duration: number; isMidnight: boolean; valid: boolean } {
  const [sh, sm] = start.split(":").map(Number);
  const [fh, fm] = finish.split(":").map(Number);
  const sTot = (sh === 24 ? 0 : sh) * 60 + sm;
  const fTot = (fh === 24 ? 24 : fh) * 60 + fm;

  if (fTot >= sTot) {
    return { duration: fTot - sTot, isMidnight: false, valid: true };
  }

  const diff = (fTot + 1440) - sTot;
  if (diff <= 720) {
    return { duration: diff, isMidnight: true, valid: true };
  }
  return { duration: diff, isMidnight: true, valid: false };
}

// --- Public Endpoints ---

// POST /api/login
app.post("/api/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const rawPid = body.pid;
  if (!rawPid || typeof rawPid !== "string") {
    return c.json({ error: "PID harus diisi." }, 400);
  }

  const pid = rawPid.trim().toUpperCase();
  const db = c.env.DB;
  const clientIp = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "127.0.0.1";

  // Brute-force rate limiting: 5 failed attempts in 10 minutes
  const recentFails = await db
    .prepare("SELECT COUNT(*) as cnt FROM login_attempts WHERE ip = ? AND success = 0 AND attempted_at > datetime('now', '-10 minutes')")
    .bind(clientIp)
    .first<{ cnt: number }>();

  if (recentFails && recentFails.cnt >= 5) {
    return c.json({ error: "Terlalu banyak percobaan login yang gagal. Silakan coba lagi dalam 10 menit." }, 429);
  }

  // Validate PID against pids table
  const pidRecord = await db
    .prepare("SELECT pid, display_name, is_active FROM pids WHERE pid = ?")
    .bind(pid)
    .first<{ pid: string; display_name: string; is_active: number }>();

  const nowIso = new Date().toISOString();

  if (!pidRecord || pidRecord.is_active !== 1) {
    await db
      .prepare("INSERT INTO login_attempts (ip, attempted_at, success) VALUES (?, ?, 0)")
      .bind(clientIp, nowIso)
      .run();
    return c.json({ error: "PID tidak terdaftar atau tidak aktif." }, 401);
  }

  // Record success
  await db
    .prepare("INSERT INTO login_attempts (ip, attempted_at, success) VALUES (?, ?, 1)")
    .bind(clientIp, nowIso)
    .run();

  const secret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const token = await signSessionToken(pid, secret);

  setCookie(c, SESSION_COOKIE_NAME, token, {
    path: "/",
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    secure: false,
    sameSite: "Lax"
  });

  return c.json({
    user: {
      pid: pidRecord.pid,
      display_name: pidRecord.display_name
    }
  });
});

// POST /api/logout
app.post("/api/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE_NAME, { path: "/" });
  return c.json({ ok: true });
});

// GET /api/me
app.get("/api/me", async (c) => {
  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) {
    return c.json({ user: null });
  }

  const secret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const pid = await verifySessionToken(token, secret);
  if (!pid) {
    return c.json({ user: null });
  }

  const db = c.env.DB;
  const pidRecord = await db
    .prepare("SELECT pid, display_name, is_active FROM pids WHERE pid = ?")
    .bind(pid)
    .first<{ pid: string; display_name: string; is_active: number }>();

  if (!pidRecord || pidRecord.is_active !== 1) {
    return c.json({ user: null });
  }

  return c.json({
    user: {
      pid: pidRecord.pid,
      display_name: pidRecord.display_name
    }
  });
});

// --- Auth Middleware for protected endpoints ---
app.use("/api/*", async (c, next) => {
  if (["/api/login", "/api/logout", "/api/me"].includes(c.req.path)) {
    return next();
  }

  const token = getCookie(c, SESSION_COOKIE_NAME);
  if (!token) {
    return c.json({ error: "Sesi tidak ditemukan. Silakan login kembali." }, 401);
  }

  const secret = c.env.JWT_SECRET || DEFAULT_JWT_SECRET;
  const pid = await verifySessionToken(token, secret);
  if (!pid) {
    return c.json({ error: "Sesi tidak valid atau telah kedaluwarsa." }, 401);
  }

  c.set("pid", pid);
  return next();
});
// GET /api/activities/defaults
app.get("/api/activities/defaults", async (c) => {
  const pid = c.get("pid");
  const db = c.env.DB;
  const wib = getWIBDetails();

  const lastEntry = await db
    .prepare("SELECT * FROM activities WHERE pid = ? AND deleted_at IS NULL ORDER BY tanggal DESC, id DESC LIMIT 1")
    .bind(pid)
    .first<any>();

  let isShiftDate = false;
  let shiftReason = "";
  let chosenTanggal = wib.isoDate;
  let chosenHari = wib.dayName;
  let defaultStart = "";

  if (lastEntry) {
    const lastDate = lastEntry.tanggal;
    const lastFinish = lastEntry.finish_time;

    const [ly, lm, ld] = lastDate.split("-").map(Number);
    const [lh, lmin] = lastFinish.split(":").map(Number);
    const lastUtcMs = Date.UTC(ly, lm - 1, ld, lh - 7, lmin, 0);

    const [cy, cm, cd] = wib.isoDate.split("-").map(Number);
    const [ch, cmin] = wib.timeStr.split(":").map(Number);
    const currentUtcMs = Date.UTC(cy, cm - 1, cd, ch - 7, cmin, 0);

    const diffMinutes = (currentUtcMs - lastUtcMs) / 60000;

    if (diffMinutes >= 0 && diffMinutes <= 720) {
      isShiftDate = true;
      shiftReason = "Mengikuti entri shift sebelumnya (selesai <= 12 jam lalu)";
      if (lastEntry.finish_time === "24:00") {
        const nextDt = new Date(Date.UTC(ly, lm - 1, ld + 1, 12, 0, 0));
        const ny = nextDt.getUTCFullYear();
        const nm = String(nextDt.getUTCMonth() + 1).padStart(2, "0");
        const nd = String(nextDt.getUTCDate()).padStart(2, "0");
        chosenTanggal = `${ny}-${nm}-${nd}`;
        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;
        chosenHari = dayNames[nextDt.getUTCDay()];
        defaultStart = "00:00";
      } else {
        chosenTanggal = lastEntry.tanggal;
        chosenHari = lastEntry.hari;
        defaultStart = lastEntry.finish_time;
      }
    }
  }

  return c.json({
    finish_time: wib.timeStr,
    calendar_tanggal: wib.isoDate,
    calendar_hari: wib.dayName,
    tanggal: chosenTanggal,
    hari: chosenHari,
    start_time: defaultStart,
    is_shift_date: isShiftDate,
    shift_date_reason: shiftReason,
    last_activity: lastEntry || null
  });
});

// GET /api/activities
app.get("/api/activities", async (c) => {
  const authPid = c.get("pid");
  const db = c.env.DB;
  const url = new URL(c.req.url);

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const kategori = url.searchParams.get("kategori");
  const q = url.searchParams.get("q");
  const before = url.searchParams.get("before");
  const targetPid = url.searchParams.get("pid");

  let query = "SELECT * FROM activities WHERE deleted_at IS NULL";
  const params: any[] = [];

  if (targetPid && targetPid.toUpperCase() === "ALL") {
    // all operators
  } else if (targetPid) {
    query += " AND pid = ?";
    params.push(targetPid.toUpperCase());
  } else {
    query += " AND pid = ?";
    params.push(authPid);
  }

  if (from) {
    query += " AND tanggal >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND tanggal <= ?";
    params.push(to);
  }
  if (kategori) {
    query += " AND lower(trim(kategori)) = lower(trim(?))";
    params.push(kategori);
  }
  if (q) {
    query += " AND (kegiatan LIKE ? OR keterangan LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  if (before) {
    query += " AND tanggal < ?";
    params.push(before);
  }

  query += " ORDER BY tanggal DESC, id ASC";

  const results = await db.prepare(query).bind(...params).all<any>();
  return c.json({ activities: results.results || [] });
});

// POST /api/activities
app.post("/api/activities", async (c) => {
  const pid = c.get("pid");
  const db = c.env.DB;
  const body = await c.req.json();

  const wib = getWIBDetails();

  const clientId = body.client_id || crypto.randomUUID();
  const kegiatan = (body.kegiatan || "").trim();
  if (!kegiatan) {
    return c.json({ error: "Kegiatan wajib diisi." }, 400);
  }
  if (kegiatan.length > 1000) {
    return c.json({ error: "Kegiatan maksimal 1000 karakter." }, 400);
  }

  const existing = await db
    .prepare("SELECT * FROM activities WHERE client_id = ?")
    .bind(clientId)
    .first<any>();
  if (existing) {
    return c.json({ activity: existing });
  }

  const tanggal = body.tanggal || wib.isoDate;
  const hari = body.hari || wib.dayName;
  const startTime = body.start_time;
  const finishTime = body.finish_time || wib.timeStr;

  if (!startTime) {
    return c.json({ error: "Jam mulai (Start) wajib diisi." }, 400);
  }

  const dur = calcDuration(startTime, finishTime);
  if (!dur.valid) {
    return c.json({ error: "Waktu selesai (Finish) lebih awal dari jam mulai dan melebihi batas 12 jam." }, 400);
  }

  const kategori = body.kategori ? body.kategori.trim() : null;
  const keterangan = body.keterangan ? body.keterangan.trim() : null;
  const highlight = body.highlight ? 1 : 0;
  const nowUtc = new Date().toISOString();

  const result = await db
    .prepare(
      "INSERT INTO activities (client_id, pid, tanggal, hari, start_time, finish_time, duration_min, kegiatan, kategori, keterangan, highlight, source, created_at, edit_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'app', ?, 0)"
    )
    .bind(
      clientId, pid, tanggal, hari, startTime, finishTime,
      dur.duration, kegiatan, kategori, keterangan, highlight, nowUtc
    )
    .run();

  const newId = result.meta.last_row_id;
  const inserted = await db
    .prepare("SELECT * FROM activities WHERE id = ?")
    .bind(newId)
    .first<any>();

  return c.json({ activity: inserted });
});

// PATCH /api/activities/:id
app.patch("/api/activities/:id", async (c) => {
  const pid = c.get("pid");
  const db = c.env.DB;
  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await db
    .prepare("SELECT * FROM activities WHERE id = ? AND pid = ? AND deleted_at IS NULL")
    .bind(id, pid)
    .first<any>();

  if (!existing) {
    return c.json({ error: "Catatan tidak ditemukan." }, 404);
  }

  const tanggal = body.tanggal ?? existing.tanggal;
  const hari = body.hari ?? existing.hari;
  const startTime = body.start_time ?? existing.start_time;
  const finishTime = body.finish_time ?? existing.finish_time;
  const kegiatan = (body.kegiatan ?? existing.kegiatan).trim();
  const kategori = body.kategori !== undefined ? (body.kategori ? body.kategori.trim() : null) : existing.kategori;
  const keterangan = body.keterangan !== undefined ? (body.keterangan ? body.keterangan.trim() : null) : existing.keterangan;
  const highlight = body.highlight !== undefined ? (body.highlight ? 1 : 0) : existing.highlight;

  if (!kegiatan) {
    return c.json({ error: "Kegiatan wajib diisi." }, 400);
  }

  const dur = calcDuration(startTime, finishTime);
  if (!dur.valid) {
    return c.json({ error: "Waktu selesai lebih awal dari jam mulai dan melebihi 12 jam." }, 400);
  }

  const nowUtc = new Date().toISOString();

  await db
    .prepare(
      "UPDATE activities SET tanggal = ?, hari = ?, start_time = ?, finish_time = ?, duration_min = ?, kegiatan = ?, kategori = ?, keterangan = ?, highlight = ?, updated_at = ?, edit_count = edit_count + 1 WHERE id = ? AND pid = ?"
    )
    .bind(
      tanggal, hari, startTime, finishTime,
      dur.duration, kegiatan, kategori, keterangan,
      highlight, nowUtc, id, pid
    )
    .run();

  const updated = await db
    .prepare("SELECT * FROM activities WHERE id = ?")
    .bind(id)
    .first<any>();

  return c.json({ activity: updated });
});

// DELETE /api/activities/:id
app.delete("/api/activities/:id", async (c) => {
  const pid = c.get("pid");
  const db = c.env.DB;
  const id = c.req.param("id");
  const nowUtc = new Date().toISOString();

  await db
    .prepare("UPDATE activities SET deleted_at = ? WHERE id = ? AND pid = ?")
    .bind(nowUtc, id, pid)
    .run();

  return c.json({ ok: true, id });
});

// POST /api/activities/:id/restore
app.post("/api/activities/:id/restore", async (c) => {
  const pid = c.get("pid");
  const db = c.env.DB;
  const id = c.req.param("id");

  await db
    .prepare("UPDATE activities SET deleted_at = NULL WHERE id = ? AND pid = ?")
    .bind(id, pid)
    .run();

  const restored = await db
    .prepare("SELECT * FROM activities WHERE id = ?")
    .bind(id)
    .first<any>();

  return c.json({ ok: true, activity: restored });
});

// GET /api/categories
app.get("/api/categories", async (c) => {
  const pid = c.get("pid");
  const db = c.env.DB;

  const res = await db
    .prepare("SELECT kategori, COUNT(*) as count FROM activities WHERE pid = ? AND deleted_at IS NULL AND kategori IS NOT NULL AND trim(kategori) != '' GROUP BY lower(trim(kategori)) ORDER BY count DESC")
    .bind(pid)
    .all<{ kategori: string; count: number }>();

  return c.json({ categories: res.results || [] });
});

// GET /api/export
app.get("/api/export", async (c) => {
  const authPid = c.get("pid");
  const db = c.env.DB;
  const url = new URL(c.req.url);

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "500", 10), 1000);
  const afterId = parseInt(url.searchParams.get("after") || "0", 10);
  const targetPid = url.searchParams.get("pid");

  let query = "SELECT * FROM activities WHERE deleted_at IS NULL";
  const params: any[] = [];

  if (targetPid && targetPid.toUpperCase() === "ALL") {
    // all operators
  } else if (targetPid) {
    query += " AND pid = ?";
    params.push(targetPid.toUpperCase());
  } else {
    query += " AND pid = ?";
    params.push(authPid);
  }

  if (from) {
    query += " AND tanggal >= ?";
    params.push(from);
  }
  if (to) {
    query += " AND tanggal <= ?";
    params.push(to);
  }
  if (afterId > 0) {
    query += " AND id > ?";
    params.push(afterId);
  }

  query += " ORDER BY tanggal ASC, id ASC LIMIT ?";
  params.push(limit + 1);

  const res = await db.prepare(query).bind(...params).all<any>();
  const rows = res.results || [];
  const hasMore = rows.length > limit;
  if (hasMore) rows.pop();

  return c.json({ activities: rows, has_more: hasMore });
});

// GET /api/dashboard/stats
app.get("/api/dashboard/stats", async (c) => {
  const authPid = c.get("pid");
  const db = c.env.DB;
  const url = new URL(c.req.url);

  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const targetPid = url.searchParams.get("pid");

  let baseWhere = "deleted_at IS NULL";
  const baseParams: any[] = [];

  if (targetPid && targetPid.toUpperCase() === "ALL") {
    // all operators
  } else if (targetPid) {
    baseWhere += " AND pid = ?";
    baseParams.push(targetPid.toUpperCase());
  } else {
    baseWhere += " AND pid = ?";
    baseParams.push(authPid);
  }

  if (from) {
    baseWhere += " AND tanggal >= ?";
    baseParams.push(from);
  }
  if (to) {
    baseWhere += " AND tanggal <= ?";
    baseParams.push(to);
  }

  // 1. KPI Summary
  const kpiRes = await db
    .prepare(
      `SELECT 
        COUNT(*) as total_activities, 
        COALESCE(SUM(duration_min), 0) as total_duration_min, 
        COALESCE(SUM(CASE WHEN highlight = 1 THEN 1 ELSE 0 END), 0) as highlight_count,
        COUNT(DISTINCT tanggal) as unique_days
      FROM activities WHERE ${baseWhere}`
    )
    .bind(...baseParams)
    .first<any>();

  // 2. Category Distribution
  const catRes = await db
    .prepare(
      `SELECT 
        COALESCE(NULLIF(trim(kategori), ''), 'Tanpa Kategori') as kategori, 
        COUNT(*) as count, 
        COALESCE(SUM(duration_min), 0) as duration_min 
      FROM activities 
      WHERE ${baseWhere} 
      GROUP BY COALESCE(NULLIF(trim(kategori), ''), 'Tanpa Kategori') 
      ORDER BY duration_min DESC`
    )
    .bind(...baseParams)
    .all<any>();

  // 3. Daily Trend
  const dailyRes = await db
    .prepare(
      `SELECT 
        tanggal, 
        hari, 
        COALESCE(SUM(duration_min), 0) as duration_min, 
        COUNT(*) as count, 
        COALESCE(SUM(CASE WHEN highlight = 1 THEN 1 ELSE 0 END), 0) as highlight_count 
      FROM activities 
      WHERE ${baseWhere} 
      GROUP BY tanggal 
      ORDER BY tanggal ASC`
    )
    .bind(...baseParams)
    .all<any>();

  // 4. Top 5 Longest Activities
  const topLongestRes = await db
    .prepare(
      `SELECT 
        kegiatan, 
        kategori, 
        COALESCE(SUM(duration_min), 0) as total_duration_min, 
        COUNT(*) as count 
      FROM activities 
      WHERE ${baseWhere} 
      GROUP BY lower(trim(kegiatan)) 
      ORDER BY total_duration_min DESC 
      LIMIT 5`
    )
    .bind(...baseParams)
    .all<any>();

  // 5. Top 5 Most Frequent Activities
  const topFrequentRes = await db
    .prepare(
      `SELECT 
        kegiatan, 
        kategori, 
        COUNT(*) as count, 
        COALESCE(SUM(duration_min), 0) as total_duration_min 
      FROM activities 
      WHERE ${baseWhere} 
      GROUP BY lower(trim(kegiatan)) 
      ORDER BY count DESC, total_duration_min DESC 
      LIMIT 5`
    )
    .bind(...baseParams)
    .all<any>();

  // 6. Operator Stats
  const operatorRes = await db
    .prepare(
      `SELECT 
        a.pid, 
        COALESCE(p.display_name, a.pid) as display_name,
        COUNT(*) as total_activities, 
        COALESCE(SUM(a.duration_min), 0) as total_duration_min,
        COALESCE(SUM(CASE WHEN a.highlight = 1 THEN 1 ELSE 0 END), 0) as highlight_count
      FROM activities a
      LEFT JOIN pids p ON a.pid = p.pid
      WHERE ${baseWhere}
      GROUP BY a.pid
      ORDER BY total_duration_min DESC`
    )
    .bind(...baseParams)
    .all<any>();

  // 7. Recent Highlights in range
  const highlightsRes = await db
    .prepare(
      `SELECT id, pid, tanggal, hari, start_time, finish_time, duration_min, kegiatan, kategori, keterangan
      FROM activities
      WHERE ${baseWhere} AND highlight = 1
      ORDER BY tanggal DESC, id DESC
      LIMIT 10`
    )
    .bind(...baseParams)
    .all<any>();

  return c.json({
    kpi: {
      total_activities: kpiRes?.total_activities || 0,
      total_duration_min: kpiRes?.total_duration_min || 0,
      highlight_count: kpiRes?.highlight_count || 0,
      unique_days: kpiRes?.unique_days || 0
    },
    categories: catRes.results || [],
    daily_trends: dailyRes.results || [],
    top_longest: topLongestRes.results || [],
    top_frequent: topFrequentRes.results || [],
    operator_stats: operatorRes.results || [],
    highlights: highlightsRes.results || []
  });
});

// POST /api/import/commit
app.post("/api/import/commit", async (c) => {
  const pid = c.get("pid");
  const db = c.env.DB;
  const body = await c.req.json();

  const batchId = body.batch_id || crypto.randomUUID();
  const filename = body.filename || "import.xlsx";
  const rows: any[] = body.rows || [];

  if (rows.length === 0) {
    return c.json({ error: "Tidak ada baris data untuk diimpor." }, 400);
  }

  const nowIso = new Date().toISOString();
  await db
    .prepare("INSERT OR IGNORE INTO import_batches (id, pid, filename, created_at) VALUES (?, ?, ?, ?)")
    .bind(batchId, pid, filename, nowIso)
    .run();

  let insertedCount = 0;
  let skippedCount = 0;

  const statements: D1PreparedStatement[] = [];

  for (const r of rows) {
    if (r.status === "rejected" || r.status === "skipped") {
      continue;
    }

    const clientId = r.client_id || crypto.randomUUID();
    const highlight = r.highlight ? 1 : 0;
    const dur = r.duration_min ?? 0;

    statements.push(
      db.prepare(
        "INSERT OR IGNORE INTO activities (client_id, pid, tanggal, hari, start_time, finish_time, duration_min, kegiatan, kategori, keterangan, highlight, source, import_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'import', ?, ?)"
      ).bind(
        clientId, pid, r.tanggal, r.hari, r.start_time, r.finish_time,
        dur, r.kegiatan, r.kategori || null, r.keterangan || null, highlight,
        batchId, nowIso
      )
    );
  }

  if (statements.length > 0) {
    const results = await db.batch(statements);
    for (const res of results) {
      if (res.meta && res.meta.changes > 0) {
        insertedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  await db
    .prepare("UPDATE import_batches SET rows_inserted = rows_inserted + ?, rows_skipped = rows_skipped + ?, rows_read = rows_read + ? WHERE id = ? AND pid = ?")
    .bind(insertedCount, skippedCount, rows.length, batchId, pid)
    .run();

  return c.json({
    batch_id: batchId,
    inserted_count: insertedCount,
    skipped_count: skippedCount
  });
});

// POST /api/import/undo
app.post("/api/import/undo", async (c) => {
  const pid = c.get("pid");
  const db = c.env.DB;
  const body = await c.req.json();
  const batchId = body.batch_id;

  if (!batchId) {
    return c.json({ error: "batch_id wajib disertakan." }, 400);
  }

  const nowIso = new Date().toISOString();

  await db
    .prepare("UPDATE activities SET deleted_at = ? WHERE import_id = ? AND pid = ?")
    .bind(nowIso, batchId, pid)
    .run();

  await db
    .prepare("UPDATE import_batches SET undone_at = ? WHERE id = ? AND pid = ?")
    .bind(nowIso, batchId, pid)
    .run();

  return c.json({ ok: true, batch_id: batchId });
});

// GET /api/import/batches
app.get("/api/import/batches", async (c) => {
  const pid = c.get("pid");
  const db = c.env.DB;

  const res = await db
    .prepare("SELECT * FROM import_batches WHERE pid = ? ORDER BY created_at DESC LIMIT 20")
    .bind(pid)
    .all<any>();

  return c.json({ batches: res.results || [] });
});

export const onRequest: PagesFunction<Bindings> = async (context) => {
  return app.fetch(context.request, context.env, context);
};

export default app;