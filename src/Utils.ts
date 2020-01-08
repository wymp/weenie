/**
 * Not worth adding another dependency, so we're doing deep merge ourselves here
 */
export const deepmerge = function<T>(base: any, ...add: Array<any>): T {
  if (add.length === 0 || (add.length === 1 && typeof add[0] === "undefined")) {
    return base;
  } else {
    for (let i = 0; i < add.length; i++) {
      base = _deepmerge(base, add[i]);
    }
    return base;
  }
};

const _deepmerge = function(base: any, add: any): any {
  if (typeof add === "undefined") {
    // If add is undefined, just return base
    return base;
  } else if (
    add === null ||
    typeof add === "function" ||
    (
      typeof add === "object" &&
      add.constructor.name !== "Object" &&
      add.constructor.name !== "Array"
    )
  ) {
    // If add is null or a function or a class instance, just return it as-is
    return add;
  } else if (typeof add === "object") {
    // Otherwise, if add is a simple object and base is nullish or less important, override it
    if (typeof base !== "object" || base === null || typeof base === "undefined") {
      if (typeof add.length !== "undefined") {
        // Array case - generate new array
        return add.map((v: any) => v);
      } else {
        // Object case - generate new object
        return Object.assign({}, add);
      }
    } else {
      // If add is an array....
      if (typeof add.length !== "undefined") {
        // Then if the base is also an array, merge the two
        if (typeof base.length !== "undefined") {
          return base.concat(add);
        } else {
          // Otherwise, override the base with the dest
          return add;
        }
      } else {
        // Add and base must both be simple objects, so merge them
        for (let x in add) {
          base[x] = _deepmerge(base[x], add[x]);
        }
        return base;
      }
    }
  } else {
    return add;
  }
};
