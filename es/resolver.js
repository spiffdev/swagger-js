import _asyncToGenerator from "@babel/runtime-corejs3/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime-corejs3/regenerator";
import Http from './http';
import mapSpec, { plugins } from './specmap';
import { normalizeSwagger } from './helpers';
import { ACCEPT_HEADER_VALUE_FOR_DOCUMENTS } from './constants';
export function makeFetchJSON(http) {
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var requestInterceptor = opts.requestInterceptor,
      responseInterceptor = opts.responseInterceptor; // Set credentials with 'http.withCredentials' value

  var credentials = http.withCredentials ? 'include' : 'same-origin';
  return function (docPath) {
    return http({
      url: docPath,
      loadSpec: true,
      requestInterceptor: requestInterceptor,
      responseInterceptor: responseInterceptor,
      headers: {
        Accept: ACCEPT_HEADER_VALUE_FOR_DOCUMENTS
      },
      credentials: credentials
    }).then(function (res) {
      return res.body;
    });
  };
} // Wipe out the http cache

export function clearCache() {
  plugins.refs.clearCache();
}
export default function resolve(obj) {
  var fetch = obj.fetch,
      spec = obj.spec,
      url = obj.url,
      mode = obj.mode,
      _obj$allowMetaPatches = obj.allowMetaPatches,
      allowMetaPatches = _obj$allowMetaPatches === void 0 ? true : _obj$allowMetaPatches,
      pathDiscriminator = obj.pathDiscriminator,
      modelPropertyMacro = obj.modelPropertyMacro,
      parameterMacro = obj.parameterMacro,
      requestInterceptor = obj.requestInterceptor,
      responseInterceptor = obj.responseInterceptor,
      skipNormalization = obj.skipNormalization,
      useCircularStructures = obj.useCircularStructures;
  var http = obj.http,
      baseDoc = obj.baseDoc; // @TODO Swagger-UI uses baseDoc instead of url, this is to allow both
  // need to fix and pick one.

  baseDoc = baseDoc || url; // Provide a default fetch implementation
  // TODO fetch should be removed, and http used instead

  http = fetch || http || Http;

  if (!spec) {
    return makeFetchJSON(http, {
      requestInterceptor: requestInterceptor,
      responseInterceptor: responseInterceptor
    })(baseDoc).then(doResolve);
  }

  return doResolve(spec);

  function doResolve(_spec) {
    if (baseDoc) {
      plugins.refs.docCache[baseDoc] = _spec;
    } // Build a json-fetcher ( ie: give it a URL and get json out )


    plugins.refs.fetchJSON = makeFetchJSON(http, {
      requestInterceptor: requestInterceptor,
      responseInterceptor: responseInterceptor
    });
    var plugs = [plugins.refs];

    if (typeof parameterMacro === 'function') {
      plugs.push(plugins.parameters);
    }

    if (typeof modelPropertyMacro === 'function') {
      plugs.push(plugins.properties);
    }

    if (mode !== 'strict') {
      plugs.push(plugins.allOf);
    } // mapSpec is where the hard work happens


    return mapSpec({
      spec: _spec,
      context: {
        baseDoc: baseDoc
      },
      plugins: plugs,
      allowMetaPatches: allowMetaPatches,
      // allows adding .meta patches, which include adding `$$ref`s to the spec
      pathDiscriminator: pathDiscriminator,
      // for lazy resolution
      parameterMacro: parameterMacro,
      modelPropertyMacro: modelPropertyMacro,
      useCircularStructures: useCircularStructures
    }).then(skipNormalization ? /*#__PURE__*/function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(a) {
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", a);

              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }() : normalizeSwagger);
  }
}