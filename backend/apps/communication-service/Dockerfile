# -------- BUILD STAGE --------
FROM node:20-slim AS builder
WORKDIR /usr/src/app

# Copy only dependency files first (better caching)
COPY package*.json ./

# Install ALL deps (dev + prod) for building
RUN npm ci --legacy-peer-deps

# Copy full source
COPY . .

# Build NestJS → dist
RUN npm run build



# -------- RUNNER STAGE --------
FROM node:20-slim AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3006

# Copy only package*.json for clean install
COPY package*.json ./ 

# Install ONLY production deps
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built code
COPY --from=builder /usr/src/app/dist ./dist

USER node

EXPOSE ${PORT}
CMD ["node", "dist/main.js"]
