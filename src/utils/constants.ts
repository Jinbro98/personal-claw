import type { DimensionConfig, PhaseThreshold, SignalPattern, SignalType } from '../types.js';

// ─── Personalization Dimensions ───

export const DIMENSIONS: DimensionConfig[] = [
  {
    name: 'response_length',
    values: ['concise', 'balanced', 'detailed'],
    default_value: 'balanced',
    description: '응답 길이',
  },
  {
    name: 'tone',
    values: ['casual', 'neutral', 'formal', 'playful'],
    default_value: 'neutral',
    description: '응답 톤',
  },
  {
    name: 'output_format',
    values: ['text', 'markdown', 'code-heavy', 'structured'],
    default_value: 'markdown',
    description: '출력 형식',
  },
  {
    name: 'topic_depth',
    values: ['overview', 'moderate', 'deep-dive'],
    default_value: 'moderate',
    description: '주제 깊이',
  },
  {
    name: 'language',
    values: ['ko', 'en', 'mixed', 'auto'],
    default_value: 'auto',
    description: '선호 언어',
  },
  {
    name: 'code_examples',
    values: ['none', 'inline', 'full-scripts'],
    default_value: 'inline',
    description: '코드 예시 포함',
  },
  {
    name: 'explanation_style',
    values: ['result-only', 'step-by-step', 'with-reasoning'],
    default_value: 'step-by-step',
    description: '설명 방식',
  },
  {
    name: 'emoji_usage',
    values: ['none', 'minimal', 'moderate', 'heavy'],
    default_value: 'minimal',
    description: '이모지 사용',
  },
  {
    name: 'meta_explanation',
    values: ['skip', 'brief', 'detailed'],
    default_value: 'brief',
    description: '메타 설명 수준',
  },
  {
    name: 'reference_style',
    values: ['none', 'inline-links', 'full-citations'],
    default_value: 'inline-links',
    description: '참조/출처 스타일',
  },
  {
    name: 'question_handling',
    values: ['direct-answer', 'explore-first', 'socratic'],
    default_value: 'direct-answer',
    description: '질문 응답 스타일',
  },
  {
    name: 'error_detail',
    values: ['summary', 'technical', 'full-trace'],
    default_value: 'technical',
    description: '에러 설명 수준',
  },
];

// ─── Phase Thresholds ───

export const PHASE_THRESHOLDS: Record<string, PhaseThreshold> = {
  pattern_to_ab: {
    messages_min: 20,
    sessions_min: 3,
    confidence_threshold: 0,
    dimensions_above_threshold_min: 0,
  },
  ab_to_bandit: {
    messages_min: 0,
    sessions_min: 0,
    confidence_threshold: 0.7,
    dimensions_above_threshold_min: 5,
  },
};

// ─── Signal Weight Defaults ───

export const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  explicit_positive: 0.5,
  explicit_negative: 0.5,
  explicit_directive: 0.8,
  re_question: 0.4,
  conversation_length: 0.3,
  follow_up: 0.3,
};

// ─── Signal Reward Defaults ───

export const SIGNAL_REWARDS: Record<SignalType, number> = {
  explicit_positive: 1.0,
  explicit_negative: -1.0,
  explicit_directive: 0.8,
  re_question: -0.5,
  conversation_length: 0.3,
  follow_up: 0.3,
};

// ─── Bandit Defaults ───

export const BANDIT_DEFAULT_ALPHA = 1.0;
export const BANDIT_DEFAULT_BETA = 1.0;
export const BANDIT_EXPLORATION_DECAY = 0.95; // exploration rate multiplier per session

// ─── File Paths (relative to data dir) ───

export const DATA_FILES = {
  profile: 'profile.json',
  signals: 'signals.jsonl',
  bandit_state: 'bandit-state.json',
  ab_history: 'ab-history.json',
} as const;

// ─── Profile Version ───

export const PROFILE_VERSION = 1;

// ─── Phase Transition Cooldown ───

export const PHASE_TRANSITION_COOLDOWN_MS = 60_000; // 1 minute between transitions

// ─── Follow-up Window ───

export const FOLLOW_UP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
