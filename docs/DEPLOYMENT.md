# Cloudflare Deployment Guide

## IMPORTANT: This is a Worker Project, NOT a Pages Project

This project uses **Cloudflare Workers with Durable Objects**. It cannot be deployed as a Cloudflare Pages project because it requires Durable Objects support.

### Correct Deployment Steps

1. **Build the frontend**:
   ```bash
   npm run build
   ```
   This creates the `dist/` directory with static files.

2. **Deploy as a Worker (REQUIRED)**:
   ```bash
   npx wrangler deploy
   ```
   
   **DO NOT use `wrangler pages deploy`** - This project requires Durable Objects which are only available in Workers.

### Current Architecture Note

The Worker currently handles API requests only. For production deployment, you have two options:

**Option A: Separate Frontend Hosting (Recommended)**
- Deploy the Worker for API: `npx wrangler deploy`
- Host the frontend (`dist/`) separately on any static hosting service
- Update `apiClient.ts` to point to your Worker URL

**Option B: Add Static File Serving to Worker**
- Would require adding static file serving logic to `_worker.ts`
- More complex but keeps everything in one deployment

## Important Notes

### Warning Explanations

1. **"pages_build_output_dir" warning**: 
   - Now fixed by adding `pages_build_output_dir = "dist"` to wrangler.toml
   - This tells Cloudflare Pages where to find the built static files

2. **"No routes found" warning**:
   - This is **expected and not an issue**
   - The project uses a `_worker.ts` file that handles all routing internally
   - Routes are defined in the worker code, not through file-based routing

### Architecture

- **Frontend**: React app served from `dist/` directory
- **Backend**: Cloudflare Worker with Durable Objects (functions/_worker.ts)
- **Data Storage**: SQLite in Durable Objects (isolated per tenant:registry)

### Why Workers, Not Pages?

This project **MUST** be deployed as a Worker because:

1. **Durable Objects Required**: The schema registry uses Durable Objects for multi-tenant data isolation
2. **SQLite Storage**: Each tenant:registry pair gets its own SQLite database in a Durable Object
3. **Complex Routing**: The `_worker.ts` handles all API routing internally

Cloudflare Pages does NOT support:
- Durable Objects
- The `migrations` configuration
- The `main` worker entry point

### Deployment URL

After deploying with `npx wrangler deploy`:
- URL format: `https://kalele-domo-schema-registry.<subdomain>.workers.dev`
- The Worker serves both the frontend (from dist/) and the API endpoints

### Environment Variables

No environment variables are needed - all configuration is handled through:
- Multi-tenant routing in the worker
- Durable Objects for data isolation

### Post-Deployment

After deployment, the API will be available at:
- `https://your-domain/schema-registry/api/{tenantId}/{registryId}/products`

The frontend will automatically connect to the correct API endpoint based on the deployment URL.