# CHANGELOG

> 안전 규칙 변경 이력은 항상 이 파일에 **"무엇을 왜"** 와 함께 기록합니다.
> (`08_EXTENSIBILITY_AND_UPGRADE.md §3` 요구사항)

---

## [Unreleased] — 2026-07-03

### 변경 — 오탐(false positive) 축소 + 테스트 재현성 (2026-07-11)
- **무엇 ①(오탐 제거)**: `echo "rm -rf /"`·`grep "rm -rf"`·`git commit -m "…rm -rf…"`처럼 위험 문자열을 **인용부호 안에서 언급만** 하는 비실행 명령이 deny/ask로 잘못 차단되던 것을 통과로 수정. `guard.mjs`에 `stripInertQuotedData`(데이터 싱크 echo/grep/printf/commit -m 세그먼트의 따옴표 내용만 분류에서 제외) 도입. 세그먼트 세퍼레이터(`|`·`;`·`&&`) 보존 재조합으로 `curl x | grep -d`류 새 오탐도 방지.
- **무엇 ②(보안 리뷰 반영)**: bash는 **이중따옴표 안 `$(...)`·백틱을 실행**하므로, 그 치환이 있으면 따옴표를 제거하지 않고 그대로 검사(`stripQuotesSafe`) — `echo "$(rm -rf ~)"` 탐지 우회를 커밋 리뷰에서 발견·차단. 단일따옴표는 리터럴이라 제거 안전.
- **탐지 약화 0(불변)**: `bash -c`·`sh -c`·`eval`·`xargs`·`python -c`·`node -e` 등 실행자와 비인용 세그먼트는 그대로 검사·차단. 경로 추출(리다이렉트·삭제 대상)은 원본 명령 기준 유지.
- **왜**: 적대적 감사가 재현한 마지막 오탐(언급 ≠ 실행) — 제품이 정당한 작업을 막으면 "진행 불가감"으로 신뢰를 해침(01 §8.8). 단, 오탐을 줄이며 탐지에 구멍을 내면 안 되므로 리뷰로 우회 1건을 잡아 보강.
- **재현성**: `_selftest.mjs`를 저장소에 포함(`.gitignore` 해제) + CI(`security-audit.yml`)에서 Windows·Linux 실제 실행 → "테스트 통과"를 저장소가 스스로 증명(재현 불가 결함 해소, §8.8).
- 검증: TDD(오탐 RED 6 + 우회 RED 2 → GREEN) + 실행자 탐지 유지 회귀 잠금 — `_selftest.mjs` **112 PASS / 0 FAIL**(Windows 기준).
- 관련: `hooks/guard.mjs`(stripInertQuotedData·stripQuotesSafe), `hooks/_selftest.mjs`(E-2 잠금 14건), `.github/workflows/security-audit.yml`, `.gitignore`, `.claude-plugin/plugin.json`(hooks 중복선언 제거)

### 보안 수정 — 적대적 감사로 발견한 커버리지 갭 4건 차단 (2026-07-07)
- **무엇 ①(치명·잠복 버그)**: `curl/wget` 외부 업로드 탐지가 **한 번도 발동 안 하던 정규식 버그** 수정 — 플래그 앞 `\b`가 공백 뒤 대시(`-d` 등)에서 매칭 실패(공백·대시 사이엔 단어경계 없음). `curl -d @~/.ssh/id_rsa`(비밀키 유출)가 그대로 통과하던 것을 ask로 차단. 09 §3 "외부 업로드 금지" 명세가 코드에 실제 반영됨(명세-구현 불일치 해소).
- **무엇 ②**: `find … -delete`·`find -exec rm`(대량 삭제)·`truncate -s 0`(파일 0-초기화) 위험패턴 추가 → 통과하던 것을 deny/ask로.
- **왜**: guard.mjs 적대적 감사(24종 배터리)에서 위 4건이 **막아야 하는데 통과(allow)** 함을 실측(07 C1 "hollow core" 재현). 특히 curl 유출은 이 제품이 태어난 이유(01 §1 토큰 탈취 방지) 정면 관통.
- **안전 방향(탐지 추가만)**: 판정 완화 0 — 오직 더 엄격해짐. 과차단 방지도 확인(업로드 아닌 일반 `curl` GET은 통과 유지).
- 검증: 감사 재실행 **GAP 4→0** + `_selftest.mjs` **98 PASS / 0 FAIL**(감사갭 4 + 과차단 방지 1 잠금 추가).
- 관련: `hooks/guard.mjs`(RISKY 패턴), `hooks/_selftest.mjs`(감사갭 잠금)

