# Lego Catalog - Cloud Deployment Guide

## Complete Production Deployment on Google Cloud Platform

**Version:** 2.0
**Stack:** Docker + Cloud Run + Terraform + GitHub Actions + Honeycomb
**Environments:** Development, Production

---

## Executive Summary

This guide describes the complete architecture and workflow for deploying the Lego Catalog application to Google Cloud Platform using industry-standard tools and practices. The setup provides:

- **Two isolated environments** (dev, prod) with identical infrastructure
- **Infrastructure as Code** using Terraform for reproducible deployments
- **Automated CI/CD pipeline** with GitHub Actions
- **Full observability** using Honeycomb for monitoring, tracing, and debugging
- **Cost-effective scaling** from 10 to 10,000+ users
- **Zero-downtime deployments** with blue/green strategy and automatic rollback capabilities

**Monthly Cost Estimate:**
- Development: $20-25/month
- Production: $30-40/month
- **Total: $50-65/month** for both environments (saves $276/year vs 3-env setup)

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
│  • Environment Configs (dev/prod)                                │
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
│              Google Cloud Platform (2 Projects)                  │
│                                                                   │
│              ┌──────────────┐  ┌──────────────┐                 │
│              │ Development  │  │  Production  │                 │
│              ├──────────────┤  ├──────────────┤                 │
│              │ Cloud Run    │  │ Cloud Run    │                 │
│              │ Cloud SQL    │  │ Cloud SQL    │                 │
│              │ Cloud Storage│  │ Cloud Storage│                 │
│              │ Secret Mgr   │  │ Secret Mgr   │                 │
│              └──────────────┘  └──────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ sends telemetry
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Honeycomb                                │
│  • Distributed Tracing (see entire request flows)                │
│  • Event-based Observability                                     │
│  • Real-time Query & Analysis                                    │
│  • Dashboards & SLOs                                             │
│  • BubbleUp (automatic anomaly detection)                        │
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
| **Observability** | Honeycomb | Distributed tracing & monitoring |
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
│   └── monitoring/                # Honeycomb integration module
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

**📘 Complete Terraform Code:** For full, production-ready `.tf` files with all modules, see **[Complete Terraform Module Examples](docs/enhancements/cloud-deployment-guide/detailed-guidance/terraform-modules-complete.md)**

**Why Two Repositories?**

1. **Separation of Concerns**: Application developers don't need infrastructure access
2. **Security**: Infrastructure repo has stricter permissions
3. **Change Tracking**: Infrastructure changes are clearly separated from code changes
4. **Compliance**: Some organizations require this separation

---

## Environment Configuration

### Two Isolated Environments

Each environment is a **separate GCP project** with identical infrastructure but different configurations:

| Environment | GCP Project ID | Purpose | Access | Auto-Deploy |
|-------------|----------------|---------|--------|-------------|
| **Development** | `lego-catalog-dev-425916` | Active development, integration testing | All developers | ✅ Yes (on merge to `main`) |
| **Production** | `lego-catalog-prod-425916` | Live user traffic | Ops team only | ⚠️ Manual approval + review |

### Environment Differences

| Configuration | Development | Production |
|---------------|-------------|------------|
| Cloud Run Min Instances | 0 (scale to zero) | 1 (always warm) |
| Cloud Run Max Instances | 5 | 100 |
| Cloud SQL Tier | db-f1-micro | db-n1-standard-1 |
| Cloud SQL Backups | Daily | Hourly + PITR |
| Cloud SQL HA | ❌ No | ✅ Yes (regional) |
| Domain | dev.lego-catalog.app | lego-catalog.app |
| Honeycomb Environment | env:dev | env:prod |
| Database Deletion Protection | ❌ No | ✅ Yes |
| Cost (Monthly) | $20-25 | $35-50 |

### Access URLs

```
Development:  https://backend-dev-<hash>-uc.a.run.app
Production:   https://backend-prod-<hash>-uc.a.run.app

(Frontend served via Firebase Hosting or Cloud Storage + Cloud CDN)
Dev Frontend:  https://dev.lego-catalog.app
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
  - [ ] Ready for production

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
1. Automated tests run
2. Self-review (you're solo developer)
3. Merge to `main`

#### Step 3: Automatic Deployment to Development

**After merge to `main`**, GitHub Actions workflow `.github/workflows/deploy-dev.yml` triggers:

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

      # 3. Notify
      - Post to Slack: "✅ Deployed to dev: https://dev.lego-catalog.app"
      - Send event to Honeycomb (deployment marker)
```

