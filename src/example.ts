import { FrameworkConfig, frameworkConfigValidator } from "./Types";
import { Weenie } from "./Weenie";
import { config } from "./Config";

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

// Some other dependency that requires the first dependency in order to initialize
function dep2(r: { a: string; b: string}) {
  return {
    b: `three (previously ${r.b}`,
    c: "four",
  };
}

// Now you can instantiate the app in a couple different ways and build it up

// Standard flow: Start with config and add dependencies all in one swoop.
const standard = Weenie(
  config<FrameworkConfig>(
    "./config.example.json",
    "./config.local.json",
    frameworkConfigValidator
  )()
)
.and(dep1)
.and(dep2)

console.log(`Environment: ${standard.config.envName}`);
console.log(`A: ${standard.a}`);
console.log(`B: ${standard.b}`);
console.log(`C: ${standard.c}`);

// Won't work:
// console.log(standard.d)

// This wouldn't work either, because the input to the dep1 function is insufficient
//const doesntWork = Weenie({}).and(dep2);
//console.log(`B: ${doesntWork.b}`);
//
// NOTE: For unknown reasons, the above does _sometimes_ work, even though it shouldn't.
// It always produces the correct errors on https://www.typescriptlang.org/play/index.html,
// but when run locally _using the same version,_ it sometimes produces errors and sometimes
// doesn't.


// Minimal flow: Instantiate a bare app, which you can then add things to. In this case, you must
// assign the output to a new variable every time because typescript captures the type of the
// variable as whatever type it is _initially,_ which in this case is `{}`
//
// Casting is actually safe in this case, too, since the initial type is known and typescript will
// complain if the cast is incompatible.
const minimal1 = Weenie({});
// ....
const minimal2 = minimal1.and(dep1);
console.log(`A: ${minimal2.a}`);

