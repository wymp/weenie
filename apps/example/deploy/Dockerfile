# This is just a quick demonstration, it's not intended to be a real docker container
FROM node:20-alpine as builder

RUN apk --update add --no-cache bash && npm i -g pnpm

WORKDIR /monorepo
COPY ./*.yaml ./*.json ./
RUN \
  --mount=type=bind,source=./apps/example/package.json,target=/monorepo/apps/example/package.json \
  --mount=type=bind,source=./libs/api-client/package.json,target=/monorepo/libs/api-client/package.json \
  --mount=type=bind,source=./libs/base/package.json,target=/monorepo/libs/base/package.json \
  --mount=type=bind,source=./libs/cron/package.json,target=/monorepo/libs/cron/package.json \
  --mount=type=bind,source=./libs/express/package.json,target=/monorepo/libs/express/package.json \
  --mount=type=bind,source=./libs/framework/package.json,target=/monorepo/libs/framework/package.json \
  --mount=type=bind,source=./libs/logger/package.json,target=/monorepo/libs/logger/package.json \
  --mount=type=bind,source=./libs/mysql/package.json,target=/monorepo/libs/mysql/package.json \
  --mount=type=bind,source=./libs/rabbitmq/package.json,target=/monorepo/libs/rabbitmq/package.json \
  --mount=type=bind,source=./libs/retry/package.json,target=/monorepo/libs/retry/package.json \
  --mount=type=bind,source=./libs/service-manager/package.json,target=/monorepo/libs/service-manager/package.json \
  pnpm i --frozen-lockfile

COPY ./libs ./libs
COPY ./apps ./apps
COPY ./scripts ./scripts

RUN \
  pnpm build && \
  pnpm --filter './apps/example' --prod deploy /pruned/apps/example && \
  cp -R /monorepo/apps/example/.env /monorepo/apps/example /pruned/apps/example/ && \
  cp -R /monorepo/scripts /monorepo/*.json /monorepo/*.yaml /pruned/ && \
  # There's a [bug in pnpm](https://github.com/pnpm/pnpm/issues/6269) that we need to compensate for here
  sed -ri 's#"main": "src/(.+)\.ts"#"main": "dist/\1.js"#' $(find /pruned/apps/example/node_modules/ -path '**/@wymp/*/package.json')




FROM node:20-alpine as service

RUN apk --update add --no-cache tini && npm i -g pnpm
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
USER node

WORKDIR /monorepo
COPY --from=builder --chown=node:node /pruned /monorepo
CMD ["/monorepo/apps/example/dist/main.js"]
