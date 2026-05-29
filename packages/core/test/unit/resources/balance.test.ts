import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { InflowApiError } from '../../../src/errors.js';
import { BalanceResource } from '../../../src/resources/balance.js';
import { BASE_URL, balancesHappy, balancesEmpty, balances500 } from '../fixtures/handlers.js';
import { makeServer } from '../fixtures/server.js';

const server = makeServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('BalanceResource', () => {
  it('unwraps the balances array', async () => {
    server.use(balancesHappy);
    const r = new BalanceResource({
      apiBaseUrl: BASE_URL,
      accessToken: 'tk',
    });
    const list = await r.list();
    expect(list).toEqual([
      { available: '100.5', currency: 'USDC' },
      { available: '0', currency: 'USD' },
    ]);
  });

  it('returns [] for an empty server response', async () => {
    server.use(balancesEmpty);
    const r = new BalanceResource({
      apiBaseUrl: BASE_URL,
      accessToken: 'tk',
    });
    expect(await r.list()).toEqual([]);
  });

  it('throws InflowApiError on 5xx after retries', async () => {
    server.use(balances500);
    const r = new BalanceResource({
      apiBaseUrl: BASE_URL,
      accessToken: 'tk',
    });
    await expect(r.list()).rejects.toBeInstanceOf(InflowApiError);
  });
});
