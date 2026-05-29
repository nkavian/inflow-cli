import type { InflowClient as X402BuyerClient } from '@inflowpayai/x402-buyer';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Inflow, type IX402Resource, MemoryStorage } from '../../../src/index.js';
import { augmentX402 } from '../../../src/flows/index.js';
import { BASE_URL, balancesHappy, depositAddressesHappy, userHappy } from '../fixtures/handlers.js';
import { makeServer } from '../fixtures/server.js';

vi.mock('@inflowpayai/x402-buyer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@inflowpayai/x402-buyer')>();
  return {
    ...actual,
    createInflowClient: vi.fn(async () => ({
      getSupported: vi.fn(async () => ({ kinds: [] })),
      selectInflowRequirement: () => null,
      getX402Payload: vi.fn(async () => ({ status: 'INITIATED' as const })),
      cancelApproval: vi.fn(async () => undefined),
      prepareInflowPayment: vi.fn(),
    })),
  };
});

const server = makeServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Inflow augmented surface', () => {
  it('exposes the high-level operations directly on each resource', () => {
    const client = new Inflow({ authStorage: new MemoryStorage() });
    expect(typeof client.auth.snapshot).toBe('function');
    expect(typeof client.auth.login).toBe('function');
    expect(typeof client.auth.loginApiKey).toBe('function');
    expect(typeof client.auth.logout).toBe('function');
    expect(typeof client.auth.probeStatus).toBe('function');
    expect(typeof client.auth.pollStatus).toBe('function');
    expect(typeof client.auth.initiateDeviceAuth).toBe('function');
    expect(typeof client.auth.pollDeviceAuth).toBe('function');
    expect(typeof client.auth.refreshToken).toBe('function');
    expect(typeof client.auth.revokeToken).toBe('function');
    expect(typeof client.user.retrieve).toBe('function');
    expect(typeof client.user.get).toBe('function');
    expect(typeof client.balances.list).toBe('function');
    expect(typeof client.depositAddresses.list).toBe('function');
    expect(typeof client.x402.client).toBe('function');
    expect(typeof client.x402.inspect).toBe('function');
    expect(typeof client.x402.supported).toBe('function');
    expect(typeof client.x402.pay).toBe('function');
    expect(typeof client.x402.status).toBe('function');
    expect(typeof client.x402.cancel).toBe('function');
    expect(typeof client.hasApiKey).toBe('function');
    expect(typeof client.resolvedApiBaseUrl).toBe('string');
  });

  it('user.get applies the agent projection', async () => {
    server.use(userHappy);
    const client = new Inflow({ apiBaseUrl: BASE_URL, accessToken: 'tk' });
    const out = await client.user.get();
    expect(out).not.toHaveProperty('created');
    expect(out).not.toHaveProperty('updated');
    expect(out.userId).toBe('u-1');
  });

  it('balances.list returns the balances from the resource', async () => {
    server.use(balancesHappy);
    const client = new Inflow({ apiBaseUrl: BASE_URL, accessToken: 'tk' });
    const out = await client.balances.list();
    expect(out).toHaveLength(2);
  });

  it('depositAddresses.list returns the full server shape (caller filters configured / unconfigured)', async () => {
    server.use(depositAddressesHappy);
    const client = new Inflow({ apiBaseUrl: BASE_URL, accessToken: 'tk' });
    const out = await client.depositAddresses.list();
    expect(out.configured).toEqual([{ address: '0xabc', blockchain: 'BASE', currencies: ['USDC'] }]);
    expect(out.unconfigured).toEqual([{ blockchain: 'SOLANA', currencies: ['USDC'] }]);
  });

  it('x402.supported pulls the capability cache from the lazy buyer client', async () => {
    const client = new Inflow({ apiBaseUrl: BASE_URL, accessToken: 'tk' });
    const out = await client.x402.supported();
    expect(out).toEqual({ kinds: [] });
  });

  it('x402.cancel returns the cancelled-true frame', async () => {
    const client = new Inflow({ apiBaseUrl: BASE_URL, accessToken: 'tk' });
    const out = await client.x402.cancel({ approvalId: 'appr_abc' });
    expect(out).toEqual({
      approval_id: 'appr_abc',
      cancelled: true,
      note: 'best-effort; server-side state not verified',
    });
  });

  it('resolvedApiBaseUrl follows the explicit apiBaseUrl when set', () => {
    const client = new Inflow({ apiBaseUrl: BASE_URL, accessToken: 'tk' });
    expect(client.resolvedApiBaseUrl).toBe(BASE_URL);
  });

  it('resolvedApiBaseUrl defaults to the environment-derived URL when no explicit apiBaseUrl is set', () => {
    const prodClient = new Inflow({ environment: 'production' });
    expect(prodClient.resolvedApiBaseUrl).toBe('https://app.inflowpay.ai');
    const sandboxClient = new Inflow({ environment: 'sandbox' });
    expect(sandboxClient.resolvedApiBaseUrl).toBe('https://sandbox.inflowpay.ai');
  });

  it('auth.login throws synchronously when no authStorage was configured', () => {
    const client = new Inflow({ apiBaseUrl: BASE_URL, accessToken: 'tk' });
    expect(() => client.auth.login({ connection: { environment: 'sandbox' } })).toThrow(/authStorage/);
  });

  it('auth.logout rejects when no authStorage was configured', async () => {
    const client = new Inflow({ apiBaseUrl: BASE_URL, accessToken: 'tk' });
    await expect(client.auth.logout()).rejects.toThrow(/authStorage/);
  });

  it('auth.snapshot throws when no authStorage was configured (snapshot needs storage)', () => {
    const client = new Inflow({ apiBaseUrl: BASE_URL, accessToken: 'tk' });
    expect(() => client.auth.snapshot()).toThrow(/authStorage/);
  });
});

