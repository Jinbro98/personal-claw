import { describe, it, expect } from 'vitest';
import { createProfile, updateDimension, getDimensionValue, incrementStats } from '../src/core/profile.js';

describe('profile', () => {
  it('creates a valid profile with all dimensions', () => {
    const p = createProfile();
    expect(p.version).toBe(1);
    expect(p.phase).toBe('pattern');
    expect(Object.keys(p.dimensions)).toHaveLength(12);
    expect(p.statistics.total_messages).toBe(0);
  });

  it('updates a dimension immutably', () => {
    const p = createProfile();
    const updated = updateDimension(p, 'response_length', 'concise', 0.9);
    expect(updated.dimensions.response_length.value).toBe('concise');
    expect(updated.dimensions.response_length.confidence).toBe(0.9);
    expect(p.dimensions.response_length.value).toBe('balanced'); // original unchanged
  });

  it('gets dimension value', () => {
    const p = createProfile();
    expect(getDimensionValue(p, 'tone')).toBe('neutral');
  });

  it('increments stats', () => {
    const p = createProfile();
    const updated = incrementStats(p, 'total_messages');
    expect(updated.statistics.total_messages).toBe(1);
    expect(p.statistics.total_messages).toBe(0);
  });
});
