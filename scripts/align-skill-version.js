#!/usr/bin/env node
/**
 * Aligns the published CLI version into every artifact that carries a `version` string we ship outside the package.json
 * itself:
 *
 * - Skills/agentic-payments/SKILL.md — YAML frontmatter `version:` line
 * - Plugins/inflow/.claude-plugin/plugin.json — Claude Code per-plugin manifest
 * - .codex-plugin/plugin.json — Codex top-level manifest
 * - Plugins/inflow/.codex-plugin/plugin.json — Codex per-plugin manifest
 *
 * Source of truth: packages/cli/package.json `version`.
 *
 * Idempotent: re-running emits no changes if every target already matches. Wired into the root `build` script so every
 * `pnpm build` runs it.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION_LINE_RE = /^version:\s*.+$/m;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestFile = resolve(repoRoot, 'packages/cli/package.json');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const version = manifest.version;

let touched = 0;

function rewriteSkill(relPath) {
  const file = resolve(repoRoot, relPath);
  const original = readFileSync(file, 'utf8');
  const rewritten = original.replace(VERSION_LINE_RE, `version: ${version}`);
  if (rewritten === original) {
    process.stdout.write(`align-skill-version: ${relPath} already at ${version}\n`);
    return;
  }
  writeFileSync(file, rewritten);
  touched++;
  process.stdout.write(`align-skill-version: ${relPath} updated to ${version}\n`);
}

function rewriteJsonVersion(relPath) {
  const file = resolve(repoRoot, relPath);
  const original = readFileSync(file, 'utf8');
  const parsed = JSON.parse(original);
  if (parsed.version === version) {
    process.stdout.write(`align-skill-version: ${relPath} already at ${version}\n`);
    return;
  }
  parsed.version = version;
  const rewritten = `${JSON.stringify(parsed, null, 2)}\n`;
  writeFileSync(file, rewritten);
  touched++;
  process.stdout.write(`align-skill-version: ${relPath} updated to ${version}\n`);
}

rewriteSkill('skills/agentic-payments/SKILL.md');
rewriteJsonVersion('plugins/inflow/.claude-plugin/plugin.json');
rewriteJsonVersion('.codex-plugin/plugin.json');
rewriteJsonVersion('plugins/inflow/.codex-plugin/plugin.json');

if (touched === 0) {
  process.stdout.write(`align-skill-version: all targets at ${version}\n`);
}
