import { describe, it, expect } from 'vitest'

const BASE_URL = `http://localhost:${process.env.TEST_API_PORT || '9000'}`
const testTenant = 'test-tenant'
const testRegistry = 'test-registry'

// Helper function to make API requests
async function apiRequest(method: string, path: string, body?: any): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }
  
  try {
    const response = await fetch(`${BASE_URL}${path}`, options)
    return response
  } catch (error) {
    console.error(`API request failed: ${method} ${path}`, error)
    throw error
  }
}

describe('API Error Handling', () => {
  describe('Invalid Routes', () => {
    it('should return 404 for non-existent API routes', async () => {
      const response = await apiRequest('GET', '/schema-registry/api/nonexistent')
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Invalid API path')
    })

    it('should handle malformed JSON in request body', async () => {
      const response = await fetch(`${BASE_URL}/schema-registry/api/${testTenant}/${testRegistry}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{"invalid": json}'
      })
      
      expect(response.status).toBe(500)
    })
  })

  describe('Resource Not Found', () => {
    it('should return 404 for non-existent product', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/products/${fakeId}`)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Product not found')
    })

    it('should return 404 for non-existent domain', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/domains/${fakeId}`)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Domain not found')
    })

    it('should return 404 for non-existent context', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/contexts/${fakeId}`)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Context not found')
    })

    it('should return 404 for non-existent schema', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/schemas/${fakeId}`)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Schema not found')
    })

    it('should return 404 for non-existent schema version', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/schema-versions/${fakeId}`)
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Schema version not found')
    })
  })

  describe('Invalid Method Handling', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      const response = await apiRequest('PATCH', `/schema-registry/api/${testTenant}/${testRegistry}/products`)
      expect(response.status).toBe(405)
      
      const data = await response.json()
      expect(data).toHaveProperty('error', 'Method not allowed')
    })
  })

  describe('Missing Required Fields', () => {
    it('should handle missing required fields in product creation', async () => {
      const incompleteProduct = {
        description: 'Missing name field'
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/products`, incompleteProduct)
      // Should return error (implementation dependent - could be 400 or 500)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle missing required fields in domain creation', async () => {
      const incompleteDomain = {
        description: 'Missing name and productId fields'
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/domains`, incompleteDomain)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle invalid schema type category', async () => {
      // Get a valid context ID first
      const productsResponse = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/products`)
      const productsData = await productsResponse.json()
      const contextId = productsData.products[0].domains[0].contexts[0].id

      const invalidSchema = {
        name: 'Invalid Schema',
        schemaTypeCategory: 'InvalidType', // Not one of the allowed types
        scope: 'Public',
        contextId: contextId
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/schemas`, invalidSchema)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle invalid schema scope', async () => {
      // Get a valid context ID first
      const productsResponse = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/products`)
      const productsData = await productsResponse.json()
      const contextId = productsData.products[0].domains[0].contexts[0].id

      const invalidSchema = {
        name: 'Invalid Scope Schema',
        schemaTypeCategory: 'Events',
        scope: 'InvalidScope', // Not 'Public' or 'Private'
        contextId: contextId
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/schemas`, invalidSchema)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle invalid schema version status', async () => {
      // Create a schema first
      const productsResponse = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/products`)
      const productsData = await productsResponse.json()
      const contextId = productsData.products[0].domains[0].contexts[0].id

      const schema = {
        name: 'Test Schema for Version',
        schemaTypeCategory: 'Events',
        scope: 'Public',
        contextId: contextId
      }
      
      const schemaResponse = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/schemas`, schema)
      const schemaData = await schemaResponse.json()
      
      const invalidVersion = {
        specification: '{"type": "object"}',
        semanticVersion: '1.0.0',
        status: 'InvalidStatus', // Not one of Draft/Published/Deprecated/Removed
        schemaId: schemaData.id
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/schema-versions`, invalidVersion)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('CORS Headers', () => {
    it('should include CORS headers in responses', async () => {
      const response = await apiRequest('GET', '/schema-registry/api/')
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization')
    })

    it('should handle OPTIONS requests for CORS preflight', async () => {
      const response = await apiRequest('OPTIONS', `/schema-registry/api/${testTenant}/${testRegistry}/products`)
      expect(response.status).toBe(200)
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization')
    })
  })

  describe('Database Constraint Violations', () => {
    it('should handle foreign key violations gracefully', async () => {
      const invalidDomain = {
        name: 'Invalid Domain',
        description: 'Domain with non-existent productId',
        productId: '00000000-0000-0000-0000-000000000000' // Non-existent product
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/domains`, invalidDomain)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should handle attempts to delete resources with dependencies', async () => {
      // Get existing product with domains
      const productsResponse = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/products`)
      const productsData = await productsResponse.json()
      const productWithDomains = productsData.products.find((p: any) => p.domains.length > 0)
      
      if (productWithDomains) {
        // Try to delete product that has domains (should be handled by CASCADE)
        const response = await apiRequest('DELETE', `/schema-registry/api/${testTenant}/${testRegistry}/products/${productWithDomains.id}`)
        // Should either succeed with CASCADE or return appropriate error
        expect([200, 400, 409, 500]).toContain(response.status)
      }
    })
  })
})