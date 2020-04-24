import { configFromFiles, configFromEnv } from "../src/Config";
import * as rt from "runtypes";
import * as fs from "fs";

// Stub out file reader
let ConfigFileContents: string = "{}";
let ConfigOverrideContents: string = "{}";
let ConfigOverrideExists = true;
let ConfigFileNum: number = 1;
(fs.existsSync as any) = (f: string) => ConfigOverrideExists;
(fs.readFileSync as any) = (f: string) => {
  if (ConfigFileNum === 1) {
    ConfigFileNum++;
    return ConfigFileContents;
  } else {
    ConfigFileNum--;
    return ConfigOverrideContents;
  }
};

const testConfigValidator = rt.Record({
  a: rt.Record({
    one: rt.Literal(1),
    two: rt.String,
    three: rt.Boolean,
  }),
  b: rt.Boolean.Or(rt.Undefined).Or(rt.Null),
  c: rt.Literal("Exactly C"),
});
declare type TestConfig = rt.Static<typeof testConfigValidator>;

describe("Config functions", () => {
  describe("configFromFile", () => {
    const par =
      "NOTE: YOU MUST USE THE -i FLAG TO TELL JEST NOT TO RUN IN PARALLEL FOR THESE TESTS";
    beforeEach(() => {
      ConfigFileContents = JSON.stringify({
        a: {
          one: 1,
          two: "Two",
          three: true,
        },
        b: false,
        c: "Exactly C",
      });
      ConfigOverrideContents = "{}";
      ConfigOverrideExists = true;
    });

    test("Loads config from files", () => {
      const r = configFromFiles<TestConfig>("test", "test", testConfigValidator)();
      expect(r.config).toBeDefined();
      expect(r.config.a.one).toBe(1);
      expect(r.config.b).toBe(false);
      //expect(r.config.four).not.toBeDefined(); // < This should fail type-checking on uncomment
    });

    test("Can override default config", () => {
      ConfigOverrideContents = JSON.stringify({ a: { two: "Three" }, b: true });
      const r = configFromFiles<TestConfig>("test", "test", testConfigValidator)();
      expect(r.config).toBeDefined();
      expect(r.config.a.one).toBe(1);
      expect({ par, v: r.config.a.two }).toEqual({ par, v: "Three" });
      expect(r.config.b).toBe(true);
    });

    test("Skips override if file not exists", () => {
      ConfigOverrideContents = JSON.stringify({ a: { two: "Three" }, b: true });
      ConfigOverrideExists = false;
      const r = configFromFiles<TestConfig>("test", "test", testConfigValidator)();
      expect(r.config).toBeDefined();
      expect(r.config.a.one).toBe(1);
      expect({ par, v: r.config.a.two }).toEqual({ par, v: "Two" });
      expect(r.config.b).toBe(false);
    });
  });

  describe("configFromEnv", () => {
    beforeEach(() => {
      delete process.env.APP_a_one;
      delete process.env.APP_a_two;
      delete process.env.APP_a_three;
      delete process.env.APP_b;
      delete process.env.APP_c;
    });

    function setEnv() {
      process.env.APP_a_one = "1";
      process.env.APP_a_two = "Two";
      process.env.APP_a_three = "false";
      process.env.APP_b = "true";
      process.env.APP_c = "Exactly C";
    }

    [
      ["APP_a_one", "3", "a.one"],
      ["APP_a_two", "12345", "a.two"],
      ["APP_a_three", "string", "a.three"],
      ["APP_b", "string", "b"],
      ["APP_c", "Not C", "c"],
    ].map(testCase => {
      test(`should throw errors when ${testCase[0]} is ${testCase[1]}`, () => {
        // Set the config in the environment
        setEnv();

        // Make the invalidating adjustment
        if (testCase[1] === null) {
          delete process.env[<string>testCase[0]];
        } else {
          process.env[<string>testCase[0]] = testCase[1];
        }

        // Try it
        try {
          configFromEnv(testConfigValidator)();
          throw new Error("Fail");
        } catch (e) {
          expect(e.message).not.toBe("Fail");
          expect(e.message).toMatch(new RegExp(`^Invalid configuration: ${testCase[2]}:`));
        }
      });
    });

    [
      ["APP_b", null],
      ["APP_b", "null"],
      ["APP_a_three", "false"],
    ].map(testCase => {
      test(`should successfully draw config from environment`, () => {
        setEnv();
        if (testCase[1] === null) {
          delete process.env[<string>testCase[0]];
        } else {
          process.env[<string>testCase[0]] = testCase[1];
        }
        const { config } = configFromEnv<rt.Static<typeof testConfigValidator>>(
          testConfigValidator
        )();
        expect(config.a.one).toBe(1);
        expect(config.a.two).toBe("Two");
        expect(config.a.three).toBe(false);

        if (testCase[0] == "APP_b") {
          if (testCase[1] === null) {
            expect(config).not.toHaveProperty("b");
          } else {
            expect(config.b).toBe(null);
          }
        }

        expect(config.c).toBe("Exactly C");
      });
    });
  });
});
