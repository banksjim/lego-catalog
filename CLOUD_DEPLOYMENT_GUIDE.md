# Lego Catalog - Cloud Deployment Guide

## Complete Production Deployment on Google Cloud Platform

**Version:** 1.0
**Stack:** Docker + Cloud Run + Terraform + GitHub Actions + Datadog
**Environments:** Development, Testing, Production

---

## Executive Summary

This guide describes the complete architecture and workflow for deploying the Lego Catalog application to Google Cloud Platform using industry-standard tools and practices. The setup provides:

- **Three isolated environments** (dev, test, prod) with identical infrastructure
- **Infrastructure as Code** using Terraform for reproducible deployments
- **Automated CI/CD pipeline** with GitHub Actions
- **Full observability** using Datadog for monitoring, tracing, and logging
- **Cost-effective scaling** from 10 to 10,000+ users
- **Zero-downtime deployments** with automatic rollback capabilities

**Monthly Cost Estimate:**
- Development: $20-25/month
- Testing: $20-25/month
- Production: $25-35/month
- **Total: $65-85/month** for all three environments

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Developer Laptop                          │
│  • VS Code / IDE                                                 │
│  • Docker Desktop (local testing)                                │
│  • Git                                                           │
│  • Terraform CLI                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ git push
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Repository                           │
│  Repo: banksjim/lego-catalog                                    │
│  • Application Code (Go + React)                                 │
│  • Dockerfiles                                                   │
│  • GitHub Actions Workflows                                      │
│                                                                   │
│  Repo: banksjim/lego-catalog-infrastructure                     │
│  • Terraform Configurations                                      │
│  • Environment Configs (dev/test/prod)                           │
│  • Deployment Scripts                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ triggers
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GitHub Actions                              │
│  • Build Docker images                                           │
│  • Run tests                                                     │
│  • Terraform plan/apply                                          │
│  • Deploy to environments                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ deploys to
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Google Cloud Platform (3 Projects)                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Development  │  │   Testing    │  │  Production  │          │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤          │
│  │ Cloud Run    │  │ Cloud Run    │  │ Cloud Run    │          │
│  │ Cloud SQL    │  │ Cloud SQL    │  │ Cloud SQL    │          │
│  │ Cloud Storage│  │ Cloud Storage│  │ Cloud Storage│          │
│  │ Secret Mgr   │  │ Secret Mgr   │  │ Secret Mgr   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ sends telemetry
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Datadog                                  │
│  • APM (Application Performance Monitoring)                      │
│  • Infrastructure Monitoring                                     │
│  • Log Management                                                │
│  • Real User Monitoring (RUM)                                    │
│  • Dashboards & Alerts                                           │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Application** | Go 1.21 + React 18 | Backend API + Frontend UI |
| **Containerization** | Docker | Portable, reproducible deployments |
| **Compute** | Cloud Run | Serverless container platform |
| **Database** | Cloud SQL (MySQL 8.0) | Managed relational database |
| **Storage** | Cloud Storage | Image file storage |
| **Secrets** | Secret Manager | Secure credential storage |
| **IaC** | Terraform | Infrastructure as Code |
| **CI/CD** | GitHub Actions | Automated build & deploy |
| **Observability** | Datadog | Monitoring, tracing, logging |
| **Version Control** | GitHub | Code & infrastructure repos |

---

## Repository Structure

### Two Separate Repositories

You'll maintain **two GitHub repositories** to separate application code from infrastructure configuration:

#### Repository 1: `banksjim/lego-catalog` (Application Code)

```
lego-catalog/
├── .github/
│   └── workflows/
│       ├── build.yml              # Build & test on PRs
│       ├── deploy-dev.yml         # Auto-deploy dev on main merge
│       ├── deploy-test.yml        # Deploy to test (manual approval)
│       └── deploy-prod.yml        # Deploy to prod (manual approval)
│
├── backend/
│   ├── cmd/server/
│   ├── internal/
│   ├── migrations/
│   ├── Dockerfile                 # Backend container definition
│   ├── .dockerignore
│   └── go.mod
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── Dockerfile                 # Frontend container definition
│   ├── .dockerignore
│   └── package.json
│
├── docker-compose.yml             # Local development
├── .gitignore
├── README.md
├── QUICKSTART.md
├── CONTRIBUTING.md
└── CLOUD_DEPLOYMENT_GUIDE.md     # This file
```

