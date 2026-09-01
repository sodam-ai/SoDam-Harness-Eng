# CHANGELOG

> 안전 규칙 변경 이력은 항상 이 파일에 **"무엇을 왜"** 와 함께 기록합니다.
> (`08_EXTENSIBILITY_AND_UPGRADE.md §3` 요구사항)

---

## [0.1.6] — 2026-09-01 (14) — 개선: 되돌리기 실행 후 보고에서 "백업 파일 자체가 없던" 경우가 조용히 누락되던 문제

### 개선 — `restore()`가 백업 파일 부재를 `skipped`로 정직하게 보고
- **무엇**: `backup.mjs`의 `restore()`가 manifest에는 있지만 실제 백업 파일 자체가 사라진 경우
  (`restorePlan()`의 `nobackup` 상태와 동일 조건)를 `if (!existsSync(f.backup)) continue;`로 그냥
  건너뛰기만 했다. `restored`·`overwritten`·`failed` 어디에도 안 남아, 여러 파일을 한 번에 되돌릴 때
  이 상태인 파일이 섞여 있으면 "N개 복구했다"는 최종 보고만 보고는 몇 개가 왜 빠졌는지 알 수 없었다.
- **왜/어떻게 발견**: 이 버그가 아니라 이전 위험 판정 로직(deny/ask)이 아니라, "실사용 완주" 요청에
  이어 "PRD 목적 대비 코드 품질" 관점으로 실제 소스를 직접 읽으며 발견 — 되돌리기 전 미리보기(`--plan`)는
  이 상태를 `nobackup`으로 정확히 미리 보여주지만, 실행 후 최종 보고 단계에만 이 정보가 빠져 있었다
  (04_PROJECT_SPEC "목업/하드코딩으로 거짓 보고 금지" 원칙과 직결).
- **수정**: `failed`와 구분되는 `skipped` 배열을 신설 — 백업 파일이 없어 건너뛴 파일의 경로를 정직하게
  기록해 반환값에 포함한다. `commands/undo.md`도 이 필드를 사용자에게 알리도록 갱신.
- **위험도**: 낮음 — 안전 판정 로직(무엇을 deny/ask 할지)은 전혀 안 건드림. 이미 성공한 복구 동작은
  그대로 두고 보고 필드만 추가하는 순수 가산 변경.
- **검증(TDD)**: `_selftest.mjs` 57번 블록(6건) 신설 — 백업 없는 파일과 정상 백업 파일이 섞인 경우
  정확히 분류되는지 확인. 전체 210 PASS/0 FAIL(기존 204 + 신규 6, 회귀 0). `guard.mjs --selfcheck` 5/5.
- 관련: `hooks/backup.mjs`, `hooks/_selftest.mjs`, `commands/undo.md`

---

## [0.1.5] — 2026-08-31 (13) — 검증 중 발견: 안 닫힌 따옴표에서 진짜 리다이렉트 탐지를 놓치던 결함(BU-1 후속)

### 수정 — `maskQuoted()`가 안 닫힌 따옴표를 만나면 그 뒤 전체를 "안전"으로 오인하던 결함
- **무엇**: (12)에서 고친 `maskQuoted()`가 따옴표가 끝까지 안 닫히는 비정상 입력(예:
  `echo "unterminated > <경로>`, 닫는 `"` 없음)을 만나면, 그 시점부터 문자열 끝까지를 전부 "따옴표
  안"으로 취급해 마스킹해 버렸다. 그 결과 그 구간에 있는 **진짜** `>` 리다이렉트까지 탐지를 놓쳐,
  민감 경로를 실제로 덮어쓰는 시도가 차단 없이 통과될 수 있었다 — (12)가 고친 "과잉차단"과 반대 방향인
  "과소탐지"(더 위험한 방향)였다.
- **왜/어떻게 발견**: (12) 배포 후 "지금까지 구현된 기능 전수 검증" 요청에 따라 자동화 스위트가 다루지
  않는 경계값(따옴표 불균형·중첩·이스케이프 등)을 별도로 프로브하다가 재현됨. 원본(수정 전) 코드는
  따옴표를 전혀 구분하지 않았으므로 이 정확한 케이스는 원래 통과 못 했을 것 — 즉 (12)가 만든 신규 회귀.
