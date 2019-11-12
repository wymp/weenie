import { frameworkConfigValidator, FrameworkConfig, Agg } from "./Types";
import * as rt from "runtypes";
import * as fs from "fs";
import { SimpleLoggerInterface, SimpleLogLevels } from "ts-simple-interfaces";

const deepmerge = Object.assign;

// Returns a function that inflates config from the given parameters
export function config<Config>(
  defaultPath: string,
  overridePath: string,
  validator: rt.Runtype
) {
  // This function is what's given to `and` to attach config
  return function(): { config: Config } {
    const def = fs.readFileSync(defaultPath, "utf8");
    const override = fs.existsSync(overridePath) ? fs.readFileSync(overridePath, "utf8") : "{}";

    try {
      return { config: <Config>validator.check(deepmerge(JSON.parse(def), JSON.parse(override))) };
    } catch (e) {
      // TODO: Format error
      throw e;
    }
  }
}

// Requires config and returns logger
export function logger(r: { config: FrameworkConfig }): { logger: SimpleLoggerInterface } {
  let logger = <SimpleLoggerInterface><any>{};
  const log = function(lvl: keyof SimpleLogLevels, msg: string) {
    console.log(`${lvl}: ${msg}`);
    return logger;
  }
  const getLog = function(lvl: keyof SimpleLogLevels) {
    return (msg: string) => log(lvl, msg);
  }

  logger.log = log;
  logger.debug = getLog("debug");
  logger.info = getLog("info");
  logger.notice = getLog("notice");
  logger.warning = getLog("warning");
  logger.error = getLog("error");
  logger.alert = getLog("alert");
  logger.critical = getLog("critical");
  logger.emergency = getLog("emergency");

  logger.debug(`Logger instantiated in env ${r.config.envName}`);

  return { logger };
}

// Framework function
export function Weenie<CurrentDeps = {}>(resources?: CurrentDeps): Agg<CurrentDeps> {
  const r = <CurrentDeps> (resources ? resources : {});
  return <Agg<CurrentDeps>>deepmerge(
    {},
    r,
    {
      and: <NewDeps extends {}>(
        next: (r?: CurrentDeps) => NewDeps
      ): Agg<CurrentDeps & NewDeps> => {
        const newResources = deepmerge(r, next(r));
        return Weenie<CurrentDeps & NewDeps>(newResources);
      }
    }
  );
}

// Example. This should not work because we KNOW that the `and` function returned by `Weenie()`
// requires a function whose argument is either undefined or {}, but the `logger` function has an
// argument of type { config: FrameworkConfig }.
//
// While the system does correctly aggregate the return of the logger function with the existing
// object, it does not throw an error on seeing the incompatible input types.
//
// (P.s., if you switch the logger and config clauses, it will both compile and run correctly)
const app = Weenie()
  .and(logger)
  .and(config<FrameworkConfig>("./config.example.json", "./config.local.json", frameworkConfigValidator))

app.logger.debug("Yay!!");
app.logger.notice(`Current environment: ${app.config.envType}`);

