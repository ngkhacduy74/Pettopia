# --- Builder image ---
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Copy & install dependencies
COPY package*.json ./

# Install full deps (dev + prod)
RUN npm ci --legacy-peer-deps --prefer-offline

# Copy toàn bộ source và build
COPY . .
RUN npm run build

# Remove devDependencies để tạo node_modules production-only
RUN npm prune --production


# --- Runner image ---
FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy built files + production node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy package.json (lockfile không cần trong runner)
COPY --from=builder /usr/src/app/package.json ./


USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
