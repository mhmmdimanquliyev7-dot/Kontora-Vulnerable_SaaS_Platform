FROM node:25-slim AS base
WORKDIR /workspace
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl curl iputils-ping && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY db/package.json ./db/package.json
RUN npm ci --workspaces --include-workspace-root

FROM deps AS build
COPY db ./db
COPY api ./api
# Placeholder so `prisma generate` (part of the db build) can resolve
# DATABASE_URL at build time; no real connection is made until runtime,
# where the api service supplies the real value via docker-compose.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run build --workspace=@kontora/db
RUN npm run build --workspace=@kontora/api

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=build /workspace/db/dist ./db/dist
COPY --from=build /workspace/db/package.json ./db/package.json
COPY --from=build /workspace/api/dist ./api/dist
COPY --from=build /workspace/api/package.json ./api/package.json
COPY --from=build /workspace/api/public-files ./api/public-files

WORKDIR /workspace/api
EXPOSE 4000
CMD ["node", "dist/index.js"]
