# Getting Started with Domo Schema Registry

This guide will help you set up and run the Domo Schema Registry for local development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Health Check Endpoints](#health-check-endpoints)
- [Production Deployment](#production-deployment)

---

## Prerequisites

### Required Software

- **Node.js** ≥18.0.0 ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

### Recommended Tools

- **Visual Studio Code** with extensions:
  - ESLint
  - TypeScript
  - Prettier
- **Modern browser** (Chrome, Firefox, Edge, Safari)

### System Requirements

- **3 Available Ports**: 8789 (Backend), 1999 (Real-time), 5173 (Frontend)
- **Disk Space**: ~500MB for dependencies
- **RAM**: 2GB minimum

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SchemaMinder
```

### 2. Run Setup

```bash
npm run setup
```

This interactive script will:
- Check your environment (Node version, ports, dependencies)
- Create your personal `.env.local` file
- Prompt for admin credentials
- Handle port conflicts
- Install dependencies
- Generate PegJS parser
- Verify TypeScript compilation

### 3. Start Development Servers

```bash
npm run start:all
```

This enhanced orchestration script:
- ✅ Checks port availability before starting
- ✅ Starts all three servers in parallel
- ✅ Performs health checks to verify readiness
- ✅ Provides colored output for each server
- ✅ Displays clear "All servers ready!" message
- ✅ Gracefully shuts down all servers on Ctrl+C

**Servers started**:
- Backend API (Cloudflare Worker) on port 8789
- Real-time server (PartyKit) on port 1999
- Frontend (React + Vite) on port 5173

**Simple alternative** (without health checks):
```bash
npm run start:all:simple
```

### 4. Open in Browser

Navigate to [http://localhost:5173](http://localhost:5173)

### 5. Setup Database and Create Admin User

In a separate terminal (while servers are running):

```bash
npm run setup:database
```

This comprehensive script:
1. ✅ Checks if backend is running
2. ✅ Initializes database schema
3. ✅ Verifies database access
4. ✅ Prompts for admin credentials interactively
5. ✅ Registers admin user
6. ✅ Attempts to assign admin role
7. ✅ Verifies admin can login

**Alternative - Manual steps:**
```bash
# Initialize database only
npm run init:database

# Create admin user separately
npm run create:admin admin@example.com YourSecurePassword "Admin Name"
```

---

## Environment Configuration

### File Structure

The project uses multiple environment files for different purposes:

| File | Committed to Git? | Purpose |
|------|------------------|---------|
| `.env` | ✅ Yes | Base defaults for all environments |
| `.env.development` | ✅ Yes | Shared development team defaults |
| `.env.production` | ✅ Yes | Production template/documentation |
| `.env.local` | ❌ No | **Your personal settings** (git-ignored) |

### Load Priority

When the application starts, environment variables are loaded in this order (later overrides earlier):

```
1. .env                 ← Base defaults (lowest priority)
2. .env.development     ← Dev team defaults
3. .env.local           ← YOUR settings (highest priority, git-ignored)
```

### `.env` (Base Configuration)

**Purpose**: Default values shared across ALL environments

**Committed to git**: ✅ Yes

**Contents**:
```bash
# Server Ports
WRANGLER_PORT=8789
PARTYKIT_PORT=1999
VITE_PORT=5173

# Node Environment
NODE_ENV=development

# Multi-Tenant Configuration
TENANT_ID=default-tenant
REGISTRY_ID=default-registry
```

### `.env.development` (Development Defaults)

**Purpose**: Settings shared by all developers on the team

**Committed to git**: ✅ Yes

**Contents**:
```bash
# API Configuration
API_URL=http://localhost:8789
VITE_API_URL=http://localhost:8789

# Real-time Server
PARTYKIT_URL=http://localhost:1999
VITE_PARTYKIT_URL=http://localhost:1999

# Admin credentials (PLACEHOLDERS - set real values in .env.local)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=ChangeMe123!
ADMIN_FULL_NAME=Administrator
```

### `.env.local` (Your Personal Settings)

**Purpose**: YOUR machine-specific settings and credentials

**Committed to git**: ❌ No (git-ignored for security)

**Created by**: `npm run setup` (interactively)

**When to use**:
- Custom admin credentials
- Non-standard ports (if 8789/1999/5173 are in use)
- Personal database paths
- Local API keys for testing

**Example**:
```bash
# Your personal admin credentials
ADMIN_EMAIL=me@mycompany.com
ADMIN_PASSWORD=MySecurePassword123!
ADMIN_FULL_NAME=John Doe

# Custom ports (if standard ports are in use)
API_URL=http://localhost:8790
VITE_API_URL=http://localhost:8790
WRANGLER_PORT=8790

PARTYKIT_URL=http://localhost:2000
VITE_PARTYKIT_URL=http://localhost:2000
PARTYKIT_PORT=2000

VITE_PORT=5174
```

### `.env.production` (Production Template)

**Purpose**: Documentation and template for production deployment

**Committed to git**: ✅ Yes (but only as documentation)

**Actual production values set via**:
- Cloudflare dashboard environment variables
- `wrangler.toml` [vars] section
- `npx wrangler secret put` for sensitive values

**Contents** (template/documentation only):
```bash
# Production URLs
API_URL=https://schema-registry.yourdomain.com
VITE_API_URL=https://schema-registry.yourdomain.com
PARTYKIT_URL=https://realtime.yourdomain.com
VITE_PARTYKIT_URL=https://realtime.yourdomain.com

# Production tenant/registry
TENANT_ID=production-tenant
REGISTRY_ID=main-registry

# Secrets (SET VIA: npx wrangler secret put)
# ADMIN_PASSWORD=<set-via-wrangler-secret>
# DATABASE_ENCRYPTION_KEY=<set-via-wrangler-secret>
```

---

## Development Workflow

### Daily Development

#### Option A: Start All Servers (Recommended)

```bash
npm run start:all
```

**What happens**:
1. Pre-flight checks verify ports are available
2. All three servers start in parallel
3. Health checks wait for each server to be ready
4. Clear confirmation message when all servers are up
5. Press Ctrl+C to gracefully shut down all servers

**Output example**:
```
╔════════════════════════════════════════════════════════════╗
║         Domo Schema Registry - Multi-Server Start          ║
╚════════════════════════════════════════════════════════════╝

Multi-Server Startup - Pre-flight Checks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Backend   ] ✓ Port 8789 available
[PartyKit  ] ✓ Port 1999 available
[Frontend  ] ✓ Port 5173 available

Starting all servers...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Backend   ] Starting...
[PartyKit  ] Starting...
[Frontend  ] Starting...
[Backend   ] ✓ Ready on port 8789
[PartyKit  ] ✓ Ready on port 1999
[Frontend  ] ✓ Ready on port 5173

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ All servers are ready!

