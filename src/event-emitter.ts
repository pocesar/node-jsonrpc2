import * as Debug from "debug";
import { EventEmitter as EE3 } from "eventemitter3";

const debug = Debug("jsonrpc");

export type RPCId = number | string | null;
export type RPCCallback<T> = (err: Error, result?: T) => void;

export interface Request<T> {
  id: RPCId;
  error: Error;
  result: T;
}

export default class EventEmitter extends EE3 {
  /**
   * Output a piece of debug information.
   */
  static trace(direction: string, message: string) {
    var msg = `   ${direction}    ${message}`;
    debug(msg);
    return msg;
  }

  /**
   * Check if current request has an id adn it is of type integer (non fractional) or string.
   */
  static hasId(request: Request<any>) {
    return (
      request &&
      typeof request["id"] !== "undefined" &&
      ((typeof request["id"] === "number" && /^\-?\d+$/.test(`${request["id"]}`)) ||
        typeof request["id"] === "string" ||
        request["id"] === null)
    );
  }
}
