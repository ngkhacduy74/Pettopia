FROM node:20-alpine3.22 AS builder
WORKDIR /usr/src/app

# Copy package files trước để cache tốt
COPY package*.json ./

# Cài full dependencies (dev + prod)
RUN npm i

# Copy source code
COPY . .

# Build NestJS → dist
RUN npm run build

# Loại bỏ devDependencies cho node_modules nhẹ hơn
RUN npm prune --production


FROM node:20-alpine3.22 AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3003
# Copy built artifacts and dependencies from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE ${PORT}

CMD ["node", "dist/main.js"]