# -------- BUILD STAGE --------
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install full (dev + prod) dependencies
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build NestJS → dist
RUN npm run build

# Remove devDependencies to reduce size
RUN npm prune --production



# -------- RUNNER STAGE --------
FROM node:20-slim AS runner
WORKDIR /usr/src/app

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Copy built files + production node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./


# Create a non-root user and switch to it
RUN useradd -m appuser
USER appuser

# Expose correct port
EXPOSE ${PORT}

# Start application
CMD ["node", "dist/main.js"]
