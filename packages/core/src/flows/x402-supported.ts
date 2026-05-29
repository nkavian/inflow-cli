import type { X402BuyerSupportedResponse } from '@inflowpayai/x402';
import type { IX402Resource } from '../client.js';

export interface X402SupportedInput {
  x402: IX402Resource;
}

/**
 * Returns the buyer-side capability cache — the (scheme x network) tuples this client can sign. Triggers the lazy
 * construction of the underlying buyer client if it hasn't been built yet.
 */
export async function runX402Supported(input: X402SupportedInput): Promise<X402BuyerSupportedResponse> {
  const client = await input.x402.client();
  return client.getSupported();
}
