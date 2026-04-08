---
name: personal-claw
description: Adaptive personalization - learns user preferences through conversation using Thompson Sampling. Auto-adjusts response length, tone, format, depth, and more.
---

## What This Skill Does

personal-claw는 대화를 통해 사용자의 선호도를 학습하는 적응형 개인화 시스템입니다.

기본적으로 에이전트는 모든 사용자에게 동일한 스타일로 응답하지만, 이 스킬을 활성화하면 사용자의 대화 패턴을 분석하고, 선호하는 응답 스타일을 자동으로 학습합니다.

핵심 기능:
- 대화 패턴 분석을 통한 사용자 선호도 추론
- Thompson Sampling 기반 multi-armed bandit으로 최적 스타일 탐색
- 12개 개인화 차원(dimension)에 걸쳐 응답 스타일 자동 조정
- 모든 학습 데이터는 로컬에 저장, 외부 전송 없음

## How It Works

3단계 파이프라인으로 동작합니다:

```
Pattern → A/B → Bandit
```

**Phase 1 — Pattern (패턴 관찰)**
사용자의 메시지에서 언어, 문장 길이, 톤, 형식 등을 관찰합니다.
이 단계에서는 에이전트가 조용히 관찰만 하며, 사용자의 자연스러운 대화 스타일을 수집합니다.

**Phase 2 — A/B (선택지 제안)**
학습된 패턴을 바탕으로 가끔 자연스럽게 A/B 선택지를 제안합니다.
예: "더 자세히 설명해줄까, 아니면 핵심만 간단히 말해줄까?"
사용자의 선택이 선호도 학습에 반영됩니다.

**Phase 3 — Bandit (적응형 응답)**
충분한 데이터가 모이면 Thompson Sampling bandit이 최적의 응답 스타일을 자동 선택합니다.
사용자 개입 없이도 선호에 맞는 응답이 제공됩니다.

## Personalization Dimensions

12개 차원(dimension)에 걸쳐 개인화가 이루어집니다:

| Dimension | 설명 | 예시 값 |
|-----------|------|---------|
| response_length | 응답 길이 | concise / balanced / detailed |
| language | 응답 언어 | ko / en / mixed |
| formality | 격식체 정도 | casual / semi-formal / formal |
| technical_depth | 기술적 깊이 | beginner / intermediate / expert |
| code_preference | 코드 선호 | inline / full / minimal |
| explanation_style | 설명 스타일 | analogy / direct / step-by-step |
| emoji_usage | 이모지 사용 빈도 | none / minimal / moderate / frequent |
| structure_preference | 구조 선호 | bullet / paragraph / numbered |
| humor_level | 유머 정도 | none / light / moderate |
| context_carry | 맥락 유지 수준 | minimal / moderate / extensive |
| proactivity | 선제적 제안 수준 | reactive / balanced / proactive |
| confirmation_need | 확인 요청 빈도 | minimal / moderate / frequent |

## Learning Signals

에이전트가 선호도를 학습하는 5가지 신호:

**1. Explicit Feedback (명시적 피드백)**
사용자가 직접 선호를 표현하는 경우.
예: "더 짧게 해줘", "한국어로 설명해", "코드 예시 넣어줘"

**2. Follow-up Pattern (후속 질문 패턴)**
사용자가 추가 설명을 요청하면 "너무 간결했다"는 신호.
반대로 응답을 끝까지 읽고 바로 다음 질문으로 넘어가면 "적절했다"는 신호.

**3. Reformulation (재요청)**
사용자가 같은 질문을 다르게 다시 물어보면, 이전 응답이 부족했다는 신호.

**4. A/B Selection (A/B 선택)**
Phase 2에서 제안한 선택지 중 사용자가 고른 것이 직접적인 선호 데이터.

**5. Engagement Pattern (참여 패턴)**
응답 길이, 반응 시간, 대화 지속 여부 등 간접적인 참여 지표.

## Agent Instructions

에이전트는 아래 지침을 따라 동작합니다:

