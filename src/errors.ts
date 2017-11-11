/*
 *JSON-RPC 2.0 Specification Errors codes by dcharbonnier
 */
export class AbstractError<T = any> extends Error {
  extra: T | {};

  constructor(message: string, extra: T | {} = {}) {
    super(message);

    this.extra = extra || {};
    this.message = message || this.constructor.name;

    Error["captureStackTrace"](this, this.constructor);
  }

  toString() {
    return this.message;
  }
}

export class ParseError extends AbstractError {
  code = -32700;
}

export class InvalidRequest extends AbstractError {
  code = -32600;
}

export class MethodNotFound extends AbstractError {
  code = -32601;
}

export class InvalidParams extends AbstractError {
  code = -32602;
}

export class InternalError extends AbstractError {
  code = -32603;
}

export class ServerError extends AbstractError {
  code = -32000;
}
