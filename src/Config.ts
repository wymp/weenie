import * as rt from "runtypes";
import * as fs from "fs";
import { deepmerge } from "./Utils";

// Returns a function that inflates config from the given parameters
export function config<Config>(
  defaultPath: string,
  overridePath: string,
  validator: rt.Runtype
): () => { config: Config } {
  // This function is what's given to `and` to attach config
  return function(): { config: Config } {
    const def = fs.readFileSync(defaultPath, "utf8");
    const override = fs.existsSync(overridePath) ? fs.readFileSync(overridePath, "utf8") : "{}";

    try {
      return { config: <Config>validator.check(deepmerge(JSON.parse(def), JSON.parse(override))) };
    } catch (e) {
      // TODO: Format error
      console.log(e.message);
      process.exit(1);
    }
  }
}

