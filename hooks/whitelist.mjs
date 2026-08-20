// SoDamHarness — whitelist.mjs
// 폴더 화이트리스트(07_AUDIT D1): "이 폴더에서 이런 작업은 안 물어봐도 돼".
// 불변 규칙:
//   · deny(폴더/재귀 삭제·민감위치·치명)는 절대 화이트리스트 대상이 아니다(guard가 deny를 먼저 반환).
//   · 화이트리스트여도 백업은 항상 한다(신뢰=안 묻기지, 보호 해제가 아님 — guard에서 보장).
//   · 폴더+작업종류 기준(세션 무관) + 12시간 자동 만료(잊은 신뢰가 영구로 남지 않게).
//     (2026-07-03 실측: session_id까지 맞춰야 하는 구조였는데, 세션을 자주 새로 여는
//      실제 작업 패턴과 부딪혀 신뢰가 사실상 매번 무효화되는 문제가 있어 폴더 기준으로 변경.)
//   · 비밀값 저장 0 · 외부 전송 0 · 외부 코드 실행 0.

import { homedir } from "node:os";
import path from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const TTL_MS = 12 * 60 * 60 * 1000; // 12시간
// [2026-08-20 발견] pending은 session_id 무관(위 6~8행 이유)이라, "방금 이 세션에서 물어본 것"이 아니라
// 며칠 전 다른 세션에서 응답 안 하고 남겨둔 낡은 pending도 그대로 승격될 수 있었다(trustLast()가 나이를
// 전혀 안 봄 — 격리 테스트 중 실제로 재현: 무관한 옛 세션의 delete pending이 승격됨). 세션-무관 정책은
// 유지하되(그게 P3의 목적), "방금 물어본 것에 대한 응답"이라는 전제만 지킨다 — 실제 대화 흐름에서
// 물어보고 답하는 데 걸리는 시간보다 넉넉하게 잡아 정상 사용은 절대 막지 않는다.
const PENDING_FRESH_MS = 30 * 60 * 1000; // 30분

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

// guard가 ask 직전, "무엇을 신뢰 후보로 둘지" 기록(폴더·작업종류). session_id는 감사용 기록일 뿐
// 신뢰 판정(isTrusted)에는 더 이상 쓰이지 않는다. 실패해도 ask 흐름엔 영향 없음.
export function recordPending(session_id, folder, opClass) {
  return writeJson(pendingFile(), {
    session_id: session_id || null, // 감사용(누가 마지막으로 물어봤는지) — 매칭 키 아님
    folder: String(folder || ""),
    opClass: String(opClass || ""),
    at: nowMs(),
  });
}

// 사용자 동의 시: 마지막 pending을 화이트리스트로 승격.
export function trustLast() {
  const p = readJson(pendingFile());
  if (!p || !p.folder || !p.opClass) return { ok: false, error: "최근에 물어본(확인한) 작업이 없어요." };
  if (typeof p.at !== "number" || nowMs() - p.at > PENDING_FRESH_MS) {
    return { ok: false, error: "그 확인이 너무 오래돼서(30분 지남) 다시 물어봐야 해요. 방금 물어본 작업이 있을 때만 신뢰할 수 있어요." };
  }
  const list = readJson(wlFile()) || [];
  list.push({
    session_id: p.session_id || null, // 감사용 기록 — 매칭엔 안 씀
    folder: p.folder,
    opClass: p.opClass,
    created_at: nowMs(),
  });
  if (!writeJson(wlFile(), list)) return { ok: false, error: "화이트리스트 저장에 실패했어요." };
  return { ok: true, folder: p.folder, opClass: p.opClass };
}

// guard가 ask 전 확인: 이 (폴더·작업)이 신뢰돼 있나? (만료만 확인, 세션은 무관)
// ttlMs: 맞춤 마법사(profile.mjs autonomy_level L2/L3)가 신뢰 유지 기간을 늘릴 때 넘김.
//   생략하면 기본 12시간(TTL_MS) 그대로 — 마법사를 안 쓴 기존 동작과 100% 동일.
export function isTrusted(session_id, folder, opClass, ttlMs) {
  const list = readJson(wlFile());
  if (!Array.isArray(list)) return false;
  const now = nowMs();
  const f = String(folder || "");
  const oc = String(opClass || "");
  const ttl = typeof ttlMs === "number" && ttlMs > 0 ? ttlMs : TTL_MS;
  return list.some(
    (e) =>
      e &&
      e.folder === f &&
      e.opClass === oc &&
      typeof e.created_at === "number" &&
      now - e.created_at < ttl,
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
