import { SimpleLoggerInterface } from '@wymp/ts-simple-interfaces';
import {
  SimpleAmqpConfig,
  AbstractPubSubAmqp,
  Retry,
  SimpleSubscriptionOptions,
  AmqpExtra,
  SimpleAmqpConnection,
} from '@wymp/simple-pubsub-amqp';

/** Config for setting up the exchange we want to publish to */
export type WeeniePublishingConfig = {
  persistentMessages?: boolean;
  exchange: {
    name: string;
    // TODO: Alias this in the @wymp/simple-pubsub-amqp package so we can reference it here
    durable?: boolean;
    internal?: boolean;
    autoDelete?: boolean;
    alternateExchange?: string;
  };
};

/** Input deps for the AMQP module */
export type WeenieAmqpInputDeps = {
  config: {
    amqp: {
      cnx: SimpleAmqpConfig;
      publishing: WeeniePublishingConfig;
    };
  };
  log: SimpleLoggerInterface;
  /**
   * A retry algorithm to use to run jobs. A few things to note about this:
   *
   * 1. Weenie now offers several options for retry algorithms by default.
   */
  retry?: {
    exponential?: Retry['run'];
    periodic?: Retry['run'];
  };
};

/** A message handler function for a weenie subscriber */
export type MessageHandler<SubMsgType> = (
  msg: SubMsgType,
  attrs: AmqpExtra,
  log: SimpleLoggerInterface
) => Promise<boolean>

/** The publisher side of a weenie pubsub handler */
export interface WeeniePublisherInterface<PubMsgType extends { key: string }> {
  /**
   * Publish a message to the configured exhange on the given routing key. The message will be published using the
   * message's `key` attribute as the routing key.
   */
  publish(msg: PubMsgType): Promise<void>;
}

/** The subscriber side of a weenie pubsub handler */
export interface WeenieSubscriberInterface<SubMsgType extends { key: string }> {
  /**
   * A subscription method used to subscribe a general handler that must accept ALL messages that the system can
   * receive. This method allows you to provide routing keys with wildcards, but it can't offer the same type-safety
   * as the {@link subscribe} method. Handlers passed to this method must be ready to receive ANY message.
   * 
   * @param routingKeys is an array of routing keys indicating which messages should arrive in this queue. (This
   * enforces that the messages be on the same exchange that was indicated on initialization.) For example, if you
   * initialized the class with the `foo` exchange and you want to subscribe to all messages published to that exchange,
   * you would pass `['#']` here. If you want to subscribe to all messages starting with `bar` and `baz`, you might
   * pass `['bar.#', 'baz.#']`.
   * @param queueName is the name of the queue that will be created for this subscription.
   * @param handler is the function that will be called when the message is received. It will be passed the message
   * itself, the message's attributes, and a logger tagged with the messages id.
   * @param queueOpts are the options for the subscription. This allows you to set a few queue properties if you'd like
   * 
   * @example
   * 
   * ```ts
   * type Thing1Msg = { key: 'my-domain.did.thing1'; data: { foo: string } };
   * type Thing2Msg = { key: 'my-domain.did.thing2'; data: { bar: number } };
   * type Thing3Msg = { key: 'my-domain.did.thing3'; data: { baz: boolean } };
   * 
   * // All the messages that we might receive
   * type AllMessages = Thing1Msg | Thing2Msg | Thing3Msg;
   * 
   * // A handler that handles two of these messages
   * const handlerForAnyMessage: MessageHandler<AllMessages> = async (msg, attrs, log) => {
   *   // Do something...
   *   switch (msg.key) {
   *     case 'my-domain.did.thing1': {
   *       // ...
   *     }
   *     // ...
   *   }
   *   return true;
   * }
   * 
   * export const subscribe = (deps: { amqp: WeenieSubscriberInterface<AllMessages> }) => {
   *   // This subscription will receive all messages that start with 'my-domain.'
   *   await deps.amqp.subscribeAny(['my-domain.*'], 'my-queue', handlerForAnyMessage);
   * }
   * ```
   */
  subscribeAny(
    routingKeys: Array<string>,
    queueName: string,
    handler: MessageHandler<SubMsgType>,
    queueOpts?: Omit<SimpleSubscriptionOptions['queue'], 'name'>,
  ): Promise<void>;

