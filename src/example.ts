import { FrameworkConfig, frameworkConfigValidator } from "./Types";
import { Weenie } from "./Weenie";
import { config } from "./Config";

function dep1() {
  return {
    a: "one",
    b: "two",
  };
}

function dep2(r: { a: string; b: string}) {
  return {
    b: `three (previously ${r.b}`,
    c: "four",
  };
}

const app = Weenie(
  config<FrameworkConfig>(
    "./config.example.json",
    "./config.local.json",
    frameworkConfigValidator
  )()
)
.and(dep1)
.and(dep2)

console.log(`Environment: ${app.config.envName}`);
console.log(`A: ${app.a}`);
console.log(`B: ${app.b}`);
console.log(`C: ${app.c}`);

// Won't work:
// console.log(app.d)

