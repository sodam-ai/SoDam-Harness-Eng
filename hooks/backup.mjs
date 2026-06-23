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
  return path.join(baseDir(), "backups");
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
export function listBackups(limit = 8) {
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
    const out = [];
    for (const name of dirs.slice(0, Math.max(1, limit))) {
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
      out.push(info);
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
    for (const f of data.files || []) {
      if (!existsSync(f.backup)) continue;
      try {
        if (existsSync(f.source) && !readFileSync(f.backup).equals(readFileSync(f.source))) {
          overwritten.push(f.source);
        }
      } catch {}
      copyFileSync(f.backup, f.source);
      restored++;
    }
    return { ok: true, restored, overwritten };
  } catch (e) {
    return { ok: false, restored: 0, error: e.message };
  }
}

// 오래된 백업 정리(보수적): 최근 keepN개·keepDays일 이내는 무조건 보존, 그보다 오래된 것만 삭제.
// 자동 실행하지 않는다(백업 자동삭제는 그 자체가 파괴적이라 사용자/진단이 명시 호출할 때만).
export function cleanupBackups(keepN = 50, keepDays = 14) {
  try {
    const root = backupsRoot();
    if (!existsSync(root)) return { ok: true, removed: 0, kept: 0 };
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
    names.forEach((name, idx) => {
      const dir = path.join(root, name);
      let mtime = 0;
      try {
        mtime = statSync(dir).mtimeMs;
      } catch {}
      // 최근 keepN개 이내 또는 keepDays일 이내 → 보존
      if (idx < keepN || mtime >= cutoffMs) {
        kept++;
        return;
      }
      try {
        rmSync(dir, { recursive: true, force: true });
        removed++;
      } catch {}
    });
    return { ok: true, removed, kept };
  } catch (e) {
    return { ok: false, removed: 0, error: e.message };
  }
}

// CLI 직접 실행 지원: --list [N] | --plan <폴더> | --restore <폴더> | --cleanup [keepN] [keepDays]
// (안전: --restore는 반드시 폴더 지정. 옛 "맹목 최근 복구"는 폐기됨)
const invokedDirect =
  typeof process.argv[1] === "string" && process.argv[1].endsWith("backup.mjs");
if (invokedDirect) {
  const arg = process.argv[2];
  if (arg === "--list") {
    const n = parseInt(process.argv[3], 10);
    console.log(JSON.stringify(listBackups(Number.isFinite(n) ? n : 8), null, 2));
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
    const keepN = parseInt(process.argv[3], 10);
    const keepDays = parseInt(process.argv[4], 10);
    console.log(
      JSON.stringify(
        cleanupBackups(
          Number.isFinite(keepN) ? keepN : 50,
          Number.isFinite(keepDays) ? keepDays : 14,
        ),
        null,
        2,
      ),
    );
  } else {
    console.log(
      "사용법: node backup.mjs --list [N] | --plan <백업폴더> | --restore <백업폴더> | --cleanup [keepN] [keepDays]",
    );
  }
}
