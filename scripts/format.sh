#!/bin/bash
set -e

pnpm prettier:fix
pnpm lint:fix
