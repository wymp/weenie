Cron
========================================================================================================================

This package is meant to be used with [Weenie](https://npmjs.com/@wymp/weenie-base). However, if you are not using
Weenie but are interested in this functionality, there's nothing wrong with using it directly.

This package is a simple wrapper around the [`cron` package](https://npmjs.com/package/cron) making it weenie-compatible.

It does, however, add a sprinkling of dreaded "magic" functionality over and above the regular cron package. In
particular, if the Weenie `serviceManager` package is added to your dependencies prior to this, this system will await
the `whenReady` promise provided by the service manager and it will add a shutdown task to kill all active cronjobs. You
can still use it as normal, just know that your cronjobs will not actually be initialized until the `declareReady`
function is called, thus resolving the `whenReady` promise.

Also note that this package provides the `MockCron` class and the corresponding `mockCron` weenie function. These can
be used in test environments to more easily test cron registration without actually initializing active cronjobs.
