# -------- BUILD STAGE --------
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Copy package files trước để tối ưu cache
COPY package*.json ./

# Install full deps (dev + prod) ONLY ONCE
RUN npm ci --legacy-peer-deps --prefer-offline

# Copy toàn bộ source
COPY . .

# Build NestJS → dist
RUN npm run build

# Prune để giữ lại production-only deps
RUN npm prune --production



# -------- RUNNER STAGE --------
FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy dist + production node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy package.json (không cần lockfile)
COPY package.json ./


USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
