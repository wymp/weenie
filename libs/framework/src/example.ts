/**
 * Weenie Framework Example
 *
 * Ordinarily you would elaborate all this in a project structured the way you like to structure
 * things (i.e., with subfolders, maybe a Types.ts file, etc.). Here, for the sake of example,
 * we've dumped the whole thing into this one file.
 *
 * This example is intended to give you a high-level overview of how the Weenie Framework is
 * intended to be used.
 */

// Config module
import { config } from '@wymp/config-node';

import {
  // Base framework function
  Weenie,

  // Runtime config validators (you can make your own or use these "standard" config shapes)
  baseConfigValidator,
  databaseConfigValidator,
  webServiceConfigValidator,
  apiConfigValidator,
  mqConnectionConfigValidator,

  // Other components
  logger,
  serviceManagement,
  mysql,
  httpHandler,
  amqp,
  WeeniePubSubAmqp,

  // Extra things for building the special api instantiator
  BaseApiDeps,
  ApiClient,
  ApiConfig,
} from './framework';

// Runtypes for creating a final config validator
import * as rt from 'runtypes';

// Some simple interfaces, used for creating our api clients (you might normally put these and the
// api client instantiation logic somewhere else, but it's all here to make the example more
// contained)
import { SimpleLoggerInterface, SimpleHttpClientInterface, SimpleSqlDbInterface } from '@wymp/ts-simple-interfaces';

/**
 * Create final config definition
 *
 * Here, we're using the "base" config defined in `src/Types.ts` (which includes things like config
 * for an exponential backoff system, an initialization system, a logger, and environment awareness)
 * and we're adding config for a database, webservice provider, and two arbitrary API clients.
 *
 * This config contains all of the keys necessary to instantiate the rest of our dependencies, and
 * in this example, we're using Weenie's native config function, which uses this validator to
 * validate config on initialization.
 */
const exampleConfigValidator = rt.Intersect(
  baseConfigValidator,
  rt.Record({
    db: databaseConfigValidator,
    webservice: webServiceConfigValidator,
    firstApi: apiConfigValidator,
    secondApi: apiConfigValidator,
    amqp: mqConnectionConfigValidator,
  }),
);
// declare type ExampleConfig = rt.Static<typeof exampleConfigValidator>;

