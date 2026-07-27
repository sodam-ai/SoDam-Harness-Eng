# SoDamHarness — 개발자 문서 (DEVELOPMENT)

> 이 문서는 **개발·기여·내부 동작**을 다룹니다. 사용자용 안내는 [README.md](./README.md), 검증 방법은 [TESTING.md](./TESTING.md)를 보세요.
> 설계 근거·요구사항 전체는 비공개 설계 문서 `.PRD/`(01_PRD ~ 06_CORE_DRAFTS)에 있습니다.

---

## 1. 구조

```
.claude-plugin/plugin.json      플러그인 정보(name=sodam-harness, Apache-2.0)
.claude-plugin/marketplace.json 마켓플레이스 등록 정보
hooks/hooks.json                PreToolUse/PostToolUse 훅 등록(matcher → guard.mjs/activity.mjs)
hooks/guard.mjs                 위험 판정 엔진(deny/ask/통과)
hooks/backup.mjs                백업·복구 엔진(+ CLI: --list/--plan/--restore/--cleanup)
hooks/whitelist.mjs             폴더 화이트리스트(D1, /sodam-harness:trust)
hooks/profile.mjs               맞춤 마법사 설정(L1/L2/L3, /sodam-harness:wizard)
hooks/activity.mjs              활동 기록(P2-A, /sodam-harness:log)
hooks/safety-rules.json         위험 패턴·민감경로 확장 데이터(기본은 코드 내장)
hooks/_selftest.mjs             자가 테스트(저장소에 추적됨 — 2026-07-11 A2 이후 배포에서도 실행 가능)
skills/beginner-tone/SKILL.md   쉬운 한국어 말투(Claude Code 자동 로드)
skills/sodam-harness-self-check/SKILL.md  자가검증 루프(P2-B)
commands/{install,status,fix,undo,trust,log,wizard}.md  초보자용 슬래시 명령(/sodam-harness:xxx)
AGENTS.md                       (선택) Codex·타도구용 말투 — Claude Code는 자동 로드 안 함
```

## 2. 훅 동작 원리

- `hooks.json`의 `PreToolUse` matcher = `Bash|PowerShell|Write|Edit|MultiEdit|NotebookEdit` → 해당 도구 호출 직전 `guard.mjs` 실행.
- `guard.mjs`는 **stdin으로 받은 JSON**(`tool_name`·`tool_input`·`cwd`·`session_id`)을 읽고, **stdout으로 결정 JSON**을 출력:
  - `permissionDecision: "deny"` = AI가 못 뚫는 차단 · `"ask"` = 사용자 확인 · 출력 없음 = 기본 흐름(통과).
- 판정 순서: 민감 위치/심볼릭 → `deny` · 치명 명령 → `deny` · **폴더/재귀 삭제 → `deny`**(폴더는 백업 불가·자동승인 모드에선 ask가 통과되므로 deny만 막힘) · 위험 단일 파일/덮어쓰기 → **백업 후 `ask`**(백업 실패 시 fail-safe `deny`) · 새 파일·안전 명령 → 통과.
- `backup.mjs`는 위험 작업 직전 **파일만**(폴더 제외) `~/.sodamharness/backups/<시각>-<난수>/`에 복사하고 `manifest.json`(원본 경로·session_id) 기록. 되돌리기는 목록 선택식(`--list` → `--plan` → `--restore <폴더>`).

## 3. 자가 테스트 실행

```bash
node hooks/_selftest.mjs
```

- guard를 **실제 실행 방식**(stdin JSON → stdout 결정)으로 검사 + backup 엔진 직접 검사.
- 통과 기준: `결과: N PASS / 0 FAIL`. **FAIL이 1건이라도 있으면 머지 금지.**
- 임시 파일/폴더는 OS 임시 폴더(`tmpdir`)에서만 만들고 끝나면 스스로 정리 — 사용자 데이터·프로젝트 무손상.

## 4. 위험 패턴 추가법 (`guard.mjs`)

- 치명(되돌릴 수 없는 광역 파괴) → `CATASTROPHIC` 배열에 정규식 추가(→ `deny`).
- 위험(삭제·강제·배포·외부 업로드) → `RISKY` 배열(→ 백업 후 `ask`).
- 폴더/재귀 삭제·우회 삭제 → `RECURSIVE_DELETE` 배열(→ `deny`).
- 패턴 추가 시 **반드시 `_selftest.mjs`에 통과/회귀 케이스를 함께 추가**하고 0 FAIL 확인.
- 한계(정직): 패턴 기반이라 모든 우회·미정의 경로를 100% 잡지 못함(01_PRD §8.8). 과장 금지.

## 5. 보안 불변 규칙 (어기면 제품 존재 이유 붕괴 — 절대)

1. 토큰·`auth.json`·`.env`·비밀값 **접근/저장/로깅 0** · 외부 전송 0 · 외부 코드 자동 다운로드·실행 0.
2. guard는 명령/경로를 **데이터로만 검사** — `eval`·직접 실행 **금지**.
3. 훅은 **Node.js(.mjs)만** — `.bat`/PowerShell/bash 금지(한글 CP949·줄바꿈 CRLF 깨짐 방지).
4. 경로는 **`os.homedir()` 기준** — 하드코딩 금지.
5. **폴더/재귀 삭제는 `deny`**(절대 `ask`로 강등 금지).
6. '작업 폴더 밖 무조건 차단'은 폐기됨(과잉차단) — **민감 위치만** 차단.
7. 기존 사용자 설정·다른 플러그인·파일은 **'추가'만**, 덮어쓰기 금지.
8. 의존성 **0~최소**(현재 0) + lockfile 고정. `~/.sodamharness/`는 `.gitignore`로 추적 제외.

> 검증: `git`/배포 전 코드 전체에서 `eval`·`exec`·`http`/`fetch`·`token`/`auth` 접근이 **0건**인지 grep.

## 6. Phase 로드맵 (상세 `.PRD/03_PHASES.md`)

- **Phase 1 (현재·MVP)**: 안전 가드레일(차단·확인·백업·되돌리기) + 말투 Skill + 설치·자가진단. Claude Code 전용.
- **Phase 2**: 활동 기록(경량 관측)·자가검증 루프·Codex 지원(`AGENTS.md` + `config.toml` 승인정책·샌드박스).
- **Phase 3**: 맞춤 마법사(안전 강도·자율성 등급 자동 추천)·정식 공개·영어/다도구. *설정 프로필·안전 규칙·진단 기록의 파일 영속화는 이 단계의 맞춤 기능과 함께 도입(현 MVP는 보수적 기본값을 코드에 내장).*

## 7. 라이선스

Apache-2.0 (© 2026 SoDam AI Studio). 외부 코드 차용 시 출처·라이선스를 [NOTICE](./NOTICE)에 명시하고 **AGPL/GPL 등 비호환 카피레프트는 차용하지 않습니다**.
