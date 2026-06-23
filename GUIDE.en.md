# SoDamHarness User Guide (GUIDE) — For Absolute Beginners

> **SoDamHarness** is a **"seatbelt" that helps prevent big accidents when you code with AI (Claude Code).**
> It's built so that someone new to development, AI, and even computers can **just follow along**.
>
> ⚠️ **Read this first (an honest promise):** This tool is a **"seatbelt" that blocks common dangers — not a "bulletproof shield."** "100% safe" **does not exist.** Still, a seatbelt greatly reduces harm.

---

## 0. What is this? (understand in 1 minute)

When you tell an AI "do this," it creates, edits, and deletes files on your computer. Convenient — but if the **AI accidentally deletes an important file or folder**, it's hard to undo.

SoDamHarness acts as a **gatekeeper** in between.

- 🛑 **Very dangerous actions** (deleting a whole folder, etc.) are **blocked outright.**
- 💾 Before **hard-to-undo actions** (deleting/overwriting files), it **auto-backs up** and asks **"Really do this?"**
- ↩️ If you make a mistake, you can **restore from backup.**
- 🗣️ All guidance is in **plain, easy language.**

---

## 1. Prerequisites (programs you need)

Just **2 things**, both free.

### (1) Node.js — the engine the seatbelt runs on
- **Check:** In the black command window (see tip below), type `node --version`. If you see `v18` or higher (e.g., `v22.19.0`), it's already installed.
- **If missing, install:**
  1. In a web browser, go to **https://nodejs.org**.
  2. Click the big **"LTS"** button to download the installer. (LTS = the stable version.)
  3. Double-click the downloaded file → keep clicking **"Next"** to install → restart your computer/terminal.

