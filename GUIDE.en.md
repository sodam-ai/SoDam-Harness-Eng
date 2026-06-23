# SoDamHarness Beginner Guide 🛟 (English)

> 한국어 가이드: **GUIDE.md** (Korean is the primary, authoritative version) · Short intro: **README.en.md** · How to test: **TESTING.en.md**
> This guide assumes you are **new to coding, AI, and even computers/phones**. Hard terms are explained, and you can follow it one **"click this now"** step at a time.

---

## 0. What is this? (1-minute idea)

- **SoDamHarness** = a **"safety belt"** that prevents accidents when you let an AI do computer tasks.
- It is a **one-click add-on (plugin)** for the AI coding tool **Claude Code**.
- Like a car seatbelt, it stays **quiet** normally and only **stops, asks, and backs up first** at the **dangerous moment** when the AI is about to delete or overwrite files.

> 💡 Terms: **plugin** = an add-on that gives a program extra features. **AI coding tool** = a program that does computer work when you ask in plain language.

---

## 1. Prerequisites (programs you need)

| Needed | What it is | Check / Install |
|---|---|---|
| **Claude Code** | The AI coding tool this belt attaches to | OK if you already use it |
| **Node.js (18+)** | The "engine" that runs the safety features | See 1-1 |
| **OS** | Windows or Mac | Both supported (verified on Windows; Mac uses the same code, real-device check pending) |

### 1-1. Install Node.js (only if missing)
1. In a browser, go to **https://nodejs.org**.
2. Of the two big buttons, click the one marked **"LTS"** to download.
3. Double-click the downloaded installer → keep clicking **"Next"** to install.
4. Verify: in Claude Code type `node --version` → if numbers like `v18...` appear, success.

> ⚠️ Without Node.js the safety features **silently do not run.** Install it first.

---

## 2. Download & Install (click by click)

Installing is **4 steps: ① add marketplace → ② install plugin → ③ restart → ④ verify.** Pick whichever is easier.

### Method A — via menu (mouse/arrow keys, easiest)
1. **Open Claude Code.**
2. Type **`/plugin`** and press Enter → the plugin management screen opens.
3. Under **Add marketplace**, enter **`sodam-ai/SoDam-Harness-Eng`** to add it.
4. From the plugin list, pick **`sodam-harness`** and **Install** it.

### Method B — by command (precise)
Prefix each line with **`!`** in the input box (or run without `!` in a terminal):
1. `!claude plugin marketplace add sodam-ai/SoDam-Harness-Eng`
2. `!claude plugin install sodam-harness@sodamharness-marketplace`

### ③ Restart (required) — the belt arms only on start
- Type **`/exit`** → Claude Code shuts down.
- Then type **`claude`** in the terminal to start it again. (Or close and reopen the terminal window.)

### ④ Verify
- Type **`/sodam-harness:install`** → when "the safety belt is on ✅" appears, install is done.
- If you don't see it, type just **`/sodam-harness`** → if 5 commands appear, it's working.

> 🔒 **Private beta**: for now the repo (`sodam-ai/SoDam-Harness-Eng`) requires **access** to add. Once public, anyone can install with the steps above.
> 🟡 On first run, Windows **SmartScreen** or Mac **Gatekeeper** may warn you. If from the **official source**, click "Run anyway". (If suspicious, stop.)

---

## 3. Quick start (5 minutes)

The easiest way is to **just ask the AI in plain language**.

1. Make a **throwaway empty practice folder** and open Claude Code inside it.
2. Type: **"Make a simple intro page here."** → the AI creates files (safe action, not blocked).
3. Try something risky: **"Delete this whole folder."** → the belt **blocks it**, saying **"Deleting a whole folder is blocked."**
4. Delete one file: **"Delete the file I just made."** → it is **auto-backed-up** right before deletion.
5. Undo: **`/sodam-harness:undo`** → **pick what you just lost** from the backup list to restore.

---

## 4. How to use / how it works

- **🗣️ Plain tone** — the AI explains in **easy words** instead of jargon. (If it gets hard, say **"Explain it simply".**)
- **🛑 Block / confirm** — risky work stops **before** running.
  - **Whole-folder / recursive deletion** (irreversible) is **blocked outright.**
  - **File delete / overwrite** is **backed up first, then "Are you sure?" confirmed.**
- **💾 Auto-backup** — right **before** a risky action, the target file is copied to the backup folder.
- **↩️ Undo** — shows the **backup list** and lets you **pick what you just lost** to restore (so it never restores the wrong thing even when tasks are mixed).
- **🩺 Self-check** — tells you the current state and "what to do next".

> ⚠️ **Important (auto-approve mode)**: if you run Claude Code in **"auto-approve" mode**, the "Are you sure?" prompt **may pass automatically.** Even so, **big risks like whole-folder deletion are still blocked.** To always see the prompt, use Claude Code's **default mode**.