- **수정**: 마스킹 루프가 끝났는데도 여전히 "따옴표 안" 상태면(=안 닫힘), 그 따옴표가 시작된 지점부터
  끝까지는 마스킹을 신뢰하지 않고 원본 문자 그대로 되돌린다 — 안 닫힌 구간의 `>`는 계속 탐지된다
  (fail-safe: 판정 불가한 구간은 잡는 쪽으로 기움, 07_AUDIT B1과 동일 원칙). 정상적으로 닫힌 따옴표는
  전혀 영향 없음(대조군으로 확인).
- **검증(TDD)**: `_selftest.mjs` 56번 블록(3건) 신설 — RED(정확히 이 결함 2건만 FAIL, 202/2) →
  GREEN(전체 204 PASS/0 FAIL, 회귀 0). `guard.mjs --selfcheck` 5/5. 배포 후 재실행 2회 연속
  204 PASS/0 FAIL로 안정성 재확인.
- 관련: `hooks/guard.mjs`, `hooks/_selftest.mjs`

---

## [0.1.4] — 2026-08-31 (12) — 보안 수정: 읽기전용 명령이 인용부 안 '>' 오인으로 오탐 deny되던 결함(BU-1)

### 수정 — `writeDestinations()`가 따옴표 안의 '>'를 실제 리다이렉트로 오인하던 결함
- **무엇**: `hooks/guard.mjs`의 `writeDestinations()`가 셸 명령 원문을 그대로 스캔해 `>` 문자를 찾다 보니,
  따옴표(인용부) 안에 있는 `>`(예: JS 비교식 `if(1>0)`)까지 실제 리다이렉트 연산자로 오인하는 경우가 있었다.
  그 결과 인용부 안에서 민감 경로(예: `~/.claude/settings.local.json`)를 **읽기만** 하거나 단순히
  언급만 하는 명령이, 그 경로를 실제로 "쓰기 대상"으로 오판해 잘못 차단(deny)될 수 있었다.
- **왜**: `.PRD/CHECKPOINT.md` §BU가 이 문제를 처음 지적했다. 다만 이번에 실제로 재현해 보니 §BU가
  적어둔 원문 예시(화살표 함수 `v=>v>1`를 언급하는 경우) 자체는 재현되지 않았음을 직접 검증으로 확인했다
  (문서의 기록이 부정확했던 부분 — 정정). 대신 **'>' 바로 뒤에 공백 없이(또는 따옴표로 감싸) 민감 경로가
  곧장 이어지는 실제 계산식**(예: `if(1>0){...'<민감경로>'...}`, `1>경로`, `x=1>'경로'`)에서는 실제로
  오탐이 재현됨을 스크립트로 직접 확인했다 — 안전 자체를 낮추는 문제는 아니지만(과잉차단 방향), 01_PRD
  §0의 본래 목적(AI를 안전하게 돕는 것)과 반대로 정상 작업까지 막아 실사용 마찰을 만드는 결함이었다.
- **수정**: 따옴표 안 문자를 중립 문자로 치환한 "마스크" 버전에서 `>` 연산자 위치만 찾고, 실제 대상
  텍스트는 원본에서 그대로 추출하는 `maskQuoted()`를 신설해 적용(위치가 원본과 1:1 대응돼 텍스트 값은
  훼손되지 않는다). 기존 `stripInertQuotedData`(E-2, DATA_SINK 한정)와는 별개의 더 근본적인 메커니즘 —
  DATA_SINK 여부와 무관하게 항상 적용된다.
- **안전바닥 무손상**: 진짜 리다이렉트로 민감 경로를 덮어쓰는 시도(`echo pwned > "<민감경로>"`)는
  수정 후에도 여전히 deny — 대조군으로 직접 확인.
- **검증(TDD)**: `_selftest.mjs`에 55번 블록(4건) 신설 — 수정 전 RED(2건 FAIL, 정확히 결함 위치) 확인 →
  수정 후 GREEN(전체 201 PASS/0 FAIL, 기존 197건 회귀 0) 확인. `guard.mjs --selfcheck` 5/5 정상.
- 관련: `hooks/guard.mjs`, `hooks/_selftest.mjs`, `.PRD/CHECKPOINT.md §BU·§BV`

---

