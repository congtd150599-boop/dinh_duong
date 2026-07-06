# Build context is the REPO ROOT (see docker-compose.prod.yml: context: .., dockerfile: backend/Dockerfile)
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json ./
COPY backend ./backend
COPY packages/shared ./packages/shared
RUN npm install --workspace=backend --include-workspace-root

WORKDIR /app/backend
RUN npm run build

FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

# Copy the whole node_modules from the builder rather than a fresh prod-only
# install — keeps this Dockerfile simple; optimizing image size (pruning dev
# deps) is a reasonable later improvement, not required for Phase 1 correctness.
#
# npm workspaces hoists shared/deduped packages (incl. the `prisma` CLI) to
# the ROOT node_modules, not backend/node_modules — copy both, preserving the
# same relative layout the builder produced, or `npx prisma` silently falls
# back to downloading a random version from the registry at container startup.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package.json ./backend/package.json

WORKDIR /app/backend

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
