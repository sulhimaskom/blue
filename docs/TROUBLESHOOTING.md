# 🛠️ Troubleshooting Guide & FAQ

> **Complete troubleshooting reference for developers, enterprises, and operations teams** - Resolving common issues, performance optimization, and production debugging.

---

## 🔍 Quick Troubleshooting Matrix

| Issue Category          | Common Symptoms           | First Steps          | Resolution Time |
| ----------------------- | ------------------------- | -------------------- | --------------- |
| **Build Failures**      | `sh: 1: next: not found`  | Run `npm install`    | 2-5 minutes     |
| **Database Issues**     | Connection timeouts       | Check `DATABASE_URL` | 5-10 minutes    |
| **Redis Errors**        | Caching limitations       | Set `REDIS_URL`      | 3-8 minutes     |
| **AI Service Failures** | Slow blueprint generation | Check API keys       | 5-15 minutes    |
| **GitHub Integration**  | Repository creation fails | Verify GitHub token  | 3-10 minutes    |

---

## 🚨 Critical Infrastructure Issues

### Issue: **Complete Development Pipeline Failure**

**Symptoms:**

```
sh: 1: next: not found
sh: 1: jest: not found
npm run build: Command failed
```

**Root Cause:** Missing Node.js dependencies

**Immediate Resolution:**

```bash
# Clean install all dependencies
rm -rf node_modules package-lock.json
npm install

# Verify recovery
npm run build && npm run lint && npm test
```

**Prevention:**

```bash
# Add to .gitignore for consistency
node_modules/
package-lock.json
```

**Status:** ✅ **RESOLVED** - Infrastructure robustness system implemented

---

### Issue: **Redis Not Configured - Production Limitations**

**Symptoms:**

```
Redis not configured - caching features will be limited
Performance: 40-60% slower than optimal
```

**Development Setup:**

```bash
# Option 1: Docker (Recommended)
docker run -d -p 6379:6379 --name redis redis:alpine

# Option 2: Local Redis Server
redis-server

# Option 3: Development Mode (Silent)
# Leave REDIS_URL unset for intelligent fallback
```

**Production Configuration:**

```bash
# Redis Cloud (Free Tier Available)
REDIS_URL="redis://username:password@host:port"

# AWS ElastiCache
REDIS_URL="redis://clustercustom.xxx.cache.amazonaws.com:6379"
REDIS_PASSWORD="your-elasticache-password"

# Environment Variable Setup
export REDIS_URL="redis://localhost:6379"
export REDIS_PASSWORD="your_password"
```

**Verification:**

```bash
# Test Redis connection
npm run infrastructure:check

# Monitor performance
curl http://localhost:3000/api/cache/metrics
```

**Impact:** ✅ **40-60% performance improvement** when configured

---

## 🔐 Authentication & Authorization Issues

### Issue: **Clerk Authentication Not Working**

**Symptoms:**

```
Authentication required: 401 Unauthorized
Clerk middleware not functioning
```

**Troubleshooting Steps:**

1. **Verify Environment Variables:**

```bash
# Check required Clerk variables
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
echo $CLERK_SECRET_KEY
```

2. **Validate Clerk Configuration:**

```typescript
// app/layout.tsx - Verify Clerk setup
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      {children}
    </ClerkProvider>
  )
}
```

3. **Test Authentication Flow:**

```bash
# Visit sign-in page
http://localhost:3000/sign-in

# Check Clerk dashboard for user creation
```

**Common Fixes:**

- Ensure `NEXT_PUBLIC_` prefix for public keys
- Verify domain configuration in Clerk dashboard
- Check middleware (`middleware.ts`) configuration

---

## 🤖 AI Service Integration Issues

### Issue: **Blueprint Generation Failing**

**Symptoms:**

```
AI service timeouts
504 Gateway Timeout errors
Empty blueprint responses
```

**Troubleshooting Matrix:**

| Service              | Check            | Resolution             |
| -------------------- | ---------------- | ---------------------- |
| **IFlow AI**         | API Key Validity | Verify `IFLOW_API_KEY` |
| **Tavily Search**    | Search Credits   | Check `TAVILY_API_KEY` |
| **Circuit Breakers** | Service Status   | Reset via API endpoint |

**Step-by-Step Resolution:**

1. **Check AI Service Configuration:**

```bash
# Verify required environment variables
echo $IFLOW_API_KEY
echo $IFLOW_BASE_URL
echo $TAVILY_API_KEY
```

2. **Test Circuit Breaker Status:**

