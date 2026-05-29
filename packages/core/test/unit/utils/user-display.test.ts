import { describe, expect, it } from 'vitest';
import type { User } from '../../../src/types/index.js';
import { describeUser, previewAccessToken } from '../../../src/utils/user-display.js';

const base: User = {
  userId: 'u-1',
  email: null,
  firstName: null,
  lastName: null,
  username: null,
  mobile: null,
  locale: 'EN_US',
  timezone: 'UTC',
  created: '2026-01-01T00:00:00Z',
  updated: '2026-01-01T00:00:00Z',
};

describe('describeUser', () => {
  it('prefers email over everything else', () => {
    expect(
      describeUser({
        ...base,
        email: 'ada@example.test',
        username: 'ada',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    ).toBe('ada@example.test');
  });

  it('falls back to username when email is null', () => {
    expect(
      describeUser({
        ...base,
        username: 'ada',
        firstName: 'Ada',
        lastName: 'Lovelace',
      }),
    ).toBe('ada');
  });

  it('uses "first last" only when both names are non-null', () => {
    expect(describeUser({ ...base, firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
  });

  it('falls through to userId when only firstName is present', () => {
    expect(describeUser({ ...base, firstName: 'Ada' })).toBe('u-1');
  });

  it('falls through to userId when only lastName is present', () => {
    expect(describeUser({ ...base, lastName: 'Lovelace' })).toBe('u-1');
  });

  it('falls through to userId when every preferred field is null', () => {
    expect(describeUser(base)).toBe('u-1');
  });
});

describe('previewAccessToken', () => {
  it('appends "..." to a short token verbatim', () => {
    expect(previewAccessToken('abc')).toBe('abc...');
  });

  it('truncates a long token to the first 20 chars before the ellipsis', () => {
    expect(previewAccessToken('abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijklmnopqrst...');
  });

  it('returns just "..." for an empty token (no chars to preview)', () => {
    expect(previewAccessToken('')).toBe('...');
  });

  it('handles exactly 20 chars without truncating', () => {
    expect(previewAccessToken('abcdefghijklmnopqrst')).toBe('abcdefghijklmnopqrst...');
  });
});
