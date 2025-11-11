# Network Architecture Guide

**[← Back to Main Deployment Guide](../../CLOUD_DEPLOYMENT_GUIDE.md)**

This guide explains the network architecture you're building for the Lego Catalog application, how it works, and future considerations.

---

## Table of Contents

1. [Your Current Network Architecture](#your-current-network-architecture)
2. [Understanding Each Component](#understanding-each-component)
3. [How Traffic Flows](#how-traffic-flows)
4. [Security Model](#security-model)
5. [Future Network Enhancements](#future-network-enhancements)

---

## Your Current Network Architecture

### What You're Building (From Your Terraform Modules)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloud Run (Frontend)                           │
│  • Public endpoint: https://lego-frontend-dev-xyz.run.app       │
│  • Serves React app                                              │
│  • No VPC connector (stateless, no database)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS API calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloud Run (Backend)                            │
│  • Public endpoint: https://lego-backend-dev-xyz.run.app        │
│  • Runs Go API server                                            │
│  • ✅ VPC Serverless Connector attached                         │
│  • Egress: PRIVATE_RANGES_ONLY (Cloud SQL via private IP)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Private IP
                              │ (via VPC Connector)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               VPC Serverless Connector                           │
│  • IP Range: 10.8.0.0/28                                         │
│  • Machine Type: e2-micro                                        │
│  • Instances: 2-3 (auto-scales)                                  │
│  • Connects Cloud Run to VPC network                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Routes to VPC
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VPC Network (default)                       │
│  • Network: default (auto-mode VPC)                              │
│  • Region: us-central1                                           │
│  • Subnets: Auto-created per region                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Private Service Connection
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloud SQL (MySQL)                              │
│  • ❌ No public IP address                                      │
│  • ✅ Private IP only: 10.x.x.x                                 │
│  • Only accessible from VPC network                              │
│  • Instance: lego-catalog-dev-xyz                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   Cloud Storage                                  │
│  • Bucket: lego-catalog-images-dev                               │
│  • Access: Service account only (not public)                     │
│  • Accessed via: Google Cloud Storage API                        │
└─────────────────────────────────────────────────────────────────┘
```

### Network Components Summary

| Component | What You Have | Purpose |
|-----------|---------------|---------|
| **VPC Network** | `default` network | Isolated network for your resources |
| **VPC Serverless Connector** | ✅ Enabled (10.8.0.0/28) | Connects Cloud Run to VPC/Cloud SQL |
| **Cloud SQL Private IP** | ✅ Enabled | Database not exposed to internet |
| **Cloud SQL Public IP** | ❌ Disabled | Security: no public database access |
| **Cloud Run Public Access** | ✅ Enabled | Users need to access your app |
| **Firewall Rules** | Default GCP rules | Allows necessary traffic |
| **Cloud NAT** | ❌ Not configured | Not needed (Cloud Run handles outbound) |
| **Custom VPC** | ❌ Not configured | Using GCP default VPC |
| **Load Balancer** | ❌ Not configured | Cloud Run provides built-in |

---

## Understanding Each Component

### 1. VPC Network (Virtual Private Cloud)

**What it is:** An isolated network in GCP where your resources can communicate privately.

**What you're using:**
```hcl
# From your Terraform modules
vpc_network = "default"
```

**The "default" VPC:**
- ✅ **Auto-created** by GCP in every project
- ✅ **Auto-mode**: Automatically creates subnets in every region
- ✅ **Subnet per region**: Each region gets a subnet (e.g., 10.128.0.0/20 in us-central1)
- ✅ **Good for getting started**: No manual subnet management

**What this means for you:**
- Cloud SQL gets a private IP in the VPC (e.g., 10.128.0.5)
- Your VPC connector can route traffic to this private IP
- Resources in the VPC can talk to each other privately

**Diagram:**
```
default VPC Network
├── us-central1 subnet: 10.128.0.0/20
│   ├── Cloud SQL instance: 10.128.0.5
│   └── VPC Connector: 10.8.0.0/28
├── us-east1 subnet: 10.142.0.0/20 (unused)
└── us-west1 subnet: 10.138.0.0/20 (unused)
```

---

### 2. VPC Serverless Connector

**What it is:** A bridge that connects Cloud Run (serverless, no VPC) to your VPC network.

**From your Terraform module:**
```hcl
resource "google_vpc_access_connector" "connector" {
  name          = "lego-backend-vpc-connector-dev"
  region        = "us-central1"
  network       = "default"
  ip_cidr_range = "10.8.0.0/28"        # 16 IP addresses

  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = 3
}
```

**Why you need it:**
- Cloud Run runs **outside** your VPC by default
- Cloud SQL is **inside** your VPC with private IP only
- VPC Connector = tunnel from Cloud Run → VPC → Cloud SQL

**How it works:**
```
Cloud Run Container
    ↓
Tries to connect to: 10.128.0.5:3306 (Cloud SQL private IP)
    ↓
Traffic goes to VPC Connector (10.8.0.0/28)
    ↓
VPC Connector routes through VPC network
    ↓
Reaches Cloud SQL at 10.128.0.5
```

**Resource usage:**
- **IP Range**: 10.8.0.0/28 = 16 IPs (14 usable, 2 reserved by GCP)
- **Instances**: 2-3 e2-micro VMs running 24/7
- **Cost**: ~$12-18/month per connector

**Egress setting (from your Terraform):**
```hcl
vpc_access {
  connector = var.vpc_connector_id
  egress    = "PRIVATE_RANGES_ONLY"  # ← Important!
}
```

**What `PRIVATE_RANGES_ONLY` means:**
- ✅ Traffic to private IPs (Cloud SQL): Goes through VPC connector
- ✅ Traffic to internet (Honeycomb API): Goes direct from Cloud Run
- This is optimal: VPC connector only for database, not for all traffic

**Alternative:**
- `ALL_TRAFFIC`: All outbound goes through connector (slower, more expensive)

---

### 3. Cloud SQL Private IP

**What it is:** Cloud SQL instance with NO public IP address, only accessible from VPC.

**From your Terraform module:**
```hcl
# IP configuration
ip_configuration {
  ipv4_enabled    = false        # ❌ No public IP
  private_network = var.private_network  # ✅ Private IP only
}
```

**What this means:**

**Without private IP (public only):**
```
Internet
  ↓
Cloud SQL public IP: 35.x.x.x
  ↓
Anyone can attempt connection (must have password)
  ↓
Risky: exposed to internet scanning/attacks
```

**With private IP (what you have):**
```
VPC Network
  ↓
Cloud SQL private IP: 10.128.0.5
  ↓
Only accessible from within VPC
  ↓
Secure: not exposed to internet at all
```

**Security benefits:**
- ✅ **No internet exposure**: Cannot be reached from outside GCP
- ✅ **No firewall rules needed**: VPC isolation provides security
- ✅ **Defense in depth**: Even if password leaks, attacker can't reach database

**Connection from Cloud Run:**
```go
// Your backend connects via private IP
db, err := sql.Open("mysql",
  "user:password@tcp(10.128.0.5:3306)/lego_catalog")
```

**Under the hood:**
- GCP creates a **Private Service Connection** between your VPC and Cloud SQL's internal VPC
- This is a VPC peering connection managed by GCP
- Your VPC gets routes to reach Cloud SQL's private IP range

---

### 4. Cloud Run Public Access

**What it is:** Your Cloud Run services are accessible from the internet.

**From your Terraform module:**
```hcl
variable "allow_unauthenticated" {
  default = true  # ✅ Public access
}

resource "google_cloud_run_v2_service_iam_member" "public_access" {
  role   = "roles/run.invoker"
  member = "allUsers"  # Anyone can invoke
}
```

**Why public?**
- **Frontend**: Users' browsers need to load the React app
- **Backend**: Frontend needs to call your API

**Security considerations:**

**Good (what you should do):**
- ✅ Use HTTPS (Cloud Run provides this automatically)
- ✅ Implement authentication in your application (JWT, sessions, etc.)
- ✅ Rate limiting to prevent abuse
- ✅ Input validation to prevent injection attacks

**What public access does NOT mean:**
- ❌ People can't access your database (it's private)
- ❌ People can't access your Cloud Storage (service account only)
- ❌ People can't see your code (only make API requests)

**Future enhancement:**
- Add **Cloud Armor** (WAF) for DDoS protection
- Add **Identity-Aware Proxy** for additional authentication layer

---

### 5. Cloud Storage Access

**What it is:** Your images bucket with service account-only access.

**From your Terraform module:**
```hcl
# Uniform bucket-level access
uniform_bucket_level_access {
  enabled = true
}

# No public access (variable defaults to false)
variable "public_access" {
  default = false
}
```

**Access model:**
```
Cloud Run Backend
  ↓ (uses Service Account)
Google Cloud Storage API
  ↓ (authenticated request)
lego-catalog-images-dev bucket
  ↓
Only Cloud Run's service account can read/write
```

**IAM binding (from your Cloud Run module):**
```hcl
resource "google_storage_bucket_iam_member" "app_storage_access" {
  bucket = var.storage_bucket_name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.app.email}"
}
```

**What this means:**
- ✅ **Backend can upload images**: When user uploads, backend writes to bucket
- ✅ **Backend can serve images**: Backend generates signed URLs for frontend
- ❌ **Users can't directly access bucket**: Not publicly readable

**Serving images to users:**
```go
// Backend generates signed URL (temporary, time-limited)
url, err := storage.SignedURL(bucketName, objectName, &storage.SignedURLOptions{
    GoogleAccessID: serviceAccount,
    PrivateKey:     privateKey,
    Method:         "GET",
    Expires:        time.Now().Add(15 * time.Minute),
})

// Returns: https://storage.googleapis.com/.../image.jpg?X-Goog-Signature=...
// User's browser can access this URL for 15 minutes
```

---

## How Traffic Flows

### Scenario 1: User Loads the App

```
1. User types: https://dev.lego-catalog.app
   ↓
2. DNS resolves to Cloud Run frontend URL
   ↓
3. Cloud Run serves React app (HTML, JS, CSS)
   ↓
4. User's browser downloads and runs React app
   ✅ Complete
```

**Network path:**
```
User's Browser (anywhere on internet)
  ↓ HTTPS (TLS 1.3)
Cloud Run Frontend (public endpoint)
  ↓ Returns: index.html + static assets
User's Browser renders app
```

---

### Scenario 2: User Views Lego Sets

```
1. React app makes API call: GET /api/sets
   ↓
2. Request goes to Cloud Run backend
   ↓
3. Backend needs to query database
   ↓
4. Traffic goes through VPC Connector
   ↓
5. VPC routes to Cloud SQL private IP
   ↓
6. Cloud SQL returns data
   ↓
7. Backend processes and returns JSON
   ↓
8. React app displays sets
```

**Network path:**
```
User's Browser
  ↓ HTTPS
Cloud Run Backend (public endpoint)
  ↓ (inside container, connects to database)
VPC Serverless Connector (10.8.0.0/28)
  ↓ Routes through VPC network
Cloud SQL Private IP (10.128.0.5:3306)
  ↓ MySQL query
Database returns results
  ↓ (reverse path)
User's Browser receives JSON
```

---

### Scenario 3: User Uploads Lego Set Image

```
1. User selects image in browser
   ↓
2. React app: POST /api/sets with image data
   ↓
3. Cloud Run backend receives request
   ↓
4. Backend uploads to Cloud Storage
   ↓
5. Backend saves metadata to Cloud SQL
   ↓
6. Backend returns success
   ↓
7. React app shows uploaded image
```

**Network path:**
```
User's Browser
  ↓ HTTPS (multipart/form-data with image)
Cloud Run Backend
  ├─→ Cloud Storage API (stores image)
  │     ↓ Authenticated with service account
  │   Cloud Storage Bucket
  │
  └─→ VPC Connector → Cloud SQL (saves metadata)
        ↓
      Returns: image URL
        ↓
User's Browser (displays image via signed URL)
```

---

### Scenario 4: Backend Sends Traces to Honeycomb

```
1. Backend processes request
   ↓
2. Honeycomb SDK collects trace data
   ↓
3. Backend sends to: api.honeycomb.io
   ↓
4. Traffic goes DIRECT (not through VPC connector)
   ↓ (because PRIVATE_RANGES_ONLY egress setting)
5. Reaches Honeycomb API
```

**Network path:**
```
Cloud Run Backend
  ↓ HTTPS to api.honeycomb.io (public internet)
Direct egress from Cloud Run
  ↓ (NOT through VPC connector)
Honeycomb API
```

**Why direct?**
- Honeycomb is on the internet (not in your VPC)
- `egress: PRIVATE_RANGES_ONLY` means only VPC traffic goes through connector
- Internet traffic goes direct from Cloud Run (faster, cheaper)

---

## Security Model

### Defense in Depth Layers

**Layer 1: Network Isolation**
- ✅ Cloud SQL on private IP (not internet-accessible)
- ✅ VPC isolation (only authorized services can reach database)

**Layer 2: Authentication & Authorization**
- ✅ Service accounts for Cloud Run → Cloud SQL communication
- ✅ IAM roles for Cloud Run → Cloud Storage access
- ⚠️ Application-level auth for users (you need to implement)

**Layer 3: Encryption**
- ✅ HTTPS for all external traffic (Cloud Run provides)
- ✅ TLS for Cloud SQL connections (automatic)
- ✅ Encryption at rest for Cloud Storage (GCP default)
- ✅ Encryption at rest for Cloud SQL (GCP default)

**Layer 4: Access Control**
- ✅ VPC restricts who can reach Cloud SQL
- ✅ IAM restricts which service accounts can access what
- ✅ No public Cloud SQL IP address

### What's Secure (Current Setup)

✅ **Database is private**: Cannot be reached from internet
✅ **Cloud Storage is private**: Only backend can access
✅ **Secrets in Secret Manager**: Not in code or environment variables
✅ **HTTPS everywhere**: All traffic encrypted in transit
✅ **Service account isolation**: Each service has minimal permissions

### What Needs Application-Level Security (Your Responsibility)

⚠️ **User authentication**: Implement login system (JWT, sessions, OAuth)
⚠️ **API authorization**: Verify users can only access their own data
⚠️ **Input validation**: Prevent SQL injection, XSS attacks
⚠️ **Rate limiting**: Prevent abuse of public endpoints

---

## Future Network Enhancements

### Short-Term (Worth Considering)

#### 1. Custom VPC (Instead of Default)

**Why:**
- More control over IP ranges
- Better organization for multiple projects
- Can peer with other VPCs

**Current:**
```hcl
vpc_network = "default"  # Auto-mode, managed by GCP
```

**Future:**
```hcl
# Create custom VPC
resource "google_compute_network" "custom" {
  name                    = "lego-catalog-vpc"
  auto_create_subnetworks = false  # Manual subnet control
}

resource "google_compute_subnetwork" "app" {
  name          = "app-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = "us-central1"
  network       = google_compute_network.custom.id
}
```

**When to do this:**
- You need IP range control
- Multiple projects need to communicate
- Regulatory requirements for network isolation

---

#### 2. Cloud Armor (Web Application Firewall)

**What it is:** DDoS protection and WAF for Cloud Run.

**Benefits:**
- ✅ Block malicious IPs
- ✅ Rate limiting per IP
- ✅ Geo-blocking (block countries)
- ✅ OWASP Top 10 protections

**Implementation:**
```hcl
resource "google_compute_security_policy" "policy" {
  name = "lego-catalog-waf"

  # Block IP addresses
  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["203.0.113.0/24"]  # Blocked IPs
      }
    }
  }

  # Rate limiting
  rule {
    action   = "throttle"
    priority = "2000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
    }
  }
}
```

**Cost:** ~$1/month + $0.75 per million requests

**When to do this:**
- Experiencing DDoS attacks
- Need geo-blocking
- Have 1000+ users

---

#### 3. Private Google Access

**What it is:** Allows VPC resources to reach Google APIs without public IPs.

**Why:**
- Cloud Run can access Cloud Storage API via private Google network
- No internet egress for Google API calls
- Slightly faster, more secure

**Current:**
```
Cloud Run → Internet → storage.googleapis.com
```

**With Private Google Access:**
```
Cloud Run → VPC → Private Google Access → storage.googleapis.com
```

**Implementation:**
```hcl
resource "google_compute_subnetwork" "app" {
  # ... other config ...

  private_ip_google_access = true  # Enable
}
```

**When to do this:**
- Heavy Cloud Storage usage
- Want all traffic to stay on Google network
- Have custom VPC (doesn't apply to default VPC easily)

---

### Medium-Term (For Scaling)

#### 4. Cloud Load Balancer (Global)

**What it is:** Global HTTP(S) load balancer in front of Cloud Run.

**Benefits:**
- ✅ Custom domain (lego-catalog.app instead of .run.app)
- ✅ SSL certificate management
- ✅ Cloud CDN for static assets
- ✅ Multi-region deployment support

**Current:**
```
User → Cloud Run URL (.run.app)
```

**With Load Balancer:**
```
User → Load Balancer (lego-catalog.app)
      ↓
    Cloud Run (backend)
