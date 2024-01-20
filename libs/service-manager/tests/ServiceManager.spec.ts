import { ServiceManagerDeps, serviceManager } from '../src/serviceManager';
import { MockSimpleLogger } from '@wymp/ts-simple-interfaces-testing';

describe('ServiceManager', () => {
  let deps: ServiceManagerDeps & { log: MockSimpleLogger };
  let _process: {
    on: ReturnType<typeof jest.fn>;
    exit: ReturnType<typeof jest.fn>;
  };

  beforeEach(() => {
    _process = {
      on: jest.fn(),
      exit: jest.fn(),
    };

    deps = {
      config: {
        svc: {
          initializationTimeoutMs: 50,
          handleShutdown: false,
        },
      },
      log: new MockSimpleLogger(),
    };
  });

  test('should throw error if process takes too long to initialize', async () => {
    deps.config.svc!.initializationTimeoutMs = 10;
    return new Promise<void>((res, rej) => {
      const timeout = setTimeout(() => rej(new Error('Should have died before this timeout')), 200);
      _process.exit.mockImplementation(() => {
        expect(deps.log?.match(/^emergency: INITIALIZATION FAILED/)).toBe(true);
        clearTimeout(timeout);
        res();
      });
      serviceManager(deps, _process);
    });
  });

  test('should not throw if properly initialized', async () => {
    return new Promise<void>((res, rej) => {
      const timeout = setTimeout(() => {
        expect(true).toBe(true);
        res();
      }, 100);
      _process.exit.mockImplementation(() => {
        clearTimeout(timeout);
        rej(new Error('Should not have been killed'));
      });
      const { svc } = serviceManager(deps, _process);
      svc.declareReady();
    });
  });

  test('should announce readiness via the `whenReady` promise', async () => {
    return new Promise<void>((res) => {
      let count = 0;
      const register = () => {
        if (++count === 3) {
          expect(true).toBe(true);
          res();
        }
      };
      const { svc } = serviceManager(deps, _process);

      svc.whenReady.then(register);
      svc.whenReady.then(register);
      svc.whenReady.then(register);

      svc.declareReady();
    });
  });

  test('should call shutdown tasks on shutdown, if configured', async () => {
    deps.config.svc!.handleShutdown = true;
    const { svc } = serviceManager(deps, _process);
    const task = jest.fn(() => Promise.resolve());
    svc.onShutdown(task);
    svc.declareReady();
    expect(_process.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    expect(_process.on).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

    const shutdown = _process.on.mock.calls[0][1];
    await shutdown('SIGINT');
    await shutdown('SIGTERM');
    await shutdown('SIGINT');

    expect(task).toHaveBeenCalledTimes(1);
    expect(_process.exit).toHaveBeenCalledWith(0);
  });

  test('should not handle signals when not configured to do so', async () => {
    const { svc } = serviceManager(deps, _process);
    svc.declareReady();
    expect(_process.on).not.toHaveBeenCalled();
  });
});
