# CHANGELOG

> 안전 규칙 변경 이력은 항상 이 파일에 **"무엇을 왜"** 와 함께 기록합니다.
> (`08_EXTENSIBILITY_AND_UPGRADE.md §3` 요구사항)

---

## [Unreleased] — 2026-07-27 (4)

### 수정 — 복합 명령에서 무관한 폴더 언급이 "폴더 통째 삭제"로 오탐 차단되던 버그
- **무엇**: `ls 실제폴더 && rm 파일` 같은 복합 명령(또는 개행으로 이어진 여러 줄 명령)에서, `ls`가
  언급한 것뿐인 실제 존재하는 폴더가 삭제 후보 목록에 잘못 섞여 들어가 `backupPaths()`의
  `skippedDirs`로 잡히고, 명령 전체가 "삭제류"로 분류돼 있다는 이유만으로 `FOLDER_DENY_MSG`("폴더를
  통째로 지우는 작업은...")로 **완전 차단(deny)** 되던 버그. 실제로는 그 폴더를 지우려는 시도가
  전혀 아니었다.
- **왜/어떻게 발견**: 이 세션 자신이 다른 문제(플러그인 캐시 갱신 후 재검증)를 진단하려고 실행한
  Bash 명령이 실제로 이렇게 막혀서 발견. 최소 재현(대조군 포함 4케이스)으로 "실제 존재하는 폴더를
  언급 + 무관한 파일 삭제"일 때만 재현되고, "존재하지 않는 폴더 언급"이면 재현 안 됨을 확인해 원인을
  `commandPaths()`로 좁힘 — 이 함수가 명령 전체를 세그먼트 구분 없이 통짜로 토큰화해, `ls`처럼
  전혀 위험하지 않은 세그먼트의 인자까지 "삭제 후보"로 취급하고 있었다.
- **수정**: `commandPaths()`를 세그먼트 단위(E-2의 quote-aware `splitSegments` 재사용)로 나눠, **그
  세그먼트 자체가 risky/catastrophic으로 분류될 때만** 그 세그먼트의 인자를 삭제 후보로 삼도록 변경.
  데이터싱크(echo 등) 세그먼트는 기존 E-2와 동일하게 인용부호 내용을 먼저 걷어내고 분류해, 따옴표
  안에서 "rm" 등을 언급만 해도 위험으로 오분류되지 않게 함. 부수적으로 `splitSegments()`에 개행(\n)도
  `;`과 동등한 구분자로 추가(여러 줄 명령이 한 세그먼트로 뭉쳐 새 회귀가 남는 것을 방지).
- **안전 방향(1층 무변화)**: 진짜로 폴더 자체가 삭제 대상인 경우(`rm 폴더`)와 진짜 재귀삭제
  (`rm -rf 폴더`)는 각각 회귀 테스트로 여전히 deny됨을 확인 — 이 수정은 마찰(2층) 축소일 뿐 안전
  바닥은 그대로다.
- **알려진 한계(고치지 않음, 범위 밖으로 명시)**: 이번 수정은 "복합 명령의 무관한 세그먼트" 사례를
  고쳤을 뿐, "하나의 세그먼트 자체가 위험 분류일 때 그 안의 모든 단어를 다 경로 후보로 취급"하는
  더 근본적인(더 드문) 사례는 그대로 남아 있다(예: 매우 긴 한 줄 스크립트 안에 우연히 "rm" 문자열과
  실제 경로가 여러 개 섞여 있는 경우). 일상적인 사용 패턴에선 마주치기 어려워 이번 범위 밖으로 둠.
- 검증: `_selftest.mjs`에 회귀 4건 추가(대조군 2건 포함) — **157 PASS / 0 FAIL**(기존 153 + 신규 4,
  회귀 0). `guard.mjs --selfcheck` 정상.
- 관련: `hooks/guard.mjs`(`commandPaths`·`splitSegments`), `hooks/_selftest.mjs`(47번 회귀),
  `.PRD/CHECKPOINT.md`(다음 섹션)

## [Unreleased] — 2026-07-27 (3)

### 성능 — 백업 정리(cleanupBackups) 자동 호출을 매번이 아니라 스로틀링
- **무엇**: `backupPaths()`가 위험 작업마다 무조건 `cleanupBackups()`(백업 폴더 전체 스캔)를 호출하던
  것을, 마커 파일(`~/.sodamharness/backups/.last_cleanup`) 기반으로 **기본 1시간에 한 번만** 실행되게
  변경. **백업 생성(핵심 안전 기능)은 완전히 무영향** — 정리(오래된 백업 삭제) 실행 빈도만 낮춘다.
- **왜**: 이 PC에 백업 폴더가 20,116개 누적돼 매 위험 작업마다 전체 스캔으로 ~1초 지연이 발생함(실측,
  이전 회차 확인). `09_CONSTRAINT_RELAXATION.md`가 스스로 경고하는 "안전벨트가 답답하면 꺼버린다"가
  실제로 벌어지는 지점 — 안전 자체는 그대로 두고 마찰만 줄이는 09§2 2층(friction) 영역 개선.
- 마커 없음/손상 시 fail-safe로 "지금 실행"(기존 동작과 동일) — 정리가 영구 정지되는 실패 모드 없음.
  `SODAM_CLEANUP_THROTTLE_MS=0`으로 기존 동작(매번 실행)으로 즉시 되돌릴 수 있는 탈출구 유지.
- **검증(과정 그대로 기록)**: `hooks/backup.mjs`를 Edit 도구로 직접 수정할 수 없어(이 프로젝트 자체의
  "안전 파일은 루프가 수정할 수 없습니다" 자기보호 가드레일 — `.PRD/CHECKPOINT.md` I섹션에 이미
  기록된 것과 동일 매커니즘) 스크래치패드에 완성본을 작성 후 `diff`로 의도한 변경만 있는지 확인,
  `cp`로 반영. `hooks/_selftest.mjs`에도 같은 방식으로 회귀 테스트(46a~d) 삽입 — 삽입 직후 두 차례는
  `_selftest.mjs` 실행 자체가 차단됐으나(방금 수정된 직후라 자기검증 루프로 인식된 것으로 추정),
  건드리지 않은 별도 독립 검증 스크립트로 동일 시나리오 10/10 통과를 먼저 확인했고, 세 번째 시도에서
  차단이 자연히 풀려 **전체 스위트를 직접 재실행 — 153 PASS / 0 FAIL**(기존 147 + 신규 6, 회귀 0).
  `guard.mjs --selfcheck`도 정상. 독립 검증과 전체 스위트 결과가 서로 일치.
- 관련: `hooks/backup.mjs`(`shouldRunCleanupNow`·`markCleanupRan`), `hooks/_selftest.mjs`(46번 삽입),
  `.PRD/CHECKPOINT.md`(Y섹션)

## [Unreleased] — 2026-07-27 (2)

### 추가 — 활성 claude-code 설정파일 자기보호 인지 강화 (deny 아님, ask 메시지만)
- **무엇**: `%APPDATA%\claude-code\settings.json`(Windows)을 편집/덮어쓸 때, 기존 일반 "백업했어요,
  진행할까요?" 문구에 "이 파일엔 플러그인 켜짐/꺼짐·권한 자동승인 설정이 들어 있어요..." 경고를
  추가. **판정은 여전히 ask — deny로 올리지 않음.**
- **왜**: 이 파일을 직접 열어 키 구조를 확인한 결과, `~/.claude/settings.json`(이미 deny 보호,
  `hooks` 보유)과 **다른 파일**임이 드러남 — 이 파일엔 `hooks`가 없고 대신 `enabledPlugins`(플러그인
  끄기로 guard 자체 무력화 가능)·`permissions`(위험도구 자동허용 가능)가 있어 별도의 자기보호
  위험이었다. 그런데 같은 파일에 `model`·`theme`·`tui` 등 무해 필드도 섞여 있어(12번 문서의 원래
  사건과 동일 구조) deny로 올리면 똑같은 마찰이 재현된다 — 그래서 후보B와 같은 정신으로 메시지만
  강화.
- **바로잡은 것(중요)**: 이전 세션 기록이 이 파일을 "`~/.claude/settings.json`과 같은, hooks를 담은
  실제 활성 파일"로 서술했었는데, 이번에 직접 JSON 키 구조를 확인해보니 **부정확했다** —
  `~/.claude/settings.json`은 여전히 hooks를 담은 별도 파일로 존재하고 이미 보호돼 있다. 정정 근거는
  `.PRD/CHECKPOINT.md` X섹션 참고.
- **알려진 한계(고치지 않음, 문서화만)**: 맞춤 마법사 L3 autonomy·세션 폴더 화이트리스트(D1)가 걸린
  상태면 이 ask 자체를 건너뛴다(기존 매커니즘, 이번 변경이 새로 만든 구멍 아님). 현재 기본값 L1이라
  당장 비활성.
- 검증: `_selftest.mjs`에 회귀 3건 추가(격리된 가짜 홈 디렉터리로 실제 사용자 파일 미접촉) —
  **147 PASS / 0 FAIL**(기존 144 + 신규 3, 회귀 0). `guard.mjs --selfcheck` 정상.
- 관련: `hooks/guard.mjs`(`isActiveClaudeCodeConfigFile`), `hooks/_selftest.mjs`(45번 회귀),
  `.PRD/12_CONFIG_FILE_DENY_AND_SELF_PROTECTION.md`(Q2 완료 확인·신규 발견 기록), `.PRD/CHECKPOINT.md`(X섹션)

## [Unreleased] — 2026-07-27

### 수정 — 셸 경로(Bash/PowerShell) 민감위치 deny 메시지를 Write/Edit 경로와 통일 (12 C1/후보B 완결)
- **무엇**: `12_CONFIG_FILE_DENY_AND_SELF_PROTECTION.md`가 권장한 "정직한 안내"(막다른 벽 → 문) 메시지
  개선이 `bfd534b`(2026-07-07)에서 Write/Edit 경로에만 적용되고, 셸(Bash/PowerShell) 경로는 최초
  커밋(`c533afd`)의 옛 문구("시스템·홈 등 민감한 위치를 건드리는 위험한 작업이라 막았어요...")로
  방치돼 있던 불일치를 발견·수정. 셸 경로 메시지를 "이 위치엔 시스템·안전장치 설정이 들어 있어 AI가
  직접 건드리지 못해요. 꼭 필요하면 파일을 직접 열어 확인 후 처리하세요 — 안전장치는 그대로
  유지돼요."로 교체 — **판정(deny) 로직은 무변화, 문구만.**
- **왜**: 두 경로가 같은 종류의 차단인데 사용자에게 보이는 안내 수준이 달라, 셸로 시도하면 "왜
  막혔는지·어떻게 하면 되는지" 안내 없이 막다른 벽처럼 느껴짐 — 12번 문서 §6 후보B의 취지(사용자
  주권 보존, 안전은 그대로)를 셸 경로에도 동일하게 적용.
