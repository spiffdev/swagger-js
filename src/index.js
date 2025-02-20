import assign from 'lodash/assign';
import startsWith from 'lodash/startsWith';
import Url from 'url';
import Http from './http';
import { execute } from './execute';
import Resolver from './resolver';
import { makeApisTagOperation } from './interfaces';

Swagger.execute = execute;
Swagger.resolve = Resolver;
Swagger.makeApisTagOperation = makeApisTagOperation;

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

  assign(this, opts);

  const prom = this.resolve().then(() => {
    if (!this.disableInterfaces) {
      assign(this, Swagger.makeApisTagOperation(this));
    }
    return this;
  });

  // Expose this instance on the promise that gets returned
  prom.client = this;
  return prom;
}

Swagger.prototype = {
  http: Http,
  execute(options) {
    this.applyDefaults();

    return Swagger.execute({
      spec: this.spec,
      http: this.http,
      securities: { authorized: this.authorizations },
      contextUrl: typeof this.url === 'string' ? this.url : undefined,
      requestInterceptor: this.requestInterceptor || null,
      responseInterceptor: this.responseInterceptor || null,
      ...options,
    });
  },
  resolve(options = {}) {
    return Swagger.resolve({
      spec: this.spec,
      url: this.url,
      http: this.http || this.fetch,
      allowMetaPatches: this.allowMetaPatches,
      useCircularStructures: this.useCircularStructures,
      requestInterceptor: this.requestInterceptor || null,
      responseInterceptor: this.responseInterceptor || null,
      ...options,
    }).then((obj) => {
      this.originalSpec = this.spec;
      this.spec = obj.spec;
      this.errors = obj.errors;
      return this;
    });
  },
};

Swagger.prototype.applyDefaults = function applyDefaults() {
  const { spec } = this;
  const specUrl = this.url;
  // TODO: OAS3: support servers here
  if (specUrl && startsWith(specUrl, 'http')) {
    const parsed = Url.parse(specUrl);
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
};

// add backwards compatibility with older versions of swagger-ui
// Refs https://github.com/swagger-api/swagger-ui/issues/6210
export const { helpers } = Swagger;

export default Swagger;
