var Promise = require('bluebird');

module.exports = function (classes){
  'use strict';

  var
    _ = classes._,
    EventEmitter = classes.EventEmitter,
    Connection = EventEmitter.$define('Connection', {
      construct: function ($super, ep){
        $super();

        this.endpoint = ep;
        this.callbacks = {};
        this.latestId = 0;

        // Default error handler (prevents ''uncaught error event'')
        this.on('error', function (){ });
      },
      /**
       * Make a standard RPC call to the other endpoint.
       *
       * Note that some ways to make RPC calls bypass this method, for example HTTP
       * calls and responses are done in other places.
       */
      call     : function (method, params, callback){
        var self = this;

        return new Promise(function(resolve, reject){
          if (!_.isArray(params)) {
            params = [params];
          }

          var id = null;

          id = ++self.latestId;

          self.callbacks[id] = {
            resolve, reject
          };

          EventEmitter.trace('-->', 'Connection call (method ' + method + '): ' + JSON.stringify(params));

          var data = JSON.stringify({
            jsonrpc: '2.0',
            method : method,
            params : params,
            id     : id
          });

          self.write(data);
        }).nodeify(callback);
      },

      /**
       * Dummy method for sending data.
       *
       * Connection types that support sending additional data will override this
       * method.
       */
      write: function (){
        throw new Error('Tried to write data on unsupported connection type.');
      },

      /**
       * Keep the connection open.
       *
       * This method is used to tell a HttpServerConnection to stay open. In order
       * to keep it compatible with other connection types, we add it here and make
       * it register a connection end handler.
       */
      stream: function (onend){
        if (_.isFunction(onend)) {
          this.on('end', function(){
            onend();
          });
        }
      },

      handleMessage: function (msg){
        var self = this;

        if (msg) {
          if (
              (msg.hasOwnProperty('result') || msg.hasOwnProperty('error')) &&
              msg.hasOwnProperty('id')
            ) {
            // Are we in the client?
            try {
              msg.error ? this.callbacks[msg.id].reject(new Error(msg.error)) : this.callbacks[msg.id].resolve(msg.result);
              delete this.callbacks[msg.id];
            } catch (err) {
              EventEmitter.trace('<---', 'Callback not found ' + msg.id + ': ' + (err.stack ? err.stack : err.toString()));
            }
          } else if (msg.hasOwnProperty('method')) {
            // Are we in the server?
            this.endpoint.handleCall(msg, this, function handleCall(err, result){
              if (err) {
                self.emit('error', err);

                EventEmitter.trace('-->',
                  'Failure ' + (EventEmitter.hasId(msg) ? '(id ' + msg.id + ')' : '') + ': ' +
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
                EventEmitter.trace('-->', 'Response (id ' + msg.id + '): ' +
                  JSON.stringify(result));
                err = null;
              }

              self.sendReply(err, result, msg.id);
            });
          }
        }
      },

      sendReply: function (err, result, id){
        var data = JSON.stringify({
          jsonrpc: '2.0',
          result : result,
          error  : err,
          id     : id
        });

        this.write(data);
      }
    });

  return Connection;
};