## [Unreleased] — 2026-08-03 (11) — CI: 금지 패턴 검사를 (10)의 새 예외에 맞게 정밀화

### 수정 — "AUDIT-ALLOW" 표식이 붙은 줄만 예외로 인정(완화 아닌 정밀화)
- **무엇**: (10)에서 추가한 `hooks/guard.mjs`의 `import ... from "node:child_process"`가 CI의
  "금지 패턴 스캔"(`security-audit.yml`)에 걸려 `audit` 작업이 실패했다. 그 검사는 `child_process`가
  코드 어디에 있든 예외 없이 실패시키는 규칙이었다.
- **왜**: (10)의 예외는 의도적이고 좁게 설계된 것(고정 인자만, AI 텍스트 미개입)이라 CI가 이걸 다른
  임의의 `child_process` 사용과 똑같이 취급하는 건 부정확했다. 그렇다고 검사를 통째로 느슨하게 만들면
  앞으로 다른 곳에 실수로 들어오는 `child_process`까지 놓치게 된다.
- **수정**: 코드 줄에 `AUDIT-ALLOW` 표식(보이는 주석)을 붙이고, CI grep에 `| grep -v "AUDIT-ALLOW"`
  한 줄만 추가 — **이 표식이 붙은 줄만** 통과하고, 표식이 없는 다른 모든 줄(지금·앞으로 어떤 파일이든)은
  기존과 동일하게 100% 차단된다. `--no-verify` 같은 조용한 우회가 아니라 코드에 그대로 남는, 검색되는
  표식이라 나중에 누가 봐도 "왜 예외인지" 바로 보인다.
- **검증**: CI와 동일한 grep 명령을 로컬에서 직접 재현해 통과 확인 → 실제 push 후 CI(`audit`·
  `selftest` ubuntu/windows) 재확인으로 완결. `_selftest.mjs` 190 PASS/0 FAIL 유지(회귀 0).
- 관련: `hooks/guard.mjs`, `.github/workflows/security-audit.yml`

---

## [Unreleased] — 2026-08-02 (10) — 신규 안전 기능: git commit 직전 스테이징된 비밀파일 이름 검사(U3)

### 추가 — `git commit`이 비밀파일(.env 등)을 스테이징한 채 커밋되기 전에 확인 요청
- **무엇**: `git commit` 명령을 감지하면 `guard.mjs`가 `git diff --cached --name-only`(고정 인자,
  스테이징된 파일 **이름만** 조회, 내용은 절대 안 봄)를 실행해, 그 이름들이 비밀파일 패턴
  (`isSecretFile` — `.env`·`*auth*`·`*.pem`·`id_rsa` 등)에 걸리면 커밋 전에 `ask`로 확인을 요청한다.
- **왜**: 01_PRD §8.6이 가장 중요하게 여기는 위협(인증정보가 새어나가는 것)을 막기 위한 마지막
  빈틈이었다. 지금까지 `git add`·`git commit`·일반 `git push`는 어떤 검사도 거치지 않아, 초보자가
  실수로 `.env`를 커밋·push하면 아무도 막지 못했다(한 번 push되면 git 기록에서 지우기 매우 어려움 —
  이 제품이 지켜온 "백업+되돌리기" 원칙이 전혀 안 통하는 유일한 사각지대였음).
- **불변 원칙과의 관계(정직하게 명시)**: 이 제품의 핵심 규칙은 "명령/경로는 검사만, 절대 실행 안 함"
  이다. 이번 기능은 그 규칙의 **유일한 예외**다 — 스테이징된 파일 목록은 git 자신에게 물어보는
  것 외엔 알 방법이 없기 때문. 대신 인자는 전부 고정값(`git diff --cached --name-only`)이라
  AI가 만든 어떤 텍스트도 이 호출에 섞이지 않는다. `guard.mjs` 상단 주석에 이 예외를 명시했다.
- **범위(의도적으로 좁힘)**: `git commit` 시점만 검사한다. 원래 검토안은 "push 시점"이었으나,
  commit이 로컬 히스토리에도 안 들어가는 **더 이른** 보호 지점이고, push 시점 검사는 업스트림
  브랜치 판단이 더 복잡해(새 브랜치는 업스트림이 없을 수 있음) 이번 범위 밖으로 남겼다(후속 과제).
