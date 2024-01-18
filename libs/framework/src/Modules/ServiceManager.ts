import { SimpleLoggerInterface } from '@wymp/ts-simple-interfaces';

/**
 * Adds some service management functionality to the application. See return specification for
 * documentation.
 *
 * **NOTE: THIS MODULE PRODUCES SIDE EFFECTS.** It adds a listener for `uncaughtException` on
 * `process` and kills the process with code 238 on uncaught exceptions.
 *
 * @param d Resources for adding this dependency
 * @returns A small collection of tools for managing the process, including a startup timeout and
 * some basic signal handling.
 */
export const serviceManagement = (d: {
  /** Config */
  config: {
    /** A number in milliseconds indicating how long to wait before killing the service */
    initializationTimeoutMs?: number;
  };

  /** Logger */
  logger?: SimpleLoggerInterface;
}) => {
  // t is our timeout, extRes is an externalization of the "resolve" function for the timeout promise
  let t: NodeJS.Timeout | null = null;
  let extRes: () => void;
  const initTimeoutMs = d.config.initializationTimeoutMs !== undefined ? d.config.initializationTimeoutMs : 5000;

  // Make sure that uncaught errors kill the process
  process.on('uncaughtException', (e: Error) => {
    const log = d.logger || console;
    log.error(`Uncaught exception: ${e.stack}`);
    log.error(`Shutting down`);
    process.exit(238);
  });

  // Promisify the job wait timeout
  const initTimeout = new Promise<void>((res, rej) => {
    // Set the externalized resolver
    extRes = res;

    // Set the timeout
    t = setTimeout(() => {
      // prettier-ignore
      const e = new Error(
        `INITIALIZATION FAILED: Service took longer than configured ${
          Math.round(initTimeoutMs / 10) / 100
        } seconds to initialize and is therefore considered failed. Make sure you call the ` +
        `\`initialized()\` function on the resulting dependency container to mark that the ` +
        `process has successfully initialized.`
      );

      // Reject
      rej(e);
    }, initTimeoutMs);
  });

  // Now return the new dependency, 'svc'
  return {
    svc: {
      // DEPRECATED - use 'ready' instead
      initTimeout,

      // Allows dependents to await the initialization timeout
      ready: initTimeout,

      // If called with no arguments, returns the current initialization state. If called with
      // 'true', clears the init timeout and resolves the initialization timeout promise
      initialized: (isInitialized?: true) => {
        if (typeof isInitialized === 'undefined') {
          return t === null;
        } else {
          if (t) {
            clearTimeout(t);
            t = null;
            extRes();
          }
          return true;
        }
      },
    },
  };
};
