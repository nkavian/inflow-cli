import { sanitizeDeep } from './sanitize-text.js';

export function sanitizeResource<T extends object>(resource: T): T {
  return new Proxy(resource, {
    get(target, prop, receiver) {
      const value: unknown = Reflect.get(target, prop, receiver);

      if (typeof value !== 'function') {
        return value;
      }

      const method = value as (...args: unknown[]) => unknown;
      return (...args: unknown[]) => {
        const result = method.apply(target, args);
        if (
          result !== null &&
          typeof result === 'object' &&
          typeof (result as { then?: unknown }).then === 'function'
        ) {
          return (result as Promise<unknown>).then(sanitizeDeep);
        }
        return result;
      };
    },
  });
}
