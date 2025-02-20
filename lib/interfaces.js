"use strict";

exports.__esModule = true;
exports.makeExecute = makeExecute;
exports.makeApisTagOperationsOperationExecute = makeApisTagOperationsOperationExecute;
exports.makeApisTagOperation = makeApisTagOperation;
exports.mapTagOperations = mapTagOperations;
exports.self = void 0;

var _pick = _interopRequireDefault(require("lodash/pick"));

var _helpers = require("./helpers");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const nullFn = () => null;

const normalizeArray = arg => Array.isArray(arg) ? arg : [arg]; // To allow stubbing of functions


const self = {
  mapTagOperations,
  makeExecute
}; // Make an execute, bound to arguments defined in mapTagOperation's callback (cb)

exports.self = self;

function makeExecute(swaggerJs = {}) {
  return ({
    pathName,
    method,
    operationId
  }) => (parameters, opts = {}) => swaggerJs.execute(_objectSpread(_objectSpread({
    spec: swaggerJs.spec
  }, (0, _pick.default)(swaggerJs, 'requestInterceptor', 'responseInterceptor', 'userFetch')), {}, {
    pathName,
    method,
    parameters,
    operationId
  }, opts));
} // Creates an interface with tags+operations = execute
// The shape
// { apis: { [tag]: { operations: [operation]: { execute }}}}
// NOTE: this is mostly for compatibility


function makeApisTagOperationsOperationExecute(swaggerJs = {}) {
  // { apis: tag: operations: execute }
  const cb = self.makeExecute(swaggerJs);
  const tagOperations = self.mapTagOperations({
    v2OperationIdCompatibilityMode: swaggerJs.v2OperationIdCompatibilityMode,
    spec: swaggerJs.spec,
    cb
  });
  const apis = {}; // eslint-disable-next-line no-restricted-syntax, guard-for-in

  for (const tag in tagOperations) {
    apis[tag] = {
      operations: {}
    }; // eslint-disable-next-line no-restricted-syntax, guard-for-in

    for (const op in tagOperations[tag]) {
      apis[tag].operations[op] = {
        execute: tagOperations[tag][op]
      };
    }
  }

  return {
    apis
  };
} // .apis[tag][operationId]:ExecuteFunction interface


function makeApisTagOperation(swaggerJs = {}) {
  const cb = self.makeExecute(swaggerJs);
  return {
    apis: self.mapTagOperations({
      v2OperationIdCompatibilityMode: swaggerJs.v2OperationIdCompatibilityMode,
      spec: swaggerJs.spec,
      cb
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


function mapTagOperations({
  spec,
  cb = nullFn,
  defaultTag = 'default',
  v2OperationIdCompatibilityMode
}) {
  const operationIdCounter = {};
  const tagOperations = {}; // Will house all tags + operations

  (0, _helpers.eachOperation)(spec, ({
    pathName,
    method,
    operation
  }) => {
    const tags = operation.tags ? normalizeArray(operation.tags) : [defaultTag];
    tags.forEach(tag => {
      if (typeof tag !== 'string') {
        return;
      }

      tagOperations[tag] = tagOperations[tag] || {};
      const tagObj = tagOperations[tag];
      const id = (0, _helpers.opId)(operation, pathName, method, {
        v2OperationIdCompatibilityMode
      });
      const cbResult = cb({
        spec,
        pathName,
        method,
        operation,
        operationId: id
      });

      if (operationIdCounter[id]) {
        operationIdCounter[id] += 1;
        tagObj[`${id}${operationIdCounter[id]}`] = cbResult;
      } else if (typeof tagObj[id] !== 'undefined') {
        // Bump counter ( for this operationId )
        const originalCounterValue = operationIdCounter[id] || 1;
        operationIdCounter[id] = originalCounterValue + 1; // Append _x to the operationId

        tagObj[`${id}${operationIdCounter[id]}`] = cbResult; // Rename the first operationId

        const temp = tagObj[id];
        delete tagObj[id];
        tagObj[`${id}${originalCounterValue}`] = temp;
      } else {
        // Assign callback result ( usually a bound function )
        tagObj[id] = cbResult;
      }
    });
  });
  return tagOperations;
}