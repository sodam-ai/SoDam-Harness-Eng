// SoDamHarness — activity.mjs
// 활동 기록(Phase 2, P2-A): "AI가 방금 무엇을 했는지" 쉬운 타임라인. PostToolUse 훅(실행 후 기록).
// 불변 규칙(보안 1순위):
//   · 명령 '원문'·파일 '내용'은 절대 기록하지 않는다(토큰 누출 방지, §8.3/§8.5).
//   · 기록은 동사(첫 단어) + 파일 '이름'만. 비밀로 보이는 이름은 마스킹.
//   · 외부 전송 0 · 외부 코드 실행 0 · eval 0. 실패해도 도구 흐름을 방해하지 않는다(조용히 종료).

import { homedir } from "node:os";
import path from "node:path";
import {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { isSecretFile } from "./backup.mjs";
import { relativeAgo } from "./backup.mjs";

function baseDir() {
  return path.join(homedir(), ".sodamharness");
}
function logFile() {
  return process.env.SODAM_ACTIVITY_FILE || path.join(baseDir(), "activity.log");
}
const MAX_BYTES = 512 * 1024; // 512KB 초과 시 최근 1000줄만 유지
function nowMs() {
  const t = parseInt(process.env.SODAM_NOW_MS || "", 10);
  return Number.isFinite(t) ? t : Date.now();
}

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}
function baseName(p) {
  return String(p || "").split(/[\\/]/).filter(Boolean).pop() || "";
}
// 비밀로 보이는 이름은 가린다(파일명도 단서가 될 수 있음)
function maskName(n) {
  try {
    return isSecretFile(n) ? "(비밀파일)" : n;
  } catch {
    return n;
  }
}

// 도구 입력 → 안전 요약(원문·내용 없이). 반환 예: { action:"파일 수정", target:"index.html" }
export function summarize(toolName, ti) {
  ti = ti || {};
  if (["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(toolName)) {
    let f = ti.file_path || ti.path || ti.notebook_path || "";
    if (!f && Array.isArray(ti.edits) && ti.edits[0]) f = ti.edits[0].file_path || "";
    return { action: toolName === "Write" ? "파일 만들기/덮어쓰기" : "파일 고치기", target: maskName(baseName(f)) };
  }
  if (typeof ti.command === "string" && ti.command) {
    const verb = ti.command.trim().split(/\s+/)[0] || "명령"; // 첫 단어만(원문·인자·토큰 기록 안 함)
    return { action: "명령 실행", target: maskName(baseName(verb)) };
  }
  return { action: toolName || "작업", target: "" };
}

// 한 줄 기록 추가(JSONL). 실패해도 조용히 무시.
export function record(entry) {
  try {
    const f = logFile();
    mkdirSync(path.dirname(f), { recursive: true });
    // 크기 상한: 너무 크면 최근 1000줄만 남기고 재작성
    try {
      if (existsSync(f) && statSync(f).size > MAX_BYTES) {
        const lines = readFileSync(f, "utf8").split("\n").filter(Boolean);
        writeFileSync(f, lines.slice(-1000).join("\n") + "\n", "utf8");
      }
    } catch {}
    appendFileSync(f, JSON.stringify(entry) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

// 최근 활동 목록(최신순) — /sodam-harness:log 가 사용. 각 항목에 "N분 전"(ago) 포함.
export function listActivity(limit = 20) {
  try {
    const f = logFile();
    if (!existsSync(f)) return [];
    const lines = readFileSync(f, "utf8").split("\n").filter(Boolean);
    const out = [];
    for (const line of lines.slice(-Math.max(1, limit)).reverse()) {
      try {
        const e = JSON.parse(line);
        out.push({ ...e, ago: relativeAgo(e.at) });
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

// PostToolUse 훅으로 호출됐을 때: stdin JSON을 읽어 안전 요약을 기록(출력 없음, 항상 exit 0).
function runHook() {
  try {
    const input = JSON.parse(readStdin() || "{}");
    const summary = summarize(input.tool_name || "", input.tool_input || {});
    record({ at: nowMs(), session_id: input.session_id || null, ...summary });
  } catch {
    /* 기록 실패는 무시 — 도구 흐름을 막지 않는다 */
  }
  process.exit(0);
}

// CLI: --list [N]  (직접 실행) / 그 외(파이프 입력) = PostToolUse 훅
const direct = typeof process.argv[1] === "string" && process.argv[1].endsWith("activity.mjs");
if (direct) {
  if (process.argv[2] === "--list") {
    const n = parseInt(process.argv[3], 10);
    console.log(JSON.stringify(listActivity(Number.isFinite(n) ? n : 20), null, 2));
  } else {
    runHook(); // 인자 없음 = 훅 모드(stdin 처리)
  }
}
