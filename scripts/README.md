# Scripts Directory

This directory contains utility scripts for the Schema Minder.

## Available Scripts

### Environment Setup

#### `setup.js`
Complete environment setup for new developers.

**Usage:**
```bash
npm run setup
node scripts/setup.js
```

**What it does:**
1. Runs preflight checks
2. Creates `.env` file from `.env.example` (if not exists)
3. Installs dependencies
4. Generates PegJS parser
5. Verifies TypeScript compilation
6. Displays next steps for development

**When to run:**
- First time setting up the project
- After cloning the repository
- After major configuration changes

**Prerequisites:**
- Node.js ≥18.0.0
- npm installed

#### `preflight-check.js`
Validates the development environment before starting servers.

**Usage:**
```bash
npm run preflight
node scripts/preflight-check.js
```

**What it does:**
- Checks Node.js version compatibility (≥18.0.0)
- Verifies npm installation
- Confirms dependencies are installed
- Tests port availability (8789, 1999, 5173)
- Verifies PegJS parser is generated
- Runs TypeScript compilation check
- Checks Wrangler authentication (optional)

**Output:**
- Color-coded results (✓ green for pass, ✗ red for fail)
- Detailed error messages and suggestions
- Exit code 0 for success, 1 for failure

**When to use:** Before starting servers for the first time or after environment changes

---

#### `verify-setup.js`
Comprehensive end-to-end setup verification (like a "doctor" command).

**Usage:**
```bash
npm run verify              # Full verification
npm run verify:quick        # Skip slow checks (TypeScript)
node scripts/verify-setup.js --verbose  # Detailed output
```

**What it does:**
- **Section 1: Environment** - Config files, environment variables, Node version
- **Section 2: Dependencies** - node_modules, generated files, source files
- **Section 3: Server Health** - Port checks, HTTP health checks for all 3 servers
- **Section 4: API Connectivity** - Backend endpoints, database initialization
- **Section 5: Real-time** - PartyKit WebSocket connectivity
- **Section 6: Code Quality** - TypeScript compilation (skipped in --quick mode)

**Features:**
- ✅ 6 comprehensive verification sections
- ✅ Smart detection (skips checks if servers not running)
- ✅ Summary with pass/fail/warning/skipped counts
- ✅ Actionable recommendations for fixes
- ✅ Quick mode for fast checks
- ✅ Verbose mode for debugging

**When to use:**
- After completing setup to verify everything works
- When troubleshooting issues
- Before deploying to ensure readiness
- As part of CI/CD to validate environment

**Example output:**
```
Section 1: Environment Configuration
=====================================
✓ Node.js version 22.18.0
✓ .env (base configuration)
✓ .env.development (team defaults)
✓ .env.local (personal settings)
✓ TENANT_ID is set
✓ API_URL is configured

... (5 more sections)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verification Summary

Total Checks:    24
Passed:          22
Failed:          0
Warnings:        2
Skipped:         0

✓ All checks passed!
Your setup is working perfectly.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Database Management

#### `setup-database.js` ⭐ **Recommended**
Complete database setup with admin user creation (interactive or non-interactive).

**Usage:**
```bash
# Interactive mode (prompts for admin credentials)
npm run setup:database

# Non-interactive mode (for CI/CD)
node scripts/setup-database.js --non-interactive \
  --admin-email=admin@example.com \
  --admin-password=SecurePass123! \
  --admin-name="Administrator"
