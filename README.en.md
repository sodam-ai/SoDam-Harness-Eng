# SoDamHarness — An AI Seatbelt for Absolute Beginners

> **A "seatbelt" that helps prevent big accidents when you code with AI (Claude Code).**
> Even if development, AI, and computers are all new to you, **just follow along.**
>
> ⚠️ **Honest promise:** It is a **"seatbelt"** that blocks common dangers — **not a "bulletproof shield."** There is no "100% safe."

---

## Table of Contents
- [What it does for you](#what-it-does-for-you) · [Prerequisites](#prerequisites-free-2-things) · [Download](#how-to-download-sodamharness) · [Structure](#internal-structure-at-a-glance) · [Quick install](#quick-install-once) · [Commands](#commands) · [Safety behavior](#safety-behavior-at-a-glance) · [If something goes wrong](#if-something-goes-wrong) · [Update summary](#update-summary) · [License](#license-copyright-commercial-use-strict) · [Honest limits](#honest-limits)

> For detailed steps, architecture, and FAQ, see **[GUIDE.en.md](./GUIDE.en.md)** (includes a table of contents).

---

## What it does for you

- 🛑 **Very dangerous actions** (deleting a whole folder, etc.) are **blocked.**
- 💾 Before **hard-to-undo actions** (deleting/overwriting files): **auto-backup** + **"Really do this?"** prompt.
- ↩️ Made a mistake? **Restore from backup** (`/sodam-harness-undo`).
- 🔒 Passwords/tokens are **never touched or backed up.**
- 🗣️ All guidance in **plain, easy language.**

---

## Prerequisites (free, 2 things)

1. **Node.js** (v18+) — if missing, install **LTS** from https://nodejs.org.
2. **Claude Code** — if you're reading this in Claude Code, you already have it.

---

## How to download SoDamHarness

**Current method — install from a folder on your computer:**

1. You should have received the SoDamHarness folder from the developer (or downloaded it via a direct link).
2. Copy that folder to a permanent location: your **Documents** folder or **Desktop** is a good choice.
3. Note the full path to the folder — you will need it during installation.
   - **Windows tip:** In File Explorer, click the address bar at the top of the window to see and copy the full path.
   - **Mac tip:** Right-click the folder, hold **Option**, and choose "Copy [folder name] as Pathname."

**When publicly released on GitHub (not yet available):**

1. Go to: `https://github.com/sodam-ai/SoDam-Harness-Eng`
2. Click the green **`<> Code`** button → **"Download ZIP"**
3. Extract the ZIP file (right-click → "Extract All..." on Windows; double-click on Mac)
4. Use the extracted folder path during installation

> 📌 Full download instructions with step-by-step screenshots descriptions: **[GUIDE.en.md](./GUIDE.en.md) §1-1**

---

## Quick install (once)

1. In Claude Code, type **`/plugin`** → **Add marketplace**.
2. Enter the source:
   - Published (recommended): `sodam-ai/SoDam-Harness-Eng`
   - From your computer folder (current): the full folder path (e.g., `D:\AI_Dev_Work\2026y\26y_06m_22d_SoDam-Harness-Eng`)
3. **Install `sodam-harness`** → **fully quit and reopen** Claude Code.
4. Type **`/sodam-harness`** → if commands appear, success. Then run **`/sodam-harness-install`**.

> 📌 If not yet published to GitHub, **install via the folder path.** (Full steps & troubleshooting: **[GUIDE.en.md](./GUIDE.en.md)**)

---

## Internal structure (at a glance)

Every AI action passes through SoDamHarness before it executes:

```
[You] → [Claude Code] → [SoDamHarness checks] → [Action runs or is stopped]
```

**The three components:**

| Component | File | Role |
|-----------|------|------|
| **Guard** | `hooks/guard.mjs` | Checks every AI action before it runs. Decides: block, backup+ask, or allow. |
| **Backup Keeper** | `hooks/backup.mjs` | Makes a safe copy of a file before any risky action happens. |
| **Logger** | `hooks/activity.mjs` | Records what the AI did (filename + time only — never content or secrets). |

**3-tier risk classification:**

| Tier | Name | What happens | Examples |
|------|------|--------------|---------|
| 🟢 **Safe** | Passes through | Runs immediately, no interruption | Creating files, reading, normal edits |
| 🟡 **Risky** | Backup + Confirmation | Backup made → "Really do this?" prompt | File deletion, overwrite, deploy |
| 🔴 **Catastrophic** | Immediately blocked | Refused entirely, never executed | `rm -rf`, deleting whole folders, system folder deletion |

> 📌 Full architecture diagram with data flow: **[GUIDE.en.md](./GUIDE.en.md) §0-1**

---

## Commands

| Command | Description |
|---|---|
| `/sodam-harness-install` | Confirms install + getting-started guide |
| `/sodam-harness-status` | Current state + what to do next (self-check) |
| `/sodam-harness-fix` | Symptom-based help when something breaks |
| `/sodam-harness-undo` | Undo (restore by **picking** from the backup list) |
| `/sodam-harness-trust` | "Stop asking for this folder/action" — silence it for this session (hard blocks & backups still apply) |
| `/sodam-harness-log` | "What did you just do?" — timeline of AI actions (names & time only; secrets masked) |

**2 skills (auto):** `/sodam-harness-beginner-tone` (easy tone) · `/sodam-harness-self-check` (verify before "done").

> 💡 All commands are **Claude Code only**. To use it with **Codex**, see "(Optional) Using it with Codex" in the [GUIDE](./GUIDE.en.md).

---

## Safety behavior at a glance

| What the AI tries | Seatbelt |
|---|---|
| Create / read / normal edits | Proceeds ✅ |
| Delete a whole folder · dangerous system commands | 🛑 Blocked |
| Delete / overwrite a file | 💾 Backup + ⚠️ Confirm |
| Passwords / tokens / auth files | 🔒 Not touched |

- Backups: `~/.sodamharness/backups/` · on mistakes, `/sodam-harness-undo`.
- ⚠️ In "auto-approve" mode the prompt may be skipped (backups still happen).
- No data is ever sent outside your computer. All features run locally.

---

## If something goes wrong

- Commands don't appear → **fully quit and reopen** Claude Code (plugins load at startup).
- "Node.js missing" → install **LTS** from https://nodejs.org, then restart.
- Deleted by mistake → **`/sodam-harness-undo`**.
- More detail → **`/sodam-harness-fix`** or **[GUIDE.en.md](./GUIDE.en.md) §8**.

---

## Update summary

<details>
<summary><b>📌 Changes by version (click to expand)</b></summary>

### 2026-07-11 — Fewer false blocks + reproducibility (safety unchanged)
- **Merely *mentioning* danger passes**: commands that only put a risky string in quotes — `echo "rm -rf /"`, `grep "rm -rf"`, `git commit -m "…rm -rf…"` — were wrongly blocked and now pass. Commands that actually *execute* the content (`bash -c`, `eval`, or `$(...)`/backtick command substitution inside double quotes) are still blocked (safety unchanged).
- **The repo proves its own tests**: self-tests are now committed and run in CI on Windows and Linux.
- **All 114 self-tests pass** (0 FAIL).

### 2026-07-07 — Security hardening (stricter only, no relaxation)
- **Install stability**: plugin manifest (`plugin.json`) paths updated to the current `./` format so install & `claude plugin validate` pass.
- **Honest block messages**: system/config-file block messages changed from a "dead-end wall" to a "door" — the AI still can't edit them, but you're told how to change them yourself (the safety stays intact).
- **4 gaps closed via adversarial audit**: `curl/wget` file uploads (private-key exfiltration), `find … -delete` (mass deletion), and `truncate -s 0` (file wipe) — previously slipped through, now blocked. The upload block had been dead due to a regex bug; it is now revived.
- **All 98 self-tests pass** (92 existing + 6 new).

### 2026-06-23 — v0.1.0 (Phase 1 + 2)
- **Phase 1 (MVP)**: safety guardrails (3-tier block / auto-backup / undo), plain-language tone, install & self-check commands.
- **Phase 2**: activity log (`/sodam-harness-log`), self-check skill, optional Codex setup.
- **Precision tuning**: normal `git push` and in-repo edits skip the prompt (backup still made), folder-scoped whitelist (12h), automatic backup retention (latest 100 + 30 days).

</details>

> Full history: **[CHANGELOG.md](./CHANGELOG.md)**.

---

## License · Copyright · Commercial use (strict)

- **Apache License 2.0** · **© 2026 SoDam AI Studio.**
- **Allowed**: modify · copy · fork · redistribute · **commercial use · sell · run as a service · client delivery** · patent use.
- **Obligations**: **keep** license & copyright notices · **state** changes · include NOTICE (if present).
- **Not provided**: **no warranty (AS-IS)** · **no trademark rights.**
- **Third-party trademarks**: "Claude", "Claude Code", "Codex", "Anthropic", "OpenAI", "Node.js", etc. belong to their owners — this product is **not affiliated with or endorsed by** them (nominative use only).
- **Disclaimer**: provided "as is"; **the user is responsible for outcomes.** **"100% safe" / "legally 100% safe" is NOT guaranteed.** Keep separate backups of important data.
- Full text: **[LICENSE](./LICENSE)** · notices: **[NOTICE](./NOTICE)** · details: **[GUIDE.en.md](./GUIDE.en.md) §11**.

---

## Honest limits

- An **auxiliary safety aid** that reduces common risks — **not perfect** (new risk patterns can be missed).
- **Verified on Windows · Mac untested.**
- For truly important data, don't rely on this tool alone — **keep separate backups.**

*Korean: [README.md](./README.md) · Same content as HTML: README.en.html / GUIDE.en.html*
