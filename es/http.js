import _createForOfIteratorHelper from "@babel/runtime-corejs3/helpers/createForOfIteratorHelper";
import _typeof from "@babel/runtime-corejs3/helpers/typeof";
import _slicedToArray from "@babel/runtime-corejs3/helpers/slicedToArray";
import _asyncToGenerator from "@babel/runtime-corejs3/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime-corejs3/regenerator";
import _includesInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/includes";
import _entriesInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/entries";
import _reduceInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/reduce";
import _Array$from from "@babel/runtime-corejs3/core-js-stable/array/from";
import _JSON$stringify from "@babel/runtime-corejs3/core-js-stable/json/stringify";
import _mapInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/map";
import _Object$keys from "@babel/runtime-corejs3/core-js-stable/object/keys";
import _concatInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/concat";
import _Object$entries from "@babel/runtime-corejs3/core-js-stable/object/entries";
import _filterInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/filter";
import qs from 'qs';
import pick from 'lodash/pick';
import isFunction from 'lodash/isFunction';
import { Buffer } from 'buffer';
import FormData from './internal/form-data-monkey-patch';
import { encodeDisallowedCharacters } from './execute/oas3/style-serializer'; // For testing

export var self = {
  serializeRes: serializeRes,
  mergeInQueryOrForm: mergeInQueryOrForm
}; // Handles fetch-like syntax and the case where there is only one object passed-in
// (which will have the URL as a property). Also serilizes the response.

export default function http(_x) {
  return _http.apply(this, arguments);
} // exported for testing

function _http() {
  _http = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(url) {
    var request,
        contentType,
        res,
        error,
        _error,
        _args = arguments;

    return _regeneratorRuntime.wrap(function _callee$(_context9) {
      while (1) {
        switch (_context9.prev = _context9.next) {
          case 0:
            request = _args.length > 1 && _args[1] !== undefined ? _args[1] : {};

            if (_typeof(url) === 'object') {
              request = url;
              url = request.url;
            }

            request.headers = request.headers || {}; // Serializes query, for convenience
            // Should be the last thing we do, as its hard to mutate the URL with
            // the search string, but much easier to manipulate the req.query object

            self.mergeInQueryOrForm(request); // Newlines in header values cause weird error messages from `window.fetch`,
            // so let's massage them out.
            // Context: https://stackoverflow.com/a/50709178

            if (request.headers) {
              _Object$keys(request.headers).forEach(function (headerName) {
                var value = request.headers[headerName];

                if (typeof value === 'string') {
                  request.headers[headerName] = value.replace(/\n+/g, ' ');
                }
              });
            } // Wait for the request interceptor, if it was provided
            // WARNING: don't put anything between this and the request firing unless
            // you have a good reason!


            if (!request.requestInterceptor) {
              _context9.next = 12;
              break;
            }

            _context9.next = 8;
            return request.requestInterceptor(request);

          case 8:
            _context9.t0 = _context9.sent;

            if (_context9.t0) {
              _context9.next = 11;
              break;
            }

            _context9.t0 = request;

          case 11:
            request = _context9.t0;

          case 12:
            // for content-type=multipart\/form-data remove content-type from request before fetch
            // so that correct one with `boundary` is set
            contentType = request.headers['content-type'] || request.headers['Content-Type'];

            if (/multipart\/form-data/i.test(contentType)) {
              delete request.headers['content-type'];
              delete request.headers['Content-Type'];
            } // eslint-disable-next-line no-undef


            _context9.prev = 14;
            _context9.next = 17;
            return (request.userFetch || fetch)(request.url, request);

          case 17:
            res = _context9.sent;
            _context9.next = 20;
            return self.serializeRes(res, url, request);

          case 20:
            res = _context9.sent;

            if (!request.responseInterceptor) {
              _context9.next = 28;
              break;
            }

            _context9.next = 24;
            return request.responseInterceptor(res);

          case 24:
            _context9.t1 = _context9.sent;

            if (_context9.t1) {
              _context9.next = 27;
              break;
            }

            _context9.t1 = res;

          case 27:
            res = _context9.t1;

          case 28:
            _context9.next = 39;
            break;

          case 30:
            _context9.prev = 30;
            _context9.t2 = _context9["catch"](14);

            if (res) {
              _context9.next = 34;
              break;
            }

            throw _context9.t2;

          case 34:
            error = new Error(res.statusText);
            error.status = res.status;
            error.statusCode = res.status;
            error.responseError = _context9.t2;
            throw error;

          case 39:
            if (res.ok) {
              _context9.next = 45;
              break;
            }

            _error = new Error(res.statusText);
            _error.status = res.status;
            _error.statusCode = res.status;
            _error.response = res;
            throw _error;

          case 45:
            return _context9.abrupt("return", res);

          case 46:
          case "end":
            return _context9.stop();
        }
      }
    }, _callee, null, [[14, 30]]);
  }));
  return _http.apply(this, arguments);
}