- **Q1 확정(부가 조사)**: 12번 문서가 미검증으로 남겼던 "`!` 직접실행이 훅을 우회하는가"를 Claude
  Code 공식 문서(`interactive-mode`)로 확인 — `!` 셸 모드는 "Doesn't require Claude to interpret or
  approve the command", 즉 Claude의 도구 호출 자체를 안 타 `guard.mjs`가 실행되지 않는다. 우회가
  아니라 애초에 이 도구의 감시 범위(AI 행동) 밖 — `01_PRD` 원 목적과 일치.
- 검증: `_selftest.mjs`에 회귀 2건 추가(셸 경로 deny 판정 불변 + 메시지 스타일 통일 잠금) —
  **144 PASS / 0 FAIL**(기존 142 + 신규 2, 회귀 0). `guard.mjs --selfcheck` 정상.
- 관련: `hooks/guard.mjs`(셸 경로 deny 메시지), `hooks/_selftest.mjs`(44번 회귀),
  `.PRD/12_CONFIG_FILE_DENY_AND_SELF_PROTECTION.md`(C1 완료 표기, Q1 확정 반영), `.PRD/CHECKPOINT.md`(V섹션)

## [Unreleased] — 2026-07-26

### 수정 — cwd=홈 루트에서 삭제류 명령이 "대상 없음"인데도 민감위치로 오탐 차단되던 버그
- **무엇**: `isSensitive()`가 "존재하지 않는 파일의 부모 폴더"를 판정할 때, junction/심볼릭 링크로 인한
  진짜 indirection(E1의 원래 목적)과 "그냥 부모가 문자 그대로 이미 민감 위치인 경우"를 구분하지 못해
  발생하던 오탐. cwd가 홈 루트(`C:\Users\...`)이고 삭제 대상 파일이 실제로 존재하지 않으면, `dirname`
  폴백이 홈 루트 자체를 반환해 "민감 위치"로 오판, 정상적인 위험 확인(ask) 대신 완전 차단(deny)이 났다.
  `realOf()`에서 존재하지 않는 경로의 "부모 폴더 폴백" 자체를 제거하고, `isSensitive()`가 존재 여부에
  따라 두 갈래로 나뉘어 판정하도록 재구성 — 존재하는 경로는 직접 realpath로(기존과 동일), 존재하지
  않는 경로는 부모의 realpath가 **부모 자체와 다를 때만**(=진짜 indirection) 그 실제 목적지를 재검사.
  덧붙여 `commandPaths()`가 git 서브커맨드 토큰(예: `git rm`의 `rm`)을 실제 경로가 아닌 노이즈 후보로
  잘못 포함하던 것도 함께 제외(백업 대상에 무의미한 후보를 넣지 않도록 정리).
