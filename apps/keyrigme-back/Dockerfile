# Build from the repository root: docker build -f apps/keyrigme-back/Dockerfile .
FROM node:24-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/keyrigme-back/package.json apps/keyrigme-back/
COPY libs/keyrigme-models/package.json libs/keyrigme-models/
RUN pnpm install --frozen-lockfile --filter @keyrigme/back...
COPY tsconfig.base.json ./
COPY libs/keyrigme-models libs/keyrigme-models
COPY apps/keyrigme-back apps/keyrigme-back
RUN pnpm --filter @keyrigme/back build

# The build is a self-contained bundle: no node_modules needed at runtime.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/keyrigme-back/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "--enable-source-maps", "dist/main.js"]
