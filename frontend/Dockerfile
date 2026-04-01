# Base image for frontend development and production builder
FROM node:24-alpine3.23 AS base

RUN npm install --global corepack@latest
RUN corepack enable pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .


# Frontend development image
FROM base AS dev

WORKDIR /app
RUN pnpm install

# Needed for hot reload of deps
ENV SHELL=/bin/sh CI=true

EXPOSE 3000
CMD ["pnpm", "dev:container"]


# Production frontend builder image
FROM base AS builder

WORKDIR /app
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL VITE_SOCKETIO_PATH
ENV VITE_API_URL=$VITE_API_URL VITE_SOCKETIO_PATH=$VITE_SOCKETIO_PATH

RUN pnpm run build


# Production frontend image
FROM docker.io/caddy:2-alpine AS prod

WORKDIR /app
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist .

EXPOSE 3000
