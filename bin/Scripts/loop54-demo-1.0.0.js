(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   3.1.2
 */

(function() {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
      lib$es6$promise$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$vertxNext;
    var lib$es6$promise$asap$$customSchedulerFn;

    var lib$es6$promise$asap$$asap = function asap(callback, arg) {
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
      lib$es6$promise$asap$$len += 2;
      if (lib$es6$promise$asap$$len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        if (lib$es6$promise$asap$$customSchedulerFn) {
          lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
        } else {
          lib$es6$promise$asap$$scheduleFlush();
        }
      }
    }

    function lib$es6$promise$asap$$setScheduler(scheduleFn) {
      lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
    }

    function lib$es6$promise$asap$$setAsap(asapFn) {
      lib$es6$promise$asap$$asap = asapFn;
    }

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // see https://github.com/cujojs/when/issues/410 for details
      return function() {
        process.nextTick(lib$es6$promise$asap$$flush);
      };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
      return function() {
        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
      };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = lib$es6$promise$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
      return function() {
        setTimeout(lib$es6$promise$asap$$flush, 1);
      };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
        var callback = lib$es6$promise$asap$$queue[i];
        var arg = lib$es6$promise$asap$$queue[i+1];

        callback(arg);

        lib$es6$promise$asap$$queue[i] = undefined;
        lib$es6$promise$asap$$queue[i+1] = undefined;
      }

      lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertx() {
      try {
        var r = require;
        var vertx = r('vertx');
        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return lib$es6$promise$asap$$useVertxTimer();
      } catch(e) {
        return lib$es6$promise$asap$$useSetTimeout();
      }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertx();
    } else {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }
    function lib$es6$promise$then$$then(onFulfillment, onRejection) {
      var parent = this;
      var state = parent._state;

      if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
        return this;
      }

      var child = new this.constructor(lib$es6$promise$$internal$$noop);
      var result = parent._result;

      if (state) {
        var callback = arguments[state - 1];
        lib$es6$promise$asap$$asap(function(){
          lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
        });
      } else {
        lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
      }

      return child;
    }
    var lib$es6$promise$then$$default = lib$es6$promise$then$$then;
    function lib$es6$promise$promise$resolve$$resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$resolve(promise, object);
      return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;

    function lib$es6$promise$$internal$$noop() {}

    var lib$es6$promise$$internal$$PENDING   = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED  = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFulfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
        return lib$es6$promise$$internal$$GET_THEN_ERROR;
      }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
       lib$es6$promise$asap$$asap(function(promise) {
        var sealed = false;
        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          lib$es6$promise$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          lib$es6$promise$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, thenable._result);
      } else {
        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable, then) {
      if (maybeThenable.constructor === promise.constructor &&
          then === lib$es6$promise$then$$default &&
          constructor.resolve === lib$es6$promise$promise$resolve$$default) {
        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        } else if (lib$es6$promise$utils$$isFunction(then)) {
          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
      if (promise === value) {
        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFulfillment());
      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
        lib$es6$promise$$internal$$handleMaybeThenable(promise, value, lib$es6$promise$$internal$$getThen(value));
      } else {
        lib$es6$promise$$internal$$fulfill(promise, value);
      }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = lib$es6$promise$$internal$$FULFILLED;

      if (promise._subscribers.length !== 0) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
      }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
      promise._state = lib$es6$promise$$internal$$REJECTED;
      promise._result = reason;

      lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
      }
    }

    function lib$es6$promise$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
      this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
      }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        lib$es6$promise$$internal$$resolve(promise, value);
      } else if (failed) {
        lib$es6$promise$$internal$$reject(promise, error);
      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, value);
      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, value);
      }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      } catch(e) {
        lib$es6$promise$$internal$$reject(promise, e);
      }
    }

    function lib$es6$promise$promise$all$$all(entries) {
      return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (!lib$es6$promise$utils$$isArray(entries)) {
        lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        lib$es6$promise$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        lib$es6$promise$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$reject$$reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$reject(promise, reason);
      return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

    var lib$es6$promise$promise$$counter = 0;

    function lib$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise's eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
      this._id = lib$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if (lib$es6$promise$$internal$$noop !== resolver) {
        typeof resolver !== 'function' && lib$es6$promise$promise$$needsResolver();
        this instanceof lib$es6$promise$promise$$Promise ? lib$es6$promise$$internal$$initializePromise(this, resolver) : lib$es6$promise$promise$$needsNew();
      }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
    lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
    lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
    lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;

    lib$es6$promise$promise$$Promise.prototype = {
      constructor: lib$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: lib$es6$promise$then$$default,

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;
    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
      this._instanceConstructor = Constructor;
      this.promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (Array.isArray(input)) {
        this._input     = input;
        this.length     = input.length;
        this._remaining = input.length;

        this._result = new Array(this.length);

        if (this.length === 0) {
          lib$es6$promise$$internal$$fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate();
          if (this._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(this.promise, this._result);
          }
        }
      } else {
        lib$es6$promise$$internal$$reject(this.promise, this._validationError());
      }
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
      var length  = this.length;
      var input   = this._input;

      for (var i = 0; this._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        this._eachEntry(input[i], i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var c = this._instanceConstructor;
      var resolve = c.resolve;

      if (resolve === lib$es6$promise$promise$resolve$$default) {
        var then = lib$es6$promise$$internal$$getThen(entry);

        if (then === lib$es6$promise$then$$default &&
            entry._state !== lib$es6$promise$$internal$$PENDING) {
          this._settledAt(entry._state, i, entry._result);
        } else if (typeof then !== 'function') {
          this._remaining--;
          this._result[i] = entry;
        } else if (c === lib$es6$promise$promise$$default) {
          var promise = new c(lib$es6$promise$$internal$$noop);
          lib$es6$promise$$internal$$handleMaybeThenable(promise, entry, then);
          this._willSettleAt(promise, i);
        } else {
          this._willSettleAt(new c(function(resolve) { resolve(entry); }), i);
        }
      } else {
        this._willSettleAt(resolve(entry), i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var promise = this.promise;

      if (promise._state === lib$es6$promise$$internal$$PENDING) {
        this._remaining--;

        if (state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        } else {
          this._result[i] = value;
        }
      }

      if (this._remaining === 0) {
        lib$es6$promise$$internal$$fulfill(promise, this._result);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
      });
    };
    function lib$es6$promise$polyfill$$polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
      'Promise': lib$es6$promise$promise$$default,
      'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);


}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":1}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var compabillityFunctions = {

  convertV22Response: function convertV22Response(responseObj) {

    var data = responseObj.data;

    for (var objKey in data) {

      var arr = data[objKey];

      if (arr.constructor === Array) {

        for (var i = 0; i < arr.length; i++) {
          var item = arr[i];

          if (item.String) {
            item.Key = item.String;
          }

          if (item.Entity) {
            item.Key = item.Entity;
          }
        }
      }
    }
  }
};

exports.default = compabillityFunctions;
},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
// could be replaced by std lib

var cookies = {
  set: function set(name, value, days) {
    var expires;

    if (typeof document === 'undefined') {
      return;
    }

    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toGMTString();
    } else {
      expires = '';
    }

    document.cookie = name + '=' + value + expires + '; path=/';
  },

  get: function get(cName) {
    if (typeof document !== 'undefined' && document.cookie.length > 0) {

      var cStart = document.cookie.indexOf(cName + '=');

      if (cStart !== -1) {
        cStart = cStart + cName.length + 1;
        var cEnd = document.cookie.indexOf(';', cStart);

        if (cEnd === -1) {
          cEnd = document.cookie.length;
        }

        return unescape(document.cookie.substring(cStart, cEnd));
      }
    }
    return '';
  }
};

exports.default = cookies;
},{}],5:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _cookies = require('./cookies.js');

