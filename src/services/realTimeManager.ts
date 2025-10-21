import PartySocket from 'partysocket';

export interface RealTimeMessage {
  type: 'schema_created' | 'schema_updated' | 'schema_deleted' | 'schema_version_created' | 'schema_version_updated' | 'schema_version_deleted' | 'product_created' | 'product_updated' | 'product_deleted' | 'domain_created' | 'domain_updated' | 'domain_deleted' | 'context_created' | 'context_updated' | 'context_deleted' | 'user_subscribed' | 'user_unsubscribed' | 'connected' | 'error';
  entityId?: string;
  entityType?: 'product' | 'domain' | 'context' | 'schema' | 'version' | 'schema_version' | 'subscription';
  data?: any;
  timestamp?: string;
  userId?: string;
  senderId?: string;
  connectionId?: string;
  message?: string;
  source?: 'server' | 'durable-object' | 'client';
}

type MessageHandler = (message: RealTimeMessage) => void;
type ConnectionHandler = () => void;
type ErrorHandler = (error: Event) => void;

class RealTimeManager {
  private static readonly TYPE_CONNECTED = 'connected';
  private static readonly TYPE_ERROR = 'error';
  private static readonly TYPE_VERSION_CREATED = 'schema_version_created';
  private static readonly TYPE_VERSION_UPDATED = 'schema_version_updated';
  
  private socket: PartySocket | null = null;
  private roomId: string | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectTimeout: number | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  connect(tenantId: string, registryId: string) {
    const newRoomId = `${tenantId}-${registryId}`;
    
    // If already connected or connecting to the same room, don't reconnect
    if (this.roomId === newRoomId && (this.isConnected || this.isConnecting)) {
      console.log(`RealTimeManager: Already connected/connecting to room ${newRoomId}`);
      return;
    }

    // Disconnect from previous room if different
    if (this.socket && this.roomId !== newRoomId) {
      this.disconnect();
    }

    this.roomId = newRoomId;
    this.createConnection();
  }

