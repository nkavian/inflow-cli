import { createInflowClient, type InflowClient as X402BuyerClient, type SignerOptions } from '@inflowpayai/x402-buyer';
import { type InflowOptions, resolveApiBaseUrl, resolveInflowSdkConfig } from './config.js';
import { augmentAuth, augmentUser, augmentX402, type IAuth, type IUser, type IX402 } from './flows/index.js';
import { AuthResource } from './resources/auth.js';
import { BalanceResource } from './resources/balance.js';
import { DepositAddressResource } from './resources/deposit-address.js';
import type {
  IAuthResource,
  IBalanceResource,
  IDepositAddressResource,
  IUserResource,
} from './resources/interfaces.js';
import { UserResource } from './resources/user.js';
import { createAccessTokenProvider } from './session.js';
import { sanitizeResource } from './utils/sanitize-proxy.js';

/**
 * Lazy handle for the buyer-side x402 client (`@inflowpayai/x402-buyer`). The underlying `createInflowClient` is an
 * async operation (it fetches the server's signer capability cache); `client()` returns the same shared `Promise` on
 * every call.
 *
 * The {@link Inflow} class exposes the augmented {@link IX402} (this interface plus the high-level x402 operations) — not
 * this minimal one — but the minimal shape is exported for callers writing functions that only need the raw client.
 */
export interface IX402Resource {
  /** Lazy-construct the underlying buyer client. Cached after first call. */
  client(): Promise<X402BuyerClient>;
}

class X402Resource implements IX402Resource {
  private cached?: Promise<X402BuyerClient>;

  constructor(private readonly opts: SignerOptions) {}

  client(): Promise<X402BuyerClient> {
    if (!this.cached) {
      this.cached = createInflowClient(this.opts);
    }
    return this.cached;
  }
}

/**
 * Top-level InFlow client. Exposes one augmented handle per command group:
 *
 * - `inflow.auth` ({@link IAuth}) — protocol primitives + `login` / `loginApiKey` / `logout` / `probeStatus` /
 *   `pollStatus`.
 * - `inflow.user` ({@link IUser}) — `retrieve()` (raw) and `get()` (agent-mode projected).
 * - `inflow.balances` ({@link IBalanceResource}) — `list()`.
 * - `inflow.depositAddresses` ({@link IDepositAddressResource}) — `list()`.
 * - `inflow.x402` ({@link IX402}) — `client()` (raw buyer client) + `pay` / `status` / `cancel` / `inspect` / `supported`.
 *
 * Credential resolution is mode-exclusive:
 *
 * - When `apiKey` (or `accessToken`, or a `getAccessToken` callback) is supplied, that credential is used verbatim by
 *   every protected resource.
 * - When none of the above is set but `authStorage` is provided, the data resources are auto-wired with a device-token
 *   provider built from this client's own `auth` resource and the supplied storage. This is the path the CLI uses: the
 *   user runs `auth.login` once, tokens land in storage, and subsequent `balances.list()` / `depositAddresses.list()`
 *   calls transparently refresh them.
 * - When neither credentials nor `authStorage` are present, the data resources can still be constructed but will fail at
 *   request time — there is nothing to send.
 */
export class Inflow {
  readonly auth: IAuth;
  readonly balances: IBalanceResource;
  readonly depositAddresses: IDepositAddressResource;
  readonly user: IUser;
  readonly x402: IX402;
  /**
   * The effective API base URL this client will hit, after resolution against `options.apiBaseUrl`, `INFLOW_BASE_URL`,
   * and the environment-derived default. Exposed for callers (CLI, MCP transports, etc.) that need to display "what URL
   * is in use" without re-implementing the resolution.
   */
  readonly resolvedApiBaseUrl: string;

  private readonly _apiKey: string | undefined;

