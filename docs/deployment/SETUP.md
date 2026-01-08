# The Architect Platform - Deployment Setup Guide

> **Production-ready deployment guide for the AI-powered blueprint generation platform**

---

## 📋 Prerequisites

### Required Accounts

| Service                  | URL                              | Purpose                              |
| ------------------------ | -------------------------------- | ------------------------------------ |
| **Neon Database**        | [neon.tech](https://neon.tech)   | PostgreSQL database hosting          |
| **Clerk Authentication** | [clerk.com](https://clerk.com)   | User authentication & management     |
| **Redis**                | [redis.com](https://redis.com)   | Caching & rate limiting (production) |
| **IFlow AI**             | [models.dev](https://models.dev) | AI model access                      |
| **Tavily API**           | [tavily.com](https://tavily.com) | Research API integration             |
| **Stripe**               | [stripe.com](https://stripe.com) | Payment processing                   |
| **GitHub**               | [github.com](https://github.com) | Repository creation & hosting        |

### Hosting Provider Options

- **Vercel** - Recommended for Next.js applications
- **Netlify** - Alternative deployment platform
- **AWS Amplify** - Enterprise AWS hosting
- **DigitalOcean App Platform** - Cost-effective option

---

## 🚀 Quick Start Deployment

### Step 1: Clone Repository

```bash
git clone https://github.com/sulhimaskom/blue
cd blue
```

### Step 2: Install Dependencies

> **pnpm** is the recommended package manager (specified in blueprint.md)

```bash
# Install pnpm if not present
npm install -g pnpm

# Install project dependencies
pnpm install
```

### Step 3: Environment Configuration

Create `.env` file from example:

```bash
cp .env.example .env
```

**Required Environment Variables:**

```env
# =============================================
# CORE INFRASTRUCTURE
# =============================================
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require

# Redis Caching (Production Required)
REDIS_URL=redis://username:password@host:port
REDIS_PASSWORD=your_redis_password

# =============================================
# AUTHENTICATION & USERS
# =============================================
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_public_key
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key

# =============================================
# AI SERVICES
# =============================================
# IFlow AI Models (Brain & Mouth agents)
IFLOW_API_KEY=iflow-api-key-here
IFLOW_BASE_URL=https://api.models.dev/v1

# Tavily Research API (Market analysis)
TAVILY_API_KEY=tavily-api-key-here

# =============================================
# GITHUB INTEGRATION
# =============================================
# GitHub Personal Access Token (repo scope)
GITHUB_ACCESS_TOKEN=github_pat_xxx

# GitHub App Configuration (Optional, for production)
GITHUB_APP_ID=12345
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

# =============================================
# PAYMENT PROCESSING
# =============================================
# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# =============================================
# APPLICATION SETTINGS
# =============================================
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret-here
```

### Step 4: Database Setup

Generate and run database migrations with Drizzle ORM:

```bash
# Generate database schema
pnpm run db:generate

# Run migrations to create tables
pnpm run db:migrate

# (Optional) Optimize database for production
pnpm run optimize-db
```

**Database Schema Created:**

- `users` - User accounts and credits
- `projects` - Project management
- `blueprints` - AI-generated blueprints
- `transactions` - Credit transactions

### Step 5: Redis Configuration

#### Development Environment (Optional)

```bash
# Docker Redis for local development
docker run -d -p 6379:6379 --name redis redis:alpine

# Set Redis URL for development
REDIS_URL=redis://localhost:6379
```

#### Production Environment (Required)

**Redis Cloud Setup:**

1. Sign up at [redis.com/try-free](https://redis.com/try-free)
2. Create a new Redis database
3. Get connection string from Redis console
4. Add `REDIS_URL` to environment variables

**Alternative Redis Providers:**

- **AWS ElastiCache**: `redis://clustercustom.xxx.cache.amazonaws.com:6379`
- **DigitalOcean Redis**: `redis://user:pass@host:port`

### Step 6: Verify Development Setup

```bash
# Start development server
pnpm run dev

# Verify health endpoint
curl http://localhost:3000/api/health

# Check all services are running
curl http://localhost:3000/api/health?detailed=true
```

### Step 7: Production Build

```bash
# Build production application
pnpm run build

# Verify build success
pnpm run start
```

---

## 🌐 Platform-Specific Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI:**

```bash
npm i -g vercel
```

2. **Login and Deploy:**

```bash
vercel login
vercel --prod
```

3. **Environment Variables in Vercel Dashboard:**

- Go to Project Settings → Environment Variables
- Add all variables from Step 3
- Set production environment variables

4. **Automatic Deployments:**

- Connect GitHub repository
- Enable automatic deployments on `main` branch

### Netlify Deployment

1. **Build Settings:**

```
Build command: pnpm run build
Publish directory: .next
```

2. **Environment Variables:**

- Add all required variables in Netlify dashboard
- Set branch-specific variables for staging/production

### DigitalOcean App Platform

1. **Create App:**

```bash
doctl apps create --spec app.yaml
```

2. **App Specification Example:**

```yaml
name: architect-platform
services:
  - name: web
    source_dir: /
    github:
      repo: your-org/architect-platform
      branch: main
    run_command: pnpm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    env:
      - key: DATABASE_URL
        value: ${DATABASE_URL}
      - key: REDIS_URL
        value: ${REDIS_URL}
```

---

## 🔧 Production Configuration

### Essential Production Settings

```env
# Production optimizations
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Security headers (add to vercel.json or netlify.toml)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Redis production configuration
REDIS_URL=redis://username:password@prod-redis-host:port
REDIS_PASSWORD=your-redis-password

# Database connection pooling
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require&connection_limit=50&pool_timeout=15
```

### Health Monitoring Setup

Configure monitoring endpoints:

```bash
# Add to your monitoring service
GET https://your-domain.com/api/health
GET https://your-domain.com/api/metrics
GET https://your-domain.com/api/circuit-breakers/metrics
```

### Performance Optimization

```bash
# Database optimization (run periodically)
pnpm run optimize-db

# Monitor cache performance
curl https://your-domain.com/api/cache/metrics
```

---

## 🛡️ Security Configuration

### Required Security Headers (Add to hosting platform)

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### Authentication Security

- **Clerk**: All authentication handled securely by Clerk
- **Row Level Security**: Database RLS policies enabled
- **API Rate Limiting**: Redis-based distributed rate limiting
- **Input Validation**: Comprehensive request sanitization

---

## 📊 Monitoring & Observability

### Built-in Monitoring Dashboard

- **URL**: `https://your-domain.com/dashboard/monitoring`
- **Features**: Real-time system health, performance metrics, circuit breaker status

### External Monitoring Integration

**Recommended Services:**

- **Vercel Analytics**: Built-in for Vercel deployments
- **Sentry**: Error tracking and performance monitoring
- **DataDog**: Infrastructure and APM monitoring

### Log Management

All logs use structured JSON format with correlation IDs:

```json
{
  "level": "info",
  "message": "Blueprint generation completed",
  "timestamp": "2025-12-24T10:00:00Z",
  "requestId": "req_abc123",
  "userId": "user_456",
  "duration": 1250
}
```

---

## 🚨 Troubleshooting

### Common Production Issues

| Issue                          | Symptoms                       | Solution                                                  |
| ------------------------------ | ------------------------------ | --------------------------------------------------------- |
| **Database Connection Failed** | 500 errors, health check fails | Verify `DATABASE_URL` format, check Neon console          |
| **Redis Not Available**        | Slow responses, cache warnings | Configure `REDIS_URL`, check Redis service                |
| **AI Service Unavailable**     | Blueprint generation failures  | Check IFlow/Tavily API keys, check circuit breakers       |
| **Authentication Issues**      | 401 errors                     | Verify Clerk configuration, check JWT tokens              |
| **Build Failures**             | Deployment errors              | Run `pnpm run build` locally, check environment variables |

### Debugging Commands

```bash
# Check system health
curl https://your-domain.com/api/health?detailed=true

# Verify all services
curl https://your-domain.com/api/metrics

# Check circuit breaker status
curl https://your-domain.com/api/circuit-breakers/metrics

# Test blueprint generation
curl -X POST https://your-domain.com/api/blueprints \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"input":"test","projectName":"test"}'
```

### Performance Optimization

```bash
# Database optimization
pnpm run optimize-db

# Cache performance check
curl https://your-domain.com/api/cache/enhanced-metrics

# Clear circuit breakers if needed
curl -X POST https://your-domain.com/api/circuit-breakers/reset
```

---

## 📋 Deployment Checklist

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database created and migrations run
- [ ] Redis instance provisioned (production)
- [ ] Clerk authentication configured
- [ ] AI services API keys valid
- [ ] GitHub access token with correct permissions
- [ ] Stripe integration configured
- [ ] SSL certificates active
- [ ] Custom domain configured
- [ ] Monitoring endpoints accessible

### Post-Deployment Verification

- [ ] Health check returns `healthy` status
- [ ] Authentication flow working
- [ ] Blueprint generation completes successfully
- [ ] GitHub integration creates repositories
- [ ] Payment processing functional
- [ ] Monitoring dashboard accessible
- [ ] Error logging working correctly
- [ ] Rate limiting active
- [ ] Caching operational

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow

The platform includes comprehensive CI/CD workflows:

- **`.github/workflows/ci-check.yml`** - Build and test validation
- **`.github/workflows/oc analyzer.yml`** - Code quality analysis
- **`.github/workflows/oc smart-ci.yml`** - Automated issue fixing

### Branch Protection Rules

Import `.github/branch protection rules.json`:

- Require PR reviews before merge
- Require status checks (build, test, lint)
- Require up-to-date branches before merging
- Restrict force pushes

---

**Platform Version**: 1.0.0  
**Last Updated**: 2025-12-24  
**Production Status**: ✅ Fully operational with world-class architecture
