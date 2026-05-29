import { describe, expect, it } from 'vitest';
import { sanitizeResource } from '../../../src/utils/sanitize-proxy.js';

class Sample {
  readonly label = '\x1b[31mtag\x1b[0m';

  async returnsObject(): Promise<{ msg: string }> {
    return Promise.resolve({ msg: '\x1b[32mhello\x1b[0m' });
  }

  async returnsNumber(): Promise<number> {
    return Promise.resolve(42);
  }

  syncMethod(input: string): string {
    return input;
  }
}

describe('sanitizeResource', () => {
  it('sanitizes resolved Promise values from async methods', async () => {
    const wrapped = sanitizeResource(new Sample());
    const out = await wrapped.returnsObject();
    expect(out.msg).toBe('hello');
  });

  it('passes through non-string promise values', async () => {
    const wrapped = sanitizeResource(new Sample());
    expect(await wrapped.returnsNumber()).toBe(42);
  });

  it('returns sync method results unchanged', () => {
    const wrapped = sanitizeResource(new Sample());
    expect(wrapped.syncMethod('keep')).toBe('keep');
  });

  it('non-function properties pass through', () => {
    const wrapped = sanitizeResource(new Sample());
    expect(wrapped.label).toBe('\x1b[31mtag\x1b[0m');
  });

  it('handles non-promise method return that resembles thenable safely', () => {
    const obj = {
      not: () => ({ thenable: false }) as { thenable: boolean },
    };
    const wrapped = sanitizeResource(obj);
    const result = wrapped.not();
    expect(result.thenable).toBe(false);
  });
});
