import { setupServer } from 'msw/node';
import type { RequestHandler } from 'msw';

export function makeServer(...handlers: RequestHandler[]): ReturnType<typeof setupServer> {
  return setupServer(...handlers);
}
