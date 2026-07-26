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

import { readFileSync, existsSync, lstatSync, statSync, realpathSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { backupPaths, isSecretFile } from "./backup.mjs";
import { isTrusted, recordPending } from "./whitelist.mjs"; // 세션 화이트리스트(D1)
import { getAutonomyLevel } from "./profile.mjs"; // 맞춤 마법사 — ask 빈도만 조정(deny·백업은 불변)

const WIN = process.platform === "win32";
const MAC = process.platform === "darwin";

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

// 비밀파일이 백업에서 제외됐으면(A3) 정직하게 덧붙일 경고. 없으면 빈 문자열.
function secretNote(res) {
  const list = res && Array.isArray(res.skippedSecrets) ? res.skippedSecrets : [];
  if (!list.length) return "";
  const names = list.map((p) => String(p).split(/[\\/]/).pop()).join(", ");
  return ` 단, 비밀로 보이는 파일은 보안을 위해 백업하지 않았어요(${names}) — 이건 되돌리기가 안 되니 특히 조심하세요.`;
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
    // git 서브커맨드 이름(예: "git rm"의 "rm")은 경로가 아니라 명령어 문법의 일부 → 경로 후보에서 제외.
    // 안 그러면 존재하지 않는 이 토큰이 cwd=홈 루트일 때 dirname 폴백(realOf)이 홈 자체를 가리켜
    // 민감위치 오탐 deny가 난다(실측 2026-07-26 — 이 세션의 자기 진단 명령이 실제로 이렇게 막힘).
    if (i === 1 && (toks[0] || "").toLowerCase() === "git") continue;
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

// ── 셸 명령의 '쓰기/덮어쓰기/이동 대상' 경로 후보 (존재 여부 무관) ──
// 06_CORE_DRAFTS 명세의 "덮어쓰기: > 리다이렉트 / cp·mv / Copy-Item·Move-Item / Out-File"를 구현.
// 삭제(rm)와 달리 '대상'만 위험하다(원본 source는 읽기일 뿐) → source는 넣지 않는다.
// 한계(정직): 따옴표 없는 공백 포함 경로·python open(w)·node writeFileSync·tee 등은 못 잡음(§8.8).
function writeDestinations(cmd, cwd) {
  const root = cwd || process.cwd();
  const cand = new Set();
  const clean = (p) => String(p).replace(/^["';|&]+|["';|&]+$/g, "");
  // 1) 리다이렉트 덮어쓰기 '>' / '1>' (단, '>>' 추가는 데이터 안 잃어 제외, '2>' stderr 제외)
  const reDir = /(?:^|[^>\d])1?>(?!>)\s*("[^"]+"|'[^']+'|[^\s;&|>]+)/g;
  let m;
  while ((m = reDir.exec(cmd))) cand.add(clean(m[1]));
  // 2) cp / mv / copy / move : 마지막 비-플래그 인자 = 대상
  const toks = bashTokens(cmd);
  const c0 = (toks[0] || "").toLowerCase();
  if (/^(cp|mv|copy|move)$/.test(c0)) {
    for (let i = toks.length - 1; i >= 1; i--) {
      const t = toks[i];
      if (!t || t.startsWith("-") || SHELL_OPS.has(t)) continue;
      // posix 절대경로(/home·/Users..)는 덮어쓰기 대상, windows 단일 플래그(/s 등)만 제외 (commandPaths와 동일 규칙)
      if (t.startsWith("/") && WIN && !/[\\/].+/.test(t.slice(1))) continue;
      cand.add(clean(t));
      break;
    }
  }
  // 3) PowerShell Copy-Item / Move-Item / Out-File : -Destination/-FilePath/-Path 값, 없으면 마지막 경로
  if (/\b(copy-item|move-item|out-file)\b/i.test(cmd)) {
    const md = cmd.match(/-(?:Destination|FilePath|Path|LiteralPath)\s+("[^"]+"|'[^']+'|\S+)/i);
    if (md) {
      cand.add(clean(md[1]));
    } else {
      for (let i = toks.length - 1; i >= 1; i--) {
        const t = toks[i];
        if (!t || t.startsWith("-") || SHELL_OPS.has(t)) continue;
        cand.add(clean(t));
        break;
      }
    }
  }
  return Array.from(cand)
    .filter(Boolean)
    .map((p) => resolveLoose(root, p));
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
  if (WIN) return p.replace(/\//g, "\\").toLowerCase();
  if (MAC) return p.toLowerCase(); // macOS 기본 FS는 대소문자 무시 → /System 과 /system 동일 취급(C1 버그 수정)
  return p; // Linux: 대소문자 구분
}
function isSensitiveRaw(absInput) {
  let abs;
  try {
    // 이미 resolveLoose를 거친 절대경로를 받는 게 정상이나, 안전하게 한 번 더
    abs = path.isAbsolute(absInput) ? absInput : path.resolve(absInput);
  } catch {
    return true; // 판정 불가 → 안전하게 민감으로 간주
  }
  const a = toComparable(abs);

  // Context 처방 예외 — ~/.claude/CLAUDE.md · AGENTS.md 는 Context가 처방하는 대상 파일.
  // settings.json 등 나머지 .claude/* 는 여전히 차단 (C1 보안 원칙).
  if (
    a === toComparable(path.join(homedir(), ".claude", "CLAUDE.md")) ||
    a === toComparable(path.join(homedir(), ".claude", "AGENTS.md"))
  ) return false;

  const home = toComparable(homedir());

  if (a === home) return true; // 홈 루트 자체
  // 홈 아래 자격증명/민감 폴더
  const homeDirs = [".ssh", ".aws", ".codex", ".claude", ".gnupg", ".config"];
  // Windows: AppData\Roaming 전체 차단은 claude-code 등 앱 운영 폴더까지 막는 과잉차단(C1 버그 수정).
  // 실제 자격증명 하위 폴더만 선별 보호. %LOCALAPPDATA%(Local\Temp)는 정상 작업공간이라 제외.
  if (WIN) {
    homeDirs.push(path.join("AppData", "Roaming", "Microsoft", "Credentials"));
    homeDirs.push(path.join("AppData", "Roaming", "Microsoft", "Windows", "Credentials"));
    homeDirs.push(path.join("AppData", "Roaming", "Microsoft", "Protect"));
    homeDirs.push(path.join("AppData", "Roaming", "gnupg"));
  }
  if (MAC) homeDirs.push("Library"); // ~/Library (키체인·앱 자격 등) (C1)
  homeDirs.push(...EXTRA.homeSubdirs); // 사용자 추가(safety-rules.json)
  for (const d of homeDirs) {
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
  // 사용자 추가 민감경로(safety-rules.json) — 이미 toComparable 적용됨
  for (const s of WIN ? EXTRA.sensWin : EXTRA.sensPosix) {
    if (s && (a === s || a.startsWith(s + path.sep))) return true;
  }
  // UNC 공유 루트(\\server\share)도 루트로 취급(E1)
  if (WIN && /^\\\\[^\\]+\\[^\\]+\\?$/.test(a)) return true;
  // 드라이브/파일시스템 루트
  if (WIN && /^[a-z]:\\?$/.test(a)) return true;
  if (!WIN && a === "/") return true;
  return false;
}
// 실제 경로 해석 — junction/심볼릭 링크 우회 차단용(E1). existsSync로 나뉜 두 갈래는
// isSensitive()에서 각각 "존재함(직접 realpath)" / "존재 안 함(부모 폴더로 진짜 indirection이
// 있는지만 확인)"으로 쓰인다 — 부모 폴더 자체가 문자 그대로 민감 위치인 경우(예: 홈 루트 바로
// 아래 새 파일)까지 "정션 우회"로 오인하면 안 되기 때문(2026-07-26 실측 버그, 아래 isSensitive 참고).
function realOf(p) {
  try {
    return realpathSync(p);
  } catch {}
  return null;
}
function isSensitive(absInput) {
  let abs;
  try {
    abs = path.isAbsolute(absInput) ? absInput : path.resolve(absInput);
  } catch {
    return true;
  }
  if (isSensitiveRaw(abs)) return true;
  if (existsSync(abs)) {
    // 이미 있는 파일/폴더: 그 자신이 junction·심볼릭 링크로 민감 위치를 가리키면 우회 차단(E1)
    const real = realOf(abs);
    if (real && toComparable(real) !== toComparable(abs) && isSensitiveRaw(real)) return true;
    return false;
  }
  // 새로 만들 파일(아직 없음): "부모 폴더"가 junction/심볼릭 링크로 민감 위치를 가리키는 경우만
  // 잡는다(E1 진짜 목적). 부모가 링크 없이 "문자 그대로" 민감 위치인 경우는 위 isSensitiveRaw(abs)가
  // 이미 판정했으므로(홈 루트 바로 아래 새 파일은 원래 허용) 여기서 realpath(부모) === 부모(문자 그대로)면
  // 진짜 indirection이 없다는 뜻 — 그때는 추가로 막지 않는다(과잉차단 방지, 실측 재현: git rm 등
  // "존재하지 않는 대상"이 cwd=홈 루트일 때 부모 폴백이 홈 자체를 가리켜 오탐 deny 나던 버그).
  const dir = path.dirname(abs);
  let realDir = null;
  try {
    realDir = realpathSync(dir);
  } catch {}
  if (realDir && toComparable(realDir) !== toComparable(dir) && isSensitiveRaw(realDir)) return true;
  return false;
}
// [2026-07-27·12 C1 후속] Claude Code 앱 자신의 활성 설정파일(플러그인 켜짐/꺼짐·권한 자동승인이 들어있음).
// ~/.claude/settings.json(hooks 보유, 이미 deny 보호)과는 다른 파일 — 여긴 hooks는 없지만
// enabledPlugins(플러그인 끄기로 guard 자체 무력화 가능)·permissions(위험도구 자동허용 가능)가 있어
// 자기보호 관점에서 여전히 민감. 단, model·theme·tui 등 무해 필드도 같은 파일에 섞여 있어(12번 문서와
// 동일한 구조) deny로 올리면 §12 사례처럼 정상 요청까지 막는다 — 그래서 deny 승격이 아니라
// ask 메시지에 인지 강화 문구만 추가한다(마찰 확대 없음, 안전바닥 무변화).
// Windows 경로만 실측 확인(파일 존재 직접 확인, 2026-07-27). Mac/Linux는 Node/Electron 통상 관례
// 추정(⚪ 미검증) — 틀려도 그냥 매칭 안 될 뿐 과잉차단 리스크 없음(fail-open 방향이라 안전).
function isActiveClaudeCodeConfigFile(abs) {
  let candidate;
  if (WIN) candidate = path.join(homedir(), "AppData", "Roaming", "claude-code", "settings.json");
  else if (MAC) candidate = path.join(homedir(), "Library", "Application Support", "claude-code", "settings.json");
  else candidate = path.join(homedir(), ".config", "claude-code", "settings.json");
  return toComparable(abs) === toComparable(candidate);
}
function isSymlink(p) {
  try {
    const abs = path.resolve(p);
    return existsSync(abs) && lstatSync(abs).isSymbolicLink();
  } catch {
    return false;
  }
}

// ── 글롭 백업 확장 (실행 0 — readdirSync만 사용) ──
// [2026-07-03 정밀화 2차·U1] `rm *.txt`의 `*.txt`가 리터럴로 해석돼 백업에서 새던 갭을 닫는다.
// 단순 글롭(경로 마지막 요소의 *·?)만 확장. 폴더는 넣지 않는다 — 비재귀 삭제는 폴더를 못 지우고,
// `rm -r`은 이미 위에서 deny되므로, 폴더를 넣으면 `rm *`에 폴더-차단 오발동만 생긴다.
// 확장 불가(dirname에 글롭 등)·실패 시 원본 토큰 유지 = 기존 동작(fail-safe).
function expandGlobsForBackup(paths) {
  const out = [];
  for (const p of paths) {
    const s = String(p);
    const base = path.basename(s);
    const dir = path.dirname(s);
    if (!/[*?]/.test(base) || /[*?]/.test(dir)) {
      out.push(s);
      continue;
    }
    try {
      const esc = base.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp("^" + esc.replace(/\*/g, "[^\\\\/]*").replace(/\?/g, "[^\\\\/]") + "$", WIN ? "i" : "");
      for (const name of readdirSync(dir)) {
        if (!re.test(name)) continue;
        const full = path.join(dir, name);
        try {
          if (statSync(full).isFile()) out.push(full);
        } catch {}
      }
    } catch {
      /* 확장 실패 → 아래에서 원본 유지(fail-safe) */
    }
    out.push(s); // 원본 토큰도 유지(존재하면 기존 로직대로, 글롭 문자열이면 백업 단계서 걸러짐)
  }
  return out;
}

// ── git 작업트리 판정 (실행 0 — .git 존재만 fs로 확인, 불변 규칙 "절대 실행 금지" 준수) ──
// [2026-07-03 정밀화] 파일이 git 저장소 안이면 편집 전 상태를 git으로도 복구 가능 → 백업+git 이중 안전망.
// 한계(정직): .git 존재 ≠ 그 파일이 추적(tracked)됨. 미추적 파일도 통과하지만, 그 경우에도
// 우리 백업(backupPaths)이 방금 떠 있으므로 복구 경로는 항상 존재한다(비밀파일 제외 — 호출부에서 ask 유지).
function findGitRoot(absFile) {
  try {
    let dir = path.dirname(path.resolve(absFile));
    for (let i = 0; i < 60; i++) {
      if (existsSync(path.join(dir, ".git"))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break; // 드라이브/파일시스템 루트 도달
      dir = parent;
    }
  } catch {
    /* 판정 불가 → null(=완화 없음, 기존 ask 흐름) — fail-safe */
  }
  return null;
}

// ── 확장 규칙 로드 (safety-rules.json) — 08 §1: "이것도 막아줘"를 데이터 1줄로 ──
// 원칙: 코드 기본 패턴에 '추가'만 한다(기본은 fail-safe로 코드에 남김). 파일 없음/깨짐/잘못된 줄은
// 조용히 무시 → 기본 보호는 항상 유지(fail-safe). 정규식은 문자열로 저장(대소문자 무시).
function compileList(arr) {
  const out = [];
  if (!Array.isArray(arr)) return out;
  for (const s of arr) {
    if (typeof s !== "string" || !s) continue;
    try {
      out.push(new RegExp(s, "i"));
    } catch {
      /* 잘못된 정규식은 건너뜀 */
    }
  }
  return out;
}
function readRulesFile(loc) {
  try {
    if (typeof loc === "string" && !existsSync(loc)) return null;
    const raw = readFileSync(loc, "utf8");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function loadExtraRules() {
  const acc = { catastrophic: [], risky: [], recursiveDelete: [], sensWin: [], sensPosix: [], homeSubdirs: [] };
  const sources = [];
  try {
    sources.push(readRulesFile(new URL("./safety-rules.json", import.meta.url))); // 플러그인 동봉 기본
  } catch {}
  // 사용자 개인 추가 파일(테스트는 SODAM_RULES_FILE로 주입)
  const userFile = process.env.SODAM_RULES_FILE || path.join(homedir(), ".sodamharness", "safety-rules.json");
  sources.push(readRulesFile(userFile));
  for (const r of sources) {
    if (!r || typeof r !== "object") continue;
    acc.catastrophic.push(...compileList(r.catastrophic));
    acc.risky.push(...compileList(r.risky));
    acc.recursiveDelete.push(...compileList(r.recursiveDelete));
    const sp = r.sensitivePaths || {};
    if (Array.isArray(sp.windows)) acc.sensWin.push(...sp.windows.map((x) => toComparable(String(x))));
    if (Array.isArray(sp.posix)) acc.sensPosix.push(...sp.posix.map((x) => toComparable(String(x))));
    if (Array.isArray(sp.homeSubdirs)) acc.homeSubdirs.push(...sp.homeSubdirs.map(String));
    // plugins.* 네임스페이스 — 형제 플러그인이 자신 이름 키에 규칙을 주입
    if (r.plugins && typeof r.plugins === "object") {
      for (const [k, ns] of Object.entries(r.plugins)) {
        if (!ns || typeof ns !== "object" || k.startsWith("_")) continue;
        acc.catastrophic.push(...compileList(ns.catastrophic));
        acc.risky.push(...compileList(ns.risky));
        acc.recursiveDelete.push(...compileList(ns.recursiveDelete));
      }
    }
  }
  return acc;
}
const EXTRA = loadExtraRules(); // 모듈 로드 시 1회(매 훅 호출마다 새 프로세스라 사용자 편집을 바로 반영)

// ── 맞춤 마법사 설정 로드 (기본 L1=현재 동작과 100% 동일) ──
// 불변: 이 값은 ask 빈도만 바꾼다. deny(치명·민감위치·폴더재귀삭제)·백업은 레벨과 무관하게 항상 그대로.
const AUTONOMY = getAutonomyLevel();
const TRUST_TTL_MS = AUTONOMY === "L1" ? undefined : 24 * 60 * 60 * 1000; // L2/L3=24h, L1=whitelist.mjs 기본(12h)
// L3 전용: 백업이 실제로(비밀파일 제외 없이) 성공했으면 risky 작업의 ask를 생략한다.
function fullyBackedUp(res) {
  return !!res && res.ok && res.count > 0 && (!Array.isArray(res.skippedSecrets) || res.skippedSecrets.length === 0);
}

// ── allowedTools 무결성 경고 (C1 방어 — 다른 플러그인이 위험 도구를 자동 허용 목록에 올렸는지 감지) ──
// 차단하지 않음 — stderr 경고만. guard.mjs deny 는 allowedTools 설정과 무관하게 항상 유효.
// 단, ask 판정은 bypassPermissions/acceptEdits 모드에서 자동 통과되므로 위험 도구가 목록에 있으면 알린다.
function warnAllowlistIfRisky() {
  try {
    const settingsPath = path.join(homedir(), ".claude", "settings.json");
    if (!existsSync(settingsPath)) return;
    const s = JSON.parse(readFileSync(settingsPath, "utf8"));
    const allowed = Array.isArray(s.allowedTools) ? s.allowedTools : [];
    const risky = ["Bash", "Write", "Edit"];
    const found = allowed.filter((t) => risky.includes(t));
    if (found.length > 0) {
      process.stderr.write(
        `[SoDamHarness] allowedTools 에 위험 도구 발견: ${found.join(", ")}\n` +
        `  → guard.mjs deny 는 여전히 유효하지만, ask 판정은 자동승인 모드에서 통과됩니다.\n` +
        `  → 의도한 설정이면 무시하세요. 아니라면 ~/.claude/settings.json 의 allowedTools 를 확인해 주세요.\n`,
      );
    }
  } catch { /* fail-closed — 경고 실패는 조용히 무시 */ }
}

// ── 위험 등급 (패턴은 초안 — §8.8 한계) ──
// 치명: 되돌릴 수 없는 광역 파괴 → deny
const CATASTROPHIC = [
  /\brm\s+-[a-zA-Z]*\s*(~|\/|\$\{?HOME\}?|%USERPROFILE%)\s*(\/\*)?\s*($|[;&|])/i, // rm -rf ~ , /
  /\bremove-item\b[^|;&]*-recurse[^|;&]*((?<!\w)~(?!\w)|\$HOME|%USERPROFILE%|[A-Za-z]:\\?\s*$)/i, // PS 광역 삭제 (~ 는 홈 참조만 — 경로 속 리터럴 ~ 예: RUNNER~1 제외)
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
  // [2026-07-03 정밀화] 일반 git push는 로컬 데이터를 잃지 않음(원격에 더하기) → risky 아님.
  // 파괴적 변형만 잡는다: --force/-f(강제), --delete/-d·":refspec"(원격 브랜치 삭제), +refspec(강제 문법), --mirror/--prune.
  // 근거: .PRD/09_CONSTRAINT_RELAXATION.md §1 E1 · 11_PRECISION_TUNING_LOG.md
  /git\s+push\b[^|;&]*(--force|--mirror|--delete|--prune|\s-f\b|\s-d\b|\s+:\S+|\s\+\S+)/i,
  /git\s+reset\s+--hard\b/i,
  /git\s+clean\s+-[a-zA-Z]*f/i,
  /\b(vercel|netlify|firebase)\s+deploy\b/i,
  /\bnpm\s+publish\b/i,
  /\b(curl|wget)\b[^|;&]*(?:^|\s)(-d|--data|-T|--upload-file|-F|--form)\b/i, // 외부 업로드 (2026-07-07 앵커 버그 수정: \b→(?:^|\s), 공백 뒤 플래그가 매칭 안 되던 잠복 버그 — 감사로 발견)
  /\bscp\b/i,
  /\bfind\b[^|;&]*(-delete\b|-exec[^|;&]*\brm\b)/i, // find -delete / -exec rm (대량 삭제 — 2026-07-07 감사)
  /\btruncate\b[^|;&]*(-s|--size)[=\s]*0\b/i, // truncate -s 0 (파일 0-초기화 — 2026-07-07 감사)
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

// ── 비실행 인용 데이터 오탐 방지 (E-2) ──
// echo·grep·printf·git commit -m 처럼 인자를 "실행하지 않고 데이터로만" 다루는 명령의 따옴표 내용은
// 위험 분류에서 제외한다("rm -rf" 언급 ≠ 실행). 실행자(bash -c·sh -c·eval·xargs·python -c·node -e 등)는
// 절대 데이터 싱크로 취급하지 않으므로 그 따옴표 내용은 그대로 검사된다(탐지 약화 0).
// 경로 추출(writeDestinations·commandPaths)에는 적용하지 않는다 — 실제 리다이렉트/삭제 대상은 원본에서 잡는다.
const DATA_SINK = new Set(["echo", "printf", "grep", "egrep", "fgrep", "rg"]);
function isDataSinkSegment(seg) {
  const toks = bashTokens(seg);
  if (!toks.length) return false;
  const c0 = (toks[0] || "").toLowerCase();
  if (DATA_SINK.has(c0)) return true;
  if (c0 === "git") {
    const c1 = (toks[1] || "").toLowerCase();
    if (c1 === "commit" || c1 === "tag") return true; // 메시지(-m)만 데이터 — 다른 git 서브명령은 검사
  }
  return false;
}
// 셸 세그먼트 분할(따옴표 밖의 ; && || | & 에서만 — quote-aware). 세퍼레이터는 보존해 재조합한다
// (없애면 `curl x | grep -d` 처럼 세퍼레이터가 경계인 패턴에서 새 오탐이 생김).
function splitSegments(cmd) {
  const segs = [];
  let buf = "", quote = null;
  for (let i = 0; i < cmd.length; i++) {
    const ch = cmd[i];
    if (quote) { buf += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    const two = cmd.slice(i, i + 2);
    if (two === "&&" || two === "||") { segs.push({ text: buf, sep: two }); buf = ""; i++; continue; }
    if (ch === ";" || ch === "|" || ch === "&") { segs.push({ text: buf, sep: ch }); buf = ""; continue; }
    buf += ch;
  }
  segs.push({ text: buf, sep: "" });
  return segs;
}
// 데이터 싱크 세그먼트의 따옴표를 제거하되, bash가 이중따옴표 안에서 "실행"하는 명령 치환($(...)·백틱)은
// 남긴다 — 안 그러면 `echo "$(rm -rf ~)"` 같은 탐지 우회가 생긴다(보안 리뷰 반영).
// 단일따옴표는 bash에서 리터럴($()·백틱 실행 안 함)이라 항상 제거 안전.
function stripQuotesSafe(seg) {
  return seg.replace(/"[^"]*"|'[^']*'/g, (m) => {
    if (m[0] === "'") return " "; // 단일따옴표 = 리터럴 → 안전하게 제거
    if (m.includes("$(") || m.includes("`")) return m; // 이중따옴표 안 명령 치환 → 그대로 검사(우회 차단)
    return " "; // 치환 없는 순수 데이터 → 제거
  });
}
function stripInertQuotedData(cmd) {
  try {
    if (!/["']/.test(cmd)) return cmd; // 따옴표 없으면 그대로(빠른 경로)
    return splitSegments(cmd)
      .map((s) => (isDataSinkSegment(s.text) ? stripQuotesSafe(s.text) : s.text) + s.sep)
      .join("");
  } catch {
    return cmd; // 파싱 실패 → 원본 유지(fail-safe: 잡는 쪽으로 기움)
  }
}

function classify(cmd) {
  for (const re of CATASTROPHIC) if (re.test(cmd)) return "catastrophic";
  for (const re of EXTRA.catastrophic) if (re.test(cmd)) return "catastrophic"; // 사용자 추가(safety-rules.json)
  for (const re of RISKY) if (re.test(cmd)) return "risky";
  for (const re of EXTRA.risky) if (re.test(cmd)) return "risky"; // 사용자 추가
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
  for (const re of EXTRA.recursiveDelete) if (re.test(cmd)) return true; // 사용자 추가
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

// 작업 종류(화이트리스트 키) — 거칠게 분류. 같은 폴더라도 종류가 다르면 따로 신뢰(D1).
function opClassOf(cmd, isOverwrite) {
  if (isOverwrite) return "overwrite";
  if (isDeleteCommand(cmd)) return "delete";
  if (/git\s+push|deploy|publish/i.test(cmd)) return "deploy";
  return "other";
}

// ── 메인 ──
function main() {
  warnAllowlistIfRisky(); // C1: allowedTools 무결성 확인 (경고만, 차단 아님)
  const raw = readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    // 입력을 해석 못함 = 불확실 → fail-closed(ask). 과거 passThrough(fail-open)는 07_AUDIT B1 위반.
    decide("ask", "입력을 해석하지 못해, 안전을 위해 먼저 확인을 요청해요. 계속할까요?");
    return;
  }

  const toolName = input.tool_name || "";
  const ti = input.tool_input || {};
  const cwd = input.cwd || process.cwd();
  const sessionId = input.session_id; // 백업에 "어느 대화에서 한 일"인지 꼬리표로 기록(undo 정확도)

  // D2: 자동승인 모드 감지 — ask 판정이 자동 통과되므로 사용자에게 알림
  const permMode = input.permission_mode || "";
  const isAutoApprove = permMode === "bypassPermissions" || permMode === "acceptEdits";
  const BYPASS_WARN = isAutoApprove
    ? " (⚠️ 자동승인 모드: 이 확인이 자동으로 통과됩니다. 완전 차단(deny)만 유효해요.)"
    : "";

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
    // E-2: echo/grep/commit -m 등 비실행 인용 데이터는 분류에서 제외(오탐 방지). 실행자는 그대로 검사.
    const cmdForClass = stripInertQuotedData(cmd);
    const level = classify(normalizeForClassify(cmdForClass));
    const dests = writeDestinations(cmd, cwd); // 쓰기/덮어쓰기/이동 대상(원본 기준 — 실제 대상은 그대로 잡음)

    // 안전 명령 + 쓰기 대상도 없음(읽기·조회 등) → 통과
    if (level === "safe" && dests.length === 0) {
      passThrough();
      return;
    }

    // 위험명령(삭제 등)의 경로 — 안전명령이면 비움(덮어쓰기 source를 민감검사에 넣지 않기 위함)
    const delPaths = level === "safe" ? [] : commandPaths(cmd).map((p) => resolveLoose(cwd, p));

    // 민감 위치 차단: 삭제계열 경로 + 모든 쓰기 대상(새 파일이어도 시스템 위치엔 쓰기 금지)
    for (const ap of [...delPaths, ...dests]) {
      if (isSensitive(ap)) {
        decide(
          "deny",
          "이 위치엔 시스템·안전장치 설정이 들어 있어 AI가 직접 건드리지 못해요. 꼭 필요하면 파일을 직접 열어 확인 후 처리하세요 — 안전장치는 그대로 유지돼요.",
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
    if (isRecursiveDeletePattern(cmdForClass)) {
      decide("deny", FOLDER_DENY_MSG);
      return;
    }

    // 덮어쓸 '기존 파일'만 추림 — 새 파일 생성/이동은 잃을 게 없어 과잉차단하지 않는다
    const owExisting = dests.filter((ap) => {
      try {
        return existsSync(ap) && statSync(ap).isFile();
      } catch {
        return false;
      }
    });
    // 안전 명령인데 덮어쓸 기존 파일이 없으면(전부 새 파일) → 통과 (과잉차단 0)
    if (level === "safe" && owExisting.length === 0) {
      passThrough();
      return;
    }

    // 백업 대상 = 위험명령 경로(삭제 등, 글롭은 실파일로 확장·U1) + 덮어쓸 기존 파일 (중복 제거). 실패 시 fail-safe deny(H7)
    const backupList = Array.from(new Set([...expandGlobsForBackup(delPaths), ...owExisting]));
    const res = backupPaths(backupList, cwd, sessionId);
    // 백업 대상에 실제 '폴더'가 있고 + 그게 '삭제' 명령일 때만 차단(빈 폴더 삭제 등).
    // 비삭제 위험명령이 폴더를 인자로 가진 경우(예: 자동커밋 `git add . && git push`)는 오차단하지 않는다.
    if (Array.isArray(res.skippedDirs) && res.skippedDirs.length > 0 && isDeleteCommand(cmdForClass)) {
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
    // [2026-07-03 정밀화 2차·U2] 안전 명령의 덮어쓰기(echo >·cp·mv 등)가 전부 (git 저장소 안 + 비밀 아님)이면
    // 백업만 뜨고 확인 생략 — Write/Edit(P2)와 동일 논리. 위험명령(rm 등)은 대상 아님(level !== "safe").
    if (
      level === "safe" &&
      owExisting.length > 0 &&
      owExisting.every((ap) => !isSecretFile(ap) && !!findGitRoot(ap))
    ) {
      passThrough();
      return;
    }
    // 맞춤 마법사 L3: 백업이 온전히 성공한 risky 작업은 ask 생략(비밀파일이 껴 있으면 위 backupPaths에서
    // res.skippedSecrets에 잡히므로 fullyBackedUp이 false가 되어 이 분기를 안 타고 아래 ask로 그대로 이어짐.
    if (AUTONOMY === "L3" && level !== "safe" && fullyBackedUp(res)) {
      passThrough();
      return;
    }
    // 세션 화이트리스트(D1): 이 폴더·이 작업을 이미 신뢰했으면 백업만 하고 묻지 않는다(deny는 위에서 이미 끝남).
    const opClass = opClassOf(cmdForClass, false);
    if (isTrusted(sessionId, cwd, opClass, TRUST_TTL_MS)) {
      passThrough(); // 신뢰됨 — 백업은 이미 떴고, 안 물음(보호는 유지)
      return;
    }
    recordPending(sessionId, cwd, opClass); // "안 물어봐도 돼" 하면 이 작업을 신뢰로 승격
    decide(
      "ask",
      `되돌리기 어려운 작업이에요. 먼저 백업해 뒀어요(파일 ${res.count}개).${secretNote(res)} 정말 진행할까요? 잘못되면 "되돌려 줘"라고 하면 복구할 수 있어요. (이 폴더에서 이런 작업을 계속 할 거면 "이 폴더는 안 물어봐도 돼"라고 하면 이 폴더에서는 12시간 동안 안 물을게요. 대화를 새로 시작해도 유지돼요.)${BYPASS_WARN}`,
    );
    return;
  }

  // ── 파일 쓰기 계열 (Write/Edit/...) ──
  const targets = writeTargets(ti);
  for (const t of targets) {
    const abs = resolveLoose(cwd, t);
    if (isSensitive(abs)) {
      decide("deny", "이 파일엔 시스템·안전장치 설정이 들어 있어 AI가 직접 못 바꿔요. 꼭 바꿔야 하면 파일을 직접 열어 확실한 부분만 바꾸세요 — 안전장치는 그대로 유지돼요.");
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
    // [2026-07-03 정밀화] 전부 (git 저장소 안 + 비밀파일 아님)이면 확인 생략 — 방금 뜬 백업 + git 이중 복구 가능.
    // 비밀파일은 백업이 안 뜨므로(A3) 반드시 ask 유지. 민감위치·심볼릭 링크 deny는 위에서 이미 끝남.
    const allRecoverable = overwrites.every((t) => {
      const abs = resolveLoose(cwd, t);
      return !isSecretFile(abs) && !!findGitRoot(abs);
    });
    if (allRecoverable) {
      passThrough();
      return;
    }
    // 맞춤 마법사 L3: 백업이 온전히 성공했으면(비밀파일 없음) ask 생략
    if (AUTONOMY === "L3" && fullyBackedUp(res)) {
      passThrough();
      return;
    }
    const opClass = opClassOf("", true); // = "overwrite"
    if (isTrusted(sessionId, cwd, opClass, TRUST_TTL_MS)) {
      passThrough(); // 신뢰됨 — 백업은 이미 떴고, 안 물음
      return;
    }
    recordPending(sessionId, cwd, opClass);
    // [2026-07-27·12 C1 후속] 자기보호 인지 강화: deny 승격 없이 이 문구만 추가.
    // 알려진 한계(문서화만, 이번 변경 범위 밖) — 아래 두 경로는 이 문구를 건너뛴다(기존 동작, 신규 아님):
    // ① 맞춤 마법사 L3(현재 기본 L1이라 비활성) ② 같은 폴더 화이트리스트 신뢰(D1). 필요 시 별도 결정 사항.
    const selfProtectNote = overwrites.some((t) => isActiveClaudeCodeConfigFile(resolveLoose(cwd, t)))
      ? " ⚠️ 이 파일엔 플러그인 켜짐/꺼짐·권한 자동승인 설정이 들어 있어요. 안전장치를 끄거나 위험한 자동승인을 켜는 내용이면 특히 조심하세요."
      : "";
    decide(
      "ask",
      `기존 파일을 바꾸기 전에 백업해 뒀어요(파일 ${res.count}개).${secretNote(res)}${selfProtectNote} 진행할까요? 잘못되면 "되돌려 줘"로 복구돼요. (이 폴더에서 이런 작업을 계속 할 거면 "이 폴더는 안 물어봐도 돼"라고 하면 이 폴더에서는 12시간 동안 안 물을게요. 대화를 새로 시작해도 유지돼요.)${BYPASS_WARN}`,
    );
    return;
  }
  passThrough(); // 새 파일 생성 등 — 안전
}

// 안전벨트가 살아있는지 빠른 자가 점검(배포 포함 — status가 호출, _selftest와 별개·경량).
// 위험 페이로드를 "분류 로직"에만 통과시켜 차단 판정이 나오는지 확인한다(실제 파일 작업 0·외부 전송 0).
function selfcheck() {
  const cases = [
    { name: "치명(rm -rf ~) 차단", ok: classify(normalizeForClassify("rm -rf ~")) === "catastrophic" },
    { name: "재귀 폴더삭제 차단", ok: isRecursiveDeletePattern("rm -rf somedir") },
    { name: "파일삭제(rm) 위험감지", ok: classify(normalizeForClassify("rm file.txt")) === "risky" },
    { name: "민감위치 감지", ok: isSensitive(WIN ? "C:\\Windows\\x" : "/etc/x") },
    { name: "안전명령(echo) 통과", ok: classify(normalizeForClassify("echo hi")) === "safe" },
  ];
  const allOk = cases.every((c) => c.ok);
  const body = cases.map((c) => `  ${c.ok ? "OK " : "X  "} ${c.name}`).join("\n");
  process.stdout.write(`안전벨트 자가점검: ${allOk ? "정상 ✅" : "문제 발견 ⚠️"}\n${body}\n`);
  process.exit(allOk ? 0 : 1);
}

if (process.argv[2] === "--selfcheck") {
  selfcheck();
} else {
  try {
    main();
  } catch {
    // 예기치 못한 오류 → fail-closed(ask). passThrough(fail-open) 절대 금지(07_AUDIT B1).
    decide("ask", "안전 점검 중 예기치 못한 문제가 생겨, 안전을 위해 먼저 확인을 요청해요. 계속할까요?");
  }
}
