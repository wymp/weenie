import { Weenie } from "./Weenie";
import { configFromFiles } from "./Config";

/**
 * Weenie works using functions that (optionally) take a certain set of dependencies as input and
 * return a new dependency as output. In this way, you can build a "resource bag", where each
 * component has the resources it needs without too much extra.
 *
 * You can then pass this "resource bag" around to application logic. This scheme makes your
 * components highly testable and composable.
 */

// Config type
type Config = {
  envName: string;
  promiseWaitMs: number;
  valueOfC: string;
};

// Some initial dependency that doesn't require anything to initialize
function dep1() {
  return {
    a: "one",
    b: "two",
  };
}

// An internal dependency that won't be exposed at the end
function internalDep(r: { a: string; b: string }) {
  return {
    internal: `Internal: ${r.a}`,
  };
}

// Some other dependency that requires the first dependency and the internal dependency in order
// to initialize. Note that this dependency actually changes the value of the `b` key. This is
// not encouraged, but is possible.
function dep2(r: {
  config: {
    valueOfC: string;
  };
  a: string;
  b: string;
  internal: string;
}) {
  return {
    b: `three (previously ${r.b})`,
    c: `${r.config.valueOfC}`,
    result: `Internal dependency: ${r.internal}`,
  };
}

// An async dependency that we'll have to wait on before finishing
function promiseDep(r: { config: { promiseWaitMs: number } }) {
  return {
    asyncValue: new Promise<string>(res => {
      setTimeout(
        () => res(`Waited ${r.config.promiseWaitMs / 1000} seconds for this.`),
        r.config.promiseWaitMs
      );
    }),
  };
}

// Our finishing function, which removes the internal dependency
async function finish(r: {
  config: Config;
  a: string;
  b: string;
  c: string;
  asyncValue: Promise<string>;
  result: string;
}) {
  const asyncValue = await r.asyncValue;
  return {
    config: r.config,
    a: r.a,
    b: r.b,
    c: r.c,
    result: r.result,
    asyncValue,
  };
}

// Now you can instantiate the app in a couple different ways and build it up

// Standard flow: Start with config and add dependencies all in one swoop.
// (Need to wrap this in an async function because of the promiseDep)
console.log(`Initializing....`);
(async () => {
  const standard = await Weenie(
    configFromFiles<Config>("./config.example.json", "./config.local.json", {
      check: (c: any): Config => {
        // For this example, we're just doing manual checking, but this would normally be something
        // like Runtypes of iots.
        if (
          typeof c.envName !== "string" ||
          typeof c.promiseWaitMs !== "number" ||
          typeof c.valueOfC !== "string"
        ) {
          throw new Error(`Config is invalid`);
        }
        return c;
      },
    })()
  )
    .and(dep1)
    .and(internalDep)
    .and(dep2)
    .and(promiseDep)
    .done(finish);

  console.log(`Done initializing dependencies:`);
  console.log("");
  console.log(`Environment: ${standard.config.envName}`);
  console.log(`A: ${standard.a}`);
  console.log(`B: ${standard.b}`);
  console.log(`C: ${standard.c}`);
  console.log(`Async Value: ${standard.asyncValue}`);
  console.log(`Result: ${standard.result}`);
  // console.log(`Internal: ${standard.internal}`); << Doesn't work because this was removed
  // console.log(standard.d) << also won't work because we didn't add this

  // This wouldn't work either, because the input to the dep2 function is insufficient
  // const doesntWork = Weenie({}).and(dep2);
  // console.log(`B: ${doesntWork.b}`);

  console.log("");
  console.log("Thank you for viewing");
  process.exit();
})().catch(e => {
  console.error(e);
  process.exit(1);
});

// (Little hack to get the script to stay open long enough for the promise to resolve)
//setInterval(() => {}, 1 << 30);
