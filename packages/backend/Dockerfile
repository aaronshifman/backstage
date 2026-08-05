# Shared toolchain — reused by both build stages
FROM dhi.io/node:24-alpine3.23-dev AS base-builder

RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    apk add --no-cache python3 g++ build-base cmake sqlite-dev

ENV PYTHON=/usr/bin/python3
ENV YARN_CACHE_FOLDER=/yarn-cache
# Override enableScripts without mutating .yarnrc.yml
ENV YARN_ENABLE_SCRIPTS=1

WORKDIR /app

# Stage 1: Full build
FROM base-builder AS build

COPY .yarnrc.yml backstage.json yarn.lock package.json ./
# Copy workspace dirs and strip everything except package.json files so new
# packages are picked up automatically. yarn install re-runs on source changes
# but stays fast because the cache mount persists all downloaded packages.
COPY packages packages
COPY plugins plugins
RUN find packages plugins \! -name "package.json" -mindepth 2 -maxdepth 2 -print -exec rm -rf {} +

RUN corepack enable && corepack install

RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --immutable

COPY . .

RUN yarn tsc && yarn build:all

# Stage 2: Production-only node_modules
FROM base-builder AS prod-deps

COPY --from=build /app/.yarn ./.yarn
COPY --from=build /app/.yarnrc.yml /app/backstage.json /app/yarn.lock /app/package.json ./
COPY --from=build /app/packages/backend/dist/skeleton.tar.gz ./

RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

RUN corepack enable && corepack install

RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn workspaces focus --all --production

# Stage 3: Extract bundle (needs shell, use builder image)
FROM base-builder AS bundle
COPY --from=build /app/packages/backend/dist/bundle.tar.gz ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

# Stage 4: Minimal runtime image
FROM dhi.io/node:24-alpine3.23

ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-node-snapshot"

WORKDIR /app

COPY --from=prod-deps /app .
COPY --from=bundle /app/packages/backend/dist/ ./packages/backend/dist/
COPY --from=bundle /app/packages/app/dist/ ./packages/app/dist/
COPY --from=bundle /app/plugins/ ./plugins/
COPY --from=build /app/plugins/k8s-crd-client-node/dist/ ./plugins/k8s-crd-client-node/dist/
COPY --from=build /app/app-config*.yaml ./

CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]
