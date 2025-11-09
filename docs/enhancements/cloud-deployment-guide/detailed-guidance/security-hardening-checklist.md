# Security Hardening Checklist

**Target Audience:** Solo developers deploying Go + React applications to GCP Cloud Run
**Scope:** OWASP Top 10 mitigations, security scanning, pre-deployment verification

---

## Quick Pre-Deployment Security Checklist

Use this checklist before every production deployment:

- [ ] **Authentication & Authorization**
  - [ ] All API endpoints require authentication (except public routes)
  - [ ] JWT tokens have reasonable expiration (≤24 hours)
  - [ ] Refresh token rotation implemented
  - [ ] Authorization checks verify user permissions for resources

- [ ] **Input Validation**
  - [ ] All user inputs validated on backend (never trust frontend validation)
  - [ ] SQL queries use parameterized statements (no string concatenation)
  - [ ] File uploads validated for type, size, content

- [ ] **Secrets & Configuration**
  - [ ] No secrets in code, environment variables, or logs
  - [ ] Secrets stored in GCP Secret Manager
  - [ ] Service accounts follow least privilege principle

- [ ] **Dependencies**
  - [ ] `go mod tidy && go list -m -u all` shows no critical vulnerabilities
  - [ ] `npm audit` shows no high/critical vulnerabilities
  - [ ] All dependencies from trusted sources only

- [ ] **HTTP Security Headers**
  - [ ] Content-Security-Policy configured
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Strict-Transport-Security (HSTS) enabled

- [ ] **HTTPS & CORS**
  - [ ] All traffic over HTTPS (Cloud Run enforces this)
  - [ ] CORS configured with specific origins (not `*`)
  - [ ] Cookies set with `Secure`, `HttpOnly`, `SameSite=Strict`

- [ ] **Scanning Complete**
  - [ ] `gosec` scan passed
  - [ ] GitHub Dependabot alerts resolved
  - [ ] Container image scanned (Artifact Registry scanning)

---

## OWASP Top 10 for Go + React Applications

### 1. Broken Access Control

**What It Is:** Users can access resources or perform actions they shouldn't be authorized for.

**Go Backend Prevention:**

```go
// ❌ BAD: Only checking authentication, not authorization
func GetUserProfile(w http.ResponseWriter, r *http.Request) {
    userID := mux.Vars(r)["id"]
    // Missing check: Is the authenticated user allowed to view this profile?
    profile := db.GetProfile(userID)
    json.NewEncoder(w).Encode(profile)
}

// ✅ GOOD: Verify the authenticated user owns the resource
func GetUserProfile(w http.ResponseWriter, r *http.Request) {
    requestedUserID := mux.Vars(r)["id"]
    authenticatedUserID := r.Context().Value("userID").(string)

    // Check authorization: user can only access their own profile
    if requestedUserID != authenticatedUserID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    profile := db.GetProfile(requestedUserID)
    json.NewEncoder(w).encode(profile)
}
```

**React Frontend Considerations:**
- Never rely solely on frontend authorization checks
- Hide UI elements for unauthorized actions, but always verify on backend
- Use route guards for basic UX, not security

