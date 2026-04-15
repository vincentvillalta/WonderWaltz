# syntax=docker/dockerfile:1
# Monorepo-aware Dockerfile for the @wonderwaltz/api workspace package.
# Used by Railway for both the `api` (HTTP) and `worker` (BullMQ) services.
# Each service overrides the start command in the Railway dashboard:
#   api    → node apps/api/dist/src/main.js
#   worker → node apps/api/dist/src/worker.js  (default CMD below)

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

# -- deps layer: install workspace dependencies -------------------------------
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY tsconfig.base.json ./

# Copy every workspace package.json (pnpm needs these to resolve the graph)
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/content/package.json packages/content/
COPY packages/db/package.json packages/db/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/shared-openapi/package.json packages/shared-openapi/
COPY packages/solver/package.json packages/solver/

RUN pnpm install --frozen-lockfile

# -- build layer: compile TypeScript ------------------------------------------
FROM deps AS build

# Source for api and its workspace dependencies
COPY apps/api apps/api
COPY packages/content packages/content
COPY packages/db packages/db
COPY packages/solver packages/solver
# design-tokens + shared-openapi are not imported by api at runtime; skip

RUN pnpm exec turbo run build --filter=@wonderwaltz/api...

# -- runtime layer: ship the built workspace ----------------------------------
# pnpm creates symlinked node_modules at every workspace root. We copy the
# whole /app tree from the build stage — it already contains only what's
# needed (and .dockerignore excluded junk from the original context).
FROM base AS runtime

ENV NODE_ENV=production

COPY --from=build /app /app

WORKDIR /app/apps/api

# Default to worker entry; api service overrides with:
#   node dist/src/main.js
CMD ["node", "dist/src/worker.js"]
