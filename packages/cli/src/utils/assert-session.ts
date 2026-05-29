import { type AuthStorage, hasSession, type Inflow } from '@inflowpayai/inflow-core';
import { Errors, type MiddlewareHandler } from 'incur';

interface SessionErrorOptions {
  code: string;
  message: string;
  cta?: { commands: { command: string; description: string }[] };
}

export const MISSING_SESSION_ERROR: SessionErrorOptions = {
  code: 'NOT_AUTHENTICATED',
  message: 'Not authenticated. Run "inflow auth login" first.',
  cta: {
    commands: [{ command: 'auth login', description: 'Log in to InFlow' }],
  },
};

export function assertSession(storage: AuthStorage, inflow: Inflow): MiddlewareHandler {
  return (c, next) => {
    if (!hasSession(storage, () => inflow.hasApiKey())) {
      return c.error(MISSING_SESSION_ERROR);
    }
    return next();
  };
}

export function assertSessionGuard(
  c: { error: (err: SessionErrorOptions) => never },
  storage: AuthStorage,
  inflow: Inflow,
): void {
  if (hasSession(storage, () => inflow.hasApiKey())) return;
  c.error(MISSING_SESSION_ERROR);
  throw new Errors.IncurError({
    code: MISSING_SESSION_ERROR.code,
    message: MISSING_SESSION_ERROR.message,
  });
}
