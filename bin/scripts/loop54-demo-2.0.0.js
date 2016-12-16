(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":3}],2:[function(require,module,exports){
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

},{"./../defaults":6,"./../helpers/buildUrl":7,"./../helpers/cookies":8,"./../helpers/parseHeaders":9,"./../helpers/transformData":11,"./../helpers/urlIsSameOrigin":12,"./../utils":13}],3:[function(require,module,exports){
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

},{"./core/InterceptorManager":4,"./core/dispatchRequest":5,"./defaults":6,"./helpers/spread":10,"./utils":13}],4:[function(require,module,exports){
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

},{"./../utils":13}],5:[function(require,module,exports){
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
},{"../adapters/http":2,"../adapters/xhr":2,"_process":17}],6:[function(require,module,exports){
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

},{"./utils":13}],7:[function(require,module,exports){
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

},{"./../utils":13}],8:[function(require,module,exports){
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

},{"./../utils":13}],9:[function(require,module,exports){
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

},{"./../utils":13}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"./../utils":13}],12:[function(require,module,exports){
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

},{"./../utils":13}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/stefanpenner/es6-promise/master/LICENSE
 * @version   3.3.1
 */

(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.ES6Promise = factory());
}(this, (function () { 'use strict';

function objectOrFunction(x) {
  return typeof x === 'function' || typeof x === 'object' && x !== null;
}

function isFunction(x) {
  return typeof x === 'function';
}

var _isArray = undefined;
if (!Array.isArray) {
  _isArray = function (x) {
    return Object.prototype.toString.call(x) === '[object Array]';
  };
} else {
  _isArray = Array.isArray;
}

var isArray = _isArray;

var len = 0;
var vertxNext = undefined;
var customSchedulerFn = undefined;

var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
};

function setScheduler(scheduleFn) {
  customSchedulerFn = scheduleFn;
}

function setAsap(asapFn) {
  asap = asapFn;
}

var browserWindow = typeof window !== 'undefined' ? window : undefined;
var browserGlobal = browserWindow || {};
var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
var isNode = typeof self === 'undefined' && typeof process !== 'undefined' && ({}).toString.call(process) === '[object process]';

// test for web worker but not in IE10
var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';

// node
function useNextTick() {
  // node version 0.10.x displays a deprecation warning when nextTick is used recursively
  // see https://github.com/cujojs/when/issues/410 for details
  return function () {
    return process.nextTick(flush);
  };
}

// vertx
function useVertxTimer() {
  return function () {
    vertxNext(flush);
  };
}

function useMutationObserver() {
  var iterations = 0;
  var observer = new BrowserMutationObserver(flush);
  var node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return function () {
    node.data = iterations = ++iterations % 2;
  };
}

// web worker
function useMessageChannel() {
  var channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return function () {
    return channel.port2.postMessage(0);
  };
}

function useSetTimeout() {
  // Store setTimeout reference so es6-promise will be unaffected by
  // other code modifying setTimeout (like sinon.useFakeTimers())
  var globalSetTimeout = setTimeout;
  return function () {
    return globalSetTimeout(flush, 1);
  };
}

var queue = new Array(1000);
function flush() {
  for (var i = 0; i < len; i += 2) {
    var callback = queue[i];
    var arg = queue[i + 1];

    callback(arg);

    queue[i] = undefined;
    queue[i + 1] = undefined;
  }

  len = 0;
}

function attemptVertx() {
  try {
    var r = require;
    var vertx = r('vertx');
    vertxNext = vertx.runOnLoop || vertx.runOnContext;
    return useVertxTimer();
  } catch (e) {
    return useSetTimeout();
  }
}

var scheduleFlush = undefined;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}

function then(onFulfillment, onRejection) {
  var _arguments = arguments;

  var parent = this;

  var child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }

  var _state = parent._state;

  if (_state) {
    (function () {
      var callback = _arguments[_state - 1];
      asap(function () {
        return invokeCallback(_state, child, callback, parent._result);
      });
    })();
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

/**
  `Promise.resolve` returns a promise that will become resolved with the
  passed `value`. It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    resolve(1);
  });

  promise.then(function(value){
    // value === 1
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.resolve(1);

  promise.then(function(value){
    // value === 1
  });
  ```

  @method resolve
  @static
  @param {Any} value value that the returned promise will be resolved with
  Useful for tooling.
  @return {Promise} a promise that will become fulfilled with the given
  `value`
*/
function resolve(object) {
  /*jshint validthis:true */
  var Constructor = this;

  if (object && typeof object === 'object' && object.constructor === Constructor) {
    return object;
  }

  var promise = new Constructor(noop);
  _resolve(promise, object);
  return promise;
}

var PROMISE_ID = Math.random().toString(36).substring(16);

function noop() {}

var PENDING = void 0;
var FULFILLED = 1;
var REJECTED = 2;

var GET_THEN_ERROR = new ErrorObject();

function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}

function cannotReturnOwn() {
  return new TypeError('A promises callback cannot return that same promise.');
}

function getThen(promise) {
  try {
    return promise.then;
  } catch (error) {
    GET_THEN_ERROR.error = error;
    return GET_THEN_ERROR;
  }
}

function tryThen(then, value, fulfillmentHandler, rejectionHandler) {
  try {
    then.call(value, fulfillmentHandler, rejectionHandler);
  } catch (e) {
    return e;
  }
}

function handleForeignThenable(promise, thenable, then) {
  asap(function (promise) {
    var sealed = false;
    var error = tryThen(then, thenable, function (value) {
      if (sealed) {
        return;
      }
      sealed = true;
      if (thenable !== value) {
        _resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, function (reason) {
      if (sealed) {
        return;
      }
      sealed = true;

      _reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      _reject(promise, error);
    }
  }, promise);
}

function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    _reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, function (value) {
      return _resolve(promise, value);
    }, function (reason) {
      return _reject(promise, reason);
    });
  }
}

function handleMaybeThenable(promise, maybeThenable, then$$) {
  if (maybeThenable.constructor === promise.constructor && then$$ === then && maybeThenable.constructor.resolve === resolve) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then$$ === GET_THEN_ERROR) {
      _reject(promise, GET_THEN_ERROR.error);
    } else if (then$$ === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then$$)) {
      handleForeignThenable(promise, maybeThenable, then$$);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}

function _resolve(promise, value) {
  if (promise === value) {
    _reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}

function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }

  publish(promise);
}

function fulfill(promise, value) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}

function _reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }
  promise._state = REJECTED;
  promise._result = reason;

  asap(publishRejection, promise);
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var _subscribers = parent._subscribers;
  var length = _subscribers.length;

  parent._onerror = null;

  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED] = onRejection;

  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}

function publish(promise) {
  var subscribers = promise._subscribers;
  var settled = promise._state;

  if (subscribers.length === 0) {
    return;
  }

  var child = undefined,
      callback = undefined,
      detail = promise._result;

  for (var i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];

    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }

  promise._subscribers.length = 0;
}

function ErrorObject() {
  this.error = null;
}

var TRY_CATCH_ERROR = new ErrorObject();

function tryCatch(callback, detail) {
  try {
    return callback(detail);
  } catch (e) {
    TRY_CATCH_ERROR.error = e;
    return TRY_CATCH_ERROR;
  }
}

function invokeCallback(settled, promise, callback, detail) {
  var hasCallback = isFunction(callback),
      value = undefined,
      error = undefined,
      succeeded = undefined,
      failed = undefined;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      _reject(promise, cannotReturnOwn());
      return;
    }
  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
      _resolve(promise, value);
    } else if (failed) {
      _reject(promise, error);
    } else if (settled === FULFILLED) {
      fulfill(promise, value);
    } else if (settled === REJECTED) {
      _reject(promise, value);
    }
}

function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value) {
      _resolve(promise, value);
    }, function rejectPromise(reason) {
      _reject(promise, reason);
    });
  } catch (e) {
    _reject(promise, e);
  }
}

var id = 0;
function nextId() {
  return id++;
}

function makePromise(promise) {
  promise[PROMISE_ID] = id++;
  promise._state = undefined;
  promise._result = undefined;
  promise._subscribers = [];
}

