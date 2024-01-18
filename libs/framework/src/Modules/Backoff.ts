import { SimpleLoggerInterface } from "@wymp/ts-simple-interfaces";
import { JobManagerConfig } from "../Types";
import * as uuid from "uuid";

/**
 *
 *
 *
 *
 * Weenie function
 *
 *
 *
 *
 */

export const backoff = (type: "exponential" = "exponential") => {
  return (r: { config: JobManagerConfig }): { backoff: Backoff } => {
    switch (type) {
      case "exponential":
        return { backoff: new SimpleExponentialBackoff(r.config) };
      default:
        throw new Error(`Unknown backoff type ${type}`);
    }
  };
};

/**
 *
 *
 *
 *
 * Classes/Interfaces
 *
 *
 *
 *
 */

export interface Backoff {
  run(job: () => Promise<boolean>, log: SimpleLoggerInterface): Promise<boolean>;
}

export abstract class BaseBackoff {
  protected jobs: {
    [id: string]: number;
  } = {};
  protected abstract config: { maxJobWaitMs?: number | null; initialJobWaitMs?: number | null };

  public async run(
    job: () => Promise<boolean>,
    log: SimpleLoggerInterface,
    _jobId?: string
  ): Promise<boolean> {
    const jobId = _jobId || uuid.v4();
    return new Promise((res) => {
      log.info(`Beginning run sequence for job ${jobId}`);
      const runWithBackoff = () => {
        const maxJobWaitMs =
          typeof this.config.maxJobWaitMs !== "undefined"
            ? Number(this.config.maxJobWaitMs)
            : 259200000; // default to 3 days

        // If we've already waited enough, give up
        if (this.jobs[jobId] === maxJobWaitMs) {
          log.warning("Giving up waiting for job " + jobId + ". Requeuing.");
          if (this.jobs[jobId]) {
            delete this.jobs[jobId];
          }
          return res(false);
        }

        // Otherwise, calculate the next wait time, capping at maxJobWaitMs
        let nextWait = this.calculateNextWait(this.jobs[jobId] || null, log);
        if (nextWait > maxJobWaitMs) {
          nextWait = maxJobWaitMs;
        }

        // Now set a timer for the next round
        log.warning(
          "Handler for job " + jobId + " failed. Retrying in " + nextWait / 1000 + " seconds."
        );
        this.jobs[jobId] = nextWait;
        setTimeout(run, nextWait);
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
              runWithBackoff();
            }
          })
          .catch((e) => {
            log.error(`Error executing job ${jobId}: ${e}`);
            log.error(e.stack);
            runWithBackoff();
          });
      };

      run();
    });
  }

  /**
   * Calculate the next wait time for backoffs
   */
  protected abstract calculateNextWait(
    currentWait: number | null,
    log: SimpleLoggerInterface
  ): number;
}

export class SimpleExponentialBackoff extends BaseBackoff {
  protected config: { maxJobWaitMs?: number | null; initialJobWaitMs?: number | null };
  public constructor(config: { maxJobWaitMs?: number | null; initialJobWaitMs?: number | null }) {
    super();
    this.config = config;
  }

  protected calculateNextWait(currentWait: number | null, log: SimpleLoggerInterface): number {
    let nextWait: number = currentWait ? currentWait * 2 : this.config.initialJobWaitMs || 10;
    if (nextWait < 0) {
      log.warning(
        `Next wait was set to a negative number (${nextWait}). ` + `Resetting to default 10ms.`
      );
      nextWait = 10;
    }
    return nextWait;
  }
}
