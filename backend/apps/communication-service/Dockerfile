FROM node:20-slim AS builder
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build



FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3006

COPY package*.json ./ 

RUN npm ci --omit=dev --legacy-peer-deps

COPY --from=builder /usr/src/app/dist ./dist

USER node

EXPOSE ${PORT}
CMD ["node", "dist/main.js"]
