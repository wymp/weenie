Weenie Base
==================================================================================================


## Overview

_This is the base package for the Weenie framework. See https://wymp.github.io/weenie for a more
full-bodied explanation of the weenie framework itself._

**Weenie is a Typescript microservices framework.** (Sort of.)

It attempts to provide a _much_ simpler and easier solution to building microservices than other
frameworks such as NestJS. In reality, while Weenie is called a microservices framework, it is
nothing more than an easy and elegant way to create a strongly-typed dependency injection container.

This package provides a very minimal set of tools geared toward building that container. It is
centered around a small function, `Weenie`, that allows you to build the DI container from the
ground up, declaratively including and exposing only the dependencies you want, rather than relying
on a big and/or opinionated framework for everything.

(For the full Weenie Framework, see https://github.com/wymp/weenie-framework, which provides several
pre-built dependencies such as mysql, rabbitMQ, and a configurator to get you up and running
quickly.)

The function definition of Weenie is as follows:

```ts
declare function Weenie<Deps = Obj>(deps: Deps): Extensible<Deps>;
declare type Obj = Record<string | number | symbol, unknown>;

declare type Extensible<Deps = Obj> = Deps & {
  and: <NextDeps extends Obj>(next: (deps: Deps) => NextDeps) => Extensible<Deps & NextDeps>;
  done: <FinalDeps extends Obj | Promise<Obj>>(fin: (deps: Deps) => FinalDeps) => FinalDeps;
};
```

In human language, all this says is:

For any given object, the Weenie function returns a dependency injection container with two additional
methods, `and` and `done`.

The `and` method takes a function, `next`, whose argument is the current DI container (or a subset of
it, or nothing) and which returns an arbitrary new object. The `and` method returns a new DI container
which is the _combination_ of the current DI container, the new dependencies returned by the `next`
function, and an updated set of `and` and `done` methods.

The `done` method takes a function, `final`, whose argument is the current DI container (or a subset
of it, or nothing) and which returns an arbitrary final DI container (optionally through a promise).
The `done` method returns the value returned by `final`. Note that this object does not have the `and`
and `done` methods, since it is considered the final DI container.

See the main [Weenie Webpage](https://wymp.github.io/weenie) for more detailed examples and documentation.


## Additional Exports

In addition to the core `Weenie` function, this library also exports a `deepmerge` function that it
uses to perform object merging. This is simply for convenience for downstream libraries, since it
seems `deepmerge` is an oft-wanted function. (It only implements a native `deepmerge` function to
avoid a dependency, since Weenie is proudly dependency-free.)

