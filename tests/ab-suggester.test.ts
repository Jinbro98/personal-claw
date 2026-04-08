import { describe, it, expect } from 'vitest';
import {
  getLowConfidenceDimensions,
  generateABSuggestion,
  generateSuggestionText,
  getNextABSuggestion,
} from '../src/core/ab-suggester.js';
import { createProfile } from '../src/core/profile.js';
import type { Profile, DimensionName } from '../src/types.js';

// Helper: set dimension confidence on a profile
function setConfidence(
  profile: Profile,
  dim: DimensionName,
  confidence: number,
): Profile {
  return {
    ...profile,
    dimensions: {
      ...profile.dimensions,
      [dim]: {
        ...profile.dimensions[dim],
        confidence,
      },
    },
  };
}

describe('getLowConfidenceDimensions', () => {
  it('returns all dimensions when profile is fresh (confidence 0)', () => {
    const profile = createProfile();
    const low = getLowConfidenceDimensions(profile);
    expect(low).toHaveLength(12); // all 12 dimensions
  });

  it('returns only dimensions below threshold', () => {
    let profile = createProfile();
    profile = setConfidence(profile, 'response_length', 0.8);
    profile = setConfidence(profile, 'tone', 0.6);

    const low = getLowConfidenceDimensions(profile, 0.5);
    expect(low).not.toContain('response_length');
    expect(low).not.toContain('tone');
    expect(low.length).toBe(10);
  });

  it('returns empty array when all dimensions have high confidence', () => {
    let profile = createProfile();
    for (let i = 0; i < 12; i++) {
      const dim = Object.keys(profile.dimensions)[i] as DimensionName;
      profile = setConfidence(profile, dim, 0.9);
    }
    expect(getLowConfidenceDimensions(profile)).toEqual([]);
  });
});

describe('generateSuggestionText', () => {
  it('generates formatted text with question and options', () => {
    const suggestion = {
      dimension: 'response_length' as DimensionName,
      question: '답변 길이, 어떤 게 더 편해?',
      option_a: '간결하게 (핵심만 쏙쏙)',
      option_b: '자세하게 ( подробн히 설명)',
      value_a: 'concise',
      value_b: 'detailed',
    };

    const text = generateSuggestionText(suggestion);
    expect(text).toContain('답변 길이');
    expect(text).toContain('A) 간결하게');
    expect(text).toContain('B) 자세하게');
    expect(text).toContain('A 또는 B');
  });
});

describe('generateABSuggestion', () => {
  it('returns a suggestion for a valid dimension', () => {
    const result = generateABSuggestion('response_length');
    expect(result).not.toBeNull();
    expect(result!.dimension).toBe('response_length');
    expect(result!.question).toBeTruthy();
    expect(result!.option_a).toBeTruthy();
    expect(result!.option_b).toBeTruthy();
  });

  it('returns null when dimension confidence is >= 0.7', () => {
    let profile = createProfile();
    profile = setConfidence(profile, 'response_length', 0.8);
    const result = generateABSuggestion('response_length', profile);
    expect(result).toBeNull();
  });

  it('returns suggestion when confidence is below 0.7', () => {
    let profile = createProfile();
    profile = setConfidence(profile, 'response_length', 0.5);
    const result = generateABSuggestion('response_length', profile);
    expect(result).not.toBeNull();
  });
});

describe('getNextABSuggestion', () => {
  it('returns a suggestion from low-confidence profile', () => {
    const profile = createProfile();
    const result = getNextABSuggestion(profile);
    expect(result).not.toBeNull();
    expect(result!.dimension).toBeTruthy();
  });

  it('returns null when all dimensions have high confidence', () => {
    let profile = createProfile();
    for (let i = 0; i < 12; i++) {
      const dim = Object.keys(profile.dimensions)[i] as DimensionName;
      profile = setConfidence(profile, dim, 0.9);
    }
    expect(getNextABSuggestion(profile)).toBeNull();
  });

  it('prefers topic-relevant dimensions', () => {
    const profile = createProfile();
    const result = getNextABSuggestion(profile, '코딩');
    expect(result).not.toBeNull();
    // code_examples, explanation_style, output_format should be prioritized
    expect(
      ['code_examples', 'explanation_style', 'output_format', 'response_length']
    ).toContain(result!.dimension);
  });
});
