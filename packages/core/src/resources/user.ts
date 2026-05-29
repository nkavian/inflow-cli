import { type InflowOptions, type ResolvedInflowSdkConfig, resolveInflowSdkConfig } from '../config.js';
import { InflowApiError } from '../errors.js';
import type { User } from '../types/index.js';
import { InflowApiClient } from '../utils/api-client.js';
import { redactRawBody } from '../utils/redact.js';
import type { IUserResource } from './interfaces.js';

export class UserResource implements IUserResource {
  private readonly api: InflowApiClient;

  constructor(options: InflowOptions = {}, resolvedConfig?: ResolvedInflowSdkConfig) {
    const config: ResolvedInflowSdkConfig = resolvedConfig ?? resolveInflowSdkConfig(options);
    this.api = new InflowApiClient(config, config.apiBaseUrl);
  }

  async retrieve(options: { signal?: AbortSignal } = {}): Promise<User> {
    const requestOptions = options.signal !== undefined ? { signal: options.signal } : {};
    const { status, data, rawBody } = await this.api.get('/v1/users/self', requestOptions);
    if (status < 200 || status >= 300) {
      throw new InflowApiError(
        `Failed to retrieve user (${String(status)}): ${redactRawBody(rawBody) || 'unknown error'}`,
        {
          status,
          rawBody,
          details: data,
        },
      );
    }
    return data as User;
  }
}
