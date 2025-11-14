# -------- BUILD STAGE --------
FROM node:20-alpine3.22 AS builder
WORKDIR /usr/src/app

# Copy package files trước để cache tốt
COPY package*.json ./

# Cài full dependencies (dev + prod)
RUN npm i

# Copy source code
COPY . .

# Build NestJS → dist
RUN npm run build

# Loại bỏ devDependencies cho node_modules nhẹ hơn
RUN npm prune --production


# -------- RUN STAGE --------
FROM node:20-alpine3.22 AS runner
WORKDIR /usr/src/app

# Biến môi trường mặc định (port của service này)
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

# Expose đúng port app chạy
EXPOSE ${PORT}

# Run app
CMD ["node", "dist/main.js"]
