"use strict";

exports.__esModule = true;
exports.execute = execute;
exports.buildRequest = buildRequest;
exports.baseUrl = baseUrl;
exports.self = void 0;

var _get = _interopRequireDefault(require("lodash/get"));

var _isPlainObject = _interopRequireDefault(require("lodash/isPlainObject"));

var _isArray = _interopRequireDefault(require("lodash/isArray"));

var _url = _interopRequireDefault(require("url"));

var _cookie = _interopRequireDefault(require("cookie"));

var _http = _interopRequireWildcard(require("../http"));

var _createError = _interopRequireDefault(require("../specmap/lib/create-error"));

var _parameterBuilders = _interopRequireDefault(require("./swagger2/parameter-builders"));

var OAS3_PARAMETER_BUILDERS = _interopRequireWildcard(require("./oas3/parameter-builders"));

var _buildRequest = _interopRequireDefault(require("./oas3/build-request"));

var _buildRequest2 = _interopRequireDefault(require("./swagger2/build-request"));

var _helpers = require("../helpers");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

const arrayOrEmpty = ar => Array.isArray(ar) ? ar : [];

const OperationNotFoundError = (0, _createError.default)('OperationNotFoundError', function cb(message, extra, oriError) {
  this.originalError = oriError;
  Object.assign(this, extra || {});
});

const findParametersWithName = (name, parameters) => parameters.filter(p => p.name === name); // removes parameters that have duplicate 'in' and 'name' properties


const deduplicateParameters = parameters => {
  const paramsMap = {};
  parameters.forEach(p => {
    if (!paramsMap[p.in]) {
      paramsMap[p.in] = {};
    }

    paramsMap[p.in][p.name] = p;
  });
  const dedupedParameters = [];
  Object.keys(paramsMap).forEach(i => {
    Object.keys(paramsMap[i]).forEach(p => {
      dedupedParameters.push(paramsMap[i][p]);
    });
  });
  return dedupedParameters;
}; // For stubbing in tests


const self = {
  buildRequest
}; // Execute request, with the given operationId and parameters
// pathName/method or operationId is optional

exports.self = self;

function execute(_ref) {
  let {
    http: userHttp,
    fetch,
    // This is legacy
    spec,
    operationId,
    pathName,
    method,
    parameters,
    securities
  } = _ref,
      extras = _objectWithoutProperties(_ref, ["http", "fetch", "spec", "operationId", "pathName", "method", "parameters", "securities"]);

  // Provide default fetch implementation
  const http = userHttp || fetch || _http.default; // Default to _our_ http

  if (pathName && method && !operationId) {
    operationId = (0, _helpers.legacyIdFromPathMethod)(pathName, method);
  }

  const request = self.buildRequest(_objectSpread({
    spec,
    operationId,
    parameters,
    securities,
    http
  }, extras));

  if (request.body && ((0, _isPlainObject.default)(request.body) || (0, _isArray.default)(request.body))) {
    request.body = JSON.stringify(request.body);
  } // Build request and execute it


  return http(request);
} // Build a request, which can be handled by the `http.js` implementation.


