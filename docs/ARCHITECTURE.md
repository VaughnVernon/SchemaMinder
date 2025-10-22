# Kalele Domo Schema Minder Architecture

## Overview
The Kalele Domo Schema Minder is a multi-tenant, hierarchical schema management system built on Cloudflare's edge infrastructure using Durable Objects with SQLite storage. It provides complete database isolation per registry instance while maintaining a simple, scalable API structure.

## Core Architecture

### Multi-Tenant Isolation Model
```
Tenant:Registry → Unique Durable Object → Isolated SQLite Database
```

**Key Principle:** Each `tenantId:registryId` combination creates a completely isolated database instance.

```typescript
// Durable Object ID generation
const durableObjectId = env.SCHEMA_REGISTRY_INSTANCE.idFromName(`${tenantId}:${registryId}`);
```

### Tenant-Registry Matrix
```
┌─────────────┬──────────────┬──────────────┬──────────────┐
│ Tenant      │ Registry     │ Durable ID   │ Database     │
├─────────────┼──────────────┼──────────────┼──────────────┤
│ kalele      │ production   │ kalele:prod  │ Isolated #1  │
│ kalele      │ staging      │ kalele:stage │ Isolated #2  │
│ acme-corp   │ production   │ acme:prod    │ Isolated #3  │
│ acme-corp   │ development  │ acme:dev     │ Isolated #4  │
│ company-c   │ production   │ company:prod │ Isolated #5  │
└─────────────┴──────────────┴──────────────┴──────────────┘
```

**Benefits:**
- ✅ **Perfect Isolation:** Complete data separation between tenants
- ✅ **Registry Reuse:** Same registry names across different tenants
- ✅ **No Configuration:** Zero-config namespace creation
- ✅ **Scalable:** Automatic scaling per Durable Object instance

## Distributed Architecture

### Production Deployment Model

The Schema Minder deploys as a unified system across Cloudflare's global edge network with multiple isolation layers:

```
Cloudflare Pages (Global CDN)
    ↓ API requests
Cloudflare Worker (Single Service)
    ↓ Routes by tenant:registry
Multiple Durable Object Instances (Isolated processes)
    ↓ Each with
Isolated SQLite Databases (Per-tenant storage)
```

### Service Architecture

**Single Worker, Multiple Tenants:**
```javascript
// One worker handles ALL tenant requests
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    // Same code routes all tenants
    if (url.pathname.includes('/kalele/prod/')) return route_to_kalele_prod()
    if (url.pathname.includes('/acme/dev/')) return route_to_acme_dev()
    if (url.pathname.includes('/company/stage/')) return route_to_company_stage()
  }
}
```

### Durable Object Isolation

**Each Tenant:Registry = Unique DO Instance:**
```javascript
// Automatic instance creation per tenant:registry combination
const kalele_prod = env.SCHEMA_REGISTRY_INSTANCE.idFromName('kalele:prod')      // Instance 1
const acme_dev = env.SCHEMA_REGISTRY_INSTANCE.idFromName('acme:dev')            // Instance 2
const company_stage = env.SCHEMA_REGISTRY_INSTANCE.idFromName('company:stage')  // Instance 3
```

### Isolation Guarantees

| **Level** | **Isolation Type** | **Implementation** |
|-----------|-------------------|-------------------|
| **Data** | Complete separation | Each DO has its own SQLite database |
| **Compute** | Process isolation | Each DO runs in separate V8 isolate |
| **Memory** | Dedicated allocation | No shared state between DOs |
| **Geographic** | Regional distribution | DOs migrate to usage locations |

### Scaling Characteristics

**Horizontal Scaling:**
- ✅ **Automatic Tenant Scaling:** New tenant → New DO instance (zero config)
- ✅ **Load-based Distribution:** Heavy tenants migrate to dedicated edge locations
- ✅ **Resource Efficiency:** Light tenants share edge infrastructure
- ✅ **Global Distribution:** DOs automatically distribute to Cloudflare's 300+ locations

**Performance Benefits:**
- **Edge Execution:** API runs at locations closest to users
- **No Cold Starts:** Durable Objects maintain persistent state
- **Automatic Migration:** DOs move to optimize latency
- **Infinite Scale:** New tenants require zero infrastructure provisioning

### Cost Model

**Pay-per-use Economics:**
- Base Worker cost covers ALL tenants
- Additional costs only for:
  - Durable Object compute time (per-tenant usage)
  - SQLite storage (per-tenant data)
  - Request volume (across all tenants)

**Example Scaling:**
```
1 tenant = $0.01/month base + usage
100 tenants = $0.01/month base + 100x usage
10,000 tenants = $0.01/month base + 10,000x usage
```

