import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseMigrations } from '../../functions/persistence/migrations';

// Mock the required constants
const SCHEMA_TYPE_CATEGORIES = {
  Command: { categoryName: 'Commands' },
  Data: { categoryName: 'Data' },
  Document: { categoryName: 'Documents' },
  Envelope: { categoryName: 'Envelopes' },
  Event: { categoryName: 'Events' },
  Query: { categoryName: 'Queries' }
};

const SCHEMA_SCOPES = {
  Public: 'Public',
  Private: 'Private'
};

const SCHEMA_STATUSES = {
  Draft: 'Draft',
  Published: 'Published',
  Deprecated: 'Deprecated',
  Removed: 'Removed'
};

// Mock the types module
vi.mock('../../functions/types', () => ({
  SCHEMA_TYPE_CATEGORIES,
  SCHEMA_SCOPES,
  SCHEMA_STATUSES
}));

// Mock SqlStorage and DurableObjectState
const mockSqlStorage = {
  exec: vi.fn(),
};

const mockDurableObjectState = {
  storage: {
    transaction: vi.fn(),
  },
};

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn().mockReturnValue('test-uuid'),
  },
  writable: true,
});

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('DatabaseMigrations', () => {
  let migrations: DatabaseMigrations;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSqlStorage.exec.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });
    mockDurableObjectState.storage.transaction.mockImplementation((callback) => callback());
    migrations = new DatabaseMigrations(mockDurableObjectState as any, mockSqlStorage as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  describe('Schema Initialization', () => {
    describe('initializeSchema', () => {
      it('should create all required tables with constraints', async () => {
        await migrations.initializeSchema();

        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('CREATE TABLE IF NOT EXISTS products')
        );

        // Get all SQL calls made during initialization
        const allSqlCalls = mockSqlStorage.exec.mock.calls.map(call => call[0]).join(' ');

        // Check that all tables are created
        expect(allSqlCalls).toContain('CREATE TABLE IF NOT EXISTS products');
        expect(allSqlCalls).toContain('CREATE TABLE IF NOT EXISTS domains');
        expect(allSqlCalls).toContain('CREATE TABLE IF NOT EXISTS contexts');
        expect(allSqlCalls).toContain('CREATE TABLE IF NOT EXISTS schemas');
        expect(allSqlCalls).toContain('CREATE TABLE IF NOT EXISTS schema_versions');

        // Check constraints are properly built
        expect(allSqlCalls).toContain("'Commands'");
        expect(allSqlCalls).toContain("'Data'");
        expect(allSqlCalls).toContain("'Documents'");
        expect(allSqlCalls).toContain("'Envelopes'");
        expect(allSqlCalls).toContain("'Events'");
        expect(allSqlCalls).toContain("'Queries'");
        expect(allSqlCalls).toContain("'Public'");
        expect(allSqlCalls).toContain("'Private'");
        expect(allSqlCalls).toContain("'Draft'");
        expect(allSqlCalls).toContain("'Published'");
        expect(allSqlCalls).toContain("'Deprecated'");
        expect(allSqlCalls).toContain("'Removed'");

        // Check indexes are created
        expect(allSqlCalls).toContain('CREATE INDEX IF NOT EXISTS idx_domains_product_id');
        expect(allSqlCalls).toContain('CREATE INDEX IF NOT EXISTS idx_contexts_domain_id');
        expect(allSqlCalls).toContain('CREATE INDEX IF NOT EXISTS idx_schemas_context_id');
        expect(allSqlCalls).toContain('CREATE INDEX IF NOT EXISTS idx_schema_versions_schema_id');

        // Check foreign key constraints
        expect(allSqlCalls).toContain('FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE');
        expect(allSqlCalls).toContain('FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE');
        expect(allSqlCalls).toContain('FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE');
        expect(allSqlCalls).toContain('FOREIGN KEY (schema_id) REFERENCES schemas(id) ON DELETE CASCADE');
      });
    });

    describe('initializeSampleData', () => {
      it('should create default hierarchy', async () => {
        await migrations.initializeSampleData();

        expect(mockSqlStorage.exec).toHaveBeenCalledTimes(3);
        
        // Check product creation
        expect(mockSqlStorage.exec).toHaveBeenNthCalledWith(1,
          expect.stringContaining('INSERT INTO products'),
          'test-uuid',
          'My Product',
          null,
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/),
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
        );

        // Check domain creation
        expect(mockSqlStorage.exec).toHaveBeenNthCalledWith(2,
          expect.stringContaining('INSERT INTO domains'),
          'test-uuid',
          'My Domain',
          null,
          'test-uuid',
          expect.any(String),
          expect.any(String)
        );

        // Check context creation
        expect(mockSqlStorage.exec).toHaveBeenNthCalledWith(3,
          expect.stringContaining('INSERT INTO contexts'),
          'test-uuid',
          'My Context',
          null,
          null,
          'test-uuid',
          expect.any(String),
          expect.any(String)
        );

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('Initialized with default hierarchy')
        );
      });

      it('should handle sample data initialization errors gracefully', async () => {
        mockSqlStorage.exec.mockRejectedValueOnce(new Error('Insert failed'));

        await migrations.initializeSampleData();

        expect(mockConsoleError).toHaveBeenCalledWith(
          'Sample data initialization error:',
          expect.any(Error)
        );

        // Should not throw - errors are caught and logged
        expect(() => migrations.initializeSampleData()).not.toThrow();
      });
    });

    describe('needsInitialization', () => {
      it('should return true when less than 5 tables exist', async () => {
        const mockTables = [
          { name: 'products' },
          { name: 'domains' },
          { name: 'contexts' }
        ];
        mockSqlStorage.exec.mockReturnValue({ 
          toArray: vi.fn().mockResolvedValue(mockTables) 
        });

        const result = await migrations.needsInitialization();

        expect(result).toBe(true);
        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          "SELECT name FROM sqlite_master WHERE type='table'"
        );
      });

      it('should return false when 5 or more tables exist', async () => {
        const mockTables = [
          { name: 'products' },
          { name: 'domains' },
          { name: 'contexts' },
          { name: 'schemas' },
          { name: 'schema_versions' }
        ];
        mockSqlStorage.exec.mockReturnValue({ 
          toArray: vi.fn().mockResolvedValue(mockTables) 
        });

        const result = await migrations.needsInitialization();

        expect(result).toBe(false);
      });
    });
  });

  describe('Migrations', () => {
    describe('runMigrations', () => {
      it('should run migration when Queries category is missing', async () => {
        const mockContextsSql = {
          sql: "CREATE TABLE contexts (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, domain_id TEXT NOT NULL)"
        };
        const mockSchemaSql = {
          sql: "CREATE TABLE schemas (id TEXT PRIMARY KEY, schema_type_category TEXT CHECK (schema_type_category IN ('Commands', 'Data', 'Documents')))"
        };
        
        mockSqlStorage.exec
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([mockContextsSql]) }) // contexts table query
          .mockReturnValueOnce({}) // ALTER TABLE contexts ADD COLUMN namespace
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([mockSchemaSql]) }) // schemas table query
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([]) }) // version backup
          .mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });

        await migrations.runMigrations();

        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Running migration: Adding namespace column to contexts table'
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(
          'Running migration: Adding Queries category to schema constraint'
        );

        expect(mockDurableObjectState.storage.transaction).toHaveBeenCalled();

        // Verify the migration steps within transaction
        const transactionCallback = mockDurableObjectState.storage.transaction.mock.calls[0][0];
        await transactionCallback();

        // Should backup schema_versions
        expect(mockSqlStorage.exec).toHaveBeenCalledWith('SELECT * FROM schema_versions');

        // Should create new table with updated constraint
        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('CREATE TABLE schemas_new')
        );

        // Should contain all categories including Queries
        const createTableCall = mockSqlStorage.exec.mock.calls.find(call => 
          call[0].includes('CREATE TABLE schemas_new')
        );
        expect(createTableCall[0]).toContain("'Queries'");

        // Should copy data, drop old table, rename new table
        expect(mockSqlStorage.exec).toHaveBeenCalledWith('INSERT INTO schemas_new SELECT * FROM schemas');
        expect(mockSqlStorage.exec).toHaveBeenCalledWith('DROP TABLE schemas');
        expect(mockSqlStorage.exec).toHaveBeenCalledWith('ALTER TABLE schemas_new RENAME TO schemas');

        // Should recreate indexes and schema_versions table
        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_schemas_context_id')
        );
        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_versions')
        );
      });

      it('should skip migration when Queries category already exists', async () => {
        const mockContextsSql = {
          sql: "CREATE TABLE contexts (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, namespace TEXT, domain_id TEXT NOT NULL)"
        };
        const mockSchemaSql = {
          sql: "CREATE TABLE schemas (schema_type_category TEXT CHECK (schema_type_category IN ('Commands', 'Data', 'Documents', 'Queries')))"
        };
        
        mockSqlStorage.exec
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([mockContextsSql]) }) // contexts table already has namespace
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([mockSchemaSql]) }) // schemas table already has Queries
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([{ name: 'users' }]) }) // users table exists
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([{ name: 'sessions' }]) }) // sessions table exists
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([{ sql: "CREATE TABLE users (id TEXT, email_address TEXT, roles TEXT)" }]) }) // users table has roles column
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([{ name: 'subscriptions' }]) }) // subscriptions table exists
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([{ name: 'global_change_tracker' }]) }); // global_change_tracker table exists

        await migrations.runMigrations();

        expect(mockConsoleLog).not.toHaveBeenCalledWith(
          expect.stringContaining('Running migration')
        );

        expect(mockDurableObjectState.storage.transaction).not.toHaveBeenCalled();
      });

      it('should handle migration errors gracefully', async () => {
        mockSqlStorage.exec.mockRejectedValue(new Error('Migration failed'));

        await migrations.runMigrations();

        expect(mockConsoleError).toHaveBeenCalledWith(
          'Migration error:',
          expect.any(Error)
        );

        // Should not throw - errors are caught and logged
        expect(() => migrations.runMigrations()).not.toThrow();
      });

      it('should handle missing schema table', async () => {
        mockSqlStorage.exec.mockReturnValue({ 
          toArray: vi.fn().mockResolvedValue([]) 
        });

        await migrations.runMigrations();

        // Should not crash when no schema table exists
        expect(mockConsoleError).not.toHaveBeenCalled();
      });

      it('should handle null sql result', async () => {
        const mockResult = { sql: null };
        mockSqlStorage.exec.mockReturnValue({ 
          toArray: vi.fn().mockResolvedValue([mockResult]) 
        });

        await migrations.runMigrations();

        // Should not crash when sql is null
        expect(mockConsoleError).not.toHaveBeenCalled();
      });

      it('should restore schema versions after migration', async () => {
        const mockContextsSql = {
          sql: "CREATE TABLE contexts (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, domain_id TEXT NOT NULL)"
        };
        const mockSchemaSql = {
          sql: "CREATE TABLE schemas (schema_type_category TEXT CHECK (schema_type_category IN ('Commands')))"
        };
        
        const mockVersionBackup = [
          {
            id: 'version1',
            specification: 'command Test { }',
            semantic_version: '1.0.0',
            description: 'Test version',
            status: 'Published',
            schema_id: 'schema1',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z'
          }
        ];
        
        mockSqlStorage.exec
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([mockContextsSql]) }) // contexts table query
          .mockReturnValueOnce({}) // ALTER TABLE contexts ADD COLUMN namespace
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([mockSchemaSql]) }) // schemas table query
          .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue(mockVersionBackup) }) // version backup
          .mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });

        await migrations.runMigrations();

        const transactionCallback = mockDurableObjectState.storage.transaction.mock.calls[0][0];
        await transactionCallback();

        // Should restore version data
        expect(mockSqlStorage.exec).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO schema_versions (id, specification, semantic_version, description, status, schema_id, created_at, updated_at)'),
          'version1',
          'command Test { }',
          '1.0.0',
          'Test version',
          'Published',
          'schema1',
          '2023-01-01T00:00:00Z',
          '2023-01-01T00:00:00Z'
        );

        expect(mockConsoleLog).toHaveBeenCalledWith(
          expect.stringContaining('Migration completed: Added Queries category to schema constraint and restored 1 schema versions')
        );
      });
    });
  });

  describe('Timestamp Generation', () => {
    it('should generate consistent timestamp format', async () => {
      await migrations.initializeSampleData();

      const productCall = mockSqlStorage.exec.mock.calls[0];
      const createdAt = productCall[4];
      const updatedAt = productCall[5];

      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(createdAt).toBe(updatedAt);
    });
  });

  describe('Constraint Building', () => {
    it('should build constraints from dynamic type definitions', async () => {
      await migrations.initializeSchema();

      // Get all SQL calls made during initialization
      const allSqlCalls = mockSqlStorage.exec.mock.calls.map(call => call[0]).join(' ');

      // Check that constraints are built from the imported constants
      Object.values(SCHEMA_TYPE_CATEGORIES).forEach(category => {
        expect(allSqlCalls).toContain(`'${category.categoryName}'`);
      });

      Object.values(SCHEMA_SCOPES).forEach(scope => {
        expect(allSqlCalls).toContain(`'${scope}'`);
      });

      Object.values(SCHEMA_STATUSES).forEach(status => {
        expect(allSqlCalls).toContain(`'${status}'`);
      });
    });

    it('should set proper defaults', async () => {
      await migrations.initializeSchema();

      // Get all SQL calls made during initialization
      const allSqlCalls = mockSqlStorage.exec.mock.calls.map(call => call[0]).join(' ');

      expect(allSqlCalls).toContain(`DEFAULT '${SCHEMA_SCOPES.Public}'`);
      expect(allSqlCalls).toContain(`DEFAULT '${SCHEMA_STATUSES.Draft}'`);
    });
  });

  describe('Transaction Handling', () => {
    it('should wrap migration operations in transaction', async () => {
      const mockSchemaSql = {
        sql: "CREATE TABLE schemas (schema_type_category TEXT CHECK (schema_type_category IN ('Commands')))"
      };
      
      mockSqlStorage.exec.mockReturnValue({ 
        toArray: vi.fn().mockResolvedValue([mockSchemaSql]) 
      });

      await migrations.runMigrations();

      expect(mockDurableObjectState.storage.transaction).toHaveBeenCalledTimes(1);
      expect(mockDurableObjectState.storage.transaction).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should handle transaction callback execution', async () => {
      const mockContextsSql = {
        sql: "CREATE TABLE contexts (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, domain_id TEXT NOT NULL)"
      };
      const mockSchemaSql = {
        sql: "CREATE TABLE schemas (schema_type_category TEXT CHECK (schema_type_category IN ('Commands')))"
      };
      
      mockSqlStorage.exec
        .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([mockContextsSql]) }) // contexts table query
        .mockReturnValueOnce({}) // ALTER TABLE contexts ADD COLUMN namespace
        .mockReturnValueOnce({ toArray: vi.fn().mockResolvedValue([mockSchemaSql]) }) // schemas table query
        .mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) });

      let transactionExecuted = false;
      mockDurableObjectState.storage.transaction.mockImplementation(async (callback) => {
        transactionExecuted = true;
        return await callback();
      });

      await migrations.runMigrations();

      expect(transactionExecuted).toBe(true);
    });
  });
});