export var shouldDownloadAsText = function shouldDownloadAsText() {
  var contentType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return /(json|xml|yaml|text)\b/.test(contentType);
};

function parseBody(body, contentType) {
  // Context is always json from Shadow, we remove yaml parser
  return JSON.parse(body);
} // Serialize the response, returns a promise with headers and the body part of the hash


export function serializeRes(oriRes, url) {
  var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      _ref$loadSpec = _ref.loadSpec,
      loadSpec = _ref$loadSpec === void 0 ? false : _ref$loadSpec;

  var res = {
    ok: oriRes.ok,
    url: oriRes.url || url,
    status: oriRes.status,
    statusText: oriRes.statusText,
    headers: serializeHeaders(oriRes.headers)
  };
  var contentType = res.headers['content-type'];
  var useText = loadSpec || shouldDownloadAsText(contentType);
  var getBody = useText ? oriRes.text : oriRes.blob || oriRes.buffer;
  return getBody.call(oriRes).then(function (body) {
    res.text = body;
    res.data = body;

    if (useText) {
      try {
        var obj = parseBody(body, contentType);
        res.body = obj;
        res.obj = obj;
      } catch (e) {
        res.parseError = e;
      }
    }

    return res;
  });
}

function serializeHeaderValue(value) {
  var isMulti = _includesInstanceProperty(value).call(value, ', ');

  return isMulti ? value.split(', ') : value;
} // Serialize headers into a hash, where mutliple-headers result in an array.
//
// eg: Cookie: one
//     Cookie: two
//  =  { Cookie: [ "one", "two" ]


export function serializeHeaders() {
  var _context;

  var headers = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  if (!isFunction(_entriesInstanceProperty(headers))) return {};
  return _reduceInstanceProperty(_context = _Array$from(_entriesInstanceProperty(headers).call(headers))).call(_context, function (acc, _ref2) {
    var _ref3 = _slicedToArray(_ref2, 2),
        header = _ref3[0],
        value = _ref3[1];

    acc[header] = serializeHeaderValue(value);
    return acc;
  }, {});
}
export function isFile(obj, navigatorObj) {
  if (!navigatorObj && typeof navigator !== 'undefined') {
    // eslint-disable-next-line no-undef
    navigatorObj = navigator;
  }

  if (navigatorObj && navigatorObj.product === 'ReactNative') {
    if (obj && _typeof(obj) === 'object' && typeof obj.uri === 'string') {
      return true;
    }

    return false;
  }

  if (typeof File !== 'undefined' && obj instanceof File) {
    // eslint-disable-line no-undef
    return true;
  }

  if (typeof Blob !== 'undefined' && obj instanceof Blob) {
    // eslint-disable-line no-undef
    return true;
  }

  if (typeof Buffer !== 'undefined' && obj instanceof Buffer) {
    return true;
  }

  return obj !== null && _typeof(obj) === 'object' && typeof obj.pipe === 'function';
}

function isArrayOfFile(obj, navigatorObj) {
  return Array.isArray(obj) && obj.some(function (v) {
    return isFile(v, navigatorObj);
  });
}

var STYLE_SEPARATORS = {
  form: ',',
  spaceDelimited: '%20',
  pipeDelimited: '|'
};
var SEPARATORS = {
  csv: ',',
  ssv: '%20',
  tsv: '%09',
  pipes: '|'
}; // Formats a key-value and returns an array of key-value pairs.
//
// Return value example 1: [['color', 'blue']]
// Return value example 2: [['color', 'blue,black,brown']]
// Return value example 3: [['color', ['blue', 'black', 'brown']]]
// Return value example 4: [['color', 'R,100,G,200,B,150']]
// Return value example 5: [['R', '100'], ['G', '200'], ['B', '150']]
// Return value example 6: [['color[R]', '100'], ['color[G]', '200'], ['color[B]', '150']]

