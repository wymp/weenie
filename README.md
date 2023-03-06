Weenie Framework
=================================================================================

> **NOTE: Wymp publishes its packages to github package repository. To set your project up to use
> github package repository for the `@wymp/weenie-framework` package, follow instructions
> [here](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).**
>
> **TL;DR**
>
> 1. **Generate a github [personal auth token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)**
> 2. **Create an `~/.npmrc` file if one doesn't already exist and add `//npm.pkg.github.com/:_authToken=YOUR_AUTH_TOKEN`
>    to it, substituting the token you just created for `YOUR_AUTH_TOKEN`.**
> 3. **Create an `.npmrc` file in your repo root if you don't already have one and add this to it:
>    `@wymp:registry=https://npm.pkg.github.com/wymp`.**


## Overview

**The Weenie Framework is a simple Typescript microservices framework for NodeJS.**

It was born out of a frustration with giganto-frameworks like NestJS and a desire to keep things
small, light and composable, and with a special focus on empowering developers to build with it
whatever and however they wish _without the framework getting in the way._ It is designed to be
highly unopinionated and to allow developers to easily compose and encapsulate functionality in
whatever way makes sense to them.

To this end, Weenie is nothing more than a strongly-typed dependency injection container. The idea
behind it is that as you `and` things into the container, the shape of the container changes, and
typescript keeps track of these changes. This allows you to build both very simple and very complex
dependency containers, whose static type you can then depend on in your application and your tests.

Additionally, this final type allows you (at your option) to create a very robust set of mock
dependencies to make testing at all levels easier and cleaner.

The example in [`src/example.ts`](src/example.ts) is a decent look at what _I_ usually do with it
and how. That is, it demonstrates the deliberate building of a dependency injection container with
the dependencies and configuration that I like, which I then use in event handlers and API request
handlers to execute my core logic.

As you start to center around specific dependencies and groups of dependencies that you like, you
can pull them into separate libraries and publish them, thus building up a collection that
represents _your own_ framework, customized to your own personality and/or organization.

And why go through all the trouble of doing it this way?

Frankly, this makes sense to me, and it makes each individual component much more narrowly scoped
and easier to test. Using this structure, I can mock out the entire tree for my test cases, and
I can easily encapsulate my application logic in functions that themselves have a very narrow set
of dependencies. And that allows me to focus my development and treat every component as it should
be treated - as a small, isolated unit that does one thing well and uses very few other things to
do it. This makes my code, neat, clean, easy to maintain and easy to evolve.


## Weenie Components

While Weenie was a response to opinionated frameworks, it does recognize that frameworks _must_ be
opinionated to be useful. Therefore, Weenie's approach is to encourage the creation of small,
relatively unopinionated framework components that can be easily composed into a larger, more
opinionated framework.

