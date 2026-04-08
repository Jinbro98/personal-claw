# 손상된 JSON 파일로 플러그인 크래시

**카테고리:** runtime-errors
**날짜:** 2026-04-08
**심각도:** P1 (높음)
**영향:** 단일 파일 손상으로 플러그인 전체 비활성화

---

## 문제

`file-io.ts`의 `readJson` 함수가 `ENOENT` (파일 없음)만 catch하고, `SyntaxError` (잘못된 JSON)는 throw했다.

```typescript
// ❌ 잘못된 코드
export async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    throw err; // SyntaxError 여기서 throw됨
  }
}
```

## 증상

- `profile.json`이 손상되면 (비정상 종료, 디스크 오류 등)
- `onMessage`에서 `loadProfile` → `readJson` → SyntaxError throw
- catch 없는 hook → unhandled rejection → 플러그인 크래시
- 재시작해도 같은 파일을 읽으므로 반복 크래시

## 솔루션

```typescript
// ✅ 올바른 코드
export async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    if (err instanceof SyntaxError) {
      console.error(`[personal-claw] Corrupted JSON at ${path}, returning null`);
      return null;
    }
    throw err;
  }
}
```

## 이유

파일 시스템은 불안정하다. 정전, 크래시, 디스크 오류로 언제든 파일이 손상될 수 있다. JSON 파싱 실패는 "파일 없음"과 동일하게 취급하고 재생성하는 것이 안전하다.

## 예방

1. 모든 `readJson` 호출에서 null 반환을 기대하고 처리
2. `loadProfile`에서 null이면 새 프로필 생성 (이미 구현됨)
3. 주기적 백업 고려 (중요 데이터의 경우)

## 관련

- P1 발견: CE:review Correctness 리뷰어
- 수정: `src/utils/file-io.ts` lines 12-24
