import * as rt from "runtypes";
import * as fs from "fs";
import { deepmerge } from "./Utils";

// Returns a function that inflates config from the given files and validates it with the given
// validator
export function configFromFiles<Config>(
  defaultPath: string,
  overridePath: string,
  validator: rt.Runtype
): () => { config: Config } {
  // This function is what's given to the `and` function to attach the "config" dependency
  return function(): { config: Config } {
    const def = fs.readFileSync(defaultPath, "utf8");
    const override = fs.existsSync(overridePath) ? fs.readFileSync(overridePath, "utf8") : "{}";

    try {
      return { config: <Config>validator.check(deepmerge(JSON.parse(def), JSON.parse(override))) };
    } catch (e) {
      if (e.name && e.name === "ValidationError") {
        throw new Error(`Invalid configuration: ${e.key}: ${e.message}`);
      } else {
        throw e;
      }
    }
  }
}

// Returns a function that inflates config from environment variables and validates it using the
// given validator
export function configFromEnv<Config>(
  // This is expected to be a Runtypes validator, but could theoretically be anything
  validator: { check: (config: any) => Config },
  ns: string = "APP",
  delimiter: string = "_",
): () => { config: Config } {
  // This function is what's given to the `and` function to attach the "config" dependency
  return function(): { config: Config } {
    const flat: { [k: string]: string } = {};
    Object.keys(process.env).map((k) => {
      const regexp = new RegExp(`^${ns}${delimiter}`);
      if (k.match(regexp)) {
        flat[k.replace(regexp, "")] = <string>process.env[k];
      }
    });
    const config = interpret(flat, delimiter);

    try {
      return { config: <Config>validator.check(config) };
    } catch (e) {
      if (e.name && e.name === "ValidationError") {
        throw new Error(`Invalid configuration: ${e.key}: ${e.message}`);
      } else {
        throw e;
      }
    }
  }
}

function interpret<T extends { [k: string]: unknown }>(
  flat: { [k: string]: string },
  delimiter: string = "_"
): T {
  // Prepare a fresh object
  const obj: { [k: string]: unknown } = {};

  // For each of the keys in the flattened object...
  Object.keys(flat).map((k) => {
    // Explode the key into a path and alias our result object
    const path = k.split(delimiter);
    let current: any = obj;

    // For each path part...
    for (let i = 0; i < path.length; i++) {
      // Get the current path part, making it an int, if applicable
      const part = `${parseInt(path[i])}` === path[i] ? parseInt(path[i]) : path[i];

      // If this is the last part, then set the value
      if (i === path.length - 1) {
        current[part] = `${parseInt(flat[k])}` === flat[k]
          ? parseInt(flat[k])
          : flat[k] === "true"
          ? true
          : flat[k] === "false"
          ? false
          : flat[k] === "null"
          ? null
          : flat[k];

      // Otherwise, if we don't already have an object at this path, create one and keep going
      } else if (!current.hasOwnProperty(part)) {
        if (typeof part === "number") {
          current[part] = [];
        } else {
          current[part] = {};
        }
      }

      // Set current to point to the next level down
      current = current[part];
    }
  });

  // Return the finished object
  return <T>obj;
}