function Enumerator(Constructor, input) {
  this._instanceConstructor = Constructor;
  this.promise = new Constructor(noop);

  if (!this.promise[PROMISE_ID]) {
    makePromise(this.promise);
  }

  if (isArray(input)) {
    this._input = input;
    this.length = input.length;
    this._remaining = input.length;

    this._result = new Array(this.length);

    if (this.length === 0) {
      fulfill(this.promise, this._result);
    } else {
      this.length = this.length || 0;
      this._enumerate();
      if (this._remaining === 0) {
        fulfill(this.promise, this._result);
      }
    }
  } else {
    _reject(this.promise, validationError());
  }
}

function validationError() {
  return new Error('Array Methods must be provided an Array');
};

Enumerator.prototype._enumerate = function () {
  var length = this.length;
  var _input = this._input;

  for (var i = 0; this._state === PENDING && i < length; i++) {
    this._eachEntry(_input[i], i);
  }
};

Enumerator.prototype._eachEntry = function (entry, i) {
  var c = this._instanceConstructor;
  var resolve$$ = c.resolve;

  if (resolve$$ === resolve) {
    var _then = getThen(entry);

    if (_then === then && entry._state !== PENDING) {
      this._settledAt(entry._state, i, entry._result);
    } else if (typeof _then !== 'function') {
      this._remaining--;
      this._result[i] = entry;
    } else if (c === Promise) {
      var promise = new c(noop);
      handleMaybeThenable(promise, entry, _then);
      this._willSettleAt(promise, i);
    } else {
      this._willSettleAt(new c(function (resolve$$) {
        return resolve$$(entry);
      }), i);
    }
  } else {
    this._willSettleAt(resolve$$(entry), i);
  }
};

Enumerator.prototype._settledAt = function (state, i, value) {
  var promise = this.promise;

  if (promise._state === PENDING) {
    this._remaining--;

    if (state === REJECTED) {
      _reject(promise, value);
    } else {
      this._result[i] = value;
    }
  }

  if (this._remaining === 0) {
    fulfill(promise, this._result);
  }
};

Enumerator.prototype._willSettleAt = function (promise, i) {
  var enumerator = this;

  subscribe(promise, undefined, function (value) {
    return enumerator._settledAt(FULFILLED, i, value);
  }, function (reason) {
    return enumerator._settledAt(REJECTED, i, reason);
  });
};

/**
  `Promise.all` accepts an array of promises, and returns a new promise which
  is fulfilled with an array of fulfillment values for the passed promises, or
  rejected with the reason of the first passed promise to be rejected. It casts all
  elements of the passed iterable to promises as it runs this algorithm.

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = resolve(2);
  let promise3 = resolve(3);
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // The array here would be [ 1, 2, 3 ];
  });
  ```

  If any of the `promises` given to `all` are rejected, the first promise
  that is rejected will be given as an argument to the returned promises's
  rejection handler. For example:

  Example:

  ```javascript
  let promise1 = resolve(1);
  let promise2 = reject(new Error("2"));
  let promise3 = reject(new Error("3"));
  let promises = [ promise1, promise2, promise3 ];

  Promise.all(promises).then(function(array){
    // Code here never runs because there are rejected promises!
  }, function(error) {
    // error.message === "2"
  });
  ```

  @method all
  @static
  @param {Array} entries array of promises
  @param {String} label optional string for labeling the promise.
  Useful for tooling.
  @return {Promise} promise that is fulfilled when all `promises` have been
  fulfilled, or rejected if any of them become rejected.
  @static
*/
function all(entries) {
  return new Enumerator(this, entries).promise;
}

/**
  `Promise.race` returns a new promise which is settled in the same way as the
  first passed promise to settle.

  Example:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 2');
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // result === 'promise 2' because it was resolved before promise1
    // was resolved.
  });
  ```

  `Promise.race` is deterministic in that only the state of the first
  settled promise matters. For example, even if other promises given to the
  `promises` array argument are resolved, but the first settled promise has
  become rejected before the other promises became fulfilled, the returned
  promise will become rejected:

  ```javascript
  let promise1 = new Promise(function(resolve, reject){
    setTimeout(function(){
      resolve('promise 1');
    }, 200);
  });

  let promise2 = new Promise(function(resolve, reject){
    setTimeout(function(){
      reject(new Error('promise 2'));
    }, 100);
  });

  Promise.race([promise1, promise2]).then(function(result){
    // Code here never runs
  }, function(reason){
    // reason.message === 'promise 2' because promise 2 became rejected before
    // promise 1 became fulfilled
  });
  ```

  An example real-world use case is implementing timeouts:

  ```javascript
  Promise.race([ajax('foo.json'), timeout(5000)])
  ```

  @method race
  @static
  @param {Array} promises array of promises to observe
  Useful for tooling.
  @return {Promise} a promise which settles in the same way as the first passed
  promise to settle.
*/
function race(entries) {
  /*jshint validthis:true */
  var Constructor = this;

  if (!isArray(entries)) {
    return new Constructor(function (_, reject) {
      return reject(new TypeError('You must pass an array to race.'));
    });
  } else {
    return new Constructor(function (resolve, reject) {
      var length = entries.length;
      for (var i = 0; i < length; i++) {
        Constructor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
}

/**
  `Promise.reject` returns a promise rejected with the passed `reason`.
  It is shorthand for the following:

  ```javascript
  let promise = new Promise(function(resolve, reject){
    reject(new Error('WHOOPS'));
  });

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  Instead of writing the above, your code now simply becomes the following:

  ```javascript
  let promise = Promise.reject(new Error('WHOOPS'));

  promise.then(function(value){
    // Code here doesn't run because the promise is rejected!
  }, function(reason){
    // reason.message === 'WHOOPS'
  });
  ```

  @method reject
  @static
  @param {Any} reason value that the returned promise will be rejected with.
  Useful for tooling.
  @return {Promise} a promise rejected with the given `reason`.
*/
function reject(reason) {
  /*jshint validthis:true */
  var Constructor = this;
  var promise = new Constructor(noop);
  _reject(promise, reason);
  return promise;
}

function needsResolver() {
  throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
}

function needsNew() {
  throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
}

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
  let promise = new Promise(function(resolve, reject) {
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
      let xhr = new XMLHttpRequest();

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
function Promise(resolver) {
  this[PROMISE_ID] = nextId();
  this._result = this._state = undefined;
  this._subscribers = [];

  if (noop !== resolver) {
    typeof resolver !== 'function' && needsResolver();
    this instanceof Promise ? initializePromise(this, resolver) : needsNew();
  }
}

Promise.all = all;
Promise.race = race;
Promise.resolve = resolve;
Promise.reject = reject;
Promise._setScheduler = setScheduler;
Promise._setAsap = setAsap;
Promise._asap = asap;

Promise.prototype = {
  constructor: Promise,

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
    let result;
  
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
    let author, books;
  
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
  then: then,

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
  'catch': function _catch(onRejection) {
    return this.then(null, onRejection);
  }
};

function polyfill() {
    var local = undefined;

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

    if (P) {
        var promiseToString = null;
        try {
            promiseToString = Object.prototype.toString.call(P.resolve());
        } catch (e) {
            // silently ignored
        }

        if (promiseToString === '[object Promise]' && !P.cast) {
            return;
        }
    }

    local.Promise = Promise;
}

polyfill();
// Strange compat..
Promise.polyfill = polyfill;
Promise.Promise = Promise;

return Promise;

})));

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":17}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _cookies = require('./cookies.js');

var _cookies2 = _interopRequireDefault(_cookies);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Loop54 = {
  config: {
    libVersion: '0.2.0',
    apiVersion: 'V26',
    url: 'No URL set for Loop54 server.'
  },

  setConfig: function setConfig(newConfig) {
    this.config = _extends({}, this.config, newConfig);
  },

  getRandomUserId: function getRandomUserId() {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < 10; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    _cookies2.default.set('Loop54User', text, 365);
    return text;
  },

  getUserId: function getUserId() {
    var existing = _cookies2.default.get('Loop54User');
    if (existing) {
      return existing;
    }
    return this.getRandomUserId();
  },

  getRequestObj: function getRequestObj(params) {
    var requestObj = {};
    if (!params.UserId && !params.userId) {
      params.UserId = this.getUserId();
    }

    requestObj = _extends({}, params);
    delete requestObj.QuestName;
    return JSON.stringify(requestObj);
  },

  getEngineUrl: function getEngineUrl(req) {
    var url = this.config.url;
    url = url + (url[url.length - 1] === '/' ? '' : '/');
    return url + req.QuestName;
  },

  getResponse: function getResponse(req) {
    var requestObj = this.getRequestObj(req);
    var engineUrl = this.getEngineUrl(req);
    var config = { headers: {
        'Api-Version': this.config.apiVersion,
        'Lib-Version': 'js:' + this.config.libVersion
      } };

    var promise = _axios2.default.post(engineUrl, requestObj, config).then(function (response) {
      var data = response.data;
      var responseObj = {
        success: !!data.Success
      };

      if (responseObj.success) {
        responseObj.data = data.Data;
      } else {
        responseObj.errorMessage = data.Error_Message;
      }
      return responseObj;
    }).catch(function (response) {
      var responseObj = {
        success: false,
        errorMessage: 'Connection could not be established.'
      };
      return responseObj;
    });
    return promise;
  }
};

module.exports = Loop54;
},{"./cookies.js":15,"axios":1}],17:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
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
    var timeout = runTimeout(cleanUpNextTick);
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
    runClearTimeout(timeout);
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
        runTimeout(drainQueue);
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

},{}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('./utils.js');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /*
                                                                                                                                                                                                    * This file includes all logic for getting autocomplete to work for
                                                                                                                                                                                                    * Loop54 searching. In the demo we use jQuery UI autocomplete library
                                                                                                                                                                                                    * and in order to use this file right of the shelf you will need to use
                                                                                                                                                                                                    * jQuery UI as well.
                                                                                                                                                                                                    *
                                                                                                                                                                                                    * More info can be found in our docs: https://www.loop54.com/docs/product-search-autocomplete
                                                                                                                                                                                                    *
                                                                                                                                                                                                    * Feel free to change this file to fit your needs.
                                                                                                                                                                                                    */