**Deployment Steps:**
1. Merge to `main`
2. Container build
3. Deploy to Cloud Run
4. Health checks
5. Deployment complete

**You can now test at:** https://dev.lego-catalog.app

#### Step 4: Test Thoroughly in Development

```bash
# Visit dev environment
open https://dev.lego-catalog.app

# Test the wishlist feature:
# - Add items to wishlist
# - Remove items
# - Test edge cases
# - Check mobile responsive
# - Verify in different browsers

# Monitor in Honeycomb:
# - Check for errors
# - Review trace spans
# - Verify performance
```

**Development Testing Checklist:**
- ✅ Feature works as expected
- ✅ No errors in Honeycomb
- ✅ Mobile responsive
- ✅ Performance acceptable (< 200ms avg)
- ✅ Database migrations ran successfully

#### Step 5: Deploy to Production (Manual Approval + Blue/Green)

After thorough testing in dev:

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
      - Verify deployed in dev environment
      - Create backup of production database
      - Send deployment start event to Honeycomb

      # 2. Blue/Green Deployment with Traffic Splitting
      - Deploy new version (green) with 0% traffic
      - Run smoke tests against green
      - Gradually shift traffic with monitoring at each stage:
          10% → Monitor until stable
          25% → Monitor until stable
          50% → Monitor until stable
          100% → Full rollout
      - Monitor error rates in Honeycomb (auto-rollback if high)

      # 3. Post-deployment
      - Run database migrations (if any)
      - Send deployment success event to Honeycomb
      - Send notifications (Slack, email)
      - Create deployment record

      # 4. Rollback capability
      - If error rate > 2%: automatic rollback to blue
      - If p95 latency increases > 50%: automatic rollback
```

**Required Approvals:**
- ✅ Your approval (sole developer)
- ✅ All automated checks passing
- ✅ Dev environment tested successfully

**Deployment Sequence:**
1. Manual approval
2. Pre-deployment checks
3. Blue deployment (0% traffic)
4. Smoke tests
5. Traffic shift 10% → Monitor
6. Traffic shift 25% → Monitor
7. Traffic shift 50% → Monitor
8. Traffic shift 100% → Full rollout
9. Final monitoring period
10. Deployment complete

**Deployed to:** https://lego-catalog.app

---

## Simplified 2-Environment Strategy

### Why This Works for Solo Developers

**Traditional Approach (3 environments):**
```
Laptop → Dev → Test → Prod
         ↓      ↓      ↓
      Step 1  Step 2  Step 3  (Multiple approval gates)
```

**Optimized Approach (2 environments with safety):**
```
Laptop → Dev → Prod
         ↓      ↓
      Step 1  Step 2  (Gradual rollout with auto-rollback)
```

### Safety Mechanisms (Replacing Test Environment)

Instead of a separate test environment, you use:

1. **Thorough Testing in Dev**
   - Dev environment mirrors production exactly
   - Test all features thoroughly before promoting
   - Use real data scenarios

2. **Manual Production Approval Gate**
   - GitHub Actions requires your explicit approval
   - Review deployment checklist before approving
   - Cancel if anything seems off

3. **Blue/Green Deployment with Traffic Splitting**
   - New version deploys with 0% traffic
   - Gradual rollout: 10% → 25% → 50% → 100%
   - Monitor at each stage
   - Instant rollback if issues detected

4. **Automated Health Checks**
   - Smoke tests before any traffic
   - Continuous monitoring during rollout
   - Auto-rollback on error spike

5. **Honeycomb Real-Time Monitoring**
   - Watch error rates during deployment
   - Compare performance: blue vs green
   - BubbleUp alerts on anomalies
   - Instant visibility into issues

### Comparison: Safety Levels

| Safety Mechanism | 3-Env (Dev/Test/Prod) | 2-Env (Dev/Prod + Safety) |
|------------------|------------------------|---------------------------|
| Isolated Testing | ✅ Test environment | ✅ Dev environment |
| Manual Gate | ✅ Test & Prod | ✅ Prod only |
| Gradual Rollout | ⚠️ Optional | ✅ Built-in |
| Auto-Rollback | ⚠️ Optional | ✅ Built-in |
| Real-time Monitoring | ✅ Yes | ✅ Yes |
| Smoke Tests | ⚠️ Optional | ✅ Required |
| Deployment Steps | More steps | Fewer steps, faster |
| **Overall Safety** | **Very High** | **High** |

### When to Add a Test Environment

Consider adding a third environment when:

1. ✅ **You hire someone**
   - Now you have a real QA person
   - Need handoff environment

2. ✅ **You have 1,000+ active users**
   - Production issues impact more people
   - Extra safety gate justified

3. ✅ **Complex database migrations**
   - Need production-scale data testing
   - Can't adequately test in dev

4. ✅ **Making money from the app**
   - Extra $23/month is negligible
   - Downtime costs more

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
    - Send deployment event to Honeycomb
    - Post success/failure to Slack

  notify:
    - Comment on related PRs with deployment link
    - Update deployment dashboard
```

