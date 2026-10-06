export const STANDARD_VOICE_CATEGORIES = [
  "Admin",
  "Operational",
  "Preventive",
  "Corrective",
  "Support",
  "Mobilitas",
  "Meeting",
  "Istirahat",
  "Project",
  "Training",
  "Cuti",
  "Improvement"
] as const;

export type VoiceCategory = (typeof STANDARD_VOICE_CATEGORIES)[number];

/**
 * Normalizes and sanitizes voice transcription text:
 * - Trims whitespace
 * - Capitalizes the first letter
 */
export function sanitizeTranscription(text: string): string {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Validates and matches a category against the 12 standard categories (case-insensitive).
 * Fallback to defaultCategory (defaults to "Operational") if unrecognized.
 */
export function matchVoiceCategory(
  rawCategory: string,
  defaultCategory: VoiceCategory = "Operational"
): VoiceCategory {
  if (!rawCategory) return defaultCategory;
  const clean = rawCategory.trim().toLowerCase();
  const matched = STANDARD_VOICE_CATEGORIES.find(
    (cat) => cat.toLowerCase() === clean
  );
  return matched || defaultCategory;
}
