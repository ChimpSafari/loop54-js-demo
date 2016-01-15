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
},{}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
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
      requestObj[questName] = params;
    } else {
      requestObj = params;
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
},{"./combabillity.js":2,"./cookies.js":3,"axios":5}],5:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":7}],6:[function(require,module,exports){
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

},{"./../defaults":10,"./../helpers/buildUrl":11,"./../helpers/cookies":12,"./../helpers/parseHeaders":13,"./../helpers/transformData":15,"./../helpers/urlIsSameOrigin":16,"./../utils":17}],7:[function(require,module,exports){
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

},{"./core/InterceptorManager":8,"./core/dispatchRequest":9,"./defaults":10,"./helpers/spread":14,"./utils":17}],8:[function(require,module,exports){
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

},{"./../utils":17}],9:[function(require,module,exports){
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
},{"../adapters/http":6,"../adapters/xhr":6,"_process":1}],10:[function(require,module,exports){
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

},{"./utils":17}],11:[function(require,module,exports){
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

},{"./../utils":17}],12:[function(require,module,exports){
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

},{"./../utils":17}],13:[function(require,module,exports){
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

},{"./../utils":17}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{"./../utils":17}],16:[function(require,module,exports){
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

},{"./../utils":17}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
/*globals $ */

'use strict';

// ES6 or using requre.js: import/require lib and use

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _loop54JsLib = require('loop54-js-lib');

var _loop54JsLib2 = _interopRequireDefault(_loop54JsLib);

var _render = require('./render.js');

var _render2 = _interopRequireDefault(_render);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

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
  name: 'Netrauta',
  url: 'http://netrauta-dev.54proxy.com',
  autoCompleteQuest: 'AutoComplete',
  searchQuest: 'Search',
  similarProductsQuest: 'SimilarProducts',
  createEventsQuest: 'CreateEvents',
  filters: [{
    'Name': 'Kategorier',
    'RequestParameter': 'Faceting.Categories',
    'ResponseParameter': 'Categories'
  }, {
    'Name': 'Märken',
    'RequestParameter': 'Faceting.Brands',
    'ResponseParameter': 'Brands'
  }],
  autoCompletePageSize: 8,
  directResultsPageSize: 24,
  recommendedResultsPageSize: 12,
  continousScrolling: false,
  instantSearch: false,
  devMode: true,
  cacheAutoComplete: false,
  autoCompleteFacetingParameter: 'Faceting.Categories',
  productTitleAttribute: 'productName',
  productDescriptionAttribute: 'Description',
  productImageUrlAttributes: ['imageURL'],
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

var demo = {
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
      EntityType: entity.EntityType,
      ExternalId: entity.ExternalId,
      Events: [event],
      QuestName: config.createEventsQuest,
      Type: eventType
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
  },

  previousSearch: {},

  autocomplete: function autocomplete(req, res) {

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
  },

  formatAutoCompleteData: function formatAutoCompleteData(data) {
    var _ret;

    var ret, facets;

    ret = data.AutoComplete.map(function (x) {
      return {
        value: x.Key,
        label: x.Key
      };
    });

    ret = ret.filter(function (x) {
      return x.value !== data.AutoCompleteFacetingString;
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

  getSearchRequest: function getSearchRequest(options) {
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
  },

  search: function search() {
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
  },

  displayMore: function displayMore() {
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
  },

  updateFilters: function updateFilters(res) {

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
  },

  // JustSetHash: null,

  // SetHash: function(newHash) {
  //   this.JustSetHash = newHash;
  //   location.hash = '#' + newHash;
  // },

  isBottomVisible: function isBottomVisible() {
    var scroll = $(window).scrollTop();
    var windowHeight = $(window).height();

    var height = $(guiConfig.directResults).outerHeight() + $(guiConfig.directResults).offset().top;

    return scroll + windowHeight >= height;
  },

  // hashChanged: function(previousHash, currentHash) {

  //   if (currentHash) {

  //     currentHash = decodeURI(currentHash);

  //     var moveFunc = function() {
  //       var type = utils.getHashValue('page', currentHash);

  //       if (type === 'search') {

  //         var query = this.getHashValue('query', currentHash);
  //         this.search(query, false, false, 0);
  //       }
  //     };

  //     //make sure we dont do anything if the hash was set by code, not the user
  //     if (currentHash !== this.justSetHash) {

  //       var configName = this.getHashValue('config', currentHash);

  //       //no demo config loaded or new config does not match
  //       // ???
  //       if ( config === null || configName !== config.Name) {
  //         this.loadDemoConfig(configName, moveFunc);
  //       }
  //       else {
  //         moveFunc();
  //       }
  //     }
  //   }
  // }

  clearFilters: function clearFilters() {
    this.filters = {};
  },

  searchAgain: function searchAgain() {
    this.search(_extends({}, this.previousSearch, { clearSearch: true, page: 0 }));
  },

  addFilter: function addFilter(key, value) {

    if (!this.filters[key]) {
      this.filters[key] = [];
    }

    this.filters[key].push(value);
  },

  removeFilter: function removeFilter(key, value) {

    var param = this.filters[key];

    if (!param) {
      return;
    }

    var index = param.indexOf(value);

    if (index > -1) {
      param.splice(index, 1);
    }
  }

};

},{"./render.js":19,"./utils.js":20,"loop54-js-lib":4}],19:[function(require,module,exports){
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
},{}],20:[function(require,module,exports){
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

},{}]},{},[18]);
