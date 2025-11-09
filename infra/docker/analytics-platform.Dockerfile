FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY packages/ ./packages/
COPY apps/analytics-platform/ ./apps/analytics-platform/

RUN npm install --workspaces --if-present

WORKDIR /app/apps/analytics-platform

EXPOSE 3003

CMD ["node", "src/server.js"]