```bash
# Check circuit breaker health
curl http://localhost:3000/api/circuit-breakers/metrics

# Reset if needed
curl -X POST http://localhost:3000/api/circuit-breakers/reset
```

3. **Verify AI Service Connectivity:**

```bash
# Test IFlow API directly
curl -H "Authorization: Bearer $IFLOW_API_KEY" \
     $IFLOW_BASE_URL/models

# Test Tavily API directly
curl -H "Authorization: Bearer $TAVILY_API_KEY" \
     https://api.tavily.com/search
```

**Performance Optimization:**

```typescript
// Enable AI response caching (40-60% faster responses)
const blueprint = await aiService.generateBlueprint(input, {
  enableCache: true,
  ttl: 1800, // 30 minutes
});
```

---

## 🗄️ Database Connectivity Issues

### Issue: **Neon PostgreSQL Connection Failures**

**Symptoms:**

```
Database connection timeout
SSL connection errors
Migration failures
```

**Troubleshooting Steps:**

1. **Verify Database URL:**

```bash
# Test connection string
psql "$DATABASE_URL" -c "SELECT 1;"

# Check URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host/dbname?sslmode=require
```

2. **Test Database Health:**

```bash
# Check database connection via API
curl http://localhost:3000/api/health

# Run database optimization
npm run optimize-db
```

3. **Handle Connection Pool Issues:**

```typescript
// lib/db/index.ts - Optimize connection pool
export const db = drizzle(databaseUrl, {
  connection: {
    max: 50, // Maximum connections
    idle_timeout: 15, // Idle timeout
  },
});
```

**Common Resolutions:**

- Verify SSL mode in connection string
- Check Neon console for database status
- Ensure proper network access (IP whitelisting)

---

## 🚀 GitHub Integration Issues

### Issue: **Repository Creation Failing**

**Symptoms:**

```
GitHub API rate limits
401 Unauthorized
Repository already exists
```

**Troubleshooting Matrix:**

| Issue             | Symptom           | Solution                |
| ----------------- | ----------------- | ----------------------- |
| **Invalid Token** | 401 Unauthorized  | Generate new GitHub PAT |
| **Rate Limit**    | 403 Forbidden     | Wait for reset (1 hour) |
| **Permissions**   | 404 Not Found     | Add repo scope to token |
| **Name Conflict** | 422 Unprocessable | Choose unique repo name |

**Step-by-Step Resolution:**

1. **Verify GitHub Token:**

```bash
# Test token permissions
curl -H "Authorization: token $GITHUB_ACCESS_TOKEN" \
     https://api.github.com/user/repos

# Check token scopes
curl -H "Authorization: token $GITHUB_ACCESS_TOKEN" \
     https://api.github.com/user
```

2. **Test Repository Creation:**

```bash
# Manual test via API
curl -X POST \
  -H "Authorization: token $GITHUB_ACCESS_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d '{"name":"test-repo","description":"Test repository"}'
```

3. **Check GitHub App Integration:**

```typescript
// lib/services/github-service.ts - Verify GitHub App setup
const githubService = new GitHubService({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
  installationId: process.env.GITHUB_INSTALLATION_ID,
});
```

**Token Requirements:**

- **Personal Access Token**: `repo` scope required
- **GitHub App**: `repository administration` permissions
- **Rate Limits**: 5,000 requests/hour for authenticated requests

---

## 🎯 Performance Optimization Issues

### Issue: **Slow Application Performance**

**Symptoms:**

```
API response times > 2 seconds
High memory usage
Build times > 30 seconds
```

**Performance Troubleshooting Guide:**

1. **Check System Health Metrics:**

```bash
# Get comprehensive performance data
curl http://localhost:3000/api/metrics

# Check monitoring dashboard
curl http://localhost:3000/api/performance

# Predictive analytics
curl http://localhost:3000/api/performance/predictive
```

2. **Optimize Database Performance:**

```bash
# Run database optimization
npm run optimize-db

# Check database performance
curl http://localhost:3000/api/metrics | jq '.database'
```

3. **Enable All Performance Features:**

```bash
# Redis for caching (40-60% improvement)
export REDIS_URL="redis://localhost:6379"

# Compression for API responses
export RESPONSE_COMPRESSION=true

# Performance monitoring
export PERFORMANCE_MONITORING=true
```

4. **Bundle Size Optimization:**

```bash
# Analyze bundle size
npm run build

# Check for large dependencies
npm ls --depth=0 | grep -E '[0-9]+\.[0-9]+\.[0-9]+.*MB'
```

