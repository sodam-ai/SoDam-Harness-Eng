# SoDam 패밀리 — 구현 준비 종합 (Implementation Prep)

> 근거: `.PRD/` 전체 + `RESEARCH_SOURCES.md`·`RESEARCH_SOURCES_Add.md` + **공식 Claude Code 문서 직접 확인**(plugins-reference·sub-agents·mcp·hooks).
> 목적: SoDam 4종(Harness·Loop·Agentic·Context)·Phase 2 **착수 전**에 빌딩블록·제약·미지수를 한 장으로 다짐. **이 문서는 코드 0 — 빌드 지시가 아니다.**

---

## 1. 빌딩블록 (확인됨 — 공식)
플러그인 1개 = `skills/ · agents/ · hooks/hooks.json · .mcp.json · commands/ · settings.json`를 한 묶음으로 배포(명령은 네임스페이스 분리). → **4종을 한 번들 마켓플레이스로 묶는 것은 기술적으로 가능.**

| 블록 | 핵심 사실 | 쓰는 곳 |
|---|---|---|
| hooks (`hooks/hooks.json`) | `deny`=하드 차단 / `ask`=권한모드 의존(자동승인선 통과) | Harness(구현중)·Loop |
| subagent (`agents/`) | 독립 컨텍스트·도구 제한·**description으로 자동 위임**·Haiku 라우팅으로 비용↓ | Agentic |
| MCP (`.mcp.json`) | 외부 도구/DB에 **읽기·실행** 권한 → 강력하지만 **신뢰·시크릿이 최대 위험면** | Context(외부연동 시) |
| skill / `AGENTS.md` | 말투·지침. AGENTS.md=타도구 공용 표준 + `gh skill install`로 다도구 설치 | Context·말투 |

## 2. 설계 시 반드시 지킬 핵심 제약 (연구가 경고한 것)
- **🔴 공급망 토큰 탈취** (codexui-android, 주 2.9만 DL 실사고): 어떤 SoDam도 **토큰 요구·접근 0**, 비공식 도구 경고. (Harness 1순위 원칙을 4종 공통 불변식으로.)
- **🔴 Context Bloat / Skill Leakage** (arxiv): 지침·기억·스킬을 많이 넣을수록 AI 성능↓·혼란↑ → **SoDamContext의 존재 위험**. 상한·요약·큐레이션 필수.
- **🟡 훅의 한계** (실측): `ask`는 자동승인 모드서 통과 → "완전 차단막" 아님. 진짜 보장 = `deny`(폴더/재귀 삭제·민감경로·치명) + 백업 + 되돌리기.
- **🟡 sunsetting 도구** (Vibe Kanban·Omnara): 의존·차용 금지.
- **🟡 플러그인 = 신뢰 코드**(사용자 권한 실행): 의존성처럼 취급, hooks **3~6개월 보안 재검토**.

## 3. 제품별 준비 상태 + 착수 전 풀어야 할 미지수
- **Harness** 🛟 — 코드 골격(skills·commands·hooks·marketplace.json·git) **빌드됨, 그러나 미완성·구현 중**(2026-06-21 사용자 확정 — '완성' 아님). 남은 것 = **07_AUDIT 결정 반영(비밀파일 백업제외·fail-closed 등) + 위험패턴 목록 확정 + 실초보 베타**.
- **Loop** 🔁 — `Stop`/`PostToolUse` 훅 + commands로 가능. **반드시 매 단계 확인 게이트**(자동 무한진행 = AI 폭주 위험). 미지수: *초보자에게 안전한 루프 모양*.
- **Agentic** 👥 — `agents/`로 가능. **🔴착수 전 치명 미지수: SoDamAgentic이 띄운 서브에이전트의 도구 호출(삭제 등)이 Harness 훅을 거치는가?** 안 거치면 안전벨트에 구멍. + 비용 가드(Haiku·동시수 제한) + **AgentRoster 중복 정리**.
- **Context** 📚 — skills+AGENTS.md(+필요시 MCP). **Context Bloat 상한** + 시크릿 0 + **O-Brain 중복 정리**(흡수/구분). MCP는 보안면 최대라 *정말 필요할 때만*.

## 4. 빌드 순서 (데이터 기반 — 4종 동시 금지)
**Harness 베타 졸업 → Context → Loop → Agentic(미지수 해결 후).** 번들은 **≥2개 개별 완성 뒤**.
근거: Harness만 코드 골격 빌드됨(미완성·구현중)·나머지 3종은 PRD만. "한 번에 다 만들면 품질↓"(03)·"미검증 위에 쌓기 금지"·"시뮬0·베타0=80% 실패".

## 5. 착수 전 체크리스트 (각 제품 PRD에 반영)
- [ ] **Harness**: 실초보 1~2명 베타(`BETA.md`)
- [ ] **Agentic**: 서브에이전트 도구호출이 Harness 훅 거치는지 **실측** + AgentRoster 통합 결정 + 비용 가드
- [ ] **Context**: Context Bloat 상한 · 시크릿 0 · O-Brain 중복 처리(흡수/구분)
- [ ] **Loop**: 매 단계 확인 게이트(자동 무한진행 금지)
- [ ] **공통 불변식**: 토큰 접근 0 · 비공식 도구 경고 · hooks 3~6개월 재검토 · sunsetting 도구 차용 금지 · 명령 네임스페이스 분리(`/sodamX:`)
