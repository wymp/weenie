import { Deps } from '../deps/prod';

type ModuleDeps = Pick<Deps, 'config' | 'cron'>;

/** Register all cron jobs */
export const registerCron = async (deps: ModuleDeps) => {
  deps.cron.register({
    name: 'example-heartbeat',
    spec: deps.config.cron.specs.heartbeat,
    handler: async (log) => {
      log.info('Running example cronjob');
      return true;
    },
  });
};