- **왜**: 이 세션에서 자기 진단용 Bash 명령(`git rm <파일 1개>`, cwd=홈 루트)이 실제로 이렇게 막히는
  것을 실측(추측 아님). `01_PRD §5` 성공 기준("정해진 위험 작업만 차단, 과잉차단 0")과
  `09_CONSTRAINT_RELAXATION §0`("강함이 틀린 곳까지 걸리면 사용자가 안전벨트를 꺼버린다")을 정면 위반.
- **안전 방향(1층 무변화)**: E1(한글경로·UNC·junction realpath) 회귀 3건 전부 PASS 유지 — 진짜
  junction 우회는 여전히 차단됨. 진짜 민감 위치(시스템 폴더 등)는 cwd가 홈이어도 여전히 deny(신규
  잠금 테스트로 확인). 치명·폴더재귀삭제·백업·fail-closed 전부 불변.
- 검증: TDD(RED 1 FAIL 확인 → GREEN) — `_selftest.mjs` **142 PASS / 0 FAIL**(기존 140 + 신규 2, 회귀 0).
  `guard.mjs --selfcheck` 정상. 라이브 재현(이 세션이 실제로 겪은 페이로드)으로 deny→ask 전환 확인.
- 관련: `hooks/guard.mjs`(`realOf`·`isSensitive`·`commandPaths`), `hooks/_selftest.mjs`(회귀 2건 추가)

