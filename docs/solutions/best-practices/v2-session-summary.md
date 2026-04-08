# personal-claw v2 세션 종합

**날짜:** 2026-04-08
**파이프라인:** CE:brainstorm → CE:plan → CE:work → CE:review → CE:compound

---

## v2 변경 요약

| 항목 | 변경 |
|------|------|
| 신규 파일 | 4개 (session-state, ab-suggester, topic-detector + tests) |
| 수정 파일 | 6개 (index, types, profile, prompt-builder, status-tool, README) |
| 테스트 | 21개 → **50개** (+29) |
| 버그 수정 | P0 1개, P1 1개, P2 2개, P3 1개 |
| 학습 신호 | 3개 → **6개** (+follow-up, re-question, conversation_length) |
| 주제 감지 | 없음 → **6개 주제 자동 분류** |

## 핵심 교훈

### 1. 병렬 개발은 인터페이스가 핵심
병렬로 3개 에이전트를 돌렸더니 시간은 60% 절감됐지만, 인터페이스 미확정으로 P0 1개 발생. 다음부터는 인터페이스를 먼저 확정하고 병렬 실행.

### 2. CE:review가 없으면 P0가 배포됨
단위 테스트 50개가 모두 통과해도, 파이프라인 연결 누락은 잡지 못함. 리뷰어가 `import`만 되고 미사용인 코드를 발견해서 수정.

### 3. 시스템 프롬프트가 플러그인의 핵심
훅 타입 제약으로 A/B 제안을 전달할 수 없었지만, 시스템 프롬프트 주입 방식으로 해결. 플러그인이 에이전트 동작을 제어하는 가장 효과적 방법.

### 4. 한국어 정규식은 3번 테스트
v1에서 `/잘\s*못/i`, v2에서 `/글/i` false positive. 한국어는 단일 문자 패턴을 피하고 구체적 표현을 사용.

## v2 파이프라인

```
onMessage → SessionState 업데이트
    ↓
detectSignals (명시적 피드백)
    ↓
detectReQuestion (재질문 → 불충분 신호)
    ↓
detectFollowUp (추가 대화 → 만족 신호)
    ↓
analyzeConversationLength (참고용)
    ↓
detectTopic (6개 주제 분류)
    ↓
saveProfile
    ↓
getSystemPromptAddition → buildTopicAwarePrompt + A/B 주입
```

## 다음 단계

1. 실제 OpenClaw에 설치 테스트
2. ClawHub 배포
3. 사용자 피드백 수집 → v3 계획
