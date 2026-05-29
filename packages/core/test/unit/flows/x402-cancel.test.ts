import { describe, expect, it, vi } from 'vitest';
import type { IX402Resource } from '../../../src/client.js';
import { runX402Cancel } from '../../../src/flows/x402-cancel.js';

describe('runX402Cancel', () => {
  it('invokes cancelApproval and returns the cancelled-true frame', async () => {
    const cancelApproval = vi.fn().mockResolvedValue(undefined);
    const x402: IX402Resource = {
      client: vi.fn().mockResolvedValue({ cancelApproval }),
    };
    const out = await runX402Cancel({ x402, approvalId: 'appr_abc' });
    expect(cancelApproval).toHaveBeenCalledWith('appr_abc');
    expect(out).toEqual({
      approval_id: 'appr_abc',
      cancelled: true,
      note: 'best-effort; server-side state not verified',
    });
  });
});