#### Repository 2: `banksjim/lego-catalog-infrastructure` (Infrastructure)

```
lego-catalog-infrastructure/
├── .github/
│   └── workflows/
│       ├── terraform-plan.yml     # Preview changes on PRs
│       └── terraform-apply.yml    # Apply approved changes
│
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars       # Dev-specific values
│   │   └── backend.tf             # State storage config
│   ├── test/
│   │   ├── main.tf
│   │   ├── terraform.tfvars       # Test-specific values
│   │   └── backend.tf
│   └── prod/
│       ├── main.tf
│       ├── terraform.tfvars       # Prod-specific values
│       └── backend.tf
│
├── modules/
│   ├── cloud-run/                 # Reusable Cloud Run module
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── cloud-sql/                 # Reusable Cloud SQL module
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── storage/                   # Reusable Storage module
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── monitoring/                # Datadog integration module
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
│
├── scripts/
│   ├── init-gcp-project.sh        # Initial GCP setup
│   ├── create-service-account.sh  # CI/CD service account
│   └── bootstrap-terraform.sh     # Terraform state bucket
│
├── .gitignore
└── README.md
```

**Why Two Repositories?**

1. **Separation of Concerns**: Application developers don't need infrastructure access
2. **Security**: Infrastructure repo has stricter permissions
3. **Change Tracking**: Infrastructure changes are clearly separated from code changes
4. **Compliance**: Some organizations require this separation

---

## Environment Configuration

### Three Isolated Environments

Each environment is a **separate GCP project** with identical infrastructure but different configurations:

| Environment | GCP Project ID | Purpose | Access | Auto-Deploy |
|-------------|----------------|---------|--------|-------------|
| **Development** | `lego-catalog-dev-425916` | Active development, integration testing | All developers | ✅ Yes (on merge to `main`) |
| **Testing** | `lego-catalog-test-425916` | QA, user acceptance testing | QA team + developers | ⚠️ Manual approval required |
| **Production** | `lego-catalog-prod-425916` | Live user traffic | Ops team only | ⚠️ Manual approval + review |

### Environment Differences

| Configuration | Development | Testing | Production |
|---------------|-------------|---------|------------|
| Cloud Run Min Instances | 0 (scale to zero) | 0 | 1 (always warm) |
| Cloud Run Max Instances | 5 | 10 | 100 |
| Cloud SQL Tier | db-f1-micro | db-f1-micro | db-n1-standard-1 |
| Cloud SQL Backups | Daily | Daily | Hourly + PITR |
| Domain | dev.lego-catalog.app | test.lego-catalog.app | lego-catalog.app |
| Datadog Tags | env:dev | env:test | env:prod |
| Database Deletion Protection | ❌ No | ✅ Yes | ✅ Yes |
| Cost (Monthly) | $20-25 | $20-25 | $35-50 |

### Access URLs

```
Development:  https://backend-dev-<hash>-uc.a.run.app
Testing:      https://backend-test-<hash>-uc.a.run.app
Production:   https://backend-prod-<hash>-uc.a.run.app

(Frontend served via Firebase Hosting or Cloud Storage + Cloud CDN)
Dev Frontend:  https://dev.lego-catalog.app
Test Frontend: https://test.lego-catalog.app
Prod Frontend: https://lego-catalog.app
```

---

## Complete Development Workflow

### Scenario: Adding a New Feature

**Feature Request:** Add a "Wishlist" feature to track desired Lego sets

#### Step 1: Local Development (Your Laptop)

```bash
# Ensure you're on main and up-to-date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/wishlist

# Start local environment
docker-compose up

# This starts:
# - MySQL database (localhost:3306)
# - Backend API (localhost:8080)
# - Frontend dev server (localhost:3001)

# Make code changes
# - Add wishlist table migration (backend/migrations/003_add_wishlist.sql)
# - Add Go models and handlers
# - Add React components

# Test locally
# - Add items to wishlist
# - Verify functionality
# - Check browser console for errors

# Run tests
cd backend && go test ./...
cd frontend && npm test

# Commit changes
git add .
git commit -m "Add wishlist feature

- Added wishlist database table
- Created wishlist API endpoints
- Implemented wishlist UI components
- Added tests for wishlist functionality

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push feature branch
git push -u origin feature/wishlist
```

