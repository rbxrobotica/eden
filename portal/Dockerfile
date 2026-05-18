FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_API_URL=https://api.eden.rbx.ia.br
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/build ./build
COPY serve.ts ./
EXPOSE 3000
CMD ["bun", "run", "serve.ts"]
