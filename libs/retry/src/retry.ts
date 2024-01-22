import { SimpleLoggerInterface } from '@wymp/ts-simple-interfaces';
import { HttpError, ObstructionInterface } from '@wymp/http-errors';
import * as uuid from 'uuid';

type RecursiveOptional<T> = T extends object
  ? { [K in keyof T]?: RecursiveOptional<T[K]> | null | undefined }
  : T | null | undefined;

/**
 * The config required for the various retry algorithms
 */
export type RetryConfig = {
  exponential: {
    /** The initial delay, which will be doubled on every subsequent retry */
    initialWaitMs: number;
    /**
     * The max number of ms to retry before giving up and throwing a {@link RetryTimeoutError}. Note that this is an
     * absolute value which _includes_ time spent actually running the job. For example, if you set this to 1 hour and
     * your job takes 30 minutes to run, you will only get 2 retries.
     */
    maxRetryMs: number;
  };
  periodic: {
    /** The initial delay */
    initialWaitMs: number;
    /** The delay for all retries after the first one */
    intervalMs: number;
    /**
     * The max number of ms to retry before giving up and throwing a {@link RetryTimeoutError}. Note that this is an
     * absolute value which _includes_ time spent actually running the job. For example, if you set this to 1 hour and
     * your job takes 30 minutes to run, you will only get 2 retries.
     */
    maxRetryMs: number;
  };
};

/** Internal data stored about each job */
export type InternalJobData = {
  startTimeMs: number;
  numRetries: number;
  lastWaitMs: number | null;
};

/**
 * An obstruction that indicating that a job failed and providing some additional details
 */
export type RetryJobFailed = ObstructionInterface<
  'Job Failed',
  {
    jobId: string;
    elapsedMs: number;
    numRetries: number;
  }
>;

/** All avialable obstructions for this module */
export type RetryObstructions = RetryJobFailed;

/** The error that is thrown when a job times out */
export class RetryTimeoutError extends HttpError {
  public constructor(message: string, obstructions: RetryObstructions[]) {
    super(500, message, { subcode: 'RETRY_TIMEOUT', obstructions });
  }
}

/**
 * A Weenie function providing several options for job retry logic.
 *
 * These retry functions are intended to be used to retry failed jobs using a certain algorithm (e.g., exponential
 * backoff).
 *
 * **Available Config Options**
 *
 * * `config.retry.exponential.initialRetryMs` - This is the intitial time in ms that we should wait before retrying.
 *   once inside the retry loop, this quantity is doubled on each failed attempt, creating an exponential retry.
 * * `config.retry.exponential.maxRetryMs` - Maximum time to wait in ms before the application should stop retrying
 *   and throw a {@link RetryTimeoutError}. Note that this is an absolute value which _includes_ time spent actually
 *   running the job. For example, if you set this to 1 hour and your job takes 30 minutes to run, you will only get 2
 *   retries.
 * * `config.retry.periodic.initialWaitMs` - This is the time in ms that we should wait before our initial retry.
 *   Occasionally it is useful to have a longer or shorter initial wait time than for subsequent retries.
 * * `config.retry.periodic.intervalMs` - This is the time in ms that we should wait between retries after the first
 *   retry.
 * * `config.retry.periodic.maxRetryMs` - Maximum time to wait in ms before the application should stop retrying this
 *   job and throw a {@link RetryTimeoutError}. Note that this is an absolute value which _includes_ time spent
 *   actually running the job. For example, if you set this to 1 hour and your job takes 30 minutes to run, you will
 *   only get 2 retries.
 *
 * **Provided Dependencies**
 *
 * * `deps.retry.exponential` - A function that takes a job and a logger and runs the job with exponential backoff retry
 *   on failure.
 * * `deps.retry.periodic` - A function that takes a job and a logger and runs the job with periodic retries on failure.
 *
 * **NOTE:** Jobs should return `true` on success and `false` on failure. While returning `false` is functionally
 * equivalent to throwing an error, there is a subtle difference in meaning. `false` indicates that the job maintained
 * control of the process but could not complete its task. Throwing an error indicates that the job lost control of the
 * process. Perhaps a difference without a distinction, but possibly useful in some cases.
 */
export const retry = (deps: { config: { retry: RecursiveOptional<RetryConfig> } }) => {
  const exponential = new ExponentialBackoffRetry(deps.config.retry.exponential);
  const periodic = new PeriodicRetry(deps.config.retry.periodic);
  return {
    retry: {
      /**
       * An exponential backoff retry function. Pass a job, a logger and an optional jobId to this function and it will
       * retry failed jobs with exponential backoff. On success, the promise resolves with `true`. On failure, it throws
       * a {@link RetryTimeoutError}. See {@link retry} for more detailed information.
       */
      exponential: exponential.run.bind(exponential),
      /**
       * A perioedic retry function. Pass a job, a logger and an optional jobId to this function and it will retry
       * failed jobs with periodic retries. On success, the promise resolves with `true`. On failure, it throws a
       * {@link RetryTimeoutError}. See {@link retry} for more detailed information.
       */
      periodic: periodic.run.bind(periodic),
    },
  };
};

