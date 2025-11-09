# Terraform State Management for Solo Developers

**[← Back to Main Deployment Guide](../../CLOUD_DEPLOYMENT_GUIDE.md)**

This guide covers Terraform state management essentials for solo developers who may need to run Terraform manually alongside CI/CD automation.

---

## Table of Contents

1. [Understanding Terraform State](#understanding-terraform-state)
2. [Manual Terraform Operations](#manual-terraform-operations)
3. [State Locking](#state-locking)
4. [Importing Existing Resources](#importing-existing-resources)
5. [State Recovery](#state-recovery)
6. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## Understanding Terraform State

### What is State?

Terraform state (`terraform.tfstate`) is a JSON file that maps your Terraform configuration to real GCP resources.

**Example state snippet:**
```json
{
  "resources": [
    {
      "type": "google_cloud_run_v2_service",
      "name": "app",
      "instances": [
        {
          "attributes": {
            "name": "lego-backend-dev",
            "uri": "https://lego-backend-dev-xyz.run.app"
          }
        }
      ]
    }
  ]
}
```

### Why Remote State?

**Local state (bad for you):**
```
├── environments/dev/
│   └── terraform.tfstate  ❌ Only on your laptop
```

**Remote state (what you have):**
```
GCS Bucket: lego-catalog-terraform-state-dev
└── terraform/state/default.tfstate  ✅ Accessible from laptop + CI/CD
```

**Benefits:**
- ✅ **Accessible from anywhere** (laptop, CI/CD, disaster recovery)
- ✅ **Automatic backups** (GCS versioning enabled)
- ✅ **State locking** (prevents concurrent modifications)
- ✅ **Encryption at rest** (GCS default encryption)

---

## Manual Terraform Operations

### When to Run Terraform Manually

**Use CI/CD for:**
- ✅ Regular deployments (container image updates)
- ✅ Automated infrastructure changes
- ✅ Production deployments (with approval gates)

**Run manually when:**
- 🔧 Debugging infrastructure issues
- 🔧 Testing infrastructure changes locally first
- 🔧 Emergency fixes (CI/CD is down)
- 🔧 One-off resource creation
- 🔧 Importing existing resources

### Safe Manual Operation Process

#### Step 1: Ensure You're in the Right Environment

```bash
# Always verify which environment you're working on
pwd
# Should show: .../lego-catalog-infrastructure/environments/dev
# or:         .../lego-catalog-infrastructure/environments/prod

# Check which GCP project is active
gcloud config get-value project
# Should match: lego-catalog-dev-425916 or lego-catalog-prod-425916
```

#### Step 2: Initialize Terraform

```bash
cd environments/dev  # or prod

# Initialize (downloads providers, configures backend)
terraform init

# Verify backend configuration
terraform init -backend-config="bucket=lego-catalog-terraform-state-dev"
```

**Expected output:**
```
Initializing the backend...

Successfully configured the backend "gcs"!

Terraform has been successfully initialized!
```

#### Step 3: Plan Before Applying

**ALWAYS run plan first:**
```bash
terraform plan -out=tfplan

# Review the output carefully
# Look for:
# - Resources to be created (+)
# - Resources to be changed (~)
# - Resources to be destroyed (-)
```

**Example plan output:**
```
Terraform will perform the following actions:

  # google_cloud_run_v2_service.app will be updated in-place
  ~ resource "google_cloud_run_v2_service" "app" {
        name = "lego-backend-dev"
      ~ template {
          ~ containers {
              ~ image = "gcr.io/.../backend:v1.0.0" -> "gcr.io/.../backend:v1.1.0"
            }
        }
    }

Plan: 0 to add, 1 to change, 0 to destroy.
```

#### Step 4: Apply Changes

```bash
# Apply the saved plan
terraform apply tfplan

# Or apply with auto-approve (use cautiously)
terraform apply -auto-approve
```

#### Step 5: Verify Changes

```bash
# List all resources in state
terraform state list

# Show specific resource details
terraform show
```

### Common Manual Commands

```bash
# See what would change (dry run)
terraform plan

# See current state
terraform show

# List all resources
terraform state list

# Get specific output values
terraform output
terraform output backend_url

# Refresh state (sync with actual GCP resources)
terraform refresh

# Format .tf files
terraform fmt -recursive

# Validate configuration
terraform validate

# Show dependency graph
terraform graph | dot -Tpng > graph.png
```

---

## State Locking

### How State Locking Works

When you run `terraform apply`, Terraform:

1. **Acquires a lock** on the state file in GCS
2. **Reads current state**
3. **Makes changes**
4. **Writes new state**
5. **Releases the lock**

**GCS automatically handles locking** - you don't need to configure anything.

### Lock Acquisition Scenario

**Scenario:** You start `terraform apply` on your laptop, then CI/CD also tries to deploy.

**What happens:**

**Your laptop (started first):**
```
Acquiring state lock. This may take a few moments...
Lock Info:
  ID:        1699564821234567-890abc
  Path:      lego-catalog-terraform-state-dev/terraform/state/default.tflock
  Operation: OperationTypeApply
  Who:       you@laptop
  Created:   2025-11-08 14:30:00 UTC

Terraform will perform the following actions...
[applying changes...]
```

**CI/CD (started second):**
```
Acquiring state lock. This may take a few moments...

Error: Error acquiring the state lock

Error message: 2 errors occurred:
* storage: object doesn't exist
* Lock Info:
  ID:        1699564821234567-890abc
  Path:      lego-catalog-terraform-state-dev/terraform/state/default.tflock
  Operation: OperationTypeApply
  Who:       you@laptop
  Created:   2025-11-08 14:30:00 UTC

Terraform acquires a state lock to protect the state from being written
by multiple users at the same time. Please resolve the issue above and try
again. For most commands, you can disable locking with the "-lock=false"
flag, but this is not recommended.
```

**Result:** ✅ CI/CD safely fails, preventing simultaneous modifications

### Lock Timeout

If a lock isn't released (crashed laptop, killed process), you may see:

```
Error: Error acquiring the state lock

Terraform acquires a state lock to protect the state...
Lock held for 15m0s. Waiting for lock to be released...
```

**The lock will automatically expire** after a timeout period, or you can force-unlock (see below).

### Force Unlocking (Emergency Use Only)

**⚠️ WARNING:** Only force-unlock if you're CERTAIN no other Terraform process is running.

```bash
# Get the lock ID from the error message
LOCK_ID="1699564821234567-890abc"

# Force unlock
terraform force-unlock $LOCK_ID

# Terraform will ask for confirmation:
# Do you really want to force-unlock?
#   Terraform will remove the lock on the remote state.
#   Only 'yes' will be accepted to confirm.
#
#   Enter a value: yes
```

**When to force-unlock:**
- ✅ Your laptop crashed mid-apply
- ✅ Process was killed (Ctrl+C multiple times)
- ✅ You verified no other process is running

**When NOT to force-unlock:**
- ❌ CI/CD is still running
- ❌ Unsure if another process has the lock
- ❌ Impatient (just wait for timeout)

---

## Importing Existing Resources

### Why Import?

**Scenario:** You created a Cloud Storage bucket manually in GCP Console and now want Terraform to manage it.

### Import Process

#### Step 1: Add Resource to Terraform Config

```hcl
# environments/dev/main.tf

# Add the resource definition (without any attributes filled in)
resource "google_storage_bucket" "manual_bucket" {
  name     = "my-manually-created-bucket"
  location = "US"
}
```

#### Step 2: Import the Resource

```bash
# Format: terraform import <resource_address> <gcp_resource_id>
terraform import google_storage_bucket.manual_bucket my-manually-created-bucket
```

**Output:**
```
google_storage_bucket.manual_bucket: Importing from ID "my-manually-created-bucket"...
google_storage_bucket.manual_bucket: Import prepared!
  Prepared google_storage_bucket for import
google_storage_bucket.manual_bucket: Refreshing state... [id=my-manually-created-bucket]

Import successful!

The resources that were imported are shown above. These resources are now in
your Terraform state and will henceforth be managed by Terraform.
```

#### Step 3: Update Configuration to Match Reality

```bash
# See what Terraform thinks should change
terraform plan
```

**You'll likely see many differences:**
```
  ~ resource "google_storage_bucket" "manual_bucket" {
      ~ force_destroy = false -> true
      ~ labels        = {} -> {
          + environment = "dev"
          + managed_by  = "terraform"
        }
      # ... many more differences
    }
```

#### Step 4: Update Your Terraform Config

Match your Terraform config to the actual resource:

```hcl
resource "google_storage_bucket" "manual_bucket" {
  name          = "my-manually-created-bucket"
  location      = "US"
  storage_class = "STANDARD"  # Match what's actually in GCP
  force_destroy = false       # Match actual setting

  # Add other attributes to match reality
  uniform_bucket_level_access {
    enabled = true
  }
}
```

#### Step 5: Verify No Changes Needed

```bash
terraform plan

# Should show:
# No changes. Your infrastructure matches the configuration.
```

### Common Import Scenarios

**Import Cloud Run service created manually:**
```bash
terraform import google_cloud_run_v2_service.app \
  projects/lego-catalog-dev-425916/locations/us-central1/services/lego-backend-dev
```

**Import Cloud SQL instance:**
```bash
terraform import google_sql_database_instance.main lego-catalog-dev-abc123
```

**Import Secret Manager secret:**
```bash
terraform import google_secret_manager_secret.api_key \
  projects/lego-catalog-dev-425916/secrets/my-api-key
```

**Finding Resource IDs:**
```bash
# Cloud Run
gcloud run services list --format="value(name)"

# Cloud SQL
gcloud sql instances list --format="value(name)"

# Storage buckets
gcloud storage buckets list --format="value(name)"
```

---

## State Recovery

### Scenario 1: State File Corrupted/Deleted

**GCS versioning saves you!**

#### List Available Versions

```bash
# List all versions of state file
gcloud storage objects list \
  gs://lego-catalog-terraform-state-dev/terraform/state/ \
  --all-versions

# Output shows:
# gs://...default.tfstate  123456  2025-11-08T10:00:00Z  (current)
# gs://...default.tfstate  123455  2025-11-07T15:30:00Z
# gs://...default.tfstate  123454  2025-11-06T09:15:00Z
```

#### Restore Previous Version

```bash
# Download a specific version
gcloud storage cp \
  gs://lego-catalog-terraform-state-dev/terraform/state/default.tfstate#123455 \
  ./terraform.tfstate.backup

# Examine it
cat terraform.tfstate.backup | jq '.resources[] | .type'

# If it looks good, restore it as current version
gcloud storage cp \
  ./terraform.tfstate.backup \
  gs://lego-catalog-terraform-state-dev/terraform/state/default.tfstate

# Verify
terraform refresh
terraform plan  # Should show no changes if restore was good
```

### Scenario 2: Local State Out of Sync

**Problem:** You ran Terraform locally and state is now on your laptop instead of GCS.

**Solution:**

```bash
# Copy local state to GCS
terraform init -migrate-state

# Terraform will ask:
# Do you want to copy existing state to the new backend?
#   Pre-existing state was found while migrating...
#
#   Enter a value: yes

# Verify it worked
terraform state list  # Should show all resources
```

### Scenario 3: Manual GCP Changes (Drift)

**Problem:** Someone made changes in GCP Console that Terraform doesn't know about.

**Detection:**

```bash
# Refresh state from actual GCP resources
terraform refresh

# Or use plan to see drift
terraform plan -refresh-only

# Shows what changed outside Terraform:
# Note: Objects have changed outside of Terraform
#
#   ~ resource "google_cloud_run_v2_service" "app" {
#       ~ template {
#           ~ scaling {
#               ~ max_instance_count = 5 -> 10
#             }
#       }
#     }
```

**Resolution Options:**

**Option 1:** Accept the manual change (update Terraform config)
```hcl
# Update your .tf file to match reality
max_instances = 10  # Changed from 5
```

**Option 2:** Revert to Terraform's configuration
```bash
# Apply will revert manual changes
terraform apply
# This will set max_instances back to 5
```

---

## Troubleshooting Common Issues

### Issue 1: "Backend configuration changed"

**Error:**
```
Error: Backend configuration changed

A change in the backend configuration has been detected, which may require
migrating existing state.

If you wish to attempt automatic migration of the state, use "terraform init -migrate-state".
```

**Solution:**
```bash
terraform init -migrate-state
```

---

### Issue 2: "Resource already exists"

**Error:**
```
Error: Error creating Storage Bucket: googleapi: Error 409: You already own this bucket.
```

**Cause:** Resource exists in GCP but not in Terraform state.

**Solution:** Import it (see [Importing Existing Resources](#importing-existing-resources))

---

### Issue 3: "Failed to save state"

**Error:**
```
Error: Failed to save state

Error writing state: failed to upload state: googleapi: Error 403: Insufficient Permission
```

**Cause:** GCP credentials don't have permission to write to state bucket.

**Solution:**
```bash
# Check which account you're using
gcloud auth list

# Authenticate with correct account
gcloud auth application-default login

# Or set service account key
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# Verify permissions
gcloud storage buckets get-iam-policy gs://lego-catalog-terraform-state-dev
```

---

### Issue 4: "Provider configuration not present"

**Error:**
```
Error: Provider configuration not present

To work with module.database.google_sql_database_instance.main its original provider
configuration at provider["registry.terraform.io/hashicorp/google"] is required,
but it has been removed.
```

**Cause:** Provider removed from configuration but resources still in state.

**Solution:**
```bash
# Re-add provider to configuration
# Then run:
terraform init

# Or remove the resources from state if no longer needed:
terraform state rm module.database.google_sql_database_instance.main
```

---

### Issue 5: State shows resources that don't exist

**Scenario:** Deleted a resource in GCP Console, but Terraform still thinks it exists.

**Solution:**
```bash
# Option 1: Remove from state (doesn't affect GCP)
terraform state rm google_storage_bucket.old_bucket

# Option 2: Refresh state (Terraform will see it's gone)
terraform refresh

# Then plan will want to recreate it (if still in config)
terraform plan
# If you don't want to recreate, remove from .tf files
```

---

### Issue 6: Need to rename a resource

**Problem:** Want to rename `google_storage_bucket.images` to `google_storage_bucket.lego_images`

**Solution:**
```bash
# Step 1: Rename in .tf files
# Old: resource "google_storage_bucket" "images" { ... }
# New: resource "google_storage_bucket" "lego_images" { ... }

# Step 2: Move in state
terraform state mv \
  google_storage_bucket.images \
  google_storage_bucket.lego_images

# Step 3: Verify
terraform plan  # Should show no changes
```

---

## Best Practices for Solo Developers

### 1. Always Plan First
```bash
# Never run apply without plan
terraform plan -out=tfplan
# Review output
terraform apply tfplan
```

### 2. Use Environment Variables for Secrets
```bash
# Don't commit sensitive values
export TF_VAR_honeycomb_api_key="your-key"
export TF_VAR_db_password="your-password"

terraform apply
```

### 3. Verify Environment Before Applying
```bash
# Add to your shell profile or create an alias
alias tf-dev='cd ~/lego-catalog-infrastructure/environments/dev && pwd'
alias tf-prod='cd ~/lego-catalog-infrastructure/environments/prod && pwd'
```

### 4. Keep State Bucket Versioning Enabled
```bash
# Verify versioning is on
gcloud storage buckets describe gs://lego-catalog-terraform-state-dev \
  --format="value(versioning.enabled)"

# Should output: True
```

### 5. Regular State Backups (Extra Safety)
```bash
# Create a local backup before major changes
terraform state pull > backups/terraform-$(date +%Y%m%d-%H%M%S).tfstate

# Store in version control (git) or separate location
```

### 6. Document Infrastructure Changes
```bash
# Create a CHANGELOG.md for infrastructure
cat >> INFRASTRUCTURE_CHANGELOG.md <<EOF
## $(date +%Y-%m-%d) - Increased Cloud Run instances

- Changed max_instances from 5 to 10
- Reason: Handling increased traffic
- Deployed by: manual terraform apply
EOF
```

### 7. Use `terraform fmt` Before Committing
```bash
# Format all .tf files
terraform fmt -recursive

# Check formatting (CI/CD can enforce this)
terraform fmt -check -recursive
```

---

## Quick Reference

### State Commands Cheat Sheet

```bash
# Inspect state
terraform state list                           # List all resources
terraform state show <resource>                # Show resource details
terraform show                                 # Show entire state

# Modify state
terraform state mv <source> <dest>             # Rename resource
terraform state rm <resource>                  # Remove from state
terraform state replace-provider <old> <new>   # Change provider

# Import/Export
terraform import <address> <id>                # Import existing resource
terraform state pull                           # Download state to stdout
terraform state push <file>                    # Upload state (dangerous)

# Refresh/Sync
terraform refresh                              # Update state from real resources
terraform plan -refresh-only                   # Show drift without applying

# Locking
terraform force-unlock <lock-id>               # Remove stuck lock (emergency)
```

### State File Locations

```bash
# Local (don't use for real projects)
./terraform.tfstate
./terraform.tfstate.backup

# Remote GCS
gs://lego-catalog-terraform-state-dev/terraform/state/default.tfstate

# Downloaded local copy
terraform state pull > current-state.json
```

---

**[← Back to Main Deployment Guide](../../CLOUD_DEPLOYMENT_GUIDE.md)**
