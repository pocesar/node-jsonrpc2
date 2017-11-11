[![Build Status](https://travis-ci.org/pocesar/node-jsonrpc2.svg?branch=master)](https://travis-ci.org/pocesar/node-jsonrpc2)
[![Coverage Status](https://coveralls.io/repos/github/pocesar/node-jsonrpc2/badge.svg?branch=master)](https://coveralls.io/github/pocesar/node-jsonrpc2?branch=master)
[![Dependency Status](https://gemnasium.com/pocesar/node-jsonrpc2.svg)](https://gemnasium.com/pocesar/node-jsonrpc2)

[![NPM](https://nodei.co/npm/json-rpc2.svg?downloads=true)](https://nodei.co/npm/json-rpc2/)

# node-jsonrpc2

JSON-RPC 2.0 server and client library, with `HTTP` (with `Websocket` support) and `TCP` endpoints

## Install

```bash
npm install json-rpc2 --save
```

## Usage

Firing up an efficient JSON-RPC server becomes extremely simple:

```js
import { Server } from 'json-rpc2'

const server = new Server({
    websocket: true, // is true by default
    headers: { // allow custom headers is empty by default
        'Access-Control-Allow-Origin': '*'
    }
});

function add(args, opt, callback) {
  callback(null, args[0] + args[1]);
}

server.expose('add', add);

// you can expose an entire object as well:

server.expose('namespace', {
    function1: function(){},
    function2: function(){},
    function3: function(){}
});
// expects calls to be namespace.function1, namespace.function2 and namespace.function3

// listen creates an HTTP server on localhost only
server.listen(8000, 'localhost');
```

And creating a client to speak to that server is easy too:

```js
import { Client } from 'json-rpc2';

const client = new Client(8000, 'localhost');

// Call add function on the server

client.call('add', [1, 2], function(err, result) {
    console.log('1 + 2 = ' + result);
});
```

Create a raw (socket) server using:

```js
import { Server, Auth } from 'json-rpc2';

const server = new Server();

// non-standard auth for RPC, when using this module using both client and server, works out-of-the-box
server.setAuth(new Auth.UserPass('user', 'pass'));

// Listen on socket
server.listenRaw(8080, 'localhost');
```

## Debugging

This module uses the [debug](http://github.com/visionmedia/debug) package, to debug it, you need to set the Node
environment variable to jsonrpc, by setting it in command line as `set DEBUG=jsonrpc` or `export DEBUG=jsonrpc`

## Support

`BTC: 1EAfhxEUu1VsEEAAXk3MtTXK3LCrWDhejj`