var _cookies2 = _interopRequireDefault(_cookies);

var _combabillity = require('./combabillity.js');

var _combabillity2 = _interopRequireDefault(_combabillity);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Loop54 = {

  config: {
    libVersion: '1.0.0',
    use25Url: false,
    url: 'No URL set for Loop54 server.'
  },

  setConfig: function setConfig(conf) {
    this.config = _extends({}, this.config, conf);
  },

  getRandomUserId: function getRandomUserId() {

    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 10; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }_cookies2.default.set("Loop54User", text, 365);

    return text;
  },

  getUserId: function getUserId() {

    var existing = _cookies2.default.get("Loop54User");

    if (existing) {
      return existing;
    }

    return this.getRandomUserId();
  },

  getRequestObj: function getRequestObj(params) {

    var requestObj = {};

    if (!this.CreateUserId && !params.UserId && !params.userId) {
      params.UserId = this.getUserId();
    }

    //legacy mode for engines that expect the quest name to be in the JSON data
    if (this.config.use25Url) {
      requestObj[params.QuestName] = _extends({}, params);
      delete requestObj[params.QuestName].QuestName;
    } else {
      requestObj = _extends({}, params);
      delete requestObj.QuestName;
    }

    return JSON.stringify(requestObj);
  },

  getEngineUrl: function getEngineUrl(req) {

    var url = this.config.url;
    url = url + (url[url.length - 1] === '/' ? '' : '/');

    if (!this.config.use25Url) {
      return url + req.QuestName;
    }

    return url;
  },

  getResponse: function getResponse(req) {

    var v25Url = this.config.use25Url;

    var requestObj = this.getRequestObj(req);
    var engineUrl = this.getEngineUrl(req);

    var promise = _axios2.default.post(engineUrl, requestObj).then(function (response) {

      var data = response.data;
      var responseObj = {
        success: !!data.Success
      };

      if (!responseObj.success) {
        responseObj.errorMessage = data.Error_Message;
        return responseObj;
      }

      //legacy mode for engines that return the data wrapped in the quest name
      if (v25Url) {
        responseObj.data = data.Data[questName];
      } else {
        responseObj.data = data.Data;
      }

      _combabillity2.default.convertV22Response(responseObj);

      return responseObj;
    }).catch(function (response) {

      var responseObj = {};
      responseObj.success = false;
      responseObj.errorMessage = "Connection could not be established.";

      _combabillity2.default.convertV22Response(responseObj);

      return responseObj;
    });

    return promise;
  }

};

module.exports = Loop54;
},{"./combabillity.js":3,"./cookies.js":4,"axios":6}],6:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":8}],7:[function(require,module,exports){
'use strict';

/*global ActiveXObject:true*/

var defaults = require('./../defaults');
var utils = require('./../utils');
var buildUrl = require('./../helpers/buildUrl');
var parseHeaders = require('./../helpers/parseHeaders');
var transformData = require('./../helpers/transformData');

