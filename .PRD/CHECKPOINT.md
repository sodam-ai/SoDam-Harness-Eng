# SoDamHarness — 구현 체크포인트 (PRD 적합성 + 전체 구현 로드맵)

> 작성: 2026-06-23 · 근거: PRD 00~08 전체 + 코드 직접 검증 + `node hooks/_selftest.mjs` **56 PASS / 0 FAIL** + 보안 grep 위반 0 + `dependencies:{}`.
> 목적: ① "PRD대로 구현됐는지" 객관 검증 결과 고정 + ② 남은 전체를 구현하기 위한 **단일 추적 문서**.
> 원칙: "코드로 구현 가능 / 사람·외부 결정 / 의도적 나중" 을 섞지 않는다(정직).

---

## A. Phase 1 (MVP) 적합성 — 코드로 구현 가능한 부분

| PRD 요구 | 상태 | 증거 |
|---|---|---|
| §3① 안전 가드레일(삭제·덮어쓰기·배포·외부전송 → deny/ask + 백업 + 되돌리기) | ✅ done | guard.mjs·backup.mjs, self-test |
| §3② 초보자 말투 Skill | ✅ done | skills/beginner-tone/SKILL.md |
| §3③ 설치·자가진단(install/status/fix/undo) | ✅ done | commands/ + status `--selfcheck` |
| §8.1~8.8 보안 MUST | ✅ done | 위험3등급·eval0·비밀미저장(A3)·의존성0·fail-closed(B1)·정직(8.8) |
| §10 문서(README·GUIDE·TESTING 한·영·제거·트러블슈팅) | ✅ done | 존재 + 정합화 |
| 손시뮬 H1~H7 | ✅ done | 반영 완료 |
| 배선(plugin.json `hooks` 등록·marketplace `source:"./"`) | ✅ done | 공식문서 검증(커밋 9ab1692) |
| 07_AUDIT A3·B1·B2·C2·D2 | ✅ done | 이번 세션 커밋 |

**검증 커맨드**: `node hooks/_selftest.mjs` → 0 FAIL · 보안: hooks/*.mjs에 `eval|exec|fetch|http` 실호출 0.
**done-when (Phase1 코드)**: 위 전부 ✅ → **충족.**

---

## B. 남은 작업 — 마일스톤 (전체 PRD 구현 로드맵)

### M1. 위험패턴 데이터화 (safety-rules.json) — ✅ 완료 (2026-06-23)
- 한 것: `hooks/safety-rules.json` 신설 + 사용자 `~/.sodamharness/safety-rules.json`(또는 `SODAM_RULES_FILE`) 병합.
  guard가 catastrophic/risky/recursiveDelete/sensitivePaths(win·posix·homeSubdirs)를 데이터로 **추가** 로드(08 §2 "이것도 막아줘 → 데이터 1줄").
- 설계: 기본 패턴은 코드 유지(fail-safe·검증됨) + 데이터는 *추가만* → 회귀 0. 파일 없음/깨짐/잘못된 정규식은 무시(fail-safe).
- 검증: self-test 60 PASS/0 FAIL(기존 56 그대로 + M1 4: 커스텀 risky·민감경로·깨진 파일 fail-safe).

### M2. D1 세션 화이트리스트 (ask 피로 완화) — ⏸ 보류
- 트리거(둘 다 충족 시): M1(safety-rules.json) 완료 + **실초보 베타에서 ask 피로 실측**.
- 할 것: M1 데이터 위에 "조용히" 규칙으로 통합(별도 저장소 금지). deny는 절대 화이트리스트 불가·백업은 유지.
- 상태: deferred (08 §4 백로그 기록).

### M3. E1 경로 엣지 — ⚠️ 저빈도
- 할 것: junction(reparse) 판정(lstat 한계), UNC(`\\server\share`) 민감 검사, 한글 홈경로 회귀 테스트.
- 검증: 플랫폼별 self-test 케이스 추가.
- done-when: junction/UNC가 민감위치 우회 못 함. 상태: pending(엣지).

### M4. Phase 2 (전제: Phase1 베타 통과) — 🚫 지금 범위 밖
- 활동기록(경량 관측) / 자가검증 루프 / Codex 지원(AGENTS.md + config.toml). (03 Phase 2)

### M5. Phase 3 — 🚫 범위 밖
- 맞춤 마법사 / 정식 공개 / 영어·다도구. (03 Phase 3)

---

## C. 내가(AI) 못 하는 것 — 사람/외부 필요 (코드 아님)

- **실초보 1~3명 베타** (§5·§10.4·05) — BETA.md를 테스터에게 건네 설치→파일생성→삭제→undo 도달 관찰. **Phase1 졸업의 진짜 게이트.**
- **실설치 hook 발화 확인** — 마켓플레이스 설치 후 위험명령이 실제로 막히는지(정적 검증까지만 완료).
- **Mac 실기기 검증** — Windows만 실측, Mac은 동일 코드·미실측.
- **§9 법무 5건 + 이름 충돌 확인** — 라이선스 최종확정·저작권자/연도·제품명 상표·책임한도 문구·AGPL 점검 (PRD가 "공개할 때 확정"으로 둠).
- **A1/A2 번들 공존** — 2번째 형제(SoDamLoop 등) 빌드 시 선결.

---

## D. 한 줄 결론
**Phase-1 Harness 단독의 코드 구현·보안·배선·문서는 전부 완료·검증.** 남은 건 (M1 데이터화·M3 엣지=선택) + (C: 사람 베타·법무=AI 불가). **지금 가장 큰 다음 한 걸음은 코드가 아니라 "베타 실행"이다.**
