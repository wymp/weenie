/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Not worth adding another dependency, so we're doing deep merge ourselves here
 */
export const deepmerge = function <T>(base: any, ...add: Array<any>): T {
  if (add.length === 0 || (add.length === 1 && typeof add[0] === 'undefined')) {
    return base;
  } else {
    for (let i = 0; i < add.length; i++) {
      base = _deepmerge(base, add[i]);
    }
    return base;
  }
};

const _deepmerge = function (base: any, add: any): any {
  if (typeof add === 'undefined') {
    // If add is undefined, just return base
    return base;
  } else if (
    add === null ||
    typeof add === 'function' ||
    (typeof add === 'object' && add.constructor.name !== 'Object' && add.constructor.name !== 'Array')
  ) {
    // If add is null or a function or a class instance, just return it as-is
    return add;
  } else if (typeof add === 'object') {
    // Otherwise, if add is a simple object and base is a primative or null, override it
    if (typeof base !== 'object' || base === null) {
      if (Array.isArray(add)) {
        // Array case - generate new array
        return add.map((v: any) => v);
      } else {
        // Object case - generate new object
        return _deepmerge({}, add);
      }
    } else {
      // If add is an array....
      if (typeof add.length !== 'undefined') {
        // Then if the base is also an array, merge the two
        if (typeof base.length !== 'undefined') {
          return base.concat(add);
        } else {
          // Otherwise, override the base with the dest
          return add;
        }
      } else {
        // Add and base must both be simple objects, so merge them
        for (const x in add) {
          // Special case: We've explicitly defined this key as "undefined" in the override object.
          // We should delete it from the base object.
          if (add[x] === undefined) {
            delete base[x];
          } else {
            base[x] = _deepmerge(base[x], add[x]);
          }
        }
        return base;
      }
    }
  } else {
    return add;
  }
};
