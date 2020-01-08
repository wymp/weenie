import { FrameworkConfig, frameworkConfigValidator } from "./Types";
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
    internal: r.a
  }
}

// Some other dependency that requires the first dependency and the internal dependency in order
// to initialize
function dep2(r: { a: string; b: string; internal: string; }) {
  return {
    b: `three (previously ${r.b})`,
    c: "four",
    result: `Internal dependency: ${r.internal}`,
  };
}

// Our finishing function, which removes the internal dependency
function finish(r: { config: FrameworkConfig; a: string; b: string; c: string; result: string }) {
  return {
    config: r.config,
    a: r.a,
    b: r.b,
    c: r.c,
    result: r.result
  }
}

// Now you can instantiate the app in a couple different ways and build it up

// Standard flow: Start with config and add dependencies all in one swoop.
const standard = Weenie(
  configFromFiles<FrameworkConfig>(
    "./config.example.json",
    "./config.local.json",
    frameworkConfigValidator
  )()
)
.and(dep1)
.and(internalDep)
.and(dep2)
.done(finish);

console.log(`Environment: ${standard.config.envName}`);
console.log(`A: ${standard.a}`);
console.log(`B: ${standard.b}`);
console.log(`C: ${standard.c}`);
console.log(`Result: ${standard.result}`);
// console.log(`Internal: ${standard.internal}`); << Doesn't work because this was removed
// console.log(standard.d) << also won't work because we didn't add this

// This wouldn't work either, because the input to the dep1 function is insufficient
// const doesntWork = Weenie({}).and(dep2);
// console.log(`B: ${doesntWork.b}`);
//
// NOTE: For unknown reasons, the above does _sometimes_ work, even though it shouldn't.
// It always produces the correct errors on https://www.typescriptlang.org/play/index.html,
// but when run locally _using the same version of typescript,_ it sometimes produces errors and
// sometimes doesn't.

