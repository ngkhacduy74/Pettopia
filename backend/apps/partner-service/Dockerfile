# -------- BUILD STAGE --------
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Copy package files trước để tạo cache layer cho dependencies
COPY package*.json ./

# Install all deps (dev + prod) — chạy 1 lần duy nhất
RUN npm ci --legacy-peer-deps

# Copy toàn bộ source
COPY . .

# Build NestJS → dist
RUN npm run build

# Remove devDependencies để tạo node_modules production
RUN npm prune --production



# -------- RUN STAGE --------
FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3004

# Copy built dist + production node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./


# Create non-root user
RUN useradd -m appuser
USER appuser

EXPOSE ${PORT}

CMD ["node", "dist/main.js"]