### Workflow 3: `deploy-prod.yml` (Manual Trigger + Approval)

**Triggers:** Manual, from git tags only

**Purpose:** Production deployment with safety checks and blue/green strategy

```yaml
Jobs:
  pre-deployment:
    - Verify release tag
    - Check Honeycomb for current error rates
    - Verify dev deployment is healthy
    - Backup production database
    - Run pre-flight checks
    - Send deployment start event to Honeycomb

  deploy:
    environment: production  # Requires manual approval
    needs: pre-deployment
    strategy: blue-green

    # Deploy green (new version) with no traffic
    - Deploy new version to Cloud Run (0% traffic)
    - Run smoke tests against green deployment
    - Health check green deployment

    # Gradual traffic shift with monitoring
    - Traffic: 0% → 10%
      → Monitor until stable
      → Check error rate in Honeycomb
      → If error rate > 2%: ROLLBACK

    - Traffic: 10% → 25%
      → Monitor until stable
      → Compare green vs blue performance
      → If p95 latency increased > 50%: ROLLBACK

    - Traffic: 25% → 50%
      → Monitor until stable
      → Monitor user experience metrics
      → Check for new error types

    - Traffic: 50% → 100%
      → Full rollout complete
      → Keep blue running (easy rollback available)

  post-deployment:
    - Run database migrations (if any)
    - Send deployment success event to Honeycomb
    - Update status page
    - Send notifications (email, Slack)
    - Tag deployment in Honeycomb
    - Remove old blue deployment after safety period
```

**Safety Features:**
- ✅ Manual approval required
- ✅ Smoke tests before traffic
- ✅ Gradual rollout with monitoring
- ✅ Automatic rollback on errors
- ✅ Safety period for manual rollback

### Workflow 4: `terraform-plan.yml` (Infrastructure Changes)

**Repository:** `lego-catalog-infrastructure`

**Triggers:** PR to `main` in infrastructure repo

**Purpose:** Preview infrastructure changes

```yaml
Jobs:
  plan-dev:
    - Terraform init (dev environment)
    - Terraform plan
    - Comment plan output on PR

  plan-prod:
    - Terraform plan (prod environment)
    - Comment plan output on PR
```

**Output:** Shows exactly what will change before applying

### Workflow 5: `terraform-apply.yml` (Infrastructure Deployment)

**Triggers:** Merge to `main` in infrastructure repo

**Purpose:** Apply infrastructure changes

```yaml
Jobs:
  apply-dev:
    - Terraform apply (auto-approved for dev)

  apply-prod:
    environment: prod-infrastructure
    - Terraform apply (requires manual approval)
```

---

## Honeycomb Integration

### What Honeycomb Gives You

**Honeycomb is your observability platform** designed for modern distributed systems:

1. **Distributed Tracing**: Follow requests across services (frontend → backend → database)
2. **Event-Based Observability**: Every action is an event you can query
3. **High-Dimensional Analysis**: Slice data by ANY field combination
4. **BubbleUp**: Automatically surface anomalies and outliers
5. **Real-Time Queries**: Instant answers to questions about your system
6. **Cost-Effective**: Free tier up to 20GB/month (plenty for solo dev)

### Why Honeycomb vs Traditional Monitoring

**Traditional (Datadog, New Relic):**
- Pre-defined dashboards
- Metric-based (counters, gauges)
- Limited dimension cardinality
- Expensive at scale

**Honeycomb:**
- Query-driven exploration
- Event-based (every request is queryable)
- Unlimited dimension cardinality
- Much more affordable

### Setup Process

#### Step 1: Create Honeycomb Account

```bash
# Sign up at https://www.honeycomb.io/
# Free tier: 20 GB/month, 60-day retention
# Perfect for solo developer with <1000 users
```

#### Step 2: Get API Key

