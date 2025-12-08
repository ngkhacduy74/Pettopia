# -------- BUILD STAGE --------
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Copy package files trước để cache tốt
COPY package*.json ./

# Cài full dependencies (dev + prod)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build NestJS → dist
RUN npm run build

# Loại bỏ devDependencies cho node_modules nhẹ hơn
RUN npm prune --production



# -------- RUN STAGE --------
FROM node:20-slim AS runner
WORKDIR /usr/src/app

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3004

# Copy built artifacts and dependencies from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Create a non-root user and switch to it
RUN useradd -m appuser
USER appuser

# Expose the port the app runs on
EXPOSE ${PORT}

# Command to run the application
CMD ["node", "dist/main.js"]
