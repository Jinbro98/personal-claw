import type { Profile, DimensionName } from '../types.js';
import { DIMENSIONS } from '../utils/constants.js';

// ─── Types ───

export interface ABSuggestion {
  dimension: DimensionName;
  question: string;       // 사용자에게 보여줄 질문
  option_a: string;       // A 선택지 설명
  option_b: string;       // B 선택지 설명
  value_a: string;        // A의 실제 값
  value_b: string;        // B의 실제 값
}

// ─── Dimension A/B Patterns ───

interface DimensionPattern {
  question: string;
  option_a: string;
  option_b: string;
  value_a: string;
  value_b: string;
}

const DIMENSION_PATTERNS: Record<DimensionName, DimensionPattern> = {
  response_length: {
    question: '답변 길이, 어떤 게 더 편해?',
    option_a: '간결하게 (핵심만 쏙쏙)',
    option_b: '자세하게 ( подробн히 설명)',
    value_a: 'concise',
    value_b: 'detailed',
  },
  tone: {
    question: '어떤 말투가 더 좋아?',
    option_a: '편하게 (반말처럼 자연스럽게)',
    option_b: '정중하게 (존댓말로 깔끔하게)',
    value_a: 'casual',
    value_b: 'formal',
  },
  output_format: {
    question: '답변 형식은 어떤 게 읽기 편해?',
    option_a: '텍스트 (깔끔한 문장)',
    option_b: '마크다운 (제목·목록 등 정리)',
    value_a: 'text',
    value_b: 'markdown',
  },
  topic_depth: {
    question: '설명 깊이는 어느 정도가 좋아?',
    option_a: '핵심만 (빠르게 파악)',
    option_b: '깊이 있게 (배경까지 설명)',
    value_a: 'overview',
    value_b: 'deep-dive',
  },
  code_examples: {
    question: '코드 예시는 어떻게 할까?',
    option_a: '설명만 (텍스트로 설명)',
    option_b: '코드도 같이 (예시 코드 포함)',
    value_a: 'none',
    value_b: 'full-scripts',
  },
  explanation_style: {
    question: '설명 방식은?',
    option_a: '결과만 (바로 답)',
    option_b: '단계별로 (과정과 함께)',
    value_a: 'result-only',
    value_b: 'step-by-step',
  },
  language: {
    question: '어떤 언어로 대화할까?',
    option_a: '한국어',
    option_b: 'English',
    value_a: 'ko',
    value_b: 'en',
  },
  emoji_usage: {
    question: '이모지는 얼마나 쓸까?',
    option_a: '안 씀 (깔끔한 텍스트)',
    option_b: '적당히 (분위기용으로)',
    value_a: 'none',
    value_b: 'moderate',
  },
  meta_explanation: {
    question: '왜 그렇게 답하는지 설명이 필요해?',
    option_a: '스킵 (답변만)',
    option_b: '간단히 (이유도 같이)',
    value_a: 'skip',
    value_b: 'brief',
  },
  reference_style: {
    question: '참조/출처는 어떻게 표시할까?',
    option_a: '안 씀 (그냥 설명)',
    option_b: '링크 포함 (출처 같이)',
    value_a: 'none',
    value_b: 'inline-links',
  },
  question_handling: {
    question: '질문에 어떻게 답할까?',
    option_a: '바로 답 (직접적으로)',
    option_b: '함께 탐색 (더 생각해보기)',
    value_a: 'direct-answer',
    value_b: 'explore-first',
  },
  error_detail: {
    question: '에러 설명은 어느 정도로?',
    option_a: '요약 (무슨 문제지만)',
    option_b: '기술적 (원인과 해결책)',
    value_a: 'summary',
    value_b: 'technical',
  },
};

// ─── Topic → Relevant Dimensions Mapping ───

const TOPIC_DIMENSION_MAP: Record<string, DimensionName[]> = {
  code: ['code_examples', 'explanation_style', 'output_format', 'response_length'],
  programming: ['code_examples', 'explanation_style', 'output_format', 'response_length'],
  코딩: ['code_examples', 'explanation_style', 'output_format'],
  개발: ['code_examples', 'explanation_style', 'output_format'],
  debug: ['error_detail', 'code_examples', 'explanation_style'],
  디버깅: ['error_detail', 'code_examples', 'explanation_style'],
  에러: ['error_detail', 'explanation_style'],
  error: ['error_detail', 'explanation_style'],
  학습: ['topic_depth', 'explanation_style', 'response_length'],
  learning: ['topic_depth', 'explanation_style', 'response_length'],
  공부: ['topic_depth', 'explanation_style', 'response_length'],
  concept: ['topic_depth', 'explanation_style', 'meta_explanation'],
  개념: ['topic_depth', 'explanation_style', 'meta_explanation'],
  요약: ['response_length', 'topic_depth', 'output_format'],
  summary: ['response_length', 'topic_depth', 'output_format'],
  질문: ['question_handling', 'response_length', 'tone'],
  question: ['question_handling', 'response_length', 'tone'],
  번역: ['language', 'tone', 'response_length'],
  translate: ['language', 'tone', 'response_length'],
  대화: ['tone', 'emoji_usage', 'language'],
  chat: ['tone', 'emoji_usage', 'language'],
  writing: ['tone', 'response_length', 'output_format'],
  글쓰기: ['tone', 'response_length', 'output_format'],
};

