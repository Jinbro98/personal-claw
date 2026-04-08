# A/B 제안이 사용자에게 전달되지 않음

**카테고리:** runtime-errors
**날짜:** 2026-04-08
**심각도:** P1 (높음)
**영향:** Phase 2 A/B 수집 기능 비활성화

---

## 문제

`onMessage` hook에서 A/B 제안을 생성했지만, `console.log`로만 출력했다. 플러그인 호스트가 stdout을 캡처하지 않으면 사용자에게 전달 불가.

```typescript
// ❌ 사용자에게 전달 안 됨
if (abSuggestion) {
  console.log(`[personal-claw] A/B 제안: ${abSuggestion}`);
}
```

## 원인

`onMessage` hook의 반환 타입이 `Promise<void>`이라 값을 반환할 수 없음. 다른 전달 경로를 찾아야 했는데 `console.log`로 대체함.

## 솔루션

A/B 제안을 `getSystemPromptAddition` hook에 주입하는 방식으로 변경:

```typescript
// ✅ 시스템 프롬프트에 주입 → 에이전트가 자연스럽게 제안
getSystemPromptAddition: async () => {
  // ...
  if (!abSuggestedThisSession && profile.phase === 'ab') {
    const suggestion = getNextABSuggestion(profile, topicHint);
    if (suggestion) {
      prompt += `\n\n## A/B Suggestion\n${generateSuggestionText(suggestion)}`;
      abSuggestedThisSession = true;
    }
  }
  return prompt;
}
```

## 이유

플러그인 아키텍처에서 `getSystemPromptAddition`은 에이전트의 시스템 프롬프트에 자동으로 포함됨. 이를 활용하면 A/B 제안이 에이전트의 응답에 자연스럽게 녹아듦.

## 교훈

1. **훅 타입 이해가 먼저**: hook의 반환 타입을 먼저 확인하고 전달 방식을 결정
2. **console.log ≠ 사용자 전달**: 서버 환경에서는 stdout이 보이지 않을 수 있음
3. **시스템 프롬프트가 최강력 도구**: 플러그인이 에이전트 동작을 제어하는 가장 효과적 방법

## 관련

- P1 발견: CE:review Correctness 리뷰어
- 수정: `src/index.ts` getSystemPromptAddition hook
