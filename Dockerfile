FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run prisma:generate
RUN npm run build

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

EXPOSE 3001

# ponytail: migrate on boot so single-container PaaS (Railway/Render) works with no extra step; idempotent, no-op under compose's separate migrate service
CMD ["sh", "-c", "npm run prisma:migrate:deploy && npm run start"]
