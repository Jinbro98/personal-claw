/**
 * prompt-builder — Profile → natural-language instruction conversion
 */

import type { Profile, PhaseType, DimensionName, TopicAwareProfile } from '../types.js';
import { DIMENSIONS } from '../utils/constants.js';

// ─── Dimension value → Korean natural-language mapping ───

const DIMENSION_LABELS: Record<DimensionName, Record<string, string>> = {
  response_length: {
    concise: '답변은 간결하게 (핵심만)',
    balanced: '답변은 적당한 길이로 (너무 짧지도 길지도 않게)',
    detailed: '답변은 상세하게 (풍부한 설명 포함)',
  },
  tone: {
    casual: '친근하고 편안한 톤으로',
    neutral: '중립적이고 객관적인 톤으로',
    formal: '격식 있고 정중한 톤으로',
    playful: '유머러스하고 가벼운 톤으로',
  },
  output_format: {
    text: '일반 텍스트로 출력',
    markdown: '마크다운 형식으로 출력',
    'code-heavy': '코드 예시를 풍부하게 포함하여 출력',
    structured: '구조화된 형식(목록, 표 등)으로 출력',
  },
  topic_depth: {
    overview: '주제를 개요 수준으로 설명',
    moderate: '주제를 적절한 깊이로 설명',
    'deep-dive': '주제를 깊이 파고들어 상세히 설명',
  },
  language: {
    ko: '한국어로 응답',
    en: '영어로 응답',
    mixed: '한국어와 영어를 적절히 혼용하여 응답',
    auto: '사용자의 언어에 맞춰 응답',
  },
  code_examples: {
    none: '코드 예시 없이 설명',
    inline: '필요시 인라인 코드 예시 포함',
    'full-scripts': '전체 스크립트 수준의 코드 예시 포함',
  },
  explanation_style: {
    'result-only': '결과만 간단히 제시',
    'step-by-step': '단계별로 설명',
    'with-reasoning': '이유와 근거를 함께 설명',
  },
  emoji_usage: {
    none: '이모지 사용하지 않음',
    minimal: '이모지는 최소한만 사용',
    moderate: '적절히 이모지 사용',
    heavy: '이모지를 적극적으로 사용',
  },
  meta_explanation: {
    skip: '메타 설명 생략',
    brief: '메타 설명은 간략하게',
    detailed: '메타 설명을 상세하게 포함',
  },
  reference_style: {
    none: '참조/출처 표시 없이',
    'inline-links': '인라인 링크로 참조 표시',
    'full-citations': '전체 출처를 인용 형식으로 표시',
  },
  question_handling: {
    'direct-answer': '질문에 직접 답변',
    'explore-first': '먼저 맥락을 탐색한 후 답변',
    socratic: '소크라티스식 질문으로 유도',
  },
  error_detail: {
    summary: '에러 요약만 제공',
    technical: '에러를 기술적으로 설명',
    'full-trace': '전체 스택 트레이스와 상세 정보 제공',
  },
};

// ─── Public API ───

/**
 * Build a natural-language personalization prompt from a Profile.
 * Each dimension is converted to a human-readable instruction.
 * Low-confidence dimensions (< 0.5) are marked as "still learning".
 */
export function buildPersonalizationPrompt(profile: Profile): string {
  const lines: string[] = [];

  lines.push('[사용자 개인화 설정]');
  lines.push('');

  for (const dimConfig of DIMENSIONS) {
    const dimName = dimConfig.name;
    const dimValue = profile.dimensions[dimName];
    if (!dimValue) continue;

    const labelMap = DIMENSION_LABELS[dimName];
    const label = labelMap[dimValue.value] ?? `${dimConfig.description}: ${dimValue.value}`;

    if (dimValue.confidence < 0.5) {
      lines.push(`- ${dimConfig.description}: ${label} (아직 학습 중, 확신도 ${Math.round(dimValue.confidence * 100)}%)`);
    } else {
      lines.push(`- ${label}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build a phase-specific instruction prompt.
 */
export function buildPhasePrompt(phase: PhaseType): string {
  switch (phase) {
    case 'pattern':
      return '사용자의 대화 패턴을 분석하고 있습니다. 자연스럽게 대화하면서 사용자의 선호를 파악해주세요.';
    case 'ab':
      return '사용자 선호를 수집 중입니다. 가끔 A/B 선택지를 제안하세요.';
    case 'bandit':
      return '사용자 선호가 수렴되었습니다. 학습된 스타일로 응답하세요.';
    default:
      return '';
  }
}

/**
 * Build the full combined prompt (personalization + phase) for injection.
 */
export function buildFullPrompt(profile: Profile): string {
  const personalization = buildPersonalizationPrompt(profile);
  const phase = buildPhasePrompt(profile.phase);

  return `${personalization}\n\n[학습 단계]\n${phase}`;
}

/**
 * Build a topic-aware prompt that overlays topic-specific dimension values
 * on top of the full personalization prompt.
 *
 * When `currentTopic` is provided and the topic profile has a dimension
 * with confidence > 0.5, that value takes precedence over the global one.
 */
export function buildTopicAwarePrompt(
  profile: TopicAwareProfile,
  currentTopic?: string,
): string {
  const lines: string[] = [];

  lines.push('[사용자 개인화 설정]');
  lines.push('');

  const topicDims = currentTopic ? profile.topic_profiles[currentTopic] : undefined;

  for (const dimConfig of DIMENSIONS) {
    const dimName = dimConfig.name;
    const globalDim = profile.dimensions[dimName];
    if (!globalDim) continue;

    let dimValue = globalDim;
    let isTopicOverride = false;

    // Topic-specific override if confidence > 0.5
    if (topicDims) {
      const topicDim = topicDims[dimName];
      if (topicDim && topicDim.confidence > 0.5) {
        dimValue = topicDim;
        isTopicOverride = true;
      }
    }

    const labelMap = DIMENSION_LABELS[dimName];
    const label = labelMap[dimValue.value] ?? `${dimConfig.description}: ${dimValue.value}`;

    if (dimValue.confidence < 0.5) {
      lines.push(`- ${dimConfig.description}: ${label} (아직 학습 중, 확신도 ${Math.round(dimValue.confidence * 100)}%)`);
    } else {
      const topicTag = isTopicOverride && currentTopic ? ` [주제: ${currentTopic}]` : '';
      lines.push(`- ${label}${topicTag}`);
    }
  }

  // Topic statistics line
  if (currentTopic && profile.topic_statistics[currentTopic]) {
    const stats = profile.topic_statistics[currentTopic];
    lines.push('');
    lines.push(`[주제 "${currentTopic}": ${stats.interactions}회 사용, 마지막 사용 ${stats.last_used}]`);
  }

  const phase = buildPhasePrompt(profile.phase);

  return `${lines.join('\n')}\n\n[학습 단계]\n${phase}`;
}
