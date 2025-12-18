FROM node:20-slim AS builder
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build


FROM node:20-slim AS deps
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev --legacy-peer-deps


FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY --from=builder /usr/src/app/dist ./dist

COPY --from=deps /usr/src/app/node_modules ./node_modules

COPY package.json ./

USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