function buildRequest(options) {
  const {
    spec,
    operationId,
    responseContentType,
    scheme,
    requestInterceptor,
    responseInterceptor,
    contextUrl,
    userFetch,
    server,
    serverVariables,
    http
  } = options;
  let {
    parameters,
    parameterBuilders
  } = options;
  const specIsOAS3 = (0, _helpers.isOAS3)(spec);

  if (!parameterBuilders) {
    // user did not provide custom parameter builders
    if (specIsOAS3) {
      parameterBuilders = OAS3_PARAMETER_BUILDERS;
    } else {
      parameterBuilders = _parameterBuilders.default;
    }
  } // Set credentials with 'http.withCredentials' value


  const credentials = http && http.withCredentials ? 'include' : 'same-origin'; // Base Template

  let req = {
    url: '',
    credentials,
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

  const operationRaw = (0, _helpers.getOperationRaw)(spec, operationId);

  if (!operationRaw) {
    throw new OperationNotFoundError(`Operation ${operationId} not found`);
  }

  const {
    operation = {},
    method,
    pathName
  } = operationRaw;
  req.url += baseUrl({
    spec,
    scheme,
    contextUrl,
    server,
    serverVariables,
    pathName,
    method
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

  req.method = `${method}`.toUpperCase();
  parameters = parameters || {};
  const path = spec.paths[pathName] || {};

  if (responseContentType) {
    req.headers.accept = responseContentType;
  }

  const combinedParameters = deduplicateParameters([].concat(arrayOrEmpty(operation.parameters)) // operation parameters
  .concat(arrayOrEmpty(path.parameters))); // path parameters
  // REVIEW: OAS3: have any key names or parameter shapes changed?
  // Any new features that need to be plugged in here?
  // Add values to request

  combinedParameters.forEach(parameter => {
    const builder = parameterBuilders[parameter.in];
    let value;

    if (parameter.in === 'body' && parameter.schema && parameter.schema.properties) {
      value = parameters;
    }

    value = parameter && parameter.name && parameters[parameter.name];

    if (typeof value === 'undefined') {
      // check for `name-in` formatted key
      value = parameter && parameter.name && parameters[`${parameter.in}.${parameter.name}`];
    } else if (findParametersWithName(parameter.name, combinedParameters).length > 1) {
      // value came from `parameters[parameter.name]`
      // check to see if this is an ambiguous parameter
      // eslint-disable-next-line no-console
      console.warn(`Parameter '${parameter.name}' is ambiguous because the defined spec has more than one parameter with the name: '${parameter.name}' and the passed-in parameter values did not define an 'in' value.`);
    }

    if (value === null) {
      return;
    }

    if (typeof parameter.default !== 'undefined' && typeof value === 'undefined') {
      value = parameter.default;
    }

    if (typeof value === 'undefined' && parameter.required && !parameter.allowEmptyValue) {
      throw new Error(`Required parameter ${parameter.name} is not provided`);
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
        req,
        parameter,
        value,
        operation,
        spec
      });
    }
  }); // Do version-specific tasks, then return those results.

  const versionSpecificOptions = _objectSpread(_objectSpread({}, options), {}, {
    operation
  });

  if (specIsOAS3) {
    req = (0, _buildRequest.default)(versionSpecificOptions, req);
  } else {
    // If not OAS3, then treat as Swagger2.
    req = (0, _buildRequest2.default)(versionSpecificOptions, req);
  } // If the cookie convenience object exists in our request,
  // serialize its content and then delete the cookie object.


  if (req.cookies && Object.keys(req.cookies).length) {
    const cookieString = Object.keys(req.cookies).reduce((prev, cookieName) => {
      const cookieValue = req.cookies[cookieName];
      const prefix = prev ? '&' : '';

      const stringified = _cookie.default.serialize(cookieName, cookieValue);

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


  (0, _http.mergeInQueryOrForm)(req);
  return req;
}

const stripNonAlpha = str => str ? str.replace(/\W/g, '') : null; // be careful when modifying this! it is a publicly-exposed method.


function baseUrl(obj) {
  const specIsOAS3 = (0, _helpers.isOAS3)(obj.spec);
  return specIsOAS3 ? oas3BaseUrl(obj) : swagger2BaseUrl(obj);
}

function oas3BaseUrl({
  spec,
  pathName,
  method,
  server,
  contextUrl,
  serverVariables = {}
}) {
  const servers = (0, _get.default)(spec, ['paths', pathName, (method || '').toLowerCase(), 'servers']) || (0, _get.default)(spec, ['paths', pathName, 'servers']) || (0, _get.default)(spec, ['servers']);
  let selectedServerUrl = '';
  let selectedServerObj = null;

  if (server && servers && servers.length) {
    const serverUrls = servers.map(srv => srv.url);

    if (serverUrls.indexOf(server) > -1) {
      selectedServerUrl = server;
      selectedServerObj = servers[serverUrls.indexOf(server)];
    }
  }

  if (!selectedServerUrl && servers && servers.length) {
    // default to the first server if we don't have one by now
    selectedServerUrl = servers[0].url; // eslint-disable-line semi

    [selectedServerObj] = servers;
  }

  if (selectedServerUrl.indexOf('{') > -1) {
    // do variable substitution
    const varNames = getVariableTemplateNames(selectedServerUrl);
    varNames.forEach(vari => {
      if (selectedServerObj.variables && selectedServerObj.variables[vari]) {
        // variable is defined in server
        const variableDefinition = selectedServerObj.variables[vari];
        const variableValue = serverVariables[vari] || variableDefinition.default;
        const re = new RegExp(`{${vari}}`, 'g');
        selectedServerUrl = selectedServerUrl.replace(re, variableValue);
      }
    });
  }

  return buildOas3UrlWithContext(selectedServerUrl, contextUrl);
}

function buildOas3UrlWithContext(ourUrl = '', contextUrl = '') {
  // relative server url should be resolved against contextUrl
  const parsedUrl = ourUrl && contextUrl ? _url.default.parse(_url.default.resolve(contextUrl, ourUrl)) : _url.default.parse(ourUrl);

  const parsedContextUrl = _url.default.parse(contextUrl);

  const computedScheme = stripNonAlpha(parsedUrl.protocol) || stripNonAlpha(parsedContextUrl.protocol) || '';
  const computedHost = parsedUrl.host || parsedContextUrl.host;
  const computedPath = parsedUrl.pathname || '';
  let res;

  if (computedScheme && computedHost) {
    res = `${computedScheme}://${computedHost + computedPath}`; // If last character is '/', trim it off
  } else {
    res = computedPath;
  }

  return res[res.length - 1] === '/' ? res.slice(0, -1) : res;
}

function getVariableTemplateNames(str) {
  const results = [];
  const re = /{([^}]+)}/g;
  let text; // eslint-disable-next-line no-cond-assign

  while (text = re.exec(str)) {
    results.push(text[1]);
  }

  return results;
} // Compose the baseUrl ( scheme + host + basePath )


function swagger2BaseUrl({
  spec,
  scheme,
  contextUrl = ''
}) {
  const parsedContextUrl = _url.default.parse(contextUrl);

  const firstSchemeInSpec = Array.isArray(spec.schemes) ? spec.schemes[0] : null;
  const computedScheme = scheme || firstSchemeInSpec || stripNonAlpha(parsedContextUrl.protocol) || 'http';
  const computedHost = spec.host || parsedContextUrl.host || '';
  const computedPath = spec.basePath || '';
  let res;

  if (computedScheme && computedHost) {
    // we have what we need for an absolute URL
    res = `${computedScheme}://${computedHost + computedPath}`;
  } else {
    // if not, a relative URL will have to do
    res = computedPath;
  } // If last character is '/', trim it off


  return res[res.length - 1] === '/' ? res.slice(0, -1) : res;
}