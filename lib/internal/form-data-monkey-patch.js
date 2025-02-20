"use strict";

exports.__esModule = true;
exports.default = exports.patch = void 0;

var _isFunction = _interopRequireDefault(require("lodash/isFunction"));

var _isomorphicFormData = _interopRequireDefault(require("isomorphic-form-data"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// patches FormData type by mutating it.
// patch :: FormData -> PatchedFormData
const patch = FormData => {
  const createEntry = (field, value) => ({
    name: field,
    value
  });
  /** We return original type if prototype already contains one of methods we're trying to patch.
   * Reasoning: if one of the methods already exists, it would access data in other
   * property than our `_entryList`. That could potentially create nasty
   * hardly detectable bugs if `form-data` library implements only couple of
   * methods that it misses, instead of implementing all of them.
   * Current solution will fail the tests to let us know that form-data library
   * already implements some of the methods that we try to monkey-patch, and our
   * monkey-patch code should then compensate the library changes easily.
   */


  if ((0, _isFunction.default)(FormData.prototype.set) || (0, _isFunction.default)(FormData.prototype.get) || (0, _isFunction.default)(FormData.prototype.getAll) || (0, _isFunction.default)(FormData.prototype.has)) {
    return FormData;
  }

  class PatchedFormData extends FormData {
    constructor(form) {
      super(form);
      this.entryList = [];
    }

    append(field, value, options) {
      this.entryList.push(createEntry(field, value));
      return super.append(field, value, options);
    }

    set(field, value) {
      const newEntry = createEntry(field, value);
      this.entryList = this.entryList.filter(entry => entry.name !== field);
      this.entryList.push(newEntry);
    }

    get(field) {
      const foundEntry = this.entryList.find(entry => entry.name === field);
      return foundEntry === undefined ? null : foundEntry;
    }

    getAll(field) {
      return this.entryList.filter(entry => entry.name === field).map(entry => entry.value);
    }

    has(field) {
      return this.entryList.some(entry => entry.name === field);
    }

  }

  return PatchedFormData;
};

exports.patch = patch;

var _default = patch(_isomorphicFormData.default);

exports.default = _default;