import { InflowAuthenticationError } from './errors.js';
import type { IAuthResource } from './resources/interfaces.js';
import type { AuthTokens } from './types/index.js';
import type { AuthStorage } from './utils/storage.js';

export interface GetAccessTokenOptions {
  forceRefresh?: boolean;
}

export type AccessTokenProvider = (options?: GetAccessTokenOptions) => Promise<string>;

const EXPIRY_BUFFER_MS = 60_000;

export function createAccessTokenProvider(authResource: IAuthResource, authStorage: AuthStorage): AccessTokenProvider {
  let inFlightRefresh: Promise<AuthTokens> | null = null;

  return async ({ forceRefresh = false } = {}) => {
    const auth = authStorage.getAuth();
    if (!auth) {
      throw new InflowAuthenticationError('Not authenticated. Run "inflow auth login" first.');
    }

    const isExpired = auth.expires_at !== undefined && Date.now() >= auth.expires_at - EXPIRY_BUFFER_MS;

    if (!forceRefresh && !isExpired) {
      return auth.access_token;
    }

    if (inFlightRefresh !== null) {
      const refreshed = await inFlightRefresh;
      return refreshed.access_token;
    }

    inFlightRefresh = authResource.refreshToken(auth.refresh_token).finally(() => {
      inFlightRefresh = null;
    });

    const refreshed = await inFlightRefresh;
    authStorage.setAuth(refreshed);
    return refreshed.access_token;
  };
}