```bash
# In Honeycomb UI:
# Team Settings → API Keys → Create New Key
# Name: "lego-catalog-production"
# Permissions: "Send Events" + "Create Datasets"

# Copy the API key (you'll need it for Cloud Run config)
```

#### Step 3: Add Honeycomb to Go Backend

**Install Honeycomb Beeline:**

```bash
cd backend
go get github.com/honeycombio/beeline-go
```

**Instrument your backend:**

```go
// cmd/server/main.go
package main

import (
    "net/http"
    "os"

    "github.com/gorilla/mux"
    beeline "github.com/honeycombio/beeline-go"
    "github.com/honeycombio/beeline-go/wrappers/hnygorilla"
)

func main() {
    // Initialize Honeycomb Beeline
    beeline.Init(beeline.Config{
        WriteKey:    os.Getenv("HONEYCOMB_API_KEY"),
        Dataset:     "lego-backend",
        ServiceName: "lego-backend",
    })
    defer beeline.Close()

    // Create router with Honeycomb instrumentation
    router := mux.NewRouter()
    router.Use(hnygorilla.Middleware)

    // Add custom fields to all traces
    beeline.AddField("environment", os.Getenv("ENVIRONMENT"))
    beeline.AddField("version", os.Getenv("APP_VERSION"))

    // Your routes
    router.HandleFunc("/api/sets", getSetsHandler).Methods("GET")
    router.HandleFunc("/api/sets", createSetHandler).Methods("POST")
    router.HandleFunc("/api/sets/{id}", getSetHandler).Methods("GET")

    http.ListenAndServe(":8080", router)
}

// Example handler with custom tracing
func getSetsHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Add custom fields to this trace
    beeline.AddField(ctx, "user_id", getUserID(r))
    beeline.AddField(ctx, "query_params", r.URL.Query())

    // Database query with span
    span := beeline.StartSpan(ctx, "database_query")
    sets, err := db.GetSets(ctx)
    span.AddField("result_count", len(sets))
    span.Send()

    if err != nil {
        beeline.AddField(ctx, "error", err.Error())
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(sets)
}
```

#### Step 4: Add Honeycomb to React Frontend

**Install Honeycomb SDK:**

```bash
cd frontend
npm install --save honeycomb-beeline
```

**Instrument frontend:**

```javascript
// src/index.js
import Honeycomb from 'honeycomb-beeline';

// Initialize Honeycomb
Honeycomb.configure({
  writeKey: process.env.REACT_APP_HONEYCOMB_API_KEY,
  dataset: 'lego-frontend',
  serviceName: 'lego-frontend',
});

// Add global fields
Honeycomb.addContext({
  environment: process.env.REACT_APP_ENVIRONMENT,
  version: process.env.REACT_APP_VERSION,
});

// Example: Trace page views
window.addEventListener('load', () => {
  const trace = Honeycomb.startTrace({
    name: 'page_load',
    'page.url': window.location.href,
    'page.referrer': document.referrer,
  });
  trace.send();
});

// Example: Trace API calls
async function fetchSets() {
  const trace = Honeycomb.startTrace({
    name: 'fetch_sets',
    'http.method': 'GET',
    'http.url': '/api/sets',
  });

  try {
    const response = await fetch('/api/sets');
    trace.addContext({
      'http.status': response.status,
      'response.ok': response.ok,
    });

    const data = await response.json();
    trace.addContext({
      'result.count': data.length,
    });

    return data;
  } catch (error) {
    trace.addContext({
      error: error.message,
    });
    throw error;
  } finally {
    trace.send();
  }
}
```

#### Step 5: Configure in Terraform

```hcl
# terraform/modules/cloud-run/main.tf

resource "google_cloud_run_v2_service" "backend" {
  name = "lego-backend-${var.environment}"

  template {
    containers {
      image = var.container_image

      # Honeycomb configuration
      env {
        name  = "HONEYCOMB_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.honeycomb_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "APP_VERSION"
        value = var.app_version
      }

      # Honeycomb dataset name
      env {
        name  = "HONEYCOMB_DATASET"
        value = "lego-backend"
      }
    }
  }
}

# Store Honeycomb API key in Secret Manager
resource "google_secret_manager_secret" "honeycomb_api_key" {
  secret_id = "honeycomb-api-key-${var.environment}"

  replication {
    auto {}
  }
}
```

### What You'll See in Honeycomb

#### 1. Distributed Traces

**Example: User viewing a Lego set**

