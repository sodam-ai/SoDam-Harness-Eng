# SoDamHarness 🛟

> 한국어 문서: [README.md](./README.md) (Korean is the primary, authoritative version)

**An "AI safety belt" for complete beginners** — install it into Claude Code with one click, and before the AI does something **irreversible** (deleting or overwriting files), it **automatically stops, asks, and backs up first**. If something goes wrong, you can **undo in one step**.

> Built so that people new to both coding and AI (teens included) can follow along as-is.

---

## What you get

- 🛑 **Auto-stop on risky actions**: dangerous work is halted **before** it runs. Hard-to-reverse things like **deleting a whole folder** are **blocked outright**; file deletes/overwrites are **backed up first, then confirmed**.
- 💾 **Automatic backup**: a copy is made **right before** a risky action. *(Note: secret files like `.env` are intentionally NOT backed up for security → they cannot be undone, so be extra careful.)*
- ↩️ **Undo**: if something goes wrong, run `/sodam-harness-undo` to restore from a backup.
- 🗣️ **Plain Korean**: the AI explains in **easy words** instead of developer jargon.
- 🔒 **The tool itself is safe**: it **never touches** your passwords, tokens, or login files, and **never sends** your data anywhere.

> ⚠️ **Honest limit**: it blocks defined risks but **cannot block 100% of all cases**. It is a reference-grade safety belt; the final responsibility is the user's.

---

## 1. Prerequisites

| Needed | What it is | Check / Install |
|---|---|---|
| **Claude Code** | The AI coding tool this plugin attaches to | OK if you already use it |
| **Node.js** (18+) | The engine the safety features run on | If missing, install **LTS** from https://nodejs.org |
| OS | **Windows / Mac** | Both supported (verified on Windows; Mac uses the same code, real-device check pending) |

After installing, check with `/sodam-harness-status`.

---

## 2. Install (click by click)

It's **4 steps: ① add → ② install → ③ restart → ④ verify.**

1. In the Claude Code input box, type **`/plugin`** → the plugin store (marketplace) screen opens.
2. Add the marketplace **`sodam-ai/SoDam-Harness-Eng`**, then install the plugin **`sodam-harness`** (Install).
   - Or by command (prefix with `!` in the input box): `!claude plugin marketplace add sodam-ai/SoDam-Harness-Eng` → `!claude plugin install sodam-harness@sodamharness-marketplace`
3. **Restart (required)**: type **`/exit`**, then run **`claude`** again in the terminal. (The belt arms on start.)
4. Type **`/sodam-harness-install`** → when "the safety belt is on ✅" appears, you're done.

