# -------- BUILD STAGE --------
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Copy package files trước để cache dependency layer
COPY package*.json ./

# Install all deps ONCE only (dev + prod)
RUN npm ci --legacy-peer-deps

# Copy full source
COPY . .

# Build NestJS → dist
RUN npm run build

# Remove devDependencies (create final prod node_modules)
RUN npm prune --production



# -------- RUN STAGE --------
FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3003

# Copy built code
COPY --from=builder /usr/src/app/dist ./dist

# Copy production node_modules
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy package.json
COPY package*.json ./


# Create non-root user
RUN useradd -m appuser
USER appuser

EXPOSE ${PORT}

CMD ["node", "dist/main.js"]
