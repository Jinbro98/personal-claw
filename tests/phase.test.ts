import { describe, it, expect } from 'vitest';
import { evaluatePhase, shouldTransition, transitionPhase } from '../src/core/phase.js';
import { createProfile, updateDimension } from '../src/core/profile.js';
import type { Profile } from '../src/types.js';

describe('phase', () => {
  it('new profile stays in pattern phase', () => {
    const p = createProfile();
    expect(evaluatePhase(p)).toBe('pattern');
  });

  it('transitions to ab after 20 messages', () => {
    let p = createProfile();
    (p.statistics as any).total_messages = 20;
    const result = shouldTransition('pattern', p);
    expect(result.should).toBe(true);
    expect(result.targetPhase).toBe('ab');
  });

  it('does not transition with < 20 messages', () => {
    let p = createProfile();
    (p.statistics as any).total_messages = 15;
    const result = shouldTransition('pattern', p);
    expect(result.should).toBe(false);
  });

  it('transitions to bandit when 5+ dimensions have confidence >= 0.7', () => {
    let p = createProfile();
    const dims = ['response_length', 'tone', 'output_format', 'topic_depth', 'language'] as const;
    for (const d of dims) {
      p = updateDimension(p, d, 'test', 0.8);
    }
    const result = shouldTransition('ab', p);
    expect(result.should).toBe(true);
    expect(result.targetPhase).toBe('bandit');
  });

  it('transitionPhase updates profile phase and history', () => {
    let p = createProfile();
    p = transitionPhase(p, 'ab', 'enough messages');
    expect(p.phase).toBe('ab');
    expect(p.phase_state.transition_history.length).toBe(1);
    expect(p.phase_state.transition_history[0].from).toBe('pattern');
    expect(p.phase_state.transition_history[0].to).toBe('ab');
  });
});
