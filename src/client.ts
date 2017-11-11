import * as net from "net";
import * as http from "http";
import * as https from "https";
import * as WebSocket from "faye-websocket";
import * as JsonParser from "jsonparse";
import EventEmitter, { RPCCallback } from "./event-emitter";
import Endpoint from "./endpoint";
import * as _ from "lodash";
import SocketConnection from "./socket-connection";
import WebSocketConnection from "./websocket-connection";
import * as Auth from './auth'

export interface ConnectHTTPOptions extends http.RequestOptions {
  https?: boolean;
  rejectUnauthorized?: boolean;
}

/**
 * JSON-RPC Client.
 */
export default class Client extends Endpoint {
  protected auth: Auth.Auth | null = null

  constructor(public port: number, public host: string, auth?: Auth.Auth) {
    super();

    if (auth) {
      this.addAuth(auth)
    }
  }

  addAuth(auth: Auth.Auth) {
    this.auth = auth

    return this
  }

  /**
   * Make HTTP connection/request.
   *
   * In HTTP mode, we get to submit exactly one message and receive up to n
   * messages.
   */
  async connectHttp<T>(method: string, params: any[], callback: RPCCallback<T>, opts: ConnectHTTPOptions  = {}) {
    let id = 1;

    // First we encode the request into JSON
    let requestJSON = JSON.stringify({
      id: id,
      method: method,
      params: params,
      jsonrpc: "2.0"
    });

    let headers: any = {};

    if (this.auth) {
      await this.auth.set('http')
    }

    // Then we build some basic headers.
    headers["Host"] = this.host;
    headers["Content-Length"] = Buffer.byteLength(requestJSON, "utf8");

    // Now we'll make a request to the server
    let options: http.RequestOptions & https.RequestOptions = {
      hostname: this.host,
      port: this.port,
      path: opts.path || "/",
      method: "POST",
      headers: headers
    };

    let request: http.ClientRequest;

    if (opts.https === true) {
      if (opts.rejectUnauthorized !== undefined) {
        options.rejectUnauthorized = opts.rejectUnauthorized;
      }

      request = https.request(options);
    } else {
      request = http.request(options);
    }

    // Report errors from the http client. This also prevents crashes since
    // an exception is thrown if we don't handle this event.
    request.on("error", (err) => {
      callback(err instanceof Error ? err : new Error(err))
    });

    request.write(requestJSON);

    request.on("response", (response) => {
      callback(id, request, response)
    })
  }

  async connectWebsocket<T>(callback: RPCCallback<T>) {
    let headers: any = {};

    if (!/^wss?:\/\//i.test(this.host)) {
      this.host = "ws://" + this.host + ":" + this.port + "/";
    }

    this._authHeader(headers);

    const socket = new WebSocket.Client(this.host, null, { headers: headers });

    const conn = new WebSocketConnection(this, socket);

    const parser = new JsonParser();

    parser.onValue = function parseOnValue(decoded: any) {
      if (this.stack.length) {
        return;
      }

      conn.handleMessage(decoded);
    };

    socket.on("error", (event) => {
      callback(event.reason);
    });

    socket.on("open", () => {
      callback(null, conn);
    });

    socket.on("message", (event) => {
      try {
        parser.write(event.data);
      } catch (err) {
        EventEmitter.trace("<--", err.toString());
      }
    });

    return conn;
  }

  /**
   * Make Socket connection.
   *
   * This implements JSON-RPC over a raw socket. This mode allows us to send and
   * receive as many messages as we like once the socket is established.
   */
  connectSocket(callback) {
    const socket = net.connect(this.port, this.host, () => {
      // Submit non-standard 'auth' message for raw sockets.
      if (!_.isEmpty(this.user) && !_.isEmpty(this.password)) {
        conn.call("auth", [this.user, this.password], function connectionAuth(
          err
        ) {
          if (err) {
            callback(err);
          } else {
            callback(null, conn);
          }
        });
        return;
      }

      if (_.isFunction(callback)) {
        callback(null, conn);
      }
    });

    const conn = new SocketConnection(this, socket);
    const parser = new JsonParser();

    parser.onValue = function parseOnValue(decoded: any) {
      if (this.stack.length) {
        return;
      }

      conn.handleMessage(decoded);
    };

    socket.on("data", (chunk) => {
      try {
        parser.write(chunk);
      } catch (err) {
        EventEmitter.trace("<--", err.toString());
      }
    });

    return conn;
  }

  stream(method: string, params: any[], callback, opts = {}) {

    this.connectHttp(method, params, opts, function connectHttp(
      id,
      request,
      response
    ) {
      if (_.isFunction(callback)) {
        var connection = new EventEmitter();

        connection.id = id;
        connection.req = request;
        connection.res = response;

        connection.expose = function connectionExpose(method, callback) {
          connection.on("call:" + method, function connectionCall(data) {
            callback.call(null, data.params || []);
          });
        };

        connection.end = function connectionEnd() {
          this.req.connection.end();
        };

        // We need to buffer the response chunks in a nonblocking way.
        var parser = new JsonParser();
        parser.onValue = function(decoded) {
          if (this.stack.length) {
            return;
          }

          connection.emit("data", decoded);
          if (
            decoded.hasOwnProperty("result") ||
            (decoded.hasOwnProperty("error") &&
              decoded.id === id &&
              _.isFunction(callback))
          ) {
            connection.emit("result", decoded);
          } else if (decoded.hasOwnProperty("method")) {
            connection.emit("call:" + decoded.method, decoded);
          }
        };

        if (response) {
          // Handle headers
          connection.res.once("data", function connectionOnce(data) {
            if (connection.res.statusCode === 200) {
              callback(null, connection);
            } else {
              callback(new Error('"' + connection.res.statusCode + '"' + data));
            }
          });

          connection.res.on("data", function connectionData(chunk) {
            try {
              parser.write(chunk);
            } catch (err) {
              // TODO: Is ignoring invalid data the right thing to do?
            }
          });

          connection.res.on("end", function connectionEnd() {
            // TODO: Issue an error if there has been no valid response message
          });
        }
      }
    });
  }

  async call<T>(method: string, params: any[], callback?: RPCCallback<T>, opts: ConnectHTTPOptions = {}) {
    EventEmitter.trace(
      "-->",
      "Http call (method " + method + "): " + JSON.stringify(params)
    );

    this.connectHttp(method, params, (
      request,
      response
    ) => {
      // Check if response object exists.
      if (!response) {
        callback(new Error("Have no response object"));
        return;
      }

      var data = "";

      response.on("data", function responseData(chunk) {
        data += chunk;
      });

      response.on("end", function responseEnd() {
        if (response.statusCode !== 200) {
          return callback(new Error('"' + response.statusCode + '"' + data));
        }

        if (_.isFunction(callback)) {
          let decoded: any;

          try {
            decoded = JSON.parse(data);
          } catch (e) {
            return callback(e)
          }

          if (!decoded.error) {
            decoded.error = null;
          }
          callback(decoded.error, decoded.result);
        }
      });
    }, opts);
  }
}
