"use strict";

exports.__esModule = true;
exports.default = exports.helpers = void 0;

var _assign = _interopRequireDefault(require("lodash/assign"));

var _startsWith = _interopRequireDefault(require("lodash/startsWith"));

var _url = _interopRequireDefault(require("url"));

var _http = _interopRequireDefault(require("./http"));

var _execute = require("./execute");

var _resolver = _interopRequireDefault(require("./resolver"));

var _interfaces = require("./interfaces");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

Swagger.execute = _execute.execute;
Swagger.resolve = _resolver.default;
Swagger.makeApisTagOperation = _interfaces.makeApisTagOperation;

function Swagger(url, opts = {}) {
  // Allow url as a separate argument
  if (typeof url === 'string') {
    opts.url = url;
  } else {
    opts = url;
  }

  if (!(this instanceof Swagger)) {
    return new Swagger(opts);
  }

  (0, _assign.default)(this, opts);
  const prom = this.resolve().then(() => {
    if (!this.disableInterfaces) {
      (0, _assign.default)(this, Swagger.makeApisTagOperation(this));
    }

    return this;
  }); // Expose this instance on the promise that gets returned

  prom.client = this;
  return prom;
}

Swagger.prototype = {
  http: _http.default,

  execute(options) {
    this.applyDefaults();
    return Swagger.execute(_objectSpread({
      spec: this.spec,
      http: this.http,
      securities: {
        authorized: this.authorizations
      },
      contextUrl: typeof this.url === 'string' ? this.url : undefined,
      requestInterceptor: this.requestInterceptor || null,
      responseInterceptor: this.responseInterceptor || null
    }, options));
  },

  resolve(options = {}) {
    return Swagger.resolve(_objectSpread({
      spec: this.spec,
      url: this.url,
      http: this.http || this.fetch,
      allowMetaPatches: this.allowMetaPatches,
      useCircularStructures: this.useCircularStructures,
      requestInterceptor: this.requestInterceptor || null,
      responseInterceptor: this.responseInterceptor || null
    }, options)).then(obj => {
      this.originalSpec = this.spec;
      this.spec = obj.spec;
      this.errors = obj.errors;
      return this;
    });
  }

};

Swagger.prototype.applyDefaults = function applyDefaults() {
  const {
    spec
  } = this;
  const specUrl = this.url; // TODO: OAS3: support servers here

  if (specUrl && (0, _startsWith.default)(specUrl, 'http')) {
    const parsed = _url.default.parse(specUrl);

    if (!spec.host) {
      spec.host = parsed.host;
    }

    if (!spec.schemes) {
      spec.schemes = [parsed.protocol.replace(':', '')];
    }

    if (!spec.basePath) {
      spec.basePath = '/';
    }
  }
}; // add backwards compatibility with older versions of swagger-ui
// Refs https://github.com/swagger-api/swagger-ui/issues/6210


const {
  helpers
} = Swagger;
exports.helpers = helpers;
var _default = Swagger;
exports.default = _default;