### Workflow
```
Install → (ask the AI in plain language) → on risky action: stop, back up, confirm
   → if an accident happens, /sodam-harness:undo to restore
   → if stuck, /sodam-harness:status (state) · /sodam-harness:fix (troubleshoot)
```

---

## 5. Commands

| Command | When to use | What happens |
|---|---|---|
| `/sodam-harness:install` | Right after install | Confirms install + getting-started guide |
| `/sodam-harness:status` | When unsure it works | Health check + "what to do next" |
| `/sodam-harness:fix` | When something breaks | Symptom-based help |
| `/sodam-harness:undo` | After an accidental delete | Restore by **picking** from the backup list |
| `/sodam-harness:trust` | To stop being asked for the same action | "Stop asking for this folder/action" — silence it for this session (hard blocks & backups still apply) |
| `/sodam-harness:log` | When curious what just happened | Timeline of AI actions (names & time only; secrets masked) |

---

## 6. File / document locations

- **Backup folder (auto-created)** — inside your home folder, `.sodamharness/backups/`
  - Windows: `C:\Users\<name>\.sodamharness\backups\`
  - Mac: `/Users/<name>/.sodamharness/backups/`
  - This folder **never stores passwords/tokens.** Only backup files.
- **Documents (in this project)**
  - `README.md` / `README.en.md` — short intro (KO/EN)
  - `GUIDE.md` / `GUIDE.en.md` — this detailed guide (KO/EN)
  - `TESTING.md` / `TESTING.en.md` — how to test/verify (KO/EN)
  - `LICENSE` / `NOTICE` — license & notices

---

## 7. Troubleshooting (Symptom → Why → Do now)

| Symptom | Why | Do now |
|---|---|---|
| Risky action wasn't stopped | Plugin off, or an unknown risk pattern | Restart Claude Code → `/sodam-harness:status` |
| Installed but no effect | Didn't restart | **Fully close and reopen** Claude Code |
| Asks too often | Safety-first (L1) default | Adjust strength once used to it (coming later) |
| "Node.js missing" | The safety hook runs on Node | Install LTS from https://nodejs.org, then restart |
| Run-block warning (SmartScreen/Gatekeeper) | OS asks once for a new program | If from the official source, "Run anyway" |
| Want to undo | — | `/sodam-harness:undo` (pick from the list) |
| Backup folder error (permission/space) | Disk full / permissions | Free space and retry (if backup fails, the risky action is auto-stopped) |
| Garbled Korean | Encoding | Usually fine (Node.js); otherwise `/sodam-harness:fix` |
| Explanations too hard (tone) | The easy tone is via a Skill and **may not always auto-activate** | Tell the AI **"Explain it simply"** |

---

## 8. Uninstall

1. In Claude Code, **`/plugin`** → **Uninstall SoDamHarness**. Or type `!claude plugin uninstall sodam-harness@sodamharness-marketplace`.
2. To delete backups too, remove the **`.sodamharness/` folder** in your home directory. (Leave it to keep your backups.)

---

## 9. License · Copyright · Commercial use (strict notice)

> ⚖️ **This is not legal advice.** The following is guidance for safe use/distribution.

- **License: Apache License 2.0** · **Copyright: © 2026 SoDam AI Studio.**
- **You may (Apache-2.0)**: modify · copy · fork · redistribute · **commercial use · sell · run as a service · educational material · company/client delivery** · patent use.
- **Obligations**: **keep the license & copyright notices** · **state your changes** · **include the NOTICE file** (if present).
- **Not provided**: **no warranty (AS-IS)** · **no trademark rights granted.**
- **Third-party trademarks**: "Claude Code", "Codex", "Anthropic", "OpenAI", etc. belong to their owners. This product is **not affiliated with or endorsed by** them; names are used only **nominatively** to state compatibility.
- **Liability / disclaimer**: provided "as is"; the user is **responsible** for outcomes of use. "100% accident prevention" or "legally 100% safe" is **not guaranteed.**
- **Check separately**: **AI model terms (Anthropic/OpenAI)** · **API pricing** · **third-party service terms** · (if used) font/image/icon licenses. These are **outside this license**.
- **External assets caution**: when adding external code/images/fonts/samples, **verify the rights first**, and **do not borrow incompatible licenses such as AGPL/GPL.**
- Full text: **[LICENSE](./LICENSE)**, notices: **[NOTICE](./NOTICE)**.

---

## 10. FAQ

- **Q. Is it truly safe?** — It blocks common risks but **cannot block 100% of all cases.** It is a "seatbelt", not a "bulletproof shield".
- **Q. Does it see my passwords/tokens?** — **No.** It doesn't access tokens/auth files and doesn't send data out.
- **Q. Do I need the internet?** — Only to install. The safety features run locally on your computer.
- **Q. I accidentally deleted a folder.** — Folders can't be backed up wholesale, so **folder deletion itself is blocked.** Files can be restored with `/sodam-harness:undo`.

---
*SoDamHarness — © 2026 SoDam AI Studio · Apache-2.0 · Phase 1 (MVP)*
