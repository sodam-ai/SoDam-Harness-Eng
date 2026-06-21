// SoDamHarness — guard.mjs
// PreToolUse 안전 가드레일 훅 (Node.js, Windows·Mac 공용)
// 입력(stdin): { tool_name, tool_input, cwd, ... }
// 출력(stdout): { hookSpecificOutput: { hookEventName, permissionDecision, permissionDecisionReason } }
//   - permissionDecision: "deny"(AI가 못 뚫는 차단) | "ask"(사용자 확인) | 출력 없음(=기본 흐름)
//
// 불변 규칙(보안 1순위):
//   · 명령/경로는 "검사"만 한다 — 절대 실행하거나 eval 하지 않는다.
//   · 토큰·인증파일·비밀값에 접근/저장하지 않는다.
//   · 외부로 아무것도 전송하지 않는다.  · 경로는 os.homedir() 기준(하드코딩 금지).
//
// 설계(2026-06-20 실측 반영): "켠 폴더(cwd) 밖이면 무조건 차단"은 과잉 차단이라 폐기.
//   대신 ① 진짜 민감 위치(시스템 폴더·홈 루트·드라이브 루트·자격증명 폴더)면 deny,
//        ② 위험/치명 명령이면 deny 또는 백업+ask, ③ 기존 파일 덮어쓰기면 백업+ask,
//        ④ 새 파일 생성·안전 작업은 통과.  (어느 폴더에서 일하든 동작)
//
// 정직한 한계: 위험 패턴은 "초안"이며 모든 위험을 100% 잡지 못한다(01_PRD §8.8).

