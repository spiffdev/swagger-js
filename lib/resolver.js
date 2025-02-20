"use strict";

exports.__esModule = true;
exports.makeFetchJSON = makeFetchJSON;
exports.clearCache = clearCache;
exports.default = resolve;

var _http = _interopRequireDefault(require("./http"));

var _specmap = _interopRequireWildcard(require("./specmap"));

var _helpers = require("./helpers");

var _constants = require("./constants");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function makeFetchJSON(http, opts = {}) {
  const {
    requestInterceptor,
    responseInterceptor
  } = opts; // Set credentials with 'http.withCredentials' value

  const credentials = http.withCredentials ? 'include' : 'same-origin';
  return docPath => http({
    url: docPath,
    loadSpec: true,
    requestInterceptor,
    responseInterceptor,
    headers: {
      Accept: _constants.ACCEPT_HEADER_VALUE_FOR_DOCUMENTS
    },
    credentials
  }).then(res => res.body);
} // Wipe out the http cache


function clearCache() {
  _specmap.plugins.refs.clearCache();
}

function resolve(obj) {
  const {
    fetch,
    spec,
    url,
    mode,
    allowMetaPatches = true,
    pathDiscriminator,
    modelPropertyMacro,
    parameterMacro,
    requestInterceptor,
    responseInterceptor,
    skipNormalization,
    useCircularStructures
  } = obj;
  let {
    http,
    baseDoc
  } = obj; // @TODO Swagger-UI uses baseDoc instead of url, this is to allow both
  // need to fix and pick one.

  baseDoc = baseDoc || url; // Provide a default fetch implementation
  // TODO fetch should be removed, and http used instead

  http = fetch || http || _http.default;

  if (!spec) {
    return makeFetchJSON(http, {
      requestInterceptor,
      responseInterceptor
    })(baseDoc).then(doResolve);
  }

  return doResolve(spec);

  function doResolve(_spec) {
    if (baseDoc) {
      _specmap.plugins.refs.docCache[baseDoc] = _spec;
    } // Build a json-fetcher ( ie: give it a URL and get json out )


    _specmap.plugins.refs.fetchJSON = makeFetchJSON(http, {
      requestInterceptor,
      responseInterceptor
    });
    const plugs = [_specmap.plugins.refs];

    if (typeof parameterMacro === 'function') {
      plugs.push(_specmap.plugins.parameters);
    }

    if (typeof modelPropertyMacro === 'function') {
      plugs.push(_specmap.plugins.properties);
    }

    if (mode !== 'strict') {
      plugs.push(_specmap.plugins.allOf);
    } // mapSpec is where the hard work happens


    return (0, _specmap.default)({
      spec: _spec,
      context: {
        baseDoc
      },
      plugins: plugs,
      allowMetaPatches,
      // allows adding .meta patches, which include adding `$$ref`s to the spec
      pathDiscriminator,
      // for lazy resolution
      parameterMacro,
      modelPropertyMacro,
      useCircularStructures
    }).then(skipNormalization ? async a => a : _helpers.normalizeSwagger);
  }
}