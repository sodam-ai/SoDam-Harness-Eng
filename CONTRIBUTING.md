# SoDamHarness 기여 가이드

SoDamHarness는 **완전 초보자를 위한 AI 안전벨트**입니다.
기여하기 전에 PRD §0의 핵심 원칙("안전벨트 자체가 가장 믿을 수 있어야 한다")을 꼭 읽어 주세요.

---

## 위험 패턴 제보하기

새로운 위험 명령 패턴을 발견했으면 **코드 PR보다 이슈 제보**를 먼저 해주세요.

이슈에 포함할 내용:
1. 발견한 위험 명령 (예: `shred -u file.txt`)
2. 왜 위험한지 (예: "되돌리기 불가능한 파일 영구 삭제")
3. 재현 방법 또는 참고 링크

패턴이 검증되면 `hooks/safety-rules.json`의 형식으로 추가됩니다.

---

## 코드 PR 전 체크리스트

아래를 모두 통과해야 PR을 올릴 수 있습니다:

```bash
# 1. 전체 자동화 테스트 (72/72 PASS 유지)
node hooks/_selftest.mjs

# 2. 안전벨트 자가점검
node hooks/guard.mjs --selfcheck

# 3. npm audit (고위험 없어야 함)
npm audit --audit-level=high
```

체크리스트:
- [ ] `node hooks/_selftest.mjs` → 72/72 PASS (기존 테스트 감소 없음)
- [ ] `node hooks/guard.mjs --selfcheck` → 정상 ✅
- [ ] `npm audit --audit-level=high` → 고위험 없음
- [ ] 외부 의존성 추가 없음 (`package.json dependencies: {}` 유지)
- [ ] 비밀값·토큰 하드코딩 없음
- [ ] `eval`, `exec`, `fetch`, `child_process` 사용 없음
- [ ] Apache-2.0 또는 호환 라이선스 코드만 사용

---

## safety-rules.json 커스텀 규칙 형식

사용자가 직접 `~/.sodamharness/safety-rules.json`에 추가할 수 있는 형식입니다:

```json
{
  "version": 1,
  "catastrophic": ["shred\\s+-u"],
  "risky": ["my-dangerous-command"],
  "recursiveDelete": [],
  "sensitivePaths": {
    "windows": [],
    "posix": ["/my/sensitive/path"],
    "homeSubdirs": [".myapp-credentials"]
  }
}
```

- 값은 **정규식 문자열**입니다 (대소문자 무시)
- 잘못된 정규식은 조용히 무시됩니다 (기본 보호는 항상 유지)
- 이 파일은 기본 보호에 **추가**만 합니다 (기본 보호를 약화시킬 수 없음)

---

## 라이선스

기여하면 Apache-2.0 라이선스로 배포됩니다.
AGPL/GPL 코드는 포함할 수 없습니다.
