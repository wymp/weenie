Weenie Base
==================================================================================================

_This is the base package for the Weenie framework. See https://github.com/wymp/weenie-framework
for a more full-bodied explanation of the weenie framework itself._

This package provides a very minimal set of tools geared toward building strongly-typed dependency
containers. It is centered around a small function, `Weenie`, that allows you to build a
strongly-typed dependency container from the ground up, declaratively including and exposing only
the dependencies you want, rather than relying on a big and/or opinionated framework for everything.

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
`done` method simply returns a type which is implied by whatever is returned by the function that is
its argument. This allows you to encapsulate dependencies that should not be exposed publicly.


## Additional Exports

In addition to the core `Weenie` function, this library also exports a `deepmerge` function that it
uses to perform object merging. This is simply for convenience for downstream libraries, since it
seems `deepmerge` is an oft-wanted function. (It only implements a native `deepmerge` function to
avoid a dependency.)

## Examples

Here's the simplest case: You like the way Weenie handles config and you want to use that to
build a little script that just does some one-off task.

```ts
import { Weenie } from "weenie-base";

const app = new Weenie({
  config: { myVar: "abc" }
})
.and((d: { config: { myVar: string } }) => {
  return {
    output: d.config.myVar === "123" ? "We're in 123 mode" : "We're not in 123 mode",
  }
});

console.log(`My var: '${app.myVar}'`);
console.log(`Final output: ${app.output}`);
console.log("Yay, we did it!");
process.exit();
```

This example is almost uselessly simple, but it does demonstrate the value that Weenie offers: that
you can chain together abstractions that declaratively build up a dependency container, then use
that dependency container with total type safety.

In other words, in the above example, we created a Weenie with one initial property, `config`. Then
we used the `myVar` property of the config object to add the `output` key to the container, and
finally we used the finished container to output the message.  If the config object had not defined
`myVar`, Typescript would have thrown an error at compile time saying that `myVar` doesn't exist on
the given object; if we had not returned an object with a string `output` value, Typescript would
have thrown en error about that. Everything that we return from an `and` function gets tacked onto
the dependency container, types included.

Thus, the result of using Weenie is easy-to-read dependency structuring with strict typing
throughout.

See [Weenie Framework](https://github.com/wymp/weenie-framework) for more complex examples.