### (2) Claude Code — the AI coding tool (where this seatbelt attaches)
- If you're reading this inside Claude Code, it's **already installed.**
- Otherwise, follow the official guide (https://claude.com/claude-code).

> 💡 **What is the "black command window (terminal)"?** A window where you type commands to your computer.
> **Open it (Windows):** press the **⊞ Windows key** → type `powershell` → click **Windows PowerShell**.

---

## 2. Installation (step by step)

You only install **once**. Pick **one** of the two methods.

### Method A — Install via the `/plugin` screen (recommended for beginners · point and click)

1. In Claude Code, type **`/plugin`** and press Enter → the plugin manager opens.
2. Choose **Add marketplace**, then enter one of:
   - **If published (recommended):** `sodam-ai/SoDam-Harness-Eng`
   - **From a folder on your computer (dev / sharing with friends):** the full folder path
     (e.g., `D:\AI_Dev_Work\2026y\26y_06m_22d_SoDam-Harness-Eng`)
3. Pick **`sodam-harness`** from the list and **Install**.
4. **Fully quit and reopen Claude Code.** (Type `/exit`, then run `claude` again — or close the terminal window and open a new one.)
5. Type **`/sodam-harness`** and if the **8 commands** (see section 6) appear, **install succeeded.**

### Method B — Install via commands (black command window)

Type these **one line at a time**:

```
claude plugin marketplace add "D:\AI_Dev_Work\2026y\26y_06m_22d_SoDam-Harness-Eng"
```
```
claude plugin install sodam-harness@sodamharness-marketplace
```

Then **fully quit and reopen** Claude Code and verify with `/sodam-harness`.

> 📌 **Important (current status):** If it isn't published to GitHub yet, **Method A's "if published" option won't work.**
> For now, install via the **computer folder path** (Method A's second option / Method B). Once published, GitHub is the simplest.

---

## 3. Quick start (3 minutes)

1. (After install) **reopen** Claude Code fresh.
2. Type **`/sodam-harness-install`** → you'll see "the seatbelt is on."
3. In a **throwaway empty practice folder**, ask the AI to do things as usual.
   - e.g., "create memo.txt" → it's created.
   - e.g., "delete this whole folder" → **blocked** 🛑 (seatbelt works!)
4. Curious? **`/sodam-harness-status`** (current state), **`/sodam-harness-log`** (what it just did).

---

## 4. How it works (when and how the seatbelt acts)

Normally, just use the AI **as usual**. The seatbelt steps in only at risky moments.

| What the AI tries to do | The seatbelt's response |
|---|---|
| **Create** a file, read, normal edits | Proceeds (not blocked) |
| **Delete a whole folder**, dangerous system commands | 🛑 **Blocked** (not allowed) |
| **Delete / overwrite a file** | 💾 **Auto-backup** first → asks **"Really do this?"** |
| Deploy / send out / other hard-to-undo actions | ⚠️ Asks for **confirmation** |
| Passwords / tokens / auth files | 🔒 **Not touched** (and not stored in backups) |

- **Backups** auto-save to `~/.sodamharness/backups/` on your computer. (See section 7.)
- If you deleted something by mistake, restore with **`/sodam-harness-undo`.**
- ⚠️ If you turn on **auto-approve (YOLO) mode**, the "Really do this?" prompt may be skipped. **Backups still happen.** To always see the prompt, use the **default mode.**

---

## 5. Workflow (everyday use)

```
[As usual] Ask the AI to do work
        │
        ▼
[Seatbelt auto-checks]
        │
        ├─ Safe action       → proceeds ✅
        ├─ Risky action      → backup 💾 + "Really do this?" ⚠️
        └─ Very risky action → blocked 🛑 (not done)
        │
        ▼
[Made a mistake?] → /sodam-harness-undo to restore ↩️
[What happened?]  → /sodam-harness-log to review 📜
[Working OK?]     → /sodam-harness-status to check 🩺
```

---

## 5-1. (Optional) Using it with Codex

> ⚠️ **Honest limit first:** SoDamHarness's **auto-block / backup / undo are Claude Code only** — they **do not work in Codex.** In Codex, safety is handled by **Codex's own features (approval prompt + sandbox)**; the method and strength differ. (There is no "100% safe".)

1. **Easy tone** — Copy the plugin's **`AGENTS.md`** into the project folder you work on in Codex. (If an `AGENTS.md` already exists, **merge/append** — don't overwrite.)
2. **Conservative safety config** — Add/merge the two lines (`approval_policy`, `sandbox_mode`) from the template **`codex/config.toml.example`** into **`~/.codex/config.toml`**.
   - ⚠️ **Don't overwrite** existing config · **never touch `~/.codex/auth.json` (login token)** · apply it **yourself**.
   - Value names may differ by Codex version → official docs: https://developers.openai.com/codex/config-reference
3. **Verify** — Restart Codex and, in a **throwaway empty folder**, ask for a risky action to confirm the **approval prompt appears**.
4. Detailed steps are also in **`codex/CODEX_SETUP.md`**. Stuck? In Claude Code, just say **"help me set up Codex safety."**

---

## 6. Commands (what to use when)

Type **`/sodam-harness`** to see these in autocomplete. All are **Claude Code only.**

### 6 commands

| Command | When to use | What happens |
|---|---|---|
| `/sodam-harness-install` | Right after install | Confirms install + getting-started guide |
| `/sodam-harness-status` | When unsure it works | Health check + "what to do next" |
| `/sodam-harness-fix` | When something breaks | Symptom-based help |
| `/sodam-harness-undo` | After an accidental delete | Restore by **picking** from the backup list |
| `/sodam-harness-trust` | To stop being asked for the same action | "Stop asking for this folder/action" — silence it for this session (hard blocks & backups still apply) |
| `/sodam-harness-log` | When curious what just happened | Timeline of AI actions (names & time only; secrets masked) |

### 2 skills (auto-helpers)

| Name | What it does |
|---|---|
| `/sodam-harness-beginner-tone` | Makes all guidance use **plain, easy language**. (Usually automatic — if it's hard, just say "explain it simply".) |
| `/sodam-harness-self-check` | Makes the AI **verify it really works** (with evidence) before saying "done". |

> 💡 All commands above are **Claude Code only**. To use it with Codex, see **"5-1. (Optional) Using it with Codex"** above.

---

## 7. File / document locations

- **Backup folder (auto-created)** — inside your home folder, `.sodamharness/backups/`
  - Windows: `C:\Users\<name>\.sodamharness\backups\`
  - Mac: `/Users/<name>/.sodamharness/backups/`
  - This folder **never stores passwords/tokens.** Only backup files.
- **Activity log (auto)** — in the same `.sodamharness/` folder. View with `/sodam-harness-log`. (Names & time only; secrets masked.)
- **Documents (in the plugin folder)**
  - `README.md` / `README.en.md` — short intro (KO/EN)
  - `GUIDE.md` / `GUIDE.en.md` — this detailed guide (KO/EN)
  - `TESTING.md` / `TESTING.en.md` — how to test/verify (KO/EN)
  - `codex/config.toml.example`, `codex/CODEX_SETUP.md` — Codex setup materials
  - `LICENSE` / `NOTICE` — license & notices
- Same content as **PDF**: `README.pdf` · `README.en.pdf` · `GUIDE.pdf` · `GUIDE.en.pdf`

---

## 8. Troubleshooting (Symptom → Why → Do now)

| Symptom | Why | Do now |
|---|---|---|
| `/sodam-harness-...` commands **don't appear** | **Didn't restart** after install, or not installed | **Fully close and reopen** Claude Code → check `/sodam-harness`. If still missing, redo section 2 |
| Risky action **wasn't stopped** | Plugin off, or an unknown risk pattern | Restart Claude Code → `/sodam-harness-status` |
| Asks **too often** | Safety-first default | For the same action, use `/sodam-harness-trust` to stop asking this session |
| **"Node.js missing"** | The safety hook runs on Node | Install **LTS** from https://nodejs.org, then restart (section 1) |
| Run-block warning (SmartScreen/Gatekeeper) | OS asks once for a new program | If from the official source, "Run anyway" |
| Deleted something **by mistake** | — | `/sodam-harness-undo` (pick from the list) |
| Backup folder error (permission/space) | Disk full / permissions | Free space and retry (if backup fails, the risky action is auto-stopped) |
| Garbled Korean | Encoding | Usually fine (Node.js); otherwise `/sodam-harness-fix` |
| Explanations too hard (tone) | The easy tone is via a Skill and **may not always auto-activate** | Tell the AI **"Explain it simply"** |
| Old names (`/install`, etc.) / duplicates appear | Leftover from an old install | Fully restart Claude Code. If still there, reinstall |

> For deeper diagnosis, type **`/sodam-harness-fix`**.

---

## 9. Uninstall

1. In Claude Code, **`/plugin`** → **Uninstall SoDamHarness**.
   - Or type `claude plugin uninstall sodam-harness@sodamharness-marketplace`.
2. To delete backups too, remove the **`.sodamharness/` folder** in your home directory. (Leave it to keep your backups.)

---

## 10. FAQ

- **Q. Is it truly safe?** — It blocks common risks but **cannot block 100% of all cases.** It's a "seatbelt", not a "bulletproof shield".
- **Q. Does it see my passwords/tokens?** — **No.** It doesn't access tokens/auth files and doesn't send data out. Secret files are **excluded** from backups.
- **Q. Do I need the internet?** — Only to install. The safety features run locally on your computer.
- **Q. I accidentally deleted a folder.** — Folders can't be backed up wholesale, so **folder deletion itself is blocked.** Files can be restored with `/sodam-harness-undo`.
- **Q. Does it work on Mac?** — It's built to run with the same code, but it's currently **verified on Windows only** (Mac untested). Let us know if you try it on Mac.
- **Q. Same protection in Codex?** — **No.** Block/backup/undo are **Claude Code only**. Codex relies on its own approval & sandbox (see 5-1).

---

## 11. License · Copyright · Commercial use (strict notice)

> ⚖️ **This is not legal advice.** The following is guidance for safe use/distribution. Final judgment is your responsibility; consult a professional if needed.

- **License: Apache License 2.0** · **Copyright: © 2026 SoDam AI Studio.**
- **You may (Apache-2.0)**: modify · copy · fork · redistribute · **commercial use · sell · run as a service · educational material · company/client delivery** · patent use.
- **Obligations**: **keep the license & copyright notices** · **state your changes** · **include the NOTICE file** (if present).
- **Not provided**: **no warranty (AS-IS)** · **no trademark rights granted.**
- **Third-party trademarks**: "Claude", "Claude Code", "Codex", "Anthropic", "OpenAI", "Node.js", etc. belong to their owners. This product is **not affiliated with or endorsed by** them; names are used only **nominatively** to state compatibility.
- **Liability / disclaimer**: provided **"as is"**; the user is **responsible for all outcomes** of use. **"100% accident prevention" or "legally 100% safe" is not guaranteed.**
- **Data/backup disclaimer**: backup/undo are **auxiliary aids**. Backups **may fail** due to disk failure, lack of space, or permission issues; data-loss responsibility lies with the user. **Keep separate backups** of important material.
- **Check separately**: **AI model terms (Anthropic/OpenAI, etc.)** · **API pricing** · **third-party service terms** · (if used) font/image/icon licenses. These are **outside this license**.
- **External assets caution**: when adding external code/images/fonts/samples, **verify the rights first**, and **do not borrow incompatible licenses such as AGPL/GPL.**
- Full text: **[LICENSE](./LICENSE)**, notices: **[NOTICE](./NOTICE)**.

---

## 12. Safety & limits (honest notice)

- This is an **auxiliary safety aid** that reduces common risks. **It is not perfect.**
- **New or clever risk patterns can be missed.** Always think twice before risky actions.
- **Verified on Windows; Mac untested.**
- For truly important data, **don't rely on this tool alone** — keep separate backups.

---

*This document (GUIDE.en.md) and its PDF (GUIDE.en.pdf) have identical content. Korean: README.md / GUIDE.md.*
