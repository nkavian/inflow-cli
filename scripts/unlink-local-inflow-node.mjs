#!/usr/bin/env node
/**
 * Remove the local-inflow-node override block written by
 * `link-local-inflow-node.mjs` from `pnpm-workspace.yaml`, then reinstall
 * so the registry-resolved versions take effect.
 *
 * Also scrubs any leftover entries from earlier script revisions that
 * wrote to `package.json` (top-level `overrides` or legacy `pnpm.overrides`).
 */
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_PKG_JSON = path.join(REPO_ROOT, 'package.json');
const WORKSPACE_YAML = path.join(REPO_ROOT, 'pnpm-workspace.yaml');
const LINKED = ['@inflowpayai/x402', '@inflowpayai/x402-buyer'];

const BEGIN_MARK = '# >>> link-local-inflow-node:overrides';
const END_MARK = '# <<< link-local-inflow-node:overrides';

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', cwd: REPO_ROOT, ...opts });
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} ${args.join(' ')} exited ${code ?? 'null'}`));
    });
    child.on('error', reject);
  });
}

async function stripFromWorkspaceYaml() {
  const existing = await fs.readFile(WORKSPACE_YAML, 'utf-8');
  const re = new RegExp(
    `\\n?${escapeRe(BEGIN_MARK)}[\\s\\S]*?${escapeRe(END_MARK)}\\n?`,
    'g',
  );
  const next = existing.replace(re, '\n').replace(/\n{3,}/g, '\n\n');
  if (next !== existing) {
    await fs.writeFile(WORKSPACE_YAML, next, 'utf-8');
    return true;
  }
  return false;
}

async function stripFromPackageJson() {
  const raw = await fs.readFile(ROOT_PKG_JSON, 'utf-8');
  const manifest = JSON.parse(raw);
  let mutated = false;
  for (const branch of ['overrides', 'pnpm']) {
    const overridesObj =
      branch === 'overrides' ? manifest.overrides : manifest.pnpm?.overrides;
    if (overridesObj === undefined) continue;
    for (const name of LINKED) {
      if (overridesObj[name] !== undefined) {
        delete overridesObj[name];
        mutated = true;
      }
    }
    if (Object.keys(overridesObj).length === 0) {
      if (branch === 'overrides') {
        delete manifest.overrides;
      } else {
        delete manifest.pnpm.overrides;
        if (Object.keys(manifest.pnpm).length === 0) delete manifest.pnpm;
      }
    }
  }
  if (mutated) {
    await fs.writeFile(ROOT_PKG_JSON, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
  }
  return mutated;
}

const yamlChanged = await stripFromWorkspaceYaml();
const pkgChanged = await stripFromPackageJson();

if (!yamlChanged && !pkgChanged) {
  process.stdout.write('unlink-local-inflow-node: no link overrides present; nothing to remove.\n');
} else {
  process.stdout.write(`unlink-local-inflow-node: cleared overrides for ${LINKED.join(', ')}.\n`);
}

await run('pnpm', ['install']);
process.stdout.write('unlink-local-inflow-node: done.\n');
