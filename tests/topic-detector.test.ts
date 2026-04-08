import { describe, it, expect } from 'vitest';
import {
  detectTopic,
  detectTopicFromMessages,
} from '../src/core/topic-detector.js';

describe('detectTopic', () => {
  it('detects coding from "코드 짜줘"', () => {
    const result = detectTopic('코드 짜줘');
    expect(result.category).toBe('coding');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects analysis from "데이터 분석해줘"', () => {
    const result = detectTopic('데이터 분석해줘');
    expect(result.category).toBe('analysis');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects learning from "이유를 설명해줘"', () => {
    const result = detectTopic('이유를 설명해줘');
    expect(result.category).toBe('learning');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects planning from "일정을 짜줘"', () => {
    const result = detectTopic('일정을 짜줘');
    expect(result.category).toBe('planning');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('detects general from "안녕"', () => {
    const result = detectTopic('안녕');
    expect(result.category).toBe('general');
    expect(result.confidence).toBe(0);
  });

  it('returns matched keywords', () => {
    const result = detectTopic('코드 함수 에러 debug');
    expect(result.category).toBe('coding');
    expect(result.keywords).toContain('코드');
    expect(result.keywords).toContain('함수');
    expect(result.keywords).toContain('에러');
    expect(result.keywords).toContain('debug');
  });
});

describe('detectTopicFromMessages', () => {
  it('returns general for empty messages', () => {
    const result = detectTopicFromMessages([]);
    expect(result.category).toBe('general');
    expect(result.confidence).toBe(0);
  });

  it('classifies multiple messages by majority', () => {
    const messages = [
      '코드 작성해줘',
      '함수 만들어줘',
      '디버깅 도와줘',
      '오늘 날씨 어때',
    ];
    const result = detectTopicFromMessages(messages);
    expect(result.category).toBe('coding');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('accumulates keywords across messages', () => {
    const messages = [
      '데이터 분석해줘',
      '통계 비교해줘',
    ];
    const result = detectTopicFromMessages(messages);
    expect(result.category).toBe('analysis');
    expect(result.keywords.length).toBeGreaterThan(0);
  });

  it('handles mixed topics', () => {
    const messages = [
      '코드 작성해줘',
      '데이터 분석해줘',
    ];
    const result = detectTopicFromMessages(messages);
    // both have count 1, so whichever appears first wins (coding)
    expect(['coding', 'analysis']).toContain(result.category);
  });
});
