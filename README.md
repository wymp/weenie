The Weenie Framework
===================================================================================================================

**This is a monorepo based on [@wymp/ts-monorepo-poc](https://github.com/wymp/ts-monorepo-poc).**

**The Weenie Framework is a simple Typescript microservices micro-framework for NodeJS.** For complete docs, check out
https://wymp.github.io/weenie .


## Quickstart

```sh
# This repo uses pnpm; install it or update it if necessary
npm i -g pnpm

pnpm i
pnpm check
```

* **To lint/prettify everything:** `pnpm format`
* **To bump all package versions:** `pnpm version:bump major|minor|patch`
* **To publish all packages:** `pnpm publish:all`
* **To generate docs:** `pnpm docs:gen`
* **To view docs:** `pnpm docs:view`


### Typical Development Workflow

1. Create a new branch from the latest code: `git fetch origin && git checkout -b your-branch origin/current`
2. Install deps and make sure everything is good to start out with: `pnpm i && pnpm check`
3. Make all your changes.
4. When finished, format the code and regenerate docs: `pnpm format && pnpm docs:gen`
5. Finally, bump version and publish everything: `pnpm version:bump minor && pnpm publish:all`
