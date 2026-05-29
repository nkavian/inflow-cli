import type { PaymentRequired } from '@x402/core/types';
import { describe, expect, it } from 'vitest';
import { buildNoFilteredMatchMessage, filterAccepts, isSuccessStatus } from '../../../src/flows/x402-shared.js';

const sample: PaymentRequired = {
  x402Version: 2,
  resource: { url: 'https://seller/api' },
  accepts: [
    {
      scheme: 'balance',
      network: 'inflow:1',
      payTo: '0x0',
      maxAmountRequired: '0',
      maxTimeoutSeconds: 300,
      asset: '',
      amount: '',
      extra: {},
    },
    {
      scheme: 'exact',
      network: 'base',
      payTo: '0x0',
      maxAmountRequired: '0',
      maxTimeoutSeconds: 300,
      asset: '0xUSDC',
      amount: '1.50',
      extra: { name: 'USDC' },
    },
  ],
} as unknown as PaymentRequired;

describe('filterAccepts', () => {
  it('returns the input unchanged when no filter is set', () => {
    expect(filterAccepts(sample, {})).toBe(sample);
  });

  it('filters by scheme', () => {
    const out = filterAccepts(sample, { scheme: 'balance' });
    expect(out.accepts).toHaveLength(1);
    expect(out.accepts[0]?.scheme).toBe('balance');
  });

  it('filters by network', () => {
    const out = filterAccepts(sample, { network: 'base' });
    expect(out.accepts).toHaveLength(1);
    expect(out.accepts[0]?.network).toBe('base');
  });

  it('filters by asset', () => {
    const out = filterAccepts(sample, { asset: '0xUSDC' });
    expect(out.accepts).toHaveLength(1);
    expect(out.accepts[0]?.asset).toBe('0xUSDC');
  });

  it('filters by assetName (extra.name)', () => {
    const out = filterAccepts(sample, { assetName: 'USDC' });
    expect(out.accepts).toHaveLength(1);
    expect(out.accepts[0]?.network).toBe('base');
  });

  it('filters by both scheme and network', () => {
    expect(filterAccepts(sample, { scheme: 'balance', network: 'base' }).accepts).toHaveLength(0);
    expect(filterAccepts(sample, { scheme: 'balance', network: 'inflow:1' }).accepts).toHaveLength(1);
  });

  it('AND-combines all four filters', () => {
    const out = filterAccepts(sample, {
      scheme: 'exact',
      network: 'base',
      asset: '0xUSDC',
      assetName: 'USDC',
    });
    expect(out.accepts).toHaveLength(1);
  });

  it('preserves non-accepts fields verbatim', () => {
    const out = filterAccepts(sample, { scheme: 'balance' });
    expect(out.x402Version).toBe(2);
    expect(out.resource).toEqual({ url: 'https://seller/api' });
  });
});

describe('buildNoFilteredMatchMessage', () => {
  it('includes scheme + network filter description and available pairs', () => {
    const msg = buildNoFilteredMatchMessage(sample, { scheme: 'invalid', network: 'inflow:1' });
    expect(msg).toContain('--scheme=invalid');
    expect(msg).toContain('--network=inflow:1');
    expect(msg).toContain('balance/inflow:1');
    expect(msg).toContain('exact/base');
  });

  it('includes --asset and --asset-name in the filter description when set', () => {
    const msg = buildNoFilteredMatchMessage(sample, { asset: '0xMISSING', assetName: 'PYUSD' });
    expect(msg).toContain('--asset=0xMISSING');
    expect(msg).toContain('--asset-name=PYUSD');
    expect(msg).toContain('asset=0xUSDC');
    expect(msg).toContain('name=USDC');
  });

  it('falls back to "(none)" when the seller advertises no accepts', () => {
    const empty = { ...sample, accepts: [] } as unknown as PaymentRequired;
    const msg = buildNoFilteredMatchMessage(empty, { scheme: 'balance' });
    expect(msg).toContain('Available: (none)');
  });
});

describe('isSuccessStatus', () => {
  it('returns true for 2xx', () => {
    expect(isSuccessStatus(200)).toBe(true);
    expect(isSuccessStatus(299)).toBe(true);
  });
  it('returns false outside 2xx', () => {
    expect(isSuccessStatus(199)).toBe(false);
    expect(isSuccessStatus(300)).toBe(false);
    expect(isSuccessStatus(402)).toBe(false);
  });
});
