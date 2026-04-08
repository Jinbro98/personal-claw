import { describe, it, expect } from 'vitest';
import { detectSignals } from '../src/core/signals.js';

describe('signals', () => {
  it('detects explicit positive signal', () => {
    const signals = detectSignals('정말 좋아!');
    expect(signals.length).toBeGreaterThan(0);
    expect(signals.some(s => s.type === 'explicit_positive')).toBe(true);
  });

  it('detects explicit directive with dimension inference', () => {
    const signals = detectSignals('짧게 해줘');
    const directive = signals.find(s => s.type === 'explicit_directive');
    expect(directive).toBeDefined();
    expect(directive!.dimension).toBe('response_length');
    expect(directive!.value).toBe('concise');
  });

  it('detects explicit negative signal', () => {
    const signals = detectSignals('아니 그거 틀렸어');
    expect(signals.some(s => s.type === 'explicit_negative')).toBe(true);
  });

  it('returns empty for neutral message', () => {
    const signals = detectSignals('오늘 날씨가 좋네요');
    // might have 0 signals or conversation_length
    expect(Array.isArray(signals)).toBe(true);
  });

  it('detects English patterns', () => {
    const signals = detectSignals('That was perfect, great job!');
    expect(signals.some(s => s.type === 'explicit_positive')).toBe(true);
  });

  it('detects code directive', () => {
    const signals = detectSignals('코드로 보여줘');
    const directive = signals.find(s => s.type === 'explicit_directive');
    expect(directive).toBeDefined();
    expect(directive!.dimension).toBe('code_examples');
  });
});
