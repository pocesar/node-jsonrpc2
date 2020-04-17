import { EventEmitter, RPCCallback } from "./event-emitter";
import * as _ from "lodash";
import * as Errors from "./errors";

/**
 * Abstract base class for RPC endpoints.
 *
 * Has the ability to register RPC events and expose RPC methods.
 */
export class Endpoint extends EventEmitter {
  functions: {}
  scopes: {}

  constructor() {
    super();

    this.functions = Object.create(null);
    this.scopes = Object.create(null);
  }

  namespace(name: string, functions: { [index: string]: RPCCallback<any> }) {
  }

  /**
   * Define a callable method on this RPC endpoint
   */
  expose(name, func, scope) {
    if (_.isFunction(func)) {
      EventEmitter.trace("***", "exposing: " + name);
      this.functions[name] = func;

      if (scope) {
        this.scopes[name] = scope;
      }
    } else {
      var funcs = [];

      for (var funcName in func) {
        if (Object.prototype.hasOwnProperty.call(func, funcName)) {
          var funcObj = func[funcName];
          if (_.isFunction(funcObj)) {
            this.functions[name + "." + funcName] = funcObj;
            funcs.push(funcName);

            if (scope) {
              this.scopes[name + "." + funcName] = scope;
            }
          }
        }
      }

      EventEmitter.trace(
        "***",
        "exposing module: " + name + " [funs: " + funcs.join(", ") + "]"
      );
    }
    return func;
  }

  handleCall<T>(decoded: T, conn: , callback: RPCCallback) {
    EventEmitter.trace(
      "<--",
      "Request (id " +
        decoded.id +
        "): " +
        decoded.method +
        "(" +
        JSON.stringify(decoded.params) +
        ")"
    );

    if (!this.functions.hasOwnProperty(decoded.method)) {
      callback(
        new Errors.MethodNotFound('Unknown RPC call "' + decoded.method + '"')
      );
      return;
    }

    var method = this.functions[decoded.method];
    var scope = this.scopes[decoded.method] || this.defaultScope;

    // Try to call the method, but intercept errors and call our
    // error handler.
    try {
      method.call(scope, decoded.params, conn, callback);
    } catch (err) {
      callback(err);
    }
  }
}
