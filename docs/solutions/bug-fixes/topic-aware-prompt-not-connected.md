# buildTopicAwarePrompt 미연결 — v2 핵심 기능 미동작

**카테고리:** runtime-errors
**날짜:** 2026-04-08
**심각도:** P0 (치명적)
**영향:** 주제별 개인화가 시스템 프롬프트에 반영되지 않음

---

## 문제

v2에서 `buildTopicAwarePrompt`를 구현하고 import까지 했지만, 정작 `getSystemPromptAddition` hook에서는 기존 `buildFullPrompt`만 호출했다.

```typescript
// ❌ 미연결
getSystemPromptAddition: async () => {
  const profile = await loadProfile(dataDir);
  return buildFullPrompt(profile); // 주제 인식 없음
}
```

## 증상

- 주제 감지가 동작해도 프롬프트에 반영 안 됨
- 코딩 질문에서 일반 대화의 프로필이 적용됨
- `buildTopicAwarePrompt`와 `toTopicAwareProfile`은 import만 되고 미사용

## 원인

Unit 5+6에서 함수를 추가하고 import를 했지만, Unit 2에서 파이프라인 연결 시 아직 존재하지 않았던 모듈이어서 연결이 누락됨. 병렬 개발의 전형적 문제.

## 솔루션

```typescript
// ✅ 연결 완료
getSystemPromptAddition: async () => {
  const profile = await loadProfile(dataDir);
  const topicAware = toTopicAwareProfile(profile);
  const lastTopic = detectTopic(lastMessage);
  let prompt = buildTopicAwarePrompt(topicAware, lastTopic?.category);

  // A/B 제안도 시스템 프롬프트에 주입
  if (!abSuggestedThisSession && profile.phase === 'ab') {
    const suggestion = getNextABSuggestion(profile, lastTopic?.category);
    if (suggestion) {
      prompt += `\n\n## A/B Suggestion\n${generateSuggestionText(suggestion)}`;
      abSuggestedThisSession = true;
    }
  }
  return prompt;
}
```

## 교훈

1. **병렬 개발 시 인터페이스를 먼저 확정**: Unit 5가 Unit 2보다 늦게 완료되면 연결이 안 됨
2. **import ≠ 사용**: import만 하고 호출하지 않는 코드는 빌드 에러가 안 남
3. **통합 테스트 필수**: 단위 테스트만으로는 파이프라인 연결을 잡을 수 없음

## 예방

- CE:review 시 import만 되고 미사용인 코드를 자동 감지하는 규칙
- 통합 테스트에서 `getSystemPromptAddition`이 주제별 프롬프트를 반환하는지 검증

## 관련

- P0 발견: CE:review Correctness 리뷰어
- 수정: `src/index.ts` getSystemPromptAddition hook
