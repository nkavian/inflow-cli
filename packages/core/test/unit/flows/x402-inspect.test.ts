import { afterEach, describe, expect, it, vi } from 'vitest';
import { reduceX402Inspect, runInspectPipeline } from '../../../src/flows/x402-inspect.js';
import type { InspectEvent } from '../../../src/flows/x402-inspect.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('reduceX402Inspect', () => {
  it('errored -> error with code + message', () => {
    expect(reduceX402Inspect({ kind: 'probing' }, { type: 'errored', code: 'X', message: 'oops' })).toEqual({
      kind: 'error',
      code: 'X',
      message: 'oops',
    });
  });
});

describe('runInspectPipeline', () => {
  function captureEmits(): { events: InspectEvent[]; emit: (e: InspectEvent) => void } {
    const events: InspectEvent[] = [];
    return { events, emit: (e) => events.push(e) };
  }

  it('emits no-payment when the seller responds 2xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('hello', { status: 200, headers: { 'content-type': 'text/plain' } }),
    );
    const { events, emit } = captureEmits();
    await runInspectPipeline({ url: 'https://seller/api', probeOptions: { method: 'GET', headers: {} } }, emit);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('no-payment');
  });

  it('emits errored with UNEXPECTED_PROBE_STATUS when the seller returns neither 2xx nor 402', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('teapot', { status: 418 }));
    const { events, emit } = captureEmits();
    await runInspectPipeline({ url: 'https://seller/api', probeOptions: { method: 'GET', headers: {} } }, emit);
    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev?.type).toBe('errored');
    if (ev?.type === 'errored') {
      expect(ev.code).toBe('UNEXPECTED_PROBE_STATUS');
    }
  });

  it('emits errored with INSPECT_FAILED when sellerProbe throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const { events, emit } = captureEmits();
    await runInspectPipeline({ url: 'https://seller/api', probeOptions: { method: 'GET', headers: {} } }, emit);
    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev?.type).toBe('errored');
    if (ev?.type === 'errored') {
      expect(ev.code).toBe('INSPECT_FAILED');
    }
  });

  it('emits errored with INVALID_402 when 402 lacks a PAYMENT-REQUIRED header', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('payment required', { status: 402 }));
    const { events, emit } = captureEmits();
    await runInspectPipeline({ url: 'https://seller/api', probeOptions: { method: 'GET', headers: {} } }, emit);
    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev?.type).toBe('errored');
    if (ev?.type === 'errored') {
      expect(ev.code).toBe('INVALID_402');
    }
  });
});