```

**Cost:** ~$18/month minimum + data transfer

**When to do this:**
- Want custom domain with SSL
- Need CDN for faster image loading
- Scaling to multiple regions

---

#### 5. Cloud CDN

**What it is:** Content delivery network for caching static assets.

**Benefits:**
- ✅ Faster image loading (cached at edge)
- ✅ Reduced Cloud Storage egress costs
- ✅ Better performance for global users

**Requires:** Cloud Load Balancer

**When to do this:**
- Users in multiple countries
- Lots of image traffic
- Storage egress costs are high

---

#### 6. Cloud NAT

**What it is:** Network address translation for outbound internet from VPC.

**Why you DON'T need it now:**
- Cloud Run handles outbound internet directly
- VPC Connector is only for Cloud SQL (private)

**When you WOULD need it:**
- Running Compute Engine VMs (not Cloud Run)
- VMs need internet access but no public IPs
- Want consistent outbound IP for allowlisting

---

### Long-Term (Enterprise Scale)

#### 7. Shared VPC

**What it is:** One VPC shared across multiple GCP projects.

**Use case:**
- You have separate projects for dev/staging/prod
- Want centralized network management
- Need projects to communicate via private IPs

**When to do this:**
- Large organization with many projects
- Regulatory requirements for network segmentation

---

#### 8. VPC Peering

**What it is:** Connect two VPC networks to communicate privately.

**Use case:**
- Lego Catalog project + separate Analytics project
- Need to access shared database from both projects

**When to do this:**
- Multiple related applications
- Microservices across projects

---

#### 9. Cloud Interconnect

**What it is:** Dedicated private connection to GCP from on-premises.

**Use case:**
- Hybrid cloud (some services on-premises)
- Need low latency to GCP
- Compliance requires dedicated connection

**When to do this:**
- Enterprise with existing data centers
- Not relevant for cloud-native apps

---

## Quick Reference

### Your Current Network Settings

```yaml
Environment: Development & Production

