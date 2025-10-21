import { Product, Domain, Context, Schema, SchemaVersion, SchemaScope, SchemaStatus } from '../types/schema';

// Configuration for API endpoints
const API_CONFIG = {
  // Use relative URL in production, localhost for development
  get baseUrl() {
    return window.location.hostname === 'localhost' ? 'http://localhost:8789' : '';
  },
  tenantId: 'default-tenant',
  registryId: 'default-registry'
};

class ApiClient {
  private getBaseUrl(): string {
    return `${API_CONFIG.baseUrl}/schema-registry/api/${API_CONFIG.tenantId}/${API_CONFIG.registryId}`;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.getBaseUrl()}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for authentication
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Use HTTP status message when JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Products
  async getProducts(): Promise<{ products: Product[] }> {
    return this.request('/products');
  }

  async createProduct(product: { name: string; description?: string }): Promise<Product> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  async updateProduct(id: string, updates: { name?: string; description?: string }): Promise<Product> {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProduct(id: string): Promise<void> {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Domains
  async getDomains(): Promise<{ domains: Domain[] }> {
    return this.request('/domains');
  }

  async createDomain(domain: { name: string; description?: string; productId: string }): Promise<Domain> {
    return this.request('/domains', {
      method: 'POST',
      body: JSON.stringify(domain),
    });
  }

  async updateDomain(id: string, updates: { name?: string; description?: string }): Promise<Domain> {
    return this.request(`/domains/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteDomain(id: string): Promise<void> {
    return this.request(`/domains/${id}`, {
      method: 'DELETE',
    });
  }

  // Contexts
  async getContexts(): Promise<{ contexts: Context[] }> {
    return this.request('/contexts');
  }

  async createContext(context: { name: string; namespace?: string; description?: string; domainId: string }): Promise<Context> {
    return this.request('/contexts', {
      method: 'POST',
      body: JSON.stringify(context),
    });
  }

  async updateContext(id: string, updates: { name?: string; namespace?: string; description?: string }): Promise<Context> {
    return this.request(`/contexts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteContext(id: string): Promise<void> {
    return this.request(`/contexts/${id}`, {
      method: 'DELETE',
    });
  }

  // Schemas
  async getSchemas(): Promise<{ schemas: Schema[] }> {
    return this.request('/schemas');
  }

  async createSchema(schema: {
    name: string;
    description?: string;
    schemaTypeCategory: string;
    scope: SchemaScope;
    contextId: string;
  }): Promise<Schema> {
    return this.request('/schemas', {
      method: 'POST',
      body: JSON.stringify(schema),
    });
  }

  async updateSchema(id: string, updates: { 
    name?: string;
    description?: string; 
    schemaTypeCategory?: string;
    scope?: SchemaScope;
    versions?: Array<{
      versionId: string;
      specification: string;
      semanticVersion: string;
      description: string | null;
      status: string;
    }>;
  }): Promise<Schema> {
    return this.request(`/schemas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteSchema(id: string): Promise<void> {
    return this.request(`/schemas/${id}`, {
      method: 'DELETE',
    });
  }

  // Schema Versions
  async getSchemaVersions(): Promise<{ versions: SchemaVersion[] }> {
    return this.request('/schema-versions');
  }

  async createSchemaVersion(version: {
    specification: string;
    semanticVersion: string;
    description?: string;
    status: SchemaStatus;
    schemaId: string;
  }): Promise<SchemaVersion> {
    return this.request('/schema-versions', {
      method: 'POST',
      body: JSON.stringify(version),
    });
  }

  async updateSchemaVersion(id: string, updates: { description?: string; status?: SchemaStatus }): Promise<SchemaVersion> {
    return this.request(`/schema-versions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteSchemaVersion(id: string): Promise<void> {
    return this.request(`/schema-versions/${id}`, {
      method: 'DELETE',
    });
  }

  // Registry statistics
  async getRegistryStats(): Promise<{ stats: { products: number; domains: number; contexts: number; schemas: number; versions: number } }> {
    return this.request('/registry');
  }

  // Find
  async find(query: string): Promise<{ results: any[] }> {
    return this.request(`/find?q=${encodeURIComponent(query)}`);
  }

  // Tenant configuration
  getTenantInfo() {
    return {
      tenantId: API_CONFIG.tenantId,
      registryId: API_CONFIG.registryId,
      baseUrl: API_CONFIG.baseUrl
    };
  }
  // Debug database query (admin only)
  async debugQuery(query: string): Promise<{ query: string; results: any[]; count: number; timestamp: string; error?: string }> {
    return this.request('/debug-db', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  }

  // Subscriptions
  async subscribe(typeId: string, type: 'P' | 'D' | 'C'): Promise<{ message: string; subscriptionId: string }> {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ typeId, type })
    });
  }

  async unsubscribe(typeId: string, type: 'P' | 'D' | 'C'): Promise<{ message: string }> {
    return this.request(`/subscriptions?typeId=${encodeURIComponent(typeId)}&type=${encodeURIComponent(type)}`, {
      method: 'DELETE'
    });
  }

  async isSubscribed(typeId: string, type: 'P' | 'D' | 'C'): Promise<{ isSubscribed: boolean }> {
    return this.request(`/subscriptions?typeId=${encodeURIComponent(typeId)}&type=${encodeURIComponent(type)}`);
  }

  async getSubscriptions(): Promise<{ subscriptions: Array<{ id: string; typeId: string; type: 'P' | 'D' | 'C'; createdAt: string }> }> {
    return this.request('/subscriptions');
  }

  // Change tracking
  async getChangesSummary(): Promise<any> {
    return this.request('/changes/summary');
  }

  async getDetailedChanges(entityType: string): Promise<any[]> {
    return this.request(`/changes/detailed?entityType=${encodeURIComponent(entityType)}`);
  }

  async markChangesAsSeen(changeIds: string[]): Promise<{ success: boolean }> {
    return this.request('/changes/mark-seen', {
      method: 'POST',
      body: JSON.stringify({ changeIds })
    });
  }

  // User Notification Preferences
  async getUserNotificationPreferences(): Promise<{
    retentionDays: number;
    showBreakingChangesOnly: boolean;
    emailDigestFrequency: 'never' | 'daily' | 'weekly';
    realTimeNotifications: boolean;
  }> {
    return this.request('/user/notification-preferences');
  }

  async updateUserNotificationPreferences(preferences: {
    retentionDays: number;
    showBreakingChangesOnly: boolean;
    emailDigestFrequency: 'never' | 'daily' | 'weekly';
    realTimeNotifications: boolean;
  }): Promise<{ success: boolean }> {
    return this.request('/user/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;