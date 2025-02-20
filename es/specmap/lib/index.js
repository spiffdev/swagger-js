import _typeof from "@babel/runtime-corejs3/helpers/typeof";
import _toConsumableArray from "@babel/runtime-corejs3/helpers/toConsumableArray";
import _defineProperty from "@babel/runtime-corejs3/helpers/defineProperty";
import _objectSpread from "@babel/runtime-corejs3/helpers/objectSpread2";
import _Object$assign from "@babel/runtime-corejs3/core-js-stable/object/assign";
import _concatInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/concat";
import _reduceInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/reduce";
import _Object$keys from "@babel/runtime-corejs3/core-js-stable/object/keys";
import _mapInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/map";
import _filterInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/filter";
import * as jsonPatch from 'fast-json-patch';
import deepExtend from 'deep-extend';
import cloneDeep from 'lodash/cloneDeep';
export default {
  add: add,
  replace: replace,
  remove: remove,
  merge: merge,
  mergeDeep: mergeDeep,
  context: context,
  getIn: getIn,
  applyPatch: applyPatch,
  parentPathMatch: parentPathMatch,
  flatten: flatten,
  fullyNormalizeArray: fullyNormalizeArray,
  normalizeArray: normalizeArray,
  isPromise: isPromise,
  forEachNew: forEachNew,
  forEachNewPrimitive: forEachNewPrimitive,
  isJsonPatch: isJsonPatch,
  isContextPatch: isContextPatch,
  isPatch: isPatch,
  isMutation: isMutation,
  isAdditiveMutation: isAdditiveMutation,
  isGenerator: isGenerator,
  isFunction: isFunction,
  isObject: isObject,
  isError: isError
};

function applyPatch(obj, patch, opts) {
  opts = opts || {};
  patch = _objectSpread(_objectSpread({}, patch), {}, {
    path: patch.path && normalizeJSONPath(patch.path)
  });

  if (patch.op === 'merge') {
    var newValue = getInByJsonPath(obj, patch.path);

    _Object$assign(newValue, patch.value);

    jsonPatch.applyPatch(obj, [replace(patch.path, newValue)]);
  } else if (patch.op === 'mergeDeep') {
    var currentValue = getInByJsonPath(obj, patch.path); // Iterate the properties of the patch
    // eslint-disable-next-line no-restricted-syntax, guard-for-in

    for (var prop in patch.value) {
      var propVal = patch.value[prop];
      var isArray = Array.isArray(propVal);

      if (isArray) {
        // deepExtend doesn't merge arrays, so we will do it manually
        var existing = currentValue[prop] || [];
        currentValue[prop] = _concatInstanceProperty(existing).call(existing, propVal);
      } else if (isObject(propVal) && !isArray) {
        // If it's an object, iterate it's keys and merge
        // if there are conflicting keys, merge deep, otherwise shallow merge
        var currentObj = _objectSpread({}, currentValue[prop]); // eslint-disable-next-line no-restricted-syntax


        for (var key in propVal) {
          if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
            // if there is a single conflicting key, just deepExtend the entire value
            // and break from the loop (since all future keys are also merged)
            // We do this because we can't deepExtend two primitives
            // (currentObj[key] & propVal[key] may be primitives).
            //
            // we also deeply assign here, since we aren't in control of
            // how deepExtend affects existing nested objects
            currentObj = deepExtend(cloneDeep(currentObj), propVal);
            break;
          } else {
            _Object$assign(currentObj, _defineProperty({}, key, propVal[key]));
          }
        }

        currentValue[prop] = currentObj;
      } else {
        // It's a primitive, just replace existing
        currentValue[prop] = propVal;
      }
    }
  } else if (patch.op === 'add' && patch.path === '' && isObject(patch.value)) {
    var _context;

    // { op: 'add', path: '', value: { a: 1, b: 2 }}
    // has no effect: json patch refuses to do anything.
    // so let's break that patch down into a set of patches,
    // one for each key in the intended root value.
    var patches = _reduceInstanceProperty(_context = _Object$keys(patch.value)).call(_context, function (arr, key) {
      arr.push({
        op: 'add',
        path: "/".concat(normalizeJSONPath(key)),
        value: patch.value[key]
      });
      return arr;
    }, []);

    jsonPatch.applyPatch(obj, patches);
  } else if (patch.op === 'replace' && patch.path === '') {
    var _patch = patch,
        value = _patch.value;

    if (opts.allowMetaPatches && patch.meta && isAdditiveMutation(patch) && (Array.isArray(patch.value) || isObject(patch.value))) {
      value = _objectSpread(_objectSpread({}, value), patch.meta);
    }

    obj = value;
  } else {
    jsonPatch.applyPatch(obj, [patch]); // Attach metadata to the resulting value.

    if (opts.allowMetaPatches && patch.meta && isAdditiveMutation(patch) && (Array.isArray(patch.value) || isObject(patch.value))) {
      var _currentValue = getInByJsonPath(obj, patch.path);

      var _newValue = _objectSpread(_objectSpread({}, _currentValue), patch.meta);

      jsonPatch.applyPatch(obj, [replace(patch.path, _newValue)]);
    }
  }

  return obj;
}