### Deployment Architecture

**Development:**
```
npm run build → wrangler dev (local testing)
```

**Production:**
```
npm run build → wrangler deploy → Global edge deployment
```

**Zero Infrastructure Management:**
- No servers to provision
- No databases to configure
- No load balancers to manage
- No scaling rules to define

### Geographic Distribution

**Automatic Edge Placement:**
```
US East users → DO instances in US East Cloudflare POPs
Europe users → DO instances in European Cloudflare POPs
Asia users → DO instances in Asian Cloudflare POPs
```

**Data Locality:**
- Each tenant's data stays in their geographic region
- Cross-region replication not required (single-tenant DOs)
- Compliance with data residency requirements

This architecture provides **unlimited multi-tenant scale** with **zero operational overhead** while maintaining **perfect tenant isolation** at the edge.

## Hierarchical Schema Model

### 6-Level Hierarchy
```
Products (Organizations)
└── Domains (Business Units)
    └── Contexts (Bounded Contexts)
        └── Schema Types (Commands/Data/Documents/Envelopes/Events)
            └── Schema Names (Logical schemas)
                └── Schema Versions (Versioned specifications)
```

### Data Relationships
```sql
products (1) ──→ (N) domains
domains (1) ──→ (N) contexts
contexts (1) ──→ (N) schemas
schemas (1) ──→ (N) schema_versions
```

### Auto-Initialization
Each new registry instance automatically creates:
```
My Product → My Domain → My Context
```

## API Architecture

### URL Structure
```
/schema-registry/api/{tenantId}/{registryId}/{resource}
```

### Routing Modes

#### Single-Tenant Mode (Development)
```bash
# Simplified routes for development/testing
GET  /schema-registry/api/products              # Uses default-tenant:default-registry
POST /schema-registry/api/domains
PUT  /schema-registry/api/contexts/:id
```

#### Multi-Tenant Mode (Production)
```bash
# Full tenant isolation
GET  /schema-registry/api/kalele/prod/products           # kalele:prod database
GET  /schema-registry/api/acme/staging/products         # acme:staging database
POST /schema-registry/api/company-x/dev/schemas         # company-x:dev database
```

### Registry Management
```bash
# List registries for a tenant
GET  /schema-registry/api/{tenantId}/registries

# Create new registry instance
POST /schema-registry/api/{tenantId}/registries
```

## Durable Objects Infrastructure

### SQLite Storage Architecture
Each Durable Object contains:
- **Private SQLite Database:** Completely isolated storage
- **CRUD Operations:** Full create/read/update/delete for all resources
- **Constraint Validation:** Database-level data integrity
- **Automatic Schema:** Tables created on first access

### Database Schema
```sql
-- Per-registry database tables
products (id, name, description, created_at, updated_at)
domains (id, name, description, product_id, created_at, updated_at)
contexts (id, name, description, domain_id, created_at, updated_at)
schemas (id, name, description, schema_type_category, scope, context_id, created_at, updated_at)
schema_versions (id, specification, semantic_version, description, status, schema_id, created_at, updated_at)

-- Indexes for performance
idx_domains_product_id, idx_contexts_domain_id, idx_schemas_context_id, idx_schema_versions_schema_id

-- Constraints for data integrity
CHECK (schema_type_category IN ('Commands', 'Data', 'Documents', 'Envelopes', 'Events'))
CHECK (scope IN ('Public', 'Private'))
CHECK (status IN ('Draft', 'Published', 'Deprecated', 'Removed'))
FOREIGN KEY constraints with CASCADE delete
```

### Consistency Model
- **Strong Consistency:** Within each Durable Object instance
- **Eventual Consistency:** Across different registry instances (by design)
- **ACID Transactions:** SQLite provides full ACID guarantees per registry

## Cloudflare Infrastructure

### Deployment Architecture
```
Cloudflare Pages (Static Frontend)
    ↓
Cloudflare Functions (API Router)
    ↓
Durable Objects (Schema Registry Instances)
    ↓
SQLite Storage (Per-registry databases)
```

### Edge Distribution
- **Global Edge Network:** API available worldwide
- **Automatic Scaling:** Durable Objects scale per demand
- **Zero Cold Start:** Persistent object instances
- **Regional Data:** Data stored close to usage

### Configuration
```toml
# wrangler.toml
name = "kalele-domo-schema-registry"
[[durable_objects.bindings]]
name = "SCHEMA_REGISTRY_INSTANCE"
class_name = "SchemaRegistryInstance"
script_name = "kalele-domo-schema-registry"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["SchemaRegistryInstance"]
```

## Security & Access Control