```

**What it does:**
1. Checks if backend server is running
2. Initializes database schema (triggers Durable Object creation)
3. Verifies database tables are accessible
4. Prompts for admin credentials (or uses provided values)
5. Registers admin user
6. Updates user role to admin (automatic for first admin)
7. Verifies admin can login

**Features:**
- ✅ Comprehensive 7-step setup process
- ✅ Interactive prompts for credentials
- ✅ Non-interactive mode support (CI/CD)
- ✅ Detects if user already exists
- ✅ Automatic first-admin promotion (no manual SQL needed)
- ✅ Verifies admin access

**Prerequisites:**
- Backend server must be running: `npx wrangler dev --port 8789`

**Environment Variables:**
- `TENANT_ID` - Tenant identifier (default: 'default-tenant')
- `REGISTRY_ID` - Registry identifier (default: 'default-registry')
- `API_URL` - API endpoint (default: 'http://localhost:8789')
- `ADMIN_EMAIL` - Admin email (non-interactive mode)
- `ADMIN_PASSWORD` - Admin password (non-interactive mode)
- `ADMIN_FULL_NAME` - Admin full name (non-interactive mode)

---

#### `init-database.js`
Initializes the database schema only (no admin user creation).

**Usage:**
```bash
npm run init:database
npm run init:database my-tenant my-registry
TENANT_ID=acme REGISTRY_ID=prod node scripts/init-database.js
```

**What it does:**
- Triggers Durable Object creation
- Initializes all database tables (products, domains, contexts, schemas, schema_versions, users)
- Verifies the database is accessible
- Displays registry information

**Note:** Use `setup:database` instead for complete setup including admin user.

**Prerequisites:**
- Backend server must be running: `npx wrangler dev --port 8789`

**Environment Variables:**
- `TENANT_ID` - Tenant identifier (default: 'default-tenant')
- `REGISTRY_ID` - Registry identifier (default: 'default-registry')
- `API_URL` - API endpoint (default: 'http://localhost:8789')

---

### User Management

#### `create-admin-user.js`
Creates a new admin user in the database.

**Usage:**
```bash
npm run create:admin admin@example.com SecurePass123! "Admin User"
node scripts/create-admin-user.js admin@example.com SecurePass123! "Admin User"
```

**What it does:**
1. Registers a new user via the API
2. Updates the user's role to admin (automatic for first admin)
3. Verifies admin access by logging in

**Notes:**
- The user is created with 'editor' role by default
- First admin can be promoted without authentication
- Subsequent admin promotions require existing admin credentials

**Environment Variables:**
- `TENANT_ID` - Tenant identifier
- `REGISTRY_ID` - Registry identifier
- `API_URL` - API endpoint

#### `reset-password.js`
Resets a user's password in the database.

**Usage:**
```bash
node scripts/reset-password.js <email> <new-password>
node scripts/reset-password.js me@somebody.me MyNewPassword123!
```

**Environment Variables:**
- `TENANT_ID` - Tenant identifier
- `REGISTRY_ID` - Registry identifier
- `API_URL` - API endpoint

---

### Code Generation

#### `build-pegjs-parser.js`
Generates the schema specification parser from the PEG grammar.

**Usage:**
```bash
npm run generate:pegjs-parser
node scripts/build-pegjs-parser.js
```

**What it does:**
- Reads `src/parser/SchemaSpecification.pegjs`
- Generates TypeScript parser
- Outputs to `src/parser/PegSchemaSpecificationParser.ts`

**When to run:**
- After modifying the PEG grammar
- Before building the project
- Automatically runs during `npm run dev` and `npm run build`

---

### Code Quality

#### `complexity-analysis.js`
Analyzes code complexity and generates reports.

**Usage:**
```bash
npm run complexity                  # Generate and display complexity report
npm run complexity:json             # Generate JSON report
npm run complexity:html             # Generate HTML report
npm run complexity:open             # Generate and open HTML report
```

**What it does:**
- Calculates cyclomatic complexity for all TypeScript files
- Identifies files with high complexity (>20)
- Generates maintainability scores
- Produces JSON and HTML reports

**Output:**
- Console summary
- `complexity-report.json` - Detailed JSON data
- `complexity-report.html` - Interactive HTML report

#### `complexity-html.js`
Generates an interactive HTML report from complexity analysis.

**Usage:**
```bash
node scripts/complexity-html.js
```

**Prerequisites:**
- Must run `complexity-analysis.js` first to generate `complexity-report.json`

---

## Development Workflow

### Initial Setup (New Developers)

**See [docs/GETTING_STARTED.md](../docs/GETTING_STARTED.md) for comprehensive setup guide**

Quick start:

```bash
# 1. Run the complete setup script (interactive)
npm run setup

