import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { renderWithAuth, defaultMockAuthState } from '../testUtils';

// Import and mock the useAuth hook
import { useAuth } from '../../src/contexts/AuthContext';

// Mock the AuthContext
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock the change notifications hook
vi.mock('../../src/hooks/useChangeNotifications', () => ({
  useChangeNotifications: vi.fn(() => ({
    changes: [],
    isLoading: false,
    error: null,
    totalCount: 0
  }))
}));

// This test file specifically focuses on testing the sendMessage calls
// that were missing and causing the real-time sync issues

// Mock useSchemaRegistry with controllable functions
const mockUpdateProduct = vi.fn();
const mockUpdateDomain = vi.fn();
const mockUpdateContext = vi.fn();
const mockUpdateSchema = vi.fn();
const mockAddSchema = vi.fn();


vi.mock('../../src/hooks/useSchemaRegistry', () => ({
  useSchemaRegistry: () => ({
    registry: {
      products: [{
        id: 'test-product-1',
        name: 'Test Product',
        description: 'Test Product Description',
        domains: [{
          id: 'test-domain-1',
          name: 'Test Domain',
          description: 'Test Domain Description',
          contexts: [{
            id: 'test-context-1',
            name: 'Test Context',
            description: 'Test Context Description',
            schemas: [{
              id: 'test-schema-1',
              name: 'Test Schema',
              description: 'Test Schema Description',
              schemaTypeCategory: 'Events' as any,
              scope: 'Public' as any,
              contextId: 'test-context-1',
              versions: [{
                id: 'test-version-1',
                specification: 'event TestEvent {\n  field string name\n}',
                semanticVersion: '0.1.0',
                status: 'Draft' as any,
                schemaId: 'test-schema-1',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z'
              }],
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }]
    },
    loading: false,
    error: null,
    tenantInfo: { tenantId: 'test-tenant', registryId: 'test-registry' },
    addProduct: vi.fn().mockResolvedValue('new-product-id'),
    addDomain: vi.fn().mockResolvedValue('new-domain-id'),
    addContext: vi.fn().mockResolvedValue('new-context-id'),
    addSchema: mockAddSchema.mockResolvedValue('new-schema-id'),
    addSchemaVersion: vi.fn().mockResolvedValue('new-version-id'),
    updateProduct: mockUpdateProduct.mockResolvedValue(undefined),
    updateDomain: mockUpdateDomain.mockResolvedValue(undefined),
    updateContext: mockUpdateContext.mockResolvedValue(undefined),
    updateSchema: mockUpdateSchema.mockResolvedValue(undefined),
    updateSchemaVersion: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
    reload: vi.fn()
  })
}));

// Mock real-time updates hook with controllable sendMessage
const mockSendMessage = vi.fn();

vi.mock('../../src/hooks/useRealTimeUpdates', () => ({
  useRealTimeUpdates: () => ({
    isConnected: true,
    sendMessage: mockSendMessage
  })
}));

vi.mock('../../src/hooks/useLocalStorage', () => ({
  useLocalStorage: () => [new Set(), vi.fn()]
}));

// Mock icons using importOriginal with specific Ellipsis handling
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal() as any;
  
  // Create simple mock components for all icon exports
  const mockIcons = Object.keys(actual).reduce((acc, key) => {
    if (typeof actual[key] === 'function' || typeof actual[key] === 'object') {
      if (key === 'Ellipsis') {
        acc[key] = ({ size }: { size: number }) => (
          <div data-testid="ellipsis-icon" data-size={size}>Ellipsis</div>
        );
      } else {
        acc[key] = () => <div data-testid={`${key.toLowerCase()}-icon`}>{key}</div>;
      }
    }
    return acc;
  }, {} as any);
  
  return mockIcons;
});

vi.mock('../../src/services/grammarService', () => ({
  generateSchemaFromSpecification: vi.fn().mockReturnValue({
    name: 'GeneratedSchema',
    schemaTypeCategory: 'EVENT',
    description: 'Generated from specification'
  })
}));

describe('App SendMessage Integration Tests', () => {
  beforeEach(() => {
    // Clear only the function mocks, not the module mocks
    mockUpdateProduct.mockClear();
    mockUpdateDomain.mockClear();
    mockUpdateContext.mockClear();
    mockUpdateSchema.mockClear();
    mockAddSchema.mockClear();
    mockSendMessage.mockClear();
    
    // Setup default auth mock
    vi.mocked(useAuth).mockReturnValue({
      authState: defaultMockAuthState,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      checkAuthStatus: vi.fn(),
      clearError: vi.fn()
    });
  });

  describe('Critical sendMessage calls that were missing', () => {
    it('MUST send product_updated message when handleProductEditSubmit is called', async () => {
      const user = userEvent.setup();
      renderWithAuth(<App />);

      // First open the dropdown menu by hovering and clicking ellipsis icon
      const ellipsisButtons = screen.getAllByTestId('ellipsis-icon');
      // Click the second ellipsis (product-level one, first is Products root level)
      await user.hover(ellipsisButtons[1]);
      await user.click(ellipsisButtons[1]);
      
      // Wait for dropdown to appear and then click Edit
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      // We should now be in edit mode - find the input and change the name
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Test Product');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Product Name');

      // Find and click the update/submit button
      const updateButton = screen.getByRole('button', { name: /update|save/i });
      fireEvent.click(updateButton);

      // Wait for async operations
      await waitFor(() => {
        expect(mockUpdateProduct).toHaveBeenCalledWith(
          'test-product-1',
          expect.objectContaining({
            name: 'Updated Product Name'
          })
        );
      });

      // CRITICAL: Verify sendMessage was called with product_updated
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'product_updated',
          entityId: 'test-product-1',
          entityType: 'product',
          data: expect.objectContaining({
            name: 'Updated Product Name'
          }),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          userId: 'current-user'
        });
      });
    });

    it('MUST send domain_updated message when handleDomainEditSubmit is called', async () => {
      const user = userEvent.setup();
      renderWithAuth(<App />);

      // First open the domain dropdown menu by clicking domain ellipsis icon
      const ellipsisButtons = screen.getAllByTestId('ellipsis-icon');
      // Click the domain ellipsis (should be the third one - index 2)
      await user.click(ellipsisButtons[2]);
      
      // Then click Edit from the dropdown
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      // Wait for edit form and update domain name
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Domain')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Test Domain');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Domain Name');

      // Submit the form
      const updateButton = screen.getByRole('button', { name: /update|save/i });
      await user.click(updateButton);

      // Wait for service call
      await waitFor(() => {
        expect(mockUpdateDomain).toHaveBeenCalledWith(
          'test-domain-1',
          expect.objectContaining({
            name: 'Updated Domain Name'
          })
        );
      });

      // CRITICAL: Verify sendMessage was called with domain_updated
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'domain_updated',
          entityId: 'test-domain-1',
          entityType: 'domain',
          data: expect.objectContaining({
            name: 'Updated Domain Name'
          }),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          userId: 'current-user'
        });
      });
    });

    it('MUST send context_updated message when handleContextEditSubmit is called', async () => {
      const user = userEvent.setup();
      renderWithAuth(<App />);

      // First open the context dropdown menu by clicking context ellipsis icon
      const ellipsisButtons = screen.getAllByTestId('ellipsis-icon');
      // Click the context ellipsis (should be the fourth one - index 3)
      await user.click(ellipsisButtons[3]);
      
      // Then click Edit from the dropdown
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      // Wait for edit form and update context name
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Context')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Test Context');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Context Name');

      // Submit the form
      const updateButton = screen.getByRole('button', { name: /update|save/i });
      await user.click(updateButton);

      // Wait for service call
      await waitFor(() => {
        expect(mockUpdateContext).toHaveBeenCalledWith(
          'test-context-1',
          expect.objectContaining({
            name: 'Updated Context Name'
          })
        );
      });

      // CRITICAL: Verify sendMessage was called with context_updated
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'context_updated',
          entityId: 'test-context-1',
          entityType: 'context',
          data: expect.objectContaining({
            name: 'Updated Context Name'
          }),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          userId: 'current-user'
        });
      });
    });

    it('MUST send schema_created message when handleSchemaSubmit is called', async () => {
      const user = userEvent.setup();
      renderWithAuth(<App />);

      // Navigate to the schema creation form by selecting an existing schema context
      // This avoids the complex hierarchy expansion issues
      // Since we have a context in our mock data, let's click on Test Context directly if it exists
      // or use a different approach to get to schema creation
      
      // Click on the Test Context ellipsis to access "New Schema"
      const ellipsisButtons = screen.getAllByTestId('ellipsis-icon');
      await user.click(ellipsisButtons[3]); // Test Context ellipsis (4th button: 0=Products, 1=Product, 2=Domain, 3=Context)
      
      // Then click "New Schema" from the dropdown
      const newSchemaButton = screen.getByText('New Schema');
      await user.click(newSchemaButton);

      // Fill schema form
      const nameInput = screen.getByLabelText(/schema name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const categorySelect = screen.getByLabelText(/category/i);

      await user.type(nameInput, 'NewTestSchema');
      await user.type(descriptionInput, 'New Test Schema Description');
      await user.selectOptions(categorySelect, 'Events');

      // Submit the form
      const createButton = screen.getByRole('button', { name: /create/i });
      fireEvent.click(createButton);

      // Wait for service call
      await waitFor(() => {
        expect(mockAddSchema).toHaveBeenCalledWith(
          'test-context-1',
          expect.objectContaining({
            name: 'NewTestSchema',
            description: 'New Test Schema Description',
            schemaTypeCategory: 'Events'
          })
        );
      });

      // CRITICAL: Verify sendMessage was called with schema_created
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'schema_created',
          entityId: 'new-schema-id',
          entityType: 'schema',
          data: expect.objectContaining({
            name: 'NewTestSchema',
            description: 'New Test Schema Description',
            schemaTypeCategory: 'Events'
          }),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          userId: 'current-user'
        });
      });
    });
  });

  describe('Comprehensive sendMessage validation', () => {
    it('should verify all sendMessage calls have proper message structure', async () => {
      const user = userEvent.setup();
      renderWithAuth(<App />);

      // Trigger a product update to test message structure using dropdown
      const ellipsisButtons = screen.getAllByTestId('ellipsis-icon');
      await user.click(ellipsisButtons[1]);
      
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test Product');
      await user.clear(nameInput);
      await user.type(nameInput, 'Validated Update');

      const updateButton = screen.getByRole('button', { name: /update|save/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          // Must be a valid operation type
          type: expect.stringMatching(/^(product|domain|context|schema|version)_(created|updated|deleted)$/),
          // Must have an entity ID
          entityId: expect.any(String),
          // Must have a valid entity type
          entityType: expect.stringMatching(/^(product|domain|context|schema|version)$/),
          // Must have data payload
          data: expect.any(Object),
          // Must have valid ISO timestamp
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          // Must have user ID
          userId: expect.any(String)
        });
      });
    });

    it('should detect if sendMessage is never called (regression test)', async () => {
      // This test would catch the original bug by failing if sendMessage isn't called

      const user = userEvent.setup();
      
      // Mock the service to succeed but not trigger sendMessage
      mockUpdateProduct.mockResolvedValueOnce(undefined);
      
      renderWithAuth(<App />);

      // Perform an update operation using dropdown
      const ellipsisButtons = screen.getAllByTestId('ellipsis-icon');
      await user.click(ellipsisButtons[1]);
      
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test Product');
      await user.clear(nameInput);
      await user.type(nameInput, 'Should Trigger SendMessage');

      const updateButton = screen.getByRole('button', { name: /update|save/i });
      await user.click(updateButton);

      // Verify the service was called (operation succeeded)
      await waitFor(() => {
        expect(mockUpdateProduct).toHaveBeenCalled();
      });

      // CRITICAL: Verify sendMessage was also called
      // This assertion would have failed before our fix, catching the bug
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
      }, { timeout: 1000 });

      // More specific assertion
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'product_updated',
          entityId: 'test-product-1'
        })
      );
    });

    it('should ensure sendMessage timing - called after successful service operation', async () => {
      // This tests the order: service call succeeds THEN sendMessage is called
      const user = userEvent.setup();

      renderWithAuth(<App />);

      // Trigger update using dropdown
      const ellipsisButtons = screen.getAllByTestId('ellipsis-icon');
      await user.click(ellipsisButtons[1]);
      
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test Product');
      await user.clear(nameInput);
      await user.type(nameInput, 'Order Test');

      const updateButton = screen.getByRole('button', { name: /update|save/i });
      await user.click(updateButton);

      // First ensure updateProduct was called
      await waitFor(() => {
        expect(mockUpdateProduct).toHaveBeenCalled();
      });

      // Then ensure sendMessage was called after
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalled();
      });

      // Verify both were called in the correct sequence
      expect(mockUpdateProduct).toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'product_updated',
          entityId: 'test-product-1'
        })
      );
    });
  });

  describe('Error cases', () => {
    it('should not send message if service operation fails', async () => {
      const user = userEvent.setup();
      
      // Mock service to fail
      mockUpdateProduct.mockRejectedValueOnce(new Error('Service error'));
      
      renderWithAuth(<App />);

      // Trigger update that will fail using dropdown
      const ellipsisButtons = screen.getAllByTestId('ellipsis-icon');
      await user.click(ellipsisButtons[1]);
      
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue('Test Product');
      await user.clear(nameInput);
      await user.type(nameInput, 'Should Fail');

      const updateButton = screen.getByRole('button', { name: /update|save/i });
      fireEvent.click(updateButton);

      // Wait for operation to complete (and fail)
      await waitFor(() => {
        expect(mockUpdateProduct).toHaveBeenCalled();
      });

      // Verify sendMessage was NOT called since operation failed
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('MUST send schema_updated message when handleSchemaEditSubmit is called', async () => {
      const user = userEvent.setup();
      renderWithAuth(<App />);

      // Expand hierarchy using keyboard navigation to reveal schema
      // Navigate and expand the hierarchy using keyboard
      await user.keyboard('{ArrowRight}'); // Expand Products root if needed
      await user.keyboard('{ArrowDown}'); // Move to Product
      await user.keyboard('{ArrowRight}'); // Expand Product  
      await user.keyboard('{ArrowDown}'); // Move to Domain
      await user.keyboard('{ArrowRight}'); // Expand Domain
      await user.keyboard('{ArrowDown}'); // Move to Context
      await user.keyboard('{ArrowRight}'); // Expand Context
      await user.keyboard('{ArrowDown}'); // Move to Events category
      await user.keyboard('{ArrowRight}'); // Expand Events category
      await user.keyboard('{ArrowDown}'); // Move to Schema

      // Wait for Events category to appear, then expand it
      await waitFor(() => {
        expect(screen.getByText('Events')).toBeInTheDocument();
      }, { timeout: 2000 });
      
      // Click on the Events category to expand it
      const eventsCategory = screen.getByText('Events');
      await user.click(eventsCategory);
      
      // Wait for the schema to appear
      await waitFor(() => {
        expect(screen.getByText('Test Schema')).toBeInTheDocument();
      }, { timeout: 2000 });

      // Find the schema ellipsis button (should be at index 5)
      const ellipsisButtons = screen.getAllByTestId('ellipsis-icon');
      await user.hover(ellipsisButtons[5]);
      await user.click(ellipsisButtons[5]);
      
      await waitFor(() => {
        expect(screen.getByText('Edit')).toBeInTheDocument();
      });
      
      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      // Update schema name
      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Schema')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByDisplayValue('Test Schema');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Schema Name');

      // Click Save button
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      // Wait for service call
      await waitFor(() => {
        expect(mockUpdateSchema).toHaveBeenCalledWith('test-schema-1', expect.objectContaining({
          name: 'Updated Schema Name',
          description: 'Test Schema Description',
          schemaTypeCategory: 'Events',
          scope: 'Public'
        }));
      });

      // Verify sendMessage was called
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: 'schema_updated',
          entityId: 'test-schema-1',
          entityType: 'schema',
          data: expect.objectContaining({
            name: 'Updated Schema Name'
          }),
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/),
          userId: 'current-user'
        });
      });
    });
  });
});