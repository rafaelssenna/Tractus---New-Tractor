FROM node:22-alpine

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN pnpm install

# Generate Prisma client
RUN pnpm db:generate

# Build API
RUN pnpm build:api

# Expose port (Railway uses dynamic PORT)
EXPOSE 3333

# Start command - db:push with error handling, then start API
CMD ["sh", "-c", "pnpm db:push || echo 'db:push failed, continuing...' && pnpm start:api"]
