import { Cron, cron, CronDeps, MockCron } from '../src/cron';
import { SimpleLoggerInterface } from '@wymp/ts-simple-interfaces';
import { MockSimpleLogger } from '@wymp/ts-simple-interfaces-testing';

describe('Cron Module', () => {
  describe('Cron Class', () => {
    let deps: CronDeps;
    let c: Cron;

    beforeEach(() => {
      deps = { log: new MockSimpleLogger({ outputMessages: false }) };
    });
    afterEach(() => {
      c.kill();
    });

    // NOTE: The "without svc dependency" version of this test can be flakey because the cronjob fires _on the second,_
    // meaning that occasionally it will fire more than the expected number of times because of the extra space we have
    // to build into the test.
    [false, true].map((svc) => {
      test(`should successfully run clock cronjobs ${svc ? `with` : `without`} svc dependency`, async () => {
        const wait = 3025;
        let actual = 0;
        let expected = 3;

        if (svc) {
          expected = 2;
          deps.svc = {
            whenReady: new Promise<void>((r) => setTimeout(() => r(), 1000)),
            onShutdown: jest.fn(),
          };
        }

        // Get a cron manager
        const d = cron(deps);
        c = d.cron;

        c.register({
          name: 'Test Job',
          spec: '* * * * * *',
          handler: async (log: SimpleLoggerInterface) => {
            actual++;
            return true;
          },
        });

        await new Promise<void>((res) => setTimeout(() => res(), wait));
        expect(actual).toBe(expected);
      });
    });
  });

  describe('MockCron Class', () => {
    test('should keep records on registered cronjobs without executing them', () => {
      let called: boolean = false;
      const job = {
        name: 'testcron',
        spec: '* * * * * *',
        handler: (log: SimpleLoggerInterface) => {
          called = true;
          return Promise.resolve(true);
        },
      };

      // Register a job and make sure it doesn't get called
      const c = new MockCron();
      c.register(job);
      expect(called).toBe(false);
      expect(c.jobs).toHaveLength(1);
      expect(c.jobs[0]!.killed).toBe(false);

      // Typescript: Make sure we can't inappropriately kill a job (uncomment this)
      //c.jobs[0]!.killed = true;

      // Make sure we can target our killing
      c.kill('not-a-job');
      expect(c.jobs[0]!.killed).toBe(false);

      // Kill all jobs and make sure they get marked as killed
      c.kill();
      expect(c.jobs[0]!.killed).toBe(true);
    });
  });
});
