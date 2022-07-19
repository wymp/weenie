import { deepmerge } from "@wymp/weenie-base";
import * as fs from "fs";

/**
 * Returns a type-checked config dependency created from environment variables and static files and
 * validates it using the given validator.
 *
 * To provide for corner cases, you may pass an explicit cast in the variable value itself, in
 * standard cast notation: `APP_my_var="<string>5"` or `APP_db_port="<string>3306"`.
 *
 * @param ns The prefix used to denote configuration variables for this application. Usually
 * something like APP_ or APP_CONFIG_
 * @param src A collection of potential sources from which to draw config. They are added in the
 * following order, where earlier sources are overridden by later sources:
 *
 *   defaultsFile < localsFile < env < secretsDir
 *
 * @param validator A validator that ensures the final config conforms to expectations. Usually a
 * [runtype](https://github.com/pelotom/runtypes)
 * @param delimiter If necessary, you may change the delimiter from the default "_" to something
 * else. This determines how config variables are nested. For example, the variable
 * `APP_my_db_port=3306` is usually converted to `{ my: { db: { port: 3306 } } }`. However, if you set
 * the `ns` parameter to `MYAPP0` and the `delimiter` parameter to `0`, then the value
 * `MYAPP0my_db0port=3306` would be converted to `{ my_db: { port: 3306 } }`.
 * @returns config A fully inflated and type-checked config dependency.
 */
export const config = <Config>(
  ns: string,
  src: {
    /** The collection of environment variables (usually process.env) */
    env?: { [k: string]: string | undefined };
    /** Optional path to a file supplying default config values */
    defaultsFile?: string;
    /**
     * Optional path to a file supplying config overrides that are not checked into version control.
     * (This is for development convenience.)
     */
    localsFile?: string;
    /**
     * A directory containing configs, one per file. File names are expected to comply with the same
     * rules as environment variables, and file contents are also processed in the same way as
     * env vars (i.e., with possible type-casts). This option is typically used with Docker/K8s
     * secrets.
     */
    secretsDir?: string;
  },
  validator: { check: (config: any) => Config },
  delimiter: string = "_"
): { config: Config } => {
  // Get values from environment and both files, if applicable
  const vals = [
    src.defaultsFile && fs.existsSync(src.defaultsFile)
      ? JSON.parse(fs.readFileSync(src.defaultsFile, "utf8"))
      : {},
    src.localsFile && fs.existsSync(src.localsFile)
      ? JSON.parse(fs.readFileSync(src.localsFile, "utf8"))
      : {},
    src.secretsDir && fs.existsSync(src.secretsDir)
      ? _configFromEnv(inflateSecretsDir(src.secretsDir), ns, delimiter)
      : {},
    src.env ? _configFromEnv(src.env, ns, delimiter) : {},
  ];

  // Now combine them all together
  const config = deepmerge(vals[0], vals[1], vals[2], vals[3]);

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

/**
 * Get config from files on disk
 *
 * @deprecated Use `config` instead.
 * @param defaultsFile The path of the file with default configs (should be version controlled)
 * @param localsFile The path of the file with local overrides (should NOT be version controlled)
 * @param validator A runtype validator that ensures the input conforms to expectations.
 * @returns A weenie function that can be used to add a config dependency.
 */
export const configFromFiles = <Config>(
  defaultsFile: string,
  localsFile: string,
  validator: { check: (o: any) => Config }
): (() => { config: Config }) => {
  return () => config<Config>("APP_", { defaultsFile, localsFile }, validator);
};

/**
 * Returns a function that inflates config from environment variables and validates it using the
 * given validator.
 *
 * To provide for corner cases, you may pass an explicit cast in the value itself in standard cast
 * notation (`<string>5` or `<string>true`, for example).
 *
 * @deprecated Use `config` instead.
 * @param env The collection of environment variables (usually process.env)
 * @param validator A validator that ensures the final config conforms to expectations. Usually a
 * [runtype](https://github.com/pelotom/runtypes)
 * @param defaultsFile An optional file specifying default values
 * @param ns The prefix used to denote configuration variables for this application. Usually
 * something like APP_ or APP_CONFIG_
 * @param delimiter If necessary, you may change the delimiter from the default "_" to something
 * else. This determines how config variables are nested. For example, the variable
 * `APP_my_db_port=3306` is usually converted to `{ my: { db: { port: 3306 } } }`. However, if you set
 * the `ns` parameter to `MYAPP0` and the `delimiter` parameter to `0`, then the value
 * `MYAPP0my_db0port=3306` would be converted to `{ my_db: { port: 3306 } }`.
 */
export const configFromEnv = <Config>(
  env: { [k: string]: string | undefined },
  // This is expected to be a Runtypes validator, but could theoretically be anything
  validator: { check: (config: any) => Config },
  defaultsFile?: string,
  ns: string = "APP",
  delimiter: string = "_"
): (() => { config: Config }) => {
  if (ns[ns.length - 1] !== "_") {
    ns += "_";
  }
  return () => config<Config>(ns, { env, defaultsFile }, validator, delimiter);
};

/**
 * Takes a directory and iterates (non-recusrively) through the files in that directory, using the
 * file names and file contents to build a hash that is compatible with the configFromEnv function.
 *
 * @param path The path to the directory containing secret files
 * @returns env A key-value hash of the contents of the directory
 */
const inflateSecretsDir = (path: string): { [k: string]: string | undefined } => {
  const env: { [k: string]: string | undefined } = {};
  fs.readdirSync(path).map(f => {
    env[f] = fs.readFileSync(f, "utf8");
  });
  return env;
};

/**
 * This function does naive extraction of config values from the environment. It is a lower level
 * function that doesn't attempt to do any validation on the resulting config values. Vaidation is
 * expected to be done at higher levels.
 */
const _configFromEnv = (
  env: { [k: string]: string | undefined },
  ns: string = "APP_",
  delimiter: string = "_"
) => {
  const regexp = new RegExp(`^${ns}`);
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
