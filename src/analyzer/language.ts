/**
 * personal-claw — Language detection analyzer
 */

export type DetectedLanguage = 'ko' | 'en' | 'mixed';

export interface LanguageResult {
  language: DetectedLanguage;
  confidence: number;
}

// ─── Character Classification Helpers ───

/**
 * Check whether a code-point falls inside the Korean (Hangul) ranges.
 *  - U+AC00 – U+D7AF  (Hangul Syllables)
 *  - U+3131 – U+3163  (Hangul Compatibility Jamo)
 *  - U+1100 – U+11FF  (Hangul Jamo)
 *  - U+A960 – U+A97C  (Hangul Jamo Extended-A)
 *  - U+D7B0 – U+D7FF  (Hangul Jamo Extended-B)
 */
function isHangul(code: number): boolean {
  return (
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0x3131 && code <= 0x3163) ||
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0xa960 && code <= 0xa97c) ||
    (code >= 0xd7b0 && code <= 0xd7ff)
  );
}

/**
 * Check whether a code-point is a basic Latin letter (a-z, A-Z).
 */
function isLatin(code: number): boolean {
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
}

// ─── Single Text Detection ───

/**
 * Detect the dominant language in a single text string.
 *
 * Returns 'ko' if ≥70 % of alphabetic characters are Hangul,
 * 'en' if ≥70 % are Latin, otherwise 'mixed'.
 */
export function detectLanguage(text: string): LanguageResult {
  if (!text) {
    return { language: 'mixed', confidence: 0 };
  }

  let hangulCount = 0;
  let latinCount = 0;

  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (isHangul(code)) {
      hangulCount++;
    } else if (isLatin(code)) {
      latinCount++;
    }
  }

  const total = hangulCount + latinCount;
  if (total === 0) {
    return { language: 'mixed', confidence: 0 };
  }

  const hangulRatio = hangulCount / total;
  const latinRatio = latinCount / total;

  if (hangulRatio >= 0.7) {
    return { language: 'ko', confidence: Number(hangulRatio.toFixed(4)) };
  }
  if (latinRatio >= 0.7) {
    return { language: 'en', confidence: Number(latinRatio.toFixed(4)) };
  }
  return {
    language: 'mixed',
    confidence: Number(Math.max(hangulRatio, latinRatio).toFixed(4)),
  };
}

// ─── Batch Detection ───

/**
 * Detect the dominant language across multiple messages.
 *
 * Aggregates character counts from every message and returns the
 * overall language distribution.
 */
export function detectLanguageFromMessages(
  messages: string[],
): LanguageResult {
  if (messages.length === 0) {
    return { language: 'mixed', confidence: 0 };
  }

  let totalHangul = 0;
  let totalLatin = 0;

  for (const msg of messages) {
    for (const ch of msg) {
      const code = ch.codePointAt(0)!;
      if (isHangul(code)) {
        totalHangul++;
      } else if (isLatin(code)) {
        totalLatin++;
      }
    }
  }

  const total = totalHangul + totalLatin;
  if (total === 0) {
    return { language: 'mixed', confidence: 0 };
  }

  const hangulRatio = totalHangul / total;
  const latinRatio = totalLatin / total;

  if (hangulRatio >= 0.7) {
    return { language: 'ko', confidence: Number(hangulRatio.toFixed(4)) };
  }
  if (latinRatio >= 0.7) {
    return { language: 'en', confidence: Number(latinRatio.toFixed(4)) };
  }
  return {
    language: 'mixed',
    confidence: Number(Math.max(hangulRatio, latinRatio).toFixed(4)),
  };
}
