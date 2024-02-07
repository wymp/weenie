import { logger, type LoggerConfig } from '../src/logger';

describe('Logger', () => {
  const ts = '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]+Z';
  let mockConsole: any;
  let deps: {
    config: {
      logger: LoggerConfig;
    };
  };

  beforeEach(() => {
    deps = {
      config: {
        logger: {},
      },
    };
    mockConsole = {
      debug: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  test('should log messages', async () => {
    deps.config.logger.level = 'debug';
    const { log } = logger(deps, mockConsole);

    log.debug('DEBUG');
    log.info('INFO');
    log.notice('NOTICE');
    log.warning('WARNING');
    log.error('ERROR');
    log.alert('ALERT');
    log.critical('CRITICAL');
    log.emergency('EMERGENCY');

    expect(mockConsole.debug.mock.calls[0][0]).toMatch(new RegExp(`^${ts} \\[debug\\]:     DEBUG`));
    expect(mockConsole.info.mock.calls[0][0]).toMatch(new RegExp(`^${ts} \\[info\\]:      INFO`));
    expect(mockConsole.log.mock.calls[0][0]).toMatch(new RegExp(`^${ts} \\[notice\\]:    NOTICE`));
    expect(mockConsole.warn.mock.calls[0][0]).toMatch(new RegExp(`^${ts} \\[warning\\]:   WARNING`));
    expect(mockConsole.error.mock.calls[0][0]).toMatch(new RegExp(`^${ts} \\[error\\]:     ERROR`));
    expect(mockConsole.error.mock.calls[1][0]).toMatch(new RegExp(`^${ts} \\[alert\\]:     ALERT`));
    expect(mockConsole.error.mock.calls[2][0]).toMatch(new RegExp(`^${ts} \\[critical\\]:  CRITICAL`));
    expect(mockConsole.error.mock.calls[3][0]).toMatch(new RegExp(`^${ts} \\[emergency\\]: EMERGENCY`));
  });

  test('should not log below the given log level', async () => {
    deps.config.logger.level = 'warning';
    const { log } = logger(deps, mockConsole);

    log.debug('DEBUG');
    log.info('INFO');
    log.notice('NOTICE');
    log.warning('WARNING');
    log.error('ERROR');
    log.alert('ALERT');
    log.critical('CRITICAL');
    log.emergency('EMERGENCY');

    expect(mockConsole.debug.mock.calls).toHaveLength(0);
    expect(mockConsole.info.mock.calls).toHaveLength(0);
    expect(mockConsole.log.mock.calls).toHaveLength(0);
    expect(mockConsole.warn.mock.calls).toHaveLength(1);
    expect(mockConsole.error.mock.calls).toHaveLength(4);
  });

  test('should output JSON when requested', async () => {
    deps.config.logger.format = 'json';
    const { log } = logger(deps, mockConsole);

    const meta = { foo: 'bar' };

    log.error('ERROR', meta);
    expect(JSON.parse(mockConsole.error.mock.calls[0][0])).toMatchObject({
      level: 'error',
      timestamp: expect.stringMatching(new RegExp(`^${ts}$`)),
      message: 'ERROR',
      meta: [meta],
    });
  });
});
