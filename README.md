# Weenie Base

**NOTE: As of version 0.4.0, weenie is now a project of [Wymp](https://github.com/wymp). Please use
[@wymp/weenie-base](https://github.com/wymp/weenie-base) for all future versions of this package.**

_This is the base package for the Weenie framework. See https://github.com/wymp/weenie-framework
for a more full-bodied explanation of the weenie framework itself._

This package provides a very minimal set of tools geared toward building dependency containers.
It is centered around a small function, `Weenie`, that allows you to build a strongly-typed
dependency container from the ground up, declaratively including and exposing only the dependencies
you want, rather than relying on a big and/or opinionated framework for everything.

The definition of Weenie is as follows:

```ts
type Weenie = <Deps>(deps: Deps) => Extensible<Deps>;

type Extensible<Deps = {}> = Deps & {
  and: <NextDeps extends {}>(next: (deps: Deps) => NextDeps) => Extensible<Deps & NextDeps>;
  done: <FinalDeps extends {}>(final: (deps: Deps) => FinalDeps) => FinalDeps;
};
```

In human language, all this says is:

For any given object, the Weenie function returns the object with two additional methods, `and` and
`done`.

The `and` method takes a function, `next`, whose argument is the given object (or a subset of it, or
nothing) and which returns an arbitrary new object. The `and` method returns a combination of the
given object, the object returned by `next`, and an updated set of `and` and `done` methods.

The `done` method takes a function, `final`, whose argument is the given object (or a subset of it,
or nothing) and which returns an arbitrary new object. The `done` method returns the value returned
by `final`.

Here's a very minimal example of what that looks like in practice:

```ts
type A = { a: string };
type B = { b: boolean };
type C = { c: number };
type Answer = { answer: string };

const a: A & Extensible<A> = Weenie({ a: "a" });
const b: A & B & Extensible<A & B> = a.and(() => ({ b: true }));
const c: A & B & C & Extensible<A & B & C> = b.and(() => ({ c: 3 }));
const full: A & B & C & Answer & Extensible<A & B & C & Answer> = c.and((deps: B) => ({
  answer: deps.b ? "D is the way" : "D is not the way",
}));
const final: Answer = full.done(deps => ({
  answer:
    `If A is ${a}, B is {deps.b ? "true" : "false"} and C is ${deps.c}, then the answer ` +
    `is ${deps.answer}`,
}));
```

Note that each line _adds_ a little bit to the total dependency container. The last call to the
`done` method simply returns whatever is returned by the function that is its argument. This allows
you to encapsulate dependencies that should not be exposed publicly.

## Additional Exports

In addition to the core `Weenie` function, this library also exports two config functions that can
be used to easily handle config from files or from environment variables:

```ts
// Get config from a default file with an optional override, validated by `validator`
function configFromFiles<Config>(
  defaultPath: string,
  overridePath: string,
  // This is expected to be a Runtypes validator, but could theoretically be anything
  validator: { check: (o: any) => Config }
) => (() => { config: Config });

// Get config from environment variables
function configFromEnv<Config>(
  env: { [k: string]: string | undefined },
  // This is expected to be a Runtypes validator, but could theoretically be anything
  validator: { check: (o: any) => Config },
  defaultsFilePath?: string,
  ns: string = "APP",
  delimiter: string = "_"
): (() => { config: Config });
```

Both of these functions are built to be compatible as an argument to `and`, but are most often used
to initiate a weenie container. In that case, the resulting function must actually be called. For
example, `d = Weenie(configFromFiles("config.json", "config.local.json", checker)())`.

The library also exports an obscure "service manager" dependency that can be used to monitor
start-up and/or trigger actions when all dependencies are fully loaded. See
[`src/ServiceManager`](src/ServiceManager) for more information on that.

Finally, it exports the `deepmerge` function that it uses to perform object merging. This is simply
for convenience for downstream libraries, since it seems `deepmerge` is an oft-wanted function. (It
only implements a native `deepmerge` function to avoid a dependency.)

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
and we used the `myVar` property of the config object. If the config object - as validated by the
`myConfigValidator` object - had not defined `myVar`, Typescript would have thrown an error at
compile time saying that `myVar` doesn't exist on `app.config`..

Thus, the result of using Weenie is easy-to-read dependency structuring with strict typing
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
