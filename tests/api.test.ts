import { describe, it, expect, beforeEach } from 'vitest'

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

describe('Schema Registry API', () => {
  describe('API Root', () => {
    it('should return API information', async () => {
      const response = await apiRequest('GET', '/schema-registry/api/')
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('message', 'Schema Registry API')
      expect(data).toHaveProperty('version', '1.0.0')
      expect(data).toHaveProperty('routes')
    })
  })

  describe('Multi-Tenant Mode - Products', () => {
    it('should return products with initial data', async () => {
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/products`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('products')
      expect(Array.isArray(data.products)).toBe(true)
      expect(data.products.length).toBeGreaterThan(0)
      
      // Check initial product structure
      const product = data.products[0]
      expect(product).toHaveProperty('id')
      expect(product).toHaveProperty('name', 'Test Product')
      expect(product).toHaveProperty('domains')
      expect(Array.isArray(product.domains)).toBe(true)
    })

    it('should create a new product', async () => {
      const newProduct = {
        name: 'Test Product',
        description: 'A test product for API testing'
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/products`, newProduct)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('name', newProduct.name)
      expect(data).toHaveProperty('description', newProduct.description)
      expect(data).toHaveProperty('createdAt')
      expect(data).toHaveProperty('updatedAt')
      expect(data).toHaveProperty('domains')
      expect(Array.isArray(data.domains)).toBe(true)
    })
  })

  describe('Multi-Tenant Mode - Domains', () => {
    let productId: string

    beforeEach(async () => {
      // Get existing product ID for domain tests
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/products`)
      const data = await response.json()
      productId = data.products[0].id
    })

    it('should create a new domain', async () => {
      const newDomain = {
        name: 'Test Domain',
        description: 'A test domain',
        productId: productId
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/domains`, newDomain)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('name', newDomain.name)
      expect(data).toHaveProperty('description', newDomain.description)
      expect(data).toHaveProperty('productId', productId)
      expect(data).toHaveProperty('contexts')
      expect(Array.isArray(data.contexts)).toBe(true)
    })

    it('should get all domains', async () => {
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/domains`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('domains')
      expect(Array.isArray(data.domains)).toBe(true)
    })
  })

  describe('Multi-Tenant Mode - Contexts', () => {
    let domainId: string

    beforeEach(async () => {
      // Get existing domain ID for context tests
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/products`)
      const data = await response.json()
      domainId = data.products[0].domains[0].id
    })

    it('should create a new context', async () => {
      const newContext = {
        name: 'Test Context',
        description: 'A test context',
        domainId: domainId
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/contexts`, newContext)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('name', newContext.name)
      expect(data).toHaveProperty('description', newContext.description)
      expect(data).toHaveProperty('domainId', domainId)
      expect(data).toHaveProperty('schemas')
      expect(Array.isArray(data.schemas)).toBe(true)
    })

    it('should get all contexts', async () => {
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/contexts`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('contexts')
      expect(Array.isArray(data.contexts)).toBe(true)
    })
  })

  describe('Multi-Tenant Mode - Schemas', () => {
    let contextId: string

    beforeEach(async () => {
      // Get existing context ID for schema tests
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/products`)
      const data = await response.json()
      contextId = data.products[0].domains[0].contexts[0].id
    })

    it('should create a new schema', async () => {
      const newSchema = {
        name: 'Test Schema',
        description: 'A test schema',
        schemaTypeCategory: 'Commands',
        scope: 'Public',
        contextId: contextId
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistry}/schemas`, newSchema)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('name', newSchema.name)
      expect(data).toHaveProperty('description', newSchema.description)
      expect(data).toHaveProperty('schemaTypeCategory', newSchema.schemaTypeCategory)
      expect(data).toHaveProperty('scope', newSchema.scope)
      expect(data).toHaveProperty('contextId', contextId)
      expect(data).toHaveProperty('versions')
      expect(Array.isArray(data.versions)).toBe(true)
    })

    it('should get all schemas', async () => {
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/schemas`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('schemas')
      expect(Array.isArray(data.schemas)).toBe(true)
    })
  })

  describe('Registry Stats', () => {
    it('should return registry statistics', async () => {
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistry}/registry`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('stats')
      expect(data.stats).toHaveProperty('products')
      expect(data.stats).toHaveProperty('domains')
      expect(data.stats).toHaveProperty('contexts')
      expect(data.stats).toHaveProperty('schemas')
      expect(data.stats).toHaveProperty('versions')
      expect(typeof data.stats.products).toBe('number')
      expect(typeof data.stats.domains).toBe('number')
      expect(typeof data.stats.contexts).toBe('number')
      expect(typeof data.stats.schemas).toBe('number')
      expect(typeof data.stats.versions).toBe('number')
    })
  })
})