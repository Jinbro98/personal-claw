/**
 * status-tool — personal-claw status formatting
 */

import type { Profile, DimensionName, TopicAwareProfile } from '../types.js';
import { DIMENSIONS } from '../utils/constants.js';

// ─── Phase display names ───

const PHASE_DISPLAY: Record<string, string> = {
  pattern: '패턴 분석 (Phase 1)',
  ab: 'A/B 테스트 (Phase 2)',
  bandit: 'Bandit 최적화 (Phase 3)',
};

// ─── Confidence bar ───

function confidenceBar(confidence: number): string {
  const filled = Math.round(confidence * 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ─── Public API ───

/**
 * Format a profile as a human-readable status report.
 * Accepts both Profile and TopicAwareProfile (backward-compatible).
 */
export function formatStatus(profile: Profile | TopicAwareProfile): string {
  const lines: string[] = [];

  lines.push('=== personal-claw 상태 ===');
  lines.push('');

  // Phase
  const phaseDisplay = PHASE_DISPLAY[profile.phase] ?? profile.phase;
  lines.push(`▸ 학습 단계: ${phaseDisplay}`);
  lines.push('');

  // Overall statistics
  lines.push('▸ 전체 통계:');
  lines.push(`  - 총 세션: ${profile.statistics.total_sessions}`);
  lines.push(`  - 총 메시지: ${profile.statistics.total_messages}`);
  lines.push(`  - 긍정 신호: ${profile.statistics.positive_signals}`);
  lines.push(`  - 부정 신호: ${profile.statistics.negative_signals}`);
  lines.push(`  - 명시적 지시: ${profile.statistics.explicit_directives}`);
  lines.push(`  - 마지막 활동: ${profile.statistics.last_active}`);
  lines.push('');

  // Phase state
  lines.push('▸ Phase 진행:');
  lines.push(`  - 메시지: ${profile.phase_state.total_messages}`);
  lines.push(`  - 세션: ${profile.phase_state.total_sessions}`);
  lines.push(`  - 임계값 이상 차원: ${profile.phase_state.dimensions_above_threshold}`);
  lines.push('');

  // Dimensions
  lines.push('▸ 학습된 선호 (차원별):');
  lines.push('');

  for (const dimConfig of DIMENSIONS) {
    const dimName = dimConfig.name;
    const dimValue = profile.dimensions[dimName];
    if (!dimValue) continue;

    const confidencePct = Math.round(dimValue.confidence * 100);
    const bar = confidenceBar(dimValue.confidence);
    const status = dimValue.confidence < 0.5 ? ' [학습 중]' : '';

    lines.push(`  ${dimConfig.description} (${dimName})`);
    lines.push(`    값: ${dimValue.value}${status}`);
    lines.push(`    확신: ${bar} ${confidencePct}%`);
    lines.push(`    업데이트: ${dimValue.last_updated}`);
    lines.push('');
  }

  // Topic profiles (only for TopicAwareProfile)
  const topicProfile = profile as TopicAwareProfile;
  if (topicProfile.topic_profiles && Object.keys(topicProfile.topic_profiles).length > 0) {
    lines.push('▸ 주제별 프로필:');
    lines.push('');

    for (const [topic, dims] of Object.entries(topicProfile.topic_profiles)) {
      const stats = topicProfile.topic_statistics?.[topic];
      const statsStr = stats ? ` (${stats.interactions}회 사용)` : '';
      lines.push(`  [${topic}]${statsStr}`);

      for (const dimConfig of DIMENSIONS) {
        const dimValue = dims?.[dimConfig.name];
        if (!dimValue) continue;

        const confidencePct = Math.round(dimValue.confidence * 100);
        const bar = confidenceBar(dimValue.confidence);
        const status = dimValue.confidence < 0.5 ? ' [학습 중]' : '';

        lines.push(`    ${dimConfig.description}: ${dimValue.value}${status} ${bar} ${confidencePct}%`);
      }
      lines.push('');
    }
  }

  // Created/Updated
  lines.push('▸ 생성일: ' + profile.created_at);
  lines.push('▸ 수정일: ' + profile.updated_at);

  return lines.join('\n');
}
