import _typeof from "@babel/runtime-corejs3/helpers/typeof";
import _slicedToArray from "@babel/runtime-corejs3/helpers/slicedToArray";
import _Object$keys from "@babel/runtime-corejs3/core-js-stable/object/keys";
import _reduceInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/reduce";
import _filterInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/filter";
import _Object$entries from "@babel/runtime-corejs3/core-js-stable/object/entries";
import _concatInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/concat";
// This function runs after the common function,
// `src/execute/index.js#buildRequest`
import assign from 'lodash/assign';
import get from 'lodash/get';
import isPlainObject from 'lodash/isPlainObject';
import btoa from 'btoa';
export default function buildRequest(options, req) {
  var operation = options.operation,
      requestBody = options.requestBody,
      securities = options.securities,
      spec = options.spec,
      attachContentTypeForEmptyPayload = options.attachContentTypeForEmptyPayload;
  var requestContentType = options.requestContentType;
  req = applySecurities({
    request: req,
    securities: securities,
    operation: operation,
    spec: spec
  });
  var requestBodyDef = operation.requestBody || {};

  var requestBodyMediaTypes = _Object$keys(requestBodyDef.content || {});

  var isExplicitContentTypeValid = requestContentType && requestBodyMediaTypes.indexOf(requestContentType) > -1; // for OAS3: set the Content-Type

  if (requestBody || attachContentTypeForEmptyPayload) {
    // does the passed requestContentType appear in the requestBody definition?
    if (requestContentType && isExplicitContentTypeValid) {
      req.headers['Content-Type'] = requestContentType;
    } else if (!requestContentType) {
      var firstMediaType = requestBodyMediaTypes[0];

      if (firstMediaType) {
        req.headers['Content-Type'] = firstMediaType;
        requestContentType = firstMediaType;
      }
    }
  } else if (requestContentType && isExplicitContentTypeValid) {
    req.headers['Content-Type'] = requestContentType;
  }

  if (!options.responseContentType && operation.responses) {
    var _context, _context2;

    var mediaTypes = _reduceInstanceProperty(_context = _filterInstanceProperty(_context2 = _Object$entries(operation.responses)).call(_context2, function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          key = _ref2[0],
          value = _ref2[1];

      var code = parseInt(key, 10);
      return code >= 200 && code < 300 && isPlainObject(value.content);
    })).call(_context, function (acc, _ref3) {
      var _ref4 = _slicedToArray(_ref3, 2),
          value = _ref4[1];

      return _concatInstanceProperty(acc).call(acc, _Object$keys(value.content));
    }, []);

    if (mediaTypes.length > 0) {
      req.headers.accept = mediaTypes.join(', ');
    }
  } // for OAS3: add requestBody to request


  if (requestBody) {
    if (requestContentType) {
      if (requestBodyMediaTypes.indexOf(requestContentType) > -1) {
        // only attach body if the requestBody has a definition for the
        // contentType that has been explicitly set
        if (requestContentType === 'application/x-www-form-urlencoded' || requestContentType === 'multipart/form-data') {
          if (_typeof(requestBody) === 'object') {
            var encoding = (requestBodyDef.content[requestContentType] || {}).encoding || {};
            req.form = {};

            _Object$keys(requestBody).forEach(function (k) {
              req.form[k] = {
                value: requestBody[k],
                encoding: encoding[k] || {}
              };
            });
          } else {
            req.form = requestBody;
          }
        } else {
          req.body = requestBody;
        }
      }
    } else {
      req.body = requestBody;
    }
  }

  return req;
} // Add security values, to operations - that declare their need on them
// Adapted from the Swagger2 implementation

export function applySecurities(_ref5) {
  var request = _ref5.request,
      _ref5$securities = _ref5.securities,
      securities = _ref5$securities === void 0 ? {} : _ref5$securities,
      _ref5$operation = _ref5.operation,
      operation = _ref5$operation === void 0 ? {} : _ref5$operation,
      spec = _ref5.spec;
  var result = assign({}, request);
  var _securities$authorize = securities.authorized,
      authorized = _securities$authorize === void 0 ? {} : _securities$authorize;
  var security = operation.security || spec.security || [];
  var isAuthorized = authorized && !!_Object$keys(authorized).length;
  var securityDef = get(spec, ['components', 'securitySchemes']) || {};
  result.headers = result.headers || {};
  result.query = result.query || {};

  if (!_Object$keys(securities).length || !isAuthorized || !security || Array.isArray(operation.security) && !operation.security.length) {
    return request;
  }

  security.forEach(function (securityObj) {
    _Object$keys(securityObj).forEach(function (key) {
      var auth = authorized[key];
      var schema = securityDef[key];

      if (!auth) {
        return;
      }

      var value = auth.value || auth;
      var type = schema.type;

      if (auth) {
        if (type === 'apiKey') {
          if (schema.in === 'query') {
            result.query[schema.name] = value;
          }

          if (schema.in === 'header') {
            result.headers[schema.name] = value;
          }

          if (schema.in === 'cookie') {
            result.cookies[schema.name] = value;
          }
        } else if (type === 'http') {
          if (/^basic$/i.test(schema.scheme)) {
            var _context3;

            var username = value.username || '';
            var password = value.password || '';
            var encoded = btoa(_concatInstanceProperty(_context3 = "".concat(username, ":")).call(_context3, password));
            result.headers.Authorization = "Basic ".concat(encoded);
          }

          if (/^bearer$/i.test(schema.scheme)) {
            result.headers.Authorization = "Bearer ".concat(value);
          }
        } else if (type === 'oauth2' || type === 'openIdConnect') {
          var _context4;

          var token = auth.token || {};
          var tokenName = schema['x-tokenName'] || 'access_token';
          var tokenValue = token[tokenName];
          var tokenType = token.token_type;

          if (!tokenType || tokenType.toLowerCase() === 'bearer') {
            tokenType = 'Bearer';
          }

          result.headers.Authorization = _concatInstanceProperty(_context4 = "".concat(tokenType, " ")).call(_context4, tokenValue);
        }
      }
    });
  });
  return result;
}