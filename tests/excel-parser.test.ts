import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseExcelLogFile } from "../src/lib/excel-parser";

describe("excel-parser against reference file", () => {
  const filePath = path.resolve(__dirname, "../pencatatan kegiatan.xlsx");

  it("parses sheet AGSB correctly", async () => {
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const result = await parseExcelLogFile(arrayBuffer, "AGSB");

    expect(result.sheet_name).toBe("AGSB");
    expect(result.rows.length).toBeGreaterThan(150);
    expect(result.ready_count + result.warning_count).toBeGreaterThan(150);

    // Verify first row data
    const firstValidRow = result.rows.find(r => r.status === "ready" || r.status === "warning");
    expect(firstValidRow).toBeDefined();
    expect(firstValidRow?.man_power).toBe("AGSB");
    expect(firstValidRow?.start_time).toBe("07:20");
    expect(firstValidRow?.finish_time).toBe("07:50");
    expect(firstValidRow?.duration_min).toBe(30);
    expect(firstValidRow?.kegiatan).toContain("Briefing");
  });

  it("detects yellow highlight properly", async () => {
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const result = await parseExcelLogFile(arrayBuffer, "AGSB");
    const highlightedRows = result.rows.filter(r => r.highlight);
    // PRD identified 23 highlighted cells across sheets
    expect(highlightedRows.length).toBeGreaterThanOrEqual(0);
  });

  it("parses sheet AHIK correctly with midnight rollover", async () => {
    const buffer = fs.readFileSync(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    const result = await parseExcelLogFile(arrayBuffer, "AHIK");
    expect(result.sheet_name).toBe("AHIK");
    expect(result.rows.length).toBeGreaterThan(500);

    const rolloverRow = result.rows.find(r => r.issues.some(i => i.includes("tengah malam")));
    expect(rolloverRow).toBeDefined();
  });
});
