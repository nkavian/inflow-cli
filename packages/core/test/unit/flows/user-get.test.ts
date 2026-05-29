import { describe, expect, it, vi } from 'vitest';
import { buildProfileRows, joinName, projectUserPayload, runUserGet } from '../../../src/flows/user-get.js';
import type { IUserResource } from '../../../src/resources/interfaces.js';
import type { User } from '../../../src/types/index.js';

const base: User = {
  userId: 'u-1',
  email: 'ada@example.test',
  firstName: 'Ada',
  lastName: 'Lovelace',
  username: 'ada',
  mobile: '+1-555-0100',
  locale: 'EN_US',
  timezone: 'US/Pacific',
  created: '2025-08-12T18:24:31.501Z',
  updated: '2026-05-24T16:08:09.221Z',
};

describe('joinName', () => {
  it('joins both halves with a space', () => {
    expect(joinName('Ada', 'Lovelace')).toBe('Ada Lovelace');
  });

  it('returns first when only first is set', () => {
    expect(joinName('Ada', null)).toBe('Ada');
  });

  it('returns last when only last is set', () => {
    expect(joinName(null, 'Lovelace')).toBe('Lovelace');
  });

  it('returns null when both are null', () => {
    expect(joinName(null, null)).toBeNull();
  });
});

describe('buildProfileRows', () => {
  it('emits a row for every candidate field', () => {
    const rows = buildProfileRows(base);
    expect(rows.map((r) => r.label)).toEqual([
      'User ID',
      'Email',
      'Username',
      'Full Name',
      'Mobile',
      'Locale',
      'Timezone',
    ]);
  });

  it('coerces empty strings to null', () => {
    const rows = buildProfileRows({ ...base, email: '' });
    expect(rows.find((r) => r.label === 'Email')?.value).toBeNull();
  });

  it('treats missing fields as null (defensive coercion)', () => {
    const missing = { ...base, username: undefined as unknown as string | null };
    const rows = buildProfileRows(missing);
    expect(rows.find((r) => r.label === 'Username')?.value).toBeNull();
  });
});

describe('projectUserPayload', () => {
  it('drops created and updated', () => {
    const out = projectUserPayload(base);
    expect(out).not.toHaveProperty('created');
    expect(out).not.toHaveProperty('updated');
    expect(out.userId).toBe('u-1');
  });
});

describe('runUserGet', () => {
  it('retrieves the user and applies the agent projection', async () => {
    const userResource: IUserResource = { retrieve: vi.fn().mockResolvedValue(base) };
    const result = await runUserGet({ userResource });
    expect(result).not.toHaveProperty('created');
    expect(result.email).toBe('ada@example.test');
  });
});
