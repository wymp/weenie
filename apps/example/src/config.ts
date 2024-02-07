import { SimpleLogLevels } from '@wymp/ts-simple-interfaces';
import { ConfigError, configValue, REQUIRED, validate, ValidatorFunc, Validators } from '@wymp/weenie-framework';
import * as dotenv from 'dotenv';
import { existsSync } from 'fs';
import { ENVS } from './types';

/**
 * Here we have a function that returns our config. Defining this as a function allows us to control our side-effects.
 * We're managing our config in exactly the way that is recommended by the @wymp/config-simple package.
 *
 * Per the recommendations in that library, all default config values are prod-safe. Anything that's not prod-safe but
 * required is set to REQUIRED and (optionally) pre-filled by a `.env/[ENV]` file.
 */
export const getConfig = () => {
  // Get our environment
  const env = configValue('APP_ENV', REQUIRED, Validators.oneOf(Object.values(ENVS))) as ENVS | ConfigError;

  // Pre-fill values from `.env` files if they exist
  [`${__dirname}/../.env/local`, `${__dirname}/../.env/${env}`].forEach((f) => {
    if (existsSync(f)) {
      dotenv.config({ path: f });
    }
  });

  // Finally, define our config
  const configDef = {
    app: {
      domain: 'example',
      env,
    },
    http: {
      enabled: configValue('HTTP_ENABLED', 'bool', true),
      listener: {
        port: configValue('HTTP_PORT', 'num', 80),
        listener: configValue('HTTP_LISTENER', '0.0.0.0'),
      },
      // Could add other options here but we're happy with the weenie defaults
    },
    logger: {
      // In production we'll want to log everything above debug
      level: configValue('LOG_LEVEL', 'info') as keyof SimpleLogLevels,
    },
    mysql: {
      connection: {
        host: configValue('MYSQL_HOST', REQUIRED),
        port: configValue('MYSQL_PORT', 'num', 3306),
        user: configValue('MYSQL_USER', REQUIRED),
        password: configValue('MYSQL_PASSWORD', REQUIRED),
        database: configValue('MYSQL_DATABASE', 'weenie'),
        multipleStatements: true,
      },
      pool: {
        min: configValue('MYSQL_POOL_MIN', 'num', 2),
        max: configValue('MYSQL_POOL_MAX', 'num', 10),
      },
    },
    amqp: {
      enabled: configValue('AMQP_ENABLED', 'bool', true),
      cnx: {
        hostname: configValue('AMQP_HOST', REQUIRED),
        username: configValue('AMQP_USER', REQUIRED),
        password: configValue('AMQP_PASSWORD', REQUIRED),
        vhost: configValue('AMQP_VHOST', '/'),
      },
      publishing: {
        persistentMessages: true,
        exchange: {
          name: configValue('AMQP_EXCHANGE', REQUIRED),
          durable: true,
          autoDelete: false,
        },
      },
    },
    cron: {
      enabled: configValue('CRON_ENABLED', 'bool', true),
      specs: {
        heartbeat: configValue('CRONSPEC_HEARTBEAT', '0 */5 * * * *', validateCronSpec),
      },
    },
    svc: {
      handleShutdown: true,
    },

    // This is required to make the weenie function work
    retry: {},
  };

  return validate(configDef);
};

export type Config = ReturnType<typeof getConfig>;

// Lazy validation - you should try harder in a production app
const cronRegex = new RegExp(`^${Array(6).fill('[*0-9,/-]+').join(' ')}$`);

const validateCronSpec: ValidatorFunc<string> = (v) => {
  if (v && !v.match(cronRegex)) {
    return `Invalid cron spec: ${v}. See https://www.npmjs.com/package/cron for valid cron specs`;
  }
};