describe('Inflow.x402.inspect — async-iterable wrapping of the callback pipeline', () => {
  it('drains the iterable to a terminal event without losing frames', async () => {
    server.use(http.get('https://seller.test/api', () => new HttpResponse('hello', { status: 200 })));
    const client = new Inflow({ apiBaseUrl: BASE_URL, accessToken: 'tk' });
    const run = client.x402.inspect({
      url: 'https://seller.test/api',
      probeOptions: { method: 'GET', headers: {} },
    });
    const events: unknown[] = [];
    for await (const event of run.events) {
      events.push(event);
    }
    expect(events).toHaveLength(1);
    expect((events[0] as { type: string }).type).toBe('no-payment');
  });
});

describe('augmentX402 — mutation contract', () => {
  it('returns the same object it was given (no wrapper)', () => {
    const raw: IX402Resource = { client: () => Promise.resolve({} as X402BuyerClient) };
    const augmented = augmentX402(raw, 'https://api.example.test');
    expect(augmented).toBe(raw);
  });

  it('attaches the augmented operations to the input resource', () => {
    const raw: IX402Resource = { client: () => Promise.resolve({} as X402BuyerClient) };
    augmentX402(raw, 'https://api.example.test');
    expect(typeof (raw as unknown as { inspect: unknown }).inspect).toBe('function');
    expect(typeof (raw as unknown as { supported: unknown }).supported).toBe('function');
    expect(typeof (raw as unknown as { pay: unknown }).pay).toBe('function');
    expect(typeof (raw as unknown as { status: unknown }).status).toBe('function');
    expect(typeof (raw as unknown as { cancel: unknown }).cancel).toBe('function');
  });

  it('preserves caller-visible state slots — the cached buyer-client promise stays reachable', async () => {
    const stubClient = { kind: 'stub' } as unknown as X402BuyerClient;
    const raw: IX402Resource & { cached?: Promise<X402BuyerClient> } = {
      client(): Promise<X402BuyerClient> {
        if (this.cached !== undefined) return this.cached;
        return Promise.reject(new Error('not injected'));
      },
    };
    const augmented = augmentX402(raw, 'https://api.example.test');

    (augmented as unknown as { cached: Promise<X402BuyerClient> }).cached = Promise.resolve(stubClient);

    await expect(augmented.client()).resolves.toBe(stubClient);
  });
});
