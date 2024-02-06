#!/bin/sh
set -e

pnpm prettier:fix
pnpm lint:fix
