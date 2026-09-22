import ExcelJS from "exceljs";
import { ParsedImportRow, ImportPreviewSummary, ImportRowStatus, DayName } from "../types";
import {
  getDayFromDate,
  normalizeDayName,
  normalizeTimeString,
  parseIndonesianDate,
  calculateDuration
} from "./time-utils";

function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) matrix[0][j] = j;

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

function parseExcelDate(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null;

  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, "0");
    const d = String(val.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof val === "number") {
    // Excel serial number (1900 system)
    // Excel erroneously treats 1900 as leap year
    const utcDays = Math.floor(val - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof val === "string") {
    const clean = val.trim();
    if (clean.includes("-") && clean.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return clean;
    }
    return parseIndonesianDate(clean);
  }

  return null;
}

function parseExcelTime(cell: ExcelJS.Cell): string | null {
  let val: unknown = cell.value;
  if (cell.type === ExcelJS.ValueType.Formula) {
    val = cell.result;
  }

  if (val === null || val === undefined || val === "") return null;

  if (val instanceof Date) {
    const h = String(val.getUTCHours()).padStart(2, "0");
    const m = String(val.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }

  if (typeof val === "number") {
    // Fraction of a day: val * 24 = hours
    const totalMinutes = Math.round(val * 1440) % 1440;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  if (typeof val === "string") {
    return normalizeTimeString(val);
  }

  return null;
}

function isYellowHighlight(cell: ExcelJS.Cell): boolean {
  if (!cell.fill || cell.fill.type !== "pattern") return false;
  const fg = cell.fill.fgColor;
  if (!fg) return false;
  if (fg.argb) {
    const hex = fg.argb.toUpperCase();
    return hex === "FFFFFF00" || hex === "FFFF00" || hex.endsWith("FFFF00");
  }
  return false;
}

export async function parseExcelLogFile(
  fileBuffer: ArrayBuffer,
  currentPid: string,
  existingActivities: Array<{ tanggal: string; start_time: string; finish_time: string; kegiatan: string }> = []
): Promise<ImportPreviewSummary> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  // Find sheet matching current PID or fallback to only sheet
  let worksheet = workbook.getWorksheet(currentPid);
  if (!worksheet) {
    const sheets = workbook.worksheets;
    const matchingSheet = sheets.find(s => s.name.trim().toUpperCase() === currentPid.toUpperCase());
    if (matchingSheet) {
      worksheet = matchingSheet;
    } else if (sheets.length === 1) {
      worksheet = sheets[0];
    } else {
      throw new Error(`Sheet untuk PID "${currentPid}" tidak ditemukan dalam file. Sheet yang ada: ${sheets.map(s => s.name).join(", ")}`);
    }
  }

  const sheetName = worksheet.name;
  const rows: ParsedImportRow[] = [];
  const categoriesSeen = new Set<string>();

  // Map duplicate lookup
  const duplicateSet = new Set<string>();
  existingActivities.forEach(a => {
    duplicateSet.add(`${a.tanggal}|${a.start_time}|${a.finish_time}|${a.kegiatan.trim().toLowerCase()}`);
  });

  // Track file-internal duplicates as well
  const fileSeenSet = new Set<string>();

  let totalRead = 0;
  let readyCount = 0;
  let warningCount = 0;
  let duplicateCount = 0;
  let rejectedCount = 0;
  let skippedCount = 0;

  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    totalRead++;

    const getCell = (colIdx: number) => row.getCell(colIdx);
    const cellValStr = (colIdx: number) => {
      const c = getCell(colIdx);
      if (c.value === null || c.value === undefined) return "";
      if (typeof c.value === "object" && "text" in (c.value as any)) return (c.value as any).text.trim();
      return String(c.value).trim();
    };

    const firstCellVal = cellValStr(1).toUpperCase();
    const secondCellVal = cellValStr(2).toUpperCase();

    // Check if header row or title row (e.g. "WEEK 1 SHIFT 1", "TANGGAL", "START", etc.)
    if (
      firstCellVal.includes("WEEK") ||
      firstCellVal.includes("SHIFT") ||
      firstCellVal === "TANGGAL" ||
      cellValStr(3).toUpperCase() === "START" ||
      firstCellVal.includes("PENCATATAN")
    ) {
      skippedCount++;
      return;
    }

    // Check if entire row is empty
    const rawKegiatan = cellValStr(7);
    const rawTanggal = getCell(1).value;
    const rawStart = getCell(3);
    const rawFinish = getCell(4);

    if (!rawTanggal && !rawKegiatan && !rawStart.value && !rawFinish.value) {
      skippedCount++;
      return;
    }

    // Header found on row 2/3?
    if (secondCellVal === "HARI" || cellValStr(6).toUpperCase() === "MAN POWER") {
      skippedCount++;
      return;
    }

    const issues: string[] = [];
    let status: ImportRowStatus = "ready";

    // 1. Tanggal
    const tanggal = parseExcelDate(rawTanggal);
    if (!tanggal) {
      issues.push("Tanggal tidak dapat dibaca / format salah");
      status = "rejected";
    }

    // 2. Hari
    const rawHari = cellValStr(2);
    let hari: DayName = "Senin";
    if (tanggal) {
      const calculatedHari = getDayFromDate(tanggal);
      const normalizedHari = normalizeDayName(rawHari);
      if (normalizedHari) {
        hari = normalizedHari;
        if (normalizedHari !== calculatedHari) {
          issues.push(`Hari "${normalizedHari}" berbeda dari kalender "${calculatedHari}" (kebiasaan shift)`);
          if (status !== "rejected") status = "warning";
        }
      } else {
        hari = calculatedHari;
      }
    }

    // 3. Start & Finish
    const startTime = parseExcelTime(getCell(3));
    const finishTime = parseExcelTime(getCell(4));

    if (!startTime || !finishTime) {
      issues.push("Start atau Finish tidak terbaca atau kosong");
      status = "rejected";
    }

    let durationMin = 0;
    if (startTime && finishTime) {
      const durResult = calculateDuration(startTime, finishTime);
      durationMin = durResult.durationMin;
      if (!durResult.isValid) {
        issues.push(durResult.error || "Waktu Finish lebih awal dari Start dan tidak memenuhi aturan lintas tengah malam (<= 12 jam)");
        status = "rejected";
      } else if (durResult.isMidnightRollover) {
        issues.push("Kegiatan melewati tengah malam (+1 hari)");
        if (status !== "rejected") status = "warning";
      }
    }

    // 4. Man Power
    let manPower = cellValStr(6).toUpperCase();
    if (!manPower) {
      manPower = currentPid;
    } else if (manPower !== currentPid.toUpperCase()) {
      issues.push(`Man Power "${manPower}" berbeda dari PID login "${currentPid}"`);
      status = "rejected";
    }

    // 5. Kegiatan
    let kegiatan = rawKegiatan.replace(/\s+/g, " ").trim();
    if (!kegiatan) {
      if (!startTime && !finishTime) {
        // Just empty row with date
        skippedCount++;
        return;
      }
      issues.push("Kegiatan wajib diisi");
      status = "rejected";
    } else if (kegiatan.length > 1000) {
      kegiatan = kegiatan.substring(0, 1000);
      issues.push("Kegiatan melebihi 1000 karakter (dipotong)");
      if (status !== "rejected") status = "warning";
    }

    // 6. Kategori
    let kategori = cellValStr(8);
    if (kategori === "-" || kategori.toLowerCase() === "null") kategori = "";
    if (kategori) {
      categoriesSeen.add(kategori);
    }

    // 7. Keterangan
    let keterangan = cellValStr(9).replace(/\u00A0/g, "").trim();
    if (keterangan === "-" || keterangan.toLowerCase() === "null") keterangan = "";

    // 8. Highlight
    const highlight = isYellowHighlight(getCell(7));

    // 9. Duplikat check
    if (status !== "rejected" && tanggal && startTime && finishTime && kegiatan) {
      const signature = `${tanggal}|${startTime}|${finishTime}|${kegiatan.toLowerCase()}`;
      if (duplicateSet.has(signature) || fileSeenSet.has(signature)) {
        status = "duplicate";
        issues.push("Duplikat: kegiatan pada jam dan tanggal ini sudah ada");
      } else {
        fileSeenSet.add(signature);
      }
    }

    // Count summaries
    if (status === "ready") readyCount++;
    else if (status === "warning") warningCount++;
    else if (status === "duplicate") duplicateCount++;
    else if (status === "rejected") rejectedCount++;

    rows.push({
      row_number: rowNumber,
      tanggal: tanggal || "",
      hari,
      start_time: startTime || "",
      finish_time: finishTime || "",
      duration_min: durationMin,
      man_power: manPower,
      kegiatan,
      kategori,
      keterangan,
      highlight,
      status,
      issues
    });
  });

  // Calculate category merge suggestions (distance <= 2)
  const categorySuggestions: Array<{ from: string; to: string }> = [];
  const catList = Array.from(categoriesSeen);
  for (let i = 0; i < catList.length; i++) {
    for (let j = i + 1; j < catList.length; j++) {
      const a = catList[i];
      const b = catList[j];
      if (a.toLowerCase() !== b.toLowerCase() && levenshteinDistance(a.toLowerCase(), b.toLowerCase()) <= 2) {
        // Suggest unifying
        categorySuggestions.push({ from: b, to: a });
      }
    }
  }

  return {
    sheet_name: sheetName,
    total_read: totalRead,
    ready_count: readyCount,
    warning_count: warningCount,
    duplicate_count: duplicateCount,
    rejected_count: rejectedCount,
    skipped_count: skippedCount,
    category_suggestions: categorySuggestions,
    rows
  };
}
