import _classCallCheck from "@babel/runtime-corejs3/helpers/classCallCheck";
import _createClass from "@babel/runtime-corejs3/helpers/createClass";
import _get from "@babel/runtime-corejs3/helpers/get";
import _getPrototypeOf from "@babel/runtime-corejs3/helpers/getPrototypeOf";
import _inherits from "@babel/runtime-corejs3/helpers/inherits";
import _createSuper from "@babel/runtime-corejs3/helpers/createSuper";
import _filterInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/filter";
import _findInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/find";
import _mapInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/map";
import isFunction from 'lodash/isFunction';
import IsomorphicFormData from 'isomorphic-form-data'; // patches FormData type by mutating it.
// patch :: FormData -> PatchedFormData

export var patch = function patch(FormData) {
  var createEntry = function createEntry(field, value) {
    return {
      name: field,
      value: value
    };
  };
  /** We return original type if prototype already contains one of methods we're trying to patch.
   * Reasoning: if one of the methods already exists, it would access data in other
   * property than our `_entryList`. That could potentially create nasty
   * hardly detectable bugs if `form-data` library implements only couple of
   * methods that it misses, instead of implementing all of them.
   * Current solution will fail the tests to let us know that form-data library
   * already implements some of the methods that we try to monkey-patch, and our
   * monkey-patch code should then compensate the library changes easily.
   */


  if (isFunction(FormData.prototype.set) || isFunction(FormData.prototype.get) || isFunction(FormData.prototype.getAll) || isFunction(FormData.prototype.has)) {
    return FormData;
  }

  var PatchedFormData = /*#__PURE__*/function (_FormData) {
    _inherits(PatchedFormData, _FormData);

    var _super = _createSuper(PatchedFormData);

    function PatchedFormData(form) {
      var _this;

      _classCallCheck(this, PatchedFormData);

      _this = _super.call(this, form);
      _this.entryList = [];
      return _this;
    }

    _createClass(PatchedFormData, [{
      key: "append",
      value: function append(field, value, options) {
        this.entryList.push(createEntry(field, value));
        return _get(_getPrototypeOf(PatchedFormData.prototype), "append", this).call(this, field, value, options);
      }
    }, {
      key: "set",
      value: function set(field, value) {
        var _context;

        var newEntry = createEntry(field, value);
        this.entryList = _filterInstanceProperty(_context = this.entryList).call(_context, function (entry) {
          return entry.name !== field;
        });
        this.entryList.push(newEntry);
      }
    }, {
      key: "get",
      value: function get(field) {
        var _context2;

        var foundEntry = _findInstanceProperty(_context2 = this.entryList).call(_context2, function (entry) {
          return entry.name === field;
        });

        return foundEntry === undefined ? null : foundEntry;
      }
    }, {
      key: "getAll",
      value: function getAll(field) {
        var _context3, _context4;

        return _mapInstanceProperty(_context3 = _filterInstanceProperty(_context4 = this.entryList).call(_context4, function (entry) {
          return entry.name === field;
        })).call(_context3, function (entry) {
          return entry.value;
        });
      }
    }, {
      key: "has",
      value: function has(field) {
        return this.entryList.some(function (entry) {
          return entry.name === field;
        });
      }
    }]);

    return PatchedFormData;
  }(FormData);

  return PatchedFormData;
};
export default patch(IsomorphicFormData);