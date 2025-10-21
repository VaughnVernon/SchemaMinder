# Cloudflare Multi-Tenant Schema Registry Setup

## Architecture Overview
This application uses **Durable Objects with SQLite storage** to provide:
- 🏢 **Multi-tenant support**: Each tenant can have multiple schema registries
- 📊 **Isolated databases**: Each registry instance has its own SQLite database
- 🔒 **Strong consistency**: Within each registry instance
- 📈 **Horizontal scaling**: Create new registry instances on demand

## Prerequisites
- Cloudflare account
- Wrangler CLI (already installed)
- Node.js and npm

## Setup Steps

### 1. Authenticate with Cloudflare
```bash
npx wrangler login
```

### 2. Build the Application
```bash
npm run build
```

### 3. Test and Analyze the Application

#### A. Automated Test Suite
The application includes comprehensive automated tests for API endpoints and more:

```bash
# Run all tests
npm test

# Run tests once (non-watch mode)
npm run test:run

# Run with UI (opens browser interface)
npm run test:ui

# Run with coverage report
npm run test:coverage
```

#### B. Analyze Source Code Complexity
The application can be analyzed for source code complexity based on the McCabe quantitative measure of the number of linearly independent paths. To do so, run the following command:

```
# Run with McCabe complexity report
npm run complexity
```

**Test Coverage:**
- ✅ **17 Error Handling Tests** - Input validation, constraints, CORS
- ✅ **10 API Endpoint Tests** - CRUD operations for all resources
- ✅ **8 Multi-Tenant Tests** - Registry isolation and management

#### B. Manual Testing Locally
```bash
# Start local development server with Durable Objects
npx wrangler dev

# Server will be available at http://localhost:8787
```

**Test Single-Tenant Mode:**
```bash
# Get products (auto-initialized with "My Product → My Domain → My Context")
curl http://localhost:8787/schema-registry/api/products

# Create a new domain
curl -X POST http://localhost:8787/schema-registry/api/domains \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Domain", "description": "A test domain", "productId": "YOUR_PRODUCT_ID"}'

# Get registry statistics
curl http://localhost:8787/schema-registry/api/registry
```

**Test Multi-Tenant Mode:**
```bash
# Create a new registry instance
curl -X POST http://localhost:8787/schema-registry/api/my-company/registries \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Registry", "description": "Testing registry"}'

# Access the new registry (isolated from default)
curl http://localhost:8787/schema-registry/api/my-company/test-registry-registry/products
```

### 4. Deploy to Cloudflare Pages

#### Option A: Manual Deploy
```bash
npm run wrangler:deploy
```

#### Option B: Connect to GitHub (Recommended)
1. Push your code to GitHub repository
2. Go to Cloudflare Dashboard > Pages
3. Connect to GitHub repository
4. Set build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Configure Durable Objects in Pages settings (done automatically via wrangler.toml)

## API Structure

### Single Tenant Mode (Development)
For development and testing, you can use simplified routes:
```
GET  /schema-registry/api/products              # Get all products
POST /schema-registry/api/products              # Create new product
PUT  /schema-registry/api/products/:id          # Update product
GET  /schema-registry/api/registry              # Get registry stats
```

### Multi-Tenant Mode (Production)
Full multi-tenant support with isolated registry instances:
```
# Registry Management
GET  /schema-registry/api/{tenantId}/registries           # List registries for tenant
POST /schema-registry/api/{tenantId}/registries           # Create new registry

# Schema Registry Operations
GET  /schema-registry/api/{tenantId}/{registryId}/products       # Get products
POST /schema-registry/api/{tenantId}/{registryId}/products       # Create product
PUT  /schema-registry/api/{tenantId}/{registryId}/products/:id   # Update product

GET  /schema-registry/api/{tenantId}/{registryId}/domains        # Get domains
GET  /schema-registry/api/{tenantId}/{registryId}/contexts       # Get contexts
GET  /schema-registry/api/{tenantId}/{registryId}/schemas        # Get schemas
GET  /schema-registry/api/{tenantId}/{registryId}/registry       # Get registry stats
```

## Example Usage

### Create a new registry for a tenant:
```bash
curl -X POST https://your-app.pages.dev/schema-registry/api/my-company/registries \
  -H "Content-Type: application/json" \
  -d '{"name": "Product Catalog", "description": "Main product schema registry"}'
```

