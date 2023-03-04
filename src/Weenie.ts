import { deepmerge } from "./Utils";

/**
 * `Extensible` defines an interface that allows for the mutation of a "resource bag" and a final
 * presentation of that bag. This allows a programmer to build up a collection of resources and
 * subsequently mask some of those resources, keeping the final interface type small.
 *
 * See `Weenie` for more documentation about use.
 */
export type Extensible<Deps = Obj> = Deps & {
  and: <NextDeps extends Obj>(next: (deps: Deps) => NextDeps) => Extensible<Deps & NextDeps>;
  done: <FinalDeps extends Obj | Promise<Obj>>(fin: (deps: Deps) => FinalDeps) => FinalDeps;
};

/**
 * Framework function
 *
 * `Weenie` is the function that kicks off the creation of a resource bag. It is intended to be
 * used to build up and then seal a final resource bag to be passed around in an application in
 * order to provide common dependencies.
 *
 * Here's how it is intended to be used:
 *
 * ```ts
 * function init(): { firstDep: string };
 * function a(deps: { firstDep: string }): { a: number };
 * function b(deps: { firstDep: string; a: number }): { b: boolean };
 * function c(deps: { firstDep: string; a: number; b: boolean }): { c: string };
 * function d(deps: { firstDep: string; a: number; b: boolean; c: string }): {};
 * function e(deps: { firstDep: string; a: number; b: boolean; c: string }): { e: number };
 * function finish(
 *   deps: { firstDep: string; a: number; b: boolean; c: string, e: number }
 * ): { a: number; b: boolean; c: string; }; // << these are the final exposed dependencies
 *
 * const app = Weenie(init)
 *   .and(a)
 *   .and(b)
 *   .and(c)
 *   .and(d)
 *   .and(e)
 *   .done(finish);
 * ```
 *
 * The above initializes all the necessary dependencies and then seals them up, presenting a final
 * "app" that is typed as `{ a: number; b: boolean; c: string }`. This can then be passed along
 * to web handlers, message handlers, cronjobs, etc., to perform the work that the service needs
 * to do.
 */
export function Weenie<Deps = Obj>(deps: Deps): Extensible<Deps> {
  return deepmerge({}, deps, {
    and: <NextDeps extends Obj>(
      next: (currentDeps: Deps) => NextDeps
    ): Extensible<Deps & NextDeps> => {
      return Weenie<Deps & NextDeps>(deepmerge({}, deps, next(deps)));
    },
    done: <FinalDeps extends Obj>(fin: (deps: Deps) => FinalDeps): FinalDeps => {
      return fin(deps);
    },
  });
}

type Obj = Record<string | number | symbol, unknown>;
