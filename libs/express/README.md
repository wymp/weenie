Weenie Express
========================================================================================================================

This package is meant to be used with [Weenie](https://npmjs.com/@wymp/weenie-base). However, if you are not using
Weenie but are interested in this functionality, there's nothing wrong with using it directly.

The only required config for this module is `config.http.listener.port`. You may also set `config.http.listener.host` to
override the default host (`localhost`).

This module augments a standard express app with some convenient additional functionality, each piece corresponding
to an optional config value. Specifically:

* **`config.http.logIncomingReqs` (default `true`)** - Emit a `debug`-level log message for each incoming request with
  the request method and URL.
* **`config.http.parseJson` (default `true`)** - Automatically parse bodies as JSON for the configured mime types (see
  next).
* **`config.http.jsonMimeTypes` (default `['application/json', 'application/json-rpc']`)** - Which mime types to parse
  as JSON (only applicable if `config.http.parseJson` is `true`).
* **`config.http.handleErrors` (default `true`)** - Handle errors in our standard way. If a request provides an `accept`
  header for JSON-RPC, returns a JSON-RPC-formatted error. Otherwise, returns `{ t: "error"; error: HttpError; }`.
* **`config.http.handleFallthrough` (default `true`)** - Automatically throw 404 error if a request is not handled by
  one your registered handlers.
* **`config.http.listenOnReady` (default `true`)** - This is very Weenie-specific. The Weenie framework provides a 
  ["service manager"](https://wymp.github.io/weenie/weenie-service-manager) that provides a `whenReady` promise as a 
  dependency. If `listenOnReady` is set to `true`, then this library automatically listens on the configured port and
  interface when you call `deps.svc.declareReady()`.
* **`config.mask500Errors` (default `true`)** - If true or set to a string, this will mask the text of any 500 errors
  that are caught. If set to `true`, a default string is used. If set to a string, that string is used as the message.
* **`config.errOnBlankPost` (default `true`)** - Sometimes users will use the wrong content-type header for a POST, PUT
  or PATCH request, and this will result in the request body not parsing and appearing blank. If this option is set to
  true, a detailed error is thrown when a POST, PUT or PATCH request has a blank body to try to help the user figure out
  what's wrong. If you have any POST, PUT or PATCH endpoints that do not require a body, then set this to false.

Returns the following dependencies:

* **`deps.http`** - The express app. You can use this to register endpoints and middleware.
* **`deps.getHttpServers`** - A function that can be used to return all active http servers (returned by
  `express.listen`). You can use this to shut down the HTTP servers on `SIGINT` or `SIGTERM` or in tests, etc.


### Example

Following is a typical example of how you'd use this.

```ts
import { Weenie, express, logger, serviceManager } from '@wymp/weenie-framework';

const config = {
  logger: {
    logLevel: 'notice',
  },
  svc: {
    handleShutdown: true,
  },
  http: {
    listener: {
      port: 80,
      host: '0.0.0.0',
    },
    logIncomingReqs: true,
    parseJson: true,
    jsonMimeTypes: ['application/json', 'application/json-rpc', 'application/vnd.api+json'],
    handleErrors: true,
    handleFallthrough: true,
    listenOnReady: true,
    mask500Errors: 'Oops! There was an error',
    errOnBlankPost: true,
  },
}

const deps = Weenie({ config })
  .and(logger)
  .and(serviceManager)
  .and(express)
  .done((d) => {
    // Use the service manager's shutdown tasks to shut down any HTTP servers that we've opened
    d.onShutdown(async () => {
      const servers = d.getHttpServers() ?? [];
      await Promise.all(
        servers.map((s) => new Promise<void>((res) => s.close(res)))
      );
    });

    return {
      log: d.log,
      svc: d.svc,
      http: d.http,
    }
  });

// Do other things ....
// For example:
deps.http.get('/', (req, res, next) => {
  deps.log.notice('Yaaaaaay');
  res.json({ status: 'ok' });
});

// Now declare that we're ready for business. Because of our configuration, this will start our HTTP server.
deps.svc.declareReady();
```
