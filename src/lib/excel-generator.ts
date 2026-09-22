import ExcelJS from "exceljs";
import { Activity, PIDType } from "../types";
import { formatDateToIndonesian } from "./time-utils";

export interface ExportOptions {
  layout: "as_original" | "single_table";
  durationFormat: "minutes" | "hours_minutes";
  filename?: string;
}

function sanitizeFormulaInjection(text: string | null | undefined): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.startsWith("=") || trimmed.startsWith("+") || trimmed.startsWith("-") || trimmed.startsWith("@")) {
    return `'${trimmed}`;
  }
  return trimmed;
}

function parseTimeToExcelFraction(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h * 60 + m) / 1440;
}

function parseDateToExcelDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFD4D4D4" } },
  left: { style: "thin", color: { argb: "FFD4D4D4" } },
  bottom: { style: "thin", color: { argb: "FFD4D4D4" } },
  right: { style: "thin", color: { argb: "FFD4D4D4" } }
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: "Segoe UI",
  size: 9,
  bold: true,
  color: { argb: "FF404040" }
};

const DATA_FONT: Partial<ExcelJS.Font> = {
  name: "Segoe UI",
  size: 9,
  color: { argb: "FF404040" }
};

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF2F2F2" }
};

const YELLOW_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFF00" }
};