  private createConnection() {
    if (!this.roomId || this.isConnecting) return;

    this.isConnecting = true;
    
    try {
      // Determine PartyKit host based on environment
      let partyKitHost: string;
      
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Development environment - use local PartyKit server
        // Port 1999 is the default PartyKit dev server port
        partyKitHost = 'localhost:1999';
      } else {
        // Production environment - use deployed PartyKit service
        // In production, PartyKit runs on the same domain with /parties path
        // or on a dedicated PartyKit subdomain
        partyKitHost = window.location.host; // Use same host as the app
      }
      
      console.log(`RealTimeManager: Connecting to PartyKit at ${partyKitHost}, room: ${this.roomId}`);
      
      this.socket = new PartySocket({
        host: partyKitHost,
        room: this.roomId
      });

      this.socket.addEventListener('open', () => {
        console.log('RealTimeManager: Connection established');
        this.isConnected = true;
        this.isConnecting = false;
        this.connectHandlers.forEach(handler => handler());
      });

      this.socket.addEventListener('message', (event) => {
        try {
          const message: RealTimeMessage = JSON.parse(event.data);
          console.log('RealTimeManager: Received message:', message);
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('RealTimeManager: Failed to parse message:', error);
        }
      });

      this.socket.addEventListener('close', () => {
        console.log('RealTimeManager: Connection closed');
        this.isConnected = false;
        this.isConnecting = false;
        this.socket = null;
        this.disconnectHandlers.forEach(handler => handler());
        
        // Auto-reconnect after delay only if we still have a roomId and it wasn't a manual disconnect
        if (this.roomId) {
          this.scheduleReconnect();
        }
      });

      this.socket.addEventListener('error', (error) => {
        console.error('RealTimeManager: Connection error:', error);
        this.isConnected = false;
        this.isConnecting = false;
        this.errorHandlers.forEach(handler => handler(error));
      });

    } catch (error) {
      console.error('RealTimeManager: Failed to create socket:', error);
      this.isConnected = false;
      this.isConnecting = false;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isConnected && !this.isConnecting && this.roomId) {
        console.log('RealTimeManager: Attempting to reconnect...');
        this.createConnection();
      }
    }, 3000);
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.roomId = null;
  }

  sendMessage(message: RealTimeMessage) {
    if (this.socket && this.isConnected) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn('RealTimeManager: Cannot send message - not connected');
    }
  }

  // Event handler management
  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler: ConnectionHandler) {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler) {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  onError(handler: ErrorHandler) {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  getConnectionStatus() {
    return this.isConnected;
  }

  // Message Analysis Methods
  // These methods analyze incoming real-time messages for business logic decisions
  
  /**
   * Checks if a message has data
   */
  hasData(message: RealTimeMessage): boolean {
    return !!message.data;
  }

  /**
   * Checks if a message has a sender ID or is from server
   */
  hasSender(message: RealTimeMessage): boolean {
    return !!(message.senderId || message.source === 'server' || message.source === 'durable-object');
  }

  /**
   * Checks if a message is actionable (should trigger UI updates)
   */
  isActionable(message: RealTimeMessage): boolean {
    return this.hasSender(message) &&
           !this.isConnectionConfirmation(message) &&
           !this.isError(message);
  }
  
  /**
   * Checks if a message is a connection confirmation
   */
  isConnectionConfirmation(message: RealTimeMessage): boolean {
    return message.type === RealTimeManager.TYPE_CONNECTED;
  }

  /**
   * Checks if a message is an error
   */
  isError(message: RealTimeMessage): boolean {
    return message.type === RealTimeManager.TYPE_ERROR;
  }

  /**
   * Checks if a message is a version update (created or updated)
   */
  isVersionUpdate(message: RealTimeMessage): boolean {
    return message.type === RealTimeManager.TYPE_VERSION_CREATED || 
           message.type === RealTimeManager.TYPE_VERSION_UPDATED;
  }

  /**
   * Checks if a message affects the same semantic version
   */
  isSameSemanticVersion(message: RealTimeMessage, semanticVersion: string): boolean {
    return !!(message.data?.semanticVersion === semanticVersion);
  }

  /**
   * Checks if a message affects the same schema
   */
  isSameSchema(message: RealTimeMessage, schemaId: string): boolean {
    return !!(message.data?.schemaId === schemaId);
  }

  /**
   * Checks if a message affects the same version
   */
  isSameVersion(message: RealTimeMessage, versionId: string): boolean {
    return !!(message.data?.versionId === versionId);
  }

  // Business Logic Methods
  // These methods encapsulate the real-time notification logic for different entity operations

  /**
   * Notifies about a new product creation
   */
  notifyProductCreated(productId: string, productData: any, userId: string = 'current-user') {
    this.sendMessage({
      type: 'product_created',
      entityId: productId,
      entityType: 'product',
      data: productData,
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * Notifies about a product update
   */
  notifyProductUpdated(productId: string, updates: any, userId: string = 'current-user') {
    this.sendMessage({
      type: 'product_updated',
      entityId: productId,
      entityType: 'product',
      data: updates,
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * Notifies about a new domain creation
   */
  notifyDomainCreated(domainId: string, domainData: any, userId: string = 'current-user') {
    this.sendMessage({
      type: 'domain_created',
      entityId: domainId,
      entityType: 'domain',
      data: domainData,
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * Notifies about a domain update
   */
  notifyDomainUpdated(domainId: string, updates: any, userId: string = 'current-user') {
    this.sendMessage({
      type: 'domain_updated',
      entityId: domainId,
      entityType: 'domain',
      data: updates,
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * Notifies about a new context creation
   */
  notifyContextCreated(contextId: string, contextData: any, userId: string = 'current-user') {
    this.sendMessage({
      type: 'context_created',
      entityId: contextId,
      entityType: 'context',
      data: contextData,
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * Notifies about a context update
   */
  notifyContextUpdated(contextId: string, updates: any, userId: string = 'current-user') {
    this.sendMessage({
      type: 'context_updated',
      entityId: contextId,
      entityType: 'context',
      data: updates,
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * Notifies about a new schema creation
   */
  notifySchemaCreated(schemaId: string, schemaData: any, userId: string = 'current-user') {
    this.sendMessage({
      type: 'schema_created',
      entityId: schemaId,
      entityType: 'schema',
      data: schemaData,
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * Notifies about a schema update
   */
  notifySchemaUpdated(schemaId: string, updates: any, userId: string = 'current-user') {
    this.sendMessage({
      type: 'schema_updated',
      entityId: schemaId,
      entityType: 'schema',
      data: updates,
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * Notifies about a new schema version creation
   */
  notifyVersionCreated(schemaId: string, versionData: any, userId: string = 'current-user') {
    this.sendMessage({
      type: 'schema_version_created',
      entityId: schemaId,
      entityType: 'schema_version',
      data: versionData,
      timestamp: new Date().toISOString(),
      userId
    });
  }

  /**
   * Notifies about a schema version update
   */
  notifyVersionUpdated(versionId: string, updates: any, userId: string = 'current-user') {
    this.sendMessage({
      type: 'schema_version_updated',
      entityId: versionId,
      entityType: 'schema_version',
      data: updates,
      timestamp: new Date().toISOString(),
      userId
    });
  }
}

// Export singleton instance
export const realTimeManager = new RealTimeManager();