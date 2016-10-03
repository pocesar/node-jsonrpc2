'use strict';

var
  expect = require('expect.js'),
  rpc = require('../src/jsonrpc.js'),
  Errors = rpc.Error,
  server, client, serverHandle;

module.exports = {
  'Json-Rpc2 Authorization -': {
    'Deprecated Basic -': {
      beforeEach: function () {
        // Server
        server = rpc.Server.$create({
          websocket: true
        });

        server.expose('echo', function (args, opts, callback) {
          // callback(err, result)
          callback(null, args[0]);
        });

        server.expose('throw_error', function (args, opts, callback) {
          throw new Errors.InternalError();
        });

        serverHandle = server.listen(8088, 'localhost');
        // Deprecated Authorization
        server.enableAuth('user', 'pass');
      },

      afterEach: function () {
        serverHandle.close();
        serverHandle = null;
        server = null;
        client = null;
      },
      
      'check throw error - should return 200 OK': function (done) {
        // Client
        client = rpc.Client.$create(8088, 'localhost', 'user', 'pass');
        var message = ['Hello, Authorization!'];

        client.call('throw_error', message, function (err, result) {
          expect(err.code).to.equal((new Errors.InternalError()).code);
          expect(err.message).to.be.string('InternalError');

          done();
        });
      },
      
      'client constructor - should return 200 OK': function (done) {
        // Client
        client = rpc.Client.$create(8088, 'localhost', 'user', 'pass');
        var message = ['Hello, Authorization!'];

        client.call('echo', message, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(message[0]);

          done();
        });
      },

      'client constructor - should return -32602 Unauthorized': function (done) {
        // Client
        client = rpc.Client.$create(8088, 'localhost', 'wrong-user', 'wrong-pass');
        var message = ['Hello, Authorization!'];

        client.call('echo', message, function (err, result) {
          expect(result).to.equal(undefined);
          expect(err.code).to.equal((new Errors.InvalidParams()).code);
          expect(err.message).to.be.string('Unauthorized');

          done();
        });
      },
      
      'client basicAuth function - should return 200 OK': function (done) {
        // Client
        client = rpc.Client.$create(8088, 'localhost');
        client.basicAuth('user', 'pass');
        var message = ['Hello, Authorization!'];

        client.call('echo', message, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(message[0]);

          done();
        });
      },

      'client basicAuth function - should return -32602 Unauthorized': function (done) {
        // Client
        client = rpc.Client.$create(8088, 'localhost');
        client.basicAuth('wrong-user', 'wrong-pass');
        var message = ['Hello, Authorization!'];

        client.call('echo', message, function (err, result) {
          expect(result).to.equal(undefined);
          expect(err.code).to.equal((new Errors.InvalidParams()).code);
          expect(err.message).to.be.string('Unauthorized');

          done();
        });
      }
    },

    'Basic -': {
      beforeEach: function () {
        // Server
        server = rpc.Server.$create({
          websocket: true
        });

        server.expose('echo', function (args, opts, callback) {
          // callback(err, result)
          callback(null, args[0]);
        });

        serverHandle = server.listen(8088, 'localhost');
        // Basic Authorization
        server.enableBasicAuth('user', 'pass');
      },

      afterEach: function () {
        serverHandle.close();
        serverHandle = null;
        server = null;
        client = null;
      },

      'client constructor - should return 200 OK': function (done) {
        // Client
        client = rpc.Client.$create(8088, 'localhost', 'user', 'pass');
        var message = ['Hello, Authorization!'];

        client.call('echo', message, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(message[0]);

          done();
        });
      },

      'client constructor - should return -32602 Unauthorized': function (done) {
        // Client
        client = rpc.Client.$create(8088, 'localhost', 'wrong-user', 'wrong-pass');
        var message = ['Hello, Authorization!'];

        client.call('echo', message, function (err, result) {
          expect(result).to.equal(undefined);
          expect(err.code).to.equal((new Errors.InvalidParams()).code);
          expect(err.message).to.be.string('Unauthorized');

          done();
        });
      },

      'client basicAuth function - should return 200 OK': function (done) {
        // Client
        client = rpc.Client.$create(8088, 'localhost');
        client.basicAuth('user', 'pass');
        var message = ['Hello, Authorization!'];

        client.call('echo', message, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(message[0]);

          done();
        });
      },

      'client basicAuth function - should return -32602 Unauthorized': function (done) {
      // Client
      client = rpc.Client.$create(8088, 'localhost');
      client.basicAuth('wrong-user', 'wrong-pass');
      var message = ['Hello, Authorization!'];

      client.call('echo', message, function (err, result) {
        expect(result).to.equal(undefined);
        expect(err.code).to.equal((new Errors.InvalidParams()).code);
        expect(err.message).to.be.string('Unauthorized');

        done();
      });

    }
    },

    'Cookie -': {
      beforeEach: function () {
        // Server
        server = rpc.Server.$create({
          websocket: true
        });

        server.expose('echo', function (args, opts, callback) {
          // callback(err, result)
          callback(null, args[0]);
        });

        serverHandle = server.listen(8088, 'localhost');
        // Cookie Authorization
        server.enableCookieAuth(function (cookieValue) {
          return (cookieValue === 'validCookieValue');
        });
      },

      afterEach: function () {
        serverHandle.close();
        serverHandle = null;
        server = null;
        client = null;
      },

      'client cookieAuth function - should return 200 OK': function (done) {
        // Client
        client = rpc.Client.$create(8088, 'localhost');
        client.cookieAuth('validCookieValue');
        var message = ['Hello, Authorization!'];

        client.call('echo', message, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(message[0]);

          done();
        });
      },

      'client cookieAuth function - should return -32602 Unauthorized': function (done) {
      // Client
      client = rpc.Client.$create(8088, 'localhost');
      client.cookieAuth('wrongCookieValue');
      var message = ['Hello, Authorization!'];

      client.call('echo', message, function (err, result) {
        expect(result).to.equal(undefined);
        expect(err.code).to.equal((new Errors.InvalidParams()).code);
        expect(err.message).to.be.string('Unauthorized');

        done();
      });

    }
  },

    'Bearer (JWT) -': {
      beforeEach: function () {
      // Server
      server = rpc.Server.$create({
        websocket: true
      });

      server.expose('echo', function (args, opts, callback) {
        // callback(err, result)
        callback(null, args[0]);
      });

      serverHandle = server.listen(8088, 'localhost');
      // Bearer (JWT) Authorization
      server.enableJWTAuth(function (tokenValue) {
        return (tokenValue === 'validTokenValue');
      });
      },

      afterEach: function () {
      serverHandle.close();
      serverHandle = null;
      server = null;
      client = null;
      },

      'client cookieAuth function - should return 200 OK': function (done) {
      // Client
      client = rpc.Client.$create(8088, 'localhost');
      client.jwtAuth('validTokenValue');
      var message = ['Hello, Authorization!'];

      client.call('echo', message, function (err, result) {
        if (err) {
          return done(new Error(JSON.stringify(err)));
        }

        expect(JSON.stringify(result)).to.be.string(message[0]);

        done();
      });
      },

      'client cookieAuth function - should return -32602 Unauthorized': function (done) {
          // Client
          client = rpc.Client.$create(8088, 'localhost');
          client.jwtAuth('wrongTokenValue');
          var message = ['Hello, Authorization!'];

          client.call('echo', message, function (err, result) {
            expect(result).to.equal(undefined);
            expect(err.code).to.equal((new Errors.InvalidParams()).code);
            expect(err.message).to.be.string('Unauthorized');

            done();
          });

        }
    },

    'Mixed -': {
      beforeEach: function () {
        server = rpc.Server.$create({
          websocket: true
        });

        server.expose('echo', function (args, opts, callback) {
          callback(null, args[0]);
        });

        serverHandle = server.listen(8088, 'localhost');

        // Server Authorization
        server.enableBasicAuth('user', 'pass');
        server.enableCookieAuth(function (cookieValue) {
          return (cookieValue === 'validCookieValue');
        });
        server.enableJWTAuth(function (tokenValue) {
          return (tokenValue === 'validTokenValue');
        });

        // Client Authorization
        client = rpc.Client.$create(8088, 'localhost');
        client.basicAuth('user', 'pass');
        client.cookieAuth('validCookieValue');
        client.jwtAuth('validTokenValue');
      },

      afterEach: function () {
        serverHandle.close();
        serverHandle = null;
        server = null;
        client = null;
      },

      'basic/cookie - switch both - should return 200 OK': function (done) {
        server.setAuthType('basic');
        client.setAuthType('basic');

        var params = ['Hello! Mixed Authorization'];

        // We MUST enable promises on the call method!!!
        client.call('echo', params, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(params[0]);

          // Switch Auth Type (would look better to have promises here)
          server.setAuthType('cookie');
          client.setAuthType('cookie');

          client.call('echo', params, function (err, result) {
            if (err) {
              return done(new Error(JSON.stringify(err)));
            }

            expect(JSON.stringify(result)).to.be.string(params[0]);

            done();
          });
        });
      },

      'basic/cookie - different type - should return -32602 Unauthorized': function (done) {
        server.setAuthType('basic');
        client.setAuthType('cookie');

        var params = ['Hello! Mixed Authorization'];

        client.call('echo', params, function (err, result) {
          expect(result).to.equal(undefined);
          expect(err.code).to.equal((new Errors.InvalidParams()).code);
          expect(err.message).to.be.string('Unauthorized');

          done();
        });
      },

      'basic/cookie - switch only client - should return -32602 Unauthorized': function (done) {
        server.setAuthType('basic');
        client.setAuthType('basic');

        var params = ['Hello! Mixed Authorization'];

        client.call('echo', params, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(params[0]);

          // Switch Auth Type Only for the Client
          client.setAuthType('cookie');

          // Should return Unauthorized
          client.call('echo', params, function (err, result) {
            expect(result).to.equal(undefined);
            expect(err.code).to.equal((new Errors.InvalidParams()).code);
            expect(err.message).to.be.string('Unauthorized');

            done();
          });
        });
      },

      'basic/cookie - switch only server - should return -32602 Unauthorized': function (done) {
        server.setAuthType('basic');
        client.setAuthType('basic');

        var params = ['Hello! Mixed Authorization'];

        client.call('echo', params, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(params[0]);

          // Switch Auth Type Only for the Server
          server.setAuthType('cookie');

          // Should return Unauthorized
          client.call('echo', params, function (err, result) {
            expect(result).to.equal(undefined);
            expect(err.code).to.equal((new Errors.InvalidParams()).code);
            expect(err.message).to.be.string('Unauthorized');

            done();
          });
        });
      },

      'basic/bearer(jwt) - switch both - should return 200 OK': function (done) {
        server.setAuthType('basic');
        client.setAuthType('basic');

        var params = ['Hello! Mixed Authorization'];

        // We MUST enable promises on the call method!!!
        client.call('echo', params, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(params[0]);

          // Switch Auth Type
          server.setAuthType('jwt');
          client.setAuthType('jwt');

          client.call('echo', params, function (err, result) {
            if (err) {
              return done(new Error(JSON.stringify(err)));
            }

            expect(JSON.stringify(result)).to.be.string(params[0]);

            done();
          });
        });
      },

      'basic/bearer(jwt) - different type - should return -32602 Unauthorized': function (done) {
        server.setAuthType('basic');
        client.setAuthType('jwt');

        var params = ['Hello! Mixed Authorization'];

        client.call('echo', params, function (err, result) {
          expect(result).to.equal(undefined);
          expect(err.code).to.equal((new Errors.InvalidParams()).code);
          expect(err.message).to.be.string('Unauthorized');

          done();
        });
      },

      'basic/bearer(jwt) - switch only client - should return -32602 Unauthorized': function (done) {
        server.setAuthType('basic');
        client.setAuthType('basic');

        var params = ['Hello! Mixed Authorization'];

        client.call('echo', params, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(params[0]);

          // Switch Auth Type Only for the Client
          client.setAuthType('jwt');

          // Should return Unauthorized
          client.call('echo', params, function (err, result) {
            expect(result).to.equal(undefined);
            expect(err.code).to.equal((new Errors.InvalidParams()).code);
            expect(err.message).to.be.string('Unauthorized');

            done();
          });
        });
      },

      'basic/bearer(jwt) - switch only server - should return -32602 Unauthorized': function (done) {
        server.setAuthType('basic');
        client.setAuthType('basic');

        var params = ['Hello! Mixed Authorization'];

        client.call('echo', params, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(params[0]);

          // Switch Auth Type Only for the Server
          server.setAuthType('jwt');

          // Should return Unauthorized
          client.call('echo', params, function (err, result) {
            expect(result).to.equal(undefined);
            expect(err.code).to.equal((new Errors.InvalidParams()).code);
            expect(err.message).to.be.string('Unauthorized');

            done();
          });
        });
      },

      'cookie/bearer(jwt) - switch both - should return 200 OK': function (done) {
        server.setAuthType('cookie');
        client.setAuthType('cookie');

        var params = ['Hello! Mixed Authorization'];

        // We MUST enable promises on the call method!!!
        client.call('echo', params, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(params[0]);

          // Switch Auth Type
          server.setAuthType('jwt');
          client.setAuthType('jwt');

          client.call('echo', params, function (err, result) {
            if (err) {
              return done(new Error(JSON.stringify(err)));
            }

            expect(JSON.stringify(result)).to.be.string(params[0]);

            done();
          });
        });
      },

      'cookie/bearer(jwt) - different type - should return -32602 Unauthorized': function (done) {
        server.setAuthType('cookie');
        client.setAuthType('jwt');

        var params = ['Hello! Mixed Authorization'];

        client.call('echo', params, function (err, result) {
          expect(result).to.equal(undefined);
          expect(err.code).to.equal((new Errors.InvalidParams()).code);
          expect(err.message).to.be.string('Unauthorized');

          done();
        });
      },

      'cookie/bearer(jwt) - switch only client - should return -32602 Unauthorized': function (done) {
        server.setAuthType('cookie');
        client.setAuthType('cookie');

        var params = ['Hello! Mixed Authorization'];

        client.call('echo', params, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(params[0]);

          // Switch Auth Type Only for the Client
          client.setAuthType('jwt');

          // Should return Unauthorized
          client.call('echo', params, function (err, result) {
            expect(result).to.equal(undefined);
            expect(err.code).to.equal((new Errors.InvalidParams()).code);
            expect(err.message).to.be.string('Unauthorized');

            done();
          });
        });
      },

      'cookie/bearer(jwt) - switch only server - should return -32602 Unauthorized': function (done) {
        server.setAuthType('cookie');
        client.setAuthType('cookie');

        var params = ['Hello! Mixed Authorization'];

        client.call('echo', params, function (err, result) {
          if (err) {
            return done(new Error(JSON.stringify(err)));
          }

          expect(JSON.stringify(result)).to.be.string(params[0]);

          // Switch Auth Type Only for the Server
          server.setAuthType('jwt');

          // Should return Unauthorized
          client.call('echo', params, function (err, result) {
            expect(result).to.equal(undefined);
            expect(err.code).to.equal((new Errors.InvalidParams()).code);
            expect(err.message).to.be.string('Unauthorized');

            done();
          });
        });
      }      
    }
  }
};
