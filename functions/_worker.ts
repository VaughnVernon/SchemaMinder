/// <reference types="@cloudflare/workers-types" />
// Multi-tenant Schema Registry Worker with Durable Objects
import { Env, RegistryInfo } from './types';
import { SchemaRegistryInstance } from './SchemaRegistryInstance';

// Export the Durable Object class
export { SchemaRegistryInstance };

// Helper function to generate timestamps without milliseconds
function getTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS with credentials support
    const origin = request.headers.get('Origin') || 'http://localhost:5173';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    console.log(`Request: ${request.method} ${url.pathname}`);

    // Health check endpoint (lightweight, no database access)
    if (url.pathname === '/health' || url.pathname === '/schema-registry/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        service: 'schema-registry-worker',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // API routes with /schema-registry prefix
    if (url.pathname.startsWith('/schema-registry/api/')) {
      try {
        const response = await handleApiRequest(request, env, url);
        // Create new response with CORS headers
        const newHeaders = new Headers(response.headers);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          newHeaders.set(key, value);
        });
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // Serve static files using the ASSETS binding
    try {
      // Try to get the asset from the ASSETS binding
      const response = await env.ASSETS.fetch(request);
      
      if (response.ok) {
        return response;
      }
      
      // For SPA routing, serve index.html for non-API routes that return 404
      if (!url.pathname.startsWith('/schema-registry/api/') && response.status === 404) {
        try {
          const indexRequest = new Request(new URL('/', request.url), request);
          const indexResponse = await env.ASSETS.fetch(indexRequest);
          if (indexResponse.ok) {
            return indexResponse;
          }
        } catch (indexError) {
          console.error('Could not serve index.html for SPA routing:', indexError);
        }
      }
      
      // Return the original response (likely a 404)
      return response;
      
    } catch (error) {
      console.error('Static file serving error:', error);
    }

    // Fallback for unhandled requests
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};

async function handleApiRequest(request: Request, env: Env, url: URL): Promise<Response> {
  const pathParts = url.pathname.replace('/schema-registry/api/', '').split('/').filter(p => p);
  
  if (pathParts.length === 0) {
    return new Response(JSON.stringify({ 
      message: 'Schema Registry API',
      version: '1.0.0',
      routes: {
        tenants: '/schema-registry/api/{tenantId}/registries',
        registry: '/schema-registry/api/{tenantId}/{registryId}/*'
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Registry management: /api/{tenantId}/registries
  if (pathParts.length === 2 && pathParts[1] === 'registries') {
    const [tenantId] = pathParts;
    return handleRegistryManagement(request, env, tenantId);
  }

  // Multi-tenant mode: /api/{tenantId}/{registryId}/resource
  if (pathParts.length >= 3) {
    const [tenantId, registryId, ...resourcePath] = pathParts;
    return handleMultiTenantRequest(request, env, tenantId, registryId, resourcePath, url);
  }

  // For development/testing - allow single tenant mode (simple resource paths like /api/products)
  if (pathParts.length >= 1 && ['products', 'domains', 'contexts', 'schemas', 'schema-versions', 'registry', 'find', 'auth', 'admin', 'debug-db', 'changes', 'subscriptions', 'user', 'health'].includes(pathParts[0])) {
    // Single tenant mode: /api/products, /api/domains, etc.
    return handleSingleTenantMode(request, env, pathParts);
  }

  return new Response(JSON.stringify({ error: 'Invalid API path' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleSingleTenantMode(request: Request, env: Env, pathParts: string[]): Promise<Response> {
  // For development - use default tenant and registry
  const tenantId = 'default-tenant';
  const registryId = 'default-registry';
  
  return handleMultiTenantRequest(request, env, tenantId, registryId, pathParts, new URL(request.url));
}

async function handleMultiTenantRequest(
  request: Request, 
  env: Env, 
  tenantId: string, 
  registryId: string, 
  resourcePath: string[],
  url: URL
): Promise<Response> {
  try {
    // Get Durable Object instance
    const durableObjectId = env.SCHEMA_REGISTRY_INSTANCE.idFromName(`${tenantId}:${registryId}`);
    const durableObject = env.SCHEMA_REGISTRY_INSTANCE.get(durableObjectId);
    
    // Create new URL for the Durable Object with just the resource path
    const newUrl = new URL(request.url);
    newUrl.pathname = '/' + resourcePath.join('/');
    
    // Forward the request to the Durable Object
    const newRequest = new Request(newUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      duplex: 'half' as RequestDuplex,
    });
    
    return await durableObject.fetch(newRequest);
  } catch (error) {
    console.error('Multi-tenant request error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process request',
      tenant: tenantId,
      registry: registryId 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function handleRegistryManagement(request: Request, env: Env, tenantId: string): Promise<Response> {
  const method = request.method;

  switch (method) {
    case 'GET':
      return listRegistries(tenantId);
    case 'POST':
      return createRegistry(request, env, tenantId);
    default:
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
  }
}

async function listRegistries(tenantId: string): Promise<Response> {
  // For now, return mock data
  // In production, you'd store this in KV or another Durable Object
  const mockRegistries: RegistryInfo[] = [
    {
      id: 'default-registry',
      tenantId: tenantId,
      name: 'Default Schema Registry',
      description: 'Default registry for development',
      createdAt: getTimestamp(),
      updatedAt: getTimestamp()
    }
  ];

  return new Response(JSON.stringify({ registries: mockRegistries }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function createRegistry(request: Request, env: Env, tenantId: string): Promise<Response> {
  try {
    const body = await request.json() as { name: string; description?: string };
    const { name, description } = body;
    const registryId = `${name.toLowerCase().replace(/\s+/g, '-')}-registry`;
    const timestamp = getTimestamp();

    // Create/initialize the Durable Object
    const durableObjectId = env.SCHEMA_REGISTRY_INSTANCE.idFromName(`${tenantId}:${registryId}`);
    const durableObject = env.SCHEMA_REGISTRY_INSTANCE.get(durableObjectId);
    
    // Initialize the registry by making a request to it
    const initRequest = new Request('https://example.com/registry', { method: 'GET' });
    await durableObject.fetch(initRequest);

    const registryInfo: RegistryInfo = {
      id: registryId,
      tenantId: tenantId,
      name: name,
      description: description,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    return new Response(JSON.stringify({ registry: registryInfo }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Create registry error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create registry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}