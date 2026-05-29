import { describe, expect, it, vi } from 'vitest';
import { runDepositAddressesList } from '../../../src/flows/deposit-addresses-list.js';

describe('runDepositAddressesList', () => {
  it('returns only the configured addresses, dropping unconfigured', async () => {
    const depositAddressResource = {
      list: vi.fn().mockResolvedValue({
        configured: [{ address: '0xabc', blockchain: 'BASE', currencies: ['USDC'] }],
        unconfigured: [{ blockchain: 'SOLANA', currencies: ['USDC'] }],
      }),
    };
    const out = await runDepositAddressesList({ depositAddressResource });
    expect(out).toEqual([{ address: '0xabc', blockchain: 'BASE', currencies: ['USDC'] }]);
  });

  it('returns an empty array when nothing is configured', async () => {
    const depositAddressResource = {
      list: vi.fn().mockResolvedValue({
        configured: [],
        unconfigured: [{ blockchain: 'BASE', currencies: ['USDC'] }],
      }),
    };
    const out = await runDepositAddressesList({ depositAddressResource });
    expect(out).toEqual([]);
  });
});
