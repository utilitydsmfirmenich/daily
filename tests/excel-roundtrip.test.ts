import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseExcelLogFile } from "../src/lib/excel-parser";
import { generateActivitiesExcel } from "../src/lib/excel-generator";
import { Activity } from "../src/types";

describe("excel round-trip test", () => {
  const filePath = path.resolve(__dirname, "../pencatatan kegiatan.xlsx");

  it("exports parsed activities and re-parses them with 0 rejected rows", async () => {
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    // 1. Parse original sheet AGSB
    const originalParsed = await parseExcelLogFile(arrayBuffer, "AGSB");
    const validRows = originalParsed.rows.filter((r) => r.status === "ready" || r.status === "warning");

    expect(validRows.length).toBeGreaterThan(100);

    // Convert parsed rows to Activity objects
    const activities: Activity[] = validRows.map((r, idx) => ({
      id: idx + 1,
      client_id: `test-${idx}`,
      pid: "AGSB",
      tanggal: r.tanggal,
      hari: r.hari,
      start_time: r.start_time,
      finish_time: r.finish_time,
      duration_min: r.duration_min,
      kegiatan: r.kegiatan,
      kategori: r.kategori || null,
      keterangan: r.keterangan || null,
      highlight: r.highlight ? 1 : 0,
      source: "app",
      import_id: null,
      created_at: new Date().toISOString(),
      updated_at: null,
      edit_count: 0,
      deleted_at: null
    }));

    // 2. Generate new Excel file with "as_original" layout
    const generatedBuffer = await generateActivitiesExcel("AGSB", activities, {
      layout: "as_original",
      durationFormat: "minutes"
    });

    expect(generatedBuffer.byteLength).toBeGreaterThan(1000);

    // 3. Re-parse the generated Excel file
    const reParsed = await parseExcelLogFile(generatedBuffer.buffer, "AGSB");

    // PRD Section 11.3 requirement: 0 rejected rows
    expect(reParsed.rejected_count).toBe(0);
    expect(reParsed.ready_count + reParsed.warning_count).toBe(validRows.length);

    // Verify first row values match
    const originalFirst = validRows[0];
    const reParsedFirst = reParsed.rows[0];

    expect(reParsedFirst.tanggal).toBe(originalFirst.tanggal);
    expect(reParsedFirst.start_time).toBe(originalFirst.start_time);
    expect(reParsedFirst.finish_time).toBe(originalFirst.finish_time);
    expect(reParsedFirst.duration_min).toBe(originalFirst.duration_min);
    expect(reParsedFirst.kegiatan).toBe(originalFirst.kegiatan);
  });
});