module.exports = function xhrAdapter(resolve, reject, config) {
  // Transform request data
  var data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Merge headers
  var requestHeaders = utils.merge(
    defaults.headers.common,
    defaults.headers[config.method] || {},
    config.headers || {}
  );

  if (utils.isFormData(data)) {
    delete requestHeaders['Content-Type']; // Let the browser set it
  }

  // Create the request
  var request = new (XMLHttpRequest || ActiveXObject)('Microsoft.XMLHTTP');
  request.open(config.method.toUpperCase(), buildUrl(config.url, config.params), true);

  // Set the request timeout in MS
  request.timeout = config.timeout;

  // Listen for ready state
  request.onreadystatechange = function () {
    if (request && request.readyState === 4) {
      // Prepare the response
      var responseHeaders = parseHeaders(request.getAllResponseHeaders());
      var responseData = ['text', ''].indexOf(config.responseType || '') !== -1 ? request.responseText : request.response;
      var response = {
        data: transformData(
          responseData,
          responseHeaders,
          config.transformResponse
        ),
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config
      };

      // Resolve or reject the Promise based on the status
      (request.status >= 200 && request.status < 300 ?
        resolve :
        reject)(response);

      // Clean up request
      request = null;
    }
  };

  // Add xsrf header
  // This is only done if running in a standard browser environment.
  // Specifically not if we're in a web worker, or react-native.
  if (utils.isStandardBrowserEnv()) {
    var cookies = require('./../helpers/cookies');
    var urlIsSameOrigin = require('./../helpers/urlIsSameOrigin');

    // Add xsrf header
    var xsrfValue = urlIsSameOrigin(config.url) ?
        cookies.read(config.xsrfCookieName || defaults.xsrfCookieName) :
        undefined;

    if (xsrfValue) {
      requestHeaders[config.xsrfHeaderName || defaults.xsrfHeaderName] = xsrfValue;
    }
  }

  // Add headers to the request
  utils.forEach(requestHeaders, function (val, key) {
    // Remove Content-Type if data is undefined
    if (!data && key.toLowerCase() === 'content-type') {
      delete requestHeaders[key];
    }
    // Otherwise add header to the request
    else {
      request.setRequestHeader(key, val);
    }
  });

  // Add withCredentials to request if needed
  if (config.withCredentials) {
    request.withCredentials = true;
  }

  // Add responseType to request if needed
  if (config.responseType) {
    try {
      request.responseType = config.responseType;
    } catch (e) {
      if (request.responseType !== 'json') {
        throw e;
      }
    }
  }

  if (utils.isArrayBuffer(data)) {
    data = new DataView(data);
  }

  // Send the request
  request.send(data);
};

},{"./../defaults":11,"./../helpers/buildUrl":12,"./../helpers/cookies":13,"./../helpers/parseHeaders":14,"./../helpers/transformData":16,"./../helpers/urlIsSameOrigin":17,"./../utils":18}],8:[function(require,module,exports){
'use strict';

var defaults = require('./defaults');
var utils = require('./utils');
var dispatchRequest = require('./core/dispatchRequest');
var InterceptorManager = require('./core/InterceptorManager');

var axios = module.exports = function (config) {
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge({
      url: arguments[0]
    }, arguments[1]);
  }

  config = utils.merge({
    method: 'get',
    headers: {},
    timeout: defaults.timeout,
    transformRequest: defaults.transformRequest,
    transformResponse: defaults.transformResponse
  }, config);

  // Don't allow overriding defaults.withCredentials
  config.withCredentials = config.withCredentials || defaults.withCredentials;

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  axios.interceptors.request.forEach(function (interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  axios.interceptors.response.forEach(function (interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

// Expose defaults
axios.defaults = defaults;

// Expose all/spread
axios.all = function (promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

// Expose interceptors
axios.interceptors = {
  request: new InterceptorManager(),
  response: new InterceptorManager()
};

// Provide aliases for supported request methods
(function () {
  function createShortMethods() {
    utils.forEach(arguments, function (method) {
      axios[method] = function (url, config) {
        return axios(utils.merge(config || {}, {
          method: method,
          url: url
        }));
      };
    });
  }

  function createShortMethodsWithData() {
    utils.forEach(arguments, function (method) {
      axios[method] = function (url, data, config) {
        return axios(utils.merge(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });
  }

  createShortMethods('delete', 'get', 'head');
  createShortMethodsWithData('post', 'put', 'patch');
})();

},{"./core/InterceptorManager":9,"./core/dispatchRequest":10,"./defaults":11,"./helpers/spread":15,"./utils":18}],9:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function (fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function (id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `remove`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function (fn) {
  utils.forEach(this.handlers, function (h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":18}],10:[function(require,module,exports){
(function (process){
'use strict';

/**
 * Dispatch a request to the server using whichever adapter
 * is supported by the current environment.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  return new Promise(function (resolve, reject) {
    try {
      // For browsers use XHR adapter
      if ((typeof XMLHttpRequest !== 'undefined') || (typeof ActiveXObject !== 'undefined')) {
        require('../adapters/xhr')(resolve, reject, config);
      }
      // For node use HTTP adapter
      else if (typeof process !== 'undefined') {
        require('../adapters/http')(resolve, reject, config);
      }
    } catch (e) {
      reject(e);
    }
  });
};


}).call(this,require('_process'))
},{"../adapters/http":7,"../adapters/xhr":7,"_process":1}],11:[function(require,module,exports){
'use strict';

var utils = require('./utils');

var PROTECTION_PREFIX = /^\)\]\}',?\n/;
var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

module.exports = {
  transformRequest: [function (data, headers) {
    if(utils.isFormData(data)) {
      return data;
    }
    if (utils.isArrayBuffer(data)) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isObject(data) && !utils.isFile(data) && !utils.isBlob(data)) {
      // Set application/json if no Content-Type has been specified
      if (!utils.isUndefined(headers)) {
        utils.forEach(headers, function (val, key) {
          if (key.toLowerCase() === 'content-type') {
            headers['Content-Type'] = val;
          }
        });

        if (utils.isUndefined(headers['Content-Type'])) {
          headers['Content-Type'] = 'application/json;charset=utf-8';
        }
      }
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function (data) {
    if (typeof data === 'string') {
      data = data.replace(PROTECTION_PREFIX, '');
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    },
    patch: utils.merge(DEFAULT_CONTENT_TYPE),
    post: utils.merge(DEFAULT_CONTENT_TYPE),
    put: utils.merge(DEFAULT_CONTENT_TYPE)
  },

  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
};

},{"./utils":18}],12:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildUrl(url, params) {
  if (!params) {
    return url;
  }

  var parts = [];

  utils.forEach(params, function (val, key) {
    if (val === null || typeof val === 'undefined') {
      return;
    }

    if (utils.isArray(val)) {
      key = key + '[]';
    }

    if (!utils.isArray(val)) {
      val = [val];
    }

    utils.forEach(val, function (v) {
      if (utils.isDate(v)) {
        v = v.toISOString();
      }
      else if (utils.isObject(v)) {
        v = JSON.stringify(v);
      }
      parts.push(encode(key) + '=' + encode(v));
    });
  });

  if (parts.length > 0) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + parts.join('&');
  }

  return url;
};

},{"./../utils":18}],13:[function(require,module,exports){
'use strict';

/**
 * WARNING:
 *  This file makes references to objects that aren't safe in all environments.
 *  Please see lib/utils.isStandardBrowserEnv before including this file.
 */

var utils = require('./../utils');

module.exports = {
  write: function write(name, value, expires, path, domain, secure) {
    var cookie = [];
    cookie.push(name + '=' + encodeURIComponent(value));

    if (utils.isNumber(expires)) {
      cookie.push('expires=' + new Date(expires).toGMTString());
    }

    if (utils.isString(path)) {
      cookie.push('path=' + path);
    }

    if (utils.isString(domain)) {
      cookie.push('domain=' + domain);
    }

    if (secure === true) {
      cookie.push('secure');
    }

    document.cookie = cookie.join('; ');
  },

  read: function read(name) {
    var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return (match ? decodeURIComponent(match[3]) : null);
  },

  remove: function remove(name) {
    this.write(name, '', Date.now() - 86400000);
  }
};

},{"./../utils":18}],14:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {}, key, val, i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  });

  return parsed;
};

},{"./../utils":18}],15:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function (arr) {
    return callback.apply(null, arr);
  };
};

},{}],16:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  utils.forEach(fns, function (fn) {
    data = fn(data, headers);
  });

  return data;
};

},{"./../utils":18}],17:[function(require,module,exports){
'use strict';

/**
 * WARNING:
 *  This file makes references to objects that aren't safe in all environments.
 *  Please see lib/utils.isStandardBrowserEnv before including this file.
 */

var utils = require('./../utils');
var msie = /(msie|trident)/i.test(navigator.userAgent);
var urlParsingNode = document.createElement('a');
var originUrl;

/**
 * Parse a URL to discover it's components
 *
 * @param {String} url The URL to be parsed
 * @returns {Object}
 */
function urlResolve(url) {
  var href = url;

  if (msie) {
    // IE needs attribute set twice to normalize properties
    urlParsingNode.setAttribute('href', href);
    href = urlParsingNode.href;
  }

  urlParsingNode.setAttribute('href', href);

  // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
  return {
    href: urlParsingNode.href,
    protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
    host: urlParsingNode.host,
    search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
    hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
    hostname: urlParsingNode.hostname,
    port: urlParsingNode.port,
    pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
              urlParsingNode.pathname :
              '/' + urlParsingNode.pathname
  };
}

originUrl = urlResolve(window.location.href);

/**
 * Determine if a URL shares the same origin as the current location
 *
 * @param {String} requestUrl The URL to test
 * @returns {boolean} True if URL shares the same origin, otherwise false
 */
module.exports = function urlIsSameOrigin(requestUrl) {
  var parsed = (utils.isString(requestUrl)) ? urlResolve(requestUrl) : requestUrl;
  return (parsed.protocol === originUrl.protocol &&
        parsed.host === originUrl.host);
};

},{"./../utils":18}],18:[function(require,module,exports){
'use strict';

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return toString.call(val) === '[object FormData]';
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    return ArrayBuffer.isView(val);
  } else {
    return (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if a value is an Arguments object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Arguments object, otherwise false
 */
function isArguments(val) {
  return toString.call(val) === '[object Arguments]';
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  typeof document.createelement -> undefined
 */
function isStandardBrowserEnv() {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array or arguments callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Check if obj is array-like
  var isArrayLike = isArray(obj) || isArguments(obj);

  // Force an array if not already something iterable
  if (typeof obj !== 'object' && !isArrayLike) {
    obj = [obj];
  }

  // Iterate over array values
  if (isArrayLike) {
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  }
  // Iterate over object keys
  else {
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/*obj1, obj2, obj3, ...*/) {
  var result = {};
  forEach(arguments, function (obj) {
    forEach(obj, function (val, key) {
      result[key] = val;
    });
  });
  return result;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  trim: trim
};

},{}],19:[function(require,module,exports){
/*globals $ */

'use strict';

// ES6 or using requre.js: import/require lib and use

var _demo;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _loop54JsLib = require('loop54-js-lib');

var _loop54JsLib2 = _interopRequireDefault(_loop54JsLib);

var _render = require('./render.js');

var _render2 = _interopRequireDefault(_render);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Promise = require('es6-promise').Promise;

var guiConfig = {
	inputSearch: 'input#search',
	buttonSearch: 'a#search-button',
	buttonNewUser: 'a#new-user-button',
	inputSearchText: 'Input query here..',
	filters: 'div#filters',
	recommendedResults: 'div#recommendedresults',
	directResults: 'div#directresults',
	breadCrumbsContainer: '#breadcrumbs-wrapper',
	queryInBreadCrumb: '#breadcrumbs-wrapper div.breadcrumbs div.block.search.current strong span',
	makesSense: 'div#nosense',
	makesSenseHeader: 'div#nosenseheader',
	spellingSuggestions: 'div#spellingsuggestions',
	reSearch: 'div#research',
	related: 'div#related'
};

var config = {
	id: '18eb1533-a1f7-4ec8-9211-a561dcf43597',
	name: 'Hello World',
	url: 'http://helloworld.54proxy.se/',
	autoCompleteQuest: 'AutoComplete',
	searchQuest: 'Search',
	similarProductsQuest: 'SimilarProducts',
	createEventsQuest: 'CreateEvents',
	filters: [{
		'Name': 'Kategorier',
		'RequestParameter': 'Faceting.Categories',
		'ResponseParameter': 'Category'
	}, {
		'Name': 'Märken',
		'RequestParameter': 'Faceting.Brands',
		'ResponseParameter': 'Manufacturer'
	}],
	autoCompletePageSize: 8,
	directResultsPageSize: 24,
	recommendedResultsPageSize: 12,
	continousScrolling: false,
	instantSearch: false,
	devMode: true,
	cacheAutoComplete: false,
	autoCompleteFacetingParameter: 'Faceting.Categories',
	productTitleAttribute: 'Title',
	productDescriptionAttribute: 'Description',
	productImageUrlAttributes: ['ImageUrl'],
	productImageUrl: '$1',
	use26Request: true,
	showValues: true
};

var render = (0, _render2.default)(config, guiConfig);
_loop54JsLib2.default.setConfig({ url: config.url });

// init eventhandlers
$(document).ready(function () {

	$(guiConfig.buttonNewUser).click(function () {
		_loop54JsLib2.default.getRandomUserId();
	});

	function doSearch(event) {
		if (event.keyCode === 13 || event.type === "click") {
			demo.search({
				query: $(guiConfig.inputSearch).val(),
				clearFilters: true,
				clearSearch: true,
				preventReSearch: false,
				instant: false,
				page: 0
			});
			$(guiConfig.inputSearch).autocomplete('close');
		}
	}

	render.initFacetting();

	$(guiConfig.inputSearch).autocomplete({
		source: function source(req, res) {
			demo.autocomplete(req, res);
		},
		minLength: 2,
		select: function select(event, ui) {
			event.preventDefault();
			event.stopPropagation();
			$(guiConfig.inputSearch).unbind('keyup', doSearch);
			demo.search({
				clearFilters: true,
				instant: false,
				clearSearch: true,
				query: ui.item.value,
				facet: ui.item.facet
			});
		},
		response: function response(event, ui) {
			$(guiConfig.inputSearch).bind('keyup', doSearch);
		},
		open: function open() {
			$(this).removeClass('ui-corner-all').addClass('ui-corner-top');
		},
		close: function close() {
			$(this).removeClass('ui-corner-top').addClass('ui-corner-all');
		}
	}).autocomplete('instance')._renderItem = function (ul, item) {
		var label = item.value;

		if (item.facet) {
			label = item.value + ' in ' + '<span class="facet">' + item.facet + '</span>';
		}

		return $('<li>').append('<a>' + label + '</a>').appendTo(ul);
	};

	$(guiConfig.buttonSearch).click(doSearch);
	$(guiConfig.inputSearch).bind('keyup', doSearch);
	$(guiConfig.inputSearch).focus();

	if (config.continousScrolling) {
		$(window).bind('scroll', function () {
			demo.displayMore();
		});
	}
});

var utils = require('./utils.js');

var demo = (_demo = {
	autoCompleteQueries: [],
	fetchingAutoComplete: false,
	instantTimer: null,
	runningACRequests: 0,

	activeIndex: -1,
	filters: {},
	autocompleteCache: {},
	visibleFilterDivs: {},
	previousSearch: {},

	createEvent: function createEvent(entity, eventType) {

		var req = {
			Events: [{
				Type: eventType,
				Entity: {
					EntityType: entity.EntityType,
					ExternalId: entity.ExternalId
				}
			}],
			QuestName: config.createEventsQuest
		};

		_loop54JsLib2.default.getResponse(req, function (response) {

			if (!response.success && config.devMode) {
				console.log(response.errorMessage);
			}
		});
	},

	getAutoCompeteRequest: function getAutoCompeteRequest(options) {

		var req = {
			QuestName: config.autoCompleteQuest,
			QueryString: options.query
		};

		if (config.autoCompletePageSize > 0) {
			req.AutoComplete_FromIndex = 0;
			req.AutoComplete_ToIndex = config.autoCompletePageSize;
		}

		return req;
	}

}, _defineProperty(_demo, 'previousSearch', {}), _defineProperty(_demo, 'autocomplete', function autocomplete(req, res) {

	var req,
	    self = this,
	    cache = this.autocompleteCache;

	function processResponse(response) {

		if (!response.success && config.DevMode) {
			alert(response.errorMessage);
		}

		var data = response.data;

		if (data.AutoComplete.length > 0) {
			res(self.formatAutoCompleteData(data));
		} else {
			res([]);
		}
	}

	if (cache[req.term]) {
		processResponse(cache[req.term]);
	}

	req = this.getAutoCompeteRequest({ query: req.term });

	_loop54JsLib2.default.getResponse(req).then(function (response) {

		cache[req.term] = response;

		processResponse(response);
	});
}), _defineProperty(_demo, 'formatAutoCompleteData', function formatAutoCompleteData(data) {
	var _ret;

	var ret, facets;

	ret = data.AutoComplete.map(function (x) {
		return {
			value: x.Key,
			label: x.Key
		};
	});

	facets = data.AutoCompleteFacets.map(function (x) {
		return {
			label: data.AutoCompleteFacetingString,
			value: data.AutoCompleteFacetingString,
			facet: x.Key
		};
	});

	(_ret = ret).unshift.apply(_ret, _toConsumableArray(facets));

	return ret;
}), _defineProperty(_demo, 'getSearchRequest', function getSearchRequest(options) {
	var req = {
		QuestName: config.searchQuest,
		QueryString: options.query,
		RelatedQueries_FromIndex: 0,
		RelatedQueries_ToIndex: 5,
		PreventReSearch: options.preventReSearch || false
	};

	if (config.directResultsPageSize > 0) {
		req.DirectResults_FromIndex = config.directResultsPageSize * options.page;
		req.DirectResults_ToIndex = (options.page + 1) * config.directResultsPageSize - 1;
	}

	if (config.recommendedResultsPageSize > 0) {
		req.RecommendedResults_FromIndex = config.recommendedResultsPageSize * options.page;
		req.RecommendedResults_ToIndex = (options.page + 1) * config.recommendedResultsPageSize - 1;
	}

	for (var i = 0; i < config.filters.length; i++) {
		if (this.filters[config.filters[i].RequestParameter]) {
			req[config.filters[i].RequestParameter] = this.filters[config.filters[i].RequestParameter];
		}
	}

	return req;
}), _defineProperty(_demo, 'search', function search() {
	var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];


	var req = {},
	    self = this,
	    isContinuation;

	if (options.clearFilters || options.facet) {
		this.clearFilters();
	}

	if (options.facet) {
		this.addFilter(config.autoCompleteFacetingParameter, options.facet);
	}

	if (options.clearSearch) {
		render.clearSearch();
	}

	options = {
		instant: options.instant || false,
		preventReSearch: options.preventReSearch || false,
		page: options.page || 0,
		query: options.query
	};

	this.previousSearch = _extends({}, options);

	isContinuation = options.page > 0 && config.continousScrolling;

	if (!isContinuation) {
		render.hidePopup();

		if (!options.instant) {
			render.hideAutocomplete();
		}
	}

	req = this.getSearchRequest(options);

	// utils.setHash({
	//   config: config.Name,
	//   page: req.search,
	//   query: query
	// });

	$(guiConfig.inputSearch).val(options.query);

	_loop54JsLib2.default.getResponse(req).then(function (response) {

		if (!response.success && config.DevMode) {
			alert(response.errorMessage);
		}

		var data = response.data;

		self.previousSearch.totalItems = data.DirectResults_TotalItems;

		render.clearSearch(isContinuation);

		if (!data.MakesSense) {
			render.showMakesNoSense(data.DirectResults, data.SpellingSuggestions, options.query, self.search.bind(self));
		}

		if (data.ReSearchQueryString) {
			render.showReSearch(data.ReSearchQueryString, options.query, self.search.bind(self));
		}

		if (data.RelatedQueries && data.RelatedQueries.length > 0) {
			render.addRelated(data.RelatedQueries, self.search.bind(self));
		}

		if (data.DirectResults && data.DirectResults.length > 0) {
			render.directResults(data.DirectResults, data.DirectResults_TotalItems, isContinuation, self.createEvent);
		}

		if (data.RecommendedResults && data.RecommendedResults.length > 0) {
			render.recommendedResults(data.RecommendedResults, isContinuation, self.createEvent);
		} else if (options.page < 1) {
			render.noRecommendedResults();
		}

		self.updateFilters(data);

		if (config.continousScrolling) {
			self.displayMore();
		} else if (data.DirectResults_TotalItems > config.directResultsPageSize) {
			self.updatePaging(data.DirectResults_TotalItems, options.page, self.previousSearch, self.search.bind(self));
		}
	});
	// .catch( function (err) {
	//         console.log('Error when processing response:')
	//         console.log(err);
	//       });
}), _defineProperty(_demo, 'updatePaging', function updatePaging(totalItems, page, prevSearch, searchCallback) {

	function showPage(p) {
		if (p < 2) return 'show';

		if (p > pages - 3) return 'show';

		if (p > page - 2 && p < page + 2) return 'show';

		if (p == 2) return 'dots';

		if (p == pages - 3 && page != 0 && page != pages - 1) return 'dots';

		return 'hide';
	}

	var pages = Math.ceil(totalItems / config.directResultsPageSize);

	var pagesDiv = $('<div/>').addClass('pages').appendTo($('div#directresults'));

	var i = 0;
	for (i; i < pages; i++) {

		var show = showPage(i);

		if (show == 'show') {

			$('<a/>').html(i + 1).data('page', i).addClass(page == i ? 'selected' : '').click(function () {

				searchCallback(_extends({}, prevSearch, {
					page: $(this).data('page')
				}));
			}).appendTo(pagesDiv);
		} else if (show == 'dots') {
			$('<span>...</span>').appendTo(pagesDiv);
		}
	}
}), _defineProperty(_demo, 'displayMore', function displayMore() {
	//there are more results available

	var ps = this.previousSearch;

	if (this.isBottomVisible()) {

		if (ps.totalItems > (ps.page + 1) * config.directResultsPageSize) {
			this.search({
				query: ps.query,
				instant: false,
				preventReSearch: ps.preventReSearch,
				page: ps.page + 1
			});
		} else if (ps.totalItems > config.directResultsPageSize && $(guiConfig.directResults).find('div.endofresults').length === 0) {
			$(guiConfig.directResults).append($('<div/>').addClass('endofresults').html('No more results'));
		}
	}
}), _defineProperty(_demo, 'updateFilters', function updateFilters(res) {

	var self = this;

	for (var i = 0; i < config.filters.length; i++) {

		$('div#filter_' + config.filters[i].Name).empty();

		var data = res[config.filters[i].ResponseParameter];

		if (data && data.length > 0) {

			var filterArray = this.filters[config.filters[i].RequestParameter];

			if (!filterArray) {
				filterArray = [];
			}

			var filterDiv = $('div#filter_' + config.filters[i].Name);
			var div = $('<div/>').addClass('alwaysvisible').appendTo(filterDiv);

			for (var j = 0; j < data.length; j++) {

				if (j == 5) {

					div = $('<div/>').addClass('hideable').appendTo(filterDiv);

					if (this.visibleFilterDivs[config.filters[i].Name]) {
						div.show();
					}

					$('<a/>').html(self.visibleFilterDivs[config.filters[i].Name] ? 'Hide' : 'Show all').addClass('showhide').data('div', div).data('filterName', config.filters[i].Name).click(function () {

						if ($(this).data('div').is(':visible')) {

							self.visibleFilterDivs[$(this).data('filterName')] = false;

							$(this).data('div').hide();
							$(this).html('Show all');
						} else {

							self.visibleFilterDivs[$(this).data('filterName')] = true;

							$(this).data('div').show();
							$(this).html('Hide');
						}
					}).appendTo(filterDiv);
				}

				div.append($('<a/>').html(data[j].Key + ' (' + data[j].Value + ')').data('filterkey', config.filters[i].RequestParameter).data('filtervalue', data[j].Key).click(function () {
					if (!$(this).hasClass('selected')) {
						self.addFilter($(this).data('filterkey'), $(this).data('filtervalue'));
						$(this).addClass('selected');
						self.searchAgain();
					} else {
						self.removeFilter($(this).data('filterkey'), $(this).data('filtervalue'));
						$(this).removeClass('selected');
						self.searchAgain();
					}
				}).addClass(filterArray.indexOf(data[j].Key) > -1 ? 'selected' : ''));
			}
		}
	}
}), _defineProperty(_demo, 'isBottomVisible', function isBottomVisible() {
	var scroll = $(window).scrollTop();
	var windowHeight = $(window).height();

	var height = $(guiConfig.directResults).outerHeight() + $(guiConfig.directResults).offset().top;

	return scroll + windowHeight >= height;
}), _defineProperty(_demo, 'clearFilters', function clearFilters() {
	this.filters = {};
}), _defineProperty(_demo, 'searchAgain', function searchAgain() {
	this.search(_extends({}, this.previousSearch, { clearSearch: true, page: 0 }));
}), _defineProperty(_demo, 'addFilter', function addFilter(key, value) {

	if (!this.filters[key]) {
		this.filters[key] = [];
	}

	this.filters[key].push(value);
}), _defineProperty(_demo, 'removeFilter', function removeFilter(key, value) {

	var param = this.filters[key];

	if (!param) {
		return;
	}

	var index = param.indexOf(value);

	if (index > -1) {
		param.splice(index, 1);
	}
}), _demo);

},{"./render.js":20,"./utils.js":21,"es6-promise":2,"loop54-js-lib":5}],20:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

// requires jQuery to be in global scope
/*globals $ */

var lib = global.Loop54;

// let utils = require('utils');

var render = function render(config, guiConfig) {

  function initFacetting() {

    var $filters = $(guiConfig.filters);

    $filters.empty();

    for (var i = 0; i < config.filters.length; i++) {
      $filters.append($('<h2/>').html(config.filters[i].Name)).append($('<div/>').attr('id', 'filter_' + config.filters[i].Name).addClass('filterdiv'));
    }
  }

  // $(window).hashchange(function (e,data) {

  //     Demo.HashChanged(data.before.replace('#', ''),data.after.replace('#', ''));

  // });

  // $(document).click(function(event) {

  //     if(!$(event.target).is('div#autocomplete') && !$(event.target).is('div#autocomplete *'))
  //         Demo.ClearSuggestions();

  // });

  // Demo.LoadConfig(function(){

  //   Demo.HashChanged(null,location.hash.replace('#', ''));

  // });

  function replaceImageUrl(entity) {

    var ret = config.productImageUrl;

    for (var i = 0; i < config.productImageUrlAttributes.length; i++) {

      var attr = config.productImageUrlAttributes[i];

      var attrValue = '';

      if (attr == 'ExternalId') {
        attrValue = entity.ExternalId;
      } else if (entity.Attributes[config.productImageUrlAttributes[i]]) {
        attrValue = entity.Attributes[config.productImageUrlAttributes[i]][0];
      }

      // Replace doesn't like "$&" in the image url...
      ret = ret.split('$' + (i + 1)).join(attrValue);
    }

    return ret;
  }

  function getEntityTitle(entity) {

    if (entity.Attributes[config.productTitleAttribute]) {
      return entity.Attributes[config.productTitleAttribute][0];
    }

    return '';
  }

  function getEntityDescription(entity) {

    if (entity.Attributes[config.ProductDescriptionAttribute]) {
      return entity.Attributes[config.ProductDescriptionAttribute][0];
    }

    return '';
  }

  return {

    showMakesNoSense: function showMakesNoSense(directResults, spellingSuggestions, query, searchCallback) {

      $(guiConfig.makesSense).show();

      $(guiConfig.makesSenseHeader).html("We did not understand the query \"" + query + "\". ");

      if (directResults && directResults.length > 0) {
        $(guiConfig.makesSenseHeader).append($("<span>The results below are approximate.</span>"));
      }

      if (spellingSuggestions && spellingSuggestions.length > 0) {

        $(guiConfig.spellingSuggestions).html("Did you mean to search for: ");

        for (var i = 0; i < spellingSuggestions.length; i++) {
          $(guiConfig.spellingSuggestions).append($('<a/>').html(spellingSuggestions[i].Key).data('query', spellingSuggestions[i].Key).click(function () {
            searchCallback({
              query: $(this).data('query'),
              clearFilters: true
            });
          }));
        }
      }
    },

    showReSearch: function showReSearch(reSearchString, originalQuery, searchCallback) {
      debugger;
      $(guiConfig.reSearch).show().html('We assumed you meant \'' + reSearchString + '\'. Can you blame us?<br /><br />Search instead for ').append($('<a />').html(originalQuery).click(function () {
        searchCallback({
          query: $(this).data('query'),
          clearFilters: true,
          instant: false,
          preventReSearch: true
        });
      }));
    },

    addRelated: function addRelated(related, searchCallback) {

      function onClick() {
        searchCallback({
          query: $(this).data('query'),
          clearFilters: true,
          instant: false,
          preventReSearch: false
        });
      }

      for (var i = 0; i < related.length; i++) {

        $(guiConfig.related).append($('<a/>').html(related[i].Key).data('query', related[i].Key).click(onClick));
      }

      $(guiConfig.related).show();
    },

    directResults: function directResults(_directResults, totalItems, isContinuation, createEventCallback) {

      if (!isContinuation) {
        $(guiConfig.directResults).append($('<h2>We found ' + totalItems + ' results</h2>'));
      }

      for (var i = 0; i < _directResults.length; i++) {
        this.renderEntity(guiConfig.directResults, _directResults[i].Key, _directResults[i].Value, createEventCallback);
      }
    },

    recommendedResults: function recommendedResults(_recommendedResults, isContinuation, createEventCallback) {

      if (!isContinuation) {
        $(guiConfig.recommendedResults).append($('<h2>You might also like</h2>'));
      }

      for (var i = 0; i < _recommendedResults.length; i++) {
        this.renderEntity(guiConfig.recommendedResults, _recommendedResults[i].Key, _recommendedResults[i].Value, createEventCallback);
      }
    },

    noRecommendedResults: function noRecommendedResults() {
      $(guiConfig.recommendedResults).hide();
      $(guiConfig.directResults).addClass('fillout');
    },

    clearSearch: function clearSearch(keepResults) {

      if (!keepResults) {
        $(guiConfig.directResults).empty().removeClass('fillout');

        $(guiConfig.recommendedResults).empty().show();
      }

      $(guiConfig.makesSense).hide();
      $(guiConfig.spellingSuggestions).empty();
      $(guiConfig.research).hide();
      $(guiConfig.related).empty().hide();
    },

    hidePopup: function hidePopup() {
      $('div#popupbg').hide();
      $('div.entitypopup').remove();
    },

    hideAutocomplete: function hideAutocomplete() {
      $('div#autocomplete').hide();
    },

    renderEntity: function renderEntity(element, entity, value, createEventCallback) {

      var imgUrl = replaceImageUrl(entity),
          entityTitle = getEntityTitle(entity);
      var self = this;

      var div = $('<div/>').addClass('entity').data('entity', entity).data('value', value).click(function () {
        self.showEntity($(this).data('entity'), $(this).data('value'), createEventCallback);
      });

      if (config.showValues) {
        div.attr('title', value);
      }

      var a = $('<a/>').appendTo(div);
      var imgDiv = $('<div/>').appendTo(a);
      $('<img/>').attr('src', imgUrl).appendTo(imgDiv).on('load', function () {

        if ($(this).width() > $(this).height()) {
          $(this).css('width', '100%');
        } else {
          $(this).css('height', '100%');
        }
      }).on('error', function () {
        $(this).remove();
      });

      $('<span/>').html(entityTitle).appendTo(a);

      div.appendTo($(element));
    },

    showEntity: function showEntity(entity, value, createEventCallback) {

      // Demo.SetHash("config=" + demoConfig.Name + "&page=entity&id=" + entity.ExternalId);

      createEventCallback(entity, 'click');

      $('div#popupbg').show();
      $('div.entitypopup').remove();

      var div = $('<div/>').addClass('entitypopup').appendTo($('body')).css('top', $(window).scrollTop() + 100);

      function closePopup() {
        $('div#popupbg').hide();
        $('div.entitypopup').remove();
      }

      $('<a/>').addClass('close').html('X').click(closePopup).appendTo(div);
      $('div#popupbg').click(closePopup);
      $(window).bind('keydown', function (event) {
        if (event.which === 27 && $('div#popupbg').is(':visible')) {
          closePopup();
        }
      });

      //main stuff

      $('<img/>').attr('src', replaceImageUrl(entity)).appendTo(div).on('error', function () {
        $(this).remove();
      });

      $('<h2/>').html(getEntityTitle(entity)).appendTo(div);

      $('<div/>').addClass('description').html(getEntityDescription(entity)).appendTo(div);

      $('<a/>').addClass('button').html('Purchase').click(function () {
        createEventCallback(entity, 'purchase');
        $(this).off('click').addClass('inactive');
      }).appendTo(div);

      //extra info
      if (!config.devMode) {
        $('<a/>').html('Show all attributes').addClass('showhide').appendTo(div).click(function () {
          $('div.entitypopup div.moreinfo').show();
          $(this).remove();
        });
      }

      var hiddenDiv = $('<div/>').addClass('moreinfo').appendTo(div);

      $('<span/>').html('<b>EntityType</b>: ' + entity.EntityType).appendTo(hiddenDiv);
      $('<span/>').html('<b>ExternalId</b>: ' + entity.ExternalId).appendTo(hiddenDiv);
      $('<span/>').html('<b>Value</b>: ' + value).appendTo(hiddenDiv);

      for (var key in entity.Attributes) {
        $('<span/>').html('<b>' + key + '</b>: ' + entity.Attributes[key]).appendTo(hiddenDiv);
      }

      if (config.devMode) {
        hiddenDiv.show();
      }
    },

    initFacetting: initFacetting

  };
};

exports.default = render;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var utilityFunctions = {

  getHashValue: function getHashValue(name, hash) {

    if (!hash) {
      hash = location.hash.replace('#', '');
    }

    var split = hash.split('&');

    for (var i = 0; i < split.length; i++) {
      var pair = split[i].split('=');

      if (pair[0] === name) {
        return pair[1];
      }
    }

    return null;
  }

};

exports.default = utilityFunctions;

},{}]},{},[19]);
