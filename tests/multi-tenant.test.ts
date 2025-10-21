import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = `http://localhost:${process.env.TEST_API_PORT || '9000'}`

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

describe('Multi-Tenant Registry Tests', () => {
  const testTenant = 'test-tenant-vitest'
  const uniqueSuffix = Date.now().toString()
  let testRegistryId: string

  describe('Registry Management', () => {
    it('should list registries for a tenant', async () => {
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/registries`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('registries')
      expect(Array.isArray(data.registries)).toBe(true)
    })

    it('should create a new registry instance', async () => {
      const newRegistry = {
        name: `Vitest Registry ${uniqueSuffix}`,
        description: 'Registry created by automated tests'
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/registries`, newRegistry)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data).toHaveProperty('registry')
      expect(data.registry).toHaveProperty('id')
      expect(data.registry).toHaveProperty('tenantId', testTenant)
      expect(data.registry).toHaveProperty('name', newRegistry.name)
      expect(data.registry).toHaveProperty('description', newRegistry.description)
      expect(data.registry).toHaveProperty('createdAt')
      expect(data.registry).toHaveProperty('updatedAt')
      
      // Store registry ID for subsequent tests
      testRegistryId = data.registry.id
    })
  })

  describe('Multi-Tenant Data Isolation', () => {
    beforeAll(async () => {
      // Ensure we have a test registry
      if (!testRegistryId) {
        const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/registries`, {
          name: `Vitest Registry ${uniqueSuffix}`,
          description: 'Registry for isolation tests'
        })
        const data = await response.json()
        testRegistryId = data.registry.id
      }
    })

    it('should have initialized with default hierarchy', async () => {
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistryId}/products`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('products')
      expect(data.products.length).toBe(1)
      
      const product = data.products[0]
      expect(product.name).toBe('My Product')
      expect(product.domains.length).toBe(1)
      expect(product.domains[0].name).toBe('My Domain')
      expect(product.domains[0].contexts.length).toBe(1)
      expect(product.domains[0].contexts[0].name).toBe('My Context')
    })

    it('should allow creating data in the multi-tenant registry', async () => {
      // First get the product ID
      const productsResponse = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistryId}/products`)
      const productsData = await productsResponse.json()
      const productId = productsData.products[0].id

      // Create a domain in the multi-tenant registry
      const newDomain = {
        name: 'Multi-Tenant Domain',
        description: 'Domain created in multi-tenant test',
        productId: productId
      }
      
      const response = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistryId}/domains`, newDomain)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('name', newDomain.name)
      expect(data).toHaveProperty('productId', productId)
    })

    it('should maintain isolation between registry instances', async () => {
      // Get data from single-tenant mode (default registry)
      const singleTenantResponse = await apiRequest('GET', '/schema-registry/api/products')
      expect(singleTenantResponse.status).toBe(200)
      const singleTenantData = await singleTenantResponse.json()
      
      // Get data from multi-tenant registry
      const multiTenantResponse = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistryId}/products`)
      expect(multiTenantResponse.status).toBe(200)
      const multiTenantData = await multiTenantResponse.json()
      
      // They should have different product IDs (proving isolation)
      const singleTenantProductId = singleTenantData.products[0].id
      const multiTenantProductId = multiTenantData.products[0].id
      
      expect(singleTenantProductId).not.toBe(multiTenantProductId)
      
      // The multi-tenant registry should have the additional domain we created
      const multiTenantProduct = multiTenantData.products[0]
      expect(multiTenantProduct.domains.length).toBe(2) // Default + our test domain
      
      const domainNames = multiTenantProduct.domains.map((d: any) => d.name)
      expect(domainNames).toContain('My Domain') // Default domain
      expect(domainNames).toContain('Multi-Tenant Domain') // Our test domain
    })
  })

  describe('Multi-Tenant CRUD Operations', () => {
    let productId: string
    let domainId: string  
    let contextId: string
    let schemaId: string

    beforeAll(async () => {
      // Get initial hierarchy IDs for CRUD tests
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistryId}/products`)
      const data = await response.json()
      const product = data.products[0]
      
      productId = product.id
      domainId = product.domains[0].id
      
      // Check if contexts exist before accessing
      if (product.domains[0].contexts && product.domains[0].contexts.length > 0) {
        contextId = product.domains[0].contexts[0].id
      } else {
        console.warn('No contexts found in initial hierarchy for CRUD tests')
        // Skip tests that require context
        contextId = ''
      }
    })

    it('should create, read, update, delete domains in multi-tenant registry', async () => {
      // CREATE
      const newDomain = {
        name: 'CRUD Test Domain',
        description: 'Domain for CRUD testing',
        productId: productId
      }
      
      const createResponse = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistryId}/domains`, newDomain)
      expect(createResponse.status).toBe(201)
      const createData = await createResponse.json()
      const createdDomainId = createData.id

      // READ
      const readResponse = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistryId}/domains/${createdDomainId}`)
      expect(readResponse.status).toBe(200)
      const readData = await readResponse.json()
      expect(readData.domain.name).toBe(newDomain.name)

      // UPDATE
      const updateData = {
        name: 'Updated CRUD Domain',
        description: 'Updated description'
      }
      
      const updateResponse = await apiRequest('PUT', `/schema-registry/api/${testTenant}/${testRegistryId}/domains/${createdDomainId}`, updateData)
      expect(updateResponse.status).toBe(200)

      // DELETE
      const deleteResponse = await apiRequest('DELETE', `/schema-registry/api/${testTenant}/${testRegistryId}/domains/${createdDomainId}`)
      expect(deleteResponse.status).toBe(200)
      
      // Verify deletion
      const verifyResponse = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistryId}/domains/${createdDomainId}`)
      expect(verifyResponse.status).toBe(404)
    })

    it('should create and manage schemas with versions in multi-tenant registry', async () => {
      // Skip if no context available
      if (!contextId) {
        console.log('Skipping schema test - no context available')
        return
      }
      
      // Create a schema
      const newSchema = {
        name: 'Test Schema',
        description: 'Schema for version testing',
        schemaTypeCategory: 'Events',
        scope: 'Public',
        contextId: contextId
      }
      
      const schemaResponse = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistryId}/schemas`, newSchema)
      expect(schemaResponse.status).toBe(201)
      const schemaData = await schemaResponse.json()
      schemaId = schemaData.id

      // Create a schema version
      const newVersion = {
        specification: '{"type": "object", "properties": {"id": {"type": "string"}}}',
        semanticVersion: '1.0.0',
        description: 'Initial version',
        status: 'Draft',
        schemaId: schemaId
      }
      
      const versionResponse = await apiRequest('POST', `/schema-registry/api/${testTenant}/${testRegistryId}/schema-versions`, newVersion)
      expect(versionResponse.status).toBe(201)
      const versionData = await versionResponse.json()
      
      expect(versionData).toHaveProperty('id')
      expect(versionData).toHaveProperty('specification', newVersion.specification)
      expect(versionData).toHaveProperty('semanticVersion', newVersion.semanticVersion)
      expect(versionData).toHaveProperty('status', newVersion.status)
      expect(versionData).toHaveProperty('schemaId', schemaId)
    })
  })

  describe('Registry Statistics in Multi-Tenant Mode', () => {
    it('should return accurate statistics for specific registry instance', async () => {
      const response = await apiRequest('GET', `/schema-registry/api/${testTenant}/${testRegistryId}/registry`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('stats')
      
      // Should have at least the default data plus any test data
      expect(data.stats.products).toBeGreaterThanOrEqual(1)
      expect(data.stats.domains).toBeGreaterThanOrEqual(1)
      expect(data.stats.contexts).toBeGreaterThanOrEqual(1)
      
      // Verify these are numbers
      expect(typeof data.stats.products).toBe('number')
      expect(typeof data.stats.domains).toBe('number')
      expect(typeof data.stats.contexts).toBe('number')
      expect(typeof data.stats.schemas).toBe('number')
      expect(typeof data.stats.versions).toBe('number')
    })
  })
})