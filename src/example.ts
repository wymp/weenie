import { Weenie } from "./Weenie";

// Don't want to add unnecessary dependencies just for the example, so we're just ts-ignoring this
// for now.
// @ts-ignore
const p: any = process || { exit: () => 1 };

/**
 * Weenie works using functions that (optionally) take a certain set of dependencies as input and
 * return a new dependency as output. In this way, you can build a dependency injection container
 * to instantiate all of the dependencies that your application needs up front and in plain sight.
 *
 * You can then pass this container around to application logic. This scheme makes your
 * components highly testable and composable, and greatly improves your ability to work with and
 * change your application.
 *
 * For this example, we're going to create a couple contrived dependencies then stitch them all
 * together with Weenie and start up a little example app.
 */

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// "WEENIE" FUNCTIONS - FUNCTIONS THAT WILL INSTANTIATE ONE OR OCCASIONALLY MULTIPLE DEPENDENCIES //
// AND ADD THEM TO THE CONTAINER                                                                  //
//                                                                                                //
// Note that in the real world, you would typically define these dependency functions in your     //
// library, sometimes together with the dependency itself. In this example, we're doing it all in //
// one file for simplicity.                                                                       //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Config type
 *
 * This will often be the first dependency of your application, since nearly all else will depend on
 * it. If you need your application to dynamically update when configuration changes, you'll have to
 * build in some eventing, but for now we're just going to do a simple static config.
 */
type Config = {
  appName: string;
  envName: string;
  promiseWaitMs: number;
  valueOfC: string;
};

/**
 * dep1 - A contrived dependency that doesn't require anything to initialize
 */
const dep1 = () => ({
  a: "one",
  b: "two",
});

/**
 * internalDep - An internal dependency, i.e., a dependency of a dependency - one that your final
 * app will not need to know about.
 */
const internalDep = (d: { a: string; b: string }) => ({
  internal: `Internal: ${d.a}`,
});

/**
 * dep2
 *
 * Some other dependency that requires the first dependency and the internal dependency in order
 * to initialize. Note that this dependency actually changes the value of the `b` key. This is
 * not encouraged, but is possible ¯\_(ツ)_/¯.
 *
 * Notice that we're using a very narrow config type here. Always a good idea to keep interfaces
 * narrow when possible to keep the cognitive load of components down.
 */
const dep2 = (d: { config: Pick<Config, "valueOfC">; a: string; b: string; internal: string }) => ({
  b: `three (previously ${d.b})`,
  c: `${d.config.valueOfC}`,
  reveal: `Internal dependency: ${d.internal}`,
});

/**
 * promiseDep - An async dependency that we'll have to wait on before finishing
 *
 * This is quite common in real apps (e.g., when establishing connections to databases, MQs, etc.),
 * so I thought it would be nice to demo it here.
 */
const promiseDep = (d: { config: Pick<Config, "promiseWaitMs"> }) => ({
  asyncValue: new Promise<string>((res) => {
    let awaited = 0;
    const awaitNextBit = () => {
      if (awaited >= d.config.promiseWaitMs) {
        console.log(`Continuing.`);
        res(`Waited ${d.config.promiseWaitMs / 1000} seconds for this.`);
      } else {
        console.log(`${(d.config.promiseWaitMs - awaited) / 1000}...`);
        const wait = Math.min(1000, d.config.promiseWaitMs - awaited);
        awaited += wait;
        setTimeout(awaitNextBit, wait);
      }
    };
    awaitNextBit();
  }),
});

/**
 * notherPromiseDep - An async dependency that depends on promiseDep
 */
const notherPromiseDep = (d: { asyncValue: Promise<string> }) => ({
  // When a dependency depends on another async dependency, you'll want to return an object with keys
  // whose _values_ are promises returning the actual dependency. In this case, we want a thing that
  // will tell us what our async value was, but do it synchronously.
  sayValue: d.asyncValue.then((v) => () => `Async value is "${v}"`),
});

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// INIT FUNCTION - IF YOU DEFINE THIS FUNCTION SEPARATELY FROM YOUR BOOTSTRAP PROCESS, YOU CAN    //
// USE TYPESCRIPT'S TYPE INFERENCE TO DERIVE THE FULL TYPE OF YOUR DEPENDENCIES. THIS CAN BE      //
// EXTREMELY HELPFUL FOR BUILDING OUT YOUR APP AND FOR TESTING.                                   //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////

const init = async () => {
  // Start Weenie off with your config
  const deps = await Weenie({
    config: {
      appName: "Example App",
      envName: "example",
      promiseWaitMs: 5000,
      valueOfC: "This is C!",
    },
  })
    // Now add dependencies, one by one. Each one changes the type of the current dependency
    // collection
    .and(dep1)
    .and(internalDep)
    .and(dep2)
    .and(promiseDep)
    .and(notherPromiseDep)

    // When all of your dependencies are instantiated, you can clean them up and return just the
    // ones you need for your app. This is usually where you'll await all your async dependencies
    // and turn them into concrete ones.
    .done(async (d) => {
      const [asyncValue, sayValue] = await Promise.all([d.asyncValue, d.sayValue]);
      return {
        config: d.config,
        a: d.a,
        b: d.b,
        c: d.c,
        reveal: d.reveal,
        asyncValue,
        sayValue,
      };
    });

  // Now you can return your DI container
  return deps;
};

// We'll make a type out of it for later use in our app
type Deps = Awaited<ReturnType<typeof init>>;

////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                //
// BOOTSTRAP PROCESS - HERE, WE'LL DEFINE A FUNCTION AND SUBSEQUENTLY CALL IT TO INSTANTIATE ALL  //
// OUR DEPENDENCIES AND PASS THEM DOWN INTO THE APPLICATION                                       //
//                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////

// Let's pretend our app is some big collection of handlers defined off in our library (but for now
// we're just faking it)
const app = {
  go: (deps: Deps) => {
    console.log(`Done initializing dependencies for app ${deps.config.appName}:`);
    console.log("");
    console.log(`Environment: ${deps.config.envName}`);
    console.log(`A: ${deps.a}`);
    console.log(`B: ${deps.b}`);
    console.log(`C: ${deps.c}`);
    console.log(`Async Value: ${deps.asyncValue}`);
    console.log(`Said another way: ${deps.sayValue()}`);
    console.log(`Revealed: ${deps.reveal}`);
    // console.log(`Internal: ${deps.internal}`); // << Doesn't work because this was removed
    // console.log(deps.d) // << also won't work because we didn't add this

    // This wouldn't work either, because the input to the dep2 function is insufficient
    // const doesntWork = Weenie({ appName: 'My App' }).and(dep2);

    console.log("");
    console.log("Thank you for viewing");
    p.exit();
  },
};

// Actual bootstrap call - init and go!!
(async () => {
  console.log(`Initializing....`);
  const deps = await init();
  app.go(deps);
})().catch((e) => {
  console.error(e);
  p.exit(1);
});
