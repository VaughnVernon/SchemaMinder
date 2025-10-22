import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the SchemaRegistryInstance
const mockSchemaRegistryInstance = {
  fetch: vi.fn(),
};

// Mock the Durable Object Namespace
const mockDurableObjectNamespace = {
  idFromName: vi.fn(),
  get: vi.fn(),
};

// Mock the ASSETS fetcher
const mockAssets = {
  fetch: vi.fn(),
};

// Mock environment
const mockEnv = {
  SCHEMA_REGISTRY_INSTANCE: mockDurableObjectNamespace,
  ASSETS: mockAssets,
};

// Mock SchemaRegistryInstance class
vi.mock('../../functions/SchemaRegistryInstance', () => ({
  SchemaRegistryInstance: vi.fn().mockImplementation(() => mockSchemaRegistryInstance),
}));

// Import the worker after mocking
import worker from '../../functions/_worker';

describe('Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDurableObjectNamespace.get.mockReturnValue(mockSchemaRegistryInstance);
    mockDurableObjectNamespace.idFromName.mockReturnValue('mock-durable-object-id');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('CORS Handling', () => {
    it('should handle OPTIONS requests with CORS headers', async () => {
      const request = new Request('http://localhost/test', { method: 'OPTIONS' });
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });

  describe('API Route Handling', () => {
    it('should handle API root request', async () => {
      const request = new Request('http://localhost/schema-registry/api/');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.message).toBe('Schema Minder API');
      expect(responseData.version).toBe('1.0.0');
      expect(responseData.routes).toBeDefined();
    });

    it('should handle registry management requests', async () => {
      const mockRegistries = [
        {
          id: 'default-registry',
          tenantId: 'tenant1',
          name: 'Default Schema Minder',
          description: 'Default registry for development',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ];

      const request = new Request('http://localhost/schema-registry/api/tenant1/registries');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(200);
      const responseData = await response.json();
      expect(responseData.registries).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'default-registry',
          tenantId: 'tenant1',
          name: 'Default Schema Minder'
        })
      ]));
    });

    it('should handle registry creation', async () => {
      const registryData = {
        name: 'Test Registry',
        description: 'A test registry'
      };

      const request = new Request('http://localhost/schema-registry/api/tenant1/registries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registryData)
      });

      // Mock the Durable Object initialization
      mockSchemaRegistryInstance.fetch.mockResolvedValue(new Response('OK'));

      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.registry.id).toBe('test-registry-registry');
      expect(responseData.registry.name).toBe('Test Registry');
      expect(responseData.registry.tenantId).toBe('tenant1');

      // Verify Durable Object was initialized
      expect(mockDurableObjectNamespace.idFromName).toHaveBeenCalledWith('tenant1:test-registry-registry');
      expect(mockSchemaRegistryInstance.fetch).toHaveBeenCalled();
    });

    it('should handle multi-tenant resource requests', async () => {
      const mockResponse = new Response(JSON.stringify({ products: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
      mockSchemaRegistryInstance.fetch.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/schema-registry/api/tenant1/registry1/products');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(200);
      expect(mockDurableObjectNamespace.idFromName).toHaveBeenCalledWith('tenant1:registry1');
      expect(mockDurableObjectNamespace.get).toHaveBeenCalled();
      expect(mockSchemaRegistryInstance.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/products')
        })
      );
    });

    it('should handle single-tenant mode for development', async () => {
      const mockResponse = new Response(JSON.stringify({ products: [] }));
      mockSchemaRegistryInstance.fetch.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/schema-registry/api/products');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(200);
      expect(mockDurableObjectNamespace.idFromName).toHaveBeenCalledWith('default-tenant:default-registry');
    });

    it('should handle invalid API paths', async () => {
      // This path will be treated as single-tenant mode and forwarded to default registry
      mockSchemaRegistryInstance.fetch.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Resource not found' }), { status: 404 })
      );

      const request = new Request('http://localhost/schema-registry/api/invalid/path/structure');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(404);
    });

    it('should add CORS headers to API responses', async () => {
      const mockResponse = new Response(JSON.stringify({ test: 'data' }), {
        headers: { 'Content-Type': 'application/json' }
      });
      mockSchemaRegistryInstance.fetch.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/schema-registry/api/tenant1/registry1/products');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
    });
  });

  describe('Static File Serving', () => {
    it('should serve static files from ASSETS binding', async () => {
      const mockStaticResponse = new Response('<html>Test</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
      mockAssets.fetch.mockResolvedValue(mockStaticResponse);

      const request = new Request('http://localhost/index.html');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/html');
      expect(mockAssets.fetch).toHaveBeenCalledWith(request);
    });

    it('should serve index.html for SPA routing on 404', async () => {
      const mock404Response = new Response('Not Found', { status: 404 });
      const mockIndexResponse = new Response('<html>SPA</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });

      mockAssets.fetch
        .mockResolvedValueOnce(mock404Response) // First call returns 404
        .mockResolvedValueOnce(mockIndexResponse); // Second call for index.html

      const request = new Request('http://localhost/app/dashboard');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(200);
      expect(mockAssets.fetch).toHaveBeenCalledTimes(2);
      expect(mockAssets.fetch).toHaveBeenNthCalledWith(1, request);
      expect(mockAssets.fetch).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          url: expect.stringContaining('/')
        })
      );
    });

    it('should return 400 for unknown API routes', async () => {
      const request = new Request('http://localhost/schema-registry/api/unknown');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid API path');
      // Should not try to serve index.html for API routes
      expect(mockAssets.fetch).not.toHaveBeenCalled();
    });

    it('should handle ASSETS fetch errors', async () => {
      mockAssets.fetch.mockRejectedValue(new Error('Assets error'));

      const request = new Request('http://localhost/static/file.js');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(404);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    });

    it('should handle index.html fetch errors during SPA routing', async () => {
      const mock404Response = new Response('Not Found', { status: 404 });
      mockAssets.fetch
        .mockResolvedValueOnce(mock404Response)
        .mockRejectedValueOnce(new Error('Index fetch failed'));

      const request = new Request('http://localhost/app/route');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockSchemaRegistryInstance.fetch.mockRejectedValue(new Error('Durable Object error'));

      const request = new Request('http://localhost/schema-registry/api/tenant1/registry1/products');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to process request');
      expect(responseData.tenant).toBe('tenant1');
      expect(responseData.registry).toBe('registry1');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    });

    it('should handle multi-tenant request errors', async () => {
      mockDurableObjectNamespace.get.mockImplementation(() => {
        throw new Error('Namespace error');
      });

      const request = new Request('http://localhost/schema-registry/api/tenant1/registry1/products');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to process request');
      expect(responseData.tenant).toBe('tenant1');
      expect(responseData.registry).toBe('registry1');
    });

    it('should handle registry creation errors', async () => {
      mockSchemaRegistryInstance.fetch.mockRejectedValue(new Error('Init failed'));

      const request = new Request('http://localhost/schema-registry/api/tenant1/registries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Registry' })
      });

      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to create registry');
    });

    it('should handle malformed JSON in registry creation', async () => {
      const request = new Request('http://localhost/schema-registry/api/tenant1/registries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      });

      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(500);
      const responseData = await response.json();
      expect(responseData.error).toBe('Failed to create registry');
    });
  });

  describe('Registry Management', () => {
    it('should handle unsupported methods for registry management', async () => {
      const request = new Request('http://localhost/schema-registry/api/tenant1/registries', {
        method: 'DELETE'
      });

      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(405);
      const responseData = await response.json();
      expect(responseData.error).toBe('Method not allowed');
    });

    it('should generate proper registry ID from name', async () => {
      const registryData = {
        name: 'My Test Registry With Spaces',
        description: 'Test description'
      };

      mockSchemaRegistryInstance.fetch.mockResolvedValue(new Response('OK'));

      const request = new Request('http://localhost/schema-registry/api/tenant1/registries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registryData)
      });

      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.registry.id).toBe('my-test-registry-with-spaces-registry');
    });

    it('should create registry with proper timestamp format', async () => {
      mockSchemaRegistryInstance.fetch.mockResolvedValue(new Response('OK'));

      const request = new Request('http://localhost/schema-registry/api/tenant1/registries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Registry' })
      });

      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(201);
      const responseData = await response.json();
      expect(responseData.registry.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(responseData.registry.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });
  });

  describe('Request Forwarding', () => {
    it('should forward POST requests with body to Durable Object', async () => {
      const requestBody = { name: 'Test Product' };
      const mockResponse = new Response(JSON.stringify({ id: 'product1' }));
      mockSchemaRegistryInstance.fetch.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/schema-registry/api/tenant1/registry1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(200);
      expect(mockSchemaRegistryInstance.fetch).toHaveBeenCalledWith(
        expect.any(Request)
      );

      const forwardedRequest = mockSchemaRegistryInstance.fetch.mock.calls[0][0];
      expect(forwardedRequest.method).toBe('POST');
    });

    it('should preserve headers when forwarding requests', async () => {
      const mockResponse = new Response('{}');
      mockSchemaRegistryInstance.fetch.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/schema-registry/api/tenant1/registry1/products', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123'
        }
      });

      await worker.fetch(request, mockEnv, {} as ExecutionContext);

      const forwardedRequest = mockSchemaRegistryInstance.fetch.mock.calls[0][0];
      expect(forwardedRequest.headers.get('Content-Type')).toBe('application/json');
      expect(forwardedRequest.headers.get('Authorization')).toBe('Bearer token123');
    });

    it('should construct correct URL for Durable Object', async () => {
      const mockResponse = new Response('{}');
      mockSchemaRegistryInstance.fetch.mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/schema-registry/api/tenant1/registry1/products/123');
      await worker.fetch(request, mockEnv, {} as ExecutionContext);

      const forwardedRequest = mockSchemaRegistryInstance.fetch.mock.calls[0][0];
      expect(forwardedRequest.url).toContain('/products/123');
      expect(forwardedRequest.url).not.toContain('schema-registry/api');
      expect(forwardedRequest.url).not.toContain('tenant1');
      expect(forwardedRequest.url).not.toContain('registry1');
    });
  });

  describe('Timestamp Utility', () => {
    it('should generate timestamps without milliseconds', async () => {
      const request = new Request('http://localhost/schema-registry/api/tenant1/registries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Registry' })
      });

      mockSchemaRegistryInstance.fetch.mockResolvedValue(new Response('OK'));

      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);
      const responseData = await response.json();

      // Timestamp should not contain milliseconds (.SSS part)
      expect(responseData.registry.createdAt).not.toMatch(/\.\d{3}/);
      expect(responseData.registry.updatedAt).not.toMatch(/\.\d{3}/);
      expect(responseData.registry.createdAt).toMatch(/Z$/);
      expect(responseData.registry.updatedAt).toMatch(/Z$/);
    });
  });

  describe('Default Fallback', () => {
    it('should return 404 for completely unhandled requests', async () => {
      // Mock ASSETS to throw error to trigger fallback path
      mockAssets.fetch.mockRejectedValue(new Error('Not found'));

      const request = new Request('http://localhost/completely-unknown-path');
      const response = await worker.fetch(request, mockEnv, {} as ExecutionContext);

      expect(response.status).toBe(404);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    });
  });
});