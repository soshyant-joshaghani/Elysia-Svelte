# Build context: the kit root (compose: context ".", dockerfile backend/Dockerfile).
# One image runs the API (default CMD) and the worker (compose overrides the command).
FROM oven/bun:1.4

WORKDIR /app

COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile --production

COPY backend/src ./src
COPY backend/drizzle ./drizzle
COPY backend/tsconfig.json ./

ENV NODE_ENV=production
EXPOSE 8000

CMD ["bun", "run", "src/main.ts"]
