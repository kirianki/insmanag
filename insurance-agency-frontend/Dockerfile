# ---------- Builder Stage ----------
FROM node:20-bullseye AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential python3 make g++ libc6-dev git && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml .npmrc* ./

# Install with --ignore-scripts first, then rebuild natives for this platform
RUN pnpm install --no-frozen-lockfile

# Copy the rest of the source
COPY . .

# Explicitly rebuild native modules for the current platform
RUN pnpm rebuild @tailwindcss/oxide

# Build Next.js app
RUN pnpm build

# ---------- Production Stage ----------
FROM node:20-bullseye AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN npm install -g pnpm

COPY --from=builder /app ./

EXPOSE 3001

CMD ["pnpm", "start"]