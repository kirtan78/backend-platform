FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY packages/ ./packages/
COPY apps/notification-service/ ./apps/notification-service/

RUN npm install --workspaces --if-present

WORKDIR /app/apps/notification-service

EXPOSE 3002

CMD ["node", "src/server.js"]
