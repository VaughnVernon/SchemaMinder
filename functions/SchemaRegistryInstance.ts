/// <reference types="@cloudflare/workers-types" />
import { Product, Domain, Context, Schema, SchemaVersion } from "./types";
import { DatabaseMigrations } from "./persistence/migrations";
import { DatabaseOperations } from "./persistence/operations";
import { UserDatabaseOperations } from "./persistence/userOperations";
import { SubscriptionOperations } from "./persistence/subscriptionOperations";
import { ChangeTrackingOperations } from "./persistence/changeTrackingOperations";
import { SessionService } from "./services/sessionService";

export class SchemaRegistryInstance implements DurableObject {
  private sql: SqlStorage;
  private ctx: DurableObjectState;
  private env: any;
  private migrations: DatabaseMigrations;
  private operations: DatabaseOperations;
  private userOps: UserDatabaseOperations;
  private subscriptionOps: SubscriptionOperations;
  private changeTrackingOps: ChangeTrackingOperations;
  private sessionService: SessionService;

  constructor(ctx: DurableObjectState, env: any) {
    this.ctx = ctx;
    this.env = env;
    this.sql = ctx.storage.sql;
    this.migrations = new DatabaseMigrations(ctx, this.sql);
    this.operations = new DatabaseOperations(this.sql);
    this.userOps = new UserDatabaseOperations(this.sql);
    this.subscriptionOps = new SubscriptionOperations(ctx, this.sql);
    this.changeTrackingOps = new ChangeTrackingOperations(this.sql);
    this.sessionService = new SessionService(this.sql);
  }

  private getTimestamp(): string {
    // Return ISO string without milliseconds (remove .SSSZ and add Z)
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  private async extractUserIdFromRequest(request: Request): Promise<string | null> {
    try {
      const cookieHeader = request.headers.get('Cookie');
      const authHeader = request.headers.get('Authorization');

      const sessionToken =
        this.sessionService.extractTokenFromCookie(cookieHeader) ||
        this.sessionService.extractTokenFromHeader(authHeader);

      if (!sessionToken) {
        return null;
      }

      const validationResult = await this.sessionService.validateSessionToken(sessionToken);

      if (!validationResult.isValid || !validationResult.context?.user) {
        return null;
      }

      return validationResult.context.user.id;
    } catch (error) {
      console.error('Error extracting user ID:', error);
      return null;
    }
  }

  private async notifyPartyKit(
    type: string,
    entityId: string,
    entityType: 'product' | 'domain' | 'context' | 'schema' | 'version',
    data: any
  ): Promise<void> {
    try {
      // Get the tenant and registry IDs from somewhere (e.g., environment or request context)
      // For now, we'll use default values - in production, these should come from the request
      const tenantId = this.env.TENANT_ID || 'default-tenant';
      const registryId = this.env.REGISTRY_ID || 'default-registry';
      const roomId = `${tenantId}-${registryId}`;

      // Determine PartyKit URL based on environment
      let partyKitUrl: string;
      if (this.env.PARTYKIT_HOST) {
        // Production environment - use configured host
        partyKitUrl = `https://${this.env.PARTYKIT_HOST}/parties/main/${roomId}`;
      } else {
        // Development environment - use local PartyKit server
        partyKitUrl = `http://localhost:1999/parties/main/${roomId}`;
      }

      // Send notification to PartyKit
      const response = await fetch(partyKitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          entityId,
          entityType,
          data,
          timestamp: this.getTimestamp(),
          source: 'durable-object',
        }),
      });