**Testing:**
- Try accessing other users' resources with valid credentials
- Test horizontal privilege escalation (user A accessing user B's data)
- Test vertical privilege escalation (regular user accessing admin endpoints)

---

### 2. Cryptographic Failures

**What It Is:** Sensitive data exposed due to weak or missing encryption.

**Go Backend Prevention:**

```go
// ✅ Password hashing with bcrypt
import "golang.org/x/crypto/bcrypt"

func HashPassword(password string) (string, error) {
    // Cost 12 provides good security/performance balance
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
    return string(bytes), err
}

func CheckPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}

// ✅ Encrypting sensitive data at rest
import "crypto/aes"
import "crypto/cipher"
import "crypto/rand"

// Use GCP KMS for key management in production
// This example shows the encryption pattern
func EncryptSensitiveData(plaintext []byte, key []byte) ([]byte, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }

    return gcm.Seal(nonce, nonce, plaintext, nil), nil
}
```

**Key Management:**
- Use GCP Secret Manager for API keys, database passwords
- Use GCP Cloud KMS for encryption keys
- Rotate keys regularly (quarterly for solo developer)
- Never commit encryption keys to Git

**Cloud SQL Connection:**
```go
// ✅ Cloud SQL connections use SSL by default
// Verify in connection string:
dsn := fmt.Sprintf("%s:%s@unix(/cloudsql/%s)/%s?parseTime=true",
    dbUser, dbPassword, instanceConnectionName, dbName)
```

**Testing:**
- Verify all database connections use SSL/TLS
- Check that passwords are hashed in database (not plaintext)
- Ensure sensitive data encrypted in Cloud SQL (if using encryption at rest)

---

### 3. Injection (SQL, Command, NoSQL)

**What It Is:** Malicious data sent to interpreters (SQL, shell, etc.) as commands.

**Go Backend Prevention:**

```go
// ❌ BAD: SQL injection vulnerability
func GetUserByEmail(email string) (*User, error) {
    query := "SELECT * FROM users WHERE email = '" + email + "'"
    // Attacker can send: test@example.com' OR '1'='1
    row := db.QueryRow(query)
    // Returns all users!
}

// ✅ GOOD: Parameterized queries
func GetUserByEmail(email string) (*User, error) {
    query := "SELECT id, email, name FROM users WHERE email = ?"
    row := db.QueryRow(query, email)
    // SQL driver escapes email parameter safely

    var user User
    err := row.Scan(&user.ID, &user.Email, &user.Name)
    return &user, err
}

// ❌ BAD: Command injection
func ProcessFile(filename string) error {
    cmd := exec.Command("sh", "-c", "convert " + filename + " output.jpg")
    return cmd.Run()
    // Attacker can send: test.png; rm -rf /
}

// ✅ GOOD: Use argument array, validate input
func ProcessFile(filename string) error {
    // Validate filename against whitelist pattern
    if !regexp.MustCompile(`^[a-zA-Z0-9_-]+\.(png|jpg|jpeg)$`).MatchString(filename) {
        return errors.New("invalid filename")
    }

    // Use argument array (not shell interpretation)
    cmd := exec.Command("convert", filename, "output.jpg")
    return cmd.Run()
}
```

**React Frontend Prevention:**
```javascript
// XSS is a form of injection - covered in detail in Section 7
// Key principle: Never trust user input in SQL/commands
```

**Testing:**
- Use `sqlmap` for SQL injection testing
- Try payloads: `' OR '1'='1`, `'; DROP TABLE users; --`
- Test all user input fields (query params, POST body, headers)
- Run `gosec` scanner: `gosec -exclude=G104 ./...`

---

### 4. Insecure Design

**What It Is:** Missing or ineffective security controls in application design.

**Design Patterns for Security:**

**1. Defense in Depth:**
```
Frontend validation → Backend validation → Database constraints
Authentication → Authorization → Resource ownership check
Rate limiting → Input validation → Output encoding
```

**2. Principle of Least Privilege:**
```go
// ✅ Service account for Cloud SQL connection
// Only has cloudsql.client role, not cloudsql.admin
// Specified in Terraform (see terraform-modules-complete.md)

resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"  // Read/write data only
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}
```

**3. Secure by Default:**
```go
// ✅ Default deny, explicit allow
type APIConfig struct {
    PublicRoutes map[string]bool  // Explicit list of unauthenticated routes
}

func (c *APIConfig) RequiresAuth(path string) bool {
    return !c.PublicRoutes[path]  // Default to requiring auth
}
```

**4. Fail Securely:**
```go
// ❌ BAD: Failure allows access
func CheckPermission(userID, resourceID string) bool {
    allowed, err := db.HasPermission(userID, resourceID)
    if err != nil {
        return true  // ERROR: grants access on database error!
    }
    return allowed
}

// ✅ GOOD: Failure denies access
func CheckPermission(userID, resourceID string) bool {
    allowed, err := db.HasPermission(userID, resourceID)
    if err != nil {
        log.Error("Permission check failed", "error", err)
        return false  // Deny access on error
    }
    return allowed
}
```

**Threat Modeling (Lightweight):**
For solo developer at small scale, informal threat modeling:
1. **What are you protecting?** User data, authentication tokens, API access
2. **Who might attack?** Automated bots, opportunistic attackers, competitors
3. **What are they after?** User credentials, data exfiltration, service disruption
4. **How would they attack?** See OWASP Top 10 - focus on web application attacks
5. **What controls prevent this?** Authentication, input validation, rate limiting, monitoring

**Testing:**
- Review architecture decisions against security principles
- Ensure new features have security requirements defined upfront
- Ask: "How could this be abused?" before implementing

---

### 5. Security Misconfiguration

**What It Is:** Insecure default configurations, incomplete setups, exposed error messages.

**Go Backend Prevention:**

```go
// ❌ BAD: Verbose error messages in production
func GetUser(w http.ResponseWriter, r *http.Request) {
    user, err := db.GetUser(id)
    if err != nil {
        http.Error(w, err.Error(), 500)  // Exposes database schema!
        return
    }
}

// ✅ GOOD: Generic error messages, detailed logging
func GetUser(w http.ResponseWriter, r *http.Request) {
    user, err := db.GetUser(id)
    if err != nil {
        log.Error("Failed to get user", "error", err, "userID", id)
        http.Error(w, "Internal server error", 500)
        return
    }
}

// ✅ Environment-specific configuration
type Config struct {
    Environment string
    Debug       bool
    LogLevel    string
}

func LoadConfig() *Config {
    env := os.Getenv("ENVIRONMENT")
    return &Config{
        Environment: env,
        Debug:       env == "development",  // Never debug in production
        LogLevel:    getLogLevel(env),
    }
}
```

**GCP Cloud Run Security Configuration:**

In your Terraform (see `terraform-modules-complete.md`):
```hcl
resource "google_cloud_run_service" "app" {
  name     = var.service_name
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.cloud_run.email

      containers {
        image = var.container_image

        # Security best practices
        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"  # Prevent resource exhaustion
          }
        }

        # Don't run as root (Cloud Run default is non-root)
        # Set explicit security context if needed
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"  # Prevent runaway costs
        "run.googleapis.com/execution-environment" = "gen2"  # Use second generation
      }
    }
  }
}
```

**HTTP Security Headers:**
```go
func SecurityHeadersMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Prevent clickjacking
        w.Header().Set("X-Frame-Options", "DENY")

        // Prevent MIME type sniffing
        w.Header().Set("X-Content-Type-Options", "nosniff")

        // XSS Protection (legacy but harmless)
        w.Header().Set("X-XSS-Protection", "1; mode=block")

        // Content Security Policy
        w.Header().Set("Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;")

        // HSTS (if using custom domain)
        w.Header().Set("Strict-Transport-Security",
            "max-age=31536000; includeSubDomains")

        // Referrer Policy
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

        next.ServeHTTP(w, r)
    })
}
```

**React Build Configuration:**
```javascript
// In production builds, disable sourcemaps
// package.json scripts:
{
  "scripts": {
    "build": "GENERATE_SOURCEMAP=false react-scripts build"
  }
}
```

**Testing:**
- Use `https://securityheaders.com/` to scan your deployed app
- Run `https://observatory.mozilla.org/` scan
- Verify no debug logs or stack traces exposed in production

---

### 6. Vulnerable and Outdated Components

**What It Is:** Using libraries with known security vulnerabilities.

**Go Dependency Management:**

```bash
# Check for vulnerable dependencies
go list -m -u all

# Update specific dependency
go get -u github.com/gorilla/mux@latest

# Update all dependencies (test thoroughly after)
go get -u ./...
go mod tidy

# Run Go vulnerability scanner
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

**npm Dependency Management:**

```bash
# Check for vulnerabilities
npm audit

# Fix automatically fixable vulnerabilities
npm audit fix

# For vulnerabilities requiring breaking changes
npm audit fix --force  # Test carefully!

# Update specific package
npm update react
npm update react-dom

# Check for outdated packages
npm outdated
```

**Automated Scanning in GitHub Actions:**

```yaml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Go vulnerability scanning
      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Run govulncheck
        run: |
          go install golang.org/x/vuln/cmd/govulncheck@latest
          govulncheck ./...

      # npm vulnerability scanning
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: npm audit
        working-directory: ./frontend
        run: npm audit --audit-level=high
```

**Dependabot Configuration:**

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  # Go modules
  - package-ecosystem: "gomod"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  # npm packages
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5

  # Docker base images
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
```

**Container Base Image Security:**

```dockerfile
# ✅ Use specific version tags, not latest
FROM golang:1.21.5-alpine AS builder

# ✅ Use minimal base image for runtime
FROM alpine:3.19
RUN apk --no-cache add ca-certificates

# ✅ Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/server /app/server
CMD ["/app/server"]
```

**GCP Artifact Registry Scanning:**

Artifact Registry automatically scans container images for vulnerabilities. Enable in Terraform:

```hcl
resource "google_artifact_registry_repository" "docker_repo" {
  location      = var.region
  repository_id = "lego-catalog"
  format        = "DOCKER"

  # Vulnerability scanning enabled by default
  # View results in GCP Console → Artifact Registry → [image] → Vulnerabilities
}
```

**Maintenance Schedule for Solo Developer:**

- **Weekly:** Review Dependabot PRs, merge non-breaking updates
- **Monthly:** Run `npm audit` and `govulncheck` manually, update major versions if needed
- **Quarterly:** Review all dependencies, remove unused packages, update base images

**Testing:**
- Enable GitHub security alerts (Settings → Security & analysis → Dependabot alerts)
- Review Artifact Registry vulnerability scans before deploying images
- Set up Slack/email notifications for high-severity vulnerabilities

---

### 7. Identification and Authentication Failures

**What It Is:** Broken authentication, session management, credential recovery.

**Go Backend - JWT Authentication:**

```go
import "github.com/golang-jwt/jwt/v5"

type Claims struct {
    UserID string `json:"user_id"`
    Email  string `json:"email"`
    jwt.RegisteredClaims
}

// ✅ Secure JWT configuration
func GenerateToken(userID, email string, secret []byte) (string, error) {
    claims := Claims{
        UserID: userID,
        Email:  email,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),  // Short expiry
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            NotBefore: jwt.NewNumericDate(time.Now()),
            Issuer:    "lego-catalog",
            Subject:   userID,
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(secret)
}

// ✅ Validate token with proper error handling
func ValidateToken(tokenString string, secret []byte) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        // Verify signing algorithm
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
        }
        return secret, nil
    })

    if err != nil {
        return nil, err
    }

    if claims, ok := token.Claims.(*Claims); ok && token.Valid {
        return claims, nil
    }

    return nil, errors.New("invalid token")
}

// ✅ Refresh token pattern (store in database)
type RefreshToken struct {
    Token     string    `db:"token"`
    UserID    string    `db:"user_id"`
    ExpiresAt time.Time `db:"expires_at"`
    Used      bool      `db:"used"`
}

func GenerateRefreshToken(userID string) (*RefreshToken, error) {
    tokenBytes := make([]byte, 32)
    if _, err := rand.Read(tokenBytes); err != nil {
        return nil, err
    }

    return &RefreshToken{
        Token:     base64.URLEncoding.EncodeToString(tokenBytes),
        UserID:    userID,
        ExpiresAt: time.Now().Add(30 * 24 * time.Hour),  // 30 days
        Used:      false,
    }, nil
}
```

**Password Requirements:**

```go
import "unicode"

// ✅ Reasonable password validation (not excessive)
func ValidatePassword(password string) error {
    if len(password) < 12 {
        return errors.New("password must be at least 12 characters")
    }

    var (
        hasUpper   bool
        hasLower   bool
        hasNumber  bool
        hasSpecial bool
    )

    for _, char := range password {
        switch {
        case unicode.IsUpper(char):
            hasUpper = true
        case unicode.IsLower(char):
            hasLower = true
        case unicode.IsDigit(char):
            hasNumber = true
        case unicode.IsPunct(char) || unicode.IsSymbol(char):
            hasSpecial = true
        }
    }

    if !hasUpper || !hasLower || !hasNumber || !hasSpecial {
        return errors.New("password must contain uppercase, lowercase, number, and special character")
    }

    return nil
}

// ✅ Check against common passwords
// Use a library like github.com/wagslane/go-password-validator
// or maintain a list of top 10,000 common passwords
```

**React Frontend - Secure Token Storage:**

```javascript
// ❌ BAD: Storing JWT in localStorage (vulnerable to XSS)
localStorage.setItem('token', jwt);

// ✅ BETTER: HttpOnly cookie (set by backend, inaccessible to JavaScript)
// Backend sets cookie:
http.SetCookie(w, &http.Cookie{
    Name:     "access_token",
    Value:    token,
    Path:     "/",
    HttpOnly: true,  // Prevents JavaScript access
    Secure:   true,  // HTTPS only
    SameSite: http.SameSiteStrictMode,  // CSRF protection
    MaxAge:   86400,  // 24 hours
})

// Frontend automatically sends cookie with requests
// No JavaScript storage needed!
```

**Rate Limiting for Authentication:**

```go
import "golang.org/x/time/rate"

// ✅ Rate limit login attempts
type LoginRateLimiter struct {
    limiters map[string]*rate.Limiter
    mu       sync.RWMutex
}

func NewLoginRateLimiter() *LoginRateLimiter {
    return &LoginRateLimiter{
        limiters: make(map[string]*rate.Limiter),
    }
}

func (l *LoginRateLimiter) GetLimiter(ip string) *rate.Limiter {
    l.mu.Lock()
    defer l.mu.Unlock()

    limiter, exists := l.limiters[ip]
    if !exists {
        // Allow 5 login attempts per 15 minutes
        limiter = rate.NewLimiter(rate.Every(3*time.Minute), 5)
        l.limiters[ip] = limiter
    }

    return limiter
}

func LoginHandler(rateLimiter *LoginRateLimiter) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        ip := getClientIP(r)
        limiter := rateLimiter.GetLimiter(ip)

        if !limiter.Allow() {
            http.Error(w, "Too many login attempts", http.StatusTooManyRequests)
            return
        }

        // Process login...
    }
}
```

**Multi-Factor Authentication (Future Consideration):**

For 100-1000 users, MFA may not be required yet, but consider:
- **TOTP (Time-based One-Time Password):** Use library like `github.com/pquerna/otp`
- **Backup codes:** Generate one-time use codes for account recovery
- **Optional MFA:** Allow users to opt-in rather than forcing all users

**Testing:**
- Test account lockout after failed login attempts
- Verify password reset tokens expire after use
- Test session timeout (should require re-authentication)
- Verify tokens are invalidated on logout
- Test concurrent sessions (decide if allowed or not)

---

### 8. Software and Data Integrity Failures

**What It Is:** Insecure CI/CD pipelines, unsigned code, insecure deserialization.

**CI/CD Pipeline Security:**

```yaml
# ✅ Secure GitHub Actions workflow
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    # Use environment protection rules
    environment:
      name: production
      url: https://lego-catalog.example.com

    permissions:
      contents: read
      id-token: write  # For Workload Identity Federation

    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false  # Don't persist GitHub token

      # ✅ Verify dependencies haven't been tampered with
      - name: Verify Go module checksums
        run: go mod verify

      - name: Verify npm package integrity
        working-directory: ./frontend
        run: npm ci --prefer-offline

      # ✅ Build with reproducible builds
      - name: Build backend
        run: |
          CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
          go build -trimpath -ldflags="-s -w" -o server

      # ✅ Sign container image (future enhancement)
      # Consider using cosign for image signing
      # - name: Sign container image
      #   run: cosign sign --key cosign.key $IMAGE
```

**Dependency Lock Files:**

```bash
# ✅ Go: go.sum ensures integrity
go mod verify  # Verifies downloaded modules match go.sum

# ✅ npm: package-lock.json ensures integrity
npm ci  # Installs exact versions from package-lock.json (not package.json)
```

**Secure Deserialization:**

```go
// ❌ BAD: Deserializing untrusted data without validation
func HandleWebhook(w http.ResponseWriter, r *http.Request) {
    var payload map[string]interface{}
    json.NewDecoder(r.Body).Decode(&payload)

    // Dangerous: directly using payload without validation
    command := payload["command"].(string)
    exec.Command("sh", "-c", command).Run()  // Command injection!
}

// ✅ GOOD: Validate structure and content
type WebhookPayload struct {
    Event     string `json:"event"`
    Timestamp int64  `json:"timestamp"`
    Data      string `json:"data"`
}

func HandleWebhook(w http.ResponseWriter, r *http.Request) {
    var payload WebhookPayload

    // Decode into typed struct
    if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // Validate fields
    if payload.Event == "" {
        http.Error(w, "Missing event field", http.StatusBadRequest)
        return
    }

    // Validate against allowed events
    allowedEvents := map[string]bool{"user.created": true, "user.updated": true}
    if !allowedEvents[payload.Event] {
        http.Error(w, "Invalid event type", http.StatusBadRequest)
        return
    }

    // Process safely...
}
```

**Container Image Integrity:**

```dockerfile
# ✅ Use specific digest hashes for base images
FROM golang:1.21.5-alpine@sha256:abc123... AS builder

# Package verification
RUN apk add --no-cache ca-certificates && \
    apk --verify verify ca-certificates
```

**Testing:**
- Run `go mod verify` in CI/CD before every build
- Use `npm ci` instead of `npm install` in CI/CD
- Verify GitHub Actions workflows use pinned versions (`@v4` not `@main`)
- Enable GitHub Actions security features (require approval for first-time contributors)

---

### 9. Security Logging and Monitoring Failures

**What It Is:** Insufficient logging, monitoring, or alerting for security events.

**What to Log:**

```go
import "github.com/rs/zerolog/log"

// ✅ Log authentication events
func LoginHandler(w http.ResponseWriter, r *http.Request) {
    email := r.FormValue("email")
    ip := getClientIP(r)

    user, err := authenticateUser(email, password)
    if err != nil {
        log.Warn().
            Str("email", email).
            Str("ip", ip).
            Str("user_agent", r.UserAgent()).
            Msg("Failed login attempt")

        http.Error(w, "Invalid credentials", http.StatusUnauthorized)
        return
    }

    log.Info().
        Str("user_id", user.ID).
        Str("email", email).
        Str("ip", ip).
        Msg("Successful login")

    // Generate token...
}

// ✅ Log authorization failures
func GetResource(w http.ResponseWriter, r *http.Request) {
    resourceID := mux.Vars(r)["id"]
    userID := r.Context().Value("userID").(string)

    if !hasPermission(userID, resourceID) {
        log.Warn().
            Str("user_id", userID).
            Str("resource_id", resourceID).
            Str("action", "read").
            Msg("Authorization denied")

        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    // Return resource...
}

// ✅ Log data modifications
func UpdateUser(w http.ResponseWriter, r *http.Request) {
    userID := mux.Vars(r)["id"]
    var updates UserUpdates
    json.NewDecoder(r.Body).Decode(&updates)

    log.Info().
        Str("user_id", userID).
        Str("updated_by", r.Context().Value("userID").(string)).
        Interface("changes", updates).
        Msg("User profile updated")

    // Update database...
}
```

**What NOT to Log:**

```go
// ❌ NEVER log sensitive data
log.Info().
    Str("password", password).  // NEVER!
    Str("credit_card", ccNumber).  // NEVER!
    Str("ssn", ssn).  // NEVER!
    Msg("User registered")

// ✅ Log safe metadata only
log.Info().
    Str("user_id", userID).
    Str("email", email).  // Email is okay (not a secret)
    Msg("User registered")
```

**Honeycomb Integration for Security Events:**

```go
import "github.com/honeycombio/beeline-go"

func LoginHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Add security event fields to trace
    beeline.AddField(ctx, "auth.event", "login_attempt")
    beeline.AddField(ctx, "auth.email", email)
    beeline.AddField(ctx, "auth.ip", getClientIP(r))
    beeline.AddField(ctx, "auth.user_agent", r.UserAgent())

    user, err := authenticateUser(email, password)
    if err != nil {
        beeline.AddField(ctx, "auth.success", false)
        beeline.AddField(ctx, "auth.failure_reason", err.Error())

        // This will be queryable in Honeycomb!
        // Query: auth.event = "login_attempt" AND auth.success = false
    } else {
        beeline.AddField(ctx, "auth.success", true)
        beeline.AddField(ctx, "auth.user_id", user.ID)
    }
}
```

**Security Alerts in Honeycomb:**

Create alerts for:

1. **Failed Login Spike:**
   - Query: `COUNT` where `auth.success = false`
   - Threshold: >10 failures in 5 minutes from same IP
   - Action: Email alert

2. **Authorization Failures:**
   - Query: `COUNT` where `http.status = 403`
   - Threshold: >20 in 10 minutes
   - Action: Email alert (possible attack attempt)

3. **Unusual Data Access:**
   - Query: `COUNT` where `action = "read" AND user_id != resource.owner_id`
   - Threshold: >50 in 1 hour
   - Action: Review (possible data enumeration attack)

**GCP Cloud Logging Filters:**

Create log-based metrics in Cloud Logging:

```
# Failed authentication attempts
resource.type="cloud_run_revision"
jsonPayload.msg="Failed login attempt"

# Authorization denied events
resource.type="cloud_run_revision"
jsonPayload.msg="Authorization denied"
```

Then create alerts on these metrics (see Cloud Monitoring section).

**Log Retention:**

- **Application Logs:** 30 days in Cloud Logging (balance cost vs. investigation needs)
- **Security Logs:** 90 days (authentication failures, authorization denials)
- **Audit Logs:** 365 days (data modifications, admin actions)

Configure in Terraform:
```hcl
resource "google_logging_project_bucket_config" "security_logs" {
  project        = var.project_id
  location       = "global"
  retention_days = 90
  bucket_id      = "security-logs"
}
```

**Testing:**
- Verify failed logins are logged
- Verify authorization failures are logged
- Test that sensitive data (passwords, tokens) are NOT in logs
- Verify Honeycomb receives security events
- Test alerts trigger on suspicious patterns

---

### 10. Server-Side Request Forgery (SSRF)

**What It Is:** Application makes requests to unintended internal/external resources.

**Go Backend Prevention:**

```go
import "net/url"

// ❌ BAD: Fetching user-supplied URL without validation
func FetchUserAvatar(w http.ResponseWriter, r *http.Request) {
    avatarURL := r.FormValue("avatar_url")

    // Attacker can send: http://169.254.169.254/latest/meta-data/
    // (GCP metadata endpoint!)
    resp, _ := http.Get(avatarURL)
    // Exposes internal metadata, secrets, etc.
}

// ✅ GOOD: Validate and restrict allowed domains
func FetchUserAvatar(w http.ResponseWriter, r *http.Request) {
    avatarURL := r.FormValue("avatar_url")

    // Parse URL
    parsed, err := url.Parse(avatarURL)
    if err != nil {
        http.Error(w, "Invalid URL", http.StatusBadRequest)
        return
    }

    // Whitelist allowed domains
    allowedDomains := map[string]bool{
        "gravatar.com": true,
        "githubusercontent.com": true,
    }

    if !allowedDomains[parsed.Host] {
        http.Error(w, "Domain not allowed", http.StatusBadRequest)
        return
    }

    // Ensure HTTPS
    if parsed.Scheme != "https" {
        http.Error(w, "HTTPS required", http.StatusBadRequest)
        return
    }

    // Prevent access to internal IPs
    if isInternalIP(parsed.Host) {
        http.Error(w, "Internal IPs not allowed", http.StatusBadRequest)
        return
    }

    // Fetch safely
    resp, err := http.Get(avatarURL)
    // ... handle response
}

func isInternalIP(host string) bool {
    // Check for localhost
    if host == "localhost" || host == "127.0.0.1" || host == "::1" {
        return true
    }

    // Check for private IP ranges
    ip := net.ParseIP(host)
    if ip == nil {
        // Try resolving hostname
        ips, err := net.LookupIP(host)
        if err != nil || len(ips) == 0 {
            return false
        }
        ip = ips[0]
    }

    // Check if IP is in private ranges
    privateRanges := []string{
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "169.254.0.0/16",  // GCP metadata endpoint!
        "fd00::/8",
    }

    for _, cidr := range privateRanges {
        _, subnet, _ := net.ParseCIDR(cidr)
        if subnet.Contains(ip) {
            return true
        }
    }

    return false
}
```

**Protecting GCP Metadata Endpoint:**

Cloud Run services can access GCP metadata endpoint at `http://metadata.google.internal/` (169.254.169.254). This exposes service account tokens!

```go
// ✅ Block metadata endpoint in HTTP client
func NewSafeHTTPClient() *http.Client {
    return &http.Client{
        Transport: &http.Transport{
            DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
                // Parse address
                host, _, _ := net.SplitHostPort(addr)

                // Block metadata endpoints
                if host == "169.254.169.254" || host == "metadata.google.internal" {
                    return nil, errors.New("access to metadata endpoint blocked")
                }

                // Block internal IPs
                if isInternalIP(host) {
                    return nil, errors.New("access to internal IP blocked")
                }

                // Allow other connections
                dialer := &net.Dialer{}
                return dialer.DialContext(ctx, network, addr)
            },
        },
        Timeout: 10 * time.Second,
    }
}

// Use this client for all external requests
var safeClient = NewSafeHTTPClient()
```

**Webhook URL Validation:**

If your app sends webhooks to user-configured URLs:

```go
type WebhookConfig struct {
    URL    string
    Events []string
}

func ValidateWebhookURL(webhookURL string) error {
    parsed, err := url.Parse(webhookURL)
    if err != nil {
        return err
    }

    // Require HTTPS
    if parsed.Scheme != "https" {
        return errors.New("webhook URL must use HTTPS")
    }

    // Block internal IPs
    if isInternalIP(parsed.Host) {
        return errors.New("webhook URL cannot point to internal resources")
    }

    // Block well-known dangerous ports
    dangerousPorts := map[string]bool{
        "22": true,   // SSH
        "25": true,   // SMTP
        "3306": true, // MySQL
        "5432": true, // PostgreSQL
    }

    if dangerousPorts[parsed.Port()] {
        return errors.New("webhook port not allowed")
    }

    return nil
}
```

**Testing:**
- Try fetching `http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token`
- Try fetching `http://localhost:8080`
- Try fetching internal IP addresses
- Verify DNS rebinding protection (URL validation happens AFTER DNS resolution)

---

## Security Scanning Tools

### Go Security Scanner (gosec)

Install and run:
```bash
# Install
go install github.com/securego/gosec/v2/cmd/gosec@latest

# Run scan
gosec ./...

# Run with specific rules
gosec -exclude=G104 ./...  # Exclude unhandled errors (if you have error handling strategy)

# Generate JSON report
gosec -fmt=json -out=results.json ./...
```

Common issues gosec finds:
- **G101:** Hardcoded credentials
- **G201:** SQL injection vulnerabilities
- **G204:** Command injection (subprocess with variable)
- **G401:** Weak crypto (MD5, SHA1)
- **G402:** TLS version too low
- **G304:** File path injection

### npm Security Scanner

```bash
# Audit dependencies
npm audit

# Audit with different severity levels
npm audit --audit-level=moderate  # Only show moderate and above
npm audit --audit-level=high      # Only show high and critical

# Generate detailed report
npm audit --json > audit-results.json

# Audit specific package
npm audit --package=react
```

### OWASP ZAP (Dynamic Testing)

For dynamic application security testing (DAST):

```bash
# Pull OWASP ZAP Docker image
docker pull zaproxy/zap-stable

# Run baseline scan against your deployed app
docker run -t zaproxy/zap-stable zap-baseline.py \
  -t https://your-app.run.app \
  -r zap-report.html

# Full scan (more thorough, takes longer)
docker run -t zaproxy/zap-stable zap-full-scan.py \
  -t https://your-app.run.app \
  -r zap-report.html
```

Run ZAP scans:
- **Before initial production deployment:** Full scan
- **After major features:** Baseline scan
- **Monthly:** Automated baseline scan

### GCP Security Command Center (Future)

Security Command Center is GCP's security management tool. Free tier available:

- Container vulnerability scanning (included with Artifact Registry)
- Web Security Scanner (basic tier free)
- Security Health Analytics

Enable in Terraform:
```hcl
resource "google_security_scanner_scan_config" "web_scan" {
  display_name = "lego-catalog-scan"
  starting_urls = ["https://your-app.run.app/"]

  schedule {
    schedule_time = "0 0 * * 0"  # Weekly on Sunday
  }

  authentication {
    # Configure if app requires authentication
  }
}
```

---

## Security Incident Response Plan

Even with preventive measures, have a plan for security incidents.

### Incident Detection

Monitor for:
- Spike in failed authentication attempts (>100/minute)
- Spike in 403 Forbidden responses (>50/minute)
- Unusual database query patterns (slow query log)
- Honeycomb alerts for error rate increases
- GCP alerts for resource exhaustion

### Response Procedure (Solo Developer)

**1. Assess Severity (5 minutes):**
- Is user data at risk? (HIGH)
- Is the service down? (MEDIUM)
- Is it just suspicious activity? (LOW)

**2. Immediate Actions:**

**If data breach suspected:**
```bash
# Rotate all secrets immediately
gcloud secrets versions add db-password --data-file=new-password.txt

# Invalidate all user sessions (implementation-dependent)
# Option: Clear session table, require all users to re-login

# Review recent database changes
# Check Cloud SQL logs for unusual queries
```

**If service compromised:**
```bash
# Roll back to last known good deployment
gcloud run services update-traffic lego-catalog \
  --to-revisions=lego-catalog-v123=100

# Block malicious IPs (if identified)
# Via Cloud Armor (requires setup - see network-architecture.md)
```

**3. Investigation (1-2 hours):**
- Review Honeycomb traces for suspicious patterns
- Check Cloud Logging for authentication failures
- Review recent deployments (was vulnerability introduced recently?)
- Check Dependabot alerts (was a vulnerable dependency exploited?)

**4. Remediation:**
- Deploy fix
- Update secrets/credentials
- Notify affected users (if data exposed)

**5. Post-Incident:**
- Document what happened, how detected, how fixed
- Update security checklist with new preventive measure
- Consider additional monitoring/alerting

### Communication Template

If user data was compromised, send email:

```
Subject: Security Update for [Your App Name]

We recently identified a security issue that may have affected your account.

What happened: [Brief description]
What data was affected: [Specific data types]
What we've done: [Remediation steps]
What you should do: [User actions, e.g., reset password]

We take security seriously and have implemented additional measures
to prevent this from happening again.

If you have questions, please contact [email].
```

---

## Security Checklist by Deployment Phase

### Before First Production Deployment

- [ ] All OWASP Top 10 mitigations reviewed and implemented
- [ ] Security headers configured (`/securityheaders.com` scan passing)
- [ ] Secrets in GCP Secret Manager (none in code/environment variables)
- [ ] `gosec` scan passing with no high-severity issues
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] HTTPS enforced (Cloud Run does this automatically)
- [ ] Authentication and authorization tested thoroughly
- [ ] Rate limiting implemented on authentication endpoints
- [ ] Dependabot enabled and configured
- [ ] GCP Artifact Registry vulnerability scanning enabled
- [ ] Security logging implemented (auth events, authorization failures)
- [ ] Honeycomb alerts configured for security events

