import { SimpleLoggerInterface, TaggedLogger } from '@wymp/ts-simple-interfaces';
import { CronJob } from 'cron';

/** An interface describing a cronjob */
export interface CronjobInterface {
  /** The name of the job */
  name: string;
  /** The cronspec. See https://www.npmjs.com/package/cron#cron-patterns for details */
  spec: string;
  /**
   * The timezone in which to operate. Defaults to system timezone. See
   * https://github.com/moment/luxon/blob/master/docs/zones.md#specifying-a-zone for options.
   */
  tz?: string;
  /** The job to run */
  handler: (log: SimpleLoggerInterface) => Promise<boolean>;
  /**
   * A flag indicating that this job should overwrite another job in the crontab already registered with this name. If
   * this flag is not passed and this job has the same name as another job already registered, the system will log a
   * warning and add a suffix to the name to avoid collision.
   */
  overwrite?: boolean;
}

/** The public interface of a cronjob. This is what the Weenie function returns as a dependency */
export interface CronInterface {
  /** Register a new cronjob or cronjobs */
  register(jobOrJobs: CronjobInterface | Array<CronjobInterface>): void;
  /** Kill the cronjob identified by `name`, or all cronjobs if `name` not specified */
  kill(name?: string): void;
}

/** The dependencies that the cron weenie function requires */
export type CronDeps = {
  log: SimpleLoggerInterface;
  svc?: {
    whenReady: Promise<unknown>;
    onShutdown: (task: () => Promise<void>) => void;
  };
};

/**
 * WEENIE FUNCTION - Returns a dependency that can be used to register and/or kill cronjobs
 *
 * Note that if this dependecy is used in conjunction with weenie's serviceManager, it will kill all cronjobs on SIGINT
 * and SIGTERM (if the serviceManager is configured to handle those signals).
 *
 * Cronjobs should return `true` on success. They may return `false` on failure or throw an error. If they throw an
 * error, the error will be logged and the cronjob will be considered to have failed. Returning `false` may be
 * preferable as it gives you a little more control over how you log and communicate errors.
 *
 * Note that you may wish to use a retry strategy (such as the ones provided by the Weenie framework) to retry cronjobs
 * on failure.
 *
 * @example
 * ```ts
 * import { cron } from '@wymp/weenie-cron';
 * import { Weenie, logger, serviceManager } from '@wymp/weenie-framework';
 * import { config } from './config';
 *
 * const deps = Weenie({ config })
 *   .and(logger)
 *   .and(serviceManager)
 *   .and(cron)
 *   .done((d) => d);
 *
 * deps.cron.register({
 *   name: 'my-cronjob',
 *   spec: '0 0 * * *',
 *   handler: async (log) => {
 *     log.info('Running my cronjob');
 *     return true;
 *   },
 *   'America/New_York'
 * });
 *
 * deps.svc.declareReady();
 * ```
 */
export const cron = (deps: CronDeps) => {
  return { cron: new Cron(deps.log, deps.svc?.whenReady, deps.svc?.onShutdown) };
};

/** A weenie function providing the MockCron class in place of the Cron class, to make it easy to test cronjobs */
export const mockCron = () => ({ cron: new MockCron() });

/**
 * A cronjob manager. This class is used by the cron weenie function to manage cronjobs. It can also be used directly.
 *
 * Note that if this class is used in conjunction with weenie's serviceManager, it will kill all cronjobs on SIGINT
 * and SIGTERM (if the serviceManager is configured to handle those signals).
 *
 * Additionally note that you can delay the registering and starting of cronjobs until all dependencies are successfully
 * registered and initialized by passing a promise to the constructor. If you don't pass a promise, cronjobs that are
 * registered will be started immediately.
 */
export class Cron implements CronInterface {
  /**
   * Tracks active cronjobs
   */
  protected crontab: {
    [name: string]: {
      job: CronjobInterface;
      provider: CronJob | null;
    };
  } = {};

  /**
   * Captures the initialization timeout
   */
  protected ready: boolean = false;