  constructor(options: InflowOptions = {}) {
    this._apiKey = options.apiKey;
    this.resolvedApiBaseUrl = resolveApiBaseUrl(options);

    // Auth resource is built first. Its device-flow endpoints set `skipAuth: true` on their HTTP requests so they do
    // not need (and do not consume) the bearer credentials threaded through `options`; building it from the raw
    // options is safe.
    const authConfig = resolveInflowSdkConfig(options);
    const rawAuth = sanitizeResource<IAuthResource>(new AuthResource(options, authConfig));

    // Resolve credentials for the data resources. If the caller passed any explicit credential, pass-through. If they
    // only passed `authStorage`, weave a device-token provider backed by the auth resource — that's what turns
    // "I logged in once" into "all subsequent reads just work". The synthetic getAccessToken changes the auth mode,
    // so we resolve the data config separately and share it across the four data-touching resources.
    const dataOptions = this.resolveDataOptions(options, rawAuth);
    const dataConfig = dataOptions === options ? authConfig : resolveInflowSdkConfig(dataOptions);

    this.balances = sanitizeResource<IBalanceResource>(new BalanceResource(dataOptions, dataConfig));
    this.depositAddresses = sanitizeResource<IDepositAddressResource>(
      new DepositAddressResource(dataOptions, dataConfig),
    );

    const rawUser = sanitizeResource<IUserResource>(new UserResource(dataOptions, dataConfig));
    this.user = augmentUser(rawUser);

    const x402Internal: IX402Resource = new X402Resource(this.resolveX402Options(options, dataOptions));
    this.x402 = augmentX402(x402Internal, this.resolvedApiBaseUrl);

    this.auth = augmentAuth(rawAuth, rawUser, options.authStorage);
  }

  /**
   * Whether a static API key is configured on this client. Lets callers tell which auth mode is active without poking
   * at storage (e.g. the CLI uses this to decide whether to fall back to a stored device-flow session for the
   * `assertSession` check).
   */
  hasApiKey(): boolean {
    return this._apiKey !== undefined && this._apiKey.length > 0;
  }

  private resolveDataOptions(options: InflowOptions, rawAuth: IAuthResource): InflowOptions {
    if (options.apiKey !== undefined || options.accessToken !== undefined || options.getAccessToken !== undefined) {
      return options;
    }
    if (options.authStorage !== undefined) {
      return {
        ...options,
        getAccessToken: createAccessTokenProvider(rawAuth, options.authStorage),
      };
    }
    return options;
  }

  private resolveX402Options(options: InflowOptions, dataOptions: InflowOptions): SignerOptions {
    // `SignerOptions` is a discriminated union of three shapes (InflowClientOptions / InflowAnonymousClientOptions /
    // InflowBearerClientOptions). Two interactions matter:
    //
    // 1. Building an empty literal `{}` narrows to the anonymous variant and TS then rejects assigning `apiKey` / `getAccessToken`. So
    //    we pick the variant at the return site and build the literal in one shot.
    // 2. With `exactOptionalPropertyTypes: true`, an optional field on an intermediate `let`-bound base object infers as `T | undefined`,
    //    which the target's plain `T` rejects. Conditional spreads keep each property either present-with-T or entirely absent.
    const connection = {
      ...(options.environment !== undefined ? { environment: options.environment } : {}),
      ...(options.apiBaseUrl !== undefined ? { baseUrl: options.apiBaseUrl } : {}),
    };

    if (options.apiKey !== undefined && options.apiKey.length > 0) {
      return { ...connection, apiKey: options.apiKey };
    }
    if (dataOptions.getAccessToken !== undefined) {
      const provider = dataOptions.getAccessToken;
      return { ...connection, getAccessToken: () => provider() };
    }
    // Anonymous variant — no credentials and no authStorage. The buyer client will fail at call time (the server requires auth on the
    // capability cache fetch), but construction is permitted so SDK consumers who only want, say, `inflow.user` aren't forced to
    // configure x402.
    return connection;
  }
}
