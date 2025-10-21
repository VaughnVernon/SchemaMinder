# Scripts Directory

This directory contains utility scripts for the Domo Schema Registry.

## Available Scripts

### Database Management

#### `init-database.js`
Initializes the database schema for a tenant/registry combination.

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

**Prerequisites:**
- Backend server must be running: `npx wrangler dev --port 8789`

**Environment Variables:**
- `TENANT_ID` - Tenant identifier (default: 'default-tenant')
- `REGISTRY_ID` - Registry identifier (default: 'default-registry')
- `API_URL` - API endpoint (default: 'http://localhost:8789')

---

### Password Management

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

### Initial Setup
```bash
# 1. Start the backend
npx wrangler dev --port 8789

# 2. Initialize the database (optional - happens automatically on first use)
npm run init:database

# 3. Start the frontend
npm run dev
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
- `build-pegjs-parser.js` - Parser generation
- `complexity-analysis.js` - Complexity metrics
- `complexity-html.js` - HTML report generation
- `init-database.js` - Database initialization
- `reset-password.js` - Password reset
- `reset-password-simple.js` - Simplified password reset

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
