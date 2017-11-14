# November 2017 - 2.0.0

* Bump major version and remove es5class dependency
* Closely follows the RFC (http://www.jsonrpc.org/specification)
* Rewrite code to ES7 / Typescript
* Fix for JSONRPC 2.0 compliant error #36
* Implemented async way of authorization handler #33
* Test in newer node versions
* Update dependencies
* Removed legacy node 0.x stuff
* Decoupled auth from server and client classes
* Errors are now always created from `Error`
* Removed `exposeModule`, renamed functionality to `namespace`
* Callbacks now adheres to standard Node.js callbacks as `(err, resultObj) => void` for seamless integration with promises and async/await

# September 2015 - 1.0.2

* Fix `Access-Control-Allow-Headers` in #22
* Breaking change from 0.x for permissive id field