> 💡 Typing just **`/sodam-harness`** lists all 5 of this plugin's commands (never mixed with other plugins).
> 🔒 **Private beta**: for now you need access to the repo to add it (anyone can once it's public). On first run, if Windows **SmartScreen** / Mac **Gatekeeper** warns you, click "Run anyway" only if the source is official.

---

## 3. Quick start (5 minutes)

The easiest way is to **just ask the AI in plain language**.

1. Make an empty practice folder and open Claude Code inside it.
2. Try: **"Make a simple intro page here."**
3. Try something risky: **"Delete this whole folder."**
   → The safety belt **blocks it**, saying **"Deleting a whole folder is blocked."**
4. Try deleting one file: **"Delete the file I just made."**
   → It is **auto-backed-up** right before deletion. If it was a mistake, run **`/sodam-harness-undo`** → restore by picking from the backup list.

---

## 4. How it works

- **Plain tone**: the AI always speaks in easy Korean and unpacks hard terms.
- **Block / confirm**: risky work stops **before** running. **Irreversible things like whole-folder/recursive deletion are blocked (`deny`)**; file deletes/overwrites are **backed up then confirmed (`ask`)**.
- **Auto-backup**: right before a risky action, the target **file** is copied to the backup folder. (A folder itself can't be backed up, which is why folder deletion is blocked.)
- **Undo**: shows the **backup list and lets you pick what you just lost** to restore. (So it never restores the wrong thing even when many tasks are mixed.)
- **Self-check**: tells you the current state and the next thing to do.
- **Verify-before-done**: before saying "done", the AI checks it actually works and shows evidence (mainly for risky/important work; not a 100% guarantee).

### Workflow
```
Install → (ask the AI in plain language) → on risky action: stop, back up, confirm
   → if an accident happens, /sodam-harness-undo to restore
   → if stuck, /sodam-harness-status (state) · /sodam-harness-fix (troubleshoot)
```

---

## 5. Commands

| Command | When to use |
|---|---|
| `/sodam-harness-install` | Getting-started guide right after install |
| `/sodam-harness-status` | Current state + what to do next (self-check) |
| `/sodam-harness-fix` | Symptom-based help when something breaks |
| `/sodam-harness-undo` | Undo (restore by **picking** from the backup list) |
| `/sodam-harness-trust` | "Stop asking for this folder/action" — silence the last asked action for this session (hard blocks & backups still apply) |
| `/sodam-harness-log` | "What did you just do?" — timeline of AI actions (names & time only; secrets masked) |
| `/sodam-harness-codex` | Guide to apply the same tone + conservative safety config to Codex (no block/backup on Codex — limited) |

---

## 6. File / backup location

- **Backup folder** (auto-created): inside your home folder, `.sodamharness/backups/`
  - Windows: `C:\Users\<name>\.sodamharness\backups\`
  - Mac: `/Users/<name>/.sodamharness/backups/`
- This folder **never stores passwords or tokens.** Only backup files go here.

---

## 7. Troubleshooting

| Symptom | Why | Do this now |
|---|---|---|
| Risky action wasn't stopped | Plugin off, or an unknown risk pattern | Restart Claude Code → `/sodam-harness-status` |
| Asks too often | Safety-first (L1) default | Adjust strength once you're used to it (coming later) |
| "Node.js missing" | The safety hook runs on Node | Install LTS from https://nodejs.org, then restart |
| Run-block warning (SmartScreen/Gatekeeper) | OS asks once for a new program | If from the official source, "Run anyway" |
| Want to undo | — | `/sodam-harness-undo` |
| Backup folder error (permission/space) | Disk full / permissions | Free space and retry (if backup fails, the risky action is auto-stopped) |
| Garbled Korean | Encoding | This plugin is Node.js so it usually doesn't break; otherwise `/sodam-harness-fix` |
| Explanations are too hard (tone) | The easy tone is delivered via a Skill and **may not always auto-activate** | Just tell the AI **"Explain it simply"** |

---

## 8. Uninstall

1. In Claude Code, **`/plugin`** → Uninstall SoDamHarness. Or type `!claude plugin uninstall sodam-harness@sodamharness-marketplace`.
2. To delete backups, remove the `.sodamharness/` folder in your home directory. (Leave it to keep your backups.)

---

## 9. Safety & License (one-liners)

- **Safety**: this tool doesn't access tokens/secrets and doesn't send data out. But "100% accident prevention" is not guaranteed (reference use, user's responsibility).
- **About confirmation prompts**: "Ask"-type actions (file delete/overwrite, `git push`) may pass automatically if you run Claude Code in **"auto-approve" mode**. Even so, **(1) whole-folder deletion is still blocked, (2) auto-backup and (3) undo (`/sodam-harness-undo`) always work** — these three are the core protections. To always see the prompt, use the **default mode**.
- **License**: **Apache-2.0** — modify, copy, redistribute, **commercial use & client delivery allowed** (keep LICENSE/NOTICE). See [LICENSE](./LICENSE), [NOTICE](./NOTICE).
- **Disclaimer**: no warranty · limited liability · **not legal advice**. AI model terms (Anthropic/OpenAI), API fees, and third-party service terms must be **checked separately by the user**.
- Third-party trademarks ("Claude Code", etc.) belong to their owners; this product is **not affiliated** with them.

---

*SoDamHarness — by SoDam AI Studio · Phase 1 (MVP)*
