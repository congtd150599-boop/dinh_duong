# Build context is the REPO ROOT (see docker-compose.prod.yml: context: .., dockerfile: frontend/Dockerfile)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY frontend ./frontend
COPY packages/shared ./packages/shared
RUN npm install --workspace=frontend --include-workspace-root

WORKDIR /app/frontend
# Baked in at build time — the browser calls this relative path, and Nginx
# (see nginx.conf) proxies it to the backend container. No CORS needed.
ENV VITE_API_URL=/api
RUN npm run build

FROM nginx:alpine AS runtime

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
