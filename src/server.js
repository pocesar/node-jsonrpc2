var net = require('net');
var http = require('http');
var extend = require('object-assign');
var JsonParser = require('jsonparse');
var Promise = require('bluebird');

module.exports = function (classes) {
  'use strict';

  var
    // Authorization Type Constants
    // other types to be added
    Authorization = {
      NONE: 'none',
      BASIC: 'basic',
      COOKIE: 'cookie',
      JWT: 'jwt'
    },

    UNAUTHORIZED = 'Unauthorized',
    METHOD_NOT_ALLOWED = 'Invalid Request',
    INVALID_REQUEST = 'Invalid Request',
    _ = classes._,
    Endpoint = classes.Endpoint,
    WebSocket = classes.Websocket,
    Error = classes.Error,

    /**
     * JSON-RPC Server.
     */
      Server = Endpoint.$define('Server', {
      construct: function ($super, opts) {
        $super();

        this.opts = opts || {};
        this.opts.type = typeof this.opts.type !== 'undefined' ? this.opts.type : 'http';
        this.opts.headers = this.opts.headers || {};
        this.opts.websocket = typeof this.opts.websocket !== 'undefined' ? this.opts.websocket : true;

        // Authorization
        this.authType = Authorization.NONE;
        this.authHandler = null;
        this.basicHandler = null;
        this.jwtHandler = null;
        this.cookieHandler = null;
      },
      _getAuthHeader: function (req) {
        var authHeader = null;
        switch (this.authType) {

          case Authorization.BASIC:
          case Authorization.JWT:
            authHeader = req.headers['authorization'] || '';
          break;

          case Authorization.COOKIE:
            authHeader = req.headers['cookie'] || '';
          break;
        }

        return authHeader;
      },
      _getAuthValue: function(header) {
        var value = null;
        switch (this.authType) {

          case Authorization.BASIC:
          case Authorization.JWT:
            value = header.split(/\s+/).pop() || '';
          break;

          case Authorization.COOKIE:
            value = header;
          break;
        }

        return value;
      },
      _checkAuth: function (req) {
        var self = this;

        if (self.authHandler) {
          var
            authHeader = self._getAuthHeader(req), // get the header
            authToken = self._getAuthValue(authHeader); // get the token

          switch (this.authType) {
            case Authorization.BASIC:
              var
                  auth = new Buffer(authToken, 'base64').toString(), // base64 -> string
                  parts = auth.split(/:/), // split on colon
                  username = parts[0],
                  password = parts[1];

              // i think it introduces some performance degradation due to double promisification.
              // i also think it might be negligible
              return self.authHandler(username, password, function callback(err, result) {
                if (err) {
                  return Promise.reject(err);
                }
                return Promise.resolve(result);
              });

            case Authorization.COOKIE:
            case Authorization.JWT:
              return self.authHandler(authToken, function callback(err, result) {
                if (err) {
                  return Promise.reject(err);
                }
                return Promise.resolve(result);
              });
          }
        } else {
          // Handle case for non auth server
          return Promise.resolve(true);
        }
      },
      _handleUnauthorized: function (req, res) {
        classes.EventEmitter.trace('<--', 'Unauthorized request');
        throw new Error.InvalidParams(UNAUTHORIZED);
      },
      /**
       * Start listening to incoming connections.
       */
      listen: function (port, host) {
        var self = this;
        var server = http.createServer();

        server.on('request', function onRequest(req, res) {
          self.handleHttp(req, res)
          .then(function(){
          })
          .catch(Error.ParseError, function(err){
            Server.handleHttpError(req, res, err, self.opts.headers);
          })
          .catch(Error.InvalidRequest, function(err){
            Server.handleHttpError(req, res, err, self.opts.headers);
          })
          ;
        });

        if (port) {
          server.listen(port, host);
          Endpoint.trace('***', 'Server listening on http://' +
            (host || '127.0.0.1') + ':' + port + '/');
        }

        if (this.opts.websocket === true) {
          server.on('upgrade', function onUpgrade(req, socket, body) {
            if (WebSocket.isWebSocket(req)) {
              self._checkAuth(req, socket).then(function (result) {
                if (result) {
                  return self.handleWebsocket(req, socket, body).then(function(result){
                    return conn.handleMessage(result);
                  });
                } else {
                  self._handleUnauthorized(req, socket);
                }
              })
              .catch(Error.InvalidParams, function (err) {
                Server.handleHttpError(req, socket, err, self.opts.headers);
              })
              .catch(function (err) {
                // handle internal server error from Check Authorization
                classes.EventEmitter.trace('<--', 'Internal Server Error');
                Server.handleHttpError(req, socket, new Error.InternalError(err.message), self.opts.headers);
              });
            }
          });
        }

        return server;
      },

      listenRaw: function (port, host) {
        var
          self = this,
          server = net.createServer(function createServer(socket) {
            self.handleRaw(socket).then(function(){

            });
          });

        server.listen(port, host);

        Endpoint.trace('***', 'Server listening on tcp://' +
          (host || '127.0.0.1') + ':' + port + '/');

        return server;
      },

      listenHybrid: function (port, host) {
        var
          self = this,
          httpServer = self.listen(),
          server = net.createServer(function createServer(socket) {
            self.handleHybrid(httpServer, socket).then(function(){

            });
          });

        server.listen(port, host);

        Endpoint.trace('***', 'Server (hybrid) listening on http+tcp://' +
          (host || '127.0.0.1') + ':' + port + '/');

        return server;
      },

      /**
       * Handle HTTP POST request.
       */
      handleHttp: function (req, res, callback) {
        var self = this;

        return new Promise(function(resolve, reject){

          var buffer = '';
          var headers;

          if (req.method === 'OPTIONS') {
            headers = {
              'Content-Length': 0,
              'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type'
            };
            headers = extend({}, headers, self.opts.headers);
            res.writeHead(200, headers);
            res.end();
            return resolve();
          }

          if (req.method !== 'POST') {
            return reject(new Error.InvalidRequest(METHOD_NOT_ALLOWED));
          }

          var handle = function handle(buf) {
            // Check if json is valid JSON document
            var decoded;

            try {
              decoded = JSON.parse(buf);
            } catch (error) {
              return reject(new Error.ParseError(INVALID_REQUEST));
            }

            // Check for the required fields, and if they aren't there, then
            // dispatch to the handleHttpError function.
            if (!decoded.method || !decoded.params) {
              Endpoint.trace('-->', 'Response (invalid request)');
              return reject(new Error.InvalidRequest(INVALID_REQUEST));
            }

            var reply = function reply(json) {
              var encoded;
              headers = {
                'Content-Type': 'application/json'
              };

              if (json) {
                encoded = JSON.stringify(json);
                headers['Content-Length'] = Buffer.byteLength(encoded, 'utf-8');
              } else {
                encoded = '';
                headers['Content-Length'] = 0;
              }

              headers = extend({}, headers, self.opts.headers);

              if (!conn.isStreaming) {
                res.writeHead(200, headers);
                res.write(encoded);
                res.end();
              } else {
                res.writeHead(200, headers);
                res.write(encoded);
                // Keep connection open
              }
            };

            var callback = function callback(err, result) {
              var response;

              if (err) {

                self.emit('error', err);

                Endpoint.trace('-->', 'Failure (id ' + decoded.id + '): ' +
                  (err.stack ? err.stack : err.toString()));

                result = null;

                if (!(err instanceof Error.AbstractError)) {
                  err = new Error.InternalError(err.toString());
                }

                response = {
                  'jsonrpc': '2.0',
                  'error': {code: err.code, message: err.message }
                };

              } else {
                Endpoint.trace('-->', 'Response (id ' + decoded.id + '): ' +
                  JSON.stringify(result));

                response = {
                  'jsonrpc': '2.0',
                  'result': typeof(result) === 'undefined' ? null : result
                };
              }

              // Don't return a message if it doesn't have an ID
              if (Endpoint.hasId(decoded)) {
                response.id = decoded.id;
                reply(response);
              } else {
                reply();
              }
            };

            var conn = new classes.HttpServerConnection(self, req, res);

            self.handleCall(decoded, conn, callback);
          }; // function handle(buf)

          self._checkAuth(req, res).then(function (result) {
            if (result) {  // successful authorization
              Endpoint.trace('<--', 'Accepted http request');

              req.on('data', function requestData(chunk) {
                buffer = buffer + chunk;
              });

              req.on('end', function requestEnd() {
                handle(buffer);
              });

            } else {
              self._handleUnauthorized(req, res);
            }
          }).catch(function (err) {
            // handle Internal Server Error from Check authorization
            classes.EventEmitter.trace('<--', 'Internal Server Error');
            reject(new Error.InternalError(err.message));
          });
        }).nodeify(callback).bind(this);
      },

      handleRaw: function (socket) {
        var self = this;

        return new Promise(function(resolve, reject){
          var conn;
          var parser;
          var requireAuth;

          Endpoint.trace('<--', 'Accepted socket connection');

          conn = new classes.SocketConnection(self, socket);
          parser = new JsonParser();
          requireAuth = !!this.authHandler;

          parser.onValue = function (decoded) {
            if (this.stack.length) {
              return;
            }

            // We're on a raw TCP socket. To enable authentication we implement a simple
            // authentication scheme that is non-standard, but is easy to call from any
            // client library.
            //
            // The authentication message is to be sent as follows:
            //   {'method': 'auth', 'params': ['myuser', 'mypass'], id: 0}
            if (requireAuth) {
              if (decoded.method !== 'auth') {
                // Try to notify client about failure to authenticate
                if (Endpoint.hasId(decoded)) {
                  conn.sendReply('Error: Unauthorized', null, decoded.id);
                  reject(new Error.InvalidParams(UNAUTHORIZED))
                }
              } else {
                // Handle 'auth' message
                if (_.isArray(decoded.params) &&
                  decoded.params.length === 2) {
                  self.authHandler(decoded.params[0], decoded.params[1]).then(function(){
                    // Authorization completed
                    requireAuth = false;

                    // Notify client about success
                    if (Endpoint.hasId(decoded)) {
                      conn.sendReply(null, true, decoded.id);
                    }
                  }).catch(reject)
                } else {
                  if (Endpoint.hasId(decoded)) {
                    conn.sendReply('Error: Invalid credentials', null, decoded.id);
                    reject(new Error.InvalidParams(UNAUTHORIZED))
                  }
                }
              }
              // Make sure we explicitly return here - the client was not yet auth'd.
            } else {
              resolve(conn.handleMessage(decoded));
            }
          };

          socket.on('data', function (chunk) {
            try {
              parser.write(chunk);
            } catch (err) {
              // TODO: Is ignoring invalid data the right thing to do?
            }
          });
        });
      },

      handleWebsocket: function (request, socket, body) {
        var self = this;

        return new Promise(function(resolve, reject){
          var conn;
          var parser;

          socket = new WebSocket(request, socket, body);

          Endpoint.trace('<--', 'Accepted Websocket connection');

          conn = new classes.WebSocketConnection(self, socket);
          parser = new JsonParser();

          parser.onValue = function (decoded) {
            if (this.stack.length) {
              return;
            }

            resolve(decoded);
          };

          socket.on('message', function (event) {
            try {
              parser.write(event.data);
            } catch (err) {
              // TODO: Is ignoring invalid data the right thing to do?
            }
          });
        })

      },

      handleHybrid: function (httpServer, socket) {
        var self = this;

        socket.once('data', function (chunk) {
          // If first byte is a capital letter, treat connection as HTTP
          if (chunk[0] >= 65 && chunk[0] <= 90) {
            // TODO: need to find a better way to do this
            http._connectionListener.call(httpServer, socket);
            socket.ondata(chunk, 0, chunk.length);
          } else {
            self.handleRaw(socket).then(function(){
              // Re-emit first chunk
              socket.emit('data', chunk);
            })
          }
        });
      },

      /**
       * Set the server to require basic authentication.
       *
       * Can be called with a custom handler function:
       *   server.enableBasicAuth(function (user, password) {
       *     return true; // Do authentication and return result as boolean
       *   });
       *
       * Or just with a single valid username and password:
       *   sever.enableBasicAuth(''myuser'', ''supersecretpassword'');
       */
      enableBasicAuth: function (handler, password) {
        if (!_.isFunction(handler)) {
          var user = '' + handler;
          password = '' + password;

          handler = function checkAuth(suppliedUser, suppliedPassword) {
            return user === suppliedUser && password === suppliedPassword;
          };
        }

        this.authType = Authorization.BASIC;
        this.basicHandler = handler;
        this.authHandler = Promise.method(this.basicHandler);

        return this;
      },
      /**
       * Set the server to require basic authorization through old handler.
       * (Deprecating)
       *
       */
      enableAuth: function (handler, password) {
        this.enableBasicAuth(handler, password);

        return this;
      },
      /**
       * Set the server to require cookie authorization.
       *
       * Can be called with a custom handler function:
       *   server.enableCookieAuth(function cookieAuthHandler(cookie) {
       *     // handle cookie authorization through a server or middleware
       *     return true;
       *   }
       *
       *
       */
      enableCookieAuth: function (handler) {
        if (_.isFunction(handler)) {
          this.authType = Authorization.COOKIE;
          this.cookieHandler = handler;
          this.authHandler = Promise.method(this.cookieHandler);
        }

        return this;
      },
      /**
       * Set the server to require Bearer (JWT) authorization.
       *
       * Can be called with a custom handler function:
       *   server.enableJWTAuth(function jwtAuthHandler(token) {
       *     // handle jwt authorization through server or middleware
       *     return true;
       *   }
       */
      enableJWTAuth: function (handler) {
        if (_.isFunction(handler)) {
          this.authType = Authorization.JWT;
          this.jwtHandler = handler;
          this.authHandler = Promise.method(this.jwtHandler);
        }

        return this;
      },
      /**
       * Set Authorization Type.
       *
       * Switch between two authorization types (Basic/Cookie), after they have
       * been initialized.
       * One must enable at least two authorization types with proper handler
       * before switching/setting to another Auth Type.
       */
      setAuthType: function (type) {
        type = type.toLowerCase();
        if (type && (_.values(Authorization).indexOf(type) > -1)) {
          this.authType = type;
          switch (this.authType) {
            case Authorization.BASIC:
              this.authHandler = Promise.method(this.basicHandler);
            break;

            case Authorization.COOKIE:
              this.authHandler = Promise.method(this.cookieHandler);
            break;

            case Authorization.JWT:
              this.authHandler = Promise.method(this.jwtHandler);
            break;

            default:
              this.authHandler = null;
            break;
          }
        }

        return this;
      }
    }, {
      /**
       * Handle a low level server error.
       */
      handleHttpError: function (req, res, error, custom_headers) {
        var message = JSON.stringify({
          'jsonrpc': '2.0',
          'error': {code: error.code, message: error.message},
          'id': null
        });
        custom_headers = custom_headers || {};
        var headers = extend({
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(message),
            'Access-Control-Allow-Headers': 'Content-Type',
            'Allow': 'POST'
        }, custom_headers);

        /*if (code === 401) {
         headers['WWW-Authenticate'] = 'Basic realm=' + 'JSON-RPC' + '';
         }*/

        if (res.writeHead) {
          res.writeHead(200, headers);
          res.write(message);
        } else {
          headers['Content-Length'] += 3;
          res.write(headers + '\n\n' + message + '\n');
        }
        res.end();
      }
    });

  return Server;
};