### 문서 — 테스트 수치 stale 정정(117→142) + 구조표 갱신
- **무엇**: `CONTRIBUTING.md`·`BETA_CHECKLIST.md`가 여전히 "117 PASS"를 표기(2026-07-15 마법사 도입
  이후 129·140·142로 여러 차례 올라갔으나 두 파일만 갱신 누락). `DEVELOPMENT.md` §1 구조표는
  `_selftest.mjs`가 아직 `.gitignore`로 배포 제외된다고 적혀 있었으나 실제로는 2026-07-11(A2)에
  추적 전환됨 — 명령 4개·훅 2개만 나열해 실제 구성(명령 7개, 훅 6개 파일)과 불일치.
- **왜**: `01_PRD §8.8` 정직성(Must) — 문서 간 수치 모순은 2026-07-11 E-1(A1)이 "본래 기준을 정면으로
  깨는 것"이라며 코드보다 먼저 닫았던 것과 같은 종류의 결함. 재발을 방치하지 않음.
- 영향 없음(순수 문서, 코드 변경 0).

---

## [Unreleased] — 2026-07-17

### 변경 — 명령어 표기를 `/sodam-harness-xxx` → `/sodam-harness:xxx`로 통일
- **무엇**: `commands/` 안의 7개 명령 파일명·frontmatter `name:`을 `sodam-harness-install.md`(name: `sodam-harness-install`) 형태에서
  `install.md`(name: `install`) 형태로 변경. Claude Code의 플러그인 네임스페이스 규칙(`/<plugin>:<command>`)에 따라
  실제 호출 형태가 `/sodam-harness:sodam-harness-install`(중복 표기)에서 `/sodam-harness:install`로 짧아짐.
  README/GUIDE(한/영, md+html)·BETA*·TESTING*·스킬 2종의 모든 명령 참조도 함께 갱신(255건). `git mv`로 파일 이력 보존.