### 변경 — 정직한 deny 안내: 민감 위치 파일 차단 메시지를 "막다른 벽 → 문"으로 (2026-07-07)
- **무엇**: `~/.claude/settings.json` 등 민감 위치 **파일 쓰기 deny 메시지**를 실행 가능한 안내로 교체 — "막았어요"(막다른 벽)에서 "AI는 직접 못 바꾸지만, 꼭 필요하면 사용자가 직접 파일을 열어 바꿀 수 있고 안전장치는 그대로 유지된다"(문)로. 판정 로직(`deny`)은 **한 줄도 안 바뀜** — 문구만.
- **왜**: 솔로 테스트에서 정당·저위험 변경(statusLine 새로고침 1→3초)이 통째로 deny돼 "진행 불가감"을 준 사건(`.PRD/12`). settings.json엔 안전장치 필드(hooks·permissions)와 무해 필드가 섞여 파일 단위로 막히지만, 이 deny는 **자기보호 바닥**이라 유지하고 대신 사용자 주권을 안내로 되돌려 줌(후보 B, 12 §8 권장 P0).
- 검증: TDD — 변경 전엔 메시지에 "직접" 없음(RED) → 교체 후 회귀 + C1 잠금 테스트 **93 PASS / 0 FAIL**. 안전 판정(deny) 불변.
- 관련: `hooks/guard.mjs`(민감파일 deny 메시지), `hooks/_selftest.mjs`(C1 잠금 테스트)

### 변경 — 정밀화 2차: 셸 덮어쓰기 git-relief · 글롭 백업 · 백업 보존 자동화
- **무엇 ①(U2)**: `echo > 기존파일`·`cp/mv` 같은 안전 명령의 덮어쓰기도 **git 저장소 안 + 비밀 아님**이면 백업만 뜨고 확인 생략(1차 Write/Edit 정밀화와 동일 논리). 위험명령(rm 등)·비밀파일·git 밖은 기존대로 확인.
- **무엇 ②(U1, 안전 강화)**: `rm *.txt` 같은 글롭이 리터럴로 해석돼 **백업에서 새던 갭**을 폐쇄 — readdirSync만으로 실파일 확장(실행 0), 파일만 백업(폴더 제외로 오차단 방지).
- **무엇 ③(U4)**: 백업 자동 보존 정책 — 새 백업 성공 직후 **최근 100개+30일 무조건 보존, 회당 최대 200개**만 오래된 것 정리. `safety-rules.json`의 `backupPolicy`로 조정 가능(최소 바닥 keepN≥10·keepDays≥7 강제).
- **왜 ③이 설계 변경인가**: 기존 `cleanupBackups`는 "자동 실행하지 않는다"(수동 CLI 전용)였으나, 초보자는 CLI를 절대 돌리지 않아 12일 만에 3,542개 누적 실측 — 수동 전용은 사실상 정리 없음.
- 검증: TDD(RED 5 FAIL → GREEN **92 PASS / 0 FAIL**) + `--selfcheck` 정상 + 실환경(git 저장소 안 `echo > 기존파일` 라이브 훅 통과) 실증. 상세: `.PRD/11_PRECISION_TUNING_LOG.md` P4~P6

### 변경 — 정밀화: 일반 git push·git 저장소 안 편집의 확인(ask) 제거 (안전 바닥 불변)
- **무엇 ①**: 일반 `git push`를 위험(risky) 분류에서 제외. 파괴적 변형(`--force`/`-f`·`--delete`/`-d`·`:refspec` 원격삭제·`+refspec` 강제·`--mirror`·`--prune`)만 계속 확인(ask).
- **무엇 ②**: 기존 파일 Write/Edit이 **git 저장소 안 + 비밀파일 아님**이면 백업만 뜨고 확인 생략. 비밀파일(.env·키)·git 밖 폴더는 기존대로 확인.
- **왜**: 일반 push는 데이터를 잃지 않는 행위(원격에 더하기), git 안 편집은 백업+git 이력의 이중 복구망 존재 — "잃을 게 없는데 묻던" 틀린 분류의 교정. 완화가 아니라 정밀화(deny·fail-closed·백업·비밀보호 전부 불변).
- **보류**: 단일 `rm` 확인 제거는 글롭(`rm *.txt`) 백업 누락 갭 발견으로 보류.
- 검증: TDD(RED 5 FAIL → GREEN **85 PASS / 0 FAIL**) + `--selfcheck` 정상. 상세: `.PRD/11_PRECISION_TUNING_LOG.md`

### 변경 — 화이트리스트를 세션 기준 → 폴더 기준으로
- **무엇**: `/sodam-harness-trust`로 등록한 신뢰가 `session_id`까지 일치해야 적용되던 것을, `(폴더, 작업종류)` + 12시간 TTL 기준으로 바꿈. 세션이 달라도(대화를 새로 시작해도) 같은 폴더·같은 작업종류는 계속 안 물어봄.
- **왜**: 실사용 로그(`~/.sodamharness/activity.log`)로 확인해 보니 짧은 시간에 여러 세션이 동시에 오가는 사용 패턴이 흔했고, 그때마다 신뢰가 무효화돼 `git push` 등 반복 작업마다 매번 다시 확인창이 뜨는 문제가 있었음(화이트리스트가 사실상 한 번도 유지된 적 없이 비어 있었음). deny(치명·폴더삭제·민감위치)와 백업은 이번 변경과 무관하게 그대로 유지됨.
- 관련: `hooks/whitelist.mjs`, `hooks/guard.mjs`(안내 문구), `commands/sodam-harness-trust.md`, `hooks/_selftest.mjs`(D1 테스트 갱신, 75 PASS)

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
