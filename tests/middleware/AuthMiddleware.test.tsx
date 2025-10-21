import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AuthMiddleware,
  useAuthGuard,
  withAuth,
  ProtectedRoute
} from '../../src/middleware/AuthMiddleware';
import { useEnhancedAuth } from '../../src/contexts/EnhancedAuthContext';
import { User } from '../../src/types/user';
import { renderHook } from '@testing-library/react';

// Mock the enhanced auth context
vi.mock('../../src/contexts/EnhancedAuthContext', () => ({
  useEnhancedAuth: vi.fn()
}));

// Mock window.location
const mockLocation = {
  href: ''
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
});

describe('AuthMiddleware', () => {
  const mockUser: User = {
    id: '1',
    fullName: 'Test User',
    emailAddress: 'test@example.com',
    emailVerified: true,
    roles: ['editor'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const TestComponent = () => <div>Protected Content</div>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';

    // Reset the mock to a clean working state
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: mockUser,
        isLoading: false,
        error: null
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner when auth state is loading', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: true,
          error: null
        }
      });

      render(
        <AuthMiddleware>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show custom fallback when provided during loading', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: true,
          error: null
        }
      });

      const CustomFallback = () => <div>Custom Loading</div>;

      render(
        <AuthMiddleware fallback={<CustomFallback />}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Custom Loading')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should render children when loading completes and no restrictions', () => {
      render(
        <AuthMiddleware>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Authentication Requirements', () => {
    it('should render children when auth not required', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requireAuth={false}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should show unauthorized message when auth required but user not authenticated', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requireAuth={true}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.getByText('You need to be logged in to access this content.')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should render children when auth required and user is authenticated', () => {
      render(
        <AuthMiddleware requireAuth={true}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should call onUnauthorized callback when provided', () => {
      const onUnauthorized = vi.fn();

      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requireAuth={true} onUnauthorized={onUnauthorized}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('should show custom fallback for authentication failure', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      const CustomFallback = () => <div>Custom Auth Required</div>;

      render(
        <AuthMiddleware requireAuth={true} fallback={<CustomFallback />}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Custom Auth Required')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
    });

    it('should show Sign In button with onUnauthorized callback', async () => {
      const onUnauthorized = vi.fn();

      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      const user = userEvent.setup();
      render(
        <AuthMiddleware requireAuth={true} onUnauthorized={onUnauthorized}>
          <TestComponent />
        </AuthMiddleware>
      );

      const signInButton = screen.getByRole('button', { name: 'Sign In' });
      await user.click(signInButton);

      expect(onUnauthorized).toHaveBeenCalledTimes(2); // Once on render, once on click
    });
  });

  describe('Email Verification Requirements', () => {
    it('should render children when email verification not required', () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: unverifiedUser,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requireEmailVerified={false}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should render children when email verification required and user email is verified', () => {
      render(
        <AuthMiddleware requireEmailVerified={true}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should show email verification message when required but not verified', () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: unverifiedUser,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requireEmailVerified={true}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Email Verification Required')).toBeInTheDocument();
      expect(screen.getByText('Please verify your email address to access this content.')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show custom fallback for email verification failure', () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: unverifiedUser,
          isLoading: false,
          error: null
        }
      });

      const CustomFallback = () => <div>Custom Email Verification Required</div>;

      render(
        <AuthMiddleware requireEmailVerified={true} fallback={<CustomFallback />}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Custom Email Verification Required')).toBeInTheDocument();
      expect(screen.queryByText('Email Verification Required')).not.toBeInTheDocument();
    });

    it('should handle null user when email verification required', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: null,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requireEmailVerified={true}>
          <TestComponent />
        </AuthMiddleware>
      );

      // Should render children since no user to check verification for
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Role-Based Access Control', () => {
    it('should render children when no roles required', () => {
      render(
        <AuthMiddleware requiredRoles={[]}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should render children when user has required role', () => {
      render(
        <AuthMiddleware requiredRoles={['editor']}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should render children when user has one of multiple required roles', () => {
      render(
        <AuthMiddleware requiredRoles={['admin', 'editor']}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should show insufficient permissions when user lacks required role', () => {
      render(
        <AuthMiddleware requiredRoles={['admin']}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
      expect(screen.getByText("You don't have the required permissions to access this content.")).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should show custom fallback for insufficient permissions', () => {
      const CustomFallback = () => <div>Custom Insufficient Permissions</div>;

      render(
        <AuthMiddleware requiredRoles={['admin']} fallback={<CustomFallback />}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Custom Insufficient Permissions')).toBeInTheDocument();
      expect(screen.queryByText('Insufficient Permissions')).not.toBeInTheDocument();
    });

    it('should handle user with multiple roles', () => {
      const multiRoleUser = { ...mockUser, roles: ['viewer', 'editor', 'admin'] };
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: multiRoleUser,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requiredRoles={['admin']}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should handle user with no roles defined', () => {
      const noRoleUser = { ...mockUser, roles: undefined };
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: noRoleUser,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requiredRoles={['editor']}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    });

    it('should handle user with empty roles array', () => {
      const emptyRolesUser = { ...mockUser, roles: [] };
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: emptyRolesUser,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requiredRoles={['editor']}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    });

    it('should render children when roles required but no user (for flexibility)', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requiredRoles={['editor']}>
          <TestComponent />
        </AuthMiddleware>
      );

      // Should render children since no user to check roles for
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Combined Requirements', () => {
    it('should handle all requirements together - success case', () => {
      render(
        <AuthMiddleware
          requireAuth={true}
          requireEmailVerified={true}
          requiredRoles={['editor']}
        >
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should show auth error first when multiple requirements fail', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware
          requireAuth={true}
          requireEmailVerified={true}
          requiredRoles={['admin']}
        >
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
      expect(screen.queryByText('Email Verification Required')).not.toBeInTheDocument();
      expect(screen.queryByText('Insufficient Permissions')).not.toBeInTheDocument();
    });

    it('should show email verification error when auth passes but email fails', () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: unverifiedUser,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware
          requireAuth={true}
          requireEmailVerified={true}
          requiredRoles={['editor']}
        >
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Email Verification Required')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.queryByText('Insufficient Permissions')).not.toBeInTheDocument();
    });

    it('should show permissions error when auth and email pass but roles fail', () => {
      render(
        <AuthMiddleware
          requireAuth={true}
          requireEmailVerified={true}
          requiredRoles={['admin']}
        >
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
      expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
      expect(screen.queryByText('Email Verification Required')).not.toBeInTheDocument();
    });
  });

  describe('Default Props', () => {
    it('should use default values for optional props', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware>
          <TestComponent />
        </AuthMiddleware>
      );

      // Should render children since requireAuth defaults to false
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should handle undefined requiredRoles', () => {
      render(
        <AuthMiddleware requiredRoles={undefined}>
          <TestComponent />
        </AuthMiddleware>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});

describe('useAuthGuard', () => {
  const mockUser: User = {
    id: '1',
    fullName: 'Test User',
    emailAddress: 'test@example.com',
    emailVerified: true,
    roles: ['editor'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: mockUser,
        isLoading: false,
        error: null
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Setup', () => {
    it('should provide auth guard functions', () => {
      const { result } = renderHook(() => useAuthGuard());

      expect(result.current.checkAuth).toBeInstanceOf(Function);
      expect(result.current.requireAuth).toBeInstanceOf(Function);
      expect(result.current.requireEmailVerified).toBeInstanceOf(Function);
      expect(result.current.requireRoles).toBeInstanceOf(Function);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBe(mockUser);
    });
  });

  describe('checkAuth function', () => {
    it('should return loading state when auth is loading', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: true,
          error: null
        }
      });

      const { result } = renderHook(() => useAuthGuard());
      const authResult = result.current.checkAuth();

      expect(authResult.allowed).toBe(false);
      expect(authResult.reason).toBe('loading');
    });

    it('should return success when no requirements specified', () => {
      const { result } = renderHook(() => useAuthGuard());
      const authResult = result.current.checkAuth();

      expect(authResult.allowed).toBe(true);
      expect(authResult.reason).toBeNull();
    });

    it('should check authentication requirement', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => useAuthGuard());
      const authResult = result.current.checkAuth({ requireAuth: true });

      expect(authResult.allowed).toBe(false);
      expect(authResult.reason).toBe('not-authenticated');
    });

    it('should check email verification requirement', () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: unverifiedUser,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => useAuthGuard());
      const authResult = result.current.checkAuth({ requireEmailVerified: true });

      expect(authResult.allowed).toBe(false);
      expect(authResult.reason).toBe('email-not-verified');
    });

    it('should check role requirements', () => {
      const { result } = renderHook(() => useAuthGuard());
      const authResult = result.current.checkAuth({ requiredRoles: ['admin'] });

      expect(authResult.allowed).toBe(false);
      expect(authResult.reason).toBe('insufficient-permissions');
    });

    it('should pass when user has required role', () => {
      const { result } = renderHook(() => useAuthGuard());
      const authResult = result.current.checkAuth({ requiredRoles: ['editor'] });

      expect(authResult.allowed).toBe(true);
      expect(authResult.reason).toBeNull();
    });

    it('should handle combined requirements', () => {
      const { result } = renderHook(() => useAuthGuard());
      const authResult = result.current.checkAuth({
        requireAuth: true,
        requireEmailVerified: true,
        requiredRoles: ['editor']
      });

      expect(authResult.allowed).toBe(true);
      expect(authResult.reason).toBeNull();
    });
  });

  describe('Convenience functions', () => {
    it('should provide requireAuth convenience function', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => useAuthGuard());
      const authResult = result.current.requireAuth();

      expect(authResult.allowed).toBe(false);
      expect(authResult.reason).toBe('not-authenticated');
    });

    it('should provide requireEmailVerified convenience function', () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: unverifiedUser,
          isLoading: false,
          error: null
        }
      });

      const { result } = renderHook(() => useAuthGuard());
      const authResult = result.current.requireEmailVerified();

      expect(authResult.allowed).toBe(false);
      expect(authResult.reason).toBe('email-not-verified');
    });

    it('should provide requireRoles convenience function', () => {
      const { result } = renderHook(() => useAuthGuard());
      const authResult = result.current.requireRoles(['admin']);

      expect(authResult.allowed).toBe(false);
      expect(authResult.reason).toBe('insufficient-permissions');
    });
  });

  describe('State exposure', () => {
    it('should expose auth state properties', () => {
      const { result } = renderHook(() => useAuthGuard());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBe(mockUser);
    });

    it('should update when auth state changes', () => {
      const { result, rerender } = renderHook(() => useAuthGuard());

      expect(result.current.isAuthenticated).toBe(true);

      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      rerender();

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});

describe('withAuth HOC', () => {
  const TestComponent: React.FC<{ message: string }> = ({ message }) => (
    <div>{message}</div>
  );

  beforeEach(() => {
    vi.clearAllMocks();

    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: {
          id: '1',
          fullName: 'Test User',
          emailAddress: 'test@example.com',
          emailVerified: true,
          roles: ['editor'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        isLoading: false,
        error: null
      }
    });
  });

  it('should wrap component with authentication middleware', () => {
    const ProtectedComponent = withAuth(TestComponent);

    render(<ProtectedComponent message="Protected Message" />);

    expect(screen.getByText('Protected Message')).toBeInTheDocument();
  });

  it('should apply authentication requirements', () => {
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      }
    });

    const ProtectedComponent = withAuth(TestComponent, { requireAuth: true });

    render(<ProtectedComponent message="Protected Message" />);

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.queryByText('Protected Message')).not.toBeInTheDocument();
  });

  it('should apply email verification requirements', () => {
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: {
          id: '1',
          fullName: 'Test User',
          emailAddress: 'test@example.com',
          emailVerified: false,
          roles: ['editor'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        isLoading: false,
        error: null
      }
    });

    const ProtectedComponent = withAuth(TestComponent, { requireEmailVerified: true });

    render(<ProtectedComponent message="Protected Message" />);

    expect(screen.getByText('Email Verification Required')).toBeInTheDocument();
    expect(screen.queryByText('Protected Message')).not.toBeInTheDocument();
  });

  it('should apply role requirements', () => {
    const ProtectedComponent = withAuth(TestComponent, { requiredRoles: ['admin'] });

    render(<ProtectedComponent message="Protected Message" />);

    expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    expect(screen.queryByText('Protected Message')).not.toBeInTheDocument();
  });

  it('should use custom fallback', () => {
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      }
    });

    const CustomFallback = () => <div>Custom HOC Fallback</div>;
    const ProtectedComponent = withAuth(TestComponent, {
      requireAuth: true,
      fallback: <CustomFallback />
    });

    render(<ProtectedComponent message="Protected Message" />);

    expect(screen.getByText('Custom HOC Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Authentication Required')).not.toBeInTheDocument();
  });

  it('should preserve component display name', () => {
    TestComponent.displayName = 'TestComponent';
    const ProtectedComponent = withAuth(TestComponent);

    expect(ProtectedComponent.displayName).toBe('withAuth(TestComponent)');
  });

  it('should use component name when displayName not available', () => {
    const ProtectedComponent = withAuth(TestComponent);

    expect(ProtectedComponent.displayName).toBe('withAuth(TestComponent)');
  });

  it('should pass through props to wrapped component', () => {
    const ProtectedComponent = withAuth(TestComponent);

    render(<ProtectedComponent message="Test Props" />);

    expect(screen.getByText('Test Props')).toBeInTheDocument();
  });
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';

    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: {
          id: '1',
          fullName: 'Test User',
          emailAddress: 'test@example.com',
          emailVerified: true,
          roles: ['editor'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        isLoading: false,
        error: null
      }
    });
  });

  it('should render children when requirements are met', () => {
    render(
      <ProtectedRoute requireAuth={true}>
        <div>Protected Route Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Route Content')).toBeInTheDocument();
  });

  it('should show unauthorized content when requirements not met', () => {
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      }
    });

    render(
      <ProtectedRoute requireAuth={true}>
        <div>Protected Route Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.queryByText('Protected Route Content')).not.toBeInTheDocument();
  });

  it('should redirect when redirectTo is provided', () => {
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      }
    });

    render(
      <ProtectedRoute requireAuth={true} redirectTo="/login">
        <div>Protected Route Content</div>
      </ProtectedRoute>
    );

    expect(mockLocation.href).toBe('/login');
  });

  it('should handle all authentication options', () => {
    render(
      <ProtectedRoute
        requireAuth={true}
        requireEmailVerified={true}
        requiredRoles={['editor']}
      >
        <div>Protected Route Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Route Content')).toBeInTheDocument();
  });

  it('should not redirect when redirectTo not provided', () => {
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      }
    });

    render(
      <ProtectedRoute requireAuth={true}>
        <div>Protected Route Content</div>
      </ProtectedRoute>
    );

    expect(mockLocation.href).toBe('');
    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
  });
});

