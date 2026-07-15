// SoDamHarness — profile.mjs
// 맞춤 마법사(안전강도 마법사)가 저장하는 사용자 선호(08 §1 정신: 판정은 데이터로).
// 불변 규칙: 이 파일의 값은 "ask가 얼마나 자주 뜨는지"만 조정한다.
//   deny(치명·민감위치·폴더재귀삭제)·백업은 어떤 값이어도 항상 그대로다(guard.mjs가 보장).
// 파일 없음/손상 → 항상 가장 안전한 기본값(L1=현재 동작과 100% 동일)으로 fail-safe.

import { homedir } from "node:os";
import path from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const LEVELS = ["L1", "L2", "L3"];
const DEFAULT_LEVEL = "L1";

function baseDir() {
  return path.join(homedir(), ".sodamharness");
}
function profileFile() {
  return process.env.SODAM_PROFILE_FILE || path.join(baseDir(), "profile.json");
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
// 시각 의존 — 테스트는 SODAM_NOW_MS로 고정 가능(whitelist.mjs와 동일 관례)
function nowIso() {
  const t = parseInt(process.env.SODAM_NOW_MS || "", 10);
  return new Date(Number.isFinite(t) ? t : Date.now()).toISOString();
}

// guard.mjs가 읽는 함수. 파일 없음/손상/모르는 값 → 전부 L1로 귀결(fail-safe).
export function getAutonomyLevel() {
  const p = readJson(profileFile());
  const lvl = p && typeof p.autonomy_level === "string" ? p.autonomy_level : DEFAULT_LEVEL;
  return LEVELS.includes(lvl) ? lvl : DEFAULT_LEVEL;
}

export function setAutonomyLevel(level) {
  if (!LEVELS.includes(level)) {
    return { ok: false, error: `잘못된 값이에요(${LEVELS.join("/")} 중 하나만 가능해요).` };
  }
  const ok = writeJson(profileFile(), { autonomy_level: level, updated_at: nowIso() });
  return ok ? { ok: true, autonomy_level: level } : { ok: false, error: "저장에 실패했어요." };
}

export function resetAutonomyLevel() {
  return setAutonomyLevel(DEFAULT_LEVEL);
}

// CLI: --set L1|L2|L3 | --get | --reset
const direct = typeof process.argv[1] === "string" && process.argv[1].endsWith("profile.mjs");
if (direct) {
  const arg = process.argv[2];
  if (arg === "--set") console.log(JSON.stringify(setAutonomyLevel(process.argv[3]), null, 2));
  else if (arg === "--get") console.log(JSON.stringify({ autonomy_level: getAutonomyLevel() }, null, 2));
  else if (arg === "--reset") console.log(JSON.stringify(resetAutonomyLevel(), null, 2));
  else console.log("사용법: node profile.mjs --set L1|L2|L3 | --get | --reset");
}
