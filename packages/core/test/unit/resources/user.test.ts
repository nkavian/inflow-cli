import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { InflowApiError, InflowTransportError } from '../../../src/errors.js';
import { UserResource } from '../../../src/resources/user.js';
import { BASE_URL, userHappy } from '../fixtures/handlers.js';
import { makeServer } from '../fixtures/server.js';

const server = makeServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('UserResource', () => {
  it('returns the User shape verbatim', async () => {
    server.use(userHappy);
    const r = new UserResource({
      apiBaseUrl: BASE_URL,
      accessToken: 'tk',
    });
    const user = await r.retrieve();
    expect(user.userId).toBe('u-1');
    expect(user.email).toBe('a@example.com');
    expect(user.firstName).toBeNull();
    expect(user.locale).toBe('EN_US');
  });

  it('throws InflowApiError on non-2xx (e.g., 404)', async () => {
    server.use(http.get(`${BASE_URL}/v1/users/self`, () => new HttpResponse(null, { status: 404 })));
    const r = new UserResource({
      apiBaseUrl: BASE_URL,
      accessToken: 'tk',
    });
    await expect(r.retrieve()).rejects.toBeInstanceOf(InflowApiError);
  });

  it('aborts the underlying fetch when the caller-supplied signal fires', async () => {
    server.use(
      http.get(`${BASE_URL}/v1/users/self`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json({});
      }),
    );
    const r = new UserResource({
      apiBaseUrl: BASE_URL,
      accessToken: 'tk',
    });
    const controller = new AbortController();
    const pending = r.retrieve({ signal: controller.signal });
    setTimeout(() => controller.abort(), 10);
    await expect(pending).rejects.toBeInstanceOf(InflowTransportError);
  });
});
