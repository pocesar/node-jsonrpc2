import { EventEmitter, RPCCallback, RPCId, Request } from "./event-emitter";
import * as _ from "lodash";
import { Endpoint } from "./endpoint";

export type Callbacks = {
  [index: string]: RPCCallback
  [index: number]: RPCCallback
}

export class Connection extends EventEmitter {
  callbacks: Callbacks;
  latestId: RPCId;

  constructor(protected endpoint: Endpoint) {
    super();

    this.callbacks = Object.create(null);
    this.latestId = 0;

    // Default error handler (prevents ''uncaught error event'')
    this.on("error", function() {});
  }

  /**
   * Make a standard RPC call to the other endpoint.
   *
   * Note that some ways to make RPC calls bypass this method, for example HTTP
   * calls and responses are done in other places.
   */
  call(method: string, params: any[], callback: RPCCallback) {
    if (!_.isArray(params)) {
      params = [params];
    }

    var id = null;

    if (_.isFunction(callback)) {
      id = ++(this.latestId as number);
      this.callbacks[id] = callback;
    }

    EventEmitter.trace(
      "-->",
      "Connection call (method " + method + "): " + JSON.stringify(params)
    );

    this.write(
      JSON.stringify({
        jsonrpc: "2.0",
        method: method,
        params: params,
        id: id
      })
    );
  }

  /**
   * Dummy method for sending data.
   *
   * Connection types that support sending additional data will override this
   * method.
   */
  write(data?: any) {
    throw new Error("Tried to write data on unsupported connection type.");
  }

  /**
   * Keep the connection open.
   *
   * This method is used to tell a HttpServerConnection to stay open. In order
   * to keep it compatible with other connection types, we add it here and make
   * it register a connection end handler.
   */
  stream(onend: () => void) {
    if (_.isFunction(onend)) {
      this.on("end", function() {
        onend();
      });
    }
  }

  handleMessage(msg: Request<any>) {
    var self = this;

    if (msg) {
      if ((_.has(msg, "result") || _.has(msg, "error")) && _.has(msg, "id")) {
        // Are we in the client?
        try {
          this.callbacks[msg.id](msg.error, msg.result);

          delete this.callbacks[msg.id];
        } catch (err) {
          EventEmitter.trace(
            "<---",
            "Callback not found " +
              msg.id +
              ": " +
              (err.stack ? err.stack : err.toString())
          );
        }
      } else if (msg.hasOwnProperty("method")) {
        // Are we in the server?
        this.endpoint.handleCall(msg, this, (err, result) => {
          if (err) {
            self.emit("error", err);

            EventEmitter.trace(
              "-->",
              "Failure " +
                (EventEmitter.hasId(msg) ? "(id " + msg.id + ")" : "") +
                ": " +
                (err.stack ? err.stack : err.toString())
            );
          }

          // Return if it's just a notification (no id)
          if (!EventEmitter.hasId(msg)) {
            return;
          }

          if (err) {
            err = err.toString();
            result = null;
          } else {
            EventEmitter.trace(
              "-->",
              "Response (id " + msg.id + "): " + JSON.stringify(result)
            );
            err = null;
          }

          self.sendReply(err, result, msg.id);
        });
      }
    }
  }

  sendReply(err, result, id) {
    var data = JSON.stringify({
      jsonrpc: "2.0",
      result: result,
      error: err,
      id: id
    });

    this.write(data);
  }
}
