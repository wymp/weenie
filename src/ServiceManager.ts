export const serviceManagement = (r: { config: { initializationTimeoutMs: number } }) => {
  // t is our timeout, extRes is an externalization of the "resolve" function for the timeout promise
  let t: any;
  let extRes: any;

  // Promisify the job wait timeout
  const initTimeout = new Promise<void>((res, rej) => {
    // Set the externalized resolver
    extRes = res;

    // Set the timeout
    t = setTimeout(() => {
      // prettier-ignore
      const e = new Error(
        `INITIALIZATION FAILED: Service took longer than configured ${
          Math.round(r.config.initializationTimeoutMs / 10) / 100
        } seconds to initialize and is therefore considered failed. Make sure you call the ` +
        `\`initialized()\` function on the resulting dependency container to mark that the ` +
        `process has successfully initialized.`
      );

      // Reject, but....
      rej(e);

      // We actually need to process.exit here because (for now) Node doesn't die on uncaught promise
      // exceptions. Note that the conditional gives us access to a hack that allows us to preserve
      // the process if we're in test mode.
      console.error(e);
      if (!(initTimeout as any).testMode) {
        process.exit(288);
      }
    }, r.config.initializationTimeoutMs);
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
        if (typeof isInitialized === "undefined") {
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
