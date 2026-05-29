import { mkdtempSync, statSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AuthTokens } from '../../../src/types/index.js';
import { MemoryStorage, Storage } from '../../../src/utils/storage.js';

const sampleAuth: AuthTokens = {
  access_token: 'a',
  refresh_token: 'r',
  token_type: 'Bearer',
  expires_in: 3600,
};

describe('Storage (file-backed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'inflow-core-storage-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes the credential file with 0o600 permissions', () => {
    const s = new Storage({ cwd: tmpDir });
    s.setAuth(sampleAuth);
    const path = s.getPath();
    const mode = statSync(path).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('round-trips auth via setAuth/getAuth with computed expires_at', () => {
    const s = new Storage({ cwd: tmpDir });
    const before = Date.now();
    s.setAuth(sampleAuth);
    const got = s.getAuth();
    expect(got).not.toBeNull();
    expect(got?.access_token).toBe('a');
    expect(got?.expires_at).toBeGreaterThanOrEqual(before + 3500 * 1000);
  });

  it('isAuthenticated reflects setAuth/clearAuth', () => {
    const s = new Storage({ cwd: tmpDir });
    expect(s.isAuthenticated()).toBe(false);
    s.setAuth(sampleAuth);
    expect(s.isAuthenticated()).toBe(true);
    s.clearAuth();
    expect(s.isAuthenticated()).toBe(false);
  });

  it('pendingDeviceAuth evicts at read time when expired', () => {
    const s = new Storage({ cwd: tmpDir });
    s.setPendingDeviceAuth({
      device_code: 'd',
      interval: 5,
      expires_at: Date.now() - 1000,
      verification_url: 'https://x/',
      phrase: 'P-1',
    });
    expect(s.getPendingDeviceAuth()).toBeNull();
  });

  it('pendingDeviceAuth returns value when unexpired', () => {
    const s = new Storage({ cwd: tmpDir });
    const value = {
      device_code: 'd',
      interval: 5,
      expires_at: Date.now() + 60_000,
      verification_url: 'https://x/',
      phrase: 'P-1',
    };
    s.setPendingDeviceAuth(value);
    expect(s.getPendingDeviceAuth()).toEqual(value);
    s.clearPendingDeviceAuth();
    expect(s.getPendingDeviceAuth()).toBeNull();
  });

  it('clearAll wipes auth, apiKey, pendingDeviceAuth, and connection', () => {
    const s = new Storage({ cwd: tmpDir });
    s.setAuth(sampleAuth);
    s.setApiKey('inflow_test_abc');
    s.setPendingDeviceAuth({
      device_code: 'd',
      interval: 5,
      expires_at: Date.now() + 60_000,
      verification_url: 'https://x/',
      phrase: 'P',
    });
    s.setConnection({ environment: 'sandbox', apiBaseUrl: 'https://dev/' });
    s.clearAll();
    expect(s.isAuthenticated()).toBe(false);
    expect(s.getAuth()).toBeNull();
    expect(s.getApiKey()).toBeNull();
    expect(s.getPendingDeviceAuth()).toBeNull();
    expect(s.getConnection()).toBeNull();
  });

  it('apiKey round-trips via setApiKey/getApiKey/clearApiKey', () => {
    const s = new Storage({ cwd: tmpDir });
    expect(s.getApiKey()).toBeNull();
    s.setApiKey('inflow_live_abc');
    expect(s.getApiKey()).toBe('inflow_live_abc');
    s.clearApiKey();
    expect(s.getApiKey()).toBeNull();
  });

  it('isAuthenticated is true with just an apiKey set (no device tokens)', () => {
    const s = new Storage({ cwd: tmpDir });
    expect(s.isAuthenticated()).toBe(false);
    s.setApiKey('inflow_live_abc');
    expect(s.isAuthenticated()).toBe(true);
    s.clearApiKey();
    expect(s.isAuthenticated()).toBe(false);
  });

  it('setApiKey rejects empty strings (defensive against accidental clears)', () => {
    const s = new Storage({ cwd: tmpDir });
    expect(() => s.setApiKey('')).toThrow();
  });

  it('connection round-trips via setConnection/getConnection/clearConnection', () => {
    const s = new Storage({ cwd: tmpDir });
    expect(s.getConnection()).toBeNull();
    s.setConnection({
      environment: 'sandbox',
      apiBaseUrl: 'https://dev.inflowpay.ai',
      authBaseUrl: 'https://auth-dev.inflowpay.ai',
    });
    expect(s.getConnection()).toEqual({
      environment: 'sandbox',
      apiBaseUrl: 'https://dev.inflowpay.ai',
      authBaseUrl: 'https://auth-dev.inflowpay.ai',
    });
    s.clearConnection();
    expect(s.getConnection()).toBeNull();
  });

  it('connection persists across new Storage instances pointing at the same file', () => {
    const a = new Storage({ cwd: tmpDir });
    a.setConnection({ environment: 'sandbox', apiBaseUrl: 'https://dev/' });
    const b = new Storage({ cwd: tmpDir });
    expect(b.getConnection()).toEqual({
      environment: 'sandbox',
      apiBaseUrl: 'https://dev/',
    });
  });

  it('apiKey persists across new Storage instances pointing at the same file', () => {
    const a = new Storage({ cwd: tmpDir });
    a.setApiKey('inflow_live_persisted');
    const b = new Storage({ cwd: tmpDir });
    expect(b.getApiKey()).toBe('inflow_live_persisted');
  });

  it('configPath override controls the file location', () => {
    const explicit = join(tmpDir, 'creds.json');
    const s = new Storage({ configPath: explicit });
    s.setAuth(sampleAuth);
    expect(s.getPath()).toBe(explicit);
  });

  it('configPath without .json extension is honored', () => {
    const explicit = join(tmpDir, 'creds');
    const s = new Storage({ configPath: explicit });
    s.setAuth(sampleAuth);
    expect(s.getPath()).toBe(`${explicit}.json`);
  });

  it('deleteConfig is idempotent on a missing file', async () => {
    const s = new Storage({ cwd: tmpDir });
    s.setAuth(sampleAuth);
    const path = s.getPath();
    await s.deleteConfig();
    expect(existsSync(path)).toBe(false);
    await expect(s.deleteConfig()).resolves.toBeUndefined();
  });
});