var autocomplete = {
  container: null,
  autocompleteCache: {},
  autoCompleteQueries: [],
  fetchingAutoComplete: false,
  autoCompleteQuest: null,
  autoCompletePageSize: 0,

  init: function init(autoCompleteQuest, autoCompletePageSize, autocompleteContainer) {
    /*
    * call init after you have required autocomplete.js
    * autoCompleteQuest and autoCompletePageSize are part of the configuration file
    * that you have recieved from us, or from the example configuration that is
    * included in this demo from start.
    * autocompleteContainer is optional to include when initiating autocomplete.
    */
    this.autoCompleteQuest = autoCompleteQuest;
    this.autoCompletePageSize = autoCompletePageSize;
    this.container = autocompleteContainer || $('#autocomplete');
  },

  buildRequest: function buildRequest(options) {
    var req = {
      QuestName: autocomplete.autoCompleteQuest,
      QueryString: options.query
    };
    if (autocomplete.autoCompletePageSize > 0) {
      req.autoComplete_FromIndex = 0;
      req.autoComplete_ToIndex = autocomplete.autoCompletePageSize;
    }
    return req;
  },

  processResponse: function processResponse(response, callback) {
    if (!response.success) {
      console.log(response.errorMessage);
      _utils2.default.showNotification('Error: ' + response.errorMessage);
    } else {
      var data = response.data;
      if (data.AutoComplete.length > 0) {
        callback(this.formatData(data));
      } else {
        callback([]);
      }
    }
  },

  formatData: function formatData(data) {
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
  },

  hide: function hide() {
    $(autocomplete.container).hide();
  },

  getResults: function getResults(req, res, loop54) {
    var req,
        cache = this.autocompleteCache;

    if (cache[req.term]) {
      this.processResponse(cache[req.term], res);
    }
    req = this.buildRequest({ query: req.term });
    loop54.getResponse(req).then(function (response) {
      cache[req.term] = response;
      autocomplete.processResponse(response, res);
    });
  }
};

exports.default = autocomplete;

},{"./utils.js":24}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/*
* This file includes all logic for filters (faceting) when using Loop54.
* You can find more information about Faceting in our docs:
* https://www.loop54.com/docs/faceted-search-navigation
*
* Feel free to change this file to fit your needs.
*/

var filters = {
  filtersFunctions: null,
  filtersContainer: null,
  configFilters: [],
  visibleFilters: {},
  list: {},

  init: function init(configFilters, filtersContainer, filtersFunctions) {
    this.configFilters = configFilters;
    this.filtersContainer = filtersContainer;
    this.filtersFunctions = filtersFunctions || null;
  },

  getAll: function getAll() {
    return this.list;
  },

  get: function get(key) {
    if (this.list[key]) {
      return this.list[key];
    } else {
      return false;
    }
  },

  update: function update(res, callback) {
    if (this.configFilters.length > 0 && this.filtersFunctions) {
      $(this.filtersFunctions).show();
    }

    for (var i = 0; i < this.configFilters.length; i++) {
      var filterHeader = $('#filter_header_' + this.configFilters[i].name.replace(' ', '_'));
      var filterDiv = $('#filter_' + this.configFilters[i].name.replace(' ', '_'));
      var data = res[this.configFilters[i].responseParameter];
      filterDiv.empty();

      if (data && data.length > 0) {
        filterHeader.show();
        filterDiv.show();
        var filterArray = [];
        if (this.list[this.configFilters[i].requestParameter]) {
          filterArray = this.list[this.configFilters[i].requestParameter];
        }
        var div = $('<div/>').addClass('alwaysvisible').appendTo(filterDiv);
        for (var j = 0; j < data.length; j++) {
          if (j == 5) {
            div = $('<div/>').addClass('hideable').appendTo(filterDiv);
            if (this.visibleFilters[this.configFilters[i].name]) {
              div.show();
            }
            $('<a/>', { href: '#' }).html(filters.visibleFilters[this.configFilters[i].name] ? 'Hide' : 'Show all').addClass('showhide').data('div', div).data('filterName', this.configFilters[i].name).click(function (e) {
              e.preventDefault();
              if ($(this).data('div').is(':visible')) {
                filters.visibleFilters[$(this).data('filterName')] = false;
                $(this).data('div').hide();
                $(this).html('Show all');
              } else {
                filters.visibleFilters[$(this).data('filterName')] = true;
                $(this).data('div').show();
                $(this).html('Hide');
              }
            }).appendTo(filterDiv);
          }

          div.append($('<a/>', { href: '#' }).html(data[j].Key + ' (' + data[j].Value + ')').data('filterkey', this.configFilters[i].requestParameter).data('filtervalue', data[j].Key).addClass(filterArray.indexOf(data[j].Key) > -1 ? 'selected' : '').click(function (e) {
            e.preventDefault();
            if (!$(this).hasClass('selected')) {
              filters.add($(this).data('filterkey'), $(this).data('filtervalue'));
              $(this).addClass('selected');
              callback();
            } else {
              filters.remove($(this).data('filterkey'), $(this).data('filtervalue'));
              $(this).removeClass('selected');
              callback();
            }
          }));
        }
      } else {
        filterHeader.hide();
        filterDiv.hide();
      }
    }
  },

  add: function add(key, value) {
    if (!this.list[key]) {
      this.list[key] = [];
    }
    this.list[key].push(value);
  },

  remove: function remove(key, value) {
    var param = this.list[key];
    if (!param) {
      return;
    }
    var index = param.indexOf(value);
    if (index > -1) {
      param.splice(index, 1);
    }
  },

  reset: function reset() {
    this.list = {};
  },

  updatePriceFilterValues: function updatePriceFilterValues(minPrice, maxPrice) {
    $(guiConfig.pricesliderMinPriceInput).val(minPrice).trigger('change');
    $(guiConfig.pricesliderMaxPriceInput).val(maxPrice).trigger('change');
  }
};

