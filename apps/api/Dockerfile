# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json turbo.json tsconfig.base.json ./

# Copy all workspace packages needed for the build
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY packages/db/ packages/db/
COPY packages/shared/ packages/shared/
COPY apps/api/ apps/api/

# Build the api and its workspace dependencies
RUN npx turbo run build --filter=@arcadiux/api

# ── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace root files
COPY package.json package-lock.json turbo.json ./

# Copy workspace package.json files for install
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built output from builder
COPY --from=builder /app/packages/db/ packages/db/
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/apps/api/dist/ apps/api/dist/

EXPOSE 3001

CMD ["node", "apps/api/dist/server.js"]
