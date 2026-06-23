// SoDamHarness — whitelist.mjs
// 세션 화이트리스트(07_AUDIT D1): "이 폴더에서 이런 작업은 이번 세션 동안 안 물어봐도 돼".
// 불변 규칙:
//   · deny(폴더/재귀 삭제·민감위치·치명)는 절대 화이트리스트 대상이 아니다(guard가 deny를 먼저 반환).
//   · 화이트리스트여도 백업은 항상 한다(신뢰=안 묻기지, 보호 해제가 아님 — guard에서 보장).
//   · 세션 한정(session_id 일치) + 12시간 자동 만료(잊은 신뢰가 영구로 남지 않게).
//   · 비밀값 저장 0 · 외부 전송 0 · 외부 코드 실행 0.

import { homedir } from "node:os";
import path from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const TTL_MS = 12 * 60 * 60 * 1000; // 12시간

function baseDir() {
  return path.join(homedir(), ".sodamharness");
}
function wlFile() {
  return process.env.SODAM_WHITELIST_FILE || path.join(baseDir(), "whitelist.json");
}
function pendingFile() {
  return process.env.SODAM_PENDING_FILE || path.join(baseDir(), "pending-trust.json");
}
function readJson(p) {
  try {
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
  } catch {
    return null;
  }
}
function writeJson(p, obj) {
  try {
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}
// 시각 의존(만료 계산) — 테스트는 SODAM_NOW_MS로 고정 가능
function nowMs() {
  const t = parseInt(process.env.SODAM_NOW_MS || "", 10);
  return Number.isFinite(t) ? t : Date.now();
}

// guard가 ask 직전, "무엇을 신뢰 후보로 둘지" 기록(세션·폴더·작업종류). 실패해도 ask 흐름엔 영향 없음.
export function recordPending(session_id, folder, opClass) {
  return writeJson(pendingFile(), {
    session_id: session_id || null,
    folder: String(folder || ""),
    opClass: String(opClass || ""),
    at: nowMs(),
  });
}

// 사용자 동의 시: 마지막 pending을 화이트리스트로 승격.
export function trustLast() {
  const p = readJson(pendingFile());
  if (!p || !p.folder || !p.opClass) return { ok: false, error: "최근에 물어본(확인한) 작업이 없어요." };
  const list = readJson(wlFile()) || [];
  list.push({
    session_id: p.session_id || null,
    folder: p.folder,
    opClass: p.opClass,
    created_at: nowMs(),
  });
  if (!writeJson(wlFile(), list)) return { ok: false, error: "화이트리스트 저장에 실패했어요." };
  return { ok: true, folder: p.folder, opClass: p.opClass };
}

// guard가 ask 전 확인: 이 (세션·폴더·작업)이 신뢰돼 있나? (만료·세션 불일치는 false)
export function isTrusted(session_id, folder, opClass) {
  const list = readJson(wlFile());
  if (!Array.isArray(list)) return false;
  const now = nowMs();
  const f = String(folder || "");
  const oc = String(opClass || "");
  return list.some(
    (e) =>
      e &&
      e.folder === f &&
      e.opClass === oc &&
      (e.session_id || null) === (session_id || null) &&
      typeof e.created_at === "number" &&
      now - e.created_at < TTL_MS,
  );
}

export function listWhitelist() {
  const l = readJson(wlFile());
  return Array.isArray(l) ? l : [];
}
export function clearWhitelist() {
  return writeJson(wlFile(), []);
}

// CLI: --trust-last | --list | --clear
const direct = typeof process.argv[1] === "string" && process.argv[1].endsWith("whitelist.mjs");
if (direct) {
  const arg = process.argv[2];
  if (arg === "--trust-last") console.log(JSON.stringify(trustLast(), null, 2));
  else if (arg === "--list") console.log(JSON.stringify(listWhitelist(), null, 2));
  else if (arg === "--clear") console.log(JSON.stringify({ ok: clearWhitelist() }, null, 2));
  else console.log("사용법: node whitelist.mjs --trust-last | --list | --clear");
}
