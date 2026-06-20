# RESEARCH_SOURCES_Add

아래는 **Claude Code, Codex, Gemini CLI, Cursor, OpenCode 같은 AI 코딩 에이전트에 설치/사용/적용 가능한 “하네스 엔지니어링” 관련 사이트·주소·문서·자료**를 최대한 넓게 정리한 목록입니다.

여기서 **하네스 엔지니어링**은 단순 프롬프트가 아니라, AI가 실제 작업을 더 안정적으로 하도록 만드는 **지침 파일, 스킬, 서브에이전트, 플러그인, MCP, 도구 권한, 샌드박스, 원격제어, 관측/평가, 작업 루프**까지 포함하는 구조로 봤습니다. Addy Osmani도 하네스를 시스템 프롬프트, `CLAUDE.md`, `AGENTS.md`, 스킬, 서브에이전트, MCP, hooks, observability까지 묶는 실행 환경으로 설명하고, 관련 논문도 하네스를 “언어모델을 저장소에서 행동하는 코딩 에이전트로 바꾸는 래퍼/운영층”으로 정의합니다. ([addyosmani.com](https://addyosmani.com/blog/agent-harness-engineering/?utm_source=chatgpt.com))

## 1. 하네스 엔지니어링 핵심 개념 / 입문 자료

```text
https://addyosmani.com/blog/agent-harness-engineering/
https://arxiv.org/abs/2606.10106
https://arxiv.org/abs/2604.25850
https://arxiv.org/abs/2606.06324
https://picrew.github.io/LLM-Harness/main.pdf
https://github.com/walkinglabs/awesome-harness-engineering
https://github.com/ai-boost/awesome-harness-engineering
https://codylindley.github.io/ai-harness-engineering-compatibility-matrix/
```

가장 먼저 볼 만한 건 Addy Osmani의 글과 `What Makes a Harness a Harness?` 논문입니다. 특히 Agentic Harness Engineering 논문은 관측 가능한 실행 흔적, 반복 평가, 에러 복구, 작업 루프 개선까지 하네스의 핵심으로 다룹니다. ([addyosmani.com](https://addyosmani.com/blog/agent-harness-engineering/?utm_source=chatgpt.com))

## 2. Claude Code 공식 하네스 문서

```text
https://code.claude.com/docs/en/overview
https://github.com/anthropics/claude-code
https://code.claude.com/docs/en/agent-sdk/overview
https://code.claude.com/docs/en/features-overview
https://code.claude.com/docs/en/plugins-reference
https://code.claude.com/docs/en/skills
https://code.claude.com/docs/en/agent-sdk/skills
https://code.claude.com/docs/ko/sub-agents
https://code.claude.com/docs/en/agent-teams
https://code.claude.com/docs/en/hooks
https://code.claude.com/docs/en/channels
https://code.claude.com/docs/en/channels-reference
https://code.claude.com/docs/en/monitoring-usage
https://code.claude.com/docs/en/agent-sdk/observability
https://code.claude.com/docs/en/remote-control
https://claude.com/download
```

Claude Code 쪽은 하네스 엔지니어링 요소가 가장 잘게 나뉘어 있습니다. 공식 문서 기준으로 plugin은 `skills`, `agents`, `hooks`, `MCP servers`, `LSP servers`, `monitors` 등을 하나의 설치 가능한 단위로 묶을 수 있고, hooks는 Claude Code 생명주기 지점에서 shell command, HTTP endpoint, LLM prompt 등을 자동 실행하는 구조입니다. ([Claude Code](https://code.claude.com/docs/en/plugins-reference?utm_source=chatgpt.com))

## 3. OpenAI Codex 공식 하네스 문서

```text
https://github.com/openai/codex
https://developers.openai.com/codex/cloud
https://developers.openai.com/codex/skills
https://developers.openai.com/codex/guides/agents-md
https://developers.openai.com/codex/config-reference
https://developers.openai.com/codex/config-advanced
https://developers.openai.com/codex/remote-connections
https://github.com/openai/codex/blob/main/docs/config.md
```

Codex 쪽은 `AGENTS.md`, `Agent Skills`, `config.toml`, 권한/승인 정책, 원격 연결, telemetry 설정이 핵심입니다. OpenAI 문서는 Codex가 작업 전 `AGENTS.md`를 읽고 프로젝트별 지침을 적용한다고 설명하고, Skills는 지침·리소스·스크립트를 묶는 재사용 가능한 패키지로 설명합니다. ([OpenAI Developers](https://developers.openai.com/codex/guides/agents-md))

## 4. 공통 표준: AGENTS.md / Agent Skills / gh skill

```text
https://agents.md/
https://cli.github.com/manual/gh_skill_install
https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/
https://github.com/anthropics/skills
https://github.com/VoltAgent/awesome-agent-skills
https://github.com/alirezarezvani/claude-skills
https://github.com/heilcheng/awesome-agent-skills
https://arxiv.org/abs/2601.20404
https://arxiv.org/abs/2606.15828
https://arxiv.org/abs/2602.14690
```

`AGENTS.md`는 Claude Code, Codex, Gemini CLI, Cursor 등 여러 AI 코딩 도구가 공통으로 읽을 수 있는 프로젝트 지침 파일로 쓰이고 있습니다. `agents.md` 공식 사이트는 이를 “AI coding agents를 위한 README”라고 설명하고, GitHub CLI의 `gh skill install`은 GitHub Copilot, Claude Code, Cursor, Codex, Gemini CLI, OpenCode 등 여러 에이전트에 skill을 설치할 수 있도록 지원합니다. ([agents.md](https://agents.md/?utm_source=chatgpt.com))

## 5. MCP / 외부 도구 연결 / 컨텍스트 연결

```text
https://modelcontextprotocol.io/docs/getting-started/intro
https://github.com/modelcontextprotocol
https://github.com/modelcontextprotocol/servers
https://github.com/modelcontextprotocol/python-sdk
https://github.com/modelcontextprotocol/typescript-sdk
https://www.anthropic.com/news/model-context-protocol
```

MCP는 AI 앱과 외부 시스템을 연결하는 표준입니다. 공식 문서는 MCP를 AI 애플리케이션용 “USB-C 포트”처럼 설명하고, Anthropic은 MCP를 데이터 소스와 AI 도구 사이의 안전한 양방향 연결 표준으로 소개했습니다. ([Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro?utm_source=chatgpt.com))

## 6. 설치 가능한 하네스 / 플러그인 / 마켓플레이스

```text
https://github.com/wshobson/agents
https://github.com/Chachamaru127/claude-code-harness
https://github.com/adrielp/ai-engineering-harness
https://github.com/HKUDS/OpenHarness
https://github.com/ruvnet/ruflo
https://github.com/davepoon/buildwithclaude
https://buildwithclaude.com/
https://github.com/xiaolai/claude-plugin-marketplace
https://claudemarketplaces.com/marketplaces/category/ai-agents
```

이 구간이 실제로 “설치해서 쓰는 하네스”에 가장 가깝습니다. `wshobson/agents`는 Claude Code용 플러그인, 에이전트, 스킬, 명령어를 Codex CLI, Cursor, OpenCode, Gemini CLI, GitHub Copilot에서도 소비할 수 있도록 만든 구조이고, `claude-code-harness`는 plan/work/review/release 같은 정해진 전달 루프로 Claude Code, Codex, OpenCode를 다루는 하네스입니다. ([GitHub](https://github.com/wshobson/agents?utm_source=chatgpt.com))

## 7. Claude Code Subagents / 역할별 에이전트 팀

```text
https://github.com/VoltAgent/awesome-claude-code-subagents
https://github.com/rshah515/claude-code-subagents
https://github.com/ArkadioG/Claude-Code-Dev-Agents
https://github.com/augmnt/subagents.sh
https://subagents.sh/
https://github.com/zhsama/claude-sub-agent
```

Claude Code 안에서 “기획자, 프론트엔드, 백엔드, 리뷰어, 보안 담당”처럼 역할별 에이전트 팀을 만들려면 subagents 계열을 보면 됩니다. Claude 공식 문서는 subagent를 특정 작업을 맡는 전문 AI 어시스턴트로 설명하며, 별도 컨텍스트와 시스템 프롬프트, 도구 접근 권한을 줄 수 있습니다. ([Claude Code](https://code.claude.com/docs/ko/sub-agents))

## 8. 원격 제어 / 세션 오케스트레이션

```text
https://code.claude.com/docs/en/remote-control
https://developers.openai.com/codex/remote-connections
https://github.com/slopus/happy
https://happy.engineering/
https://github.com/tiann/hapi
https://github.com/iofficeai/aionui
https://aionui.com/
https://github.com/coder/agentapi
https://github.com/davej/pocodex
https://github.com/op7418/Claude-to-IM-skill
https://github.com/smtg-ai/claude-squad
https://github.com/kbwo/ccmanager
```

원격 제어까지 하네스에 포함하면, 공식은 Claude Code Remote Control과 Codex Remote Connections가 우선입니다. 서드파티 쪽에서는 `Happy`, `HAPI`, `AionUi`, `agentapi`가 Claude Code/Codex 세션을 폰·브라우저·웹 UI·HTTP API로 다루는 데 관련이 큽니다. ([Claude Code](https://code.claude.com/docs/en/remote-control))

## 9. GitHub / VS Code / Cloud Agent 쪽 하네스

```text
https://github.blog/news-insights/company-news/pick-your-agent-use-claude-and-codex-on-agent-hq/
https://docs.github.com/copilot/concepts/agents/about-third-party-agents
https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent
https://docs.github.com/copilot/how-tos/copilot-cli/use-copilot-cli/steer-remotely
https://code.visualstudio.com/blogs/2026/02/05/multi-agent-development
```

GitHub Agent HQ와 VS Code의 multi-agent development 흐름도 넓게 보면 하네스에 들어갑니다. GitHub 문서는 Claude와 Codex 같은 third-party coding agents를 Copilot cloud agent와 함께 비동기적으로 사용할 수 있다고 설명하고, VS Code 글은 Copilot, Claude, Codex 에이전트를 로컬·클라우드 세션으로 함께 실행하는 흐름을 소개합니다. ([The GitHub Blog](https://github.blog/news-insights/company-news/pick-your-agent-use-claude-and-codex-on-agent-hq/?utm_source=chatgpt.com))

## 10. 관측 / 텔레메트리 / 평가 / 로그

```text
https://code.claude.com/docs/en/monitoring-usage
https://code.claude.com/docs/en/agent-sdk/observability
https://developers.openai.com/codex/config-advanced
https://grafana.com/docs/grafana-cloud/monitor-infrastructure/integrations/integration-reference/integration-openai-codex/
https://signoz.io/docs/codex-monitoring/
https://signoz.io/docs/claude-code-monitoring/
https://langfuse.com/integrations/frameworks/claude-agent-sdk-js
https://langfuse.com/blog/2024-07-ai-agent-observability-with-langfuse
https://www.langchain.com/langsmith/observability
https://www.monad.com/blog/setting-up-openai-codex-otel
https://www.elastic.co/security-labs/claude-code-cowork-monitoring-otel
https://docs.oodle.ai/ai-agent-observability/codex
```

하네스 엔지니어링에서 중요한 건 “AI가 무슨 판단을 했고, 어떤 도구를 실행했고, 어디서 실패했는지”를 추적하는 것입니다. Claude Code는 OpenTelemetry 기반으로 metrics, events, traces를 내보낼 수 있고, Codex도 config에서 OTel export를 설정해 API 요청, 이벤트, 프롬프트, 도구 승인/결과 등을 추적할 수 있습니다. ([Claude Code](https://code.claude.com/docs/en/monitoring-usage?utm_source=chatgpt.com))

## 11. 샌드박스 / 권한 / 보안 / 실패 사례

```text
https://agent-safehouse.dev/docs/agent-investigations/codex.html
https://arxiv.org/abs/2603.20847
https://arxiv.org/abs/2606.15828
https://arxiv.org/abs/2602.08004
https://arxiv.org/abs/2602.10133
https://arxiv.org/abs/2508.02736
```

하네스는 편의성만이 아니라 보안도 포함해야 합니다. Agent Safehouse는 Codex CLI의 sandbox 구조를 분석하며, shell command는 sandbox 안에서 실행되지만 메인 프로세스는 별도 보안 고려가 필요하다고 설명합니다. 또 AGENTS.md/CLAUDE.md 같은 설정 파일은 `Context Bloat`, `Skill Leakage` 같은 구성 문제를 만들 수 있다는 연구도 있습니다. ([Agent Safehouse](https://agent-safehouse.dev/docs/agent-investigations/codex.html?utm_source=chatgpt.com))

## 12. 조건부 / 주의 주소

```text
https://github.com/BloopAI/vibe-kanban
https://vibekanban.com/
https://github.com/omnara-ai/omnara
```

`Vibe Kanban`은 Claude Code, Codex, Gemini CLI 같은 여러 에이전트를 묶는 방향은 좋지만, 저장소에서 sunsetting 상태로 안내되어 장기 사용 목적에는 조심하는 게 좋습니다. `Omnara`도 GitHub 저장소 쪽에는 더 이상 유지보수되지 않는 버전이라는 안내가 있어, 현재 서비스/앱 상태를 별도로 확인하고 써야 합니다. ([GitHub](https://github.com/BloopAI/vibe-kanban))

비공식 Codex 원격 UI나 npm 패키지 중에는 토큰 탈취 사례가 보고된 적도 있으므로, OpenAI/Anthropic 로그인 토큰을 요구하는 비공식 원격제어 도구는 특히 주의해야 합니다. ([TechRadar](https://www.techradar.com/pro/security/openai-codex-tool-with-over-29-000-downloads-linked-to-malicious-npm-supply-chain-attack-stealing-authentication-tokens?utm_source=chatgpt.com))

## 최종 추천만 압축

```text
https://addyosmani.com/blog/agent-harness-engineering/
https://code.claude.com/docs/en/features-overview
https://code.claude.com/docs/en/plugins-reference
https://code.claude.com/docs/en/skills
https://code.claude.com/docs/ko/sub-agents
https://code.claude.com/docs/en/hooks
https://developers.openai.com/codex/config-advanced
https://developers.openai.com/codex/skills
https://developers.openai.com/codex/guides/agents-md
https://agents.md/
https://modelcontextprotocol.io/docs/getting-started/intro
https://github.com/wshobson/agents
https://github.com/Chachamaru127/claude-code-harness
https://github.com/adrielp/ai-engineering-harness
https://github.com/HKUDS/OpenHarness
https://github.com/VoltAgent/awesome-agent-skills
https://github.com/VoltAgent/awesome-claude-code-subagents
https://github.com/slopus/happy
https://github.com/coder/agentapi
https://code.claude.com/docs/en/monitoring-usage
https://arxiv.org/abs/2604.25850
```

## 용도별로 보면 이렇게 보면 됩니다

```text
개념 이해:
https://addyosmani.com/blog/agent-harness-engineering/
https://arxiv.org/abs/2606.10106

Claude Code 세팅:
https://code.claude.com/docs/en/features-overview
https://code.claude.com/docs/en/plugins-reference
https://code.claude.com/docs/en/skills
https://code.claude.com/docs/ko/sub-agents

Codex 세팅:
https://developers.openai.com/codex/config-advanced
https://developers.openai.com/codex/skills
https://developers.openai.com/codex/guides/agents-md

공통 지침:
https://agents.md/

외부 도구 연결:
https://modelcontextprotocol.io/docs/getting-started/intro

바로 설치 가능한 하네스:
https://github.com/wshobson/agents
https://github.com/Chachamaru127/claude-code-harness
https://github.com/adrielp/ai-engineering-harness

역할별 에이전트 팀:
https://github.com/VoltAgent/awesome-claude-code-subagents
https://subagents.sh/

원격 제어:
https://code.claude.com/docs/en/remote-control
https://developers.openai.com/codex/remote-connections
https://github.com/slopus/happy

로그/관측:
https://code.claude.com/docs/en/monitoring-usage
https://developers.openai.com/codex/config-advanced
```

정리하면, **Claude Code 중심 하네스**는 `plugins / skills / subagents / hooks / MCP / monitoring`, **Codex 중심 하네스**는 `AGENTS.md / skills / config.toml / approval policy / telemetry`, **공통 하네스**는 `AGENTS.md + Agent Skills + MCP + Observability`로 잡으면 됩니다. 실전 설치형으로는 `wshobson/agents`, `claude-code-harness`, `ai-engineering-harness`, `OpenHarness`, `awesome-agent-skills`부터 보면 가장 효율적입니다.