- **fail-closed**: `git diff` 실행 자체가 실패하면(예: 실제 git 저장소가 아님) "괜찮다"고 조용히
  통과시키지 않고 확인을 요청한다(07_AUDIT B1과 동일 원칙 — 불확실하면 ask).
- **검증**: `_selftest.mjs` 52번 블록 신설(비밀파일 감지+ask · 실제 비밀값은 메시지에 안 나옴(파일명만
  봄을 증명) · 비밀 아닌 파일은 과잉차단 없이 통과 · commit 없는 `git push` 단독은 무관 · 저장소 아닌
  곳에서 fail-closed) — 기존 회귀 테스트 2건(자동커밋 통과·E-2 인용문자열 오탐방지)이 non-git 임시
  폴더를 쓰고 있어 새 검사와 충돌, 실제 git 저장소로 이전해 계속 통과하도록 수정. **190 PASS/0 FAIL**
  (기존 184 + 신규 6, 회귀 0). `guard.mjs --selfcheck` 정상.
- 관련: `hooks/guard.mjs`(신규 import `node:child_process`), `hooks/_selftest.mjs`,
  `.PRD/11_PRECISION_TUNING_LOG.md`(U3 완료 반영)

---

## [Unreleased] — 2026-08-02 (9) — CI: ubuntu selftest가 6일째 실패 중이던 것 발견·수정(테스트 전용 결함)

### 수정 — 46번(백업정리 스로틀) 테스트가 Linux에서 격리 안 되던 버그
- **무엇**: `_selftest.mjs`의 46번 블록이 가짜 홈 디렉터리로 `USERPROFILE` 환경변수만 override했는데,
  Node.js `os.homedir()`는 **Windows에선 `USERPROFILE`, POSIX(Linux/Mac)에선 `HOME`**을 읽는다 —
  Linux에서는 override가 전혀 먹히지 않아 실제 CI 러너의 홈 디렉터리를 계속 사용, 격리된 가짜
  마커 파일 경로를 영영 못 찾아 테스트가 실패했다.
- **어떻게 발견**: (8)번 수정을 push한 뒤 CI 결과를 확인하는 과정에서 `selftest (ubuntu-latest)`가
  실패함을 발견. 실행 이력을 역추적한 결과 **스로틀 기능이 도입된 첫 push(2026-07-26 17:21,
  `30212389000`)부터 지금까지 6일 내내 ubuntu에서 실패하고 있었음**을 확인 — 이번 세션의 ren/cp/mv
  수정과는 무관한, 훨씬 이전부터 있던 미발견 결함(그 사이 CI는 결제 문제로도 막혀 있어 아무도
  로그를 자세히 못 봤을 가능성이 높음).
- **중요**: `guard.mjs`·`backup.mjs`(제품 코드)는 **무결함** — 결함은 테스트의 격리 메커니즘 자체에만
  있었다. Windows에서는 우연히 통과해왔을 뿐(로컬 검증이 전부 Windows였던 이유와 일치).
- **수정**: `runWrite()`의 env override에 `HOME`도 함께 지정(`USERPROFILE`과 나란히) — 플랫폼 무관하게
  격리 작동.
- **검증**: 로컬(Windows) 178 PASS/0 FAIL 유지(회귀 0, `HOME` 추가가 Windows 동작에 영향 없음 확인).
  실제 Linux 검증은 이 커밋 push 후 CI 재확인으로 완료.
- 관련: `hooks/_selftest.mjs`

---

## [Unreleased] — 2026-08-02 (8) — 심각: cp/mv/Copy-Item/Move-Item이 목적지의 동명 기존 파일을 백업 없이 덮어쓰던 결함

### 수정 — 목적지 폴더 안 동명 기존 파일(피해자)이 백업·확인 어디에도 안 잡히던 버그
- **무엇**: `cp 파일 폴더`·`mv 파일 폴더`(및 PowerShell `Copy-Item`·`Move-Item`)가 **이미 존재하는 폴더**로
  향하고, 그 폴더 안에 **원본과 같은 이름의 파일이 이미 있으면**, 그 기존 파일(피해자)이 **백업 없이
  조용히 덮어써지던** 버그. `mv`는 (5)번에서 원본은 이미 보호했지만, **목적지의 피해자는 그때도 여전히
  무방비**였다 — 서로 다른 대상(원본 vs 목적지 피해자)이라 (5)번 수정이 커버하지 못했다.
