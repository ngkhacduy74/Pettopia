# -------- BUILD STAGE --------
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Copy package files trước để cache tốt
COPY package*.json ./

# ⚡ Cài dependencies cực nhanh
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build NestJS → dist
RUN npm run build



# -------- PRUNE STAGE (chỉ giữ lại prod deps) --------
FROM node:20-slim AS deps
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps



# -------- RUN STAGE --------
FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3003

# Copy dist đã build
COPY --from=builder /usr/src/app/dist ./dist

# Copy production node_modules
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy package.json
COPY package*.json ./


# Create non-root user
RUN useradd -m appuser
USER appuser

EXPOSE ${PORT}

CMD ["node", "dist/main.js"]
