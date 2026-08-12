FROM node:20-alpine AS builder

# Prisma's engine binaries need OpenSSL present to detect the right target -
# Alpine doesn't ship it by default.
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4100

# Apply any pending migrations, then start the server. Safe to run on every
# container start - Prisma tracks which migrations have already applied.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]

# Hot reload for development, targeted by docker-compose.dev.yml so it doesn't
# affect production environments.
FROM node:20-alpine AS dev

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .

EXPOSE 4100

CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]
