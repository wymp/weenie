Weenie Retry
========================================================================================================================

This package is meant to be used with [Weenie](https://wymp.github.io/weenie). However, if you are not using
Weenie but are interested in this functionality, there's nothing wrong with using it directly.

This package provides a small collection of retry strategies that you can use for handling potentially temporary
failures like processing MQ messages, making database calls, or calls to other services that may be down.

The strategies it provides are the following:

* **Exponential Backoff,** whereby the length of time the system waits between retries doubles each time.
* **Periodic,** whereby the job is tried every X microseconds

See [defnitions](./src/retry.ts) for more detailed documentation.
