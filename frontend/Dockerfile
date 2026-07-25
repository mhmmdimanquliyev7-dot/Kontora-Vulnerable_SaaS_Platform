FROM node:25-slim AS base
WORKDIR /workspace

FROM base AS deps
# All four workspace manifests are copied so `npm ci` can validate the lockfile
# against the complete workspace graph the root package.json declares.
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY api/package.json ./api/package.json
COPY db/package.json ./db/package.json
COPY services/oauth-provider/package.json ./services/oauth-provider/package.json
# `npm ci` installs the EXACT versions the lockfile pins — no drift, and the
# valibot@1.2.0 the lock already resolves stays put (so none of the ERESOLVE a
# lock-less `npm install --no-package-lock` would hit).
RUN npm ci --workspace=frontend --include-workspace-root

# The lockfile was generated on Windows, so its `packages` section records only
# the win32 native-binary nodes; the linux-gnu ones live only in each parent's
# optionalDependencies metadata, never as installable package nodes
# (npm/cli#4828). `npm ci` therefore skips every linux binary on this
# Debian/glibc image and `next build` dies with "missing native binding"
# (lightningcss, @tailwindcss/oxide, @next/swc, @unrs/resolver).
#
# Install exactly those linux-x64-gnu binaries, pinned to the versions the
# lockfile already records for them. They are standalone prebuilt .node
# packages with no dependencies of their own, so this adds the missing binaries
# without changing any resolved version.
#
# --no-save keeps package.json untouched. Crucially this does NOT pass
# --no-package-lock: with the lockfile present npm reuses the valibot@1.2.0 it
# already resolves and simply layers these four leaf packages on top, so the
# @hookform/resolvers vs @typeschema/valibot peer conflict is never re-resolved
# (that ERESOLVE only fires when --no-package-lock throws the lock away and
# re-resolves the whole tree from scratch). Keep these versions in step with the
# lockfile if the toolchain is ever bumped.
RUN npm install --no-save --workspace=frontend --include-workspace-root \
      lightningcss-linux-x64-gnu@1.32.0 \
      @tailwindcss/oxide-linux-x64-gnu@4.3.2 \
      @next/swc-linux-x64-gnu@16.2.10 \
      @unrs/resolver-binding-linux-x64-gnu@1.12.2

FROM deps AS build
COPY frontend ./frontend
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
# Required: without it `next build` reaches out to the telemetry endpoint on
# first run and hangs in this network-restricted build.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=frontend

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /workspace/frontend/.next/standalone ./
COPY --from=build /workspace/frontend/public ./frontend/public
COPY --from=build /workspace/frontend/.next/static ./frontend/.next/static

EXPOSE 3000
ENV PORT=3000
CMD ["node", "frontend/server.js"]
