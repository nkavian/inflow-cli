import type { PaymentRequirements } from '@inflowpayai/x402';
import { describe, expect, it } from 'vitest';
import { summarizeAccepts } from '../../../src/flows/x402-decode.js';

describe('summarizeAccepts', () => {
  it('keeps scheme + network and drops empty-string asset / amount fields', () => {
    const accepts: PaymentRequirements[] = [
      {
        scheme: 'balance',
        network: 'inflow:1',
        asset: '',
        amount: '',
      } as unknown as PaymentRequirements,
      {
        scheme: 'exact',
        network: 'base',
        asset: 'USDC',
        amount: '1.50',
      } as unknown as PaymentRequirements,
    ];
    const out = summarizeAccepts(accepts);
    expect(out).toEqual([
      { scheme: 'balance', network: 'inflow:1' },
      { scheme: 'exact', network: 'base', asset: 'USDC', amount: '1.50' },
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(summarizeAccepts([])).toEqual([]);
  });
});
