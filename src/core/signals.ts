/**
 * personal-claw — Signal Detection Engine
 * 
 * Detects learning signals from user messages:
 * - explicit_positive / explicit_negative (pattern matching)
 * - explicit_directive (format/style preferences)
 * - re_question (semantic repetition)
 * - follow_up (time-based continuity)
 */

import type {
  DimensionName,
  Signal,
  SignalPattern,
  SignalType,
} from '../types.js';
import {
  FOLLOW_UP_WINDOW_MS,
  SIGNAL_REWARDS,
} from '../utils/constants.js';

// ─── Signal Patterns ──────────────────────────────────────────────

export const SIGNAL_PATTERNS: SignalPattern[] = [
  {
    type: 'explicit_positive',
    patterns: [
      /좋아/i,
      /잘\s*했/i,
      /고마워/i,
      /감사/i,
      /perfect/i,
      /great/i,
      /awesome/i,
      /정확해/i,
      /맞아/i,
      /이대로/i,
      /그대로/i,
      /굿/i,
      /good/i,
      /nice/i,
      /만족/i,
      /훌륭/i,
      /완벽/i,
      /최고/i,
      /딱\s*이/i,
      // NOTE: /잘\s*못/i is intentionally excluded (it means "can't do well" = negative)
      /네\s*$/,    // simple affirmative at end
    ],
    reward: SIGNAL_REWARDS.explicit_positive,
  },
  {
    type: 'explicit_negative',
    patterns: [
      /아니/i,
      /틀렸/i,
      /다시\s*(해|줘|요)/i,
      /잘못/i,
      /아닌데/i,
      /다른\s*(거|것|방식|형태)/i,
      /더\s*(짧|간결|요약)/i,
      /짧게/i,
      /간결/i,
      /요약/i,
      /그만/i,
      /충분\s*(해|했|하)/i,
      /wrong/i,
      /no\b/i,
      /not\s*right/i,
      /다르게/i,
      /별로/i,
      /아쉬/i,
    ],
    reward: SIGNAL_REWARDS.explicit_negative,
  },
  {
    type: 'explicit_directive',
    patterns: [
      /짧게\s*(해\s*)?줘/i,
      /간결/i,
      /자세히/i,
      /코드로\s*보여/i,
      /예시를/i,
      /설명해\s*줘/i,
      /마크다운으로/i,
      /텍스트로/i,
      /표로/i,
      /리스트로/i,
      /더\s*(짧|간결)/i,
      /더\s*(길|자세|상세)/i,
      /step\s*by\s*step/i,
      /코드\s*없이/i,
      /just\s*(the\s*)?(result|answer)/i,
      /give\s*me\s*(the\s*)?code/i,
      /explain\s*(in\s*)?detail/i,
      /briefly/i,
      /in\s*table/i,
      /as\s*(a\s*)?list/i,
      /formal/i,
      /casual/i,
      /이모지/i,
      /emoji/i,
      /한글로/i,
      /영어로/i,
      /코드\s*포함/i,
      /코드\s*없이/i,
    ],
    reward: SIGNAL_REWARDS.explicit_directive,
  },
];

// ─── Directive → Dimension Mapping ────────────────────────────────

interface DirectiveMapping {
  pattern: RegExp;
  dimension: DimensionName;
  value: string;
}

const DIRECTIVE_MAPPINGS: DirectiveMapping[] = [
  // response_length
  { pattern: /짧게|간결|briefly|concise/i, dimension: 'response_length', value: 'concise' },
  { pattern: /자세히|상세|detail|explain.*detail|long/i, dimension: 'response_length', value: 'detailed' },

  // output_format
  { pattern: /마크다운으로|markdown/i, dimension: 'output_format', value: 'markdown' },
  { pattern: /텍스트로|plain\s*text/i, dimension: 'output_format', value: 'text' },
  { pattern: /코드\s*heavy|give.*code/i, dimension: 'output_format', value: 'code-heavy' },
  { pattern: /표로|리스트로|table|list|정리/i, dimension: 'output_format', value: 'structured' },

  // code_examples
  { pattern: /코드\s*없이|no\s*code|코드\s*말고/i, dimension: 'code_examples', value: 'none' },
  { pattern: /코드\s*포함|코드로\s*보여|full.*code/i, dimension: 'code_examples', value: 'full-scripts' },

  // explanation_style
  { pattern: /step\s*by\s*step|순서대로|단계별/i, dimension: 'explanation_style', value: 'step-by-step' },
  { pattern: /just.*(result|answer)|결과만|답만/i, dimension: 'explanation_style', value: 'result-only' },
  { pattern: /why|왜|이유|reasoning/i, dimension: 'explanation_style', value: 'with-reasoning' },

  // tone
  { pattern: /formal|격식체|공손/i, dimension: 'tone', value: 'formal' },
  { pattern: /casual|반말|편하게/i, dimension: 'tone', value: 'casual' },
  { pattern: /재미|장난|playful/i, dimension: 'tone', value: 'playful' },

  // language
  { pattern: /한글로|한국어로|korean/i, dimension: 'language', value: 'ko' },
  { pattern: /영어로|english/i, dimension: 'language', value: 'en' },

  // emoji_usage
  { pattern: /이모지|emoji/i, dimension: 'emoji_usage', value: 'moderate' },
  { pattern: /이모지\s*없이|no\s*emoji/i, dimension: 'emoji_usage', value: 'none' },

  // topic_depth
  { pattern: /깊이|심층|deep\s*dive/i, dimension: 'topic_depth', value: 'deep-dive' },
  { pattern: /개요|간단\s*개요|overview/i, dimension: 'topic_depth', value: 'overview' },
];

