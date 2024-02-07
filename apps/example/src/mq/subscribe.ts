import { Deps } from '../deps/prod';
import { MSG_KEYS } from '../types';
import { Subscribers } from './subscribers';

type SubscriberDeps = Parameters<Subscribers[keyof Subscribers]>[0];

type ModuleDeps = SubscriberDeps & Pick<Deps, 'config' | 'amqp' | 'db'>;

/**
 * Subscribes all of our message handlers to the message queue.
 *
 * @sideEffects
 */
export const subscribe = async (deps: ModuleDeps) => {
  await Promise.all([
    deps.amqp.subscribe(
      MSG_KEYS.EXAMPLE_STATS_REQUESTS,
      `${deps.config.app.domain}-gather-stats`,
      Subscribers.saveRequestStat(deps),
    ),

    deps.amqp.subscribe(
      MSG_KEYS.EXAMPLE_USERS_CREATED,
      `${deps.config.app.domain}-log-users`,
      Subscribers.logCreatedUsers(),
    ),

    deps.amqp.subscribeAny(['#'], `${deps.config.app.domain}-log-all-msgs`, Subscribers.logAllMessages()),
  ]);
};