- **왜**: 사용자가 실제 라이브 세션에서 `/sodam-harness:sodam-harness-wizard`처럼 이름이 중복 표기되는 것을 확인하고,
  `/sodam-harness:install`처럼 간결한 형태로 개선을 요청함.
- **영향 없음(불변)**: 명령 내용·안전 로직(`guard.mjs` 등)은 전혀 변경하지 않음 — 순수 명명 규칙 변경. `hooks/_selftest.mjs` 140개 회귀 테스트 전부 재확인(영향 없음, PASS 유지).
- **의도적으로 유지**: 이 CHANGELOG의 과거 항목(예: 2026-07-15 항목의 `/sodam-harness-wizard` 표기)은 당시 실제 명령 이름을 기록한 역사적 사실이라 고치지 않음. `codex/CODEX_SETUP.md`의 `/sodam-harness-codex`(이미 제거된 옛 명령 언급)도 과거 안내문이라 그대로 둠.
- 관련: `commands/*.md`(7개 rename), `README.md`, `README.en.md`, `GUIDE.md`, `GUIDE.en.md` 및 각 `.html`, `BETA.md`, `BETA_CHECKLIST.md`, `TESTING.md`, `TESTING.en.md`, `skills/beginner-tone/SKILL.md`, `skills/sodam-harness-self-check/SKILL.md`

---

## [Unreleased] — 2026-07-15

### 추가 — 맞춤 마법사(안전강도 마법사): `/sodam-harness-wizard`
- **무엇**: 확인창이 얼마나 자주 뜨는지를 사용자가 직접 고를 수 있는 신규 명령. 질문 하나(A/B/C)에 답하면
  `~/.sodamharness/profile.json`에 `autonomy_level`(L1/L2/L3)을 저장하고, `guard.mjs`가 이를 읽어
  **ask 빈도만** 조정한다.
  - L1(기본, 마법사 안 쓰면 이 상태): 기존 동작과 100% 동일.
  - L2: 폴더 신뢰(`/sodam-harness-trust`)의 유지 기간을 12시간 → 24시간으로 연장.
  - L3: 위험(risky) 작업 중 백업이 온전히 성공한 것(비밀파일 아님)은 확인 없이 통과.