      if (!response.ok) {
        console.error(`Failed to notify PartyKit: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      // Log error but don't fail the operation
      console.error('Error notifying PartyKit:', error);
    }
  }

  async fetch(request: Request): Promise<Response> {
    // Handle CORS with credentials support
    const origin = request.headers.get('Origin') || 'http://localhost:5173';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Initialize database schema if not exists
      await this.initializeSchema();

      const url = new URL(request.url);
      const response = await this.handleRequest(request, url);
      
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    } catch (error) {
      console.error('Registry Instance Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  private async initializeSchema(): Promise<void> {
    try {
      const isNewDatabase = await this.migrations.needsInitialization();
      
      if (isNewDatabase) {
        // Initialize schema for new database
        await this.migrations.initializeSchema();
        // Initialize with sample data for new databases
        await this.migrations.initializeSampleData();
      } else {
        // Handle migrations for existing databases
        await this.migrations.runMigrations();
      }
    } catch (error) {
      console.error('Schema initialization error:', error);
      throw error;
    }
  }

  private async handleRequest(request: Request, url: URL): Promise<Response> {
    const method = request.method;
    const pathParts = url.pathname.split('/').filter(p => p);
    
    // Expecting paths like: /products, /domains, /contexts, etc.
    const resource = pathParts[0];
    const resourceId = pathParts[1];

    switch (resource) {
      case 'health':
        // Lightweight health check (no database queries)
        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'schema-registry-durable-object',
          timestamp: this.getTimestamp()
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      case 'products':
        return this.handleProducts(method, resourceId, request);
      case 'domains':
        return this.handleDomains(method, resourceId, request);
      case 'contexts':
        return this.handleContexts(method, resourceId, request);
      case 'schemas':
        return this.handleSchemas(method, resourceId, request);
      case 'schema-versions':
        return this.handleSchemaVersions(method, resourceId, request);
      case 'registry':
        return this.handleRegistryOperations(method, request);
      case 'find':
        return this.handleFind(method, request);
      case 'auth':
        return this.handleAuth(method, pathParts[1], request);
      case 'admin':
        return this.handleAdmin(method, pathParts[1], request);
      case 'debug-db':
        return this.handleDebugDatabase(method, request);
      case 'changes':
        return this.handleChanges(method, pathParts[1], request);
      case 'subscriptions':
        return this.handleSubscriptions(method, pathParts[1], request);
      case 'user':
        return this.handleUser(method, pathParts[1], request);
      default:
        return new Response(JSON.stringify({ error: 'Resource not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  }

  private async handleProducts(method: string, productId: string | undefined, request: Request): Promise<Response> {
    switch (method) {
      case 'GET':
        if (productId) {
          return this.getProduct(productId);
        }
        return this.getAllProducts();
      case 'POST':
        return this.createProduct(request);
      case 'PUT':
        if (productId) {
          return this.updateProduct(productId, request);
        }
        break;
      case 'DELETE':
        if (productId) {
          return this.deleteProduct(productId, request);
        }
        break;
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getAllProducts(): Promise<Response> {
    try {
      const products = await this.operations.getAllProducts();
      return new Response(JSON.stringify({ products }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Registry Instance Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async createProduct(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { name: string; description?: string };
      const { name, description } = body;
      const id = crypto.randomUUID();

      await this.operations.createProduct(id, name, description || null);

      const product = { 
        id, 
        name, 
        description, 
        createdAt: this.getTimestamp(), 
        updatedAt: this.getTimestamp(),
        domains: []
      };

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      await this.changeTrackingOps.recordChange(
        'product',
        id,
        name,
        'created',
        { after: product },
        userId || undefined
      );

      // Notify PartyKit about the new product
      await this.notifyPartyKit('product_created', id, 'product', product);

      return new Response(JSON.stringify(product), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Create product error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async updateProduct(productId: string, request: Request): Promise<Response> {
    try {
      const body = await request.json() as { name: string; description?: string };
      const { name, description } = body;

      // Get the current product state for change tracking
      const beforeProduct = await this.operations.getProduct(productId);

      await this.operations.updateProduct(productId, name, description || null);

      const updateData = {
        id: productId,
        name,
        description,
        updatedAt: this.getTimestamp()
      };

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      await this.changeTrackingOps.recordChange(
        'product',
        productId,
        name,
        'updated',
        {
          before: beforeProduct,
          after: updateData
        },
        userId || undefined
      );

      // Notify PartyKit about the product update
      await this.notifyPartyKit('product_updated', productId, 'product', updateData);

      return new Response(JSON.stringify({ 
        success: true,
        updatedAt: this.getTimestamp()
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Update product error:', error);
      return new Response(JSON.stringify({ error: 'Failed to update product' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async deleteProduct(productId: string, request: Request): Promise<Response> {
    try {
      // Get the product state before deletion for change tracking
      const beforeProduct = await this.operations.getProduct(productId);

      await this.operations.deleteProduct(productId);

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      if (beforeProduct) {
        await this.changeTrackingOps.recordChange(
          'product',
          productId,
          beforeProduct.name,
          'deleted',
          { before: beforeProduct },
          userId || undefined
        );
      }

      // Notify PartyKit about the product deletion
      await this.notifyPartyKit('product_deleted', productId, 'product', { id: productId });

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Delete product error:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete product' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async getProduct(productId: string): Promise<Response> {
    try {
      const product = await this.operations.getProductById(productId);
      
      if (!product) {
        return new Response(JSON.stringify({ error: 'Product not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(product), {
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Get product error:', error);
      return new Response(JSON.stringify({ error: 'Failed to get product' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleDomains(method: string, resourceId: string | undefined, request: Request): Promise<Response> {
    switch (method) {
      case 'GET':
        if (resourceId) {
          return this.getDomain(resourceId);
        }
        return this.getAllDomains();
      case 'POST':
        return this.createDomain(request);
      case 'PUT':
        if (resourceId) {
          return this.updateDomain(resourceId, request);
        }
        break;
      case 'DELETE':
        if (resourceId) {
          return this.deleteDomain(resourceId, request);
        }
        break;
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleContexts(method: string, resourceId: string | undefined, request: Request): Promise<Response> {
    switch (method) {
      case 'GET':
        if (resourceId) {
          return this.getContext(resourceId);
        }
        return this.getAllContexts();
      case 'POST':
        return this.createContext(request);
      case 'PUT':
        if (resourceId) {
          return this.updateContext(resourceId, request);
        }
        break;
      case 'DELETE':
        if (resourceId) {
          return this.deleteContext(resourceId, request);
        }
        break;
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleSchemas(method: string, resourceId: string | undefined, request: Request): Promise<Response> {
    switch (method) {
      case 'GET':
        if (resourceId) {
          return this.getSchema(resourceId);
        }
        return this.getAllSchemas();
      case 'POST':
        return this.createSchema(request);
      case 'PUT':
        if (resourceId) {
          return this.updateSchema(resourceId, request);
        }
        break;
      case 'DELETE':
        if (resourceId) {
          return this.deleteSchema(resourceId, request);
        }
        break;
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleSchemaVersions(method: string, resourceId: string | undefined, request: Request): Promise<Response> {
    switch (method) {
      case 'GET':
        if (resourceId) {
          return this.getSchemaVersion(resourceId);
        }
        return this.getAllSchemaVersions();
      case 'POST':
        return this.createSchemaVersion(request);
      case 'PUT':
        if (resourceId) {
          return this.updateSchemaVersion(resourceId, request);
        }
        break;
      case 'DELETE':
        if (resourceId) {
          return this.deleteSchemaVersion(resourceId, request);
        }
        break;
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleRegistryOperations(method: string, request: Request): Promise<Response> {
    if (method === 'GET') {
      // Return registry info/stats
      const stats = await this.getRegistryStats();
      return new Response(JSON.stringify(stats), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleFind(method: string, request: Request): Promise<Response> {
    if (method === 'GET') {
      const url = new URL(request.url);
      const query = url.searchParams.get('q');
      
      if (!query || query.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Query parameter "q" is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      try {
        const results = await this.operations.find(query.trim());
        
        // Format results for frontend
        const formattedResults = results.map(row => {
          // Build path string
          const pathParts = [];
          if (row.product_name) pathParts.push(row.product_name);
          if (row.domain_name) pathParts.push(row.domain_name);
          if (row.context_name) pathParts.push(row.context_name);
          if (row.schema_name && row.type !== 'schema') pathParts.push(row.schema_name);
          
          return {
            id: `${row.type}_${row.entity_id}`,
            type: row.type,
            name: row.name,
            description: row.description || '',
            path: pathParts.join(' > '),
            entityId: row.entity_id,
            parentIds: {
              productId: row.product_id,
              domainId: row.domain_id,
              contextId: row.context_id,
              schemaId: row.schema_id,
            },
          };
        });
        
        return new Response(JSON.stringify({ results: formattedResults }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Find error:', error);
        return new Response(JSON.stringify({ error: 'Find failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getRegistryStats(): Promise<any> {
    try {
      const stats = await this.operations.getRegistryStatistics();
      return { stats };
    } catch (error) {
      console.error('Get registry stats error:', error);
      return { stats: { error: 'Failed to get stats' } };
    }
  }

  // Domain CRUD operations
  private async getAllDomains(): Promise<Response> {
    try {
      const results = await this.operations.getAllDomains();
      return new Response(JSON.stringify({ domains: results }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get domains error:', error);
      return new Response(JSON.stringify({ error: 'Failed to get domains' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async getDomain(domainId: string): Promise<Response> {
    try {
      const domain = await this.operations.getDomainById(domainId);
      
      if (!domain) {
        return new Response(JSON.stringify({ error: 'Domain not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ domain }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get domain error:', error);
      return new Response(JSON.stringify({ error: 'Failed to get domain' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async createDomain(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { name: string; description?: string; productId: string };
      const { name, description, productId } = body;
      const id = crypto.randomUUID();
      const timestamp = this.getTimestamp();

      await this.operations.createDomain(id, name, description || null, productId);

      const domain = { 
        id, 
        name, 
        description,
        productId,
        createdAt: timestamp, 
        updatedAt: timestamp,
        contexts: []
      };

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      await this.changeTrackingOps.recordChange(
        'domain',
        id,
        name,
        'created',
        { after: domain },
        userId || undefined
      );

      // Notify PartyKit about the new domain
      await this.notifyPartyKit('domain_created', id, 'domain', domain);

      return new Response(JSON.stringify(domain), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Create domain error:', error);
      return new Response(JSON.stringify({ error: 'Failed to create domain' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async updateDomain(domainId: string, request: Request): Promise<Response> {
    try {
      const body = await request.json() as { name: string; description?: string };
      const { name, description } = body;
      const timestamp = this.getTimestamp();

      // Get the current state before update
      const beforeDomain = await this.operations.getDomain(domainId);

      await this.operations.updateDomain(domainId, name, description || null);

      const updateData = {
        id: domainId,
        name,
        description,
        updatedAt: timestamp
      };

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      await this.changeTrackingOps.recordChange(
        'domain',
        domainId,
        name,
        'updated',
        {
          before: beforeDomain,
          after: updateData
        },
        userId || undefined
      );

      // Notify PartyKit about the domain update
      await this.notifyPartyKit('domain_updated', domainId, 'domain', updateData);

      return new Response(JSON.stringify({
        success: true,
        updatedAt: timestamp
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Update domain error:', error);
      return new Response(JSON.stringify({ error: 'Failed to update domain' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async deleteDomain(domainId: string, request: Request): Promise<Response> {
    try {
      // Get the state before deletion
      const beforeDomain = await this.operations.getDomain(domainId);

      await this.operations.deleteDomain(domainId);

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      if (beforeDomain) {
        await this.changeTrackingOps.recordChange(
          'domain',
          domainId,
          beforeDomain.name,
          'deleted',
          { before: beforeDomain },
          userId || undefined
        );
      }

      // Notify PartyKit about the domain deletion
      await this.notifyPartyKit('domain_deleted', domainId, 'domain', { id: domainId });

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Delete domain error:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete domain' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Context CRUD operations
  private async getAllContexts(): Promise<Response> {
    try {
      const results = await this.operations.getAllContexts();
      return new Response(JSON.stringify({ contexts: results }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get contexts error:', error);
      return new Response(JSON.stringify({ error: 'Failed to get contexts' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async getContext(contextId: string): Promise<Response> {
    try {
      const context = await this.operations.getContextById(contextId);
      
      if (!context) {
        return new Response(JSON.stringify({ error: 'Context not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ context }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get context error:', error);
      return new Response(JSON.stringify({ error: 'Failed to get context' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async createContext(request: Request): Promise<Response> {
    try {
      const body = await request.json() as { name: string; namespace?: string; description?: string; domainId: string };
      const { name, namespace, description, domainId } = body;
      const id = crypto.randomUUID();
      const timestamp = this.getTimestamp();

      await this.operations.createContext(id, name, namespace || null, description || null, domainId);

      const context = {
        id,
        name,
        namespace,
        description,
        domainId,
        createdAt: timestamp,
        updatedAt: timestamp,
        schemas: []
      };

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      await this.changeTrackingOps.recordChange(
        'context',
        id,
        name,
        'created',
        { after: context },
        userId || undefined
      );

      // Notify PartyKit about the new context
      await this.notifyPartyKit('context_created', id, 'context', context);

      return new Response(JSON.stringify(context), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Create context error:', error);
      return new Response(JSON.stringify({ error: 'Failed to create context' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async updateContext(contextId: string, request: Request): Promise<Response> {
    try {
      const body = await request.json() as { name: string; namespace?: string; description?: string };
      const { name, namespace, description } = body;
      const timestamp = this.getTimestamp();

      // Get the current state before update
      const beforeContext = await this.operations.getContext(contextId);

      await this.operations.updateContext(contextId, name, namespace || null, description || null);

      const updateData = {
        id: contextId,
        name,
        namespace,
        description,
        updatedAt: timestamp
      };

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      await this.changeTrackingOps.recordChange(
        'context',
        contextId,
        name,
        'updated',
        {
          before: beforeContext,
          after: updateData
        },
        userId || undefined
      );

      // Notify PartyKit about the context update
      await this.notifyPartyKit('context_updated', contextId, 'context', updateData);

      return new Response(JSON.stringify({
        success: true,
        updatedAt: timestamp
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Update context error:', error);
      return new Response(JSON.stringify({ error: 'Failed to update context' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async deleteContext(contextId: string, request: Request): Promise<Response> {
    try {
      // Get the state before deletion
      const beforeContext = await this.operations.getContext(contextId);

      await this.operations.deleteContext(contextId);

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      if (beforeContext) {
        await this.changeTrackingOps.recordChange(
          'context',
          contextId,
          beforeContext.name,
          'deleted',
          { before: beforeContext },
          userId || undefined
        );
      }

      // Notify PartyKit about the context deletion
      await this.notifyPartyKit('context_deleted', contextId, 'context', { id: contextId });

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Delete context error:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete context' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Schema CRUD operations
  private async getAllSchemas(): Promise<Response> {
    try {
      const results = await this.operations.getAllSchemas();
      return new Response(JSON.stringify({ schemas: results }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get schemas error:', error);
      return new Response(JSON.stringify({ error: 'Failed to get schemas' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async getSchema(schemaId: string): Promise<Response> {
    try {
      const schema = await this.operations.getSchemaById(schemaId);
      
      if (!schema) {
        return new Response(JSON.stringify({ error: 'Schema not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ schema }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get schema error:', error);
      return new Response(JSON.stringify({ error: 'Failed to get schema' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async createSchema(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        name: string;
        description?: string;
        schemaTypeCategory: string;
        scope: string;
        contextId: string
      };
      const { name, description, schemaTypeCategory, scope, contextId } = body;
      const id = crypto.randomUUID();
      const timestamp = this.getTimestamp();

      await this.operations.createSchema(id, name, description || null, schemaTypeCategory, scope, contextId);

      const schema = {
        id,
        name,
        description,
        schemaTypeCategory,
        scope,
        contextId,
        createdAt: timestamp,
        updatedAt: timestamp,
        versions: []
      };

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      await this.changeTrackingOps.recordChange(
        'schema',
        id,
        name,
        'created',
        { after: schema },
        userId || undefined
      );

      // Notify PartyKit about the new schema
      await this.notifyPartyKit('schema_created', id, 'schema', schema);

      return new Response(JSON.stringify(schema), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Create schema error:', error);
      return new Response(JSON.stringify({ error: 'Failed to create schema' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async updateSchema(schemaId: string, request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        name: string;
        description?: string;
        schemaTypeCategory: string;
        scope: string;
        versions?: Array<{
          versionId: string;
          specification: string;
          semanticVersion: string;
          description: string | null;
          status: string;
        }>;
      };
      const { name, description, schemaTypeCategory, scope, versions } = body;
      const timestamp = this.getTimestamp();

      // Get the current state before update
      const beforeSchema = await this.operations.getSchema(schemaId);

      // Check if version updates are provided (Rule 2: schema name change)
      if (versions && versions.length > 0) {
        // Use transactional update for schema with version specification updates
        await this.operations.updateSchemaWithVersionSpecifications(
          schemaId,
          name,
          description || null,
          schemaTypeCategory,
          scope,
          versions.map(v => ({
            versionId: v.versionId,
            specification: v.specification,
            semanticVersion: v.semanticVersion,
            description: v.description,
            status: v.status
          }))
        );
      } else {
        // Use regular update for schema metadata only
        await this.operations.updateSchema(schemaId, name, description || null, schemaTypeCategory, scope);
      }

      const updateData = {
        id: schemaId,
        name,
        description,
        schemaTypeCategory,
        scope,
        updatedAt: timestamp
      };

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      await this.changeTrackingOps.recordChange(
        'schema',
        schemaId,
        name,
        'updated',
        {
          before: beforeSchema,
          after: updateData
        },
        userId || undefined
      );

      // Notify PartyKit about the schema update
      await this.notifyPartyKit('schema_updated', schemaId, 'schema', updateData);

      return new Response(JSON.stringify({
        success: true,
        updatedAt: timestamp
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Update schema error:', error);
      return new Response(JSON.stringify({ error: 'Failed to update schema' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async deleteSchema(schemaId: string, request: Request): Promise<Response> {
    try {
      // Get the state before deletion
      const beforeSchema = await this.operations.getSchema(schemaId);

      await this.operations.deleteSchema(schemaId);

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      if (beforeSchema) {
        await this.changeTrackingOps.recordChange(
          'schema',
          schemaId,
          beforeSchema.name,
          'deleted',
          { before: beforeSchema },
          userId || undefined
        );
      }

      // Notify PartyKit about the schema deletion
      await this.notifyPartyKit('schema_deleted', schemaId, 'schema', { id: schemaId });

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Delete schema error:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete schema' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Schema Version CRUD operations
  private async getAllSchemaVersions(): Promise<Response> {
    try {
      const results = await this.operations.getAllSchemaVersions();
      return new Response(JSON.stringify({ versions: results }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get schema versions error:', error);
      return new Response(JSON.stringify({ error: 'Failed to get schema versions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async getSchemaVersion(versionId: string): Promise<Response> {
    try {
      const version = await this.operations.getSchemaVersionById(versionId);
      
      if (!version) {
        return new Response(JSON.stringify({ error: 'Schema version not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ version }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Get schema version error:', error);
      return new Response(JSON.stringify({ error: 'Failed to get schema version' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async createSchemaVersion(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        specification: string;
        semanticVersion: string;
        description?: string;
        status: string;
        schemaId: string
      };
      const { specification, semanticVersion, description, status, schemaId } = body;
      const id = crypto.randomUUID();
      const timestamp = this.getTimestamp();

      await this.operations.createSchemaVersion(id, specification, semanticVersion, description || null, status, schemaId);

      const version = {
        id,
        specification,
        semanticVersion,
        description,
        status,
        schemaId,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Record change in global change tracker with schema context
      const userId = await this.extractUserIdFromRequest(request);

      // Get schema information to include in change data
      const schema = await this.operations.getSchemaById(schemaId);
      const enrichedChangeData = {
        after: version,
        schemaName: schema?.name,
        schemaTypeCategory: schema?.schemaTypeCategory
      };

      await this.changeTrackingOps.recordChange(
        'schema_version',
        id,
        schema?.name || semanticVersion, // Use schema name as entity name, fallback to version
        'created',
        enrichedChangeData,
        userId || undefined
      );

      // Notify PartyKit about the new schema version
      await this.notifyPartyKit('version_created', id, 'version', version);

      return new Response(JSON.stringify(version), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Create schema version error:', error);
      return new Response(JSON.stringify({ error: 'Failed to create schema version' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async updateSchemaVersion(versionId: string, request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        specification: string;
        semanticVersion: string;
        description?: string;
        status: string;
      };
      const { specification, semanticVersion, description, status } = body;
      const timestamp = this.getTimestamp();

      // Get the current state before update
      const beforeVersion = await this.operations.getSchemaVersionById(versionId);

      await this.operations.updateSchemaVersion(versionId, specification, semanticVersion, description || null, status);

      const updateData = {
        id: versionId,
        specification,
        semanticVersion,
        description,
        status,
        updatedAt: timestamp
      };

      // Record change in global change tracker with schema context
      const userId = await this.extractUserIdFromRequest(request);
      console.log('DEBUG: About to record change for schema version update:', {
        versionId,
        semanticVersion,
        userId: userId || 'null',
        hasChangeTrackingOps: !!this.changeTrackingOps
      });

      // Get schema information to include in change data
      const schema = beforeVersion?.schemaId ? await this.operations.getSchemaById(beforeVersion.schemaId) : null;
      const enrichedChangeData = {
        before: beforeVersion,
        after: updateData,
        schemaName: schema?.name,
        schemaTypeCategory: schema?.schemaTypeCategory
      };

      const recordResult = await this.changeTrackingOps.recordChange(
        'schema_version',
        versionId,
        schema?.name || semanticVersion, // Use schema name as entity name, fallback to version
        'updated',
        enrichedChangeData,
        userId || undefined
      );

      console.log('DEBUG: Change record result:', recordResult);

      // Notify PartyKit about the schema version update
      await this.notifyPartyKit('version_updated', versionId, 'version', updateData);

      return new Response(JSON.stringify({
        success: true,
        updatedAt: timestamp
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Update schema version error:', error);
      return new Response(JSON.stringify({ error: 'Failed to update schema version' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async deleteSchemaVersion(versionId: string, request: Request): Promise<Response> {
    try {
      // Get the state before deletion
      const beforeVersion = await this.operations.getSchemaVersionById(versionId);

      await this.operations.deleteSchemaVersion(versionId);

      // Record change in global change tracker
      const userId = await this.extractUserIdFromRequest(request);
      if (beforeVersion) {
        await this.changeTrackingOps.recordChange(
          'schema_version',
          versionId,
          beforeVersion.semanticVersion,
          'deleted',
          { before: beforeVersion },
          userId || undefined
        );
      }

      // Notify PartyKit about the schema version deletion
      await this.notifyPartyKit('version_deleted', versionId, 'version', { id: versionId });

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Delete schema version error:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete schema version' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ================== AUTHENTICATION HANDLERS ==================

  private async handleAuth(method: string, action: string, request: Request): Promise<Response> {
    switch (action) {
      case 'register':
        return method === 'POST' ? this.handleRegister(request) : this.methodNotAllowed();
      case 'login':
        return method === 'POST' ? this.handleLogin(request) : this.methodNotAllowed();
      case 'logout':
        return method === 'POST' ? this.handleLogout(request) : this.methodNotAllowed();
      case 'validate':
        return method === 'GET' ? this.handleValidateSession(request) : this.methodNotAllowed();
      default:
        return new Response(JSON.stringify({ error: 'Authentication action not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  }

  private async handleRegister(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        fullName: string;
        emailAddress: string;
        password: string;
        rememberMe?: boolean;
      };

      const result = await this.userOps.createUser(body);
      
      if (!result.success) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: result.error 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create response with user data
      const responseData = {
        success: true,
        user: result.user
      };

      const response = new Response(JSON.stringify(responseData), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });

      // Set session cookie if remember me was enabled
      if (result.sessionToken && result.expiresAt) {
        const cookieString = this.sessionService.createSessionCookie(
          result.sessionToken,
          result.expiresAt,
          {
            secure: false, // Force secure=false for development
            domain: undefined, // Don't set domain for localhost
            sameSite: 'Lax' // Ensure Lax for development
          }
        );
        response.headers.set('Set-Cookie', cookieString);
      }

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request data' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleLogin(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        emailAddress: string;
        password: string;
        rememberMe?: boolean;
      };

      console.log('[DEBUG] Login request body:', JSON.stringify(body));
      const result = await this.userOps.loginUser(body);
      console.log('[DEBUG] Login result:', JSON.stringify({
        success: result.success,
        hasUser: !!result.user,
        hasSessionToken: !!result.sessionToken,
        hasExpiresAt: !!result.expiresAt,
        error: result.error
      }));
      
      if (!result.success) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: result.error 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create response with user data
      const responseData = {
        success: true,
        user: result.user
      };

      const response = new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      // Set session cookie if remember me was enabled
      if (result.sessionToken && result.expiresAt) {
        const cookieString = this.sessionService.createSessionCookie(
          result.sessionToken,
          result.expiresAt,
          {
            secure: false, // Force secure=false for development
            domain: undefined, // Don't set domain for localhost
            sameSite: 'Lax' // Ensure Lax for development
          }
        );
        console.log('[DEBUG] Login - Setting cookie:', cookieString);
        response.headers.set('Set-Cookie', cookieString);
      } else {
        console.log('[DEBUG] Login - No session token to set cookie');
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request data' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleLogout(request: Request): Promise<Response> {
    try {
      // Get session token from cookie or Authorization header
      const cookieHeader = request.headers.get('Cookie');
      const authHeader = request.headers.get('Authorization');
      
      const sessionToken = 
        this.sessionService.extractTokenFromCookie(cookieHeader) ||
        this.sessionService.extractTokenFromHeader(authHeader);

      if (sessionToken) {
        await this.sessionService.logout(sessionToken);
      }

      // Create response with clear session cookie
      const response = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const clearCookieString = this.sessionService.createClearSessionCookie({
        secure: false, // Force secure=false for development
        domain: undefined, // Don't set domain for localhost
        sameSite: 'Lax' // Ensure Lax for development
      });
      response.headers.set('Set-Cookie', clearCookieString);

      return response;
    } catch (error) {
      console.error('Logout error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleValidateSession(request: Request): Promise<Response> {
    try {
      // Get session token from cookie or Authorization header
      const cookieHeader = request.headers.get('Cookie');
      const authHeader = request.headers.get('Authorization');
      
      const sessionToken = 
        this.sessionService.extractTokenFromCookie(cookieHeader) ||
        this.sessionService.extractTokenFromHeader(authHeader);

      if (!sessionToken) {
        return new Response(JSON.stringify({ 
          isValid: false, 
          error: 'No session token provided' 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const validationResult = await this.sessionService.validateSessionToken(sessionToken);
      
      if (!validationResult.isValid) {
        return new Response(JSON.stringify({ 
          isValid: false, 
          error: validationResult.error 
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if session needs refresh
      const refreshResult = await this.sessionService.refreshSessionIfNeeded(sessionToken);
      
      const response = new Response(JSON.stringify({
        isValid: true,
        user: validationResult.context?.user,
        refreshed: refreshResult.refreshed
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      // Set new session cookie if refreshed
      if (refreshResult.refreshed && refreshResult.newToken && refreshResult.newExpiresAt) {
        const cookieString = this.sessionService.createSessionCookie(
          refreshResult.newToken,
          refreshResult.newExpiresAt,
          {
            secure: false, // Force secure=false for development
            domain: undefined, // Don't set domain for localhost
            sameSite: 'Lax' // Ensure Lax for development
          }
        );
        response.headers.set('Set-Cookie', cookieString);
      }

      return response;
    } catch (error) {
      console.error('Session validation error:', error);
      return new Response(JSON.stringify({
        isValid: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ================== ADMIN HANDLERS ==================

  private async handleAdmin(method: string, action: string, request: Request): Promise<Response> {
    switch (action) {
      case 'reset-password':
        return method === 'POST' ? this.handleResetPassword(request) : this.methodNotAllowed();
      case 'update-role':
        return method === 'POST' ? this.handleUpdateRole(request) : this.methodNotAllowed();
      default:
        return new Response(JSON.stringify({ error: 'Admin action not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  }

  private async handleResetPassword(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        emailAddress: string;
        passwordHash: string;
      };

      // Validate input
      if (!body.emailAddress || !body.passwordHash) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Email address and password hash are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if user exists
      const user = await this.userOps.getUserByEmail(body.emailAddress);
      if (!user) {
        return new Response(JSON.stringify({
          success: false,
          error: 'User not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Update password hash directly in database
      const timestamp = this.getTimestamp();
      await this.sql.exec(
        `UPDATE users SET password_hash = ?, updated_at = ? WHERE email_address = ?`,
        body.passwordHash, timestamp, body.emailAddress
      );

      return new Response(JSON.stringify({
        success: true,
        message: `Password reset successfully for ${body.emailAddress}`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Password reset error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleUpdateRole(request: Request): Promise<Response> {
    try {
      const body = await request.json() as {
        email: string;
        roles: string[];
      };

      // Validate input
      if (!body.email || !body.roles || !Array.isArray(body.roles)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Email and roles array are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Option 1: Open for First User
      // Check if there are any existing users with admin role
      const adminCheckResults = await this.sql.exec(
        `SELECT COUNT(*) as count FROM users WHERE roles LIKE '%admin%'`
      ).toArray();

      const adminCount = (adminCheckResults[0] as any).count;
      const isFirstAdmin = adminCount === 0;

      // If not the first admin, check if requesting user is authenticated and has admin role
      if (!isFirstAdmin) {
        const userId = await this.extractUserIdFromRequest(request);
        if (!userId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Authentication required. You must be logged in to update user roles.'
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Check if requesting user has admin role
        const requestingUser = await this.userOps.getUserById(userId);
        if (!requestingUser || !requestingUser.roles.includes('admin')) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Forbidden. Only administrators can update user roles.'
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Update the user's roles
      const result = await this.userOps.updateUserRoles(body.email, body.roles);

      if (!result.success) {
        return new Response(JSON.stringify({
          success: false,
          error: result.error
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        message: `Roles updated successfully for ${body.email}`,
        roles: body.roles,
        isFirstAdmin: isFirstAdmin
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Update role error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleDebugDatabase(method: string, request: Request): Promise<Response> {
    if (method !== 'GET' && method !== 'POST') {
      return this.methodNotAllowed();
    }

    try {
      let query = 'SELECT name FROM sqlite_master WHERE type="table"'; // Default query

      if (method === 'GET') {
        const url = new URL(request.url);
        const queryParam = url.searchParams.get('query');
        if (queryParam) {
          query = queryParam;
        }
      } else if (method === 'POST') {
        const body = await request.json() as { query: string };
        if (body.query) {
          query = body.query;
        }
      }

      // Execute the query
      const results = await this.sql.exec(query).toArray();

      return new Response(JSON.stringify({
        query,
        results,
        count: results.length,
        timestamp: this.getTimestamp()
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Debug database error:', error);
      return new Response(JSON.stringify({
        error: error.message || 'Database query failed',
        timestamp: this.getTimestamp()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private async handleSubscriptions(method: string, action: string, request: Request): Promise<Response> {
    try {
      // Extract user ID from session
      const cookieHeader = request.headers.get('Cookie');
      const authHeader = request.headers.get('Authorization');

      console.log('[DEBUG] Subscription auth - Cookie header:', cookieHeader);
      console.log('[DEBUG] Subscription auth - Auth header:', authHeader);

      const sessionToken =
        this.sessionService.extractTokenFromCookie(cookieHeader) ||
        this.sessionService.extractTokenFromHeader(authHeader);

      console.log('[DEBUG] Subscription auth - Session token found:', !!sessionToken);

      if (!sessionToken) {
        console.log('[DEBUG] Subscription auth - No token, returning 401');
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const validationResult = await this.sessionService.validateSessionToken(sessionToken);

      if (!validationResult.isValid || !validationResult.context?.user) {
        return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const userId = validationResult.context.user.id;

      switch (method) {
        case 'POST':
          return this.handleSubscriptionPost(action, request, userId);
        case 'DELETE':
          return this.handleSubscriptionDelete(action, request, userId);
        case 'GET':
          return this.handleSubscriptionGet(action, request, userId);
        default:
          return this.methodNotAllowed();
      }
    } catch (error) {
      console.error('Error handling subscriptions:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleSubscriptionPost(action: string, request: Request, userId: string): Promise<Response> {
    try {
      const body = await request.json() as { typeId: string; type: 'P' | 'D' | 'C' };

      if (!body.typeId || !body.type) {
        return new Response(JSON.stringify({ error: 'typeId and type are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await this.subscriptionOps.subscribeUser(userId, body.typeId, body.type);

      if (result.success) {
        // Notify PartyKit about the subscription change
        console.log('Sending user_subscribed PartyKit message:', {
          type: 'user_subscribed',
          entityId: body.typeId,
          userId,
          subscriptionType: body.type
        });
        await this.notifyPartyKit('user_subscribed', body.typeId, 'subscription', {
          userId,
          subscriptionType: body.type,
          subscriptionId: result.subscriptionId
        });

        return new Response(JSON.stringify({
          message: 'Subscribed successfully',
          subscriptionId: result.subscriptionId
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleSubscriptionDelete(action: string, request: Request, userId: string): Promise<Response> {
    try {
      const url = new URL(request.url);
      const typeId = url.searchParams.get('typeId');
      const type = url.searchParams.get('type') as 'P' | 'D' | 'C' | null;

      if (!typeId || !type) {
        return new Response(JSON.stringify({ error: 'typeId and type query parameters are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await this.subscriptionOps.unsubscribeUser(userId, typeId, type);

      if (result.success) {
        // Notify PartyKit about the subscription change
        console.log('Sending user_unsubscribed PartyKit message:', {
          type: 'user_unsubscribed',
          entityId: typeId,
          userId,
          subscriptionType: type
        });
        await this.notifyPartyKit('user_unsubscribed', typeId, 'subscription', {
          userId,
          subscriptionType: type
        });

        return new Response(JSON.stringify({
          message: 'Unsubscribed successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete subscription' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleSubscriptionGet(action: string, request: Request, userId: string): Promise<Response> {
    try {
      const url = new URL(request.url);
      const typeId = url.searchParams.get('typeId');
      const type = url.searchParams.get('type') as 'P' | 'D' | 'C' | null;

      if (typeId && type) {
        // Check if user is subscribed to specific item
        const isSubscribed = await this.subscriptionOps.isUserSubscribed(userId, typeId, type);
        return new Response(JSON.stringify({ isSubscribed }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        // Get all user subscriptions
        const subscriptions = await this.subscriptionOps.getUserSubscriptions(userId);
        return new Response(JSON.stringify({ subscriptions }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return new Response(JSON.stringify({ error: 'Failed to get subscriptions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ================== CHANGE TRACKING ENDPOINTS ==================

  private async handleChanges(method: string, action: string, request: Request): Promise<Response> {
    try {
      // Extract user ID from session
      const cookieHeader = request.headers.get('Cookie');
      const authHeader = request.headers.get('Authorization');

      const sessionToken =
        this.sessionService.extractTokenFromCookie(cookieHeader) ||
        this.sessionService.extractTokenFromHeader(authHeader);

      if (!sessionToken) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const validationResult = await this.sessionService.validateSessionToken(sessionToken);

      if (!validationResult.isValid || !validationResult.context?.user) {
        return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const userId = validationResult.context.user.id;

      switch (method) {
        case 'GET':
          return this.handleChangesGet(action, request, userId);
        case 'POST':
          return this.handleChangesPost(action, request, userId);
        default:
          return this.methodNotAllowed();
      }
    } catch (error) {
      console.error('Error handling changes:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleChangesGet(action: string, request: Request, userId: string): Promise<Response> {
    try {
      const url = new URL(request.url);

      switch (action) {
        case 'summary':
          // GET /changes/summary - Get changes summary for user
          const summaryResult = await this.changeTrackingOps.getChangesSummaryForUser(userId);
          if (summaryResult.success) {
            return new Response(JSON.stringify(summaryResult.summary), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            return new Response(JSON.stringify({ error: summaryResult.error }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            });
          }

        case 'detailed':
          // GET /changes/detailed?entityType=product - Get detailed changes for entity type
          const entityType = url.searchParams.get('entityType') as 'product' | 'domain' | 'context' | 'schema' | 'schema_version';
          if (!entityType) {
            return new Response(JSON.stringify({ error: 'entityType parameter is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const detailedResult = await this.changeTrackingOps.getDetailedChangesForEntity(userId, entityType);
          if (detailedResult.success) {
            return new Response(JSON.stringify(detailedResult.changes || []), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            return new Response(JSON.stringify({ error: detailedResult.error }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            });
          }

        default:
          return new Response(JSON.stringify({ error: 'Changes action not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
      console.error('Error getting changes:', error);
      return new Response(JSON.stringify({ error: 'Failed to get changes' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleChangesPost(action: string, request: Request, userId: string): Promise<Response> {
    try {
      switch (action) {
        case 'mark-seen':
          // POST /changes/mark-seen - Mark changes as seen by user
          const body = await request.json() as { changeIds: string[] };
          const { changeIds } = body;

          if (!changeIds || !Array.isArray(changeIds)) {
            return new Response(JSON.stringify({ error: 'changeIds array is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const markSeenResult = await this.changeTrackingOps.markChangesAsSeen(userId, changeIds);
          if (markSeenResult.success) {
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            return new Response(JSON.stringify({ error: markSeenResult.error }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            });
          }

        default:
          return new Response(JSON.stringify({ error: 'Changes action not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
      console.error('Error marking changes as seen:', error);
      return new Response(JSON.stringify({ error: 'Failed to mark changes as seen' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleUser(method: string, action: string, request: Request): Promise<Response> {
    try {
      // Extract user ID from session
      const cookieHeader = request.headers.get('Cookie');
      const authHeader = request.headers.get('Authorization');

      const sessionToken =
        this.sessionService.extractTokenFromCookie(cookieHeader) ||
        this.sessionService.extractTokenFromHeader(authHeader);

      if (!sessionToken) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Validate session and get user ID
      const validationResult = await this.sessionService.validateSessionToken(sessionToken);
      if (!validationResult.isValid || !validationResult.context?.user) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const userId = validationResult.context.user.id;

      switch (method) {
        case 'GET':
          return this.handleUserGet(action, request, userId);
        case 'PUT':
          return this.handleUserPut(action, request, userId);
        default:
          return this.methodNotAllowed();
      }
    } catch (error) {
      console.error('Error handling user request:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleUserGet(action: string, request: Request, userId: string): Promise<Response> {
    try {
      switch (action) {
        case 'notification-preferences':
          // GET /user/notification-preferences - Get user notification preferences
          const prefsResult = await this.userOps.getUserNotificationPreferences(userId);
          if (prefsResult.success) {
            return new Response(JSON.stringify(prefsResult.preferences), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            return new Response(JSON.stringify({ error: prefsResult.error || 'Failed to get preferences' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            });
          }

        default:
          return new Response(JSON.stringify({ error: 'Action not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
      console.error('Error handling user GET request:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private async handleUserPut(action: string, request: Request, userId: string): Promise<Response> {
    try {
      switch (action) {
        case 'notification-preferences':
          // PUT /user/notification-preferences - Update user notification preferences
          const body = await request.json() as {
            retentionDays: number;
            showBreakingChangesOnly: boolean;
            emailDigestFrequency: 'never' | 'daily' | 'weekly';
            realTimeNotifications: boolean;
          };

          // Validate input
          if (!body || typeof body.retentionDays !== 'number' ||
              typeof body.showBreakingChangesOnly !== 'boolean' ||
              typeof body.realTimeNotifications !== 'boolean' ||
              !['never', 'daily', 'weekly'].includes(body.emailDigestFrequency)) {
            return new Response(JSON.stringify({ error: 'Invalid request body' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          const updateResult = await this.userOps.updateUserNotificationPreferences(userId, {
            retentionDays: body.retentionDays,
            showBreakingChangesOnly: body.showBreakingChangesOnly,
            emailDigestFrequency: body.emailDigestFrequency,
            realTimeNotifications: body.realTimeNotifications
          });

          if (updateResult.success) {
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            return new Response(JSON.stringify({ error: updateResult.error || 'Failed to update preferences' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            });
          }

        default:
          return new Response(JSON.stringify({ error: 'Action not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
      }
    } catch (error) {
      console.error('Error handling user PUT request:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private methodNotAllowed(): Response {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}