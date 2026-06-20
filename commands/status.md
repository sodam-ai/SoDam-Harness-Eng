---
name: status
description: 자가진단 — 지금 상태와 다음에 할 일을 알려줌 (초보자용).
---

SoDamHarness의 상태를 점검하고 **쉬운 한국어**로 "지금 상태 + 다음에 누를 것"을 알려주세요.

다음을 확인합니다(필요하면 Bash로):
1. **Node.js**: `node --version` — 없으면 설치 안내(https://nodejs.org, LTS).
2. **백업 폴더**: 사용자 홈의 `.sodamharness/backups/` 에 백업이 쌓여 있는지 확인합니다.
   - 확인 방법: `node "${CLAUDE_PLUGIN_ROOT}/hooks/backup.mjs" --list` (최근 백업 몇 개를 보여줌)
   - 백업이 너무 많이 쌓였으면 "오래된 백업 정리"를 안내: `node "${CLAUDE_PLUGIN_ROOT}/hooks/backup.mjs" --cleanup` (최근 50개·14일 이내는 무조건 보존, 그보다 오래된 것만 정리).
3. **안전벨트 동작 여부**: 위험 작업 훅(guard)이 설치돼 있는지(플러그인이 켜져 있으면 동작).

결과를 이렇게 보고하세요:
- ✅/⚠️ 항목별 한 줄 요약(어려운 말 금지).
- **다음에 할 것 하나**를 콕 집어: 예) "백업이 아직 없어요 — 연습 삼아 파일 하나를 고쳐 보면 백업이 생겨요." 또는 "Node.js가 없어요 — 먼저 설치하세요(위 링크)."

문제가 있으면 `/sodamharness:fix` 를 안내하세요. 과장("100% 안전") 금지.
