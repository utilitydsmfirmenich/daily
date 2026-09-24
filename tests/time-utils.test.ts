import { describe, it, expect } from "vitest";
import {
  calculateDuration,
  getDayFromDate,
  normalizeDayName,
  normalizeTimeString,
  parseIndonesianDate,
  formatDateToIndonesian,
  addMinutesToTime,
  formatTimeOnBlur
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

  it("supports 24:00 format normalization", () => {
    expect(normalizeTimeString("24:00")).toBe("24:00");
    expect(normalizeTimeString("24.00")).toBe("24:00");
    expect(normalizeTimeString("24:01")).toBeNull();
    expect(normalizeTimeString("25:00")).toBeNull();
    expect(normalizeTimeString("00:00")).toBe("00:00");
    expect(normalizeTimeString("16:00")).toBe("16:00");
  });

  it("calculates duration with 24:00 finish time correctly", () => {
    // 16:00 to 24:00 = 8 hours (480 minutes)
    const shift2 = calculateDuration("16:00", "24:00");
    expect(shift2.isValid).toBe(true);
    expect(shift2.durationMin).toBe(480);
    expect(shift2.isMidnightRollover).toBe(false);

    // 23:00 to 24:00 = 1 hour (60 minutes)
    const late = calculateDuration("23:00", "24:00");
    expect(late.isValid).toBe(true);
    expect(late.durationMin).toBe(60);
    expect(late.isMidnightRollover).toBe(false);

    // 00:00 to 24:00 = 24 hours (1440 minutes)
    const fullDay = calculateDuration("00:00", "24:00");
    expect(fullDay.isValid).toBe(true);
    expect(fullDay.durationMin).toBe(1440);

    // 24:00 to 01:00 = 1 hour (60 minutes)
    const afterMidnight = calculateDuration("24:00", "01:00");
    expect(afterMidnight.isValid).toBe(true);
    expect(afterMidnight.durationMin).toBe(60);
  });

  it("adds duration landing on midnight as 24:00", () => {
    expect(addMinutesToTime("23:00", 60)).toBe("24:00");
    expect(addMinutesToTime("16:00", 480)).toBe("24:00");
    expect(addMinutesToTime("22:00", 120)).toBe("24:00");
    expect(addMinutesToTime("23:30", 60)).toBe("00:30");
    expect(addMinutesToTime("24:00", 30)).toBe("00:30");
  });

  it("formats fuzzy user inputs on blur intelligently", () => {
    expect(formatTimeOnBlur("24")).toBe("24:00");
    expect(formatTimeOnBlur("2400")).toBe("24:00");
    expect(formatTimeOnBlur("1600")).toBe("16:00");
    expect(formatTimeOnBlur("16")).toBe("16:00");
    expect(formatTimeOnBlur("730")).toBe("07:30");
    expect(formatTimeOnBlur("8:30")).toBe("08:30");
    expect(formatTimeOnBlur("8.00")).toBe("08:00");
  });
});
