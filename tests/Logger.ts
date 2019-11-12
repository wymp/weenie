import { Service, withoutDependencies } from "../src/Service";
import * as fs from "fs";

const configFile = process.env.PWD + "/tests/config.logger.json";
const configLocalFile = process.env.PWD + "/tests/config.logger.local.json";
const logFile = process.env.PWD + "/test.logger.log";

describe("Logger", () => {
  before(() => {
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  });
  it("should log to our file", () => {
    const service = new Service(configFile, configLocalFile);
    service.run(
      withoutDependencies(async resources => {
        resources.logger.error("ERROR");
        resources.logger.info("INFO");
        resources.logger.debug("DEBUG");
      })
    );
  });
  after(() => {
    fs.unlinkSync(logFile);
  });
});
