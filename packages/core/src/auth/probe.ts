import { InflowApiError, InflowTransportError } from '../errors.js';
import type { IUserResource } from '../resources/interfaces.js';
import type { User } from '../types/index.js';

export type ProbeOutcome =
  | { ok: true; user: User }
  | { ok: false; reason: 'unauthenticated' }
  | { ok: false; reason: 'timeout' }
  | { ok: false; reason: 'other'; error: unknown };

export interface ProbeSessionOptions {
  timeoutMs: number;
}

/**
 * Bounded health check used by the TTY `auth login` pre-flow. Threads an `AbortController` into `userResource.retrieve`
 * so the underlying fetch is actually cancelled when the timer fires, not just discarded by the caller. A 401 from the
 * server collapses to `unauthenticated`; any other thrown error collapses to `other` (with the original error
 * attached).
 */
export async function probeSession(userResource: IUserResource, options: ProbeSessionOptions): Promise<ProbeOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const user = await userResource.retrieve({ signal: controller.signal });
    return { ok: true, user };
  } catch (error) {
    if (controller.signal.aborted) {
      return { ok: false, reason: 'timeout' };
    }
    if (error instanceof InflowApiError && error.status === 401) {
      return { ok: false, reason: 'unauthenticated' };
    }
    if (error instanceof InflowTransportError && error.cause instanceof Error && error.cause.name === 'AbortError') {
      return { ok: false, reason: 'timeout' };
    }
    return { ok: false, reason: 'other', error };
  } finally {
    clearTimeout(timer);
  }
}
