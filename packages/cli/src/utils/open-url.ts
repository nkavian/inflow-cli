import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

interface LaunchPlan {
  command: string;
  args: readonly string[];
}

function planFor(plat: NodeJS.Platform, url: string): LaunchPlan {
  if (plat === 'darwin') return { command: 'open', args: [url] };
  if (plat === 'win32') {
    return { command: 'cmd', args: ['/c', 'start', '""', url] };
  }
  return { command: 'xdg-open', args: [url] };
}

export function openUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return;
  }
  const plan = planFor(platform(), parsed.toString());
  try {
    const child = spawn(plan.command, [...plan.args], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } catch {
    // launcher absent or blocked; user falls back to copy-paste
  }
}