Application URLs:
  Frontend:  http://localhost:5173
  Backend:   http://localhost:8789
  Real-time: http://localhost:1999

Press Ctrl+C to stop all servers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Simple alternative** (basic concurrently, no health checks):
```bash
npm run start:all:simple
```

#### Option B: Start Servers Individually

If you prefer separate terminal windows for each server:

```bash
# Terminal 1: Backend API
npx wrangler dev --port 8789

# Terminal 2: Real-time server
npx partykit dev --port 1999

# Terminal 3: Frontend
npm run dev
```

### Running Tests

```bash
# Watch mode (runs tests on file changes)
npm run test

# Run once
npm run test:run

# With coverage report
npm run test:coverage

# Open coverage report in browser
npm run coverage:open

# Interactive UI
npm run test:ui
```

### Code Quality Checks

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Complexity analysis
npm run complexity
npm run complexity:open  # Opens HTML report
```

### Database Operations

```bash
# Complete database setup (recommended - interactive)
npm run setup:database

# Or manual steps:
npm run init:database          # Initialize database only
npm run create:admin <email> <password> "<full-name>"  # Create admin separately

# Example:
npm run create:admin admin@example.com MyPass123! "Admin User"

# Non-interactive mode (for CI/CD):
node scripts/setup-database.js --non-interactive \
  --admin-email=admin@example.com \
  --admin-password=SecurePass123! \
  --admin-name="Administrator"