### Current Implementation
- ✅ **Data Isolation:** Complete database separation per tenant:registry
- ✅ **CORS Support:** Cross-origin requests enabled
- ✅ **Input Validation:** Database constraints enforce data integrity
- ✅ **Error Handling:** Comprehensive error responses

### Missing (Production Requirements)
- ❌ **Authentication:** No user authentication
- ❌ **Authorization:** No tenant access validation
- ❌ **Rate Limiting:** No per-tenant quotas
- ❌ **Audit Logging:** No access logs per tenant
- ❌ **API Keys:** No tenant-scoped API keys

### Production Security Recommendations
```typescript
// Future authentication middleware
async function validateTenantAccess(tenantId: string, apiKey: string) {
  // Validate API key belongs to tenant
  // Check tenant status (active/suspended)
  // Apply rate limiting
  // Log access attempt
}
```

## Data Flow Examples

### Creating a Schema Version
```
1. POST /schema-registry/api/kalele/prod/schema-versions
2. Router extracts: tenantId="kalele", registryId="prod"
3. Creates Durable Object ID: "kalele:prod"
4. Routes to SchemaRegistryInstance.createSchemaVersion()
5. Validates schema_id exists in same database
6. Inserts into schema_versions table
7. Returns created version with UUID
```

### Cross-Registry Isolation
```
User A: POST /schema-registry/api/kalele/prod/products {"name": "Product A"}
User B: POST /schema-registry/api/acme/prod/products {"name": "Product A"}

Result:
- kalele:prod database gets Product A with UUID-1
- acme:prod database gets Product A with UUID-2
- Completely isolated - no conflicts
```

## Performance Characteristics

### Scalability
- **Per-Registry Scaling:** Each tenant:registry scales independently
- **Geographic Distribution:** Durable Objects migrate to usage locations
- **Memory Efficiency:** Only active registries consume memory
- **Storage Scaling:** SQLite handles substantial data per registry

### Latency
- **Edge Execution:** API runs at Cloudflare edge locations
- **No Cold Starts:** Durable Objects maintain persistent state
- **Local Storage:** SQLite data co-located with compute
- **CDN Integration:** Static assets served from edge

### Throughput
- **Parallel Processing:** Different registries process requests simultaneously
- **Connection Pooling:** SQLite connections reused within Durable Object
- **Batch Operations:** Multiple operations per request supported
- **Background Processing:** Async operations where applicable

## Monitoring & Observability

### Built-in Logging
```typescript
console.log('Initialized with default hierarchy: My Product → My Domain → My Context');
console.error('Create schema error:', error);
```

### Metrics Available
- Request latency per endpoint
- Error rates per registry
- Database operation performance
- Durable Object memory usage
- SQLite storage consumption

### Production Monitoring Recommendations
- **Per-tenant metrics:** Usage, errors, latency by tenantId
- **Registry health:** Database size, query performance
- **API analytics:** Endpoint usage patterns
- **Alert thresholds:** Error rates, response times

## Testing Architecture

### Automated Test Suite (35 tests)
```
tests/
├── setup.ts              # Wrangler dev server management
├── api.test.ts            # Core API endpoints (10 tests)
├── multi-tenant.test.ts   # Tenant isolation (8 tests)
└── error-handling.test.ts # Validation & constraints (17 tests)
```

### Test Coverage
- ✅ **CRUD Operations:** All resources tested
- ✅ **Multi-tenant Isolation:** Database separation verified
- ✅ **Error Scenarios:** Constraint violations, invalid inputs
- ✅ **Auto-initialization:** Default hierarchy creation
- ✅ **Registry Management:** Creation, listing, stats

### CI/CD Integration
```bash
npm run test:run  # Automated testing in pipelines
```

## Future Architecture Considerations

### Authentication Layer
```
API Gateway → JWT Validation → Tenant Authorization → Durable Objects
```

### Advanced Features
- **Schema Validation:** JSON Schema validation of specifications
- **Version Compatibility:** Semantic version conflict detection
- **Schema Evolution:** Automated migration suggestions
- **Registry Federation:** Cross-registry schema references
- **Webhook Integration:** Change notifications
- **Backup/Restore:** Per-registry data export/import

### Scaling Enhancements
- **Registry Sharding:** Large registries across multiple Durable Objects
- **Read Replicas:** Query optimization for heavy read workloads
- **Caching Layer:** Frequently accessed schemas in edge cache
- **Bulk Operations:** Batch imports/exports for large schema sets

This architecture provides a solid foundation for a production-ready, multi-tenant schema registry while maintaining simplicity and leveraging Cloudflare's edge infrastructure advantages.