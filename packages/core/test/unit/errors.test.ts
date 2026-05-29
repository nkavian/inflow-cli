import { describe, expect, it } from 'vitest';
import {
  InflowApiError,
  InflowAuthenticationError,
  InflowConfigurationError,
  InflowSdkError,
  InflowTransportError,
} from '../../src/errors.js';

describe('errors', () => {
  it('InflowSdkError sets default code and name', () => {
    const e = new InflowSdkError('boom');
    expect(e.name).toBe('InflowSdkError');
    expect(e.message).toBe('boom');
    expect(e.code).toBe('sdk_error');
    expect(e.cause).toBeUndefined();
  });

  it('InflowSdkError accepts code and cause', () => {
    const cause = new Error('inner');
    const e = new InflowSdkError('boom', { code: 'x', cause });
    expect(e.code).toBe('x');
    expect(e.cause).toBe(cause);
  });

  it('InflowConfigurationError forces configuration_error code', () => {
    const e = new InflowConfigurationError('missing');
    expect(e.code).toBe('configuration_error');
    expect(e.name).toBe('InflowConfigurationError');
    expect(e).toBeInstanceOf(InflowSdkError);
  });

  it('InflowAuthenticationError forces not_authenticated code', () => {
    const e = new InflowAuthenticationError('login first');
    expect(e.code).toBe('not_authenticated');
    expect(e.name).toBe('InflowAuthenticationError');
  });

  it('InflowTransportError forces transport_error code', () => {
    const e = new InflowTransportError('network down', { cause: 'eof' });
    expect(e.code).toBe('transport_error');
    expect(e.cause).toBe('eof');
  });

  it('InflowApiError carries status, rawBody, details, code', () => {
    const e = new InflowApiError('nope', {
      status: 403,
      code: 'forbidden',
      rawBody: '{"x":1}',
      details: { x: 1 },
    });
    expect(e.status).toBe(403);
    expect(e.code).toBe('forbidden');
    expect(e.rawBody).toBe('{"x":1}');
    expect(e.details).toEqual({ x: 1 });
    expect(e.name).toBe('InflowApiError');
  });

  it('InflowApiError defaults code to api_error', () => {
    const e = new InflowApiError('nope', { status: 500 });
    expect(e.code).toBe('api_error');
    expect(e.rawBody).toBeUndefined();
    expect(e.details).toBeUndefined();
  });
});
