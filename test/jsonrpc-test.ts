import * as RPC from "../lib/index";
import { ServerResponse } from "http";

type FakeCallback = (args: any, options: any, callback: any) => any;

var server: RPC.Server;
var testBadRequest: (JSON: string, done: () => any) => any;
var TestModule: any;
var echo: FakeCallback;

// MOCK REQUEST/RESPONSE OBJECTS

class MockRequest extends RPC.EventEmitter {
  method: string;

  constructor(method) {
    super();

    this.method = method;
  }
}

class MockResponse extends RPC.EventEmitter {
  writeHead: ServerResponse["writeHead"];
  write: ServerResponse["write"];
  end: ServerResponse["end"];
  connection: RPC.EventEmitter;
  httpBody: string;
  httpHeaders: string;
  httpCode: string;

  constructor() {
    super();

    this.writeHead = function(httpCode) {
      this.httpCode = httpCode;
      this.httpHeaders = httpCode;
    };

    this.write = function(httpBody) {
      this.httpBody = httpBody;

      return true;
    };

    this.end = function() {};
    this.connection = new RPC.EventEmitter();
  }
}

module.exports = {
  beforeEach: function() {
    server = new RPC.Server();

    echo = function(args, opts, callback) {
      callback(null, args[0]);
    };
    server.expose("echo", echo);

    var throw_error = function() {
      throw new RPC.Errors.InternalError();
    };
    server.expose("throw_error", throw_error);

    var json_rpc_error: FakeCallback = function(args, opts, callback) {
      callback(new RPC.Errors.InternalError(), args[0]);
    };
    server.expose("json_rpc_error", json_rpc_error);

    var text_error: FakeCallback = function(args, opts, callback) {
      callback("error", args[0]);
    };
    server.expose("text_error", text_error);

    var javascript_error: FakeCallback = function(args, opts, callback) {
      callback(new Error(), args[0]);
    };

    server.expose("javascript_error", javascript_error);

    // A SIMPLE MODULE
    TestModule = {
      foo: function(a, b) {
        return ["foo", "bar", a, b];
      },

      other: "hello"
    };

    testBadRequest = function(testJSON, done) {
      var req = new MockRequest("POST");
      var res = new MockResponse();
      server.handleHttp(req, res);
      req.emit("data", testJSON);
      req.emit("end");

      var decoded = JSON.parse(res.httpBody);

      expect(decoded.id).to.equal(null);
      expect(decoded.error.message).to.equal("Invalid Request");
      expect(decoded.error.code).to.equal(-32600);
      done();
    };
  },
  afterEach: function() {
    server = null;
    testBadRequest = null;
    TestModule = null;
  },
  "json-rpc2": {
    "Server expose": function() {
      expect(server.functions.echo).to.eql(echo);
      server.exposeModule("test", TestModule);
      expect(server.functions["test.foo"]).to.eql(TestModule.foo);
    },

    "GET Server handle NonPOST": function() {
      var req = new MockRequest("GET");
      var res = new MockResponse();
      server.handleHttp(req, res);
      var decoded = JSON.parse(res.httpBody);
      expect(decoded.id).to.equal(null);
      expect(decoded.error.message).to.equal("Invalid Request");
      expect(decoded.error.code).to.equal(-32600);
    },
    "Method throw an error": function() {
      var req = new MockRequest("POST");
      var res = new MockResponse();

      server.handleHttp(req, res);
      req.emit("data", '{ "method": "throw_error", "params": [], "id": 1 }');
      req.emit("end");

      var decoded = JSON.parse(res.httpBody);

      expect(decoded.id).to.equal(1);
      expect(decoded.error.message).to.equal("InternalError");
      expect(decoded.error.code).to.equal(-32603);
    },
    "Method return an rpc error": function() {
      var req = new MockRequest("POST");
      var res = new MockResponse();

      server.handleHttp(req, res);
      req.emit("data", '{ "method": "json_rpc_error", "params": [], "id": 1 }');
      req.emit("end");

      var decoded = JSON.parse(res.httpBody);

      expect(decoded.id).to.equal(1);
      expect(decoded.error.message).to.equal("InternalError");
      expect(decoded.error.code).to.equal(-32603);
    },
    //      text_error javascript_error

    "Missing object attribute (method)": function(done) {
      var testJSON = '{ "params": ["Hello, World!"], "id": 1 }';
      testBadRequest(testJSON, done);
    },

    "Missing object attribute (params)": function(done) {
      var testJSON = '{ "method": "echo", "id": 1 }';
      testBadRequest(testJSON, done);
    },

    "Unregistered method": function() {
      var testJSON =
        '{ "method": "notRegistered", "params": ["Hello, World!"], "id": 1 }';
      var req = new MockRequest("POST");
      var res = new MockResponse();
      try {
        server.handleHttp(req, res);
      } catch (e) {}

      req.emit("data", testJSON);
      req.emit("end");

      expect(res.httpCode).to.equal(200);

      var decoded = JSON.parse(res.httpBody);

      expect(decoded.id).to.equal(1);
      expect(decoded.error.message).to.equal(
        'Unknown RPC call "notRegistered"'
      );
      expect(decoded.error.code).to.equal(-32601);
    },

    // VALID REQUEST

    "Simple synchronous echo": function() {
      var testJSON =
        '{ "method": "echo", "params": ["Hello, World!"], "id": 1 }';
      var req = new MockRequest("POST");
      var res = new MockResponse();

      server.handleHttp(req, res);

      req.emit("data", testJSON);
      req.emit("end");

      expect(res.httpCode).to.equal(200);

      var decoded = JSON.parse(res.httpBody);

      expect(decoded.id).to.equal(1);
      expect(decoded.error).to.equal(undefined);
      expect(decoded.result).to.equal("Hello, World!");
    },

    "Simple synchronous echo with id as null": function() {
      var testJSON =
        '{ "method": "echo", "params": ["Hello, World!"], "id": null }';
      var req = new MockRequest("POST");
      var res = new MockResponse();

      server.handleHttp(req, res);

      req.emit("data", testJSON);
      req.emit("end");

      expect(res.httpCode).to.equal(200);

      var decoded = JSON.parse(res.httpBody);

      expect(decoded.id).to.equal(null);
      expect(decoded.error).to.equal(undefined);
      expect(decoded.result).to.equal("Hello, World!");
    },

    "Simple synchronous echo with string as id": function() {
      var testJSON =
        '{ "method": "echo", "params": ["Hello, World!"], "id": "test" }';
      var req = new MockRequest("POST");
      var res = new MockResponse();

      server.handleHttp(req, res);

      req.emit("data", testJSON);
      req.emit("end");

      expect(res.httpCode).to.equal(200);

      var decoded = JSON.parse(res.httpBody);

      expect(decoded.id).to.equal("test");
      expect(decoded.error).to.equal(undefined);
      expect(decoded.result).to.equal("Hello, World!");
    },

    "Using promise": function() {
      // Expose a function that just returns a promise that we can control.
      var callbackRef = null;

      server.expose("promiseEcho", function(args, opts, callback) {
        callbackRef = callback;
      });

      // Build a request to call that function
      var testJSON =
        '{ "method": "promiseEcho", "params": ["Hello, World!"], "id": 1 }';
      var req = new MockRequest("POST");
      var res = new MockResponse();

      // Have the server handle that request
      server.handleHttp(req, res);

      req.emit("data", testJSON);
      req.emit("end");

      // Now the request has completed, and in the above synchronous test, we
      // would be finished. However, this function is smarter and only completes
      // when the promise completes.  Therefore, we should not have a response
      // yet.
      expect(res.httpCode).to.not.be.ok();

      // We can force the promise to emit a success code, with a message.
      callbackRef(null, "Hello, World!");

      // Aha, now that the promise has finished, our request has finished as well.
      expect(res.httpCode).to.equal(200);

      var decoded = JSON.parse(res.httpBody);

      expect(decoded.id).to.equal(1);
      expect(decoded.error).to.equal(undefined);
      expect(decoded.result).to.equal("Hello, World!");
    },

    "Triggering an errback": function() {
      var callbackRef = null;

      server.expose("errbackEcho", function(args, opts, callback) {
        callbackRef = callback;
      });

      var testJSON =
        '{ "method": "errbackEcho", "params": ["Hello, World!"], "id": 1 }';
      var req = new MockRequest("POST");
      var res = new MockResponse();

      server.handleHttp(req, res);

      req.emit("data", testJSON);
      req.emit("end");

      expect(res.httpCode).to.not.be.ok();
      // This time, unlike the above test, we trigger an error and expect to see
      // it in the error attribute of the object returned.
      callbackRef("This is an error");
      expect(res.httpCode).to.equal(200);

      var decoded = JSON.parse(res.httpBody);

      expect(decoded.id).to.equal(1);
      expect(decoded.error.message).to.equal("This is an error");
      expect(decoded.error.code).to.equal(-32603);
      expect(decoded.result).to.equal(undefined);
    },
    "Notification request": function() {
      var testJSON = '{ "method": "notify_test", "params": ["Hello, World!"] }';

      var req = new MockRequest("POST");
      var res = new MockResponse();

      server.handleHttp(req, res);

      req.emit("data", testJSON);
      req.emit("end");

      // although it shouldn't return a response, we are dealing with HTTP, that MUST
      // return something, in most cases, 0 length body
      expect(res.httpCode).to.equal(200);
      expect(res.httpBody).to.equal("");
    }
  }
};
