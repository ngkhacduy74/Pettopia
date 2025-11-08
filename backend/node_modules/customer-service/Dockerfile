FROM node:20-alpine3.22 AS builder
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build app to dist
RUN npm run build

FROM node:20-alpine3.22 AS runner
WORKDIR /usr/src/app

# Set default environment variables
ENV NODE_ENV=production
ENV PORT=3002  # Default port for customer-service

# Copy built artifacts and dependencies from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# Create a non-root user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the port the app runs on
EXPOSE $PORT

# Command to run the application
CMD ["node", "dist/main.js"]