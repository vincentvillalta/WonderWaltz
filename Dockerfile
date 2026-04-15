# syntax=docker/dockerfile:1
# Monorepo-aware Dockerfile for the @wonderwaltz/api workspace package.
# Used by Railway for both the `api` (HTTP) and `worker` (BullMQ) services.
# Each service overrides the start command in the Railway dashboard:
#   api    → node apps/api/dist/main.js
#   worker → node apps/api/dist/worker.js  (default CMD below)

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

# -- runtime layer: slim production image -------------------------------------
FROM base AS runtime

ENV NODE_ENV=production

# pnpm hoists node_modules to /app/node_modules with the symlinked .pnpm store
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/

COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/package.json ./packages/db/

COPY --from=build /app/packages/content/dist ./packages/content/dist
COPY --from=build /app/packages/content/legal ./packages/content/legal
COPY --from=build /app/packages/content/package.json ./packages/content/

COPY --from=build /app/packages/solver/dist ./packages/solver/dist
COPY --from=build /app/packages/solver/package.json ./packages/solver/

# shared-openapi is NOT needed at runtime — it only holds the v1 spec snapshot
# used by CI. No api source imports it.

WORKDIR /app/apps/api

# Default to worker entry; api service overrides to `node dist/main.js`
CMD ["node", "dist/worker.js"]