```
Request: GET /api/sets/123
Total Duration: 67ms

Trace Breakdown:
├─ http_request (67ms)
│  ├─ database_query: get_set (42ms)
│  │  └─ query: "SELECT * FROM lego_sets WHERE id = ?"
│  ├─ database_query: get_set_images (18ms)
│  │  └─ query: "SELECT * FROM images WHERE set_id = ?"
│  ├─ storage_check: verify_image_exists (5ms)
│  └─ json_encode (2ms)

Custom Fields:
- user_id: 42
- set_id: 123
- set_number: "10276"
- environment: "prod"
- version: "v1.5.0"
- result_count: 1
```

#### 2. Query Examples

**Honeycomb lets you ask questions naturally:**

```
Query 1: "Show me all requests that took > 1 second"
→ Filter: duration_ms > 1000
→ Results: 12 slow requests found
→ BubbleUp shows: All slow requests hit /api/dashboard

Query 2: "What's different about requests with errors?"
→ Filter: status_code >= 500
→ BubbleUp automatically highlights:
   - All errors from user_id: 789
   - All errors querying sets from series: "Star Wars"
   - Database connection pool exhausted

Query 3: "Compare performance before/after deployment"
→ Filter: version IN ["v1.4.0", "v1.5.0"]
→ GROUP BY: version
→ Results:
   v1.4.0: p50=45ms, p95=120ms, errors=0.2%
   v1.5.0: p50=38ms, p95=95ms,  errors=0.1%
   ✅ Deployment improved performance!

Query 4: "Why is the dashboard slow?"
→ Filter: route="/api/dashboard"
→ VISUALIZE: duration_ms
→ GROUP BY: database_query_count
→ BubbleUp shows: Requests with 50+ queries are slow
→ Root cause: N+1 query problem!
```

#### 3. Real-Time Monitoring During Deployment

**Production deployment in progress:**

```
Honeycomb Live Query (auto-refreshing):

Traffic Distribution:
Blue (v1.4.0):  50%  →  p50: 45ms  errors: 0.2%
Green (v1.5.0): 50%  →  p50: 38ms  errors: 0.1%

✅ Green version performing better
✅ Error rate stable
✅ Safe to continue rollout

AUTO-ROLLBACK CONDITIONS:
❌ Error rate > 2%        → Current: 0.1% ✅
❌ p95 increase > 50%     → Current: -21% ✅
❌ New error types        → Current: 0 ✅
```

#### 4. BubbleUp: Automatic Anomaly Detection

**Honeycomb automatically highlights what's different:**

```
Question: "Why are some requests slow?"

BubbleUp Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fast Requests (95%):     Avg 45ms
Slow Requests (5%):      Avg 850ms

BubbleUp found these differences:
┌─────────────────────────────────────────┐
│ 🔍 user_id                              │
│   Fast: evenly distributed              │
│   Slow: 89% from user_id=789           │
│   → User 789 has 10,000+ sets!         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🔍 database_query_count                 │
│   Fast: 2-3 queries                     │
│   Slow: 50+ queries                     │
│   → N+1 query problem for large sets!  │
└─────────────────────────────────────────┘

Action: Add pagination for users with >100 sets
```

#### 5. Service Level Objectives (SLOs)

**Configure SLOs in Honeycomb:**

```yaml
SLO: API Availability
  Target: 99.9% of requests succeed
  Current: 99.95% ✅
  Error Budget: 82% remaining

SLO: API Latency
  Target: 95% of requests < 200ms
  Current: 97.2% ✅

SLO: Dashboard Load Time
  Target: 99% of requests < 500ms
  Current: 98.1% ⚠️  (trending down)
  Alert: Performance degrading
```

### Honeycomb Pricing

| Tier | Events/Month | Retention | Cost | Best For |
|------|--------------|-----------|------|----------|
| **Free** | 20 GB (~20M events) | 60 days | $0 | Solo dev, <1000 users |
| **Pro** | 100 GB | 90 days | $100 | Small teams |
| **Enterprise** | Custom | Custom | Custom | Large teams |

**For your use case (100 users):**
- Expected usage: ~5-10 GB/month
- **Cost: $0** (well within free tier)

**When to upgrade:**
- You exceed 20 GB/month (~5000 active users)
- Need longer retention (>60 days)
- Need team collaboration features

---

## Regular Operations

### Standard Development Workflow

