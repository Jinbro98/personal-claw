# Immutable 함수 반환값 무시 — 학습 파이프라인이 no-op

**카테고리:** runtime-errors
**날짜:** 2026-04-08
**심각도:** P0 (치명적)
**영향:** 학습 기능 전체 비활성화

---

## 문제

`index.ts`의 `onMessage` 핸들러에서 `updateDimension`, `incrementStats`, `transitionPhase` 함수가 **불변 패턴**(원본 변경 없이 새 객체 반환)으로 구현되어 있지만, 반환값을 변수에 재할당하지 않았다.

```typescript
// ❌ 잘못된 코드
const profile = await loadProfile(dataDir);
updateDimension(profile, 'response_length', 'concise', 0.9); // 반환값 버림
incrementStats(profile, 'total_messages');                     // 반환값 버림
transitionPhase(profile, 'ab', 'reason');                      // 반환값 버림
await saveProfile(dataDir, profile); // 원본만 저장 → 변경사항 없음
```

## 증상

- 대화해도 프로필이 업데이트되지 않음
- Phase 전환이 절대 일어나지 않음
- `personal-claw-status`가 항상 초기값만 표시
- 테스트는 통과함 (테스트가 직접 함수를 호출해서 반환값을 검증하므로)

## 원인

불변 함수를 **mutable 패턴**으로 사용한 것. 함수 설계는 "새 Profile 반환"인데, 호출 코드는 "원본을 변경하는 절차"로 기대하고 작성.

## 솔루션

```typescript
// ✅ 올바른 코드
let profile = await loadProfile(dataDir);
profile = updateDimension(profile, 'response_length', 'concise', 0.9);
profile = incrementStats(profile, 'total_messages');

const transition = shouldTransition(profile.phase, profile);
if (transition.should) {
  profile = transitionPhase(profile, transition.targetPhase, transition.reason);
}

await saveProfile(dataDir, profile);
```

`const` → `let`으로 변경하고, 각 함수의 반환값을 `profile`에 재할당.

## 이유

불변 패턴은 사이드 이펙트를 방지하고 테스트를 용이하게 하지만, 호출자가 반환값을 사용해야 한다. TypeScript가 이를 컴파일 타임에 잡아주지 않는다 (반환값을 무시하는 것은 유효한 문법).

## 예방

1. 불변 함수는 `_` 접두사 없이 항상 반환값 사용 강제
2. ESLint 규칙: `@typescript-eslint/no-floating-promises` 또는 커스텀 규칙
3. 함수 네이밍 컨벤션: `updateDimension` → `withUpdatedDimension` (불변성 명시)
4. 통합 테스트 추가: `onMessage` hook이 실제로 프로필을 변경하는지 검증

## 관련

- P0 발견: CE:review Correctness 리뷰어
- 수정: `src/index.ts` lines 63-91