/**
 * An abstract base class for retry logic. This abstract class keeps track of things like the total time spent in the
 * retry loop, the number of retry attempts made, and the start time of the job so that derivative classes can implement
 * their own retry logic based on these figures.
 */
export abstract class BaseRetry {
  /** A map of job ids to data about the job */
  protected jobs: { [id: string]: InternalJobData } = {};
  protected abstract config: {
    maxRetryMs: number;
  };

  /** Run a job, retrying on failure according to the logic of the concrete class  used. */
  public async run(job: () => Promise<boolean>, log: SimpleLoggerInterface, _jobId?: string): Promise<boolean> {
    const jobId = _jobId || uuid.v4();
    return new Promise((res, rej) => {
      log.info(`Beginning run sequence for job ${jobId}`);
      const runWithRetry = () => {
        const { maxRetryMs } = this.config;
        const jobData: InternalJobData = this.jobs[jobId] ?? {
          startTimeMs: Date.now(),
          numRetries: 0,
          lastWaitMs: null,
        };

        // If we've already waited enough, give up
        const elapsedMs = Date.now() - jobData.startTimeMs;
        if (elapsedMs >= maxRetryMs) {
          log.warning('Giving up waiting for job ' + jobId);
          if (this.jobs[jobId]) {
            delete this.jobs[jobId];
          }
          const text = 'Job ' + jobId + ' timed out after ' + elapsedMs / 1000 + ' seconds';
          rej(
            new RetryTimeoutError(text, [
              {
                code: 'Job Failed',
                text,
                data: {
                  jobId,
                  elapsedMs,
                  numRetries: jobData.numRetries,
                },
              },
            ]),
          );
          return;
        }

        // Otherwise, calculate the next wait time, capping at maxJobWaitMs
        let nextWaitMs = this.calculateNextWait(jobData, log);

        // If our next wait will bring us over our max, adjust it to fit
        const nextElapsedMs = Date.now() + nextWaitMs - jobData.startTimeMs;
        if (nextElapsedMs > maxRetryMs) {
          nextWaitMs -= nextElapsedMs - maxRetryMs;
        }

        // Now set a timer for the next round
        log.warning('Handler for job ' + jobId + ' failed. Retrying in ' + nextWaitMs / 1000 + ' seconds.');
        jobData.lastWaitMs = nextWaitMs;
        jobData.numRetries++;
        this.jobs[jobId] = jobData;
        setTimeout(run, nextWaitMs);
      };

      // Encapsulate running logic so we can rerun it
      const run = () => {
        job()
          .then((result) => {
            if (result === true) {
              log.info(`Job ${jobId} successful. Returning true.`);
              if (this.jobs[jobId]) {
                delete this.jobs[jobId];
              }
              return res(result);
            } else {
              log.info(`Job ${jobId} failed. Trying again.`);
              runWithRetry();
            }
          })
          .catch((e) => {
            log.error(`Error executing job ${jobId}: ${e}`);
            log.error(e.stack);
            runWithRetry();
          });
      };

      run();
    });
  }

  /** Calculate the next wait time for retrys */
  protected abstract calculateNextWait(jobData: InternalJobData, log: SimpleLoggerInterface): number;
}

/** An exponential backoff retry mechanism */
export class ExponentialBackoffRetry extends BaseRetry {
  protected config: RetryConfig['exponential'];
  public constructor(config: RecursiveOptional<RetryConfig['exponential']> | null | undefined) {
    super();
    this.config = {
      initialWaitMs: config?.initialWaitMs ?? 10,
      maxRetryMs: config?.maxRetryMs ?? 3600000, // default to 1 hour
    };
  }

  protected calculateNextWait(jobData: InternalJobData, log: SimpleLoggerInterface): number {
    let nextWait: number = jobData.lastWaitMs ? jobData.lastWaitMs * 2 : this.config.initialWaitMs;
    if (nextWait < 0) {
      log.warning(`Next wait was set to a negative number (${nextWait}). ` + `Resetting to default 10ms.`);
      nextWait = 10;
    }
    return nextWait;
  }
}

/** A simple periodic retry mechanism */
export class PeriodicRetry extends BaseRetry {
  protected config: RetryConfig['periodic'];
  public constructor(config: RecursiveOptional<RetryConfig['periodic']> | null | undefined) {
    super();
    const intervalMs = config?.intervalMs ?? config?.initialWaitMs ?? 5000;
    this.config = {
      initialWaitMs: config?.initialWaitMs ?? intervalMs,
      intervalMs,
      maxRetryMs: config?.maxRetryMs ?? 300_000, // default to 5 minutes
    };
  }

  protected calculateNextWait(jobData: InternalJobData, log: SimpleLoggerInterface): number {
    let nextWait =
      jobData.lastWaitMs === null
        ? this.config.initialWaitMs
        : jobData.lastWaitMs === this.config.initialWaitMs
          ? this.config.intervalMs
          : jobData.lastWaitMs;
    if (nextWait < 0) {
      log.warning(`Next wait was set to a negative number (${nextWait}). ` + `Resetting to default 10ms.`);
      nextWait = 10;
    }
    return nextWait;
  }
}