```bash
# Step 1: Check current deployment status
gh pr list
gh workflow run list

# Step 2: Create feature branch
git checkout -b feature/new-thing
# ... code changes ...
git push

# Step 3: Create and review PR
gh pr create
# Automated tests run automatically
# Self-review code changes
gh pr merge 123

# Step 4: Verify dev deployment
# Automatically deploys to dev after merge
# Test at https://dev.lego-catalog.app

# Step 5: Check Honeycomb for any issues
open "https://ui.honeycomb.io/lego-catalog/datasets/lego-backend"

# Step 6: When ready, deploy to production
gh release create v1.5.0
gh workflow run deploy-prod.yml --ref v1.5.0

# Step 7: Monitor deployment in Honeycomb
# - Watch blue/green traffic split
# - Compare error rates
# - Verify performance
```

### Release Workflow

```bash
# Step 1: Review changes since last release
git log prod..main --oneline

# Step 2: Create release
gh release create v1.6.0 \
  --title "Release v1.6.0" \
  --notes-file CHANGELOG.md

# Step 3: Deploy to production
gh workflow run deploy-prod.yml --ref v1.6.0

# Step 4: Monitor in Honeycomb until stable
```

### Monitoring Checklist

**Regular Health Checks:**
- Check Honeycomb home dashboard
- Review any error spikes or anomalies
- Verify both environments are healthy

**Periodic Reviews:**
- Review performance trends in Honeycomb
- Check GCP billing dashboard
- Review and close old deployments

**Maintenance Tasks:**
- Review SLO compliance
- Update dependencies (Go modules, npm packages)
- Review and optimize costs
- Archive old data

---

## Deployment Checklist

### Pre-Deployment (Development)

```
✅ Code Changes
  □ Feature branch created from main
  □ Code changes complete
  □ Local testing successful
  □ Unit tests passing
  □ No console errors

✅ Pull Request
  □ PR created with description
  □ Automated tests passing
  □ Self-reviewed code
  □ Merged to main

✅ Dev Deployment (Automatic)
  □ GitHub Actions deployed successfully
  □ https://dev.lego-catalog.app loads
  □ Feature works as expected
  □ No errors in Honeycomb
  □ Performance acceptable
```

### Pre-Deployment (Production)

```
✅ Development Validation
  □ Feature tested thoroughly in dev
  □ No errors in Honeycomb (dev)
  □ Performance metrics good
  □ Database migrations tested
  □ Mobile responsive verified

✅ Release Preparation
  □ Release notes written
  □ Version number decided
  □ Git tag created
  □ CHANGELOG.md updated

✅ Production Readiness
  □ Production database backed up
  □ Current error rate < 1%
  □ No ongoing incidents
  □ Ready to monitor deployment
```

### During Deployment (Production)

```
✅ Deployment Started
  □ Workflow triggered from tag
  □ Manual approval given
  □ Pre-flight checks passing

✅ Blue/Green Rollout
  □ Green deployed with 0% traffic
  □ Smoke tests passing

  □ 10% traffic shifted to green
  □ Monitor in Honeycomb until stable
  □ Error rate stable

  □ 25% traffic shifted to green
  □ Monitor until stable
  □ Performance comparable

  □ 50% traffic shifted to green
  □ Monitor until stable
  □ No anomalies detected

  □ 100% traffic shifted to green
  □ Deployment complete

✅ Post-Deployment
  □ Smoke tests passing on prod
  □ All features working
  □ Monitor until stable
  □ No rollback needed
```

### Post-Deployment

```
✅ Verification
  □ https://lego-catalog.app loads
  □ New feature visible
  □ No errors in Honeycomb
  □ Performance within SLOs
  □ User sessions look normal

✅ Monitoring
  □ Set up Honeycomb query for new feature
  □ Continue monitoring
  □ Watch for delayed issues

✅ Cleanup
  □ Old blue deployment removed (after safety period)
  □ Deployment event logged
  □ Team notified (if applicable)
  □ Update status page
```

---

## Rollback Procedures

### Automatic Rollback (Built Into Workflow)

The deployment workflow automatically rolls back if:

```yaml
Automatic Rollback Triggers:
  - Error rate > 2% threshold
  - p95 latency increases > 50%
  - Smoke tests fail
  - Health check fails
  - New error types appear
```

**What happens during auto-rollback:**
1. Traffic immediately reverts to blue (old version)
2. Green deployment marked as failed
3. Deployment event sent to Honeycomb
4. Alert sent to Slack
5. GitHub workflow fails with reason

### Manual Rollback

**If you need to manually rollback after deployment:**

