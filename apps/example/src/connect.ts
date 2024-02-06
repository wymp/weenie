import { registerCron } from './cron/registerCron';
import { Deps } from './deps/prod';
import { connectRoutes } from './http/routes';
import { subscribe } from './mq/subscribe';

/**
 * This is the function in which we take our dependnecies and actually wire everything up so that we have a functioning
 * app. We do this in a separate function so that we can make sure we do it in the exact same way in testing as we do
 * in production.
 */
export const connect = async (deps: Deps) => {
  if (deps.config.http.enabled) {
    connectRoutes(deps);
  }

  if (deps.config.amqp.enabled) {
    await subscribe(deps);
  }

  if (deps.config.cron.enabled) {
    registerCron(deps);
  }
}