  public constructor(
    /** A logger for the cron system to use */
    protected log: SimpleLoggerInterface,
    /** An optional promise used to await initialization of cronjobs */
    protected initWait?: Promise<unknown>,
    /** An optional function used to shut down all cronjobs on service shutdown */
    onShutdown?: (task: () => Promise<void>) => void,
  ) {
    // On initialization, initialize any currently uninitialized cronjobs
    if (initWait) {
      initWait.then(() => {
        this.ready = true;
        for (const name in this.crontab) {
          if (this.crontab[name].provider === null) {
            this.initJob(this.crontab[name].job);
          }
        }
      });
    } else {
      this.ready = true;
    }

    // If the onShutdown function is provided, add a kill-all task to the shutdown sequence
    onShutdown?.(async () => this.kill());
  }

  /**
   * Registers cron jobs in the crontab and initializes them if the service is ready
   */
  public register(jobOrJobs: CronjobInterface | Array<CronjobInterface>): void {
    const jobs = Array.isArray(jobOrJobs) ? jobOrJobs : [jobOrJobs];

    // Add jobs to crontab
    for (const job of jobs) {
      if (this.crontab[job.name]) {
        if (!job.overwrite) {
          // If we're not overwriting, log a warning and find a suitable suffix
          this.log.warning(
            `CRON: Cronjob with name '${job.name}' already registered. Adding suffix to avoid collision, but you ` +
              `should consider using a different name to avoid ambiguity. Additionally, you can set the 'overwrite' ` +
              `flag to true to overwrite the existing job.`,
          );
          let suffix = 1;
          while (this.crontab[`${job.name}-${suffix}`]) {
            suffix++;
          }
          job.name = `${job.name}-${suffix}`;
        } else {
          // Kill the existing job before ovewriting
          this.crontab[job.name].provider?.stop();
        }
      }

      // Add the job to the crontab and initialize the job
      this.crontab[job.name] = {
        job,
        provider: null,
      };
      this.initJob(job);
    }
  }

  protected initJob(job: CronjobInterface) {
    if (this.ready) {
      this.log.info(`CRON: Registering cronjob ${job.name}`);
      const log = new TaggedLogger(`CRON: ${job.name}: `, this.log);

      // Roll the job into a structure with logging (has to return void, so we're swallowing errors
      const cronjob = () => {
        // Try running the job and log failures
        log.debug(`Running`);
        job
          .handler(log)
          .then((result) => {
            if (!result) {
              log.error(`Cronjob failed.`);
            } else {
              log.notice(`Completed successfully`);
            }
          })
          .catch((e) => {
            log.error(`Cronjob failed: ${e.message}`);
            log.debug(e.stack);
          });
      };

      // Finally, kick off the job using the cron provider
      this.crontab[job.name].provider = new CronJob(job.spec, cronjob, null, true, job.tz);
    }
  }

  /**
   * Kill one or all jobs
   */
  public kill(name?: string): void {
    if (name) {
      if (typeof this.crontab[name] !== 'undefined') {
        const p = this.crontab[name].provider;
        if (p !== null) {
          p.stop();
        }
      }
    } else {
      for (const n in this.crontab) {
        const p = this.crontab[n].provider;
        if (p !== null) {
          p.stop();
        }
      }
    }
  }
}

/**
 * A class that can be used to more easily test cronjobs. You'll generally use this in testing an application to simply
 * verify that the application correctly registers the cronjobs you expect it to. This will not test that the cronjobs
 * actually run, as that is expected to be fully tested by the `cron` package that this system uses.
 */
export class MockCron implements CronInterface {
  private _jobs: Array<CronjobInterface & { killed: boolean }> = [];

  public get jobs(): Array<CronjobInterface & { readonly killed: boolean }> {
    return this._jobs;
  }

  public register(jobOrJobs: CronjobInterface | Array<CronjobInterface>): void {
    if (!Array.isArray(jobOrJobs)) {
      this._jobs.push({ ...jobOrJobs, killed: false });
    } else {
      this._jobs = this._jobs.concat(jobOrJobs.map((j) => ({ ...j, killed: false })));
    }
  }
  public kill(name?: string): void {
    (name ? this._jobs.filter((j) => j.name === name) : this._jobs).map((j) => (j.killed = true));
  }
}
