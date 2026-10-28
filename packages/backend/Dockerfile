FROM dhi.io/node:24-alpine3.23-dev@sha256:0e7bb431b722a59a87873c6b5e0dfc97d6164bf430214fd0de569e3a72f9f708 AS base-builder

RUN --mount=type=cache,target=/var/cache/apk,sharing=locked \
    apk add --no-cache python3 g++ build-base cmake sqlite-dev

ENV PYTHON=/usr/bin/python3
ENV YARN_CACHE_FOLDER=/yarn-cache
# Override enableScripts without mutating .yarnrc.yml
ENV YARN_ENABLE_SCRIPTS=1

WORKDIR /app

# Stage 1: Full build
FROM base-builder AS manifests

COPY packages packages
COPY plugins plugins
RUN find packages plugins -mindepth 2 -maxdepth 2 \! -name package.json -exec rm -rf {} +

# Stage 2: Full build
FROM base-builder AS build

COPY .yarnrc.yml backstage.json yarn.lock package.json ./
COPY --from=manifests /app/packages packages
COPY --from=manifests /app/plugins plugins

RUN corepack enable && corepack install

RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn install --immutable

COPY . .

RUN yarn tsc && yarn build:all

# Stage 3: Production node_modules for the backend only
FROM base-builder AS prod-deps

COPY .yarnrc.yml backstage.json yarn.lock package.json ./
COPY --from=manifests /app/packages packages
COPY --from=manifests /app/plugins plugins

RUN corepack enable && corepack install

RUN --mount=type=cache,target=/yarn-cache,sharing=locked \
    yarn workspaces focus backend --production \
    && rm -rf .yarn .yarnrc.yml yarn.lock backstage.json

# Stage 4: Extract bundle (needs shell, use builder image)
FROM base-builder AS bundle
COPY --from=build /app/packages/backend/dist/bundle.tar.gz ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

# Stage 5: Minimal runtime image
FROM dhi.io/node:24-alpine3.23@sha256:2849a63b4a9d8721cde2a77afdaeb21b7d27aa2476d21d2a209aa049a8d65429

ENV NODE_ENV=production

WORKDIR /app

# Dependencies first
COPY --from=prod-deps /app .
COPY --from=bundle /app/packages/backend/dist/ ./packages/backend/dist/
COPY --from=bundle /app/packages/app/dist/ ./packages/app/dist/
COPY --from=bundle /app/plugins/ ./plugins/
COPY --from=build /app/plugins/k8s-crd-client-node/dist/ ./plugins/k8s-crd-client-node/dist/
COPY app-config*.yaml ./

CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]
