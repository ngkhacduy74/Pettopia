
FROM node:20-slim AS builder
WORKDIR /app


COPY package*.json ./


RUN npm ci --legacy-peer-deps


COPY . .

RUN npm run build



FROM node:20-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps


FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
