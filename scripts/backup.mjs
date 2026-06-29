#!/usr/bin/env node
/**
 * SoDamHarness :: backup.mjs — 백업 API
 * 모든 형제 플러그인(Context, Loop, Reverse)이 이 함수를 import해 사용한다.
 * 계약서: SoDamAgentic/docs/api-contracts/harness-backup-api.md
 *
 * 불변 규칙:
 * 1. 절대 throw 하지 않음 — 항상 { success, error? } 반환
 * 2. 백업 폴더에 비밀값 저장 금지
 * 3. 복구 전 현재 파일 임시 백업 (중첩 보호)
 * 4. backupId = 타임스탬프 + random suffix
 * 5. 비동기(async) 전용 — 동기 차단 금지
 */
import { cpSync, mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname, basename, relative, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import os from 'node:os';

const HARNESS_ROOT = join(os.homedir(), '.sodamharness');
const BACKUPS_DIR = join(HARNESS_ROOT, 'backups');
const SETTINGS_PATH = join(HARNESS_ROOT, 'settings.json');

function ensureDirs() {
  try {
    mkdirSync(BACKUPS_DIR, { recursive: true });
  } catch {}
}

function nowIso() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
}

function fileHash(filePath) {
  try {
    return createHash('sha256').update(readFileSync(filePath)).digest('hex');
  } catch {
    return '';
  }
}

function readSettings() {
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {
    return { version: '0.1.0', lastBackup: null, totalBackups: 0, registeredSiblings: [] };
  }
}

function writeSettings(s) {
  try {
    ensureDirs();
    writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2), 'utf8');
  } catch {}
}

/**
 * 위험 작업 직전 파일을 백업한다.
 * @param {string[]} filePaths 백업할 파일 경로 배열 (절대경로)
 * @param {string} workingDir 현재 작업 폴더
 */
export async function createBackup(filePaths, workingDir = process.cwd()) {
  try {
    ensureDirs();
    const timestamp = nowIso();
    const suffix = randomBytes(3).toString('hex');
    const backupId = `${timestamp}-${suffix}`;
    const backupDir = join(BACKUPS_DIR, backupId);
    const filesDir = join(backupDir, 'files');

    mkdirSync(filesDir, { recursive: true });

    const backed = [];
    for (const fp of filePaths) {
      if (!fp || !existsSync(fp)) continue;
      const hash = fileHash(fp);
      const dest = join(filesDir, basename(fp));
      copyFileSync(fp, dest);
      backed.push({ originalPath: fp, backupPath: dest, hash });
    }

    const metadata = {
      backupId,
      timestamp: new Date().toISOString(),
      workingDir,
      files: backed,
      hash: createHash('sha256').update(JSON.stringify(backed)).digest('hex'),
    };
    writeFileSync(join(backupDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');

    const s = readSettings();
    s.lastBackup = metadata.timestamp;
    s.totalBackups = (s.totalBackups || 0) + 1;
    writeSettings(s);

    return { backupId, timestamp: metadata.timestamp, hash: metadata.hash, success: true };
  } catch (e) {
    return { backupId: '', timestamp: '', hash: '', success: false, error: `백업 실패: ${e.message}` };
  }
}

/**
 * 백업 목록을 반환한다.
 * @param {string} [workingDir] 지정 시 해당 폴더 백업만 필터
 */
export async function listBackups(workingDir) {
  try {
    ensureDirs();
    if (!existsSync(BACKUPS_DIR)) return { backups: [], success: true };

    const entries = readdirSync(BACKUPS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const metaPath = join(BACKUPS_DIR, d.name, 'metadata.json');
        if (!existsSync(metaPath)) return null;
        try {
          const m = JSON.parse(readFileSync(metaPath, 'utf8'));
          return {
            backupId: m.backupId,
            timestamp: m.timestamp,
            originalPaths: (m.files || []).map(f => f.originalPath),
            description: `${m.files?.length || 0}개 파일 백업 (${m.workingDir})`,
            workingDir: m.workingDir,
          };
        } catch { return null; }
      })
      .filter(Boolean);

    const filtered = workingDir
      ? entries.filter(e => e.workingDir === workingDir)
      : entries;

    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { backups: filtered, success: true };
  } catch (e) {
    return { backups: [], success: false, error: `목록 조회 실패: ${e.message}` };
  }
}

/**
 * 사용자가 선택한 백업을 원본 경로로 복구한다.
 * 복구 전 현재 파일을 임시 백업 (중첩 보호).
 * @param {string} backupId listBackups()가 반환한 backupId
 */
export async function restoreBackup(backupId) {
  try {
    const backupDir = join(BACKUPS_DIR, backupId);
    const metaPath = join(backupDir, 'metadata.json');
    if (!existsSync(metaPath)) {
      return { success: false, restoredPaths: [], error: `백업을 찾을 수 없습니다: ${backupId}` };
    }

    const metadata = JSON.parse(readFileSync(metaPath, 'utf8'));
    const tempBackupResult = await createBackup(
      metadata.files.map(f => f.originalPath).filter(p => existsSync(p)),
      metadata.workingDir
    );

    const restoredPaths = [];
    for (const fileInfo of metadata.files) {
      if (!existsSync(fileInfo.backupPath)) continue;
      const destDir = dirname(fileInfo.originalPath);
      mkdirSync(destDir, { recursive: true });
      copyFileSync(fileInfo.backupPath, fileInfo.originalPath);
      restoredPaths.push(fileInfo.originalPath);
    }

    return { success: true, restoredPaths, tempBackupId: tempBackupResult.backupId };
  } catch (e) {
    return { success: false, restoredPaths: [], error: `복구 실패: ${e.message}` };
  }
}

/**
 * 형제 플러그인이 설치되어 있는지 확인한다.
 * @param {string} siblingName
 */
export function isFamilyAlive(siblingName) {
  try {
    const s = readSettings();
    if (Array.isArray(s.registeredSiblings) && s.registeredSiblings.includes(siblingName)) return true;
    const pluginPaths = {
      SoDamHarness: join(os.homedir(), '.claude', 'plugins', 'sodam-harness'),
      SoDamContext: join(os.homedir(), '.claude', 'plugins', 'sodam-context'),
      SoDamLoop: join(os.homedir(), '.claude', 'plugins', 'sodam-loop'),
      SoDamAgentic: join(os.homedir(), '.claude', 'plugins', 'sodam-agentic'),
      SoDamPrompt: join(os.homedir(), '.claude', 'plugins', 'sodam-prompt'),
      SoDamReverse: join(os.homedir(), '.claude', 'plugins', 'sodam-reverse'),
    };
    const path = pluginPaths[siblingName];
    return path ? existsSync(join(path, 'plugin.json')) : false;
  } catch {
    return false;
  }
}

// CLI 직접 실행 지원: node scripts/backup.mjs --list / --restore <id>
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1]?.replace(/\\/g, '/') === import.meta.url.replace('file:///', '')) {
  const [,, cmd, arg] = process.argv;
  if (cmd === '--list') {
    const { backups } = await listBackups();
    if (!backups.length) { console.log('백업이 없습니다.'); }
    else backups.forEach((b, i) => console.log(`[${i + 1}] ${b.backupId}  ${b.timestamp}  ${b.description}`));
  } else if (cmd === '--restore' && arg) {
    const r = await restoreBackup(arg);
    console.log(r.success ? `✅ 복구 완료: ${r.restoredPaths.join(', ')}` : `❌ ${r.error}`);
  } else {
    console.log('사용법: node scripts/backup.mjs --list | --restore <backupId>');
  }
}
