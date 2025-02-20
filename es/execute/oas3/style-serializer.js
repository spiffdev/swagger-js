import _typeof from "@babel/runtime-corejs3/helpers/typeof";
import _toConsumableArray from "@babel/runtime-corejs3/helpers/toConsumableArray";
import _mapInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/map";
import _sliceInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/slice";
import _reduceInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/reduce";
import _concatInstanceProperty from "@babel/runtime-corejs3/core-js-stable/instance/concat";
import _Object$keys from "@babel/runtime-corejs3/core-js-stable/object/keys";

var _require = require('buffer'),
    Buffer = _require.Buffer;

var isRfc3986Reserved = function isRfc3986Reserved(char) {
  return ":/?#[]@!$&'()*+,;=".indexOf(char) > -1;
};

var isRrc3986Unreserved = function isRrc3986Unreserved(char) {
  return /^[a-z0-9\-._~]+$/i.test(char);
};

export function encodeDisallowedCharacters(str) {
  var _context;

  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      escape = _ref.escape;

  var parse = arguments.length > 2 ? arguments[2] : undefined;

  if (typeof str === 'number') {
    str = str.toString();
  }

  if (typeof str !== 'string' || !str.length) {
    return str;
  }

  if (!escape) {
    return str;
  }

  if (parse) {
    return JSON.parse(str);
  } // In ES6 you can do this quite easily by using the new ... spread operator.
  // This causes the string iterator (another new ES6 feature) to be used internally,
  // and because that iterator is designed to deal with
  // code points rather than UCS-2/UTF-16 code units.


  return _mapInstanceProperty(_context = _toConsumableArray(str)).call(_context, function (char) {
    var _context2, _context3;

    if (isRrc3986Unreserved(char)) {
      return char;
    }

    if (isRfc3986Reserved(char) && escape === 'unsafe') {
      return char;
    }

    var encoded = _mapInstanceProperty(_context2 = _mapInstanceProperty(_context3 = Buffer.from(char).toJSON().data || []).call(_context3, function (byte) {
      var _context4;

      return _sliceInstanceProperty(_context4 = "0".concat(byte.toString(16).toUpperCase())).call(_context4, -2);
    })).call(_context2, function (encodedByte) {
      return "%".concat(encodedByte);
    }).join('');

    return encoded;
  }).join('');
}
export default function stylize(config) {
  var value = config.value;

  if (Array.isArray(value)) {
    return encodeArray(config);
  }

  if (_typeof(value) === 'object') {
    return encodeObject(config);
  }

  return encodePrimitive(config);
}

function encodeArray(_ref2) {
  var key = _ref2.key,
      value = _ref2.value,
      style = _ref2.style,
      explode = _ref2.explode,
      escape = _ref2.escape;

  var valueEncoder = function valueEncoder(str) {
    return encodeDisallowedCharacters(str, {
      escape: escape
    });
  };

  if (style === 'simple') {
    return _mapInstanceProperty(value).call(value, function (val) {
      return valueEncoder(val);
    }).join(',');
  }

  if (style === 'label') {
    return ".".concat(_mapInstanceProperty(value).call(value, function (val) {
      return valueEncoder(val);
    }).join('.'));
  }

  if (style === 'matrix') {
    var _context5;

    return _reduceInstanceProperty(_context5 = _mapInstanceProperty(value).call(value, function (val) {
      return valueEncoder(val);
    })).call(_context5, function (prev, curr) {
      var _context8;

      if (!prev || explode) {
        var _context6, _context7;

        return _concatInstanceProperty(_context6 = _concatInstanceProperty(_context7 = "".concat(prev || '', ";")).call(_context7, key, "=")).call(_context6, curr);
      }

      return _concatInstanceProperty(_context8 = "".concat(prev, ",")).call(_context8, curr);
    }, '');
  }

  if (style === 'form') {
    var after = explode ? "&".concat(key, "=") : ',';
    return _mapInstanceProperty(value).call(value, function (val) {
      return valueEncoder(val);
    }).join(after);
  }

  if (style === 'spaceDelimited') {
    var _after = explode ? "".concat(key, "=") : '';

    return _mapInstanceProperty(value).call(value, function (val) {
      return valueEncoder(val);
    }).join(" ".concat(_after));
  }

  if (style === 'pipeDelimited') {
    var _after2 = explode ? "".concat(key, "=") : '';

    return _mapInstanceProperty(value).call(value, function (val) {
      return valueEncoder(val);
    }).join("|".concat(_after2));
  }

  return undefined;
}

