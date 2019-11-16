import { deepmerge } from "./Utils";

export type Extensible<Deps = {}> = Deps & {
  and: <NextDeps extends {}>(next: (deps: Deps) => NextDeps) => Extensible<Deps & NextDeps>;
}

// Framework function
export function Weenie<Deps = {}>(deps: Deps): Extensible<Deps> {
  return deepmerge({}, deps, {
    and: <NextDeps extends {}>(
      next: (currentDeps: Deps) => NextDeps
    ): Extensible<Deps & NextDeps> => {
      return Weenie<Deps & NextDeps>(deepmerge({}, deps, next(deps)));
    }
  });
}

