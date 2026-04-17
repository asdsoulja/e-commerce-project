# Development stage
FROM node:22-alpine AS development

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm ci

COPY . .

WORKDIR /app/apps/api
RUN npx prisma generate

WORKDIR /app

EXPOSE 3000 4000
CMD ["npm", "run", "dev"]

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# NEXT_PUBLIC_* values are baked into Next.js client bundles at build time.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm ci --include=dev

COPY . .

RUN npm run build

WORKDIR /app/apps/api
RUN npx prisma generate

WORKDIR /app

RUN chmod +x /app/start.sh

EXPOSE 3000 4000
CMD ["sh", "/app/start.sh"]
