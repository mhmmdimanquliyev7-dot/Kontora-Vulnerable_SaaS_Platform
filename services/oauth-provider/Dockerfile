FROM node:25-slim AS base
WORKDIR /workspace

FROM base AS deps
COPY package.json package-lock.json ./
COPY services/oauth-provider/package.json ./services/oauth-provider/package.json
RUN npm ci --workspace=@kontora/oauth-provider --include-workspace-root

FROM deps AS build
COPY services/oauth-provider ./services/oauth-provider
RUN npm run build --workspace=@kontora/oauth-provider

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /workspace/node_modules ./node_modules
COPY --from=build /workspace/services/oauth-provider/dist ./services/oauth-provider/dist
COPY --from=build /workspace/services/oauth-provider/package.json ./services/oauth-provider/package.json

WORKDIR /workspace/services/oauth-provider
EXPOSE 9000
CMD ["node", "dist/index.js"]
