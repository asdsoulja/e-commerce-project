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

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm ci --only=production

COPY . .

WORKDIR /app/apps/api
RUN npx prisma generate
RUN npx prisma migrate deploy || true

WORKDIR /app

RUN npm install -g concurrently

EXPOSE 3000 4000
CMD ["concurrently", "npm run start:api --prefix apps/api", "npm run start:web --prefix apps/web"]