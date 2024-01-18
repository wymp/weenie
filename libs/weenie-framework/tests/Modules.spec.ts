import * as M from "../src/Modules";
import { SimpleLoggerInterface } from "@wymp/ts-simple-interfaces";
import { MockSimpleLogger } from "@wymp/ts-simple-interfaces-testing";

describe("Logger", () => {
  let mockConsole: any;

  beforeEach(() => {
    mockConsole = {
      debug: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  it("should log messages", async () => {
    const { logger: log } = M.logger({ logLevel: "debug" }, mockConsole);

    log.debug("DEBUG");
    log.info("INFO");
    log.notice("NOTICE");
    log.warning("WARNING");
    log.error("ERROR");
    log.alert("ALERT");
    log.critical("CRITICAL");
    log.emergency("EMERGENCY");

    const ts = "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z";
    expect(mockConsole.debug.mock.calls[0][0]).toMatch(new RegExp(`^${ts} \\[debug\\]:     DEBUG`));
    expect(mockConsole.info.mock.calls[0][0]).toMatch(new RegExp(`^${ts} \\[info\\]:      INFO`));
    expect(mockConsole.log.mock.calls[0][0]).toMatch(new RegExp(`^${ts} \\[notice\\]:    NOTICE`));
    expect(mockConsole.warn.mock.calls[0][0]).toMatch(
      new RegExp(`^${ts} \\[warning\\]:   WARNING`)
    );
    expect(mockConsole.error.mock.calls[0][0]).toMatch(new RegExp(`^${ts} \\[error\\]:     ERROR`));
    expect(mockConsole.error.mock.calls[1][0]).toMatch(new RegExp(`^${ts} \\[alert\\]:     ALERT`));
    expect(mockConsole.error.mock.calls[2][0]).toMatch(
      new RegExp(`^${ts} \\[critical\\]:  CRITICAL`)
    );
    expect(mockConsole.error.mock.calls[3][0]).toMatch(
      new RegExp(`^${ts} \\[emergency\\]: EMERGENCY`)
    );
  });

  it("should not log below the given log level", async () => {
    const d = M.logger({ logLevel: "warning" }, mockConsole);
    const log = d.logger;

    log.debug("DEBUG");
    log.info("INFO");
    log.notice("NOTICE");
    log.warning("WARNING");
    log.error("ERROR");
    log.alert("ALERT");
    log.critical("CRITICAL");
    log.emergency("EMERGENCY");

    expect(mockConsole.debug.mock.calls).toHaveLength(0);
    expect(mockConsole.info.mock.calls).toHaveLength(0);
    expect(mockConsole.log.mock.calls).toHaveLength(0);
    expect(mockConsole.warn.mock.calls).toHaveLength(1);
    expect(mockConsole.error.mock.calls).toHaveLength(4);
  });
});

describe("Cron Module", () => {
  describe("Cron Class", () => {
    let r: {
      logger: MockSimpleLogger;
      svc?: { initTimeout: Promise<unknown>; initialized: (i?: true) => boolean };
    };
    let c: M.Cron;

    beforeEach(() => {
      r = { logger: new MockSimpleLogger({ outputMessages: false }) };
    });
    afterEach(() => {
      c.kill();
    });

    // NOTE: The "without svc dependency" version of this test can be flakey because the cronjob fires _on the second,_
    // meaning that occasionally it will fire more than the expected number of times because of the extra space we have
    // to build into the test.
    [false, true].map((svc) => {
      test(`should successfully run clock cronjobs ${
        svc ? `with` : `without`
      } svc dependency`, async () => {
        const wait: number = 3025;
        let actual: number = 0;
        let expected: number = 3;

        if (svc) {
          expected = 2;
          r.svc = {
            initTimeout: new Promise<void>((r) => setTimeout(() => r(), 1000)),
            initialized: (i?: true) => !!i,
          };
        }

        // Get a cron manager
        const { cron } = M.cron(r);
        c = cron;

        c.register({
          name: "Test Job",
          spec: "* * * * * *",
          handler: (log: SimpleLoggerInterface) => {
            actual++;
            return Promise.resolve(true);
          },
        });

        await new Promise<void>((res) => setTimeout(() => res(), wait));
        expect(actual).toBe(expected);
      });
    });
  });

  describe("MockCron Class", () => {
    test("should keep records on registered cronjobs without executing them", () => {
      let called: boolean = false;
      const job = {
        name: "testcron",
        spec: "* * * * * *",
        handler: (log: SimpleLoggerInterface) => {
          called = true;
          return Promise.resolve(true);
        },
      };

      // Register a job and make sure it doesn't get called
      const c = new M.MockCron();
      c.register(job);
      expect(called).toBe(false);
      expect(c.jobs).toHaveLength(1);
      expect(c.jobs[0]!.killed).toBe(false);

      // Typescript: Make sure we can't inappropriately kill a job (uncomment this)
      //c.jobs[0]!.killed = true;

      // Make sure we can target our killing
      c.kill("not-a-job");
      expect(c.jobs[0]!.killed).toBe(false);

      // Kill all jobs and make sure they get marked as killed
      c.kill();
      expect(c.jobs[0]!.killed).toBe(true);
    });
  });
});

describe("Backoff", () => {
  describe("SimpleExponentialBackoff", () => {
    const log = new MockSimpleLogger({ outputMessages: false });

    it("should execute with exponential backoff on fail", async function () {
      const backoff = new M.SimpleExponentialBackoff({ initialJobWaitMs: 20 });
      let n = 0;
      const results: Array<[number, number]> = [];

      let last = Date.now();
      await backoff.run(async () => {
        last += n;
        results.push([Date.now(), last]);
        n = n === 0 ? 20 : n * 2;
        return n > 320;
      }, log);

      expect(results.length).toBe(6);
      const radius = 15;
      for (let i = 0; i < results.length; i++) {
        const [val, targ] = results[i];
        const msg = `Failed at round ${i + 1}. Actual is ${val}, target is ${targ}, +/-${radius}`;
        expect({ msg, val: val >= targ - radius && val <= targ + radius }).toEqual({
          msg,
          val: true,
        });
      }
    });
  });
});
