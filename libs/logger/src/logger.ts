import { SimpleLoggerInterface, SimpleLogLevels } from '@wymp/ts-simple-interfaces';
import { SimpleLoggerConsole, Console, Opts } from '@wymp/simple-logger-console';

/** The necessary config for the weenie logger */
export type LoggerConfig = {
  level?: keyof SimpleLogLevels;
  format?: 'json' | 'text';
};

type Deps = {
  config: { logger: LoggerConfig };
};

/** Weenie function providing the logger dependency (`log`) */
export function logger(deps?: Deps, _fakeConsole?: Console): { log: SimpleLoggerInterface } {
  return {
    log: new SimpleLoggerConsole(
      {
        level: deps?.config.logger.level || 'error',
        formatter: Formatters[deps?.config.logger.format || 'text'],
      },
      _fakeConsole,
    ),
  };
}

const Formatters: { text: Opts['formatter']; json: Opts['formatter'] } = {
  text: (level, msg, ...args) => {
    // (Length of '[emergency]:', the longest log level as written by our logger)
    const padLen = 12;
    const ts = new Date().toISOString();
    const levelStr = `[${level}]:`.padEnd(padLen, ' ');
    return `${ts} ${levelStr} ${msg}${Object.keys(args).length ? ` ${JSON.stringify(args)}` : ''}`;
  },
  json: (level, msg, ...args) => {
    const ts = new Date().toISOString();
    return JSON.stringify({
      level,
      timestamp: ts,
      message: msg,
      meta: args,
    });
  },
};
