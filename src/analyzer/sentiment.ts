/**
 * personal-claw — Sentiment & satisfaction analyzer
 */

// ─── Keyword Lists ───

const POSITIVE_KOREAN = ['좋아', '좋다', '감사', '고마'];
const POSITIVE_ENGLISH = ['perfect', 'great', 'good', 'nice', 'thanks'];

const NEGATIVE_KOREAN = ['싫어', '나쁘', '별로'];
const NEGATIVE_ENGLISH = ['terrible', 'bad', 'wrong', 'worse'];

const THANKS_PATTERNS = [
  /감사합니다/,
  /감사해요/,
  /고마워요?/,
  /고맙습니다/,
  /thank(s| you)/i,
  /고마워\b/,
];

const RE_QUESTION_PATTERNS = [
  /^(그래서|그러면|그럼|근데|그런데)\s/,
  /\?$/,
  /왜\s/,
  /어떻게\s/,
  /what\s/i,
  /why\s/i,
  /how\s/i,
  /then\s/i,
  /but\s/i,
];

// ─── Sentiment Analysis ───

export interface SentimentResult {
  score: number; // -1.0 ~ 1.0
  isPositive: boolean;
  isNegative: boolean;
}

/**
 * Analyze the sentiment of a single text string.
 *
 * Returns a score between -1.0 (very negative) and 1.0 (very positive).
 */
export function analyzeSentiment(text: string): SentimentResult {
  if (!text) {
    return { score: 0, isPositive: false, isNegative: false };
  }

  const lower = text.toLowerCase();
  let posHits = 0;
  let negHits = 0;

  for (const kw of POSITIVE_KOREAN) {
    if (lower.includes(kw)) posHits++;
  }
  for (const kw of POSITIVE_ENGLISH) {
    if (lower.includes(kw)) posHits++;
  }
  for (const kw of NEGATIVE_KOREAN) {
    if (lower.includes(kw)) negHits++;
  }
  for (const kw of NEGATIVE_ENGLISH) {
    if (lower.includes(kw)) negHits++;
  }

  const total = posHits + negHits;
  if (total === 0) {
    return { score: 0, isPositive: false, isNegative: false };
  }

  const raw = (posHits - negHits) / total;
  // Clamp to [-1, 1]
  const score = Math.max(-1, Math.min(1, Number(raw.toFixed(4))));

  return {
    score,
    isPositive: score > 0,
    isNegative: score < 0,
  };
}

// ─── Response Satisfaction ───

/**
 * Estimate user satisfaction with the assistant's previous response.
 *
 * - If the user re-asks (follow-up / clarification question): -0.5
 * - If the user expresses thanks: +0.5
 * - Otherwise: 0
 */
export function analyzeResponseSatisfaction(
  userMessage: string,
  _previousAssistantMessage: string,
): number {
  if (!userMessage) return 0;

  // Check for thanks
  for (const pat of THANKS_PATTERNS) {
    if (pat.test(userMessage)) return 0.5;
  }

  // Check for re-question (possible dissatisfaction or need for clarification)
  for (const pat of RE_QUESTION_PATTERNS) {
    if (pat.test(userMessage)) return -0.5;
  }

  return 0;
}