#### Step 2: Create Pull Request

```bash
# Using GitHub CLI
gh pr create \
  --title "Add wishlist feature" \
  --body "## Summary
  Implements wishlist functionality allowing users to track desired sets.

  ## Changes
  - Database migration for wishlist table
  - Backend API endpoints (GET, POST, DELETE /api/wishlist)
  - Frontend wishlist page and components

  ## Testing
  - [x] Local testing completed
  - [x] Unit tests passing
  - [ ] Deployed to dev environment
  - [ ] QA review in test environment

  ## Screenshots
  [Attach screenshots]"

# Or create via GitHub web interface
```

**What Happens Automatically:**

GitHub Actions workflow `.github/workflows/build.yml` triggers:

```yaml
name: Build & Test

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Run backend tests
      - Run frontend tests
      - Build Docker images (verify they build)
      - Run security scans
      - Comment results on PR
```

**PR Review Process:**
1. Automated tests run (5-10 minutes)
2. Code review by team member
3. Approve and merge to `main`

#### Step 3: Automatic Deployment to Development

**Immediately after merge to `main`**, GitHub Actions workflow `.github/workflows/deploy-dev.yml` triggers:

```yaml
name: Deploy to Development

on:
  push:
    branches: [main]

jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    steps:
      # 1. Build containers
      - Build backend Docker image
      - Build frontend Docker image
      - Tag as: gcr.io/lego-catalog-dev/backend:sha-abc123
      - Push to Google Container Registry

      # 2. Deploy to Cloud Run (Development)
      - Deploy new container to Cloud Run
      - Run database migrations
      - Health check
      - Switch traffic to new version

      # 3. Notify team
      - Post to Slack: "✅ Deployed to dev: https://dev.lego-catalog.app"
      - Comment on PR: "Deployed to dev environment"
```

**Timeline:**
- Merge to `main`: 0:00
- Container build: 0:00 - 3:00 (3 minutes)
- Deploy to Cloud Run: 3:00 - 4:00 (1 minute)
- Health checks: 4:00 - 5:00 (1 minute)
- **Total: ~5 minutes** from merge to live in dev

**You can now test at:** https://dev.lego-catalog.app

#### Step 4: Deploy to Testing (Manual Approval)

After testing in dev environment:

```bash
# Trigger test deployment via GitHub Actions
gh workflow run deploy-test.yml
```

**Manual Approval Required:**

```yaml
name: Deploy to Testing

on:
  workflow_dispatch:  # Manual trigger only

jobs:
  deploy-test:
    environment: testing  # Requires approval
    runs-on: ubuntu-latest
    steps:
      # Same as dev deployment, but to test environment
      - Deploy to Cloud Run (Testing)
      - Notify QA team
```

GitHub will prompt:
```
⏸️  Deployment to "testing" environment requires approval
   Approvers: @banksjim, @qa-team
   [Review Deployment]
```

**QA Testing Phase:**
1. QA team tests at https://test.lego-catalog.app
2. Run acceptance tests
3. Verify wishlist functionality
4. Sign off on release

**Timeline:** Hours to days, depending on QA schedule

#### Step 5: Deploy to Production (Manual Approval + Review)

After QA approval:

```bash
# Create production release
gh release create v1.5.0 \
  --title "Release v1.5.0: Wishlist Feature" \
  --notes "Added wishlist functionality for tracking desired sets"

# Trigger production deployment
gh workflow run deploy-prod.yml --ref v1.5.0
```

**Production Deployment Workflow:**

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Release version to deploy'
        required: true

