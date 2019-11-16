Weenie Base
===================================================================

*See https://github.com/kael-shipman/weenie-framework for a more full-bodied explanation of the
weenie framework.*

This is the base package for the Weenie framework. It provides a small function, `Weenie`, that
allows programmers to build up a service from the ground without having to include dependencies
that they don't want.

It provides a number of convenience functions for instantiating components like loggers, databases,
Pub/Sub clients, HTTP clients, etc., using lightweight "Simple" interfaces (see
https://github.com/kael-shipman/ts-simple-interfaces). These core components form the central
philosophy of Weenie - that is, they are implemented in a way that expresses an opinion about
how Weenie should be used.

HOWEVER.

The overwhelming goal of Weenie is to free the world of the tyranny of opinionated frameworks. To
this end, you don't _have_ to use the opinionated implementations built into Weenie. In fact,
the actual concrete implementations that actually utilize real dependencies are all in a different
package, [`weenie-framework`](https://github.com/kael-shipman/weenie-framework), specifically so
that you can still extract a lot of value out of the Weenie philosophy without being goverened
or overburdened by the personal opinions of the programmers who have built the core framework.

This package is intended to be included by other packages that may want to provide a different
core set of operating assumptions for a framework. It can even be used as a _component_ of a bigger
framework. The whole point is that it shouldn't limit your possibilities with its own opinions of
how the world works.

The only real accomplishment of Weenie is that it allows you to easily build up a strongly-typed
set of dependencies that your application components can utilize safely and without bloat. If you
need a logger, you can attach one. If you need a database, you can attach that, too. Pub/Sub?
Great. Attach it. But if all you need is config, then you can instantiate it with that, too, and
still benefit from the philosophies of this or that specific config _system._

As always, the best way to understand this is probably through examples.

## Examples

Here's the simplest case: You like the way Weenie handles config and you want to use that to
build a little script that just does some one-off task.

```ts
import { Weenie, config } from "weenie-base";
import { MyConfig, myConfigValidator } from "./Types";

const app = new Weenie(
  config<MyConfig>("./config.json", "./config.local.json", myConfigValidator)()
);

if (app.myVar === "123") {
  console.log("We're in 123 mode");
} else {
  console.log("We're not in 123 mode");
}

console.log("Yay, we did it!");
process.exit();
```

Here's one that's a little more complex. It's an application that utilizes the Weenie standard
config (see `src/Types.ts` for Weenie's approach to config), Weenie MQ system, Weenie web
services system, and Weenie cron system to subscribe to system events, respond to HTTP requests,
and do time-based tasks.

```ts
import {
  Weenie,
  config,
  appConfigValidator,
  AppConfig,
  logger,
  mq,
  db,
  cron,
  webservice,
  serviceManager,
} from "weenie-base";
import { myEmailer } from "./Types";
import { getMyHandlers } from "./MessageHandlers";
import * as WebHandlers from "./WebHandlers";
import { cronjobs } from "./Cron";

const app = new Weenie(
  config<AppConfig>("./config.json", "./config.local.json", appConfigValidator)()
)
.and(logger)
.and(serviceManager)
.and(db)
.and(mq)
.and(myEmailer)
.and(cron)
.and(webservice)

// Now the dependencies are all set up, we can utilize them. Note how we're using the app as an
// argument to the `getMyHandlers` function, which allows us to pass the dependencies down into
// the handlers themselves.
//
// In this case, let's suppose that `myEmailer`, attached above, is required by some of the
// message handlers. Here's how we can neatly make that possible.
app.mq.registerHandlers(getMyHandlers(app));

// Add Cron Jobs
// Note that the function that adds the cron system actually requires a logger, so it would not
// be possible to use this cron system without having previously attached a logger, thus we don't
// need to do anything else for the cron system to work
app.cron.registerCronjobs(cronjobs);

// Now we'll register some endpoints (webservice is just a `SimpleHttpRequestRouterInterface`, so
// we can just attach endpoints to it as needed). Weenie's particular implementation of a
// webservice adds certain niceties, like a fall-through error handler and some content
// negotiations.
app.webservice
  .get("/stats", WebHandlers.Stats(app))
  .post("/bell-ring", WebHandlers.BellRing(app));

// Notice that we added a service manager to the app. That attaches two components: a
// `startupCheck` array that allows dependencies to add promises that should resolve to true in
// order to signal that the app is fully ready to go; and a `run` function that simple awaits
// the promises and either dies or blesses the app, depending on the outcome. Because of that
// addition, we have to call `run` here or the app will die after the `initializationTimeout` is
// reached.
app.run();

```