exports.default = filters;

},{}],20:[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /*globals $ */

var _loop54JsLib = require('loop54-js-lib');

var _loop54JsLib2 = _interopRequireDefault(_loop54JsLib);

var _render = require('./render.js');

var _render2 = _interopRequireDefault(_render);

var _utils = require('./utils.js');

var _utils2 = _interopRequireDefault(_utils);

var _autocomplete = require('./autocomplete.js');

var _autocomplete2 = _interopRequireDefault(_autocomplete);

var _filters = require('./filters.js');

var _filters2 = _interopRequireDefault(_filters);

var _es6Promise = require('es6-promise');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var guiConfig = {
  inputSearch: 'input#search',
  buttonSearch: 'a#search-button',
  buttonNewUser: 'a#new-user-button',
  inputSearchText: 'Input query here..',
  filtersContainer: '.left-column',
  filterFunctions: '.filter-functions',
  filters: 'div#filters',
  pricesliderContainer: '#priceslidercontainer',
  priceslider: '#priceslider',
  pricesliderMinPriceInput: '#minPrice',
  pricesliderMaxPriceInput: '#maxPrice',
  recommendedResultsContainer: '.right-column',
  recommendedResultsList: '#recommendedresultslist',
  mainContainer: '.main-column',
  directResults: 'div#directresults',
  directResultsTotalItems: '.total-items',
  directResultsList: '#directresultslist',
  noResults: '#noresults',
  related: 'div#related',
  informationContainer: '#information'
};

var config = {},
    render;

var demo = {
  instantTimer: null,
  runningACRequests: 0,
  activeIndex: -1,
  PriceFilter: { min: null, max: null },
  previousSearch: {},
  isSearchEnabled: true,

  /*
  * handleHashChanged is triggered when the hash in the URI changes.
  * This is to make the demo work without reloading.
  */
  handleHashChanged: function handleHashChanged(newConfig, search) {
    $('.loading-layout').hide();
    $('.error-layout').hide();
    $('.demo-layout').show();
    if (newConfig) {
      config = newConfig;
      render = (0, _render2.default)(config, guiConfig);
      _autocomplete2.default.init(config.autoCompleteQuest, config.autoCompletePageSize);
      _filters2.default.init(config.filters, guiConfig.filters, guiConfig.filterFunctions);
      render.init();
      _loop54JsLib2.default.setConfig({ url: config.url });
      if (config.continousScrolling) {
        window.addEventListener('scroll', function () {
          demo.displayMore();
        }, true);
      } else {
        window.removeEventListener('scroll', function () {
          demo.displayMore();
        }, true);
      }
      if (location.hash === '') {
        _utils2.default.setHash({
          config: config.name
        });
      }
      _utils2.default.initShoppingCart(config.name, render.shoppingCart);
    }

    if (search) {
      demo.search(search, true);
    } else {
      render.clearSearch();
    }
  },

  /*
  * Search functionality
  */
  buildSearchRequest: function buildSearchRequest(options, searchFromHashChange) {
    var req = {
      QuestName: config.searchQuest,
      QueryString: options.query,
      RelatedQueries_FromIndex: 0,
      RelatedQueries_ToIndex: 5,
      PreventReSearch: options.preventReSearch || false
    };

    /*
    * if this search is done on page load or hash change and continousScrolling is on then it should load everything
    * from page 0 until the pagenumber in the url
    */
    if (config.directResultsPageSize > 0 && options.page > 0 && config.continousScrolling && searchFromHashChange) {
      req.DirectResults_FromIndex = 0;
      req.DirectResults_ToIndex = (options.page + 1) * config.directResultsPageSize - 1;
    } else if (config.directResultsPageSize > 0) {
      // this is the normal direct results search
      req.DirectResults_FromIndex = config.directResultsPageSize * options.page;
      req.DirectResults_ToIndex = (options.page + 1) * config.directResultsPageSize - 1;
    }

    if (config.recommendedResultsPageSize > 0) {
      req.RecommendedResults_FromIndex = config.recommendedResultsPageSize * options.page;
      req.RecommendedResults_ToIndex = (options.page + 1) * config.recommendedResultsPageSize - 1;
    }

    if (this.PriceFilter.min && this.PriceFilter.max) {
      req['Faceting.MinPrice'] = this.PriceFilter.min;
      req['Faceting.MaxPrice'] = this.PriceFilter.max;
    }

    for (var i = 0; i < config.filters.length; i++) {
      var filterArray = _filters2.default.get(config.filters[i].requestParameter);
      if (filterArray) {
        if (filterArray.length > 0) {
          req[config.filters[i].requestParameter] = filterArray;
        }
      }
    }
    return req;
  },

  search: function search() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var searchFromHashChange = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    var req = {},
        self = this,
        isContinuation;

    if (options.clearFilters || options.facet || searchFromHashChange) {
      _filters2.default.reset();
      this.clearPricefilters();
    }

    if (options.facet) {
      _filters2.default.add(config.autoCompleteFacetingParameter, options.facet);
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

    _utils2.default.setHash({
      config: config.name,
      page: options.page,
      section: 'search',
      query: options.query
    });

    this.previousSearch = _extends({}, options);
    isContinuation = options.page > 0 && config.continousScrolling && !searchFromHashChange;
    if (!isContinuation) {
      render.hidePopup();
      if (!options.instant) {
        _autocomplete2.default.hide();
      }
    }

    // build request that can be sent to Loop54 API
    req = this.buildSearchRequest(options, searchFromHashChange);

    // Make sure input has the search query set as value
    $(guiConfig.inputSearch).val(options.query);

    // Make request to Loop54 API using the js library
    _loop54JsLib2.default.getResponse(req).then(function (response) {
      if (!response.success) {
        console.log(response.errorMessage);
        _utils2.default.showNotification('Error: ' + response.errorMessage);
      } else {
        var data = response.data;
        self.previousSearch.totalItems = data.DirectResults_TotalItems;
        render.clearSearch(isContinuation);

        if (!data.MakesSense) {
          render.showMakesNoSense(data.DirectResults.length, data.SpellingSuggestions, options.query, self.search.bind(self));
        }

        if (data.ReSearchQueryString) {
          render.showReSearch(data.ReSearchQueryString, options.query, self.search.bind(self));
        }

        if (data.DirectResults && data.DirectResults.length > 0) {
          render.directResults(data.DirectResults, data.DirectResults_TotalItems, isContinuation, _loop54JsLib2.default);
        }

        if (data.RelatedQueries && data.RelatedQueries.length > 0) {
          render.addRelated(data.RelatedQueries, self.search.bind(self));
        }

        if (data.RecommendedResults && data.RecommendedResults.length > 0) {
          render.recommendedResults(data.RecommendedResults, isContinuation, _loop54JsLib2.default);
        } else if (options.page < 1) {
          render.noRecommendedResults();
        }

        self.updatePricefilters(data);
        _filters2.default.update(data, demo.searchAgain);

        if (config.continousScrolling) {
          self.addDisplayMoreButton();
          self.displayMore();
        } else if (data.DirectResults_TotalItems > config.directResultsPageSize) {
          self.updatePaging(data.DirectResults_TotalItems, options.page, self.previousSearch, self.search.bind(self));
        }
      }
    });
  },

  searchAgain: function searchAgain() {
    demo.search(_extends({}, demo.previousSearch, { clearSearch: true, page: 0 }));
  },

  /*
  * Simple implementation of a range slider and price filters
  * this will be be part of filters.js in the future
  */

  clearPricefilters: function clearPricefilters() {
    this.PriceFilter = { min: null, max: null };
  },

  updatePriceFilterValues: function updatePriceFilterValues(minPrice, maxPrice) {
    $(guiConfig.pricesliderMinPriceInput).val(minPrice).trigger('change');
    $(guiConfig.pricesliderMaxPriceInput).val(maxPrice).trigger('change');
  },

  updatePricefilters: function updatePricefilters(res) {
    if (config.productPriceMinAttribute && config.productPriceMaxAttribute) {
      if (res[config.productPriceMinAttribute] && res[config.productPriceMaxAttribute]) {
        var priceMin, priceMax, selectedPriceMin, selectedPriceMax;
        priceMin = selectedPriceMin = res[config.productPriceMinAttribute];
        priceMax = selectedPriceMax = res[config.productPriceMaxAttribute];

        if (demo.PriceFilter.min && demo.PriceFilter.max) {
          selectedPriceMin = demo.PriceFilter.min < priceMin || demo.PriceFilter.min > priceMax ? priceMin : demo.PriceFilter.min;
          selectedPriceMax = demo.PriceFilter.max > priceMax || demo.PriceFilter.max < priceMin ? priceMax : demo.PriceFilter.max;
        }
        $(guiConfig.priceslider).slider("option", { min: priceMin, max: priceMax, values: [selectedPriceMin, selectedPriceMax] });
        demo.updatePriceFilterValues(selectedPriceMin, selectedPriceMax);
        $(guiConfig.pricesliderContainer).show();
      }
    }
  },

  /*
  * Extra functions needed for the demo
  */

  setVersionNumber: function setVersionNumber() {
    var version = '2.0.0';
    $('#version-number').html('Loop54-demo v' + version);
  },

  handleUpdateViewError: function handleUpdateViewError(errorMessage, errorCode) {
    $('.loading-layout').hide();
    $('demo-layout').hide();
    $('.error-layout').show();
    $('.error-message').text(errorMessage);
  },

  updatePaging: function updatePaging(totalItems, page, prevSearch, searchCallback) {
    function showPage(p) {
      if (p < 2) return 'show';
      if (p > pages - 3) return 'show';
      if (p > page - 2 && p < page + 2) return 'show';
      if (p == 2) return 'dots';
      if (p == pages - 3 && page != 0 && page != pages - 1) return 'dots';
      return 'hide';
    }
    var pages = Math.ceil(totalItems / config.directResultsPageSize);
    var pagesDiv = $('<div/>').addClass('pages').appendTo($(guiConfig.directResultsList));
    var i = 0;
    for (i; i < pages; i++) {
      var show = showPage(i);
      if (show == 'show') {
        $('<a/>', { href: '#' }).html(i + 1).data('page', i).addClass(page == i ? 'selected' : '').click(function (e) {
          e.preventDefault();
          searchCallback(_extends({}, prevSearch, {
            page: $(this).data('page')
          }));
        }).appendTo(pagesDiv);
      } else if (show == 'dots') {
        $('<span>...</span>').appendTo(pagesDiv);
      }
    }
  },

  addDisplayMoreButton: function addDisplayMoreButton() {
    /*
    * adds a "display more" button at the bottom of direct results, this element is only visible
    * on mobile view point (conditionally set in css)
    */
    var ps = this.previousSearch;
    if (ps.totalItems > (ps.page + 1) * config.directResultsPageSize) {
      $('.display-more').remove();
      $(guiConfig.directResultsList).append($('<a/>').attr('href', '#').addClass('display-more').html('Show more'));
    }
  },

  displayMore: function displayMore() {
    var displayMoreButtonWasClicked = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    /*
    * get the previous search, to get all the information that is needed to show more
    * results when you are scrolling
    */
    var ps = this.previousSearch;

    /*
    * Check if you are at the bottom of the page
    * and check if we are in mobile viewpoint by checking if ".display-more" is hidden
    * if all is true, then move on to decide if there are more pages to load or show end of page text
    */
    if (this.isBottomVisible() && $('.display-more').is(':hidden') || displayMoreButtonWasClicked) {
      if (ps.totalItems > (ps.page + 1) * config.directResultsPageSize) {
        this.search({
          query: ps.query,
          instant: false,
          preventReSearch: ps.preventReSearch,
          page: ps.page + 1
        });
      } else if (ps.totalItems > config.directResultsPageSize && $(guiConfig.directResultsList).find('div.endofresults').length === 0) {
        $(guiConfig.directResultsList).append($('<div/>').addClass('endofresults').html('No more results'));
      }
    }
  },

  isBottomVisible: function isBottomVisible() {
    var scroll = $(window).scrollTop();
    var windowHeight = $(window).height();
    var height = $(guiConfig.directResults).outerHeight() + $(guiConfig.directResults).offset().top;
    return scroll + windowHeight >= height;
  },

  resetView: function resetView(e) {
    e.preventDefault();
    _utils2.default.setHash({
      config: config.name
    });
    _loop54JsLib2.default.getRandomUserId();
    _utils2.default.resetShoppingCart(config.name, render.shoppingCart);
    $(guiConfig.mainContainer).removeClass('three-columns two-columns');
    $(guiConfig.directResults).hide();
    $(guiConfig.informationContainer).hide();
    $(guiConfig.related).hide();
    $(guiConfig.recommendedResultsContainer).hide();
    $(guiConfig.makesSense).hide();
    $(guiConfig.directResultsList).empty();
    $(guiConfig.spellingSuggestions).empty();
    $(guiConfig.inputSearch).val("");
    $(guiConfig.noResults).show();
    render.initFacetting();
  },

  toggleLeftColumn: function toggleLeftColumn(e) {
    if ($('.left-column').hasClass('opened')) {
      $('.left-column').addClass('closed').removeClass('opened');
      $('.left-column-toggle').addClass('sm-show').removeClass('sm-hide');
    } else {
      $('.left-column').show();
      $('.left-column').addClass('opened').removeClass('closed');
      $('.left-column-toggle').addClass('sm-hide').removeClass('sm-show');
    }
  }
};

// init eventhandlers
$(document).ready(function () {
  function handleClickResetFilter(e) {
    e.preventDefault();
    _filters2.default.reset();
    demo.clearPricefilters();
    demo.searchAgain();
  }

  function handlePerformSearch(event) {
    if (demo.isSearchEnabled) {
      var searchFieldValue = $(guiConfig.inputSearch).val();
      if (event.keyCode === 13 && searchFieldValue !== '' || event.type === 'click' && searchFieldValue !== '') {
        demo.isSearchEnabled = false;
        demo.search({
          query: searchFieldValue,
          clearFilters: true,
          clearSearch: true,
          preventReSearch: false,
          instant: false,
          page: 0
        });
        $(guiConfig.inputSearch).autocomplete('close');
        demo.isSearchEnabled = true;
      }
    }
  }

  function updatePriceLabel(input, label) {
    $(label).text($(input).val());
  }

  function handleDisplayMoreClicked(e) {
    e.preventDefault();
    // remove display more button when loading more (it is then added back at the bottom)
    $(e.target).remove();
    /*
    * trigger displayMore to load more results if there are any to load
    * also sending "true" in order to tell displayMore that it was a click that triggered the function
    */
    demo.displayMore(true);
  }

  $(window).hashchange(function (e, data) {
    _utils2.default.hashChanged(data.before.replace('#', ''), data.after.replace('#', ''), config, demo.handleHashChanged, demo.handleUpdateViewError);
  });

  if (location.hash === '') {
    // set default hash if none is set already
    _utils2.default.updateView(null, '', demo.handleHashChanged, demo.handleUpdateViewError, false);
  } else {
    var currentHash = location.hash.replace('#', '');
    var configName = _utils2.default.getHashValue('config', currentHash);
    if (configName && configName !== config.name) {
      _utils2.default.updateView(configName, currentHash, demo.handleHashChanged, demo.handleUpdateViewError, false);
    } else if (configName) {
      _utils2.default.updateView(configName, currentHash, demo.handleHashChanged, demo.handleUpdateViewError, true);
    }
  }

  $(guiConfig.priceslider).slider({
    range: true,
    min: 0,
    max: 500,
    step: 1,
    slide: function slide(event, ui) {
      demo.updatePriceFilterValues(ui.values[0], ui.values[1]);
    },
    stop: function stop(event, ui) {
      demo.PriceFilter.min = ui.values[0];
      demo.PriceFilter.max = ui.values[1];
      demo.searchAgain();
    }
  });

  /*
  * Initialize autocomplete functionality
  * this implementation is using jQuery UI's autocomplete library
  */
  $(guiConfig.inputSearch).autocomplete({
    source: function source(req, res) {
      _autocomplete2.default.getResults(req, res, _loop54JsLib2.default);
    },
    minLength: 2,
    select: function select(event, ui) {
      event.preventDefault();
      event.stopPropagation();
      demo.search({ clearFilters: true, instant: false, clearSearch: true, query: ui.item.value, facet: ui.item.facet });
    },
    open: function open(event, ui) {
      // prevent iOS from first setting focus on menu items instead of triggering click event
      $('.ui-autocomplete').off('menufocus hover mouseover mouseenter');
      $(this).removeClass('ui-corner-all').addClass('ui-corner-top');
    },
    close: function close(event, ui) {
      $(this).removeClass('ui-corner-top').addClass('ui-corner-all');
    }
  }).autocomplete('instance')._renderItem = function (ul, item) {
    var label = item.value;
    if (item.facet) {
      label = item.value + ' in ' + '<span class="facet">' + item.facet + '</span>';
    }
    return $('<li>').append('<a>' + label + '</a>').appendTo(ul);
  };

  /*
  * Create eventlisteners for various elements, we are using jQuery to handle all the events
  */
  $(document).on('click', '.display-more', handleDisplayMoreClicked);
  $('#resetfiltersbutton').on('click', handleClickResetFilter);
  $('#minPrice').on('change', function (e) {
    updatePriceLabel(e.target, '#minPriceLabel');
  });
  $('#maxPrice').on('change', function (e) {
    updatePriceLabel(e.target, '#maxPriceLabel');
  });
  $('#logo img').on('click', demo.resetView);
  $('.left-column-toggle').on('click', demo.toggleLeftColumn);
  $('.close-left-column').on('click', demo.toggleLeftColumn);
  $(guiConfig.buttonSearch).on('click', handlePerformSearch);
  $(guiConfig.inputSearch).on('keyup', handlePerformSearch);
  $(guiConfig.inputSearch).focus();
  $(guiConfig.buttonNewUser).click(function () {
    _loop54JsLib2.default.getRandomUserId();
    _utils2.default.resetShoppingCart(config.name, render.shoppingCart);
    _utils2.default.showNotification('You are now searching as a new user!', 2000);
  });
  $(document).on('click', function (e) {
    if ($('.shopping-cart').is(':visible')) {
      $('.shopping-cart').hide();
    }
  });
  $('.shopping-cart').on('click', function (e) {
    e.stopPropagation();
  });
  $('#cart').on('click', function (e) {
    e.stopPropagation();
    e.preventDefault();
    $('.shopping-cart').fadeToggle('fast');
  });

  demo.setVersionNumber();
});

},{"./autocomplete.js":18,"./filters.js":19,"./render.js":22,"./utils.js":24,"es6-promise":14,"loop54-js-lib":16}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('./utils.js');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var loader = {
  config: null,

  loadDemoConfig: function loadDemoConfig(configName, updateViewSuccessCallback, updateViewErrorCallback) {
    $.ajax({
      dataType: 'json',
      url: 'customer.json',
      success: function success(data) {
        _utils2.default.showNotification('Successfully loaded ' + data.name);
        updateViewSuccessCallback(data);
      },
      error: function error(jqXHR, textStatus, errorThrown) {
        console.log(jqXHR);
        console.log('Could not load demo config');
        _utils2.default.showNotification('Could not load demo config');
        var errorMessage = 'This demo is not available at the moment.';
        updateViewErrorCallback(errorMessage, jqXHR.status);
      }
    });
  }
}; /* globals $ */
exports.default = loader;

},{"./utils.js":24}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('./utils.js');

