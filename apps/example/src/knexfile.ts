import type { Knex } from 'knex';
import { Config, getConfig } from './config';
import { ENVS } from './types';

/**
 * There are more configuration options here, but for the purposes of this example, this is all we're going to worry
 * about.
 */
type Mysql2Config = {
  client: 'mysql2';
  connection: Knex.MySql2ConnectionConfig;
  pool?: Knex.PoolConfig;
  migrations: Knex.MigratorConfig;
};

/**
 * This function allows us to use the same config for all cnx environments, since we handle env-specific config
 * differently than what knex expects.
 */
export const getKnexConfig = (config: Config) => {
  const knexConfig: Mysql2Config = {
    client: 'mysql2',
    connection: {
      ...config.mysql.connection,
    },
    pool: {
      ...config.mysql.pool,
    },
    migrations: {
      directory: `${__dirname}/deps/db/migrations`,
    },
  };
  return knexConfig;
};

//
// KNEX CLI CONFIG EXPORTS
//

const currentConfig = getConfig();

export const development: Knex.Config = getKnexConfig({
  ...currentConfig,
  app: { ...currentConfig.app, env: ENVS.DEVELOPMENT },
});

export const staging: Knex.Config = getKnexConfig({
  ...currentConfig,
  app: { ...currentConfig.app, env: ENVS.STAGING },
});

export const production: Knex.Config = getKnexConfig({
  ...currentConfig,
  app: { ...currentConfig.app, env: ENVS.PRODUCTION },
});
