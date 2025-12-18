FROM node:20-alpine3.22 AS builder
WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com

RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build


FROM node:20-alpine3.22 AS deps
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm config set registry https://registry.npmmirror.com

RUN npm ci --omit=dev --legacy-peer-deps


FROM node:20-alpine3.22 AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3007

COPY --from=builder /usr/src/app/dist ./dist

COPY --from=deps /usr/src/app/node_modules ./node_modules

COPY package.json ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE ${PORT}
CMD ["node", "dist/main.js"]