export async function generateActivitiesExcel(
  pid: PIDType | string,
  activities: Activity[],
  options: ExportOptions
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Log Harian PID";
  workbook.lastModifiedBy = "Log Harian PID";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet(pid || "LOG");

  // Set column widths
  sheet.columns = [
    { width: 13 }, // A: Tanggal
    { width: 10 }, // B: Hari
    { width: 9 },  // C: Start
    { width: 9 },  // D: Finish
    { width: 12 }, // E: Waktu Total
    { width: 13 }, // F: Man Power
    { width: 72 }, // G: Kegiatan
    { width: 24 }, // H: Kategori
    { width: 30 }  // I: Keterangan
  ];

  let currentRow = 1;

  const renderHeader = () => {
    const h1Row = currentRow;
    const h2Row = currentRow + 1;

    sheet.getCell(`A${h1Row}`).value = "Tanggal";
    sheet.getCell(`B${h1Row}`).value = "Hari";
    sheet.getCell(`C${h1Row}`).value = "Waktu";
    sheet.getCell(`E${h1Row}`).value = "Waktu Total";
    sheet.getCell(`F${h1Row}`).value = "Man Power";
    sheet.getCell(`G${h1Row}`).value = "Kegiatan";
    sheet.getCell(`H${h1Row}`).value = "Kategori Pekerjaan";
    sheet.getCell(`I${h1Row}`).value = "Keterangan";

    sheet.getCell(`C${h2Row}`).value = "Start";
    sheet.getCell(`D${h2Row}`).value = "Finish";

    // Merge header cells
    sheet.mergeCells(`A${h1Row}:A${h2Row}`);
    sheet.mergeCells(`B${h1Row}:B${h2Row}`);
    sheet.mergeCells(`C${h1Row}:D${h1Row}`);
    sheet.mergeCells(`E${h1Row}:E${h2Row}`);
    sheet.mergeCells(`F${h1Row}:F${h2Row}`);
    sheet.mergeCells(`G${h1Row}:G${h2Row}`);
    sheet.mergeCells(`H${h1Row}:H${h2Row}`);
    sheet.mergeCells(`I${h1Row}:I${h2Row}`);

    // Style headers
    for (let r = h1Row; r <= h2Row; r++) {
      for (let c = 1; c <= 9; c++) {
        const cell = sheet.getRow(r).getCell(c);
        cell.font = HEADER_FONT;
        cell.fill = HEADER_FILL;
        cell.border = THIN_BORDER;
        cell.alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true
        };
      }
    }

    currentRow += 2;
  };

  const renderDataRow = (act: Activity) => {
    const r = currentRow;
    const row = sheet.getRow(r);

    // Tanggal
    const cellA = row.getCell(1);
    cellA.value = parseDateToExcelDate(act.tanggal);
    cellA.numFmt = "dd/mm/yyyy";
    cellA.alignment = { vertical: "middle", horizontal: "center" };

    // Hari
    const cellB = row.getCell(2);
    cellB.value = act.hari;
    cellB.alignment = { vertical: "middle", horizontal: "center" };

    // Start
    const cellC = row.getCell(3);
    cellC.value = parseTimeToExcelFraction(act.start_time);
    cellC.numFmt = "h:mm";
    cellC.alignment = { vertical: "middle", horizontal: "center" };

    // Finish
    const cellD = row.getCell(4);
    cellD.value = parseTimeToExcelFraction(act.finish_time);
    cellD.numFmt = "h:mm";
    cellD.alignment = { vertical: "middle", horizontal: "center" };

    // Waktu Total (Formula)
    const cellE = row.getCell(5);
    if (options.durationFormat === "hours_minutes") {
      cellE.value = { formula: `MOD(D${r}-C${r},1)` };
      cellE.numFmt = "h:mm";
    } else {
      cellE.value = { formula: `ROUND(MOD(D${r}-C${r},1)*1440,0)` };
      cellE.numFmt = "0";
    }
    cellE.alignment = { vertical: "middle", horizontal: "center" };

    // Man Power
    const cellF = row.getCell(6);
    cellF.value = act.pid;
    cellF.alignment = { vertical: "middle", horizontal: "center" };

    // Kegiatan
    const cellG = row.getCell(7);
    cellG.value = sanitizeFormulaInjection(act.kegiatan);
    cellG.alignment = { vertical: "top", horizontal: "left", wrapText: true };
    if (act.highlight === 1) {
      cellG.fill = YELLOW_FILL;
    }

    // Kategori
    const cellH = row.getCell(8);
    cellH.value = sanitizeFormulaInjection(act.kategori || "");
    cellH.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    // Keterangan
    const cellI = row.getCell(9);
    cellI.value = sanitizeFormulaInjection(act.keterangan || "");
    cellI.alignment = { vertical: "top", horizontal: "left", wrapText: true };

    // Apply font & border to all cells
    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      cell.font = DATA_FONT;
      cell.border = THIN_BORDER;
    }

    currentRow++;
  };

  if (options.layout === "single_table") {
    // Single continuous table
    renderHeader();
    sheet.views = [{ state: "frozen", ySplit: 2 }];
    sheet.autoFilter = "A2:I2";

    for (const act of activities) {
      renderDataRow(act);
    }
  } else {
    // "as_original": Grouped by day with 2-row header per day block and blank row separator
    // Group activities by date
    const grouped = new Map<string, Activity[]>();
    for (const act of activities) {
      const list = grouped.get(act.tanggal) || [];
      list.push(act);
      grouped.set(act.tanggal, list);
    }

    let isFirstBlock = true;
    for (const [, dayActivities] of grouped) {
      if (!isFirstBlock) {
        // Add 1 blank row between days
        currentRow++;
      }
      isFirstBlock = false;

      renderHeader();
      for (const act of dayActivities) {
        renderDataRow(act);
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export async function generateTemplateExcel(pid: PIDType | string): Promise<Uint8Array> {
  const sampleActivity: Activity = {
    id: 1,
    client_id: "sample-id",
    pid: (pid as PIDType) || "AGSB",
    tanggal: "2026-09-19",
    hari: "Sabtu",
    start_time: "07:20",
    finish_time: "07:50",
    duration_min: 30,
    kegiatan: "Contoh: Briefing pagi operasional dan cek shift",
    kategori: "Briefing",
    keterangan: "Contoh keterangan pekerjaan",
    highlight: 0,
    source: "app",
    import_id: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    edit_count: 0,
    deleted_at: null
  };

  return generateActivitiesExcel(pid, [sampleActivity], {
    layout: "as_original",
    durationFormat: "minutes"
  });
}
