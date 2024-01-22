import { SimpleLoggerInterface } from '@wymp/ts-simple-interfaces';

/** The dependencies attached by this module */
export type ServiceManager = {
  svc: {
    /**
     * A promise that can be awaited by various dependents. When this promise resolves, it means all dependencies have
     * loaded successfully and the servie is ready to start.
     */
    whenReady: Promise<void>;

    /** A function used to declare that the service is ready */
    declareReady: () => void;

    /** Register a shutdown task, such as disconnecting from a database or terminating outstanding HTTP requests */
    onShutdown: (task: () => Promise<void>) => void;
  };
};

/** The dependencies necessary for the service manager to function */
export type ServiceManagerDeps = {
  config: {
    svc?: {
      /** A number in milliseconds indicating how long to wait before killing the service if `ready` is not called */
      initializationTimeoutMs?: number;
      /** Whether or not to handle shutdown. Default: false */
      handleShutdown?: boolean;
    };
  };

  /** Logger */
  log?: SimpleLoggerInterface;
};

type FakeProcess = {
  on: (signal: string, handler: (signal: string) => Promise<void>) => void;
  exit: (code: number) => void;
};

/**
 * Adds some service management functionality to the application. See return specification for documentation.
 *
 * WARNING: THIS MODULE MAY PRODUCE SIDE-EFFECTS. If `config.svc.handleShutdown` is true, it will add a signal
 * handler to the process that will run all registered shutdown tasks and call `process.exit(0)` when the process
 * receives a SIGINT or SIGTERM signal.
 *
 * **Available Config Options**
 *
 * * `config.svc.initializationTimeoutMs` - A number in milliseconds indicating how long to wait before killing the
 *   service. You application should call `deps.svc.declareReady()` when everything has been initialized. If this
 *   function is not called before `config.svc.initializationTimeoutMs`, the service is killed.
 * * `config.svc.handleShutdown` - Whether or not to handle shutdown on SIGINT and SIGTERM. Default: false. If true,
 *   registers a signal handler that will run all registered shutdown tasks and call `process.exit(0)` when the
 *   process receives a SIGINT or SIGTERM signal.
 *
 * **Provided Dependencies**
 *
 * * `svc.whenReady` - A promise that can be awaited by various dependents. When this promise resolves, it means all
 *   dependencies have loaded successfully and the servie is ready to work.
 * * `svc.declareReady` - A function used to declare that the service is ready. This should be called when all
 *   dependencies have been initialized successfully, all message and request handlers have been registered, all
 *   cronjobs started, etc.
 * * `svc.onShutdown` - Register a shutdown task, such as disconnecting from a database or terminating outstanding
 *   HTTP requests. These tasks will be run when the process receives a SIGINT or SIGTERM signal.
 *
 * @param d Resources for adding this dependency
 * @returns A small collection of tools for managing the process, including a startup timeout and
 * some basic signal handling.
 */
export const serviceManager = (d: ServiceManagerDeps, fakeProcess: FakeProcess): ServiceManager => {
  // A timeout that we'll use to kill the process if it doesn't initialize in time
  let startupTimeout: NodeJS.Timeout | null = null;
  // extRes is an externalization of the "resolve" function for the timeout promise
  let extRes: () => void;
  // The amount of time in milliseconds to wait before killing the process
  const initTimeoutMs = d.config.svc?.initializationTimeoutMs ?? 5000;

  // Shutdown handler
  const _process = fakeProcess ?? process;
  const shutdownTasks: (() => Promise<void>)[] = [];
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (!shuttingDown) {
      shuttingDown = true;
      const log = d.log ? d.log.notice.bind(d.log) : console.error;
      log(`Received ${signal} signal, shutting down gracefully`);
      await Promise.all(shutdownTasks.map((t) => t()));
      _process.exit(0);
    }
  };
  if (d.config.svc?.handleShutdown) {
    _process.on('SIGINT', shutdown);
    _process.on('SIGTERM', shutdown);
  }

  // Promisify the job wait timeout
  const whenReady = new Promise<void>((res, rej) => {
    // Set the externalized resolver
    extRes = res;

    // Set the timeout
    startupTimeout = setTimeout(async () => {
      const log = d.log ? d.log.emergency.bind(d.log) : console.error;
      log(
        `INITIALIZATION FAILED: Service took longer than configured ${
          Math.round(initTimeoutMs / 10) / 100
        } seconds to initialize and is therefore considered failed. Make sure you call the ` +
          `\`declareReady()\` function on the resulting dependency container to mark that the ` +
          `process has successfully initialized.`,
      );
      await shutdown('INIT_TIMEOUT');
    }, initTimeoutMs);
  });

  // Now return the new 'svc' dependency
  return {
    svc: {
      whenReady,

      declareReady: () => {
        if (startupTimeout) {
          clearTimeout(startupTimeout);
          startupTimeout = null;
          extRes();
        }
      },

      onShutdown: (task) => {
        shutdownTasks.push(task);
      },
    },
  };
};
