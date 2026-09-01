// SoDamHarness — backup.mjs
// 위험 작업 직전 파일 백업 + 되돌리기(복구) 공용 로직.
// 저장 위치: ~/.sodamharness/backups/<시각>/  (os.homedir 기준, 하드코딩 금지)
// 불변 규칙: 비밀값 저장 0 · 외부 전송 0 · 외부 코드 실행 0.

import { homedir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  mkdirSync,
  chmodSync,
  copyFileSync,
  existsSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";

export function baseDir() {
  return path.join(homedir(), ".sodamharness");
}
export function backupsRoot() {
  // whitelist.mjs(SODAM_WHITELIST_FILE)·profile.mjs(SODAM_PROFILE_FILE)와 동일한 관례.
  // 2026-08-19: 이 override가 없어 검증 중 실제 백업 폴더가 지워진 사고가 있었음(CHECKPOINT §AW).
  return process.env.SODAM_BACKUPS_ROOT || path.join(baseDir(), "backups");
}

// 시각 의존 — 테스트는 SODAM_NOW_MS로 고정 가능(whitelist.mjs·profile.mjs와 동일 관례)
function nowMs() {
  const t = parseInt(process.env.SODAM_NOW_MS || "", 10);
  return Number.isFinite(t) ? t : Date.now();
}

// [2026-07-27 성능] 백업이 20,000개+ 쌓인 실사용 환경에서 cleanupBackups()의 전체 폴더 스캔이
// 위험 작업마다(매번) 돌아 ~1초 지연을 유발함(실측). 정리 로직(keepN·keepDays·회당 상한)은
// 그대로 두고, "얼마나 자주 도는가"만 마커 파일로 스로틀링 — 백업 생성(안전 기능)은 무영향,
// 정리(마찰) 빈도만 낮춘다(09 §2 2층 원칙: 안전바닥 무변화). 마커가 없거나 손상되면 fail-safe로
// "지금 실행"(기존 동작과 동일) — 정리가 영구히 멈추는 실패 모드를 만들지 않는다.
function lastCleanupMarkerPath() {
  return path.join(backupsRoot(), ".last_cleanup");
}
function shouldRunCleanupNow() {
  const raw = process.env.SODAM_CLEANUP_THROTTLE_MS;
  const throttleMs = raw !== undefined && Number.isFinite(parseInt(raw, 10)) ? parseInt(raw, 10) : 60 * 60 * 1000; // 기본 1시간
  if (throttleMs <= 0) return true; // 0 이하 = 매번 실행(테스트·명시적 강제용)
  try {
    const last = parseInt(readFileSync(lastCleanupMarkerPath(), "utf8"), 10);
    if (!Number.isFinite(last)) return true; // 손상 → fail-safe: 실행
    return nowMs() - last >= throttleMs;
  } catch {
    return true; // 마커 없음/읽기 실패(최초 실행 포함) → fail-safe: 실행
  }
}
function markCleanupRan() {
  try {
    writeFileSync(lastCleanupMarkerPath(), String(nowMs()), "utf8");
  } catch {}
}

// 폴더 이름용 시각 문자열 (예: 20260620-142233)
export function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

// 비밀로 보이는 파일이면 백업에서 제외한다(§8.3 "비밀 접근·저장 0" — 07_AUDIT A3).
// 판정은 파일 이름(basename) 기준·대소문자 무시. 내용은 절대 열어보지 않는다.
export function isSecretFile(filePath) {
  const name = path.basename(String(filePath)).toLowerCase();
  if (name === ".env" || name.startsWith(".env.")) return true; // .env, .env.local, .env.production ...
  if (name.includes("auth")) return true; // *auth* (토큰·인증 파일)
  if (/\.(pem|key|pfx|p12|keystore|jks)$/.test(name)) return true; // 키·인증서
  if (/^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/.test(name)) return true; // SSH 키
  if (name === ".npmrc" || name === ".git-credentials") return true;
  if (name === "credentials" || name.startsWith("credentials.")) return true;
  return false;
}

// 주어진 경로들 중 "실제 존재하는 파일"만 백업한다(폴더·비밀파일은 제외).
// 반환: { ok, count, dir, skippedDirs, skippedSecrets, error }
export function backupPaths(paths, cwd, sessionId) {
  try {
    const root = cwd || process.cwd();
    // 폴더는 통째로 백업하지 못한다(재귀 복사는 대용량·루프 위험 → Phase 2).
    // 건너뛴 폴더를 모아 호출자(guard)가 정직하게 경고할 수 있게 보고한다.
    const skippedDirs = [];
    const skippedSecrets = []; // 비밀파일은 백업 안 함(보안 1순위) — 호출자가 정직하게 경고
    const targets = (paths || []).filter((p) => {
      try {
        const abs = path.resolve(root, p);
        if (!existsSync(abs)) return false;
        const st = statSync(abs);
        if (st.isDirectory()) {
          skippedDirs.push(abs);
          return false;
        }
        if (!st.isFile()) return false;
        if (isSecretFile(abs)) {
          skippedSecrets.push(abs);
          return false;
        }
        return true;
      } catch {
        return false;
      }
    });

    // 폴더명 = 시각 + 짧은 난수. 같은 1초 내 백업 2건이 같은 폴더를 쓰면
    // manifest가 덮어써져 undo가 한쪽을 못 보는 충돌을 막는다(시각 접두사라 정렬은 그대로).
    const dir = path.join(backupsRoot(), `${timestamp()}-${randomUUID().slice(0, 8)}`);
    mkdirSync(dir, { recursive: true });
    // 백업 폴더는 본인만 접근(POSIX). Windows는 해당 없음(no-op). (01_PRD §8.7)
    if (process.platform !== "win32") {
      try {
        chmodSync(baseDir(), 0o700);
      } catch {}
    }

    const files = [];
    let count = 0;
    for (const src of targets) {
      const abs = path.resolve(root, src);
      // 백업 파일 이름: 원본 절대경로를 평탄화해 충돌 방지
      const safeName = abs.replace(/[:\\/]+/g, "_");
      const dest = path.join(dir, safeName);
      copyFileSync(abs, dest);
      files.push({ source: abs, backup: dest });
      count++;
    }

    writeFileSync(
      path.join(dir, "manifest.json"),
      JSON.stringify(
        { created_at: timestamp(), cwd: root, session_id: sessionId || null, files },
        null,
        2,
      ),
      "utf8",
    );
    // [2026-07-03 U4] 백업 성공 직후 보수적 자동 정리 — 실패해도 백업 흐름에 영향 0(try/catch).
    // [2026-07-27 성능] 매번이 아니라 스로틀 조건(shouldRunCleanupNow) 통과할 때만 실행.
    try {
      if (shouldRunCleanupNow()) {
        const pol = readBackupPolicy();
        cleanupBackups(pol.keepN, pol.keepDays, { maxRemove: 200 });
        markCleanupRan();
      }
    } catch {}
    return { ok: true, count, dir, skippedDirs, skippedSecrets };
  } catch (e) {
    return { ok: false, count: 0, error: e.message, skippedDirs: [], skippedSecrets: [] };
  }
}

// 가장 최근 백업 정보 (undo 명령이 사용자에게 먼저 보여줄 용도 — H5)
export function latestBackup() {
  try {
    const root = backupsRoot();
    if (!existsSync(root)) return null;
    const dirs = readdirSync(root)
      .filter((d) => {
        try {
          return statSync(path.join(root, d)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort();
    if (!dirs.length) return null;
    const dir = path.join(root, dirs[dirs.length - 1]);
    const mf = path.join(dir, "manifest.json");
    if (!existsSync(mf)) return { dir, files: [] };
    return { dir, ...JSON.parse(readFileSync(mf, "utf8")) };
  } catch {
    return null;
  }
}

// 폴더 mtime(ms) 기준 "N분 전" 한국어 상대시간 — 초보자가 절대시각으로 백업을 못 고르는 문제 해결(07_AUDIT C2).
export function relativeAgo(ms) {
  try {
    const diff = Date.now() - ms;
    if (!Number.isFinite(diff) || diff < 0) return "방금"; // 클럭 차이 등으로 미래면 "방금"
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금";
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    return `${day}일 전`;
  } catch {
    return "";
  }
}

// 최근 백업 목록(최신순) — undo/status가 "골라서 되돌리기"·현황 표시에 사용.
// 각 항목: { dir, created_at, ago, cwd, session_id, files:[원본경로...] }
//
// opts.pathPrefix(선택): 이 폴더(하위 포함) 파일을 백업한 항목만 찾는다.
// [2026-07-12 버그 수정] 이 PC처럼 여러 프로젝트가 동시에 백업을 만드는 환경에서는
// 사용자가 방금 만든 백업이 "최근 limit개" 창 밖으로 몇 분 안에 밀려나 undo가 "없다"고
// 잘못 보고하는 사고가 실사용 중 실제로 재현됨(되돌리기라는 핵심 약속 위반).
// pathPrefix 미지정 시엔 기존 동작과 100% 동일(회귀 0) — 이 옵션을 쓰는 호출자만 영향받는다.
export function listBackups(limit = 8, opts = {}) {
  try {
    const root = backupsRoot();
    if (!existsSync(root)) return [];
    const dirs = readdirSync(root)
      .filter((d) => {
        try {
          return statSync(path.join(root, d)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort()
      .reverse(); // 최신순

    const prefixLower = opts.pathPrefix ? path.resolve(String(opts.pathPrefix)).toLowerCase() : null;
    // pathPrefix 검색 시엔 다른 프로젝트 활동에 밀려도 찾도록 더 넓은 창을 본다(그래도 무제한은 아님 — 성능 보호).
    const SCAN_WINDOW = 300;
    const scanNames = prefixLower ? dirs.slice(0, SCAN_WINDOW) : dirs.slice(0, Math.max(1, limit));

    const out = [];
    for (const name of scanNames) {
      const dir = path.join(root, name);
      let mtime = 0;
      try { mtime = statSync(dir).mtimeMs; } catch {}
      const ago = relativeAgo(mtime); // "3분 전" — 초보자가 방금 잃은 백업을 고르기 쉽게(C2)
      const mf = path.join(dir, "manifest.json");
      let info = { dir, created_at: name, ago, cwd: null, session_id: null, files: [] };
      if (existsSync(mf)) {
        try {
          const m = JSON.parse(readFileSync(mf, "utf8"));
          info = {
            dir,
            created_at: m.created_at || name,
            ago,
            cwd: m.cwd || null,
            session_id: m.session_id || null,
            files: (m.files || []).map((f) => f.source),
          };
        } catch {}
      }
      if (prefixLower) {
        // startsWith 문자열 비교는 test1 vs test10 같은 오탐이 생겨 path.relative로 폴더 경계를 정확히 확인한다.
        const under = info.files.some((f) => {
          const rel = path.relative(prefixLower, String(f).toLowerCase());
          return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
        });
        if (!under) continue;
      }
      out.push(info);
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

// 복구 미리보기(복사 안 함): 파일별로 복구 시 무슨 일이 생기는지 판정.
//  recreate=지금 없음(삭제됐던 것, 안전) / overwrite=지금 있고 내용 다름(덮어쓰면 현재 내용 사라짐) / same / nobackup
export function restorePlan(dir) {
  try {
    if (!dir) return { ok: false, error: "백업 폴더를 지정해 주세요", files: [] };
    const mf = path.join(dir, "manifest.json");
    if (!existsSync(mf)) return { ok: false, error: "manifest.json 없음", files: [] };
    const data = JSON.parse(readFileSync(mf, "utf8"));
    const files = (data.files || []).map((f) => {
      let status = "recreate";
      try {
        if (!existsSync(f.backup)) status = "nobackup";
        else if (!existsSync(f.source)) status = "recreate";
        else status = readFileSync(f.backup).equals(readFileSync(f.source)) ? "same" : "overwrite";
      } catch {
        status = "recreate";
      }
      return { source: f.source, status };
    });
    return { ok: true, dir, created_at: data.created_at, files };
  } catch (e) {
    return { ok: false, error: e.message, files: [] };
  }
}

// 백업 폴더의 manifest 기준으로 원본 위치에 복구.
// 반환: { ok, restored, error }
export function restore(dir) {
  try {
    if (!dir) return { ok: false, restored: 0, error: "백업 폴더를 지정해 주세요" };
    const mf = path.join(dir, "manifest.json");
    if (!existsSync(mf)) return { ok: false, restored: 0, error: "manifest.json 없음" };
    const data = JSON.parse(readFileSync(mf, "utf8"));
    let restored = 0;
    const overwritten = []; // 지금 있고 내용이 다른 파일을 덮어쓴 경우 보고(undo가 미리 경고했어야 함)
    // [2026-08-20 발견] copyFileSync가 파일 하나(예: 그 사이 폴더가 지워짐)에서 실패하면 예전엔
    // try/catch 밖이라 함수 전체가 바깥 catch로 튕겨나가 "restored: 0"으로 보고됐다 — 그 앞서
    // 이미 실제로 복구된 파일이 있어도 "0개 복구"라고 거짓 보고하는 결함. restorePlan()·
    // cleanupBackups()가 이미 쓰는 "파일 하나 실패해도 나머지는 계속" 패턴으로 통일한다.
    const failed = [];
    // [2026-09-01 발견] 백업 파일 자체가 없는 경우(restorePlan()의 "nobackup") 조용히 건너뛰기만
    // 하고 어디에도 기록이 안 남아, 여러 파일 중 일부가 이 상태면 "N개 복구했다"는 보고만 보고는
    // 정확히 몇 개가 왜 빠졌는지 알 수 없었다. failed와 구분되는 skipped로 정직하게 보고한다.
    const skipped = [];
    for (const f of data.files || []) {
      if (!existsSync(f.backup)) { skipped.push(f.source); continue; }
      try {
        if (existsSync(f.source) && !readFileSync(f.backup).equals(readFileSync(f.source))) {
          overwritten.push(f.source);
        }
        copyFileSync(f.backup, f.source);
        restored++;
      } catch (e) {
        failed.push({ source: f.source, error: e.message });
      }
    }
    return { ok: true, restored, overwritten, failed, skipped };
  } catch (e) {
    return { ok: false, restored: 0, error: e.message };
  }
}

// 오래된 백업 정리(보수적): 최근 keepN개·keepDays일 이내는 무조건 보존, 그보다 오래된 것만 삭제.
// [2026-07-03 U4 변경] 원래 "자동 실행하지 않는다"였으나, 타깃 사용자(완전 초보자)는 CLI --cleanup을
// 절대 돌리지 않아 12일 만에 3,542개 누적 실측 → 수동 전용 = 사실상 정리 없음. backupPaths 성공 직후
// 보수적 기본값(최근 100개·30일 보존·회당 200개 상한)으로 자동 호출한다. 수동 CLI는 그대로 유지.
// opts: { rootDir?: 테스트 격리용 루트, maxRemove?: 회당 삭제 상한 }
export function cleanupBackups(keepN = 50, keepDays = 14, opts = {}) {
  try {
    const root = opts.rootDir || backupsRoot();
    const maxRemove = Number.isFinite(opts.maxRemove) ? opts.maxRemove : Infinity;
    if (!existsSync(root)) return { ok: true, removed: 0, kept: 0 };
    const rootAbs = path.resolve(root);
    const names = readdirSync(root)
      .filter((d) => {
        try {
          return statSync(path.join(root, d)).isDirectory();
        } catch {
          return false;
        }
      })
      .sort()
      .reverse(); // 최신순
    const cutoffMs = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    let removed = 0;
    let kept = 0;
    for (let idx = 0; idx < names.length; idx++) {
      const dir = path.join(root, names[idx]);
      // 격리 방어: 백업 루트 밖 경로는 절대 삭제하지 않는다(.. 등 비정상 이름 대비 이중 확인)
      if (!path.resolve(dir).startsWith(rootAbs + path.sep)) {
        kept++;
        continue;
      }
      let mtime = 0;
      try {
        mtime = statSync(dir).mtimeMs;
      } catch {}
      // 최근 keepN개 이내 또는 keepDays일 이내 → 보존. 상한 도달 시 나머지는 다음 기회에.
      if (idx < keepN || mtime >= cutoffMs || removed >= maxRemove) {
        kept++;
        continue;
      }
      try {
        rmSync(dir, { recursive: true, force: true });
        removed++;
      } catch {
        kept++;
      }
    }
    return { ok: true, removed, kept };
  } catch (e) {
    return { ok: false, removed: 0, error: e.message };
  }
}

// [2026-07-03 U4] 사용자 보존 정책(~/.sodamharness/safety-rules.json 의 backupPolicy) — 없거나 깨지면 보수적 기본값.
// 최소 바닥(keepN≥10·keepDays≥7)을 강제해, 실수로 0을 넣어 백업이 전멸하는 사고를 막는다(fail-safe).
function readBackupPolicy() {
  const def = { keepN: 100, keepDays: 30 };
  try {
    const f = process.env.SODAM_RULES_FILE || path.join(baseDir(), "safety-rules.json");
    if (!existsSync(f)) return def;
    const p = (JSON.parse(readFileSync(f, "utf8")) || {}).backupPolicy || {};
    return {
      keepN: Number.isFinite(p.keepN) && p.keepN >= 10 ? p.keepN : def.keepN,
      keepDays: Number.isFinite(p.keepDays) && p.keepDays >= 7 ? p.keepDays : def.keepDays,
    };
  } catch {
    return def;
  }
}

// CLI 직접 실행 지원: --list [N] [폴더] | --plan <폴더> | --restore <폴더> | --cleanup [keepN] [keepDays]
// (안전: --restore는 반드시 폴더 지정. 옛 "맹목 최근 복구"는 폐기됨)
// --list에 [폴더]를 추가로 주면 그 폴더(하위 포함) 파일을 백업한 항목만 넓은 창에서 찾는다
// (다른 프로젝트 활동에 밀려 안 보이는 문제의 대응책 — 사용법: --list 8 "<폴더>").
const invokedDirect =
  typeof process.argv[1] === "string" && process.argv[1].endsWith("backup.mjs");
if (invokedDirect) {
  const arg = process.argv[2];
  if (arg === "--list") {
    const n = parseInt(process.argv[3], 10);
    const folder = process.argv[4];
    const opts = folder ? { pathPrefix: folder } : {};
    console.log(JSON.stringify(listBackups(Number.isFinite(n) ? n : 8, opts), null, 2));
  } else if (arg === "--latest") {
    console.log(JSON.stringify(latestBackup(), null, 2));
  } else if (arg === "--plan") {
    console.log(JSON.stringify(restorePlan(process.argv[3]), null, 2));
  } else if (arg === "--restore") {
    const dir = process.argv[3];
    if (!dir) {
      console.log(
        JSON.stringify(
          { ok: false, error: "백업 폴더를 지정해 주세요 (먼저 node backup.mjs --list 로 확인)" },
          null,
          2,
        ),
      );
    } else {
      console.log(JSON.stringify(restore(dir), null, 2));
    }
  } else if (arg === "--cleanup") {
    // 최소 바닥(keepN≥10·keepDays≥7) — readBackupPolicy()가 자동 정리 경로는 이미 이 바닥을
    // 강제하지만, CLI로 cleanupBackups()를 직접 호출하는 이 경로는 무방비였다(2026-08-19 발견:
    // `--cleanup 0 0`을 격리 테스트로 재현하면 문서화된 "실수로 0 넣어도 안전"과 달리 백업이
    // 전멸함을 확인). cleanupBackups() 자체는 테스트 등 내부 호출에서 낮은 값을 의도적으로 쓰므로
    // 건드리지 않고, 여기(CLI 입력 경계)에서만 readBackupPolicy()와 동일한 바닥을 적용한다.
    // 폴백값은 readBackupPolicy()의 실제 기본 정책(keepN=100·keepDays=30)과 일치시킨다
    // (2026-08-19: 여기서 임의로 50/14를 썼다가 실제 백업 폴더에 그 값이 적용돼, 문서화된
    // 기본 30일 보존보다 짧게 잘려나간 사고가 있었음 — 반드시 한 곳의 기준만 따르게 함).
    let keepN = parseInt(process.argv[3], 10);
    let keepDays = parseInt(process.argv[4], 10);
    if (!Number.isFinite(keepN) || keepN < 10) keepN = 100;
    if (!Number.isFinite(keepDays) || keepDays < 7) keepDays = 30;
    console.log(
      JSON.stringify(
        cleanupBackups(keepN, keepDays),
        null,
        2,
      ),
    );
  } else {
    console.log(
      "사용법: node backup.mjs --list [N] [폴더] | --plan <백업폴더> | --restore <백업폴더> | --cleanup [keepN] [keepDays]",
    );
  }
}
