# --- Builder image ---
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Copy & install dependencies
COPY package*.json ./

# Dùng registry mirror để tránh timeout
RUN npm config set registry https://registry.npmmirror.com \
    && npm ci

# Copy toàn bộ source và build
COPY . .
RUN npm run build


# --- Runner image ---
FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy package.json và install production deps
COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com \
    && npm ci --omit=dev

# Copy built files
COPY --from=builder /usr/src/app/dist ./dist

USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
