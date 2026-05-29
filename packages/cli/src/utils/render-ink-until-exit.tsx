import { render } from 'ink';
import type React from 'react';

export async function renderInkUntilExit(element: React.ReactElement): Promise<void>;
export async function renderInkUntilExit<T>(
  element: React.ReactElement,
  resolveResult: () => T | Promise<T>,
): Promise<T>;
export async function renderInkUntilExit<T>(
  element: React.ReactElement,
  resolveResult?: () => T | Promise<T>,
): Promise<T | undefined> {
  const instance = render(element);
  await instance.waitUntilExit();
  return resolveResult ? resolveResult() : undefined;
}
