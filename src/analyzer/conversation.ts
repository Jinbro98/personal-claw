/**
 * personal-claw — Conversation session analyzer
 */

import type { PhaseType } from '../types.js';

// ─── Conversation Length Analysis ───

export interface ConversationLengthResult {
  reward: number;
  suggestion: string;
}

/**
 * Analyze conversation length and return a reward signal.
 *
 * - 1–5 messages: reward 0 (neutral)
 * - 6–15 messages: reward 0.3 (interested)
 * - 16+ messages: reward 0.6 (highly interested)
 */
export function analyzeConversationLength(
  messageCount: number,
): ConversationLengthResult {
  if (messageCount <= 0) {
    return { reward: 0, suggestion: '대화 시작 대기 중' };
  }
  if (messageCount <= 5) {
    return { reward: 0, suggestion: 'neutral' };
  }
  if (messageCount <= 15) {
    return { reward: 0.3, suggestion: '관심 있음' };
  }
  return { reward: 0.6, suggestion: '매우 관심' };
}

// ─── Session Analysis ───

export interface SessionAnalysis {
  avgLength: number;
  questionRatio: number;
  codeRequestCount: number;
}

/**
 * Analyze a set of messages and return session-level metrics.
 */
export function analyzeSession(messages: string[]): SessionAnalysis {
  if (messages.length === 0) {
    return { avgLength: 0, questionRatio: 0, codeRequestCount: 0 };
  }

  const totalChars = messages.reduce((sum, m) => sum + m.length, 0);
  const avgLength = totalChars / messages.length;

  const questionCount = messages.filter((m) => m.includes('?')).length;
  const questionRatio = questionCount / messages.length;

  const codeKeywords = /\b(code|코드|스크립트|script|함수|function|구현|implement|알고리즘|algorithm)\b/i;
  const codeRequestCount = messages.filter((m) => codeKeywords.test(m)).length;

  return { avgLength, questionRatio, codeRequestCount };
}

// ─── A/B Suggestion ───

/**
 * Decide whether an A/B test should be suggested.
 *
 * Only suggest during the 'pattern' phase once enough messages have been
 * accumulated (threshold: 10).
 */
export function shouldSuggestAB(
  currentPhase: PhaseType,
  totalMessages: number,
): boolean {
  return currentPhase === 'pattern' && totalMessages >= 10;
}