### Use the registry:
```bash
curl https://your-app.pages.dev/schema-registry/api/my-company/product-catalog-registry/products
```

## Database Schema
Each registry instance automatically creates its own SQLite database with:
- **products** - Top-level product definitions
- **domains** - Business domains within products
- **contexts** - Bounded contexts within domains
- **schemas** - Schema definitions with type categories
- **schema_versions** - Versioned schema specifications

## Environment Variables Needed
- None! Everything is configured in wrangler.toml
- Durable Objects are automatically provisioned

## Development Features
- **Automatic schema initialization** - SQLite tables created on first use
- **CORS enabled** - Ready for frontend integration
- **Error handling** - Comprehensive error responses
- **Multi-tenant isolation** - Each registry completely separate

## Testing Architecture

### Test Files Structure
```
tests/
├── setup.ts              # Test environment setup (wrangler dev server)
├── api.test.ts            # Core API endpoint tests (10 tests)
├── multi-tenant.test.ts   # Multi-tenant functionality tests (8 tests)
└── error-handling.test.ts # Error scenarios & validation (17 tests)
```

### Testing Features
- **🚀 Automated Server Management** - Tests automatically start/stop wrangler dev
- **🔄 Dynamic Port Allocation** - Prevents conflicts during parallel test runs
- **🏢 Multi-Tenant Validation** - Verifies complete database isolation
- **❌ Comprehensive Error Testing** - Database constraints, invalid inputs, CORS
- **📊 Full CRUD Coverage** - All endpoints for products, domains, contexts, schemas, versions

### Database Constraint Testing
The tests verify all SQLite constraints work correctly:
```sql
-- Tests verify these constraints are enforced:
CHECK (schema_type_category IN ('Commands', 'Data', 'Documents', 'Envelopes', 'Events'))
CHECK (scope IN ('Public', 'Private'))
CHECK (status IN ('Draft', 'Published', 'Deprecated', 'Removed'))
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
```

### Running Tests in CI/CD
```bash
# In your GitHub Actions or CI pipeline:
npm ci
npm run build
npm run test:run
```

## Implementation Status
1. ✅ **Durable Objects with SQLite architecture**
2. ✅ **Complete CRUD operations** (all resources: products, domains, contexts, schemas, versions)
3. ✅ **Multi-tenant routing and isolation**
4. ✅ **Comprehensive automated test suite** (35 tests total)
5. ✅ **Error handling and validation**
6. ✅ **CORS support for frontend integration**
7. 🚧 **Update frontend to use API endpoints**
8. 🚧 **Add registry management UI**
9. 🚧 **Production tenant authentication**

## Troubleshooting

### General Issues
- If you get authentication errors, run `npx wrangler auth login` again
- For local testing issues, ensure compatibility flags are set correctly
- Check Cloudflare dashboard > Workers & Pages > your-app for logs
- Each registry instance logs are separate in the dashboard

### Testing Issues

**Port Conflicts:**
```bash
# If tests fail with "Address already in use":
pkill -f wrangler  # Kill any running wrangler processes
npm run test:run   # Try again
```

**Test Timeout Issues:**
```bash
# If tests timeout waiting for server:
export NODE_ENV=test
npm run test:run -- --testTimeout=60000  # Increase timeout
```

**SQLite Constraint Errors (Expected in Error Tests):**
- ✅ `CHECK constraint failed: scope IN ('Public', 'Private')` - Expected validation
- ✅ `FOREIGN KEY constraint failed` - Expected referential integrity
- ✅ `Unexpected token 'j'` - Expected JSON parsing validation

**Manual Testing with Different Registry Instances:**
```bash
# To test isolation, create multiple registries:
curl -X POST http://localhost:8787/schema-registry/api/tenant1/registries -H "Content-Type: application/json" -d '{"name": "Registry A"}'
curl -X POST http://localhost:8787/schema-registry/api/tenant2/registries -H "Content-Type: application/json" -d '{"name": "Registry B"}'

# Each should have separate "My Product" with different UUIDs:
curl http://localhost:8787/schema-registry/api/tenant1/registry-a-registry/products
curl http://localhost:8787/schema-registry/api/tenant2/registry-b-registry/products
```

**Test Configuration:**
- Tests use `vitest.config.ts` with 30-second timeout
- Each test file gets its own wrangler dev server instance
- Dynamic port allocation prevents conflicts (8790-8890 range)
- Global `TEST_BASE_URL` variable set dynamically per test file