import _objectSpread from "@babel/runtime-corejs3/helpers/objectSpread2";
import _asyncToGenerator from "@babel/runtime-corejs3/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime-corejs3/regenerator";
// The subtree resolver is a higher-level interface that allows you to
// get the same result that you would from `Swagger.resolve`, but focuses on
// a subtree of your object.
//
// It makes several assumptions that allow you to think less about what resolve,
// specmap, and normalizeSwagger are doing: if this is not suitable for you,
// you can emulate `resolveSubtree`'s behavior by talking to the traditional
// resolver directly.
//
// By providing a top-level `obj` and a `path` to resolve within, the subtree
// at `path` will be resolved and normalized in the context of your top-level
// `obj`. You'll get the resolved subtree you're interest in as a return value
// (or, you can use `returnEntireTree` to get everything back).
//
// This is useful for cases where resolving your entire object is unnecessary
// and/or non-performant; we use this interface for lazily resolving operations
// and models in Swagger-UI, which allows us to handle larger definitions.
//
// It's likely that Swagger-Client will rely entirely on lazy resolving in
// future versions.
//
// TODO: move the remarks above into project documentation
import get from 'lodash/get';
import resolve from '../resolver';
import { normalizeSwagger } from '../helpers';
export default function resolveSubtree(_x, _x2) {
  return _resolveSubtree.apply(this, arguments);
}

function _resolveSubtree() {
  _resolveSubtree = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(obj, path) {
    var opts,
        returnEntireTree,
        baseDoc,
        requestInterceptor,
        responseInterceptor,
        parameterMacro,
        modelPropertyMacro,
        useCircularStructures,
        resolveOptions,
        _normalizeSwagger,
        normalized,
        result,
        _args = arguments;

    return _regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            opts = _args.length > 2 && _args[2] !== undefined ? _args[2] : {};
            returnEntireTree = opts.returnEntireTree, baseDoc = opts.baseDoc, requestInterceptor = opts.requestInterceptor, responseInterceptor = opts.responseInterceptor, parameterMacro = opts.parameterMacro, modelPropertyMacro = opts.modelPropertyMacro, useCircularStructures = opts.useCircularStructures;
            resolveOptions = {
              pathDiscriminator: path,
              baseDoc: baseDoc,
              requestInterceptor: requestInterceptor,
              responseInterceptor: responseInterceptor,
              parameterMacro: parameterMacro,
              modelPropertyMacro: modelPropertyMacro,
              useCircularStructures: useCircularStructures
            };
            _normalizeSwagger = normalizeSwagger({
              spec: obj
            }), normalized = _normalizeSwagger.spec;
            _context.next = 6;
            return resolve(_objectSpread(_objectSpread({}, resolveOptions), {}, {
              spec: normalized,
              allowMetaPatches: true,
              skipNormalization: true
            }));

          case 6:
            result = _context.sent;

            if (!returnEntireTree && Array.isArray(path) && path.length) {
              result.spec = get(result.spec, path) || null;
            }

            return _context.abrupt("return", result);

          case 9:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _resolveSubtree.apply(this, arguments);
}