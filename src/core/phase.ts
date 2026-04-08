/**
 * personal-claw — Phase Transition Logic
 */

import type {
  DimensionName,
  PhaseState,
  PhaseType,
  Profile,
} from '../types.js';
import { PHASE_THRESHOLDS } from '../utils/constants.js';

// ─── Phase Descriptions ───

const PHASE_INFO: Record<PhaseType, { name: string; description: string }> = {
  pattern: {
    name: 'Pattern Matching',
    description:
      '사용자의 패턴을 분석하는 초기 단계. 명시적 지시와 긍정/부정 신호를 관찰하여 기본 선호도를 수집합니다.',
  },
  ab: {
    name: 'A/B Testing',
    description:
      '두 가지 옵션을 번갈아 시도하여 사용자 반응을 비교 분석합니다. 각 차원의 선호값을 탐색합니다.',
  },
  bandit: {
    name: 'Thompson Sampling (Bandit)',
    description:
      '학습된 선호도 기반으로 최적 스타일을 동적 선택합니다. 탐색과 활용의 균형을 자동 조절합니다.',
  },
};

// ─── Evaluate Phase ───

/**
 * 현재 데이터 기반 최적 Phase 판단
 */
export function evaluatePhase(profile: Profile): PhaseType {
  const { phase_state, dimensions, statistics } = profile;

  // 이미 bandit이면 유지
  if (phase_state.current === 'bandit') {
    return 'bandit';
  }

  // pattern → ab 전환 조건
  const abThreshold = PHASE_THRESHOLDS.pattern_to_ab;
  if (phase_state.current === 'pattern') {
    if (
      statistics.total_messages >= abThreshold.messages_min ||
      statistics.total_sessions >= abThreshold.sessions_min
    ) {
      return 'ab';
    }
    return 'pattern';
  }

  // ab → bandit 전환 조건
  const banditThreshold = PHASE_THRESHOLDS.ab_to_bandit;
  const dimsAboveThreshold = countDimensionsAboveConfidence(
    dimensions,
    banditThreshold.confidence_threshold,
  );

  if (
    dimsAboveThreshold >= banditThreshold.dimensions_above_threshold_min
  ) {
    return 'bandit';
  }

  return 'ab';
}

// ─── Should Transition ───

/**
 * Phase 전환 여부 판단
 */
export function shouldTransition(
  currentPhase: PhaseType,
  profile: Profile,
): { should: boolean; targetPhase: PhaseType; reason: string } {
  // 이미 최상위 단계
  if (currentPhase === 'bandit') {
    return {
      should: false,
      targetPhase: 'bandit',
      reason: '이미 최상위 Phase입니다.',
    };
  }

  const { statistics, dimensions } = profile;

  // pattern → ab
  if (currentPhase === 'pattern') {
    const threshold = PHASE_THRESHOLDS.pattern_to_ab;

    if (statistics.total_messages >= threshold.messages_min) {
      return {
        should: true,
        targetPhase: 'ab',
        reason: `메시지 ${statistics.total_messages}개 도달 (기준: ${threshold.messages_min})`,
      };
    }

    if (statistics.total_sessions >= threshold.sessions_min) {
      return {
        should: true,
        targetPhase: 'ab',
        reason: `세션 ${statistics.total_sessions}회 도달 (기준: ${threshold.sessions_min})`,
      };
    }

    return {
      should: false,
      targetPhase: 'pattern',
      reason: `아직 전환 조건 미달 (메시지: ${statistics.total_messages}/${threshold.messages_min}, 세션: ${statistics.total_sessions}/${threshold.sessions_min})`,
    };
  }

  // ab → bandit
  if (currentPhase === 'ab') {
    const threshold = PHASE_THRESHOLDS.ab_to_bandit;
    const dimsAbove = countDimensionsAboveConfidence(
      dimensions,
      threshold.confidence_threshold,
    );

    if (dimsAbove >= threshold.dimensions_above_threshold_min) {
      return {
        should: true,
        targetPhase: 'bandit',
        reason: `confidence ${threshold.confidence_threshold} 이상인 차원 ${dimsAbove}개 (기준: ${threshold.dimensions_above_threshold_min})`,
      };
    }

    return {
      should: false,
      targetPhase: 'ab',
      reason: `충분한 confidence 차원 부족 (${dimsAbove}/${threshold.dimensions_above_threshold_min})`,
    };
  }

  // 알 수 없는 현재 Phase
  return {
    should: false,
    targetPhase: currentPhase,
    reason: '현재 Phase를 알 수 없습니다.',
  };
}

// ─── Transition Phase ───

/**
 * Phase 전환 + history 기록
 */
export function transitionPhase(
  profile: Profile,
  targetPhase: PhaseType,
  reason: string,
): Profile {
  const now = new Date().toISOString();

  const updatedProfile = structuredClone(profile);

  // 현재 Phase와 같으면 변경 없이 반환
  if (updatedProfile.phase === targetPhase) {
    return updatedProfile;
  }

  const fromPhase = updatedProfile.phase;

  // phase_state 업데이트
  const newPhaseState: PhaseState = {
    ...updatedProfile.phase_state,
    current: targetPhase,
    transition_history: [
      ...updatedProfile.phase_state.transition_history,
      {
        from: fromPhase,
        to: targetPhase,
        timestamp: now,
        reason,
      },
    ],
  };

  updatedProfile.phase = targetPhase;
  updatedProfile.phase_state = newPhaseState;
  updatedProfile.updated_at = now;

  return updatedProfile;
}

// ─── Phase Info ───

/**
 * Phase 설명 반환
 */
export function getPhaseInfo(phase: PhaseType): {
  name: string;
  description: string;
} {
  return PHASE_INFO[phase];
}

// ─── Helpers ───

/**
 * confidence가 threshold 이상인 차원 개수
 */
function countDimensionsAboveConfidence(
  dimensions: Record<DimensionName, { confidence: number; value: string; last_updated: string }>,
  threshold: number,
): number {
  let count = 0;
  for (const key of Object.keys(dimensions)) {
    const dim = dimensions[key as DimensionName];
    if (dim && dim.confidence >= threshold) {
      count++;
    }
  }
  return count;
}
