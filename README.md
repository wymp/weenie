Generic Typescript Monorepo Philosophy
=================================================================================================================

_**NOTE: THIS IS AN EXPERIMENT.** This repository is a reference implementation of the monorepo philosophy outlined
in this readme. It may work for you, but it may not. Use at your own risk, and be ready to take what's valuable from it
while leaving behind what's not._

_Furthermore, all views expressed in this readme are intended to represent **my personal ideas,** not any particular
assertion of "the truth"._


## Problem - Managing Code

Code is really hard to manage! Broadly speaking, "code management" includes writing code, testing code, formatting it
and enforcing standards on it, evolving it, sometimes compiling or transpiling it, publishing it, documenting it,
possibly deploying it, and managing its dependencies, including keeping all direct and indirect dependencies up to date
both with the latest useful domain concepts as well as with the latest security patches.

That's a lot! And it's hard to do.

Monorepos have emerged as a way to set up and enforce a single basic code management strategy on a broader collection
of projects.

However, they come with their own set of problems. Namely:

* What should we include in a monorepo (and what should we not)?
* How do we isolate projects within a monorepo while still allowing them to reach across boundaries to depend on other
  libraries within the same monorepo in a transparent way?
* How do we version and publish libraries and applications from a monorepo?
* How do we run tests and CI efficiently, only testing what has actually changed?
* How do we do all this without a ton of annoying and repetitive boilerplate (such as having basically the same set of
  configuration files and scripts in every sub-package of the repo)?
* How do we keep all this simple enough to actually understand and work with without a ton of up-front onboarding?


## Definitions

Certain terms in this readme can be confusing, so I'll clarify them up front.

* When I say **package**, I'm referring to an app or library in this monorepo, e.g., `apps/my-microservice` or
  `libs/shared-types`.
* When I say **dependency**, I'm referring to an external dependency, such as `lodash` or `ts-node`.


## Example Repo

This repo is a simple, contrived example monorepo that contains several libraries and apps that I'll be using to
demonstrate the concepts that I'm experimenting with for my solutions to these problems. I know that things can get a
lot more complicated, but I've attempted to make this example monorepo broad enough to demonstrate at least a realistic
set of challenges, without getting too far into the weeds.

It should also be noted that this is definitively a typescript monorepo. Some or all of these concepts may work just as
well for other languages, but the concretes will certainly be different. Languages tend to be very idiosyncratic when it
comes to code management, starting with probably the most significant problem, dependency management. Almost all modern
languages have a primary CLI tool for performing common tasks including dependency management, and these will often be
your entry point into a monorepo solution. Because these CLI tools are different per-language, the monorepo setups they
encourage will also be different.

For the purposes of the sections that follow, here is the dependency graph of the code in this repo:

* `apps/my-microservice`
  * --> `libs/shared-be`
    * --> `libs/shared-types`
  * --> `libs/shared-types`
* `apps/other-microservice`
  * --> `libs/shared-be`
    * --> `libs/shared-types`
* `apps/my-react-app`
  * --> `libs/shared-fe`
    * --> `libs/shared-types`
  * --> `libs/shared-types`

Now, without further ado, following are my approaches to solving the various problems of code management within a
monorepo.


## Solutions


### Package Manager

_Or "Dependency Manager", to be consistent with my definitions above, but most people will be more familiar with the
term "Package Manager" so I'll call it that._

I use `pnpm`. I haven't experimented much with others and am reasonably happy with `pnpm`. I used to use `npm` because
I tend to be a no-frills programmer, but we used `pnpm` at my last company and I found I appreciated it quite a bit.

The primary things `pnpm` provides that make monorepo management possible/easier are the following:

* **Per-package, dependency-ordered script-running.** `pnpm` views the monorepo as a collection of many packages and
  allows you to easily issue commands to a subset of those packages all at once. For example, I can run `pnpm -r tsc`
  and it will run `tsc` in every package of the monorepo. Similarly, if I've defined a `typecheck` npm script in some of
  my packages, I can run `pnpm -r typecheck` to easily run that npm script in all packages for which it is defined.
  What's more, `pnpm` will run the scripts against the packages in dependency order, meaning if package A depends on B
  and I run `pnpm -r tsc`, it will run `tsc` in package B first, then package A.
