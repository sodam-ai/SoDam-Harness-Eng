# SoDamHarness — 조사 출처

> PRD 작성 중 참고한 웹 조사 출처. 근거 확인·구현 참고용.
> 조사일: 2026-06-20

---

## 1. 플러그인 구조·마켓플레이스

- [Create plugins — Claude Code Docs](https://code.claude.com/docs/en/plugins) — 플러그인 표준 구조(`.claude-plugin/plugin.json`, skills/commands/agents/hooks/.mcp.json)
- [claude-code/plugins/README.md (anthropics)](https://github.com/anthropics/claude-code/blob/main/plugins/README.md) — 공식 플러그인 구성요소
- [Build Your Own Claude Code Marketplace (DEV)](https://dev.to/nagell/build-your-own-claude-code-marketplace-scaffold-structure-and-auto-updates-4n3f) — 마켓플레이스 repo 구조·자동 업데이트
- [Claude Code Plugins Complete Guide (hidekazu-konishi)](https://hidekazu-konishi.com/entry/claude_code_plugins_complete_guide.html) — skills/hooks/agents/MCP 번들 배포

**핵심**: 플러그인 = GitHub repo + 표준 폴더 구조. name이 skill 네임스페이스가 됨.

---

## 2. 안전 가드레일·hooks

- [Hooks reference — Claude Code Docs](https://code.claude.com/docs/en/hooks) — hooks 공식 레퍼런스
- [Claude Code Hooks on Windows, Linux, and macOS (2026)](https://claudefa.st/blog/tools/hooks/cross-platform-hooks) — **Node.js(.mjs) 훅 권장**, `os.homedir()`·`windowsHide:true` 크로스플랫폼
- [Claude Code Hooks: Guardrails That Actually Work (paddo.dev)](https://paddo.dev/blog/claude-code-hooks-guardrails/) — 가드레일로서의 hooks
- [karanb192/claude-code-hooks (GitHub)](https://github.com/karanb192/claude-code-hooks) — 재사용 가능한 훅 모음(라이선스 확인 필요)
- [What Claude Code Hooks Can and Cannot Enforce (Boucle)](https://blog.boucle.sh/posts/what-claude-code-hooks-can-and-cannot-enforce/) — 훅의 한계

**핵심**: PreToolUse 훅이 `permissionDecision: "deny"`를 반환하면 **AI가 못 뚫는 결정적 차단**. 안전 강도 critical→strict 단계화 가능.

---

## 3. 초보자·비개발자 안전

- [ai agent safety rules non technical builders (MindStudio)](https://www.mindstudio.ai/blog/ai-agent-safety-rules-non-technical-builders) — 비개발자도 AI 에이전트로 실제 피해(DB 삭제·설정 덮어쓰기) 가능, 습관으로 예방
- [Secure Claude Code: Prevent AI Disasters (Medium)](https://medium.com/@amareswer/secure-claude-code-prevent-ai-disasters-23435062d381) — 권한·샌드박스·백업·모니터링
- [AGENTS.md vs CLAUDE.md (Ralphable)](https://ralphable.com/blog/agents-md-vs-claude-md-ai-coding-agents-2026) — 설정 파일 비교(Codex 지원 설계 참고)
- [Decoding the Configuration of AI Coding Agents (arxiv)](https://arxiv.org/html/2511.09268v1) — CLAUDE.md 설정 패턴 분석

**핵심**: 플러그인·hooks는 **사용자 권한으로 코드 실행**하는 신뢰 구성요소 → 의존성처럼 취급, hooks 3~6개월 재검토. 초보자는 작은 플러그인 묶음으로 시작 권장.

---

## 참고: 이 조사가 PRD에 반영된 곳

| 조사 결과 | 반영 위치 |
|-----------|----------|
| Node.js 훅 크로스플랫폼 권장 | 04_PROJECT_SPEC 기술 스택·"절대 하지 마" |
| hooks `deny` = 결정적 차단 | 01_PRD §8, 03_PHASES Phase 1 프롬프트 |
| 안전 강도 critical→strict | 01_PRD §8, 미결 사항 |
| 플러그인 = 신뢰 코드, 재검토 | 01_PRD §8 |
| 비개발자 실제 피해 사례 | 01_PRD §1 해결하는 문제 |