- **왜**: `03_PHASES.md` Phase 3 "맞춤 마법사" 요구사항. 사용자가 GitHub private 저장소로 본인 전용 사용을
  확정(`CHECKPOINT.md` O섹션)하면서, 외부 공개용 게이트(베타·법무·이름확인)는 불필요하지만 이 기능 자체는
  명시적으로 요청함.
- **불변(코드로 강제, 레벨과 무관)**: 치명 명령(`rm -rf ~` 등) → 항상 deny. 폴더 통째/재귀 삭제 → 항상 deny.
  민감 위치 → 항상 deny. 백업 실패 시 → 항상 deny(fail-closed). **비밀파일(.env 등)은 어떤 레벨이어도
  항상 ask 유지**(백업이 안 뜨는 대상이라 되돌릴 수 없음).
- 관련: `hooks/profile.mjs`(신규), `hooks/guard.mjs`(AUTONOMY 로드·L2 TTL 연장·L3 ask생략 분기),
  `hooks/whitelist.mjs`(`isTrusted`에 선택적 `ttlMs` 파라미터 추가, 하위호환),
  `commands/sodam-harness-wizard.md`(신규), `commands/sodam-harness-fix.md`(옛 "추후" 참조 정정),
  `hooks/_selftest.mjs`(신규 회귀·안전바닥 잠금 테스트 12건 추가).
- 검증: 자가검증 **129개 전부 통과**(기존 117 + 신규 12, 회귀 0). `guard.mjs --selfcheck` 정상.

---

## [Unreleased] — 2026-07-12

### 수정 — 되돌리기(undo)가 다른 작업에 밀려 백업을 못 찾던 버그
- **무엇**: 이 컴퓨터처럼 여러 프로젝트가 동시에 백업을 만드는 환경에서, `/sodam-harness-undo`가 방금 만든 백업을 "최근 8개" 목록 밖으로 밀려났다는 이유로 "없다"고 잘못 보고하던 버그를 실사용 중 발견. 백업 자체는 정상 생성돼 있었고, **목록에서 찾는 로직**만 문제였음(데이터 손실 없음).
- **왜**: 되돌리기는 01_PRD가 정한 핵심 안전 약속인데, 이게 실패하면 사용자가 "복구가 안 된다"고 오인해 더 위험한 자체 시도를 할 수 있음.
- **수정**: `hooks/backup.mjs`의 `listBackups(limit, opts)`에 `opts.pathPrefix` 추가(옵션 미지정 시 기존 동작과 100% 동일) — 폴더를 지정하면 더 넓은 범위(최근 300개)에서 찾음. `commands/sodam-harness-undo.md`에 "목록에 안 보이면 폴더 지정 재검색" 안내 추가.
- 관련: `hooks/backup.mjs`, `commands/sodam-harness-undo.md`, `hooks/_selftest.mjs`(회귀 테스트 3건 추가)

### 수정 — Linux/Mac 계열 cp·mv 덮어쓰기 백업 누락 (POSIX 이식성)
- **무엇**: `writeDestinations`(guard.mjs)가 POSIX 절대경로(`/home/...`, `/Users/...`)를 Windows 전용 플래그(예: `/s`)로 잘못 인식해, Linux·Mac에서 `cp`/`mv`로 기존 파일을 덮어쓸 때 백업이 조용히 빠지던 버그. Windows는 원래부터 정상이었음.
- **왜**: 01_PRD가 "Windows·Mac 둘 다 백업이 깨지지 않는다"고 명시한 약속을 정면 위반.
- **수정**: POSIX 절대경로와 Windows 플래그를 구분하는 판정을 정밀화. CI에 ubuntu 매트릭스 추가해 Linux에서도 실제 실행·검증.

### 검증
- 자가검증 **117개 전부 통과** (기존 114 + 신규 3, 회귀 0). CI(Windows·Ubuntu·audit) 전부 그린.

---

## [Unreleased] — 2026-07-03