// (We're going to wrap this in a top-level async function so we can make the syntax prettier)
(async () => {
  // Our `svcManagement` dependency allows us to signal when the app has been successfully
  // initialized, a signal that some of our dependencies and modules may depend on. Because we don't
  // want our app to have access to this, we're going to strip it out of the final dependencies and
  // assign it to this function-local variable that we can call when we're all ready.
  let initialized = (ready: true) => ready as boolean;

  /**
   * Build the application up as we see fit
   *
   * This is the meat of what we're doing. The `r` variable (short for `resources`) will emerge from
   * this as a full dependency injection container, with each dependency correctly instantiated and
   * typed.
   *
   * Note that in this example we have one promisified dependency, which we resolve in the `done`
   * method down below. Because of that, we're awaiting here, but if by chance we don't have any
   * promisified dependencies, then of course we don't have to make this async.
   */

  /**
   * We always start with config, since that's the foundation of everything. This returns the
   * following:
   *
   * { config: ExampleConfig }
   */
  const deps = await Weenie(
    // The configFromFiles method is for smaller scale projects that use on-disk config files rather
    // than environment variables for config. You can use the `configFromEnv` function if you'd like
    // to draw config from environment variables.
    config(
      'APP_',
      {
        env: process.env,
        defaultsFile: './config.example.json',
        localsFile: './config.local.json',
      },
      exampleConfigValidator,
    ),
  )
    /**
     * This is optional, but I always like to have a mechanism for alerting when my service has not
     * fully initialized in a reasonable amount of time. The service manager does that.
     */
    .and(serviceManagement)

    /**
     * And let's add in a long-running promise just for kicks. (Note that you can tweak your config
     * to make the service initialization timeout before this promise resolves.)
     */
    .and(() => {
      return {
        myPromise: new Promise<string>((res) => setTimeout(() => res('resolved!'), 2000)),
      };
    })

    /**
     * Here we add the standard Weenie Logger. This is just a simple logger instance (winston-based)
     * with a specific configuration that is considered the "weenie" way.
     */
    .and(logger)

    /**
     * Now we'll add a pubsub
     */
    .and(amqp)

    /**
     * Next we do mysql. Nothing special here. Just a simple sql db instance specific to mysql.
     */
    .and(mysql)

    /**
     * Now we'll add our API clients. These we have to make kind of custom because it's impossible
     * to create a general function that provides both correct typing and access to the correct
     * configs without dangerous casting.
     *
     * To make it a little bit cleaner, Weenie provides the `BaseApiDeps` type, which defines an
     * environment-aware config and a logger. Then we just have to add our specific new config keys.
     */
    .and(
      (
        d: BaseApiDeps & {
          config: { firstApi: ApiConfig; secondApi: ApiConfig };
        },
      ) => {
        return {
          firstApi: new ApiClient({ envType: d.config.envType, ...d.config.firstApi }, d.logger),
          secondApi: new ApiClient({ envType: d.config.envType, ...d.config.secondApi }, d.logger),
        };
      },
    )

    /**
     * For our IO abstraction, normally we would build this in a separate file and pull it in as a
     * module, but for this example, we'll just do it ad-hoc.
     *
     * The idea is to encapsulate all of the IO functionality we want to use here behind a defined,
     * declarative interface instead of doing raw queries, which are hard to stub out in testing.
     *
     * In this case, we're unifying both API calls and database calls into one abstraction.
     */
    .and(
      (d: {
        logger: SimpleLoggerInterface;
        firstApi: SimpleHttpClientInterface;
        secondApi: SimpleHttpClientInterface;
        sql: SimpleSqlDbInterface;
        pubsub: WeeniePubSubAmqp;
      }) => {
        return {
          io: {
            getAllDatabases: () => {
              return d.sql.query<{ Database: string }>('SHOW DATABASES');
            },

            getTodo: async (todoId: number): Promise<Todo> => {
              const res = await d.firstApi.request<Todo>({
                url: `/todos/${todoId}`,
              });
              if (res.status >= 300) {
                throw new Error(`Received non 2xx status code from api call: ${JSON.stringify(res.data)}`);
              }
              return res.data;
            },

            getUser: async (userId: number): Promise<User> => {
              const res = await d.secondApi.request<User>({
                url: `/users/${userId}`,
              });
              if (res.status >= 300) {
                throw new Error(`Received non 2xx status code from api call: ${JSON.stringify(res.data)}`);
              }
              return res.data;
            },
          },
        };
      },
    )

    /**
     * Now we add an HTTP request handler to handle incoming requests.
     *
     * This function provides a very thinly-wrapped express app, which we'll configure with handlers
     * later on.
     */
    .and(httpHandler)

    /**
     * Finally, when we're done adding all our dependencies, we can define a final interface and
     * seal up the bag. The `done` method simply injects the dependencies that precede it and returns
     * whatever you choose to return. This becomes the final type of the `r` variable way up above,
     * and what we use to enact our application down below.
     */
    .done(async (d) => {
      // We know we've got some promises to wait for, so let's wait for them before wrapping everything
      // up
      const myPromise = await d.myPromise;

      // Set our special `initialized` local variable
      initialized = d.svc.initialized;

      // Now return our sewn up bag of dependencies
      return {
        config: d.config,
        log: d.logger,
        io: d.io,
        http: d.http,
        pubsub: d.pubsub,
        myPromise,
      };
    });

  // In a real app, we might wait until we've added handlers to do this, since this signals to our
  // httpHandler dependency to register some special endcap handlers. Here, though,
  /**
   *
   *
   *
   *
   *
   *
   * Now we can use our dependencies.
   *
   * In this case, we're just exercising them a little bit for the purposes of example. We're logging
   * stuff, exploring config values, getting information from the database, setting up an endpoint
   * for getting some info, subscribing to MQ messages, and getting info from our APIs.
   *
   *
   *
   *
   *
   *
   */

  // Now, subscribe to all events on the 'data-events' channel
  deps.pubsub.subscribe(
    { 'data-events': ['*.*.*'] },
    (msg, log) => {
      // The message content has already been converted to object format for us, but remains type
      // unknown. The first thing we always need to do is validate the type, since this is a runtime
      // boundary. In this case, we're feeling lazy, so just dumping the content.
      log.notice(`Got message with id ${msg.id}: ` + JSON.stringify(msg));
      return Promise.resolve(true);
    },
    { queue: { name: deps.config.serviceName } },
  );

  // Set up our webservice to handle incoming requests, and add middleware to log request info
  deps.http.use((req, res, next) => {
    deps.log.info(`Received request: ${req.path}`);
    next();
  });
  deps.http.get('/info', async (req, res) => {
    try {
      // Pick a random to-do and get info about it.
      const todoId = Math.round(Math.random() * 100);

      // Get todo
      deps.log.info(`Getting todo id ${todoId} from API`);
      const todo = await deps.io.getTodo(todoId);
      deps.log.debug(`Got response from API: ${JSON.stringify(todo)}`);

      deps.log.info(`Getting user id ${todo.userId} from API`);
      const user = await deps.io.getUser(todo.userId);
      deps.log.debug(`Got response from API: ${JSON.stringify(user)}`);

      res.send({
        timestamp: Date.now(),
        todo,
        user,
        meta: {
          nextTodo: todo.id * 1 + 1,
          prevTodo: todo.id * 1 - 1,
        },
      });
    } catch (e) {
      res.status(500).send({
        errors: [
          {
            title: 'Sorry, we screwed up',
            detail: e.message,
          },
        ],
      });
    }
  });

  // When everything is all hooked up, we can call `initialized` to let the app know we're open for
  // business
  initialized(true);

  //
  // ...
  //

  // And here we're just doing a few random calls just do demonstrate the other dependencies
  deps.log.notice(`App started in environment '${deps.config.envName}'`);
  const dbsQuery = await deps.io.getAllDatabases();

  deps.log.notice(`Available databases:`);
  for (const row of dbsQuery.rows) {
    deps.log.notice(`* ${row.Database}`);
  }
})() // End async "init" function
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

/**
 *
 *
 *
 *
 *
 *
 *
 *
 * Unimportant type definitions for the the example
 *
 *
 *
 *
 *
 *
 *
 *
 */
declare interface Todo {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
}

declare interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  address: Address;
  phone: string;
  website: string;
  company: Company;
}

declare interface Address {
  street: string;
  suite: string;
  city: string;
  zipcode: string;
  geo: {
    lat: string;
    lng: string;
  };
}

declare interface Company {
  name: string;
  catchPhrase: string;
  bs: string;
}
