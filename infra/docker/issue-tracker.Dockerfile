FROM node:22-alpine

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY packages/ ./packages/
COPY apps/issue-tracker/ ./apps/issue-tracker/

# Install all workspace deps
RUN npm install --workspaces --if-present

WORKDIR /app/apps/issue-tracker

EXPOSE 3001

CMD ["node", "src/server.js"]
