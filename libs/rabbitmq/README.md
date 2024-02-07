Weenie RabbitMQ
========================================================================================================================

This package is meant to be used with [Weenie](https://wymp.github.io/weenie). However, if you are not using
Weenie but are interested in this functionality, there's nothing wrong with using it directly.

**WARNING: EXPERIMENTAL. Messaging is an area that will typically benefit from stronger opinions, so this library may
end up being too opinionated for you or not opinionated enough.** Feedback welcome at
https://github.com/wymp/weenie/issues.

Here's how I thought about this:

1. In RabbitMQ, a topic exchange can do everything any other exchange type can do, so you should always use a topic
   exchange and this module assumes that you will.
2. There's generally no reason to use more than one exchange, so this module also assumes that you will only be using
   a single exchange. If you _really_ want to use multiple exchanges and you also _really_ want to use this module, you
   can simply include it twice with different publish configurations (although you'll also have to write a small wrapper
   to alias the output dependency).
3. You should define the types of all of your messages, and as a general rule, your message types should be a
   discriminated union (see below for examples). You'll typically group your messages by the publishing domain so that
   you can enforce that messages published by this module are the correct subset of total messages. Then you can group
   all domains together into a super-type and use that as your subscription message type. (Again, see example below.)
4. When you subscribe a handler, you may subscribe it to one or more routing keys.
5. When you publish, you'll simply publish a given message to a given routing key.


### Example


A Hypothetical types.ts file, which you might keep in a shared library

```ts
/** All domains in our system */
export enum DOMAINS {
  FOO = 'foo',
  BAR = 'bar',
}

/** Actions that might be taken on a resource */
export enum ACTIONS {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
};

/** Thing 1 */
export type Thing1 = {
  id: string;
  type: 'thing-one';
  one: number;
  two: boolean;
}

/** Thing 2 */
export type Thing2 = {
  id: string;
  type: 'thing-two';
  name: string;
  age: number;
}

/** Thing 3 */
export type Thing3 = {
  id: string;
  type: 'thing-three';
  name: string;
  lat: number;
  long: number;
}

/** Groupings of all resources available per domain */
export type RESOURCES = {
  [DOMAINS.FOO]:
    | Thing1
    | Thing2;
  [DOMAINS.BAR]:
    | Thing3;
}

/** An internal "standard message" type */
type StdMsg<Domain extends string, Action extends ACTIONS, Resource extends { id: string; type: string }> = {
  key: `${Domain}.${Action}.${Resource['type']}`;
  domain: Domain;
  action: Action;
  resource: Resource;
}

/** The type of all messages in the Foo domain */
export type FooMsgs = StdMsg<DOMAINS.FOO, ACTIONS, RESOURCES[DOMAINS.FOO]>;

/** The type of all messages in the Bar domain */
export type BarMsgs = StdMsg<DOMAINS.BAR, ACTIONS, RESOURCES[DOMAINS.BAR]>;

/** The type of all possible system messages */
export type AllMsgs =
  | FooMsgs
  | BarMsgs;
```

And here, your `main.ts` file in the `foo` domain service, where you instantiate your dependencies and run the app

```ts
import { Weenie, logger, retry } from '@wymp/weenie-framework';
import { amqp } from '@wymp/weenie-rabbitmq';

// You'll usually define this somewhere else using something like @wymp/config-simple, but for the example we're just
// doing it in-line
const config = {
  app: {
    name: 'my-service',
  },
  logger: {
    level: 'error' as const,
  },
  retry: {},
  amqp: {
    cnx: {
      hostname: 'rabbitmq',
      port: 5671,
      username: 'guest',
      password: 'guest',
      vhost: 'default',
    },
    publishing: {
      persistentMessages: true,
      exchange: {
        name: 'my-org',
        durable: true,
        autoDelete: false,
      }
    }
  }
};

// "Main" function - must be async so that we can await our AMQP dependency
(async () => {
  // Instantiate all our dependencies
  const deps = await Weenie({ config })
    .and(logger)
    .and(retry)
    .and(amqp<AllMsgs, FooMsgs>('exponential'))
    .done(async (d) => ({
      config: d.config,
      log: d.log,
      retry: d.retry,
      amqp: await d.amqp,
    }));

  // Later or somewhere else .....

  // Add a subscriber to all messages from the Foo domain
  deps.amqp.subscribe(
    ['foo.#'],
    async (msg, attrs, log) => {
      log.info(`Got message ${attrs.messageId} (${new Date(attrs.timestamp).toISOString()}): ${JSON.stringify(msg)}`);
      return true;
    },
    { queue: { name: deps.config.app.name } },
  );

  // Somewhere else ....

  // Publish a create message for resource 'thing-one'
  const msg = {
    key: `foo.${ACTIONS.CREATE}.thing-one`,
    domain: 'foo',
    action: ACTIONS.UPDATE,
    resource: {
      id: '123',
      type: 'thing-one',
      one: 1,
      two: true,
    },
  } as const;
  await deps.amqp.publish(msg.key, msg);
})();
```


### MQ Philosophy

There are two things that I typically end up doing with an MQ.

First, generalized data events. I might use these to audit data changes in the system or to execute non-mission-critical
functionality based on observed system events (e.g., cleaning up certain files if a given resource is deleted). For
these events, I often end up creating a general message structure like the one demonstrated above (although I might
addtionally prefix the events with `data.` so that my consumers can easily filter out those messages as a category).

Second, tasks. These should be thought of as mission-critical asynchronous jobs, and the events should be highly
specific and well documented. Tasks are a first-class part of your API and should be treated as such.

**It is a mistake to queue mission-critical tasks off of system "events".** This is because events are non-specific
from the emitter's perspective and may easily be eliminated or changed without thought and without noticing the
downstream consequences. (What happens, for example, if an important email is never sent because the message that cued
it was changed upstream? How long do you go before noticing that it's not sent, since there are no errors being thrown?)