  /**
   * A subscription method used to subscribe a handler for one or more specfic messages with a key or array of keys
   * derived directly from that type.
   * 
   * This is used to enforce type-safety in the (common) case in which you are subscribing a specific handler to a
   * specific routing key.
   * 
   * See also {@link subscribeAny}
   * 
   * @param routingKeys is an array of routing keys indicating which messages should arrive in this queue. For this
   * method (in contrast to {@link subscribeAny}), the value must be a string or an array of strings exactly matching
   * the `key` parameter of all messages supported by the handler. (If you want to use wildcard subscriptions, use
   * the {@link subscribeAny} method instead.)
   * @param queueName is the name of the queue that will be created for this subscription.
   * @param handler is the function that will be called when the message is received. It will be passed the message
   * itself, the message's attributes, and a logger tagged with the messages id.
   * @param queueOpts are the options for the subscription. This allows you to set a few queue properties if you'd like
   * 
   * @example
   * 
   * ```ts
   * type Thing1Msg = { key: 'my-domain.did.thing1'; data: { foo: string } };
   * type Thing2Msg = { key: 'my-domain.did.thing2'; data: { bar: number } };
   * type Thing3Msg = { key: 'my-domain.did.thing3'; data: { baz: boolean } };
   * 
   * // A handler that handles two of these messages
   * const handlerForSomeMessages: MessageHandler<Thing1Msg | Thing2Msg> = async (msg, attrs, log) => {
   *   // Do something...
   *   switch (msg.key) {
   *     case 'my-domain.did.thing1': {
   *       // ...
   *     }
   *     // ...
   *   }
   *   return true;
   * }
   * 
   * export const subscribe = (deps: { amqp: WeenieSubscriberInterface<AllMessages> }) => {
   *   await deps.amqp.subscribe(
   *     ['my-domain.did.thing1', 'my-domain.did.thing2'],
   *     'my-queue',
   *     handlerForSomeMessages,
   *   );
   * }
   * ```
   */
  subscribe<MsgTypes extends SubMsgType>(
    key: MsgTypes['key'] | Array<MsgTypes['key']>,
    queueName: string,
    handler: MessageHandler<MsgTypes>,
    queueOpts?: Omit<SimpleSubscriptionOptions['queue'], 'name'>,
  ): Promise<void>;
}

export interface WeeniePubSubInterface<SubMsgType extends { key: string }, PubMsgType extends { key: string }>
  extends WeeniePublisherInterface<PubMsgType>, WeenieSubscriberInterface<SubMsgType> {}

/**
 * A weenie function for attaching the Weenie-standard pubsub (RabbitMQ) to a Weenie app.
 *
 * **WARNING: EXPERIMENTAL. Messaging is an area that will typically benefit from stronger opinions, so this library may
 * end up being too opinionated for you or not opinionated enough.** Feedback welcome at
 * https://github.com/wymp/weenie/issues.
 *
 * NOTE: This is a two-stage function, rather than a typical Weenie function. The first stage requires you to specify
 * a retry algorithm (exponential, periodic or null), while the second stage is the actual weenie function. (This
 * assumes only two retry algorithms: exponential and periodic. I didn't want to bother with making this more dynamic
 * for now, but if more options are needed, you could always write a small wrapper around this that provides your
 * desired retry algorithm masquerading as one of the two options.)
 *
 * You should be sure to pass the type paramters `SubMsgType` and `PubMsgType` to this function to ensure that messages
 * are typed correctly. Otherwise this doesn't add much value.
 *
 * See https://npmjs.com/package/@wymp/simple-pubsub-amqp for a full example usage of this.
 */
