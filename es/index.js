import _objectSpread from "@babel/runtime-corejs3/helpers/objectSpread2";
import assign from 'lodash/assign';
import startsWith from 'lodash/startsWith';
import Url from 'url';
import Http from './http';
import { execute } from './execute';
Swagger.execute = execute;

function Swagger(url) {
  var _this = this;

  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  // Allow url as a separate argument
  if (typeof url === 'string') {
    opts.url = url;
  } else {
    opts = url;
  }

  if (!(this instanceof Swagger)) {
    return new Swagger(opts);
  }

  assign(this, opts);
  var prom = this.resolve().then(function () {
    if (!_this.disableInterfaces) {
      assign(_this, Swagger.makeApisTagOperation(_this));
    }

    return _this;
  }); // Expose this instance on the promise that gets returned

  prom.client = this;
  return prom;
}

Swagger.prototype = {
  http: Http,
  execute: function execute(options) {
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
  }
};

Swagger.prototype.applyDefaults = function applyDefaults() {
  var spec = this.spec;
  var specUrl = this.url; // TODO: OAS3: support servers here

  if (specUrl && startsWith(specUrl, 'http')) {
    var parsed = Url.parse(specUrl);

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


var helpers = Swagger.helpers;
export { helpers };
export default Swagger;