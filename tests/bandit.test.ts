import { describe, it, expect } from 'vitest';
import { initBanditState, updateArm, selectBestArm, getArmConfidence, sampleArm } from '../src/core/bandit.js';

describe('bandit', () => {
  it('initializes state with all dimensions', () => {
    const state = initBanditState();
    expect(Object.keys(state)).toHaveLength(12);
    expect(state.response_length.concise.alpha).toBe(1);
    expect(state.response_length.concise.beta).toBe(1);
  });

  it('updates arm with positive reward', () => {
    const state = initBanditState();
    const arms = updateArm(state.response_length, 'concise', 1.0);
    expect(arms.concise.alpha).toBe(2); // 1 + 1
    expect(arms.concise.beta).toBe(1);
    expect(arms.concise.pulls).toBe(1);
  });

  it('updates arm with negative reward', () => {
    const state = initBanditState();
    const arms = updateArm(state.response_length, 'detailed', -0.5);
    expect(arms.detailed.alpha).toBe(1);
    expect(arms.detailed.beta).toBe(1.5); // 1 + 0.5
  });

  it('selectBestArm returns a valid arm name', () => {
    const state = initBanditState();
    const arm = selectBestArm(state.response_length);
    expect(['concise', 'balanced', 'detailed']).toContain(arm);
  });

  it('getArmConfidence returns value between 0 and 1', () => {
    const state = initBanditState();
    const confidence = getArmConfidence(state.response_length, 'concise');
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('sampleArm returns a number', () => {
    const arm = { alpha: 2, beta: 3, pulls: 5 };
    const sample = sampleArm(arm);
    expect(typeof sample).toBe('number');
    expect(sample).toBeGreaterThanOrEqual(0);
    expect(sample).toBeLessThanOrEqual(1);
  });
});