VPC Network:
  Type: default (auto-mode)
  Region: us-central1
  Subnet: Auto-assigned (10.128.0.0/20)

VPC Connector:
  IP Range: 10.8.0.0/28
  Machine Type: e2-micro
  Instances: 2-3
  Cost: ~$15/month

Cloud Run Frontend:
  Public Access: Yes
  VPC Connector: No
  Egress: Direct to internet

Cloud Run Backend:
  Public Access: Yes
  VPC Connector: Yes
  Egress: PRIVATE_RANGES_ONLY

Cloud SQL:
  Public IP: No
  Private IP: Yes (10.128.x.x)
  Accessible: Only from VPC

Cloud Storage:
  Public Access: No
  Access Method: Service account IAM
```

### Network Troubleshooting

**Problem:** Backend can't connect to Cloud SQL

```bash
# Check VPC connector exists
gcloud compute networks vpc-access connectors list \
  --region=us-central1

# Check Cloud SQL private IP
gcloud sql instances describe lego-catalog-dev-xyz \
  --format="value(ipAddresses.ipAddress)"

# Check Cloud Run has connector attached
gcloud run services describe lego-backend-dev \
  --region=us-central1 \
  --format="value(spec.template.spec.containers.resources.vpcAccess.connector)"
```

**Problem:** Images not loading

```bash
# Check service account has storage access
gcloud storage buckets get-iam-policy gs://lego-catalog-images-dev

# Should show:
# members:
# - serviceAccount:lego-backend-dev@....iam.gserviceaccount.com
# role: roles/storage.objectAdmin
```

---

**[← Back to Main Deployment Guide](../../CLOUD_DEPLOYMENT_GUIDE.md)**
