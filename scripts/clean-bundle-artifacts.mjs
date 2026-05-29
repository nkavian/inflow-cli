#!/usr/bin/env node
/**
 * Delete bundling and packaging artifacts that the toolchain occasionally
 * leaves behind. Three classes of pollution covered:
 *
 *   1. vitest config bundling — vite-node's `bundle-require` writes
 *      `<package>/vitest.config.ts.timestamp-<digits>-<hex>.mjs` next to
 *      the config and does not unlink it on clean exit (verified
 *      empirically). Accumulates across watch sessions.
 *   2. tsup config bundling — same `bundle-require` mechanism leaves
 *      `<package>/tsup.config.bundled_<hex>.mjs` when the build process
 *      can't unlink (slow FS, EPERM, watch races).
 *   3. pnpm install pre-flight — pnpm writes a short-lived `_tmp_<pid>_<hex>`
 *      probe at the workspace root and unlinks it after the FS check.
 *      Same EPERM/slow-FS conditions leave it behind.
 *
 * Wired three ways:
 *   - `posttest` in the root `package.json` (the common dev case).
 *   - `.husky/pre-commit` (catches leftovers from watch sessions).
 *
 * Per locked decision: these are NOT gitignored. The cleanup script is
 * the single source of truth, so the polluters can't grow unnoticed.
 *
 * Exits 0 on success; never blocks the parent command.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');

const PACKAGE_PATTERNS = [
  /^vitest\.config\.[^.]+\.timestamp-\d+-[a-f0-9]+\.mjs$/u,
  /^tsup\.config\.bundled_[A-Za-z0-9]+\.m?[cj]s$/u,
];
const ROOT_PATTERNS = [/^_tmp_\d+_[a-f0-9]+$/u];

async function listSubdirs(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

async function unlinkMatching(dir, patterns) {
  let count = 0;
  let entries;
  try {
    entries = await fs.readdir(dir);
  } catch {
    return 0;
  }
  for (const name of entries) {
    if (!patterns.some((re) => re.test(name))) continue;
    try {
      await fs.unlink(path.join(dir, name));
      count += 1;
    } catch {
      // Best-effort; never block the caller.
    }
  }
  return count;
}

let total = 0;
total += await unlinkMatching(ROOT, ROOT_PATTERNS);
const packageDirs = await listSubdirs(PACKAGES_DIR);
for (const dir of packageDirs) {
  total += await unlinkMatching(dir, PACKAGE_PATTERNS);
}
if (total > 0) {
  process.stdout.write(`clean-bundle-artifacts: deleted ${total.toString()} file(s)\n`);
}
