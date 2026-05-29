import { redactJsonBody, redactRawBody } from './utils/redact.js';

export class InflowSdkError extends Error {
  readonly code: string;
  override readonly cause?: unknown;

  constructor(message: string, options: { code?: string; cause?: unknown } = {}) {
    super(message);
    this.name = 'InflowSdkError';
    this.code = options.code ?? 'sdk_error';
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class InflowConfigurationError extends InflowSdkError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { ...options, code: 'configuration_error' });
    this.name = 'InflowConfigurationError';
  }
}

export class InflowAuthenticationError extends InflowSdkError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { ...options, code: 'not_authenticated' });
    this.name = 'InflowAuthenticationError';
  }
}

export class InflowTransportError extends InflowSdkError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { ...options, code: 'transport_error' });
    this.name = 'InflowTransportError';
  }
}

export class InflowApiError extends InflowSdkError {
  readonly status: number;
  readonly rawBody?: string;
  readonly details?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      rawBody?: string;
      details?: unknown;
      cause?: unknown;
    },
  ) {
    const initOptions: { code: string; cause?: unknown } = {
      code: options.code ?? 'api_error',
    };
    if (options.cause !== undefined) {
      initOptions.cause = options.cause;
    }
    super(message, initOptions);
    this.name = 'InflowApiError';
    this.status = options.status;
    if (options.rawBody !== undefined) {
      this.rawBody = redactRawBody(options.rawBody);
    }
    if (options.details !== undefined) {
      this.details = redactJsonBody(options.details);
    }
  }
}
