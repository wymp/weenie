# Weenie Base

**NOTE: As of version 0.4.0, weenie is now a project of [Wymp](https://github.com/wymp). Please use
@wymp/weenie-base for all future versions of this package.**

_See https://github.com/wymp/weenie-framework for a more full-bodied explanation of the
weenie framework._

This is the base package for the Weenie framework. It provides a small function, `Weenie`, that
allows programmers to build up a strongly-typed dependency container from the ground, declaratively
including and exposing only the dependencies they want, rather than relying on a big and/or
opinionated framework.

It provides a number of convenience functions for instantiating components like loggers, databases,
Pub/Sub clients, HTTP clients, etc., using lightweight "Simple" interfaces (see
https://github.com/kael-shipman/ts-simple-interfaces). These core components form the central
philosophy of Weenie - that is, they are implemented in a way that expresses an opinion about
how Weenie should be used.

HOWEVER.

The overwhelming goal of Weenie is to free the world of the tyranny of opinionated frameworks. To
this end, you don't _have_ to use the opinionated implementations built into Weenie. In fact,
the actual concrete implementations that actually utilize real dependencies are all in a different
package, [`weenie-framework`](https://github.com/wymp/weenie-framework), specifically so
that you can still extract a lot of value out of the Weenie philosophy without being goverened
or overburdened by the personal opinions of the programmers who have built the core framework.

This base package is intended to be included by other packages that may want to provide a different
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
import { Weenie, configFromFiles } from "weenie-base";
import { MyConfig, myConfigValidator } from "./Types";

const app = new Weenie(
  configFromFiles<MyConfig>("./config.json", "./config.local.json", myConfigValidator)()
);

if (app.config.myVar === "123") {
  console.log("We're in 123 mode");
} else {
  console.log("We're not in 123 mode");
}

console.log("Yay, we did it!");
process.exit();
```

This example is almost uselessly simple, but it does demonstrate the value that Weenie offers: that
you can chain together abstractions that declaratively build up a dependency container, then use
that dependency container with total type safety.

In other words, in the above example, Weenie added the `config` key to the dependency container,
and we used the `myVar` property of the config object. If the config object had not defined
`myVar`, Typescript would have thrown an error at compile time.

Thus, the result of using Weenie is easy-to-read dependency management with strict typing
throughout.

See [Weenie Framework](https://github.com/wymp/weenie-framework) for more complex examples.

## Testing

**NOTE:** Because we're testing some process control stuff, you have to use the `-i` flag to
successfully run the tests. Furthermore, for whatever reason, the tests only run correctly after
an initial failing run.

Thus, to successfully run the tests, do this:

```
npm t -- -i
npm t -- -i
```

(yes, twice)
