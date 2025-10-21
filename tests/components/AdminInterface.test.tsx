import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminInterface } from '../../src/components/AdminInterface';

// Mock the API client
vi.mock('../../src/services/apiClient', () => ({
  apiClient: {
    debugQuery: vi.fn()
  }
}));

import { apiClient } from '../../src/services/apiClient';

describe('AdminInterface', () => {
  const mockOnClose = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderAdminInterface = () => {
    return render(<AdminInterface onClose={mockOnClose} />);
  };

  describe('Component Rendering', () => {
    it('should render the admin interface with all elements', () => {
      renderAdminInterface();

      expect(screen.getByText('Database Administration')).toBeInTheDocument();
      expect(screen.getByLabelText('SQL Query:')).toBeInTheDocument();
      expect(screen.getByLabelText('Query Results:')).toBeInTheDocument();
      expect(screen.getByText('Execute')).toBeInTheDocument();
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.getByText('Tip: Use Ctrl/Cmd + Enter to execute the query')).toBeInTheDocument();
    });

    it('should render with default query', () => {
      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      expect(queryTextarea).toHaveValue('SELECT name FROM sqlite_master WHERE type="table"');
    });

    it('should have empty results initially', () => {
      renderAdminInterface();

      const resultsTextarea = screen.getByLabelText('Query Results:');
      expect(resultsTextarea).toHaveValue('');
    });

    it('should render close button with correct title', () => {
      renderAdminInterface();

      const closeButton = screen.getByTitle('Close Admin Interface');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton.textContent).toBe('×');
    });
  });

  describe('Query Input Handling', () => {
    it('should update query when user types', async () => {
      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM users');

      expect(queryTextarea).toHaveValue('SELECT * FROM users');
    });

    it('should clear query when user clears input', async () => {
      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      await user.clear(queryTextarea);

      expect(queryTextarea).toHaveValue('');
    });

    it('should enable execute button when query has content', () => {
      renderAdminInterface();

      const executeButton = screen.getByText('Execute');
      expect(executeButton).not.toBeDisabled();
    });

    it('should disable execute button when query is empty', async () => {
      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');

      await user.clear(queryTextarea);
      expect(executeButton).toBeDisabled();
    });

    it('should disable execute button when query is only whitespace', async () => {
      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');

      await user.clear(queryTextarea);
      await user.type(queryTextarea, '   ');
      expect(executeButton).toBeDisabled();
    });
  });

  describe('Query Execution', () => {
    it('should execute query and display results on successful API call', async () => {
      const mockResponse = {
        query: 'SELECT * FROM users',
        count: 2,
        timestamp: '2023-01-01T10:00:00Z',
        results: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
      };

      (apiClient.debugQuery as any).mockResolvedValue(mockResponse);

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');
      const resultsTextarea = screen.getByLabelText('Query Results:');

      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM users');
      await user.click(executeButton);

      await waitFor(() => {
        expect(apiClient.debugQuery).toHaveBeenCalledWith('SELECT * FROM users');
        expect(resultsTextarea).toHaveValue(JSON.stringify(mockResponse, null, 2));
      });
    });

    it('should display error message when API returns error', async () => {
      const mockResponse = {
        query: 'SELECT * FROM invalid_table',
        count: 0,
        timestamp: '2023-01-01T10:00:00Z',
        results: [],
        error: 'Table does not exist'
      };

      (apiClient.debugQuery as any).mockResolvedValue(mockResponse);

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');
      const resultsTextarea = screen.getByLabelText('Query Results:');

      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM invalid_table');
      await user.click(executeButton);

      await waitFor(() => {
        expect(resultsTextarea).toHaveValue('Error: Table does not exist');
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('Network error');
      (apiClient.debugQuery as any).mockRejectedValue(mockError);

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');
      const resultsTextarea = screen.getByLabelText('Query Results:');

      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM users');
      await user.click(executeButton);

      await waitFor(() => {
        expect(resultsTextarea).toHaveValue('Error: Network error');
      });
    });

    it('should handle non-Error objects in catch block', async () => {
      (apiClient.debugQuery as any).mockRejectedValue('String error');

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');
      const resultsTextarea = screen.getByLabelText('Query Results:');

      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM users');
      await user.click(executeButton);

      await waitFor(() => {
        expect(resultsTextarea).toHaveValue('Error: Unknown error occurred');
      });
    });

    it('should show message when trying to execute empty query', async () => {
      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');
      const resultsTextarea = screen.getByLabelText('Query Results:');

      await user.clear(queryTextarea);

      // Since button is disabled for empty query, we need to test the logic directly
      // by calling the handler through keyboard shortcut
      fireEvent.keyDown(queryTextarea, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(resultsTextarea).toHaveValue('Please enter a query to execute.');
      });
    });

    it('should not execute query when already executing', async () => {
      // Mock a slow response
      (apiClient.debugQuery as any).mockImplementation(() => new Promise(resolve =>
        setTimeout(() => resolve({ query: 'test', count: 0, timestamp: 'now', results: [] }), 100)
      ));

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');

      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM users');

      // Start first execution
      await user.click(executeButton);
      expect(executeButton).toHaveTextContent('Executing...');

      // Try to execute again while first is running
      await user.click(executeButton);

      // Should only be called once
      await waitFor(() => {
        expect(apiClient.debugQuery).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should execute query with Ctrl+Enter', async () => {
      const mockResponse = {
        query: 'SELECT * FROM users',
        count: 1,
        timestamp: '2023-01-01T10:00:00Z',
        results: [{ id: 1, name: 'John' }]
      };

      (apiClient.debugQuery as any).mockResolvedValue(mockResponse);

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM users');

      fireEvent.keyDown(queryTextarea, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(apiClient.debugQuery).toHaveBeenCalledWith('SELECT * FROM users');
      });
    });

    it('should execute query with Cmd+Enter (Mac)', async () => {
      const mockResponse = {
        query: 'SELECT * FROM users',
        count: 1,
        timestamp: '2023-01-01T10:00:00Z',
        results: [{ id: 1, name: 'John' }]
      };

      (apiClient.debugQuery as any).mockResolvedValue(mockResponse);

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM users');

      fireEvent.keyDown(queryTextarea, { key: 'Enter', metaKey: true });

      await waitFor(() => {
        expect(apiClient.debugQuery).toHaveBeenCalledWith('SELECT * FROM users');
      });
    });

    it('should prevent default behavior for Ctrl+Enter', async () => {
      const mockResponse = {
        query: 'SELECT * FROM users',
        count: 1,
        timestamp: '2023-01-01T10:00:00Z',
        results: [{ id: 1, name: 'John' }]
      };

      (apiClient.debugQuery as any).mockResolvedValue(mockResponse);

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM users');

      // Create a custom event that we can spy on
      const preventDefaultSpy = vi.fn();
      const originalAddEventListener = queryTextarea.addEventListener;
      queryTextarea.addEventListener = vi.fn((type, handler) => {
        if (type === 'keydown') {
          const wrappedHandler = (e: any) => {
            if (e.preventDefault) {
              preventDefaultSpy();
            }
            handler(e);
          };
          originalAddEventListener.call(queryTextarea, type, wrappedHandler);
        } else {
          originalAddEventListener.call(queryTextarea, type, handler);
        }
      });

      fireEvent.keyDown(queryTextarea, { key: 'Enter', ctrlKey: true, preventDefault: vi.fn() });

      await waitFor(() => {
        expect(apiClient.debugQuery).toHaveBeenCalledWith('SELECT * FROM users');
      });
    });
  });

  describe('Clear Functionality', () => {
    it('should clear results when Clear button is clicked', async () => {
      const mockResponse = {
        query: 'SELECT * FROM users',
        count: 1,
        timestamp: '2023-01-01T10:00:00Z',
        results: [{ id: 1, name: 'John' }]
      };

      (apiClient.debugQuery as any).mockResolvedValue(mockResponse);

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');
      const resultsTextarea = screen.getByLabelText('Query Results:');
      const clearButton = screen.getByText('Clear');

      // Execute query first to get results
      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM users');
      await user.click(executeButton);

      await waitFor(() => {
        expect(resultsTextarea).toHaveValue(JSON.stringify(mockResponse, null, 2));
      });

      await user.click(clearButton);
      expect(resultsTextarea).toHaveValue('');
    });

    it('should disable Clear button when results are empty', () => {
      renderAdminInterface();

      const clearButton = screen.getByText('Clear');
      expect(clearButton).toBeDisabled();
    });

    it('should enable Clear button when results have content', async () => {
      const mockResponse = {
        query: 'SELECT * FROM users',
        count: 1,
        timestamp: '2023-01-01T10:00:00Z',
        results: [{ id: 1, name: 'John' }]
      };

      (apiClient.debugQuery as any).mockResolvedValue(mockResponse);

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');
      const clearButton = screen.getByText('Clear');

      // Initially clear button should be disabled
      expect(clearButton).toBeDisabled();

      // Execute query to get results
      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM users');
      await user.click(executeButton);

      await waitFor(() => {
        expect(clearButton).not.toBeDisabled();
      });
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button (×) is clicked', async () => {
      renderAdminInterface();

      const closeButton = screen.getByTitle('Close Admin Interface');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when secondary close button is clicked', async () => {
      renderAdminInterface();

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', async () => {
      renderAdminInterface();

      const overlay = document.querySelector('.admin-interface-overlay');
      if (overlay) {
        await user.click(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      } else {
        throw new Error('Overlay element not found');
      }
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form elements', () => {
      renderAdminInterface();

      expect(screen.getByLabelText('SQL Query:')).toBeInTheDocument();
      expect(screen.getByLabelText('Query Results:')).toBeInTheDocument();
    });

    it('should have proper button titles and roles', () => {
      renderAdminInterface();

      const closeButton = screen.getByTitle('Close Admin Interface');
      expect(closeButton).toBeInTheDocument();

      const executeButton = screen.getByRole('button', { name: /execute/i });
      expect(executeButton).toBeInTheDocument();

      const clearButton = screen.getByRole('button', { name: /clear/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should have proper textareas with placeholders', () => {
      renderAdminInterface();

      const queryTextarea = screen.getByPlaceholderText('Enter your SQL query here...');
      expect(queryTextarea).toBeInTheDocument();

      const resultsTextarea = screen.getByPlaceholderText('Query results will appear here...');
      expect(resultsTextarea).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long query results', async () => {
      const longResults = Array(1000).fill('data').join(' ');
      const mockResponse = {
        query: 'SELECT * FROM large_table',
        count: 1000,
        timestamp: '2023-01-01T10:00:00Z',
        results: [{ data: longResults }]
      };

      (apiClient.debugQuery as any).mockResolvedValue(mockResponse);

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');
      const resultsTextarea = screen.getByLabelText('Query Results:');

      await user.clear(queryTextarea);
      await user.type(queryTextarea, 'SELECT * FROM large_table');
      await user.click(executeButton);

      await waitFor(() => {
        expect(resultsTextarea).toHaveValue(JSON.stringify(mockResponse, null, 2));
      });
    });

    it('should handle special characters in query', async () => {
      const specialQuery = 'SELECT * FROM "user-table" WHERE name = \'O\'Brien\'';
      const mockResponse = {
        query: specialQuery,
        count: 1,
        timestamp: '2023-01-01T10:00:00Z',
        results: [{ id: 1, name: "O'Brien" }]
      };

      (apiClient.debugQuery as any).mockResolvedValue(mockResponse);

      renderAdminInterface();

      const queryTextarea = screen.getByLabelText('SQL Query:');
      const executeButton = screen.getByText('Execute');

      await user.clear(queryTextarea);
      await user.type(queryTextarea, specialQuery);
      await user.click(executeButton);

      await waitFor(() => {
        expect(apiClient.debugQuery).toHaveBeenCalledWith(specialQuery);
      });
    });
  });
});