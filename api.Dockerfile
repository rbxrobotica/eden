FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY src/ src/
RUN bun build src/api/server.ts --compile --outfile eden-api

FROM gcr.io/distroless/base-debian12
COPY --from=builder /app/eden-api /eden-api
EXPOSE 3001
ENTRYPOINT ["/eden-api"]