```

### Building for Production

```bash
# Build frontend
npm run build

# Deploy Worker
npx wrangler deploy
```

---

## Troubleshooting

### Run Verification Script ⭐

The fastest way to diagnose issues is to run the verification script:

```bash
npm run verify
```

This comprehensive "doctor" command checks:
- ✅ Environment configuration files
- ✅ Dependencies and generated files
- ✅ Server health (all 3 servers)
- ✅ API connectivity and database
- ✅ Real-time WebSocket connection
- ✅ TypeScript compilation

**Quick mode** (skips slow checks):
```bash
npm run verify:quick
```

**Verbose mode** (detailed output for debugging):
```bash
node scripts/verify-setup.js --verbose
```

The verification script will provide actionable recommendations for any issues found.

---

### Port Conflicts

**Problem**: Ports 8789, 1999, or 5173 are already in use

**Solution 1** (Recommended): Free up the ports

```bash
# Find what's using a port (Linux/Mac)
lsof -i :8789
lsof -i :1999
lsof -i :5173

# Find what's using a port (Windows)
netstat -ano | findstr :8789
```

**Solution 2**: Use alternative ports

Run `npm run setup` again and choose option (o) to override with custom ports.

Or manually edit `.env.local`:

```bash
API_URL=http://localhost:8790
VITE_API_URL=http://localhost:8790
WRANGLER_PORT=8790

PARTYKIT_URL=http://localhost:2000
VITE_PARTYKIT_URL=http://localhost:2000
PARTYKIT_PORT=2000

VITE_PORT=5174
```

### TypeScript Errors

**Problem**: `npm run setup` shows TypeScript compilation errors

**Answer**: This is normal during active development!

- The application **will still build and run** correctly
- Vite uses esbuild which is more lenient than `tsc`
- TypeScript errors are warnings, not blockers
- Run `npm run typecheck` to see all errors when ready to fix them

### Admin User Creation Fails

**Problem**: `npm run create:admin` returns an error

**Common causes**:

1. **Backend not running**
   ```bash
   # Start backend first
   npx wrangler dev --port 8789
   ```

2. **Wrong port in .env.local**
   ```bash
   # Check your .env.local has correct API_URL
   cat .env.local | grep API_URL
   ```

3. **User already exists**
   - The endpoint returns error if user already registered
   - Try logging in instead

### Database Not Initialized

**Problem**: API returns 404 or "not found" errors

**Solution**:

```bash
# Manually initialize database
npm run init:database

# Or just access any API endpoint - it auto-initializes
```

### Real-time Updates Not Working

**Problem**: Changes in one browser window don't appear in another

**Checklist**:

1. **PartyKit server running?**
   ```bash
   # Check if port 1999 is listening
   lsof -i :1999   # Linux/Mac
   netstat -ano | findstr :1999   # Windows
   ```

2. **Correct URL in .env.local?**
   ```bash
   # Should match where PartyKit is actually running
   cat .env.local | grep PARTYKIT_URL
   ```

3. **WebSocket connection blocked?**
   - Check browser console for WebSocket errors
   - Check firewall/antivirus settings

### Clean Install

If nothing works, try a clean install:

```bash
# Remove all generated files
rm -rf node_modules/
rm -rf dist/
rm -rf .wrangler/
rm -f package-lock.json

# Delete environment (keep .env.local if you want to preserve settings)
rm -f .env.local

