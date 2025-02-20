import _slicedToArray from "@babel/runtime-corejs3/helpers/slicedToArray";
import _objectSpread from "@babel/runtime-corejs3/helpers/objectSpread2";
import _objectWithoutProperties from "@babel/runtime-corejs3/helpers/objectWithoutProperties";
import _Object$assign from "@babel/runtime-corejs3/core-js-stable/object/assign";
import _filterInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/filter";
import _Object$keys from "@babel/runtime-corejs3/core-js-stable/object/keys";
import _JSON$stringify from "@babel/runtime-corejs3/core-js-stable/json/stringify";
import _concatInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/concat";
import _reduceInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/reduce";
import _mapInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/map";
import _sliceInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/slice";
import getIn from 'lodash/get';
import isPlainObject from 'lodash/isPlainObject';
import isArray from 'lodash/isArray';
import url from 'url';
import cookie from 'cookie';
import stockHttp, { mergeInQueryOrForm } from '../http';
import createError from '../specmap/lib/create-error';
import SWAGGER2_PARAMETER_BUILDERS from './swagger2/parameter-builders';
import * as OAS3_PARAMETER_BUILDERS from './oas3/parameter-builders';
import oas3BuildRequest from './oas3/build-request';
import swagger2BuildRequest from './swagger2/build-request';
import { getOperationRaw, legacyIdFromPathMethod, isOAS3 } from '../helpers';

var arrayOrEmpty = function arrayOrEmpty(ar) {
  return Array.isArray(ar) ? ar : [];
};

var OperationNotFoundError = createError('OperationNotFoundError', function cb(message, extra, oriError) {
  this.originalError = oriError;

  _Object$assign(this, extra || {});
});

var findParametersWithName = function findParametersWithName(name, parameters) {
  return _filterInstanceProperty(parameters).call(parameters, function (p) {
    return p.name === name;
  });
}; // removes parameters that have duplicate 'in' and 'name' properties


var deduplicateParameters = function deduplicateParameters(parameters) {
  var paramsMap = {};
  parameters.forEach(function (p) {
    if (!paramsMap[p.in]) {
      paramsMap[p.in] = {};
    }

    paramsMap[p.in][p.name] = p;
  });
  var dedupedParameters = [];

  _Object$keys(paramsMap).forEach(function (i) {
    _Object$keys(paramsMap[i]).forEach(function (p) {
      dedupedParameters.push(paramsMap[i][p]);
    });
  });

  return dedupedParameters;
}; // For stubbing in tests


export var self = {
  buildRequest: buildRequest
}; // Execute request, with the given operationId and parameters
// pathName/method or operationId is optional

export function execute(_ref) {
  var userHttp = _ref.http,
      fetch = _ref.fetch,
      spec = _ref.spec,
      operationId = _ref.operationId,
      pathName = _ref.pathName,
      method = _ref.method,
      parameters = _ref.parameters,
      securities = _ref.securities,
      extras = _objectWithoutProperties(_ref, ["http", "fetch", "spec", "operationId", "pathName", "method", "parameters", "securities"]);

  // Provide default fetch implementation
  var http = userHttp || fetch || stockHttp; // Default to _our_ http

  if (pathName && method && !operationId) {
    operationId = legacyIdFromPathMethod(pathName, method);
  }

  var request = self.buildRequest(_objectSpread({
    spec: spec,
    operationId: operationId,
    parameters: parameters,
    securities: securities,
    http: http
  }, extras));

  if (request.body && (isPlainObject(request.body) || isArray(request.body))) {
    request.body = _JSON$stringify(request.body);
  } // Build request and execute it


  return http(request);
} // Build a request, which can be handled by the `http.js` implementation.

