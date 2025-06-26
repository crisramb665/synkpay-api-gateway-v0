# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY tsconfig.build.json tsconfig.json nest-cli.json ./
COPY src ./src

RUN yarn build

# Stage 2: Runtime
FROM node:22-slim

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 5000

CMD ["node", "dist/main.js"]