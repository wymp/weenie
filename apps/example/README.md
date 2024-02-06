Weenie Framework Example
=================================================================================

**For complete docs on the Weenie Framework, see [wymp.github.io/weenie](http://wymp.github.io/weenie).**

This repo contains a full working example of an app using the Weenie framework. Obviously it is quite contrived, but it
should serve to demonstrate some of the more powerful aspects of Weenie and what it's good for, as well as some
best-practices for using it.


## Quickstart

To run this app, clone and enter this repo and run the following in your terminal:

```sh
npm i -g pnpm
pnpm i
pnpm --filter weenie-example docker:build
pnpm --filter weenie-example docker:compose up -d
```

This will bring up the example service along with its dependencies (although you'll have to wait a moment for the
database to initialize). At this point, you can play with the example by hitting its endpoints.


## Initialization Stages

While this is not specific to Weenie, I have found that there are four specific "initialization stages" that are useful
to separate out. They are:

* **Config:** ([./src/config.ts](https://github.com/wymp/weenie/tree/current/apps/example/src/config.ts)) Config uses
  the [@wymp/config-simple](https://wymp.github.io/config-simple) library (re-exported through the
  `@wymp/weenie-framework` package) to define a recursively frozen config object. This is always your starting point.
  The `./src/config.ts` file is fairly formulaic and may be basically copy-pasted between projects, changing only the
  config values themselves. (See the docs for the `@wymp/config-simple` package linked above for more information about
  this setup.)
* **Deps:** The actual type of the dependency container is inferred from the return value of the
  [`./src/deps/prod.ts::getProdDeps`](https://github.com/wymp/weenie/tree/current/apps/example/src/deps/prod.ts)
  function. This makes it really easy and clean to define the type of your dependency container and to then use that
  type as the basis of your dependency inversion. (Note that there appears to be a possible
  [bug](https://github.com/microsoft/TypeScript/issues/42873#issuecomment-1766987305) in typescript that causes this
  inferrence not work well in certain cases. I fixed this here using the comment linked above, which said to disable
  source and declaration maps in tsconfig.)
* **Connect:** This is a function that takes all of your dependencies and connects all the wires in your app with them.
  We define this separately so that we can connect all the wires in exactly the same way whether we're using prod deps
  or test deps. By "wires" I mean registering endpoints, cronjobs, MQ subscribers, etc.
* **main.ts:** Of course, this is our starting point, and it is intentionally quite spare. It grabs the correct set of
  dependencies, uses the connection function to connect everything and handles any errors by logging and shutting down -
  that's it.


## Database Setup

Database setup is probably one of the more contentious parts of any application. Some people insist on ORMs while some
people hate them. Some people use query-builders while some people prefer raw SQL.

Weenie chooses not to have strong opinions about all this. Weenie's approach to this is to provide a simple solution
that should work well, but not to invest too heavily in the problem, instead deferring to you to do whatever you feel
is best.

To that end, Weenie recommends [knex](https://www.npmjs.com/package/knex) as (at least) a migration framework, and
doesn't make any additional recommendations beyond that. While in this particular example we're using Weenie's standard
mysql library interfaced with a simple declarative data class, this is not an explicit recommendation, it's just the way
I chose to write this example.

A few important points to note about our database setup:

1. Migrations are stored in `./db/migrations/`
2. Knex wants its own config file for command-line use that exports some specific config objects. We keep that file
   right in `./src` along with all the rest of our source code, and it in turn uses our `getConfig` function to get its
   config.
3. We use knex to run up-migrations on release of our containers as part of our standard release process. (Rollbacks in
   case of problems are not yet covered by this example.)
4. We're not using Knex's "seeds" mechanism here. I prefer to just write migrations that use the config environment to
   determine whether or not to add test data right along with the structural migration. Certainly nothing wrong with
   seeds, though.
5. As mentioned above, I've chosen to implement database interactions as class methods on a database class. This is not
   an explicit recommendation; rather, it is just the way I implemented it in this case. (See
   [./src/deps/db.ts](https://github.com/wymp/weenie/blob/current/apps/example/src/weenie/db.ts).)


## App-Specific Deps

Many of our deps are standard Weenie things. There are a few, though (like our DB abstraction class) that are internal.
I've defined those in [./src/weenie/](https://github.com/wymp/weenie/blob/current/apps/example/src/weenie/). Since they
are not intended to be used "raw" by the application (rather, they're intended to be used from the DI container), I
define the source code and the Weenie function in one file, then just import the Weenie function. Obviously if you want
to write tests for these things or if you have more complex dependencies, you may need to put them into subfolders or
something, but for now I'm keeping it simple.