export function buildRequest(options) {
  var _context, _context2;

  var spec = options.spec,
      operationId = options.operationId,
      responseContentType = options.responseContentType,
      scheme = options.scheme,
      requestInterceptor = options.requestInterceptor,
      responseInterceptor = options.responseInterceptor,
      contextUrl = options.contextUrl,
      userFetch = options.userFetch,
      server = options.server,
      serverVariables = options.serverVariables,
      http = options.http;
  var parameters = options.parameters,
      parameterBuilders = options.parameterBuilders;
  var specIsOAS3 = isOAS3(spec);

  if (!parameterBuilders) {
    // user did not provide custom parameter builders
    if (specIsOAS3) {
      parameterBuilders = OAS3_PARAMETER_BUILDERS;
    } else {
      parameterBuilders = SWAGGER2_PARAMETER_BUILDERS;
    }
  } // Set credentials with 'http.withCredentials' value


  var credentials = http && http.withCredentials ? 'include' : 'same-origin'; // Base Template

  var req = {
    url: '',
    credentials: credentials,
    headers: {},
    cookies: {}
  };

  if (requestInterceptor) {
    req.requestInterceptor = requestInterceptor;
  }

  if (responseInterceptor) {
    req.responseInterceptor = responseInterceptor;
  }

  if (userFetch) {
    req.userFetch = userFetch;
  }

  var operationRaw = getOperationRaw(spec, operationId);

  if (!operationRaw) {
    throw new OperationNotFoundError("Operation ".concat(operationId, " not found"));
  }

  var _operationRaw$operati = operationRaw.operation,
      operation = _operationRaw$operati === void 0 ? {} : _operationRaw$operati,
      method = operationRaw.method,
      pathName = operationRaw.pathName;
  req.url += baseUrl({
    spec: spec,
    scheme: scheme,
    contextUrl: contextUrl,
    server: server,
    serverVariables: serverVariables,
    pathName: pathName,
    method: method
  }); // Mostly for testing

  if (!operationId) {
    // Not removing req.cookies causes testing issues and would
    // change our interface, so we're always sure to remove it.
    // See the same statement lower down in this function for
    // more context.
    delete req.cookies;
    return req;
  }

  req.url += pathName; // Have not yet replaced the path parameters

  req.method = "".concat(method).toUpperCase();
  parameters = parameters || {};
  var path = spec.paths[pathName] || {};

  if (responseContentType) {
    req.headers.accept = responseContentType;
  }

  var combinedParameters = deduplicateParameters(_concatInstanceProperty(_context = _concatInstanceProperty(_context2 = []).call(_context2, arrayOrEmpty(operation.parameters)) // operation parameters
  ).call(_context, arrayOrEmpty(path.parameters))); // path parameters
  // REVIEW: OAS3: have any key names or parameter shapes changed?
  // Any new features that need to be plugged in here?
  // Add values to request

  combinedParameters.forEach(function (parameter) {
    var builder = parameterBuilders[parameter.in];
    var value;

    if (parameter.in === 'body' && parameter.schema && parameter.schema.properties) {
      value = parameters;
    }

    value = parameter && parameter.name && parameters[parameter.name];

    if (typeof value === 'undefined') {
      var _context3;

      // check for `name-in` formatted key
      value = parameter && parameter.name && parameters[_concatInstanceProperty(_context3 = "".concat(parameter.in, ".")).call(_context3, parameter.name)];
    } else if (findParametersWithName(parameter.name, combinedParameters).length > 1) {
      var _context4;

      // value came from `parameters[parameter.name]`
      // check to see if this is an ambiguous parameter
      // eslint-disable-next-line no-console
      console.warn(_concatInstanceProperty(_context4 = "Parameter '".concat(parameter.name, "' is ambiguous because the defined spec has more than one parameter with the name: '")).call(_context4, parameter.name, "' and the passed-in parameter values did not define an 'in' value."));
    }

    if (value === null) {
      return;
    }

    if (typeof parameter.default !== 'undefined' && typeof value === 'undefined') {
      value = parameter.default;
    }

    if (typeof value === 'undefined' && parameter.required && !parameter.allowEmptyValue) {
      throw new Error("Required parameter ".concat(parameter.name, " is not provided"));
    }

    if (specIsOAS3 && parameter.schema && parameter.schema.type === 'object' && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        throw new Error('Could not parse object parameter value string as JSON');
      }
    }

    if (builder) {
      builder({
        req: req,
        parameter: parameter,
        value: value,
        operation: operation,
        spec: spec
      });
    }
  }); // Do version-specific tasks, then return those results.

  var versionSpecificOptions = _objectSpread(_objectSpread({}, options), {}, {
    operation: operation
  });

  if (specIsOAS3) {
    req = oas3BuildRequest(versionSpecificOptions, req);
  } else {
    // If not OAS3, then treat as Swagger2.
    req = swagger2BuildRequest(versionSpecificOptions, req);
  } // If the cookie convenience object exists in our request,
  // serialize its content and then delete the cookie object.


  if (req.cookies && _Object$keys(req.cookies).length) {
    var _context5;

    var cookieString = _reduceInstanceProperty(_context5 = _Object$keys(req.cookies)).call(_context5, function (prev, cookieName) {
      var cookieValue = req.cookies[cookieName];
      var prefix = prev ? '&' : '';
      var stringified = cookie.serialize(cookieName, cookieValue);
      return prev + prefix + stringified;
    }, '');

    req.headers.Cookie = cookieString;
  }

  if (req.cookies) {
    // even if no cookies were defined, we need to remove
    // the cookies key from our request, or many many legacy
    // tests will break.
    delete req.cookies;
  } // Will add the query object into the URL, if it exists
  // ... will also create a FormData instance, if multipart/form-data (eg: a file)


  mergeInQueryOrForm(req);
  return req;
}

