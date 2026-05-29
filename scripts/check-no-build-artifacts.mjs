#!/usr/bin/env node
/**
 * Pre-commit guard: fail if a `.turbo/` or `*.tsbuildinfo` path shows up in the staged changeset.
 *
 * Wired through `.husky/pre-commit`. Catches generated build artifacts that
 * occasionally get staged by `git add -A`. Those paths are gitignored in
 * theory but the staging-area-then-amend pattern can still pull them in.
 *
 * Exits 0 with nothing to do, 1 with a diagnostic, or skips silently if
 * the script is invoked outside a git checkout (e.g. via `npm pack`).
 */
import { execFileSync } from 'node:child_process';

const REJECT_PATTERNS = [
  /(^|\/)\.turbo\//u,
  /(^|\/)[^/]+\.tsbuildinfo$/u,
];

function getStagedPaths() {
  try {
    const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      encoding: 'utf8',
    });
    return out.split('\n').filter((line) => line.length > 0);
  } catch {
    return [];
  }
}

const staged = getStagedPaths();
const offenders = staged.filter((p) => REJECT_PATTERNS.some((re) => re.test(p)));

if (offenders.length > 0) {
  process.stderr.write(
    'pre-commit: refusing to commit generated build artifacts.\n' +
      'These paths matched a forbidden pattern (.turbo/, *.tsbuildinfo):\n' +
      offenders.map((p) => `  ${p}\n`).join('') +
      '\nRun `git restore --staged <path>` (or `git reset HEAD <path>`), confirm the\n' +
      'underlying files are gitignored, and re-commit.\n',
  );
  process.exit(1);
}
