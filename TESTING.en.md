# SoDamHarness Testing Guide (Beta Verification) 🧪

> 한국어: [TESTING.md](./TESTING.md) (Korean is the primary, authoritative version) · Manual: [README.en.md](./README.en.md)
> Follow this to verify the **safety belt actually works**. No coding knowledge needed.
> ⚠️ Always test in a **throwaway empty practice folder** (you will intentionally delete files).

---

## 0. Prerequisites
- **Node.js (18+)** — if missing, install **LTS** from https://nodejs.org.
- **Claude Code** installed and logged in.
- After installing SoDamHarness, **close and reopen Claude Code once** (the belt arms on start).

## 1. Install check
Type: `/sodam-harness-install`
- ✅ Pass: shows "the safety belt is on" + your Node.js version.

## 2. Make practice materials (first pass = "safe actions aren't blocked")
Create an empty throwaway folder, open Claude Code inside it, then type:
```
Make a memo.txt file here and an empty subfolder called 'trash-folder'.
```
- ✅ Pass: created without being blocked.

## 3. Five core checks (confirm each "pass signal")
| # | What to say | Pass signal |
|---|---|---|
| ① Folder delete | "Delete the whole 'trash-folder'." | **Blocked with "Deleting a whole folder is blocked"** → folder survives |
| ② File delete | "Delete memo.txt." | **Auto-backed-up** right before deletion (see ⚠️ below) |
| ③ Undo | `/sodam-harness-undo` | Restore by **picking from the backup list** (e.g. "just now / 3 min ago") → memo.txt reappears |
| ④ Safe action | "Make newfile.txt." | Created without being blocked (no over-blocking) |
| ⑤ File overwrite | "Replace memo.txt contents with 'B'." | **Auto-backed-up** before the overwrite + ask (see ⚠️ below) → `/sodam-harness-undo` restores the **previous contents** |

> ⚠️ In **auto-approve mode**, ② (file delete) and ⑤ (overwrite) may run without asking. That's normal — it's **protected by backup + undo (③)**. To always see the prompt, use Claude Code's **default mode**.

## 4. Per-environment checks
- Repeat steps 0–3 on **Windows and Mac** each.
- On **another PC (fresh install)**, install via the marketplace → repeat 0–3 (checks the first-time install flow).

## 5. Beginner beta (most important)
- Give **1–3 beginners** only the **`README.md`** and watch:
  do they reach install → "make a file" → "delete it" → `/sodam-harness-undo` **on their own?**
- **Where they get stuck = the doc fix list** (note exactly what confused them).

## 6. Record results (please log like this)
| Item | Pass/Fail | On-screen text |
|---|---|---|
| 1 Install | | |
| 3-① Folder block | | |
| 3-② File backup | | |
| 3-③ Undo | | |
| 3-④ Safe action | | |
| 3-⑤ Overwrite backup | | |
- **On failure**: send the on-screen text (or a screenshot) to the maker → it can be fixed right away.

## 7. Honest limits
- "100% accident prevention" is not guaranteed (only common risks are blocked; reference use, user's responsibility).
- A folder can't be backed up wholesale, so **folder deletion itself is blocked** (even empty folders — intended; delete via File Explorer).

---
*SoDamHarness — SoDam AI Studio · Phase 1 (MVP) beta verification guide*