jobs:
  deploy-prod:
    environment: production
    runs-on: ubuntu-latest
    steps:
      # 1. Pre-deployment checks
      - Verify release tag exists
      - Check all tests passed
      - Verify deployed in test environment
      - Create backup of production database

      # 2. Blue/Green Deployment
      - Deploy new version (green)
      - Run smoke tests
      - Gradually shift traffic: 10% → 50% → 100%
      - Monitor error rates in Datadog

      # 3. Post-deployment
      - Run database migrations (if any)
      - Send notifications
      - Create deployment record

      # 4. Rollback capability
      - If error rate > threshold: automatic rollback
```

**Required Approvals:**
- ✅ Tech lead approval
- ✅ Product owner approval (for feature releases)
- ✅ All automated checks passing

**Timeline:**
- Approval: 0:00
- Pre-deployment checks: 0:00 - 2:00
- Deployment with gradual rollout: 2:00 - 12:00 (10 minutes)
- Monitoring period: 12:00 - 32:00 (20 minutes)
- **Total: ~30 minutes** from approval to full production

**Deployed to:** https://lego-catalog.app

---

## GitHub Actions Workflows Explained

### What GitHub Actions Does For You

GitHub Actions **completely automates** your deployment pipeline. You never manually SSH into servers, run docker commands, or execute terraform commands in production.

### Workflow 1: `build.yml` (On Pull Requests)

**Triggers:** Every PR to `main`

**Purpose:** Ensure code quality before merge

```yaml
Jobs:
  1. Lint code (Go + TypeScript)
  2. Run unit tests (backend + frontend)
  3. Build Docker images (verify they build)
  4. Security scanning (vulnerability checks)
  5. Integration tests (API tests)
  6. Comment results on PR

Status checks:
  ✅ All tests passing → Allow merge
  ❌ Any test failing → Block merge
```

### Workflow 2: `deploy-dev.yml` (On Merge to Main)

**Triggers:** Merge to `main` branch

**Purpose:** Automatic deployment to development environment

```yaml
Jobs:
  build:
    - Checkout code (git sha from main)
    - Build backend Docker image
      → Tag: gcr.io/lego-catalog-dev/backend:sha-abc123
    - Build frontend Docker image
      → Tag: gcr.io/lego-catalog-dev/frontend:sha-abc123
    - Push to Google Container Registry
    - Run security scan on images

  deploy:
    needs: build
    - Authenticate to GCP (dev project)
    - Deploy backend to Cloud Run
      → URL: https://backend-dev-xyz.run.app
    - Deploy frontend to Firebase Hosting
      → URL: https://dev.lego-catalog.app
    - Run database migrations
    - Run smoke tests
    - Post success/failure to Slack

  notify:
    - Comment on related PRs with deployment link
    - Update deployment dashboard
```

**Execution Time:** 5-7 minutes

### Workflow 3: `deploy-test.yml` (Manual Trigger)

**Triggers:** Manual via GitHub UI or `gh workflow run`

**Purpose:** Deploy to testing environment for QA

```yaml
Jobs:
  require-approval:
    environment: testing  # Protected environment
    - Pause for manual approval

  deploy:
    needs: require-approval
    - Same as dev deployment
    - Deploy to test GCP project
    - Notify QA team
    - Create test report
```

**Execution Time:** 5-7 minutes + approval wait time

### Workflow 4: `deploy-prod.yml` (Manual Trigger + Approval)

**Triggers:** Manual, from git tags only

**Purpose:** Production deployment with safety checks

```yaml
Jobs:
  pre-deployment:
    - Verify release tag
    - Check Datadog for current error rates
    - Backup production database
    - Run pre-flight checks

  deploy:
    environment: production  # Requires 2 approvals
    needs: pre-deployment
    strategy: blue-green
    - Deploy new version (green)
    - Run smoke tests
    - Traffic shift: 10% → 25% → 50% → 100%
    - Monitor error rates (auto-rollback if high)

  post-deployment:
    - Run database migrations (if any)
    - Update status page
    - Send notifications (email, Slack, PagerDuty)
    - Tag deployment in Datadog
```

**Execution Time:** 20-30 minutes (includes gradual rollout)

### Workflow 5: `terraform-plan.yml` (Infrastructure Changes)

**Repository:** `lego-catalog-infrastructure`

**Triggers:** PR to `main` in infrastructure repo

**Purpose:** Preview infrastructure changes

```yaml
Jobs:
  plan-dev:
    - Terraform init (dev environment)
    - Terraform plan
    - Comment plan output on PR

  plan-test:
    - Terraform plan (test environment)
    - Comment plan output on PR

  plan-prod:
    - Terraform plan (prod environment)
    - Comment plan output on PR
