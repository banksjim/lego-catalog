# Complete Terraform Module Examples

**[← Back to Main Deployment Guide](../../CLOUD_DEPLOYMENT_GUIDE.md)**

This document provides complete, production-ready Terraform modules for deploying the Lego Catalog application to Google Cloud Platform.

---

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Module: Cloud Run](#module-cloud-run)
3. [Module: Cloud SQL](#module-cloud-sql)
4. [Module: Cloud Storage](#module-cloud-storage)
5. [Module: Honeycomb Integration](#module-honeycomb-integration)
6. [Environment Configurations](#environment-configurations)
7. [Terraform Backend Setup](#terraform-backend-setup)
8. [Usage Examples](#usage-examples)

---

## Directory Structure

```
lego-catalog-infrastructure/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   ├── backend.tf
│   │   └── versions.tf
│   └── prod/
│       ├── main.tf
│       ├── terraform.tfvars
│       ├── backend.tf
│       └── versions.tf
│
├── modules/
│   ├── cloud-run/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── cloud-sql/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── storage/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   └── monitoring/
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── README.md
│
└── scripts/
    ├── init-backend.sh
    └── setup-gcp-project.sh
```

---

## Module: Cloud Run

### `modules/cloud-run/main.tf`

```hcl
# Cloud Run service for containerized application
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "app" {
  name     = "${var.service_name}-${var.environment}"
  location = var.region
  project  = var.project_id

  template {
    # Scaling configuration
    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    # Service account for the application
    service_account = google_service_account.app.email

    containers {
      # Container image from GCR or Artifact Registry
      image = var.container_image

      # Resource limits
      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle          = var.cpu_always_allocated
        startup_cpu_boost = var.startup_cpu_boost
      }

      # Container port
      ports {
        container_port = var.container_port
        name          = "http1"
      }

      # Environment variables
      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Environment variables from secrets
      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_name
              version = env.value.version
            }
          }
        }
      }

      # Honeycomb API Key from Secret Manager
      env {
        name = "HONEYCOMB_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.honeycomb_key.secret_id
            version = "latest"
          }
        }
      }

      # Database connection string from Secret Manager
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_connection.secret_id
            version = "latest"
          }
        }
      }

      # Standard environment variables
      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "APP_VERSION"
        value = var.app_version
      }

      env {
        name  = "HONEYCOMB_DATASET"
        value = var.honeycomb_dataset
      }

      # Startup probe
      startup_probe {
        http_get {
          path = var.health_check_path
          port = var.container_port
        }
        initial_delay_seconds = 0
        timeout_seconds       = 1
        period_seconds        = 3
        failure_threshold     = 10
      }

      # Liveness probe
      liveness_probe {
        http_get {
          path = var.health_check_path
          port = var.container_port
        }
        initial_delay_seconds = 0
        timeout_seconds       = 1
        period_seconds        = 10
        failure_threshold     = 3
      }
    }

    # VPC connector for private Cloud SQL access
    vpc_access {
      connector = var.vpc_connector_id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    # Execution environment
    execution_environment = var.execution_environment

    # Timeout for request processing
    timeout = var.request_timeout

    # Maximum concurrent requests per instance
    max_instance_request_concurrency = var.max_concurrency
  }

  # Traffic configuration
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  # Labels for organization and cost tracking
  labels = merge(
    var.labels,
    {
      environment = var.environment
      managed_by  = "terraform"
      application = "lego-catalog"
    }
  )

  # Prevent accidental deletion in production
  lifecycle {
    prevent_destroy = var.prevent_destroy
  }

  depends_on = [
    google_secret_manager_secret_version.honeycomb_key,
    google_secret_manager_secret_version.db_connection
  ]
}

# Service Account for Cloud Run
resource "google_service_account" "app" {
  account_id   = "${var.service_name}-${var.environment}"
  display_name = "Cloud Run Service Account for ${var.service_name} (${var.environment})"
  project      = var.project_id
}

# IAM binding for Cloud Run to access secrets
resource "google_secret_manager_secret_iam_member" "honeycomb_access" {
  secret_id = google_secret_manager_secret.honeycomb_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"
}

resource "google_secret_manager_secret_iam_member" "db_access" {
  secret_id = google_secret_manager_secret.db_connection.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.app.email}"
}

# IAM binding for Cloud Run to connect to Cloud SQL
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.app.email}"
}

# IAM binding for Cloud Run to access Cloud Storage
resource "google_storage_bucket_iam_member" "app_storage_access" {
  bucket = var.storage_bucket_name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.app.email}"
}

# Secret Manager secret for Honeycomb API key
resource "google_secret_manager_secret" "honeycomb_key" {
  secret_id = "honeycomb-api-key-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Secret Manager secret version (must be set manually or via separate process)
resource "google_secret_manager_secret_version" "honeycomb_key" {
  secret      = google_secret_manager_secret.honeycomb_key.id
  secret_data = var.honeycomb_api_key

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# Secret Manager secret for database connection string
resource "google_secret_manager_secret" "db_connection" {
  secret_id = "db-connection-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Database connection string secret version
resource "google_secret_manager_secret_version" "db_connection" {
  secret = google_secret_manager_secret.db_connection.id
  secret_data = "mysql://${var.db_user}:${var.db_password}@${var.db_connection_name}/${var.db_name}?charset=utf8mb4&parseTime=True&loc=Local"

  lifecycle {
    ignore_changes = [secret_data]
  }
}

# IAM policy for public access (if needed)
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  count = var.allow_unauthenticated ? 1 : 0

  project  = google_cloud_run_v2_service.app.project
  location = google_cloud_run_v2_service.app.location
  name     = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# VPC Serverless Connector
resource "google_vpc_access_connector" "connector" {
  count = var.create_vpc_connector ? 1 : 0

  name          = "${var.service_name}-vpc-connector-${var.environment}"
  project       = var.project_id
  region        = var.region
  network       = var.vpc_network
  ip_cidr_range = var.vpc_connector_cidr

  machine_type  = var.vpc_connector_machine_type
  min_instances = var.vpc_connector_min_instances
  max_instances = var.vpc_connector_max_instances
}
```

### `modules/cloud-run/variables.tf`

```hcl
# Project and location
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run service"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

# Service configuration
variable "service_name" {
  description = "Name of the Cloud Run service"
  type        = string
}

variable "container_image" {
  description = "Full container image path (e.g., gcr.io/project/image:tag)"
  type        = string
}

variable "app_version" {
  description = "Application version for tracking"
  type        = string
  default     = "unknown"
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8080
}

# Scaling configuration
variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}

variable "max_concurrency" {
  description = "Maximum concurrent requests per instance"
  type        = number
  default     = 80
}

# Resource limits
variable "cpu_limit" {
  description = "CPU limit (e.g., '1', '2', '4')"
  type        = string
  default     = "1"
}

variable "memory_limit" {
  description = "Memory limit (e.g., '512Mi', '1Gi', '2Gi')"
  type        = string
  default     = "512Mi"
}

variable "cpu_always_allocated" {
  description = "Keep CPU allocated even when idle"
  type        = bool
  default     = false
}

variable "startup_cpu_boost" {
  description = "Boost CPU during startup"
  type        = bool
  default     = true
}

variable "request_timeout" {
  description = "Request timeout in seconds"
  type        = string
  default     = "300s"
}

variable "execution_environment" {
  description = "Execution environment generation"
  type        = string
  default     = "gen2"
}

# Health checks
variable "health_check_path" {
  description = "Path for health check endpoint"
  type        = string
  default     = "/health"
}

# Environment variables
variable "env_vars" {
  description = "Environment variables as key-value pairs"
  type        = map(string)
  default     = {}
}

variable "secret_env_vars" {
  description = "Environment variables from secrets"
  type = map(object({
    secret_name = string
    version     = string
  }))
  default = {}
}

# Honeycomb configuration
variable "honeycomb_api_key" {
  description = "Honeycomb API key"
  type        = string
  sensitive   = true
}

variable "honeycomb_dataset" {
  description = "Honeycomb dataset name"
  type        = string
  default     = "lego-backend"
}

# Database configuration
variable "db_user" {
  description = "Database user"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Database name"
  type        = string
}

variable "db_connection_name" {
  description = "Cloud SQL connection name"
  type        = string
}

# VPC configuration
variable "vpc_connector_id" {
  description = "VPC connector ID for private access"
  type        = string
  default     = null
}

variable "create_vpc_connector" {
  description = "Create VPC connector"
  type        = bool
  default     = false
}

variable "vpc_network" {
  description = "VPC network name"
  type        = string
  default     = "default"
}

variable "vpc_connector_cidr" {
  description = "CIDR range for VPC connector"
  type        = string
  default     = "10.8.0.0/28"
}

variable "vpc_connector_machine_type" {
  description = "Machine type for VPC connector"
  type        = string
  default     = "e2-micro"
}

variable "vpc_connector_min_instances" {
  description = "Minimum instances for VPC connector"
  type        = number
  default     = 2
}

variable "vpc_connector_max_instances" {
  description = "Maximum instances for VPC connector"
  type        = number
  default     = 3
}

# Storage
variable "storage_bucket_name" {
  description = "Cloud Storage bucket name for application files"
  type        = string
}

# Access control
variable "allow_unauthenticated" {
  description = "Allow unauthenticated access to the service"
  type        = bool
  default     = true
}

# Labels
variable "labels" {
  description = "Additional labels to apply to resources"
  type        = map(string)
  default     = {}
}

# Lifecycle
variable "prevent_destroy" {
  description = "Prevent accidental resource destruction"
  type        = bool
  default     = false
}
```

### `modules/cloud-run/outputs.tf`

```hcl
output "service_url" {
  description = "URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.app.uri
}

output "service_name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_v2_service.app.name
}

output "service_id" {
  description = "Unique identifier of the Cloud Run service"
  value       = google_cloud_run_v2_service.app.id
}

output "service_account_email" {
  description = "Email of the service account used by Cloud Run"
  value       = google_service_account.app.email
}

output "latest_revision_name" {
  description = "Name of the latest revision"
  value       = google_cloud_run_v2_service.app.latest_ready_revision
}

output "vpc_connector_id" {
  description = "ID of the VPC connector (if created)"
  value       = var.create_vpc_connector ? google_vpc_access_connector.connector[0].id : null
}

output "honeycomb_secret_id" {
  description = "ID of the Honeycomb API key secret"
  value       = google_secret_manager_secret.honeycomb_key.secret_id
}

output "db_secret_id" {
  description = "ID of the database connection secret"
  value       = google_secret_manager_secret.db_connection.secret_id
}
```

---

## Module: Cloud SQL

### `modules/cloud-sql/main.tf`

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

# Random suffix for instance name (cannot reuse names for 7 days after deletion)
resource "random_id" "db_suffix" {
  byte_length = 4
}

# Cloud SQL MySQL Instance
resource "google_sql_database_instance" "main" {
  name             = "${var.instance_name}-${var.environment}-${random_id.db_suffix.hex}"
  database_version = var.database_version
  region           = var.region
  project          = var.project_id

  # Deletion protection
  deletion_protection = var.deletion_protection

  settings {
    # Machine tier
    tier              = var.tier
    availability_type = var.availability_type
    disk_type         = var.disk_type
    disk_size         = var.disk_size
    disk_autoresize   = var.disk_autoresize

    # Disk autoresize limit (0 = unlimited)
    disk_autoresize_limit = var.disk_autoresize_limit

    # Backup configuration
    backup_configuration {
      enabled                        = var.backup_enabled
      start_time                     = var.backup_start_time
      point_in_time_recovery_enabled = var.point_in_time_recovery_enabled
      transaction_log_retention_days = var.transaction_log_retention_days

      backup_retention_settings {
        retained_backups = var.retained_backups
        retention_unit   = "COUNT"
      }
    }

    # Maintenance window
    maintenance_window {
      day          = var.maintenance_window_day
      hour         = var.maintenance_window_hour
      update_track = var.maintenance_update_track
    }

    # IP configuration
    ip_configuration {
      # Private IP
      ipv4_enabled                                  = var.ipv4_enabled
      private_network                               = var.private_network
      enable_private_path_for_google_cloud_services = true

      # Require SSL
      require_ssl = var.require_ssl

      # Authorized networks (for public IP access)
      dynamic "authorized_networks" {
        for_each = var.authorized_networks
        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.cidr
        }
      }
    }

    # Database flags
    dynamic "database_flags" {
      for_each = var.database_flags
      content {
        name  = database_flags.value.name
        value = database_flags.value.value
      }
    }

    # Insights configuration
    insights_config {
      query_insights_enabled  = var.query_insights_enabled
      query_string_length     = var.query_string_length
      record_application_tags = var.record_application_tags
      record_client_address   = var.record_client_address
    }

    # User labels for organization
    user_labels = merge(
      var.labels,
      {
        environment = var.environment
        managed_by  = "terraform"
        application = "lego-catalog"
      }
    )
  }

  lifecycle {
    prevent_destroy = var.prevent_destroy
    ignore_changes  = [settings[0].disk_size] # Allow autoresize
  }
}

# Database
resource "google_sql_database" "database" {
  name      = var.database_name
  instance  = google_sql_database_instance.main.name
  project   = var.project_id
  charset   = var.charset
  collation = var.collation
}

# Root user password
resource "random_password" "root_password" {
  count   = var.create_root_password ? 1 : 0
  length  = 32
  special = true
}

resource "google_sql_user" "root" {
  count    = var.create_root_password ? 1 : 0
  name     = "root"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
  password = random_password.root_password[0].result
}

# Application user
resource "random_password" "app_password" {
  count   = var.create_app_user ? 1 : 0
  length  = 32
  special = true
}

resource "google_sql_user" "app" {
  count    = var.create_app_user ? 1 : 0
  name     = var.app_user_name
  instance = google_sql_database_instance.main.name
  project  = var.project_id
  password = random_password.app_password[0].result
}

# Store passwords in Secret Manager
resource "google_secret_manager_secret" "root_password" {
  count     = var.create_root_password ? 1 : 0
  secret_id = "db-root-password-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "root_password" {
  count       = var.create_root_password ? 1 : 0
  secret      = google_secret_manager_secret.root_password[0].id
  secret_data = random_password.root_password[0].result
}

resource "google_secret_manager_secret" "app_password" {
  count     = var.create_app_user ? 1 : 0
  secret_id = "db-app-password-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret_version" "app_password" {
  count       = var.create_app_user ? 1 : 0
  secret      = google_secret_manager_secret.app_password[0].id
  secret_data = random_password.app_password[0].result
}
```

### `modules/cloud-sql/variables.tf`

```hcl
# Project and location
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud SQL instance"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

# Instance configuration
variable "instance_name" {
  description = "Base name for the Cloud SQL instance"
  type        = string
  default     = "lego-catalog"
}

variable "database_version" {
  description = "MySQL version"
  type        = string
  default     = "MYSQL_8_0"
}

variable "tier" {
  description = "Machine tier (e.g., db-f1-micro, db-n1-standard-1)"
  type        = string
  default     = "db-f1-micro"
}

variable "availability_type" {
  description = "Availability type (ZONAL or REGIONAL)"
  type        = string
  default     = "ZONAL"
}

# Disk configuration
variable "disk_type" {
  description = "Disk type (PD_SSD or PD_HDD)"
  type        = string
  default     = "PD_SSD"
}

variable "disk_size" {
  description = "Initial disk size in GB"
  type        = number
  default     = 10
}

variable "disk_autoresize" {
  description = "Enable automatic storage increase"
  type        = bool
  default     = true
}

variable "disk_autoresize_limit" {
  description = "Maximum disk size in GB (0 = unlimited)"
  type        = number
  default     = 0
}

# Database configuration
variable "database_name" {
  description = "Name of the database to create"
  type        = string
  default     = "lego_catalog"
}

variable "charset" {
  description = "Database character set"
  type        = string
  default     = "utf8mb4"
}

variable "collation" {
  description = "Database collation"
  type        = string
  default     = "utf8mb4_unicode_ci"
}

# Backup configuration
variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true
}

variable "backup_start_time" {
  description = "Start time for backups (HH:MM format)"
  type        = string
  default     = "03:00"
}

variable "point_in_time_recovery_enabled" {
  description = "Enable point-in-time recovery"
  type        = bool
  default     = false
}

variable "transaction_log_retention_days" {
  description = "Number of days to retain transaction logs"
  type        = number
  default     = 7
}

variable "retained_backups" {
  description = "Number of backups to retain"
  type        = number
  default     = 7
}

# Maintenance window
variable "maintenance_window_day" {
  description = "Day of week for maintenance (1-7, 1=Monday)"
  type        = number
  default     = 7 # Sunday
}

variable "maintenance_window_hour" {
  description = "Hour of day for maintenance (0-23)"
  type        = number
  default     = 3
}

variable "maintenance_update_track" {
  description = "Update track (stable or canary)"
  type        = string
  default     = "stable"
}

# Network configuration
variable "ipv4_enabled" {
  description = "Enable public IP"
  type        = bool
  default     = false
}

variable "private_network" {
  description = "VPC network for private IP"
  type        = string
  default     = null
}

variable "require_ssl" {
  description = "Require SSL for connections"
  type        = bool
  default     = false
}

variable "authorized_networks" {
  description = "List of authorized networks for public IP access"
  type = list(object({
    name = string
    cidr = string
  }))
  default = []
}

# Database flags
variable "database_flags" {
  description = "Database flags to set"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

# Query Insights
variable "query_insights_enabled" {
  description = "Enable Query Insights"
  type        = bool
  default     = true
}

variable "query_string_length" {
  description = "Maximum query string length to record"
  type        = number
  default     = 1024
}

variable "record_application_tags" {
  description = "Record application tags in Query Insights"
  type        = bool
  default     = true
}

variable "record_client_address" {
  description = "Record client address in Query Insights"
  type        = bool
  default     = true
}

# User configuration
variable "create_root_password" {
  description = "Create random password for root user"
  type        = bool
  default     = true
}

variable "create_app_user" {
  description = "Create application user"
  type        = bool
  default     = true
}

variable "app_user_name" {
  description = "Name of the application user"
  type        = string
  default     = "app_user"
}

# Labels
variable "labels" {
  description = "Additional labels to apply to resources"
  type        = map(string)
  default     = {}
}

# Lifecycle
variable "deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}

variable "prevent_destroy" {
  description = "Prevent accidental resource destruction via Terraform"
  type        = bool
  default     = false
}
```

### `modules/cloud-sql/outputs.tf`

```hcl
output "instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.main.name
}

output "instance_connection_name" {
  description = "Connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.main.connection_name
}

output "database_name" {
  description = "Name of the database"
  value       = google_sql_database.database.name
}

output "private_ip_address" {
  description = "Private IP address of the instance"
  value       = google_sql_database_instance.main.private_ip_address
}

output "public_ip_address" {
  description = "Public IP address of the instance"
  value       = google_sql_database_instance.main.public_ip_address
}

output "self_link" {
  description = "Self link of the Cloud SQL instance"
  value       = google_sql_database_instance.main.self_link
}

output "root_password_secret_id" {
  description = "Secret Manager ID for root password"
  value       = var.create_root_password ? google_secret_manager_secret.root_password[0].secret_id : null
}

output "app_user_name" {
  description = "Name of the application user"
  value       = var.create_app_user ? google_sql_user.app[0].name : null
}

output "app_password_secret_id" {
  description = "Secret Manager ID for app user password"
  value       = var.create_app_user ? google_secret_manager_secret.app_password[0].secret_id : null
}

output "instance_server_ca_cert" {
  description = "Server CA certificate"
  value       = google_sql_database_instance.main.server_ca_cert
  sensitive   = true
}
```

---

## Module: Cloud Storage

### `modules/storage/main.tf`

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Cloud Storage bucket for Lego set images
resource "google_storage_bucket" "images" {
  name          = "${var.bucket_name}-${var.environment}"
  location      = var.location
  project       = var.project_id
  storage_class = var.storage_class

  # Prevent accidental deletion
  force_destroy = var.force_destroy

  # Uniform bucket-level access
  uniform_bucket_level_access {
    enabled = true
  }

  # Versioning
  versioning {
    enabled = var.versioning_enabled
  }

  # Lifecycle rules
  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules
    content {
      action {
        type          = lifecycle_rule.value.action.type
        storage_class = lookup(lifecycle_rule.value.action, "storage_class", null)
      }
      condition {
        age                        = lookup(lifecycle_rule.value.condition, "age", null)
        created_before             = lookup(lifecycle_rule.value.condition, "created_before", null)
        with_state                 = lookup(lifecycle_rule.value.condition, "with_state", null)
        matches_storage_class      = lookup(lifecycle_rule.value.condition, "matches_storage_class", null)
        num_newer_versions         = lookup(lifecycle_rule.value.condition, "num_newer_versions", null)
        days_since_noncurrent_time = lookup(lifecycle_rule.value.condition, "days_since_noncurrent_time", null)
      }
    }
  }

  # CORS configuration for direct uploads from browser
  cors {
    origin          = var.cors_origins
    method          = var.cors_methods
    response_header = var.cors_response_headers
    max_age_seconds = var.cors_max_age_seconds
  }

  # Encryption
  encryption {
    default_kms_key_name = var.encryption_key
  }

  # Labels
  labels = merge(
    var.labels,
    {
      environment = var.environment
      managed_by  = "terraform"
      application = "lego-catalog"
    }
  )

  lifecycle {
    prevent_destroy = var.prevent_destroy
  }
}

# Public access prevention
resource "google_storage_bucket_iam_member" "public_access_prevention" {
  count  = var.public_access ? 1 : 0
  bucket = google_storage_bucket.images.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Logging bucket (optional)
resource "google_storage_bucket" "logs" {
  count = var.enable_logging ? 1 : 0

  name          = "${var.bucket_name}-logs-${var.environment}"
  location      = var.location
  project       = var.project_id
  storage_class = "NEARLINE"
  force_destroy = true

  uniform_bucket_level_access {
    enabled = true
  }

  # Auto-delete logs after retention period
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = var.log_retention_days
    }
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "logging"
  }
}

# Enable logging
resource "google_storage_bucket" "images_with_logging" {
  count = var.enable_logging ? 1 : 0

  name          = google_storage_bucket.images.name
  location      = google_storage_bucket.images.location
  project       = google_storage_bucket.images.project
  storage_class = google_storage_bucket.images.storage_class

  logging {
    log_bucket        = google_storage_bucket.logs[0].name
    log_object_prefix = "images/"
  }

  depends_on = [google_storage_bucket.logs]

  lifecycle {
    ignore_changes = all
    prevent_destroy = var.prevent_destroy
  }
}
```

### `modules/storage/variables.tf`

```hcl
# Project and location
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "location" {
  description = "Bucket location"
  type        = string
  default     = "US"
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

# Bucket configuration
variable "bucket_name" {
  description = "Base name for the storage bucket"
  type        = string
}

variable "storage_class" {
  description = "Storage class (STANDARD, NEARLINE, COLDLINE, ARCHIVE)"
  type        = string
  default     = "STANDARD"
}

variable "force_destroy" {
  description = "Allow destroying bucket with objects"
  type        = bool
  default     = false
}

# Versioning
variable "versioning_enabled" {
  description = "Enable object versioning"
  type        = bool
  default     = false
}

# Lifecycle rules
variable "lifecycle_rules" {
  description = "Lifecycle rules for the bucket"
  type = list(object({
    action = object({
      type          = string
      storage_class = optional(string)
    })
    condition = object({
      age                        = optional(number)
      created_before             = optional(string)
      with_state                 = optional(string)
      matches_storage_class      = optional(list(string))
      num_newer_versions         = optional(number)
      days_since_noncurrent_time = optional(number)
    })
  }))
  default = []
}

# CORS configuration
variable "cors_origins" {
  description = "Allowed origins for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "cors_methods" {
  description = "Allowed methods for CORS"
  type        = list(string)
  default     = ["GET", "HEAD", "PUT", "POST", "DELETE"]
}

variable "cors_response_headers" {
  description = "Allowed response headers for CORS"
  type        = list(string)
  default     = ["*"]
}

variable "cors_max_age_seconds" {
  description = "CORS preflight cache duration in seconds"
  type        = number
  default     = 3600
}

# Encryption
variable "encryption_key" {
  description = "KMS key for bucket encryption"
  type        = string
  default     = null
}

# Access control
variable "public_access" {
  description = "Allow public read access to objects"
  type        = bool
  default     = false
}

# Logging
variable "enable_logging" {
  description = "Enable access logging"
  type        = bool
  default     = false
}

variable "log_retention_days" {
  description = "Number of days to retain logs"
  type        = number
  default     = 30
}

# Labels
variable "labels" {
  description = "Additional labels to apply to resources"
  type        = map(string)
  default     = {}
}

# Lifecycle
variable "prevent_destroy" {
  description = "Prevent accidental resource destruction"
  type        = bool
  default     = false
}
```

### `modules/storage/outputs.tf`

```hcl
output "bucket_name" {
  description = "Name of the storage bucket"
  value       = google_storage_bucket.images.name
}

output "bucket_url" {
  description = "URL of the storage bucket"
  value       = google_storage_bucket.images.url
}

output "bucket_self_link" {
  description = "Self link of the storage bucket"
  value       = google_storage_bucket.images.self_link
}

output "logs_bucket_name" {
  description = "Name of the logs bucket"
  value       = var.enable_logging ? google_storage_bucket.logs[0].name : null
}
```

---

## Module: Honeycomb Integration

### `modules/monitoring/main.tf`

```hcl
# This module doesn't create GCP resources, but provides
# configuration and helpers for Honeycomb integration

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# Honeycomb configuration stored in Secret Manager
resource "google_secret_manager_secret" "honeycomb_config" {
  secret_id = "honeycomb-config-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
    service     = "monitoring"
  }
}

# Honeycomb configuration as JSON
locals {
  honeycomb_config = jsonencode({
    api_key          = var.honeycomb_api_key
    dataset          = var.dataset_name
    service_name     = var.service_name
    environment      = var.environment
    sample_rate      = var.sample_rate
    send_frequency   = var.send_frequency
    max_batch_size   = var.max_batch_size
    max_concurrent_batches = var.max_concurrent_batches
    pending_work_capacity  = var.pending_work_capacity
  })
}

resource "google_secret_manager_secret_version" "honeycomb_config" {
  secret      = google_secret_manager_secret.honeycomb_config.id
  secret_data = local.honeycomb_config
}
```

### `modules/monitoring/variables.tf`

```hcl
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, prod)"
  type        = string
}

variable "honeycomb_api_key" {
  description = "Honeycomb API key"
  type        = string
  sensitive   = true
}

variable "dataset_name" {
  description = "Honeycomb dataset name"
  type        = string
  default     = "lego-backend"
}

variable "service_name" {
  description = "Service name for tracing"
  type        = string
  default     = "lego-catalog"
}

variable "sample_rate" {
  description = "Sampling rate for traces (1 = 100%, 10 = 10%)"
  type        = number
  default     = 1
}

variable "send_frequency" {
  description = "How often to send events (milliseconds)"
  type        = number
  default     = 100
}

variable "max_batch_size" {
  description = "Maximum events per batch"
  type        = number
  default     = 50
}

variable "max_concurrent_batches" {
  description = "Maximum concurrent batches"
  type        = number
  default     = 10
}

variable "pending_work_capacity" {
  description = "Capacity of pending work queue"
  type        = number
  default     = 10000
}
```

### `modules/monitoring/outputs.tf`

```hcl
output "config_secret_id" {
  description = "Secret Manager ID for Honeycomb configuration"
  value       = google_secret_manager_secret.honeycomb_config.secret_id
}

output "config_secret_version" {
  description = "Latest version of Honeycomb configuration"
  value       = google_secret_manager_secret_version.honeycomb_config.version
}
```

---

## Environment Configurations

### `environments/dev/main.tf`

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud SQL instance
module "database" {
  source = "../../modules/cloud-sql"

  project_id  = var.project_id
  region      = var.region
  environment = "dev"

  instance_name     = "lego-catalog"
  database_version  = "MYSQL_8_0"
  tier              = "db-f1-micro"
  availability_type = "ZONAL"

  disk_size       = 10
  disk_autoresize = true

  backup_enabled                     = true
  backup_start_time                  = "03:00"
  point_in_time_recovery_enabled     = false
  transaction_log_retention_days     = 7
  retained_backups                   = 7

  database_name = "lego_catalog"
  charset       = "utf8mb4"
  collation     = "utf8mb4_unicode_ci"

  ipv4_enabled   = false
  require_ssl    = false

  create_root_password = true
  create_app_user      = true
  app_user_name        = "app_user"

  query_insights_enabled = true

  deletion_protection = false
  prevent_destroy     = false

  labels = {
    cost_center = "development"
  }
}

# Cloud Storage bucket for images
module "storage" {
  source = "../../modules/storage"

  project_id  = var.project_id
  location    = "US"
  environment = "dev"

  bucket_name   = "lego-catalog-images"
  storage_class = "STANDARD"
  force_destroy = true

  versioning_enabled = false

  # Auto-delete old images after 90 days in dev
  lifecycle_rules = [
    {
      action = {
        type = "Delete"
      }
      condition = {
        age = 90
      }
    }
  ]

  cors_origins = ["*"]

  public_access = false

  enable_logging      = false
  prevent_destroy     = false
}

# Backend Cloud Run service
module "backend" {
  source = "../../modules/cloud-run"

  project_id  = var.project_id
  region      = var.region
  environment = "dev"

  service_name    = "lego-backend"
  container_image = var.backend_image
  app_version     = var.app_version

  min_instances = 0
  max_instances = 5
  max_concurrency = 80

  cpu_limit              = "1"
  memory_limit           = "512Mi"
  cpu_always_allocated   = false
  startup_cpu_boost      = true

  honeycomb_api_key  = var.honeycomb_api_key
  honeycomb_dataset  = "lego-backend"

  db_user            = "app_user"
  db_password        = module.database.app_password_secret_id
  db_name            = "lego_catalog"
  db_connection_name = module.database.instance_connection_name

  storage_bucket_name = module.storage.bucket_name

  create_vpc_connector = true
  vpc_network          = "default"

  allow_unauthenticated = true

  prevent_destroy = false
}

# Frontend Cloud Run service
module "frontend" {
  source = "../../modules/cloud-run"

  project_id  = var.project_id
  region      = var.region
  environment = "dev"

  service_name    = "lego-frontend"
  container_image = var.frontend_image
  app_version     = var.app_version

  container_port = 3000

  min_instances = 0
  max_instances = 3

  cpu_limit    = "1"
  memory_limit = "256Mi"

  env_vars = {
    REACT_APP_API_URL         = module.backend.service_url
    REACT_APP_ENVIRONMENT     = "dev"
    REACT_APP_HONEYCOMB_API_KEY = var.honeycomb_frontend_key
  }

  # Frontend doesn't need database or storage access
  honeycomb_api_key  = var.honeycomb_frontend_key
  honeycomb_dataset  = "lego-frontend"

  # Dummy values (not used by frontend)
  db_user            = "dummy"
  db_password        = "dummy"
  db_name            = "dummy"
  db_connection_name = "dummy"
  storage_bucket_name = module.storage.bucket_name

  create_vpc_connector  = false
  allow_unauthenticated = true

  prevent_destroy = false
}

# Honeycomb monitoring configuration
module "monitoring" {
  source = "../../modules/monitoring"

  project_id        = var.project_id
  environment       = "dev"
  honeycomb_api_key = var.honeycomb_api_key
  dataset_name      = "lego-backend"
  service_name      = "lego-catalog"
  sample_rate       = 1 # 100% sampling in dev
}
```

### `environments/dev/variables.tf`

```hcl
variable "project_id" {
  description = "GCP Project ID for development environment"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "backend_image" {
  description = "Backend container image"
  type        = string
}

variable "frontend_image" {
  description = "Frontend container image"
  type        = string
}

variable "app_version" {
  description = "Application version"
  type        = string
  default     = "latest"
}

variable "honeycomb_api_key" {
  description = "Honeycomb API key for backend"
  type        = string
  sensitive   = true
}

variable "honeycomb_frontend_key" {
  description = "Honeycomb API key for frontend"
  type        = string
  sensitive   = true
}
```

### `environments/dev/terraform.tfvars`

```hcl
# GCP Configuration
project_id = "lego-catalog-dev-425916"
region     = "us-central1"

# Container Images (update these with your actual images)
backend_image  = "gcr.io/lego-catalog-dev-425916/backend:latest"
frontend_image = "gcr.io/lego-catalog-dev-425916/frontend:latest"

# Application Version
app_version = "dev-latest"

# Honeycomb API Keys (set these via environment variables or separate tfvars file)
# honeycomb_api_key = "your-backend-key-here"
# honeycomb_frontend_key = "your-frontend-key-here"
```

### `environments/dev/backend.tf`

```hcl
terraform {
  backend "gcs" {
    bucket = "lego-catalog-terraform-state-dev"
    prefix = "terraform/state"
  }
}
```

### `environments/dev/versions.tf`

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}
```

---

## Terraform Backend Setup

### Initial Backend Configuration Script

Create `scripts/init-backend.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Script to initialize Terraform backend (GCS bucket for state)

ENVIRONMENT=$1
PROJECT_ID=$2
REGION=${3:-us-central1}

if [ -z "$ENVIRONMENT" ] || [ -z "$PROJECT_ID" ]; then
    echo "Usage: $0 <environment> <project-id> [region]"
    echo "Example: $0 dev lego-catalog-dev-425916 us-central1"
    exit 1
fi

BUCKET_NAME="lego-catalog-terraform-state-${ENVIRONMENT}"

echo "Creating Terraform state bucket: ${BUCKET_NAME}"

# Create the bucket
gcloud storage buckets create gs://${BUCKET_NAME} \
    --project=${PROJECT_ID} \
    --location=${REGION} \
    --uniform-bucket-level-access

# Enable versioning
gcloud storage buckets update gs://${BUCKET_NAME} \
    --versioning

# Add lifecycle rule to keep only recent versions
cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "numNewerVersions": 5,
          "isLive": false
        }
      }
    ]
  }
}
EOF

gcloud storage buckets update gs://${BUCKET_NAME} \
    --lifecycle-file=/tmp/lifecycle.json

rm /tmp/lifecycle.json

echo "Terraform backend bucket created successfully!"
echo "Bucket: gs://${BUCKET_NAME}"
echo ""
echo "Next steps:"
echo "1. Update environments/${ENVIRONMENT}/backend.tf with this bucket name"
echo "2. Run: cd environments/${ENVIRONMENT} && terraform init"
```

Make it executable:
```bash
chmod +x scripts/init-backend.sh
```

---

## Usage Examples

### Initialize Development Environment

```bash
# Step 1: Create Terraform state bucket
./scripts/init-backend.sh dev lego-catalog-dev-425916

# Step 2: Initialize Terraform
cd environments/dev
terraform init

# Step 3: Create terraform.tfvars file with your values
cat > terraform.tfvars <<EOF
project_id             = "lego-catalog-dev-425916"
region                 = "us-central1"
backend_image          = "gcr.io/lego-catalog-dev-425916/backend:v1.0.0"
frontend_image         = "gcr.io/lego-catalog-dev-425916/frontend:v1.0.0"
app_version            = "v1.0.0"
honeycomb_api_key      = "your-honeycomb-key"
honeycomb_frontend_key = "your-honeycomb-frontend-key"
EOF

# Step 4: Plan
terraform plan

# Step 5: Apply
terraform apply
```

### Update Container Images

```bash
cd environments/dev

# Update variables
terraform apply \
  -var="backend_image=gcr.io/lego-catalog-dev-425916/backend:v1.1.0" \
  -var="app_version=v1.1.0"
```

### Deploy to Production

```bash
# Same process but use environments/prod
./scripts/init-backend.sh prod lego-catalog-prod-425916

cd environments/prod
terraform init

# Create prod terraform.tfvars with production values
terraform plan
terraform apply
```

---

## Best Practices

### 1. Separate State per Environment
- Each environment (dev, prod) has its own state bucket
- Prevents accidental changes to wrong environment
- Allows independent deployment

### 2. Use Workspaces for Feature Branches (Optional)
```bash
terraform workspace new feature-xyz
terraform workspace select feature-xyz
terraform apply
```

### 3. Sensitive Values
Never commit sensitive values to git:
```bash
# Use environment variables
export TF_VAR_honeycomb_api_key="your-key"

# Or use a separate tfvars file (gitignored)
echo "terraform.tfvars" >> .gitignore
```

### 4. Plan Before Apply
Always review changes:
```bash
terraform plan -out=tfplan
terraform apply tfplan
```

### 5. Lock State Files
GCS backend automatically handles locking. Multiple users can't apply simultaneously.

---

**[← Back to Main Deployment Guide](../../CLOUD_DEPLOYMENT_GUIDE.md)**
