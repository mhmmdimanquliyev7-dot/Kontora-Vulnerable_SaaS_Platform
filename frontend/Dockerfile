FROM node:25-slim AS base
WORKDIR /workspace

FROM base AS deps
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
# npm ci intentionally skipped: package-lock.json only records resolved
# entries for optional native platform binaries (lightningcss, @next/swc)
# actually installed on the machine that generated it. --no-package-lock
# forces a fresh resolve against the registry so this image's own
# platform's binaries get installed instead of being silently skipped.
RUN npm install --workspace=frontend --include-workspace-root --no-package-lock

FROM deps AS build
COPY frontend ./frontend
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build --workspace=frontend

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /workspace/frontend/.next/standalone ./
COPY --from=build /workspace/frontend/public ./frontend/public
COPY --from=build /workspace/frontend/.next/static ./frontend/.next/static

EXPOSE 3000
ENV PORT=3000
CMD ["node", "frontend/server.js"]