# Reinstall
npm run setup
```

---

## Health Check Endpoints

The Schema Registry provides health check endpoints for monitoring and load balancing.

### Available Endpoints

#### 1. Worker Health Check (Lightweight)

**Endpoints:**
- `GET /health`
- `GET /schema-registry/health`

**Purpose:** Quick health check of the Cloudflare Worker (no database access)

**Response:**
```json
{
  "status": "healthy",
  "service": "schema-registry-worker",
  "timestamp": "2025-10-21T23:19:36.531Z"
}
```

**Use cases:**
- Load balancer health checks
- Kubernetes liveness probes
- Monitoring systems (Datadog, New Relic, etc.)

**Example:**
```bash
curl http://localhost:8789/health
```

---

#### 2. API Health Check (with Database)

**Endpoint:** `GET /schema-registry/api/health`

**Purpose:** Health check that includes Durable Object initialization (ensures database is accessible)

**Response:**
```json
{
  "status": "healthy",
  "service": "schema-registry-durable-object",
  "timestamp": "2025-10-21T23:19:51Z"
}
```

**Use cases:**
- Deep health checks
- Kubernetes readiness probes
- End-to-end monitoring

**Example:**
```bash
curl http://localhost:8789/schema-registry/api/health
```

---

#### 3. Full Registry Info (with Statistics)

**Endpoint:** `GET /schema-registry/api/registry`

**Purpose:** Comprehensive registry information including database statistics

**Response:**
```json
{
  "stats": {
    "products": 2,
    "domains": 3,
    "contexts": 5,
    "schemas": 15,
    "versions": 42
  }
}
```

**Use cases:**
- Detailed health monitoring
- Database verification
- Setup validation

**Example:**
```bash
curl http://localhost:8789/schema-registry/api/registry \
  -H "X-Tenant-ID: default-tenant" \
  -H "X-Registry-ID: default-registry"
```

---

### Choosing the Right Endpoint

| Endpoint | Speed | Database Access | Use Case |
|----------|-------|----------------|----------|
| `/health` | Fastest | ❌ No | Load balancers, liveness probes |
| `/schema-registry/health` | Fastest | ❌ No | Alternative path for Worker health |
| `/api/health` | Fast | ✅ Yes (minimal) | Readiness probes, DO health |
| `/api/registry` | Slower | ✅ Yes (full stats) | Detailed monitoring, setup verification |

**Recommendation:**
- **Production load balancers**: Use `/health` for fastest response
- **Kubernetes liveness**: Use `/health`
- **Kubernetes readiness**: Use `/api/health`
- **Monitoring dashboards**: Use `/api/registry` for detailed stats

---

## Production Deployment

### Prerequisites

1. **Cloudflare Account** ([Sign up](https://dash.cloudflare.com/sign-up))
2. **Wrangler CLI authenticated**
   ```bash
   npx wrangler login
   ```

### Deployment Steps

#### 1. Update `wrangler.toml`

```toml
name = "domo-schema-registry"
main = "functions/_worker.ts"
compatibility_date = "2024-01-01"

# Your Cloudflare account ID
account_id = "your-account-id-here"

# Non-secret production config
[vars]
TENANT_ID = "production-tenant"
REGISTRY_ID = "main-registry"
API_URL = "https://schema-registry.yourdomain.com"
PARTYKIT_URL = "https://realtime.yourdomain.com"

# Durable Objects binding
[[durable_objects.bindings]]
name = "SCHEMA_REGISTRY"
class_name = "SchemaRegistryDurableObject"
script_name = "domo-schema-registry"

[[migrations]]
tag = "v1"
new_classes = ["SchemaRegistryDurableObject"]
```

#### 2. Set Secrets

```bash
# Set admin password
npx wrangler secret put ADMIN_PASSWORD

# Set any other secrets
npx wrangler secret put DATABASE_ENCRYPTION_KEY
```

#### 3. Build and Deploy

```bash
# Build frontend
npm run build

