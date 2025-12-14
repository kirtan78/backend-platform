# Deployment Guide

## Strategy

| Service | Deployment Target | Notes |
|---|---|---|
| Issue Tracker | Render (free Web Service) | Public API, live URL |
| Notification Service | Local Docker only | Free tier limits |
| Analytics Platform | Local Docker only | Free tier limits |
| PostgreSQL | Render managed DB | 90-day free tier |
| Redis | Render managed Redis | Free tier |
| MongoDB | MongoDB Atlas M0 | Always-on free tier |

## Deploying Issue Tracker on Render

### Step 1 — Create a Render account
Sign up at render.com. Connect your GitHub account.

### Step 2 — Push to GitHub
```bash
git init
git add .
git commit -m "feat: initial backend platform"
git remote add origin https://github.com/YOUR_USERNAME/backend-platform.git
git push -u origin main
```

### Step 3 — Create PostgreSQL Database on Render
1. Dashboard → New → PostgreSQL
2. Name: `backend-platform-db`
3. Plan: Free
4. Click Create Database
5. Note the **Internal Database URL** for later

### Step 4 — Create Redis on Render
1. Dashboard → New → Redis
2. Name: `backend-platform-redis`
3. Plan: Free
4. Click Create Redis
5. Note the **Internal Redis URL**

### Step 5 — Create Web Service
1. Dashboard → New → Web Service
2. Connect your GitHub repo
3. Configure:
   - **Name**: `issue-tracker`
   - **Root Directory**: `/` (monorepo root)
   - **Build Command**: `npm install && cd apps/issue-tracker && node scripts/migrate.js`
   - **Start Command**: `cd apps/issue-tracker && node src/server.js`
   - **Plan**: Free

### Step 6 — Set Environment Variables
In the Web Service → Environment tab, add:

```
NODE_ENV=production
JWT_SECRET=<generate a long random string>
POSTGRES_HOST=<from Render DB internal hostname>
POSTGRES_PORT=5432
POSTGRES_DB=<your db name>
POSTGRES_USER=<your db user>
POSTGRES_PASSWORD=<your db password>
REDIS_HOST=<from Render Redis internal hostname>
REDIS_PORT=6379
OPENAI_API_KEY=<your key, optional>
SEED_SECRET=<any secret string>
```

### Step 7 — Deploy
Click "Deploy". Render will:
1. Clone your repo
2. Run `npm install` (installs all workspace packages)
3. Run `node scripts/migrate.js` (applies all SQL migrations)
4. Start the Express server

Your live API will be at: `https://issue-tracker-XXXX.onrender.com`

### Step 8 — Seed demo data
```bash
curl -X POST https://issue-tracker-XXXX.onrender.com/seed/demo \
  -H "x-seed-secret: YOUR_SEED_SECRET"
```

## MongoDB Atlas Setup (for local Notification + Analytics)

1. Sign up at cloud.mongodb.com
2. Create a free M0 cluster (512MB, always-on)
3. Create a database user
4. Whitelist `0.0.0.0/0` (for development) or specific IPs
5. Get the connection string: `mongodb+srv://user:pass@cluster.mongodb.net/backend_platform`
6. Add to your `.env`: `MONGO_URI=mongodb+srv://...`

## Testing the Live Deployment

```bash
export API=https://issue-tracker-XXXX.onrender.com

# Health check
curl $API/health

# Register
curl -X POST $API/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Password123!"}'

# Or use seeded accounts
curl -X POST $API/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@acme.com","password":"Password123!"}'
```

## Cold Starts

Free tier Render services spin down after 15 minutes of inactivity. The first request after inactivity will take 10-30 seconds while the service boots. This is expected behavior on free tier — not a bug. Paid tiers keep instances always-on.

## Running Full Stack Locally

```bash
# Start all databases
docker-compose up -d postgres mongodb redis

# Run migrations
cd apps/issue-tracker && npm run migrate
cd apps/analytics-platform && npm run migrate

# Seed data
cd apps/issue-tracker && npm run seed

# Start all three services in separate terminals
cd apps/issue-tracker && npm start
cd apps/notification-service && npm start
cd apps/analytics-platform && npm start
```

## Production Considerations

For a real production deployment at scale:
- **Database**: Managed RDS (PostgreSQL), MongoDB Atlas M10+
- **Caching**: ElastiCache (Redis Cluster mode)
- **Hosting**: AWS ECS (Fargate) or Kubernetes
- **Queue**: Redis Streams or RabbitMQ for durable messaging
- **Secrets**: AWS Secrets Manager or Vault
- **Monitoring**: Datadog, Grafana + Prometheus
- **CI/CD**: GitHub Actions → staging → production
