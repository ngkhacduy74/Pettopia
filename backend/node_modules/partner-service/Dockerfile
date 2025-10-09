FROM node:20-alpine3.22 AS partner-builder
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
COPY --from=partner-builder /backend/apps/dist ./dist



EXPOSE 3004

CMD ["node", "dist/main.js"]