var _utils2 = _interopRequireDefault(_utils);

var _track = require('./track.js');

var _track2 = _interopRequireDefault(_track);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// requires jQuery to be in global scope
/* globals $ */

var render = function render(config, guiConfig) {
  function showInformationBox(html, infoType) {
    $(guiConfig.informationContainer).empty().removeClass('info success warning error');
    $(guiConfig.informationContainer).addClass(infoType).html(html);
    $(guiConfig.informationContainer).show();
  }

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

  function getEntityPrice(entity) {
    if (entity.Attributes['Price']) {
      return entity.Attributes['Price'][0];
    }

    return '';
  }

  function getEntityDescription(entity) {
    if (entity.Attributes[config.productDescriptionAttribute]) {
      return entity.Attributes[config.productDescriptionAttribute][0];
    }

    return '';
  }

  return {
    init: function init() {
      _track2.default.init(config);
      this.initFacetting();
    },

    initFacetting: function initFacetting() {
      $(guiConfig.pricesliderContainer).hide();
      $(guiConfig.filterFunctions).hide();
      $(guiConfig.filters).empty();

      for (var i = 0; i < config.filters.length; i++) {
        $(guiConfig.filters).append($('<h6/>').attr('id', 'filter_header_' + config.filters[i].name.replace(' ', '_')).html(config.filters[i].name).addClass('filterdiv-header')).append($('<div/>').attr('id', 'filter_' + config.filters[i].name.replace(' ', '_')).addClass('filterdiv'));
      }
    },

    showMakesNoSense: function showMakesNoSense(directResultsLength, spellingSuggestions, query, searchCallback) {
      var infoType = 'error';
      var informationHeader = $('<div />').addClass('information-header').html('We did not understand the query "<b>' + query + '</b>". ');
      var informationContent = '';

      if (directResultsLength > 0) {
        infoType = 'warning';
        informationHeader.append($('<span>The results below are approximate.</span>'));
      }

      if (spellingSuggestions && spellingSuggestions.length > 0) {
        var onClick = function onClick(e) {
          e.preventDefault();
          searchCallback({ query: $(this).data('query'), clearFilters: true });
        };

        infoType = 'warning';
        informationContent = $('<div />').addClass('information-content').html('Did you mean to search for: ');
        var informationContentList = $('<span />').addClass('information-list');

        for (var i = 0; i < spellingSuggestions.length; i++) {
          informationContentList.append($('<a />', { href: '#' }).html(spellingSuggestions[i].Key).data('query', spellingSuggestions[i].Key).click(onClick));
        }

        informationContent.append(informationContentList);
      }

      var makesNoSenseHTML = $('<div />').append(informationHeader).append(informationContent);
      showInformationBox(makesNoSenseHTML, infoType);
    },

    showReSearch: function showReSearch(reSearchString, originalQuery, searchCallback) {
      function onClick(e) {
        e.preventDefault();
        searchCallback({
          query: $(this).data('query'),
          clearFilters: true,
          instant: false,
          preventReSearch: true
        });
      }

      var informationHeader = $('<div />').addClass('information-header').html('We assumed you meant "<b>' + reSearchString + '</b>".');
      var informationContent = $('<div />').addClass('information-content').html('Search instead for ').append($('<a />', { href: '#' }).html(originalQuery).click(onClick));
      showInformationBox(informationHeader, 'warning');
    },

    addRelated: function addRelated(related, searchCallback) {
      function onClick(e) {
        e.preventDefault();
        searchCallback({
          query: $(this).data('query'),
          clearFilters: true,
          instant: false,
          preventReSearch: false
        });
      }

      var relatedList = $('<span />').addClass('related-list');

      for (var i = 0; i < related.length; i++) {
        relatedList.append($('<a />', { href: '#' }).html(related[i].Key).data('query', related[i].Key).click(onClick));
      }

      $(guiConfig.related).empty().append($('<span/>').addClass('related-header').html('Related')).append(relatedList);
      $(guiConfig.related).show();
    },

    directResults: function directResults(_directResults, totalItems, isContinuation, loop54) {
      if (!isContinuation) {
        $(guiConfig.directResultsTotalItems).text(totalItems);
      }

      if (totalItems > 0) {
        $(guiConfig.noResults).hide();
        $(guiConfig.directResults).show();
      } else {
        $(guiConfig.directResults).hide();
        $(guiConfig.noResults).show();
      }

      for (var i = 0; i < _directResults.length; i++) {
        this.renderEntity(guiConfig.directResultsList, _directResults[i].Key, _directResults[i].Value, loop54);
      }
    },

    recommendedResults: function recommendedResults(_recommendedResults, isContinuation, loop54) {
      if ($(guiConfig.recommendedResultsContainer).not(':visible') && !isContinuation || $(guiConfig.recommendedResultsContainer).is(':visible') && isContinuation) {
        $(guiConfig.recommendedResultsContainer).show();
        $('.demo-content').removeClass('two-columns').addClass('three-columns');

        for (var i = 0; i < _recommendedResults.length; i++) {
          this.renderEntity(guiConfig.recommendedResultsList, _recommendedResults[i].Key, _recommendedResults[i].Value, loop54, 'mdl-cell--12-col');
        }
      }
    },

    noRecommendedResults: function noRecommendedResults() {
      $(guiConfig.recommendedResultsContainer).hide();
      $('.demo-content').removeClass('three-columns').addClass('two-columns');
    },

    clearSearch: function clearSearch(keepResults) {
      if (!keepResults) {
        $(guiConfig.mainContainer).removeClass('three-columns two-columns');
        $(guiConfig.directResults).hide();
        $(guiConfig.recommendedResultsContainer).hide();
        $(guiConfig.noResults).show();
        $(guiConfig.directResultsList).empty();
        $(guiConfig.recommendedResultsList).empty();
      }
      $(guiConfig.informationContainer).hide();
      $(guiConfig.related).hide();
    },

    hidePopup: function hidePopup() {
      $('div#popupbg').hide();
      $('div.entitypopup').remove();
    },

    renderEntity: function renderEntity(element, entity, value, loop54, extraClass) {
      var imgUrl = replaceImageUrl(entity),
          entityTitle = getEntityTitle(entity),
          entityPrice = getEntityPrice(entity),
          customClass = '';
      var self = this;

      if (imgUrl == '') {
        var randomNumber = Math.floor(Math.random() * 5) + 1;
        customClass = ' placeholder-image';
        imgUrl = '/images/placeholder-' + randomNumber + '.png';
      }

      var div = $('<div/>').addClass('entity').addClass(extraClass).addClass('demo-card-square mdl-card mdl-shadow--2dp');

      if (config.showValues) {
        div.attr('title', value);
      }

      var emptyDiv = $('<div/>').addClass('mdl-card__title mdl-card--expand' + customClass).css({ 'background-image': 'url(\'' + imgUrl + '\')' }).data('entity', entity).data('value', value).click(function () {
        self.showEntity($(this).data('entity'), $(this).data('value'), loop54);
      }).appendTo(div);

      var title = $('<div/>').addClass('mdl-card__supporting-text').html(entityTitle).data('entity', entity).data('value', value).click(function () {
        self.showEntity($(this).data('entity'), $(this).data('value'), loop54);
      }).appendTo(div);

      var actionsDiv = $('<div/>').addClass('mdl-card__actions mdl-card--border').appendTo(div);

      if (entityPrice !== '') {
        var price = $('<span/>').html(Math.ceil(entityPrice) + '.-').appendTo(actionsDiv);
      }

      var icon = $('<i/>').addClass('material-icons').html('shopping_cart').click(function () {
        _track2.default.event(entity, 'purchase', loop54, self.shoppingCart);
      }).appendTo(actionsDiv);

      div.appendTo($(element));
    },

    showEntity: function showEntity(entity, value, loop54) {
      var self = this;
      _track2.default.event(entity, 'click', loop54);

      function closePopup(e) {
        e.preventDefault();
        $('div#popupbg').hide();
        $('div.entitypopup').remove();
      }

      function handlePurchaseEvent(e) {
        e.preventDefault();
        _track2.default.event(entity, 'purchase', loop54, self.shoppingCart);
      }

      // show the grey background and remove the old popup container
      $('div#popupbg').show();
      $('div.entitypopup').remove();

      // create a new popup container
      var entityPopup = $('<div/>').addClass('entitypopup').appendTo($('body')).css('top', $(window).scrollTop() + 100);

      // set up listeners for closing the popup
      $('<a />', { href: '#' }).addClass('close').html('x').click(closePopup).appendTo(entityPopup);
      $('div#popupbg').click(closePopup);
      $(window).on('keydown', function (e) {
        if (e.which === 27 && $('div#popupbg').is(':visible')) {
          closePopup(e);
        }
      });

      // create image container
      var imgUrl = replaceImageUrl(entity);
      if (imgUrl == '') {
        var randomNumber = Math.floor(Math.random() * 5) + 1;
        imgUrl = '/images/placeholder-' + randomNumber + '.png';
      }
      var imageContainer = $('<div />').addClass('popup-image-container');
      var image = $('<img />').attr('src', imgUrl);
      $('<a />').attr({ 'href': imgUrl, 'target': '_blank' }).html(image).appendTo(imageContainer);
      imageContainer.appendTo(entityPopup);

      // create information container
      var informationContainer = $('<div />').addClass('popup-information-container');

      // entity title field
      $('<h2 />').addClass('popup-title-field').html(getEntityTitle(entity)).appendTo(informationContainer);

      var functionsContainer = $('<div />').addClass('popup-functions-container');
      // price tag (if present)
      var entityPrice = getEntityPrice(entity);
      if (entityPrice !== '') {
        $('<span />').addClass('popup-price-field').html(Math.ceil(entityPrice) + '.-').appendTo(functionsContainer);
      }

      // purchase button
      $('<a />', { href: '#' }).addClass('popup-purchase-button').html('Purchase <i class="material-icons">shopping_cart</i>').click(handlePurchaseEvent).appendTo(functionsContainer);

      functionsContainer.appendTo(informationContainer);

      // entity description field
      $('<div />').addClass('popup-description-field').html('<div class="popup-description-title">Description</div>' + getEntityDescription(entity)).appendTo(informationContainer);

      informationContainer.appendTo(entityPopup);

      // extra info (hidden by default)
      $('<a />', { href: '#' }).html('Show all attributes').addClass('popup-extra-info-showhide').appendTo(entityPopup).click(function (e) {
        e.preventDefault();
        $('.popup-extra-information').toggle();
        var text = $('.popup-extra-info-showhide').text();
        $('.popup-extra-info-showhide').text(text == 'Show all attributes' ? 'Hide all attributes' : 'Show all attributes');
      });

      var extraInfoContainer = $('<div />').addClass('popup-extra-information').appendTo(entityPopup);
      var extraInfoTopContainer = $('<div />').addClass('popup-extra-info-top');

      $('<p />').addClass('popup-extra-info-row').html('<span class="popup-extra-info-label">EntityType</span><p>' + entity.EntityType + '</p>').appendTo(extraInfoTopContainer);
      $('<p />').addClass('popup-extra-info-row').html('<span class="popup-extra-info-label">ExternalId</span><p>' + entity.ExternalId + '</p>').appendTo(extraInfoTopContainer);
      $('<p />').addClass('popup-extra-info-row').html('<span class="popup-extra-info-label">Value</span><p>' + value + '</p>').appendTo(extraInfoTopContainer);
      extraInfoTopContainer.appendTo(extraInfoContainer);

      for (var key in entity.Attributes) {
        $('<p />').addClass('popup-extra-info-row').html('<span class="popup-extra-info-label">' + key + '</span><p>' + entity.Attributes[key] + '</p>').appendTo(extraInfoContainer);
      }
    },

    shoppingCart: function shoppingCart(items, totalAmount) {
      $('.shopping-cart-total-items').each(function (i, item) {
        item.innerText = totalAmount;
      });

      var shoppingCartItems = $('.shopping-cart-items');
      shoppingCartItems.empty();
      $(items).each(function (i, item) {
        var li = $('<li/>').addClass('clearfix');

        if (item.image == '') {
          var randomNumber = Math.floor(Math.random() * 5) + 1;
          var image = '/images/placeholder-' + randomNumber + '.png';
        }

        $('<img/>').attr('src', item.image || image).appendTo(li);

        $('<span/>').addClass('item-name').html('<span class="item-name">' + item.name + '</span>').appendTo(li);

        if (item.price != null) {
          $('<span/>').addClass('item-price').html('<span class="item-price">' + Math.ceil(item.price) + '.-</span>').appendTo(li);
        };

        $('<span/>').addClass('item-quantity').html('<span class="item-quantity">Quantity: ' + item.amount + '</span>').appendTo(li);

        li.appendTo(shoppingCartItems);
      });

      if (shoppingCartItems.find('li').length < 1) {
        var li = $('<li/>').addClass('clearfix').html('No purchases yet!').appendTo(shoppingCartItems);
      }
    }
  };
};