function normalizeJSONPath(path) {
  if (Array.isArray(path)) {
    if (path.length < 1) {
      return '';
    }

    return "/".concat(_mapInstanceProperty(path).call(path, function (item) {
      return (// eslint-disable-line prefer-template
        (item + '').replace(/~/g, '~0').replace(/\//g, '~1')
      );
    } // eslint-disable-line prefer-template
    ).join('/'));
  }

  return path;
} // =========================
// JSON-Patch Wrappers
// =========================


function add(path, value) {
  return {
    op: 'add',
    path: path,
    value: value
  };
} // function _get(path) {
//   return { op: '_get', path };
// }


function replace(path, value, meta) {
  return {
    op: 'replace',
    path: path,
    value: value,
    meta: meta
  };
}

function remove(path) {
  return {
    op: 'remove',
    path: path
  };
} // Custom wrappers


function merge(path, value) {
  return {
    type: 'mutation',
    op: 'merge',
    path: path,
    value: value
  };
} // Custom wrappers


function mergeDeep(path, value) {
  return {
    type: 'mutation',
    op: 'mergeDeep',
    path: path,
    value: value
  };
}

function context(path, value) {
  return {
    type: 'context',
    path: path,
    value: value
  };
} // =========================
// Iterators
// =========================


function forEachNew(mutations, fn) {
  try {
    return forEachNewPatch(mutations, forEach, fn);
  } catch (e) {
    return e;
  }
}

function forEachNewPrimitive(mutations, fn) {
  try {
    return forEachNewPatch(mutations, forEachPrimitive, fn);
  } catch (e) {
    return e;
  }
}

function forEachNewPatch(mutations, fn, callback) {
  var _context2;

  var res = _mapInstanceProperty(_context2 = _filterInstanceProperty(mutations).call(mutations, isAdditiveMutation)).call(_context2, function (mutation) {
    return fn(mutation.value, callback, mutation.path);
  }) || [];
  var flat = flatten(res);
  var clean = cleanArray(flat);
  return clean;
}

function forEachPrimitive(obj, fn, basePath) {
  basePath = basePath || [];

  if (Array.isArray(obj)) {
    return _mapInstanceProperty(obj).call(obj, function (val, key) {
      return forEachPrimitive(val, fn, _concatInstanceProperty(basePath).call(basePath, key));
    });
  }

  if (isObject(obj)) {
    var _context3;

    return _mapInstanceProperty(_context3 = _Object$keys(obj)).call(_context3, function (key) {
      return forEachPrimitive(obj[key], fn, _concatInstanceProperty(basePath).call(basePath, key));
    });
  }

  return fn(obj, basePath[basePath.length - 1], basePath);
}

function forEach(obj, fn, basePath) {
  basePath = basePath || [];
  var results = [];

  if (basePath.length > 0) {
    var newResults = fn(obj, basePath[basePath.length - 1], basePath);

    if (newResults) {
      results = _concatInstanceProperty(results).call(results, newResults);
    }
  }

  if (Array.isArray(obj)) {
    var arrayResults = _mapInstanceProperty(obj).call(obj, function (val, key) {
      return forEach(val, fn, _concatInstanceProperty(basePath).call(basePath, key));
    });

    if (arrayResults) {
      results = _concatInstanceProperty(results).call(results, arrayResults);
    }
  } else if (isObject(obj)) {
    var _context4;

    var moreResults = _mapInstanceProperty(_context4 = _Object$keys(obj)).call(_context4, function (key) {
      return forEach(obj[key], fn, _concatInstanceProperty(basePath).call(basePath, key));
    });

    if (moreResults) {
      results = _concatInstanceProperty(results).call(results, moreResults);
    }
  }

  results = flatten(results);
  return results;
} // =========================
// Paths
// =========================


function parentPathMatch(path, arr) {
  if (!Array.isArray(arr)) {
    return false;
  }

  for (var i = 0, len = arr.length; i < len; i += 1) {
    if (arr[i] !== path[i]) {
      return false;
    }
  }

  return true;
}

function getIn(obj, path) {
  return _reduceInstanceProperty(path).call(path, function (val, token) {
    if (typeof token !== 'undefined' && val) {
      return val[token];
    }

    return val;
  }, obj);
} // =========================
// Array
// =========================


function fullyNormalizeArray(arr) {
  return cleanArray(flatten(normalizeArray(arr)));
}

function normalizeArray(arr) {
  return Array.isArray(arr) ? arr : [arr];
}

function flatten(arr) {
  var _ref;

  return _concatInstanceProperty(_ref = []).apply(_ref, _toConsumableArray(_mapInstanceProperty(arr).call(arr, function (val) {
    return Array.isArray(val) ? flatten(val) : val;
  })));
}

function cleanArray(arr) {
  return _filterInstanceProperty(arr).call(arr, function (elm) {
    return typeof elm !== 'undefined';
  });
} // =========================
// Is-Thing.
// =========================


function isObject(val) {
  return val && _typeof(val) === 'object';
}

function isPromise(val) {
  return isObject(val) && isFunction(val.then);
}

function isFunction(val) {
  return val && typeof val === 'function';
}

function isError(patch) {
  return patch instanceof Error;
}

function isJsonPatch(patch) {
  if (isPatch(patch)) {
    var op = patch.op;
    return op === 'add' || op === 'remove' || op === 'replace';
  }

  return false;
}

function isGenerator(thing) {
  return Object.prototype.toString.call(thing) === '[object GeneratorFunction]';
}

function isMutation(patch) {
  return isJsonPatch(patch) || isPatch(patch) && patch.type === 'mutation';
}

function isAdditiveMutation(patch) {
  return isMutation(patch) && (patch.op === 'add' || patch.op === 'replace' || patch.op === 'merge' || patch.op === 'mergeDeep');
}

function isContextPatch(patch) {
  return isPatch(patch) && patch.type === 'context';
}

function isPatch(patch) {
  return patch && _typeof(patch) === 'object';
}

function getInByJsonPath(obj, jsonPath) {
  try {
    return jsonPatch.getValueByPointer(obj, jsonPath);
  } catch (e) {
    console.error(e); // eslint-disable-line no-console

    return {};
  }
}