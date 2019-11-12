Weenie Base
===================================================================

*See https://weenie.kaelshipman.me for a more full-bodied explanation of the weenie framework.*

This is the base package for the Weenie framework. It uses simple interfaces to define the
structure and some of the logic for a typical microservice.

This package is intended to be included by other packages that do the work of actually defining
(slightly) more opinionated implementations of the framework. For example, the `weenie-framework`
package provides concrete implementations for components that actually make up the official
Weenie framework. It then provides those implementations to the code from this package for proper
structuring, gluing and instantiation.

This package may be used directly by those wishing to provide alternate implementations of the
components that comprise a microservice, like loggers, pub-subs, http clients, etc.

The main philosophy behind Weenie Base is that it should provide a function library that can be
stitched together later into a framework that's powerful, minimal, and strongly-typed.


## Examples

Example of instantiating a simple service:

```ts
import { Weenie, appConfigValidator } from "weenie-framework";
import { MyExtendedResources } from "./Types";
import { handlers } from "./MessageHandlers";
import { cronjobs } from "./Cron";

// Here we're using config files for config and validating on startup with our appConfigValidator
const app = (new Weenie("./config.json", "./config.local.json", appConfigValidator))
  .and(logger)
  .and(db)
  .and(mq)


// Instantiating the app just sets up config and logger - the two most basic resources. From here,
// we set up other resources, but these will explode at runtime if the resources they depend on
// fail to instantiate (because of bad config, for example).

// Add MQ Message Handlers
app.registerMessageHandlers(handlers);

// Add Cron Jobs
app.registerCronjobs(cronjobs);

// Add 
```
