# -------- BUILD STAGE --------
FROM node:20-alpine3.22 AS builder
WORKDIR /usr/src/app

# Copy package.json để cache tốt
COPY package*.json ./

# Cài full dependencies (dev + prod)
RUN npm i

# Copy toàn bộ source code
COPY . .

# Build NestJS ra dist
RUN npm run build

# Loại bỏ devDependencies để làm nhẹ node_modules
RUN npm prune --production


# -------- RUNNER STAGE --------
FROM node:20-alpine3.22 AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy output sau khi build
COPY --from=builder /usr/src/app/dist ./dist

# Copy node_modules đã prune (chỉ production)
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy package.json
COPY --from=builder /usr/src/app/package*.json ./

USER node

EXPOSE 3001

CMD ["node", "dist/main.js"]