# Deploy Worker
npx wrangler deploy
```

#### 4. Deploy PartyKit (Real-time Server)

```bash
# Deploy PartyKit to their cloud
npx partykit deploy
```

Or host on your own infrastructure - see [PartyKit Deployment Docs](https://docs.partykit.io/deployment/).

#### 5. Create Production Admin User

```bash
# Point to production API
TENANT_ID=production-tenant \
REGISTRY_ID=main-registry \
API_URL=https://schema-registry.yourdomain.com \
npm run create:admin admin@yourdomain.com <secure-password> "Admin User"
```

### Production Environment Variables

**Set via Cloudflare Dashboard**:

1. Go to: Workers & Pages → Your Worker → Settings → Variables
2. Add environment variables:
   - `API_URL`
   - `PARTYKIT_URL`
   - `TENANT_ID`
   - `REGISTRY_ID`
3. Add secrets (encrypted):
   - `ADMIN_PASSWORD`
   - Any API keys or sensitive values

**Or via `wrangler.toml`**:

```toml
[env.production]
name = "domo-schema-registry-prod"

[env.production.vars]
TENANT_ID = "production-tenant"
REGISTRY_ID = "main-registry"
API_URL = "https://schema-registry.yourdomain.com"
```

Then deploy to production environment:

```bash
npx wrangler deploy --env production
```

### Production Monitoring

**Check deployment status**:

```bash
npx wrangler tail
```

**View logs in Cloudflare Dashboard**:

Workers & Pages → Your Worker → Logs

**Test deployment**:

```bash
curl https://schema-registry.yourdomain.com/schema-registry/api/registry \
  -H "X-Tenant-ID: production-tenant" \
  -H "X-Registry-ID: main-registry"
```

---

## Additional Resources

- **[CLAUDE.md](../CLAUDE.md)** - Quick reference guide for Claude Code
- **[scripts/README.md](../scripts/README.md)** - Detailed script documentation
- **[Architecture Documentation](./architecture/)** - System design and patterns
- **[Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)**
- **[PartyKit Docs](https://docs.partykit.io/)**
- **[Vite Docs](https://vitejs.dev/)**

---

## Getting Help

### Check Existing Issues

Search the issue tracker for similar problems:

```bash
# GitHub repository issues
https://github.com/your-org/domo-schema-registry/issues
```

### Run Preflight Check

```bash
npm run preflight
```

This validates:
- Node.js version
- npm installation
- Dependencies installed
- Port availability
- PegJS parser generated
- TypeScript compilation
- Wrangler authentication

### Create New Issue

If you can't find a solution, create a new issue with:

1. **Environment info**:
   ```bash
   node --version
   npm --version
   npx wrangler --version
   ```

2. **Error message** (full stack trace if available)

3. **Steps to reproduce**

4. **Expected vs actual behavior**

---

## Quick Command Reference

| Command | Description |
|---------|-------------|
| `npm run setup` | Complete environment setup (first time) |
| `npm run preflight` | Check environment before starting servers |
| `npm run verify` | ⭐ Comprehensive setup verification ("doctor") |
| `npm run verify:quick` | Quick verification (skips TypeScript) |
| `npm run start:all` | Start all servers (Backend + PartyKit + Frontend) |
| `npm run setup:database` | ⭐ Complete database + admin setup (interactive) |
| `npm run dev` | Start frontend only |
| `npx wrangler dev --port 8789` | Start backend only |
| `npx partykit dev --port 1999` | Start real-time server only |
| `npm run build` | Build frontend for production |
| `npx wrangler deploy` | Deploy Worker to Cloudflare |
| `npm run test` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run typecheck` | Check TypeScript errors |
| `npm run lint` | Run ESLint |
| `npm run init:database` | Initialize database only |
| `npm run create:admin <email> <pass> "<name>"` | Create admin user only |

---

**Ready to start developing? Run `npm run setup` and you'll be up and running in minutes!**
