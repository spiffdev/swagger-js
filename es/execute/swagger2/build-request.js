import _slicedToArray from "@babel/runtime-corejs3/helpers/slicedToArray";
import _filterInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/filter";
import _Object$keys from "@babel/runtime-corejs3/core-js-stable/object/keys";
import _concatInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/concat";
import btoa from 'btoa';
import assign from 'lodash/assign'; // This function runs after the common function,
// `src/execute/index.js#buildRequest`

export default function buildRequest(options, req) {
  var spec = options.spec,
      operation = options.operation,
      securities = options.securities,
      requestContentType = options.requestContentType,
      responseContentType = options.responseContentType,
      attachContentTypeForEmptyPayload = options.attachContentTypeForEmptyPayload; // Add securities, which are applicable

  req = applySecurities({
    request: req,
    securities: securities,
    operation: operation,
    spec: spec
  });

  if (req.body || req.form || attachContentTypeForEmptyPayload) {
    var _context, _context2;

    // all following conditionals are Swagger2 only
    if (requestContentType) {
      req.headers['Content-Type'] = requestContentType;
    } else if (Array.isArray(operation.consumes)) {
      var _operation$consumes = _slicedToArray(operation.consumes, 1);

      req.headers['Content-Type'] = _operation$consumes[0];
    } else if (Array.isArray(spec.consumes)) {
      var _spec$consumes = _slicedToArray(spec.consumes, 1);

      req.headers['Content-Type'] = _spec$consumes[0];
    } else if (operation.parameters && _filterInstanceProperty(_context = operation.parameters).call(_context, function (p) {
      return p.type === 'file';
    }).length) {
      req.headers['Content-Type'] = 'multipart/form-data';
    } else if (operation.parameters && _filterInstanceProperty(_context2 = operation.parameters).call(_context2, function (p) {
      return p.in === 'formData';
    }).length) {
      req.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
  } else if (requestContentType) {
    var _context3, _context4;

    var isBodyParamPresent = operation.parameters && _filterInstanceProperty(_context3 = operation.parameters).call(_context3, function (p) {
      return p.in === 'body';
    }).length > 0;
    var isFormDataParamPresent = operation.parameters && _filterInstanceProperty(_context4 = operation.parameters).call(_context4, function (p) {
      return p.in === 'formData';
    }).length > 0;

    if (isBodyParamPresent || isFormDataParamPresent) {
      req.headers['Content-Type'] = requestContentType;
    }
  }

  if (!responseContentType && Array.isArray(operation.produces) && operation.produces.length > 0) {
    req.headers.accept = operation.produces.join(', ');
  }

  return req;
} // Add security values, to operations - that declare their need on them

export function applySecurities(_ref) {
  var request = _ref.request,
      _ref$securities = _ref.securities,
      securities = _ref$securities === void 0 ? {} : _ref$securities,
      _ref$operation = _ref.operation,
      operation = _ref$operation === void 0 ? {} : _ref$operation,
      spec = _ref.spec;
  var result = assign({}, request);
  var _securities$authorize = securities.authorized,
      authorized = _securities$authorize === void 0 ? {} : _securities$authorize,
      _securities$specSecur = securities.specSecurity,
      specSecurity = _securities$specSecur === void 0 ? [] : _securities$specSecur;
  var security = operation.security || specSecurity;
  var isAuthorized = authorized && !!_Object$keys(authorized).length;
  var securityDef = spec.securityDefinitions;
  result.headers = result.headers || {};
  result.query = result.query || {};

  if (!_Object$keys(securities).length || !isAuthorized || !security || Array.isArray(operation.security) && !operation.security.length) {
    return request;
  }

  security.forEach(function (securityObj) {
    _Object$keys(securityObj).forEach(function (key) {
      var auth = authorized[key];

      if (!auth) {
        return;
      }

      var token = auth.token;
      var value = auth.value || auth;
      var schema = securityDef[key];
      var type = schema.type;
      var tokenName = schema['x-tokenName'] || 'access_token';
      var oauthToken = token && token[tokenName];
      var tokenType = token && token.token_type;

      if (auth) {
        if (type === 'apiKey') {
          var inType = schema.in === 'query' ? 'query' : 'headers';
          result[inType] = result[inType] || {};
          result[inType][schema.name] = value;
        } else if (type === 'basic') {
          if (value.header) {
            result.headers.authorization = value.header;
          } else {
            var _context5;

            var username = value.username || '';
            var password = value.password || '';
            value.base64 = btoa(_concatInstanceProperty(_context5 = "".concat(username, ":")).call(_context5, password));
            result.headers.authorization = "Basic ".concat(value.base64);
          }
        } else if (type === 'oauth2' && oauthToken) {
          var _context6;

          tokenType = !tokenType || tokenType.toLowerCase() === 'bearer' ? 'Bearer' : tokenType;
          result.headers.authorization = _concatInstanceProperty(_context6 = "".concat(tokenType, " ")).call(_context6, oauthToken);
        }
      }
    });
  });
  return result;
}