function formatKeyValue(key, input) {
  var skipEncoding = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var collectionFormat = input.collectionFormat,
      allowEmptyValue = input.allowEmptyValue,
      serializationOption = input.serializationOption,
      encoding = input.encoding; // `input` can be string

  var value = _typeof(input) === 'object' && !Array.isArray(input) ? input.value : input;
  var encodeFn = skipEncoding ? function (k) {
    return k.toString();
  } : function (k) {
    return encodeURIComponent(k);
  };
  var encodedKey = encodeFn(key);

  if (typeof value === 'undefined' && allowEmptyValue) {
    return [[encodedKey, '']];
  } // file


  if (isFile(value) || isArrayOfFile(value)) {
    return [[encodedKey, value]];
  } // for OAS 3 Parameter Object for serialization


  if (serializationOption) {
    return formatKeyValueBySerializationOption(key, value, skipEncoding, serializationOption);
  } // for OAS 3 Encoding Object


  if (encoding) {
    if ([_typeof(encoding.style), _typeof(encoding.explode), _typeof(encoding.allowReserved)].some(function (type) {
      return type !== 'undefined';
    })) {
      return formatKeyValueBySerializationOption(key, value, skipEncoding, pick(encoding, ['style', 'explode', 'allowReserved']));
    }

    if (encoding.contentType) {
      if (encoding.contentType === 'application/json') {
        // If value is a string, assume value is already a JSON string
        var json = typeof value === 'string' ? value : _JSON$stringify(value);
        return [[encodedKey, encodeFn(json)]];
      }

      return [[encodedKey, encodeFn(value.toString())]];
    } // Primitive


    if (_typeof(value) !== 'object') {
      return [[encodedKey, encodeFn(value)]];
    } // Array of primitives


    if (Array.isArray(value) && value.every(function (v) {
      return _typeof(v) !== 'object';
    })) {
      return [[encodedKey, _mapInstanceProperty(value).call(value, encodeFn).join(',')]];
    } // Array or object


    return [[encodedKey, encodeFn(_JSON$stringify(value))]];
  } // for OAS 2 Parameter Object
  // Primitive


  if (_typeof(value) !== 'object') {
    return [[encodedKey, encodeFn(value)]];
  } // Array


  if (Array.isArray(value)) {
    if (collectionFormat === 'multi') {
      // In case of multipart/formdata, it is used as array.
      // Otherwise, the caller will convert it to a query by qs.stringify.
      return [[encodedKey, _mapInstanceProperty(value).call(value, encodeFn)]];
    }

    return [[encodedKey, _mapInstanceProperty(value).call(value, encodeFn).join(SEPARATORS[collectionFormat || 'csv'])]];
  } // Object


  return [[encodedKey, '']];
}

function formatKeyValueBySerializationOption(key, value, skipEncoding, serializationOption) {
  var _context5;

  var style = serializationOption.style || 'form';
  var explode = typeof serializationOption.explode === 'undefined' ? style === 'form' : serializationOption.explode; // eslint-disable-next-line no-nested-ternary

  var escape = skipEncoding ? false : serializationOption && serializationOption.allowReserved ? 'unsafe' : 'reserved';

  var encodeFn = function encodeFn(v) {
    return encodeDisallowedCharacters(v, {
      escape: escape
    });
  };

  var encodeKeyFn = skipEncoding ? function (k) {
    return k;
  } : function (k) {
    return encodeDisallowedCharacters(k, {
      escape: escape
    });
  }; // Primitive

  if (_typeof(value) !== 'object') {
    return [[encodeKeyFn(key), encodeFn(value)]];
  } // Array


  if (Array.isArray(value)) {
    if (explode) {
      // In case of multipart/formdata, it is used as array.
      // Otherwise, the caller will convert it to a query by qs.stringify.
      return [[encodeKeyFn(key), _mapInstanceProperty(value).call(value, encodeFn)]];
    }

    return [[encodeKeyFn(key), _mapInstanceProperty(value).call(value, encodeFn).join(STYLE_SEPARATORS[style])]];
  } // Object


  if (style === 'deepObject') {
    var _context2;

    return _mapInstanceProperty(_context2 = _Object$keys(value)).call(_context2, function (valueKey) {
      var _context3;

      return [encodeKeyFn(_concatInstanceProperty(_context3 = "".concat(key, "[")).call(_context3, valueKey, "]")), encodeFn(value[valueKey])];
    });
  }

  if (explode) {
    var _context4;

    return _mapInstanceProperty(_context4 = _Object$keys(value)).call(_context4, function (valueKey) {
      return [encodeKeyFn(valueKey), encodeFn(value[valueKey])];
    });
  }

  return [[encodeKeyFn(key), _mapInstanceProperty(_context5 = _Object$keys(value)).call(_context5, function (valueKey) {
    var _context6;

    return [_concatInstanceProperty(_context6 = "".concat(encodeKeyFn(valueKey), ",")).call(_context6, encodeFn(value[valueKey]))];
  }).join(',')]];
}