```bash
# Option 1: Re-run workflow with previous version
gh workflow run deploy-prod.yml --ref v1.4.0

# Option 2: Use Cloud Run console
# 1. Go to Cloud Run in GCP Console
# 2. Select service: lego-backend-prod
# 3. Click "Manage Traffic"
# 4. Shift 100% traffic back to previous revision
# 5. Click "Save"

# Option 3: Use gcloud CLI
gcloud run services update-traffic lego-backend-prod \
  --to-revisions=lego-backend-prod-00042=100 \
  --region=us-central1 \
  --project=lego-catalog-prod-425916
```

**After rollback:**
1. Investigate issue in Honeycomb
2. Identify root cause
3. Fix in new branch
4. Test thoroughly in dev
5. Create new release
6. Deploy again

---

## Cost Breakdown

### Monthly Costs (2 Environments)

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
Honeycomb (Free Tier)            $0    (up to 20 GB/month)
GitHub Actions                   $0    (2,000 minutes/month free)
Terraform State Storage          $1    (Cloud Storage bucket)
──────────────────────────────────────
```

### **Total Monthly Cost: ~$57-60/month**

### Cost Savings vs 3-Environment Setup

```
3 Environments (Dev/Test/Prod):  $80/month
2 Environments (Dev/Prod):       $57/month
──────────────────────────────────────
Monthly Savings:                 $23
Annual Savings:                  $276
```

### Cost Scaling

| Active Users | Production Cost | Total (Both Envs) |
|--------------|----------------|-------------------|
| 10 | $25 | $47 |
| 50 | $30 | $52 |
| **100** | **$35** | **$57** |
| 500 | $60 | $82 |
| 1,000 | $90 | $112 |
| 5,000 | $250 | $272 |

### Cost Optimization Tips

1. **Scale to Zero in Dev**
   - Set min instances to 0
   - Only runs when you're testing
   - Saves ~$5-10/month

2. **Use Committed Use Discounts**
   - 1-year commitment: 25% off Cloud SQL
   - 3-year commitment: 52% off
   - Saves ~$30-60/month in production

3. **Optimize Cloud Storage**
   - Use lifecycle policies
   - Move old images to Nearline storage
   - Saves ~$1-2/month

4. **Right-Size Cloud SQL**
   - Start with db-f1-micro ($10/month)
   - Upgrade only when needed
   - db-n1-standard-1 is $50/month (for 1000+ users)

---

## Troubleshooting Guide

### Common Issues

#### Issue 1: Deployment Failed

**Symptoms:**
- GitHub Actions workflow shows red X
- Deployment didn't complete

**Diagnosis:**
```bash
# Check workflow logs
gh run view <run-id>

# Common causes:
# - Docker build failed
# - Tests failed
# - GCP authentication issue
# - Cloud Run deployment timeout
```

**Solutions:**
```bash
# If Docker build failed:
# - Check Dockerfile syntax
# - Verify all dependencies in go.mod/package.json
# - Test build locally: docker build -t test .

# If tests failed:
# - Review test output
# - Run tests locally: go test ./... && npm test
# - Fix failing tests

# If GCP auth failed:
# - Verify service account key in GitHub secrets
# - Check GCP project permissions
# - Regenerate service account key if needed

# If deployment timeout:
# - Check Cloud Run logs in GCP console
# - Verify health check endpoint
# - Increase deployment timeout in workflow
```

#### Issue 2: High Error Rate in Honeycomb

**Symptoms:**
- Honeycomb shows error spike
- Users reporting issues

**Diagnosis:**
```bash
# In Honeycomb:
# 1. Filter: status_code >= 500
# 2. GROUP BY: error_message
# 3. Use BubbleUp to find patterns

# Common causes:
# - Database connection issues
# - External API timeout
# - Out of memory
# - Bad deployment
```

**Solutions:**
```bash
# If database connection issues:
# - Check Cloud SQL connections in GCP console
# - Verify connection pool settings
# - Check for long-running queries

# If OOM (Out of Memory):
# - Check Cloud Run memory metrics
# - Increase memory limit in terraform
# - Look for memory leaks

# If bad deployment:
# - Rollback immediately
# - Investigate in dev environment
# - Fix and redeploy
```

#### Issue 3: Slow Performance

**Symptoms:**
- Honeycomb shows high latency
- Users complain of slowness

**Diagnosis:**
```bash
# In Honeycomb:
# 1. Filter: duration_ms > 1000
# 2. Examine trace waterfall
# 3. Use BubbleUp: "What's different about slow requests?"

