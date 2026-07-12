# SoDamHarness User Guide (GUIDE) — For Absolute Beginners

> **SoDamHarness** is a **"seatbelt" that helps prevent big accidents when you code with AI (Claude Code).**
> It is built so that someone new to development, AI, and even computers can **just follow along.**
>
> ⚠️ **Read this first — an honest promise:** This tool is a **"seatbelt" that blocks common dangers — not a "bulletproof shield."** **"100% safe" does not exist.** Even so, wearing a seatbelt greatly reduces harm when accidents happen.

---

## Table of Contents

- [0. What is this? (Understand in 1 minute)](#what-is-this-understand-in-1-minute)
- [0-1. How does it work? (Internal structure / architecture)](#how-does-it-work-internal-structure-architecture)
- [1. Prerequisites (Programs you need)](#prerequisites-programs-you-need)
- [1-1. How to download SoDamHarness](#how-to-download-sodamharness)
- [1-2. How to install Claude Code](#how-to-install-claude-code)
- [2. Installation (Step by step)](#installation-step-by-step)
- [3. Quick start (3 minutes)](#quick-start-3-minutes)
- [4. How it works](#how-it-works-when-and-how-the-seatbelt-acts)
- [5. Workflow (Everyday use)](#workflow-everyday-use)
- [5-1. Security & data flow](#security-data-flow-how-your-data-is-protected)
- [5-2. (Optional) Using it with Codex](#optional-using-it-with-codex)
- [6. Commands](#commands-what-to-use-and-when)
- [7. File and document locations](#file-and-document-locations)
- [8. Troubleshooting](#troubleshooting-symptom-why-what-to-do)
- [9. Uninstall](#uninstall-how-to-remove-sodamharness)
- [10. FAQ](#faq-frequently-asked-questions)
- [10-1. Update summary](#update-summary)
- [11. License · Copyright · Commercial use](#license-copyright-commercial-use-strict-notice)
- [12. Safety & limits](#safety-limits-honest-notice)

---

## 0. What is this? (Understand in 1 minute)

### If you are brand new to all of this — start here

Imagine your computer as a big filing cabinet. Inside are folders (drawers) and files (papers inside those drawers). When you use AI to help you write code or organize your work, the AI reaches into that filing cabinet on your behalf — creating new papers, changing existing ones, and sometimes throwing papers away.

This is very helpful! But there is a risk: **AI can make mistakes.** Sometimes it might delete an important file by accident, or overwrite something you spent hours creating. Once a file is deleted, getting it back is very hard — or sometimes impossible.

**SoDamHarness** acts like a **gatekeeper** sitting between you and the AI.

- 🛑 **Very dangerous actions** (like deleting an entire folder at once) are **blocked outright** — the AI simply cannot do them.
- 💾 Before **hard-to-undo actions** (deleting or overwriting a single file), the seatbelt **automatically makes a backup copy** and then asks you **"Are you sure you want to do this?"**
- ↩️ If something goes wrong, you can **restore your file from the backup.**
- 🔒 Your passwords, tokens, and secret files are **never read, never touched, never backed up** — they stay private.
- 🗣️ All guidance is in **plain, easy language** — no confusing technical jargon.

Think of it this way: **AI is like a very fast but occasionally clumsy assistant. SoDamHarness is the safety net under the tightrope.**

---

## 0-1. How does it work? (Internal structure / architecture)

You do not need to understand this section to use SoDamHarness. But if you are curious about what happens "behind the scenes," read on.

### The big picture

Every time you ask the AI to do something, here is what happens:

```
[You type a request]
         ↓
[Claude Code (the AI tool) prepares to act]
         ↓
[SoDamHarness watches — BEFORE the action happens]
         ↓
      Is it safe?
    /      |       \
  SAFE   RISKY  DANGEROUS
    ↓      ↓        ↓
  Run   Backup   Block
       + Ask    (stop)
          ↓
  [Action runs or is cancelled]
         ↓
[SoDamHarness records what happened — AFTER the action]
```

The seatbelt intercepts every AI action *before* it happens, checks it, and only lets it through if it is safe.

### The 3 tiers of risk classification

SoDamHarness sorts every AI action into one of three categories:

| Tier | Name | What happens | Examples |
|------|------|--------------|---------|
| 🟢 **Safe** | Passes through | Action runs immediately, no interruption | Creating a new file, reading a file, editing lines of code, listing folders |
| 🟡 **Risky** | Backup + Confirmation | A backup copy is made first, then you are asked "Really do this?" | Deleting a single file, overwriting a file, deploying code, sending data out |
| 🔴 **Catastrophic** | Immediately blocked | Action is refused and never executed | Deleting an entire folder (`rm -rf`), deleting system folders, wiping large amounts of data at once |

### What each internal file does

| File | Nickname | Role | Analogy |
|------|----------|------|---------|
| `hooks/guard.mjs` | The Guard | Runs before every AI action. Checks the 3-tier list and decides: block, backup+ask, or allow. | A security guard at a building entrance |
| `hooks/backup.mjs` | The Backup Keeper | Makes a copy of a file before a risky action happens. | A librarian photocopying a rare book before you borrow it |
| `hooks/whitelist.mjs` | The Session Pass | Remembers which actions *you* approved this session, so it does not ask repeatedly. Expires when you close Claude Code (12 hours max). | A visitor day-pass that expires at closing time |
| `hooks/activity.mjs` | The Logger | After each action, writes one line: what file was touched and when. Never records content or secrets. | A front-desk logbook — "Visitor arrived, 9:03 AM" — no personal details |
| `hooks/safety-rules.json` | The Rule Book | A list of danger patterns (like `rm -rf`) that the Guard checks against. Stored separately so rules can be updated without changing code. | A printed list of banned items at airport security |

### Internal data flow diagram

```
[AI requests an action]
           ↓
[guard.mjs checks] ← [safety-rules.json: danger patterns — stored locally]
           ↓
  ┌── Safe? ──────────────────────────→ Execute directly ✅
  │
  ├── Risky? → [backup.mjs makes backup] → [Ask user: "Proceed?"]
  │                                                ↓
  │                                       Yes → Execute ✅
  │                                       No  → Cancel ❌
  │
  └── Catastrophic? → Blocked immediately 🛑 (never executed)
           ↓
[activity.mjs records the outcome] → activity.log (filename + time only, secrets masked)
```

---

## 1. Prerequisites (Programs you need)

You need just **2 things** before installing SoDamHarness. Both are free.

### What is a "terminal" (command window)?

Before explaining the programs, here is one important tool you will use: the **terminal** (also called "command window," "PowerShell" on Windows, or "Terminal" on Mac).

A terminal is a black or white window where you type text commands to your computer instead of clicking icons. It looks old-fashioned but is very powerful, and many programs require it.

**How to open the terminal:**

**On Windows:**
1. Press the **⊞ Windows key** on your keyboard (bottom-left corner, looks like four small squares).
2. Without clicking anything else, just type: `powershell`
3. You will see "Windows PowerShell" appear in a search panel. Click on it.
4. A blue or dark window opens. This is your terminal. You can type commands here.

**On Mac:**
1. Press **⌘ Command + Space** at the same time. A search bar appears.
2. Type: `Terminal`
3. Click **Terminal** in the results.
4. A white or black window opens. This is your terminal.

> 💡 **You do not need to understand the terminal fully.** Just think of it as "the place where I type special commands." This guide will tell you exactly what to type every step of the way.

---

### (1) Node.js — the engine that powers SoDamHarness

**What is Node.js?**

Node.js is a free program that lets JavaScript code run outside of a web browser. SoDamHarness's safety hooks are written in JavaScript, and they need Node.js to run. Think of Node.js as the "engine" for the seatbelt — without it, the seatbelt cannot start.

- **Is it free?** Yes, completely free. It is open-source software used by millions of developers worldwide.
- **Is it safe?** Yes. It is maintained by the OpenJS Foundation and is one of the most trusted development tools in existence.
- **Do I need to understand it?** No. You install it once and it works quietly in the background forever.

**Step 1: Check if Node.js is already installed**

1. Open the terminal (see "How to open the terminal" above).
2. Type exactly this and press Enter:
   ```
   node --version
   ```
3. Look at what appears:
   - If you see something like `v18.20.0` or `v20.11.0` or `v22.19.0` — **it is already installed.** The number just needs to be 18 or higher. You are done with this step.
   - If you see `command not found` or `'node' is not recognized as an internal or external command` — you need to install it. Follow Step 2 below.

**Step 2: Install Node.js (if needed)**

1. Open a **web browser** (Chrome, Edge, Firefox, Safari — any will work).
2. In the address bar at the very top of the browser, type: **`https://nodejs.org`** and press Enter.
3. The Node.js website loads. Look for a large button that says **"LTS"** — it may also say "Recommended for most users."
   - **LTS** means "Long Term Support" — the stable, reliable version. Always choose LTS.
4. Click the LTS button. A file starts downloading.
   - On Windows: the file ends in `.msi` (example: `node-v22.19.0-x64.msi`)
   - On Mac: the file ends in `.pkg`
5. **On Windows — installing:**
   - Find the downloaded file in your Downloads folder. Double-click it.
   - A "Setup Wizard" window opens.
   - Click **"Next"** on the first screen.
   - On the license screen, check the box "I accept the terms in the License Agreement" and click **"Next"**.
   - Keep clicking **"Next"** on each following screen. The default settings are all fine.
   - When you see the **"Install"** button, click it.
   - If a Windows pop-up asks "Do you want to allow this app to make changes to your device?" — click **"Yes"**.
   - Wait about 1–2 minutes for the installation to finish.
   - Click **"Finish"** when it appears.
6. **On Mac — installing:**
   - Find the downloaded `.pkg` file in your Downloads folder. Double-click it.
   - Follow the on-screen instructions, clicking "Continue" and "Install."
   - Enter your Mac password if asked.
7. **After installing:** Close the terminal window completely and open a new one (this is important — the terminal needs to reload to find Node.js).
8. In the **new** terminal window, type `node --version` again. You should now see a version number like `v22.19.0`.

> 💡 **Tip:** If it still says "not recognized" after restarting the terminal, try restarting your entire computer and then checking again.

---

### (2) Claude Code — the AI coding tool (where SoDamHarness attaches)

**What is Claude Code?**

Claude Code is an AI-powered coding assistant made by Anthropic — the same company that makes the Claude AI chat assistant. Claude Code runs in your terminal and helps you write, edit, debug, and understand code by having a conversation with you in plain English (or any language).

SoDamHarness is a plugin (an add-on) that attaches to Claude Code. So Claude Code must be installed before you can install SoDamHarness.

- **If you are already reading this guide inside Claude Code** — Claude Code is already installed. Skip to section 1-1.
- **If you need to install Claude Code** — see Section 1-2 below.

> 💡 **Cost note:** Claude Code requires an Anthropic account. There is a free plan and paid plans. Check **https://claude.ai/claude-code** for current pricing. Node.js (from the step above) is always free.

---

## 1-1. How to download SoDamHarness

You need to get the SoDamHarness files onto your computer before installing them. There are three ways to do this.

### Method A: Download ZIP from GitHub (when the project is publicly released)

> ⚠️ **Current status:** SoDamHarness is **not yet publicly available on GitHub.** Use Method B for now. This guide will be updated when it becomes public.

When it is released publicly, here is how to download it:

1. Open a web browser and go to: **`https://github.com/sodam-ai/SoDam-Harness-Eng`**
2. On the GitHub page, look near the top-right area for a green button labeled **`<> Code`**. Click it.
3. A small dropdown menu appears. At the bottom of this menu, click **"Download ZIP"**.
4. A file named something like `SoDam-Harness-Eng-main.zip` downloads to your computer.

**How to extract (unzip) the ZIP file on Windows:**
1. Open File Explorer and go to your Downloads folder.
2. Find the `.zip` file you just downloaded.
3. Right-click on it.
4. In the menu that appears, click **"Extract All..."** (Windows 10 or 11).
5. A small window appears asking where to save the extracted files. The default location shown is fine. Click **"Extract"**.
6. A new folder appears. This folder contains all of SoDamHarness.
7. Note the full path to this folder — you will need it in Section 2. Example: `C:\Users\YourName\Downloads\SoDam-Harness-Eng-main`

**How to extract (unzip) on Mac:**
1. Open Finder and go to your Downloads folder.
2. Find the `.zip` file.
3. Double-click it. Mac automatically unzips it and creates a new folder right next to the zip file.
4. Note the full path to this folder — you will need it in Section 2.

---

### Method B: Install from a folder you already have (use this now)

If someone gave you the SoDamHarness folder directly — on a USB drive, in a shared folder, or downloaded from a direct link:

1. Copy the SoDamHarness folder to a permanent location on your computer where you will not accidentally move or delete it.
   - Good locations: your **Documents** folder or your **Desktop**.
   - Example: `C:\Users\YourName\Documents\SoDam-Harness-Eng`
2. Write down the **full path** to this folder. You will need it in Section 2.
   - **On Windows:** Open File Explorer and navigate to the folder. Click the address bar at the top of the window — the full path appears highlighted. Copy it (Ctrl+C).
   - **On Mac:** Right-click the folder, hold the **Option** key on your keyboard, and click "Copy [folder name] as Pathname." The full path is now copied.

> 📌 **This is the method to use right now.** When the project becomes public on GitHub, Method A will be the easiest option.

---

### Method C: Git clone (for developers — brief)

If you already know how to use Git:

```
git clone https://github.com/sodam-ai/SoDam-Harness-Eng.git
```

This clones the repository to your current directory. Use the cloned folder path in Section 2.

> ℹ️ If you do not know what "Git" or "clone" means, skip this and use Method B.

---

## 1-2. How to install Claude Code

> ℹ️ **Skip this section if Claude Code is already installed.** (If you are reading this inside Claude Code, it is installed.)

### What is Claude Code?

Claude Code is made by **Anthropic**. It is a coding assistant that you interact with through a terminal. You describe what you want in plain language, and Claude Code writes code, fixes bugs, explains existing code, and manages files — all through a conversation.

> ⚠️ **Trademark notice:** "Claude" and "Claude Code" are trademarks of Anthropic PBC. SoDamHarness is a third-party plugin and is **not affiliated with or endorsed by Anthropic.** We use these names only to state compatibility.

### Pricing and subscription

Claude Code requires an Anthropic account. **Pricing changes over time** — always check the official source for the most current information:

**https://claude.ai/claude-code**

> 💡 We cannot guarantee that pricing information in this guide is current. Please verify at the Anthropic website.

### How to install Claude Code

You need Node.js installed first (Section 1, step 1 above).

1. Open your terminal.
2. Type exactly this command and press Enter:
   ```
   npm install -g @anthropic-ai/claude-code
   ```
   - `npm` is the Node.js package manager — it comes with Node.js automatically.
   - `-g` means "install globally" so it is available from any folder.
   - This may take 1–3 minutes. You will see text scrolling — this is normal. Wait for it to finish.
3. When it finishes, verify it worked:
   ```
   claude --version
   ```
   You should see a version number. If you do, Claude Code is installed.

### Starting Claude Code for the first time

1. In the terminal, type:
   ```
   claude
   ```
   and press Enter.
2. The first time, Claude Code will ask you to **log in with your Anthropic account**.
3. Follow the on-screen prompts. It will likely open a web page in your browser where you enter your email and password.
4. After logging in, you will see the Claude Code interface appear in your terminal. You can now type requests in plain English.
5. To quit Claude Code at any time, type `/exit` and press Enter.

> 💡 From now on, whenever you want to use Claude Code, just open a terminal and type `claude`. You do not need to log in every time.

---

## 2. Installation (Step by step)

You install SoDamHarness **once**. Choose **one** of the two methods below.

### Method A — Install via the `/plugin` screen (recommended for beginners)

This method uses menus inside Claude Code — no memorizing commands required.

1. Open Claude Code: open your terminal and type `claude`, then press Enter.
2. In the Claude Code input area (where you type your questions), type **`/plugin`** and press Enter.
3. A plugin management menu appears. Look for an option like **"Add marketplace"** or **"Add plugin source"** and select it.
4. You will be asked to enter a source address. Type one of the following and press Enter:

   **Option 1 — if SoDamHarness is published on GitHub (not yet available — use Option 2 for now):**
   ```
   sodam-ai/SoDam-Harness-Eng
   ```

   **Option 2 — if installing from a folder on your computer (use this now):**
   Type the full path to the folder. Replace the example below with your actual path:
   ```
   D:\AI_Dev_Work\2026y\26y_06m_22d_SoDam-Harness-Eng
   ```
   *(How to find your path: see Section 1-1, Method B.)*

5. Press Enter. Claude Code loads the plugin list from that source.
6. Find **`sodam-harness`** in the list and select **"Install"** (or press the number next to it).
7. **IMPORTANT — Fully quit and reopen Claude Code.**
   - Type `/exit` in Claude Code and press Enter. Claude Code closes.
   - Type `claude` in the terminal and press Enter to reopen it.
   - **Or:** Close the entire terminal window, open a new terminal, and type `claude`.
   - You **must** restart — plugins only load when Claude Code first starts up.
8. After restarting, type **`/sodam-harness`** in the input area and press Tab or Enter.
   - If you see a list of commands beginning with `/sodam-harness-install`, **installation succeeded!** 🎉
   - Now run **`/sodam-harness-install`** to complete the guided setup.

---

### Method B — Install via terminal commands

If you prefer to type commands directly:

1. Open your terminal (without opening Claude Code).
2. Type this (replace the path with your actual folder path):
   ```
   claude plugin marketplace add "D:\AI_Dev_Work\2026y\26y_06m_22d_SoDam-Harness-Eng"
   ```
3. Then type:
   ```
   claude plugin install sodam-harness@sodamharness-marketplace
   ```
4. **Fully quit and reopen Claude Code** (same as step 7 in Method A).
5. Verify by typing `/sodam-harness` in Claude Code.

> 📌 **Current status:** The GitHub option (`sodam-ai/SoDam-Harness-Eng`) is not yet active. Use the **folder path** for now. Once the project is public on GitHub, Option 1 in Method A will be the easiest.

---

## 3. Quick start (3 minutes)

1. (After installing) Reopen Claude Code fresh (type `claude` in a terminal).
2. Type **`/sodam-harness-install`** and press Enter.
   → You will see a message confirming "the seatbelt is on."
3. In a **throwaway, empty practice folder** (a folder you do not care about at all), ask the AI to do things:
   - Try: `"Please create a file called test.txt with the words hello world inside."`
     → The file is created. ✅ (Safe action — no interruption.)
   - Try: `"Please delete this entire folder."`
     → **Blocked!** 🛑 (The seatbelt works — catastrophic action refused.)
   - Try: `"Please delete the file test.txt."`
     → Backup is made automatically, then you are asked to confirm. 💾⚠️
4. Curious about what just happened?
   - **`/sodam-harness-status`** — shows whether the seatbelt is on and healthy.
   - **`/sodam-harness-log`** — shows a timeline of what the AI just did.

> ⚠️ **Always test in a practice folder first.** Never test a safety tool in a folder with real, important work.

---

## 4. How it works (When and how the seatbelt acts)

During normal use, just work with the AI **as you normally would.** The seatbelt only steps in when the AI tries to do something risky.

### Safety behavior table

| What the AI tries to do | The seatbelt's response |
|---|---|
| **Create** a new file | Proceeds normally ✅ — no interruption |
| **Read** a file (view contents) | Proceeds normally ✅ — no interruption |
| **Edit** a file (normal changes) | Proceeds normally ✅ — no interruption |
| **Delete a whole folder** | 🛑 **Blocked** — refused entirely, never executed |
| **Dangerous system commands** (like `rm -rf`) | 🛑 **Blocked** — refused entirely |
| **Delete a single file** | 💾 **Auto-backup first** → ⚠️ Asks **"Really do this?"** |
| **Overwrite a file** (replace its contents) | 💾 **Auto-backup first** → ⚠️ Asks **"Really do this?"** |
| **Deploy or publish** code to the internet | ⚠️ **Asks for confirmation** first |
| **Passwords / tokens / auth files** | 🔒 **Not touched at all** — not read, not backed up, not logged |

### Key facts

- **Backups** are automatically saved to `~/.sodamharness/backups/` on your computer (see Section 7).
- If you accidentally deleted or overwrote something, restore it with **`/sodam-harness-undo`**.
- ⚠️ **Auto-approve (YOLO) mode:** Claude Code has a mode that automatically approves all AI actions without asking. If you have this mode on, the "Really do this?" prompt may be skipped. However, **backups still happen automatically** even in this mode. To always see confirmation prompts, use the **default mode** (not auto-approve). See FAQ Q10 for more.

---

## 5. Workflow (Everyday use)

Here is the full picture of a typical work session:

```
[As usual] Ask the AI to do work
         │
         ▼
[SoDamHarness automatically checks every AI action]
         │
         ├─ Safe action         → Proceeds ✅ (invisible — you see nothing)
         ├─ Risky action        → Backup 💾 + "Really do this?" ⚠️
         └─ Catastrophic action → Blocked 🛑 (with explanation of why)
         │
         ▼
[Made a mistake?]  → /sodam-harness-undo to restore ↩️
[What happened?]   → /sodam-harness-log to review   📜
[Working OK?]      → /sodam-harness-status to check  🩺
```

**Day-to-day tip:** For most work sessions, you do not need to think about SoDamHarness at all. It runs silently in the background. You only notice it when something risky is about to happen.

---

## 5-1. Security & data flow (How your data is protected)

This section explains exactly what SoDamHarness does and does not do with your data.

### Fully local — no internet after install

Once SoDamHarness is installed, **all safety features run entirely on your computer.** No data is sent to any server, website, or third party. It does not "call home." It does not collect usage statistics. It does not send error reports anywhere.

The only time an internet connection is needed is during the initial installation (to download the files). After that, no internet is needed for any feature to work.

### Data flow — what happens step by step

```
[AI requests an action]
           ↓
[guard.mjs checks the action type]
           ↑
   [safety-rules.json: danger patterns — stored locally on YOUR computer]
           ↓
       Is it safe?
    /         |          \
  SAFE       RISKY    CATASTROPHIC
    ↓           ↓            ↓
Execute    backup.mjs     BLOCKED 🛑
directly   makes a copy   (nothing happens,
    ✅      of the file    nothing is executed)
              ↓
          Ask user:
          "Proceed?"
           /      \
          Yes      No
           ↓        ↓
        Execute   Cancel
           ✅       ❌
           ↓
[activity.mjs records the event]
           ↓
activity.log: one line — "filename.txt — 14:32:05" — NOTHING ELSE
```

### What IS stored vs what is NEVER stored

| Category | Status | Where |
|----------|--------|-------|
| Backup copies of risky files | ✅ Stored locally | `~/.sodamharness/backups/` |
| Activity log (filename + time only) | ✅ Stored locally | `~/.sodamharness/activity.log` |
| Danger pattern rules | ✅ Stored locally | `hooks/safety-rules.json` |
| Session whitelist (/trust decisions) | ✅ In memory only — cleared when Claude Code closes | RAM only |
| File contents | ❌ NEVER stored in any log | — |
| Passwords | ❌ NEVER read, NEVER stored | — |
| Tokens / API keys | ❌ NEVER read, NEVER stored | — |
| Authentication files | ❌ NEVER read, NEVER stored | — |
| Your code content | ❌ NEVER read by SoDamHarness | — |
| Anything sent externally | ❌ NEVER transmitted anywhere | — |

### Secret file types that SoDamHarness never touches

SoDamHarness maintains an automatic exclusion list. The following types of files are **never read, never backed up, never logged**, regardless of what the AI requests:

- `.env` and `.env.*` files (environment variables — often contain API keys)
- `auth.json` and similar authentication files
- Files whose name contains: `token`, `secret`, `password`, `credential`, or `key`
- Certificate files: `.pem`, `.crt`, `.key`, `.p12`, `.pfx`
- `~\AppData\Roaming\Microsoft\Credentials` and similar Windows credential stores
- `~/.ssh/` directory (SSH private keys)
- `~/.aws/credentials` (AWS access keys)
- Any file matching common secret-file naming patterns

> ⚠️ If the AI tries to read, delete, or modify any of these file types, SoDamHarness will refuse the request entirely.

### Privacy statement

- **No personal data is collected** by SoDamHarness.
- **No data is transmitted** to SoDam AI Studio or any other party — ever.
- **No analytics, no telemetry, no tracking** of any kind.
- The activity log on your computer contains only filenames and timestamps — never file contents.
- You can delete the activity log and the backup folder at any time without affecting the tool's function.

### Backup folder access permissions (Windows)
- The backup folder (`~/.sodamharness/backups/`) is not separately locked down — it relies on **the default per-account folder permissions Windows already sets**. Normally, other user accounts on the same computer cannot see inside your user folder (default Windows behavior).
- If multiple people **share the same account** on one computer, be aware that everyone using that account can also see the backup folder.

### Be cautious of unofficial "AI safety" tools
- **Be especially careful of unofficial tools that claim to make AI "safe" but ask for your login token or password.** Real-world incidents have involved exactly this — tools that stole login credentials this way.
- SoDamHarness **never asks for or stores any token or password.** Be suspicious of any tool that asks for your login information.

---

## 5-2. (Optional) Using it with Codex

> ⚠️ **Honest limit first:** SoDamHarness's **auto-block / backup / undo features are Claude Code only** — they **do not work in Codex.** In Codex, safety is provided by **Codex's own features (approval prompt + sandbox);** the method and strength differ. There is no such thing as "100% safe."
>
> "Codex" is a product of OpenAI. "OpenAI" is a trademark of OpenAI. SoDamHarness is **not affiliated with or endorsed by OpenAI.** We use these names only to state compatibility.

If you use both Claude Code and Codex, here is how to improve safety in Codex using materials included with SoDamHarness:

1. **Easy tone** — Copy the plugin's **`AGENTS.md`** file into the project folder you are working on in Codex. (If an `AGENTS.md` already exists in that project folder, do **not** overwrite it — **merge/append** the content instead.)
2. **Conservative safety config** — Add the two lines (`approval_policy`, `sandbox_mode`) from the template file **`codex/config.toml.example`** into your **`~/.codex/config.toml`** file.
   - ⚠️ **Do not overwrite** your existing config file.
   - **Never touch `~/.codex/auth.json`** — that is your login token. Deleting it logs you out.
   - Make these changes **yourself** — do not ask the AI to do this.
   - Value names may differ by Codex version → official docs: **https://developers.openai.com/codex/config-reference**
3. **Verify** — Restart Codex and, in a **throwaway empty folder**, ask for a risky action to confirm the **approval prompt appears**.
4. Detailed steps are also in **`codex/CODEX_SETUP.md`** in the plugin folder. If you get stuck, open Claude Code and simply say: **"Help me set up Codex safety."**

---

## 6. Commands (What to use and when)

To see all commands, type **`/sodam-harness`** in the Claude Code input area and press Tab or Enter. All commands are **Claude Code only** — they do not work in Codex or other tools.

### The 6 commands in detail

---

#### `/sodam-harness-install`

**When to use:** Right after you finish installing SoDamHarness for the first time.

**What it does:** Confirms that the installation is complete and shows a getting-started guide with next steps.

**Example output:**
```
✅ SoDamHarness is installed and active.
The seatbelt is on. Here is what happens next:
- Catastrophic actions will be blocked.
- Risky actions will be backed up and confirmed with you.
- Passwords and tokens are never touched.
Type /sodam-harness-status anytime to check the seatbelt is working.
```

---

#### `/sodam-harness-status`

**When to use:** Anytime you want to check if the seatbelt is working properly, or when something seems off.

**What it does:** Runs a self-check and reports the health of each component. Also tells you what to do if something is wrong.

**Example output:**
```
🩺 SoDamHarness Status Check
✅ guard.mjs: active
✅ backup.mjs: ready
✅ activity.mjs: logging
✅ Node.js: v22.19.0 (OK — v18+ required)
📁 Backup folder: C:\Users\YourName\.sodamharness\backups\ (exists)
📋 Activity log: last entry today at 14:32
Everything looks good. Seatbelt is ON. ✅
```

---

#### `/sodam-harness-fix`

**When to use:** When something is not working — commands do not appear, an action was not blocked when you expected it to be, or you see an error.

**What it does:** Asks you what symptom you are experiencing and then provides step-by-step instructions to fix it.

**Example:** If you report "commands don't appear," it responds: "Fully close Claude Code by typing /exit, then open a new terminal and type `claude`. Plugins load only at startup. If commands still don't appear after restarting, follow these reinstallation steps..."

---

#### `/sodam-harness-undo`

**When to use:** When you (or the AI) accidentally deleted or overwrote a file and you want it back.

**What it does:** Shows you a numbered list of all backed-up files with dates and times. You type the number of the one you want to restore.

**Example output:**
```
Available backups (most recent first):
  1. myproject/notes.txt — backed up today at 14:31 (before deletion)
  2. myproject/config.js — backed up today at 13:55 (before overwrite)
  3. myproject/notes.txt — backed up yesterday at 09:12 (before overwrite)

Which backup do you want to restore? Type a number (or "cancel"):
```

> 💡 **Note:** Entire folders cannot be backed up individually — which is exactly why SoDamHarness **blocks** folder deletion entirely rather than asking for confirmation. Individual files can be restored.

---

#### `/sodam-harness-trust`

**When to use:** When SoDamHarness keeps asking you about the same type of action repeatedly and you want it to stop asking — just for this work session.

**What it does:** Adds the current action type and/or folder to a session whitelist. SoDamHarness will stop asking for that specific combination for the rest of your current session only.

**What still applies even after /trust:**
- 🛑 Hard blocks (catastrophic actions) **still apply** — those cannot be trusted away.
- 💾 Backups **still happen** automatically.
- The trust decision expires when you close Claude Code. The next session starts fresh.

**Example:** The AI keeps asking "Really delete this auto-generated test log?" You know it is safe and run `/sodam-harness-trust`. It will stop asking for that action this session.

---

#### `/sodam-harness-log`

**When to use:** When you want to review what the AI has been doing — a timeline of recent actions.

**What it does:** Shows the activity log. Only filenames and timestamps are shown. File contents are never displayed. Secrets are masked automatically even if they appear in a filename.

**Example output:**
```
📋 Recent AI Activity (today, June 28)
  14:32:05 — Created:   myproject/notes.txt
  14:33:11 — Read:      myproject/config.js
  14:34:02 — BLOCKED:   attempted to delete myproject/ (entire folder)
  14:35:17 — Backed up + Modified: myproject/notes.txt
  14:36:44 — Read:      myproject/README.md
```

---

### The 2 skills (automatic helpers)

Skills are helper behaviors that run alongside SoDamHarness to improve your experience.

| Skill | What it does | How to activate |
|---|---|---|
| `beginner-tone` | Makes all AI guidance use plain, simple, jargon-free language. Explains technical terms when they appear. | Activates automatically — it is not a slash command. If explanations feel too technical, just say "Explain it simply". |
| `/sodam-harness-self-check` | Before the AI says "Done!", it verifies the task actually worked — by running the code, checking the file, etc. — rather than just claiming it is done. | Activates automatically. Especially useful for important tasks. |

---

## 7. File and document locations

### Where are my backup files?

Backups are stored in a hidden folder inside your home directory:

- **Windows:** `C:\Users\YourName\.sodamharness\backups\`
  *(Replace `YourName` with your actual Windows username.)*
- **Mac:** `/Users/YourName/.sodamharness/backups/`
  *(Replace `YourName` with your actual Mac username.)*

> 💡 **What is the "home directory"?** It is the main personal folder for your account. On Windows: `C:\Users\YourName`. On Mac: `/Users/YourName`.

> 💡 **Why is the folder hidden?** Folders starting with `.` are hidden by default. On Windows, to see hidden folders: Open File Explorer → click **View** in the menu bar → check the box for **"Hidden items"**. On Mac: In Finder, press **⌘ Command + Shift + .** (period) to toggle hidden files.

**Backup filename format:**

Backups are saved with a name that includes the original filename and a timestamp. For example:
- If `notes.txt` was backed up on June 28, 2026 at 14:31, the backup might be named: `notes_20260628_143100.txt`
- This way you can easily tell when each backup was created and which original file it belongs to.

**How to open a backup file:**

Backup files are plain copies of the original — just regular files. Open them with whatever program you normally use for that file type:
- `.txt` files: Notepad (Windows) or TextEdit (Mac)
- `.js`, `.py`, `.html`, `.md` files: Any text editor (Notepad, VS Code, etc.)

> ⚠️ **This folder never contains passwords, tokens, certificates, or any secret files.** Those are excluded from backups automatically.

### Activity log

Location: `~/.sodamharness/activity.log`

- View it inside Claude Code with `/sodam-harness-log`
- Or open it directly with any text editor
- Contains only: filename + timestamp. No file contents. No secrets.

### Plugin documents

These files are in the SoDamHarness plugin folder:

| File | Purpose |
|------|---------|
| `README.md` / `README.en.md` | Short overview (Korean / English) |
| `GUIDE.md` / `GUIDE.en.md` | This detailed guide (Korean / English) |
| `TESTING.md` / `TESTING.en.md` | How to test and verify the installation (Korean / English) |
| `codex/config.toml.example` | Template for Codex safety settings |
| `codex/CODEX_SETUP.md` | Detailed Codex setup guide |
| `LICENSE` | Full Apache License 2.0 text |
| `NOTICE` | Third-party notices and attributions |

**HTML versions** with identical content: `README.html` · `README.en.html` · `GUIDE.html` · `GUIDE.en.html`

---

## 8. Troubleshooting (Symptom → Why → What to do)

### Quick reference table

| Symptom | Why it happens | What to do right now |
|---------|----------------|----------------------|
| `/sodam-harness-...` commands **don't appear** | Plugin not loaded — most likely not restarted after install | **Fully close Claude Code** (type `/exit`), open a new terminal, type `claude`. If still missing, return to Section 2 and reinstall. |
| A risky action **was not stopped or blocked** | Plugin may have turned off, or the risk pattern is not yet known | Restart Claude Code → run `/sodam-harness-status` to diagnose. |
| **Too many confirmations** — it asks too often | Safety-first default behavior | For a repeated safe action, run `/sodam-harness-trust` to silence it this session. |
| **"Node.js not found"** or **"node is not recognized"** | Node.js is not installed or not on the PATH | Install **LTS** from **https://nodejs.org**, close and reopen the terminal (Section 1). |
| **SmartScreen warning** (Windows) | Windows does not recognize the program's publisher | If from the official source, click **"More info"** then **"Run anyway"**. If unsure of the source, do not run. |
| **Gatekeeper warning** (Mac) | Mac security is blocking an unrecognized developer | If from the official source, go to System Preferences → Security & Privacy → click **"Open Anyway"**. |
| **Accidentally deleted a file** | — | Run **`/sodam-harness-undo`** and pick the backup from the list. |
| **Backup folder error** ("permission denied" or "disk full") | Disk is full or the folder has restricted permissions | Free up disk space and retry. If backup fails, the risky action is **automatically cancelled** — nothing is lost. |
| **Garbled text / strange characters** in terminal | Character encoding issue | This is uncommon with Node.js. If it persists, run `/sodam-harness-fix`. |
| **Explanations are too technical** | Beginner-tone skill may not have activated | Say **"Explain this in simple, plain language"**. |
| **Old command names appear** (like `/install` without the prefix) | Leftover data from a previous or different version | Fully restart Claude Code. If they persist, uninstall (Section 9) and reinstall (Section 2). |
| **Duplicate commands** in the list | Two plugin versions may be installed | Restart → if duplicates persist, uninstall and reinstall. |
| **"claude" command not recognized** in terminal | Claude Code is not installed or not on the PATH | Install Claude Code (Section 1-2). Restart terminal after. |
| **Installation command failed** | Many possible causes | Copy the exact error message and run `/sodam-harness-fix`, or start over from Section 2. |

### Extended troubleshooting tips

**"The backup folder doesn't exist yet"**
This is normal. The folder `~/.sodamharness/backups/` is created automatically the first time a backup is needed. You do not need to create it manually.

**"I can't find my home folder"**
- **Windows:** Open File Explorer and type `%USERPROFILE%` in the address bar at the top, then press Enter. This takes you directly to your home folder.
- **Mac:** In Finder, press **⌘ Command + Shift + H** to jump to your home folder.

**"The AI completely ignored the seatbelt"**
This usually means Claude Code was not fully restarted after installation, or the plugin is installed but not active. Run `/sodam-harness-status`. If it shows errors, reinstall following Section 2.

**"I see an error message I don't understand"**
Do not panic. Paste the error into Claude Code and say: "I see this error: [paste it here]. What does it mean and what should I do?" The AI will explain it clearly.

> For deeper diagnosis of any issue, type **`/sodam-harness-fix`** inside Claude Code.

---

## 9. Uninstall (How to remove SoDamHarness)

If you decide you no longer want SoDamHarness, here is how to remove it cleanly.

### Step 1: Uninstall the plugin

**Option A — via the Claude Code plugin menu:**
1. Open Claude Code.
2. Type **`/plugin`** and press Enter.
3. Find **SoDamHarness** in the installed plugins list.
4. Select **"Uninstall"** or **"Remove"**.
5. Fully close and reopen Claude Code.

**Option B — via the terminal:**
1. Open your terminal.
2. Type:
   ```
   claude plugin uninstall sodam-harness@sodamharness-marketplace
   ```
3. Fully close and reopen Claude Code.

### Step 2: (Optional) Delete backups and logs

Uninstalling the plugin does **not** automatically delete your backup files or activity log. If you want to remove them:

1. Navigate to the `.sodamharness/` folder in your home directory:
   - **Windows:** `C:\Users\YourName\.sodamharness\`
   - **Mac:** `/Users/YourName/.sodamharness/`
2. Delete the entire `.sodamharness/` folder and all its contents.

> ⚠️ **Warning:** This permanently deletes all your backups. If you might need to restore a file later, check the backups first before deleting. If you want to keep backups "just in case," leave the folder alone — it causes no problems after uninstall.

---

## 10. FAQ (Frequently Asked Questions)

---

**Q1. Is it truly safe? Can I trust this tool?**

A: SoDamHarness blocks many common dangerous actions and creates backups before risky ones. However, it **cannot block 100% of all possible risks.** New or unusual danger patterns that we have not anticipated may not be caught. Think of it exactly like a seatbelt in a car: it greatly reduces harm but does not make driving 100% risk-free. For truly important work, always keep **your own separate backup** in addition to using this tool.

---

**Q2. Does it read or see my passwords or private files?**

A: No. SoDamHarness explicitly excludes secret file types (`.env`, `auth.json`, token files, certificates, SSH keys, etc.) from all operations. It does not read these files, does not back them up, does not include their names in activity logs, and does not send them anywhere. The activity log contains only non-secret filenames and timestamps.

---

**Q3. Do I need the internet for this to work after installing?**

A: No. You need the internet only **once** — when you first install SoDamHarness (to download the files). After installation, **all safety features run completely offline on your computer.** No internet connection is required for blocking, backup, confirmation prompts, logging, or any other feature.

---

**Q4. Is this a virus? Is it safe to install?**

A: SoDamHarness is not a virus. It is open-source software (Apache License 2.0) — every line of code is publicly readable. It does not send data anywhere, does not access the internet after installation, and does not modify system files. If you received it from the official source (the SoDam AI Studio GitHub page or directly from the developer), it is safe to install. As with any software, if you received it from an unknown or suspicious source, be cautious.

---

**Q5. Why do I need Node.js? Can I use SoDamHarness without it?**

A: SoDamHarness's safety hooks are written in JavaScript and require Node.js to run. Without Node.js, the hooks simply cannot execute — meaning the seatbelt will not work. Node.js is free, widely trusted, and installing it takes about 3–5 minutes. It runs quietly in the background and does not noticeably slow down your computer.

---

**Q6. Does it slow down my computer or drain the battery?**

A: No, not noticeably. SoDamHarness's hooks run only when the AI takes an action — they do not run continuously in the background. Each check takes a fraction of a second. You will not notice any change in your computer's speed or battery life.

---

**Q7. I accidentally deleted an entire folder. Can I recover it?**

A: Unfortunately, no — entire folder deletion is not backed up because folders can contain hundreds of files. Instead, SoDamHarness **blocks** folder deletion entirely, so it should not have happened if the plugin is active. Individual files (which are backed up before deletion) can be restored with `/sodam-harness-undo`. If a folder was deleted anyway, this suggests the plugin was not active at that moment — run `/sodam-harness-status` to diagnose.

---

**Q8. Does it work on Mac?**

A: SoDamHarness is written with cross-platform code and is designed to work on Mac. However, **it has only been formally verified on Windows** as of this writing. Mac is untested. If you use it on Mac and encounter any issues, please report them to the developer.

---

**Q9. Does it provide the same protection in Codex?**

A: No. The block / backup / undo features are **Claude Code only.** They will not activate in Codex. In Codex, you rely on Codex's own built-in safety features (the approval prompt and sandbox environment). See Section 5-2 for how to improve safety in Codex using the included `AGENTS.md` file.

---

**Q10. What is "auto-approve mode" and should I use it?**

A: Claude Code has a mode (sometimes called "YOLO mode" or "auto-approve mode") where it automatically approves all AI actions without showing you any confirmation prompts. If this mode is on, the "Really do this?" prompts from SoDamHarness will be skipped. **Backups still happen automatically** even in auto-approve mode — that cannot be turned off. Hard blocks (catastrophic actions) also still apply. We recommend **not** using auto-approve mode unless you are an experienced developer who fully understands the risks.

---

**Q11. What is a "session"? (For the /trust command)**

A: A "session" is one working period with Claude Code — from when you open it to when you close it. When you run `/sodam-harness-trust`, SoDamHarness remembers your trust decision for that session only. When you close Claude Code and reopen it, the trust decisions are cleared and the next session starts fresh with a clean slate. This is intentional — it means you have to consciously re-approve actions each time you begin work.

---

**Q12. What happens if a backup fails?**

A: If SoDamHarness cannot create a backup — for example, because your disk is full or there are permission errors — the risky action is **automatically cancelled.** Nothing is deleted or overwritten if the backup could not be made. You will see an error message explaining what went wrong. This is a safety-first design: no backup, no action.

---

**Q13. How do I know the seatbelt is actually working?**

A: Run `/sodam-harness-status` — it reports the health of each component. For a quick live test: in a throwaway empty folder, ask the AI "Please delete this entire folder." If the seatbelt is working, you will immediately see a block message. See Section 3 (Quick start) for a step-by-step test procedure.

---

**Q14. Can I use SoDamHarness with other AI coding tools besides Claude Code and Codex?**

A: SoDamHarness uses Claude Code's specific plugin and hook system, so the automatic blocking and backup features will not work with other tools (Cursor, GitHub Copilot, Gemini, etc.). However, the `AGENTS.md` file included in the plugin folder — which sets safety guidelines — can be copied into any project folder, and some AI tools may read and respect it.

---

**Q15. What if I do not understand a warning message or error?**

A: Simply paste the message into Claude Code and say: "I see this message: [paste here]. What does it mean and what should I do?" The AI will explain it in plain, friendly language. You can also run `/sodam-harness-fix` — it guides you through common problems step by step.

---

**Q16. How long are my backups kept? Do they expire?**

A: Most of the time they are cleaned up **automatically**. Backups are kept for the **latest 100 files + 30 days**; anything older is pruned automatically whenever a new backup is made (up to 200 per run). If you want to reduce them further, open `~/.sodamharness/backups/`, review the backup files, and delete ones you no longer need. You can adjust the retention with `backupPolicy` (keepN · keepDays) in `~/.sodamharness/safety-rules.json`.

---

**Q17. Is my data ever sent to SoDam AI Studio or anyone else?**

A: No. No data — not your files, not your filenames, not your activity log, not anything — is ever sent to SoDam AI Studio or any external party. Everything stays on your computer. See Section 5-1 for the full data flow diagram and explanation.

---

**Q18. Can I use this commercially — for client work, at a company, or in a product I sell?**

A: Yes. The Apache License 2.0 allows commercial use. You may use it for client deliverables, internal company tools, products you sell, or services you run. You must keep the license and copyright notice, state your changes if you modify the code, and include the NOTICE file if present. See Section 11 for full details.

---

## 10-1. Update summary

<details>
<summary><b>📌 Changes by version (click to expand)</b></summary>

### 2026-07-12 — Undo bug fix + Linux/Mac backup-loss fix
- **Fixed: undo couldn't find backups**: on a machine where several projects create backups at the same time, a just-made backup could get pushed out of the "most recent 8" list, so `/sodam-harness-undo` wrongly reported "no backup found." Found during real-world use — the backup itself was always created correctly; only the lookup logic was at fault (no data was ever lost).
- **Fixed: missing backups on Linux/Mac**: overwriting an existing file via `cp`/`mv` on Linux/Mac could skip the backup step due to a POSIX-absolute-path detection bug (Windows was always correct).
- **All 117 self-tests pass** (114 existing + 3 new, zero regressions).

### 2026-07-11 — Fewer false blocks + reproducibility (safety unchanged)
- **Merely *mentioning* danger passes**: commands that only put a risky string in quotes — `echo "rm -rf /"`, `grep "rm -rf"`, `git commit -m "…rm -rf…"` — were wrongly blocked and now pass. Commands that actually *execute* the content (`bash -c`, `eval`, or `$(...)`/backtick command substitution inside double quotes) are still blocked (safety unchanged).
- **The repo proves its own tests**: self-tests are now committed and run in CI on Windows and Linux.
- **All 114 self-tests pass** (0 FAIL).

### 2026-07-07 — Security hardening (stricter only, no relaxation)
- **Install stability**: plugin manifest (`plugin.json`) paths updated to the current `./` format so install & `claude plugin validate` pass.
- **Honest block messages**: system/config-file block messages changed from a "dead-end wall" to a "door" — the AI still can't edit them, but you are told how to change them yourself (the safety stays intact).
- **4 gaps closed via adversarial audit**: `curl/wget` file uploads (private-key exfiltration), `find … -delete` (mass deletion), and `truncate -s 0` (file wipe) — previously slipped through, now blocked. The upload block had been dead due to a regex bug; it is now revived.
- **All 98 self-tests pass** (92 existing + 6 new).

### 2026-06-23 — v0.1.0 (Phase 1 + 2)
- **Phase 1 (MVP)**: safety guardrails (3-tier block / auto-backup / undo), plain-language tone, install & self-check commands.
- **Phase 2**: activity log (`/sodam-harness-log`), self-check skill, optional Codex setup.
- **Precision tuning**: normal `git push` and in-repo edits skip the prompt (backup still made), folder-scoped whitelist (12h), automatic backup retention (latest 100 + 30 days).

</details>

> Full history: **[CHANGELOG.md](./CHANGELOG.md)**.

---

## 11. License · Copyright · Commercial use (Strict notice)

> ⚖️ **This is not legal advice.** The following is guidance for safe use and distribution of this software. Final judgment is your own responsibility. Consult a qualified legal professional if needed.

### Core license facts

- **License:** Apache License 2.0
- **Copyright:** © 2026 SoDam AI Studio
- **Full license text:** See **[LICENSE](./LICENSE)** in the plugin folder.
- **Third-party notices:** See **[NOTICE](./NOTICE)** in the plugin folder.

### What you are allowed to do (Apache-2.0 allows all of these)

| Permission | Examples |
|------------|---------|
| ✅ **Use** for any purpose | Personal projects, professional work, research, education |
| ✅ **Copy** and distribute | Share with teammates, include in a product |
| ✅ **Modify** the code | Change behavior, extend features, fix bugs |
| ✅ **Fork** | Create your own version with a new name |
| ✅ **Commercial use** | Use it in work you are paid for |
| ✅ **Sell** | Include it in a product or service you sell |
| ✅ **Run as a service** | Offer it as a SaaS (Software as a Service) tool |
| ✅ **Client delivery** | Deliver a project containing SoDamHarness to a client |
| ✅ **Educational use** | Use in courses, textbooks, training materials |
| ✅ **Patent use** | Use any patents related to the code |

### Three examples of allowed commercial use

1. **Freelancer:** You use SoDamHarness while developing a website for a paying client, and you include SoDamHarness in the final project. Allowed — as long as the LICENSE and NOTICE files are included.
2. **Company internal tool:** Your company builds an internal coding assistant that bundles SoDamHarness. Allowed — with the same conditions.
3. **Selling a plugin pack:** You sell a collection of Claude Code plugins that includes SoDamHarness. Allowed — but you must keep the license notice, state what you changed, and include the NOTICE file.

### Your obligations — you MUST do these three things

When you use, modify, or distribute this software in any form:

1. **Keep the license and copyright notices.** Do not remove the `LICENSE` file or the copyright line `© 2026 SoDam AI Studio`. These must be present in any copy or distribution you make.
2. **State your changes.** If you modify the code, include a note somewhere (in a README, a CHANGES file, commit messages, etc.) describing what you changed. You do not have to make your changes public, but you must acknowledge that changes were made.
3. **Include the NOTICE file.** If a `NOTICE` file exists (it does), include it in any distribution. It may contain required third-party attributions.

### What is NOT provided

- ❌ **No warranty.** This software is provided **"as is."** If something goes wrong, SoDam AI Studio is not liable. (Details below.)
- ❌ **No trademark rights.** Using this software does not grant you any rights to use the name "SoDamHarness," "SoDam AI Studio," or any related brand in your marketing, product names, or promotions.

### Third-party trademarks

The following names are trademarks of their respective owners. SoDamHarness is **not affiliated with, endorsed by, or sponsored by** any of these companies. These names appear only to describe compatibility:

| Name(s) | Owner |
|---------|-------|
| Claude, Claude Code | Anthropic PBC |
| Codex, OpenAI | OpenAI |
| Node.js | OpenJS Foundation |

### Liability and disclaimer

- This software is provided **"as is"** with no warranty of any kind — express or implied.
- **SoDam AI Studio is not liable** for any damage, data loss, financial loss, or other harm resulting from using this software.
- **"100% accident prevention" is not guaranteed.** The seatbelt reduces common risks but cannot eliminate all risks.
- **"Legally 100% safe" is not guaranteed.** Using this software does not mean your use of AI tools complies with all laws, regulations, or third-party service agreements.
- **The user is responsible** for all outcomes of use.

### Data and backup disclaimer

- Backups and undo are **auxiliary aids** — not a professional data recovery service.
- Backups **may fail** due to disk errors, full disk, permission restrictions, or software bugs.
- **Data loss responsibility lies with the user.** Always keep your own separate backups of truly important work using a dedicated solution (Windows Backup, Time Machine, cloud storage, etc.).

### Things to check separately (outside this license)

- AI model terms of service (Anthropic's terms, OpenAI's terms, etc.)
- API pricing and usage limits for any AI service you use
- Third-party service terms for any external services you connect to
- Licenses for any fonts, images, icons, or media assets you add to your project

### External asset warning

If you add code, images, fonts, or samples from external sources to a project that includes SoDamHarness:
- **Verify the rights** for each asset before use.
- **Do not mix incompatible licenses** (such as AGPL or GPL) with Apache-2.0 in the same distributed package without understanding the legal implications.

---

## 12. Safety & limits (Honest notice)

We want to be fully honest about what SoDamHarness can and cannot do.

- This tool is an **auxiliary safety aid** that reduces common risks. **It is not perfect.**
- **New or unusual risk patterns** we have not encountered may not be caught. The danger pattern list is updated as new cases are found, but it cannot anticipate everything.
- **Verified on Windows; Mac is untested.** The code is written to be cross-platform, but Mac behavior has not been formally verified. Please report any Mac-specific issues to the developer.
- **117/117 self-tests passing** as of the current release — all known test cases pass (including adversarial bypass attempts).
- For truly important data, **do not rely on this tool alone.** Use a dedicated backup solution (Windows Backup, Time Machine, cloud storage, an external drive, etc.) in addition to SoDamHarness.
- **Think before you act.** The best safety measure is a moment of careful thought before asking the AI to do something irreversible.

---

*This document (GUIDE.en.md) and its HTML (GUIDE.en.html) have identical content. Korean: README.md / GUIDE.md*
