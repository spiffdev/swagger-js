import _objectSpread from "@babel/runtime-corejs3/helpers/objectSpread2";
import _concatInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/concat";
import pick from 'lodash/pick';
import { eachOperation, opId } from './helpers';

var nullFn = function nullFn() {
  return null;
};

var normalizeArray = function normalizeArray(arg) {
  return Array.isArray(arg) ? arg : [arg];
}; // To allow stubbing of functions


export var self = {
  mapTagOperations: mapTagOperations,
  makeExecute: makeExecute
}; // Make an execute, bound to arguments defined in mapTagOperation's callback (cb)

export function makeExecute() {
  var swaggerJs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return function (_ref) {
    var pathName = _ref.pathName,
        method = _ref.method,
        operationId = _ref.operationId;
    return function (parameters) {
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      return swaggerJs.execute(_objectSpread(_objectSpread({
        spec: swaggerJs.spec
      }, pick(swaggerJs, 'requestInterceptor', 'responseInterceptor', 'userFetch')), {}, {
        pathName: pathName,
        method: method,
        parameters: parameters,
        operationId: operationId
      }, opts));
    };
  };
} // Creates an interface with tags+operations = execute
// The shape
// { apis: { [tag]: { operations: [operation]: { execute }}}}
// NOTE: this is mostly for compatibility

export function makeApisTagOperationsOperationExecute() {
  var swaggerJs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  // { apis: tag: operations: execute }
  var cb = self.makeExecute(swaggerJs);
  var tagOperations = self.mapTagOperations({
    v2OperationIdCompatibilityMode: swaggerJs.v2OperationIdCompatibilityMode,
    spec: swaggerJs.spec,
    cb: cb
  });
  var apis = {}; // eslint-disable-next-line no-restricted-syntax, guard-for-in

  for (var tag in tagOperations) {
    apis[tag] = {
      operations: {}
    }; // eslint-disable-next-line no-restricted-syntax, guard-for-in

    for (var op in tagOperations[tag]) {
      apis[tag].operations[op] = {
        execute: tagOperations[tag][op]
      };
    }
  }

  return {
    apis: apis
  };
} // .apis[tag][operationId]:ExecuteFunction interface

export function makeApisTagOperation() {
  var swaggerJs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var cb = self.makeExecute(swaggerJs);
  return {
    apis: self.mapTagOperations({
      v2OperationIdCompatibilityMode: swaggerJs.v2OperationIdCompatibilityMode,
      spec: swaggerJs.spec,
      cb: cb
    })
  };
}
/**
 * Iterates over a spec, creating a hash of {[tag]: { [operationId], ... }, ...}
 * with the value of calling `cb`.
 *
 * `spec` is a OAI v2.0 compliant specification object
 * `cb` is called with ({ spec, operation, path, method })
 * `defaultTag` will house all non-tagged operations
 *
 */

export function mapTagOperations(_ref2) {
  var spec = _ref2.spec,
      _ref2$cb = _ref2.cb,
      cb = _ref2$cb === void 0 ? nullFn : _ref2$cb,
      _ref2$defaultTag = _ref2.defaultTag,
      defaultTag = _ref2$defaultTag === void 0 ? 'default' : _ref2$defaultTag,
      v2OperationIdCompatibilityMode = _ref2.v2OperationIdCompatibilityMode;
  var operationIdCounter = {};
  var tagOperations = {}; // Will house all tags + operations

  eachOperation(spec, function (_ref3) {
    var pathName = _ref3.pathName,
        method = _ref3.method,
        operation = _ref3.operation;
    var tags = operation.tags ? normalizeArray(operation.tags) : [defaultTag];
    tags.forEach(function (tag) {
      if (typeof tag !== 'string') {
        return;
      }

      tagOperations[tag] = tagOperations[tag] || {};
      var tagObj = tagOperations[tag];
      var id = opId(operation, pathName, method, {
        v2OperationIdCompatibilityMode: v2OperationIdCompatibilityMode
      });
      var cbResult = cb({
        spec: spec,
        pathName: pathName,
        method: method,
        operation: operation,
        operationId: id
      });

      if (operationIdCounter[id]) {
        var _context;

        operationIdCounter[id] += 1;
        tagObj[_concatInstanceProperty(_context = "".concat(id)).call(_context, operationIdCounter[id])] = cbResult;
      } else if (typeof tagObj[id] !== 'undefined') {
        var _context2, _context3;

        // Bump counter ( for this operationId )
        var originalCounterValue = operationIdCounter[id] || 1;
        operationIdCounter[id] = originalCounterValue + 1; // Append _x to the operationId

        tagObj[_concatInstanceProperty(_context2 = "".concat(id)).call(_context2, operationIdCounter[id])] = cbResult; // Rename the first operationId

        var temp = tagObj[id];
        delete tagObj[id];
        tagObj[_concatInstanceProperty(_context3 = "".concat(id)).call(_context3, originalCounterValue)] = temp;
      } else {
        // Assign callback result ( usually a bound function )
        tagObj[id] = cbResult;
      }
    });
  });
  return tagOperations;
}