### Phase 1 — Pattern (초기 관찰)

- 사용자의 메시지에서 언어(ko/en/mixed), 문장 길이, 톤(formal/casual)을 조용히 관찰
- 직접적으로 선호를 묻지 않음 — 자연스러운 대화에서 추론
- 최소 5~10회 대화 후에 Phase 2로 전환
- 관찰 결과는 내부 프로필에 기록하되, 사용자에게 노출하지 않음

### Phase 2 — A/B (선택지 제안)

- 가끔(약 20~30% 확률) 자연스럽게 A/B 선택지를 제안
- 방해가 되지 않도록 대화 흐름에 녹여서 제안
- 매번 제안하지 않음 — 사용자가 불편함을 느끼면 빈도를 줄임
- 선택 결과를 학습 데이터에 반영

### Phase 3 — Bandit (적응형 응답)

- Thompson Sampling bandit이 각 차원의 최적값을 자동 선택
- 사용자 개입 없이 프로필 기반으로 응답 스타일 적용
- 새로운 신호가 들어오면 프로필을 업데이트 (exploration 비율 유지)
- 급격한 스타일 변경을 피하고, 점진적으로 조정

### General Rules

- 학습 상태를 사용자에게 과도하게 설명하지 않음
- 사용자가 명시적으로 선호를 말하면 그것을 최우선으로 반영
- 프로필이 확실하지 않을 때는 기본 스타일 사용
- 모든 데이터는 로컬에만 저장 (privacy 보호)

## A/B Suggestion Patterns

A/B 선택지는 자연스럽게, 대화 흐름에 맞춰 제안해야 합니다.

### Bad Examples (잘못된 예)

❌ 너무 직접적이고 방해됨:
"당신의 선호를 학습하기 위해 두 가지 옵션을 준비했습니다. A: 간결한 응답, B: 상세한 응답. 어느 것을 선택하시겠습니까?"

❌ 맥락과 맞지 않음:
사용자가 긴급한 질문을 했는데 A/B 선택지를 먼저 제안함

❌ 너무 자주 반복:
매 응답마다 A/B 선택지를 제안함

### Good Examples (올바른 예)

✅ 대화 흐름에 자연스럽게 녹임:
사용자: "이 코드 어떻게 최적화해?"
에이전트: "몇 가지 방법이 있는데, 핵심만 빠르게 말해줄까? 아니면 전체 최적화 로드맵을 자세히 설명해줄까?"

✅ 사용자의 이전 패턴에 기반:
사용자가 항상 짧은 답변을 선호해왔다면:
에이전트: "간단히 말하면 [답변]. 근데 혹시 배경 설명도 필요해?"

✅ 톤/언어 선택이 자연스러울 때:
사용자가 영어로 질문했는데 한글 응답이 더 나을 수 있다면:
에이전트: "영어로 설명해도 되는데, 한글로 해줄까?"

## Commands

사용자가 직접 실행할 수 있는 명령어:

### personal-claw-status
현재 학습 상태와 프로필을 확인합니다.
- 수집된 데이터 수
- 각 차원별 현재 추정값
- 학습 단계 (Phase 1/2/3)

### personal-claw-reset
학습 데이터를 초기화합니다.
- 모든 개인화 프로필 삭제
- Phase 1로 재시작
- 사용자 확인 후 실행

### personal-claw-export
학습된 프로필을 JSON으로 내보냅니다.
- 프로필 데이터를 파일로 저장
- 다른 인스턴스에서 가져오기(import) 가능
- 민감한 대화 내용은 포함하지 않음 (프로필 값만 export)

## Privacy

- 모든 학습 데이터는 로컬에만 저장됩니다
- 외부 서버로 데이터를 전송하지 않습니다
- 대화 원문은 저장하지 않고, 추출된 패턴/프로필만 저장합니다
- `personal-claw-reset`으로 언제든지 데이터를 삭제할 수 있습니다
- `personal-claw-export`로 저장된 데이터를 직접 확인할 수 있습니다