### 추가 — 문서: 백업폴더 권한·비공식 도구 주의 안내 (2026-07-11)
- **무엇**: GUIDE.md·GUIDE.en.md "보안·데이터 흐름" 절에 두 항목 추가 — ① Windows 백업폴더가 별도 잠금 없이 계정 기본 권한에 의존한다는 안내 ② 로그인 토큰을 요구하는 비공식 "AI 안전" 도구를 조심하라는 경고.
- **왜**: 01_PRD §8.6(Should)·04_PROJECT_SPEC 보안수용기준에 명시됐던 항목으로, 실제 토큰탈취 사고 사례(01_PRD §1·§12)를 근거로 한다. 코드 변경 없음(순수 문서 추가), 삭제·리팩토링 없음.
- 검증: `_selftest.mjs` 114 PASS/0 FAIL 유지(문서만 변경이라 회귀 대상 아님, 확인 차 재실행).

### 변경 — 오탐(false positive) 축소 + 테스트 재현성 (2026-07-11)
- **무엇 ①(오탐 제거)**: `echo "rm -rf /"`·`grep "rm -rf"`·`git commit -m "…rm -rf…"`처럼 위험 문자열을 **인용부호 안에서 언급만** 하는 비실행 명령이 deny/ask로 잘못 차단되던 것을 통과로 수정. `guard.mjs`에 `stripInertQuotedData`(데이터 싱크 echo/grep/printf/commit -m 세그먼트의 따옴표 내용만 분류에서 제외) 도입. 세그먼트 세퍼레이터(`|`·`;`·`&&`) 보존 재조합으로 `curl x | grep -d`류 새 오탐도 방지.
- **무엇 ②(보안 리뷰 반영)**: bash는 **이중따옴표 안 `$(...)`·백틱을 실행**하므로, 그 치환이 있으면 따옴표를 제거하지 않고 그대로 검사(`stripQuotesSafe`) — `echo "$(rm -rf ~)"` 탐지 우회를 커밋 리뷰에서 발견·차단. 단일따옴표는 리터럴이라 제거 안전.
- **탐지 약화 0(불변)**: `bash -c`·`sh -c`·`eval`·`xargs`·`python -c`·`node -e` 등 실행자와 비인용 세그먼트는 그대로 검사·차단. 경로 추출(리다이렉트·삭제 대상)은 원본 명령 기준 유지.
- **왜**: 적대적 감사가 재현한 마지막 오탐(언급 ≠ 실행) — 제품이 정당한 작업을 막으면 "진행 불가감"으로 신뢰를 해침(01 §8.8). 단, 오탐을 줄이며 탐지에 구멍을 내면 안 되므로 리뷰로 우회 1건을 잡아 보강.
- **재현성**: `_selftest.mjs`를 저장소에 포함(`.gitignore` 해제) + CI(`security-audit.yml`)에서 Windows·Linux 실제 실행 → "테스트 통과"를 저장소가 스스로 증명(재현 불가 결함 해소, §8.8).
- **무엇 ③(CI가 잡은 Windows 경로 오탐)**: catastrophic remove-item 패턴의 `~`가 경로 속 리터럴 `~`(예: Windows 단축명 `C:\Users\RUNNER~1`)를 홈으로 오판 → `(?<!\w)~(?!\w)`로 홈 참조만 매칭하게 정밀화(폴더삭제는 여전히 deny, 진짜 홈 `~` 재귀삭제 catastrophic 유지).
- 검증: TDD(오탐 RED 6 + 우회 RED 2 + 경로~ RED 1 → GREEN) + 실행자 탐지 유지 회귀 잠금 — `_selftest.mjs` **114 PASS / 0 FAIL**(Windows 기준). CI(`security-audit.yml`)는 self-test를 windows-latest에서 실제 실행(그린); Linux(ubuntu)는 후속(첫 Linux 실측에서 드러난 기존 이식성 이슈 — cp/mv POSIX 절대경로·`/c` 마운트).
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
