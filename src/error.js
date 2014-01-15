'use strict';

var util = require('util');

/*
 JSON-RPC 2.0 Specification Errors codes
 */


var AbstractError = function AbstractError() {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
};
util.inherits(AbstractError, Error);

var ParseError = function ParseError(message) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message || this.constructor.name;
  this.code = -32700;
};
util.inherits(ParseError, AbstractError);

var InvalidRequest = function InvalidRequest(message) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message || this.constructor.name;
  this.code = -32600;
};
util.inherits(InvalidRequest, AbstractError);

var MethodNotFound = function MethodNotFound(message) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message || this.constructor.name;
  this.code = -32601;
};
util.inherits(MethodNotFound, AbstractError);

var InvalidParams = function InvalidParams(message) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message || this.constructor.name;
  this.code = -32602;
};
util.inherits(InvalidParams, AbstractError);

var InternalError = function InternalError(message) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message || this.constructor.name;
  this.code = -32603;
};
util.inherits(InternalError, AbstractError);

var ServerError = function ServerError(message) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message || this.constructor.name;
  this.code = -32000;
};
util.inherits(ServerError, AbstractError);

module.exports.AbstractError = AbstractError;
module.exports.ParseError = ParseError;
module.exports.InvalidRequest = InvalidRequest;
module.exports.MethodNotFound = MethodNotFound;
module.exports.InvalidParams = InvalidParams;
module.exports.InternalError = InternalError;
module.exports.ServerError = ServerError;
