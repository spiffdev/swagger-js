"use strict";

exports.__esModule = true;
exports.isFreelyNamed = isFreelyNamed;
exports.generateAbsoluteRefPatches = generateAbsoluteRefPatches;
exports.absolutifyPointer = absolutifyPointer;

var _traverse = _interopRequireDefault(require("traverse"));

var _url = _interopRequireDefault(require("url"));

var _isString = _interopRequireDefault(require("lodash/isString"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// This will match if the direct parent's key exactly matches an item.
const freelyNamedKeyParents = ['properties']; // This will match if the grandparent's key exactly matches an item.
// NOTE that this is for finding non-free paths!

const nonFreelyNamedKeyGrandparents = ['properties']; // This will match if the joined parent path exactly matches an item.
//
// This is mostly useful for filtering out root-level reusable item names,
// for example `["definitions", "$ref"]`

const freelyNamedPaths = [// Swagger 2.0
'definitions', 'parameters', 'responses', 'securityDefinitions', // OpenAPI 3.0
'components/schemas', 'components/responses', 'components/parameters', 'components/securitySchemes']; // This will match if any of these items are substrings of the joined
// parent path.
//
// Warning! These are powerful. Beware of edge cases.

const freelyNamedAncestors = ['schema/example', 'items/example'];

function isFreelyNamed(parentPath) {
  const parentKey = parentPath[parentPath.length - 1];
  const grandparentKey = parentPath[parentPath.length - 2];
  const parentStr = parentPath.join('/');
  return (// eslint-disable-next-line max-len
    freelyNamedKeyParents.indexOf(parentKey) > -1 && nonFreelyNamedKeyGrandparents.indexOf(grandparentKey) === -1 || freelyNamedPaths.indexOf(parentStr) > -1 || freelyNamedAncestors.some(el => parentStr.indexOf(el) > -1)
  );
}

function generateAbsoluteRefPatches(obj, basePath, {
  specmap,
  getBaseUrlForNodePath = path => specmap.getContext([...basePath, ...path]).baseDoc,
  targetKeys = ['$ref', '$$ref']
} = {}) {
  const patches = [];
  (0, _traverse.default)(obj).forEach(function callback() {
    if (targetKeys.includes(this.key) && (0, _isString.default)(this.node)) {
      const nodePath = this.path; // this node's path, relative to `obj`

      const fullPath = basePath.concat(this.path);
      const absolutifiedRefValue = absolutifyPointer(this.node, getBaseUrlForNodePath(nodePath));
      patches.push(specmap.replace(fullPath, absolutifiedRefValue));
    }
  });
  return patches;
}

function absolutifyPointer(pointer, baseUrl) {
  const [urlPart, fragmentPart] = pointer.split('#');

  const newRefUrlPart = _url.default.resolve(urlPart || '', baseUrl || '');

  return fragmentPart ? `${newRefUrlPart}#${fragmentPart}` : newRefUrlPart;
}