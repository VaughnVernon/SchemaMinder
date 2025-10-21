import type * as Party from "partykit/server";

export interface SchemaRegistryMessage {
  type: 'schema_created' | 'schema_updated' | 'schema_deleted' | 'version_created' | 'version_updated' | 'version_deleted' | 'product_created' | 'product_updated' | 'product_deleted' | 'domain_created' | 'domain_updated' | 'domain_deleted' | 'context_created' | 'context_updated' | 'context_deleted' | 'user_subscribed' | 'user_unsubscribed';
  entityId: string;
  entityType: 'product' | 'domain' | 'context' | 'schema' | 'version' | 'subscription';
  data: any;
  timestamp: string;
  userId?: string;
}

export default class SchemaRegistryServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Welcome new connection with current timestamp
    conn.send(JSON.stringify({
      type: 'connected',
      timestamp: new Date().toISOString(),
      connectionId: conn.id
    }));
    
    console.log(`Connection ${conn.id} joined room ${this.room.id}`);
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const parsedMessage: SchemaRegistryMessage = JSON.parse(message);
      
      // Add server timestamp and broadcast to all other connections
      const broadcastMessage = {
        ...parsedMessage,
        timestamp: new Date().toISOString(),
        senderId: sender.id
      };

      // Broadcast to all connections except the sender
      this.room.broadcast(JSON.stringify(broadcastMessage), [sender.id]);
      
      console.log(`Broadcasting ${parsedMessage.type} for ${parsedMessage.entityType}:${parsedMessage.entityId}`);
    } catch (error) {
      console.error('Failed to parse message:', error);
      sender.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  }

  onClose(connection: Party.Connection) {
    console.log(`Connection ${connection.id} left room ${this.room.id}`);
  }

  onError(connection: Party.Connection, error: Error) {
    console.error(`Connection ${connection.id} error:`, error);
  }

  // HTTP endpoint for health checks or sending messages from Durable Objects
  async onRequest(req: Party.Request) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (req.method === 'POST') {
      try {
        const message: SchemaRegistryMessage = await req.json();
        
        // Broadcast the message to all connected clients
        const broadcastMessage = {
          ...message,
          timestamp: new Date().toISOString(),
          source: 'server'
        };

        this.room.broadcast(JSON.stringify(broadcastMessage));
        
        return new Response(JSON.stringify({ success: true }), {
          headers: corsHeaders
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: corsHeaders
        });
      }
    }

    if (req.method === 'GET') {
      // Health check endpoint
      return new Response(JSON.stringify({ 
        status: 'healthy',
        room: this.room.id,
        connections: this.room.getConnections().size,
        timestamp: new Date().toISOString()
      }), {
        headers: corsHeaders
      });
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    });
  }
}