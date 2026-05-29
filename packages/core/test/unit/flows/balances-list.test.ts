import { describe, expect, it, vi } from 'vitest';
import { runBalancesList } from '../../../src/flows/balances-list.js';
import type { Balance } from '../../../src/types/index.js';

describe('runBalancesList', () => {
  it('returns the balances from the resource verbatim', async () => {
    const sample: Balance[] = [
      { available: '100.5', currency: 'USDC' },
      { available: '0', currency: 'USD' },
    ];
    const balanceResource = { list: vi.fn().mockResolvedValue(sample) };
    const out = await runBalancesList({ balanceResource });
    expect(out).toEqual(sample);
    expect(balanceResource.list).toHaveBeenCalledOnce();
  });

  it('returns an empty array for users with no balances', async () => {
    const balanceResource = { list: vi.fn().mockResolvedValue([]) };
    const out = await runBalancesList({ balanceResource });
    expect(out).toEqual([]);
  });
});
