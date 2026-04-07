FROM node:22-alpine

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Create .env file for API if it doesn't exist
RUN mkdir -p /app/apps/api && \
    echo 'DATABASE_URL="file:./dev.db"' > /app/apps/api/.env

# Set environment variable
ENV DATABASE_URL="file:/app/apps/api/dev.db"

# Generate Prisma client
WORKDIR /app/apps/api
RUN npx prisma generate

WORKDIR /app

EXPOSE 3000 4000

# Use the startup script
COPY docker-startup.sh /docker-startup.sh
RUN chmod +x /docker-startup.sh

CMD ["/docker-startup.sh"]