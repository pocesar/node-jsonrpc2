/**
 * JSON-RPC 2.0 Specification Errors codes by dcharbonnier
 */

export interface JsonError {
  code: number;
  message: string;
  data?: any;
}

export class RpcError<T = any> extends Error {
  code: number

  constructor(message: string, private data: T | void = undefined) {
    super(message);

    this.message = message || this.constructor.name;

    Error["captureStackTrace"](this, this.constructor);
  }

  toString() {
    return `[${this.constructor.name}]: ${this.message}
    ${this.data ? `data:
      ${JSON.stringify(this.data)}
    ` : ''}`;
  }

  toJSON(): JsonError {
    return {
      code: this.code,
      data: this.data,
      message: this.message
    }
  }
}

export class ParseError<T = any> extends RpcError<T> {
  code = -32700;
}

export class InvalidRequest<T = any> extends RpcError<T> {
  code = -32600;
}

export class MethodNotFound<T = any> extends RpcError<T> {
  code = -32601;
}

export class InvalidParams<T = any> extends RpcError<T> {
  code = -32602;
}

export class InternalError<T = any> extends RpcError<T> {
  code = -32603;
}

export class ServerError<T = any> extends RpcError<T> {
  code = -32000;
}
