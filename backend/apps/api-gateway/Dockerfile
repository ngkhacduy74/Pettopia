FROM node:20-alpine3.22 AS builder
WORKDIR /usr/src/app

# Copy package.json trước để cache layer
COPY package*.json ./

# Install dependencies (gồm dev)
RUN npm i

# Copy toàn bộ source code
COPY . .

# Build source → dist
RUN npm run build


# --- Production Image ---
FROM node:20-alpine3.22 AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy only package.json
COPY package*.json ./

# Install only production deps
RUN npm ci --omit=dev

# Copy built app
COPY --from=builder /usr/src/app/dist ./dist

# Chạy bằng user thường
USER node

EXPOSE 3000
CMD ["node", "dist/main.js"]
