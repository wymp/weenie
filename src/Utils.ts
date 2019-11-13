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
    return base;
  } else if (add === null) {
    return add;
  } else if (typeof add === "object") {
    if (typeof base !== "object" || base === null || typeof base === "undefined") {
      if (typeof add.length !== "undefined") {
        return add.map((v: any) => v);
      } else {
        return Object.assign({}, add);
      }
    } else {
      if (typeof add.length !== "undefined") {
        if (typeof base.length !== "undefined") {
          return base.concat(add);
        } else {
          return add;
        }
      } else if (add.constructor && add.constructor.name === "Object") {
        for (let x in add) {
          base[x] = _deepmerge(base[x], add[x]);
        }
        return base;
      } else {
        return add;
      }
    }
  } else {
    return add;
  }
};
