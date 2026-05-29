import { unlink } from 'node:fs/promises';
import path from 'node:path';
import Conf from 'conf';
import { InflowConfigurationError } from '../errors.js';
import type { AuthTokens } from '../types/index.js';

export interface PendingDeviceAuth {
  device_code: string;
  interval: number;
  expires_at: number;
  verification_url: string;
  phrase: string;
}

/**
 * Persisted connection-shape settings. Saved by `auth login` so subsequent commands can default to the same environment
 * / base URLs without the user re-typing flags each time. Excludes secrets; the API key lives in its own slot (see
 * StorageSchema.apiKey).
 */
export interface ConnectionSettings {
  environment?: 'production' | 'sandbox';
  apiBaseUrl?: string;
  authBaseUrl?: string;
}

interface StorageSchema {
  auth: AuthTokens | null;
  apiKey: string | null;
  pendingDeviceAuth: PendingDeviceAuth | null;
  connection: ConnectionSettings | null;
}

export interface AuthStorage {
  getAuth(): AuthTokens | null;
  setAuth(auth: AuthTokens): void;
  clearAuth(): void;
  isAuthenticated(): boolean;
  getApiKey(): string | null;
  setApiKey(apiKey: string): void;
  clearApiKey(): void;
  getConnection(): ConnectionSettings | null;
  setConnection(settings: ConnectionSettings): void;
  clearConnection(): void;
  getPendingDeviceAuth(): PendingDeviceAuth | null;
  setPendingDeviceAuth(pending: PendingDeviceAuth): void;
  clearPendingDeviceAuth(): void;
  clearAll(): void;
  getPath(): string;
  deleteConfig(): Promise<void>;
}

function withComputedExpiry(auth: AuthTokens): AuthTokens {
  return {
    ...auth,
    expires_at: auth.expires_at ?? Date.now() + auth.expires_in * 1000,
  };
}

const CONFIG_FILE_MODE = 0o600;

export interface StorageOptions {
  cwd?: string;
  configPath?: string;
}

export class Storage implements AuthStorage {
  private config?: Conf<StorageSchema>;
  private readonly options: StorageOptions;

  constructor(options: StorageOptions = {}) {
    this.options = options;
  }

  private getConfig(): Conf<StorageSchema> {
    if (!this.config) {
      let locationOverride: { cwd: string; configName?: string } | undefined;
      if (this.options.configPath !== undefined) {
        const parsed = path.parse(path.resolve(this.options.configPath));
        const configName = parsed.ext === '.json' ? parsed.name : parsed.base;
        locationOverride = { cwd: parsed.dir, configName };
      } else if (this.options.cwd !== undefined) {
        locationOverride = { cwd: this.options.cwd };
      }

      this.config = new Conf<StorageSchema>({
        projectName: 'inflow',
        projectSuffix: '',
        configFileMode: CONFIG_FILE_MODE,
        ...locationOverride,
        defaults: {
          auth: null,
          apiKey: null,
          pendingDeviceAuth: null,
          connection: null,
        },
      });
    }

    return this.config;
  }

  getAuth(): AuthTokens | null {
    return this.getConfig().get('auth') ?? null;
  }

  setAuth(auth: AuthTokens): void {
    this.getConfig().set('auth', withComputedExpiry(auth));
  }

  clearAuth(): void {
    this.getConfig().set('auth', null);
  }

  isAuthenticated(): boolean {
    return this.getAuth() !== null || this.getApiKey() !== null;
  }

  getApiKey(): string | null {
    const value = this.getConfig().get('apiKey') ?? null;
    // Defensive: any non-string value at rest is treated as no api key.
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  setApiKey(apiKey: string): void {
    if (apiKey.length === 0) {
      throw new InflowConfigurationError('Storage.setApiKey: api key must be a non-empty string.');
    }
    this.getConfig().set('apiKey', apiKey);
  }

  clearApiKey(): void {
    this.getConfig().set('apiKey', null);
  }

  getConnection(): ConnectionSettings | null {
    return this.getConfig().get('connection') ?? null;
  }

  setConnection(settings: ConnectionSettings): void {
    this.getConfig().set('connection', settings);
  }

  clearConnection(): void {
    this.getConfig().set('connection', null);
  }

  getPendingDeviceAuth(): PendingDeviceAuth | null {
    const pending = this.getConfig().get('pendingDeviceAuth') ?? null;
    if (!pending) return null;
    if (Date.now() >= pending.expires_at) {
      this.clearPendingDeviceAuth();
      return null;
    }
    return pending;
  }

  setPendingDeviceAuth(pending: PendingDeviceAuth): void {
    this.getConfig().set('pendingDeviceAuth', pending);
  }

  clearPendingDeviceAuth(): void {
    this.getConfig().set('pendingDeviceAuth', null);
  }

  clearAll(): void {
    this.getConfig().clear();
  }

  getPath(): string {
    return this.getConfig().path;
  }

  async deleteConfig(): Promise<void> {
    try {
      await unlink(this.getPath());
    } catch {
      // file already gone or inaccessible — treat as success
    }
  }
}

export class MemoryStorage implements AuthStorage {
  private auth: AuthTokens | null;
  private apiKey: string | null = null;
  private pendingAuth: PendingDeviceAuth | null = null;
  private connection: ConnectionSettings | null = null;

  constructor(initialAuth: AuthTokens | null = null) {
    this.auth = initialAuth ? withComputedExpiry(initialAuth) : null;
  }

  getAuth(): AuthTokens | null {
    return this.auth;
  }

  setAuth(auth: AuthTokens): void {
    this.auth = withComputedExpiry(auth);
  }

  clearAuth(): void {
    this.auth = null;
  }

  isAuthenticated(): boolean {
    return this.auth !== null || this.apiKey !== null;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  setApiKey(apiKey: string): void {
    if (apiKey.length === 0) {
      throw new InflowConfigurationError('MemoryStorage.setApiKey: api key must be a non-empty string.');
    }
    this.apiKey = apiKey;
  }

  clearApiKey(): void {
    this.apiKey = null;
  }

  getConnection(): ConnectionSettings | null {
    return this.connection;
  }

  setConnection(settings: ConnectionSettings): void {
    this.connection = settings;
  }

  clearConnection(): void {
    this.connection = null;
  }

  getPendingDeviceAuth(): PendingDeviceAuth | null {
    if (!this.pendingAuth) return null;
    if (Date.now() >= this.pendingAuth.expires_at) {
      this.pendingAuth = null;
      return null;
    }
    return this.pendingAuth;
  }

  setPendingDeviceAuth(pending: PendingDeviceAuth): void {
    this.pendingAuth = pending;
  }

  clearPendingDeviceAuth(): void {
    this.pendingAuth = null;
  }

  clearAll(): void {
    this.auth = null;
    this.apiKey = null;
    this.pendingAuth = null;
    this.connection = null;
  }

  getPath(): string {
    return 'memory';
  }

  async deleteConfig(): Promise<void> {
    // no-op: nothing to delete in memory
  }
}

export const storage = new Storage();
