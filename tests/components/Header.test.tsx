import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../../src/components/Header';

// Mock dependencies
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    authState: {
      isAuthenticated: false,
      user: null,
      isLoading: false
    },
    logout: vi.fn()
  }))
}));

vi.mock('../../src/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    is: {
      admin: false,
      user: false
    }
  }))
}));

vi.mock('../../src/hooks/useChangeNotifications', () => ({
  useChangeNotifications: vi.fn(() => ({
    totalChangeCount: 0,
    refresh: vi.fn(),
    detailedChanges: [],
    isLoading: false,
    error: null,
    fetchAllDetailedChanges: vi.fn(),
    markChangesAsSeen: vi.fn()
  }))
}));

// Mock AdminInterface component
vi.mock('../../src/components/AdminInterface', () => ({
  AdminInterface: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="admin-interface">
      <button onClick={onClose}>Close Admin</button>
    </div>
  )
}));

// Mock UserSettingsModal component
vi.mock('../../src/components/UserSettingsModal', () => ({
  UserSettingsModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="user-settings-modal">
        <button onClick={onClose}>Close Settings</button>
      </div>
    ) : null
  )
}));

// Mock EntityLookupService
vi.mock('../../src/services/entityLookup', () => ({
  EntityLookupService: vi.fn().mockImplementation(() => ({
    getEntityInfo: vi.fn(() => ({ type: 'Schema', name: 'TestSchema' })),
    getEntityHierarchyPath: vi.fn(() => ['Product', 'Domain', 'Context', 'Schema'])
  }))
}));

// Mock logo import
vi.mock('../../src/assets/images/domo-logo.svg', () => ({
  default: 'domo-logo-mock.svg'
}));

// Import mocked modules
import { useAuth } from '../../src/contexts/AuthContext';
import { usePermissions } from '../../src/hooks/usePermissions';
import { useChangeNotifications } from '../../src/hooks/useChangeNotifications';