### Every Deployment

- [ ] `go mod verify` passed
- [ ] `gosec ./...` passed
- [ ] `npm audit` passed (or known issues documented)
- [ ] No secrets added to code (grep for common patterns)
- [ ] Database migrations are backward-compatible
- [ ] Deployment tested in dev environment first

### Monthly Security Review

- [ ] Review and merge Dependabot PRs
- [ ] Check for new vulnerabilities in Go dependencies (`govulncheck ./...`)
- [ ] Review Honeycomb for unusual authentication patterns
- [ ] Review GCP IAM permissions (any unnecessary access grants?)
- [ ] Check Cloud SQL user accounts (remove unused accounts)
- [ ] Review failed login attempts in logs (any suspicious IPs?)

### Quarterly Security Tasks

- [ ] Rotate database passwords
- [ ] Rotate API keys and secrets
- [ ] Update base Docker images to latest versions
- [ ] Run OWASP ZAP full scan
- [ ] Review all service account permissions
- [ ] Update security dependencies to latest major versions (Go, npm packages)
- [ ] Review and update password validation requirements if needed

---

## Additional Resources

### Official Documentation
- [OWASP Top 10 - 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Go Security Policy](https://go.dev/security/)
- [GCP Security Best Practices](https://cloud.google.com/security/best-practices)

### Tools
- [gosec - Go Security Checker](https://github.com/securego/gosec)
- [OWASP ZAP - Web App Scanner](https://www.zaproxy.org/)
- [govulncheck - Go Vulnerability Scanner](https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck)

### Learning
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security) (free, excellent)

---

## Notes for Future Enhancements

As your application grows beyond 1000 users, consider:

- **Web Application Firewall (WAF):** GCP Cloud Armor for DDoS protection and WAF rules
- **Content Security Policy (CSP) Reporting:** Monitor CSP violations
- **Security Information and Event Management (SIEM):** Chronicle (GCP's SIEM) for advanced threat detection
- **Penetration Testing:** Annual third-party security audit
- **Bug Bounty Program:** HackerOne or similar platform
- **Multi-Factor Authentication (MFA):** TOTP-based authentication for sensitive operations
- **API Rate Limiting:** More sophisticated rate limiting (per-user, per-endpoint)
- **Database Encryption at Rest:** Cloud SQL customer-managed encryption keys (CMEK)

---

*This security hardening checklist is a living document. Update it as you encounter new security considerations or as the threat landscape evolves.*
