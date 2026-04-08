/**
 * personal-claw — Thompson Sampling Bandit Engine
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  BanditArm,
  BanditArms,
  BanditState,
  DimensionName,
} from '../types.js';
import {
  BANDIT_DEFAULT_ALPHA,
  BANDIT_DEFAULT_BETA,
  DATA_FILES,
  DIMENSIONS,
} from '../utils/constants.js';

// ─── Initialize Bandit State ───

/**
 * 모든 차원의 모든 값을 Arm으로 초기화 (alpha=1, beta=1)
 */
export function initBanditState(): BanditState {
  const state: BanditState = {} as BanditState;

  for (const dim of DIMENSIONS) {
    const arms: BanditArms = {};
    for (const value of dim.values) {
      arms[value] = {
        alpha: BANDIT_DEFAULT_ALPHA,
        beta: BANDIT_DEFAULT_BETA,
        pulls: 0,
      };
    }
    state[dim.name] = arms;
  }

  return state;
}

// ─── Sampling ───

/**
 * Beta 분포 샘플링 (gamma 분포 근사 사용)
 * Beta(α, β) = Gamma(α, 1) / (Gamma(α, 1) + Gamma(β, 1))
 */
export function sampleArm(arm: BanditArm): number {
  const gammaAlpha = sampleGamma(arm.alpha);
  const gammaBeta = sampleGamma(arm.beta);
  return gammaAlpha / (gammaAlpha + gammaBeta);
}

/**
 * Gamma(k, 1) 샘플링 — Marsaglia & Tsang 방법
 * k < 1일 경우: Gamma(k+1,1) * U^(1/k) 변환 사용
 */
function sampleGamma(k: number): number {
  if (k < 1) {
    const d = k + 1.0 - 1.0 / 3.0;
    const c = 1.0 / Math.sqrt(9.0 * d);
    // k < 1이면 k+1에서 샘플링 후 변환
    return sampleGamma(k + 1) * Math.pow(Math.random(), 1.0 / k);
  }

  // Marsaglia & Tsang method for k >= 1
  const d = k - 1.0 / 3.0;
  const c = 1.0 / Math.sqrt(9.0 * d);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let x: number;
    let v: number;

    do {
      x = randomNormal();
      v = 1.0 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1.0 - 0.0331 * x * x * x * x) {
      return d * v;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1.0 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/** Box-Muller 정규 분포 난수 */
function randomNormal(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ─── Arm Selection ───

/**
 * 각 Arm을 샘플링해서 가장 높은 값을 반환
 */
export function selectBestArm(arms: BanditArms): string {
  let bestName = '';
  let bestValue = -Infinity;

  for (const [name, arm] of Object.entries(arms)) {
    const value = sampleArm(arm);
    if (value > bestValue) {
      bestValue = value;
      bestName = name;
    }
  }

  return bestName;
}

/**
 * 해당 Arm의 확신도 (alpha / (alpha + beta))
 */
export function getArmConfidence(arms: BanditArms, armName: string): number {
  const arm = arms[armName];
  if (!arm) return 0;
  return arm.alpha / (arm.alpha + arm.beta);
}

// ─── Arm Update ───

/**
 * 보상 기반 Alpha/Beta 업데이트
 * reward > 0이면 alpha += reward, 아니면 beta += abs(reward)
 */
export function updateArm(
  arms: BanditArms,
  armName: string,
  reward: number,
): BanditArms {
  const updated = structuredClone(arms);
  const arm = updated[armName];

  if (!arm) {
    throw new Error(`Arm "${armName}" not found in bandit arms`);
  }

  if (reward > 0) {
    arm.alpha += reward;
  } else {
    arm.beta += Math.abs(reward);
  }

  arm.pulls += 1;
  return updated;
}

// ─── Dimension-level Selection ───

/**
 * 해당 차원의 최적 Arm 선택 (Thompson Sampling)
 */
export function selectStyle(
  banditState: BanditState,
  dimension: DimensionName,
): string {
  const arms = banditState[dimension];
  if (!arms || Object.keys(arms).length === 0) {
    throw new Error(`No arms found for dimension "${dimension}"`);
  }
  return selectBestArm(arms);
}

// ─── Persistence ───

/**
 * 파일에서 BanditState 로드, 없으면 init
 */
export async function loadBanditState(dataDir: string): Promise<BanditState> {
  const filePath = join(dataDir, DATA_FILES.bandit_state);

  try {
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as BanditState;

    // 병합: 새로 추가된 차원/값이 있으면 기본값으로 채움
    const defaults = initBanditState();
    const merged: BanditState = {} as BanditState;

    for (const dim of DIMENSIONS) {
      const loaded = parsed[dim.name] ?? {};
      const arms: BanditArms = {};
      for (const value of dim.values) {
        arms[value] = loaded[value] ?? defaults[dim.name][value];
      }
      merged[dim.name] = arms;
    }

    return merged;
  } catch {
    return initBanditState();
  }
}

/**
 * BanditState를 파일에 저장
 */
export async function saveBanditState(
  dataDir: string,
  state: BanditState,
): Promise<void> {
  const filePath = join(dataDir, DATA_FILES.bandit_state);
  await writeFile(filePath, JSON.stringify(state, null, 2), 'utf-8');
}
