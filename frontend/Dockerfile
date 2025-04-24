# Base image for frontend development and production builder
FROM node:23-alpine3.20 AS base

RUN npm install --global corepack@latest
RUN corepack enable pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .


# Frontend development image
FROM base AS dev

WORKDIR /app
RUN pnpm install

EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host"]


# Production frontend builder image
FROM base AS builder

WORKDIR /app
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_API_URL VITE_SOCKETIO_PATH
ENV VITE_API_URL=$VITE_API_URL VITE_SOCKETIO_PATH=$VITE_SOCKETIO_PATH

RUN pnpm run build


# Production frontend image
FROM busybox:1.36 AS prod

WORKDIR /app
COPY --from=builder /app/dist .

EXPOSE 3000
CMD ["busybox", "httpd", "-f", "-v", "-p", "3000"]