var stripNonAlpha = function stripNonAlpha(str) {
  return str ? str.replace(/\W/g, '') : null;
}; // be careful when modifying this! it is a publicly-exposed method.


export function baseUrl(obj) {
  var specIsOAS3 = isOAS3(obj.spec);
  return specIsOAS3 ? oas3BaseUrl(obj) : swagger2BaseUrl(obj);
}

function oas3BaseUrl(_ref2) {
  var spec = _ref2.spec,
      pathName = _ref2.pathName,
      method = _ref2.method,
      server = _ref2.server,
      contextUrl = _ref2.contextUrl,
      _ref2$serverVariables = _ref2.serverVariables,
      serverVariables = _ref2$serverVariables === void 0 ? {} : _ref2$serverVariables;
  var servers = getIn(spec, ['paths', pathName, (method || '').toLowerCase(), 'servers']) || getIn(spec, ['paths', pathName, 'servers']) || getIn(spec, ['servers']);
  var selectedServerUrl = '';
  var selectedServerObj = null;

  if (server && servers && servers.length) {
    var serverUrls = _mapInstanceProperty(servers).call(servers, function (srv) {
      return srv.url;
    });

    if (serverUrls.indexOf(server) > -1) {
      selectedServerUrl = server;
      selectedServerObj = servers[serverUrls.indexOf(server)];
    }
  }

  if (!selectedServerUrl && servers && servers.length) {
    // default to the first server if we don't have one by now
    selectedServerUrl = servers[0].url; // eslint-disable-line semi

    var _servers = _slicedToArray(servers, 1);

    selectedServerObj = _servers[0];
  }

  if (selectedServerUrl.indexOf('{') > -1) {
    // do variable substitution
    var varNames = getVariableTemplateNames(selectedServerUrl);
    varNames.forEach(function (vari) {
      if (selectedServerObj.variables && selectedServerObj.variables[vari]) {
        // variable is defined in server
        var variableDefinition = selectedServerObj.variables[vari];
        var variableValue = serverVariables[vari] || variableDefinition.default;
        var re = new RegExp("{".concat(vari, "}"), 'g');
        selectedServerUrl = selectedServerUrl.replace(re, variableValue);
      }
    });
  }

  return buildOas3UrlWithContext(selectedServerUrl, contextUrl);
}

function buildOas3UrlWithContext() {
  var ourUrl = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  var contextUrl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  // relative server url should be resolved against contextUrl
  var parsedUrl = ourUrl && contextUrl ? url.parse(url.resolve(contextUrl, ourUrl)) : url.parse(ourUrl);
  var parsedContextUrl = url.parse(contextUrl);
  var computedScheme = stripNonAlpha(parsedUrl.protocol) || stripNonAlpha(parsedContextUrl.protocol) || '';
  var computedHost = parsedUrl.host || parsedContextUrl.host;
  var computedPath = parsedUrl.pathname || '';
  var res;

  if (computedScheme && computedHost) {
    var _context6;

    res = _concatInstanceProperty(_context6 = "".concat(computedScheme, "://")).call(_context6, computedHost + computedPath); // If last character is '/', trim it off
  } else {
    res = computedPath;
  }

  return res[res.length - 1] === '/' ? _sliceInstanceProperty(res).call(res, 0, -1) : res;
}

function getVariableTemplateNames(str) {
  var results = [];
  var re = /{([^}]+)}/g;
  var text; // eslint-disable-next-line no-cond-assign

  while (text = re.exec(str)) {
    results.push(text[1]);
  }

  return results;
} // Compose the baseUrl ( scheme + host + basePath )


function swagger2BaseUrl(_ref3) {
  var spec = _ref3.spec,
      scheme = _ref3.scheme,
      _ref3$contextUrl = _ref3.contextUrl,
      contextUrl = _ref3$contextUrl === void 0 ? '' : _ref3$contextUrl;
  var parsedContextUrl = url.parse(contextUrl);
  var firstSchemeInSpec = Array.isArray(spec.schemes) ? spec.schemes[0] : null;
  var computedScheme = scheme || firstSchemeInSpec || stripNonAlpha(parsedContextUrl.protocol) || 'http';
  var computedHost = spec.host || parsedContextUrl.host || '';
  var computedPath = spec.basePath || '';
  var res;

  if (computedScheme && computedHost) {
    var _context7;

    // we have what we need for an absolute URL
    res = _concatInstanceProperty(_context7 = "".concat(computedScheme, "://")).call(_context7, computedHost + computedPath);
  } else {
    // if not, a relative URL will have to do
    res = computedPath;
  } // If last character is '/', trim it off


  return res[res.length - 1] === '/' ? _sliceInstanceProperty(res).call(res, 0, -1) : res;
}