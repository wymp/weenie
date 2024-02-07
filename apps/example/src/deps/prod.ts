// NOTE: This would normally be from '@wymp/weenie-framework'
import { Weenie, retry, amqp, mysql, logger, serviceManager, cron, express } from '@wymp/weenie-framework';
import { type Config, getConfig } from '../config';
import { ExampleDomainMessages, AllDomainMessages } from '../types';
import { db } from './db/db';

/**
 * We're returning the "normal" application deps and also a few facilities for the "main" function here
 */
export const getProdDeps = async () => {
  let declareReady: () => void;
  let shutdown: () => Promise<void>;
  const deps = await Weenie({ config: getConfig() })
    .and(logger)
    .and(serviceManager)
    .and(retry)
    .and(cron)
    // Since our config is not aligned with the expected format in the weenie mysql function, we need to reshape it
    .and(({ config }: { config: Config }) => mysql({ config: { mysql: config.mysql.connection } }))
    .and(amqp<AllDomainMessages, ExampleDomainMessages>('exponential'))
    .and(db)
    .and(express)
    .done(async (d) => {
      const [amqp] = await Promise.all([d.amqp]);

      declareReady = d.svc.declareReady;
      shutdown = d.svc.shutdown;

      return {
        config: d.config,
        log: d.log,
        svc: {
          whenReady: d.svc.whenReady,
          onShutdown: d.svc.onShutdown,
        },
        retry: d.retry,
        cron: d.cron,
        db: d.db,
        amqp,
        http: d.http,
      };
    });

  return {
    // Deps
    deps,
    // A function to call to declare the service ready
    declareReady: declareReady!,
    // A function to call to shut down the service (on error)
    shutdown: shutdown!,
  };
};

export type Deps = Awaited<ReturnType<typeof getProdDeps>>['deps'];
