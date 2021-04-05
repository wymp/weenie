import * as fs from "fs";
import { deepmerge } from "./Utils";

// Returns a function that inflates config from the given files and validates it with the given
// validator
export const configFromFiles = <Config>(
  defaultPath: string,
  overridePath: string,
  validator: { check: (o: any) => Config }
): (() => { config: Config }) => {
  // This function is what's given to the `and` function to attach the "config" dependency
  return (): { config: Config } => {
    const def = fs.readFileSync(defaultPath, "utf8");
    const override = fs.existsSync(overridePath) ? fs.readFileSync(overridePath, "utf8") : "{}";

    try {
      return { config: <Config>validator.check(deepmerge(JSON.parse(def), JSON.parse(override))) };
    } catch (e) {
      if (e.name && e.name === "ValidationError") {
        throw new Error(
          `Invalid configuration: ${e.key ? `${e.key}: ` : ""}${e.message}` +
            (e.details ? `\nDetails: ${JSON.stringify(e.details, null, 2)}` : "")
        );
      } else {
        throw e;
      }
    }
  };
};

/**
 * Returns a function that inflates config from environment variables and validates it using the
 * given validator.
 *
 * To provide for corner cases, you may pass an explicit cast in the value itself in standard cast
 * notation (`<string>5` or `<string>true`, for example).
 */
export const configFromEnv = <Config>(
  env: { [k: string]: string | undefined },
  // This is expected to be a Runtypes validator, but could theoretically be anything
  validator: { check: (config: any) => Config },
  defaults?: string,
  ns: string = "APP",
  delimiter: string = "_"
): (() => { config: Config }) => {
  // This function is what's given to the `and` function to attach the "config" dependency
  return (): { config: Config } => {
    let config: any;

    // First, get values from the environment
    const override = _configFromEnv(env, ns, delimiter);

    // If we passed a defaults file, get initial values from that and merge them in
    if (defaults) {
      config = deepmerge(JSON.parse(fs.readFileSync(defaults, "utf8")), override);
    } else {
      // Otherwise, just set config to the environment values
      config = override;
    }

    // Finally, check and set
    try {
      return { config: validator.check(config) };
    } catch (e) {
      if (e.name && e.name === "ValidationError") {
        throw new Error(
          `Invalid configuration: ${e.key ? `${e.key}: ` : ""}${e.message}` +
            (e.details ? `\nDetails: ${JSON.stringify(e.details, null, 2)}` : "")
        );
      } else {
        throw e;
      }
    }
  };
};

/**
 * This function does naive extraction of config values from the environment. It is a lower level
 * function that doesn't attempt to do any validation on the resulting config values. Vaidation is
 * expected to be done at higher levels.
 */
const _configFromEnv = (
  env: { [k: string]: string | undefined },
  ns: string = "APP",
  delimiter: string = "_"
) => {
  const regexp = new RegExp(`^${ns}${delimiter}`);
  const flat = Object.keys(env).reduce<{ [k: string]: string }>((agg, cur) => {
    if (cur.match(regexp)) {
      agg[cur.replace(regexp, "")] = env[cur]!;
    }
    return agg;
  }, {});
  return interpret(flat, delimiter);
};

/**
 * This function interprets the values provided in environment variables into actual native
 * javascript values. For example, it casts the string value `5` to the number 5 and it casts the
 * string value `true` to boolean true.
 *
 * To provide for corner cases, you may pass an explicit cast in the value itself in standard cast
 * notation (`<number>5` or `<boolean>true`, for example).
 */
const interpret = (
  flat: { [k: string]: string },
  delimiter: string = "_"
): { [k: string]: unknown } => {
  // For each of the keys in the flattened object...
  return Object.keys(flat).reduce<{ [k: string]: unknown }>((obj, k) => {
    // Explode the key into a path and alias our result object
    const path = k.split(delimiter);

    // Cast the value
    const cast = flat[k].match(/^<(number|string|boolean)>(.*)$/);
    const value =
      // Process as explicit cast if given
      cast
        ? cast[1] === "number"
          ? Number(cast[2])
          : cast[1] === "boolean"
          ? Boolean(nativize(cast[2]))
          : cast[2]
        : // Otherwise, try to infer what it might be and cast accordingly
          nativize(flat[k]);

    // Finally, place the value in the correct location in the tree
    // `current` will point to the current parent node being operated on as we move down the tree
    let current: any = obj;
    //let current: { [k: string]: unknown } | Array<unknown> = obj;

    // For each path part...
    for (let i = 0; i < path.length; i++) {
      // If the current path part looks like an integer, make it one (array index). Otherwise, use
      // it as-is.
      const part = `${parseInt(path[i])}` === path[i] ? parseInt(path[i]) : path[i];

      // If this is the last part, then set the value
      if (i === path.length - 1) {
        current[part] = value;
      } else if (!current.hasOwnProperty(part)) {
        // Otherwise, if we don't already have an object at this path, create one and keep going.
        // If the next part looks like an array index, then make the child an array
        if (typeof path[i + 1] === "number") {
          current[part] = [];
        } else {
          current[part] = {};
        }
      }

      // Set current to point to the next level down and loop around
      current = current[part];
    }

    // Return obj, now that it has been fleshed out with new subtrees and values
    return obj;
  }, {});
};

/**
 * Convert a string value into a native value
 */
const nativize = (v: string): string | boolean | number | null => {
  // Does it look like an int?
  return `${parseInt(v)}` === v
    ? Number(v)
    : // Does it look like a boolean?
    v === "true"
    ? true
    : v === "false"
    ? false
    : // Does it look null?
    v === "null"
    ? null
    : // Must be a string
      v;
};