Because of that, Weenie does express opinions of its own. However, it does so via components, which
are the primary export of this library. The primary Weenie components include a config system (from
`@wymp/config-node`), a logger, a sql database (`mysql2`), a pubsub abstraction (`amqp`), an HTTP
Client (`request-promise-native`), an HTTP Server (`express` with a lot of Weenie-specific overlays),
and a cron system. (Most of these components are conformant with
[Simple Interfaces](https://github.com/wymp/ts-simple-interfaces).)

These core components form the central philosophy of Weenie - that is, they are implemented in a way
that is narrowly scoped, but that does express an opinion about how Weenie likes to do things.

You are free to use them as a complete set to quickly and easily build microservices in Typescript.
([`src/example.ts`](./src/example.ts) should serve as a useful guide for doing that.)
However, you are also free to use some of them, or none of them, instead building your own set of
dependencies in a Weenie-compatible way. Doing so allows you to contribute to the library of
Weenie-compatible functionality that other developers can easily pull into their own code.

(Note that if you prefer to build your own Weenie-compatible framework from the ground up, you can
use the [`@wymp/weenie-base`](https://github.com/wymp/weenie-base) package instead of this one,
which contains SOLELY the `Weenie` function.)


### How to Build a Weenie Component

A Weenie component can be just about anything. To create a Weenie component, all you have to do is
create a function with the following signature:

```ts
type Component = <ExistingDeps, NewDeps>(d: ExistingDeps) => NewDeps;
```

For very small components - a cache connection or similar - you can just in-line the definitions.
For others, it will be more convenient to build the Weenie component together with whatever
abstraction you're building. For example, if you're building a special API client for an HTTP
service, you might export both the client class and the Weenie component from that module like so:

```ts
// Required config type
export type ApiConfig = {
  baseUrl: string;
  key: string;
  secret: string;
};

// Class
export class MyHttpClient {
  public constructor(protected readonly config: ApiConfig) {}
}

// Weenie function that adds an `httpClient` dependency
export myHttpClient = (d: { config: { api: ApiConfig } }) => ({
  httpClient: new MyHttpClient(d.config.api);
});
```


## Example

As always, the best way to understand things is usually by example. There is a fully-fledged service
built in `src/example.ts`. Here it is, copied for convenience:

```ts
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
import { config } from "@wymp/config-node";

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
} from "./";

// Runtypes for creating a final config validator
import * as rt from "runtypes";

// Some simple interfaces, used for creating our api clients (you might normally put these and the
// api client instantiation logic somewhere else, but it's all here to make the example more
// contained)
import {
  SimpleLoggerInterface,
  SimpleHttpClientInterface,
  SimpleSqlDbInterface,
} from "@wymp/ts-simple-interfaces";

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
  })
);
declare type ExampleConfig = rt.Static<typeof exampleConfigValidator>;

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
      "APP_",
      {
        env: process.env,
        defaultsFile: "./config.example.json",
        localsFile: "./config.local.json",
      },
      exampleConfigValidator
    )
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
        myPromise: new Promise<string>((res, rej) => setTimeout(() => res("resolved!"), 2000)),
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
    .and((d: BaseApiDeps & { config: { firstApi: ApiConfig; secondApi: ApiConfig } }) => {
      return {
        firstApi: new ApiClient({ envType: d.config.envType, ...d.config.firstApi }, d.logger),
        secondApi: new ApiClient({ envType: d.config.envType, ...d.config.secondApi }, d.logger),
      };
    })

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
              return d.sql.query<{ Database: string }>("SHOW DATABASES");
            },

            getTodo: async (todoId: number): Promise<Todo> => {
              const res = await d.firstApi.request<Todo>({ url: `/todos/${todoId}` });
              if (res.status >= 300) {
                throw new Error(
                  `Received non 2xx status code from api call: ${JSON.stringify(res.data)}`
                );
              }
              return res.data;
            },

            getUser: async (userId: number): Promise<User> => {
              const res = await d.secondApi.request<User>({ url: `/users/${userId}` });
              if (res.status >= 300) {
                throw new Error(
                  `Received non 2xx status code from api call: ${JSON.stringify(res.data)}`
                );
              }
              return res.data;
            },
          },
        };
      }
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
    .done(async d => {
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
    { "data-events": ["*.*.*"] },
    (msg, log) => {
      // The message content has already been converted to object format for us, but remains type
      // unknown. The first thing we always need to do is validate the type, since this is a runtime
      // boundary. In this case, we're feeling lazy, so just dumping the content.
      log.notice(`Got message with id ${msg.id}: ` + JSON.stringify(msg));
      return Promise.resolve(true);
    },
    { queue: { name: deps.config.serviceName } }
  );

  // Set up our webservice to handle incoming requests, and add middleware to log request info
  deps.http.use((req, res, next) => {
    deps.log.info(`Received request: ${req.path}`);
    next();
  });
  deps.http.get("/info", async (req, res, next) => {
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
            title: "Sorry, we screwed up",
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
  for (let row of dbsQuery.rows) {
    deps.log.notice(`* ${row.Database}`);
  }
})() // End async "init" function
  .catch(e => {
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
```

---

This example is pretty trivial. However, it's very functional, and it demonstrates how easy it
would be to modify the framework. Have a standard DBAL that you like? You can just write a
function that hangs it on the tree configured the way you like it, and then for any service that
you create, all you have to do is `.and(myDbal)`. Want a global cache? `.and` it in. Want an
exponential backer-offer? `.and` it in.

One of the interesting parts about this is that you can abstract whole parts of the tree away into
modules that represent your personal "way of doing things." For example, I could take the above and
wrap it into a `MyService` function, pass that to Weenie as a starting point and just start
`.and`ing from there.

Best of all, you can release lightweight functions that configure things in a useful way (logger
and config manager are ones that come mind as areas where people like to do things a variety of
different ways) and other people can incorprate those into _their_ microservices by just `.and`ing
them in.


## Future Development

For now, this framework provides just about all the functionality that I want from it. I don't have
any immediate plans for additional development, although I'm certainly open to adding more and/or
changing things. Feel free to submit an issue for any suggestions.

That said, one thing that I think would be interesting is a hot-reload function for changing config
values at runtime. In the past, I have wanted the ability to change config values via an API
endpoint (for example, turning on or off certain components or changing log levels). Currently,
updating primitive config values would not necessarily propagate those values into components that
are using them, since they may have been copied into components at bootup. To facilitate some sort
of hot-reloading, it might be cool to implement an event emitter that allows components to
re-initialize when one of the dependencies they care about changes.