```

**Output:** Shows exactly what will change before applying

### Workflow 6: `terraform-apply.yml` (Infrastructure Deployment)

**Triggers:** Merge to `main` in infrastructure repo

**Purpose:** Apply infrastructure changes

```yaml
Jobs:
  apply-dev:
    - Terraform apply (auto-approved for dev)

  apply-test:
    environment: test-infrastructure
    - Terraform apply (requires approval)

  apply-prod:
    environment: prod-infrastructure
    - Terraform apply (requires 2 approvals)
```

---

## Datadog Integration

### What Datadog Gives You

**Datadog is your observability platform** providing:

1. **Application Performance Monitoring (APM)**: Trace every request through your system
2. **Infrastructure Monitoring**: CPU, memory, disk usage for all services
3. **Log Management**: Centralized logs from all environments
4. **Real User Monitoring (RUM)**: Frontend performance from real users
5. **Alerting**: Get notified when things go wrong
6. **Dashboards**: Visual insights into your application

### Setup Process

#### Step 1: Create Datadog Account

```bash
# Sign up at https://www.datadoghq.com/
# Select region: US5 (or EU1 if in Europe)
# Free tier: Up to 5 hosts, 150M spans/month
```

#### Step 2: Add Datadog Agent to Cloud Run

**Backend Dockerfile with Datadog:**

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.* ./
RUN go mod download
COPY . .
RUN go build -o server cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates

# Install Datadog tracer
COPY --from=builder /app/server .

# Datadog configuration via environment variables
ENV DD_SERVICE=lego-backend
ENV DD_ENV=production
ENV DD_VERSION=1.0.0

EXPOSE 8080
CMD ["./server"]
```

**Add Datadog Go Library:**

```go
// cmd/server/main.go
import (
    "gopkg.in/DataDog/dd-trace-go.v1/ddtrace/tracer"
    "gopkg.in/DataDog/dd-trace-go.v1/contrib/gorilla/mux"
)

func main() {
    // Start Datadog tracer
    tracer.Start(
        tracer.WithEnv(os.Getenv("DD_ENV")),
        tracer.WithService("lego-backend"),
        tracer.WithServiceVersion(os.Getenv("DD_VERSION")),
    )
    defer tracer.Stop()

    // Instrument Gorilla Mux router
    r := mux.NewRouter(mux.WithServiceName("lego-backend"))

    // Your routes...
    r.HandleFunc("/api/sets", handler.GetSets)

    http.ListenAndServe(":8080", r)
}
```

#### Step 3: Configure in Terraform

```hcl
# terraform/modules/cloud-run/main.tf

resource "google_cloud_run_v2_service" "backend" {
  name = "lego-backend-${var.environment}"

  template {
    containers {
      image = var.container_image

      # Datadog configuration
      env {
        name  = "DD_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.datadog_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "DD_SITE"
        value = "datadoghq.com"
      }

      env {
        name  = "DD_ENV"
        value = var.environment
      }

      env {
        name  = "DD_SERVICE"
        value = "lego-backend"
      }

      env {
        name  = "DD_LOGS_INJECTION"
        value = "true"
      }

      env {
        name  = "DD_TRACE_SAMPLE_RATE"
        value = var.environment == "prod" ? "0.5" : "1.0"
      }
    }
  }
}
```

### What You'll See in Datadog

#### 1. APM Dashboard

```
Services Map:
  Frontend (React) → Backend (Go) → Cloud SQL (MySQL)
                                  → Cloud Storage

Request Traces:
  GET /api/sets
  ├─ HTTP Request (2ms)
  ├─ Database Query (45ms)
  ├─ Image URL Generation (1ms)
  └─ HTTP Response (1ms)
  Total: 49ms

Top Endpoints:
  GET  /api/sets          - 2,450 req/hr - 45ms avg
  POST /api/sets          -   120 req/hr - 120ms avg
  GET  /api/sets/:id      - 1,200 req/hr - 30ms avg
  GET  /api/dashboard     -   450 req/hr - 85ms avg
```

