import { DayName } from "../types";

export const INDONESIAN_DAYS: DayName[] = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu"
];

/**
 * Normalizes any variation of Indonesian day name to standard DayName
 */
export function normalizeDayName(raw: string): DayName | null {
  if (!raw) return null;
  const clean = raw.trim().toLowerCase().replace(/'/g, "");
  if (clean.includes("senin")) return "Senin";
  if (clean.includes("selasa")) return "Selasa";
  if (clean.includes("rabu")) return "Rabu";
  if (clean.includes("kamis")) return "Kamis";
  if (clean.includes("jumat")) return "Jumat";
  if (clean.includes("sabtu")) return "Sabtu";
  if (clean.includes("minggu") || clean.includes("ahad")) return "Minggu";
  return null;
}

/**
 * Get Indonesian day name for a YYYY-MM-DD date string
 */
export function getDayFromDate(dateStr: string): DayName {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return INDONESIAN_DAYS[dt.getUTCDay()];
}

/**
 * Format YYYY-MM-DD into DD/MM/YYYY
 */
export function formatDateToIndonesian(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [y, m, d] = dateStr.split("-");
  return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
}

/**
 * Parse DD/MM/YYYY into YYYY-MM-DD
 */
export function parseIndonesianDate(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim();
  const match = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (!match) return null;
  const d = match[1].padStart(2, "0");
  const m = match[2].padStart(2, "0");
  const y = match[3];
  // Basic sanity check
  const numD = parseInt(d, 10);
  const numM = parseInt(m, 10);
  if (numD < 1 || numD > 31 || numM < 1 || numM > 12) return null;
  return `${y}-${m}-${d}`;
}

/**
 * Parse time string HH:MM, HH.MM, or H:MM into standardized HH:MM (24-hour)
 */
export function normalizeTimeString(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(".", ":");
  const parts = clean.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;

  // Support 24:00 (specifically hour 24 and minute 00)
  if (h === 24 && m === 0) {
    return "24:00";
  }

  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Intelligent blur formatter: converts "24", "16", "730", "1630", "2400", "8.00" into valid HH:MM
 */
export function formatTimeOnBlur(raw: string): string {
  if (!raw) return "";
  const clean = raw.trim().replace(".", ":");
  if (!clean) return "";

  // Check if standard normalization works directly
  const norm = normalizeTimeString(clean);
  if (norm) return norm;

  // If contains colon with single digit hour, e.g. "8:30"
  if (clean.includes(":")) {
    const parts = clean.split(":");
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m)) {
      if (h === 24 && m === 0) return "24:00";
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }
  }

  // Pure digits without colon
  const digitsOnly = clean.replace(/\D/g, "");
  if (digitsOnly.length === 1 || digitsOnly.length === 2) {
    const h = parseInt(digitsOnly, 10);
    if (h === 24) return "24:00";
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:00`;
  } else if (digitsOnly.length === 3) {
    const h = parseInt(digitsOnly.slice(0, 1), 10);
    const m = parseInt(digitsOnly.slice(1, 3), 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  } else if (digitsOnly.length === 4) {
    const h = parseInt(digitsOnly.slice(0, 2), 10);
    const m = parseInt(digitsOnly.slice(2, 4), 10);
    if (h === 24 && m === 0) return "24:00";
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  return clean;
}

/**
 * Calculates duration in minutes with midnight rollover (R5, R6)
 */
export function calculateDuration(startTime: string, finishTime: string): {
  durationMin: number;
  isMidnightRollover: boolean;
  isValid: boolean;
  error?: string;
} {
  const normStart = normalizeTimeString(startTime);
  const normFinish = normalizeTimeString(finishTime);

  if (!normStart || !normFinish) {
    return { durationMin: 0, isMidnightRollover: false, isValid: false, error: "Format jam tidak valid (00:00 - 24:00)" };
  }

  const [sh, sm] = normStart.split(":").map(Number);
  const [fh, fm] = normFinish.split(":").map(Number);

  // If start is 24:00, treat as 00:00 (minute 0)
  const startTotalMinutes = (sh === 24 ? 0 : sh) * 60 + sm;
  // If finish is 24:00, treat as minute 1440
  const finishTotalMinutes = (fh === 24 ? 24 : fh) * 60 + fm;

  if (finishTotalMinutes >= startTotalMinutes) {
    const diff = finishTotalMinutes - startTotalMinutes;
    return {
      durationMin: diff,
      isMidnightRollover: false,
      isValid: true
    };
  }

  // Finish is earlier than Start -> Midnight rollover
  const diffWithNextDay = (finishTotalMinutes + 1440) - startTotalMinutes;

  // Rule R6: valid if duration after adding 24h is <= 12 hours (720 min)
  if (diffWithNextDay <= 720) {
    return {
      durationMin: diffWithNextDay,
      isMidnightRollover: true,
      isValid: true
    };
  }

  return {
    durationMin: diffWithNextDay,
    isMidnightRollover: true,
    isValid: false,
    error: "Durasi lewat tengah malam melebihi 12 jam (indikasi salah ketik jam)"
  };
}

/**
 * Format minutes into readable duration string: e.g. "30 mnt" or "1 j 15 mnt"
 */
export function formatDurationHuman(minutes: number): string {
  if (minutes < 60) return `${minutes} mnt`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} jam` : `${h} j ${m} mnt`;
}

/**
 * Get current WIB (UTC+7) Date and Time
 */
export function getCurrentWIB(): {
  isoDate: string;
  dayName: DayName;
  timeStr: string;
  wibDateObj: Date;
} {
  const now = new Date();
  // Format in Asia/Jakarta timezone
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
  const dayName = getDayFromDate(isoDate);
  const timeStr = `${h.padStart(2, "0")}:${min.padStart(2, "0")}`;

  return {
    isoDate,
    dayName,
    timeStr,
    wibDateObj: new Date(`${isoDate}T${timeStr}:00+07:00`)
  };
}

/**
 * Adds specified minutes to an HH:MM time string and returns standardized HH:MM (24-hour)
 * Safely handles 24-hour midnight rollover (e.g. 23:45 + 30 min = 00:15)
 */
export function addMinutesToTime(timeStr: string, minutes: number): string {
  const norm = normalizeTimeString(timeStr);
  if (!norm) return "00:00";
  const [h, m] = norm.split(":").map(Number);
  const startMinutes = (h === 24 ? 0 : h) * 60 + m;
  const totalMinutes = startMinutes + minutes;

  // If addition lands exactly on midnight (1440 minutes, e.g. 23:00 + 1h or 16:00 + 8h)
  if (totalMinutes === 1440) {
    return "24:00";
  }

  const normalizedTotal = ((totalMinutes % 1440) + 1440) % 1440;
  const newH = Math.floor(normalizedTotal / 60);
  const newM = normalizedTotal % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/**
 * Shift Schedule DSM-Firmenich Utility:
 * - Shift 1 (Pagi): 07:30 - 16:30 (Reguler), 16:30 - 20:30 (Overtime)
 * - Shift 2 (Malam): 19:30 - 05:30 (Reguler), 05:30 - 08:30 (Overtime)
 */
export interface ActivityShiftBreakdown {
  shift: "SHIFT_1" | "SHIFT_2" | "OTHER";
  regular_min: number;
  overtime_min: number;
  total_min: number;
}

export function calculateActivityShiftBreakdown(startTime: string, finishTime: string): ActivityShiftBreakdown {
  const normStart = normalizeTimeString(startTime);
  const normFinish = normalizeTimeString(finishTime);
  if (!normStart || !normFinish) {
    return { shift: "OTHER", regular_min: 0, overtime_min: 0, total_min: 0 };
  }

  const [sh, sm] = normStart.split(":").map(Number);
  const [fh, fm] = normFinish.split(":").map(Number);

  const startMin = (sh === 24 ? 0 : sh) * 60 + sm;
  const finishMin = (fh === 24 ? 24 : fh) * 60 + fm;

  // Split into single-day interval(s)
  const intervals: Array<[number, number]> = [];
  if (finishMin >= startMin) {
    intervals.push([startMin, finishMin]);
  } else {
    // Crosses midnight
    intervals.push([startMin, 1440]);
    intervals.push([0, finishMin]);
  }

  const totalMin = intervals.reduce((acc, [a, b]) => acc + (b - a), 0);

  // Helper to calculate minutes overlap with [targetA, targetB]
  const calcOverlap = (tA: number, tB: number): number => {
    let overlap = 0;
    for (const [a, b] of intervals) {
      overlap += Math.max(0, Math.min(b, tB) - Math.max(a, tA));
    }
    return overlap;
  };

  // Determine primary shift based on start time
  // Shift 1 window: 07:30 (450) <= start < 19:30 (1170)
  // Shift 2 window: start >= 19:30 (1170) OR start < 07:30 (450)
  const isShift1 = startMin >= 450 && startMin < 1170;

  if (isShift1) {
    // Shift 1: Reguler = 07:30 - 16:30 [450, 990], OT = 16:30 - 20:30 [990, 1230]
    const reg = calcOverlap(450, 990);
    const ot = calcOverlap(990, 1230);
    const remainder = Math.max(0, totalMin - (reg + ot));
    return {
      shift: "SHIFT_1",
      regular_min: reg + (startMin < 990 ? remainder : 0),
      overtime_min: ot + (startMin >= 990 ? remainder : 0),
      total_min: totalMin
    };
  } else {
    // Shift 2: Reguler = 19:30 - 24:00 [1170, 1440] + 00:00 - 05:30 [0, 330]
    // OT = 05:30 - 08:30 [330, 510]
    const reg = calcOverlap(1170, 1440) + calcOverlap(0, 330);
    const ot = calcOverlap(330, 510);
    const remainder = Math.max(0, totalMin - (reg + ot));
    return {
      shift: "SHIFT_2",
      regular_min: reg + (startMin >= 1170 || startMin < 330 ? remainder : 0),
      overtime_min: ot + (startMin >= 330 && startMin < 510 ? remainder : 0),
      total_min: totalMin
    };
  }
}

