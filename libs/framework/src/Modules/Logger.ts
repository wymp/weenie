import { LoggerConfig } from '../Types';
import { SimpleLoggerInterface } from '@wymp/ts-simple-interfaces';
import { SimpleLoggerConsole, Console } from '@wymp/simple-logger-console';

type PartialConfig = { logger: LoggerConfig };
type FullConfig = { config: PartialConfig };

type LoggerDep = { logger: SimpleLoggerInterface };

export function logger(deps: FullConfig | PartialConfig | LoggerConfig, _console?: Console): LoggerDep {
  const d = <FullConfig>(
    (typeof (deps as FullConfig).config !== 'undefined'
      ? deps
      : typeof (deps as PartialConfig).logger !== 'undefined'
        ? { config: deps }
        : { config: { logger: deps } })
  );

  // (Length of '[emergency]:', the longest log level as written by our logger)
  const padLen = 12;

  return {
    logger: new SimpleLoggerConsole(
      {
        level: d.config.logger.logLevel,
        formatter: (level, msg, ...args) => {
          const ts = new Date().toISOString();
          const levelStr = `[${level}]:`.padEnd(padLen, ' ');
          return `${ts} ${levelStr} ${msg}${Object.keys(args).length ? ` ${JSON.stringify(args)}` : ''}`;
        },
      },
      _console,
    ),
  };
}