export const amqp =
  <SubMsgType extends { key: string } , PubMsgType extends { key: string }>(retryAlgorithm: 'exponential' | 'periodic' | null) =>
  (deps: WeenieAmqpInputDeps) => {
    const amqp = new WeeniePubSubAmqp<SubMsgType, PubMsgType>(
      deps.config.amqp.publishing,
      deps.config.amqp.cnx,
      deps.log,
      {
        retry:
          retryAlgorithm === null || !deps.retry?.[retryAlgorithm] ? undefined : { run: deps.retry[retryAlgorithm]! },
      },
    );
    return { amqp: amqp.connect().then(() => amqp) };
  };

/**
 * The Weenie PubSub Class
 *
 * NOTE: This assumes a topic exchange, which covers all of the use-cases that any other exchange can cover.
 *
 * @typeParam SubMsgType is the type of message that will be received by subscribers. This will typically be a union
 * of all possible messages.
 * @typeParam PubMsgType is the type of message that will be published by publishers. This will typically be a union
 * of all of the messages that can be emitted by this particular service (which may or may not be the union of all
 * possible system messages).
 */
export class WeeniePubSubAmqp<SubMsgType extends { key: string }, PubMsgType extends { key: string }>
  extends AbstractPubSubAmqp<PubMsgType>
  implements WeeniePubSubInterface<SubMsgType, PubMsgType>{

  public constructor(
    protected publishingConfig: WeeniePublishingConfig,
    config: SimpleAmqpConfig,
    log: SimpleLoggerInterface,
    deps: {
      retry?: Retry;
      amqpConnect?: (url: string | SimpleAmqpConfig, socketOptions?: unknown) => Promise<SimpleAmqpConnection>;
    },
  ) {
    super(config, log, deps);
  }

  public subscribeAny(
    routingKeys: Array<string>,
    queueName: string,
    handler: (msg: SubMsgType, attrs: AmqpExtra, log: SimpleLoggerInterface) => Promise<boolean>,
    queueOpts: Omit<SimpleSubscriptionOptions['queue'], 'name'> = {},
  ): Promise<void> {
    return this.driver.subscribe(
      { [this.publishingConfig.exchange.name]: routingKeys },
      async (_msg, log) => {
        let msg: SubMsgType;
        try {
          msg = JSON.parse(_msg.content.toString('utf8'));
          if (msg === null || typeof msg !== 'object') {
            throw new Error(
              `Message must be a non-null JSON object. Your message is ${msg === null ? 'null' : `a(n) ${typeof msg}`}`,
            );
          }
        } catch (e) {
          log.error(
            `Message body is not valid: Message body: ${_msg.content.toString('utf8')}; ` + `Error: ${e.stack}`,
          );
          // Returning true here to avoid endless retries
          return true;
        }

        try {
          // We know that simple-pubsub-amqp will always pass us a valid extra object, so we can safely use the `!`
          // operator here
          return await handler(msg, _msg.extra!, log);
        } catch (e) {
          log.error(`Error executing handler: ${e.stack}`);
          return false;
        }
      },
      {
        exchanges: {
          [this.publishingConfig.exchange.name]: {
            ...this.publishingConfig.exchange,
            type: 'topic',
          },
        },
        queue: {
          ...queueOpts,
          name: queueName
        }
      },
    );
  }

  public async subscribe<MsgTypes extends SubMsgType>(
    key: MsgTypes['key'] | Array<MsgTypes['key']>,
    queueName: string,
    handler: MessageHandler<MsgTypes>,
    queueOpts: Omit<SimpleSubscriptionOptions['queue'], 'name'> = {}
  ): Promise<void> {
    return this.subscribeAny(Array.isArray(key) ? key : [key], queueName, handler as MessageHandler<SubMsgType>, queueOpts);
  }

  public async publish(msg: PubMsgType): Promise<void> {
    return this.driver.publish(this.publishingConfig.exchange.name, msg, {
      routingKey: msg.key,
      persistent: this.publishingConfig.persistentMessages ?? true,
    });
  }
}
