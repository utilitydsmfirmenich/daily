import { describe, it, expect } from "vitest";
import {
  sanitizeTranscription,
  matchVoiceCategory,
  STANDARD_VOICE_CATEGORIES
} from "../src/lib/voice-utils";

describe("voice-utils", () => {
  it("sanitizes transcribed string properly with capitalization", () => {
    expect(sanitizeTranscription("pembersihan area WTP")).toBe("Pembersihan area WTP");
    expect(sanitizeTranscription("  cek pompa chiller 2   ")).toBe("Cek pompa chiller 2");
    expect(sanitizeTranscription("")).toBe("");
  });

  it("matches category case-insensitively", () => {
    expect(matchVoiceCategory("preventive")).toBe("Preventive");
    expect(matchVoiceCategory("OPERATIONAL")).toBe("Operational");
    expect(matchVoiceCategory("  istirahat  ")).toBe("Istirahat");
    expect(matchVoiceCategory("meeting")).toBe("Meeting");
    expect(matchVoiceCategory("improvement")).toBe("Improvement");
    expect(matchVoiceCategory("project")).toBe("Project");
  });

  it("falls back to Operational for unknown categories", () => {
    expect(matchVoiceCategory("unknown-random")).toBe("Operational");
    expect(matchVoiceCategory("")).toBe("Operational");
  });

  it("contains all 12 standard categories", () => {
    expect(STANDARD_VOICE_CATEGORIES).toHaveLength(12);
    expect(STANDARD_VOICE_CATEGORIES).toContain("Admin");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Operational");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Preventive");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Corrective");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Support");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Mobilitas");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Meeting");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Istirahat");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Project");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Training");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Cuti");
    expect(STANDARD_VOICE_CATEGORIES).toContain("Improvement");
  });
});
