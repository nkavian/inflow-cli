import type { IX402Resource } from '../client.js';

export interface X402CancelInput {
  x402: IX402Resource;
  approvalId: string;
}

export interface X402CancelResult {
  approval_id: string;
  cancelled: true;
  note: string;
}

/**
 * Best-effort cancel of an in-flight x402 approval. The HTTP call is fire-and-forget against the server; this function
 * does not poll for confirmation, hence the `note` field calling out that server-side state is not verified.
 */
export async function runX402Cancel(input: X402CancelInput): Promise<X402CancelResult> {
  const client = await input.x402.client();
  await client.cancelApproval(input.approvalId);
  return {
    approval_id: input.approvalId,
    cancelled: true,
    note: 'best-effort; server-side state not verified',
  };
}
