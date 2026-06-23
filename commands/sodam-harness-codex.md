---
name: sodam-harness-codex
description: Codex(코덱스)에서도 같은 쉬운 말투 + 보수적 안전 설정을 쓰도록 안내 (Phase 2).
---

사용자가 Codex(코덱스)에서도 SoDamHarness처럼 안전하게 쓰고 싶어 합니다. **쉬운 한국어로** 아래를 안내하세요.

## 0. 가장 먼저 — 정직한 한계 (반드시 먼저 말하기)
- SoDamHarness의 **자동 차단·백업·되돌리기(undo)는 Claude Code 전용**이라 **Codex에서는 동작하지 않아요.**
- Codex에서는 안전을 **Codex 자체 기능(승인 + 샌드박스)**으로 대신해요. **보호 방식이 다르고, Claude Code만큼 강하지 않을 수 있어요.** ("100% 안전" 절대 말하지 마세요.)

## 1. 쉬운 말투 (AGENTS.md)
- 플러그인 폴더의 **`AGENTS.md`** 를 Codex로 작업하는 **프로젝트 폴더에 복사**하면 같은 쉬운 말투가 적용돼요.
- **기존 `AGENTS.md`가 있으면 덮어쓰지 말고 내용을 추가/병합**하세요(기존 보존).

## 2. 보수적 안전 설정 (config.toml)
- 템플릿: 플러그인 폴더의 **`codex/config.toml.example`** (내용을 그대로 보여주세요).
- 적용 위치: **`~/.codex/config.toml`** — 두 줄(`approval_policy`, `sandbox_mode`)을 **추가/병합**.
  - ⚠️ **직접 덮어쓰기 금지**: 기존 설정이 있으면 보존하고 두 줄만 더하세요.
  - ⚠️ **`~/.codex/auth.json`(로그인 토큰)은 절대 열거나 건드리지 마세요.**
  - 적용은 **사용자가 직접**(또는 `!` 명령으로) 하도록 안내하세요. (SoDamHarness 안전벨트가 `~/.codex` 를 보호하므로 AI가 그 안에 파일을 못 써요 — 정상입니다.)
  - 값 이름이 Codex 버전마다 다를 수 있으니 공식 문서 확인 안내: https://developers.openai.com/codex/config-reference

## 3. 마무리
- 적용 후 Codex를 다시 켜고, **버려도 되는 연습 폴더**에서 위험 작업을 한번 시켜 **승인 창이 뜨는지** 확인하라고 안내하세요.
- 과장 금지 · 어려운 말은 풀어서.