// Default priority order when no topic hint
const DEFAULT_DIMENSION_PRIORITY: DimensionName[] = [
  'response_length',
  'tone',
  'explanation_style',
  'code_examples',
  'topic_depth',
  'output_format',
  'language',
  'emoji_usage',
  'question_handling',
  'meta_explanation',
  'reference_style',
  'error_detail',
];

// ─── Functions ───

/**
 * 확신도가 threshold 미만인 차원 반환 (학습 안 된 영역)
 * Phase 2 (A/B)에서 탐색할 차원을 식별하는 데 사용
 */
export function getLowConfidenceDimensions(
  profile: Profile,
  threshold: number = 0.5,
): DimensionName[] {
  const lowConfidence: DimensionName[] = [];

  for (const dim of DIMENSIONS) {
    const dimValue = profile.dimensions[dim.name];
    if (!dimValue || dimValue.confidence < threshold) {
      lowConfidence.push(dim.name);
    }
  }

  return lowConfidence;
}

/**
 * 해당 차원의 A/B 제안 생성
 * 확신도가 이미 충분히 높은 차원은 null 반환 (탐색 불필요)
 */
export function generateABSuggestion(
  dimension: DimensionName,
  profile?: Profile,
): ABSuggestion | null {
  // 이미 확신도가 높으면 제안하지 않음
  if (profile) {
    const dimValue = profile.dimensions[dimension];
    if (dimValue && dimValue.confidence >= 0.7) {
      return null;
    }
  }

  const pattern = DIMENSION_PATTERNS[dimension];
  if (!pattern) {
    return null;
  }

  return {
    dimension,
    question: pattern.question,
    option_a: pattern.option_a,
    option_b: pattern.option_b,
    value_a: pattern.value_a,
    value_b: pattern.value_b,
  };
}

/**
 * 자연스러운 제안 텍스트 생성 (대화 맥락 반영)
 * 사용자에게 A/B 선택을 자연스럽게 요청하는 텍스트
 */
export function generateSuggestionText(suggestion: ABSuggestion): string {
  return [
    suggestion.question,
    '',
    `  A) ${suggestion.option_a}`,
    `  B) ${suggestion.option_b}`,
    '',
    'A 또는 B로 골라줘! (나중에 언제든 바꿀 수 있어)',
  ].join('\n');
}

/**
 * 관련 토픽에 맞는 차원 선택
 * topicHint가 없으면 기본 우선순위로 반환
 */
export function getRelevantDimensions(topicHint?: string): DimensionName[] {
  if (!topicHint) {
    return [...DEFAULT_DIMENSION_PRIORITY];
  }

  const hint = topicHint.toLowerCase();
  const matched = new Set<DimensionName>();

  // 토픽 키워드 매칭
  for (const [keyword, dimensions] of Object.entries(TOPIC_DIMENSION_MAP)) {
    if (hint.includes(keyword.toLowerCase())) {
      for (const dim of dimensions) {
        matched.add(dim);
      }
    }
  }

  // 매칭된 것이 있으면 해당 차원 + 나머지 기본 우선순위
  if (matched.size > 0) {
    const result: DimensionName[] = [];
    // 매칭된 것 먼저 (순서 유지)
    for (const dim of DEFAULT_DIMENSION_PRIORITY) {
      if (matched.has(dim)) {
        result.push(dim);
      }
    }
    // 나머지 추가
    for (const dim of DEFAULT_DIMENSION_PRIORITY) {
      if (!matched.has(dim)) {
        result.push(dim);
      }
    }
    return result;
  }

  return [...DEFAULT_DIMENSION_PRIORITY];
}

/**
 * 프로필에서 아직 학습되지 않은 차원 중 가장 관련성 높은 A/B 제안 1개 생성
 * Phase 2 진입 시 자동 호출용 헬퍼
 */
export function getNextABSuggestion(
  profile: Profile,
  topicHint?: string,
): ABSuggestion | null {
  const lowConfidence = getLowConfidenceDimensions(profile);
  if (lowConfidence.length === 0) {
    return null;
  }

  const relevantOrder = getRelevantDimensions(topicHint);
  const lowConfidenceSet = new Set(lowConfidence);

  // 관련성 높은 순서대로 아직 학습 안 된 차원 찾기
  for (const dim of relevantOrder) {
    if (lowConfidenceSet.has(dim)) {
      const suggestion = generateABSuggestion(dim, profile);
      if (suggestion) {
        return suggestion;
      }
    }
  }

  return null;
}
