/**
 * Unit 4: Topic Detector — 패턴 기반 주제 분류
 * LLM 미사용, 정규식 키워드 매칭으로 동작
 */

import type { DimensionName } from '../types.js';

// ─── Types ───

export type TopicCategory =
  | 'coding'
  | 'analysis'
  | 'creative'
  | 'general'
  | 'learning'
  | 'planning';

export interface TopicClassification {
  category: TopicCategory;
  confidence: number;   // 0.0 ~ 1.0
  keywords: string[];   // 매칭된 키워드
}

// ─── Pattern Definitions ───

interface TopicPattern {
  category: TopicCategory;
  patterns: RegExp[];
  keywords: string[];
}

const TOPIC_PATTERNS: TopicPattern[] = [
  {
    category: 'coding',
    patterns: [
      /코드/i, /함수/i, /에러/i, /debug/i, /function/i,
      /api/i, /서버/i, /배포/i, /컴파일/i, /테스트/i,
      /git/i, /bug/i,
    ],
    keywords: [
      '코드', '함수', '에러', 'debug', 'function',
      'api', '서버', '배포', '컴파일', '테스트',
      'git', 'bug',
    ],
  },
  {
    category: 'analysis',
    patterns: [
      /분석/i, /데이터/i, /통계/i, /비교/i, /analyze/i,
      /data/i, /차트/i, /그래프/i,
    ],
    keywords: [
      '분석', '데이터', '통계', '비교', 'analyze',
      'data', '차트', '그래프',
    ],
  },
  {
    category: 'creative',
    patterns: [
      /글쓰기|글\s*작성|글\s*써/i, /작성/i, /창작/i, /디자인/i, /write/i,
      /create/i, /design/i, /스토리/i,
    ],
    keywords: [
      '글', '작성', '창작', '디자인', 'write',
      'create', 'design', '스토리',
    ],
  },
  {
    category: 'learning',
    patterns: [
      /공부/i, /학습/i, /이해/i, /설명해/i, /learn/i,
      /explain/i, /why/i, /어떻게/i, /무엇/i,
    ],
    keywords: [
      '공부', '학습', '이해', '설명해', 'learn',
      'explain', 'why', '어떻게', '무엇',
    ],
  },
  {
    category: 'planning',
    patterns: [
      /계획/i, /일정/i, /구조/i, /설계/i, /plan/i,
      /schedule/i, /architecture/i, /방법/i,
    ],
    keywords: [
      '계획', '일정', '구조', '설계', 'plan',
      'schedule', 'architecture', '방법',
    ],
  },
];

// ─── Priority Dimensions per Topic ───

const TOPIC_DIMENSIONS: Record<TopicCategory, string[]> = {
  coding:    ['code_examples', 'explanation_style', 'response_length', 'error_detail'],
  analysis:  ['response_length', 'output_format', 'explanation_style', 'reference_style'],
  creative:  ['tone', 'response_length', 'output_format', 'emoji_usage'],
  learning:  ['explanation_style', 'response_length', 'reference_style', 'meta_explanation'],
  planning:  ['response_length', 'output_format', 'language', 'question_handling'],
  general:   ['tone', 'response_length', 'language'],
};

// ─── Core Functions ───

/**
 * 단일 메시지에서 주제 분류
 */
export function detectTopic(message: string): TopicClassification {
  let bestCategory: TopicCategory = 'general';
  let maxMatches = 0;
  const matchedKeywords: string[] = [];

  for (const tp of TOPIC_PATTERNS) {
    let matches = 0;
    const keywords: string[] = [];

    for (let i = 0; i < tp.patterns.length; i++) {
      if (tp.patterns[i].test(message)) {
        matches++;
        keywords.push(tp.keywords[i]);
      }
    }

    if (matches > maxMatches) {
      maxMatches = matches;
      bestCategory = tp.category;
      matchedKeywords.length = 0;
      matchedKeywords.push(...keywords);
    } else if (matches === maxMatches && matches > 0) {
      // 동점이면 general 우선 — 현재 best를 유지하거나 general로
      if (bestCategory !== 'general') {
        // 이미 다른 카테고리가 동점이면 general로
        bestCategory = 'general';
        matchedKeywords.length = 0;
      }
    }
  }

  // 신뢰도 계산: 매칭 수에 따른 간단한 점수
  const confidence = maxMatches > 0 ? Math.min(maxMatches / 3, 1.0) : 0.0;

  return {
    category: bestCategory,
    confidence,
    keywords: matchedKeywords,
  };
}

/**
 * 여러 메시지의 주제 분포 분석
 * 모든 메시지를 이어붙여 단일 분류 수행 후 다수결로 결정
 */
export function detectTopicFromMessages(messages: string[]): TopicClassification {
  if (messages.length === 0) {
    return { category: 'general', confidence: 0, keywords: [] };
  }

  // 카테고리별 누적 점수
  const categoryScores: Record<TopicCategory, number> = {
    coding: 0,
    analysis: 0,
    creative: 0,
    learning: 0,
    planning: 0,
    general: 0,
  };

  const allKeywords = new Set<string>();

  for (const msg of messages) {
    const result = detectTopic(msg);
    categoryScores[result.category] += 1;
    for (const kw of result.keywords) {
      allKeywords.add(kw);
    }
  }

  // 최고 점수 카테고리 선택, 동점이면 general 우선
  let bestCategory: TopicCategory = 'general';
  let bestScore = 0;

  const categories: TopicCategory[] = [
    'coding', 'analysis', 'creative', 'learning', 'planning',
  ];

  for (const cat of categories) {
    if (categoryScores[cat] > bestScore) {
      bestScore = categoryScores[cat];
      bestCategory = cat;
    }
  }

  const confidence = bestScore > 0 ? Math.min(bestScore / messages.length, 1.0) : 0.0;

  return {
    category: bestCategory,
    confidence,
    keywords: Array.from(allKeywords),
  };
}

/**
 * 주제에 해당하는 우선 차원 반환
 */
export function getPriorityDimensionsForTopic(category: TopicCategory): string[] {
  return TOPIC_DIMENSIONS[category] ?? TOPIC_DIMENSIONS.general;
}