exports.default = render;

},{"./track.js":23,"./utils.js":24}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _utils = require('./utils.js');

var _utils2 = _interopRequireDefault(_utils);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var track = {
  config: {},

  init: function init(config) {
    this.config = config;
  },

  event: function event(entity, eventType, loop54, renderShoppingCart) {
    /*
    * utils and render is included to make the demo application work,
    * if you just want to use this file without the demo application you can
    * safely remove these and the related code below.
    */
    var req = {
      Events: [{
        Type: eventType,
        Entity: {
          EntityType: entity.EntityType,
          ExternalId: entity.ExternalId
        }
      }],
      QuestName: this.config.createEventsQuest
    };

    loop54.getResponse(req).then(function (response) {
      if (!response.success) {
        console.log(response.errorMessage);
        _utils2.default.showNotification('Error: ' + response.errorMessage);
      } else {
        if (eventType == 'purchase') {
          var name, price, image;
          if (entity.Attributes[track.config.productTitleAttribute]) {
            name = entity.Attributes[track.config.productTitleAttribute][0];
          } else {
            name = '';
          }
          if (entity.Attributes['Price']) {
            price = entity.Attributes['Price'][0];
          } else {
            price = null;
          }
          image = track.config.productImageUrl;

          for (var i = 0; i < track.config.productImageUrlAttributes.length; i++) {
            var attr = track.config.productImageUrlAttributes[i];
            var attrValue = '';
            if (attr == 'ExternalId') {
              attrValue = entity.ExternalId;
            } else if (entity.Attributes[track.config.productImageUrlAttributes[i]]) {
              attrValue = entity.Attributes[track.config.productImageUrlAttributes[i]][0];
            }
            image = image.split('$' + (i + 1)).join(attrValue);
          }

          _utils2.default.showNotification('Purchased "' + name + '"', 1000);
          _utils2.default.updateShoppingCart({ id: entity.ExternalId, name: name, price: price, image: image, amount: 1 }, renderShoppingCart);
        }
      }
    });
  }
}; /*
   * This file includes all logic for tracking events when using Loop54.
   * You can find more information about Events in our docs:
   * https://www.loop54.com/docs/product-search-event-tracking
   *
   * Feel free to change this file to fit your needs.
   */