- **어떻게 발견**: (7)번 ren 수정을 제안하며 "cp는 원본이 안 사라지므로 심각도가 낮다"고 적었던 판단을
  다시 깊게 검토하는 과정에서, "원본은 안 사라져도 목적지의 기존 파일은 사라질 수 있다"는 점을 재인식.
  격리된 임시 폴더에서 `guard.mjs`를 직접 호출해 재현 — cp/mv/Copy-Item/Move-Item **4종 전부**에서
  목적지의 동명 기존 파일이 백업 매니페스트에 전혀 안 잡힘을 확인(cp/Copy-Item은 확인창조차 없이 완전
  통과, mv/Move-Item은 확인창은 떴으나 원본만 백업되고 피해자는 누락).
- **근본 원인(코드 직접 추적, 확인됨)**: `writeDestinations()`가 목적지로 "폴더 자체"만 후보로 잡는데,
  `owExisting` 필터가 `existsSync && isFile()`만 통과시켜 폴더는 걸러진다. 그 폴더 **안**의 실제 덮어쓰기
  대상(원본과 동일한 파일명)은 애초에 후보 목록에 들어간 적이 없었다 — "폴더로 향하는 cp/mv"라는 대상
  자체가 부정확하게 모델링돼 있었다.
- **수정**: 목적지가 실제 존재하는 폴더면 `path.join(목적지폴더, basename(원본))`을 추가 후보로 계산하는
  `collisionVictim()` 신설, `writeDestinations()`의 cp/mv/copy/move 분기와 PowerShell Copy-Item/Move-Item
  분기에 적용. Out-File은 원본 개념이 없어(파이프라인 입력) 대상 아님.
- **TDD 과정에서 발견한 2차 결함(같은 세션에 즉시 수정)**: PowerShell 분기 구현 중 `Copy-Item -Path X
  -Destination Y` 순서로 회귀 테스트가 실패(RED) — 원인을 추적한 결과, 기존 코드가 `-Destination`·
  `-FilePath`·`-Path`·`-LiteralPath` 4개 플래그를 **하나의 정규식으로 뭉뚱그려** 문자열에서 먼저 나오는
  것을 목적지로 취급하고 있어, `-Path`가 `-Destination`보다 앞에 오면 **원본을 목적지로 오인**하는
  사전부터 있던 결함이 드러났다. `-Destination`(목적지)과 `-Path`/`-LiteralPath`(원본)를 별도 정규식으로
  정확히 구분하고, 부족한 쪽만 남은 위치인자로 보충하도록 재작성(순서 무관하게 정확).
- **검증**: `_selftest.mjs`에 회귀 테스트 6건 신설(50a~f — mv·cp·Move-Item·Copy-Item 각각 피해자 백업
  확인, 동명 파일 없을 때 과잉차단 없는 대조군, Out-File 무관 대조군) → **178 PASS / 0 FAIL**(기존 168 +
  신규 6, 회귀 0). 기존 mv/ren 보호((5)(7)번)와 완전히 공존 확인. `guard.mjs --selfcheck` 정상.
- 관련: `hooks/guard.mjs`, `hooks/_selftest.mjs`, `.PRD/CHECKPOINT.md`(AE섹션 갱신)

---

## [Unreleased] — 2026-08-02 (7) — 심각: ren/rename/Rename-Item 원본이 백업 없이 사라지던 안전 바닥 결함

### 수정 — ren/rename/Rename-Item의 원본(source)이 백업·확인 어디에도 안 잡히던 버그
- **무엇**: `ren 파일 새이름`(cmd.exe) · `Rename-Item -Path 파일 -NewName 새이름`(PowerShell) ·
  `rename 파일 새이름`(동의어 유틸)이 **백업도, 확인(ask)도 없이 통째로 통과(passThrough)** 되던 버그.
  `mv`는 (5)번에서 이미 고쳤는데, 이름변경 계열은 같은 유형의 무방비 경로로 남아 있었다.