// ─── Signal Detection ─────────────────────────────────────────────

/**
 * Detect signals from a user message using pattern matching.
 * Returns all matching signals (a message can match multiple types).
 */
export function detectSignals(
  message: string,
  recentMessages?: string[],
): Signal[] {
  const signals: Signal[] = [];
  const timestamp = new Date().toISOString();

  // Pattern-based detection
  for (const signalPattern of SIGNAL_PATTERNS) {
    for (const regex of signalPattern.patterns) {
      if (regex.test(message)) {
        const signal: Signal = {
          type: signalPattern.type,
          timestamp,
          message,
          matched_pattern: regex.source,
          reward: signalPattern.reward,
        };

        // For explicit_directive, try to infer dimension + value
        if (signalPattern.type === 'explicit_directive') {
          const inferred = inferDimensionFromDirective(message);
          if (inferred) {
            signal.dimension = inferred.dimension;
            signal.value = inferred.value;
          }
        }

        // Avoid duplicate signals of the same type
        if (!signals.some((s) => s.type === signal.type)) {
          signals.push(signal);
        }
        break; // one match per type is enough
      }
    }
  }

  // re_question detection (if recent messages provided)
  if (recentMessages && recentMessages.length > 0) {
    const reQuestionSignal = detectReQuestion(message, recentMessages);
    if (reQuestionSignal) {
      signals.push(reQuestionSignal);
    }
  }

  return signals;
}

/**
 * Detect if the message is a re-question (semantically similar to recent messages).
 * Uses keyword overlap ratio as a simple similarity metric.
 */
export function detectReQuestion(
  message: string,
  recentMessages: string[],
): Signal | null {
  if (recentMessages.length === 0) return null;

  const messageKeywords = extractKeywords(message);
  if (messageKeywords.size === 0) return null;

  // Check against the last 5 messages
  const recentToCheck = recentMessages.slice(-5);
  let maxSimilarity = 0;

  for (const recent of recentToCheck) {
    const recentKeywords = extractKeywords(recent);
    if (recentKeywords.size === 0) continue;

    const similarity = calculateKeywordOverlap(messageKeywords, recentKeywords);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
  }

  if (maxSimilarity > 0.5) {
    return {
      type: 're_question',
      timestamp: new Date().toISOString(),
      message,
      reward: SIGNAL_REWARDS.re_question,
    };
  }

  return null;
}

/**
 * Detect if this is a follow-up message within the time window.
 */
export function detectFollowUp(
  lastMessageTime: Date,
  currentTime: Date,
): Signal | null {
  const elapsed = currentTime.getTime() - lastMessageTime.getTime();

  if (elapsed > 0 && elapsed <= FOLLOW_UP_WINDOW_MS) {
    return {
      type: 'follow_up',
      timestamp: currentTime.toISOString(),
      message: '',
      reward: SIGNAL_REWARDS.follow_up,
    };
  }

  return null;
}

/**
 * Infer dimension and value from an explicit directive message.
 */
export function inferDimensionFromDirective(
  message: string,
): { dimension: DimensionName; value: string } | null {
  // Check longest patterns first (more specific)
  const sorted = [...DIRECTIVE_MAPPINGS].sort(
    (a, b) => b.pattern.source.length - a.pattern.source.length,
  );

  for (const mapping of sorted) {
    if (mapping.pattern.test(message)) {
      return {
        dimension: mapping.dimension,
        value: mapping.value,
      };
    }
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Extract meaningful keywords from a message.
 * Filters out common stop words (Korean + English).
 */
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    // Korean
    '이', '그', '저', '것', '수', '등', '때', '곳', '및', '또', '더',
    '는', '은', '이', '가', '을', '를', '에', '에서', '으로', '로',
    '와', '과', '도', '만', '부터', '까지', '의', '에게', '한테',
    '이다', '입니다', '습니다', '해요', '해줘', '하세요', '있어요',
    '없어요', '그리고', '하지만', '그래서', '또는', '혹은',
    // English
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'this', 'that', 'it', 'i', 'you', 'he', 'she', 'we', 'they',
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'can', 'could', 'will', 'would', 'should', 'do', 'does', 'did',
    'please', 'just', 'also', 'very', 'really',
  ]);

  // Split by whitespace and common delimiters
  const tokens = text
    .toLowerCase()
    .replace(/[^\w가-힣]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !stopWords.has(t));

  return new Set(tokens);
}

/**
 * Calculate Jaccard similarity between two keyword sets.
 */
function calculateKeywordOverlap(
  setA: Set<string>,
  setB: Set<string>,
): number {
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const keyword of Array.from(setA)) {
    if (setB.has(keyword)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