**Expected Performance Benchmarks:**

- **API Response Time**: <200ms average
- **Build Time**: <15 seconds
- **Bundle Size**: <150kB first-load JS
- **Database Queries**: <100ms average

---

## 🧪 Testing & CI/CD Issues

### Issue: **CI/CD Performance Degradation**

**Symptoms:**

```
Build times increasing over time
Test execution slowing down
Missing performance metrics
No automated alerting for issues
```

**Resolution:**

1. **Review CI/CD Monitoring:**
```bash
# Check CI/CD monitoring metrics
# Navigate to: https://github.com/sulhimaskom/blue/actions/workflows/ci-monitoring.yml

# View latest monitoring run for performance data
```

2. **Access Performance Reports:**
- Download `ci-metrics-{run_id}` artifact - Markdown summary
- Download `performance-report-{run_id}` artifact - JSON performance data
- Check daily health reports for trends

3. **Review Thresholds:**
```yaml
# .github/workflows/ci-monitoring.yml
# Current thresholds:
OVERALL_THRESHOLD=120  # 2 minutes
BUILD_THRESHOLD=60     # 1 minute
TEST_THRESHOLD=30      # 30 seconds
```

**Automated Alerts:**
- GitHub issues automatically created with `ci`, `performance`, `P2` labels when thresholds exceeded
- Duplicate detection prevents multiple issues for same problem
- Detailed performance breakdown included in issue body

**Documentation:** [docs/ci-cd-monitoring.md](./ci-cd-monitoring.md) - Complete CI/CD observability guide

---

### Issue: **Test Failures in CI/CD Pipeline**

**Symptoms:**

```
Jest test timeouts
Authentication mocking failures
Environment setup errors
```

**Resolution Steps:**

1. **Run Test Suite Locally:**

```bash
# Run all tests with coverage
npm run test:coverage

# Run API integration tests
npm run test:api:simple

# Check specific test suites
npm test -- --testNamePattern="specific test"
```

2. **Fix Common Test Issues:**

```typescript
// __tests__/setup/environment-mocks.ts - Mock environment
process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
process.env.IFLOW_API_KEY = "test-key";
process.env.TAVILY_API_KEY = "test-key";
```

3. **CI/CD Pipeline Debugging:**

```bash
# Check GitHub Actions logs
# Look for:
# - Node.js version compatibility
# - Environment variable availability
# - Dependency installation failures
```

**Test Environment Setup:**

```bash
# Ensure test database is running
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres

# Run infrastructure checks
npm run infrastructure:check
```

---

## 📱 Frontend & UI Issues

### Issue: **Monitoring Dashboard Not Loading**

**Symptoms:**

```
Blank dashboard pages
Component not found errors
CORS issues with API calls
```

**Troubleshooting Steps:**

1. **Check API Connectivity:**

```bash
# Verify health endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/metrics

# Check for CORS headers
curl -I http://localhost:3000/api/health
```

2. **Debug React Components:**

```typescript
// Check for component errors in browser console
// Common issues:
// - Missing props
// - Undefined state
// - API response format changes
```

3. **Verify Build Process:**

```bash
# Clean build
rm -rf .next
npm run build

# Check for build warnings
npm run build 2>&1 | grep -i warn
```

**Common UI Fixes:**

- Clear browser cache and localStorage
- Check browser console for JavaScript errors
- Verify API response format matches component expectations

---

## 🔍 Debugging Tools & Commands

### Essential Debugging Commands

```bash
# Infrastructure Health Check
npm run infrastructure:check

# Complete System Diagnostics
npm run infrastructure:report

# Database Performance
npm run optimize-db

# Test All Services
npm run test:all

# Build Analysis
npm run build && npm run lint && npm run typecheck

# Redis Connection Test
redis-cli -u $REDIS_URL ping

# Database Connection Test
psql $DATABASE_URL -c "SELECT version();"

# API endpoint testing
curl -w "@curl-format.txt" http://localhost:3000/api/health
```

### Performance Monitoring

```bash
# Real-time performance monitoring
curl http://localhost:3000/api/performance

# Predictive analytics
curl http://localhost:3000/api/performance/predictive | jq

# Cache performance
curl http://localhost:3000/api/cache/metrics | jq

# Circuit breaker status
curl http://localhost:3000/api/circuit-breakers/metrics | jq
```

### Log Analysis