#### 2. Infrastructure Monitoring

```
Cloud Run Instances:
  lego-backend-prod
  ├─ CPU: 15%
  ├─ Memory: 180MB / 512MB (35%)
  ├─ Requests: 125 req/min
  └─ Latency: p50=45ms, p95=120ms, p99=250ms

Cloud SQL:
  lego-catalog-prod
  ├─ Connections: 12 / 100
  ├─ CPU: 8%
  ├─ Disk: 2.4GB / 10GB
  └─ Slow Queries: 0
```

#### 3. Real User Monitoring (Frontend)

```
Page Performance:
  Dashboard Page
  ├─ Load Time: 1.2s
  ├─ First Contentful Paint: 0.4s
  ├─ Time to Interactive: 0.9s
  └─ Largest Contentful Paint: 0.8s

User Sessions:
  Active Users: 42
  Avg Session Duration: 8m 34s
  Bounce Rate: 12%
```

#### 4. Log Management

```
Logs (Live Tail):
[INFO]  2025-01-15 14:23:45 | GET /api/sets | user_id=123 | 45ms
[INFO]  2025-01-15 14:23:46 | Created set 10276 | user_id=123
[ERROR] 2025-01-15 14:23:50 | Database connection timeout | retry=1
[INFO]  2025-01-15 14:23:51 | Database reconnected successfully
[WARN]  2025-01-15 14:24:00 | Image upload size exceeds 5MB | user_id=456
```

#### 5. Alerts

**Example Alerts You'll Configure:**

```
Alert 1: High Error Rate
  Condition: Error rate > 5% for 5 minutes
  Notify: Slack #alerts, PagerDuty

Alert 2: Slow Response Time
  Condition: p95 latency > 1000ms for 10 minutes
  Notify: Slack #performance

Alert 3: Database Connection Issues
  Condition: DB connection errors > 10 in 5 minutes
  Notify: PagerDuty (page on-call)

Alert 4: High Memory Usage
  Condition: Memory usage > 80% for 15 minutes
  Notify: Slack #infrastructure
```

### Datadog Dashboard Example

**"Lego Catalog - Production Overview" Dashboard:**

```
Row 1: Key Metrics
  ┌──────────────┬──────────────┬──────────────┬──────────────┐
  │ Requests/Min │  Avg Latency │  Error Rate  │ Active Users │
  │     125      │    45ms      │    0.2%      │     42       │
  └──────────────┴──────────────┴──────────────┴──────────────┘

Row 2: Request Volume (Graph)
  Requests/Min
  200 ┤     ╭╮
  150 ┤   ╭─╯╰╮    ╭╮
  100 ┤╭──╯    ╰────╯╰─╮
   50 ┤╯                ╰─
    0 └─────────────────────
      12pm  2pm  4pm  6pm

Row 3: Latency Distribution (Graph)
  Latency (ms)
  500 ┤
  400 ┤
  300 ┤    ╭────p99
  200 ┤  ╭─────p95
  100 ┤──────────p50
    0 └─────────────────────

Row 4: Service Map
  [React Frontend] → [Go Backend] → [MySQL]
       ↓                  ↓
  [Cloud Storage]    [Secret Manager]

Row 5: Top Endpoints by Latency
  /api/dashboard/stats     85ms  (DB aggregate queries)
  /api/sets/import         120ms (CSV processing)
  /api/sets                45ms  (List query)

Row 6: Infrastructure Health
  Cloud Run: ✅ Healthy (3 instances)
  Cloud SQL: ✅ Healthy (8% CPU)
  Cloud Storage: ✅ Healthy
```

---

## Day-to-Day Operations

### Daily Developer Workflow

```bash
# Morning: Check what's deployed
gh pr list
gh workflow run list

# Work on feature
git checkout -b feature/new-thing
# ... code changes ...
git push

# Create PR
gh pr create

# Automated tests run automatically
# After approval, merge to main
gh pr merge 123

# Automatically deploys to dev in ~5 minutes
# Test at https://dev.lego-catalog.app

# When ready for QA
gh workflow run deploy-test.yml
```

