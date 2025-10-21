import React from 'react';
import { useEnhancedAuth } from '../contexts/EnhancedAuthContext';

interface AuthMiddlewareProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireEmailVerified?: boolean;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
  onUnauthorized?: () => void;
}

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'medium' }) => (
  <div className={`loading-spinner ${size}`}>
    <div className="spinner-circle"></div>
    <span>Loading...</span>
  </div>
);

const UnauthorizedAccess: React.FC<{ onLogin?: () => void }> = ({ onLogin }) => (
  <div className="unauthorized-access">
    <div className="unauthorized-icon">🔒</div>
    <h3>Authentication Required</h3>
    <p>You need to be logged in to access this content.</p>
    {onLogin && (
      <button 
        className="button primary"
        onClick={onLogin}
      >
        Sign In
      </button>
    )}
  </div>
);

const EmailVerificationRequired: React.FC<{ onVerify?: () => void }> = ({ onVerify }) => (
  <div className="email-verification-required">
    <div className="verification-icon">📧</div>
    <h3>Email Verification Required</h3>
    <p>Please verify your email address to access this content.</p>
    {onVerify && (
      <button 
        className="button primary"
        onClick={onVerify}
      >
        Verify Email
      </button>
    )}
  </div>
);

const InsufficientPermissions: React.FC = () => (
  <div className="insufficient-permissions">
    <div className="permissions-icon">⚠️</div>
    <h3>Insufficient Permissions</h3>
    <p>You don't have the required permissions to access this content.</p>
  </div>
);

/**
 * Authentication middleware component that protects routes and components
 * based on authentication status, email verification, and user roles.
 */
export const AuthMiddleware: React.FC<AuthMiddlewareProps> = ({
  children,
  requireAuth = false,
  requireEmailVerified = false,
  requiredRoles = [],
  fallback,
  onUnauthorized
}) => {
  const { authState } = useEnhancedAuth();

  // Show loading spinner while authentication state is being determined
  if (authState.isLoading) {
    return fallback || <LoadingSpinner />;
  }

  // Check if authentication is required
  if (requireAuth && !authState.isAuthenticated) {
    if (onUnauthorized) {
      onUnauthorized();
    }
    return fallback || <UnauthorizedAccess onLogin={onUnauthorized} />;
  }

  // Check if email verification is required (check this first)
  if (requireEmailVerified && authState.user && !authState.user.emailVerified) {
    return fallback || <EmailVerificationRequired />;
  }

  // Check role-based permissions
  if (requiredRoles.length > 0 && authState.user) {
    const userRoles = authState.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return fallback || <InsufficientPermissions />;
    }
  }

  // All checks passed, render children
  return <>{children}</>;
};

/**
 * Hook for programmatic authentication checks
 */
export const useAuthGuard = () => {
  const { authState } = useEnhancedAuth();

  const checkAuth = (options: {
    requireAuth?: boolean;
    requireEmailVerified?: boolean;
    requiredRoles?: string[];
  } = {}) => {
    const {
      requireAuth = false,
      requireEmailVerified = false,
      requiredRoles = []
    } = options;

    // Loading state
    if (authState.isLoading) {
      return { allowed: false, reason: 'loading' };
    }

    // Authentication check
    if (requireAuth && !authState.isAuthenticated) {
      return { allowed: false, reason: 'not-authenticated' };
    }

    // Email verification check
    if (requireEmailVerified && authState.user && !authState.user.emailVerified) {
      return { allowed: false, reason: 'email-not-verified' };
    }

    // Role-based check
    if (requiredRoles.length > 0 && authState.user) {
      const userRoles = authState.user.roles || [];
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
      
      if (!hasRequiredRole) {
        return { allowed: false, reason: 'insufficient-permissions' };
      }
    }

    return { allowed: true, reason: null };
  };

  const requireAuth = () => checkAuth({ requireAuth: true });
  const requireEmailVerified = () => checkAuth({ requireEmailVerified: true });
  const requireRoles = (roles: string[]) => checkAuth({ requiredRoles: roles });

  return {
    checkAuth,
    requireAuth,
    requireEmailVerified,
    requireRoles,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    user: authState.user
  };
};

/**
 * Higher-order component for protecting components with authentication
 */
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireAuth?: boolean;
    requireEmailVerified?: boolean;
    requiredRoles?: string[];
    fallback?: React.ReactNode;
  } = {}
) => {
  const ProtectedComponent: React.FC<P> = (props) => (
    <AuthMiddleware {...options}>
      <Component {...props} />
    </AuthMiddleware>
  );

  ProtectedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;
  
  return ProtectedComponent;
};

/**
 * Route-level authentication guard component
 */
export const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requireAuth?: boolean;
  requireEmailVerified?: boolean;
  requiredRoles?: string[];
  redirectTo?: string;
}> = ({ children, redirectTo, ...authOptions }) => {
  const handleUnauthorized = () => {
    if (redirectTo) {
      window.location.href = redirectTo;
    }
  };

  return (
    <AuthMiddleware {...authOptions} onUnauthorized={handleUnauthorized}>
      {children}
    </AuthMiddleware>
  );
};

export default AuthMiddleware;