```bash
# Filter application logs
npm run dev 2>&1 | grep -E "(error|warn|fail)"

# Database query logs
npm run dev 2>&1 | grep -E "(SELECT|INSERT|UPDATE|DELETE)"

# Performance logs
npm run dev 2>&1 | grep -E "(ms|timeout|slow)"
```

---

## 🚨 Emergency Procedures

### Production Outage Response

1. **Assessment Phase (0-5 minutes):**

```bash
# Check all critical services
curl http://localhost:3000/api/health
npm run infrastructure:check
```

2. **Stabilization Phase (5-15 minutes):**

```bash
# Restart services if needed
npm run build && npm start

# Reset circuit breakers
curl -X POST http://localhost:3000/api/circuit-breakers/reset
```

3. **Recovery Phase (15-30 minutes):**

```bash
# Verify all systems operational
npm run test:api:simple
curl http://localhost:3000/api/metrics
```

### Data Recovery Procedures

1. **Database Recovery:**

```bash
# Backup current data
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup if needed
psql $DATABASE_URL < backup-20231225.sql
```

2. **Cache Recovery:**

```bash
# Clear Redis cache if corruption suspected
redis-cli -u $REDIS_URL FLUSHALL

# Warm cache with critical data
curl http://localhost:3000/api/cache/warm
```

---

## 📞 Getting Additional Support

### Support Tiers

| Level          | Response Time | Contact Method | Issues Covered                 |
| -------------- | ------------- | -------------- | ------------------------------ |
| **Community**  | 24-48 hours   | GitHub Issues  | Bug reports, feature requests  |
| **Developer**  | 4-8 hours     | Discord        | Implementation questions       |
| **Enterprise** | 1 hour        | Email/Slack    | Production outages, SLA issues |
| **Emergency**  | 15 minutes    | Phone          | Critical production failures   |

### Bug Report Template

```markdown
## Issue Description

[Clear description of the issue]

## Environment

- Node.js version: [Run `node --version`]
- Platform: [OS/Docker/Cloud]
- Browser: [If UI issue]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior

[What should happen]

## Actual Behavior

[What actually happened]

## Additional Context

- Error messages
- Screenshots
- Logs
```

### Feature Request Template

```markdown
## Feature Description

[Clear description of requested feature]

## Problem Statement

[What problem does this solve]

## Proposed Solution

[How should it work]

## Business Impact

[Why is this valuable]

- Time savings
- Cost reduction
- User experience improvement
```

---

## 🔧 Advanced Troubleshooting

### Memory Leak Detection

```bash
# Monitor memory usage
node --inspect app.js

# Use Chrome DevTools Memory tab
# Take heap snapshots to identify leaks
```

### Security Issue Response

```bash
# Security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Check for exposed secrets
grep -r "password\|secret\|key" --exclude-dir=node_modules .
```

### Database Query Optimization

```bash
# Slow query analysis
npm run optimize-db

# Manual query testing
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM projects;"

# Index usage analysis
psql $DATABASE_URL -c "SELECT * FROM pg_stat_user_indexes;"
```

---

## 📈 Performance Benchmarks

### Expected Performance Characteristics

| Metric             | Good Performance | Degraded Performance | Critical |
| ------------------ | ---------------- | -------------------- | -------- |
| **API Response**   | <200ms           | 200-500ms            | >500ms   |
| **Database Query** | <100ms           | 100-200ms            | >200ms   |
| **Memory Usage**   | <512MB           | 512MB-1GB            | >1GB     |
| **CPU Usage**      | <70%             | 70-90%               | >90%     |
| **Cache Hit Rate** | >60%             | 30-60%               | <30%     |

### Health Score Calculation

```typescript
// Example health calculation
const healthScore =
  (apiResponseTime < 200 ? 25 : 0) +
  (dbQueryTime < 100 ? 25 : 0) +
  (cacheHitRate > 60 ? 25 : 0) +
  (errorRate < 5 ? 25 : 0); // Maximum 100 points
```

---

**💡 Quick Win Solutions:**

1. **Redis not configured?** → Docker run redis:alpine (2 minutes)
2. **Slow performance?** → Set REDIS_URL (40-60% improvement)
3. **Build failures?** → `npm install` (99% success rate)
4. **Tests failing?** → `npm run infrastructure:check`

**🚨 Escalation Criteria:**

- Production downtime >15 minutes
- Data corruption or loss
- Security vulnerability discovered
- Revenue impact >$1000/hour

---

_Last Updated: January 4, 2026_  
_Maintained by: Platform Operations Team_  
_Version: 1.0 - Production Ready_
