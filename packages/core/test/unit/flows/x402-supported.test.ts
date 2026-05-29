import { describe, expect, it, vi } from 'vitest';
import type { IX402Resource } from '../../../src/client.js';
import { runX402Supported } from '../../../src/flows/x402-supported.js';

describe('runX402Supported', () => {
  it('returns the buyer-side capability cache from the client', async () => {
    const kinds = [{ scheme: 'balance', network: 'inflow:1', x402Version: 2 }];
    const x402: IX402Resource = {
      client: vi.fn().mockResolvedValue({
        getSupported: vi.fn().mockResolvedValue({ kinds }),
      }),
    };
    const out = await runX402Supported({ x402 });
    expect(out).toEqual({ kinds });
  });
});
