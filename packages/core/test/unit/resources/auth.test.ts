import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { InflowApiError, InflowConfigurationError } from '../../../src/errors.js';
import { AuthResource } from '../../../src/resources/auth.js';
import {
  BASE_URL,
  deviceCodeHappy,
  deviceCode400,
  deviceTokenSuccess,
  deviceTokenPending,
  deviceTokenSlowDown,
  deviceTokenExpired,
  deviceTokenDenied,
  deviceTokenUnsupported,
  refreshSuccess,
  refreshFail,
  revokeSuccess,
  revokeServerError,
} from '../fixtures/handlers.js';
import { makeServer } from '../fixtures/server.js';

const server = makeServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeResource(): AuthResource {
  return new AuthResource({
    apiBaseUrl: BASE_URL,
    authBaseUrl: BASE_URL,
    cliClientId: 'test-client',
  });
}

describe('AuthResource — initiateDeviceAuth', () => {
  it('normalizes wire to verification_url + verification_url_complete', async () => {
    server.use(deviceCodeHappy);
    const r = makeResource();
    const result = await r.initiateDeviceAuth();
    expect(result).toEqual({
      device_code: 'dev-code-1',
      user_code: 'BCDF-GHJK',
      verification_url: `${BASE_URL}/device/`,
      verification_url_complete: `${BASE_URL}/device/?code=BCDF-GHJK`,
      expires_in: 600,
      interval: 5,
    });
  });

  it('throws InflowApiError on 400', async () => {
    server.use(deviceCode400);
    const r = makeResource();
    await expect(r.initiateDeviceAuth()).rejects.toBeInstanceOf(InflowApiError);
  });

  it('throws InflowConfigurationError when cliClientId missing', async () => {
    const r = new AuthResource({
      apiBaseUrl: BASE_URL,
      authBaseUrl: BASE_URL,
    });
    await expect(r.initiateDeviceAuth()).rejects.toBeInstanceOf(InflowConfigurationError);
  });
});

describe('AuthResource — pollDeviceAuth', () => {
  it('returns tokens on success', async () => {
    server.use(deviceTokenSuccess);
    const r = makeResource();
    const tokens = await r.pollDeviceAuth('d');
    expect(tokens?.access_token).toBe('access-1');
    expect(tokens?.refresh_token).toBe('refresh-1');
    expect(tokens?.scope).toBe('balances:read');
  });

  it('returns null on authorization_pending', async () => {
    server.use(deviceTokenPending);
    const r = makeResource();
    expect(await r.pollDeviceAuth('d')).toBeNull();
  });

  it('returns null on slow_down', async () => {
    server.use(deviceTokenSlowDown);
    const r = makeResource();
    expect(await r.pollDeviceAuth('d')).toBeNull();
  });

  it('throws InflowApiError with code expired_token', async () => {
    server.use(deviceTokenExpired);
    const r = makeResource();
    await expect(r.pollDeviceAuth('d')).rejects.toMatchObject({
      code: 'expired_token',
    });
  });

  it('throws InflowApiError with code access_denied', async () => {
    server.use(deviceTokenDenied);
    const r = makeResource();
    await expect(r.pollDeviceAuth('d')).rejects.toMatchObject({
      code: 'access_denied',
    });
  });

  it('throws on unknown 400 error code', async () => {
    server.use(deviceTokenUnsupported);
    const r = makeResource();
    await expect(r.pollDeviceAuth('d')).rejects.toBeInstanceOf(InflowApiError);
  });
});

describe('AuthResource — refreshToken', () => {
  it('returns the new token pair', async () => {
    server.use(refreshSuccess);
    const r = makeResource();
    const tokens = await r.refreshToken('refresh-1');
    expect(tokens.access_token).toBe('access-2');
    expect(tokens.refresh_token).toBe('refresh-2');
  });

  it('throws InflowApiError on invalid_grant', async () => {
    server.use(refreshFail);
    const r = makeResource();
    await expect(r.refreshToken('bad')).rejects.toBeInstanceOf(InflowApiError);
  });
});

describe('AuthResource — revokeToken', () => {
  it('does not throw on success', async () => {
    server.use(revokeSuccess);
    const r = makeResource();
    await expect(r.revokeToken('tk')).resolves.toBeUndefined();
  });

  it('swallows non-2xx server response (best-effort)', async () => {
    server.use(revokeServerError);
    const r = makeResource();
    await expect(r.revokeToken('tk')).resolves.toBeUndefined();
  });
});
