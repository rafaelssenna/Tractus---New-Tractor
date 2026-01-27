FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/database/package.json ./packages/database/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm db:generate

# Build API
RUN pnpm build:api

# Expose port
EXPOSE 3333

# Start command - db:push runs at startup when DATABASE_URL is available
CMD ["sh", "-c", "pnpm db:push && pnpm start:api"]
