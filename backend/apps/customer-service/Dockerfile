# -------- BUILD STAGE --------
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Copy package files trước để tạo dependency cache layer
COPY package*.json ./

# Install dependencies (dev + prod)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build NestJS → dist
RUN npm run build

# Remove devDependencies — để node_modules còn lại đúng production deps
RUN npm prune --production



# -------- RUNNER STAGE --------
FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3002

# Copy production build & node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy package.json (không cần package-lock.json trong runner)
COPY --from=builder /usr/src/app/package.json ./


# Create a non-root user
RUN useradd -m appuser
USER appuser

EXPOSE ${PORT}

CMD ["node", "dist/main.js"]
