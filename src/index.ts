import { frameworkConfigValidator, FrameworkConfig, Ander } from "./Types";
import * as rt from "runtypes";
import * as fs from "fs";
import { SimpleLoggerInterface, SimpleLogLevels } from "ts-simple-interfaces";

export function config<Config>(
  defaultPath: string,
  overridePath: string,
  validator: rt.Runtype
) {
  return function(r: any): { config: Config } {
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

  return { logger };
}

const deepmerge = Object.assign;

export function Weenie<BaseResources = {}>(resources?: BaseResources): Ander<BaseResources> {
  const r = <BaseResources> (resources ? resources : {});
  return <BaseResources & Ander<BaseResources>>deepmerge(
    r,
    {
      and: <I extends {}>(next: (r?: BaseResources) => I): Ander<BaseResources & I> => {
        const newResources = deepmerge(r, next(r));
        return Weenie<BaseResources & I>(newResources);
      }
    }
  );
}

const app = Weenie()
  .and(config<FrameworkConfig>("./config.example.json", "./config.local.json", frameworkConfigValidator))
  .and(logger);

app.logger.debug("Yay!!");
app.logger.notice(`Current environment: ${app.config.envType}`);