exports.default = track;

},{"./utils.js":24}],24:[function(require,module,exports){
/* globals location */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _loader = require('./loader.js');

var _loader2 = _interopRequireDefault(_loader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var utils = {
  initShoppingCart: function initShoppingCart(customerName, renderShoppingCartCallback) {
    if (!localStorage.cart) {
      utils.setShoppingCart({ items: [], total: 0, customer: customerName });
    } else {
      var cart = utils.getShoppingCart();
      if (cart.customer == customerName) {
        renderShoppingCartCallback(cart.items, cart.total);
      } else {
        utils.setShoppingCart({ items: [], total: 0, customer: customerName });
        renderShoppingCartCallback([], 0);
      }
    }
  },

  updateShoppingCart: function updateShoppingCart(entity, renderShoppingCartCallback) {
    var cart = utils.getShoppingCart();
    var itemIndex = null;
    for (var i = 0; i < cart.items.length; i++) {
      if (cart.items[i].id == entity.id) {
        itemIndex = i;
      }
    };

    if (itemIndex !== null) {
      cart.items[itemIndex].amount += entity.amount;
    } else {
      cart.items.push(entity);
    }

    cart.total = cart.total + entity.amount;
    utils.setShoppingCart(cart);
    renderShoppingCartCallback(cart.items, cart.total);
    // var shoppingCartValue = document.querySelector('.shopping-cart-value');
    // shoppingCartValue.innerText = newValue;
  },

  getShoppingCart: function getShoppingCart() {
    return JSON.parse(localStorage.cart);
  },

  setShoppingCart: function setShoppingCart(item) {
    localStorage.cart = JSON.stringify(item);
  },

  resetShoppingCart: function resetShoppingCart(customerName, renderShoppingCartCallback) {
    utils.setShoppingCart({ items: [], total: 0, customer: customerName });
    renderShoppingCartCallback([], 0);
  },

  showNotification: function showNotification(message) {
    var timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 5000;

    var notification = document.querySelector('.mdl-js-snackbar');
    var data = {
      message: message,
      timeout: timeout
    };
    if (notification.MaterialSnackbar) {
      notification.MaterialSnackbar.showSnackbar(data);
    }
  },

  buildURI: function buildURI(newHash) {
    var returnHash = '#';
    $.each(newHash, function (key, value) {
      if (returnHash !== '#') {
        returnHash = returnHash + '&';
      }
      returnHash = returnHash + key + '=' + value;
    });
    return returnHash;
  },

  getHashValue: function getHashValue(name, hash) {
    if (!hash) {
      hash = decodeURI(location.hash.replace('#', ''));
    } else {
      hash = decodeURI(hash);
    }

    var split = hash.split('&');
    for (var i = 0; i < split.length; i++) {
      var pair = split[i].split('=');

      if (pair[0] === name) {
        return pair[1];
      }
    }
    return null;
  },

  justSetHash: null,

  setHash: function setHash(newHash) {
    var newHash = utils.buildURI(newHash);
    utils.justSetHash = newHash.replace('#', '');
    location.hash = newHash;
  },

  updateView: function updateView(configName, currentHash, callback, errorCallback, onlyPerformSearch) {
    var updateViewSuccessCallback = function updateViewSuccessCallback(config) {
      if (config) {
        var section = utils.getHashValue('section', currentHash);
        var page = parseInt(utils.getHashValue('page', currentHash));
        var searchQuery = utils.getHashValue('query', currentHash);
        if (searchQuery && searchQuery !== '') {
          if (onlyPerformSearch) {
            config = null;
          }
          callback(config, {
            query: searchQuery,
            clearFilters: true,
            clearSearch: true,
            instant: false,
            preventReSearch: false,
            page: page || 0
          });
        } else {
          callback(config, '');
        }
      }
    };

    var updateViewErrorCallback = function updateViewErrorCallback(errorMessage, errorCode) {
      errorCallback(errorMessage, errorCode);
    };
    _loader2.default.loadDemoConfig(configName, updateViewSuccessCallback, updateViewErrorCallback);
  },

  hashChanged: function hashChanged(previousHash, currentHash, config, callback, errorCallback) {
    if (currentHash && currentHash != previousHash) {
      var hashChangedSuccessCallback = function hashChangedSuccessCallback(newConfig) {
        var section = utils.getHashValue('section', currentHash);
        var page = parseInt(utils.getHashValue('page', currentHash));

        if (newConfig) {
          callback(newConfig);
        } else if (section === 'search') {

          var searchQuery = utils.getHashValue('query', currentHash);
          var oldQuery = utils.getHashValue('query', previousHash);
          if (searchQuery != oldQuery && searchQuery !== '') {

            callback(null, {
              query: searchQuery,
              clearFilters: true,
              clearSearch: true,
              instant: false,
              preventReSearch: false,
              page: page || 0
            });
          }
        }
      };

      var hashChangedErrorCallback = function hashChangedErrorCallback(errorMessage, errorCode) {
        errorCallback(errorMessage, errorCode);
      };

      //make sure we dont do anything if the hash was set by code, not the user
      if (currentHash !== utils.justSetHash) {
        var configName = utils.getHashValue('config', currentHash);
        //no demo config loaded or new config does not match
        if (config === null || configName !== config.name) {
          console.log("hashchanged");
          _loader2.default.loadDemoConfig(configName, hashChangedSuccessCallback, hashChangedErrorCallback);
        } else {
          hashChangedSuccessCallback();
        }
      }
    }
  }
};

exports.default = utils;

},{"./loader.js":21}]},{},[20]);
