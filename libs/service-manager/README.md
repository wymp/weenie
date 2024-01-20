Weenie Service Manager
========================================================================================================================

This package is meant to be used with [Weenie](https://npmjs.com/@wymp/weenie-base). However, if you are not using
Weenie but are interested in this functionality, there's nothing wrong with using it directly.

### Functionality

*The main export of this library is the `serviceManager` function, which returns a `svc` dependency with three
properties: `whenReady: Promise<void>`, `declareReady: () => void` and
`onShutdown: (task: () => Promise<void>) => void`. See [src/serviceManager.ts](src/serviceManager.ts) for more detailed
documentation.*

* **Startup monitoring** - Sets a timeout (configurable with `config.svc.initializationTimeoutMs`) that kills the
  process if the `svc.declareReady()` function is not called within the configured time. When `svc.declareReady()` is
  called, the `svc.whenReady` promise is resolved, allowing dependents to activate functionality when all dependencies
  are known to be ready.
* **Shutdown management** - If configured to do so (with `config.svc.handleShutdown`), registers event listeners on
  `SIGINT` and `SIGTERM` signals and runs any shutdown tasks prior to exiting the process. Shutdown tasks may be
  registered by passing a function returning a promise to the `svc.onShutdown()` function. For example, you may want to
  close your database cleanly on shutdown, so you might pass `svc.onShutdown(() => db.close())`.

### Config

See [src/serviceManager.ts](src/serviceManager.ts) for config options. (If you use a modern editor like vscode, the
documentation should pop up on mouse-over.)
