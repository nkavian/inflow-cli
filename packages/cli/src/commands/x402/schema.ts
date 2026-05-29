import { z } from 'incur';

export const payArgs = z.object({
  url: z.string().describe('The x402-protected resource URL to pay for.'),
});

export const payOptions = z.object({
  method: z.string().default('GET').describe('HTTP method for the seller request.'),
  data: z
    .string()
    .optional()
    .describe(
      'Request body. JSON or raw text. Content-Type defaults to application/json when --data is set unless a --header overrides it.',
    ),
  header: z.array(z.string()).default([]).describe('Repeatable. "Name: Value" format.'),
  interval: z.coerce
    .number()
    .default(0)
    .describe(
      'Inline poll cadence in seconds while awaiting approval. 0 returns the approval URL and a follow-up command hint without blocking.',
    ),
  maxAttempts: z.coerce
    .number()
    .default(0)
    .describe('Hard cap on poll attempts when --interval > 0. 0 means unlimited.'),
  timeout: z.coerce.number().default(900).describe('Polling deadline in seconds. Default 900s (matches x402-buyer).'),
  paymentId: z
    .string()
    .min(16)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .describe(
      'Caller-supplied payment identifier. 16-128 chars, ^[a-zA-Z0-9_-]+$. Forwarded to the server as remotePaymentId.',
    ),
  showBody: z
    .boolean()
    .default(true)
    .describe(
      'Include the seller response body in the result. Default true so AI assistants paying for content receive the deliverable. Pass --no-show-body to suppress (e.g. for binary downloads paired with --output-file).',
    ),
  outputFile: z
    .string()
    .optional()
    .describe(
      'Write the seller response body bytes to this file path (overwrites silently). When set, the result frame includes `output_saved_to: <absolute_path>` instead of `body` / `body_base64`. Natural choice for binary content (PDFs, images, downloads).',
    ),
  payloadFile: z
    .string()
    .optional()
    .describe(
      'Write the signed `encoded_payload` bytes to this file path (mode 0o600, overwrites silently). When set, the result frame includes `payload_saved_to: <absolute_path>` instead of `encoded_payload`. Use to keep one-time payment credentials out of chat transcripts and logs.',
    ),
  scheme: z
    .string()
    .optional()
    .describe(
      'Constrain selection to seller `accepts[]` entries whose `scheme` matches exactly (e.g. "balance", "exact"). Combine with --network/--asset/--asset-name for a tighter filter; any flag can be set independently. When the filter empties the accepts list, the command fails with NO_FILTERED_MATCH instead of falling through to the buyer\'s prefer order.',
    ),
  network: z
    .string()
    .optional()
    .describe(
      'Constrain selection to seller `accepts[]` entries whose `network` matches exactly (e.g. "inflow:1", "eip155:84532", "solana:..."). Combine with --scheme/--asset/--asset-name for a tighter filter. When the filter empties the accepts list, the command fails with NO_FILTERED_MATCH.',
    ),
  asset: z
    .string()
    .optional()
    .describe(
      'Constrain selection to seller `accepts[]` entries whose `asset` matches exactly — the on-chain asset identifier (ERC-20 contract address for EVM, mint pubkey for SVM). When the filter empties the accepts list, the command fails with NO_FILTERED_MATCH.',
    ),
  assetName: z
    .string()
    .optional()
    .describe(
      'Constrain selection to seller `accepts[]` entries whose `extra.name` matches exactly — the human-readable symbol/name the seller advertises (e.g. "USDC"). When the filter empties the accepts list, the command fails with NO_FILTERED_MATCH.',
    ),
});

export const statusArgs = z.object({
  transactionId: z.string().describe('The transaction id returned by `x402 pay`.'),
});

export const statusOptions = z.object({
  interval: z.coerce
    .number()
    .default(0)
    .describe(
      'Poll cadence in seconds. 0 returns the current snapshot; positive values yield on every change until signed or terminal.',
    ),
  maxAttempts: z.coerce.number().default(0).describe('Hard cap on poll attempts. 0 means unlimited.'),
  timeout: z.coerce.number().default(900).describe('Polling deadline in seconds.'),
  payloadFile: z
    .string()
    .optional()
    .describe(
      'Write the signed `encoded_payload` bytes to this file path (mode 0o600, overwrites silently). When set, status frames include `payload_saved_to: <absolute_path>` instead of `encoded_payload`. Use to keep one-time payment credentials out of chat transcripts and logs.',
    ),
});

export const cancelArgs = z.object({
  approvalId: z.string().describe('The approval id returned by `x402 pay`.'),
});

export const decodeArgs = z.object({
  header: z.string().describe('Raw PAYMENT-REQUIRED header value (base64).'),
});

export const inspectArgs = z.object({
  url: z.string().describe('The x402-protected resource URL to probe. No payment is made.'),
});

export const inspectOptions = z.object({
  method: z.string().default('GET').describe('HTTP method for the probe request.'),
  data: z
    .string()
    .optional()
    .describe(
      'Request body for the probe. JSON or raw text. Content-Type defaults to application/json when --data is set unless a --header overrides it.',
    ),
  header: z.array(z.string()).default([]).describe('Repeatable. "Name: Value" format.'),
  scheme: z
    .string()
    .optional()
    .describe(
      'Constrain the rendered accepts to entries whose `scheme` matches exactly (e.g. "balance", "exact"). When the filter empties the accepts list, the command fails with NO_FILTERED_MATCH.',
    ),
  network: z
    .string()
    .optional()
    .describe(
      'Constrain the rendered accepts to entries whose `network` matches exactly (e.g. "inflow:1", "eip155:84532"). When the filter empties the accepts list, the command fails with NO_FILTERED_MATCH.',
    ),
  asset: z
    .string()
    .optional()
    .describe(
      'Constrain the rendered accepts to entries whose `asset` matches exactly — the on-chain asset identifier (ERC-20 contract address for EVM, mint pubkey for SVM). When the filter empties the accepts list, the command fails with NO_FILTERED_MATCH.',
    ),
  assetName: z
    .string()
    .optional()
    .describe(
      'Constrain the rendered accepts to entries whose `extra.name` matches exactly — the human-readable symbol/name the seller advertises (e.g. "USDC"). When the filter empties the accepts list, the command fails with NO_FILTERED_MATCH.',
    ),
});
