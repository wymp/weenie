import { ServiceManagerConfig } from "./Types";

export const serviceManagement = (r: { config: ServiceManagerConfig }) => {
  let t: any;
  let extRes: any;

  const _initTimeout = new Promise((res, rej) => {
    extRes = res;
    t = setTimeout(
      () => {
        rej(new Error(
          `INITIALIZATION FAILED: Service took longer than configured ${
            Math.round(r.config.initializationTimeoutMs / 10)/100
          } seconds to initialize and is therefore considered failed. Make sure you call the ` +
          `\`initialized()\` function on the resulting dependency container to mark that the ` +
          `process has successfully initialized.`
        ));
      },
      r.config.initializationTimeoutMs
    );
  });

  return {
    _initTimeout,
    initialized: () => {
      if (t) {
        clearTimeout(t)
        t = null;
      }
      extRes();
    }
  }
}
