import { describe, it, expect } from "vitest";
import {
  calculateDuration,
  getDayFromDate,
  normalizeDayName,
  normalizeTimeString,
  parseIndonesianDate,
  formatDateToIndonesian
} from "../src/lib/time-utils";

describe("time-utils", () => {
  it("normalizes day names correctly", () => {
    expect(normalizeDayName("Jum'at")).toBe("Jumat");
    expect(normalizeDayName("SABTU")).toBe("Sabtu");
    expect(normalizeDayName("senin ")).toBe("Senin");
    expect(normalizeDayName("Minggu")).toBe("Minggu");
  });

  it("calculates correct day from ISO date", () => {
    // 2026-09-19 is Saturday (Sabtu)
    expect(getDayFromDate("2026-09-19")).toBe("Sabtu");
    // 2025-06-30 is Monday (Senin)
    expect(getDayFromDate("2025-06-30")).toBe("Senin");
  });

  it("calculates normal duration within same day", () => {
    const res = calculateDuration("07:20", "07:50");
    expect(res.isValid).toBe(true);
    expect(res.durationMin).toBe(30);
    expect(res.isMidnightRollover).toBe(false);
  });

  it("handles midnight rollover within 12 hours (R6)", () => {
    // 23:45 to 01:15 is 90 minutes (1h 30m)
    const res = calculateDuration("23:45", "01:15");
    expect(res.isValid).toBe(true);
    expect(res.durationMin).toBe(90);
    expect(res.isMidnightRollover).toBe(true);
  });

  it("rejects rollover if duration exceeds 12 hours (R6)", () => {
    // 23:00 to 12:30 next day is 13.5 hours > 12h
    const res = calculateDuration("23:00", "12:30");
    expect(res.isValid).toBe(false);
    expect(res.durationMin).toBe(810);
  });

  it("formats and parses date accurately", () => {
    expect(formatDateToIndonesian("2025-06-30")).toBe("30/06/2025");
    expect(parseIndonesianDate("30/06/2025")).toBe("2025-06-30");
    expect(parseIndonesianDate("9/7/2025")).toBe("2025-07-09");
  });
});
