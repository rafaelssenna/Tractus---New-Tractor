FROM node:22-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy everything
COPY . .

# Debug: list files to verify copy
RUN ls -la && ls -la packages/ && ls -la apps/

# Install dependencies
RUN pnpm install

# Generate Prisma client
RUN pnpm db:generate

# Build API
RUN pnpm build:api

# Expose port
EXPOSE 3333

# Start command - db:push runs at startup when DATABASE_URL is available
CMD ["sh", "-c", "pnpm db:push && pnpm start:api"]