describe('Built-in Components', () => {
  describe('LoadingSpinner', () => {
    it('should render with default medium size', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: true,
          error: null
        }
      });

      render(
        <AuthMiddleware>
          <div>Content</div>
        </AuthMiddleware>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(document.querySelector('.loading-spinner.medium')).toBeInTheDocument();
    });
  });

  describe('UnauthorizedAccess', () => {
    it('should render without sign in button when no callback', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requireAuth={true}>
          <div>Content</div>
        </AuthMiddleware>
      );

      expect(screen.getByText('🔒')).toBeInTheDocument();
      expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    });
  });

  describe('EmailVerificationRequired', () => {
    it('should render verification message', () => {
      (useEnhancedAuth as any).mockReturnValue({
        authState: {
          isAuthenticated: true,
          user: {
            id: '1',
            fullName: 'Test User',
            emailAddress: 'test@example.com',
            emailVerified: false,
            roles: ['editor'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          isLoading: false,
          error: null
        }
      });

      render(
        <AuthMiddleware requireEmailVerified={true}>
          <div>Content</div>
        </AuthMiddleware>
      );

      expect(screen.getByText('📧')).toBeInTheDocument();
      expect(screen.getByText('Email Verification Required')).toBeInTheDocument();
    });
  });

  describe('InsufficientPermissions', () => {
    it('should render permissions message', () => {
      render(
        <AuthMiddleware requiredRoles={['admin']}>
          <div>Content</div>
        </AuthMiddleware>
      );

      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
    });
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementation to prevent test pollution
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      }
    });
  });

  it('should handle null user gracefully', () => {
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: null,
        isLoading: false,
        error: null
      }
    });

    render(
      <AuthMiddleware requireAuth={true}>
        <div>Content</div>
      </AuthMiddleware>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should handle missing roles property', () => {
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: {
          id: '1',
          fullName: 'Test User',
          emailAddress: 'test@example.com',
          isEmailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
          // roles property missing
        },
        isLoading: false,
        error: null
      }
    });

    render(
      <AuthMiddleware requiredRoles={['editor']}>
        <div>Content</div>
      </AuthMiddleware>
    );

    expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
  });

  it('should handle context provider error', () => {
    (useEnhancedAuth as any).mockImplementation(() => {
      throw new Error('Provider not available');
    });

    // Suppress React's error boundary console errors for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // For React components, errors during render need to be caught differently
    let thrownError: Error | null = null;

    try {
      render(
        <AuthMiddleware>
          <div>Content</div>
        </AuthMiddleware>
      );
    } catch (error) {
      thrownError = error as Error;
    }

    expect(thrownError).toBeTruthy();
    expect(thrownError?.message).toBe('Provider not available');

    consoleSpy.mockRestore();
  });

  it('should handle multiple rapid auth state changes', () => {
    const { rerender } = render(
      <AuthMiddleware requireAuth={true}>
        <div>Content</div>
      </AuthMiddleware>
    );

    // Loading state
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: false,
        user: null,
        isLoading: true,
        error: null
      }
    });
    rerender(
      <AuthMiddleware requireAuth={true}>
        <div>Content</div>
      </AuthMiddleware>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Authenticated state
    (useEnhancedAuth as any).mockReturnValue({
      authState: {
        isAuthenticated: true,
        user: {
          id: '1',
          fullName: 'Test User',
          emailAddress: 'test@example.com',
          emailVerified: true,
          roles: ['editor'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        isLoading: false,
        error: null
      }
    });
    rerender(
      <AuthMiddleware requireAuth={true}>
        <div>Content</div>
      </AuthMiddleware>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});