describe('Header', () => {
  const user = userEvent.setup();
  const mockRegistry = {
    products: [],
    metadata: { totalProducts: 0 }
  };

  // Get mock functions
  const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;
  const mockUsePermissions = usePermissions as vi.MockedFunction<typeof usePermissions>;
  const mockUseChangeNotifications = useChangeNotifications as vi.MockedFunction<typeof useChangeNotifications>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderHeader = (props = {}) => {
    const defaultProps = {
      registry: mockRegistry,
      ...props
    };
    return render(<Header {...defaultProps} />);
  };

  describe('Component Rendering', () => {
    it('should render the header with logo', () => {
      renderHeader();

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByAltText('Domo')).toBeInTheDocument();
      expect(screen.getByAltText('Domo')).toHaveAttribute('src', 'domo-logo-mock.svg');
    });

    it('should not show user menu when not authenticated', () => {
      renderHeader();

      expect(screen.queryByText('Guest')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
    });

    it('should show user menu when authenticated', () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });

      renderHeader();

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('J')).toBeInTheDocument(); // User initial
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
    });

    it('should show Guest when user has no fullName', () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: {},
          isLoading: false
        },
        logout: vi.fn()
      });

      renderHeader();

      expect(screen.getByText('Guest')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument(); // Guest initial
    });

    it('should show notification badge when there are changes', () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });

      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 5,
        refresh: vi.fn(),
        detailedChanges: [],
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not show notification badge for unauthenticated users', () => {
      // Default mocks should have isAuthenticated: false
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 5,
        refresh: vi.fn(),
        detailedChanges: [],
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      // Should not show notification button at all for unauthenticated users
      expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument();
    });
  });

  describe('Basic Authentication Flow', () => {
    it('should show dropdown menu for authenticated users', async () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });

      renderHeader();

      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
      expect(userButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should show Admin option when user is admin', async () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });

      mockUsePermissions.mockReturnValue({
        is: {
          admin: true,
          user: true
        }
      });

      renderHeader();

      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should not show Admin option when user is not admin', async () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });

      mockUsePermissions.mockReturnValue({
        is: {
          admin: false,
          user: true
        }
      });

      renderHeader();

      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);

      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });
  });

  describe('Event Cleanup', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderHeader();
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Menu Item Actions', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });
    });

    it('should handle Profile menu item click', async () => {
      renderHeader();

      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);

      const profileButton = screen.getByText('Profile');
      await user.click(profileButton);

      // Should close dropdown
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should open Settings modal when Settings menu item is clicked', async () => {
      renderHeader();

      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);

      const settingsButton = screen.getByText('Settings');
      await user.click(settingsButton);

      expect(screen.getByTestId('user-settings-modal')).toBeInTheDocument();
    });

    it('should open Admin interface when Admin menu item is clicked', async () => {
      mockUsePermissions.mockReturnValue({
        is: {
          admin: true,
          user: true
        }
      });

      renderHeader();

      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);

      const adminButton = screen.getByText('Admin');
      await user.click(adminButton);

      expect(screen.getByTestId('admin-interface')).toBeInTheDocument();
    });

    it('should call logout when Sign Out menu item is clicked', async () => {
      const mockLogout = vi.fn();
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: mockLogout
      });

      renderHeader();

      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);

      const signOutButton = screen.getByText('Sign Out');
      await user.click(signOutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal Management', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });
    });

    it('should close Admin interface when onClose is called', async () => {
      mockUsePermissions.mockReturnValue({
        is: {
          admin: true,
          user: true
        }
      });

      renderHeader();

      // Open admin interface
      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);
      const adminButton = screen.getByText('Admin');
      await user.click(adminButton);

      expect(screen.getByTestId('admin-interface')).toBeInTheDocument();

      // Close admin interface
      const closeButton = screen.getByText('Close Admin');
      await user.click(closeButton);

      expect(screen.queryByTestId('admin-interface')).not.toBeInTheDocument();
    });

    it('should close User Settings modal when onClose is called', async () => {
      renderHeader();

      // Open settings modal
      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);
      const settingsButton = screen.getByText('Settings');
      await user.click(settingsButton);

      expect(screen.getByTestId('user-settings-modal')).toBeInTheDocument();

      // Close settings modal
      const closeButton = screen.getByText('Close Settings');
      await user.click(closeButton);

      expect(screen.queryByTestId('user-settings-modal')).not.toBeInTheDocument();
    });
  });

  describe('Notification Functionality', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });
    });

    it('should open change notification panel when notification button is clicked', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 3,
        refresh: vi.fn(),
        detailedChanges: [],
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      expect(screen.getByText('Recent Changes')).toBeInTheDocument();
    });

    it('should close change notification panel when close button is clicked', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 3,
        refresh: vi.fn(),
        detailedChanges: [],
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      // Open notification panel
      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      expect(screen.getByText('Recent Changes')).toBeInTheDocument();

      // Close notification panel
      const closeButton = screen.getByText('×');
      await user.click(closeButton);

      expect(screen.queryByText('Recent Changes')).not.toBeInTheDocument();
    });

    it('should fetch detailed changes when notification panel opens', async () => {
      const mockFetchAllDetailedChanges = vi.fn();
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 3,
        refresh: vi.fn(),
        detailedChanges: [],
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: mockFetchAllDetailedChanges,
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      expect(mockFetchAllDetailedChanges).toHaveBeenCalledTimes(1);
    });
  });

  describe('Change Notification Panel', () => {
    const mockChanges = [
      {
        id: 'change1',
        entityType: 'schema',
        entityId: 'schema1',
        changeType: 'created',
        createdAt: '2023-01-01T10:00:00Z',
        changedByUserName: 'John Doe',
        changeData: {
          after: { name: 'Test Schema', description: 'A test schema' }
        }
      },
      {
        id: 'change2',
        entityType: 'schema_version',
        entityId: 'version1',
        changeType: 'updated',
        createdAt: '2023-01-01T11:00:00Z',
        changedByUserName: 'Jane Smith',
        isBreakingChange: true,
        changeData: {
          before: { semanticVersion: '1.0.0', status: 'draft' },
          after: { semanticVersion: '1.0.0', status: 'active' }
        }
      }
    ];

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });
    });

    it('should display loading state', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 3,
        refresh: vi.fn(),
        detailedChanges: [],
        isLoading: true,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      expect(screen.getByText('Loading changes...')).toBeInTheDocument();
    });

    it('should display error state', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 0,
        refresh: vi.fn(),
        detailedChanges: [],
        isLoading: false,
        error: 'Failed to load changes',
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      expect(screen.getByText('Error: Failed to load changes')).toBeInTheDocument();
    });

    it('should display no changes message when empty', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 0,
        refresh: vi.fn(),
        detailedChanges: [],
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      expect(screen.getByText('No recent changes to display')).toBeInTheDocument();
    });

    it('should display change list with controls when changes are available', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 2,
        refresh: vi.fn(),
        detailedChanges: mockChanges,
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      expect(screen.getByText('Select All (2)')).toBeInTheDocument();
      expect(screen.getByText('Dismiss Selected (0)')).toBeInTheDocument();
      expect(screen.getByText('Schema Created')).toBeInTheDocument();
      expect(screen.getByText('Version Updated')).toBeInTheDocument();
    });

    it('should handle select all functionality', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 2,
        refresh: vi.fn(),
        detailedChanges: mockChanges,
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      const selectAllCheckbox = screen.getByLabelText('Select All (2)');
      await user.click(selectAllCheckbox);

      expect(screen.getByText('Dismiss Selected (2)')).toBeInTheDocument();
    });

    it('should handle individual change selection', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 2,
        refresh: vi.fn(),
        detailedChanges: mockChanges,
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox is "Select All", second is first change
      await user.click(checkboxes[1]);

      expect(screen.getByText('Dismiss Selected (1)')).toBeInTheDocument();
    });

    it('should handle dismiss selected functionality', async () => {
      const mockMarkChangesAsSeen = vi.fn().mockResolvedValue(true);
      const mockRefresh = vi.fn();
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 2,
        refresh: mockRefresh,
        detailedChanges: mockChanges,
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: mockMarkChangesAsSeen
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      const selectAllCheckbox = screen.getByLabelText('Select All (2)');
      await user.click(selectAllCheckbox);

      const dismissButton = screen.getByText('Dismiss Selected (2)');
      await user.click(dismissButton);

      await waitFor(() => {
        expect(mockMarkChangesAsSeen).toHaveBeenCalledWith(['change1', 'change2']);
        expect(mockRefresh).toHaveBeenCalledTimes(1);
      });
    });

    it('should show change details when change is clicked', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 2,
        refresh: vi.fn(),
        detailedChanges: mockChanges,
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      const changeItem = screen.getByText('Schema Created').closest('.notification-item');
      await user.click(changeItem!);

      expect(screen.getByText('Change Details')).toBeInTheDocument();

      // Check that detail metadata is shown in the detail view
      const detailView = document.querySelector('.notification-detail-view');
      expect(detailView).toBeInTheDocument();

      // Check that the change type is displayed in the detail view
      expect(screen.getAllByText('Schema Created')).toHaveLength(2); // One in list, one in detail
    });

    it('should display breaking change badge', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 2,
        refresh: vi.fn(),
        detailedChanges: mockChanges,
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      expect(screen.getByText('Breaking Change')).toBeInTheDocument();
    });

    it('should close panel when clicking overlay', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 2,
        refresh: vi.fn(),
        detailedChanges: mockChanges,
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      const overlay = document.querySelector('.notification-panel-overlay');
      fireEvent.click(overlay!);

      expect(screen.queryByText('Recent Changes')).not.toBeInTheDocument();
    });

    it('should not close panel when clicking inside panel', async () => {
      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 2,
        refresh: vi.fn(),
        detailedChanges: mockChanges,
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      await user.click(notificationButton);

      const panel = document.querySelector('.notification-panel');
      fireEvent.click(panel!);

      expect(screen.getByText('Recent Changes')).toBeInTheDocument();
    });
  });

  describe('Outside Click Handling', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });
    });

    it('should close dropdown when clicking outside', async () => {
      renderHeader();

      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);

      expect(screen.getByText('Profile')).toBeInTheDocument();

      // Simulate click outside
      fireEvent.mouseDown(document.body);

      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should not close dropdown when clicking inside dropdown', async () => {
      renderHeader();

      const userButton = screen.getByRole('button', { expanded: false });
      await user.click(userButton);

      const dropdown = document.querySelector('.user-dropdown');
      fireEvent.mouseDown(dropdown!);

      expect(screen.getByText('Profile')).toBeInTheDocument();
    });
  });

  describe('User Display Logic', () => {
    it('should display user initial correctly', () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'john doe' },
          isLoading: false
        },
        logout: vi.fn()
      });

      renderHeader();

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should handle empty user name', () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: '' },
          isLoading: false
        },
        logout: vi.fn()
      });

      renderHeader();

      expect(screen.getByText('Guest')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
    });

    it('should handle null user', () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: null,
          isLoading: false
        },
        logout: vi.fn()
      });

      renderHeader();

      expect(screen.getByText('Guest')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
    });
  });

  describe('Change Count Display Logic', () => {
    it('should display change count only for authenticated users', () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });

      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 5,
        refresh: vi.fn(),
        detailedChanges: [],
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not display change count for unauthenticated users even if count exists', () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false
        },
        logout: vi.fn()
      });

      mockUseChangeNotifications.mockReturnValue({
        totalChangeCount: 5,
        refresh: vi.fn(),
        detailedChanges: [],
        isLoading: false,
        error: null,
        fetchAllDetailedChanges: vi.fn(),
        markChangesAsSeen: vi.fn()
      });

      renderHeader();

      expect(screen.queryByText('5')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for logo', () => {
      renderHeader();

      const logo = screen.getByAltText('Domo');
      expect(logo).toBeInTheDocument();
    });

    it('should have proper ARIA attributes for authenticated user menu', async () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });

      renderHeader();

      const userButton = screen.getByRole('button', { expanded: false });
      expect(userButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(userButton);
      expect(userButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper title for notification button', () => {
      mockUseAuth.mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: { fullName: 'John Doe' },
          isLoading: false
        },
        logout: vi.fn()
      });

      renderHeader();

      const notificationButton = screen.getByTitle('Notifications');
      expect(notificationButton).toBeInTheDocument();
    });
  });
});