# Common causes:
# - N+1 query problem
# - Missing database index
# - Large payload
# - External API slowness
```

**Solutions:**
```bash
# If N+1 queries:
# - Add eager loading in ORM
# - Batch queries
# - Use JOINs instead of multiple queries

# If missing index:
# - Check slow query log in Cloud SQL
# - Add index migration
# - Test in dev first

# If large payload:
# - Add pagination
# - Reduce fields returned
# - Compress responses
```

---

## Summary: What You Get

### Infrastructure Benefits

✅ **Two isolated environments** for safe development
✅ **Infrastructure as Code** - reproducible, version-controlled
✅ **Automated CI/CD** - push code, get deployed
✅ **Zero-downtime deployments** with blue/green strategy
✅ **Full observability** with Honeycomb
✅ **Scalable** from 10 to 10,000+ users
✅ **Cost-effective** at $57/month (saves $276/year vs 3-env)
✅ **Industry-standard tools** - transferable skills

### Developer Experience

✅ **Fast feedback loop**: Code → Dev automatically
✅ **Confidence**: Automated testing catches bugs
✅ **Visibility**: See exactly what's deployed where via Honeycomb
✅ **Safety**: Manual approvals + gradual rollout for prod
✅ **Observability**: Know when things break (and why) with BubbleUp
✅ **Simplicity**: Right-sized for solo developer

### Your Simplified Workflow (Start to Finish)

```
Step 1: Create feature branch
Step 2: Open PR, automated tests run
Step 3: Merge to main
Step 4: Automatically deployed to dev
Step 5: Test thoroughly in dev
Step 6: Deploy to production when ready
Step 7: Monitor in Honeycomb until stable ✅
```

**Streamlined process from idea to production**
**Gradual rollout with automated safety checks**
**Minimal manual intervention required**

### Safety Without a Test Environment

Your 2-environment setup maintains high safety through:

✅ **Gradual Rollout**: 10% → 25% → 50% → 100% with monitoring
✅ **Automatic Rollback**: On error rate spikes or performance degradation
✅ **Blue/Green Deployment**: Old version stays running during rollout
✅ **Real-Time Monitoring**: Honeycomb shows issues immediately
✅ **Smoke Tests**: Required before any production traffic
✅ **Manual Approval**: You control when production deploys
✅ **Dev Environment**: Test thoroughly before promoting

### When to Consider Adding Test Environment

Add a third environment when:
- ✅ You hire additional team members
- ✅ You reach 1,000+ active users
- ✅ Downtime costs exceed $23/month
- ✅ You need complex production-scale testing

---

## Implementation Phases

### Phase 1: Local Setup

```bash
# You've already done this! ✅
# - Lego Catalog app running locally
# - Docker Compose setup
# - Git repository on GitHub
```

### Phase 2: GCP Project Setup

**Sub-steps:**
1. Create GCP projects
   ```bash
   gcloud projects create lego-catalog-dev-425916
   gcloud projects create lego-catalog-prod-425916
   ```
2. Enable billing for both projects
3. Enable required APIs
4. Create service accounts for GitHub Actions
5. Store credentials in GitHub Secrets

### Phase 3: Infrastructure as Code

**Sub-steps:**
1. Create lego-catalog-infrastructure repository
2. Write Terraform modules for:
   - Cloud Run services
   - Cloud SQL databases
   - Cloud Storage buckets
   - Networking and secrets
3. Deploy dev environment
4. Deploy prod environment
5. Test and verify deployments

### Phase 4: CI/CD Pipelines

**Sub-steps:**
1. Create GitHub Actions workflow files
2. Implement and test build.yml (PR testing)
3. Implement and test deploy-dev.yml (auto-deploy)
4. Implement and test deploy-prod.yml (manual deploy)
5. Verify complete end-to-end deployment flow

### Phase 5: Observability Integration

**Sub-steps:**
1. Sign up for Honeycomb account
2. Install and configure Beeline in Go backend
3. Add Honeycomb instrumentation to React frontend
4. Configure custom dashboards
5. Set up alerts and SLOs

### Phase 6: Production Launch

**Sub-steps:**
1. Perform final comprehensive testing in dev
2. Execute database migration dry-run
3. Deploy to production environment
4. Monitor deployment in Honeycomb
5. Verify all systems operational
6. Document any lessons learned

---

This is a **professional-grade deployment pipeline** optimized for solo developers that:
- Scales with your needs
- Keeps costs low ($57/month)
- Maintains high safety
- Provides excellent observability
- Teaches industry-standard practices

You're building real-world skills that apply to companies of any size! 🚀