* **Advanced filtering.** It also includes a very advanced [filtering mechanism](https://pnpm.io/filtering) that
  includes selecting packages that are dependent on a given package or that are dependencies of a given package, as well
  as selecting packages according to code changes between two git commits. This allows you to run testing and linting
  against only things that have actually changed since the last relevant commit.
* **Advanced version management for publishing.** For packages within the monorepo that are dependent on other packages
  within the monorepo (such as `libs/shared-be` in this repo),`pnpm` allows you to publish the dependent packages with
  concrete dependency version specs while transparently linking the dependency to the live version in the monorepo for
  development. For example, in `shared-be`, I can list the dependency `"shared-types": "workspace:^8.33.0 || ^9.0.0"`.
  This will cause `shared-types` to be linked into `shared-be` when I run `pnpm i`, but when I publish `shared-be`, the
  dependency is actually published as `"shared-types": "^8.33.0 || ^9.0.0"`, allowing it to work seamlessly outside the
  monorepo as well.
* **Various other goodies.** `pnpm` has a lot of little niceties. One example is the `publishConfig` field in
  `package.json`, which allows you to set different values for certain `package.json` fields when publishing the package
  than when developing the package. (This is especially useful for having things like `"main": "src/index.ts"` for the
  development package and then overriding that with `"main": "dist/index.js"` for the published version.) The pnpm docs
  are disappointingly sparse, but the upside of that is that they're pretty quick and easy to get through. Check them
  out [here](https://pnpm.io/motivation) to see what else `pnpm` can do.


### Package Organization

I find it is useful to distinguish between libraries and applications; thus, my monorepos always have a set of packages
under `libs` and a set of packages under `apps`.

I try to think of packages under `libs` as publicly consumable packages (even if they're private to my organization),
while packages under apps are "deployables". I don't worry about version specs so much for "deployables", since they are
not expected to be depended upon.


### Dependencies

The general rule with dependencies is this: _For a given package, if you `import` a dependency, list it in that
package's `package.json` file._ Otherwise, it should be saved as a top-level monorepo dependency in the top-level
`package.json`. (And to avoid ambiguity, it's best to save ALL top-level dependencies as `dependencies` rather than
`devDependencies`, since it really doesn't matter.) This means that things like `jest`, `typescript`, `ts-node`, etc, -
i.e., _codebase utilities/tooling_ - should be listed as top-level deps in the monorepo.

Because of the way `pnpm` works, you cannot import code from a package that you have not explicitly listed in the
consumer's `package.json` file (feature, not bug). For example, if I'm using `express` in `my-microservice`, I need to
list `express` as an explicit production dependency of that package. Additionally, if I'm using `uuid` in the tests for
that package, I need to list `uuid` as an explicit dev dependency of that package.

This sucks a little because it means you still have to worry about dependency versions getting out of sync between
packages, but ultimately that's a tradeoff of modular code. (NOTE: [syncpack](https://github.com/JamieMason/syncpack) is
probably worth a look but I haven't actually checked it out yet).

The approach I've taken to this problem in this repo is to use the [`pnpm.overrides`](https://pnpm.io/package_json#pnpmoverrides)
field in the top-level `package.json` file to enforce version consistency. For any dependency that I want to be the same
across all of my packages, I install it at the top level, add an entry in `pnpm.overrides` for it. You can then run
`pnpm --filter my-package i --save some-dep` for that dependency and it will add the correct version to that package's
`package.json`.


#### Dependency Versions

* For apps, you should pin down specific versions of your dependencies, such as `"5.6.2"`.
* For libraries, you should specify your dep versions as permissively as possible. For example, if you know your library
  for sure works with `uuid` v7 and on, list `"uuid": ">=7.0.0"`. Same goes for your internal workspace dependencies.
  Make sure that when your library is published, the actual version specification is both defined and permissive. If
  you use `pnpm`, you can do something like `"my-workspace-dep": "workspace:^5.33.0 || ^6.0.0"`, which will be
  transformed on publish to just `"my-workspace-dep": "^5.33.0 || ^6.0.0"`.
* Use `pnpm -r up -Li` to interactively upgrade all deps, both at the top level and in packages. You can upgrade just a
  single package or a set of packages by passing a package name or a scope (see [docs](https://pnpm.io/cli/update)).


### Publishing Libraries

You may not need to actually publish libraries. If you don't need to, don't do it.

If you do need to, here are a few guidelines/suggestions:

* As mentioned above in [Dependencies](#dependencies), make sure your dependency version specs are correct and
  permissive. For libraries DON'T lock down dependency versions; rather provide as broad a range of compatible versions
  as you feel safe declaring. For example, `"uuid": "^8.5.0 || ^9.0.0"`.
* Use the `files` array in `package.json` to list the files that should be included in your package. This is nominally
  better (for various uninteresting reasons) than using `.npmignore` to ignore files.
* I can go both ways on this, but I think I've decided that it's better to bump all library versions simultaneously,
  even when nothing has changed in some of your packages. It just makes everything more sane, both from the publisher
  side and the consumer side. Provided you've chosen this route:
  * Your repo branches should correspond to your library versions. For example, you should have branches `v1.x`, `v2.x`,
    `v3.x`, etc.
  * Tag the repo at each library version release (for example, `v5.3.0`)
  * If you need to publish a patch, perform the fix on the earliest branch you want to support that is affected by the
    bug. For example, if you're currently on `v5.3.0` and the bug appeared in `v3.1.0`, go back to the `v3.x` branch,
    fix the bug, publish a patch against whatever the latest 3-series release is - say, `v3.6.1` - then roll the fix
    forward through the `v4.x` and `v5.x` branches. This should result in the fix being available on every major release
    that was affected. (If it's a particularly bad security bug and your library is particularly popular, it may be
    necessary to publish patch releases against _every affected and supported minor release._)
  * Use the `pnpm publish:all` command to easily publish libraries that need to be published. You can use this together
    with the `pnpm version:bump` command to first set the version, then publish.


### Typescript Configuration

There's a lot to this. Typescript has a TON of config options. Some are legacy, some are sort of duplicates with subtle
distinctions, some are seemingly inconsequential and some are geared toward managing projects in a monorepo.

I don't have a lot of good recommendations for managing typescript config in general other than just find the config
you like for your front-end and back-end apps and libraries and save it somewhere for easy reference and reuse. I have
mine saved as a git repo that I publish as an npm package and extend from. There's also
[`tsconfig/bases`](https://github.com/tsconfig/bases), which is probably as good a place to start as any.


#### `tsconfig` Formations

Monorepos offer the opportunity to centralize typescript config. However, it can be a little tricky to figure out
exactly what to centralize and how that should work.

In general, I think the following is a good approach:

* Create `./tsconfig.base.json` in repo root. This is where you'll store most of your config.
  * This should have `"composite": true` and `"incremental": true`.
* Create `*/*/tsconfig.json` files in each of your packages extending from `./tsconfig.base.json`.

The typescript handbook recommends using a "solutions file" to tie all of the sub-packages together, but I find it's
actually easier to tie it all together via scripts.


#### Typescript Monorepo Options

The options we're most interested in will be the following:

* `"composite": true` - This enforces certain constraints that make it easier/possible for typescript to manage
  sub-projects within the same repo.
* `"incremental": true` - Not strictly necessary, but can speed things up


### Scripts

One annoying thing that seems to emerge in monorepos is that you end up with all or most of the sub-packages declaring
basically the same set of scripts (`lint`, `test:unit`, `test:e2e`, `typecheck`, `build`, etc...). It would be nice if
you could extend a top-level JSON file with script definitions in it, but you can't. Instead, I find it easiest to just
create a top-level `scripts` directory that you can reference from each sub-package. That way at least you don't have to
go through and update the same script a million times if you ever want to change it.

This works even for tiny scripts like `tsc -b`. And remember: these scripts execute within the environment provided by
`pnpm`, which includes a `PATH` that's augmented with executables from `node_modules` as well as a variety of
potentially useful env vars.

They execute with the given package as their PWD, so `./` will always be the folder of the package. And remember, the
same sort of composability applies here as it does in raw npm scripts, except that you can better hide the lower-level
scripts that you compose into the higher-level ones. For example, you could write a low-level linting script at
`./scripts/.internal/eslint.sh` that calls eslint with a bunch of parameters, then reference that from the higher level
`./scripts/lint.sh` and `./scripts/lint-fix.sh` scripts. (Easily reference the scripts dir using `DIR="$(dirname "$0)"`)


#### `pkgjson` Script

It's often really annoying to have to go through and edit a bunch of `package.json` files by hand. This top-level script
makes it easy to set values in all `package.json` files at once. You can also provide `--filter` and/or `--exclude`
arguments to target a subset of packages.

For example: `pnpm pkgjson --filter microservice --exclude my --merge set .files '["dist","README.md"]'`

See `pnpm pkgjson --help` for more details.


#### Why Not Package These?

These ended up being somewhat powerful scripts (in some cases), so why not package them up for better distribution and
usability?

I _did_ end up packing a few of them, as well as a github action that I originally created for this repo. You can access
those [here](https://github.com/wymp/devops/).

However, as I thought about it, I realized that every package becomes an impediment to adaptability. If I were to
package these up, I would create a situation in which it became virtually impossible to make them work for everyone's
individual codebase, and then we'd be back to square one.

Instead, I thought it would be easier to provide them as boilerplate and let implementers add, delete or modify the
scripts as desired. Ultimately, people who want to keep up with my personal updates can always just copy the latest from
this repo.


### Docker Infrastructure

I wish docker had an `#include` mechanism of some sort, but unfortunatley it doesn't. The best solution I've found to
this is to concatenate a base file from the monorepo root with a service-specific file from the service folder and
pipe that into `docker build` via stdin. See `./deploy` and `./apps/*/deploy` along with the `./scripts/docker-build.sh`
script to see how it all comes together.

In general, I consider the docker infrastructure in this monorepo to be both funky and also reasonably functional and
stable. This is the setup I implemented at my last company, and it's a pattern I'll likely use again in the future.

Some key points:

* `./deploy/dockerfile.base` is the base dockerfile for all builds
* GOTCHA: There's a dynamic section in `dockerfile.base` to mount all the libs and apps when installing deps. This
  allows us to not have to risk having an out-of-date dockerfile when we add new libs and apps, but it also makes the
  dockerfile unusable in raw form. Trade-offs.
* The front-end container ( created by `./deploy/dockerfile.react-ext`) has not been battle tested and is considered a
  starting point.
* At this time, there are no service-specific extensions, but the implemented dockerfile system allows you to provide
  a file at `apps/*/deploy/dockerfile.service` if you wish to make additional changes to the final built service. If
  you need to change the build target as a result, you can change the given package's `docker:build` npm script to
  contain the `DOCKER_TARGET` env var before calling the script, e.g.,
  `"docker:build": "DOCKER_TARGET=my-targ ../../scripts/docker-build.sh"`
* The dev docker image is simply the monorepo. And since the `/monorepo` directory in the container is actually replaced
  with your live monorepo, the image really just serves as a fixed runtime environment.
* You can build all containers using `pnpm docker:build`
* You can bring the system up using `pnpm docker:compose up -d` (dev). This brings the system up in dev mode with your
  local monorepo linked in. If you want to run the actual built containers statically, try `pnpm docker:compose prod up -d`.
  You can bring the system back down by running `pnpm docker:compose [ENV] down`, and you can additionally pass any
  arguments you'd like to docker compose, e.g., `pnpm docker:compose [ENV] logs -f`.
* Note that I've implemented a small environment caching mechanism so you don't always have to pass the environment
  along with `pnpm docker:compose`. This is just to avoid situations where you brought up the prod stack and then
  accidentally ran a command against the (non-existent) dev stack or something because you forgot to include `prod`
  again.


### ESLint

I respect that the folks who created eslint did a good enough job to achieve massive world-wide adoption, but wow is it
ever a mess.

I've tried a number of times to finally overcome my shortcomings in eslint and the more I study it the more confused I
get. The people who built it are surely brilliant, but the product itself is awful....

With that caveat, here's what to know about my eslint setup:

* I used the beta "flat-file" config format for forward compatibility. This caused even more problems than just standard
  eslint, but it's supposedly been feature complete for a while now so I figured I'd go for it.
* I'm not by any means an expert in eslint config, so I may have messed this up. Take what I've done as inspiration, but
  be ready to forge your own path here.


### Project Testing

_(As opposed to E2E testing, which is further down)_

This is another area where there's probably a lot of room for improvement over what I've done. While I'm certainly an
expert at _writing_ tests, I'm closer to a beginner than an expert in terms of all the setup and configuration for
testing, especially for a monorepo.

All that said, here are the key points in my monorepo testing setup:

* There was no way around having a `jest.config.js` file in every sub-package :sob:.
* Because it's likely that as the codebase grows I'll need more complex testing config, I created a `.jest` directory
  into which I put my jest config files. The main file, `.jest/global.js`, simply defines a few global options and then
  tells jest to go look in `apps` and `libs` for actual projects. The other, `.jest/common.js`, is extended in each of
  the individual project configs.
* With reference to the above, note that not all options set in `global.js` actually trickle down to the projects.
* Like everything else, we're using a script under `./scripts` as our entrypoint, and we're setting our top-level `test`
  command to `pnpm -r test`. You can easily filter by just adding a filter (e.g., `pnpm t --filter my-microservice`),
  and you can also pass opts directly to jest, although unfortunately you have to use the old `--` argument separator
  for this. For example, `pnpm t --filter my-microservice -- -t GET`.
* I have mixed opinions on front-end testing. I've found front-end tests are often brittle and of little value. I'll
  typically test functions and other logic, but I don't find it very useful to write component tests. Instead, I focus
  my energies on writing good E2E tests, and I prioritize my E2E tests carefully based on system importance and logical
  complexity (things that are hard to reason about are higher priority, while simpler things are lower).


### E2E Testing

_**TODO: Figure this out.** I'm new to automated e2e testing so need to experiment before putting something out there.
Cypress is popular, but when I did some research for the last company I was at I ended up leaning toward Playwright.
Whatever you choose, just create the project in the top-level `e2e-tests` directory and go from there._

Two things from when I set this up at my last company:

* You should be able to create a full, working docker deployment of your system that the e2e tests can use. This is
  worth it, as you can then deploy your environment _per branch_ in CI and run e2e tests.
* Unfortunately, it seems that neither Cypress nor Playwright offers a good way to test server logging during e2e
  testing. This seems like a huge omission, as it can often make a huge difference when debugging a failing test.
  However, it's possible that there is a way to do this using some sort of a log watcher based on the node
  `docker-compose` package. More experimentation needed....


### Environment Variables

I haven't done a lot with environment variables in this monorepo. To me, `.env` files are a bit of a mess because so
many different tools have started to use them (not only your app, but also `docker compose` and other such tools).
Additionally, because people tend to use `.env` files to set vars for different environments, you often end up with a
passel of `.env` files in the top level of your project, such as `.env.prod`, `.env.staging`, `.env.qa`, etc.

My current favorite solution to this is [this](https://github.com/wymp/config-simple#usage-with-environment-specific-dot-env-files),
which uses familiar languge (`.env`), but makes it a directory instead of a file, which both neats things up and also
keeps other tooling from using the values unexpectedly.

As a final note on env vars, they're still a really great way to modify functionality in your scripts. For example, you
may want to change the way your `check` script works if it's in a CI environment. You can do this by simple implementing
the conditional functionality based on the `CI` env var.


### Boilerplate

Not strictly necessary, but if you tend to create a lot of sub-projects, it can be nice to store some boilerplate
somewhere. For example, you might create a `boilerplate` directory with `node` and `react` subdirectories containing
boilerplate for node and react projects, respectively. That way when you create a new project you can just copy it from
your boilerplate.

That said, it may be easy enough to just copy from an existing sub-project.

## TO-DO

* Verify that my eslint config actually works.
* Verify that my tsconfig setup is optimal