### Weekly Release Workflow

```bash
# Every Friday: Production release

# 1. Review what's in dev/test
git log prod..test --oneline

# 2. Create release
gh release create v1.5.0 \
  --title "Release v1.5.0" \
  --notes-file CHANGELOG.md

# 3. Deploy to production
gh workflow run deploy-prod.yml --ref v1.5.0

# 4. Monitor in Datadog
# Watch error rates, latency, user activity

# 5. If issues arise
gh workflow run rollback-prod.yml --ref v1.4.0
```

### Monitoring Routine

**Daily:**
- Check Datadog dashboard (5 minutes)
- Review error logs (if any alerts)
- Monitor deployment status

**Weekly:**
- Review performance trends
- Check cost usage (GCP billing)
- Update runbooks if needed

**Monthly:**
- Review and adjust alerts
- Update dependencies
- Review and optimize costs

---

## Cost Breakdown

### Monthly Costs (All Environments)

#### Development Environment (~$22/month)

```
Cloud Run (Backend)              $3    (minimal usage)
Cloud Run (Frontend)             $2    (minimal usage)
Cloud SQL (db-f1-micro)         $10    (running 24/7)
Cloud Storage                    $1    (test images)
Secret Manager                   $0.50
Load Balancer                    $5
──────────────────────────────────────
Subtotal:                      ~$22/month
```

#### Testing Environment (~$23/month)

```
Cloud Run (Backend)              $4    (QA testing)
Cloud Run (Frontend)             $2
Cloud SQL (db-f1-micro)         $10
Cloud Storage                    $1
Secret Manager                   $0.50
Load Balancer                    $5
──────────────────────────────────────
Subtotal:                      ~$23/month
```

#### Production Environment (~$35/month for 100 users)

```
Cloud Run (Backend)             $12    (actual traffic)
Cloud Run (Frontend)             $5
Cloud SQL (db-f1-micro)         $10
Cloud Storage                    $2    (user images)
Secret Manager                   $0.50
Load Balancer                    $5
──────────────────────────────────────
Subtotal:                      ~$35/month
```

#### Shared Services

```
Datadog (Free Tier)              $0    (up to 5 hosts)
GitHub Actions                   $0    (2,000 minutes/month free)
Terraform State Storage          $1    (Cloud Storage bucket)
──────────────────────────────────────
```

### **Total Monthly Cost: ~$80-85/month**

### Cost Scaling

| Active Users | Production Cost | Total (All Envs) |
|--------------|----------------|------------------|
| 10 | $25 | $70 |
| 50 | $30 | $75 |
| **100** | **$35** | **$80** |
| 500 | $60 | $105 |
| 1,000 | $90 | $135 |
| 5,000 | $250 | $295 |

---

## Summary: What You Get

### Infrastructure Benefits

✅ **Three isolated environments** for safe development
✅ **Infrastructure as Code** - reproducible, version-controlled
✅ **Automated CI/CD** - push code, get deployed
✅ **Zero-downtime deployments** with automatic rollback
✅ **Full observability** with Datadog
✅ **Scalable** from 10 to 10,000+ users
✅ **Cost-effective** at $80/month for all environments
✅ **Industry-standard tools** - transferable skills

### Developer Experience

✅ **Fast feedback loop**: Code → Dev in 5 minutes
✅ **Confidence**: Automated testing catches bugs
✅ **Visibility**: See exactly what's deployed where
✅ **Safety**: Manual approvals for test/prod
✅ **Observability**: Know when things break (and why)

### Your Workflow (Start to Finish)

```
Monday 9am:   Create feature branch
Monday 11am:  Open PR, automated tests run
Monday 2pm:   PR approved, merge to main
Monday 2:05pm: Automatically deployed to dev
Tuesday 10am: Deploy to test for QA
Wednesday:    QA testing and approval
Friday 4pm:   Deploy to production
Friday 4:30pm: Monitoring in Datadog shows success
```

**Total time from idea to production: 4-5 days**
**Total deployment time: ~10 minutes**
**Developer manual work: ~30 minutes** (rest is automated)

This is a **professional-grade deployment pipeline** that scales with your needs while keeping costs low and developer velocity high.
