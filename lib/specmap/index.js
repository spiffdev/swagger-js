"use strict";

exports.__esModule = true;
exports.default = mapSpec;
exports.plugins = exports.SpecMap = void 0;

var _find = _interopRequireDefault(require("lodash/find"));

var _noop = _interopRequireDefault(require("lodash/noop"));

var _lib = _interopRequireDefault(require("./lib"));

var _refs = _interopRequireDefault(require("./lib/refs"));

var _allOf = _interopRequireDefault(require("./lib/all-of"));

var _parameters = _interopRequireDefault(require("./lib/parameters"));

var _properties = _interopRequireDefault(require("./lib/properties"));

var _contextTree = _interopRequireDefault(require("./lib/context-tree"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const HARD_LIMIT = 100;

class SpecMap {
  static getPluginName(plugin) {
    return plugin.pluginName;
  }

  static getPatchesOfType(patches, fn) {
    return patches.filter(fn);
  }

  constructor(opts) {
    Object.assign(this, {
      spec: '',
      debugLevel: 'info',
      plugins: [],
      pluginHistory: {},
      errors: [],
      mutations: [],
      promisedPatches: [],
      state: {},
      patches: [],
      context: {},
      contextTree: new _contextTree.default(),
      showDebug: false,
      allPatches: [],
      // only populated if showDebug is true
      pluginProp: 'specMap',
      libMethods: Object.assign(Object.create(this), _lib.default, {
        getInstance: () => this
      }),
      allowMetaPatches: false
    }, opts); // Lib methods bound

    this.get = this._get.bind(this); // eslint-disable-line no-underscore-dangle

    this.getContext = this._getContext.bind(this); // eslint-disable-line no-underscore-dangle

    this.hasRun = this._hasRun.bind(this); // eslint-disable-line no-underscore-dangle

    this.wrappedPlugins = this.plugins.map(this.wrapPlugin.bind(this)).filter(_lib.default.isFunction); // Initial patch(s)

    this.patches.push(_lib.default.add([], this.spec));
    this.patches.push(_lib.default.context([], this.context));
    this.updatePatches(this.patches);
  }

  debug(level, ...args) {
    if (this.debugLevel === level) {
      console.log(...args); // eslint-disable-line no-console
    }
  }

  verbose(header, ...args) {
    if (this.debugLevel === 'verbose') {
      console.log(`[${header}]   `, ...args); // eslint-disable-line no-console
    }
  }

  wrapPlugin(plugin, name) {
    const {
      pathDiscriminator
    } = this;
    let ctx = null;
    let fn;

    if (plugin[this.pluginProp]) {
      ctx = plugin;
      fn = plugin[this.pluginProp];
    } else if (_lib.default.isFunction(plugin)) {
      fn = plugin;
    } else if (_lib.default.isObject(plugin)) {
      fn = createKeyBasedPlugin(plugin);
    }

    return Object.assign(fn.bind(ctx), {
      pluginName: plugin.name || name,
      isGenerator: _lib.default.isGenerator(fn)
    }); // Expected plugin interface: {key: string, plugin: fn*}
    // This traverses depth-first and immediately applies yielded patches.
    // This strategy should work well for most plugins (including the built-ins).
    // We might consider making this (traversing & application) configurable later.

    function createKeyBasedPlugin(pluginObj) {
      const isSubPath = (path, tested) => {
        if (!Array.isArray(path)) {
          return true;
        }

        return path.every((val, i) => val === tested[i]);
      };

      return function* generator(patches, specmap) {
        const refCache = {}; // eslint-disable-next-line no-restricted-syntax

        for (const patch of patches.filter(_lib.default.isAdditiveMutation)) {
          yield* traverse(patch.value, patch.path, patch);
        }

        function* traverse(obj, path, patch) {
          if (!_lib.default.isObject(obj)) {
            if (pluginObj.key === path[path.length - 1]) {
              yield pluginObj.plugin(obj, pluginObj.key, path, specmap);
            }
          } else {
            const parentIndex = path.length - 1;
            const parent = path[parentIndex];
            const indexOfFirstProperties = path.indexOf('properties');
            const isRootProperties = parent === 'properties' && parentIndex === indexOfFirstProperties;
            const traversed = specmap.allowMetaPatches && refCache[obj.$$ref]; // eslint-disable-next-line no-restricted-syntax

            for (const key of Object.keys(obj)) {
              const val = obj[key];
              const updatedPath = path.concat(key);

              const isObj = _lib.default.isObject(val);

              const objRef = obj.$$ref;

              if (!traversed) {
                if (isObj) {
                  // Only store the ref if it exists
                  if (specmap.allowMetaPatches && objRef) {
                    refCache[objRef] = true;
                  }

                  yield* traverse(val, updatedPath, patch);
                }
              }

              if (!isRootProperties && key === pluginObj.key) {
                const isWithinPathDiscriminator = isSubPath(pathDiscriminator, path);

                if (!pathDiscriminator || isWithinPathDiscriminator) {
                  yield pluginObj.plugin(val, key, updatedPath, specmap, patch);
                }
              }
            }
          }
        }
      };
    }
  }

  nextPlugin() {
    // Array.prototype.find doesn't work in IE 11 :(
    return (0, _find.default)(this.wrappedPlugins, plugin => {
      const mutations = this.getMutationsForPlugin(plugin);
      return mutations.length > 0;
    });
  }

  nextPromisedPatch() {
    if (this.promisedPatches.length > 0) {
      return Promise.race(this.promisedPatches.map(patch => patch.value));
    }

    return undefined;
  }

  getPluginHistory(plugin) {
    const name = this.constructor.getPluginName(plugin);
    return this.pluginHistory[name] || [];
  }

  getPluginRunCount(plugin) {
    return this.getPluginHistory(plugin).length;
  }

  getPluginHistoryTip(plugin) {
    const history = this.getPluginHistory(plugin);
    const val = history && history[history.length - 1];
    return val || {};
  }

  getPluginMutationIndex(plugin) {
    const mi = this.getPluginHistoryTip(plugin).mutationIndex;
    return typeof mi !== 'number' ? -1 : mi;
  }

  updatePluginHistory(plugin, val) {
    const name = this.constructor.getPluginName(plugin);
    this.pluginHistory[name] = this.pluginHistory[name] || [];
    this.pluginHistory[name].push(val);
  }

  updatePatches(patches) {
    _lib.default.normalizeArray(patches).forEach(patch => {
      if (patch instanceof Error) {
        this.errors.push(patch);
        return;
      }

      try {
        if (!_lib.default.isObject(patch)) {
          this.debug('updatePatches', 'Got a non-object patch', patch);
          return;
        }

        if (this.showDebug) {
          this.allPatches.push(patch);
        }

        if (_lib.default.isPromise(patch.value)) {
          this.promisedPatches.push(patch);
          this.promisedPatchThen(patch);
          return;
        }

        if (_lib.default.isContextPatch(patch)) {
          this.setContext(patch.path, patch.value);
          return;
        }

        if (_lib.default.isMutation(patch)) {
          this.updateMutations(patch);
          return;
        }
      } catch (e) {
        console.error(e); // eslint-disable-line no-console

        this.errors.push(e);
      }
    });
  }

  updateMutations(patch) {
    if (typeof patch.value === 'object' && !Array.isArray(patch.value) && this.allowMetaPatches) {
      patch.value = _objectSpread({}, patch.value);
    }

    const result = _lib.default.applyPatch(this.state, patch, {
      allowMetaPatches: this.allowMetaPatches
    });

    if (result) {
      this.mutations.push(patch);
      this.state = result;
    }
  }

  removePromisedPatch(patch) {
    const index = this.promisedPatches.indexOf(patch);

    if (index < 0) {
      this.debug("Tried to remove a promisedPatch that isn't there!");
      return;
    }

    this.promisedPatches.splice(index, 1);
  }

  promisedPatchThen(patch) {
    patch.value = patch.value.then(val => {
      const promisedPatch = _objectSpread(_objectSpread({}, patch), {}, {
        value: val
      });

      this.removePromisedPatch(patch);
      this.updatePatches(promisedPatch);
    }).catch(e => {
      this.removePromisedPatch(patch);
      this.updatePatches(e);
    });
    return patch.value;
  }

  getMutations(from, to) {
    from = from || 0;

    if (typeof to !== 'number') {
      to = this.mutations.length;
    }

    return this.mutations.slice(from, to);
  }

  getCurrentMutations() {
    return this.getMutationsForPlugin(this.getCurrentPlugin());
  }

  getMutationsForPlugin(plugin) {
    const tip = this.getPluginMutationIndex(plugin);
    return this.getMutations(tip + 1);
  }

  getCurrentPlugin() {
    return this.currentPlugin;
  }

  getLib() {
    return this.libMethods;
  } // eslint-disable-next-line no-underscore-dangle


  _get(path) {
    return _lib.default.getIn(this.state, path);
  } // eslint-disable-next-line no-underscore-dangle


  _getContext(path) {
    return this.contextTree.get(path);
  }

  setContext(path, value) {
    return this.contextTree.set(path, value);
  } // eslint-disable-next-line no-underscore-dangle


  _hasRun(count) {
    const times = this.getPluginRunCount(this.getCurrentPlugin());
    return times > (count || 0);
  }

  dispatch() {
    const that = this;
    const plugin = this.nextPlugin();

    if (!plugin) {
      const nextPromise = this.nextPromisedPatch();

      if (nextPromise) {
        return nextPromise.then(() => this.dispatch()).catch(() => this.dispatch());
      } // We're done!


      const result = {
        spec: this.state,
        errors: this.errors
      };

      if (this.showDebug) {
        result.patches = this.allPatches;
      }

      return Promise.resolve(result);
    } // Makes sure plugin isn't running an endless loop


    that.pluginCount = that.pluginCount || {};
    that.pluginCount[plugin] = (that.pluginCount[plugin] || 0) + 1;

    if (that.pluginCount[plugin] > HARD_LIMIT) {
      return Promise.resolve({
        spec: that.state,
        errors: that.errors.concat(new Error(`We've reached a hard limit of ${HARD_LIMIT} plugin runs`))
      });
    } // A different plugin runs, wait for all promises to resolve, then retry


    if (plugin !== this.currentPlugin && this.promisedPatches.length) {
      const promises = this.promisedPatches.map(p => p.value); // Waits for all to settle instead of Promise.all which stops on rejection

      return Promise.all(promises.map(promise => promise.then(_noop.default, _noop.default))).then(() => this.dispatch());
    } // Ok, run the plugin


    return executePlugin();

    function executePlugin() {
      that.currentPlugin = plugin;
      const mutations = that.getCurrentMutations();
      const lastMutationIndex = that.mutations.length - 1;

      try {
        if (plugin.isGenerator) {
          // eslint-disable-next-line no-restricted-syntax
          for (const yieldedPatches of plugin(mutations, that.getLib())) {
            updatePatches(yieldedPatches);
          }
        } else {
          const newPatches = plugin(mutations, that.getLib());
          updatePatches(newPatches);
        }
      } catch (e) {
        console.error(e); // eslint-disable-line no-console

        updatePatches([Object.assign(Object.create(e), {
          plugin
        })]);
      } finally {
        that.updatePluginHistory(plugin, {
          mutationIndex: lastMutationIndex
        });
      }

      return that.dispatch();
    }

    function updatePatches(patches) {
      if (patches) {
        patches = _lib.default.fullyNormalizeArray(patches);
        that.updatePatches(patches, plugin);
      }
    }
  }

}

exports.SpecMap = SpecMap;

function mapSpec(opts) {
  return new SpecMap(opts).dispatch();
}

const plugins = {
  refs: _refs.default,
  allOf: _allOf.default,
  parameters: _parameters.default,
  properties: _properties.default
};
exports.plugins = plugins;