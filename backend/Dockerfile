# Build context is the REPO ROOT (see docker-compose.prod.yml: context: .., dockerfile: backend/Dockerfile)
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl
WORKDIR /app

COPY package.json ./
COPY backend ./backend
COPY packages/shared ./packages/shared
RUN npm install --workspace=backend --include-workspace-root

# @dinhduong/shared's package.json points "main" at raw src/index.ts —
# fine for dev (ts-node registers a .ts loader) but `node dist/server.js`
# below has no such loader. Compile it to real JS here and repoint "main" at
# the compiled output, IN THIS IMAGE ONLY (not the git-tracked file dev
# uses) — dev's bind-mounted packages/shared and its ts-node hot-reload are
# completely untouched by this.
RUN npx tsc --project packages/shared/tsconfig.json \
  && node -e "const fs=require('fs');const p='packages/shared/package.json';const j=JSON.parse(fs.readFileSync(p));j.main='dist/index.js';j.types='dist/index.d.ts';fs.writeFileSync(p,JSON.stringify(j,null,2));"

WORKDIR /app/backend
RUN npm run build

FROM node:20-alpine AS runtime

# postgresql16-client provides pg_dump, used by backup.service.ts for the
# scheduled/on-demand DB backup job — version-matched to the postgres:16-alpine
# image in docker-compose.
RUN apk add --no-cache openssl postgresql16-client
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
# node_modules/@dinhduong/shared is a symlink (npm workspaces) pointing at
# ../../packages/shared — without copying the real target too, that symlink
# is dangling in this stage and `require('@dinhduong/shared')` fails at
# startup (MODULE_NOT_FOUND), even though it resolved fine in the builder.
COPY --from=builder /app/packages ./packages

WORKDIR /app/backend

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