function encodeObject(_ref3) {
  var key = _ref3.key,
      value = _ref3.value,
      style = _ref3.style,
      explode = _ref3.explode,
      escape = _ref3.escape;

  var valueEncoder = function valueEncoder(str) {
    return encodeDisallowedCharacters(str, {
      escape: escape
    });
  };

  var valueKeys = _Object$keys(value);

  if (style === 'simple') {
    return _reduceInstanceProperty(valueKeys).call(valueKeys, function (prev, curr) {
      var _context9, _context10, _context11;

      var val = valueEncoder(value[curr]);
      var middleChar = explode ? '=' : ',';
      var prefix = prev ? "".concat(prev, ",") : '';
      return _concatInstanceProperty(_context9 = _concatInstanceProperty(_context10 = _concatInstanceProperty(_context11 = "".concat(prefix)).call(_context11, curr)).call(_context10, middleChar)).call(_context9, val);
    }, '');
  }

  if (style === 'label') {
    return _reduceInstanceProperty(valueKeys).call(valueKeys, function (prev, curr) {
      var _context12, _context13, _context14;

      var val = valueEncoder(value[curr]);
      var middleChar = explode ? '=' : '.';
      var prefix = prev ? "".concat(prev, ".") : '.';
      return _concatInstanceProperty(_context12 = _concatInstanceProperty(_context13 = _concatInstanceProperty(_context14 = "".concat(prefix)).call(_context14, curr)).call(_context13, middleChar)).call(_context12, val);
    }, '');
  }

  if (style === 'matrix' && explode) {
    return _reduceInstanceProperty(valueKeys).call(valueKeys, function (prev, curr) {
      var _context15, _context16;

      var val = valueEncoder(value[curr]);
      var prefix = prev ? "".concat(prev, ";") : ';';
      return _concatInstanceProperty(_context15 = _concatInstanceProperty(_context16 = "".concat(prefix)).call(_context16, curr, "=")).call(_context15, val);
    }, '');
  }

  if (style === 'matrix') {
    // no explode
    return _reduceInstanceProperty(valueKeys).call(valueKeys, function (prev, curr) {
      var _context17, _context18;

      var val = valueEncoder(value[curr]);
      var prefix = prev ? "".concat(prev, ",") : ";".concat(key, "=");
      return _concatInstanceProperty(_context17 = _concatInstanceProperty(_context18 = "".concat(prefix)).call(_context18, curr, ",")).call(_context17, val);
    }, '');
  }

  if (style === 'form') {
    return _reduceInstanceProperty(valueKeys).call(valueKeys, function (prev, curr) {
      var _context19, _context20, _context21, _context22;

      var val = valueEncoder(value[curr]);
      var prefix = prev ? _concatInstanceProperty(_context19 = "".concat(prev)).call(_context19, explode ? '&' : ',') : '';
      var separator = explode ? '=' : ',';
      return _concatInstanceProperty(_context20 = _concatInstanceProperty(_context21 = _concatInstanceProperty(_context22 = "".concat(prefix)).call(_context22, curr)).call(_context21, separator)).call(_context20, val);
    }, '');
  }

  return undefined;
}

function encodePrimitive(_ref4) {
  var key = _ref4.key,
      value = _ref4.value,
      style = _ref4.style,
      escape = _ref4.escape;

  var valueEncoder = function valueEncoder(str) {
    return encodeDisallowedCharacters(str, {
      escape: escape
    });
  };

  if (style === 'simple') {
    return valueEncoder(value);
  }

  if (style === 'label') {
    return ".".concat(valueEncoder(value));
  }

  if (style === 'matrix') {
    var _context23;

    return _concatInstanceProperty(_context23 = ";".concat(key, "=")).call(_context23, valueEncoder(value));
  }

  if (style === 'form') {
    return valueEncoder(value);
  }

  if (style === 'deepObject') {
    return valueEncoder(value, {}, true);
  }

  return undefined;
}