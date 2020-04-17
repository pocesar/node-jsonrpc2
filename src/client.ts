import * as net from 'net'
import * as http from 'http'
import * as https from 'https'
import * as WebSocket from 'faye-websocket'
import * as JsonParser from 'jsonparse'
import { EventEmitter, RpcCallback, RpcConnectResult, RpcParams, RpcResponse } from './event-emitter'
import { Endpoint } from './endpoint'
import * as _ from 'lodash'
import * as Bluebird from 'bluebird'
import { SocketConnection } from './socket-connection'
import { WebsocketConnection } from './websocket-connection'
import * as Auth from './auth'
import * as Errors from './errors'

export interface ConnectHttpOptions extends http.RequestOptions {
  type?: 'http' | 'websocket' | 'socket'
  secure?: boolean
  rejectUnauthorized?: boolean
}

/**
 * JSON-RPC Client.
 */
export class Client extends Endpoint {
  protected auth: Auth.Auth | null = null
  protected id: number = 1

  constructor(public port: number, public host: string, auth?: Auth.Auth) {
    super()

    if (auth) {
      this.setAuth(auth)
    }
  }

  setAuth(auth: Auth.Auth) {
    this.auth = auth

    return this
  }

  incrementId() {
    return this.id++
  }

  /**
   * Make HTTP connection/request.
   *
   * In HTTP mode, we get to submit exactly one message and receive up to n
   * messages.
   */
  async connectHttp(
    method: string,
    params: RpcParams,
    opts: ConnectHttpOptions = {},
    callback?: RpcCallback<RpcConnectResult>,
  ) {
    let headers: any = {}

    if (this.auth instanceof Auth.Auth) {
      const authHeaders = await this.auth.client({ method, params, options: opts })

      if (authHeaders && authHeaders.headers) {
        headers = {
          ...authHeaders.headers
        }
      }
    }

    return new Bluebird<RpcConnectResult>((resolve, reject) => {
      let id = this.incrementId()

      // First we encode the request into JSON
      let requestJSON = JSON.stringify({
        id: id,
        method: method,
        params: params,
        jsonrpc: '2.0'
      })

      headers['Host'] = this.host
      headers['Content-Length'] = Buffer.byteLength(requestJSON, 'utf8')

      let options: http.RequestOptions & https.RequestOptions = {
        hostname: this.host,
        port: this.port,
        path: opts.path || '/',
        method: 'POST',
        headers: headers
      }

      let request: http.ClientRequest

      if (opts.secure === true) {
        if (typeof opts.rejectUnauthorized !== 'undefined') {
          options.rejectUnauthorized = opts.rejectUnauthorized
        }

        request = https.request(options)
      } else {
        request = http.request(options)
      }

      request.on('error', (err) => {
        reject(Errors.wrapError(err, Errors.InternalError).setCode((err as any).errno))
      })

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          return reject((new Errors.InvalidRequest(response.statusMessage)).setCode(response.statusCode))
        }

        resolve({ id, request, response })
      })

      request.write(requestJSON)
    }).asCallback(callback)
  }

  async connectWebsocket(
    callback?: RpcCallback<RpcConnectResult>
  ) {
    return new Bluebird((resolve, reject) => {
      let headers: any = {}

      if (!/^wss?:\/\//i.test(this.host)) {
        this.host = 'ws://' + this.host + ':' + this.port + '/'
      }

      this._authHeader(headers)

      const socket = new WebSocket.Client(this.host, null, { headers: headers })

      const conn = new WebSocketConnection(this, socket)

      const parser = new JsonParser()

      parser.onValue = function parseOnValue(decoded: any) {
        if (this.stack.length) {
          return
        }

        conn.handleMessage(decoded)
      }

      socket.on('error', event => {
        callback(event.reason)
      })

      socket.on('open', () => {
        callback(null, conn)
      })

      socket.on('message', event => {
        try {
          parser.write(event.data)
        } catch (err) {
          EventEmitter.trace('<--', err.toString())
        }
      })

      return conn
    })
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
        conn.call('auth', [this.user, this.password], function connectionAuth(err) {
          if (err) {
            callback(err)
          } else {
            callback(null, conn)
          }
        })
        return
      }

      if (_.isFunction(callback)) {
        callback(null, conn)
      }
    })

    const conn = new SocketConnection(this, socket)
    const parser = new JsonParser()

    parser.onValue = function parseOnValue(decoded: any) {
      if (this.stack.length) {
        return
      }

      conn.handleMessage(decoded)
    }

    socket.on('data', chunk => {
      try {
        parser.write(chunk)
      } catch (err) {
        EventEmitter.trace('<--', err.toString())
      }
    })

    return conn
  }

  stream(method: string, params: any[], callback, opts = {}) {
    this.connectHttp(method, params, opts, function connectHttp(id, request, response) {
      if (_.isFunction(callback)) {
        var connection = new EventEmitter()

        connection.id = id
        connection.req = request
        connection.res = response

        connection.expose = function connectionExpose(method, callback) {
          connection.on('call:' + method, function connectionCall(data) {
            callback.call(null, data.params || [])
          })
        }

        connection.end = function connectionEnd() {
          this.req.connection.end()
        }

        // We need to buffer the response chunks in a nonblocking way.
        var parser = new JsonParser()
        parser.onValue = function (decoded) {
          if (this.stack.length) {
            return
          }

          connection.emit('data', decoded)
          if (
            decoded.hasOwnProperty('result') ||
            (decoded.hasOwnProperty('error') && decoded.id === id && _.isFunction(callback))
          ) {
            connection.emit('result', decoded)
          } else if (decoded.hasOwnProperty('method')) {
            connection.emit('call:' + decoded.method, decoded)
          }
        }

        if (response) {
          // Handle headers
          connection.res.once('data', function connectionOnce(data) {
            if (connection.res.statusCode === 200) {
              callback(null, connection)
            } else {
              callback(new Error('"' + connection.res.statusCode + '"' + data))
            }
          })

          connection.res.on('data', function connectionData(chunk) {
            try {
              parser.write(chunk)
            } catch (err) {
              // TODO: Is ignoring invalid data the right thing to do?
            }
          })

          connection.res.on('end', function connectionEnd() {
            // TODO: Issue an error if there has been no valid response message
          })
        }
      }
    })
  }

  async call<T>(
    method: string,
    params: RpcParams,
    opts: ConnectHttpOptions = {},
    callback?: RpcCallback<RpcResponse<T>>,
  ) {
    EventEmitter.trace('-->', 'Http call (method ' + method + '): ' + JSON.stringify(params))

    const conn = await this.connectHttp(
      method,
      params,
      opts
    )

    if (!conn.response) {
      throw new Errors.RpcError('Have no response object')
    }

    return new Bluebird<RpcResponse<T>>((resolve, reject) => {
      const parser = new JsonParser()

      parser.onValue = function(value: any) {
        if (this.stack.length === 0 && value) {
          resolve(value)
        }
      }

      parser.onError = function(err: Error) {
        reject(new Errors.ParseError(err.message))
      }

      conn.response.on('data', function responseData(chunk) {
        parser.write(chunk)
      })

      conn.response.on('end', function responseEnd() {
        parser.onValue = parser.onError = function() { }
      })
    }).asCallback(callback)
  }
}
