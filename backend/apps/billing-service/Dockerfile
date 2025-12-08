# -------- BUILD STAGE --------
FROM node:20-alpine3.22 AS builder
WORKDIR /usr/src/app

# Alpine cần toolchain để build các native modules (nếu có)
RUN apk add --no-cache python3 make g++

# Copy package files trước để cache tốt
COPY package*.json ./

# Dùng registry mirror để tránh lỗi ECONNRESET
RUN npm config set registry https://registry.npmmirror.com

# Cài full dependencies (dev + prod)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build NestJS → dist
RUN npm run build

# Loại bỏ devDependencies
RUN npm prune --production


# -------- RUN STAGE --------
FROM node:20-alpine3.22 AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3007

# Copy dist đã build
COPY --from=builder /usr/src/app/dist ./dist

# Copy node_modules đã prune (chỉ production)
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy package.json
COPY --from=builder /usr/src/app/package*.json ./


# Tạo user non-root chuẩn security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE ${PORT}

CMD ["node", "dist/main.js"]
