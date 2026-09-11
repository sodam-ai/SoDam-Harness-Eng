# SoDamHarness — An AI Seatbelt for Absolute Beginners

> **A "seatbelt" that helps prevent big accidents when you code with AI (Claude Code).**
> Even if development, AI, and computers are all new to you, **just follow along.** This single document contains everything: install, usage, architecture, security, troubleshooting, and licensing.
>
> ⚠️ **Read this first — an honest promise:** This tool is a **"seatbelt" that blocks common dangers — not a "bulletproof shield."** **"100% safe" does not exist.** Even so, wearing a seatbelt greatly reduces harm when accidents happen.

---

> 🌸 One of the seven siblings of [SoDam Family](https://github.com/sodam-ai/SoDam-Family).

## Table of Contents

- [0. What is this? (Understand in 1 minute)](#0-what-is-this-understand-in-1-minute)
- [0-1. How does it work? (Internal structure / architecture)](#0-1-how-does-it-work-internal-structure--architecture)
- [1. Prerequisites (Programs you need)](#1-prerequisites-programs-you-need)
- [1-1. How to download SoDamHarness](#1-1-how-to-download-sodamharness)
- [1-2. How to install Claude Code](#1-2-how-to-install-claude-code)
- [2. Installation (Step by step)](#2-installation-step-by-step)
- [3. Quick start — first run (3 minutes)](#3-quick-start-3-minutes)
- [4. How it works](#4-how-it-works-when-and-how-the-seatbelt-acts)
- [5. Workflow (Everyday use)](#5-workflow-everyday-use)
- [5-1. Security & data flow](#5-1-security--data-flow-how-your-data-is-protected)
- [5-2. (Optional) Using it with Codex](#5-2-optional-using-it-with-codex)
- [6. Commands](#6-commands-what-to-use-and-when)
- [7. File and document locations](#7-file-and-document-locations)
- [8. Troubleshooting](#8-troubleshooting-symptom--why--what-to-do)
- [9. Uninstall](#9-uninstall-how-to-remove-sodamharness)
- [10. FAQ](#10-faq-frequently-asked-questions)
- [10-1. Update summary](#10-1-update-summary)
- [11. License · Copyright · Commercial use](#11-license--copyright--commercial-use-strict-notice)
- [12. Safety & limits](#12-safety--limits-honest-notice)
- [13. Developer / contributor notes (testing, env vars, build)](#13-developer--contributor-notes-testing-env-vars-build)

---

## 0. What is this? (Understand in 1 minute)

### If you are brand new to all of this — start here

Imagine your computer as a big filing cabinet. Inside are folders (drawers) and files (papers inside those drawers). When you use AI to help you write code or organize your work, the AI reaches into that filing cabinet on your behalf — creating new papers, changing existing ones, and sometimes throwing papers away.

This is very helpful! But there is a risk: **AI can make mistakes.** Sometimes it might delete an important file by accident, or overwrite something you spent hours creating. Once a file is deleted, getting it back is very hard — or sometimes impossible.

**SoDamHarness** acts like a **gatekeeper** sitting between you and the AI.

- 🛑 **Very dangerous actions** (like deleting an entire folder at once) are **blocked outright** — the AI simply cannot do them.
- 💾 Before **hard-to-undo actions** (deleting, overwriting, or moving a single file), the seatbelt **automatically makes a backup copy** and then asks you **"Are you sure you want to do this?"**
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
| 🟡 **Risky** | Backup + Confirmation | A backup copy is made first, then you are asked "Really do this?" | Deleting a single file, overwriting a file, **moving** (`mv`/`move`/`Move-Item`) or **renaming** (`ren`/`rename`/`Rename-Item`) a file, an existing file getting overwritten by a copy/move, `git commit` with a secret-looking filename staged, deploying code, sending data out |
| 🔴 **Catastrophic** | Immediately blocked | Action is refused and never executed | Deleting an entire folder (`rm -rf`), deleting system folders, wiping large amounts of data at once |

### What each internal file does

| File | Nickname | Role | Analogy |
|------|----------|------|---------|
| `hooks/guard.mjs` | The Guard | Runs before every AI action. Checks the 3-tier list and decides: block, backup+ask, or allow. | A security guard at a building entrance |
| `hooks/backup.mjs` | The Backup Keeper | Makes a copy of a file before a risky action happens. | A librarian photocopying a rare book before you borrow it |
| `hooks/whitelist.mjs` | The Trust List | Remembers which actions *you* approved via `/sodam-harness:trust`, so it does not ask repeatedly. Saved to disk and lasts **12 hours** (24 hours if you picked wizard level L2) — it survives closing and reopening Claude Code. | A VIP list that stays valid for 12 hours even if the visitor leaves and comes back |
| `hooks/activity.mjs` | The Logger | After each action, writes one line: what file was touched and when. Never records content or secrets. | A front-desk logbook — "Visitor arrived, 9:03 AM" — no personal details |
| `hooks/safety-rules.json` | The Rule Book | A list of danger patterns (like `rm -rf`) that the Guard checks against. Stored separately so rules can be updated without changing code. | A printed list of banned items at airport security |
| `hooks/profile.mjs` | The Preference Card | Stores the confirmation-frequency level (L1/L2/L3) you pick via `/sodam-harness:wizard`. The Guard reads it to adjust **only how often it asks** — never the blocking or backup rules. | A guest card noting how often this particular visitor wants to be re-checked |

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
8. After restarting, type **`/sodam-harness:`** in the input area and press Tab or Enter.
   - If you see a list of commands beginning with `/sodam-harness:install`, **installation succeeded!** 🎉
   - Now run **`/sodam-harness:install`** to complete the guided setup.

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
5. Verify by typing `/sodam-harness:` in Claude Code.

> 📌 **Current status:** The GitHub option (`sodam-ai/SoDam-Harness-Eng`) is not yet active. Use the **folder path** for now. Once the project is public on GitHub, Option 1 in Method A will be the easiest.

---

## 3. Quick start (3 minutes)

1. (After installing) Reopen Claude Code fresh (type `claude` in a terminal).
2. Type **`/sodam-harness:install`** and press Enter.
   → You will see a message confirming "the seatbelt is on."
3. In a **throwaway, empty practice folder** (a folder you do not care about at all), ask the AI to do things:
   - Try: `"Please create a file called test.txt with the words hello world inside."`
     → The file is created. ✅ (Safe action — no interruption.)
   - Try: `"Please delete this entire folder."`
     → **Blocked!** 🛑 (The seatbelt works — catastrophic action refused.)
   - Try: `"Please delete the file test.txt."`
     → Backup is made automatically, then you are asked to confirm. 💾⚠️
4. Curious about what just happened?
   - **`/sodam-harness:status`** — shows whether the seatbelt is on and healthy.
   - **`/sodam-harness:log`** — shows a timeline of what the AI just did.

> ⚠️ **Always test in a practice folder first.** Never test a safety tool in a folder with real, important work.

---

## 4. How it works (When and how the seatbelt acts)

During normal use, just work with the AI **as you normally would.** The seatbelt only steps in when the AI tries to do something risky.

### Safety behavior table

| What the AI tries to do | A concrete example | The seatbelt's response |
|---|---|---|
| **Create** a file | "Create a readme.txt file" | Proceeds normally ✅ |
| **Read** a file | "Show me what's in this file" | Proceeds normally ✅ |
| Normal **edit** | "Fix this code" | Proceeds normally ✅ |
| **Create** a new folder | "Create a src folder" | Proceeds normally ✅ |
| **Delete** a file | "Delete this file" | 💾 Backup → ⚠️ Asks for confirmation |
| **Overwrite** a file | "Replace this file's entire contents" | 💾 Backup → ⚠️ Asks for confirmation |
| **Move** a file | "Move this file to another folder" (`mv`/`move`/`Move-Item`) | 💾 Backup → ⚠️ Asks for confirmation |
| **Rename** a file | "Rename this file" (`ren`/`rename`/`Rename-Item`) | 💾 Backup → ⚠️ Asks for confirmation |
| An **existing file that would be overwritten** by a copy/move | The destination folder already has a file with the same name (even if you didn't know it was there) | 💾 That file is backed up too → ⚠️ Asks for confirmation |
| **Deploy** command | "Push this to the server" | ⚠️ Asks for confirmation |
| **Upload a file externally** | `curl`/`wget`/`scp` file transfer (prevents secret-key leaks) | ⚠️ Asks for confirmation |
| **Mass delete / wipe** | `find … -delete`, `truncate -s 0` (zeroing out a file) | ⚠️ Asks for confirmation (🛑 if targeting home/system folders) |
| **Delete an entire folder** | "Delete this whole project folder" | 🛑 Blocked — never executed |
| Delete a **system folder** | Deleting Windows or Program Files | 🛑 Blocked — never executed |
| `rm -rf` and similar | Forced recursive deletion commands | 🛑 Blocked — never executed |
| Passwords / tokens / auth files | `.env`, `auth.json`, `*.pem`, etc. | 🔒 Never touched, never backed up |
| A **secret-looking file staged for commit** | Right before `git commit`, a staged file has a name that looks like `.env` or similar | ⚠️ Asks for confirmation (checks the file **name only** — content is never read) |

> 📌 **Moving a file (`mv`/`move`/`Move-Item`) is now protected exactly like deletion.** On 2026-07-27, a real-world incident revealed that moving a file could make the source vanish with no backup and no confirmation — this gap has been closed. **Renaming a file** and **an existing file getting silently overwritten by a copy/move** were the same kind of gap, closed together on 2026-08-02, and the **`git commit` secret-file check** was added new on 2026-08-02 (see Section 10-1 for details).

### Key facts

- **Backups** are automatically saved to `~/.sodamharness/backups/` on your computer (see Section 7).
- If you accidentally deleted, overwrote, or moved something, restore it with **`/sodam-harness:undo`**.
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
[Made a mistake?]  → /sodam-harness:undo to restore ↩️
[What happened?]   → /sodam-harness:log to review   📜
[Working OK?]      → /sodam-harness:status to check  🩺
[Tired of this prompt?] → /sodam-harness:trust to silence it for 12 hours
[Want fewer prompts overall?] → /sodam-harness:wizard to pick your own frequency
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
| Trust list (/trust decisions) | ✅ Stored locally — lasts 12h (24h at wizard level L2), survives restart | `~/.sodamharness/whitelist.json` |
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

To see all commands, type **`/sodam-harness:`** in the Claude Code input area and press Tab or Enter. All commands are **Claude Code only** — they do not work in Codex or other tools.

### The 7 commands in detail

---

#### `/sodam-harness:install`

**When to use:** Right after you finish installing SoDamHarness for the first time.

**What it does:** Confirms that the installation is complete and shows a getting-started guide with next steps.

**Example output:**
```
✅ SoDamHarness is installed and active.
The seatbelt is on. Here is what happens next:
- Catastrophic actions will be blocked.
- Risky actions will be backed up and confirmed with you.
- Passwords and tokens are never touched.
Type /sodam-harness:status anytime to check the seatbelt is working.
```

---

#### `/sodam-harness:status`

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

#### `/sodam-harness:fix`

**When to use:** When something is not working — commands do not appear, an action was not blocked when you expected it to be, or you see an error.

**What it does:** Asks you what symptom you are experiencing and then provides step-by-step instructions to fix it.

**Example:** If you report "commands don't appear," it responds: "Fully close Claude Code by typing /exit, then open a new terminal and type `claude`. Plugins load only at startup. If commands still don't appear after restarting, follow these reinstallation steps..."

---

#### `/sodam-harness:undo`

**When to use:** When you (or the AI) accidentally deleted, overwrote, or moved a file and you want it back.

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
>
> 🔁 **Multiple close-in-time candidates?** When several backups fall within the same minute, the one **closest to the moment of deletion** is shown first — this prevents accidentally restoring to an earlier (pre-edit) state instead of the actual pre-deletion state.

---

#### `/sodam-harness:trust`

**When to use:** When SoDamHarness keeps asking you about the same type of action repeatedly and you want it to stop asking.

**What it does:** Adds the current action type and folder to a trust list. SoDamHarness will stop asking for that specific combination for **12 hours** — and this is saved to disk, so it survives even if you close Claude Code and start a brand-new session.

**What still applies even after /trust:**
- 🛑 Hard blocks (catastrophic actions) **still apply** — those cannot be trusted away.
- 💾 Backups **still happen** automatically.
- The trust decision **automatically expires after 12 hours** (or 24 hours if you picked wizard level L2) — it does *not* expire just because you closed the window.

**Example:** The AI keeps asking "Really delete this auto-generated test log?" You know it is safe and run `/sodam-harness:trust`. It will stop asking for that specific action in that folder for the next 12 hours, even across separate conversations.

---

#### `/sodam-harness:wizard`

**When to use:** When confirmation prompts ("Really do this?") appear too often, or you want to change your current setting.

**What it does:** Asks you one question — "How often would you like confirmation prompts to appear?" — with three choices, then saves your answer to `~/.sodamharness/profile.json`.

| Choice | Level | What actually happens |
|---|---|---|
| A) Always confirm | L1 (default) | **100% identical** to current behavior — nothing changes |
| B) Don't re-ask for repeated actions in the same folder for a day | L2 | Folder-trust (`/sodam-harness:trust`) duration extends from 12 hours to **24 hours** |
| C) Skip confirmation for undoable (backed-up) actions as much as possible | L3 | Risky actions whose **backup actually succeeded** skip the prompt (the backup still happens) |

> 🔒 **What never changes, no matter which option you pick (the safety floor):** Catastrophic actions — deleting whole folders, system deletion, `rm -rf` — are **always blocked**. Secret files (`.env`, certificates, etc.) **always prompt again** (they cannot be backed up, so they cannot be undone). A failed backup **always blocks** the action. This wizard only adjusts *how often* the prompt appears — it cannot weaken the safety mechanism itself.

**Example output:**
```
How often would you like confirmation prompts to appear?
A) Always confirm (current default)
B) Don't re-ask for repeated actions in the same folder for a day
C) Skip confirmation for undoable (backed-up) actions as much as possible
```
Success looks like: `{"ok":true,"autonomy_level":"L2"}`.

> 💡 Run `/sodam-harness:wizard` again anytime to change your setting.

---

#### `/sodam-harness:log`

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
| `sodam-harness-self-check` | Before the AI says "Done!", it verifies the task actually worked — by running the code, checking the file, etc. — rather than just claiming it is done. | Activates automatically — it is not a slash command. Especially useful for important tasks. |

---

## 7. File and document locations

### Where are my backup files?

Backups are stored in a hidden folder inside your home directory:

- **Windows:** `C:\Users\YourName\.sodamharness\backups\`
  *(Replace `YourName` with your actual Windows username.)*
- **Mac:** `/Users/YourName/.sodamharness/backups/`
  *(Replace `YourName` with your actual Mac username.)*

Two other files live next to the `backups\` folder in the same `.sodamharness\` directory: `activity.log` (see below) and `profile.json` (the confirmation-frequency level you picked with `/sodam-harness:wizard` — L1/L2/L3).

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

- View it inside Claude Code with `/sodam-harness:log`
- Or open it directly with any text editor
- Contains only: filename + timestamp. No file contents. No secrets.

### Plugin documents (project root folder)

These files are in the SoDamHarness plugin folder:

| File | Purpose | Intended reader |
|------|---------|------------------|
| `README.md` / `README.en.md` | **This document** — the full manual: install, use, architecture, security, troubleshooting, licensing (Korean is primary; this is the English version) | Everyone |
| `TESTING.md` / `TESTING.en.md` | How to test and verify the installation (Korean / English) | Beta testers |
| `DEVELOPMENT.md` | Developer documentation — internal design and contribution notes | Contributors/developers |
| `CONTRIBUTING.md` | Contribution guide | Contributors |
| `AGENTS.md` | Optional file to copy into other AI tools (Codex, Cursor, Gemini, etc.) for the same plain-language tone | Codex/other-tool users |
| `BETA.md` / `BETA_CHECKLIST.md` | External beta-tester recruitment/verification documents — the repo is PUBLIC, but whether to actually launch external beta is under separate review | (not applicable right now) |
| `CHANGELOG.md` | The full, detailed change history (with dates, reasons, and evidence) | Developers/curious users |
| `codex/CODEX_SETUP.md` | Detailed Codex setup guide | Codex users |
| `codex/config.toml.example` | Template for Codex safety settings | Codex users |
| `LICENSE` | Full Apache License 2.0 text | Everyone |
| `NOTICE` | Third-party notices and attributions | Everyone |

**HTML version** with identical content: `README.html` · `README.en.html`

---

## 8. Troubleshooting (Symptom → Why → What to do)

### Quick reference table

| Symptom | Why it happens | What to do right now |
|---------|----------------|----------------------|
| `/sodam-harness:...` commands **don't appear** | Plugin not loaded — most likely not restarted after install | **Fully close Claude Code** (type `/exit`), open a new terminal, type `claude`. If still missing, return to Section 2 and reinstall. |
| A risky action **was not stopped or blocked** | Plugin may have turned off, or the risk pattern is not yet known | Restart Claude Code → run `/sodam-harness:status` to diagnose. |
| **Too many confirmations** — it asks too often | Safety-first default behavior | For a repeated safe action, run `/sodam-harness:trust` to silence it this session, or use `/sodam-harness:wizard` to lower the overall frequency. |
| **"Node.js not found"** or **"node is not recognized"** | Node.js is not installed or not on the PATH | Install **LTS** from **https://nodejs.org**, close and reopen the terminal (Section 1). |
| **SmartScreen warning** (Windows) | Windows does not recognize the program's publisher | If from the official source, click **"More info"** then **"Run anyway"**. If unsure of the source, do not run. |
| **Gatekeeper warning** (Mac) | Mac security is blocking an unrecognized developer | If from the official source, go to System Preferences → Security & Privacy → click **"Open Anyway"**. |
| **Accidentally deleted a file** | — | Run **`/sodam-harness:undo`** and pick the backup from the list. |
| **Accidentally moved a file to the wrong place** | Moves are backed up the same way deletions are | Run **`/sodam-harness:undo`** and pick the backup from the list. |
| **Backup folder error** ("permission denied" or "disk full") | Disk is full or the folder has restricted permissions | Free up disk space and retry. If backup fails, the risky action is **automatically cancelled** — nothing is lost. |
| **Garbled text / strange characters** in terminal | Character encoding issue | This is uncommon with Node.js. If it persists, run `/sodam-harness:fix`. |
| **Explanations are too technical** | Beginner-tone skill may not have activated | Say **"Explain this in simple, plain language"**. |
| **Old command names appear** (like `/install` without the prefix) | Leftover data from a previous or different version | Fully restart Claude Code. If they persist, uninstall (Section 9) and reinstall (Section 2). |
| **Duplicate commands** in the list | Two plugin versions may be installed | Restart → if duplicates persist, uninstall and reinstall. |
| **"claude" command not recognized** in terminal | Claude Code is not installed or not on the PATH | Install Claude Code (Section 1-2). Restart terminal after. |
| **Installation command failed** | Many possible causes | Copy the exact error message and run `/sodam-harness:fix`, or start over from Section 2. |
| **Wizard settings seem to misbehave** | `profile.json` is corrupted or has an invalid value | It automatically falls back to the safest default (L1, "always confirm"). Run `/sodam-harness:wizard` again to reconfigure. |

### Extended troubleshooting tips

**"The backup folder doesn't exist yet"**
This is normal. The folder `~/.sodamharness/backups/` is created automatically the first time a backup is needed. You do not need to create it manually.

**"I can't find my home folder"**
- **Windows:** Open File Explorer and type `%USERPROFILE%` in the address bar at the top, then press Enter. This takes you directly to your home folder.
- **Mac:** In Finder, press **⌘ Command + Shift + H** to jump to your home folder.

**"The AI completely ignored the seatbelt"**
This usually means Claude Code was not fully restarted after installation, or the plugin is installed but not active. Run `/sodam-harness:status`. If it shows errors, reinstall following Section 2.

**"I see an error message I don't understand"**
Do not panic. Paste the error into Claude Code and say: "I see this error: [paste it here]. What does it mean and what should I do?" The AI will explain it clearly.

> For deeper diagnosis of any issue, type **`/sodam-harness:fix`** inside Claude Code.

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

A: SoDamHarness blocks many common dangerous actions and creates backups before risky ones. However, it **cannot block 100% of all possible risks.** New or unusual danger patterns that we have not anticipated may not be caught. Think of it exactly like a seatbelt in a car: it greatly reduces harm but does not make driving 100% risk-free. For truly important work, always keep **your own separate backup** in addition to using this tool. No software can honestly promise "100% safe."

---

**Q2. Does it read or see my passwords or private files?**

A: No. SoDamHarness explicitly excludes secret file types (`.env`, `auth.json`, token files, certificates, SSH keys, etc.) from all operations. It does not read these files, does not back them up, does not include their names in activity logs, and does not send them anywhere. The activity log contains only non-secret filenames and timestamps.

---

**Q3. Do I need the internet for this to work after installing?**

A: No. You need the internet only **once** — when you first install SoDamHarness (to download the files). After installation, **all safety features run completely offline on your computer.** No internet connection is required for blocking, backup, confirmation prompts, logging, or any other feature.

---

**Q4. Is this a virus? Is it safe to install?**

A: SoDamHarness is not a virus. It is open-source software (Apache License 2.0) — every line of code is publicly readable. It does not send data anywhere, does not access the internet after installation, and does not modify system files. If you received it from the official source (the SoDam AI Studio GitHub page or directly from the developer), it is safe to install. As with any software, if you received it from an unknown or suspicious source, be cautious. Checking the open-source code yourself (or asking an IT professional to check it) is the safest approach.

---

**Q5. I accidentally deleted an important file. What do I do?**

A: Run `/sodam-harness:undo` — a list of recent backups will appear. Pick the number you want to restore. Note that **backups are made automatically right before the risky action**, so if a file was deleted before SoDamHarness was installed, or if the backup itself failed, it cannot be restored this way. Always keep a separate backup of truly important files.

---

**Q6. I accidentally deleted an entire folder. Can I recover it?**

A: Unfortunately, no — entire folder deletion is not backed up because folders can contain hundreds of files. Instead, SoDamHarness **blocks** folder deletion entirely, so it should not have happened if the plugin is active. Individual files (which are backed up before deletion) can be restored with `/sodam-harness:undo`. If a folder was deleted anyway, this suggests the plugin was not active at that moment — run `/sodam-harness:status` to diagnose.

---

**Q7. Why do I need Node.js? I don't code at all.**

A: SoDamHarness's safety features (the "guard," backups, and logging) are built with Node.js — it is the engine that powers this tool. You do not need to know how to code at all; you only need to install Node.js once, and after that you never have to think about it again. It is completely free and takes about 3–5 minutes to install.

---

**Q8. Does it slow down my computer or drain the battery?**

A: No, not noticeably. SoDamHarness's hooks run only when the AI takes an action — they do not run continuously in the background. Each check takes a fraction of a second, and CPU/memory usage is minimal. You will not notice any change in your computer's speed or battery life.

---

**Q9. Does it work on Mac?**

A: SoDamHarness is written with cross-platform code and is designed to work on Mac. However, **it has only been formally verified on Windows** as of this writing. Mac is untested. If you use it on Mac and encounter any issues, please report them to the developer.

---

**Q10. Does it provide the same protection in Codex?**

A: No. The block / backup / undo features are **Claude Code only.** They will not activate in Codex. In Codex, you rely on Codex's own built-in safety features (the approval prompt and sandbox environment). See Section 5-2 for how to improve safety in Codex using the included `AGENTS.md` file.

---

**Q11. What is "auto-approve mode" and should I use it?**

A: Claude Code has a mode (sometimes called "YOLO mode" or "auto-approve mode") where it automatically approves all AI actions without showing you any confirmation prompts. If this mode is on, the "Really do this?" prompts from SoDamHarness will be skipped. **Backups still happen automatically** even in auto-approve mode — that cannot be turned off. Hard blocks (catastrophic actions) also still apply. We recommend **not** using auto-approve mode unless you are an experienced developer who fully understands the risks.

---

**Q12. What happens if a backup fails?**

A: If SoDamHarness cannot create a backup — for example, because your disk is full or there are permission errors — the risky action is **automatically cancelled.** Nothing is deleted or overwritten if the backup could not be made. You will see an error message explaining what went wrong. This is a safety-first design: no backup, no action.

---

**Q13. How do I know the seatbelt is actually working?**

A: Run `/sodam-harness:status` — it reports the health of each component. For a quick live test: in a throwaway empty folder, ask the AI "Please delete this entire folder." If the seatbelt is working, you will immediately see a block message. See Section 3 (Quick start) for a step-by-step test procedure.

---

**Q14. Can I use SoDamHarness without Claude Code, or with other AI coding tools?**

A: The automatic blocking, backup, and undo features rely directly on Claude Code's plugin and hook system, so they do not work without Claude Code, and they do not activate in other tools (Cursor, GitHub Copilot, Gemini, etc.) either. However, the `AGENTS.md` file included in the plugin folder — which sets a plain-language tone — can be copied into any project folder, and some AI tools may read and respect it. That said, this is only a "tone guideline," not the blocking/backup safety feature.

---

**Q15. What if I do not understand a warning message or error?**

A: Simply paste the message into Claude Code and say: "I see this message: [paste here]. What does it mean and what should I do?" The AI will explain it in plain, friendly language. You can also run `/sodam-harness:fix` — it guides you through common problems step by step.

---

**Q16. How long are my backups kept? Do they expire?**

A: Most of the time they are cleaned up **automatically**. Backups are kept for the **latest 100 files + 30 days**; anything older is pruned automatically whenever a new backup is made (up to 200 per run). If you want to reduce them further, open `~/.sodamharness/backups/`, review the backup files, and delete ones you no longer need. You can adjust the retention with `backupPolicy` (keepN · keepDays) in `~/.sodamharness/safety-rules.json`.

---

**Q17. Is my data ever sent to SoDam AI Studio or anyone else?**

A: No. No data — not your files, not your filenames, not your activity log, not anything — is ever sent to SoDam AI Studio or any external party. Everything stays on your computer. See Section 5-1 for the full data flow diagram and explanation.

---

**Q18. Can I use this commercially — for client work, at a company, or in a product I sell? Can I modify and redistribute or sell it?**

A: Yes, to all of the above. The Apache License 2.0 allows commercial use, modification, redistribution, and sale. You may use it for client deliverables, internal company tools, products you sell, or services you run. You must keep the license and copyright notice, state your changes if you modify the code, and include the NOTICE file if present. See Section 11 and the `LICENSE` file for full details.

---

**Q19. The seatbelt asks me too often. How do I make it ask less?**

A: Use `/sodam-harness:trust` to register "don't ask me again for this kind of action in this folder" — it lasts 12 hours per folder + action type, and it survives starting a new conversation (session). If you want to more fundamentally change how often prompts appear, try `/sodam-harness:wizard`. Turning on Claude Code's auto-approve (YOLO) mode also skips confirmation prompts (backups still happen).

---

**Q20. If I use `/sodam-harness:trust`, does that also remove the block on catastrophic actions?**

A: No. `trust` only skips the **"Really do this?"** confirmation question. Hard blocks (🛑) and automatic backups (💾) both remain fully in effect even after using `trust`.

---

**Q21. If I use `/sodam-harness:wizard` to reduce prompts, does that make it less safe?**

A: No. The wizard only adjusts **how often** the "Really do this?" prompt appears. Blocking of catastrophic actions (whole-folder deletion, system deletion) stays on at every level, secret files (passwords, tokens) always prompt again, and a failed backup always blocks the action. Fewer prompts does not mean fewer safeguards — the underlying protections are unchanged.

---

**Q22. What does "210 self-tests passing" mean?**

A: During development, SoDamHarness ran 210 test cases (blocking dangerous actions, backups, undo, edge cases, adversarial bypass attempts, file move/rename protection, `git commit` secret-file checks, and the wizard's L1/L2/L3 behavior) and all of them passed. It confirms "the core features work as intended" — not "100% perfect in every situation."

---

## 10-1. Update summary

<details>
<summary><b>📌 Changes by version (click to expand)</b></summary>

### 2026-09-11 — Reduced a risk where restore could pick the wrong nearby backup
- **What**: When several backup candidates fall within the same minute, restore could pick an earlier (pre-edit) backup instead of the one right before deletion. This was actually observed once during live use (caused by the guard's duplicate hook registration creating duplicate backups).
- **Why**: The `/sodam-harness:undo` procedure had no rule for which candidate to prefer when several are close in time.
- **Fix**: The procedure now picks the latest (closest to the moment of deletion) candidate when several are close together. The risk-judgment logic itself was not touched.
- **All 210 self-tests still pass** (this change is an AI-instruction file, not executable code, so it isn't covered by the automated suite — zero regressions were separately reconfirmed).

### 2026-09-01 — Fixed: a restore report could silently drop files whose backup itself was missing
- **What**: When restoring several files at once, any file whose backup copy itself no longer existed (e.g., the backup folder was later cleaned up) used to vanish from the final report with no trace at all. Seeing "3 files restored" could make you think everything was recovered when it wasn't.
- **Why**: The preview screen shown before restoring already warned about this case correctly — only the final report after running the restore was missing it. This conflicted with this product's core promise of "only report what was actually confirmed," so it was treated as high priority.
- **Fix**: These files are now collected into a separate "skipped" list and reported honestly. The risk-judgment logic (what gets blocked) was not touched at all.
- **All 210 self-tests pass** (204 existing + 6 new, zero regressions). Separately re-verified by running "restored + overwritten + failed + skipped" all at once in a single restore call, confirming none of the four get mixed up with each other.

### 2026-08-31 — Fixed a false-block defect that stopped safe commands + closed a follow-up gap found before shipping it
- **Fixed: a quoted `>` mistaken for a real redirect**: When inspecting a command, the safety belt could mistake a `>` character inside quotes (e.g., a comparison like `1>0` in program code) for an actual "save to file" redirect — causing safe commands that merely read or mention a sensitive location to be wrongly blocked.
- **Also fixed a follow-up gap found while verifying that fix, before releasing it**: for a malformed command with an unterminated quote, the same fix could fail to catch a genuinely dangerous redirect (one that really does overwrite a sensitive file) hiding after that point. Found during pre-release testing and closed immediately.
- **All 204 self-tests pass** (zero regressions). Separately re-confirmed with a control case that a real dangerous redirect (one that actually overwrites a sensitive location) is still blocked after this fix.

### 2026-08-20~21 — Blocked 18 adversarial bypass paths + fixed an undo-honesty defect (stricter only, no relaxation)
- **Closed several PowerShell bypass paths**: found and blocked `Clear-Content`/`Clear-Item` (short alias `clc`, silently empties a file's contents), `New-Item -Force` (alias `ni -Force`, silently overwrites an existing file), and the short aliases of `Move-Item`/`Copy-Item` (`mi`/`cpi`, which could move/copy a source file with no backup) — all of which had been slipping through undetected.
- **Newly blocked whole-folder/drive destruction commands**: `robocopy /MIR`/`/PURGE` (mirrors a folder and wipes destination content), `Format-Volume`/`Clear-Disk`/`Remove-Partition`/`Initialize-Disk` (destroy a drive/partition), `.NET`'s `[System.IO.File]::WriteAllText`/`WriteAllBytes` (directly overwrites file content), and the legacy bulk-copy tool `xcopy` are now watched. Drive/partition destruction is classified as **catastrophic (blocked immediately, unrecoverable)**.
- **Closed the most fundamental blind spot — "if we can't read what a command does, treat it as dangerous"**: execution methods that make it impossible for the safety belt to read the actual command content — `powershell -EncodedCommand` (hides the command as base64), `Invoke-Expression`/`iex`, and bash `eval` — are now treated as dangerous simply because their intent can't be inspected. This isn't a fix for one specific command; it closes the whole class of "evade inspection" tricks.
- **Fixed a defect where undo reported a partial failure as a total failure**: when restoring several files at once, if even one file's restore failed (e.g., its parent folder had since been deleted), the tool used to wrongly report "0 files restored" — **discarding the files that had already been successfully restored**. It now counts successes accurately and honestly lists only the failed file(s) as "couldn't restore this one." No files were ever actually lost by this bug — it was a reporting-accuracy defect — but because it directly touches this product's core promise (undo), it was treated as a high-priority fix.
- **Fixed a path-resolution defect in the guard (guard.mjs)**: for paths starting with `~` (home folder), deleting or overwriting a file correctly triggered the confirmation prompt (⚠️), but the **actual backup created was 0 files — a half-working protection**. This is now fixed so a real backup is made whenever the confirmation prompt appears.
- **All 197 self-tests pass** (zero regressions). The undo-defect regression test reproduces a real failure — it actually creates files, backs them up, and deletes one file's entire parent folder — rather than simulating one.

### 2026-08-02 — New: automatic secret-file check right before `git commit` (stricter only, no relaxation)
- **What**: If a file with a name that looks like it holds a password or key (like `.env`) is about to be included in a `git commit`, SoDamHarness now notices automatically and asks "Really commit this?" first. It checks the file **name only** — it never reads the contents.
- **Why**: This is exactly the kind of accident this tool cares about most (password/token leaks — see Section 5-1), and until now there was no check at all at the `git add` / `git commit` stage — a real blind spot.
- **All 190 self-tests pass** (zero regressions).

### 2026-08-02 — Rename protection + protection for existing files overwritten by copy/move (stricter only, no relaxation)
- **Renaming is now protected exactly like deletion**: Using `ren`/`rename`/PowerShell `Rename-Item` to rename a file could previously make the original vanish with no backup and no confirmation. This was discovered while re-reviewing the exact same category of risk that "moving" (`mv`) had (fixed on 2026-07-27).
- **Existing files silently overwritten by copy/move are now protected too**: When moving or copying a file, if the destination folder already contained a file with the same name (even one you didn't know was there), it could disappear without a backup. This is now fixed for `mv`/`cp`/PowerShell `Move-Item`/`Copy-Item` alike.
- **All 178 self-tests pass** (zero regressions).

### 2026-07-27 — Protect file moves (mv) from silent data loss + false-block fixes + performance/messaging improvements (stricter only, no relaxation)
- **Most important — fixed a gap where moving a file could make it vanish without backup**: When moving a file into an existing folder with `mv`/`move`/PowerShell `Move-Item`, the source file could pass through with **no backup and no confirmation prompt at all** — a more dangerous bypass than `rm` (delete), which was already backed up and confirmed. Discovered after a real data-loss incident during live use.
- **Fixed a false block in compound commands**: commands like `ls folder && rm file` that merely *mention* an existing folder (without deleting it) were sometimes wrongly treated as "delete the whole folder" and completely blocked.
- **Faster backup cleanup**: on machines with a very large number of accumulated backups, cleanup now runs at most once per hour instead of on every risky action (backup creation itself is unaffected).
- **Consistent block messages**: the message shown when a risky terminal (Bash/PowerShell) command touches a sensitive location now matches the file-edit version — explaining why it was blocked and how to proceed if truly needed.
- **All 162 self-tests pass** (142 existing + 20 new, zero regressions).

### 2026-07-15 — Custom wizard: `/sodam-harness:wizard`
- **New command to choose how often confirmation prompts appear**: answer one question (A/B/C) and `hooks/profile.mjs` saves your choice to `~/.sodamharness/profile.json`; `guard.mjs` reads it to adjust **only how often it asks** (see Section 6 above).
  - L1 (default, this is the behavior if you never run the wizard): 100% identical to before.
  - L2: folder-trust (`/sodam-harness:trust`) duration extends from 12 hours to 24 hours.
  - L3: risky actions whose backup fully succeeded (not a secret file) skip the confirmation prompt.
- **Unchanged regardless of level**: catastrophic commands, whole-folder/recursive deletion, and sensitive paths are still always blocked. Secret files (`.env`, etc.) still always prompt. A failed backup still always blocks.
- **All 129 self-tests pass** (117 existing + 12 new, zero regressions).

### 2026-07-12 — Undo bug fix + Linux/Mac backup-loss fix
- **Fixed: undo couldn't find backups**: on a machine where several projects create backups at the same time, a just-made backup could get pushed out of the "most recent 8" list, so `/sodam-harness:undo` wrongly reported "no backup found." Found during real-world use — the backup itself was always created correctly; only the lookup logic was at fault (no data was ever lost).
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
- **Phase 2**: activity log (`/sodam-harness:log`), self-check skill, optional Codex setup.
- **Precision tuning**: normal `git push` and in-repo edits skip the prompt (backup still made), folder-scoped whitelist (12h), automatic backup retention (latest 100 + 30 days).

</details>

> Full history (with dates, reasons, and evidence): **[CHANGELOG.md](./CHANGELOG.md)**.

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
| Cursor | Anysphere Inc. |
| Gemini | Google LLC |

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

### Current distribution status (factual notice)

- This repository is currently operated as a **private GitHub repo, for the developer's own personal use only.** The license terms above always apply to the code itself, but it has **not yet been publicly released.**
- The external beta-tester recruitment process described in `BETA.md`/`BETA_CHECKLIST.md` is **currently inactive**; those documents are kept in the repository only in case the decision to go public is made later.

---

## 12. Safety & limits (Honest notice)

We want to be fully honest about what SoDamHarness can and cannot do.

- This tool is an **auxiliary safety aid** that reduces common risks. **It is not perfect.**
- **New or unusual risk patterns** we have not encountered may not be caught. The danger pattern list is updated as new cases are found, but it cannot anticipate everything.
- **Verified on Windows; Mac is untested.** The code is written to be cross-platform, but Mac behavior has not been formally verified. Please report any Mac-specific issues to the developer.
- Backups are file-by-file. Whole folders are never backed up as a unit (which is exactly why whole-folder deletion is blocked instead).
- A full disk or missing permissions can cause a backup to fail.
- **210/210 self-tests passing** as of the current release — all known test cases pass (including adversarial bypass attempts, file move/rename protection, and the custom wizard's L1/L2/L3 levels). This confirms the core features work as intended — it does not mean "100% perfect in every situation."
- For truly important data, **do not rely on this tool alone.** Use a dedicated backup solution (Windows Backup, Time Machine, cloud storage, an external drive, etc.) in addition to SoDamHarness.
- **Think before you act.** The best safety measure is a moment of careful thought before asking the AI to do something irreversible.

---

## 13. Developer / contributor notes (testing, env vars, build)

> This section is not needed if you're just using the tool as-is. It's only for people who want to open or modify the code.

### Running the tests
From the repository folder, run:
```
node hooks/_selftest.mjs
```
On success the last line reads something like `결과: 210 PASS / 0 FAIL` (the number may differ by version — "결과" means "result"). If even one test fails, it means a regression was introduced into the safety logic — do not ship the change.

### Build
**There is no separate build step.** This is plain Node.js, so there's no compile/bundle stage — edits take effect immediately (confirmed directly: `package.json` has no build script defined).

### Environment variables (testing/isolation only — regular users never need to set these)
These exist purely so the test suite can run against isolated, temporary files instead of touching your real data. Under normal use, none of these should be set.

| Variable | Purpose |
|---|---|
| `SODAM_NOW_MS` | Fakes "the current time" with a fixed value during tests |
| `SODAM_BACKUPS_ROOT` | Redirects the backup folder to a temporary test location |
| `SODAM_ACTIVITY_FILE` | Redirects the activity log file to a test location |
| `SODAM_RULES_FILE` | Points to a specific `safety-rules.json` (testing / advanced users) |
| `SODAM_PROFILE_FILE` | Redirects the autonomy-level profile file to a test location |
| `SODAM_WHITELIST_FILE` / `SODAM_PENDING_FILE` | Redirects session-whitelist-related files to test locations |
| `SODAM_CLEANUP_THROTTLE_MS` | Speeds up the old-backup cleanup interval for tests |

### How updates are released
This repository has no separate CI/CD pipeline. New versions go out as **commit → bump the version in `plugin.json`/`package.json` → push to GitHub**. If you already have it installed, get the latest version with (see [2. Installation](#2-installation-step-by-step) for full install instructions):
```
claude plugin update sodam-harness@sodamharness-marketplace
```

---

*Korean: [README.md](./README.md) · Same content as HTML: [README.en.html](./README.en.html)*