function buildFormData(reqForm) {
  var _context7;

  /**
   * Build a new FormData instance, support array as field value
   * OAS2.0 - when collectionFormat is multi
   * OAS3.0 - when explode of Encoding Object is true
   * @param {Object} reqForm - ori req.form
   * @return {FormData} - new FormData instance
   */
  return _reduceInstanceProperty(_context7 = _Object$entries(reqForm)).call(_context7, function (formData, _ref4) {
    var _ref5 = _slicedToArray(_ref4, 2),
        name = _ref5[0],
        input = _ref5[1];

    // eslint-disable-next-line no-restricted-syntax
    var _iterator = _createForOfIteratorHelper(formatKeyValue(name, input, true)),
        _step;

    try {
      for (_iterator.s(); !(_step = _iterator.n()).done;) {
        var _step$value = _slicedToArray(_step.value, 2),
            key = _step$value[0],
            value = _step$value[1];

        if (Array.isArray(value)) {
          // eslint-disable-next-line no-restricted-syntax
          var _iterator2 = _createForOfIteratorHelper(value),
              _step2;

          try {
            for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
              var v = _step2.value;
              formData.append(key, v);
            }
          } catch (err) {
            _iterator2.e(err);
          } finally {
            _iterator2.f();
          }
        } else {
          formData.append(key, value);
        }
      }
    } catch (err) {
      _iterator.e(err);
    } finally {
      _iterator.f();
    }

    return formData;
  }, new FormData());
} // Encodes an object using appropriate serializer.


export function encodeFormOrQuery(data) {
  var _context8;

  /**
   * Encode parameter names and values
   * @param {Object} result - parameter names and values
   * @param {string} parameterName - Parameter name
   * @return {object} encoded parameter names and values
   */
  var encodedQuery = _reduceInstanceProperty(_context8 = _Object$keys(data)).call(_context8, function (result, parameterName) {
    // eslint-disable-next-line no-restricted-syntax
    var _iterator3 = _createForOfIteratorHelper(formatKeyValue(parameterName, data[parameterName])),
        _step3;

    try {
      for (_iterator3.s(); !(_step3 = _iterator3.n()).done;) {
        var _step3$value = _slicedToArray(_step3.value, 2),
            key = _step3$value[0],
            value = _step3$value[1];

        result[key] = value;
      }
    } catch (err) {
      _iterator3.e(err);
    } finally {
      _iterator3.f();
    }

    return result;
  }, {});

  return qs.stringify(encodedQuery, {
    encode: false,
    indices: false
  }) || '';
} // If the request has a `query` object, merge it into the request.url, and delete the object
// If file and/or multipart, also create FormData instance

export function mergeInQueryOrForm() {
  var req = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var _req$url = req.url,
      url = _req$url === void 0 ? '' : _req$url,
      query = req.query,
      form = req.form;

  var joinSearch = function joinSearch() {
    for (var _len = arguments.length, strs = new Array(_len), _key = 0; _key < _len; _key++) {
      strs[_key] = arguments[_key];
    }

    var search = _filterInstanceProperty(strs).call(strs, function (a) {
      return a;
    }).join('&'); // Only truthy value


    return search ? "?".concat(search) : ''; // Only add '?' if there is a str
  };

  if (form) {
    var hasFile = _Object$keys(form).some(function (key) {
      var value = form[key].value;
      return isFile(value) || isArrayOfFile(value);
    });

    var contentType = req.headers['content-type'] || req.headers['Content-Type'];

    if (hasFile || /multipart\/form-data/i.test(contentType)) {
      req.body = buildFormData(req.form);
    } else {
      req.body = encodeFormOrQuery(form);
    }

    delete req.form;
  }

  if (query) {
    var _url$split = url.split('?'),
        _url$split2 = _slicedToArray(_url$split, 2),
        baseUrl = _url$split2[0],
        oriSearch = _url$split2[1];

    var newStr = '';

    if (oriSearch) {
      var oriQuery = qs.parse(oriSearch);

      var keysToRemove = _Object$keys(query);

      keysToRemove.forEach(function (key) {
        return delete oriQuery[key];
      });
      newStr = qs.stringify(oriQuery, {
        encode: true
      });
    }

    var finalStr = joinSearch(newStr, encodeFormOrQuery(query));
    req.url = baseUrl + finalStr;
    delete req.query;
  }

  return req;
} // Wrap a http function ( there are otherways to do this, consider this deprecated )

export function makeHttp(httpFn, preFetch, postFetch) {
  postFetch = postFetch || function (a) {
    return a;
  };

  preFetch = preFetch || function (a) {
    return a;
  };

  return function (req) {
    if (typeof req === 'string') {
      req = {
        url: req
      };
    }

    self.mergeInQueryOrForm(req);
    req = preFetch(req);
    return postFetch(httpFn(req));
  };
}