# -------- BUILD STAGE --------
FROM node:20-slim AS builder
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com \
    && npm ci --legacy-peer-deps

COPY . .
RUN npm run build


# -------- RUNNER STAGE --------
FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

USER node
EXPOSE 3001

CMD ["node", "dist/main.js"]
