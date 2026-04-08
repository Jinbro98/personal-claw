# TypeScript에서 불변 패턴 사용 시 주의사항

**카테고리:** best-practices
**날짜:** 2026-04-08
**적용 시점:** TypeScript 프로젝트에서 불변 함수 설계 시

---

## 컨텍스트

personal-claw 플러그인은 프로필 업데이트 함수를 불변 패턴으로 설계했다:
- `updateDimension(profile, ...)` → 새 Profile 반환
- `incrementStats(profile, ...)` → 새 Profile 반환
- `transitionPhase(profile, ...)` → 새 Profile 반환

하지만 호출 코드에서 반환값을 무시하는 치명적 버그(P0)가 발생했다.

## 가이던스

### 1. 불변 함수는 반환값 사용을 강제하라

```typescript
// ❌ TypeScript가 허용하지만 위험
updateDimension(profile, 'tone', 'casual', 0.8); // 반환값 버림

// ✅ 명시적으로 재할당
profile = updateDimension(profile, 'tone', 'casual', 0.8);
```

### 2. 네이밍으로 불변성을 명시하라

```typescript
// 모호함: 원본을 변경하는 건지, 새 객체를 반환하는 건지 불분명
updateDimension(profile, ...)

// 명확함: "with" 접두사는 불변 변환을 암시
withUpdatedDimension(profile, ...)

// 또는 "clone" 패턴
profile.clone({ dimensions: { ... } })
```

### 3. ESLint 규칙으로 방어하라

```json
{
  "rules": {
    "@typescript-eslint/no-floating-promises": "error",
    "no-unused-expressions": ["error", { "allowShortCircuit": false }]
  }
}
```

### 4. 반환 타입을 명시적으로 만들어라

```typescript
// 보통: 반환값을 무시해도 에러 없음
function updateDimension(p: Profile, ...): Profile { ... }

// 엄격: 반환값 사용을 강제하는 래퍼 타입 (실험적)
type MustUse<T> = T & { __brand: 'must_use' };
function updateDimension(p: Profile, ...): MustUse<Profile> { ... }
```

### 5. 통합 테스트로 최종 검증하라

```typescript
// 단위 테스트: 함수가 올바른 값을 반환하는지 ✅
expect(updateDimension(p, 'tone', 'casual', 0.8).dimensions.tone.value).toBe('casual');

// 통합 테스트: 파이프라인이 실제로 동작하는지 ✅
const result = await simulateOnMessage('짧게 해줘');
expect(result.profile.response_length).toBe('concise');
```

## 이유

불변 패턴은 사이드 이펙트 방지, 디버깅 용이성, 시간 여행 디버깅 등 많은 장점이 있다. 하지만 TypeScript는 "반환값 사용 강제"를 지원하지 않는다. **개발자의 규율 + 린트 규칙 + 테스트**로 보완해야 한다.

## 적용 시점

- TypeScript에서 불변 함수를 설계할 때
- React useState setter와 유사한 패턴을 만들 때
- Redux reducer를 구현할 때
- 함수형 프로그래밍 패턴을 적용할 때

## 관련

- P0 버그에서 발견: `immutable-return-value-discarded.md`
- CE:review Correctness 리뷰어가 발견
