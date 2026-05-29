import type { AuthStorage } from '../utils/storage.js';

/**
 * Returns true when a valid session exists from either of the supported credential modes:
 *
 * - An effective API key is present (caller answers via `hasApiKey()` — usually a thin wrapper around the cli/sdk's own
 *   credential registry that captures flag/env precedence).
 * - The on-disk credentials carry usable device-flow tokens (`storage.isAuthenticated()`).
 *
 * Decoupling from any specific `Resources` shape lets this predicate live in core; the CLI passes `() =>
 * resources.hasApiKey()`, but an SDK consumer can pass any equivalent callback.
 */
export function hasSession(storage: AuthStorage, hasApiKey: () => boolean): boolean {
  return hasApiKey() || storage.isAuthenticated();
}
