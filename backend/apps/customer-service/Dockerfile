FROM node:20-alpine3.22 AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
# build app to dist
RUN npm run build

FROM node:20-alpine3.22 AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy built artifacts and dependencies from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

USER node

EXPOSE 3002

CMD ["node", "dist/main.js"]