- **어떻게 발견**: (5)번 mv 수정 이후 남은 안전 구멍을 점검하는 과정에서, 격리된 임시 폴더 안
  `guard.mjs`를 직접 서브프로세스로 호출해 재현 — `ren`·`Rename-Item`·`rename` 3종 전부 판정 없이
  통과됨을 확인(대조군 `mv`·`cp`는 정상적으로 ask+백업).
- **근본 원인(코드 직접 추적, 확인됨)**: `RISKY` 배열에 이름변경 계열 패턴이 없어 `classify()`가
  `"safe"`를 반환 → `level==="safe"`라 `commandPaths()`가 호출되지 않아 원본이 삭제 후보에도 안
  들어갔다((5)번 mv 버그와 동일한 회로).
- **수정**: `RISKY`에 `/\bren\b/i`·`/\brename\b/i`·`/\brename-item\b/i` 3개 추가. `writeDestinations()`
  수정은 **불필요** — `level`이 risky가 되면 `commandPaths()`가 위험 세그먼트의 위치 인자(원본명+새이름)를
  전부 후보로 잡아, 존재하는 쪽(원본)이 자동으로 `backupPaths()`에 들어간다(존재 안 하는 새 이름은
  `existsSync` 필터로 조용히 걸러짐, 에러 아님). `isDeleteCommand()`(폴더-차단 게이트용 DELETE_SIGNAL)에는
  **의도적으로 추가하지 않음** — mv와 동일 이유로, "폴더를 이름변경 대상으로 언급"만으로 FOLDER_DENY
  오차단이 나지 않게 하기 위함.
- **검증**: `_selftest.mjs`에 회귀 테스트 6건 신설(49a~e — cmd ren·PowerShell Rename-Item·rename 유틸
  3종 각각 ask+원본 백업 확인, 폴더 대상 언급 시 FOLDER_DENY 오차단 없음 확인, 진짜 재귀삭제는 무관하게
  여전히 deny인 대조군) → **168 PASS / 0 FAIL**(기존 162 + 신규 6, 회귀 0). `guard.mjs --selfcheck` 정상.
- **범위 밖(알려진 한계, 이번엔 손대지 않음)**: `cp`/`Copy-Item`이 목적지 폴더 안 동명 기존 파일을
  덮어쓸 때 백업이 누락되는 갭은 (5)번부터 이미 문서화된 별개 항목(원본은 안 사라지므로 심각도 낮음) —
  이번 수정과 분리, 별도 착수 예정.
- 관련: `hooks/guard.mjs`, `hooks/_selftest.mjs`, `.PRD/CHECKPOINT.md`(AE섹션)

---

## [Unreleased] — 2026-07-27 (6) — README 종합 문서화 + GUIDE 문서 제거

### 문서 — README.md/README.en.md를 단일 종합 문서로 재작성, GUIDE.md/GUIDE.en.md 제거
- **무엇**: 그동안 README(요약)와 GUIDE(상세)로 나뉘어 있던 사용자 문서를, 설치·사전준비물·다운로드·
  아키텍처·워크플로우·보안/데이터흐름·명령어·문제해결·FAQ·라이선스를 모두 담은 **README.md(한국어
  기본)·README.en.md(영어) 단일 문서**로 통합했다. 같은 소스로 README.html/README.en.html도 재생성.
  GUIDE.md·GUIDE.en.md·GUIDE.html·GUIDE.en.html은 내용이 README로 흡수되어 제거했다.
- **반영**: mv/Move-Item 안전 수정((5)번 항목)을 위험 동작 표·워크플로우·업데이트 요약에 반영, 자가검증
  개수를 최신치(162개)로 갱신, "현재 배포 상태(PRIVATE)" 사실 고지 신설.
- **정리**: GUIDE.md를 가리키던 `AGENTS.md`·`DEVELOPMENT.md`의 링크를 README.md로 정정, `.gitignore`의
  `!/GUIDE.html`·`!/GUIDE.en.html` 예외 규칙 제거.
- 관련: `README.md`, `README.en.md`, `README.html`, `README.en.html`, `AGENTS.md`, `DEVELOPMENT.md`,
  `.gitignore`

---

## [Unreleased] — 2026-07-27 (5) — 심각: mv/move/Move-Item 원본이 백업 없이 사라지던 안전 바닥 결함