describe('MemoryStorage', () => {
  it('has same surface and in-process semantics', () => {
    const s = new MemoryStorage();
    expect(s.getPath()).toBe('memory');
    expect(s.isAuthenticated()).toBe(false);
    s.setAuth(sampleAuth);
    expect(s.isAuthenticated()).toBe(true);
    expect(s.getAuth()?.expires_at).toBeGreaterThan(0);
  });

  it('initial auth in constructor', () => {
    const s = new MemoryStorage(sampleAuth);
    expect(s.isAuthenticated()).toBe(true);
  });

  it('pendingDeviceAuth evicts on read when expired', () => {
    const s = new MemoryStorage();
    s.setPendingDeviceAuth({
      device_code: 'd',
      interval: 5,
      expires_at: Date.now() - 1,
      verification_url: 'https://x/',
      phrase: 'P',
    });
    expect(s.getPendingDeviceAuth()).toBeNull();
  });

  it('clearAll wipes auth, apiKey, pendingDeviceAuth, connection; deleteConfig is no-op', async () => {
    const s = new MemoryStorage(sampleAuth);
    s.setApiKey('inflow_live_xyz');
    s.setPendingDeviceAuth({
      device_code: 'd',
      interval: 5,
      expires_at: Date.now() + 60_000,
      verification_url: 'https://x/',
      phrase: 'P',
    });
    s.setConnection({ environment: 'sandbox' });
    s.clearAll();
    expect(s.isAuthenticated()).toBe(false);
    expect(s.getApiKey()).toBeNull();
    expect(s.getPendingDeviceAuth()).toBeNull();
    expect(s.getConnection()).toBeNull();
    await expect(s.deleteConfig()).resolves.toBeUndefined();
  });

  it('apiKey and connection round-trip via the in-memory implementation', () => {
    const s = new MemoryStorage();
    expect(s.getApiKey()).toBeNull();
    expect(s.getConnection()).toBeNull();
    s.setApiKey('inflow_test_xyz');
    s.setConnection({
      environment: 'sandbox',
      apiBaseUrl: 'https://dev/',
      authBaseUrl: 'https://auth-dev/',
    });
    expect(s.getApiKey()).toBe('inflow_test_xyz');
    expect(s.getConnection()).toEqual({
      environment: 'sandbox',
      apiBaseUrl: 'https://dev/',
      authBaseUrl: 'https://auth-dev/',
    });
    expect(s.isAuthenticated()).toBe(true);
    s.clearApiKey();
    s.clearConnection();
    expect(s.getApiKey()).toBeNull();
    expect(s.getConnection()).toBeNull();
  });

  it('MemoryStorage.setApiKey rejects empty strings', () => {
    const s = new MemoryStorage();
    expect(() => s.setApiKey('')).toThrow();
  });

  it('clearPendingDeviceAuth and clearAuth individually', () => {
    const s = new MemoryStorage(sampleAuth);
    s.clearAuth();
    expect(s.isAuthenticated()).toBe(false);
    s.setPendingDeviceAuth({
      device_code: 'd',
      interval: 5,
      expires_at: Date.now() + 60_000,
      verification_url: 'https://x/',
      phrase: 'P',
    });
    s.clearPendingDeviceAuth();
    expect(s.getPendingDeviceAuth()).toBeNull();
  });
});