import { readFileSync, existsSync, lstatSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { backupPaths } from "./backup.mjs";

const WIN = process.platform === "win32";

// ── stdin 전체 읽기 ──
function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

// ── 결정 출력 후 종료 ──
function decide(decision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}
function passThrough() {
  process.exit(0); // 출력 없음 = 기본 권한 흐름(우리가 판단 안 함)
}

// ── Bash 명령 토큰화 (따옴표 제거) ──
function bashTokens(cmd) {
  return cmd
    .split(/\s+/)
    .map((t) => t.replace(/^["']+|["']+$/g, ""))
    .filter(Boolean);
}

// ── 셸 명령에서 경로 후보(백업/민감 검사용) ──
const SHELL_OPS = new Set(["|", "||", "&&", ";", "&", ">", ">>", "<", "2>", "2>>"]);
function commandPaths(cmd) {
  const out = [];
  const toks = bashTokens(cmd);
  for (let i = 0; i < toks.length; i++) {
    if (i === 0) continue; // 명령어 자체 제외
    // git -C <경로> / -c <key=val> 의 '값'은 삭제 대상이 아니라 옵션 인자 → 경로 후보에서 제외(실측 2026-06-21)
    const prevTok = (toks[i - 1] || "").replace(/^["']+|["']+$/g, "");
    if (/^-[Cc]$/.test(prevTok)) continue;
    // 경로에 셸 구분기호(;,&,|)·따옴표가 붙어오면 정리 (예: "x.txt"; → x.txt) — 백업 누락 방지(실측 2026-06-21)
    const t = toks[i].replace(/^["';|&]+|["';|&]+$/g, "");
    if (!t) continue;
    if (t.startsWith("-")) continue; // 플래그 제외
    if (t.startsWith("/")) {
      // posix 절대경로는 경로, windows 플래그(/s 등)는 제외
      if (!WIN) out.push(t);
      else if (/[\\/].+/.test(t.slice(1))) out.push(t); // /foo/bar 형태만
      continue;
    }
    if (SHELL_OPS.has(t)) continue;
    out.push(t);
  }
  return out;
}

// ── 파일 쓰기 계열 도구의 대상 경로 ──
function writeTargets(ti) {
  const out = [];
  for (const key of ["file_path", "path", "notebook_path"]) {
    if (typeof ti[key] === "string" && ti[key]) out.push(ti[key]);
  }
  if (Array.isArray(ti.edits)) {
    for (const e of ti.edits) if (e && typeof e.file_path === "string") out.push(e.file_path);
  }
  return out;
}

// ── 경로 정규화 (~ 확장 + Git Bash 드라이브 마운트 /c/ → c:\ 처리) ──
function resolveLoose(cwd, p) {
  let s = String(p);
  if (s.startsWith("~")) s = homedir() + s.slice(1);
  if (WIN) {
    const m = s.match(/^\/([a-zA-Z])\/(.*)$/); // /c/Windows → c:\Windows
    if (m) s = `${m[1]}:\\${m[2]}`;
  }
  try {
    return path.resolve(cwd, s);
  } catch {
    return s;
  }
}

// ── 민감 위치 판정 (여기를 건드리면 deny) ──
function toComparable(p) {
  return WIN ? p.replace(/\//g, "\\").toLowerCase() : p;
}
function isSensitive(absInput) {
  let abs;
  try {
    // 이미 resolveLoose를 거친 절대경로를 받는 게 정상이나, 안전하게 한 번 더
    abs = path.isAbsolute(absInput) ? absInput : path.resolve(absInput);
  } catch {
    return true; // 판정 불가 → 안전하게 민감으로 간주
  }
  const a = toComparable(abs);
  const home = toComparable(homedir());

  if (a === home) return true; // 홈 루트 자체
  // 홈 아래 자격증명/민감 폴더
  for (const d of [".ssh", ".aws", ".codex", ".claude", ".gnupg", ".config"]) {
    const sd = toComparable(path.join(homedir(), d));
    if (a === sd || a.startsWith(sd + path.sep)) return true;
  }
  // 시스템 폴더
  const sys = WIN
    ? ["c:\\windows", "c:\\program files", "c:\\program files (x86)", "c:\\programdata"]
    : ["/etc", "/usr", "/bin", "/sbin", "/var", "/system", "/library", "/boot", "/dev", "/proc"];
  for (const s of sys) {
    if (a === s || a.startsWith(s + path.sep)) return true;
  }
  // 드라이브/파일시스템 루트
  if (WIN && /^[a-z]:\\?$/.test(a)) return true;
  if (!WIN && a === "/") return true;
  return false;
}
function isSymlink(p) {
  try {
    const abs = path.resolve(p);
    return existsSync(abs) && lstatSync(abs).isSymbolicLink();
  } catch {
    return false;
  }
}

// ── 위험 등급 (패턴은 초안 — §8.8 한계) ──
// 치명: 되돌릴 수 없는 광역 파괴 → deny
const CATASTROPHIC = [
  /\brm\s+-[a-zA-Z]*\s*(~|\/|\$\{?HOME\}?|%USERPROFILE%)\s*(\/\*)?\s*($|[;&|])/i, // rm -rf ~ , /
  /\bremove-item\b[^|;&]*-recurse[^|;&]*(~|\$HOME|%USERPROFILE%|[A-Za-z]:\\?\s*$)/i, // PS 광역 삭제
  /\b(del|erase)\s+\/s\b[^|;&]*[A-Za-z]:\\?\s*$/i,
  /\b(rmdir|rd)\s+\/s\b[^|;&]*[A-Za-z]:\\?\s*$/i,
  /\bformat\s+[A-Za-z]:/i,
  /\bmkfs\b/i,
  /:\(\)\s*\{[^}]*\}\s*;\s*:/, // fork bomb
  /\bdd\b[^|;&]*\bof=\/dev\/(sd|nvme|disk|hd)/i,
  />\s*\/dev\/(sd|nvme|disk|hd)/i,
];
// 위험: 삭제·강제·배포·외부 업로드 → 백업 후 ask
const RISKY = [
  /\brm\b/i,
  /\b(del|erase)\b/i,
  /\b(rmdir|rd)\b/i,
  /\bunlink\b/i,
  /\bremove-item\b/i, // PowerShell
  /\b(ri|rd)\b\s/i, // PowerShell 별칭
  /git\s+push\b[^|;&]*--force/i,
  /git\s+reset\s+--hard\b/i,
  /git\s+clean\s+-[a-zA-Z]*f/i,
  /\b(vercel|netlify|firebase)\s+deploy\b/i,
  /\bnpm\s+publish\b/i,
  /git\s+push\b/i,
  /\b(curl|wget)\b[^|;&]*\b(-d|--data|-T|--upload-file|-F|--form)\b/i, // 외부 업로드
  /\bscp\b/i,
  /\bchmod\s+-R\b/i,
  /\bset-content\b/i, // PowerShell 덮어쓰기
  // 우회 삭제 방법들 (실측 2026-06-21: 1차 차단 시 AI가 다른 방법 시도 — 흔한 것은 잡는다, §8.8 한계 유지)
  /add-type[^;&|]*visualbasic/i, // PowerShell .NET(휴지통/삭제)
  /\[\s*(system\.)?io\.(file|directory)\]::\s*delete/i, // .NET IO 삭제
  /\.(rmtree|removedirs)\s*\(/i, // python shutil.rmtree
  /\bos\.(remove|unlink|rmdir)\s*\(/i, // python os 삭제
  /\bfs\.(rm|rmsync|unlink|unlinksync|rmdir|rmdirsync)\b/i, // node fs 삭제(fs.rm...)
  /\b(rmsync|unlinksync|rmdirsync)\s*\(/i, // node 삭제(require('fs').rmSync(...) 형태)
];
// git 전역 옵션(-C <경로>, -c <key=val>)을 떼어 "git <명령>" 형태로 정규화한다.
// 없으면 `git -C <폴더> push`(reset --hard·clean -f·push --force 포함)가 위험 분류를 통째로 빠져나간다(실측 2026-06-21).
function normalizeForClassify(cmd) {
  return cmd.replace(/\bgit\s+(?:(?:-C|-c)\s+(?:"[^"]*"|'[^']*'|\S+)\s+)+/gi, "git ");
}
function classify(cmd) {
  for (const re of CATASTROPHIC) if (re.test(cmd)) return "catastrophic";
  for (const re of RISKY) if (re.test(cmd)) return "risky";
  return "safe";
}

// ── 폴더(재귀) 삭제 신호 ──
// 폴더는 통째로 백업할 수 없고(이미 확인) 비가역이라, 확인(ask) 대신 완전 차단(deny)한다.
// 이유(실측 2026-06-21): 사용자 권한이 "자동 승인" 모드면 ask가 그냥 통과됨 → deny만 실제로 막힌다.
const RECURSIVE_DELETE = [
  /\brm\s+-[a-z]*r/i, // rm -r / -rf / -fr
  /\bremove-item\b[^;&|]*-recurse/i, // Remove-Item -Recurse
  /\b(rd|rmdir)\b[^;&|]*(\/s|-recurse)/i, // rd /s, rmdir -recurse
  /\.(rmtree|removedirs)\s*\(/i, // python shutil.rmtree
  /\[\s*(system\.)?io\.directory\]::\s*delete/i, // .NET Directory.Delete
  /deletedirectory\s*\(/i, // .NET/VisualBasic DeleteDirectory(...) (실측 우회법)
  /add-type[\s\S]*visualbasic[\s\S]*delete/i, // VisualBasic 삭제(휴지통/영구) — 백업 불가라 차단
  /\b(fs\.)?(rm|rmsync)\s*\([^;&|]*recursive/i, // node fs.rm/rmSync({recursive:true}) (require('fs') 형태 포함)
];
const FOLDER_DENY_MSG =
  "폴더를 통째로 지우는 작업은 안전하게 막았어요. 폴더는 백업·되돌리기가 어렵거든요. 정말 필요하면 폴더 안의 파일부터 하나씩 지워 보세요(그건 백업돼요).";
function isRecursiveDeletePattern(cmd) {
  for (const re of RECURSIVE_DELETE) if (re.test(cmd)) return true;
  return false;
}

// ── '삭제' 계열 명령인지 (폴더가 인자로 있을 때만 폴더-차단을 적용할 대상) ──
// 위험명령이라도 삭제가 아니면(예: `git add . && git push`, 자동커밋) 폴더 인자는 삭제 대상이 아니다.
// 이 게이트가 없으면 폴더를 '언급'만 해도 폴더-차단 오발동(false block)이 난다(실측 2026-06-21).
const DELETE_SIGNAL = [
  /\brm\b/i,
  /\b(del|erase)\b/i,
  /\b(rmdir|rd)\b/i,
  /\bunlink\b/i,
  /\bremove-item\b/i,
  /\bri\b\s/i,
  /\.(rmtree|removedirs)\s*\(/i,
  /\bos\.(remove|unlink|rmdir)\s*\(/i,
  /\bfs\.(rm|rmsync|unlink|unlinksync|rmdir|rmdirsync)\b/i,
  /\[\s*(system\.)?io\.(file|directory)\]::\s*delete/i,
  /deletedirectory\s*\(/i,
  /add-type[\s\S]*visualbasic[\s\S]*delete/i,
];
function isDeleteCommand(cmd) {
  for (const re of DELETE_SIGNAL) if (re.test(cmd)) return true;
  return false;
}

// ── 메인 ──
function main() {
  const raw = readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    passThrough();
    return;
  }

  const toolName = input.tool_name || "";
  const ti = input.tool_input || {};
  const cwd = input.cwd || process.cwd();
  const sessionId = input.session_id; // 백업에 "어느 대화에서 한 일"인지 꼬리표로 기록(undo 정확도)

  const isWriteTool = ["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(toolName);
  // 셸 계열: Bash/PowerShell 등 command 필드가 있는 도구 전부
  const isShellTool =
    !isWriteTool && typeof ti.command === "string" && ti.command.length > 0;

  if (!isWriteTool && !isShellTool) {
    passThrough();
    return;
  }

  // ── 셸 명령 ──
  if (isShellTool) {
    const cmd = String(ti.command || "");
    const level = classify(normalizeForClassify(cmd));
    if (level === "safe") {
      passThrough();
      return;
    }
    const paths = commandPaths(cmd).map((p) => resolveLoose(cwd, p));
    // 민감 위치를 건드리면 차단
    for (const ap of paths) {
      if (isSensitive(ap)) {
        decide(
          "deny",
          "시스템·홈 등 민감한 위치를 건드리는 위험한 작업이라 막았어요. 안전을 위해 작업용 폴더 안에서만 진행해 주세요.",
        );
        return;
      }
    }
    if (level === "catastrophic") {
      decide(
        "deny",
        "되돌릴 수 없는 위험한 명령이라 막았어요. 정말 필요하면 더 작은 단위로 나눠서 해보세요.",
      );
      return;
    }
    // 폴더(재귀) 삭제 패턴이면 즉시 차단 — 폴더는 백업 불가·비가역, deny는 자동승인도 못 뚫음
    if (isRecursiveDeletePattern(cmd)) {
      decide("deny", FOLDER_DENY_MSG);
      return;
    }
    // risky(단일 파일 등) → 백업 후 ask (백업 실패 시 fail-safe deny — H7)
    const res = backupPaths(paths, cwd, sessionId);
    // 백업 대상에 실제 '폴더'가 있고 + 그게 '삭제' 명령일 때만 차단(빈 폴더 삭제 등).
    // 비삭제 위험명령이 폴더를 인자로 가진 경우(예: 자동커밋 `git add . && git push`)는 오차단하지 않는다.
    if (Array.isArray(res.skippedDirs) && res.skippedDirs.length > 0 && isDeleteCommand(cmd)) {
      decide("deny", FOLDER_DENY_MSG);
      return;
    }
    if (!res.ok) {
      decide(
        "deny",
        `백업을 못 떠서 안전하게 멈췄어요. (사유: ${res.error}) 디스크 공간이나 폴더 권한을 확인해 주세요.`,
      );
      return;
    }
    decide(
      "ask",
      `되돌리기 어려운 작업이에요. 먼저 백업해 뒀어요(파일 ${res.count}개). 정말 진행할까요? 잘못되면 "되돌려 줘"라고 하면 복구할 수 있어요.`,
    );
    return;
  }

  // ── 파일 쓰기 계열 (Write/Edit/...) ──
  const targets = writeTargets(ti);
  for (const t of targets) {
    const abs = resolveLoose(cwd, t);
    if (isSensitive(abs)) {
      decide("deny", "시스템·홈 등 민감한 위치의 파일이라 안전을 위해 막았어요.");
      return;
    }
    if (isSymlink(abs)) {
      decide("deny", "바로가기(심볼릭 링크) 파일이라 안전을 위해 막았어요.");
      return;
    }
  }
  // 기존 파일 덮어쓰기만 위험(새 파일 생성은 안전 — 어느 폴더든 통과)
  const overwrites = targets.filter((t) => {
    try {
      return existsSync(path.resolve(cwd, t));
    } catch {
      return false;
    }
  });
  if (overwrites.length > 0) {
    const res = backupPaths(overwrites, cwd, sessionId);
    if (!res.ok) {
      decide("deny", `백업을 못 떠서 안전하게 멈췄어요. (사유: ${res.error})`);
      return;
    }
    decide(
      "ask",
      `기존 파일을 바꾸기 전에 백업해 뒀어요(파일 ${res.count}개). 진행할까요? 잘못되면 "되돌려 줘"로 복구돼요.`,
    );
    return;
  }
  passThrough(); // 새 파일 생성 등 — 안전
}

main();
