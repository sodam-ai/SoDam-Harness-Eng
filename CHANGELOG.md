# CHANGELOG

> 안전 규칙 변경 이력은 항상 이 파일에 **"무엇을 왜"** 와 함께 기록합니다.
> (`08_EXTENSIBILITY_AND_UPGRADE.md §3` 요구사항)

---

## [0.1.0] — 2026-06-23

### 추가 — Phase 1 (안전 가드레일)
- **guard.mjs** (PreToolUse 훅): catastrophic → deny / risky → backup+ask / safe → passthrough 3단계 분류 + fail-closed(오류 시 ask 강등)
- **backup.mjs**: 위험 작업 직전 자동 백업 (`~/.sodamharness/backups/`)
- **activity.mjs** (PostToolUse 훅): 작업 종류·파일명만 기록(내용·명령원문 제외, 비밀파일 "(비밀파일)" 가림)
- **whitelist.mjs**: 세션 화이트리스트 — trust 명령으로 ask 피로 완화(deny·backup은 그대로 유지)
- **safety-rules.json**: 위험 패턴·민감 경로 외부화 — 빈 파일이어도 기본 보호는 코드에서 동작, 추가 패턴은 이 파일로 확장

### 추가 — 명령 6개
- `/sodam-harness-install` — 설치 상태 확인 + Node.js 버전 안내
- `/sodam-harness-status` — 훅 장착 상태·자동승인 모드 경고
- `/sodam-harness-fix` — 문제 진단·자동 복구 시도
- `/sodam-harness-undo` — 백업 목록 선택 복구(가장 최근 1개 맹복구 금지 — 동시 작업 덮어쓰기 방지)
- `/sodam-harness-log` — AI 활동 타임라인 (P2-A)
- `/sodam-harness-trust` — 방금 ask 작업을 이번 세션 동안 생략 (M2/D1)

### 추가 — 스킬 2개
- **sodam-harness-beginner-tone**: 초보자 말투 전용 스킬 — 과장 금지, 100% 보장 표현 금지
- **sodam-harness-self-check**: 자가검증 루프 스킬 (P2-B)

### 추가 — Codex 지원 (P2-C)
- `AGENTS.md`: Codex용 에이전트 정의 (Claude Code AGENTS.md 자동 로드)
- `codex/config.toml.example`: Codex 환경 설정 예시
- `/sodam-harness-codex` 명령은 제거됨 → 아래 "제거" 참고

### 보안 수정 (H1~H7 + 감사 A1~E1)
- **A3**: 백업 시 `.env`, `*auth*`, `*.pem`, `id_rsa`, `*.key` 등 비밀파일 제외 (`§8.3` 위반 방지)
- **B1**: guard.mjs 최상위 try/catch — JSON 파싱 실패·예외 시 ask 강등(fail-closed, 절대 passthrough 아님)
- **B2**: Windows 백업 폴더 ACL — 사용자 프로필 기본 권한 의존(icacls 문서화)
- **C1**: 위험 패턴 목록 코드 내 하드코딩 + safety-rules.json 확장점 마련 (⚠️ 데이터는 미입력 — 빈 파일이 기본값)
- **D2**: status 명령에 자동승인 모드 경고 안내 추가(`permissionMode: autoApprove` 감지)
- **E1**: junction·심볼릭 링크 realpath 해석, UNC 공유루트 민감 처리, 한글 홈 경로 대응

### 제거
- `/sodam-harness-codex` 슬래시 명령 제거 — Claude Code 메뉴에 잡다한 항목 노출로 초보자 혼란 유발. Codex 안내는 `GUIDE.md "(선택) Codex에서도 쓰기"` 항목 및 `codex/CODEX_SETUP.md`로 이전(자료 보존)

---

*이 파일은 안전 규칙 변경 이력 전용입니다. 버그 수정·리팩토링은 git 커밋 메시지를 참고하세요.*
