/**
 * personal-claw — Core type definitions
 */

// ─── Personalization Dimensions ───

export type DimensionName =
  | 'response_length'
  | 'tone'
  | 'output_format'
  | 'topic_depth'
  | 'language'
  | 'code_examples'
  | 'explanation_style'
  | 'emoji_usage'
  | 'meta_explanation'
  | 'reference_style'
  | 'question_handling'
  | 'error_detail';

export interface DimensionValue {
  value: string;
  confidence: number; // 0.0 ~ 1.0
  last_updated: string; // ISO 8601
}

export type DimensionMap = Record<DimensionName, DimensionValue>;

// ─── Bandit (Thompson Sampling) ───

export interface BanditArm {
  alpha: number; // successes (Beta α)
  beta: number;  // failures (Beta β)
  pulls: number; // total pulls
}

export type BanditArms = Record<string, BanditArm>; // arm name → arm state
export type BanditState = Record<DimensionName, BanditArms>;

// ─── Learning Signals ───

export type SignalType =
  | 'explicit_positive'    // 칭찬/감사
  | 'explicit_negative'    // 불만/부정
  | 'explicit_directive'   // 명시적 지시 ("짧게", "자세히")
  | 're_question'          // 재질문
  | 'conversation_length'  // 대화 길이
  | 'follow_up';           // 추가 대화

export interface Signal {
  type: SignalType;
  timestamp: string;       // ISO 8601
  message: string;         // 원본 메시지
  matched_pattern?: string; // 매칭된 정규식
  dimension?: DimensionName; // 영향받는 차원
  value?: string;          // 해당 차원 값
  reward: number;          // -1.0 ~ 1.0
}

export interface SignalLog {
  signals: Signal[];
}

// ─── A/B Selection History ───

export interface ABSelection {
  timestamp: string;
  dimension: DimensionName;
  option_a: string;
  option_b: string;
  selected: string;
}

// ─── Phase ───

export type PhaseType = 'pattern' | 'ab' | 'bandit';

export interface PhaseState {
  current: PhaseType;
  total_messages: number;
  total_sessions: number;
  dimensions_above_threshold: number;
  transition_history: {
    from: PhaseType;
    to: PhaseType;
    timestamp: string;
    reason: string;
  }[];
}

// ─── Statistics ───

export interface ProfileStats {
  total_sessions: number;
  total_messages: number;
  positive_signals: number;
  negative_signals: number;
  explicit_directives: number;
  last_active: string; // ISO 8601
}

// ─── Profile (main data structure) ───

export interface Profile {
  version: number;
  phase: PhaseType;
  created_at: string;
  updated_at: string;
  dimensions: DimensionMap;
  bandit_arms: BanditState;
  phase_state: PhaseState;
  statistics: ProfileStats;
}

// ─── Topic-Aware Profile ───

export type TopicCategory = 'coding' | 'analysis' | 'creative' | 'general' | 'learning' | 'planning';

export interface TopicAwareProfile extends Profile {
  topic_profiles: Record<string, Partial<Record<DimensionName, DimensionValue>>>;
  topic_statistics: Record<string, { interactions: number; last_used: string }>;
}

// ─── Session State ───

export interface SessionStateSnapshot {
  messages: string[];
  lastMessageTime: string | null; // ISO 8601
  messageCount: number;
  assistantMessageCount: number;
}

// ─── Signal Patterns (for regex matching) ───

export interface SignalPattern {
  type: SignalType;
  patterns: RegExp[];
  reward: number;
  dimension?: DimensionName;
  value?: string;
}

// ─── Constants types ───

export interface DimensionConfig {
  name: DimensionName;
  values: string[];
  default_value: string;
  description: string;
}

export interface PhaseThreshold {
  messages_min: number;
  sessions_min: number;
  confidence_threshold: number;
  dimensions_above_threshold_min: number;
}

// ─── OpenClaw Plugin API ───

export interface PluginContext {
  getDataDir(): string;
  getWorkspaceDir(): string;
  getConfig(): Record<string, unknown>;
}

export interface PluginTool {
  name: string;
  description: string;
  execute: (...args: any[]) => Promise<string>;
}

export interface PluginHooks {
  onMessage?: (message: string, context: any) => Promise<void>;
  onSessionEnd?: (context: any) => Promise<void>;
  getSystemPromptAddition?: () => Promise<string>;
}

export interface PluginResult {
  name: string;
  version: string;
  description: string;
  tools: PluginTool[];
  hooks?: PluginHooks;
}
