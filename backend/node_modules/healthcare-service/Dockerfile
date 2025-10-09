FROM node:20-alpine3.22 AS healthcare-builder
WORKDIR /backend/apps

COPY package*.json ./
RUN npm ci 

COPY . .
# chạy để build ứng dụng ra file dist
RUN npm run build

#giai doan 2 
FROM node:20-alpine3.22 
WORKDIR /backend/apps
COPY package*.json ./

RUN npm ci --omit=dev
COPY --from=healthcare-builder /backend/apps/dist ./dist



EXPOSE 3005

CMD ["node", "dist/main.js"]