# 2. Review your environment configuration
vi .env.local          # Your personal settings (git-ignored)
cat .env.development   # Dev team defaults

# 3. Start all servers
npm run start:all

# 4. Create an admin user (in another terminal)
npm run create:admin admin@example.com SecurePass123! "Admin User"

# 5. Open browser
# http://localhost:5173
```

**Environment Files**:
- `.env` - Base defaults (committed)
- `.env.development` - Dev team defaults (committed)
- `.env.production` - Production template (committed)
- `.env.local` - **Your personal settings** (git-ignored)

See [Environment Configuration](../docs/GETTING_STARTED.md#environment-configuration) for details.

### Daily Development

#### Start All Servers (Recommended)
```bash
# Enhanced orchestration with health checks
npm run start:all
```

**Features**:
- ✅ Pre-flight port availability checks
- ✅ Starts all three servers in parallel
- ✅ Health checks verify servers are ready
- ✅ Colored output for each server
- ✅ Graceful shutdown on Ctrl+C
- ✅ Clear status reporting

**Alternative - Simple Mode**:
```bash
# Basic concurrently (no health checks)
npm run start:all:simple
```

#### Start Servers Individually
```bash
# If you need separate terminal windows/logs
npx wrangler dev --port 8789    # Terminal 1: Backend
npx partykit dev --port 1999     # Terminal 2: Real-time
npm run dev                      # Terminal 3: Frontend
```

### Before Starting Servers
```bash
# Run preflight check to validate environment
npm run preflight
```

### Before Committing
```bash
# Check code quality
npm run lint
npm run typecheck
npm run complexity
npm run test:coverage
```

### After Modifying Grammar
```bash
npm run generate:pegjs-parser
npm run test
```

---

## Script Locations

All scripts are in `/scripts`:
- `setup.js` - Complete environment setup for new developers
- `preflight-check.js` - Environment validation before starting servers
- `verify-setup.js` - ⭐ Comprehensive end-to-end verification ("doctor" command)
- `start-all.js` - Multi-server orchestration with health checks
- `setup-database.js` - ⭐ Database + admin user setup (interactive/non-interactive)
- `init-database.js` - Database initialization only
- `create-admin-user.js` - Admin user creation only
- `reset-password.js` - Password reset
- `reset-password-simple.js` - Simplified password reset
- `build-pegjs-parser.js` - Parser generation
- `complexity-analysis.js` - Complexity metrics
- `complexity-html.js` - HTML report generation

---

## Adding New Scripts

When creating new scripts:

1. **Add to `/scripts` directory**
2. **Make executable:** `chmod +x scripts/your-script.js`
3. **Add shebang:** `#!/usr/bin/env node`
4. **Add to package.json:** `"script-name": "node scripts/your-script.js"`
5. **Document here in this README**
6. **Update CLAUDE.md** if it's a commonly used command

---

## Troubleshooting

### "Failed to initialize database"
- Ensure backend is running: `npx wrangler dev --port 8789`
- Check that port 8789 is not in use
- Verify `API_URL` environment variable

### "Password reset failed"
- Verify user exists in the database
- Check tenant/registry IDs match
- Ensure backend is accessible

### "Parser generation failed"
- Check PEG grammar syntax in `src/parser/SchemaSpecification.pegjs`
- Ensure `pegjs` is installed: `npm install`
- Check for syntax errors in grammar file

### "Complexity script errors"
- Ensure all TypeScript files compile: `npm run typecheck`
- Check for malformed code that confuses the parser
- Review error messages for specific file issues