### 수정 — mv/move/Move-Item의 원본(source)이 삭제 후보·백업 대상 어디에도 안 잡히던 버그
- **무엇**: `mv 파일 폴더`(또는 PowerShell `Move-Item 파일 폴더`)처럼 **목적지가 이미 존재하는 폴더**일 때,
  이동되는 원본 파일이 **백업도, 확인(ask)도 없이 통째로 통과(passThrough)** 되던 버그. `rm`은 이미
  RISKY로 분류돼 백업+확인을 거치는데, `mv`는 그 목록에 없어 원본이 사라지는 더 위험한 우회로였다.
- **어떻게 발견**: 실사용 중(`D:\Test_Dev\test1`) 폴더 통째 삭제가 정상적으로 deny된 뒤, 그 안내문(
  "폴더 안의 파일부터 하나씩 지워 보세요, 그건 백업돼요")을 따라 개별 삭제를 시도하는 과정에서 파일들이
  백업 저장소가 아니라 상위 폴더에 그대로 튀어나오고 `.env`가 완전히 사라지는 사고가 실제로 발생했다.
  `~/.sodamharness/backups/`·`activity.log`를 직접 대조해 재구성: 06:25:33에 폴더-삭제-거부 직전
  방어적 백업(3개 원본 파일, 내용 정확)이 정상적으로 일어났음을 먼저 확인했고, 06:38:05에 실행된
  `mv` 한 번이 이 방어망을 완전히 우회했음을 코드 추적으로 확정했다.
- **근본 원인(코드 직접 추적, 확인됨)**: `writeDestinations()`의 주석 "삭제(rm)와 달리 대상만
  위험하다(원본 source는 읽기일 뿐)"는 `cp`에는 맞지만 **`mv`에는 틀린 가정**이다. 목적지가 폴더면
  `writeDestinations()`가 그 폴더 자체를 "대상"으로 잡는데, `owExisting` 필터가 `existsSync && isFile()`만
  통과시켜 폴더는 걸러진다. 동시에 `mv`가 RISKY 목록에 없어 `level==="safe"`가 되고, `commandPaths()`는
  `level!=="safe"`일 때만 호출되므로 원본도 후보에 안 들어간다 — 결과적으로 `level==="safe" &&
  owExisting.length===0`(694행)에 걸려 **완전 통과**됐다.
- **수정**: `RISKY` 배열에 `mv`·`move`·`move-item`(PowerShell) 패턴 추가. `isDeleteCommand()`(폴더-차단
  게이트용 DELETE_SIGNAL)에는 **의도적으로 추가하지 않음** — 추가하면 "폴더를 목적지로 언급"만 해도
  이전에 고친 (4)번 버그가 다른 형태로 재현되기 때문(자세한 이유는 코드 주석 참고).
- **부수 확인(안전, 사고 아님)**: `.env`가 백업 없이 사라진 것은 버그가 아니라 **설계대로**(비밀파일은
  백업 저장소에 남기지 않음, K섹션에 이미 문서화됨) — 다만 이번엔 그 사실이 `mv` 우회로 인해 사용자가
  경고 문구를 못 보고 지나갔을 가능성이 있다. `hello.txt`·`greeting.html`은 세션이 자체 기억으로
  재작성한 내용이 진짜 원본 백업(06:25:33)과 바이트 단위로 동일함을 diff로 확인 — 실질적 콘텐츠 손실은
  없었다.
- **검증**: 회귀 테스트 5건 추가(48a~c) — mv/Move-Item 원본이 이제 ask+백업되는지, 백업 매니페스트에
  source가 정확히 기록되는지, 목적지가 폴더여도 FOLDER_DENY로 오차단되지 않는지(안전바닥 무손상),
  cp(비파괴적 복사)는 기존 동작 그대로인지(회귀 0). **162 PASS / 0 FAIL**(기존 157 + 신규 5).
  `guard.mjs --selfcheck` 정상.
- **알려진 한계(범위 밖으로 명시)**: `cp`/`copy`/`Copy-Item`이 목적지 폴더 안의 동명 기존 파일을
  덮어쓰는 경우도 같은 "폴더 vs 파일" 오탐지로 인해 그 파일의 백업이 누락될 수 있다(원본 자체는
  안 사라지므로 이번 사고보다 훨씬 낮은 심각도) — 이번 수정 범위 밖으로 명시, 별도 후속 과제.

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
