import type { AuthTokens, Balance, DepositAddresses, DeviceAuthRequest, User } from '../types/index.js';

export interface IAuthResource {
  initiateDeviceAuth(clientName?: string): Promise<DeviceAuthRequest>;
  pollDeviceAuth(deviceCode: string): Promise<AuthTokens | null>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  revokeToken(token: string): Promise<void>;
}

export interface IBalanceResource {
  list(options?: { signal?: AbortSignal }): Promise<Balance[]>;
}

export interface IDepositAddressResource {
  list(options?: { signal?: AbortSignal }): Promise<DepositAddresses>;
}

export interface IUserResource {
  retrieve(options?: { signal?: AbortSignal }): Promise<User>;
}
