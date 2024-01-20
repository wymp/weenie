Logger
========================================================================================================================

This package is meant to be used with [Weenie](https://npmjs.com/@wymp/weenie-base). If you are not using Weenie but
are interested in this logger, try [`@wymp/simple-logger-console`](https://npmjs.com/package/@wymp/simple-logger-console),
as all this package does is wrap that package in a weenie-compatible function.

Usage example:

```ts
import { Weenie } from "@wymp/weenie-base";
import { logger } from "@wymp/weenie-logger";

const deps = Weenie({ config: { logger: { logLevel: "error" } } })
  .and(logger);

deps.log.debug(`This won't output anything because it's at debug level.`);
deps.log.error(`This will.`);
```
